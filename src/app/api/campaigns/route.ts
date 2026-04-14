import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface CampaignRow {
  campaign_name: string;
  ad_group: string | null;
  keyword: string | null;
  sessions: number;
  total_users: number;
  conversions: number;
  engagement_rate: number;
  metric_date: string;
}

interface AggregatedCampaign extends CampaignRow {
  _weightedEng: number;
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

  // Paginated fetch
  const allRows: CampaignRow[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("ad_campaigns")
      .select("*")
      .gte("metric_date", from)
      .lte("metric_date", to)
      .range(offset, offset + pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    allRows.push(...(data as CampaignRow[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  const rows = allRows;

  // Aggregate by campaign + ad_group + keyword
  const map = new Map<string, AggregatedCampaign>();
  for (const row of (rows ?? []) as CampaignRow[]) {
    const key = `${row.campaign_name}|${row.ad_group ?? ""}|${row.keyword ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.sessions += row.sessions;
      existing.total_users += row.total_users;
      existing.conversions += row.conversions;
      existing._weightedEng += row.engagement_rate * row.sessions;
    } else {
      map.set(key, {
        ...row,
        _weightedEng: row.engagement_rate * row.sessions,
      });
    }
  }

  const result = Array.from(map.values())
    .map((c) => ({
      campaign_name: c.campaign_name,
      ad_group: c.ad_group,
      keyword: c.keyword,
      sessions: c.sessions,
      total_users: c.total_users,
      conversions: c.conversions,
      engagement_rate:
        c.sessions > 0 ? c._weightedEng / c.sessions : c.engagement_rate,
      metric_date: c.metric_date,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  return NextResponse.json(result);
}
