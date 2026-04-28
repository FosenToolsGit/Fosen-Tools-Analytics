import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { scrapeProductByUrl, ScrapeProductError, type ScrapedProduct } from "@/lib/services/scrape-product";

/**
 * Bygger en ferdig BrochureDoc rundt én produsent:
 *  1. Henter top-N produkt-URLer for slug fra GA4 (platform_posts) +
 *     Mailchimp-klikk (mailchimp_campaign_links)
 *  2. Scraper hver i parallell via Promise.allSettled
 *  3. Bygger forside m/ produsent-logo + innholdssider m/ produkt-grid +
 *     bakside m/ kontakt-info
 *
 * Returnerer { doc } som klient bruker via store.setDocProp().
 */

const PRODUCT_PATH_RE = /^\/([a-z][a-z0-9\-]+)\/([^\/]*\d[^\/]*)(?:\/[^\/?]+)?\/?(?:\?.*)?$/i;
const MIN_COUNT = 1;
const MAX_COUNT = 12;
const SCRAPE_BUFFER = 4;       // Buffer mot scrape-feil
const MAX_SCRAPE_TOTAL = 36;   // Hard øvre grense — beskytter mot lange Promise.allSettled-kjør

interface UrlCandidate {
  url: string;
  productKey: string;
  ga4_views: number;
  mailchimp_clicks: number;
  score: number;
}

function pathToProductKey(path: string): string | null {
  const m = PRODUCT_PATH_RE.exec(path);
  if (!m) return null;
  return `${m[1].toLowerCase()}/${m[2]}`;
}

function pathSlug(path: string): string | null {
  const m = PRODUCT_PATH_RE.exec(path);
  return m ? m[1].toLowerCase() : null;
}

function uid(p = "id"): string {
  return `${p}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_TOKENS = {
  red: "#ed1c24",
  redCmyk: "#d8121b",
  ink: "#111111",
  textMain: "#111827",
  textBody: "#4b5563",
  textMuted: "#6b7280",
  link: "#0b2545",
  bgPage: "#ffffff",
  cardBg: "#ffffff",
  borderSoft: "#e5e7eb",
  shadowSoft: "0 4px 12px rgba(0,0,0,0.08)",
  headingFont: "Playfair Display, Georgia, serif",
  bodyFont: "Roboto, system-ui, sans-serif",
  showVat: false,
  vatRate: 0.25,
};

// 6-grid posisjoner på A4P (210×297mm) — speiler standard-mal
const GRID_6_POSITIONS = [
  { x: 12, y: 60 }, { x: 76, y: 60 }, { x: 140, y: 60 },
  { x: 12, y: 138 }, { x: 76, y: 138 }, { x: 140, y: 138 },
];
const GRID_4_POSITIONS = [
  { x: 16, y: 60 }, { x: 110, y: 60 },
  { x: 16, y: 178 }, { x: 110, y: 178 },
];
const COMPACT_W = 58;
const COMPACT_H = 70;

const NB_MONTHS = [
  "januar","februar","mars","april","mai","juni",
  "juli","august","september","oktober","november","desember",
];

function makePeriodLabel(d = new Date()): string {
  const next = new Date(d);
  next.setMonth(d.getMonth() + 1);
  const m1 = NB_MONTHS[d.getMonth()].toUpperCase();
  const m2 = NB_MONTHS[next.getMonth()].toUpperCase();
  const y1 = d.getFullYear();
  const y2 = next.getFullYear();
  return y1 === y2
    ? `KAMPANJE ${m1} – ${m2} ${y1}`
    : `KAMPANJE ${m1} ${y1} – ${m2} ${y2}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeCoverPage(label: string, logoUrl: string | null, productCount: number, periodLabel: string): any {
  const RED = "#ed1c24";
  const DARK = "#0b2545";
  const WHITE = "#ffffff";
  const objects: object[] = [];

  // Top brand-strip
  objects.push({
    id: uid("obj"), type: "text", x: 15, y: 12, w: 180, h: 7, rot: 0, locked: false,
    props: {
      content: "FOSEN TOOLS  ·  KAMPANJE",
      preset: "body", align: "center", color: WHITE, weight: 700, italic: false, isHeading: false,
    },
  });

  // Stort lead-in: "MEST KJØPT FRA"
  objects.push({
    id: uid("obj"), type: "text", x: 15, y: 30, w: 180, h: 16, rot: 0, locked: false,
    props: {
      content: "MEST KJØPT FRA",
      preset: "h2", align: "center", color: WHITE, weight: 600, italic: false, isHeading: true,
    },
  });

  // Hvit "card" som rammer logoen — gjør at fargede produsent-logoer leser
  // skikkelig på den røde bakgrunnen, uavhengig av merke.
  objects.push({
    id: uid("obj"), type: "shape", x: 25, y: 60, w: 160, h: 115, rot: 0, locked: false,
    props: { shape: "rect", fill: WHITE, stroke: "none", strokeW: 0, radius: 6 },
  });

  if (logoUrl) {
    objects.push({
      id: uid("obj"), type: "image", x: 35, y: 80, w: 140, h: 75, rot: 0, locked: false,
      props: { src: logoUrl, label: `${label} logo`, mask: "none", fit: "contain", focusX: 0.5, focusY: 0.5, tint: null },
    });
  } else {
    // Fallback: stort merkenavn på det hvite kortet
    objects.push({
      id: uid("obj"), type: "text", x: 30, y: 105, w: 150, h: 30, rot: 0, locked: false,
      props: { content: label.toUpperCase(), preset: "h1", align: "center", color: "#111827", weight: 900, italic: false, isHeading: true },
    });
  }

  // KAMPANJE-burst — rotert i øverste høyre hjørne av logo-kortet
  objects.push({
    id: uid("obj"), type: "badge", x: 158, y: 48, w: 44, h: 44, rot: -12, locked: false,
    props: { text: "KAMPANJE", style: "star", color: "#ffd700", textColor: "#111111", fontSize: 10 },
  });

  // Periode (auto-generert: nåværende måned + neste)
  objects.push({
    id: uid("obj"), type: "text", x: 15, y: 188, w: 180, h: 10, rot: 0, locked: false,
    props: { content: periodLabel, preset: "h3", align: "center", color: WHITE, weight: 700, italic: false, isHeading: false },
  });

  // Antall produkter — stor sentral undertekst
  objects.push({
    id: uid("obj"), type: "text", x: 15, y: 206, w: 180, h: 14, rot: 0, locked: false,
    props: {
      content: `${productCount} TOPPSELGERE`,
      preset: "h2", align: "center", color: WHITE, weight: 800, italic: false, isHeading: true,
    },
  });

  // Lead-tekst — forklarer hvor utvalget kommer fra
  objects.push({
    id: uid("obj"), type: "text", x: 15, y: 226, w: 180, h: 10, rot: 0, locked: false,
    props: {
      content: `Mest besøkte ${label.toLowerCase()}-produkter på fosen-tools.no`,
      preset: "body", align: "center", color: WHITE, weight: 400, italic: true, isHeading: false,
    },
  });

  // Mørk bunn-bånd — kontaktinfo som klassisk kampanje-footer
  objects.push({
    id: uid("obj"), type: "shape", x: 0, y: 250, w: 210, h: 47, rot: 0, locked: false,
    props: { shape: "rect", fill: DARK, stroke: "none", strokeW: 0, radius: 0 },
  });

  // Adresse
  objects.push({
    id: uid("obj"), type: "text", x: 12, y: 258, w: 186, h: 7, rot: 0, locked: false,
    props: {
      content: "FOSEN TOOLS AS  ·  Industrigata 1, 7130 Brekstad",
      preset: "body", align: "center", color: WHITE, weight: 600, italic: false, isHeading: false,
    },
  });

  // Telefon — stor og prominent (kampanje-CTA)
  objects.push({
    id: uid("obj"), type: "text", x: 12, y: 268, w: 186, h: 14, rot: 0, locked: false,
    props: {
      content: "+47 72 51 51 20  ·  fosen-tools.no",
      preset: "h2", align: "center", color: WHITE, weight: 800, italic: false, isHeading: false,
    },
  });

  // Tagline-stripe
  objects.push({
    id: uid("obj"), type: "text", x: 12, y: 287, w: 186, h: 6, rot: 0, locked: false,
    props: {
      content: "25 år i 2026  ·  100 år i konsernet  ·  Miljøfyrtårn",
      preset: "body", align: "center", color: "#cbd5e1", weight: 400, italic: false, isHeading: false,
    },
  });

  return {
    id: uid("page"), paper: "A4P", w: 210, h: 297, bg: RED,
    objects,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeProductGridPage(products: ScrapedProduct[], pageNum: number, label: string, useGrid4: boolean): any {
  const objects: object[] = [];

  // Header-banner
  objects.push({
    id: uid("obj"), type: "banner", x: 0, y: 0, w: 210, h: 30, rot: 0, locked: false,
    props: {
      title: label.toUpperCase(),
      subtitle: pageNum > 1 ? `Side ${pageNum}` : "Toppselgere",
      style: "straight",
      bg: "#ed1c24",
      color: "#ffffff",
    },
  });

  const positions = useGrid4 ? GRID_4_POSITIONS : GRID_6_POSITIONS;
  const cardW = useGrid4 ? 84 : COMPACT_W;
  const cardH = useGrid4 ? 100 : COMPACT_H;
  const variant = useGrid4 ? "standard" : "compact";

  products.forEach((product, idx) => {
    const pos = positions[idx];
    if (!pos) return;
    objects.push({
      id: uid("obj"), type: "productCard",
      x: pos.x, y: pos.y, w: cardW, h: cardH, rot: 0, locked: false,
      props: {
        variant,
        product,
        showBurst: product.discount_pct > 0,
        burstStyle: "star",
        burstText: null,
        showQR: false,
        showStock: true,
        showWarranty: false,
        vatMode: "ex",
        bulletCount: 3,
        bgColor: "#ffffff",
        accentColor: null,
      },
    });
  });

  // Footer
  objects.push({
    id: uid("obj"), type: "footer", x: 0, y: 285, w: 210, h: 12, rot: 0, locked: false,
    props: { left: `Fosen Tools – ${label}`, right: `Side ${pageNum}`, color: "#6b7280" },
  });

  return {
    id: uid("page"), paper: "A4P", w: 210, h: 297, bg: "#ffffff",
    objects,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeBackPage(label: string): any {
  return {
    id: uid("page"), paper: "A4P", w: 210, h: 297, bg: "#0b2545",
    objects: [
      {
        id: uid("obj"), type: "text", x: 20, y: 60, w: 170, h: 20, rot: 0, locked: false,
        props: { content: `Vil du vite mer om ${label}?`, preset: "h1", align: "center", color: "#ffffff", weight: 700, italic: false, isHeading: true },
      },
      {
        id: uid("obj"), type: "text", x: 20, y: 90, w: 170, h: 14, rot: 0, locked: false,
        props: { content: "Kontakt oss for tilbud, levering og rådgivning.", preset: "body", align: "center", color: "#e5e7eb", weight: 400, italic: false, isHeading: false },
      },
      {
        id: uid("obj"), type: "contact", x: 15, y: 130, w: 180, h: 80, rot: 0, locked: false,
        props: {
          phone: "72 51 51 20",
          email: "post@fosen-tools.no",
          address: "Industrigata 1, 7130 Brekstad",
          web: "fosen-tools.no",
          showMiljofyrtarn: true,
        },
      },
      {
        id: uid("obj"), type: "text", x: 20, y: 250, w: 170, h: 12, rot: 0, locked: false,
        props: { content: "FOSEN TOOLS AS · 25 år i 2026 · 100 år i konsernet", preset: "body", align: "center", color: "#ffffff", weight: 600, italic: false, isHeading: false },
      },
    ],
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { slug?: string; count?: number; only_in_stock?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  const count = Math.max(MIN_COUNT, Math.min(MAX_COUNT, Number(body.count) || 6));
  const onlyInStock = body.only_in_stock !== false; // default true

  // Hent kandidat-URLer fra begge kilder
  const [postsRes, linksRes] = await Promise.all([
    supabase
      .from("platform_posts")
      .select("post_url, impressions")
      .eq("platform", "ga4")
      .eq("post_type", "page")
      .not("post_url", "is", null),
    supabase
      .from("mailchimp_campaign_links")
      .select("url, total_clicks"),
  ]);

  if (postsRes.error) {
    return NextResponse.json({ error: postsRes.error.message }, { status: 500 });
  }
  if (linksRes.error) {
    return NextResponse.json({ error: linksRes.error.message }, { status: 500 });
  }

  const candidates = new Map<string, UrlCandidate>();

  for (const row of (postsRes.data ?? [])) {
    if (!row.post_url) continue;
    if (pathSlug(row.post_url) !== slug) continue;
    const key = pathToProductKey(row.post_url);
    if (!key) continue;
    const url = `https://fosen-tools.no${row.post_url}`;
    const existing = candidates.get(key);
    if (existing) {
      existing.ga4_views += row.impressions ?? 0;
      existing.score = existing.ga4_views * 2 + existing.mailchimp_clicks;
    } else {
      candidates.set(key, {
        url, productKey: key,
        ga4_views: row.impressions ?? 0,
        mailchimp_clicks: 0,
        score: (row.impressions ?? 0) * 2,
      });
    }
  }

  for (const row of (linksRes.data ?? [])) {
    if (!row.url) continue;
    let parsed: URL;
    try { parsed = new URL(row.url); } catch { continue; }
    if (pathSlug(parsed.pathname) !== slug) continue;
    const key = pathToProductKey(parsed.pathname);
    if (!key) continue;
    const existing = candidates.get(key);
    if (existing) {
      existing.mailchimp_clicks += row.total_clicks ?? 0;
      existing.score = existing.ga4_views * 2 + existing.mailchimp_clicks;
    } else {
      const cleanUrl = `https://${parsed.host}${parsed.pathname}`;
      candidates.set(key, {
        url: cleanUrl, productKey: key,
        ga4_views: 0,
        mailchimp_clicks: row.total_clicks ?? 0,
        score: row.total_clicks ?? 0,
      });
    }
  }

  if (candidates.size === 0) {
    return NextResponse.json(
      { error: `Ingen produktsider funnet for «${slug}». Sjekk at slug-en er riktig (f.eks. wera, milwaukee, facom).` },
      { status: 404 }
    );
  }

  // Sorter på score. Når lager-filter er på trenger vi en større pool fordi en
  // del kandidater filtreres bort etter scraping. Når det er av holder count + buffer.
  const sorted = [...candidates.values()].sort((a, b) => b.score - a.score);
  const poolSize = onlyInStock
    ? Math.min(MAX_SCRAPE_TOTAL, Math.max(count + SCRAPE_BUFFER, count * 3))
    : count + SCRAPE_BUFFER;
  const targets = sorted.slice(0, poolSize);

  // Scrape parallelt
  const settled = await Promise.allSettled(targets.map(t => scrapeProductByUrl(t.url)));
  const products: ScrapedProduct[] = [];
  const errors: { url: string; error: string }[] = [];
  let outOfStockSkipped = 0;
  for (let i = 0; i < settled.length; i++) {
    const res = settled[i];
    if (res.status === "fulfilled") {
      if (onlyInStock && !res.value.in_stock) {
        outOfStockSkipped++;
        continue;
      }
      products.push(res.value);
      if (products.length >= count) break;
    } else {
      const err = res.reason;
      errors.push({
        url: targets[i].url,
        error: err instanceof ScrapeProductError ? err.message : String(err?.message ?? err),
      });
    }
  }

  if (products.length === 0) {
    const reason = onlyInStock && outOfStockSkipped > 0
      ? `Ingen lagerførte produkter funnet for «${slug}». ${outOfStockSkipped} produkter var utsolgt. Slå av lager-filter for å inkludere alle.`
      : "Klarte ikke scrape noen produkter. Sjekk at URL-ene er gyldige.";
    return NextResponse.json({ error: reason, details: errors }, { status: 502 });
  }

  // Hent produsent-label fra første produkt (mer riktig casing enn slug)
  const manufacturerName = products.find(p => p.manufacturer)?.manufacturer
    || slug.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
  const logoUrl = products.find(p => p.manufacturer_logo_url)?.manufacturer_logo_url ?? null;
  const periodLabel = makePeriodLabel();

  // Bygg sider — hvis count ≤ 4: 4-grid (større kort), ellers 6-grid + flere sider
  const useGrid4 = products.length <= 4;
  const itemsPerPage = useGrid4 ? 4 : 6;
  const contentPages: object[] = [];
  for (let i = 0; i < products.length; i += itemsPerPage) {
    const slice = products.slice(i, i + itemsPerPage);
    contentPages.push(makeProductGridPage(slice, contentPages.length + 2, manufacturerName, useGrid4));
  }

  const doc = {
    id: uid("doc"),
    title: `${manufacturerName} – Kampanje ${new Date().getFullYear()}`,
    paper: "A4P",
    tokens: DEFAULT_TOKENS,
    pages: [
      makeCoverPage(manufacturerName, logoUrl, products.length, periodLabel),
      ...contentPages,
      makeBackPage(manufacturerName),
    ],
    assets: [],
  };

  return NextResponse.json({
    doc,
    meta: {
      manufacturer: manufacturerName,
      slug,
      products_requested: count,
      products_returned: products.length,
      scrape_errors: errors,
      out_of_stock_skipped: outOfStockSkipped,
      only_in_stock: onlyInStock,
      candidates_total: candidates.size,
    },
  });
}
