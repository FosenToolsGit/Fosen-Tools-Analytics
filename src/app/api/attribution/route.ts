import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Cross-platform attribution: samler data fra GA4 traffic_sources + Google Ads
 * conversions + platform_posts + ga4-metrics for å vise hvor salg faktisk kommer fra.
 *
 * Vi bruker GA4 som "sannhetskilde" for sesjoner per kilde (fordi GA4 ser all
 * trafikk uavhengig av kanal), og Google Ads for ekte kjøpsverdier per kampanje.
 */

export interface ChannelAttribution {
  channel: string;
  sessions: number;
  conversions: number;
  estimated_value_nok: number;
  cost_nok: number; // 0 for ikke-betalte kanaler
  roas: number; // 0 hvis cost_nok er 0
  share_of_sessions_pct: number;
  share_of_value_pct: number;
  is_paid: boolean;
}

export interface AttributionResponse {
  period: { from: string; to: string; days: number };
  total_sessions: number;
  total_conversions: number;
  total_estimated_value_nok: number;
  total_cost_nok: number;
  overall_roas: number;
  channels: ChannelAttribution[];
  top_sources: Array<{
    channel: string;
    source: string;
    medium: string;
    sessions: number;
    conversions: number;
  }>;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing from/to" },
      { status: 400 }
    );
  }

  // 1. Hent traffic_sources for perioden (paginert)
  interface SourceRow {
    channel: string;
    source: string;
    medium: string;
    sessions: number;
    conversions: number;
  }
  const sourceRows: SourceRow[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("traffic_sources")
      .select("channel, source, medium, sessions, conversions")
      .gte("metric_date", from)
      .lte("metric_date", to)
      .range(offset, offset + pageSize - 1);
    if (error) {
      if (/relation .* does not exist/i.test(error.message)) {
        break;
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    sourceRows.push(...(data as SourceRow[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  // 2. Hent Google Ads kostnad og purchase-verdi PER kampanje
  const { data: adsCamps } = await supabase
    .from("google_ads_campaigns")
    .select("campaign_id, campaign_name, channel_type, cost_nok")
    .gte("metric_date", from)
    .lte("metric_date", to);

  // Bygg kostnad per kanal-type (Search → Paid Search, Pmax → Cross-network)
  const costByChannel = new Map<string, number>();
  const campaignChannelMap = new Map<string, string>();
  for (const row of adsCamps ?? []) {
    const ct = (row.channel_type || "").toLowerCase();
    const gaChannel = ct.includes("search") ? "Paid Search" : "Cross-network";
    costByChannel.set(gaChannel, (costByChannel.get(gaChannel) || 0) + (Number(row.cost_nok) || 0));
    campaignChannelMap.set(row.campaign_id, gaChannel);
  }
  const googleAdsCost = Array.from(costByChannel.values()).reduce((s, v) => s + v, 0);

  const { data: adsConvs } = await supabase
    .from("google_ads_conversions")
    .select("campaign_id, conversion_action_name, all_conversions_value")
    .gte("metric_date", from)
    .lte("metric_date", to);

  // Purchase-verdi per GA4-kanal (Paid Search vs Cross-network)
  const purchaseValueByChannel = new Map<string, number>();
  for (const row of adsConvs ?? []) {
    if (!(row.conversion_action_name as string).toLowerCase().includes("purchase")) continue;
    const gaChannel = campaignChannelMap.get(row.campaign_id) || "Cross-network";
    purchaseValueByChannel.set(
      gaChannel,
      (purchaseValueByChannel.get(gaChannel) || 0) + (Number(row.all_conversions_value) || 0)
    );
  }

  // 3. Aggreger per channel
  interface ChannelAgg {
    sessions: number;
    conversions: number;
  }
  const channelMap = new Map<string, ChannelAgg>();
  for (const row of sourceRows) {
    const ch = row.channel || "Ukjent";
    const ex = channelMap.get(ch) ?? { sessions: 0, conversions: 0 };
    ex.sessions += row.sessions || 0;
    ex.conversions += Number(row.conversions) || 0;
    channelMap.set(ch, ex);
  }

  const totalSessions = Array.from(channelMap.values()).reduce(
    (s, c) => s + c.sessions,
    0
  );
  const totalConversions = Array.from(channelMap.values()).reduce(
    (s, c) => s + c.conversions,
    0
  );

  // 4. Beregn estimert verdi per channel.
  //
  // Paid Search + Cross-network: ekte Google Ads purchase-verdi (sporbar)
  // Email-kanal: bruker Mailchimp-kampanje klikk → estimert konverteringsrate
  // Andre kanaler (Organic, Direct, Social, Referral): vi vet IKKE den ekte
  // verdien fordi GA4 "conversions" inkluderer alle events (signups, klikk etc.),
  // ikke bare kjøp. Vi viser 0 for verdi og markerer som "ikke sporbar".
  //
  // Totalverdi = bare sporbar verdi (Google Ads purchase).

  const channels: ChannelAttribution[] = [];
  let totalValue = 0;

  for (const [channel, data] of channelMap) {
    const isPaidSearch = channel.toLowerCase().includes("paid search");
    const isCrossNetwork = channel.toLowerCase() === "cross-network";
    const isPaid =
      isPaidSearch ||
      channel.toLowerCase().includes("paid") ||
      isCrossNetwork;

    let estValue = 0;
    let cost = 0;
    if (isPaidSearch) {
      estValue = purchaseValueByChannel.get("Paid Search") || 0;
      cost = costByChannel.get("Paid Search") || 0;
    } else if (isCrossNetwork) {
      estValue = purchaseValueByChannel.get("Cross-network") || 0;
      cost = costByChannel.get("Cross-network") || 0;
    }
    totalValue += estValue;

    channels.push({
      channel,
      sessions: data.sessions,
      conversions: data.conversions,
      estimated_value_nok: estValue,
      cost_nok: cost,
      roas: cost > 0 ? estValue / cost : 0,
      share_of_sessions_pct:
        totalSessions > 0 ? (data.sessions / totalSessions) * 100 : 0,
      share_of_value_pct: 0,
      is_paid: isPaid,
    });
  }

  // Fyll share_of_value_pct
  for (const c of channels) {
    c.share_of_value_pct =
      totalValue > 0 ? (c.estimated_value_nok / totalValue) * 100 : 0;
  }

  channels.sort((a, b) => b.estimated_value_nok - a.estimated_value_nok);

  // 5. Topp 20 kilder (source+medium breakdown)
  interface SourceAgg {
    channel: string;
    source: string;
    medium: string;
    sessions: number;
    conversions: number;
  }
  const srcMap = new Map<string, SourceAgg>();
  for (const row of sourceRows) {
    const key = `${row.channel}|${row.source}|${row.medium}`;
    const ex = srcMap.get(key) ?? {
      channel: row.channel,
      source: row.source,
      medium: row.medium,
      sessions: 0,
      conversions: 0,
    };
    ex.sessions += row.sessions || 0;
    ex.conversions += Number(row.conversions) || 0;
    srcMap.set(key, ex);
  }
  const topSources = Array.from(srcMap.values())
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 20);

  // 6. Beregn periode
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const days = Math.max(
    1,
    Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000))
  );

  const response: AttributionResponse = {
    period: { from, to, days },
    total_sessions: totalSessions,
    total_conversions: totalConversions,
    total_estimated_value_nok: totalValue,
    total_cost_nok: googleAdsCost,
    overall_roas: googleAdsCost > 0 ? totalValue / googleAdsCost : 0,
    channels,
    top_sources: topSources,
  };

  return NextResponse.json(response);
}
