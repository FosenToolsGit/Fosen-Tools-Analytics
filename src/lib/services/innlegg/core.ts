/**
 * Innleggsmaler — felles kjerne (portert fra Claude Design `innlegg-primitives.jsx`).
 *
 * FT design-tokens + primitiver som HTML-string-byggere. Alle mal-filene
 * (produkt.ts, gruppe2/3/4.ts) bygger på dette. Rendres deterministisk til
 * PNG via Playwright (`renderHtmlToPng` i render-common.ts).
 *
 * Speiler design-kildens primitiver 1:1 — samme navn, samme tokens.
 */

import fs from "node:fs";
import path from "node:path";
import { renderHtmlToPng } from "../render-common";

// =============================================================================
// FT design-tokens
// =============================================================================

export const FT = {
  red: "#ED1C24",
  redCmyk: "#D8121B",
  ink: "#0F1115",
  inkDeep: "#06080B",
  white: "#FFFFFF",
  cream: "#F5F1E8",
  creamWarm: "#EFE6D3",
  burstYellow: "#F4D43A",
  goldTop: "#85704D",
  goldBottom: "#DBB78B",
  slate: "#1B1E23",
  slateMid: "#2A2F38",
  grid: "rgba(255,255,255,0.10)",
  gridDark: "rgba(15,17,21,0.10)",
} as const;

export const MONO = '"JetBrains Mono", ui-monospace, monospace';
export const SANS = "Manrope, -apple-system, sans-serif";

// =============================================================================
// Bakgrunner
// =============================================================================

export type BgKey =
  | "ink"
  | "inkPlain"
  | "inkDeep"
  | "red"
  | "redFlat"
  | "cream"
  | "creamWarm"
  | "slate";

export const BG: Record<BgKey, string> = {
  ink: `radial-gradient(ellipse 60% 55% at 18% 12%, rgba(237,28,36,0.24), transparent 70%), ${FT.ink}`,
  inkPlain: FT.ink,
  inkDeep: FT.inkDeep,
  red: `radial-gradient(ellipse 70% 60% at 80% 12%, rgba(0,0,0,0.28), transparent 70%), ${FT.red}`,
  redFlat: FT.red,
  cream: FT.cream,
  creamWarm: `radial-gradient(ellipse 80% 60% at 20% 100%, rgba(237,28,36,0.08), transparent 70%), ${FT.creamWarm}`,
  slate: `linear-gradient(160deg, ${FT.slateMid} 0%, ${FT.slate} 60%, ${FT.ink} 100%)`,
};

export const isCream = (bg: BgKey): boolean =>
  bg === "cream" || bg === "creamWarm";
export const isRedBg = (bg: BgKey): boolean => bg === "red" || bg === "redFlat";

export const fgFor = (bg: BgKey): string => (isCream(bg) ? FT.ink : FT.white);
export const accentFor = (bg: BgKey): string => (isRedBg(bg) ? FT.ink : FT.red);
export const mutedFor = (bg: BgKey): string =>
  isCream(bg)
    ? "rgba(15,17,21,0.58)"
    : isRedBg(bg)
      ? "rgba(255,255,255,0.78)"
      : "rgba(255,255,255,0.62)";

// =============================================================================
// Tekst-hjelpere
// =============================================================================

export function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Norsk pris-format: 16990 → «16 990,-» (non-breaking space). */
export function formatNOK(n: number): string {
  return `${Math.round(n).toLocaleString("nb-NO").replace(/\s/g, " ")},-`;
}

/**
 * Headline der ett ord («accent») rendres i aksent-farge. Resten beholder
 * default-farge. Inndata uppercase-es med mindre `uppercase:false`.
 */
export function headlineHtml(
  text: string,
  accent?: string | null,
  opts: { accentColor?: string; uppercase?: boolean } = {}
): string {
  const t = opts.uppercase === false ? String(text ?? "") : String(text ?? "").toUpperCase();
  const aw = (accent ?? "").trim();
  if (!aw) return escapeHtml(t);
  const re = new RegExp(`(${escapeRegex(opts.uppercase === false ? aw : aw.toUpperCase())})`, "i");
  const color = opts.accentColor ?? FT.red;
  return escapeHtml(t).replace(re, `<span style="color:${color}">$1</span>`);
}

// =============================================================================
// Aspect
// =============================================================================

export type AspectKey = "fb" | "ig" | "li";

export function aspectOf(W: number, H: number): AspectKey {
  const r = W / H;
  if (r > 1.4) return "li";
  if (r < 0.9) return "ig";
  return "fb";
}

export const ASPECT_DIMS: Record<AspectKey, { w: number; h: number }> = {
  fb: { w: 1080, h: 1080 },
  ig: { w: 1080, h: 1350 },
  li: { w: 1200, h: 675 },
};

// =============================================================================
// Font-embedding (Manrope + JetBrains Mono)
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
  const faces: Array<[string, string, number]> = [
    ["Manrope", "manrope-latin-400-normal.woff2", 400],
    ["Manrope", "manrope-latin-700-normal.woff2", 700],
    ["Manrope", "manrope-latin-800-normal.woff2", 800],
    ["JetBrains Mono", "jetbrains-mono-latin-400-normal.woff2", 400],
    ["JetBrains Mono", "jetbrains-mono-latin-700-normal.woff2", 700],
  ];
  return faces
    .map(([family, file, weight]) => {
      const b = fontB64(file);
      return b
        ? `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;` +
            `src:url(data:font/woff2;base64,${b}) format('woff2');}`
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
  const mime =
    ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
  return `data:${mime};base64,${fs.readFileSync(fp).toString("base64")}`;
}

const wordmarkCache: Record<string, string | null> = {};
export function wordmarkDataUrl(variant: "white" | "ink"): string | null {
  if (wordmarkCache[variant] !== undefined) return wordmarkCache[variant];
  const v = assetDataUrl(`public/social/brand-assets/ft-wordmark-${variant}.png`);
  wordmarkCache[variant] = v;
  return v;
}

export function jubileumLogoDataUrl(years: 25 | 100): string | null {
  return assetDataUrl(`public/brosjyre/Jubileumslogo-${years}aar.svg`);
}

// =============================================================================
// Decor — blueprint-dekor, 6 varianter
// =============================================================================

export type DecorVariant =
  | "full"
  | "dim"
  | "corners"
  | "rulers"
  | "grid"
  | "none";

export function decorSvg(
  variant: DecorVariant,
  bg: BgKey,
  W: number,
  H: number,
  pad?: number
): string {
  if (variant === "none") return "";
  const p = pad ?? (W > H * 1.2 ? W * 0.045 : W * 0.06);
  const isDark = !isCream(bg);
  const baseStroke = isDark ? "rgba(255,255,255,0.45)" : "rgba(15,17,21,0.35)";
  const dimStroke = isDark ? "rgba(255,255,255,0.22)" : "rgba(15,17,21,0.18)";
  const stroke = variant === "dim" ? dimStroke : baseStroke;
  const open = `<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;" viewBox="0 0 ${W} ${H}">`;

  if (variant === "rulers") {
    const ruler = (y: number) => {
      let ticks = `<line x1="${p}" y1="${y}" x2="${W - p}" y2="${y}"/>`;
      for (let i = 0; i < 11; i++) {
        const x = p + (W - p * 2) * (i / 10);
        const tick = i % 5 === 0 ? 10 : 5;
        ticks += `<line x1="${x}" y1="${y - tick}" x2="${x}" y2="${y + tick}"/>`;
      }
      return `<g stroke="${stroke}" stroke-width="1.4" fill="none">${ticks}</g>`;
    };
    return `${open}${ruler(p * 0.85)}${ruler(H - p * 0.85)}</svg>`;
  }

  if (variant === "grid") {
    const cols = 12;
    const rows = 12;
    let lines = "";
    for (let i = 0; i <= cols; i++) {
      const x = p + (W - p * 2) * (i / cols);
      lines += `<line x1="${x}" y1="${p}" x2="${x}" y2="${H - p}"/>`;
    }
    for (let i = 0; i <= rows; i++) {
      const y = p + (H - p * 2) * (i / rows);
      lines += `<line x1="${p}" y1="${y}" x2="${W - p}" y2="${y}"/>`;
    }
    return `${open}<g stroke="${dimStroke}" stroke-width="1" fill="none">${lines}</g></svg>`;
  }

  if (variant === "corners") {
    const s = W * 0.045;
    const sw = 1.6;
    const corner = (x: number, y: number, rot: number) =>
      `<g transform="translate(${x},${y}) rotate(${rot})">` +
      `<line x1="0" y1="0" x2="${s}" y2="0" stroke="${stroke}" stroke-width="${sw}"/>` +
      `<line x1="0" y1="0" x2="0" y2="${s}" stroke="${stroke}" stroke-width="${sw}"/></g>`;
    return (
      `${open}${corner(p, p, 0)}${corner(W - p, p, 90)}` +
      `${corner(W - p, H - p, 180)}${corner(p, H - p, 270)}</svg>`
    );
  }

  // full / dim — FT-signatur med 4 hjørne-elementer
  return (
    `${open}` +
    `<g transform="translate(${W * 0.85}, ${p * 0.7})" stroke="${stroke}" stroke-width="1.4" fill="none">` +
    `<line x1="6" y1="20" x2="${W * 0.15 - 6}" y2="20"/>` +
    `<line x1="6" y1="14" x2="6" y2="26"/>` +
    `<line x1="${W * 0.05}" y1="14" x2="${W * 0.05}" y2="26"/>` +
    `<line x1="${W * 0.1}" y1="14" x2="${W * 0.1}" y2="26"/>` +
    `<line x1="${W * 0.15 - 6}" y1="14" x2="${W * 0.15 - 6}" y2="26"/></g>` +
    `<g transform="translate(${p * 0.7}, ${p * 0.7})" stroke="${stroke}" stroke-width="1.4" fill="none">` +
    `<path d="M2 30 L2 2 L30 2"/><circle cx="2" cy="30" r="3" fill="${stroke}" stroke="none"/></g>` +
    `<g transform="translate(${p * 0.7}, ${H - p * 0.7 - W * 0.08})" stroke="${stroke}" stroke-width="1.4" fill="none">` +
    `<rect x="6" y="42" width="42" height="42"/>` +
    `<line x1="20" y1="42" x2="20" y2="84"/><line x1="34" y1="42" x2="34" y2="84"/>` +
    `<line x1="6" y1="56" x2="48" y2="56"/><line x1="6" y1="70" x2="48" y2="70"/></g>` +
    `<g transform="translate(${W - p * 0.7 - W * 0.07}, ${H - p * 0.7 - W * 0.07})" stroke="${stroke}" stroke-width="1.4" fill="none">` +
    `<circle cx="56" cy="56" r="20"/><circle cx="56" cy="56" r="6"/>` +
    `<line x1="56" y1="24" x2="56" y2="36"/><line x1="20" y1="56" x2="32" y2="56"/></g>` +
    `</svg>`
  );
}

// =============================================================================
// Wordmark-pille
// =============================================================================

export function wordmark(bg: BgKey, W: number, extraStyle = ""): string {
  const variant: "white" | "ink" = isCream(bg) ? "ink" : "white";
  const url = wordmarkDataUrl(variant);
  if (!url) return "";
  // Bart wordmark — ingen ramme/pille rundt logoen.
  return (
    `<div style="display:flex;justify-content:center;${extraStyle}">` +
    `<img src="${url}" alt="Fosen Tools" style="width:${W * 0.18}px;height:auto;"/></div>`
  );
}

/**
 * Bart wordmark-bilde uten pille-ramme. Skaleres via `width` ELLER `height`
 * (wordmark-aspekt ≈ 11:1). Brukes i footer-rader og editorial-varianter.
 */
export function wordmarkImg(
  variant: "white" | "ink",
  opts: { width?: number; height?: number; style?: string } = {}
): string {
  const url = wordmarkDataUrl(variant);
  if (!url) return "";
  const dim =
    opts.width != null
      ? `width:${opts.width}px;height:auto;`
      : opts.height != null
        ? `height:${opts.height}px;width:auto;`
        : `width:200px;height:auto;`;
  return `<img src="${url}" alt="Fosen Tools" style="${dim}${opts.style ?? ""}"/>`;
}

// =============================================================================
// Burst — 12-takket stjerne med tekst
// =============================================================================

export function burst(
  text: string,
  size: number,
  opts: { color?: string; fg?: string; rotation?: number } = {}
): string {
  const spikes = 12;
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? 48 : 39;
    const a = (Math.PI * i) / spikes - Math.PI / 2;
    pts.push(
      `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`
    );
  }
  const color = opts.color ?? FT.burstYellow;
  const fg = opts.fg ?? FT.ink;
  const rot = opts.rotation ?? -8;
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 100 100" ` +
    `style="filter:drop-shadow(0 6px 14px rgba(0,0,0,0.25));transform:rotate(${rot}deg);">` +
    `<polygon points="${pts.join(" ")}" fill="${color}"/>` +
    `<text x="50" y="50" font-family="Manrope,sans-serif" font-weight="800" ` +
    `font-size="22" fill="${fg}" text-anchor="middle" dominant-baseline="central">${escapeHtml(text)}</text></svg>`
  );
}

// =============================================================================
// Check-mark sirkel
// =============================================================================

export function checkCircle(size: number, color = FT.red, fg = "#fff"): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24">` +
    `<circle cx="12" cy="12" r="11" fill="${color}"/>` +
    `<path d="M7 12.5l3.2 3.2L17 9" stroke="${fg}" stroke-width="2.4" fill="none" ` +
    `stroke-linecap="round" stroke-linejoin="round"/></svg>`
  );
}

// =============================================================================
// Sted-pin
// =============================================================================

export function pin(size: number, color = FT.red): string {
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24">` +
    `<path d="M12 2C7.6 2 4 5.6 4 10c0 5.4 7 11.5 7.3 11.7.4.3.9.3 1.3 0C12.9 21.5 20 15.4 20 10c0-4.4-3.6-8-8-8z" fill="${color}"/>` +
    `<circle cx="12" cy="10" r="3" fill="#fff"/></svg>`
  );
}

// =============================================================================
// Foto — bilde eller stripet plassholder med mono-tag
// =============================================================================

export function photo(opts: {
  src?: string | null;
  W: number;
  fit?: "cover" | "contain";
  radius?: number;
  tag?: string;
  dark?: boolean;
  style?: string;
}): string {
  const { W, src } = opts;
  const fit = opts.fit ?? "cover";
  const radius = opts.radius ?? W * 0.018;
  const dark = opts.dark ?? true;
  const tag = opts.tag ?? "Foto";
  const inner = src
    ? `<img src="${escapeHtml(src)}" alt="" style="width:100%;height:100%;object-fit:${fit};"/>`
    : `<div style="width:100%;height:100%;background:repeating-linear-gradient(135deg,` +
      (dark
        ? "rgba(255,255,255,0.04) 0 14px,rgba(255,255,255,0.07) 14px 28px"
        : "rgba(15,17,21,0.04) 0 14px,rgba(15,17,21,0.08) 14px 28px") +
      `);display:flex;align-items:center;justify-content:center;">` +
      `<div style="font-family:${MONO};font-size:${W * 0.018}px;font-weight:500;` +
      `letter-spacing:0.12em;text-transform:uppercase;color:${dark ? "rgba(255,255,255,0.42)" : "rgba(15,17,21,0.42)"};` +
      `padding:8px 14px;border:1px dashed ${dark ? "rgba(255,255,255,0.32)" : "rgba(15,17,21,0.32)"};border-radius:4px;">` +
      `${escapeHtml(tag)}</div></div>`;
  return (
    `<div style="width:100%;height:100%;border-radius:${radius}px;overflow:hidden;` +
    `position:relative;${opts.style ?? ""}">${inner}</div>`
  );
}

// =============================================================================
// Eyebrow + Rule
// =============================================================================

/**
 * Eyebrow — liten uppercase kicker. Design-default = 0.85em ≈ 13.6px
 * (relativt 16px body). Send `fontSize` for å overstyre.
 */
export function eyebrow(
  text: string,
  opts: { color?: string; fontSize?: number; style?: string } = {}
): string {
  return (
    `<div style="font-weight:800;font-size:${opts.fontSize ?? 13.6}px;letter-spacing:0.18em;` +
    `text-transform:uppercase;color:${opts.color ?? FT.red};${opts.style ?? ""}">${escapeHtml(text)}</div>`
  );
}

export function rule(opts: { color?: string; width: number; height?: number; style?: string }): string {
  return `<div style="width:${opts.width}px;height:${opts.height ?? 3}px;background:${opts.color ?? FT.red};${opts.style ?? ""}"></div>`;
}

// =============================================================================
// Frame — full HTML-dokument med bakgrunn, padding og decor
// =============================================================================

export function frame(opts: {
  W: number;
  H: number;
  bg?: BgKey;
  decor?: DecorVariant;
  children: string;
  pad?: number;
  bodyStyle?: string;
}): string {
  const { W, H, children } = opts;
  const bg = opts.bg ?? "ink";
  const decor = opts.decor ?? "full";
  const pad = opts.pad ?? (W > H * 1.2 ? W * 0.045 : W * 0.06);
  return (
    `<!doctype html><html><head><meta charset="utf-8"><style>` +
    fontFaceCss() +
    `*{margin:0;padding:0;box-sizing:border-box;}` +
    `html,body{width:${W}px;height:${H}px;}` +
    `body{background:${BG[bg]};color:${fgFor(bg)};font-family:${SANS};` +
    `position:relative;overflow:hidden;padding:${pad}px;` +
    `display:flex;flex-direction:column;${opts.bodyStyle ?? ""}}` +
    `</style></head><body>` +
    decorSvg(decor, bg, W, H, pad) +
    children +
    `</body></html>`
  );
}

// =============================================================================
// Render
// =============================================================================

export async function renderInnleggPng(
  html: string,
  width: number,
  height: number
): Promise<{ base64: string; mimeType: string }> {
  return renderHtmlToPng(html, width, height);
}

// Hold jubileum-helperen referert (brukes av milepael-malene)
void jubileumLogoDataUrl;
