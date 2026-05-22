import { chromium, type Browser } from "playwright";
import fs from "node:fs";
import path from "node:path";

/**
 * Deterministisk HTML→PNG-render for tjeneste/feature-poster (Innholdsmotor).
 *
 * For ikke-produkt-sider — HDFI, CADLAB, FT Systemvegg, bransje-sider osv.
 * Viser tjeneste-navn + nøkkelfordeler + CTA. Bygges som HTML/CSS og rendres
 * via Playwright — 100% deterministisk, on-brand, norsk tekst garantert.
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

function wordmarkDataUrl(): string | null {
  const fp = path.join(
    process.cwd(),
    "public/social/brand-assets/ft-wordmark-white.png"
  );
  if (!fs.existsSync(fp)) return null;
  return `data:image/png;base64,${fs.readFileSync(fp).toString("base64")}`;
}

// =============================================================================
// Datamodell
// =============================================================================

export interface FeatureRenderInput {
  /** Liten kicker over headline (f.eks. «SKREDDERSYDD» / «EGEN PRODUKSJON»). */
  eyebrow?: string | null;
  /** Hovedheadline — tjeneste-navn / poeng (f.eks. «HDFI — verktøykontroll»). */
  headline: string;
  /** Ett ord i headline som skal være FT-rødt. */
  redWord?: string | null;
  /** Valgfri intro-setning under headline. */
  intro?: string | null;
  /** 3-5 nøkkelfordeler — korte punkter. */
  benefits: string[];
  /** CTA-tekst nederst. */
  cta?: string | null;
  /** Bakgrunn. */
  background?: "ink" | "red";
  /** Valgfritt bilde — når satt bytter malen til foto-variant. */
  imageUrl?: string | null;
  width: number;
  height: number;
}

// =============================================================================
// Hjelpere
// =============================================================================

const FT_RED = "#ED1C24";
const FT_INK = "#0F1115";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Headline med ett ord i FT-rødt. */
function headlineHtml(headline: string, redWord: string | null): string {
  const upper = headline.toUpperCase().trim();
  const redUpper = (redWord ?? "").toUpperCase().trim();
  if (!redUpper) return escapeHtml(upper);
  const re = new RegExp(`\\b(${escapeRegex(redUpper)})\\b`);
  return escapeHtml(upper).replace(re, '<span class="red">$1</span>');
}

/** Rød check-markering (SVG). */
function checkSvg(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" fill="${color}"/>
    <path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" stroke-width="2.4"
      fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

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
// HTML-bygger
// =============================================================================

export function buildFeatureHtml(input: FeatureRenderInput): string {
  const { width: W, height: H } = input;
  const isLandscape = W > H * 1.2;
  const pad = isLandscape ? W * 0.045 : W * 0.06;

  const bg =
    input.background === "red"
      ? `radial-gradient(ellipse 70% 60% at 80% 12%, rgba(0,0,0,0.28), transparent 70%), ${FT_RED}`
      : `radial-gradient(ellipse 60% 55% at 18% 12%, rgba(237,28,36,0.24), transparent 70%), ${FT_INK}`;
  const checkColor = input.background === "red" ? "#0F1115" : FT_RED;

  const wordmark = wordmarkDataUrl();
  const wordmarkHtml = wordmark
    ? `<div class="wordmark"><img src="${wordmark}" alt="Fosen Tools"/></div>`
    : "";

  const benefits = input.benefits.slice(0, 5).filter((b) => b.trim());
  const checkSize = W * 0.034;
  const benefitsHtml = benefits
    .map(
      (b) => `<div class="benefit">
        <span class="benefit-check">${checkSvg(checkSize, checkColor)}</span>
        <span class="benefit-text">${escapeHtml(b.trim())}</span>
      </div>`
    )
    .join("");

  // Landscape: 2-kolonne (tekst venstre, benefits høyre). Ellers stacket.
  const heroSize = isLandscape ? W * 0.038 : W * 0.07;
  const benefitTextSize = isLandscape ? W * 0.021 : W * 0.03;
  const introSize = isLandscape ? W * 0.02 : W * 0.026;

  const photoUrl = (input.imageUrl ?? "").trim();
  const hasPhoto = !!photoUrl;

  const textCol = `
    ${input.eyebrow ? `<div class="eyebrow">${escapeHtml(input.eyebrow)}</div>` : ""}
    <div class="headline">${headlineHtml(input.headline, input.redWord ?? null)}</div>
    <div class="accent"></div>
    ${input.intro ? `<div class="intro">${escapeHtml(input.intro)}</div>` : ""}`;
  const benefitsCol = `<div class="benefits">${benefitsHtml}</div>`;
  const ctaHtml = input.cta
    ? `<div class="cta">${escapeHtml(input.cta)}</div>`
    : "";

  let mainHtml: string;
  if (hasPhoto) {
    // Foto-variant: bilde som kolonne (landscape) / toppband (portrett)
    mainHtml = `<div class="feature-main feature-photo-layout">
        <div class="feature-photo"><img src="${escapeHtml(photoUrl)}" alt=""/></div>
        <div class="feature-content">${textCol}${benefitsCol}${ctaHtml}</div>
      </div>`;
  } else if (isLandscape) {
    mainHtml = `<div class="feature-main feature-cols">
        <div class="col-text">${textCol}${ctaHtml}</div>
        <div class="col-benefits">${benefitsCol}</div>
      </div>`;
  } else {
    mainHtml = `<div class="feature-main feature-stack">
        ${textCol}
        ${benefitsCol}
        ${ctaHtml}
      </div>`;
  }

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  ${fontFaceCss()}
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:${W}px;height:${H}px;}
  body{font-family:'Manrope',-apple-system,sans-serif;background:${bg};color:#fff;
    padding:${pad}px;display:flex;flex-direction:column;position:relative;overflow:hidden;}
  .decor{position:absolute;stroke:rgba(255,255,255,0.45);fill:none;stroke-width:1.4;}

  .feature-main{flex:1;min-height:0;}
  .feature-stack{display:flex;flex-direction:column;}
  .feature-cols{display:flex;gap:${W * 0.05}px;align-items:center;}
  .col-text{flex:1;min-width:0;display:flex;flex-direction:column;}
  .col-benefits{flex:1;min-width:0;display:flex;flex-direction:column;
    gap:${H * 0.03}px;}

  .feature-photo-layout{display:flex;gap:${W * 0.045}px;
    flex-direction:${isLandscape ? "row" : "column"};align-items:stretch;}
  .feature-photo{flex:0 0 ${isLandscape ? "42%" : "44%"};min-height:0;}
  .feature-photo img{width:100%;height:100%;object-fit:cover;
    border-radius:${W * 0.018}px;}
  .feature-content{flex:1;min-width:0;min-height:0;display:flex;
    flex-direction:column;justify-content:center;}

  .eyebrow{font-weight:800;font-size:${W * 0.024}px;letter-spacing:0.22em;
    text-transform:uppercase;color:${input.background === "red" ? "#0F1115" : FT_RED};
    margin-bottom:${H * 0.014}px;}
  .headline{font-weight:800;font-size:${heroSize}px;line-height:1.08;
    letter-spacing:0.01em;text-transform:uppercase;}
  .headline .red{color:${input.background === "red" ? "#0F1115" : FT_RED};}
  .accent{width:${W * 0.075}px;height:3px;
    background:${input.background === "red" ? "#fff" : FT_RED};margin-top:${H * 0.018}px;}
  .intro{font-weight:400;font-size:${introSize}px;line-height:1.5;
    color:rgba(255,255,255,0.85);margin-top:${H * 0.02}px;}

  .benefits{display:flex;flex-direction:column;justify-content:center;
    gap:${isLandscape ? H * 0.026 : H * 0.022}px;
    ${isLandscape ? "" : `flex:1;margin:${H * 0.03}px 0;`}}
  .benefit{display:flex;align-items:flex-start;gap:${W * 0.02}px;}
  .benefit-check{flex:0 0 auto;display:flex;margin-top:${H * 0.002}px;
    filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));}
  .benefit-text{font-weight:700;font-size:${benefitTextSize}px;line-height:1.28;}

  .cta{align-self:flex-start;font-weight:800;font-size:${W * 0.024}px;
    letter-spacing:0.06em;color:#fff;border:1.6px solid rgba(255,255,255,0.6);
    border-radius:999px;padding:${W * 0.013}px ${W * 0.042}px;text-transform:lowercase;
    margin-top:${H * 0.024}px;}
  .wordmark{display:flex;justify-content:center;margin-top:${H * 0.016}px;}
  .wordmark img{width:${W * 0.18}px;height:auto;padding:${W * 0.011}px ${W * 0.028}px;
    border:1.4px solid rgba(255,255,255,0.5);border-radius:999px;}
  </style></head><body>
  ${decorSvgs(W, pad)}
  ${mainHtml}
  ${wordmarkHtml}
  </body></html>`;
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

export async function closeFeatureBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => undefined);
    sharedBrowser = null;
  }
}

export async function renderFeaturePng(
  input: FeatureRenderInput
): Promise<{ base64: string; mimeType: string }> {
  const html = buildFeatureHtml(input);
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
