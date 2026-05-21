import { chromium, type Browser } from "playwright";
import fs from "node:fs";
import path from "node:path";

/**
 * Deterministisk HTML→PNG-render for produkt_variant-archetype (HDFI-fargevisning).
 *
 * I motsetning til AI-generering: HER bygges hele bildet som HTML/CSS og rendres
 * via headless Chromium. Det gir 100% kontroll — norske bokstaver garantert
 * riktige, swatch-layout pixel-perfekt, ingen Gemini-lottery.
 *
 * AI brukes fortsatt for andre archetyper (foto/statement/definisjon) der
 * organisk bilde-variasjon gir verdi. produkt_variant er strukturert produkt-
 * grid — der vil vi ha konsistens, ikke variasjon.
 */

// =============================================================================
// Font-embedding
// =============================================================================

const FONT_DIR = path.join(process.cwd(), "public/social/fonts");
let fontCache: Record<string, string | null> = {};

function fontB64(filename: string): string | null {
  if (fontCache[filename] !== undefined) return fontCache[filename];
  const fp = path.join(FONT_DIR, filename);
  const val = fs.existsSync(fp) ? fs.readFileSync(fp).toString("base64") : null;
  fontCache[filename] = val;
  return val;
}

function fontFaceCss(): string {
  const reg = fontB64("manrope-latin-400-normal.woff2");
  const bold = fontB64("manrope-latin-700-normal.woff2");
  const xbold = fontB64("manrope-latin-800-normal.woff2");
  const faces: string[] = [];
  if (reg) faces.push(`@font-face{font-family:'Manrope';font-weight:400;src:url(data:font/woff2;base64,${reg}) format('woff2');}`);
  if (bold) faces.push(`@font-face{font-family:'Manrope';font-weight:700;src:url(data:font/woff2;base64,${bold}) format('woff2');}`);
  if (xbold) faces.push(`@font-face{font-family:'Manrope';font-weight:800;src:url(data:font/woff2;base64,${xbold}) format('woff2');}`);
  return faces.join("\n");
}

// =============================================================================
// Wordmark (FT) — embeddes som base64 PNG
// =============================================================================

function wordmarkDataUrl(): string | null {
  // Hvit wordmark for mørk bakgrunn
  const fp = path.join(process.cwd(), "public/social/brand-assets/ft-wordmark-white.png");
  if (!fs.existsSync(fp)) return null;
  return `data:image/png;base64,${fs.readFileSync(fp).toString("base64")}`;
}

// =============================================================================
// HDFI-swatch-data
// =============================================================================

export interface HdfiSwatch {
  plate: string; // plate-farge (hex)
  rim: string; // gravering-rim-farge (hex)
  label: string; // norsk label (æøå intakt)
  tool: "wrench" | "screwdriver";
}

export const HDFI_SWATCHES: HdfiSwatch[] = [
  { plate: "#C8242B", rim: "#FFFFFF", label: "Rød/Hvit", tool: "wrench" },
  { plate: "#1A1C1F", rim: "#FFFFFF", label: "Svart/Hvit", tool: "screwdriver" },
  { plate: "#F2F2F0", rim: "#1A1C1F", label: "Hvit/Svart", tool: "wrench" },
  { plate: "#1F4E87", rim: "#FFFFFF", label: "Blå/Hvit", tool: "screwdriver" },
  { plate: "#F4D43A", rim: "#1A1C1F", label: "Gul/Svart", tool: "wrench" },
  { plate: "#C5C7C9", rim: "#1A1C1F", label: "Lyse grå/Svart", tool: "screwdriver" },
];

// =============================================================================
// Tool-silhuetter — ikoniske verktøy-paths (viewBox 0 0 24 24).
// Material/Lucide-stil filled silhouettes — rene og umiddelbart gjenkjennelige.
// Representerer det CNC-utskårne verktøy-hullet i HDFI-platen.
// =============================================================================

const TOOL_SVG: Record<HdfiSwatch["tool"], string> = {
  // Skiftenøkkel — Material Design «build»-ikon (diagonal kombinasjonsnøkkel)
  wrench: `<path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>`,
  // Skrutrekker — ergonomisk håndtak + skaft + flat tip, diagonal
  screwdriver: `<path d="M18.3 2.6c-.4-.4-1-.4-1.4 0l-3.5 3.5c-.8.8-1.1 1.9-.9 2.9l-7.8 7.8-1.3 3.9c-.1.4 0 .8.3 1.1.3.3.7.4 1.1.3l3.9-1.3 7.8-7.8c1 .2 2.1-.1 2.9-.9l3.5-3.5c.4-.4.4-1 0-1.4l-4.4-4.4zM7.4 18.9l-2.3.8.8-2.3 7.1-7.1 1.5 1.5-7.1 7.1z"/>`,
};

// =============================================================================
// Swatch-rendering — HTML-card med SVG-cutout
// =============================================================================

function renderSwatchSvg(sw: HdfiSwatch): string {
  // Plate (SVG-rect i plate-farge) med subtil gradient for relief.
  // Tool-cutout: 3 lag — rim (sekundærfarge, størst), foam (svart), metall-streak (tool-hint).
  // Tool-ikonet er 24×24 viewBox — vi plasserer det sentrert, ~46% av swatch-bredde.
  const toolPath = TOOL_SVG[sw.tool];
  const idSuffix = sw.label.replace(/[^a-z]/gi, "");
  const gradId = `g-${idSuffix}`;

  // Swatch er 320×200. Tool-region: 24×24-enheter skalert til ~120px, sentrert.
  const toolScale = 120 / 24; // 24-enheter → 120px
  const toolX = (320 - 120) / 2;
  const toolY = (200 - 120) / 2;
  // Rim: 14% større enn foam, sentrert rundt tool-senter (12,12 i tool-koord)
  const rimScale = 1.14;
  const rimOffset = ((1 - rimScale) * 24) / 2; // for å holde sentrert

  return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" class="swatch-svg">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
        <stop offset="0.4" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="1" stop-color="#000000" stop-opacity="0.20"/>
      </linearGradient>
      <linearGradient id="m-${idSuffix}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#5a5d63"/>
        <stop offset="0.5" stop-color="#9aa0a8"/>
        <stop offset="1" stop-color="#3c3e42"/>
      </linearGradient>
    </defs>
    <!-- Plate -->
    <rect x="2" y="2" width="316" height="196" rx="24" fill="${sw.plate}"/>
    <rect x="2" y="2" width="316" height="196" rx="24" fill="url(#${gradId})"/>
    <!-- Tool-cutout: rim-lag (sekundærfarge — gravert kant), størst -->
    <g transform="translate(${toolX},${toolY}) scale(${toolScale})">
      <g transform="translate(${rimOffset},${rimOffset}) scale(${rimScale})" fill="${sw.rim}">${toolPath}</g>
    </g>
    <!-- Tool-cutout: foam-lag (svart skum under), normal størrelse -->
    <g transform="translate(${toolX},${toolY}) scale(${toolScale})">
      <g fill="#0A0A0B">${toolPath}</g>
    </g>
    <!-- Tool-cutout: metall-hint (selve verktøyet ligger nedi) — subtilt mindre -->
    <g transform="translate(${toolX},${toolY}) scale(${toolScale})">
      <g transform="translate(1.4,1.4) scale(0.88)" fill="url(#m-${idSuffix})" opacity="0.92">${toolPath}</g>
    </g>
    <!-- Tynn kant rundt platen -->
    <rect x="2" y="2" width="316" height="196" rx="24" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>
  </svg>`;
}

// =============================================================================
// HTML-template
// =============================================================================

export interface ProduktVariantHtmlInput {
  /** Hovedheadline — rendres uppercase, brytes på linjeskift hvis lang. */
  headline: string;
  /** Ett ord i headline som skal være FT-rødt. */
  redWord?: string | null;
  /** Kort body-linje nederst (italic). */
  body?: string | null;
  /** Canvas-dimensjoner. */
  width: number;
  height: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Bygg headline-HTML med ett ord i FT-rødt. */
function headlineHtml(headline: string, redWord: string | null): string {
  const upper = headline.toUpperCase().trim();
  const redUpper = (redWord ?? "").toUpperCase().trim();
  if (!redUpper) return escapeHtml(upper);
  const re = new RegExp(`\\b(${redUpper.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b`);
  return escapeHtml(upper).replace(re, '<span class="red">$1</span>');
}

export function buildProduktVariantHtml(input: ProduktVariantHtmlInput): string {
  const { width: W, height: H } = input;
  const isLandscape = W > H * 1.2;
  const isPortrait = H > W * 1.2;

  const swatchSvgs = HDFI_SWATCHES.map(
    (sw) => `
    <div class="swatch">
      ${renderSwatchSvg(sw)}
      <div class="swatch-label">${escapeHtml(sw.label)}</div>
    </div>`
  ).join("");

  const wordmark = wordmarkDataUrl();
  const wordmarkHtml = wordmark
    ? `<div class="wordmark"><img src="${wordmark}" alt="Fosen Tools"/></div>`
    : "";

  const bodyHtml = input.body
    ? `<div class="body-line">${escapeHtml(input.body)}</div>`
    : "";

  // Responsiv skalering — landscape bruker 6×1 grid (én rad), ellers 3×2.
  const heroSize = isLandscape ? W * 0.044 : W * 0.072;
  const gridCols = isLandscape ? 6 : 3;
  const gap = (isLandscape ? W * 0.016 : W * 0.028);
  const pad = (isLandscape ? W * 0.04 : W * 0.06);
  const labelSize = (isLandscape ? W * 0.016 : W * 0.026);
  const bodySize = (isLandscape ? W * 0.018 : W * 0.026);

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  ${fontFaceCss()}
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; }
  body {
    font-family:'Manrope',-apple-system,sans-serif;
    background:
      radial-gradient(ellipse 60% 50% at 18% 12%, rgba(237,28,36,0.22), transparent 70%),
      #0F1115;
    color:#fff;
    padding:${pad}px;
    display:flex; flex-direction:column;
    position:relative; overflow:hidden;
  }
  /* Blueprint-decor */
  .decor { position:absolute; stroke:rgba(255,255,255,0.5); fill:none; stroke-width:1.4; }
  .decor-tr { top:${pad * 0.7}px; right:${pad * 0.7}px; }
  .decor-bl { bottom:${pad * 0.7}px; left:${pad * 0.7}px; }
  .decor-br { bottom:${pad * 0.7}px; right:${pad * 0.7}px; }
  .decor-tl { top:${pad * 0.7}px; left:${pad * 0.7}px; }

  .headline {
    font-weight:800;
    font-size:${heroSize}px;
    line-height:1.06;
    letter-spacing:0.01em;
    text-transform:uppercase;
    white-space:pre-line;
  }
  .headline .red { color:#ED1C24; }
  .accent { width:${W * 0.085}px; height:3px; background:#ED1C24; margin-top:${H * 0.022}px; }

  .grid {
    flex:1;
    display:grid;
    grid-template-columns:repeat(${gridCols},1fr);
    gap:${gap}px ${gap}px;
    align-content:center;
    margin:${H * 0.03}px 0;
  }
  .swatch { display:flex; flex-direction:column; align-items:center; gap:${H * 0.012}px; }
  .swatch-svg { width:100%; height:auto; display:block;
    filter:drop-shadow(0 ${H * 0.006}px ${H * 0.012}px rgba(0,0,0,0.45)); }
  .swatch-label {
    font-weight:700;
    font-size:${labelSize}px;
    letter-spacing:0.01em;
    color:#fff;
    text-align:center;
  }

  .body-line {
    font-weight:400; font-style:italic;
    font-size:${bodySize}px;
    color:rgba(255,255,255,0.82);
    text-align:center;
    margin-bottom:${H * 0.015}px;
  }
  .wordmark { display:flex; justify-content:center; }
  .wordmark img { width:${W * 0.2}px; height:auto;
    padding:${W * 0.012}px ${W * 0.03}px;
    border:1.4px solid rgba(255,255,255,0.55); border-radius:999px; }
</style></head><body>

  <svg class="decor decor-tr" width="${W * 0.16}" height="${W * 0.06}" viewBox="0 0 160 60">
    <line x1="6" y1="20" x2="154" y2="20"/>
    <line x1="6" y1="14" x2="6" y2="26"/><line x1="40" y1="14" x2="40" y2="26"/>
    <line x1="80" y1="14" x2="80" y2="26"/><line x1="120" y1="14" x2="120" y2="26"/>
    <line x1="154" y1="14" x2="154" y2="26"/>
  </svg>
  <svg class="decor decor-tl" width="${W * 0.07}" height="${W * 0.07}" viewBox="0 0 70 70">
    <path d="M2 30 L2 2 L30 2"/><circle cx="2" cy="30" r="3" fill="rgba(255,255,255,0.5)" stroke="none"/>
  </svg>
  <svg class="decor decor-bl" width="${W * 0.09}" height="${W * 0.09}" viewBox="0 0 90 90">
    <rect x="6" y="42" width="42" height="42"/>
    <line x1="20" y1="42" x2="20" y2="84"/><line x1="34" y1="42" x2="34" y2="84"/>
    <line x1="6" y1="56" x2="48" y2="56"/><line x1="6" y1="70" x2="48" y2="70"/>
  </svg>
  <svg class="decor decor-br" width="${W * 0.08}" height="${W * 0.08}" viewBox="0 0 80 80">
    <circle cx="56" cy="56" r="20"/><circle cx="56" cy="56" r="6"/>
    <line x1="56" y1="20" x2="56" y2="32"/><line x1="56" y1="80" x2="56" y2="92"/>
    <line x1="20" y1="56" x2="32" y2="56"/><line x1="80" y1="56" x2="92" y2="56"/>
  </svg>

  <div class="headline">${headlineHtml(input.headline, input.redWord ?? null)}</div>
  <div class="accent"></div>

  <div class="grid">${swatchSvgs}</div>

  ${bodyHtml}
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

export async function closeProduktVariantBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => undefined);
    sharedBrowser = null;
  }
}

/**
 * Render produkt_variant HDFI-fargevisning til PNG-buffer.
 * Deterministisk — ingen AI involvert.
 */
export async function renderProduktVariantPng(
  input: ProduktVariantHtmlInput
): Promise<{ base64: string; mimeType: string }> {
  const html = buildProduktVariantHtml(input);
  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: { width: input.width, height: input.height },
    deviceScaleFactor: 2, // 2x for skarp output
  });
  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const buf = await page.screenshot({ type: "png" });
    return { base64: buf.toString("base64"), mimeType: "image/png" };
  } finally {
    await page.close().catch(() => undefined);
  }
}
