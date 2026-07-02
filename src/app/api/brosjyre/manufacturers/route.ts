import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";

/**
 * Aggregerer per-merke produkt-URLer fra to kilder:
 *  - platform_posts (GA4 toppsider) — primær (faktiske page-views)
 *  - mailchimp_campaign_links — sekundær (utvider dekning siden GA4-sync er
 *    begrenset til topp 50 sider)
 *
 * Returnerer slug, label, antall unike produktsider, total page-views, og
 * total Mailchimp-klikk.
 */

// Slugs som ikke representerer en produsent — kategori-/seksjons-paths.
const NON_BRAND_SLUGS = new Set([
  "produkter", "bransjer", "categories", "aviation", "webpages",
  "referanser", "kundesenter", "search", "innsikt", "innleggsbygger",
  "platform", "sokeord-generator", "brosjyre", "mandagsmote", "kundereise",
  "attribution", "varsler", "tags", "dashboard", "settings", "login", "ga4",
  "post", "posts", "ord", "kategori", "brand", "merker", "om-oss",
  "personvern", "vilkar", "kundesenter",
]);

// Path-mønstre vi vurderer som produkt-URL:
//   /{slug}/{id}                              (Mailchimp-format)
//   /{slug}/{id}/{seo-slug}                   (GA4 / nettside-default)
// {slug} må starte med bokstav, {id} må inneholde minst ett siffer.
const PRODUCT_PATH_RE = /^\/([a-z][a-z0-9\-]+)\/([^\/]*\d[^\/]*)(?:\/[^\/?]+)?\/?(?:\?.*)?$/i;

interface SlugAggregate {
  slug: string;
  label: string;
  page_count: number;
  ga4_views: number;
  mailchimp_clicks: number;
  combined_score: number;
}

function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w)
    .join(" ");
}

function pathToSlug(path: string | null): string | null {
  if (!path) return null;
  const m = PRODUCT_PATH_RE.exec(path);
  if (!m) return null;
  const slug = m[1].toLowerCase();
  if (NON_BRAND_SLUGS.has(slug)) return null;
  return slug;
}

function pathToProductKey(path: string): string | null {
  const m = PRODUCT_PATH_RE.exec(path);
  if (!m) return null;
  return `${m[1].toLowerCase()}/${m[2]}`;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  // GA4 page-views
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

  // Mailchimp-klikk
  const { data: links, error: linksErr } = await supabase
    .from("mailchimp_campaign_links")
    .select("url, total_clicks");

  if (linksErr) {
    return NextResponse.json(
      { error: linksErr.message, details: linksErr.details, hint: linksErr.hint, code: linksErr.code },
      { status: 500 }
    );
  }

  // Aggreger: slug → {pages: Set<productKey>, ga4_views, mailchimp_clicks}
  const bySlug = new Map<string, { pages: Set<string>; ga4_views: number; mailchimp_clicks: number }>();

  const ensure = (slug: string) => {
    let v = bySlug.get(slug);
    if (!v) { v = { pages: new Set(), ga4_views: 0, mailchimp_clicks: 0 }; bySlug.set(slug, v); }
    return v;
  };

  for (const row of (posts ?? [])) {
    const slug = pathToSlug(row.post_url);
    if (!slug) continue;
    const key = pathToProductKey(row.post_url!);
    if (!key) continue;
    const v = ensure(slug);
    v.pages.add(key);
    v.ga4_views += row.impressions ?? 0;
  }

  for (const row of (links ?? [])) {
    if (!row.url) continue;
    let path: string;
    try { path = new URL(row.url).pathname; } catch { continue; }
    const slug = pathToSlug(path);
    if (!slug) continue;
    const key = pathToProductKey(path);
    if (!key) continue;
    const v = ensure(slug);
    v.pages.add(key);
    v.mailchimp_clicks += row.total_clicks ?? 0;
  }

  const manufacturers: SlugAggregate[] = Array.from(bySlug.entries())
    .map(([slug, v]) => ({
      slug,
      label: titleCaseSlug(slug),
      page_count: v.pages.size,
      ga4_views: v.ga4_views,
      mailchimp_clicks: v.mailchimp_clicks,
      combined_score: v.ga4_views * 2 + v.mailchimp_clicks,
    }))
    .filter(m => m.page_count >= 1)
    .sort((a, b) => b.combined_score - a.combined_score);

  return NextResponse.json({ manufacturers });
}
