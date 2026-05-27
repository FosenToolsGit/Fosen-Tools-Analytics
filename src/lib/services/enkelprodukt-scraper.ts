/**
 * Generisk produkt-scraper for Enkelprodukt-generator.
 * Henter raw data fra en leverandør-URL (Wera, KC Tools, Husqvarna, etc.)
 * + Multicase/fosen-tools.no, og returnerer normalisert struktur som så
 * destilleres av Gemini til ferdig Multicase-import-data.
 *
 * Bruker regex-parsing (ingen jsdom/cheerio) for å holde bundle lett.
 */

export interface ScrapedRaw {
  source_url: string;
  title: string;
  manufacturer: string | null;
  ean: string | null;
  mpn: string | null;
  /** Hoved-beskrivelse fra JSON-LD eller meta-description */
  description_short: string;
  /** Lengre beskrivelse hentet fra DOM (intro-paragrafer, første tekst-blokker) */
  description_long: string;
  /** Bullet-punkter fra <ul>-lister i description-områder */
  bullets: string[];
  /** Tekniske spesifikasjoner fra <table>, <dl>, <.specs>-elementer */
  specs: Array<{ key: string; value: string }>;
  /** Alle bilder funnet på siden (produktbilder + galleri) */
  images: string[];
  /** Salgs-/sluttpris (vises offentlig på leverandør-side) */
  price_now: number | null;
  price_before: number | null;
  currency: string | null;
  /** Innkjøps-/kostpris (kun i innlogget-modus / HTML-paste fra B2B-portal) */
  kostpris: number | null;
  /** Liste-/veiledende pris (kun i innlogget-modus / HTML-paste fra B2B-portal) */
  listepris: number | null;
  /** Domain-deteksjon for senere logikk */
  domain: string;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const UA_BOT = "Googlebot/2.1 (+http://www.google.com/bot.html)";

function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, c) => String.fromCharCode(parseInt(c, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(s: string): string {
  return decode(s.replace(/<[^>]+>/g, " "));
}

function absoluteUrl(src: string, base: string): string | null {
  if (!src) return null;
  // Hvis allerede absolutt-URL, returner som-er
  if (/^https?:\/\//i.test(src)) {
    try { return new URL(src).toString(); } catch { return null; }
  }
  // Hvis protokoll-relativt
  if (src.startsWith("//")) {
    try { return new URL(`https:${src}`).toString(); } catch { return null; }
  }
  // Krever base for å resolve relative URLs
  if (!base) return null;
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url: string): Promise<string> {
  let res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    // Multicase content-cloaker — prøv Googlebot
    res = await fetch(url, {
      headers: { "User-Agent": UA_BOT, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(20000),
    });
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} fra ${url}`);
  return res.text();
}

// ──────────────────────────────────────────────────────────────────────
// JSON-LD parsing
// ──────────────────────────────────────────────────────────────────────

interface JsonLdProduct {
  name?: string;
  description?: string;
  brand?: string | { name?: string };
  image?: string | string[];
  sku?: string;
  mpn?: string;
  gtin?: string;
  gtin13?: string;
  gtin12?: string;
  gtin8?: string;
  offers?:
    | { price?: number | string; priceCurrency?: string }
    | Array<{ price?: number | string; priceCurrency?: string }>;
  hasVariant?: Array<JsonLdProduct>;
}

function findProductJsonLd(html: string): JsonLdProduct | null {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of matches) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const node = findProductNode(item);
        if (node) return node;
      }
    } catch {
      // ignore broken JSON-LD
    }
  }
  return null;
}

function findProductNode(node: unknown): JsonLdProduct | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const t = obj["@type"];
  if (
    t === "Product" ||
    t === "ProductGroup" ||
    (Array.isArray(t) && (t.includes("Product") || t.includes("ProductGroup")))
  ) {
    return obj as JsonLdProduct;
  }
  if (Array.isArray(obj["@graph"])) {
    for (const child of obj["@graph"]) {
      const found = findProductNode(child);
      if (found) return found;
    }
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────
// Regex-baserte ekstraksjons-helpers
// ──────────────────────────────────────────────────────────────────────

function extractMetaContent(html: string, prop: string): string {
  // Støtter både property= og name= og både quote-stiler + unquoted
  const patterns = [
    new RegExp(`<meta\\s+(?:property|name)=["']${prop}["']\\s+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["']${prop}["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return decode(m[1]);
  }
  return "";
}

function extractH1(html: string): string {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? stripTags(m[1]) : "";
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripTags(m[1]) : "";
}

/** Lukket-element-ekstraktor for selektorer som har class= */
function extractElementsByClass(html: string, classPattern: string, tagName = "div"): string[] {
  const out: string[] = [];
  // Match <tag ... class="...{classPattern}...">CONTENT</tag>
  // Simplified: leter etter element-start med class som matcher, fanger frem til </tag>
  const re = new RegExp(
    `<${tagName}[^>]*\\sclass=["'][^"']*\\b${classPattern}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "gi",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1]);
    if (out.length > 5) break;
  }
  return out;
}

/** Hent bilder fra HTML */
function extractImages(html: string, jsonLd: JsonLdProduct | null, baseUrl: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (raw: string) => {
    if (!raw) return;
    const abs = absoluteUrl(raw, baseUrl);
    if (!abs || seen.has(abs)) return;
    const lower = abs.toLowerCase();
    if (/spacer|placeholder|loading|blank|1x1|favicon|sprite/i.test(lower)) return;
    if (/[\/._-](icon|logo)[\/._-]/i.test(lower)) return;
    if (/\.svg(\?|$)/i.test(lower)) return;
    seen.add(abs);
    out.push(abs);
  };

  // 1. JSON-LD image (høyest prioritet)
  if (jsonLd?.image) {
    const arr = Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image];
    for (const u of arr) {
      if (typeof u === "string") push(u);
    }
  }

  // 2. OG-bilder
  const og = extractMetaContent(html, "og:image");
  if (og) push(og);

  // 3. Alle <img>-tagger med src
  const imgMatches = [...html.matchAll(/<img\b[^>]*>/gi)];
  for (const im of imgMatches) {
    const tag = im[0];
    // Hent ulike src-varianter
    const candidates: string[] = [];
    const srcset = tag.match(/data-zoom-image=["']([^"']+)["']/i);
    if (srcset) candidates.push(srcset[1]);
    const dataLarge = tag.match(/data-large=["']([^"']+)["']/i);
    if (dataLarge) candidates.push(dataLarge[1]);
    const dataSrc = tag.match(/data-src=["']([^"']+)["']/i);
    if (dataSrc) candidates.push(dataSrc[1]);
    const src = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (src) candidates.push(src[1]);

    // Skip åpenbare ikon-bilder via dimensjoner
    const w = parseInt(tag.match(/\bwidth=["']?(\d+)/i)?.[1] || "0", 10);
    const h = parseInt(tag.match(/\bheight=["']?(\d+)/i)?.[1] || "0", 10);
    if ((w > 0 && w < 80) || (h > 0 && h < 80)) continue;

    for (const c of candidates) push(c);
  }

  return out.slice(0, 16);
}

/** Henter spec-tabeller (table tr td×2 + dl dt/dd) */
function extractSpecs(html: string): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  const seen = new Set<string>();

  // <table> med to-kolonne-rader
  const tableMatches = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  for (const tm of tableMatches) {
    const rows = [...tm[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    for (const r of rows) {
      const cells = [...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => stripTags(c[1]));
      if (cells.length === 2 && cells[0] && cells[1]) {
        const k = cells[0];
        const v = cells[1];
        if (k.length > 60 || v.length > 200) continue;
        const key = k.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ key: k, value: v });
        }
      }
    }
  }

  // <dl>/<dt>/<dd>
  const dlMatches = [...html.matchAll(/<dl\b[^>]*>([\s\S]*?)<\/dl>/gi)];
  for (const dl of dlMatches) {
    const dts = [...dl[1].matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>/gi)].map((m) => stripTags(m[1]));
    const dds = [...dl[1].matchAll(/<dd\b[^>]*>([\s\S]*?)<\/dd>/gi)].map((m) => stripTags(m[1]));
    const len = Math.min(dts.length, dds.length);
    for (let i = 0; i < len; i++) {
      const k = dts[i];
      const v = dds[i];
      const key = k.toLowerCase();
      if (k && v && !seen.has(key)) {
        seen.add(key);
        out.push({ key: k, value: v });
      }
    }
  }

  return out.slice(0, 30);
}

/** Henter bullet-punkter fra <ul>-områder relatert til beskrivelse */
function extractBullets(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  // Lete etter <ul> innenfor description-container
  const targets = [
    /class=["'][^"']*(?:product-description|product-features|feature-list|description|product-detail)[^"']*["'][\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/gi,
    /id=["']description["'][\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/gi,
  ];

  for (const re of targets) {
    const matches = [...html.matchAll(re)];
    for (const m of matches) {
      const lis = [...m[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
      for (const li of lis) {
        const t = stripTags(li[1]);
        if (t.length >= 10 && t.length <= 200) {
          const key = t.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            out.push(t);
          }
        }
      }
      if (out.length >= 8) break;
    }
    if (out.length >= 8) break;
  }

  return out.slice(0, 10);
}

/** Henter lengre beskrivelses-tekst fra intro-paragrafer */
function extractLongDescription(html: string): string {
  const targets = [
    /<div[^>]*\sclass=["'][^"']*product-description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*\sid=["']description["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*\sclass=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<section[^>]*\sclass=["'][^"']*description[^"']*["'][^>]*>([\s\S]*?)<\/section>/i,
  ];
  for (const re of targets) {
    const m = html.match(re);
    if (!m) continue;
    const inner = m[1];
    const paragraphs: string[] = [];
    const pMatches = [...inner.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];
    for (const pm of pMatches) {
      const t = stripTags(pm[1]);
      if (t.length >= 30) paragraphs.push(t);
    }
    if (paragraphs.length > 0) return paragraphs.slice(0, 4).join("\n\n");
    // Fallback: hele tekst-innholdet
    const all = stripTags(inner);
    if (all.length >= 80) return all.slice(0, 1500);
  }
  return "";
}

/** Domain-basert produsent-deteksjon hvis JSON-LD ikke har brand */
function guessManufacturerFromHost(host: string): string | null {
  const h = host.toLowerCase();
  if (h.includes("wera")) return "Wera";
  if (h.includes("kctools") || h.includes("kc-tools")) return "KC Tools";
  if (h.includes("sumake")) return "Sumake";
  if (h.includes("knipex")) return "Knipex";
  if (h.includes("husqvarna")) return "Husqvarna";
  if (h.includes("stahlwille")) return "Stahlwille";
  if (h.includes("facom")) return "Facom";
  if (h.includes("snapon") || h.includes("snap-on")) return "Snap-on";
  if (h.includes("milwaukee")) return "Milwaukee";
  if (h.includes("bahco")) return "Bahco";
  if (h.includes("leatherman")) return "Leatherman";
  if (h.includes("mitutoyo")) return "Mitutoyo";
  if (h.includes("pelican") || h.includes("peli")) return "Pelicase";
  if (h.includes("gedore")) return "Gedore";
  if (h.includes("hellberg")) return "Hellberg";
  if (h.includes("rennsteig")) return "Rennsteig";
  if (h.includes("pbswisstools") || h.includes("pb-swiss")) return "PB Swiss Tools";
  if (h.includes("ledlenser")) return "Ledlenser";
  if (h.includes("morakniv")) return "Morakniv";
  return null;
}

/** Henter kostpris + listepris fra HTML (typisk B2B-portaler).
 *  Returnerer null,null hvis ingen patterns matcher. */
function extractB2BPrices(html: string): { kostpris: number | null; listepris: number | null } {
  // Norske patterns: "Kostpris", "Innkjøpspris", "Nettopris" → kostpris
  //                  "Listepris", "Veil. pris", "Veiledende pris", "UVP" → listepris
  const text = stripTags(html).toLowerCase();

  function findPriceNear(...patterns: RegExp[]): number | null {
    for (const pat of patterns) {
      const m = text.match(pat);
      if (m) {
        // Hent første tall i fanget gruppe (eller etter pattern)
        const numStr = (m[1] || m[0]).replace(/[^\d,.]/g, "").replace(/\s/g, "").replace(",", ".");
        // Håndter tusen-separator som punktum (1.249,00 → 1249.00)
        const cleaned = numStr.replace(/\.(?=\d{3}(\D|$))/g, "");
        const n = parseFloat(cleaned);
        if (!isNaN(n) && n > 0 && n < 10_000_000) return n;
      }
    }
    return null;
  }

  // Tabell-baserte priser i HTML (selv om vi ser på stripped text, finner vi tall etter etikett)
  const kostpris = findPriceNear(
    /(?:kostpris|innkj[øo]pspris|netto[\s-]?pris|nettopris|innpris|kost\s+nok)[^a-z\d]{0,30}([\d.,\s]+)/i,
    /(?:cost\s+price|net\s+price|buying\s+price)[^a-z\d]{0,30}([\d.,\s]+)/i,
  );
  const listepris = findPriceNear(
    /(?:listepris|veil(?:edende)?\.?\s*pris|veil\.?\s*utsalg|uvp|brutto[\s-]?pris)[^a-z\d]{0,30}([\d.,\s]+)/i,
    /(?:list\s+price|retail\s+price|msrp|rrp)[^a-z\d]{0,30}([\d.,\s]+)/i,
  );

  return { kostpris, listepris };
}

// ──────────────────────────────────────────────────────────────────────
// Hoved-API
// ──────────────────────────────────────────────────────────────────────

export async function scrapeProductPage(url: string, opts: { scrape_b2b_prices?: boolean } = {}): Promise<ScrapedRaw> {
  const html = await fetchHtml(url);
  return parseHtml(html, url, opts);
}

/**
 * Scraper fra rå HTML (eller body-tekst) som brukeren har limt inn.
 * Brukes når URL-en er bak innlogging eller har anti-scrape.
 * sourceUrl er valgfri — kun brukt for absolute URL-resolving og produsent-deteksjon.
 */
export async function scrapeFromHtml(
  html: string,
  sourceUrl?: string,
  opts: { scrape_b2b_prices?: boolean } = {},
): Promise<ScrapedRaw> {
  // Hvis brukeren limte inn bare tekst (ikke HTML), wrap det i en <body>
  // så regex-helperne våre ikke krasjer på manglende tags.
  const looksLikeHtml = /<[a-z]+[\s>]/i.test(html);
  const safeHtml = looksLikeHtml ? html : `<body><div class="description"><p>${html}</p></div></body>`;
  return parseHtml(safeHtml, sourceUrl || "", opts);
}

function parseHtml(html: string, url: string, opts: { scrape_b2b_prices?: boolean } = {}): ScrapedRaw {
  const jsonLd = findProductJsonLd(html);

  // Title
  const title =
    (jsonLd?.name && decode(jsonLd.name)) ||
    extractH1(html) ||
    extractMetaContent(html, "og:title") ||
    extractTitle(html);

  // Produsent
  let manufacturer: string | null = null;
  if (jsonLd?.brand) {
    manufacturer =
      typeof jsonLd.brand === "string"
        ? decode(jsonLd.brand)
        : jsonLd.brand.name
        ? decode(jsonLd.brand.name)
        : null;
  }
  if (!manufacturer && url) {
    try {
      manufacturer = guessManufacturerFromHost(new URL(url).hostname);
    } catch {
      // ignore invalid URL
    }
  }

  // Pris fra JSON-LD
  let price_now: number | null = null;
  let currency: string | null = null;
  if (jsonLd?.offers) {
    const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
    if (offer?.price !== undefined) {
      const p = typeof offer.price === "number" ? offer.price : parseFloat(String(offer.price).replace(",", "."));
      if (!isNaN(p)) price_now = p;
    }
    currency = offer?.priceCurrency ?? null;
  } else if (jsonLd?.hasVariant?.[0]?.offers) {
    const offer = Array.isArray(jsonLd.hasVariant[0].offers)
      ? jsonLd.hasVariant[0].offers[0]
      : jsonLd.hasVariant[0].offers;
    if (offer?.price !== undefined) {
      const p = typeof offer.price === "number" ? offer.price : parseFloat(String(offer.price).replace(",", "."));
      if (!isNaN(p)) price_now = p;
    }
  }

  // Før-pris fra Multicase
  let price_before: number | null = null;
  const oldM = html.match(/data-oldprice="([^"]+)"/i);
  if (oldM) {
    const v = parseFloat(oldM[1].replace(/\s/g, "").replace(",", "."));
    if (!isNaN(v)) price_before = v;
  }

  const ean = jsonLd?.gtin13 || jsonLd?.gtin12 || jsonLd?.gtin8 || jsonLd?.gtin || null;
  const mpn = jsonLd?.mpn || jsonLd?.sku || null;

  const description_short =
    (jsonLd?.description && decode(jsonLd.description)) ||
    extractMetaContent(html, "description") ||
    extractMetaContent(html, "og:description");

  const description_long = extractLongDescription(html);
  const bullets = extractBullets(html);
  const specs = extractSpecs(html);
  const images = extractImages(html, jsonLd, url);

  // B2B-priser kun hvis eksplisitt forespurt (default: nei — fordi mønstrene
  // av og til matcher offentlige pristabeller og forvirrer)
  const b2b = opts.scrape_b2b_prices
    ? extractB2BPrices(html)
    : { kostpris: null, listepris: null };

  let domain = "";
  try {
    domain = url ? new URL(url).hostname : "";
  } catch {
    domain = "";
  }

  return {
    source_url: url,
    title,
    manufacturer,
    ean: ean ? String(ean) : null,
    mpn: mpn ? String(mpn) : null,
    description_short,
    description_long,
    bullets,
    specs,
    images,
    price_now,
    price_before,
    currency,
    kostpris: b2b.kostpris,
    listepris: b2b.listepris,
    domain,
  };
}

// Suppress unused import warning for helper used optionally
void extractElementsByClass;
