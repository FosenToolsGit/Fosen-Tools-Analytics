// Server-side scraping av produktdata fra fosen-tools.no.
// Parser JSON-LD Product/ProductGroup + DOM-attributter (data-oldprice,
// .ProducerLogoImage, #description). Brukes både av /api/brosjyre/scrape-product
// og av /api/brosjyre/generate-from-manufacturer (sistnevnte kjører
// Promise.allSettled over flere URLer).

// Lazy-import av Playwright: Chromium-avhengigheten er IKKE tilgjengelig
// i Vercel serverless, og en top-level-import tvinger ALLE ruter som
// importerer denne fila (inkl. /api/prisplakat/share/[token]) til å feile
// med 500 ved module-loading — selv om de aldri kaller scrape-funksjonen.
// Løsning: dynamic-import inne i `extractImagesViaBrowser` der den
// faktisk brukes. Andre eksporterte funksjoner (scrapeProductByUrl,
// scrapePageByUrl) bruker fetch/regex og fungerer uten Playwright.
type ChromiumModule = typeof import("playwright")["chromium"];

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
  /** Fosen Tools-artikkelnummer (Multicase prd-num-label). */
  sku: string | null;
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

function extractFosenSku(html: string, sourceUrl: string): string | null {
  // Primary: <span class="prd-num-label">123766</span>
  const a = /<span[^>]*class=["'][^"']*prd-num-label[^"']*["'][^>]*>\s*([^<\s]+)\s*<\/span>/i.exec(html);
  if (a?.[1]) return decodeEntities(a[1]).trim();
  // Fallback: URL-mønster /{merke}/{artikkelnummer}/{slug}
  try {
    const parsed = new URL(sourceUrl);
    const segs = parsed.pathname.split("/").filter(Boolean);
    for (const s of segs) if (/^\d{4,7}$/.test(s)) return s;
  } catch {
    // ignore
  }
  return null;
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
    sku: extractFosenSku(html, sourceUrl),
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

// =============================================================================
// Generisk side-scraper (fallback for ikke-produkt-URLer)
// =============================================================================

export interface ScrapedPage {
  source_url: string;
  name: string;
  description: string | null;
  /** Tekst-snutter fra intro/ftseo-blokk (gir Gemini side-spesifikk kontekst). */
  bullets: string[];
  /** H2-overskrifter på siden — viser hvilke under-temaer som dekkes. */
  sections: string[];
  /** Innholdsbilder funnet på siden (banner, foto) — absolutte URL-er. */
  images: string[];
}

function pickMeta(html: string, name: string): string | null {
  // Multicase serverer attributter både med og uten anførselstegn, og rekkefølgen
  // på (name|property) og content kan variere — derfor to permutasjoner.
  const valuePattern = `(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`;
  const nameKey = `(?:name|property)\\s*=\\s*["']?${name}["']?`;
  const contentKey = `content\\s*=\\s*${valuePattern}`;
  const patterns = [
    new RegExp(`<meta\\s+${nameKey}\\s+${contentKey}`, "i"),
    new RegExp(`<meta\\s+${contentKey}\\s+${nameKey}`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const value = m[1] ?? m[2] ?? m[3];
      if (value) return decodeEntities(value).trim();
    }
  }
  return null;
}

function pickFirstTag(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = html.match(re);
  if (!m) return null;
  const text = m[1].replace(/<[^>]+>/g, "").trim();
  return text ? decodeEntities(text) : null;
}

function extractIntroParagraphs(html: string, max = 3): string[] {
  // Foretrekk innhold i ftseo-blokk hvis den finnes
  const seoMatch = html.match(/<section\s+class="ftseo"[\s\S]*?<\/section>/i);
  const region = seoMatch ? seoMatch[0] : html;
  const paragraphs: string[] = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(region)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    const clean = decodeEntities(text);
    if (clean.length < 30) continue; // hopp over kort boilerplate
    paragraphs.push(clean);
    if (paragraphs.length >= max) break;
  }
  return paragraphs;
}

function extractSectionHeadings(html: string, max = 8): string[] {
  // H2-overskrifter avslører hvilke under-temaer siden faktisk dekker.
  // Filtrerer ut footer-/nav-headers som er like på alle sider.
  const skip = new Set([
    "kundesenter",
    "utforsk",
    "fosen tools",
    "kontakt oss",
    "om oss",
    "følg oss",
  ]);
  const result: string[] = [];
  const seen = new Set<string>();
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    const clean = decodeEntities(text);
    const key = clean.toLowerCase();
    if (skip.has(key)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
    if (result.length >= max) break;
  }
  return result;
}

// Filnavn-/sti-fragmenter som avslører ikon/logo/dekor — ikke ekte innholdsfoto.
const IMG_JUNK =
  /(menuicon|sprite|favicon|seperator|separator|1px_transparent|placeholder|spinner|icon[-_. ]|[-_/]logo|logo[-_. ]|logomid|gaselle|miljofyrtarn|gronnpunkt|logo_negativ|app_themes|\/theme\/|\/social\/|\/dist\/|badge)/i;

/** Filter for én bilde-URL — felles for statisk og JS-rendret ekstraksjon. */
function keepImageUrl(u: string, seen: Set<string>): boolean {
  if (!u || u.startsWith("data:")) return false;
  const low = u.toLowerCase();
  if (!/\.(jpe?g|png|webp)(\?|$)/.test(low)) return false;
  if (IMG_JUNK.test(low)) return false;
  if (seen.has(u)) return false;
  seen.add(u);
  return true;
}

/**
 * Henter innholdsbilder fra den JS-rendrede DOM-en via headless Chromium.
 * Multicase-sider (f.eks. /hdfi) injiserer bildene klient-side, så et rent
 * `fetch` ser dem aldri — bare den ferdig-rendrede DOM-en har dem.
 */
async function extractImagesViaBrowser(
  url: string,
  max = 16
): Promise<string[]> {
  // Lazy-import Playwright her — tunge avhengigheter må ikke trekkes inn
  // ved module-load. Vercel kaster ut hele runtimen hvis chromium-binærene
  // mangler ved import. Når denne funksjonen kalles lokalt fungerer det.
  const { chromium } = await import("playwright");
  type ChromiumBrowser = Awaited<ReturnType<ChromiumModule["launch"]>>;
  let browser: ChromiumBrowser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    // Scroll gjennom hele siden — trigger lazy-load av bilder under fold.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          let y = 0;
          const timer = setInterval(() => {
            window.scrollBy(0, 800);
            y += 800;
            if (y > document.body.scrollHeight + 2000) {
              clearInterval(timer);
              resolve();
            }
          }, 110);
        })
    );
    await page.waitForTimeout(1200);
    const raw: string[] = await page.evaluate(() => {
      const urls: string[] = [];
      document.querySelectorAll("img").forEach((img) => {
        const el = img as HTMLImageElement;
        const s =
          el.currentSrc ||
          el.getAttribute("src") ||
          el.getAttribute("data-src") ||
          el.getAttribute("data-orgsrc") ||
          "";
        if (s) urls.push(s);
      });
      document
        .querySelectorAll<HTMLElement>("[style*='background-image']")
        .forEach((el) => {
          const m = getComputedStyle(el).backgroundImage.match(
            /url\(["']?([^"')]+)["']?\)/
          );
          if (m) urls.push(m[1]);
        });
      return urls;
    });
    const out: string[] = [];
    const seen = new Set<string>();
    for (const u of raw) {
      if (out.length >= max) break;
      if (keepImageUrl(u, seen)) out.push(u);
    }
    return out;
  } catch {
    return [];
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}

/**
 * Plukker innholdsbilder fra en side — banner, foto, produktbilder. Filtrerer
 * bort logoer, nav-ikoner, sprites, badges og SVG/GIF. Returnerer absolutte
 * URL-er til ekte foto-formater (jpg/png/webp).
 */
function extractImages(html: string, baseUrl: URL, max = 12): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string | null | undefined, isSrcset = false) => {
    if (!raw || out.length >= max) return;
    let u = decodeEntities(raw.trim());
    if (!u || u.startsWith("data:")) return;
    // srcset: «url 1x, url 2x» — ta første URL
    if (isSrcset) u = u.split(/\s*,\s*/)[0].trim().split(/\s+/)[0];
    // Multicase har URL-er med mellomrom i filnavn — encode dem
    u = u.replace(/ /g, "%20");
    try {
      u = new URL(u, baseUrl).toString();
    } catch {
      return;
    }
    const low = u.toLowerCase();
    // Kun ekte foto-formater (dropper svg/gif/ico)
    if (!/\.(jpe?g|png|webp)(\?|$)/.test(low)) return;
    if (IMG_JUNK.test(low)) return;
    if (seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  // Innholdsbilder: <img> / <source> — src foretrekkes (kun quoted, så
  // mellomrom i filnavn bevares), srcset + lazy-load-attributter som tillegg.
  const imgRe = /<(?:img|source)\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null && out.length < max) {
    const tag = m[0];
    const src = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (src) add(src[1] ?? src[2], false);
    // Lazy-load: data-src / data-orgsrc / data-original / data-lazy(-src)
    const lazy = tag.match(
      /\bdata-(?:orgsrc|original|lazy-src|lazy|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/i
    );
    if (lazy) add(lazy[1] ?? lazy[2], false);
    const srcset = tag.match(/\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    if (srcset) add(srcset[1] ?? srcset[2], true);
  }
  // background-image i inline-style (Multicase hero-blokker bruker dette)
  const bgRe =
    /background-image\s*:\s*url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
  while ((m = bgRe.exec(html)) !== null && out.length < max) {
    add(m[1] ?? m[2] ?? m[3]);
  }
  // Siste utvei: og:image — en intensjonell side-deling-bilde. Hopper over
  // JUNK-filteret (ligger ofte i /social/) så bilde-løse sider gir minst ett
  // brukbart bilde-valg i stedet for tomt galleri.
  if (out.length === 0) {
    const og = pickMeta(html, "og:image");
    if (og) {
      try {
        const u = new URL(decodeEntities(og.trim()).replace(/ /g, "%20"), baseUrl).toString();
        if (/\.(jpe?g|png|webp)(\?|$)/i.test(u)) out.push(u);
      } catch {
        /* ignorer ugyldig og:image */
      }
    }
  }
  return out;
}

/**
 * Henter generisk innhold fra en fosen-tools.no-side (custom-side, bransje-side,
 * produsent-side, kategori-side osv). Brukes som fallback når scrapeProductByUrl
 * ikke finner JSON-LD Product/ProductGroup.
 */
export async function scrapePageByUrl(
  url: string,
  opts: { jsImages?: boolean } = {}
): Promise<ScrapedPage> {
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
      headers: { "User-Agent": "FosenToolsAnalytics/1.0 Page-Scraper" },
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    throw new ScrapeProductError(
      err instanceof Error ? err.message : "Fetch failed",
      500
    );
  }
  if (!response.ok) {
    throw new ScrapeProductError(`Upstream ${response.status}`, 502);
  }
  const html = await response.text();

  const ogTitle = pickMeta(html, "og:title");
  const docTitle = pickFirstTag(html, "title");
  const h1 = pickFirstTag(html, "h1");
  // Bruker page-spesifikk description (<meta name="description">) — IKKE
  // og:description som ofte er global FT-default ("Skreddersydde verktøy...").
  const description = pickMeta(html, "description");
  const bullets = extractIntroParagraphs(html);
  const sections = extractSectionHeadings(html);

  // Foretrekk H1, så <title> (side-spesifikk — rydd «| Fosen Tools»-suffiks),
  // og:title sist (er ofte global FT-default «Fosen Tools | Skreddersydde …»).
  const cleanDoc =
    docTitle?.replace(/\s*[|–—-]\s*Fosen Tools.*$/i, "").trim() || null;
  const GENERIC = /^fosen tools\b/i;
  const rawName =
    h1 ??
    cleanDoc ??
    (ogTitle && !GENERIC.test(ogTitle) ? ogTitle : null) ??
    cleanDoc ??
    "";
  if (!rawName.trim()) {
    throw new ScrapeProductError(
      "Fant ingen tittel på siden (verken H1, og:title eller <title>).",
      422
    );
  }

  let images = extractImages(html, parsed);

  // Multicase rendrer mange sider (f.eks. /hdfi) klient-side — bildene finnes
  // bare i den JS-rendrede DOM-en. Hent dem via headless Chromium når bedt om.
  if (opts.jsImages) {
    const domImages = await extractImagesViaBrowser(parsed.toString());
    if (domImages.length > 0) images = domImages;
  }

  return {
    source_url: parsed.toString(),
    name: rawName.trim(),
    description,
    bullets,
    sections,
    images,
  };
}
