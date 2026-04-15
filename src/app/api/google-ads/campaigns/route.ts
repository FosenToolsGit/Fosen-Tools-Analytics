import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface Row {
  campaign_id: string;
  campaign_name: string;
  status: string | null;
  channel_type: string | null;
  metric_date: string;
  impressions: number;
  clicks: number;
  cost_nok: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  average_cpc_nok: number;
}

export interface GoogleAdsCampaignAggregate {
  campaign_id: string;
  campaign_name: string;
  status: string | null;
  channel_type: string | null;
  impressions: number;
  clicks: number;
  cost_nok: number;
  conversions: number;
  conversion_value: number;
  ctr: number;
  average_cpc_nok: number;
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
      { error: "Missing from/to parameters" },
      { status: 400 }
    );
  }

  const allRows: Row[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("google_ads_campaigns")
      .select("*")
      .gte("metric_date", from)
      .lte("metric_date", to)
      .range(offset, offset + pageSize - 1);

    if (error) {
      // Tabellen finnes kanskje ikke ennå — returner tom liste
      if (/relation .* does not exist/i.test(error.message)) {
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    allRows.push(...(data as Row[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  const map = new Map<string, GoogleAdsCampaignAggregate & { _weightedCpc: number }>();
  for (const row of allRows) {
    const existing = map.get(row.campaign_id);
    if (existing) {
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.cost_nok += Number(row.cost_nok);
      existing.conversions += Number(row.conversions);
      existing.conversion_value += Number(row.conversion_value);
      existing._weightedCpc += Number(row.average_cpc_nok) * row.clicks;
    } else {
      map.set(row.campaign_id, {
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        status: row.status,
        channel_type: row.channel_type,
        impressions: row.impressions,
        clicks: row.clicks,
        cost_nok: Number(row.cost_nok),
        conversions: Number(row.conversions),
        conversion_value: Number(row.conversion_value),
        ctr: 0,
        average_cpc_nok: 0,
        _weightedCpc: Number(row.average_cpc_nok) * row.clicks,
      });
    }
  }

  const result = Array.from(map.values())
    .map((c) => {
      const { _weightedCpc, ...rest } = c;
      return {
        ...rest,
        ctr: c.impressions > 0 ? c.clicks / c.impressions : 0,
        average_cpc_nok: c.clicks > 0 ? _weightedCpc / c.clicks : 0,
      };
    })
    .sort((a, b) => b.cost_nok - a.cost_nok);

  return NextResponse.json(result);
}
