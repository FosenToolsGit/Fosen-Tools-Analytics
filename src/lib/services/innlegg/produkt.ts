/**
 * Innleggsmaler — produkt-arketyper (portert fra Claude Design).
 *
 * 4 produkt-arketyper × 3 retninger (A/B/C) + egne landscape-layouts:
 *  - produkt-single   — ett produkt stort med pris
 *  - produkt-grid     — flere produkter i rutenett
 *  - produkt-manufacturer — merke-fokus
 *  - produkt-variant  — HDFI 6 standardfarger
 *
 * Hver eksportert funksjon `(W, H, data)` returnerer et fullt HTML-dokument
 * via `frame()`. Landscape (16:9) rutes til interne `*LI`-funksjoner.
 * Square (fb 1:1) og portrait (ig 4:5) bruker samme funksjon.
 *
 * Speiler design-kilden 1:1 — mål, padding, farger, font-størrelser.
 */

import {
  FT,
  MONO,
  formatNOK,
  escapeHtml,
  aspectOf,
  mutedFor,
  burst,
  photo,
  wordmark,
  eyebrow,
  rule,
  frame,
  wordmarkDataUrl,
} from "./core";

// =============================================================================
// Datamodeller
// =============================================================================

export interface ProduktItem {
  manufacturer?: string;
  name: string;
  priceBefore?: number;
  priceNow: number;
  discount: string;
  url?: string;
  photo?: string | null;
  sku?: string;
  hero?: boolean;
  size?: string;
}

export interface ProduktSingleData {
  eyebrow?: string;
  manufacturer?: string;
  name?: string;
  priceBefore?: number;
  priceNow?: number;
  discount?: string;
  url?: string;
  photo?: string | null;
  sku?: string;
}

export interface ProduktGridData {
  items?: ProduktItem[];
}

export interface ProduktMfrData {
  manufacturer?: string;
  tagline?: string;
  items?: ProduktItem[];
}

export interface ProduktVariantColor {
  label: string;
  code: string;
  top: string;
  bottom: string;
}

export interface ProduktVariantData {
  colors?: ProduktVariantColor[];
}

// =============================================================================
// LI scale-helper (speiler `S(H)` i innlegg-maler-li.jsx)
// =============================================================================

interface LiScale {
  pad: number;
  gap: number;
  gapSm: number;
  gapXs: number;
  eyebrow: number;
  body: number;
  bodySm: number;
  bodyXs: number;
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  bigNum: number;
  monoSm: number;
  radius: number;
}

function S(H: number): LiScale {
  return {
    pad: H * 0.06,
    gap: H * 0.04,
    gapSm: H * 0.02,
    gapXs: H * 0.012,
    eyebrow: H * 0.026,
    body: H * 0.028,
    bodySm: H * 0.022,
    bodyXs: H * 0.018,
    h1: H * 0.085,
    h2: H * 0.06,
    h3: H * 0.044,
    h4: H * 0.032,
    bigNum: H * 0.36,
    monoSm: H * 0.022,
    radius: H * 0.025,
  };
}

// =============================================================================
// FooterRow — felles footer for LI- og C-LI-malene
// =============================================================================

function footerRow(
  W: number,
  H: number,
  url: string,
  opts: { dark?: boolean; ink?: boolean; italic?: string; monoLabel?: string } = {}
): string {
  const s = S(H);
  const ink = opts.ink ?? false;
  const wm = wordmarkDataUrl(ink ? "ink" : "white");
  const wmImg = wm
    ? `<img src="${wm}" alt="Fosen Tools" style="height:${H * 0.05}px;"/>`
    : "";
  let left = "";
  if (url) {
    left +=
      `<div style="padding:${s.gapXs * 0.5}px ${s.gapXs * 1.4}px;` +
      `border:1.5px solid ${ink ? "rgba(15,17,21,0.4)" : "rgba(255,255,255,0.5)"};border-radius:999px;` +
      `font-weight:700;font-size:${s.bodyXs}px;">${escapeHtml(url)}</div>`;
  }
  if (opts.italic) {
    left +=
      `<div style="font-style:italic;font-size:${s.bodyXs}px;` +
      `color:${ink ? "rgba(15,17,21,0.6)" : mutedFor("ink")};">${escapeHtml(opts.italic)}</div>`;
  }
  if (opts.monoLabel) {
    left +=
      `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.75}px;letter-spacing:0.18em;` +
      `color:${ink ? "rgba(15,17,21,0.55)" : mutedFor("ink")};">${escapeHtml(opts.monoLabel)}</div>`;
  }
  return (
    `<div style="margin-top:${s.gapXs}px;display:flex;align-items:center;justify-content:space-between;` +
    `position:relative;z-index:1;gap:${s.gap}px;">` +
    `<div style="display:flex;align-items:center;gap:${s.gapXs * 1.5}px;flex:1;">${left}</div>` +
    `${wmImg}</div>`
  );
}

// =============================================================================
// 1. PRODUKT-SINGLE
// =============================================================================

// ─── 1A · Mørk + burst ────────────────────────────────────────────────────

export function produktSingleA(W: number, H: number, data: ProduktSingleData): string {
  if (aspectOf(W, H) === "li") return produktSingleALI(W, H, data);
  const {
    eyebrow: eb = "UKENS TILBUD",
    manufacturer = "FACOM",
    name = "Verktøyvogn JET+",
    priceBefore = 28990,
    priceNow = 16990,
    discount = "-41%",
    url = "fosen-tools.no",
    photo: photoSrc = null,
  } = data;
  const children =
    `<div style="display:flex;align-items:flex-start;justify-content:space-between;position:relative;z-index:1;">` +
    eyebrow(eb) +
    `</div>` +
    `<div style="display:flex;gap:${W * 0.05}px;margin-top:${W * 0.03}px;flex:1;align-items:center;position:relative;z-index:1;">` +
    `<div style="flex:1 1 52%;aspect-ratio:1 / 1;max-height:${H * 0.55}px;position:relative;">` +
    photo({ W, src: photoSrc, tag: "Produktbilde", radius: W * 0.022 }) +
    `<div style="position:absolute;top:${-W * 0.02}px;right:${-W * 0.04}px;">` +
    burst(discount, W * 0.17) +
    `</div></div>` +
    `<div style="flex:1 1 48%;display:flex;flex-direction:column;gap:${W * 0.018}px;">` +
    `<div style="font-weight:700;letter-spacing:0.16em;text-transform:uppercase;` +
    `font-size:${W * 0.022}px;color:${mutedFor("ink")};">${escapeHtml(manufacturer)}</div>` +
    `<div style="font-weight:800;font-size:${W * 0.052}px;line-height:1.04;text-transform:uppercase;letter-spacing:-0.01em;">` +
    `${escapeHtml(name.toUpperCase())}</div>` +
    `<div style="height:1px;background:rgba(255,255,255,0.18);margin:${W * 0.018}px 0;"></div>` +
    `<div style="display:flex;align-items:baseline;gap:${W * 0.012}px;">` +
    `<span style="font-size:${W * 0.022}px;color:${mutedFor("ink")};` +
    `text-decoration:line-through;text-decoration-color:${FT.red};text-decoration-thickness:2px;">` +
    `${escapeHtml(formatNOK(priceBefore))}</span></div>` +
    `<div style="font-weight:800;font-size:${W * 0.082}px;line-height:1;letter-spacing:-0.02em;">` +
    `${escapeHtml(formatNOK(priceNow))}</div>` +
    `<div style="font-size:${W * 0.016}px;color:${mutedFor("ink")};margin-top:${W * 0.004}px;">Pris eks. mva</div>` +
    `</div></div>` +
    `<div style="margin-top:auto;display:flex;flex-direction:column;gap:${W * 0.012}px;position:relative;z-index:1;">` +
    `<div style="display:flex;justify-content:center;">` +
    `<div style="padding:${W * 0.014}px ${W * 0.04}px;border:1.5px solid rgba(255,255,255,0.5);border-radius:999px;` +
    `font-weight:700;font-size:${W * 0.024}px;letter-spacing:0.02em;">${escapeHtml(url)}</div></div>` +
    wordmark("ink", W, `margin-top:${W * 0.005}px;`) +
    `</div>`;
  return frame({ W, H, bg: "ink", decor: "full", children });
}

function produktSingleALI(W: number, H: number, data: ProduktSingleData): string {
  const {
    eyebrow: eb = "UKENS TILBUD",
    manufacturer = "FACOM",
    name = "Verktøyvogn JET+",
    priceBefore = 28990,
    priceNow = 16990,
    discount = "-41%",
    url = "fosen-tools.no",
    photo: photoSrc = null,
  } = data;
  const s = S(H);
  const children =
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:${s.gap}px;flex:1;position:relative;z-index:1;align-items:center;">` +
    `<div style="position:relative;aspect-ratio:1.2/1;height:100%;max-height:${H * 0.78}px;">` +
    photo({ W: H * 1.6, src: photoSrc, tag: "Produktbilde", radius: s.radius }) +
    `<div style="position:absolute;top:${-s.gapXs * 2}px;right:${-s.gapXs * 3}px;">` +
    burst(discount, H * 0.22) +
    `</div></div>` +
    `<div style="display:flex;flex-direction:column;gap:${s.gapXs}px;">` +
    eyebrow(eb, { fontSize: s.eyebrow }) +
    `<div style="font-weight:700;font-size:${s.bodyXs}px;letter-spacing:0.14em;` +
    `text-transform:uppercase;color:${mutedFor("ink")};">${escapeHtml(manufacturer)}</div>` +
    `<div style="font-weight:800;font-size:${s.h2}px;line-height:1.02;text-transform:uppercase;letter-spacing:-0.01em;">` +
    `${escapeHtml(name.toUpperCase())}</div>` +
    `<div style="height:1px;background:rgba(255,255,255,0.18);margin:${s.gapXs}px 0;"></div>` +
    `<div style="display:flex;align-items:baseline;gap:${s.gapXs}px;">` +
    `<span style="font-size:${s.bodySm}px;color:${mutedFor("ink")};` +
    `text-decoration:line-through;text-decoration-color:${FT.red};text-decoration-thickness:2px;">` +
    `${escapeHtml(formatNOK(priceBefore))}</span>` +
    `<span style="font-weight:800;font-size:${s.h1}px;line-height:1;letter-spacing:-0.02em;">` +
    `${escapeHtml(formatNOK(priceNow))}</span></div>` +
    `</div></div>` +
    footerRow(W, H, url, { dark: true });
  return frame({ W, H, bg: "ink", decor: "full", pad: s.pad, children });
}

// ─── 1B · Industriell stripe + krem-felt ─────────────────────────────────

export function produktSingleB(W: number, H: number, data: ProduktSingleData): string {
  if (aspectOf(W, H) === "li") return produktSingleBLI(W, H, data);
  const {
    manufacturer = "FACOM",
    name = "Verktøyvogn JET+",
    priceBefore = 28990,
    priceNow = 16990,
    discount = "-41%",
    url = "fosen-tools.no",
    photo: photoSrc = null,
  } = data;
  const wmInk = wordmarkDataUrl("ink");
  const children =
    `<div style="position:absolute;top:0;left:0;right:0;height:${H * 0.13}px;background:${FT.red};` +
    `display:flex;align-items:center;justify-content:space-between;padding:0 ${W * 0.06}px;color:#fff;">` +
    `<div style="font-weight:800;letter-spacing:0.22em;font-size:${W * 0.022}px;text-transform:uppercase;">UKENS TILBUD</div>` +
    `<div style="font-weight:800;font-size:${W * 0.034}px;">SPAR ${escapeHtml(formatNOK(priceBefore - priceNow).replace(",-", ""))}</div>` +
    `</div>` +
    `<div style="margin-top:${H * 0.13}px;flex:1;display:flex;flex-direction:column;position:relative;z-index:1;">` +
    `<div style="flex:1;display:flex;align-items:center;gap:${W * 0.04}px;">` +
    `<div style="flex:1 1 56%;aspect-ratio:1/1;max-height:${H * 0.5}px;position:relative;">` +
    photo({ W, src: photoSrc, tag: "Produktbilde", dark: false, radius: W * 0.014 }) +
    `<div style="position:absolute;top:${-W * 0.025}px;right:${-W * 0.025}px;transform:rotate(8deg);">` +
    `<div style="background:${FT.ink};color:${FT.burstYellow};padding:${W * 0.014}px ${W * 0.024}px;` +
    `font-weight:800;font-size:${W * 0.038}px;letter-spacing:-0.01em;border-radius:4px;` +
    `box-shadow:0 6px 18px rgba(0,0,0,0.18);">${escapeHtml(discount)}</div></div></div>` +
    `<div style="flex:1 1 44%;display:flex;flex-direction:column;gap:${W * 0.014}px;">` +
    `<div style="display:inline-block;align-self:flex-start;padding:${W * 0.006}px ${W * 0.014}px;` +
    `background:${FT.ink};color:#fff;font-weight:800;font-size:${W * 0.018}px;letter-spacing:0.16em;">` +
    `${escapeHtml(manufacturer)}</div>` +
    `<div style="font-weight:800;font-size:${W * 0.046}px;line-height:1.05;text-transform:uppercase;color:${FT.ink};">` +
    `${escapeHtml(name.toUpperCase())}</div>` +
    `<div style="display:flex;align-items:baseline;gap:${W * 0.012}px;margin-top:${W * 0.01}px;">` +
    `<span style="font-size:${W * 0.022}px;color:rgba(15,17,21,0.5);` +
    `text-decoration:line-through;text-decoration-color:${FT.red};text-decoration-thickness:2px;">` +
    `${escapeHtml(formatNOK(priceBefore))}</span></div>` +
    `<div style="font-weight:800;font-size:${W * 0.078}px;line-height:1;color:${FT.red};letter-spacing:-0.02em;">` +
    `${escapeHtml(formatNOK(priceNow))}</div>` +
    `<div style="font-size:${W * 0.014}px;color:rgba(15,17,21,0.55);">Eks. mva · Lager i Brekstad</div>` +
    `</div></div></div>` +
    `<div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1;">` +
    `<div style="font-weight:800;font-size:${W * 0.022}px;color:${FT.ink};letter-spacing:0.04em;">${escapeHtml(url)}</div>` +
    (wmInk ? `<img src="${wmInk}" alt="Fosen Tools" style="width:${W * 0.16}px;"/>` : "") +
    `</div>`;
  return frame({ W, H, bg: "creamWarm", decor: "corners", children });
}

function produktSingleBLI(W: number, H: number, data: ProduktSingleData): string {
  const {
    manufacturer = "FACOM",
    name = "Verktøyvogn JET+",
    priceBefore = 28990,
    priceNow = 16990,
    discount = "-41%",
    url = "fosen-tools.no",
    photo: photoSrc = null,
  } = data;
  const s = S(H);
  const children =
    `<div style="position:absolute;top:0;left:0;right:0;height:${H * 0.16}px;background:${FT.red};` +
    `display:flex;align-items:center;justify-content:space-between;padding:0 ${s.pad}px;color:#fff;">` +
    `<div style="font-weight:800;letter-spacing:0.2em;font-size:${s.bodyXs}px;text-transform:uppercase;">UKENS TILBUD</div>` +
    `<div style="font-weight:800;font-size:${s.h4}px;">SPAR ${escapeHtml(formatNOK(priceBefore - priceNow).replace(",-", ""))}</div>` +
    `</div>` +
    `<div style="margin-top:${H * 0.12}px;flex:1;display:grid;grid-template-columns:1fr 1.1fr;gap:${s.gap}px;` +
    `align-items:center;position:relative;z-index:1;">` +
    `<div style="position:relative;aspect-ratio:1.1/1;height:100%;max-height:${H * 0.65}px;">` +
    photo({ W: H * 1.5, src: photoSrc, tag: "Produktbilde", dark: false, radius: s.radius * 0.6 }) +
    `<div style="position:absolute;top:${-s.gapXs}px;right:${-s.gapXs * 2}px;transform:rotate(8deg);">` +
    `<div style="background:${FT.ink};color:${FT.burstYellow};padding:${s.gapXs}px ${s.gapXs * 2}px;` +
    `font-weight:800;font-size:${s.h3}px;border-radius:4px;box-shadow:0 6px 18px rgba(0,0,0,0.2);">` +
    `${escapeHtml(discount)}</div></div></div>` +
    `<div style="display:flex;flex-direction:column;gap:${s.gapXs}px;">` +
    `<div style="align-self:flex-start;padding:${s.gapXs * 0.5}px ${s.gapXs * 1.2}px;` +
    `background:${FT.ink};color:#fff;font-weight:800;font-size:${s.bodyXs}px;letter-spacing:0.14em;">` +
    `${escapeHtml(manufacturer)}</div>` +
    `<div style="font-weight:800;font-size:${s.h2}px;line-height:1.04;text-transform:uppercase;color:${FT.ink};">` +
    `${escapeHtml(name.toUpperCase())}</div>` +
    `<div style="display:flex;align-items:baseline;gap:${s.gapXs}px;margin-top:${s.gapXs * 0.5}px;">` +
    `<span style="font-size:${s.bodySm}px;color:rgba(15,17,21,0.5);` +
    `text-decoration:line-through;text-decoration-color:${FT.red};text-decoration-thickness:2px;">` +
    `${escapeHtml(formatNOK(priceBefore))}</span>` +
    `<span style="font-weight:800;font-size:${s.h1}px;color:${FT.red};line-height:1;letter-spacing:-0.02em;">` +
    `${escapeHtml(formatNOK(priceNow))}</span></div>` +
    `<div style="font-size:${s.bodyXs}px;color:rgba(15,17,21,0.55);">Eks. mva · Lager i Brekstad</div>` +
    `</div></div>` +
    footerRow(W, H, url, { ink: true });
  return frame({ W, H, bg: "creamWarm", decor: "corners", pad: s.pad, children });
}

// ─── 1C · Pris-stempel poster ─────────────────────────────────────────────

export function produktSingleC(W: number, H: number, data: ProduktSingleData): string {
  if (aspectOf(W, H) === "li") return produktSingleCLI(W, H, data);
  const {
    manufacturer = "FACOM",
    name = "Verktøyvogn JET+",
    priceBefore = 28990,
    priceNow = 16990,
    discount = "-41%",
    url = "fosen-tools.no",
    sku = "FT-FCM-J5",
    photo: photoSrc = null,
  } = data;
  const wmWhite = wordmarkDataUrl("white");
  const children =
    `<div style="display:flex;justify-content:space-between;font-family:${MONO};font-size:${W * 0.014}px;` +
    `letter-spacing:0.16em;color:rgba(255,255,255,0.55);position:relative;z-index:1;text-transform:uppercase;">` +
    `<span>SKU · ${escapeHtml(sku)}</span><span>UKE 21/2026</span></div>` +
    `<div style="flex:1;margin-top:${W * 0.024}px;position:relative;z-index:1;">` +
    photo({ W, src: photoSrc, tag: "Produktbilde", radius: W * 0.014 }) +
    `<div style="position:absolute;bottom:${W * 0.018}px;left:${W * 0.018}px;right:${W * 0.018}px;` +
    `background:${FT.red};color:#fff;padding:${W * 0.022}px ${W * 0.028}px;` +
    `display:flex;align-items:flex-end;justify-content:space-between;gap:${W * 0.018}px;` +
    `box-shadow:0 12px 32px rgba(237,28,36,0.4);">` +
    `<div style="flex:1;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.014}px;letter-spacing:0.2em;` +
    `text-transform:uppercase;opacity:0.85;">${escapeHtml(manufacturer)} · ${escapeHtml(discount)}</div>` +
    `<div style="font-weight:800;font-size:${W * 0.044}px;text-transform:uppercase;line-height:1.02;` +
    `letter-spacing:-0.01em;margin-top:${W * 0.006}px;">${escapeHtml(name.toUpperCase())}</div></div>` +
    `<div style="text-align:right;flex-shrink:0;">` +
    `<div style="font-size:${W * 0.014}px;opacity:0.7;text-decoration:line-through;` +
    `text-decoration-color:rgba(255,255,255,0.8);text-decoration-thickness:1.5px;">` +
    `${escapeHtml(formatNOK(priceBefore))}</div>` +
    `<div style="font-weight:800;font-size:${W * 0.064}px;line-height:1;letter-spacing:-0.02em;">` +
    `${escapeHtml(formatNOK(priceNow))}</div></div></div></div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;justify-content:space-between;align-items:center;` +
    `position:relative;z-index:1;border-top:1px solid rgba(255,255,255,0.18);padding-top:${W * 0.014}px;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.02}px;letter-spacing:0.06em;">${escapeHtml(url)}</div>` +
    (wmWhite ? `<img src="${wmWhite}" alt="Fosen Tools" style="width:${W * 0.13}px;"/>` : "") +
    `</div>`;
  return frame({ W, H, bg: "inkDeep", decor: "grid", pad: W * 0.05, children });
}

function produktSingleCLI(W: number, H: number, data: ProduktSingleData): string {
  const {
    manufacturer = "FACOM",
    name = "Verktøyvogn JET+",
    priceBefore = 28990,
    priceNow = 16990,
    discount = "-41%",
    sku = "FT-FCM-J5",
    photo: photoSrc = null,
  } = data;
  const wmWhite = wordmarkDataUrl("white");
  const children =
    `<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:${H * 0.05}px;flex:1;` +
    `position:relative;z-index:1;align-items:stretch;">` +
    `<div style="position:relative;">` +
    photo({ W: W * 0.45, src: photoSrc, tag: "Produktbilde", radius: H * 0.02 }) +
    `<div style="position:absolute;bottom:${H * 0.02}px;left:${H * 0.02}px;background:${FT.burstYellow};color:${FT.ink};` +
    `padding:${H * 0.012}px ${H * 0.024}px;font-weight:800;font-size:${H * 0.04}px;letter-spacing:-0.01em;">` +
    `${escapeHtml(discount)}</div></div>` +
    `<div style="display:flex;flex-direction:column;justify-content:space-between;">` +
    `<div>` +
    `<div style="font-family:${MONO};font-size:${H * 0.022}px;letter-spacing:0.16em;` +
    `color:rgba(255,255,255,0.55);text-transform:uppercase;">SKU · ${escapeHtml(sku)}</div>` +
    `<div style="display:inline-block;padding:${H * 0.006}px ${H * 0.016}px;background:${FT.red};color:#fff;` +
    `font-weight:800;font-size:${H * 0.022}px;letter-spacing:0.16em;margin-top:${H * 0.014}px;">` +
    `${escapeHtml(manufacturer)}</div>` +
    `<div style="font-weight:800;font-size:${H * 0.07}px;text-transform:uppercase;line-height:1.05;` +
    `margin-top:${H * 0.018}px;letter-spacing:-0.015em;">${escapeHtml(name.toUpperCase())}</div></div>` +
    `<div>` +
    `<div style="font-size:${H * 0.026}px;color:rgba(255,255,255,0.55);text-decoration:line-through;` +
    `text-decoration-color:${FT.red};text-decoration-thickness:2px;">${escapeHtml(formatNOK(priceBefore))}</div>` +
    `<div style="font-weight:800;font-size:${H * 0.13}px;color:${FT.red};line-height:1;letter-spacing:-0.025em;">` +
    `${escapeHtml(formatNOK(priceNow))}</div></div></div></div>` +
    `<div style="margin-top:${H * 0.022}px;display:flex;justify-content:space-between;align-items:center;` +
    `position:relative;z-index:1;border-top:1px solid rgba(255,255,255,0.18);padding-top:${H * 0.018}px;">` +
    `<div style="font-family:${MONO};font-size:${H * 0.024}px;letter-spacing:0.06em;font-weight:700;">fosen-tools.no</div>` +
    (wmWhite ? `<img src="${wmWhite}" alt="Fosen Tools" style="height:${H * 0.05}px;"/>` : "") +
    `</div>`;
  return frame({ W, H, bg: "inkDeep", decor: "grid", pad: H * 0.06, children });
}

// =============================================================================
// 2. PRODUKT-GRID
// =============================================================================

const GRID_DEFAULT_ITEMS: ProduktItem[] = [
  { name: "Facom Verktøyvogn JET+", priceBefore: 28990, priceNow: 16990, discount: "-41%" },
  { name: "Knipex Avbitertang 250 mm", priceBefore: 990, priceNow: 690, discount: "-30%" },
  { name: "Wera Kraftform Skrutrekkersett", priceBefore: 1790, priceNow: 1290, discount: "-28%" },
  { name: "Milwaukee M18 Slagtrekker", priceBefore: 4490, priceNow: 3490, discount: "-22%" },
];

// ─── 2A · Mørk 2×2 med bursts ─────────────────────────────────────────────

export function produktGridA(W: number, H: number, data: ProduktGridData): string {
  if (aspectOf(W, H) === "li") return produktGridALI(W, H, data);
  const items = data.items || GRID_DEFAULT_ITEMS;
  const cards = items
    .slice(0, 4)
    .map(
      (it, i) =>
        `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);` +
        `border-radius:${W * 0.016}px;padding:${W * 0.022}px;display:flex;flex-direction:column;` +
        `gap:${W * 0.012}px;position:relative;">` +
        `<div style="flex:1;position:relative;min-height:${W * 0.22}px;">` +
        photo({ W, src: it.photo ?? null, tag: "Produktbilde", radius: W * 0.012 }) +
        `<div style="position:absolute;top:${-W * 0.018}px;right:${-W * 0.014}px;">` +
        burst(it.discount, W * 0.09, { rotation: i % 2 === 0 ? -6 : 6 }) +
        `</div></div>` +
        `<div style="font-weight:800;font-size:${W * 0.02}px;text-transform:uppercase;letter-spacing:0.01em;line-height:1.15;">` +
        `${escapeHtml(it.name)}</div>` +
        `<div style="display:flex;align-items:baseline;gap:${W * 0.012}px;">` +
        `<span style="font-size:${W * 0.014}px;color:${mutedFor("ink")};` +
        `text-decoration:line-through;text-decoration-color:${FT.red};text-decoration-thickness:1.5px;">` +
        `${escapeHtml(formatNOK(it.priceBefore ?? 0))}</span>` +
        `<span style="font-weight:800;font-size:${W * 0.028}px;letter-spacing:-0.01em;">` +
        `${escapeHtml(formatNOK(it.priceNow))}</span></div></div>`
    )
    .join("");
  const children =
    eyebrow("UKENS TILBUD", { style: "position:relative;z-index:1;" }) +
    `<div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;` +
    `gap:${W * 0.022}px;margin-top:${W * 0.022}px;flex:1;position:relative;z-index:1;">${cards}</div>` +
    `<div style="margin-top:${W * 0.022}px;position:relative;z-index:1;display:flex;flex-direction:column;gap:${W * 0.012}px;">` +
    `<div style="display:flex;justify-content:center;">` +
    `<div style="padding:${W * 0.012}px ${W * 0.034}px;border:1.5px solid rgba(255,255,255,0.5);border-radius:999px;` +
    `font-weight:700;font-size:${W * 0.02}px;">fosen-tools.no</div></div>` +
    wordmark("ink", W) +
    `</div>`;
  return frame({ W, H, bg: "ink", decor: "full", children });
}

function produktGridALI(W: number, H: number, data: ProduktGridData): string {
  const items = data.items || GRID_DEFAULT_ITEMS;
  const s = S(H);
  const wmWhite = wordmarkDataUrl("white");
  const cards = items
    .slice(0, 4)
    .map(
      (it, i) =>
        `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);` +
        `border-radius:${s.radius * 0.5}px;padding:${s.gapXs * 1.2}px;display:flex;flex-direction:column;` +
        `gap:${s.gapXs * 0.8}px;position:relative;">` +
        `<div style="flex:1;position:relative;min-height:${H * 0.2}px;">` +
        photo({ W: W * 0.25, src: it.photo ?? null, tag: "Foto", radius: s.radius * 0.3 }) +
        `<div style="position:absolute;top:${-s.gapXs}px;right:${-s.gapXs}px;">` +
        burst(it.discount, H * 0.12, { rotation: i % 2 === 0 ? -6 : 6 }) +
        `</div></div>` +
        `<div style="font-weight:800;font-size:${s.bodyXs}px;text-transform:uppercase;line-height:1.15;">` +
        `${escapeHtml(it.name)}</div>` +
        `<div style="display:flex;align-items:baseline;gap:${s.gapXs * 0.5}px;">` +
        `<span style="font-size:${s.bodyXs * 0.7}px;color:${mutedFor("ink")};` +
        `text-decoration:line-through;text-decoration-color:${FT.red};">` +
        `${escapeHtml(formatNOK(it.priceBefore ?? 0))}</span>` +
        `<span style="font-weight:800;font-size:${s.bodySm}px;letter-spacing:-0.01em;">` +
        `${escapeHtml(formatNOK(it.priceNow))}</span></div></div>`
    )
    .join("");
  const children =
    `<div style="display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1;">` +
    eyebrow("UKENS TILBUD", { fontSize: s.eyebrow }) +
    `<div style="font-weight:800;font-size:${s.bodySm}px;letter-spacing:0.04em;">fosen-tools.no</div></div>` +
    `<div style="flex:1;margin-top:${s.gapSm}px;display:grid;grid-template-columns:repeat(4, 1fr);` +
    `gap:${s.gapSm}px;position:relative;z-index:1;">${cards}</div>` +
    `<div style="margin-top:${s.gapXs}px;display:flex;justify-content:center;position:relative;z-index:1;">` +
    (wmWhite ? `<img src="${wmWhite}" alt="Fosen Tools" style="height:${H * 0.05}px;"/>` : "") +
    `</div>`;
  return frame({ W, H, bg: "ink", decor: "full", pad: s.pad, children });
}

// ─── 2B · Editorial 3+1 hero ──────────────────────────────────────────────

export function produktGridB(W: number, H: number, data: ProduktGridData): string {
  if (aspectOf(W, H) === "li") return produktGridBLI(W, H, data);
  const items = data.items || [
    { name: "Facom Verktøyvogn JET+", priceBefore: 28990, priceNow: 16990, discount: "-41%", hero: true },
    { name: "Knipex Avbitertang 250 mm", priceBefore: 990, priceNow: 690, discount: "-30%" },
    { name: "Wera Kraftform Skrutrekkersett", priceBefore: 1790, priceNow: 1290, discount: "-28%" },
    { name: "Milwaukee M18 Slagtrekker", priceBefore: 4490, priceNow: 3490, discount: "-22%" },
  ];
  const [hero, ...rest] = items;
  const wmWhite = wordmarkDataUrl("white");
  const miniCards = rest
    .slice(0, 2)
    .map(
      (it, i) =>
        `<div style="display:grid;grid-template-columns:1fr 1.2fr;gap:${W * 0.014}px;` +
        `background:rgba(255,255,255,0.04);padding:${W * 0.014}px;border-radius:${W * 0.01}px;` +
        `border:1px solid rgba(255,255,255,0.06);grid-row:${i + 1};grid-column:2;">` +
        `<div style="position:relative;">` +
        photo({ W, src: it.photo ?? null, tag: "Foto", radius: W * 0.008 }) +
        `<div style="position:absolute;top:${-W * 0.008}px;right:${-W * 0.008}px;` +
        `background:${FT.burstYellow};color:${FT.ink};font-weight:800;font-size:${W * 0.013}px;` +
        `padding:${W * 0.004}px ${W * 0.008}px;border-radius:2px;">${escapeHtml(it.discount)}</div></div>` +
        `<div style="display:flex;flex-direction:column;justify-content:space-between;">` +
        `<div style="font-weight:700;font-size:${W * 0.016}px;text-transform:uppercase;line-height:1.15;">` +
        `${escapeHtml(it.name)}</div>` +
        `<div>` +
        `<div style="font-size:${W * 0.011}px;color:${mutedFor("ink")};text-decoration:line-through;">` +
        `${escapeHtml(formatNOK(it.priceBefore ?? 0))}</div>` +
        `<div style="font-weight:800;font-size:${W * 0.022}px;letter-spacing:-0.01em;">` +
        `${escapeHtml(formatNOK(it.priceNow))}</div></div></div></div>`
    )
    .join("");
  const children =
    `<div style="display:flex;align-items:baseline;justify-content:space-between;position:relative;z-index:1;">` +
    `<div style="display:flex;flex-direction:column;">` +
    eyebrow("Ukens utvalg") +
    `<div style="font-weight:800;font-size:${W * 0.052}px;text-transform:uppercase;letter-spacing:-0.01em;` +
    `line-height:1;margin-top:${W * 0.006}px;"><span style="color:${FT.red}">4</span> SKARPE</div></div>` +
    `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:${mutedFor("ink")};letter-spacing:0.16em;">UKE 21 / 2026</div>` +
    `</div>` +
    `<div style="display:grid;grid-template-columns:1.6fr 1fr;grid-template-rows:1fr 1fr;` +
    `gap:${W * 0.02}px;margin-top:${W * 0.028}px;flex:1;position:relative;z-index:1;">` +
    `<div style="grid-row:1 / span 2;display:flex;flex-direction:column;gap:${W * 0.016}px;position:relative;">` +
    `<div style="flex:1;position:relative;">` +
    photo({ W, src: hero.photo ?? null, tag: "Hero produkt", radius: W * 0.014 }) +
    `<div style="position:absolute;bottom:${W * 0.014}px;left:${W * 0.014}px;background:${FT.red};color:#fff;` +
    `padding:${W * 0.01}px ${W * 0.02}px;font-weight:800;font-size:${W * 0.026}px;letter-spacing:-0.01em;">SPAR 12 000</div></div>` +
    `<div>` +
    `<div style="font-weight:800;font-size:${W * 0.024}px;text-transform:uppercase;line-height:1.1;">${escapeHtml(hero.name)}</div>` +
    `<div style="display:flex;align-items:baseline;gap:${W * 0.012}px;margin-top:${W * 0.006}px;">` +
    `<span style="font-size:${W * 0.016}px;color:${mutedFor("ink")};text-decoration:line-through;` +
    `text-decoration-color:${FT.red};text-decoration-thickness:1.5px;">${escapeHtml(formatNOK(hero.priceBefore ?? 0))}</span>` +
    `<span style="font-weight:800;font-size:${W * 0.04}px;letter-spacing:-0.01em;">${escapeHtml(formatNOK(hero.priceNow))}</span>` +
    `</div></div></div>` +
    miniCards +
    `</div>` +
    `<div style="margin-top:${W * 0.018}px;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1;">` +
    `<div style="font-weight:800;font-size:${W * 0.018}px;letter-spacing:0.04em;">fosen-tools.no/tilbud</div>` +
    (wmWhite ? `<img src="${wmWhite}" alt="Fosen Tools" style="width:${W * 0.13}px;"/>` : "") +
    `</div>`;
  return frame({ W, H, bg: "inkDeep", decor: "rulers", children });
}

function produktGridBLI(W: number, H: number, data: ProduktGridData): string {
  const items = data.items || [
    { name: "Facom Verktøyvogn JET+", priceBefore: 28990, priceNow: 16990, discount: "-41%" },
    { name: "Knipex Avbitertang 250 mm", priceBefore: 990, priceNow: 690, discount: "-30%" },
    { name: "Wera Kraftform Skrutrekkersett", priceBefore: 1790, priceNow: 1290, discount: "-28%" },
  ];
  const s = S(H);
  const [hero, ...rest] = items;
  const miniCards = rest
    .slice(0, 2)
    .map(
      (it) =>
        `<div style="flex:1;display:grid;grid-template-columns:1fr 1.2fr;gap:${s.gapXs}px;` +
        `background:rgba(255,255,255,0.04);padding:${s.gapXs}px;border-radius:${s.radius * 0.3}px;` +
        `border:1px solid rgba(255,255,255,0.06);">` +
        `<div style="position:relative;">` +
        photo({ W: W * 0.15, src: it.photo ?? null, tag: "Foto", radius: s.radius * 0.2 }) +
        `<div style="position:absolute;top:${-s.gapXs * 0.4}px;right:${-s.gapXs * 0.4}px;` +
        `background:${FT.burstYellow};color:${FT.ink};font-weight:800;font-size:${s.bodyXs * 0.6}px;` +
        `padding:2px 6px;border-radius:2px;">${escapeHtml(it.discount)}</div></div>` +
        `<div style="display:flex;flex-direction:column;justify-content:space-between;">` +
        `<div style="font-weight:700;font-size:${s.bodyXs * 0.9}px;text-transform:uppercase;line-height:1.1;">` +
        `${escapeHtml(it.name)}</div>` +
        `<div>` +
        `<div style="font-size:${s.bodyXs * 0.65}px;color:${mutedFor("ink")};text-decoration:line-through;">` +
        `${escapeHtml(formatNOK(it.priceBefore ?? 0))}</div>` +
        `<div style="font-weight:800;font-size:${s.bodySm}px;letter-spacing:-0.01em;">` +
        `${escapeHtml(formatNOK(it.priceNow))}</div></div></div></div>`
    )
    .join("");
  const children =
    `<div style="display:flex;align-items:baseline;justify-content:space-between;position:relative;z-index:1;">` +
    `<div style="display:flex;align-items:baseline;gap:${s.gapXs * 2}px;">` +
    eyebrow("Ukens utvalg", { fontSize: s.bodyXs }) +
    `<div style="font-weight:800;font-size:${s.h3}px;line-height:1;text-transform:uppercase;letter-spacing:-0.01em;">` +
    `<span style="color:${FT.red}">4</span> SKARPE</div></div>` +
    `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.8}px;color:${mutedFor("ink")};letter-spacing:0.16em;">UKE 21 / 2026</div>` +
    `</div>` +
    `<div style="flex:1;margin-top:${s.gapSm}px;display:grid;grid-template-columns:1.6fr 1fr;gap:${s.gapSm}px;` +
    `position:relative;z-index:1;">` +
    `<div style="display:flex;flex-direction:column;gap:${s.gapXs}px;">` +
    `<div style="flex:1;position:relative;">` +
    photo({ W: W * 0.5, src: hero.photo ?? null, tag: "Hero produkt", radius: s.radius * 0.5 }) +
    `<div style="position:absolute;bottom:${s.gapXs}px;left:${s.gapXs}px;background:${FT.red};color:#fff;` +
    `padding:${s.gapXs * 0.6}px ${s.gapXs * 1.2}px;font-weight:800;font-size:${s.bodySm}px;">SPAR 12 000</div></div>` +
    `<div style="display:flex;align-items:center;gap:${s.gapXs * 2}px;justify-content:space-between;">` +
    `<div style="font-weight:800;font-size:${s.bodySm}px;text-transform:uppercase;line-height:1.1;">${escapeHtml(hero.name)}</div>` +
    `<div style="display:flex;align-items:baseline;gap:${s.gapXs * 0.5}px;">` +
    `<span style="font-size:${s.bodyXs * 0.7}px;color:${mutedFor("ink")};text-decoration:line-through;">` +
    `${escapeHtml(formatNOK(hero.priceBefore ?? 0))}</span>` +
    `<span style="font-weight:800;font-size:${s.h4}px;letter-spacing:-0.01em;">${escapeHtml(formatNOK(hero.priceNow))}</span>` +
    `</div></div></div>` +
    `<div style="display:flex;flex-direction:column;gap:${s.gapXs}px;">${miniCards}</div>` +
    `</div>` +
    footerRow(W, H, "fosen-tools.no/tilbud", { dark: true });
  return frame({ W, H, bg: "inkDeep", decor: "rulers", pad: s.pad, children });
}

// ─── 2C · Mosaic asymmetrisk ──────────────────────────────────────────────

export function produktGridC(W: number, H: number, data: ProduktGridData): string {
  if (aspectOf(W, H) === "li") return produktGridCLI(W, H, data);
  const items = data.items || [
    { name: "Facom Verktøyvogn JET+", priceNow: 16990, discount: "-41%", size: "big" },
    { name: "Knipex Avbitertang 250 mm", priceNow: 690, discount: "-30%" },
    { name: "Wera Kraftform Skrutrekkersett", priceNow: 1290, discount: "-28%" },
    { name: "Milwaukee M18 Slagtrekker", priceNow: 3490, discount: "-22%" },
  ];
  const wmWhite = wordmarkDataUrl("white");
  const miniCards = items
    .slice(1, 4)
    .map(
      (it, i) =>
        `<div style="position:relative;overflow:hidden;border-radius:${W * 0.01}px;` +
        `background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);` +
        `display:flex;flex-direction:column;padding:${W * 0.014}px;` +
        `grid-column:2;grid-row:${i === 2 ? "2 / span 1" : (i + 1).toString()};">` +
        `<div style="flex:1;position:relative;min-height:0;">` +
        photo({ W: W * 0.3, src: it.photo ?? null, tag: `Foto ${i + 2}`, radius: W * 0.006 }) +
        `<div style="position:absolute;top:0;right:0;background:${FT.burstYellow};color:${FT.ink};font-weight:800;` +
        `font-size:${W * 0.012}px;padding:4px 8px;">${escapeHtml(it.discount)}</div></div>` +
        `<div style="font-weight:800;font-size:${W * 0.014}px;text-transform:uppercase;line-height:1.1;margin-top:${W * 0.008}px;">` +
        `${escapeHtml(it.name)}</div>` +
        `<div style="font-weight:800;font-size:${W * 0.022}px;margin-top:${W * 0.004}px;letter-spacing:-0.01em;">` +
        `${escapeHtml(formatNOK(it.priceNow))}</div></div>`
    )
    .join("");
  const children =
    `<div style="display:flex;align-items:baseline;gap:${W * 0.018}px;position:relative;z-index:1;">` +
    `<div style="font-weight:800;font-size:${W * 0.06}px;text-transform:uppercase;line-height:1;letter-spacing:-0.015em;">` +
    `UKEN<span style="color:${FT.red}">S</span></div>` +
    `<div style="font-weight:800;font-size:${W * 0.04}px;color:rgba(255,255,255,0.4);line-height:1;">4 SKARPE</div></div>` +
    `<div style="flex:1;margin-top:${W * 0.026}px;display:grid;position:relative;z-index:1;` +
    `grid-template-columns:1.6fr 1fr;grid-template-rows:1.4fr 1fr;gap:${W * 0.018}px;">` +
    `<div style="grid-row:1 / span 2;position:relative;overflow:hidden;border-radius:${W * 0.014}px;` +
    `border:1px solid rgba(255,255,255,0.1);">` +
    photo({ W: W * 0.5, src: items[0].photo ?? null, tag: "Hero", radius: W * 0.014 }) +
    `<div style="position:absolute;top:${W * 0.014}px;left:${W * 0.014}px;background:${FT.red};color:#fff;` +
    `padding:${W * 0.008}px ${W * 0.018}px;font-weight:800;font-size:${W * 0.024}px;letter-spacing:-0.005em;">` +
    `${escapeHtml(items[0].discount)}</div>` +
    `<div style="position:absolute;bottom:0;left:0;right:0;` +
    `background:linear-gradient(to top, rgba(15,17,21,0.95) 0%, rgba(15,17,21,0) 100%);` +
    `padding:${W * 0.05}px ${W * 0.022}px ${W * 0.022}px;">` +
    `<div style="font-weight:800;font-size:${W * 0.024}px;text-transform:uppercase;line-height:1.1;">` +
    `${escapeHtml(items[0].name)}</div>` +
    `<div style="font-weight:800;font-size:${W * 0.044}px;margin-top:${W * 0.006}px;letter-spacing:-0.02em;">` +
    `${escapeHtml(formatNOK(items[0].priceNow))}</div></div></div>` +
    miniCards +
    `</div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1;">` +
    `<div style="font-family:${MONO};font-size:${W * 0.016}px;letter-spacing:0.16em;` +
    `color:rgba(255,255,255,0.55);text-transform:uppercase;">fosen-tools.no/tilbud</div>` +
    (wmWhite ? `<img src="${wmWhite}" alt="Fosen Tools" style="width:${W * 0.13}px;"/>` : "") +
    `</div>`;
  return frame({ W, H, bg: "ink", decor: "corners", pad: W * 0.05, children });
}

function produktGridCLI(W: number, H: number, data: ProduktGridData): string {
  const items = data.items || [
    { name: "Verktøyvogn JET+", priceNow: 16990, discount: "-41%" },
    { name: "Knipex Avbitertang", priceNow: 690, discount: "-30%" },
    { name: "Wera Kraftform", priceNow: 1290, discount: "-28%" },
    { name: "Milwaukee M18", priceNow: 3490, discount: "-22%" },
  ];
  const cards = items
    .map(
      (it) =>
        `<div style="display:flex;flex-direction:column;gap:${H * 0.012}px;position:relative;overflow:hidden;` +
        `background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:${H * 0.014}px;padding:${H * 0.016}px;">` +
        `<div style="flex:1;position:relative;min-height:${H * 0.3}px;">` +
        photo({ W: W * 0.2, src: it.photo ?? null, tag: "Foto", radius: H * 0.008 }) +
        `<div style="position:absolute;top:0;right:0;background:${FT.red};color:#fff;font-weight:800;` +
        `font-size:${H * 0.022}px;padding:${H * 0.006}px ${H * 0.012}px;">${escapeHtml(it.discount)}</div></div>` +
        `<div style="font-weight:800;font-size:${H * 0.026}px;text-transform:uppercase;line-height:1.1;">` +
        `${escapeHtml(it.name)}</div>` +
        `<div style="font-weight:800;font-size:${H * 0.038}px;letter-spacing:-0.01em;">${escapeHtml(formatNOK(it.priceNow))}</div></div>`
    )
    .join("");
  const children =
    `<div style="display:flex;align-items:baseline;justify-content:space-between;position:relative;z-index:1;">` +
    `<div style="font-weight:800;font-size:${H * 0.075}px;text-transform:uppercase;line-height:1;letter-spacing:-0.015em;">` +
    `UKEN<span style="color:${FT.red}">S</span> 4 SKARPE</div>` +
    `<div style="font-family:${MONO};font-size:${H * 0.022}px;letter-spacing:0.16em;color:rgba(255,255,255,0.55);">UKE 21/26</div>` +
    `</div>` +
    `<div style="flex:1;margin-top:${H * 0.04}px;display:grid;grid-template-columns:repeat(4,1fr);` +
    `gap:${H * 0.03}px;position:relative;z-index:1;">${cards}</div>` +
    footerRow(W, H, "fosen-tools.no/tilbud", { dark: true, monoLabel: "" });
  return frame({ W, H, bg: "ink", decor: "corners", pad: H * 0.06, children });
}

// =============================================================================
// 3. PRODUKT-MANUFACTURER
// =============================================================================

// ─── 3A · Merke-fokus mørk ────────────────────────────────────────────────

export function produktMfrA(W: number, H: number, data: ProduktMfrData): string {
  if (aspectOf(W, H) === "li") return produktMfrALI(W, H, data);
  const {
    manufacturer = "FACOM",
    tagline = "Mest kjøpt fra Facom",
    items = [
      { name: "Facom Verktøyvogn JET+", priceBefore: 28990, priceNow: 16990, discount: "-41%" },
      { name: "Knipex Avbitertang 250 mm", priceBefore: 990, priceNow: 690, discount: "-30%" },
      { name: "Wera Kraftform Skrutrekkersett", priceBefore: 1790, priceNow: 1290, discount: "-28%" },
      { name: "Milwaukee M18 Slagtrekker", priceBefore: 4490, priceNow: 3490, discount: "-22%" },
    ],
  } = data;
  const cards = items
    .slice(0, 4)
    .map(
      (it) =>
        `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);` +
        `border-radius:${W * 0.012}px;padding:${W * 0.018}px;display:flex;flex-direction:column;` +
        `gap:${W * 0.01}px;position:relative;">` +
        `<div style="flex:1;position:relative;min-height:${W * 0.16}px;">` +
        photo({ W, src: it.photo ?? null, tag: "Produktbilde", radius: W * 0.008 }) +
        `<div style="position:absolute;top:${-W * 0.014}px;right:${-W * 0.012}px;">` +
        burst(it.discount, W * 0.075, { rotation: -6 }) +
        `</div></div>` +
        `<div style="font-weight:800;font-size:${W * 0.018}px;text-transform:uppercase;line-height:1.15;">` +
        `${escapeHtml(it.name)}</div>` +
        `<div style="display:flex;align-items:baseline;gap:${W * 0.01}px;">` +
        `<span style="font-size:${W * 0.012}px;color:${mutedFor("ink")};` +
        `text-decoration:line-through;text-decoration-color:${FT.red};text-decoration-thickness:1.5px;">` +
        `${escapeHtml(formatNOK(it.priceBefore ?? 0))}</span>` +
        `<span style="font-weight:800;font-size:${W * 0.024}px;letter-spacing:-0.01em;">` +
        `${escapeHtml(formatNOK(it.priceNow))}</span></div></div>`
    )
    .join("");
  const children =
    `<div style="position:relative;z-index:1;text-align:center;">` +
    `<div style="font-weight:800;font-size:${W * 0.07}px;text-transform:uppercase;letter-spacing:-0.005em;">` +
    `${escapeHtml(manufacturer)}</div>` +
    `<div style="font-weight:500;font-size:${W * 0.022}px;color:${mutedFor("ink")};letter-spacing:0.16em;` +
    `text-transform:uppercase;margin-top:${W * 0.006}px;">${escapeHtml(tagline)}</div>` +
    `<div style="display:flex;justify-content:center;margin-top:${W * 0.014}px;">` +
    rule({ color: FT.red, width: W * 0.08, height: 3 }) +
    `</div></div>` +
    `<div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;` +
    `gap:${W * 0.022}px;margin-top:${W * 0.03}px;flex:1;position:relative;z-index:1;">${cards}</div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;flex-direction:column;gap:${W * 0.01}px;position:relative;z-index:1;">` +
    `<div style="display:flex;justify-content:center;">` +
    `<div style="padding:${W * 0.012}px ${W * 0.032}px;border:1.5px solid rgba(255,255,255,0.5);border-radius:999px;` +
    `font-weight:700;font-size:${W * 0.02}px;">fosen-tools.no/${escapeHtml(manufacturer.toLowerCase())}</div></div>` +
    wordmark("ink", W) +
    `</div>`;
  return frame({ W, H, bg: "ink", decor: "full", children });
}

function produktMfrALI(W: number, H: number, data: ProduktMfrData): string {
  const {
    manufacturer = "FACOM",
    tagline = "Mest kjøpt fra Facom",
    items = [
      { name: "Verktøyvogn JET+", priceBefore: 28990, priceNow: 16990, discount: "-41%" },
      { name: "Knipex Avbitertang", priceBefore: 990, priceNow: 690, discount: "-30%" },
      { name: "Wera Kraftform", priceBefore: 1790, priceNow: 1290, discount: "-28%" },
    ],
  } = data;
  const s = S(H);
  const cards = items
    .slice(0, 3)
    .map(
      (it) =>
        `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);` +
        `border-radius:${s.radius * 0.4}px;padding:${s.gapXs * 1.4}px;display:flex;flex-direction:column;` +
        `gap:${s.gapXs * 0.8}px;position:relative;">` +
        `<div style="flex:1;position:relative;min-height:${H * 0.22}px;">` +
        photo({ W: W * 0.3, src: it.photo ?? null, tag: "Foto", radius: s.radius * 0.25 }) +
        `<div style="position:absolute;top:${-s.gapXs}px;right:${-s.gapXs}px;">` +
        burst(it.discount, H * 0.13, { rotation: -6 }) +
        `</div></div>` +
        `<div style="font-weight:800;font-size:${s.bodySm}px;text-transform:uppercase;line-height:1.1;">` +
        `${escapeHtml(it.name)}</div>` +
        `<div style="display:flex;align-items:baseline;gap:${s.gapXs * 0.5}px;">` +
        `<span style="font-size:${s.bodyXs * 0.75}px;color:${mutedFor("ink")};` +
        `text-decoration:line-through;text-decoration-color:${FT.red};">` +
        `${escapeHtml(formatNOK(it.priceBefore ?? 0))}</span>` +
        `<span style="font-weight:800;font-size:${s.h4}px;letter-spacing:-0.01em;">` +
        `${escapeHtml(formatNOK(it.priceNow))}</span></div></div>`
    )
    .join("");
  const children =
    `<div style="position:relative;z-index:1;text-align:center;">` +
    `<div style="font-weight:800;font-size:${s.h2}px;text-transform:uppercase;letter-spacing:-0.005em;">` +
    `${escapeHtml(manufacturer)}</div>` +
    `<div style="font-size:${s.bodyXs}px;color:${mutedFor("ink")};letter-spacing:0.14em;text-transform:uppercase;` +
    `margin-top:${s.gapXs * 0.3}px;">${escapeHtml(tagline)}</div>` +
    `<div style="display:flex;justify-content:center;margin-top:${s.gapXs}px;">` +
    rule({ color: FT.red, width: W * 0.06 }) +
    `</div></div>` +
    `<div style="flex:1;margin-top:${s.gapSm}px;display:grid;grid-template-columns:repeat(3,1fr);` +
    `gap:${s.gapSm}px;position:relative;z-index:1;">${cards}</div>` +
    footerRow(W, H, `fosen-tools.no/${manufacturer.toLowerCase()}`, { dark: true });
  return frame({ W, H, bg: "ink", decor: "full", pad: s.pad, children });
}

// ─── 3B · Rødt hero-band + liste ──────────────────────────────────────────

export function produktMfrB(W: number, H: number, data: ProduktMfrData): string {
  if (aspectOf(W, H) === "li") return produktMfrBLI(W, H, data);
  const manufacturer = data.manufacturer || "WERA";
  const items = data.items || [
    { name: "Kraftform Skrutrekkersett", priceBefore: 1790, priceNow: 1290, discount: "-28%" },
    { name: "Bit-set 47-deler", priceBefore: 1290, priceNow: 890, discount: "-31%" },
    { name: "Joker hylsenøkkelsett", priceBefore: 2490, priceNow: 1890, discount: "-24%" },
  ];
  const wmWhite = wordmarkDataUrl("white");
  const rows = items
    .slice(0, 3)
    .map(
      (it, i) =>
        `<div style="display:grid;grid-template-columns:auto 1fr auto;gap:${W * 0.025}px;align-items:center;` +
        `padding:${W * 0.016}px 0;border-top:${i === 0 ? "none" : "1px solid rgba(255,255,255,0.12)"};">` +
        `<div style="width:${W * 0.13}px;height:${W * 0.13}px;position:relative;">` +
        photo({ W, src: it.photo ?? null, tag: "Foto", radius: W * 0.008 }) +
        `</div>` +
        `<div>` +
        `<div style="font-weight:800;font-size:${W * 0.026}px;text-transform:uppercase;line-height:1.1;">` +
        `${escapeHtml(it.name)}</div>` +
        `<div style="display:flex;align-items:baseline;gap:${W * 0.014}px;margin-top:${W * 0.006}px;">` +
        `<span style="font-size:${W * 0.016}px;color:${mutedFor("ink")};` +
        `text-decoration:line-through;text-decoration-color:${FT.red};text-decoration-thickness:1.5px;">` +
        `${escapeHtml(formatNOK(it.priceBefore ?? 0))}</span>` +
        `<span style="font-weight:800;font-size:${W * 0.034}px;letter-spacing:-0.01em;">` +
        `${escapeHtml(formatNOK(it.priceNow))}</span></div></div>` +
        `<div style="background:${FT.burstYellow};color:${FT.ink};font-weight:800;font-size:${W * 0.022}px;` +
        `padding:${W * 0.012}px ${W * 0.018}px;border-radius:2px;">${escapeHtml(it.discount)}</div></div>`
    )
    .join("");
  const children =
    `<div style="background:${FT.red};color:#fff;padding:${W * 0.04}px;` +
    `margin-left:${-W * 0.045}px;margin-right:${-W * 0.045}px;margin-top:${-W * 0.045}px;` +
    `display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1;">` +
    `<div>` +
    `<div style="font-weight:600;font-size:${W * 0.018}px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.85;">Spotlight</div>` +
    `<div style="font-weight:800;font-size:${W * 0.078}px;text-transform:uppercase;letter-spacing:-0.02em;line-height:1;">` +
    `${escapeHtml(manufacturer)}</div></div>` +
    `<div style="text-align:right;font-weight:700;font-size:${W * 0.018}px;letter-spacing:0.04em;line-height:1.3;opacity:0.95;">` +
    `PARTNER<br/>SIDEN 2003</div></div>` +
    `<div style="margin-top:${W * 0.04}px;display:flex;flex-direction:column;gap:${W * 0.018}px;flex:1;position:relative;z-index:1;">` +
    rows +
    `</div>` +
    `<div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1;">` +
    `<div style="font-weight:800;font-size:${W * 0.02}px;letter-spacing:0.04em;">fosen-tools.no/${escapeHtml(manufacturer.toLowerCase())}</div>` +
    (wmWhite ? `<img src="${wmWhite}" alt="Fosen Tools" style="width:${W * 0.14}px;"/>` : "") +
    `</div>`;
  return frame({ W, H, bg: "ink", decor: "corners", pad: W * 0.045, children });
}

function produktMfrBLI(W: number, H: number, data: ProduktMfrData): string {
  const manufacturer = data.manufacturer || "WERA";
  const items = data.items || [
    { name: "Kraftform Skrutrekkersett", priceBefore: 1790, priceNow: 1290, discount: "-28%" },
    { name: "Bit-set 47-deler", priceBefore: 1290, priceNow: 890, discount: "-31%" },
  ];
  const s = S(H);
  const rows = items
    .slice(0, 2)
    .map(
      (it, i) =>
        `<div style="display:grid;grid-template-columns:auto 1fr auto;gap:${s.gap}px;align-items:center;flex:1;` +
        `padding:${s.gapXs * 1.2}px 0;border-top:${i === 0 ? "none" : "1px solid rgba(255,255,255,0.12)"};">` +
        `<div style="width:${H * 0.18}px;height:${H * 0.18}px;position:relative;">` +
        photo({ W: H * 0.2, src: it.photo ?? null, tag: "Foto", radius: s.radius * 0.25 }) +
        `</div>` +
        `<div>` +
        `<div style="font-weight:800;font-size:${s.h4}px;text-transform:uppercase;line-height:1.1;">` +
        `${escapeHtml(it.name)}</div>` +
        `<div style="display:flex;align-items:baseline;gap:${s.gapXs}px;margin-top:${s.gapXs * 0.4}px;">` +
        `<span style="font-size:${s.bodyXs}px;color:${mutedFor("ink")};` +
        `text-decoration:line-through;text-decoration-color:${FT.red};">` +
        `${escapeHtml(formatNOK(it.priceBefore ?? 0))}</span>` +
        `<span style="font-weight:800;font-size:${s.h3}px;letter-spacing:-0.01em;">` +
        `${escapeHtml(formatNOK(it.priceNow))}</span></div></div>` +
        `<div style="background:${FT.burstYellow};color:${FT.ink};font-weight:800;font-size:${s.h4}px;` +
        `padding:${s.gapXs}px ${s.gapXs * 1.4}px;border-radius:2px;">${escapeHtml(it.discount)}</div></div>`
    )
    .join("");
  const children =
    `<div style="display:grid;grid-template-columns:1fr 1.5fr;gap:${s.gap}px;flex:1;position:relative;z-index:1;">` +
    `<div style="background:${FT.red};padding:${s.gap}px;color:#fff;border-radius:${s.radius * 0.4}px;` +
    `display:flex;flex-direction:column;justify-content:space-between;">` +
    `<div style="font-weight:600;font-size:${s.bodyXs}px;letter-spacing:0.2em;text-transform:uppercase;opacity:0.85;">Spotlight</div>` +
    `<div>` +
    `<div style="font-weight:800;font-size:${s.h1}px;text-transform:uppercase;letter-spacing:-0.02em;line-height:0.95;">` +
    `${escapeHtml(manufacturer)}</div>` +
    `<div style="font-weight:700;font-size:${s.bodyXs}px;letter-spacing:0.04em;margin-top:${s.gapXs * 0.8}px;opacity:0.95;">` +
    `PARTNER SIDEN 2003</div></div></div>` +
    `<div style="display:flex;flex-direction:column;gap:${s.gapXs}px;">${rows}</div>` +
    `</div>` +
    footerRow(W, H, `fosen-tools.no/${manufacturer.toLowerCase()}`, { dark: true });
  return frame({ W, H, bg: "ink", decor: "corners", pad: s.pad, children });
}

// ─── 3C · Diagonal stencil-bånd ───────────────────────────────────────────

export function produktMfrC(W: number, H: number, data: ProduktMfrData): string {
  if (aspectOf(W, H) === "li") return produktMfrCLI(W, H, data);
  const manufacturer = data.manufacturer || "WERA";
  const items = data.items || [
    { name: "Kraftform Skrutrekkersett", priceNow: 1290, discount: "-28%" },
    { name: "Bit-set 47-deler", priceNow: 890, discount: "-31%" },
    { name: "Joker hylsenøkkelsett", priceNow: 1890, discount: "-24%" },
  ];
  const wmWhite = wordmarkDataUrl("white");
  const rows = items
    .slice(0, 3)
    .map(
      (it, i) =>
        `<div style="display:grid;grid-template-columns:auto 1fr auto auto;gap:${W * 0.02}px;align-items:center;` +
        `padding:${W * 0.014}px ${W * 0.018}px;background:rgba(255,255,255,0.04);` +
        `border:1px solid rgba(255,255,255,0.08);border-radius:${W * 0.008}px;">` +
        `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.018}px;color:${FT.red};letter-spacing:0.1em;">` +
        `0${i + 1}</div>` +
        `<div style="font-weight:800;font-size:${W * 0.024}px;text-transform:uppercase;line-height:1.1;">` +
        `${escapeHtml(it.name)}</div>` +
        `<div style="font-weight:800;font-size:${W * 0.026}px;letter-spacing:-0.01em;">${escapeHtml(formatNOK(it.priceNow))}</div>` +
        `<div style="background:${FT.burstYellow};color:${FT.ink};font-weight:800;font-size:${W * 0.018}px;` +
        `padding:${W * 0.008}px ${W * 0.012}px;">${escapeHtml(it.discount)}</div></div>`
    )
    .join("");
  const children =
    `<div style="position:absolute;top:${W * 0.06}px;left:${-W * 0.08}px;right:${-W * 0.08}px;` +
    `background:${FT.red};padding:${W * 0.024}px 0;transform:rotate(-3deg);text-align:center;` +
    `box-shadow:0 12px 40px rgba(237,28,36,0.3);z-index:1;">` +
    `<div style="font-family:${MONO};font-size:${W * 0.014}px;letter-spacing:0.22em;` +
    `color:rgba(255,255,255,0.85);text-transform:uppercase;">SPOTLIGHT-PARTNER</div>` +
    `<div style="font-weight:800;font-size:${W * 0.13}px;color:#fff;letter-spacing:-0.02em;line-height:0.95;">` +
    `${escapeHtml(manufacturer)}</div></div>` +
    `<div style="flex:1;margin-top:${W * 0.32}px;position:relative;z-index:1;display:flex;flex-direction:column;gap:${W * 0.012}px;">` +
    rows +
    `</div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.018}px;letter-spacing:0.06em;">` +
    `fosen-tools.no/${escapeHtml(manufacturer.toLowerCase())}</div>` +
    (wmWhite ? `<img src="${wmWhite}" alt="Fosen Tools" style="width:${W * 0.13}px;"/>` : "") +
    `</div>`;
  return frame({ W, H, bg: "ink", decor: "grid", pad: W * 0.05, children });
}

function produktMfrCLI(W: number, H: number, data: ProduktMfrData): string {
  const manufacturer = data.manufacturer || "WERA";
  const items = data.items || [
    { name: "Kraftform Skrutrekkersett", priceNow: 1290, discount: "-28%" },
    { name: "Bit-set 47-deler", priceNow: 890, discount: "-31%" },
    { name: "Joker hylsenøkkelsett", priceNow: 1890, discount: "-24%" },
  ];
  const rows = items
    .slice(0, 3)
    .map(
      (it, i) =>
        `<div style="display:grid;grid-template-columns:auto 1fr auto auto;gap:${H * 0.028}px;align-items:center;` +
        `padding:${H * 0.018}px ${H * 0.022}px;background:rgba(255,255,255,0.04);` +
        `border:1px solid rgba(255,255,255,0.08);border-radius:${H * 0.012}px;">` +
        `<div style="font-family:${MONO};font-weight:700;font-size:${H * 0.024}px;color:${FT.red};">0${i + 1}</div>` +
        `<div style="font-weight:800;font-size:${H * 0.032}px;text-transform:uppercase;line-height:1.1;">` +
        `${escapeHtml(it.name)}</div>` +
        `<div style="font-weight:800;font-size:${H * 0.036}px;letter-spacing:-0.01em;">${escapeHtml(formatNOK(it.priceNow))}</div>` +
        `<div style="background:${FT.burstYellow};color:${FT.ink};font-weight:800;font-size:${H * 0.024}px;` +
        `padding:${H * 0.008}px ${H * 0.014}px;">${escapeHtml(it.discount)}</div></div>`
    )
    .join("");
  const children =
    `<div style="display:grid;grid-template-columns:auto 1fr;gap:${H * 0.04}px;flex:1;position:relative;z-index:1;align-items:center;">` +
    `<div style="transform:rotate(-90deg);transform-origin:center;white-space:nowrap;">` +
    `<div style="font-family:${MONO};font-size:${H * 0.024}px;letter-spacing:0.22em;` +
    `color:rgba(255,255,255,0.55);text-transform:uppercase;">SPOTLIGHT-PARTNER</div>` +
    `<div style="font-weight:800;font-size:${H * 0.22}px;color:${FT.red};letter-spacing:-0.03em;` +
    `line-height:0.85;margin-top:${H * 0.014}px;">${escapeHtml(manufacturer)}</div></div>` +
    `<div style="display:flex;flex-direction:column;gap:${H * 0.016}px;">${rows}</div>` +
    `</div>` +
    footerRow(W, H, `fosen-tools.no/${manufacturer.toLowerCase()}`, { dark: true });
  return frame({ W, H, bg: "ink", decor: "grid", pad: H * 0.06, children });
}

// =============================================================================
// 4. PRODUKT-VARIANT (HDFI 6 farger)
// =============================================================================

const VARIANT_DEFAULT_AC: ProduktVariantColor[] = [
  { label: "Rød/Hvit", code: "R-01", top: "#D8121B", bottom: "#FFFFFF" },
  { label: "Svart/Hvit", code: "S-02", top: "#1A1A1A", bottom: "#FFFFFF" },
  { label: "Hvit/Svart", code: "H-03", top: "#FFFFFF", bottom: "#1A1A1A" },
  { label: "Blå/Hvit", code: "B-04", top: "#1F4F8C", bottom: "#FFFFFF" },
  { label: "Gul/Svart", code: "G-05", top: "#F4C20D", bottom: "#1A1A1A" },
  { label: "Lys grå/Svart", code: "L-06", top: "#D8D8D8", bottom: "#1A1A1A" },
];

const VARIANT_DEFAULT_B: ProduktVariantColor[] = [
  { label: "Rød", code: "R-01", top: "#D8121B", bottom: "#FFFFFF" },
  { label: "Svart", code: "S-02", top: "#1A1A1A", bottom: "#FFFFFF" },
  { label: "Hvit", code: "H-03", top: "#FFFFFF", bottom: "#1A1A1A" },
  { label: "Blå", code: "B-04", top: "#1F4F8C", bottom: "#FFFFFF" },
  { label: "Gul", code: "G-05", top: "#F4C20D", bottom: "#1A1A1A" },
  { label: "Grå", code: "L-06", top: "#D8D8D8", bottom: "#1A1A1A" },
];

const VARIANT_DEFAULT_C: ProduktVariantColor[] = [
  { label: "RØD/HVIT", code: "R-01", top: "#D8121B", bottom: "#FFFFFF" },
  { label: "SVART/HVIT", code: "S-02", top: "#1A1A1A", bottom: "#FFFFFF" },
  { label: "HVIT/SVART", code: "H-03", top: "#FFFFFF", bottom: "#1A1A1A" },
  { label: "BLÅ/HVIT", code: "B-04", top: "#1F4F8C", bottom: "#FFFFFF" },
  { label: "GUL/SVART", code: "G-05", top: "#F4C20D", bottom: "#1A1A1A" },
  { label: "GRÅ/SVART", code: "L-06", top: "#D8D8D8", bottom: "#1A1A1A" },
];

function codeColor(top: string): string {
  return top === "#FFFFFF" || top === "#D8D8D8" || top === "#F4C20D"
    ? "rgba(15,17,21,0.6)"
    : "rgba(255,255,255,0.85)";
}

// ─── 4A · Realistisk HDFI-tray grid ───────────────────────────────────────

export function produktVariantA(W: number, H: number, data: ProduktVariantData): string {
  if (aspectOf(W, H) === "li") return produktVariantALI(W, H, data);
  const colors = data.colors || VARIANT_DEFAULT_AC;
  const cards = colors
    .map(
      (c) =>
        `<div style="display:flex;flex-direction:column;gap:${W * 0.01}px;` +
        `background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);` +
        `border-radius:${W * 0.012}px;padding:${W * 0.014}px;overflow:hidden;">` +
        `<div style="flex:1;position:relative;border-radius:${W * 0.006}px;overflow:hidden;` +
        `background:${c.top};box-shadow:inset 0 -2px 0 rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.2);">` +
        `<div style="position:absolute;top:6%;right:6%;font-family:${MONO};font-weight:700;` +
        `font-size:${W * 0.011}px;letter-spacing:0.1em;color:${codeColor(c.top)};">${escapeHtml(c.code)}</div>` +
        `<div style="position:absolute;inset:18% 14% 18% 14%;display:flex;gap:5%;">` +
        `<div style="flex:1;background:rgba(8,8,10,0.92);border:3.5px solid ${c.bottom};border-radius:4px;` +
        `box-shadow:inset 0 2px 4px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4);"></div>` +
        `<div style="flex:1;background:rgba(8,8,10,0.92);border:3.5px solid ${c.bottom};border-radius:4px;` +
        `margin-top:18%;margin-bottom:18%;` +
        `box-shadow:inset 0 2px 4px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4);"></div>` +
        `<div style="flex:1;background:rgba(8,8,10,0.92);border:3.5px solid ${c.bottom};border-radius:4px;` +
        `box-shadow:inset 0 2px 4px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4);"></div>` +
        `</div></div>` +
        `<div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:${W * 0.006}px;">` +
        `<div style="font-weight:800;font-size:${W * 0.02}px;color:#fff;">${escapeHtml(c.label)}</div>` +
        `<div style="font-family:${MONO};font-size:${W * 0.013}px;color:rgba(255,255,255,0.55);letter-spacing:0.1em;">topp / bunn</div>` +
        `</div></div>`
    )
    .join("");
  const children =
    `<div style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-end;">` +
    `<div>` +
    eyebrow("EGEN PRODUKSJON", { color: FT.red }) +
    `<div style="font-weight:800;font-size:${W * 0.05}px;text-transform:uppercase;line-height:1.02;` +
    `margin-top:${W * 0.01}px;letter-spacing:-0.01em;"><span style="color:${FT.red}">HDFI</span> i seks farger</div>` +
    `</div>` +
    `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:rgba(255,255,255,0.55);` +
    `letter-spacing:0.16em;text-transform:uppercase;text-align:right;">FT · SPEC · 2026</div></div>` +
    rule({ color: FT.red, width: W * 0.07, style: `margin-top:${W * 0.014}px;position:relative;z-index:1;` }) +
    `<div style="flex:1;margin-top:${W * 0.024}px;display:grid;grid-template-columns:repeat(3, 1fr);` +
    `grid-template-rows:1fr 1fr;gap:${W * 0.022}px;position:relative;z-index:1;">${cards}</div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;flex-direction:column;gap:${W * 0.012}px;` +
    `position:relative;z-index:1;align-items:center;">` +
    `<div style="font-size:${W * 0.018}px;color:${mutedFor("ink")};font-style:italic;text-align:center;max-width:80%;">` +
    `To-lags skum: topp-platen maskineres ut og avslører bunn-fargen som ring rundt verktøyet.</div>` +
    wordmark("ink", W) +
    `</div>`;
  return frame({ W, H, bg: "ink", decor: "full", children });
}

function produktVariantALI(W: number, H: number, data: ProduktVariantData): string {
  const colors = data.colors || VARIANT_DEFAULT_AC;
  const s = S(H);
  const ringPx = H * 0.005;
  const cards = colors
    .map(
      (c) =>
        `<div style="display:flex;flex-direction:column;gap:${s.gapXs * 0.5}px;` +
        `background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);` +
        `border-radius:${s.radius * 0.3}px;padding:${s.gapXs * 0.9}px;overflow:hidden;">` +
        `<div style="flex:1;position:relative;border-radius:${s.radius * 0.2}px;overflow:hidden;` +
        `background:${c.top};box-shadow:inset 0 -2px 0 rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.2);">` +
        `<div style="position:absolute;top:6%;right:6%;font-family:${MONO};font-weight:700;` +
        `font-size:${s.bodyXs * 0.5}px;letter-spacing:0.1em;color:${codeColor(c.top)};">${escapeHtml(c.code)}</div>` +
        `<div style="position:absolute;inset:18% 14% 18% 14%;display:flex;flex-direction:column;gap:8%;">` +
        `<div style="flex:1;background:rgba(8,8,10,0.92);border:${ringPx}px solid ${c.bottom};border-radius:3px;` +
        `box-shadow:inset 0 2px 4px rgba(0,0,0,0.6);"></div>` +
        `<div style="flex:1;background:rgba(8,8,10,0.92);border:${ringPx}px solid ${c.bottom};border-radius:3px;` +
        `box-shadow:inset 0 2px 4px rgba(0,0,0,0.6);"></div>` +
        `</div></div>` +
        `<div style="display:flex;flex-direction:column;">` +
        `<div style="font-weight:800;font-size:${s.bodyXs * 0.85}px;color:#fff;">${escapeHtml(c.label)}</div>` +
        `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.6}px;color:rgba(255,255,255,0.55);` +
        `letter-spacing:0.1em;margin-top:2px;">topp / bunn</div></div></div>`
    )
    .join("");
  const children =
    `<div style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:flex-end;">` +
    `<div>` +
    eyebrow("EGEN PRODUKSJON", { color: FT.red, fontSize: s.bodyXs }) +
    `<div style="font-weight:800;font-size:${s.h2}px;text-transform:uppercase;line-height:1.02;` +
    `margin-top:${s.gapXs * 0.5}px;"><span style="color:${FT.red}">HDFI</span> i seks farger</div></div>` +
    `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.7}px;color:rgba(255,255,255,0.55);` +
    `letter-spacing:0.16em;text-transform:uppercase;">FT · SPEC · 2026</div></div>` +
    `<div style="flex:1;display:grid;grid-template-columns:repeat(6,1fr);gap:${s.gapXs * 1.2}px;` +
    `position:relative;z-index:1;margin-top:${s.gapSm}px;align-items:stretch;">${cards}</div>` +
    footerRow(W, H, "", {
      dark: true,
      italic: "To-lags skum: topp-platen maskineres ut og avslører bunn-fargen rundt verktøyet.",
    });
  return frame({ W, H, bg: "ink", decor: "full", pad: s.pad, children });
}

// ─── 4B · Krem hero-tray + 6 chips ────────────────────────────────────────

export function produktVariantB(W: number, H: number, data: ProduktVariantData): string {
  if (aspectOf(W, H) === "li") return produktVariantBLI(W, H, data);
  const colors = data.colors || VARIANT_DEFAULT_B;
  const hero = colors[0];
  const wmInk = wordmarkDataUrl("ink");
  const chips = colors
    .map(
      (c, i) =>
        `<div style="display:grid;grid-template-columns:auto 1fr auto;gap:${W * 0.012}px;align-items:center;` +
        `padding:${W * 0.008}px ${W * 0.012}px;background:#fff;` +
        `border:${i === 0 ? `2px solid ${FT.red}` : "1.5px solid rgba(15,17,21,0.12)"};border-radius:${W * 0.006}px;">` +
        `<div style="width:${W * 0.04}px;height:${W * 0.04}px;border-radius:3px;` +
        `background:linear-gradient(to bottom, ${c.top} 0%, ${c.top} 50%, ${c.bottom} 50%, ${c.bottom} 100%);` +
        `border:1px solid rgba(15,17,21,0.15);"></div>` +
        `<div style="font-weight:800;font-size:${W * 0.016}px;color:${FT.ink};">${escapeHtml(c.label)}</div>` +
        `<div style="font-family:${MONO};font-size:${W * 0.012}px;color:${FT.red};letter-spacing:0.1em;">` +
        `${escapeHtml(c.code)}</div></div>`
    )
    .join("");
  const children =
    `<div style="position:relative;z-index:1;">` +
    `<div style="font-family:${MONO};font-size:${W * 0.014}px;letter-spacing:0.18em;text-transform:uppercase;` +
    `color:rgba(15,17,21,0.55);">HDFI · CUSTOM FOAM INSERT</div>` +
    `<div style="font-weight:800;font-size:${W * 0.052}px;line-height:1.05;color:${FT.ink};` +
    `margin-top:${W * 0.012}px;letter-spacing:-0.01em;text-transform:uppercase;">` +
    `Seks <span style="color:${FT.red}">standardfarger</span></div>` +
    `<div style="font-size:${W * 0.02}px;color:rgba(15,17,21,0.65);margin-top:${W * 0.008}px;max-width:85%;">` +
    `To-lags skum med kontrastfarge i bunn. Når et verktøy mangler, ser du det umiddelbart.</div></div>` +
    `<div style="flex:1;margin-top:${W * 0.026}px;display:grid;grid-template-columns:1.3fr 1fr;` +
    `gap:${W * 0.026}px;position:relative;z-index:1;">` +
    `<div style="position:relative;border-radius:${W * 0.014}px;overflow:hidden;` +
    `background:${hero.top};padding:${W * 0.04}px;` +
    `box-shadow:0 12px 32px rgba(15,17,21,0.18), inset 0 -3px 0 rgba(0,0,0,0.12);">` +
    `<div style="display:grid;grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr 1fr;` +
    `gap:${W * 0.018}px;height:100%;">` +
    `<div style="grid-row:1 / span 2;background:${hero.bottom};border-radius:6px;` +
    `box-shadow:inset 0 4px 8px rgba(0,0,0,0.2);"></div>` +
    `<div style="background:${hero.bottom};border-radius:6px;box-shadow:inset 0 4px 8px rgba(0,0,0,0.2);"></div>` +
    `<div style="background:${hero.bottom};border-radius:6px;box-shadow:inset 0 4px 8px rgba(0,0,0,0.2);"></div>` +
    `<div style="grid-column:1 / span 2;background:${hero.bottom};border-radius:6px;` +
    `box-shadow:inset 0 4px 8px rgba(0,0,0,0.2);height:60%;"></div>` +
    `</div>` +
    `<div style="position:absolute;top:${W * 0.014}px;right:${W * 0.014}px;` +
    `background:rgba(255,255,255,0.92);padding:${W * 0.006}px ${W * 0.012}px;` +
    `font-family:${MONO};font-weight:700;font-size:${W * 0.014}px;color:${FT.ink};` +
    `letter-spacing:0.12em;border-radius:3px;">${escapeHtml(hero.code)}</div></div>` +
    `<div style="display:grid;grid-template-rows:repeat(6,1fr);gap:${W * 0.01}px;">${chips}</div>` +
    `</div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.018}px;color:${FT.ink};letter-spacing:0.06em;">fosen-tools.no/hdfi</div>` +
    (wmInk ? `<img src="${wmInk}" alt="Fosen Tools" style="width:${W * 0.14}px;"/>` : "") +
    `</div>`;
  return frame({ W, H, bg: "cream", decor: "rulers", children });
}

function produktVariantBLI(W: number, H: number, data: ProduktVariantData): string {
  const colors = data.colors || VARIANT_DEFAULT_B;
  const hero = colors[0];
  const s = S(H);
  const chips = colors
    .map(
      (c, i) =>
        `<div style="display:grid;grid-template-columns:auto 1fr auto;gap:${s.gapXs * 0.6}px;align-items:center;` +
        `padding:${s.gapXs * 0.4}px ${s.gapXs * 0.6}px;background:#fff;` +
        `border:${i === 0 ? `2px solid ${FT.red}` : "1.5px solid rgba(15,17,21,0.12)"};border-radius:${s.radius * 0.2}px;">` +
        `<div style="width:${s.bodySm}px;height:${s.bodySm}px;border-radius:2px;` +
        `background:linear-gradient(to bottom, ${c.top} 0%, ${c.top} 50%, ${c.bottom} 50%, ${c.bottom} 100%);` +
        `border:1px solid rgba(15,17,21,0.15);"></div>` +
        `<div style="font-weight:800;font-size:${s.bodyXs * 0.8}px;color:${FT.ink};">${escapeHtml(c.label)}</div>` +
        `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.6}px;color:${FT.red};letter-spacing:0.1em;">` +
        `${escapeHtml(c.code)}</div></div>`
    )
    .join("");
  const children =
    `<div style="display:grid;grid-template-columns:1.2fr 1fr;gap:${s.gap}px;flex:1;position:relative;z-index:1;">` +
    `<div style="position:relative;border-radius:${s.radius * 0.4}px;overflow:hidden;` +
    `background:${hero.top};padding:${s.gap}px;` +
    `box-shadow:0 12px 32px rgba(15,17,21,0.18), inset 0 -3px 0 rgba(0,0,0,0.12);">` +
    `<div style="display:grid;grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr 1fr;` +
    `gap:${s.gapXs * 1.2}px;height:100%;">` +
    `<div style="grid-row:1 / span 2;background:${hero.bottom};border-radius:6px;box-shadow:inset 0 4px 8px rgba(0,0,0,0.2);"></div>` +
    `<div style="background:${hero.bottom};border-radius:6px;box-shadow:inset 0 4px 8px rgba(0,0,0,0.2);"></div>` +
    `<div style="background:${hero.bottom};border-radius:6px;box-shadow:inset 0 4px 8px rgba(0,0,0,0.2);"></div>` +
    `<div style="grid-column:1 / span 2;background:${hero.bottom};border-radius:6px;` +
    `box-shadow:inset 0 4px 8px rgba(0,0,0,0.2);height:60%;"></div>` +
    `</div>` +
    `<div style="position:absolute;top:${s.gapXs}px;right:${s.gapXs}px;` +
    `background:rgba(255,255,255,0.92);padding:${s.gapXs * 0.4}px ${s.gapXs * 0.8}px;` +
    `font-family:${MONO};font-weight:700;font-size:${s.bodyXs * 0.7}px;color:${FT.ink};` +
    `letter-spacing:0.12em;border-radius:3px;">${escapeHtml(hero.code)}</div></div>` +
    `<div style="display:flex;flex-direction:column;gap:${s.gapXs * 0.5}px;">` +
    `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.7}px;letter-spacing:0.18em;text-transform:uppercase;` +
    `color:rgba(15,17,21,0.55);">HDFI · CUSTOM FOAM INSERT</div>` +
    `<div style="font-weight:800;font-size:${s.h3}px;line-height:1.05;color:${FT.ink};text-transform:uppercase;letter-spacing:-0.005em;">` +
    `Seks <span style="color:${FT.red}">standardfarger</span></div>` +
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:${s.gapXs * 0.6}px;margin-top:${s.gapXs}px;">${chips}</div>` +
    `</div></div>` +
    footerRow(W, H, "fosen-tools.no/hdfi", { ink: true });
  return frame({ W, H, bg: "cream", decor: "rulers", pad: s.pad, children });
}

// ─── 4C · Swatchbook med koder ────────────────────────────────────────────

export function produktVariantC(W: number, H: number, data: ProduktVariantData): string {
  if (aspectOf(W, H) === "li") return produktVariantCLI(W, H, data);
  const colors = data.colors || VARIANT_DEFAULT_C;
  const wmInk = wordmarkDataUrl("ink");
  const cards = colors
    .map(
      (c) =>
        `<div style="display:grid;grid-template-columns:auto 1fr;gap:${W * 0.016}px;align-items:center;` +
        `background:#fff;padding:${W * 0.014}px;border-radius:${W * 0.006}px;` +
        `border:1.5px solid rgba(15,17,21,0.12);">` +
        `<div style="width:${W * 0.09}px;aspect-ratio:1/1.4;` +
        `background:linear-gradient(to bottom, ${c.top} 0%, ${c.top} 50%, ${c.bottom} 50%, ${c.bottom} 100%);` +
        `border-radius:${W * 0.003}px;border:1px solid rgba(15,17,21,0.12);"></div>` +
        `<div>` +
        `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.012}px;color:${FT.red};letter-spacing:0.16em;">` +
        `${escapeHtml(c.code)}</div>` +
        `<div style="font-weight:800;font-size:${W * 0.02}px;color:${FT.ink};margin-top:${W * 0.004}px;letter-spacing:-0.005em;">` +
        `${escapeHtml(c.label)}</div>` +
        `<div style="font-family:${MONO};font-size:${W * 0.012}px;color:rgba(15,17,21,0.55);` +
        `margin-top:${W * 0.004}px;letter-spacing:0.08em;">${escapeHtml(c.top)} / ${escapeHtml(c.bottom)}</div>` +
        `</div></div>`
    )
    .join("");
  const children =
    `<div style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:baseline;">` +
    `<div>` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.014}px;color:${FT.red};` +
    `letter-spacing:0.22em;text-transform:uppercase;">SWATCHBOOK · HDFI</div>` +
    `<div style="font-weight:800;font-size:${W * 0.052}px;color:${FT.ink};text-transform:uppercase;` +
    `line-height:1.02;margin-top:${W * 0.01}px;letter-spacing:-0.01em;">Standardfarger</div></div>` +
    `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:rgba(15,17,21,0.55);` +
    `letter-spacing:0.16em;text-align:right;">2026<br/>COLLECTION</div></div>` +
    `<div style="flex:1;margin-top:${W * 0.026}px;display:grid;grid-template-columns:repeat(2,1fr);` +
    `grid-template-rows:repeat(3,1fr);gap:${W * 0.014}px;position:relative;z-index:1;">${cards}</div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;justify-content:space-between;align-items:center;` +
    `position:relative;z-index:1;border-top:2px solid rgba(15,17,21,0.85);padding-top:${W * 0.014}px;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.016}px;color:${FT.ink};` +
    `letter-spacing:0.16em;text-transform:uppercase;">fosen-tools.no/hdfi</div>` +
    (wmInk ? `<img src="${wmInk}" alt="Fosen Tools" style="width:${W * 0.12}px;"/>` : "") +
    `</div>`;
  return frame({ W, H, bg: "cream", decor: "grid", pad: W * 0.05, children });
}

function produktVariantCLI(W: number, H: number, data: ProduktVariantData): string {
  const colors = data.colors || VARIANT_DEFAULT_C;
  const cards = colors
    .map(
      (c) =>
        `<div style="display:flex;flex-direction:column;gap:${H * 0.012}px;background:#fff;` +
        `padding:${H * 0.018}px;border-radius:${H * 0.006}px;border:1.5px solid rgba(15,17,21,0.12);">` +
        `<div style="aspect-ratio:1/1.4;` +
        `background:linear-gradient(to bottom, ${c.top} 0%, ${c.top} 50%, ${c.bottom} 50%, ${c.bottom} 100%);` +
        `border:1px solid rgba(15,17,21,0.12);border-radius:${H * 0.004}px;"></div>` +
        `<div style="font-family:${MONO};font-weight:700;font-size:${H * 0.016}px;color:${FT.red};letter-spacing:0.1em;">` +
        `${escapeHtml(c.code)}</div>` +
        `<div style="font-weight:800;font-size:${H * 0.018}px;color:${FT.ink};line-height:1.1;letter-spacing:-0.005em;">` +
        `${escapeHtml(c.label)}</div></div>`
    )
    .join("");
  const children =
    `<div style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:baseline;">` +
    `<div>` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${H * 0.022}px;color:${FT.red};` +
    `letter-spacing:0.22em;text-transform:uppercase;">SWATCHBOOK · HDFI</div>` +
    `<div style="font-weight:800;font-size:${H * 0.06}px;color:${FT.ink};text-transform:uppercase;` +
    `line-height:1;margin-top:${H * 0.012}px;letter-spacing:-0.01em;">Standardfarger</div></div></div>` +
    `<div style="flex:1;margin-top:${H * 0.04}px;display:grid;grid-template-columns:repeat(6,1fr);` +
    `gap:${H * 0.02}px;position:relative;z-index:1;">${cards}</div>` +
    footerRow(W, H, "fosen-tools.no/hdfi", { ink: true, monoLabel: "" });
  return frame({ W, H, bg: "cream", decor: "grid", pad: H * 0.06, children });
}
