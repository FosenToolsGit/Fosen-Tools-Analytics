import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface PlatformMetrics {
  sessions: number;
  reach: number;
  engagement: number;
  clicks: number;
  followers: number;
}

interface PlatformScore {
  platform: string;
  current: PlatformMetrics;
  previous: PlatformMetrics;
  delta_pct: PlatformMetrics;
  status: "up" | "down" | "flat";
}

interface AdsMetrics {
  cost: number;
  clicks: number;
  conversions: number;
  roas: number;
}

export interface ScoreboardResponse {
  period: { current: { from: string; to: string }; previous: { from: string; to: string }; days: number };
  platforms: PlatformScore[];
  google_ads: { current: AdsMetrics; previous: AdsMetrics; delta_pct: AdsMetrics };
  anomalies: { critical: number; warning: number; info: number };
  highlights: string[];
}

function delta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function deltaMetrics(c: PlatformMetrics, p: PlatformMetrics): PlatformMetrics {
  return {
    sessions: delta(c.sessions, p.sessions),
    reach: delta(c.reach, p.reach),
    engagement: delta(c.engagement, p.engagement),
    clicks: delta(c.clicks, p.clicks),
    followers: delta(c.followers, p.followers),
  };
}

function overallStatus(d: PlatformMetrics): "up" | "down" | "flat" {
  const vals = [d.sessions, d.reach, d.engagement, d.clicks];
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  if (avg > 10) return "up";
  if (avg < -10) return "down";
  return "flat";
}

async function fetchMetricsByPlatform(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  to: string
): Promise<Map<string, PlatformMetrics>> {
  const map = new Map<string, PlatformMetrics>();
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("analytics_metrics")
      .select("platform, sessions, reach, engagement, clicks, followers")
      .gte("metric_date", from)
      .lte("metric_date", to)
      .range(offset, offset + pageSize - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data) {
      const p = row.platform || "unknown";
      const ex = map.get(p) ?? { sessions: 0, reach: 0, engagement: 0, clicks: 0, followers: 0 };
      ex.sessions += Number(row.sessions) || 0;
      ex.reach += Number(row.reach) || 0;
      ex.engagement += Number(row.engagement) || 0;
      ex.clicks += Number(row.clicks) || 0;
      ex.followers = Math.max(ex.followers, Number(row.followers) || 0);
      map.set(p, ex);
    }
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return map;
}

async function fetchAdsMetrics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  to: string
): Promise<AdsMetrics> {
  const { data: camps } = await supabase
    .from("google_ads_campaigns")
    .select("cost_nok, clicks")
    .gte("metric_date", from)
    .lte("metric_date", to);
  const cost = (camps ?? []).reduce((s, r) => s + (Number(r.cost_nok) || 0), 0);
  const clicks = (camps ?? []).reduce((s, r) => s + (Number(r.clicks) || 0), 0);

  const { data: convs } = await supabase
    .from("google_ads_conversions")
    .select("conversion_action_name, all_conversions, all_conversions_value")
    .gte("metric_date", from)
    .lte("metric_date", to);
  const purchases = (convs ?? []).filter((r) =>
    (r.conversion_action_name as string).toLowerCase().includes("purchase")
  );
  const conversions = purchases.reduce((s, r) => s + (Number(r.all_conversions) || 0), 0);
  const value = purchases.reduce((s, r) => s + (Number(r.all_conversions_value) || 0), 0);

  return { cost, clicks, conversions, roas: cost > 0 ? Math.round((value / cost) * 100) / 100 : 0 };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (!from || !to) return NextResponse.json({ error: "Missing from/to" }, { status: 400 });

  const days = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
  const prevTo = new Date(new Date(from).getTime() - 86400000).toISOString().slice(0, 10);
  const prevFrom = new Date(new Date(from).getTime() - days * 86400000).toISOString().slice(0, 10);

  try {
    const [currentMetrics, previousMetrics, currentAds, previousAds] = await Promise.all([
      fetchMetricsByPlatform(supabase, from, to),
      fetchMetricsByPlatform(supabase, prevFrom, prevTo),
      fetchAdsMetrics(supabase, from, to),
      fetchAdsMetrics(supabase, prevFrom, prevTo),
    ]);

    const { data: anomalyRows } = await supabase
      .from("analytics_anomalies")
      .select("severity")
      .eq("status", "active");
    const anomalies = { critical: 0, warning: 0, info: 0 };
    for (const r of anomalyRows ?? []) {
      const s = r.severity as keyof typeof anomalies;
      if (s in anomalies) anomalies[s]++;
    }

    const allPlatforms = new Set([...currentMetrics.keys(), ...previousMetrics.keys()]);
    const empty: PlatformMetrics = { sessions: 0, reach: 0, engagement: 0, clicks: 0, followers: 0 };
    const platformLabels: Record<string, string> = { ga4: "Google Analytics", meta: "Meta", mailchimp: "Mailchimp", google_ads: "Google Ads" };

    const platforms: PlatformScore[] = Array.from(allPlatforms)
      .filter((p) => p in platformLabels)
      .map((p) => {
        const current = currentMetrics.get(p) ?? { ...empty };
        const previous = previousMetrics.get(p) ?? { ...empty };
        const d = deltaMetrics(current, previous);
        return { platform: platformLabels[p] || p, current, previous, delta_pct: d, status: overallStatus(d) };
      });

    const adsDelta: AdsMetrics = {
      cost: delta(currentAds.cost, previousAds.cost),
      clicks: delta(currentAds.clicks, previousAds.clicks),
      conversions: delta(currentAds.conversions, previousAds.conversions),
      roas: delta(currentAds.roas, previousAds.roas),
    };

    const highlights: string[] = [];
    const sorted = [...platforms].sort((a, b) => {
      const aAvg = (Math.abs(a.delta_pct.sessions) + Math.abs(a.delta_pct.reach) + Math.abs(a.delta_pct.engagement)) / 3;
      const bAvg = (Math.abs(b.delta_pct.sessions) + Math.abs(b.delta_pct.reach) + Math.abs(b.delta_pct.engagement)) / 3;
      return bAvg - aAvg;
    });
    for (const p of sorted.slice(0, 3)) {
      const topMetric = Object.entries(p.delta_pct)
        .filter(([k]) => k !== "followers")
        .sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number))[0];
      if (topMetric) {
        const [metric, val] = topMetric;
        const dir = (val as number) > 0 ? "økt" : "falt";
        highlights.push(`${p.platform}: ${metric} ${dir} ${Math.abs(val as number)}%`);
      }
    }

    const response: ScoreboardResponse = {
      period: { current: { from, to }, previous: { from: prevFrom, to: prevTo }, days },
      platforms,
      google_ads: { current: currentAds, previous: previousAds, delta_pct: adsDelta },
      anomalies,
      highlights,
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
