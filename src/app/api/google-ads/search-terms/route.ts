import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface Row {
  source: "search_term" | "pmax_insight";
  campaign_id: string;
  campaign_name: string | null;
  ad_group_name: string | null;
  search_term: string;
  metric_date: string;
  impressions: number;
  clicks: number;
  cost_nok: number;
  conversions: number;
}

export interface SearchTermAggregate {
  source: "search_term" | "pmax_insight";
  search_term: string;
  campaign_name: string | null;
  ad_group_name: string | null;
  impressions: number;
  clicks: number;
  cost_nok: number;
  conversions: number;
  ctr: number;
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
  const source = searchParams.get("source"); // optional filter
  const campaignId = searchParams.get("campaign_id"); // optional filter
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
    let q = supabase
      .from("google_ads_search_terms")
      .select(
        "source, campaign_id, campaign_name, ad_group_name, search_term, metric_date, impressions, clicks, cost_nok, conversions"
      )
      .gte("metric_date", from)
      .lte("metric_date", to)
      .range(offset, offset + pageSize - 1);
    if (source) q = q.eq("source", source);
    if (campaignId) q = q.eq("campaign_id", campaignId);

    const { data, error } = await q;
    if (error) {
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

  // Aggregate by (source, search_term) — include source in key so brand-search
  // from Search and from Pmax stays separate
  const map = new Map<string, SearchTermAggregate>();
  for (const row of allRows) {
    const key = `${row.source}|${row.search_term.toLowerCase().trim()}`;
    const existing = map.get(key);
    if (existing) {
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.cost_nok += Number(row.cost_nok);
      existing.conversions += Number(row.conversions);
    } else {
      map.set(key, {
        source: row.source,
        search_term: row.search_term,
        campaign_name: row.campaign_name,
        ad_group_name: row.ad_group_name,
        impressions: row.impressions,
        clicks: row.clicks,
        cost_nok: Number(row.cost_nok),
        conversions: Number(row.conversions),
        ctr: 0,
      });
    }
  }

  const result = Array.from(map.values())
    .map((r) => ({
      ...r,
      ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 200);

  return NextResponse.json(result);
}
