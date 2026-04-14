import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface GeoRow {
  country: string;
  country_code: string;
  city: string | null;
  sessions: number;
  total_users: number;
  active_users: number;
  metric_date: string;
}

// Land som typisk genererer bot-trafikk mot lokale norske SMB-sider.
// Brukeren kan utvide listen ved behov.
const BOT_SUSPECTED_CC = new Set([
  "SG", // Singapore
  "CN", // China
  "HK", // Hong Kong
  "IN", // India
  "VN", // Vietnam
  "PK", // Pakistan
  "BD", // Bangladesh
  "ID", // Indonesia
  "RU", // Russia
  "BY", // Belarus
]);

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
  const excludeBots = searchParams.get("exclude_bots") === "true";

  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing from/to parameters" },
      { status: 400 }
    );
  }

  // Paginated fetch
  const allRows: GeoRow[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("geo_data")
      .select("*")
      .gte("metric_date", from)
      .lte("metric_date", to)
      .range(offset, offset + pageSize - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    allRows.push(...(data as GeoRow[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  const rows = excludeBots
    ? allRows.filter((r) => !BOT_SUSPECTED_CC.has(r.country_code))
    : allRows;

  // Aggregate by country + city
  const map = new Map<string, GeoRow>();
  for (const row of (rows ?? []) as GeoRow[]) {
    const key = `${row.country}|${row.city ?? ""}`;
    const existing = map.get(key);
    if (existing) {
      existing.sessions += row.sessions;
      existing.total_users += row.total_users;
      existing.active_users += row.active_users;
    } else {
      map.set(key, { ...row });
    }
  }

  const result = Array.from(map.values()).sort(
    (a, b) => b.sessions - a.sessions
  );

  return NextResponse.json(result);
}
