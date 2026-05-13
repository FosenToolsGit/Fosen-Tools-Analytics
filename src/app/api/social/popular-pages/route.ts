import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Topp-N populære fosen-tools.no-sider basert på GA4 page-views +
 * Mailchimp-klikk. Brukes som "topic-discovery" for Innholdsmotor.
 *
 * Score = ga4_views * 2 + mailchimp_clicks (samme vekting som brosjyre).
 */

interface PopularPage {
  url: string;
  title: string | null;
  ga4_views: number;
  mailchimp_clicks: number;
  score: number;
  last_seen: string | null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const days = Math.min(Number(sp.get("days") ?? 60), 365);
  const limit = Math.min(Number(sp.get("limit") ?? 12), 50);

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  // 1. GA4 platform_posts (page-views)
  const { data: ga4Rows } = await supabase
    .from("platform_posts")
    .select("post_url, post_title, impressions, last_synced_at")
    .eq("platform_type", "ga4")
    .gte("last_synced_at", sinceStr)
    .order("impressions", { ascending: false })
    .limit(500);

  // 2. Mailchimp link-clicks
  const { data: mcRows } = await supabase
    .from("mailchimp_campaign_links")
    .select("url, total_clicks")
    .gte("created_at", sinceStr)
    .order("total_clicks", { ascending: false })
    .limit(500);

  // Aggregér per URL
  const agg = new Map<string, PopularPage>();

  for (const row of ga4Rows ?? []) {
    if (!row.post_url) continue;
    const cleanUrl = normalizeFosenUrl(row.post_url);
    if (!cleanUrl) continue;
    const existing = agg.get(cleanUrl) ?? {
      url: cleanUrl,
      title: null,
      ga4_views: 0,
      mailchimp_clicks: 0,
      score: 0,
      last_seen: null,
    };
    existing.ga4_views += row.impressions ?? 0;
    if (row.post_title && !existing.title) existing.title = row.post_title;
    if (row.last_synced_at && (!existing.last_seen || row.last_synced_at > existing.last_seen)) {
      existing.last_seen = row.last_synced_at;
    }
    agg.set(cleanUrl, existing);
  }

  for (const row of mcRows ?? []) {
    if (!row.url) continue;
    const cleanUrl = normalizeFosenUrl(row.url);
    if (!cleanUrl) continue;
    const existing = agg.get(cleanUrl) ?? {
      url: cleanUrl,
      title: null,
      ga4_views: 0,
      mailchimp_clicks: 0,
      score: 0,
      last_seen: null,
    };
    existing.mailchimp_clicks += row.total_clicks ?? 0;
    agg.set(cleanUrl, existing);
  }

  for (const page of agg.values()) {
    page.score = page.ga4_views * 2 + page.mailchimp_clicks;
  }

  const pages = [...agg.values()]
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return NextResponse.json({ pages, period_days: days });
}

function normalizeFosenUrl(raw: string): string | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://fosen-tools.no${raw}`);
  } catch {
    return null;
  }
  if (!/fosen-tools\.no$/i.test(url.hostname)) return null;
  // Strip query + hash + trailing slash
  let path = url.pathname.replace(/\/$/, "");
  if (!path) path = "/";

  // Filter ut ikke-produkt/ikke-side-URLer
  const skipPrefix = [
    "/userfiles/",
    "/api/",
    "/kundesenter/",
    "/login",
    "/search",
    "/handlekurv",
    "/checkout",
    "/min-side",
  ];
  for (const p of skipPrefix) if (path.startsWith(p)) return null;
  if (path === "/" || path.length < 3) return null;

  return `https://fosen-tools.no${path}`;
}
