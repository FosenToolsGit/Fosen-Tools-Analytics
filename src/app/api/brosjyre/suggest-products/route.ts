import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Foreslår produkter til brosjyre-editoren basert på faktiske besøk på
 * fosen-tools.no. Primær kilde: GA4 page-views (`platform_posts`). Sekundær:
 * Mailchimp-klikk (`mailchimp_campaign_links`) — utvider dekningen siden GA4
 * toppost-sync er begrenset til topp 50 sider, og fanger opp produkter som er
 * mye klikket i nyhetsbrev men ikke nødvendigvis blant topp-50 trafikksidene.
 *
 * Score = `ga4_views * 2 + mailchimp_clicks` (samme vekting som
 * manufacturers-ruten).
 */

interface PostRow {
  post_url: string | null;
  impressions: number | null;
}

interface LinkRow {
  url: string | null;
  total_clicks: number | null;
  unique_clicks: number | null;
  last_click_at: string | null;
}

interface Suggestion {
  url: string;
  ga4_views: number;
  mailchimp_clicks: number;
  unique_clicks: number;
  score: number;
  last_click_at: string | null;
}

const PRODUCT_PATH_RE = /^\/([a-z][a-z0-9\-]+)\/([^\/]*\d[^\/]*)(?:\/[^\/?]+)?\/?(?:\?.*)?$/i;

const NON_BRAND_SLUGS = new Set([
  "produkter", "bransjer", "categories", "aviation", "webpages",
  "referanser", "kundesenter", "search", "innsikt", "innleggsbygger",
  "platform", "sokeord-generator", "brosjyre", "mandagsmote", "kundereise",
  "attribution", "varsler", "tags", "dashboard", "settings", "login", "ga4",
  "post", "posts", "ord", "kategori", "brand", "merker", "om-oss",
  "personvern", "vilkar",
]);

function pathProductKey(path: string): string | null {
  const m = PRODUCT_PATH_RE.exec(path);
  if (!m) return null;
  const slug = m[1].toLowerCase();
  if (NON_BRAND_SLUGS.has(slug)) return null;
  return `${slug}/${m[2]}`;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const limit = Math.max(1, Math.min(50, Number(sp.get("limit")) || 12));
  const days = Math.max(1, Math.min(365, Number(sp.get("days")) || 60));

  const since = new Date(Date.now() - days * 86400_000).toISOString();

  // GA4 page-views (primær kilde)
  const { data: posts, error: postsErr } = await supabase
    .from("platform_posts")
    .select("post_url, impressions")
    .eq("platform", "ga4")
    .eq("post_type", "page")
    .not("post_url", "is", null);

  if (postsErr) {
    return NextResponse.json(
      { error: postsErr.message, details: postsErr.details, hint: postsErr.hint, code: postsErr.code },
      { status: 500 }
    );
  }

  // Mailchimp-klikk (sekundær — utvider dekningen + tilfører klikk-signal)
  const { data: links, error: linksErr } = await supabase
    .from("mailchimp_campaign_links")
    .select("url, total_clicks, unique_clicks, last_click_at")
    .gte("last_click_at", since);

  if (linksErr) {
    return NextResponse.json(
      { error: linksErr.message, details: linksErr.details, hint: linksErr.hint, code: linksErr.code },
      { status: 500 }
    );
  }

  // Aggreger per produkt-key (`{slug}/{id}`) — samme produkt med/uten
  // seo-suffix telles én gang.
  const byKey = new Map<string, Suggestion>();

  for (const row of (posts as PostRow[] | null ?? [])) {
    if (!row.post_url) continue;
    const key = pathProductKey(row.post_url);
    if (!key) continue;
    const url = `https://fosen-tools.no${row.post_url.split("?")[0]}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.ga4_views += row.impressions ?? 0;
    } else {
      byKey.set(key, {
        url,
        ga4_views: row.impressions ?? 0,
        mailchimp_clicks: 0,
        unique_clicks: 0,
        score: 0,
        last_click_at: null,
      });
    }
  }

  for (const row of (links as LinkRow[] | null ?? [])) {
    if (!row.url) continue;
    let parsed: URL;
    try { parsed = new URL(row.url); } catch { continue; }
    const key = pathProductKey(parsed.pathname);
    if (!key) continue;
    const existing = byKey.get(key);
    const cleanUrl = `https://${parsed.host}${parsed.pathname}`;
    if (existing) {
      existing.mailchimp_clicks += row.total_clicks ?? 0;
      existing.unique_clicks += row.unique_clicks ?? 0;
      if (row.last_click_at && (!existing.last_click_at || row.last_click_at > existing.last_click_at)) {
        existing.last_click_at = row.last_click_at;
      }
    } else {
      byKey.set(key, {
        url: cleanUrl,
        ga4_views: 0,
        mailchimp_clicks: row.total_clicks ?? 0,
        unique_clicks: row.unique_clicks ?? 0,
        score: 0,
        last_click_at: row.last_click_at,
      });
    }
  }

  for (const s of byKey.values()) {
    s.score = s.ga4_views * 2 + s.mailchimp_clicks;
  }

  const suggestions = Array.from(byKey.values())
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return NextResponse.json({ suggestions, days, count: suggestions.length });
}
