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
  /** Modellnummer (kort tall-kode som Snickers «6943»). IKKE leverandørproduktnr. */
  model_code?: string | null;
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

/**
 * Parser produkt-data fra rå PDF-tekst (pdf-parse output).
 * PDF-er er ikke HTML — vi må gjette struktur fra layout og linje-mønster.
 *
 * Heuristikk:
 *  - Første rene tall-linje (3-15 sifre) = produktkode (mpn)
 *  - Tittel = de første 1-3 korte beskrivende linjene FØR første lang
 *    paragraf-linje (>80 tegn). Slås sammen til én streng.
 *  - Description_long = alle paragraf-linjer (>40 tegn), de første 5
 *  - Description_short = første paragraf-linje
 *  - Bullets = korte linjer (8-90 tegn) etter første paragraf, som ikke er
 *    nye paragrafer og ikke ren spec («Kode: 123»).
 */
/**
 * Mange leverandør-PDF-er bruker font-subset som mapper ligaturer
 * («fi», «fl», «ff», «ffi») til private-use-area Unicode-tegn.
 * Tegnene varierer per font, men vi ser samme mønster i Snickers,
 * Hultafors og Wera: greske bokstaver brukt som ligatur-proxy.
 * Fikser dette POST-pdf-parse så all videre logikk får ren norsk tekst.
 */
function normalizePdfLigatures(input: string): string {
  return input
    // Ligaturer kodet som greske/symbol-tegn (Snickers-mønster)
    .replace(/Υ/g, "fl")  // «reΥeksbånd» → «refleksbånd»
    .replace(/υ/g, "fl")
    .replace(/θ/g, "fi")  // «sertiθsert» → «sertifisert»
    .replace(/Θ/g, "fi")
    .replace(/Φ/g, "ff")  // «stΦutet» → «stoffutet»
    .replace(/φ/g, "ff")
    .replace(/Ψ/g, "ffi")
    .replace(/ψ/g, "ffi")
    .replace(/Δ/g, "fb")
    // Unicode private-use-area-tegn (felles Adobe-font-subset)
    .replace(//g, "fi")
    .replace(//g, "fl")
    .replace(//g, "ffi")
    .replace(//g, "ffl")
    // Ekte Unicode-ligaturer (sjeldne men forekommer)
    .replace(/ﬀ/g, "ff")
    .replace(/ﬁ/g, "fi")
    .replace(/ﬂ/g, "fl")
    .replace(/ﬃ/g, "ffi")
    .replace(/ﬄ/g, "ffl");
}

/**
 * Datablad-seksjon-headere som dukker opp på leverandør-PDF-er
 * (Snickers, Hultafors, Wera). Brukes både i re-flow (aldri glu med
 * forrige linje) og i section-extraction (specs per seksjon).
 */
const SECTION_HEADER_RE = /^(Størrelse|Size|Farge|Color|Colour|Materiale|Material|Care|Vask|Pleie|Sertifisering|Certifications?|Spesifikasjoner|Specifications?)\s*$/i;

/** Seksjoner vi IKKE viser i spec-tabellen (variant-spesifikt — basket-rad gir riktig verdi). */
const SECTION_SKIP_IN_SPECS = /^(Størrelse|Size|Farge|Color|Colour)\s*$/i;

export function scrapeFromPdfText(text: string, filename: string): ScrapedRaw {
  // Step 0: Normaliser font-substituerte ligaturer FØR vi reflow'er linjer
  text = normalizePdfLigatures(text);
  // Step 1: Re-flow tekst. PDF-tekst er ofte hard-wrapped på 50-60 tegn
  // (layout-grenser). Join linjer som ikke ender med setningsslutt-tegn
  // og hvor neste linje fortsetter med lowercase eller et small-word.
  const rawLines = text.split(/\r?\n/).map((l) => l.trim());
  const reflowed: string[] = [];
  let buf = "";
  /** Flag: vi er forbi tittel-territoriet og inne i bullets/beskrivelse.
   *  Brukes til å SKRU AV «kort linje med stor bokstav slås sammen med
   *  forrige»-regelen — den regelen er kun nyttig for tittel-fragmenter
   *  som er splittet over flere linjer i PDF-en. */
  let pastTitle = false;
  for (let i = 0; i < rawLines.length; i++) {
    const l = rawLines[i];
    if (!l) {
      if (buf) { reflowed.push(buf); buf = ""; }
      continue;
    }
    // URL-only-linjer (footer-junk: «snickersworkwear.com») skal aldri
    // limes med forrige — selv om de starter med lowercase 's' osv.
    const isUrlOnly = /^[\w-]+\.(com|no|se|de|fr|net|org|io)(\/[^\s]*)?$/i.test(l);
    if (isUrlOnly) {
      if (buf) reflowed.push(buf);
      buf = l;
      continue;
    }
    // Rene tall-linjer (produktkoder/EAN) skal aldri slås sammen
    const isStandalone = /^\d{3,15}$/.test(l);
    const bufIsStandalone = /^\d{3,15}$/.test(buf);
    // Section-headers («Materiale», «Care», «Farge»...) skal også stå
    // alene så vi kan dele PDF-en i seksjoner senere
    const isSectionHeader = SECTION_HEADER_RE.test(l);
    const bufIsSectionHeader = SECTION_HEADER_RE.test(buf);
    if (!buf || bufIsStandalone || isStandalone || isSectionHeader || bufIsSectionHeader) {
      if (buf) reflowed.push(buf);
      buf = l;
      continue;
    }
    const endsSentence = /[.!?:;]\s*$/.test(buf);
    // Continuation: lowercase, digit, komma/parentes, OG enhets-symboler
    // (ºC, °F, %, mm/cm) som typisk følger et tall på linja over
    const nextIsContinuation = /^[a-zæøå0-9,)°ºµ%]/.test(l) || /^(og|eller|i|på|av|med|for|til|som|er|har|den|de|men|fra|under|over|mot|uten)\s/i.test(l);
    // Hvis neste linje starter med samme ord som forrige (badge-repeat),
    // ikke join — la badge stå alene (parser kan da drope den)
    const bufFirstWord = buf.split(/\s+/)[0]?.toLowerCase() || "";
    const nextFirstWord = l.split(/\s+/)[0]?.toLowerCase() || "";
    const isBadgeRepeat = bufFirstWord && bufFirstWord === nextFirstWord && buf.split(/\s+/).length <= 2;
    if (isBadgeRepeat) {
      reflowed.push(buf);
      buf = l;
    } else if (!endsSentence && nextIsContinuation) {
      buf = `${buf} ${l}`;
    } else if (!pastTitle && !endsSentence && l.length < 50 && /^[A-ZÆØÅ]/.test(l) && buf.length < 80) {
      // Sannsynlig tittel-fortsettelse (kort linje, ny stor bokstav) —
      // kun lov FØR vi har sett en hel beskrivelses-setning. Bullets er
      // ofte korte og kapitaliserte, men skal IKKE limes sammen.
      buf = `${buf} ${l}`;
    } else {
      reflowed.push(buf);
      buf = l;
    }
    // Når vi har sett en lang beskrivelses-setning, er tittel-territoriet
    // ferdig og short-cap-joining slås av for resten av PDF-en.
    if (endsSentence && buf.length >= 40) pastTitle = true;
    if (l.length >= 80) pastTitle = true;
  }
  if (buf) reflowed.push(buf);

  const lines = reflowed.filter((l) => l.length > 0);

  // 2) Leverandørproduktnummer (mpn) — VÆR KONSERVATIV. 4-sifrede koder er
  // ofte bare modellnummer (Snickers «6943»), ikke supplier-SKU. Vi krever:
  //   - 8+ sifre (typisk Wera «05006529001» = 11 siffer), ELLER
  //   - Alfanumerisk med bindestrek/punktum/skråstrek (Knipex-style «70 02 160»,
  //     Stahlwille-style «76211020»)
  // Korte rene tall-koder (3-7 siffer) lagres som «model_code» og brukes
  // som fallback hvis brukeren ikke har bedre info, men UI bør si fra.
  let mpn: string | null = null;
  let modelCode: string | null = null;
  for (const l of lines.slice(0, 12)) {
    if (/^\d{8,15}$/.test(l)) { mpn = l; break; }
    // Alfanumerisk med separator (Knipex/Stahlwille-mønster)
    if (/^[A-Z0-9][A-Z0-9\s./-]{5,18}[A-Z0-9]$/.test(l) && /[-./]/.test(l) && /\d/.test(l)) {
      mpn = l.replace(/\s+/g, "");
      break;
    }
    // Korte tall-koder = modellnummer, ikke mpn
    if (!modelCode && /^\d{3,7}$/.test(l)) modelCode = l;
  }

  // 3) EAN (8/12/13/14 digits anywhere)
  let ean: string | null = null;
  const eanRe = /\b(\d{8}|\d{12,14})\b/g;
  for (const l of lines) {
    const m = l.match(eanRe);
    if (m) {
      const candidate = m.find((c) => c.length >= 12) || m[0];
      if (candidate !== mpn) { ean = candidate; break; }
    }
  }

  // 4) Tittel — første linje med ord-tegn som IKKE er ren-tall og som har
  // 3-15 ord (typisk produkttittel-lengde). Hopp over 1-ords-kategori-tag
  // hvis neste linje er en lengre setning som åpenbart er tittel.
  let title = "";
  let titleLineIdx = -1;
  let categoryTag: string | null = null;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const l = lines[i];
    if (/^\d{3,15}$/.test(l)) continue;
    const wordCount = l.split(/\s+/).length;
    // Kort 1-2-ords-linje før tittel = kategori-badge (Snickers: «High-Vis»)
    if (!categoryTag && wordCount <= 2 && l.length < 20 && /^[A-ZÆØÅ]/.test(l)) {
      categoryTag = l;
      continue;
    }
    // Tittel = 3+ ord, 10+ tegn, ikke en hel setning (< 120 tegn)
    if (wordCount >= 3 && l.length >= 10 && l.length <= 120) {
      title = l.replace(/[,\s]+$/, "");
      titleLineIdx = i;
      break;
    }
  }
  // Drop kategori-badge hvis den allerede står som første ord i tittelen
  if (categoryTag && title.toLowerCase().startsWith(categoryTag.toLowerCase())) {
    // Tittelen inneholder kategorien — ikke prefix den på nytt
  } else if (categoryTag && title) {
    // Kategori-badge er distinkt info — behold som prefix
    title = `${categoryTag} ${title}`;
  }
  if (!title) {
    // Fallback: kombiner de første 1-3 ikke-tall-linjene
    const parts = lines.slice(0, 4).filter((l) => !/^\d{3,15}$/.test(l) && /[a-zA-ZæøåÆØÅ]/.test(l));
    title = parts.slice(0, 2).join(" ").replace(/[,\s]+$/, "");
  }
  if (!title) title = filename.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ");

  // Finn første section-header-linje (Størrelse/Materiale/Care/...) — alt
  // før det er beskrivelse+bullets, alt etter er strukturerte specs.
  let sectionStartIdx = -1;
  for (let i = titleLineIdx + 1; i < lines.length; i++) {
    if (SECTION_HEADER_RE.test(lines[i])) {
      sectionStartIdx = i;
      break;
    }
  }
  const contentEndIdx = sectionStartIdx > 0 ? sectionStartIdx : lines.length;

  // 5) Description — fulle setninger FØR seksjons-blokken.
  // Bullets — korte feature-linjer (8-90 tegn) FØR seksjons-blokken.
  const paragraphs: string[] = [];
  const bulletStartCandidates: string[] = [];
  let inBulletRegion = false;
  for (let i = titleLineIdx + 1; i < contentEndIdx; i++) {
    const l = lines[i];
    const isParaLike = l.length >= 60 || /[.!?]\s*$/.test(l);
    if (!inBulletRegion && isParaLike && l.length >= 30) {
      paragraphs.push(l);
    } else {
      if (paragraphs.length > 0 && l.length < 90 && l.length >= 8) {
        inBulletRegion = true;
        bulletStartCandidates.push(l);
      }
    }
  }
  const description_short = paragraphs[0] || "";
  const description_long = paragraphs.slice(0, 6).join("\n\n");

  // 6) Bullets — fra bullet-region-kandidater, streng filtrering så vi
  // ikke får inn URL-er, footer-linjer, eller spec-key-collisions.
  const bullets: string[] = [];
  for (const l of bulletStartCandidates) {
    if (/^\d+$/.test(l)) continue;
    if (/^[A-ZÆØÅ][a-zæøå]+\s*:\s/.test(l)) continue; // "Kode: 123"-spec
    if (paragraphs.some((p) => p.includes(l))) continue;
    if (!/^[A-ZÆØÅ0-9]/.test(l)) continue;
    // Filter URL-er og footer-linjer (drop hele linja, ikke bare URL-en)
    if (/\b\w+\.(?:com|no|se|de|fr|net|org|io)\b/i.test(l)) continue;
    if (/©|all rights reserved|copyright|tlf\.?:?\s*\+?\d/i.test(l)) continue;
    // Filter linjer som ser ut som spec-leak: «Forside 58 %», «Bakside ...»
    // — disse tilhører tekniske spesifikasjoner-tabellen, ikke punktlista.
    const SPEC_PREFIXES = /^(Forside|Bakside|Materiale|Sammensetning|Foring|Insats|Vekt|Vask|Pleie|EAN|Art\.?\s*nr|Artikkel)\b/i;
    if (SPEC_PREFIXES.test(l)) continue;
    // Filter linjer som tilfeldigvis starter med «Farge {kode}» — det er
    // variant-info som bør i Beskrivelse 1, ikke bullets
    if (/^Farge\s+\d{3,4}\b/i.test(l)) continue;
    bullets.push(l);
    if (bullets.length >= 8) break;
  }

  // 7) Specs — to-fase ekstrahering:
  //    a) Section-basert (Materiale, Care, Certifications) — for klær-PDF
  //    b) Generisk «Key: value» fra hele teksten — for verktøy-PDF
  // Sectioner som er variant-spesifikke (Størrelse, Farge) hoppes over.
  const specs: Array<{ key: string; value: string }> = [];

  if (sectionStartIdx > 0) {
    /** Engelsk-til-norsk for seksjons-navn — Snickers/Hultafors-PDF-er
     *  er på engelsk for Care/Certifications, men vi vil ha norsk i spec-tab. */
    const SECTION_LABEL_NB: Record<string, string> = {
      "care": "Vask og pleie",
      "certifications": "Sertifiseringer",
      "certification": "Sertifiseringer",
      "material": "Materiale",
      "size": "Størrelse",
      "color": "Farge",
      "colour": "Farge",
      "specifications": "Spesifikasjoner",
    };
    const labelize = (raw: string): string => {
      const k = raw.toLowerCase().replace(/\s+/g, "").replace("certifications", "certifications");
      return SECTION_LABEL_NB[k] ?? raw;
    };
    let currentSection: string | null = null;
    let sectionBuf: string[] = [];
    const flushSection = () => {
      if (!currentSection || sectionBuf.length === 0) return;
      if (SECTION_SKIP_IN_SPECS.test(currentSection)) {
        currentSection = null;
        sectionBuf = [];
        return;
      }
      const labelNb = labelize(currentSection);
      // Hvis seksjons-innholdet har «Key: value»-sub-entries (Forside:,
      // Bakside:, CE-kategori:), bryt dem ut som egne spec-rader. Ellers
      // emit hele seksjonen som én spec-rad med multi-linje-verdi (separert
      // med «; » så HTML-rendringen kan vise dem leselig).
      const subEntries: Array<{ key: string; value: string }> = [];
      const flat: string[] = [];
      for (const sl of sectionBuf) {
        const m = sl.match(/^([A-Za-zÆØÅæøå][A-Za-zÆØÅæøå0-9 ./-]{1,30}):\s*(.+)$/);
        if (m && m[2].length >= 1 && m[2].length < 250) {
          subEntries.push({ key: m[1].trim(), value: m[2].trim() });
        } else {
          flat.push(sl);
        }
      }
      if (subEntries.length > 0) {
        // Sub-entries blir egne rader. Flat-linjer som kommer mellom dem
        // (f.eks. «Klasse 2, Klasse 3» under «EN ISO 20471:») limes på siste.
        if (flat.length > 0 && subEntries.length > 0) {
          subEntries[subEntries.length - 1].value += " " + flat.join(" ");
        }
        for (const e of subEntries) {
          specs.push({ key: e.key, value: e.value.slice(0, 250) });
        }
      } else if (flat.length > 0) {
        // Pre-merge «X:»-fortsettelser: hvis en linje slutter på `:`, lim
        // neste linje på med mellomrom (ikke separator) siden det er en
        // header → verdi-relasjon, ikke to separate punkter.
        const merged: string[] = [];
        for (const f of flat) {
          if (merged.length > 0 && /:\s*$/.test(merged[merged.length - 1])) {
            merged[merged.length - 1] = merged[merged.length - 1].replace(/:\s*$/, ":") + " " + f;
          } else {
            merged.push(f);
          }
        }
        // Flere korte instruksjons-linjer (Care: «Maskinvask...», «Må ikke
        // blekes», «Må ikke tørkes...») slås sammen med «; » som separator.
        const value = merged.join("; ").trim().slice(0, 300);
        if (value) specs.push({ key: labelNb, value });
      }
      currentSection = null;
      sectionBuf = [];
    };
    for (let i = sectionStartIdx; i < lines.length; i++) {
      const l = lines[i];
      if (SECTION_HEADER_RE.test(l)) {
        flushSection();
        currentSection = l;
      } else if (currentSection) {
        // Filter footer/URL-linjer + linjer som BARE er en URL
        if (/^[\w-]+\.(com|no|se|de|fr|net|org|io)(\/[^\s]*)?$/i.test(l)) continue;
        // Filter avsluttende URL fra slutten av en flat-linje (eks. «Klasse 2 snickersworkwear.com»)
        const cleaned = l.replace(/\s+[\w-]+\.(com|no|se|de|fr|net|org|io)(\/[^\s]*)?$/i, "").trim();
        if (cleaned.length < 2) continue;
        sectionBuf.push(cleaned);
      }
    }
    flushSection();
  } else {
    // Ingen seksjoner detektert (sannsynligvis verktøy-PDF, ikke klær).
    // Fall tilbake til generisk «Key: value»-extraktor.
    for (const l of lines) {
      const m = l.match(/^([A-Za-zÆØÅæøå][A-Za-zÆØÅæøå\s./-]{2,30})[:\t]\s*(.+)$/);
      if (m && m[2].length < 60) {
        specs.push({ key: m[1].trim(), value: m[2].trim() });
        if (specs.length >= 20) break;
      }
    }
  }

  // 8) Produsent — let etter kjente FT-merker i tekst, filnavn, eller domener.
  // Snickers heter offisielt «Snickers Workwear» og må stå først i lista
  // så vi treffer full-navnet før kortformen (begge er i teksten).
  const knownBrands = [
    "Snickers Workwear", "Snickers",
    "Wera", "Knipex", "Snap-on", "Stahlwille", "Rennsteig", "Facom", "Lista",
    "PB Swiss Tools", "Ullman", "Sumake", "Gedore", "Brockhaus Heuer", "Irega",
    "KC Tools", "OSCA", "Opticase", "Rivit", "Vogel", "Meclube", "The Bone",
    "Milwaukee", "Hultafors", "Emhart", "Leatherman", "Mora", "Stanley",
    "Gigant", "Gühring", "Solid Gear", "LED Lenser", "Ledlenser",
    "Fluke", "Bahco", "Proto", "Red Rooster", "Karlstad Redskap", "Brusletto",
    "Bondhus", "Husqvarna", "Zarges", "Pelicase", "Hellberg", "Mitutoyo",
    "Viking Arm",
  ];
  let manufacturer: string | null = null;
  const searchBlob = `${text}\n${filename}`.toLowerCase();
  for (const brand of knownBrands) {
    const needle = brand.toLowerCase();
    if (searchBlob.includes(needle) || searchBlob.includes(needle.replace(/[\s-]/g, ""))) {
      manufacturer = brand;
      break;
    }
  }
  // Snickers-PDF-er har alltid «snickersworkwear.com» som footer — bruk det
  // som backup-signal for å oppgradere «Snickers» til fullt brand-navn.
  if (manufacturer === "Snickers" && /snickersworkwear/i.test(text)) {
    manufacturer = "Snickers Workwear";
  }

  return {
    source_url: `pdf://${filename}`,
    title,
    manufacturer,
    ean,
    mpn,
    description_short,
    description_long,
    bullets,
    specs,
    images: [],
    price_now: null,
    price_before: null,
    currency: null,
    kostpris: null,
    listepris: null,
    domain: "pdf",
    model_code: modelCode,
  };
}
