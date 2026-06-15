import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import {
  generateContent,
  filterProductsForTheme,
  toNewsletterInput,
  type FocusType,
} from "@/lib/services/mailchimp-content-generator";
import { scrapeProductByUrl } from "@/lib/services/scrape-product";
import type { NewsletterProduct } from "@/lib/services/mailchimp-builder";

interface SuggestionRow {
  url: string;
  name: string;
  score: number;
  ga4_views: number;
  mailchimp_clicks: number;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    themeInput?: string;
    variant?: number;
    productCount?: number;
    manualProductUrls?: string[];
    onlyInStock?: boolean;
    focus?: FocusType;
    discountPct?: number;
    extraContext?: string;
  };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const themeInput = body.themeInput?.trim() ?? "";
  const variant = body.variant ?? 0;
  const productCount = Math.min(Math.max(body.productCount ?? 3, 1), 5);
  const onlyInStock = body.onlyInStock ?? true;

  const content = generateContent(themeInput, variant, {
    focus: body.focus,
    discountPct: body.discountPct,
    extraContext: body.extraContext,
  });
  let products: NewsletterProduct[];

  if (body.manualProductUrls && body.manualProductUrls.length > 0) {
    products = await scrapeProducts(body.manualProductUrls, onlyInStock);
  } else {
    const suggestions = await getProductSuggestions(supabase);
    let filtered = filterProductsForTheme(suggestions, content);

    if (
      filtered.length < productCount &&
      (content.preferredManufacturers.length > 0 || content.productKeywords.length > 0)
    ) {
      const broad = await broadSearchByKeywords(
        supabase,
        content.preferredManufacturers,
        content.productKeywords
      );
      let fromCategory: SuggestionRow[] = [];
      if (content.midtCtaUrl.includes("/produkter/")) {
        fromCategory = await scrapeCategoryPage(content.midtCtaUrl, suggestions);
      }
      const seenUrls = new Set(filtered.map((s) => s.url));
      for (const item of [...broad, ...fromCategory]) {
        if (!seenUrls.has(item.url)) {
          filtered.push(item);
          seenUrls.add(item.url);
        }
      }
    }

    const overfetchMul = onlyInStock ? 4 : 3;
    const overfetch = Math.min(filtered.length, productCount * overfetchMul);
    const topUrls = filtered.slice(0, overfetch).map((s) => s.url);
    const allScraped = await scrapeProducts(topUrls, onlyInStock);
    products = allScraped.slice(0, productCount);
  }

  const suggestedFooterImage = await getLatestFridayPost(supabase);

  return NextResponse.json({
    content,
    products,
    suggestedFooterImage,
    suggestedMidtImage: null,
    payload: toNewsletterInput(content, products),
  });
}

async function scrapeCategoryPage(
  categoryUrl: string,
  existingSuggestions: SuggestionRow[]
): Promise<SuggestionRow[]> {
  let url = categoryUrl;
  if (!url.startsWith("http")) url = `https://fosen-tools.no${url}`;
  url = url.split("?")[0];

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    const productRegex =
      /href="(\/(?:milwaukee|wera|knipex|stahlwille|snap-on|facom|halder|husqvarna|bahco|hellberg|hultafors|bondhus|fluke|gigant|gedore|leatherman|mitutoyo|rennsteig|pelicase|pb-swiss-tools|mora-of-sweden|ledlenser|fosen-tools-custom|fosen-tools|kc-tools|sumake|viking-arm|zarges|brockhaus-heuer|solid-gear|lista|irwin)\/\d+\/[^"]+)"/gi;
    const matches = Array.from(html.matchAll(productRegex));
    const urls = Array.from(new Set(matches.map((m) => m[1])));

    const existingMap = new Map<string, SuggestionRow>();
    for (const s of existingSuggestions) {
      try {
        existingMap.set(new URL(s.url).pathname.toLowerCase(), s);
      } catch {}
    }

    const results: SuggestionRow[] = urls.map((path) => {
      const existing = existingMap.get(path.toLowerCase());
      if (existing) return existing;
      return {
        url: `https://fosen-tools.no${path}`,
        name: path.split("/").pop() ?? path,
        ga4_views: 0,
        mailchimp_clicks: 0,
        score: 0,
      };
    });

    results.sort((a, b) => b.score - a.score);
    return results;
  } catch {
    return [];
  }
}

async function broadSearchByKeywords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  manufacturers: string[],
  keywords: string[]
): Promise<SuggestionRow[]> {
  const productPattern =
    /^\/(milwaukee|wera|knipex|stahlwille|snap-on|facom|ledlenser|pelicase|hellberg|husqvarna|bahco|leatherman|mitutoyo|fosen-tools-custom|fosen-tools|rennsteig|brockhaus-heuer|kc-tools|sumake|hultafors|bondhus|lista|viking-arm|fluke|zarges|solid-gear|gigant|gedore|pb-swiss-tools|mora-of-sweden|halder|irwin)\/(\d+)/i;

  const { data: posts } = await supabase
    .from("platform_posts")
    .select("post_url, title, reach, impressions")
    .eq("platform", "ga4")
    .limit(2000);

  const productMap = new Map<string, { url: string; name: string; views: number }>();
  for (const post of posts ?? []) {
    const u = (post.post_url as string | null) ?? "";
    const title = ((post.title as string | null) ?? "").toLowerCase();
    if (!u || !productPattern.test(u)) continue;
    const lowerUrl = u.toLowerCase();

    if (manufacturers.length > 0) {
      const match = manufacturers.some((m) => lowerUrl.includes(`/${m}/`));
      if (!match) continue;
    }
    if (keywords.length > 0) {
      const match = keywords.some(
        (k) => title.includes(k.toLowerCase()) || lowerUrl.includes(k.toLowerCase())
      );
      if (!match) continue;
    }

    const key = u.split("?")[0].toLowerCase();
    const views = (post.reach as number | null) ?? (post.impressions as number | null) ?? 0;
    const existing = productMap.get(key);
    if (existing) existing.views += views;
    else
      productMap.set(key, {
        url: u.startsWith("http") ? u : `https://fosen-tools.no${u}`,
        name: (post.title as string | null) ?? key,
        views,
      });
  }

  const results: SuggestionRow[] = Array.from(productMap.values()).map((p) => ({
    url: p.url,
    name: p.name,
    ga4_views: p.views,
    mailchimp_clicks: 0,
    score: p.views,
  }));
  results.sort((a, b) => b.score - a.score);
  return results;
}

async function getProductSuggestions(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<SuggestionRow[]> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 60);

  const { data: posts } = await supabase
    .from("platform_posts")
    .select("post_url, title, reach, impressions, updated_at")
    .eq("platform", "ga4")
    .gte("updated_at", sinceDate.toISOString())
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
        productMap.set(path, { url: u, name: path, ga4_views: 0, mailchimp_clicks: clicks });
    } catch {}
  }

  const { data: drafts } = await supabase
    .from("mailchimp_drafts")
    .select("product_urls, created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  const lastUsed = new Map<string, Date>();
  for (const draft of drafts ?? []) {
    const urls = (draft.product_urls as string[] | null) ?? [];
    const created = new Date(draft.created_at as string);
    for (const u of urls) {
      try {
        const p = new URL(u).pathname.toLowerCase();
        if (!lastUsed.has(p)) lastUsed.set(p, created);
      } catch {}
    }
  }

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const results: SuggestionRow[] = [];
  for (const [key, p] of productMap.entries()) {
    const base = p.ga4_views * 2 + p.mailchimp_clicks;
    if (base < 1) continue;
    const usedAt = lastUsed.get(key);
    let mult = 1.3;
    if (usedAt) mult = usedAt > sixtyDaysAgo ? 0.2 : 1.2;
    results.push({
      url: p.url,
      name: p.name,
      ga4_views: p.ga4_views,
      mailchimp_clicks: p.mailchimp_clicks,
      score: Math.round(base * mult * 10) / 10,
    });
  }
  results.sort((a, b) => b.score - a.score);
  return results;
}

async function scrapeProducts(
  urls: string[],
  onlyInStock = true
): Promise<NewsletterProduct[]> {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const scraped = await scrapeProductByUrl(url);
      if (onlyInStock && scraped.in_stock !== true) throw new Error("out-of-stock");
      return {
        url,
        name: scraped.name.toUpperCase(),
        brandSku: scraped.manufacturer ? capitalizeFirst(scraped.manufacturer) : "",
        priceText: formatPriceText(scraped.price_now, scraped.price_before),
        imageUrl: scraped.image_url ?? "",
        ctaText: "Gå til produkt",
      } as NewsletterProduct;
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<NewsletterProduct> => r.status === "fulfilled")
    .map((r) => r.value);
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatPriceText(priceNow: number | null, priceBefore: number | null): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(n).replace(/,/g, " ");
  // Vis pris KUN ved rabatt (priceBefore > priceNow). Ikke-rabatterte produkter
  // står uten pris — leseren går til produktsiden for pris (B2B-norm).
  if (!priceNow || !priceBefore || priceBefore <= priceNow) return "";
  return `${fmt(priceNow)},- eks. mva. (før ${fmt(priceBefore)},-)`;
}

async function getLatestFridayPost(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ url: string; post_url: string; posted_at: string } | null> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 21);

  const { data: posts } = await supabase
    .from("platform_posts")
    .select("post_url, thumbnail_url, published_at, title")
    .eq("platform", "meta")
    .gte("published_at", sinceDate.toISOString())
    .order("published_at", { ascending: false })
    .limit(20);

  if (!posts || posts.length === 0) return null;

  const fridays = posts.filter((p) => {
    if (!p.published_at) return false;
    return new Date(p.published_at as string).getDay() === 5;
  });

  const best = fridays[0] ?? posts[0];
  if (!best.thumbnail_url || !best.post_url) return null;

  return {
    url: best.thumbnail_url as string,
    post_url: best.post_url as string,
    posted_at: best.published_at as string,
  };
}
