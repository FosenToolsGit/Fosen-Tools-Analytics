/**
 * Innleggsmaler — galleri (bildevegg / kollasje).
 *
 * Multi-bilde-arketype: viser 2–6 bilder i et adaptivt rutenett med
 * overskrift, bildetekst og FT-wordmark. A/B/C = design-retninger (mørk /
 * editorial-krem / industriell), som de øvrige arketypene.
 *
 * Fungerer for alle tre format (fb/ig/li) — `frame()` + flex-grid skalerer
 * uten egne LI-varianter.
 */

import {
  FT,
  escapeHtml,
  headlineHtml,
  eyebrow,
  rule,
  photo,
  wordmark,
  frame,
  type BgKey,
  type DecorVariant,
} from "./core";

export interface GalleriData {
  eyebrow?: string;
  headline?: string;
  accent?: string;
  caption?: string;
  url?: string;
  /** Bilde-URL-er / data-URL-er. 2–6 anbefalt. */
  images?: string[];
}

/** Antall kolonner i rutenettet ut fra bilde-antall. */
function gridCols(n: number): number {
  if (n <= 2) return 2;
  if (n === 4) return 2;
  return 3;
}

function galleriCore(
  W: number,
  H: number,
  data: GalleriData,
  opts: { bg: BgKey; decor: DecorVariant },
): string {
  const {
    eyebrow: eb = "FRA DAGEN",
    headline = "Bilder fra besøket",
    accent = "",
    caption = "",
    url = "fosen-tools.no",
    images = [],
  } = data;

  const imgs = images.filter((s) => typeof s === "string" && s.trim());
  // Tomt → 4 plassholdere så layouten ser komplett ut i forhåndsvisning
  const cells: (string | null)[] = imgs.length > 0 ? imgs.slice(0, 6) : [null, null, null, null];
  const cols = gridCols(cells.length);
  const cream = opts.bg === "cream" || opts.bg === "creamWarm";
  const muted = cream ? "rgba(15,17,21,0.62)" : "rgba(255,255,255,0.62)";
  const borderCol = cream ? "rgba(15,17,21,0.4)" : "rgba(255,255,255,0.5)";
  const gap = W * 0.018;

  const head =
    `<div style="position:relative;z-index:1;margin-bottom:${W * 0.022}px;">` +
    eyebrow(eb, { color: FT.red }) +
    `<div style="font-weight:800;font-size:${W * 0.05}px;line-height:1.04;` +
    `letter-spacing:-0.015em;text-transform:uppercase;margin-top:${W * 0.008}px;">` +
    headlineHtml(headline, accent) +
    `</div>` +
    rule({ color: FT.red, width: W * 0.06, style: `margin-top:${W * 0.012}px;` }) +
    `</div>`;

  const grid =
    `<div style="flex:1;min-height:0;display:grid;grid-template-columns:repeat(${cols},1fr);` +
    `gap:${gap}px;grid-auto-rows:1fr;position:relative;z-index:1;">` +
    cells
      .map(
        (src) =>
          `<div style="position:relative;min-height:0;">` +
          photo({ W: W / cols, src, tag: "Foto", dark: !cream, radius: W * 0.014 }) +
          `</div>`,
      )
      .join("") +
    `</div>`;

  const bottom =
    `<div style="position:relative;z-index:1;margin-top:${W * 0.022}px;` +
    `display:flex;flex-direction:column;gap:${W * 0.014}px;align-items:center;">` +
    (caption
      ? `<div style="font-size:${W * 0.019}px;color:${muted};line-height:1.45;` +
        `text-align:center;max-width:88%;">${escapeHtml(caption)}</div>`
      : "") +
    `<div style="padding:${W * 0.011}px ${W * 0.03}px;border:1.5px solid ${borderCol};` +
    `border-radius:999px;font-weight:700;font-size:${W * 0.021}px;">${escapeHtml(url)}</div>` +
    wordmark(opts.bg, W) +
    `</div>`;

  return frame({
    W,
    H,
    bg: opts.bg,
    decor: opts.decor,
    pad: W * 0.05,
    children: head + grid + bottom,
  });
}

/** A — FT-klassisk: mørk bakgrunn, full blueprint-dekor. */
export function galleriA(W: number, H: number, data: GalleriData = {}): string {
  return galleriCore(W, H, data, { bg: "ink", decor: "full" });
}

/** B — Editorial: varm krem-bakgrunn, hjørne-dekor. */
export function galleriB(W: number, H: number, data: GalleriData = {}): string {
  return galleriCore(W, H, data, { bg: "creamWarm", decor: "corners" });
}

/** C — Industriell: slate-gradient, rutenett-dekor. */
export function galleriC(W: number, H: number, data: GalleriData = {}): string {
  return galleriCore(W, H, data, { bg: "slate", decor: "grid" });
}
