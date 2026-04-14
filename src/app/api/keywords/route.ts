import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface KeywordRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  metric_date: string;
}

interface AggregatedKeyword {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
  metric_date: string;
  daily: KeywordRow[];
  _weightedPos: number;
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

  // Fetch all rows in date range (paginated)
  const allRows: KeywordRow[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("search_keywords")
      .select("*")
      .gte("metric_date", from)
      .lte("metric_date", to)
      .range(offset, offset + pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    allRows.push(...(data as KeywordRow[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  // Aggregate by normalized query (trim + lowercase) to handle whitespace/casing
  const map = new Map<string, AggregatedKeyword>();
  for (const row of allRows) {
    const normalizedKey = row.query.trim().toLowerCase();
    const existing = map.get(normalizedKey);
    if (existing) {
      existing.clicks += row.clicks;
      existing.impressions += row.impressions;
      existing._weightedPos += row.position * row.impressions;
      existing.daily.push(row);
    } else {
      map.set(normalizedKey, {
        query: row.query.trim(),
        clicks: row.clicks,
        impressions: row.impressions,
        position: row.position,
        ctr: row.ctr,
        _weightedPos: row.position * row.impressions,
        metric_date: row.metric_date,
        daily: [row],
      });
    }
  }

  const result = Array.from(map.values())
    .map((k) => ({
      query: k.query,
      clicks: k.clicks,
      impressions: k.impressions,
      position:
        k.impressions > 0 ? k._weightedPos / k.impressions : k.position,
      ctr: k.impressions > 0 ? k.clicks / k.impressions : 0,
      metric_date: k.metric_date,
      daily: k.daily.sort((a, b) =>
        b.metric_date.localeCompare(a.metric_date)
      ),
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 100);

  return NextResponse.json(result);
}
