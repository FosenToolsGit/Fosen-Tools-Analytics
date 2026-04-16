import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface CountryInsight {
  country: string;
  country_code: string;
  ga4_sessions: number;
  ga4_users: number;
  mailchimp_opens: number;
  estimated_conversions: number;
  value_score: number;
}

export interface GeoInsightResponse {
  countries: CountryInsight[];
  top_regions: Array<{ country: string; country_code: string; value_score: number; primary_source: string }>;
  coverage: { ga4_countries: number; mailchimp_countries: number; overlap_countries: number };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (!from || !to) return NextResponse.json({ error: "Missing from/to" }, { status: 400 });

  try {
    const ga4Map = new Map<string, { country: string; sessions: number; users: number }>();
    const pageSize = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("geo_data")
        .select("country, country_code, sessions, total_users")
        .gte("metric_date", from)
        .lte("metric_date", to)
        .range(offset, offset + pageSize - 1);
      if (error || !data || data.length === 0) break;
      for (const row of data) {
        const cc = (row.country_code || "").toUpperCase();
        if (!cc) continue;
        const ex = ga4Map.get(cc) ?? { country: row.country || cc, sessions: 0, users: 0 };
        ex.sessions += Number(row.sessions) || 0;
        ex.users += Number(row.total_users) || 0;
        ga4Map.set(cc, ex);
      }
      if (data.length < pageSize) break;
      offset += pageSize;
    }

    const mcMap = new Map<string, number>();
    const { data: mcLocs } = await supabase
      .from("mailchimp_campaign_locations")
      .select("country_code, opens");
    for (const row of mcLocs ?? []) {
      const cc = (row.country_code || "").toUpperCase();
      if (!cc) continue;
      mcMap.set(cc, (mcMap.get(cc) || 0) + (Number(row.opens) || 0));
    }

    const convMap = new Map<string, number>();
    offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("traffic_sources")
        .select("channel, conversions")
        .gte("metric_date", from)
        .lte("metric_date", to)
        .range(offset, offset + pageSize - 1);
      if (error || !data || data.length === 0) break;
      for (const row of data) {
        const ch = row.channel || "unknown";
        convMap.set(ch, (convMap.get(ch) || 0) + (Number(row.conversions) || 0));
      }
      if (data.length < pageSize) break;
      offset += pageSize;
    }
    const totalConversions = Array.from(convMap.values()).reduce((s, v) => s + v, 0);
    const totalSessions = Array.from(ga4Map.values()).reduce((s, v) => s + v.sessions, 0);

    const allCodes = new Set([...ga4Map.keys(), ...mcMap.keys()]);
    const countries: CountryInsight[] = [];

    for (const cc of allCodes) {
      const ga4 = ga4Map.get(cc);
      const mcOpens = mcMap.get(cc) || 0;
      const sessions = ga4?.sessions || 0;
      const users = ga4?.users || 0;

      const estConversions = totalSessions > 0
        ? Math.round((sessions / totalSessions) * totalConversions * 10) / 10
        : 0;

      const sessionScore = sessions > 0 ? Math.min(sessions / 100, 10) : 0;
      const emailScore = mcOpens > 0 ? Math.min(mcOpens / 50, 10) : 0;
      const convScore = estConversions > 0 ? Math.min(estConversions * 2, 10) : 0;
      const valueScore = Math.round((sessionScore * 0.4 + emailScore * 0.3 + convScore * 0.3) * 10) / 10;

      countries.push({
        country: ga4?.country || cc,
        country_code: cc,
        ga4_sessions: sessions,
        ga4_users: users,
        mailchimp_opens: mcOpens,
        estimated_conversions: estConversions,
        value_score: valueScore,
      });
    }

    countries.sort((a, b) => b.value_score - a.value_score);

    const ga4Countries = new Set(ga4Map.keys());
    const mcCountries = new Set(mcMap.keys());
    const overlap = new Set([...ga4Countries].filter((c) => mcCountries.has(c)));

    const topRegions = countries.slice(0, 10).map((c) => ({
      country: c.country,
      country_code: c.country_code,
      value_score: c.value_score,
      primary_source: c.ga4_sessions > c.mailchimp_opens * 2 ? "GA4" : c.mailchimp_opens > c.ga4_sessions ? "Mailchimp" : "Begge",
    }));

    const response: GeoInsightResponse = {
      countries,
      top_regions: topRegions,
      coverage: {
        ga4_countries: ga4Countries.size,
        mailchimp_countries: mcCountries.size,
        overlap_countries: overlap.size,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
