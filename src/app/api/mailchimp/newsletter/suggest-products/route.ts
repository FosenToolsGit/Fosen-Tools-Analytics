import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import {
  findProductCategory,
  generateContent,
  filterProductsForTheme,
} from "@/lib/services/mailchimp-content-generator";

interface SuggestionRow {
  url: string;
  name: string;
  ga4_views: number;
  mailchimp_clicks: number;
  score: number;
  last_used_at: string | null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const count = Math.min(parseInt(request.nextUrl.searchParams.get("count") || "12", 10) || 12, 30);
  const days = Math.min(parseInt(request.nextUrl.searchParams.get("days") || "60", 10) || 60, 180);
  const theme = request.nextUrl.searchParams.get("theme")?.trim() ?? "";

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sinceIso = sinceDate.toISOString();

  const { data: posts } = await supabase
    .from("platform_posts")
    .select("post_url, title, reach, impressions, updated_at")
    .eq("platform", "ga4")
    .gte("updated_at", sinceIso)
    .limit(1000);

  const productPattern =
    /^\/(milwaukee|wera|knipex|stahlwille|snap-on|facom|ledlenser|pelicase|hellberg|husqvarna|bahco|leatherman|mitutoyo|fosen-tools-custom|fosen-tools|rennsteig|brockhaus-heuer|kc-tools|sumake|hultafors|bondhus|lista|viking-arm|fluke|zarges|solid-gear|gigant|gedore|pb-swiss-tools|mora-of-sweden|halder|irwin)\/(\d+)/i;

  const productMap = new Map<
    string,
    { url: string; name: string; ga4_views: number; mailchimp_clicks: number }
  >();

  for (const post of posts ?? []) {
    const u = (post.post_url as string | null) ?? "";
    if (!u || !productPattern.test(u)) continue;
    const key = u.split("?")[0].toLowerCase();
    const views = (post.reach as number | null) ?? (post.impressions as number | null) ?? 0;
    const existing = productMap.get(key);
    if (existing) existing.ga4_views += views;
    else
      productMap.set(key, {
        url: u.startsWith("http") ? u : `https://fosen-tools.no${u}`,
        name: (post.title as string | null) ?? key,
        ga4_views: views,
        mailchimp_clicks: 0,
      });
  }

  const { data: links } = await supabase
    .from("mailchimp_campaign_links")
    .select("url, total_clicks")
    .limit(2000);

  for (const link of links ?? []) {
    const u = (link.url as string).split("?")[0];
    try {
      const path = new URL(u).pathname.toLowerCase();
      if (!productPattern.test(path)) continue;
      const existing = productMap.get(path);
      const clicks = (link.total_clicks as number) ?? 0;
      if (existing) existing.mailchimp_clicks += clicks;
      else
        productMap.set(path, {
          url: u,
          name: path,
          ga4_views: 0,
          mailchimp_clicks: clicks,
        });
    } catch {}
  }

  const { data: drafts } = await supabase
    .from("mailchimp_drafts")
    .select("product_urls, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const lastUsed = new Map<string, string>();
  for (const draft of drafts ?? []) {
    const urls = (draft.product_urls as string[] | null) ?? [];
    const created = draft.created_at as string;
    for (const u of urls) {
      try {
        const p = new URL(u).pathname.toLowerCase();
        if (!lastUsed.has(p)) lastUsed.set(p, created);
      } catch {}
    }
  }

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const suggestions: SuggestionRow[] = [];
  for (const [key, p] of productMap.entries()) {
    const baseScore = p.ga4_views * 2 + p.mailchimp_clicks;
    if (baseScore < 1) continue;
    const lastUsedAt = lastUsed.get(key) ?? null;
    let mult = 1.0;
    if (lastUsedAt) {
      const usedDate = new Date(lastUsedAt);
      mult = usedDate > sixtyDaysAgo ? 0.2 : 1.2;
    } else mult = 1.3;
    suggestions.push({
      url: p.url,
      name: p.name,
      ga4_views: p.ga4_views,
      mailchimp_clicks: p.mailchimp_clicks,
      score: Math.round(baseScore * mult * 10) / 10,
      last_used_at: lastUsedAt,
    });
  }

  suggestions.sort((a, b) => b.score - a.score);

  // Tema-filtrering + kategori-side-scraping
  let filteredProducts = suggestions;
  let themeMeta: { theme: string; category_slug?: string; category_url?: string } | null = null;

  if (theme) {
    const content = generateContent(theme, 0);
    const pc = findProductCategory(theme);
    const bySupabase = filterProductsForTheme(suggestions, content);

    if (pc) {
      const categoryUrl = `https://fosen-tools.no/produkter/${pc.slug}`;
      try {
        const res = await fetch(categoryUrl, {
          headers: { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const html = await res.text();
          const productRegex =
            /href="(\/(?:milwaukee|wera|knipex|stahlwille|snap-on|facom|halder|husqvarna|bahco|hellberg|hultafors|bondhus|fluke|gigant|gedore|leatherman|mitutoyo|rennsteig|pelicase|pb-swiss-tools|mora-of-sweden|ledlenser|fosen-tools-custom|fosen-tools|kc-tools|sumake|viking-arm|zarges|brockhaus-heuer|solid-gear|lista|irwin)\/\d+\/[^"]+)"/gi;
          const matches = Array.from(html.matchAll(productRegex));
          const urls = Array.from(new Set(matches.map((m) => m[1])));
          const existingMap = new Map(suggestions.map((s) => [new URL(s.url).pathname.toLowerCase(), s]));
          const seenUrls = new Set(bySupabase.map((s) => s.url));
          for (const path of urls) {
            const lower = path.toLowerCase();
            const existing = existingMap.get(lower);
            if (existing && !seenUrls.has(existing.url)) {
              bySupabase.push(existing);
              seenUrls.add(existing.url);
            } else if (!existing) {
              const fullUrl = `https://fosen-tools.no${path}`;
              if (!seenUrls.has(fullUrl)) {
                bySupabase.push({
                  url: fullUrl,
                  name: path.split("/").pop() ?? path,
                  ga4_views: 0,
                  mailchimp_clicks: 0,
                  score: 0,
                  last_used_at: null,
                });
                seenUrls.add(fullUrl);
              }
            }
          }
        }
      } catch {}
      themeMeta = { theme, category_slug: pc.slug, category_url: categoryUrl };
    } else {
      themeMeta = { theme };
    }

    bySupabase.sort((a, b) => b.score - a.score);
    filteredProducts = bySupabase;
  }

  return NextResponse.json({
    products: filteredProducts.slice(0, count),
    total: filteredProducts.length,
    period_days: days,
    theme: themeMeta,
  });
}
