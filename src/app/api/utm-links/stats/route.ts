import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

/**
 * Krysskobler utm_links-registeret med GA4-trafikkdata fra
 * `traffic_sources` så hver lagret link viser faktiske klikk +
 * konverteringer siste N dager. Default 30d.
 *
 * Matche-logikk: lower(source) + lower(medium) (utm_campaign er ikke
 * lagret i traffic_sources i dag, så vi grupperer per source/medium
 * og viser totale tall — bedre enn ingen tall).
 */

export interface UtmStatsRow {
  utm_source: string;
  utm_medium: string;
  sessions: number;
  conversions: number;
  link_count: number;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const sp = request.nextUrl.searchParams;
  const days = Number(sp.get("days") ?? "30");
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const [{ data: links }, { data: traffic }] = await Promise.all([
    supabase
      .from("utm_links")
      .select("utm_source, utm_medium"),
    supabase
      .from("traffic_sources")
      .select("source, medium, sessions, conversions, metric_date")
      .gte("metric_date", since),
  ]);

  // Grupper trafikk per (source, medium) lowercase
  const trafficByKey = new Map<string, { sessions: number; conversions: number }>();
  for (const t of traffic ?? []) {
    const key = `${(t.source ?? "").toLowerCase()}|${(t.medium ?? "").toLowerCase()}`;
    const ex = trafficByKey.get(key) ?? { sessions: 0, conversions: 0 };
    ex.sessions += Number(t.sessions) || 0;
    ex.conversions += Number(t.conversions) || 0;
    trafficByKey.set(key, ex);
  }

  // Tell antall lagrede linker per (source, medium)
  const linkCountByKey = new Map<string, number>();
  for (const l of links ?? []) {
    const key = `${l.utm_source.toLowerCase()}|${l.utm_medium.toLowerCase()}`;
    linkCountByKey.set(key, (linkCountByKey.get(key) ?? 0) + 1);
  }

  const allKeys = new Set([...trafficByKey.keys(), ...linkCountByKey.keys()]);
  const stats: UtmStatsRow[] = [];
  for (const key of allKeys) {
    const [src, med] = key.split("|");
    const t = trafficByKey.get(key) ?? { sessions: 0, conversions: 0 };
    stats.push({
      utm_source: src,
      utm_medium: med,
      sessions: t.sessions,
      conversions: t.conversions,
      link_count: linkCountByKey.get(key) ?? 0,
    });
  }

  stats.sort((a, b) => b.sessions - a.sessions);

  return NextResponse.json({ days, since, stats });
}
