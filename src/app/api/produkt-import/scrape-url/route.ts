import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { classify } from "@/lib/services/produktgruppe-classifier";

/**
 * Scraper en hvilken som helst produkt-URL (fosen-tools.no, leverandører som
 * Hellberg, Milwaukee, Wera, Husqvarna osv.) og returnerer felter som
 * passer rett inn i Multicase-importmal.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let url: string;
  try {
    const body = await request.json();
    url = String(body.url ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!url) return NextResponse.json({ error: "url påkrevd" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `HTTP ${res.status} fra ${url}` }, { status: 502 });
    }
    const html = await res.text();
    const parsed = parseProductFromHtml(html, url);
    const cls = classify(parsed.name, parsed.description);
    return NextResponse.json({ ...parsed, suggestedG1: cls.g1, suggestedG2: cls.g2, suggestedG3: cls.g3 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scraping feilet" },
      { status: 500 }
    );
  }
}

export interface ScrapedImportProduct {
  source_url: string;
  name: string;
  ean: string | null;
  mpn: string | null;
  manufacturer: string | null;
  image_url: string | null;
  price_now: number | null;
  price_before: number | null;
  currency: string | null;
  description: string;
  bullets: string[];
  category: string | null;
}

function parseProductFromHtml(html: string, sourceUrl: string): ScrapedImportProduct {
  const empty: ScrapedImportProduct = {
    source_url: sourceUrl,
    name: "",
    ean: null,
    mpn: null,
    manufacturer: null,
    image_url: null,
    price_now: null,
    price_before: null,
    currency: null,
    description: "",
    bullets: [],
    category: null,
  };

  // JSON-LD Product / ProductGroup
  const jsonLdMatches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const node of candidates) {
        const product = findProductNode(node);
        if (product) return enrichFromJsonLd(product, empty, html);
      }
    } catch {
      // ignore broken JSON-LD
    }
  }

  // Fallback: åpen graf + meta
  const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1];
  const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
  const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/i)?.[1];
  if (ogTitle) {
    empty.name = decode(ogTitle);
    empty.image_url = ogImage ? decode(ogImage) : null;
    empty.description = ogDesc ? decode(ogDesc) : "";
  }
  return empty;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findProductNode(node: any): any | null {
  if (!node || typeof node !== "object") return null;
  const t = node["@type"];
  if (t === "Product" || t === "ProductGroup" || (Array.isArray(t) && (t.includes("Product") || t.includes("ProductGroup")))) {
    return node;
  }
  if (Array.isArray(node["@graph"])) {
    for (const item of node["@graph"]) {
      const found = findProductNode(item);
      if (found) return found;
    }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function enrichFromJsonLd(p: any, base: ScrapedImportProduct, html: string): ScrapedImportProduct {
  const name = typeof p.name === "string" ? decode(p.name) : "";
  const sku = typeof p.sku === "string" || typeof p.sku === "number" ? String(p.sku) : null;
  const mpn = typeof p.mpn === "string" || typeof p.mpn === "number" ? String(p.mpn) : null;
  const gtin = p.gtin13 ?? p.gtin12 ?? p.gtin8 ?? p.gtin ?? null;
  const ean = gtin ? String(gtin) : null;
  const brand = typeof p.brand === "string"
    ? decode(p.brand)
    : (p.brand?.name ? decode(p.brand.name) : null);
  const image = Array.isArray(p.image) ? p.image[0] : p.image;
  const offers = Array.isArray(p.offers) ? p.offers[0] : p.offers;
  const priceNow = typeof offers?.price === "number"
    ? offers.price
    : (typeof offers?.price === "string" ? parseFloat(offers.price.replace(",", ".")) : null);
  const currency = offers?.priceCurrency ?? null;
  const category = typeof p.category === "string" ? decode(p.category) : null;

  // Før-pris fra data-oldprice (Multicase pattern)
  let priceBefore: number | null = null;
  const oldPriceMatch = html.match(/data-oldprice="([^"]+)"/i);
  if (oldPriceMatch) {
    const v = parseFloat(oldPriceMatch[1].replace(/\s/g, "").replace(",", "."));
    if (!isNaN(v)) priceBefore = v;
  }

  const description = typeof p.description === "string" ? decode(p.description) : "";
  const bullets = description
    .split(/[.;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8 && s.length < 200)
    .slice(0, 6);

  return {
    source_url: base.source_url,
    name,
    ean: ean ?? null,
    mpn: mpn ?? sku ?? null,
    manufacturer: brand,
    image_url: typeof image === "string" ? image : null,
    price_now: priceNow ?? null,
    price_before: priceBefore,
    currency,
    description,
    bullets,
    category,
  };
}

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}
