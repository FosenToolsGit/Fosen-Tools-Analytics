// Server-side scraping av produktdata fra fosen-tools.no.
// Parser JSON-LD Product/ProductGroup + DOM-attributter (data-oldprice,
// .ProducerLogoImage, #description). Brukes både av /api/brosjyre/scrape-product
// og av /api/brosjyre/generate-from-manufacturer (sistnevnte kjører
// Promise.allSettled over flere URLer).

export const SCRAPE_ALLOWED_HOSTS = ["fosen-tools.no", "www.fosen-tools.no"];

export interface ScrapedProduct {
  source_url: string;
  name: string;
  manufacturer: string;
  manufacturer_logo_url: string | null;
  image_url: string | null;
  image_placeholder: string;
  price_before: number;
  price_now: number;
  discount_pct: number;
  in_stock: boolean;
  category: string;
  bullets: string[];
}

export class ScrapeProductError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&aring;/g, "å")
    .replace(/&Aring;/g, "Å")
    .replace(/&aelig;/g, "æ")
    .replace(/&AElig;/g, "Æ")
    .replace(/&oslash;/g, "ø")
    .replace(/&Oslash;/g, "Ø")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");
}

function parsePrice(raw: string | number | null | undefined): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return raw;
  const cleaned = decodeEntities(String(raw))
    .replace(/\s/g, "")
    .replace(/,-$/, "")
    .replace(/kr$/i, "")
    .replace(/,/g, ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findProductNode(root: any): any | null {
  if (!root) return null;
  if (Array.isArray(root)) {
    for (const item of root) {
      const found = findProductNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof root !== "object") return null;
  const t = root["@type"];
  const types = Array.isArray(t) ? t : [t];
  if (types.includes("Product") || types.includes("ProductGroup")) return root;
  if (root["@graph"]) return findProductNode(root["@graph"]);
  return null;
}

function extractJsonLdProduct(html: string): Record<string, unknown> | null {
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const node = findProductNode(parsed);
      if (node) return node as Record<string, unknown>;
    } catch {
      // Mange sider har inline-JSON-LD som ikke parser — bare hopp over
    }
  }
  return null;
}

function extractDataOldPrice(html: string): number {
  const m = /data-oldprice=["']([^"']+)["']/i.exec(html);
  return m ? parsePrice(m[1]) : 0;
}

function extractProducerLogo(html: string, baseUrl: string): string | null {
  const a = /<img[^>]*class=["'][^"']*ProducerLogoImage[^"']*["'][^>]*src=["']([^"']+)["']/i.exec(html);
  const b = a ? null : /<img[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*ProducerLogoImage/i.exec(html);
  const src = a?.[1] || b?.[1];
  if (!src) return null;
  try {
    return new URL(decodeEntities(src), baseUrl).toString();
  } catch {
    return null;
  }
}

function extractDescriptionBullets(html: string): string[] {
  const m = /<div[^>]*id=["']description["'][^>]*>([\s\S]*?)<\/div>/i.exec(html);
  if (!m) return [];
  const text = decodeEntities(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
  if (!text) return [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const seen = new Set<string>();
  const bullets: string[] = [];
  for (const raw of sentences) {
    const s = raw.trim().replace(/[.!?]+$/, "");
    if (s.length < 8 || s.length > 72) continue;
    if (!/[a-zæøå]/.test(s)) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    bullets.push(s);
    if (bullets.length >= 4) break;
  }
  return bullets;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickFromOffers(offers: any): { price: number; inStock: boolean } {
  if (!offers) return { price: 0, inStock: false };
  const arr = Array.isArray(offers) ? offers : [offers];
  for (const o of arr) {
    if (!o) continue;
    const price = parsePrice(o.price ?? o.lowPrice ?? o.priceSpecification?.price);
    const avail = String(o.availability ?? "").toLowerCase();
    const inStock = avail.includes("instock");
    if (price > 0) return { price, inStock };
  }
  return { price: 0, inStock: false };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildFromJsonLd(node: any, sourceUrl: string, html: string): ScrapedProduct {
  const name = decodeEntities(String(node.name ?? "")).trim() || "Ukjent produkt";

  let imageUrl: string | null = null;
  const img = node.image;
  if (typeof img === "string") imageUrl = img;
  else if (Array.isArray(img) && img.length) imageUrl = typeof img[0] === "string" ? img[0] : img[0]?.url ?? null;
  else if (img && typeof img === "object") imageUrl = img.url ?? null;
  if (imageUrl) imageUrl = decodeEntities(imageUrl);

  let manufacturer = "";
  if (typeof node.brand === "string") manufacturer = node.brand;
  else if (node.brand?.name) manufacturer = String(node.brand.name);
  manufacturer = decodeEntities(manufacturer).trim();

  const category = decodeEntities(String(node.category ?? "")).trim();

  let { price: priceNow, inStock } = pickFromOffers(node.offers);
  if (priceNow === 0 && Array.isArray(node.hasVariant)) {
    for (const v of node.hasVariant) {
      const r = pickFromOffers(v?.offers);
      if (r.price > 0) {
        priceNow = r.price;
        inStock = r.inStock;
        break;
      }
    }
  }

  const priceBefore = extractDataOldPrice(html);
  const finalBefore = priceBefore > priceNow ? priceBefore : priceNow;
  const discountPct =
    finalBefore > 0 && finalBefore > priceNow
      ? Math.round(((finalBefore - priceNow) / finalBefore) * 100)
      : 0;

  return {
    source_url: sourceUrl,
    name,
    manufacturer,
    manufacturer_logo_url: extractProducerLogo(html, sourceUrl),
    image_url: imageUrl,
    image_placeholder: name.charAt(0).toUpperCase() || "?",
    price_before: finalBefore,
    price_now: priceNow,
    discount_pct: discountPct,
    in_stock: inStock,
    category,
    bullets: extractDescriptionBullets(html),
  };
}

/**
 * Henter HTML fra en fosen-tools.no produkt-URL og parser til ScrapedProduct.
 * Validerer hostname mot whitelist. Kaster ScrapeProductError ved feil.
 */
export async function scrapeProductByUrl(url: string): Promise<ScrapedProduct> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ScrapeProductError("Invalid url", 400);
  }
  if (!SCRAPE_ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw new ScrapeProductError("Host not allowed", 403);
  }

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      headers: { "User-Agent": "FosenToolsAnalytics/1.0 Brosjyre-Scraper" },
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    throw new ScrapeProductError(err instanceof Error ? err.message : "Fetch failed", 500);
  }
  if (!response.ok) {
    throw new ScrapeProductError(`Upstream ${response.status}`, 502);
  }
  const html = await response.text();

  const node = extractJsonLdProduct(html);
  if (!node) {
    throw new ScrapeProductError(
      "Fant ikke JSON-LD Product/ProductGroup på siden. Er dette en gyldig produktside?",
      422
    );
  }

  return buildFromJsonLd(node, parsed.toString(), html);
}
