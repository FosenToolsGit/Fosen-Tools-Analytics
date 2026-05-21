import { chromium, type Browser } from "playwright";
import fs from "node:fs";
import path from "node:path";

/**
 * Deterministisk HTML→PNG-render for produkt-tilbud-poster (Innholdsmotor).
 *
 * Mal-bibliotek for sosiale medier — 3 layouts:
 *   - single        : ett produkt på tilbud (stor)
 *   - grid          : 3-6 produkter i kampanje-grid
 *   - manufacturer  : «Mest kjøpt fra {Merke}» med produsent-logo
 *
 * Alt bygges som HTML/CSS og rendres via Playwright. 100% deterministisk,
 * pixel-perfekt, on-brand — ingen AI involvert. Norsk tekst garantert riktig.
 */

// =============================================================================
// Font-embedding (Manrope)
// =============================================================================

const FONT_DIR = path.join(process.cwd(), "public/social/fonts");
const fontCache: Record<string, string | null> = {};

function fontB64(filename: string): string | null {
  if (fontCache[filename] !== undefined) return fontCache[filename];
  const fp = path.join(FONT_DIR, filename);
  const val = fs.existsSync(fp) ? fs.readFileSync(fp).toString("base64") : null;
  fontCache[filename] = val;
  return val;
}

function fontFaceCss(): string {
  const faces: Array<[string, number]> = [
    ["manrope-latin-400-normal.woff2", 400],
    ["manrope-latin-700-normal.woff2", 700],
    ["manrope-latin-800-normal.woff2", 800],
  ];
  return faces
    .map(([f, w]) => {
      const b = fontB64(f);
      return b
        ? `@font-face{font-family:'Manrope';font-weight:${w};src:url(data:font/woff2;base64,${b}) format('woff2');}`
        : "";
    })
    .filter(Boolean)
    .join("\n");
}

// =============================================================================
// Brand-assets
// =============================================================================

function assetDataUrl(relPath: string): string | null {
  const fp = path.join(process.cwd(), relPath);
  if (!fs.existsSync(fp)) return null;
  const ext = path.extname(fp).slice(1);
  const mime = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
  return `data:${mime};base64,${fs.readFileSync(fp).toString("base64")}`;
}

function wordmarkDataUrl(): string | null {
  return assetDataUrl("public/social/brand-assets/ft-wordmark-white.png");
}

// =============================================================================
// Datamodell
// =============================================================================

export interface OfferProduct {
  name: string;
  /** Produktbilde — URL (Azure blob / fosen-tools.no) eller data-URL. Plassholder hvis tom. */
  imageUrl?: string | null;
  manufacturer?: string | null;
  /** Produsent-logo URL. */
  manufacturerLogoUrl?: string | null;
  /** Nåpris i NOK. */
  priceNow: number;
  /** Førpris (gjennomstreket). Utelates hvis ingen rabatt. */
  priceBefore?: number | null;
}

export type OfferLayout = "single" | "grid" | "manufacturer";

export interface OfferRenderInput {
  layout: OfferLayout;
  products: OfferProduct[];
  /** Eyebrow/kicker over headline (f.eks. «UKENS TILBUD»). */
  eyebrow?: string | null;
  /** Hovedheadline. For manufacturer: brukes ikke (auto «MEST KJØPT FRA …»). */
  headline?: string | null;
  /** Produsent-navn (kun layout=manufacturer). */
  manufacturer?: string | null;
  /** Produsent-logo URL (kun layout=manufacturer). */
  manufacturerLogoUrl?: string | null;
  /** CTA-tekst nederst (f.eks. «fosen-tools.no»). */
  cta?: string | null;
  /** Bakgrunn: «ink» (mørk) eller «red». */
  background?: "ink" | "red";
  width: number;
  height: number;
}

// =============================================================================
// Hjelpere
// =============================================================================

/** Format pris norsk: 16990 → «16 990,-». */
function formatNOK(n: number): string {
  const rounded = Math.round(n);
  const s = rounded.toLocaleString("nb-NO").replace(/ /g, " ");
  return `${s},-`;
}

function discountPct(now: number, before: number | null | undefined): number | null {
  if (!before || before <= now) return null;
  return Math.round((1 - now / before) * 100);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// =============================================================================
// SVG-komponenter
// =============================================================================

/** 12-takket stjerne-burst med rabatt-tekst. */
function burstSvg(text: string, size: number): string {
  // 12-takket stjerne — vekslende ytre/indre radius
  const cx = 50;
  const cy = 50;
  const spikes = 12;
  const outer = 48;
  const inner = 39;
  let pts = "";
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    pts += `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)} `;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${pts.trim()}" fill="#F4D43A"/>
    <text x="50" y="50" font-family="Manrope,sans-serif" font-weight="800"
      font-size="22" fill="#0F1115" text-anchor="middle" dominant-baseline="central">${escapeHtml(text)}</text>
  </svg>`;
}

/** Blueprint corner-decor (felles FT-signatur). */
function decorSvgs(W: number, pad: number): string {
  return `
  <svg class="decor decor-tr" width="${W * 0.15}" height="${W * 0.055}" viewBox="0 0 160 60" style="top:${pad * 0.7}px;right:${pad * 0.7}px;">
    <line x1="6" y1="20" x2="154" y2="20"/><line x1="6" y1="14" x2="6" y2="26"/>
    <line x1="56" y1="14" x2="56" y2="26"/><line x1="106" y1="14" x2="106" y2="26"/><line x1="154" y1="14" x2="154" y2="26"/>
  </svg>
  <svg class="decor decor-tl" width="${W * 0.06}" height="${W * 0.06}" viewBox="0 0 70 70" style="top:${pad * 0.7}px;left:${pad * 0.7}px;">
    <path d="M2 30 L2 2 L30 2"/><circle cx="2" cy="30" r="3" fill="rgba(255,255,255,0.5)" stroke="none"/>
  </svg>
  <svg class="decor decor-bl" width="${W * 0.08}" height="${W * 0.08}" viewBox="0 0 90 90" style="bottom:${pad * 0.7}px;left:${pad * 0.7}px;">
    <rect x="6" y="42" width="42" height="42"/><line x1="20" y1="42" x2="20" y2="84"/>
    <line x1="34" y1="42" x2="34" y2="84"/><line x1="6" y1="56" x2="48" y2="56"/><line x1="6" y1="70" x2="48" y2="70"/>
  </svg>
  <svg class="decor decor-br" width="${W * 0.07}" height="${W * 0.07}" viewBox="0 0 80 80" style="bottom:${pad * 0.7}px;right:${pad * 0.7}px;">
    <circle cx="56" cy="56" r="20"/><circle cx="56" cy="56" r="6"/>
    <line x1="56" y1="24" x2="56" y2="36"/><line x1="20" y1="56" x2="32" y2="56"/>
  </svg>`;
}

// =============================================================================
// Produktbilde — ramme med plassholder-fallback
// =============================================================================

function productImageHtml(p: OfferProduct, cls: string): string {
  if (p.imageUrl) {
    return `<div class="${cls} pimg-has"><img src="${p.imageUrl}" alt=""/></div>`;
  }
  return `<div class="${cls} pimg-ph"><span>Produktbilde</span></div>`;
}

/** Prisblokk: før-pris gjennomstreket + nå-pris. */
function priceBlockHtml(p: OfferProduct, big: boolean): string {
  const beforeHtml = p.priceBefore
    ? `<span class="price-before">${formatNOK(p.priceBefore)}</span>`
    : "";
  return `<div class="price-block ${big ? "price-big" : ""}">
    ${beforeHtml}
    <span class="price-now">${formatNOK(p.priceNow)}</span>
  </div>`;
}

// =============================================================================
// HTML-bygger
// =============================================================================

const FT_RED = "#ED1C24";
const FT_INK = "#0F1115";

export function buildOfferHtml(input: OfferRenderInput): string {
  const { width: W, height: H, layout } = input;
  const isLandscape = W > H * 1.2;
  const pad = isLandscape ? W * 0.04 : W * 0.058;
  const bg =
    input.background === "red"
      ? `radial-gradient(ellipse 70% 60% at 80% 12%, rgba(0,0,0,0.28), transparent 70%), ${FT_RED}`
      : `radial-gradient(ellipse 60% 50% at 18% 12%, rgba(237,28,36,0.22), transparent 70%), ${FT_INK}`;

  const wordmark = wordmarkDataUrl();
  const wordmarkHtml = wordmark
    ? `<div class="wordmark"><img src="${wordmark}" alt="Fosen Tools"/></div>`
    : "";

  let inner = "";
  if (layout === "single") inner = renderSingle(input, W, H, isLandscape);
  else if (layout === "grid") inner = renderGrid(input, W, H, isLandscape);
  else inner = renderManufacturer(input, W, H, isLandscape);

  const ctaHtml = input.cta
    ? `<div class="cta">${escapeHtml(input.cta)}</div>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  ${fontFaceCss()}
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:${W}px;height:${H}px;}
  body{font-family:'Manrope',-apple-system,sans-serif;background:${bg};color:#fff;
    padding:${pad}px;display:flex;flex-direction:column;position:relative;overflow:hidden;}
  .decor{position:absolute;stroke:rgba(255,255,255,0.45);fill:none;stroke-width:1.4;}

  .eyebrow{font-weight:800;font-size:${W * 0.026}px;letter-spacing:0.22em;
    text-transform:uppercase;color:${FT_RED};margin-bottom:${H * 0.012}px;}
  .headline{font-weight:800;font-size:${W * (isLandscape ? 0.05 : 0.072)}px;
    line-height:1.05;letter-spacing:0.01em;text-transform:uppercase;}
  .accent{width:${W * 0.085}px;height:3px;background:${FT_RED};margin-top:${H * 0.018}px;}

  /* Produktbilde */
  .pimg-has{background:#fff;border-radius:${W * 0.018}px;overflow:hidden;
    display:flex;align-items:center;justify-content:center;}
  .pimg-has img{width:100%;height:100%;object-fit:contain;padding:6%;}
  .pimg-ph{background:rgba(255,255,255,0.07);border:1.5px dashed rgba(255,255,255,0.28);
    border-radius:${W * 0.018}px;display:flex;align-items:center;justify-content:center;}
  .pimg-ph span{font-weight:700;font-size:${W * 0.022}px;color:rgba(255,255,255,0.4);}

  /* Pris */
  .price-block{display:flex;align-items:baseline;gap:${W * 0.018}px;flex-wrap:wrap;}
  .price-before{font-weight:700;font-size:${W * 0.03}px;color:rgba(255,255,255,0.55);
    text-decoration:line-through;text-decoration-color:${FT_RED};text-decoration-thickness:2px;}
  .price-now{font-weight:800;font-size:${W * 0.044}px;color:#fff;}
  .price-big .price-before{font-size:${W * 0.04}px;}
  .price-big .price-now{font-size:${W * 0.078}px;color:#fff;}

  /* CTA */
  .cta{align-self:center;font-weight:800;font-size:${W * 0.026}px;letter-spacing:0.06em;
    color:#fff;border:1.6px solid rgba(255,255,255,0.6);border-radius:999px;
    padding:${W * 0.014}px ${W * 0.045}px;text-transform:lowercase;}

  /* Wordmark */
  .wordmark{display:flex;justify-content:center;margin-top:${H * 0.016}px;}
  .wordmark img{width:${W * 0.19}px;height:auto;padding:${W * 0.011}px ${W * 0.028}px;
    border:1.4px solid rgba(255,255,255,0.5);border-radius:999px;}

  ${layoutCss(layout, W, H, isLandscape)}
  </style></head><body>
  ${decorSvgs(W, pad)}
  ${inner}
  ${ctaHtml}
  ${wordmarkHtml}
  </body></html>`;
}

// =============================================================================
// Layout-spesifikk CSS
// =============================================================================

function layoutCss(layout: OfferLayout, W: number, H: number, land: boolean): string {
  // Felles kompakt produktkort (grid + manufacturer). Bildet KRYMPER (flex:1)
  // mens navn + pris får fast plass — slik klemmes aldri navnet ut.
  const cardCss = `
    .pcard{background:rgba(255,255,255,0.06);border:1.4px solid rgba(255,255,255,0.13);
      border-radius:${W * 0.018}px;padding:${W * 0.014}px;display:flex;flex-direction:column;
      gap:${H * 0.008}px;position:relative;min-height:0;}
    .pcard-img{width:100%;flex:1 1 auto;min-height:0;}
    .pcard-name{flex:0 0 auto;font-weight:700;font-size:${W * 0.0185}px;line-height:1.15;
      text-transform:uppercase;height:${W * 0.046}px;
      display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    .pcard .price-block{flex:0 0 auto;gap:${W * 0.012}px;}
    .pcard .price-now{font-size:${W * 0.028}px;}
    .pcard .price-before{font-size:${W * 0.018}px;}
    .pcard-burst{position:absolute;top:${W * -0.022}px;right:${W * -0.022}px;
      width:${W * 0.088}px;height:${W * 0.088}px;filter:drop-shadow(0 3px 7px rgba(0,0,0,0.45));z-index:2;}`;

  if (layout === "single") {
    return `
    .single-wrap{flex:1;display:flex;flex-direction:column;}
    .single-hero{flex:1;display:flex;align-items:center;gap:${W * 0.045}px;
      margin:${H * 0.022}px 0;}
    .single-img-wrap{width:${land ? "44%" : "54%"};aspect-ratio:1/1;position:relative;flex:0 0 auto;}
    .single-img{width:100%;height:100%;}
    .single-burst{position:absolute;top:${W * -0.045}px;right:${W * -0.045}px;
      width:${W * 0.17}px;height:${W * 0.17}px;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.45));z-index:2;}
    .single-info{flex:1;display:flex;flex-direction:column;gap:${H * 0.018}px;min-width:0;}
    .single-logo{height:${H * 0.046}px;display:flex;align-items:center;}
    .single-logo img{height:100%;width:auto;object-fit:contain;}
    .single-name{font-weight:800;font-size:${W * 0.038}px;line-height:1.12;text-transform:uppercase;}`;
  }
  if (layout === "grid") {
    return `
    .grid-wrap{flex:1;display:flex;flex-direction:column;min-height:0;}
    .grid-cards{flex:1;display:grid;gap:${W * 0.02}px;grid-auto-rows:1fr;
      margin:${H * 0.02}px 0;min-height:0;}
    ${cardCss}`;
  }
  // manufacturer
  return `
    .mf-wrap{flex:1;display:flex;flex-direction:column;align-items:center;min-height:0;}
    .mf-logo{height:${H * 0.085}px;margin-bottom:${H * 0.008}px;
      display:flex;align-items:center;justify-content:center;}
    .mf-logo img{max-height:100%;max-width:${W * 0.46}px;width:auto;object-fit:contain;}
    .mf-logo .mf-logo-text{font-weight:800;font-size:${W * 0.058}px;text-transform:uppercase;letter-spacing:0.02em;}
    .mf-headline{font-weight:800;font-size:${W * 0.03}px;letter-spacing:0.12em;
      text-transform:uppercase;text-align:center;color:rgba(255,255,255,0.9);}
    .mf-accent{width:${W * 0.085}px;height:3px;background:#fff;margin:${H * 0.014}px 0;}
    .mf-cards{flex:1;display:grid;gap:${W * 0.02}px;grid-auto-rows:1fr;width:100%;
      margin:${H * 0.016}px 0;min-height:0;}
    ${cardCss}`;
}

// =============================================================================
// Layout 1 — enkelt-produkt
// =============================================================================

function renderSingle(input: OfferRenderInput, W: number, H: number, land: boolean): string {
  const p = input.products[0];
  if (!p) return `<div style="color:#fff">Ingen produkt</div>`;
  const pct = discountPct(p.priceNow, p.priceBefore);
  const burst = pct ? burstSvg(`−${pct}%`, W * 0.16) : "";
  const logo = p.manufacturerLogoUrl
    ? `<div class="single-logo"><img src="${p.manufacturerLogoUrl}" alt=""/></div>`
    : p.manufacturer
      ? `<div class="single-logo"><span style="font-weight:800;font-size:${W * 0.03}px;text-transform:uppercase">${escapeHtml(p.manufacturer)}</span></div>`
      : "";
  return `<div class="single-wrap">
    ${input.eyebrow ? `<div class="eyebrow">${escapeHtml(input.eyebrow)}</div>` : ""}
    ${input.headline ? `<div class="headline">${escapeHtml(input.headline)}</div><div class="accent"></div>` : ""}
    <div class="single-hero">
      <div class="single-img-wrap">
        ${productImageHtml(p, "single-img")}
        ${burst ? `<div class="single-burst">${burst}</div>` : ""}
      </div>
      <div class="single-info">
        ${logo}
        <div class="single-name">${escapeHtml(p.name)}</div>
        ${priceBlockHtml(p, true)}
      </div>
    </div>
  </div>`;
}

// =============================================================================
// Layout 2 — multi-produkt grid
// =============================================================================

function renderGrid(input: OfferRenderInput, W: number, H: number, land: boolean): string {
  const products = input.products.slice(0, 6);
  const n = products.length;
  // Kolonner: 2-4 produkter → n kolonner én rad (eller 2×2); 5-6 → 3 kolonner
  const cols = land ? Math.min(n, 6) : n <= 4 ? 2 : 3;
  const cards = products
    .map((p) => {
      const pct = discountPct(p.priceNow, p.priceBefore);
      const burst = pct ? `<div class="pcard-burst">${burstSvg(`−${pct}%`, W * 0.1)}</div>` : "";
      return `<div class="pcard">
        ${burst}
        ${productImageHtml(p, "pcard-img")}
        <div class="pcard-name">${escapeHtml(p.name)}</div>
        ${priceBlockHtml(p, false)}
      </div>`;
    })
    .join("");
  return `<div class="grid-wrap">
    ${input.eyebrow ? `<div class="eyebrow">${escapeHtml(input.eyebrow)}</div>` : ""}
    ${input.headline ? `<div class="headline">${escapeHtml(input.headline)}</div><div class="accent"></div>` : ""}
    <div class="grid-cards" style="grid-template-columns:repeat(${cols},1fr);">${cards}</div>
  </div>`;
}

// =============================================================================
// Layout 3 — produsent-kampanje
// =============================================================================

function renderManufacturer(input: OfferRenderInput, W: number, H: number, land: boolean): string {
  const products = input.products.slice(0, 6);
  const n = products.length;
  const cols = land ? Math.min(n, 6) : n <= 4 ? 2 : 3;
  const logo = input.manufacturerLogoUrl
    ? `<img src="${input.manufacturerLogoUrl}" alt="${escapeHtml(input.manufacturer ?? "")}"/>`
    : `<span class="mf-logo-text">${escapeHtml(input.manufacturer ?? "")}</span>`;
  const cards = products
    .map((p) => {
      const pct = discountPct(p.priceNow, p.priceBefore);
      const burst = pct ? `<div class="pcard-burst">${burstSvg(`−${pct}%`, W * 0.1)}</div>` : "";
      return `<div class="pcard">
        ${burst}
        ${productImageHtml(p, "pcard-img")}
        <div class="pcard-name">${escapeHtml(p.name)}</div>
        ${priceBlockHtml(p, false)}
      </div>`;
    })
    .join("");
  return `<div class="mf-wrap">
    <div class="mf-logo">${logo}</div>
    <div class="mf-headline">${escapeHtml(input.headline ?? `Mest kjøpt fra ${input.manufacturer ?? ""}`)}</div>
    <div class="mf-accent"></div>
    <div class="mf-cards" style="grid-template-columns:repeat(${cols},1fr);">${cards}</div>
  </div>`;
}

// =============================================================================
// Playwright HTML→PNG-render
// =============================================================================

let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.isConnected()) return sharedBrowser;
  sharedBrowser = await chromium.launch({ headless: true });
  return sharedBrowser;
}

export async function closeOfferBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => undefined);
    sharedBrowser = null;
  }
}

export async function renderOfferPng(
  input: OfferRenderInput
): Promise<{ base64: string; mimeType: string }> {
  const html = buildOfferHtml(input);
  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: { width: input.width, height: input.height },
    deviceScaleFactor: 2,
  });
  try {
    await page.setContent(html, { waitUntil: "networkidle", timeout: 20000 });
    await page.evaluate(() => document.fonts.ready);
    const buf = await page.screenshot({ type: "png" });
    return { base64: buf.toString("base64"), mimeType: "image/png" };
  } finally {
    await page.close().catch(() => undefined);
  }
}
