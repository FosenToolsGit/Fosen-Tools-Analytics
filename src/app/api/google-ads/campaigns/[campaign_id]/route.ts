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

export interface DailyPoint {
  metric_date: string;
  impressions: number;
  clicks: number;
  cost_nok: number;
  conversions: number;
  ctr: number;
  average_cpc_nok: number;
}

export interface CampaignDetailResponse {
  campaign: {
    campaign_id: string;
    campaign_name: string;
    status: string | null;
    channel_type: string | null;
  } | null;
  daily: DailyPoint[];
  totals: {
    impressions: number;
    clicks: number;
    cost_nok: number;
    conversions: number;
    conversion_value: number;
    ctr: number;
    average_cpc_nok: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaign_id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { campaign_id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing from/to parameters" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("google_ads_campaigns")
    .select("*")
    .eq("campaign_id", campaign_id)
    .gte("metric_date", from)
    .lte("metric_date", to)
    .order("metric_date", { ascending: true });

  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json<CampaignDetailResponse>({
        campaign: null,
        daily: [],
        totals: {
          impressions: 0,
          clicks: 0,
          cost_nok: 0,
          conversions: 0,
          conversion_value: 0,
          ctr: 0,
          average_cpc_nok: 0,
        },
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];

  // Aggregate to one row per metric_date (in case there are multiple records
  // per day — shouldn't happen but be safe)
  const dailyMap = new Map<string, DailyPoint & { _weightedCpc: number }>();
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalCost = 0;
  let totalConversions = 0;
  let totalConversionValue = 0;
  let weightedCpcSum = 0;

  let campaignInfo: CampaignDetailResponse["campaign"] = null;

  for (const row of rows) {
    if (!campaignInfo) {
      campaignInfo = {
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        status: row.status,
        channel_type: row.channel_type,
      };
    }
    const existing = dailyMap.get(row.metric_date);
    const cost = Number(row.cost_nok) || 0;
    const cpc = Number(row.average_cpc_nok) || 0;
    totalImpressions += row.impressions;
    totalClicks += row.clicks;
    totalCost += cost;
    totalConversions += Number(row.conversions) || 0;
    totalConversionValue += Number(row.conversion_value) || 0;
    weightedCpcSum += cpc * row.clicks;

    if (existing) {
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.cost_nok += cost;
      existing.conversions += Number(row.conversions) || 0;
      existing._weightedCpc += cpc * row.clicks;
    } else {
      dailyMap.set(row.metric_date, {
        metric_date: row.metric_date,
        impressions: row.impressions,
        clicks: row.clicks,
        cost_nok: cost,
        conversions: Number(row.conversions) || 0,
        ctr: 0,
        average_cpc_nok: 0,
        _weightedCpc: cpc * row.clicks,
      });
    }
  }

  const daily: DailyPoint[] = Array.from(dailyMap.values())
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
    .map((d) => {
      const { _weightedCpc, ...rest } = d;
      return {
        ...rest,
        ctr: d.impressions > 0 ? d.clicks / d.impressions : 0,
        average_cpc_nok: d.clicks > 0 ? _weightedCpc / d.clicks : 0,
      };
    });

  const response: CampaignDetailResponse = {
    campaign: campaignInfo,
    daily,
    totals: {
      impressions: totalImpressions,
      clicks: totalClicks,
      cost_nok: totalCost,
      conversions: totalConversions,
      conversion_value: totalConversionValue,
      ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      average_cpc_nok: totalClicks > 0 ? weightedCpcSum / totalClicks : 0,
    },
  };

  return NextResponse.json(response);
}
