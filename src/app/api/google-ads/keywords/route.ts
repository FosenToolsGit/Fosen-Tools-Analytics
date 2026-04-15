import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface Row {
  campaign_id: string;
  ad_group_id: string;
  ad_group_name: string | null;
  keyword_text: string;
  match_type: string;
  status: string | null;
  metric_date: string;
  impressions: number;
  clicks: number;
  cost_nok: number;
  conversions: number;
  ctr: number;
  average_cpc_nok: number;
  quality_score: number | null;
}

export interface GoogleAdsKeywordAggregate {
  keyword_text: string;
  match_type: string;
  ad_group_name: string | null;
  impressions: number;
  clicks: number;
  cost_nok: number;
  conversions: number;
  ctr: number;
  average_cpc_nok: number;
  quality_score: number | null;
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
      .from("google_ads_keywords")
      .select("*")
      .gte("metric_date", from)
      .lte("metric_date", to)
      .range(offset, offset + pageSize - 1);

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

  const map = new Map<
    string,
    GoogleAdsKeywordAggregate & {
      _weightedCpc: number;
      _qualitySum: number;
      _qualityCount: number;
    }
  >();

  for (const row of allRows) {
    const key = `${row.keyword_text.toLowerCase().trim()}|${row.match_type}`;
    const existing = map.get(key);
    if (existing) {
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.cost_nok += Number(row.cost_nok);
      existing.conversions += Number(row.conversions);
      existing._weightedCpc += Number(row.average_cpc_nok) * row.clicks;
      if (row.quality_score != null) {
        existing._qualitySum += row.quality_score;
        existing._qualityCount += 1;
      }
    } else {
      map.set(key, {
        keyword_text: row.keyword_text,
        match_type: row.match_type,
        ad_group_name: row.ad_group_name,
        impressions: row.impressions,
        clicks: row.clicks,
        cost_nok: Number(row.cost_nok),
        conversions: Number(row.conversions),
        ctr: 0,
        average_cpc_nok: 0,
        quality_score: null,
        _weightedCpc: Number(row.average_cpc_nok) * row.clicks,
        _qualitySum: row.quality_score ?? 0,
        _qualityCount: row.quality_score != null ? 1 : 0,
      });
    }
  }

  const result = Array.from(map.values())
    .map((k) => {
      const { _weightedCpc, _qualitySum, _qualityCount, ...rest } = k;
      return {
        ...rest,
        ctr: k.impressions > 0 ? k.clicks / k.impressions : 0,
        average_cpc_nok: k.clicks > 0 ? _weightedCpc / k.clicks : 0,
        quality_score: _qualityCount > 0 ? _qualitySum / _qualityCount : null,
      };
    })
    .sort((a, b) => b.cost_nok - a.cost_nok)
    .slice(0, 100);

  return NextResponse.json(result);
}
