import { chromium, type Browser } from "playwright";
import fs from "node:fs";
import path from "node:path";

/**
 * Felles infrastruktur for mal-baserte HTML→PNG-render (Innleggsbygger).
 *
 * Alle maler bygger på dette: font-embedding, FT-tokens, blueprint-decor,
 * wordmark, tekst-hjelpere, og delt Playwright-render. Holder mal-filene
 * korte og konsistente — én kilde for FT-stilen.
 */

// =============================================================================
// FT design-tokens
// =============================================================================

export const FT = {
  red: "#ED1C24",
  ink: "#0F1115",
  white: "#FFFFFF",
  burstYellow: "#F4D43A",
  goldTop: "#85704D",
  goldBottom: "#DBB78B",
} as const;

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

export function fontFaceCss(): string {
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
  const ext = path.extname(fp).slice(1).toLowerCase();
  const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
  return `data:${mime};base64,${fs.readFileSync(fp).toString("base64")}`;
}

export function wordmarkDataUrl(variant: "white" | "ink" = "white"): string | null {
  void variant; // Rød-boks-logo fungerer på alle bakgrunner — én logo for begge varianter
  return assetDataUrl("public/social/brand-assets/ft-logo.svg");
}

export function jubileumLogoDataUrl(years: 25 | 100): string | null {
  // Offisielle jubileumslogoer fra brosjyre-editoren
  return assetDataUrl(`public/brosjyre/Jubileumslogo-${years}aar.svg`);
}

// =============================================================================
// Tekst-hjelpere
// =============================================================================

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Bygg headline-HTML der ett ord rendres i en aksent-farge.
 * Resten av teksten beholder default-fargen.
 */
export function headlineHtml(
  headline: string,
  redWord: string | null | undefined,
  opts: { uppercase?: boolean; redColor?: string } = {}
): string {
  const text = opts.uppercase === false ? headline.trim() : headline.toUpperCase().trim();
  const rw = (redWord ?? "").trim();
  if (!rw) return escapeHtml(text);
  const rwMatch = opts.uppercase === false ? rw : rw.toUpperCase();
  const re = new RegExp(`\\b(${escapeRegex(rwMatch)})\\b`);
  const color = opts.redColor ?? FT.red;
  return escapeHtml(text).replace(
    re,
    `<span style="color:${color}">$1</span>`
  );
}

/** Norsk pris-format: 16990 → «16 990,-». */
export function formatNOK(n: number): string {
  return `${Math.round(n).toLocaleString("nb-NO")},-`;
}

// =============================================================================
// Bakgrunn
// =============================================================================

export type Background = "ink" | "red" | "cream";

export function backgroundCss(bg: Background): string {
  if (bg === "red") {
    return `radial-gradient(ellipse 70% 60% at 80% 12%, rgba(0,0,0,0.28), transparent 70%), ${FT.red}`;
  }
  if (bg === "cream") {
    return `#F5F1E8`;
  }
  return `radial-gradient(ellipse 60% 55% at 18% 12%, rgba(237,28,36,0.24), transparent 70%), ${FT.ink}`;
}

/** Tekst-farge som passer bakgrunnen. */
export function fgFor(bg: Background): string {
  return bg === "cream" ? FT.ink : FT.white;
}

/** Aksent-farge (rødt nøkkelord, accent-linje) som passer bakgrunnen. */
export function accentFor(bg: Background): string {
  return bg === "red" ? FT.ink : FT.red;
}

// =============================================================================
// Blueprint corner-decor (FT-signatur)
// =============================================================================

export function decorSvgs(W: number, pad: number, bg: Background = "ink"): string {
  const stroke =
    bg === "cream" ? "rgba(15,17,21,0.32)" : "rgba(255,255,255,0.45)";
  return `
  <svg class="decor decor-tr" width="${W * 0.15}" height="${W * 0.055}" viewBox="0 0 160 60"
    style="position:absolute;top:${pad * 0.7}px;right:${pad * 0.7}px;stroke:${stroke};fill:none;stroke-width:1.4;">
    <line x1="6" y1="20" x2="154" y2="20"/><line x1="6" y1="14" x2="6" y2="26"/>
    <line x1="56" y1="14" x2="56" y2="26"/><line x1="106" y1="14" x2="106" y2="26"/><line x1="154" y1="14" x2="154" y2="26"/>
  </svg>
  <svg class="decor decor-tl" width="${W * 0.06}" height="${W * 0.06}" viewBox="0 0 70 70"
    style="position:absolute;top:${pad * 0.7}px;left:${pad * 0.7}px;stroke:${stroke};fill:none;stroke-width:1.4;">
    <path d="M2 30 L2 2 L30 2"/><circle cx="2" cy="30" r="3" fill="${stroke}" stroke="none"/>
  </svg>
  <svg class="decor decor-bl" width="${W * 0.08}" height="${W * 0.08}" viewBox="0 0 90 90"
    style="position:absolute;bottom:${pad * 0.7}px;left:${pad * 0.7}px;stroke:${stroke};fill:none;stroke-width:1.4;">
    <rect x="6" y="42" width="42" height="42"/><line x1="20" y1="42" x2="20" y2="84"/>
    <line x1="34" y1="42" x2="34" y2="84"/><line x1="6" y1="56" x2="48" y2="56"/><line x1="6" y1="70" x2="48" y2="70"/>
  </svg>
  <svg class="decor decor-br" width="${W * 0.07}" height="${W * 0.07}" viewBox="0 0 80 80"
    style="position:absolute;bottom:${pad * 0.7}px;right:${pad * 0.7}px;stroke:${stroke};fill:none;stroke-width:1.4;">
    <circle cx="56" cy="56" r="20"/><circle cx="56" cy="56" r="6"/>
    <line x1="56" y1="24" x2="56" y2="36"/><line x1="20" y1="56" x2="32" y2="56"/>
  </svg>`;
}

/** Wordmark-blokk (rounded frame). */
export function wordmarkBlock(W: number, bg: Background): string {
  const variant = bg === "cream" ? "ink" : "white";
  const wm = wordmarkDataUrl(variant);
  if (!wm) return "";
  const borderColor =
    bg === "cream" ? "rgba(15,17,21,0.5)" : "rgba(255,255,255,0.5)";
  return `<div style="display:flex;justify-content:center;margin-top:${W * 0.014}px;">
    <img src="${wm}" alt="Fosen Tools" style="width:${W * 0.18}px;height:auto;
      padding:${W * 0.011}px ${W * 0.028}px;border:1.4px solid ${borderColor};border-radius:999px;"/>
  </div>`;
}

// =============================================================================
// Felles SVG-komponenter
// =============================================================================

/** Rød/mørk check-markering. */
export function checkSvg(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="11" fill="${color}"/>
    <path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" stroke-width="2.4"
      fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/** Sted-pin-ikon. */
export function pinSvg(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 7 11.5 7.3 11.7.4.3.9.3 1.3 0C12.9 21.5 20 15.4 20 10c0-4.4-3.6-8-8-8z"
      fill="${color}"/><circle cx="12" cy="10" r="3" fill="#fff"/>
  </svg>`;
}

/** 12-takket stjerne-burst med tekst. */
export function burstSvg(text: string, size: number): string {
  const spikes = 12;
  let pts = "";
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 48 : 39;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    pts += `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)} `;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${pts.trim()}" fill="${FT.burstYellow}"/>
    <text x="50" y="50" font-family="Manrope,sans-serif" font-weight="800"
      font-size="22" fill="${FT.ink}" text-anchor="middle" dominant-baseline="central">${escapeHtml(text)}</text>
  </svg>`;
}

/** Foto-plassholder-boks. */
export function photoPlaceholder(W: number, label = "Foto"): string {
  return `<div style="width:100%;height:100%;background:rgba(255,255,255,0.07);
    border:1.5px dashed rgba(255,255,255,0.28);border-radius:${W * 0.018}px;
    display:flex;align-items:center;justify-content:center;">
    <span style="font-weight:700;font-size:${W * 0.022}px;color:rgba(255,255,255,0.4);">${escapeHtml(label)}</span>
  </div>`;
}

/** Bilde med fallback til plassholder. */
export function imageOrPlaceholder(
  url: string | null | undefined,
  W: number,
  label = "Foto",
  fit: "cover" | "contain" = "cover"
): string {
  if (url) {
    return `<div style="width:100%;height:100%;border-radius:${W * 0.018}px;overflow:hidden;
      background:${fit === "contain" ? "#fff" : "transparent"};">
      <img src="${escapeHtml(url)}" alt="" style="width:100%;height:100%;object-fit:${fit};
        ${fit === "contain" ? `padding:6%;` : ""}"/>
    </div>`;
  }
  return photoPlaceholder(W, label);
}

// =============================================================================
// Aspect-dimensjoner
// =============================================================================

export type AspectSlug = "fb" | "ig" | "li";

export const ASPECT_DIMS: Record<AspectSlug, { w: number; h: number }> = {
  fb: { w: 1080, h: 1080 },
  ig: { w: 1080, h: 1350 },
  li: { w: 1200, h: 675 },
};

// =============================================================================
// Delt Playwright HTML→PNG-render
// =============================================================================

let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.isConnected()) return sharedBrowser;
  sharedBrowser = await chromium.launch({ headless: true });
  return sharedBrowser;
}

export async function closeRenderBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close().catch(() => undefined);
    sharedBrowser = null;
  }
}

/**
 * Render en HTML-streng til PNG-buffer (base64) via headless Chromium.
 * 2x device-scale for skarp output.
 */
export async function renderHtmlToPng(
  html: string,
  width: number,
  height: number
): Promise<{ base64: string; mimeType: string }> {
  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: { width, height },
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

/**
 * Standard side-shell — body med bakgrunn, padding, font, decor.
 * Maler kaller dette og fyller inn `content`.
 */
export function pageShell(opts: {
  width: number;
  height: number;
  background: Background;
  content: string;
  /** Ekstra CSS spesifikt for malen. */
  css?: string;
}): string {
  const { width: W, height: H, background } = opts;
  const isLandscape = W > H * 1.2;
  const pad = isLandscape ? W * 0.045 : W * 0.06;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  ${fontFaceCss()}
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:${W}px;height:${H}px;}
  body{font-family:'Manrope',-apple-system,sans-serif;background:${backgroundCss(background)};
    color:${fgFor(background)};padding:${pad}px;display:flex;flex-direction:column;
    position:relative;overflow:hidden;}
  ${opts.css ?? ""}
  </style></head><body>
  ${decorSvgs(W, pad, background)}
  ${opts.content}
  </body></html>`;
}
