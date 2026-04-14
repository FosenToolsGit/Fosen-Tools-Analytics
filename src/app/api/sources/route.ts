import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface SourceRow {
  channel: string;
  source: string | null;
  medium: string | null;
  sessions: number;
  total_users: number;
  engagement_rate: number;
  conversions: number;
  metric_date: string;
}

interface AggregatedSource extends SourceRow {
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

  // Paginated fetch (Supabase has 1000 row default limit)
  const allRows: SourceRow[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("traffic_sources")
      .select("*")
      .gte("metric_date", from)
      .lte("metric_date", to)
      .range(offset, offset + pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    allRows.push(...(data as SourceRow[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  const rows = allRows;

  // Aggregate by channel + source + medium
  const map = new Map<string, AggregatedSource>();
  for (const row of (rows ?? []) as SourceRow[]) {
    const key = `${row.channel}|${row.source ?? ""}|${row.medium ?? ""}`;
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
    .map((s) => ({
      channel: s.channel,
      source: s.source,
      medium: s.medium,
      sessions: s.sessions,
      total_users: s.total_users,
      conversions: s.conversions,
      engagement_rate:
        s.sessions > 0 ? s._weightedEng / s.sessions : s.engagement_rate,
      metric_date: s.metric_date,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  return NextResponse.json(result);
}
