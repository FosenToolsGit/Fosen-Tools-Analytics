/**
 * Innleggsmaler — gruppe 3: besok, stand, ansatt (A/B/C + LI).
 *
 * Portert 1:1 fra Claude Design-kilden (`innlegg-maler-stories1.jsx`,
 * `innlegg-maler-stories2.jsx`, `innlegg-maler-c.jsx`, `innlegg-maler-li.jsx`).
 * Hver design-komponent er en ren funksjon som returnerer en HTML-streng
 * bygget via `frame()`. Rendres deterministisk til PNG via Playwright.
 */

import {
  FT,
  MONO,
  SANS,
  mutedFor,
  escapeHtml,
  aspectOf,
  decorSvg,
  wordmark,
  wordmarkDataUrl,
  pin,
  photo,
  eyebrow,
  rule,
  frame,
  fontFaceCss,
} from "./core";

// =============================================================================
// Datamodeller
// =============================================================================

export interface BesokData {
  company?: string;
  location?: string;
  description?: string;
  quote?: string;
  coords?: string;
  date?: string;
  url?: string;
  photo?: string | null;
}

export interface StandData {
  eyebrow?: string;
  event?: string;
  year?: string;
  pitch?: string;
  date?: string;
  place?: string;
  stand?: string;
  cta?: string;
  photo?: string | null;
}

export interface AnsattData {
  eyebrow?: string;
  name?: string;
  role?: string;
  yearsLabel?: string;
  quote?: string;
  fact?: string;
  stats?: [string, string][];
  employeeId?: string;
  joined?: string;
  photo?: string | null;
}

// =============================================================================
// LI scale-helper (speiler `S(H)` i innlegg-maler-li.jsx)
// =============================================================================

function S(H: number) {
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

/** Felles bunn-rad for LI-malene (speiler `FooterRow` i innlegg-maler-li.jsx). */
function footerRow(
  W: number,
  H: number,
  opts: {
    url?: string;
    ink?: boolean;
    italic?: string;
    wordmarkOnly?: boolean;
    monoLabel?: string;
  } = {}
): string {
  const s = S(H);
  const wmUrl = opts.ink
    ? wordmarkImg("ink", H * 0.05)
    : wordmarkImg("white", H * 0.05);
  const left =
    `<div style="display:flex;align-items:center;gap:${s.gapXs * 1.5}px;flex:1;">` +
    (opts.url
      ? `<div style="padding:${s.gapXs * 0.5}px ${s.gapXs * 1.4}px;` +
        `border:1.5px solid ${opts.ink ? "rgba(15,17,21,0.4)" : "rgba(255,255,255,0.5)"};` +
        `border-radius:999px;font-weight:700;font-size:${s.bodyXs}px;">${escapeHtml(opts.url)}</div>`
      : "") +
    (opts.italic
      ? `<div style="font-style:italic;font-size:${s.bodyXs}px;` +
        `color:${opts.ink ? "rgba(15,17,21,0.6)" : mutedFor("ink")};">${escapeHtml(opts.italic)}</div>`
      : "") +
    (opts.monoLabel
      ? `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.75}px;letter-spacing:0.18em;` +
        `color:${opts.ink ? "rgba(15,17,21,0.55)" : mutedFor("ink")};">${escapeHtml(opts.monoLabel)}</div>`
      : "") +
    `</div>`;
  void opts.wordmarkOnly;
  return (
    `<div style="margin-top:${s.gapXs}px;display:flex;align-items:center;` +
    `justify-content:space-between;position:relative;z-index:1;gap:${s.gap}px;">` +
    left +
    wmUrl +
    `</div>`
  );
}

/** Bare wordmark-bildet (uten pille-ramme) — for footer-rader og editorial-maler. */
function wordmarkImg(
  variant: "white" | "ink",
  height: number,
  widthStyle?: string
): string {
  // wordmark() i core gir pille-versjon; her trenger vi rå <img>.
  // Bruk core sin data-URL via en minimal wrapper.
  return wordmarkRaw(variant, height, widthStyle);
}

function wordmarkRaw(
  variant: "white" | "ink",
  height?: number,
  width?: string
): string {
  const url = wordmarkDataUrl(variant);
  if (!url) return "";
  const dim = width
    ? `width:${width};height:auto;`
    : height
      ? `height:${height}px;width:auto;`
      : "";
  return `<img src="${url}" alt="Fosen Tools" style="${dim}"/>`;
}

// =============================================================================
// 8A. BESØK — Reportasje mørk med pin
// =============================================================================

export function besokA(W: number, H: number, data: BesokData = {}): string {
  if (aspectOf(W, H) === "li") return besokALI(W, H, data);
  const {
    company = "Andøya Space",
    location = "Andøya",
    description = "Vi tok turen til Andøya Space for å se hvordan verktøyløsningene våre brukes i praksis.",
    url = "fosen-tools.no",
    photo: src = null,
  } = data;
  const children =
    `<div style="flex:1;display:grid;grid-template-columns:1fr 1.05fr;gap:${W * 0.035}px;` +
    `position:relative;z-index:1;align-items:center;">` +
    `<div style="position:relative;aspect-ratio:1/1;max-height:${H * 0.7}px;">` +
    photo({ W, src, tag: "Besøks-foto", radius: W * 0.018 }) +
    `</div>` +
    `<div style="display:flex;flex-direction:column;gap:${W * 0.014}px;">` +
    eyebrow("PÅ BESØK HOS", { color: FT.red }) +
    `<div style="font-weight:800;font-size:${W * 0.058}px;text-transform:uppercase;` +
    `line-height:1.02;letter-spacing:-0.015em;">${escapeHtml(company)}</div>` +
    rule({ color: FT.red, width: W * 0.06, style: `margin-top:${W * 0.004}px;` }) +
    `<div style="display:flex;align-items:center;gap:${W * 0.014}px;margin-top:${W * 0.012}px;">` +
    pin(W * 0.026) +
    `<span style="font-weight:800;font-size:${W * 0.024}px;letter-spacing:-0.005em;">${escapeHtml(location)}</span>` +
    `</div>` +
    `<div style="font-size:${W * 0.02}px;color:${mutedFor("ink")};line-height:1.5;` +
    `margin-top:${W * 0.012}px;max-width:95%;">${escapeHtml(description)}</div>` +
    `</div>` +
    `</div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;flex-direction:column;gap:${W * 0.012}px;` +
    `align-items:center;position:relative;z-index:1;">` +
    `<div style="padding:${W * 0.012}px ${W * 0.032}px;border:1.5px solid rgba(255,255,255,0.5);` +
    `border-radius:999px;font-weight:700;font-size:${W * 0.022}px;">${escapeHtml(url)}</div>` +
    wordmark("ink", W) +
    `</div>`;
  return frame({ W, H, bg: "ink", decor: "full", pad: W * 0.045, children });
}

function besokALI(W: number, H: number, data: BesokData = {}): string {
  const {
    company = "Andøya Space",
    location = "Andøya",
    description = "Vi tok turen til Andøya Space for å se hvordan verktøyløsningene våre brukes i praksis.",
    url = "fosen-tools.no",
    photo: src = null,
  } = data;
  const s = S(H);
  const children =
    `<div style="display:grid;grid-template-columns:1fr 1.2fr;gap:${s.gap}px;flex:1;` +
    `position:relative;z-index:1;align-items:stretch;">` +
    photo({ W: W * 0.4, src, tag: "Besøks-foto", radius: s.radius * 0.5 }) +
    `<div style="display:flex;flex-direction:column;justify-content:center;gap:${s.gapXs * 0.6}px;">` +
    eyebrow("PÅ BESØK HOS", { fontSize: s.bodyXs }) +
    `<div style="font-weight:800;font-size:${s.h2}px;text-transform:uppercase;line-height:1;` +
    `letter-spacing:-0.015em;">${escapeHtml(company)}</div>` +
    rule({ color: FT.red, width: W * 0.05, style: `margin-top:${s.gapXs * 0.4}px;` }) +
    `<div style="display:flex;align-items:center;gap:${s.gapXs}px;margin-top:${s.gapXs * 0.4}px;">` +
    pin(H * 0.04) +
    `<span style="font-weight:800;font-size:${s.h4}px;">${escapeHtml(location)}</span>` +
    `</div>` +
    `<div style="font-size:${s.bodyXs}px;color:${mutedFor("ink")};line-height:1.45;` +
    `margin-top:${s.gapXs * 0.3}px;max-width:95%;">${escapeHtml(description)}</div>` +
    `</div>` +
    `</div>` +
    footerRow(W, H, { url });
  return frame({ W, H, bg: "ink", decor: "full", pad: s.pad, children });
}

// =============================================================================
// 8B. BESØK — Magasin-stil, full-bleed foto
// =============================================================================

export function besokB(W: number, H: number, data: BesokData = {}): string {
  if (aspectOf(W, H) === "li") return besokBLI(W, H, data);
  const {
    company = "Andøya Space",
    location = "Andøya · Vesterålen",
    quote = "«De har et helt eget økosystem rundt verktøyene sine.»",
    url = "fosen-tools.no",
    photo: src = null,
  } = data;
  return (
    `<!doctype html><html><head><meta charset="utf-8"><style>` +
    fontFaceBlock() +
    `*{margin:0;padding:0;box-sizing:border-box;}` +
    `html,body{width:${W}px;height:${H}px;}` +
    `</style></head><body>` +
    `<div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;` +
    `font-family:${SANS};color:#fff;background:${FT.ink};">` +
    `<div style="position:absolute;inset:0;">` +
    photo({ W, src, tag: "Reportasjefoto · full", radius: 0 }) +
    `</div>` +
    `<div style="position:absolute;inset:0;background:linear-gradient(to top,` +
    `rgba(15,17,21,0.92) 0%,rgba(15,17,21,0.6) 30%,rgba(15,17,21,0.1) 60%,rgba(15,17,21,0.6) 100%);"></div>` +
    decorSvg("corners", "ink", W, H) +
    `<div style="position:absolute;top:${W * 0.05}px;left:${W * 0.05}px;right:${W * 0.05}px;z-index:2;` +
    `display:flex;justify-content:space-between;align-items:flex-start;">` +
    eyebrow("PÅ BESØK HOS", { color: FT.red }) +
    `<div style="display:flex;align-items:center;gap:${W * 0.008}px;` +
    `background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);` +
    `padding:${W * 0.008}px ${W * 0.016}px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);">` +
    pin(W * 0.018) +
    `<span style="font-weight:700;font-size:${W * 0.016}px;letter-spacing:0.04em;">${escapeHtml(location)}</span>` +
    `</div>` +
    `</div>` +
    `<div style="position:absolute;bottom:${W * 0.05}px;left:${W * 0.05}px;right:${W * 0.05}px;z-index:2;` +
    `display:flex;flex-direction:column;gap:${W * 0.018}px;">` +
    `<div style="font-weight:800;font-size:${W * 0.085}px;text-transform:uppercase;` +
    `letter-spacing:-0.02em;line-height:0.96;">${escapeHtml(company)}</div>` +
    rule({ color: FT.red, width: W * 0.08, height: 4, style: `margin-top:${W * 0.004}px;` }) +
    `<div style="font-style:italic;font-weight:500;font-size:${W * 0.024}px;` +
    `color:rgba(255,255,255,0.92);line-height:1.4;max-width:80%;">${escapeHtml(quote)}</div>` +
    `<div style="display:flex;align-items:center;justify-content:space-between;margin-top:${W * 0.012}px;">` +
    `<div style="font-weight:800;font-size:${W * 0.02}px;letter-spacing:0.04em;">${escapeHtml(url)}</div>` +
    wordmarkRaw("white", undefined, `${W * 0.14}px`) +
    `</div>` +
    `</div>` +
    `</div>` +
    `</body></html>`
  );
}

function besokBLI(W: number, H: number, data: BesokData = {}): string {
  const {
    company = "Andøya Space",
    location = "Andøya · Vesterålen",
    quote = "«De har et helt eget økosystem rundt verktøyene sine.»",
    url = "fosen-tools.no",
    photo: src = null,
  } = data;
  const s = S(H);
  return (
    `<!doctype html><html><head><meta charset="utf-8"><style>` +
    fontFaceBlock() +
    `*{margin:0;padding:0;box-sizing:border-box;}` +
    `html,body{width:${W}px;height:${H}px;}` +
    `</style></head><body>` +
    `<div style="position:relative;width:${W}px;height:${H}px;overflow:hidden;` +
    `font-family:${SANS};color:#fff;background:${FT.ink};">` +
    `<div style="position:absolute;inset:0;">` +
    photo({ W, src, tag: "Reportasjefoto · full", radius: 0 }) +
    `</div>` +
    `<div style="position:absolute;inset:0;background:linear-gradient(90deg,` +
    `rgba(15,17,21,0.92) 0%,rgba(15,17,21,0.65) 40%,rgba(15,17,21,0.1) 100%);"></div>` +
    decorSvg("corners", "ink", W, H) +
    `<div style="position:absolute;top:${s.pad}px;left:${s.pad}px;right:${s.pad}px;z-index:2;` +
    `display:flex;justify-content:space-between;align-items:flex-start;">` +
    eyebrow("PÅ BESØK HOS", { fontSize: s.bodyXs }) +
    `<div style="display:flex;align-items:center;gap:${s.gapXs * 0.5}px;` +
    `background:rgba(255,255,255,0.12);backdrop-filter:blur(8px);` +
    `padding:${s.gapXs * 0.5}px ${s.gapXs * 1.2}px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);">` +
    pin(s.bodyXs * 1.2) +
    `<span style="font-weight:700;font-size:${s.bodyXs}px;">${escapeHtml(location)}</span>` +
    `</div>` +
    `</div>` +
    `<div style="position:absolute;left:${s.pad}px;bottom:${s.pad}px;top:${s.pad * 2.5}px;width:52%;z-index:2;` +
    `display:flex;flex-direction:column;justify-content:center;gap:${s.gapXs * 0.6}px;">` +
    `<div style="font-weight:800;font-size:${s.h1}px;text-transform:uppercase;` +
    `letter-spacing:-0.02em;line-height:0.95;">${escapeHtml(company)}</div>` +
    rule({ color: FT.red, width: H * 0.1, height: 3, style: `margin-top:${s.gapXs * 0.3}px;` }) +
    `<div style="font-style:italic;font-weight:500;font-size:${s.bodySm}px;` +
    `color:rgba(255,255,255,0.92);line-height:1.4;margin-top:${s.gapXs * 0.5}px;">${escapeHtml(quote)}</div>` +
    `<div style="margin-top:auto;display:flex;align-items:center;justify-content:space-between;">` +
    `<div style="font-weight:800;font-size:${s.bodyXs}px;letter-spacing:0.04em;">${escapeHtml(url)}</div>` +
    wordmarkRaw("white", H * 0.05) +
    `</div>` +
    `</div>` +
    `</div>` +
    `</body></html>`
  );
}

// =============================================================================
// 8C. BESØK — Feltrapport / koordinater
// =============================================================================

export function besokC(W: number, H: number, data: BesokData = {}): string {
  if (aspectOf(W, H) === "li") return besokCLI(W, H, data);
  const {
    company = "Andøya Space",
    location = "Andøya",
    coords = "69.2941°N · 16.0309°E",
    description = "Vi tok turen til Andøya Space for å se hvordan verktøyløsningene våre brukes i praksis.",
    date = "12.05.2026",
    photo: src = null,
  } = data;
  const children =
    `<div style="display:flex;justify-content:space-between;align-items:center;` +
    `position:relative;z-index:1;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.014}px;color:${FT.red};` +
    `letter-spacing:0.22em;text-transform:uppercase;">FELTRAPPORT · ${escapeHtml(date)}</div>` +
    `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:rgba(255,255,255,0.55);` +
    `letter-spacing:0.1em;">${escapeHtml(coords)}</div>` +
    `</div>` +
    `<div style="flex:1;margin-top:${W * 0.022}px;position:relative;z-index:1;` +
    `display:flex;flex-direction:column;gap:${W * 0.018}px;">` +
    `<div style="flex:1;position:relative;">` +
    photo({ W, src, tag: "Besøks-foto", radius: W * 0.014 }) +
    `</div>` +
    `<div>` +
    `<div style="display:flex;align-items:center;gap:${W * 0.014}px;">` +
    pin(W * 0.03) +
    `<span style="font-family:${MONO};font-weight:700;font-size:${W * 0.018}px;color:${FT.red};` +
    `letter-spacing:0.16em;text-transform:uppercase;">${escapeHtml(location)}</span>` +
    `</div>` +
    `<div style="font-weight:800;font-size:${W * 0.064}px;text-transform:uppercase;line-height:1;` +
    `margin-top:${W * 0.008}px;letter-spacing:-0.02em;">${escapeHtml(company)}</div>` +
    `<div style="font-size:${W * 0.02}px;color:rgba(255,255,255,0.7);margin-top:${W * 0.012}px;` +
    `line-height:1.45;max-width:90%;">${escapeHtml(description)}</div>` +
    `</div>` +
    `</div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;justify-content:space-between;align-items:center;` +
    `position:relative;z-index:1;border-top:1px solid rgba(255,255,255,0.18);padding-top:${W * 0.014}px;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.016}px;` +
    `letter-spacing:0.16em;text-transform:uppercase;">fosen-tools.no/blogg</div>` +
    wordmarkRaw("white", undefined, `${W * 0.12}px`) +
    `</div>`;
  return frame({ W, H, bg: "ink", decor: "rulers", pad: W * 0.05, children });
}

function besokCLI(W: number, H: number, data: BesokData = {}): string {
  const {
    company = "Andøya Space",
    location = "Andøya",
    coords = "69.2941°N · 16.0309°E",
    description = "Vi tok turen til Andøya Space for å se hvordan verktøyløsningene våre brukes i praksis.",
    date = "12.05.2026",
    photo: src = null,
  } = data;
  const children =
    `<div style="display:flex;justify-content:space-between;position:relative;z-index:1;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${H * 0.022}px;color:${FT.red};` +
    `letter-spacing:0.22em;text-transform:uppercase;">FELTRAPPORT · ${escapeHtml(date)}</div>` +
    `<div style="font-family:${MONO};font-size:${H * 0.02}px;color:rgba(255,255,255,0.55);` +
    `letter-spacing:0.1em;">${escapeHtml(coords)}</div>` +
    `</div>` +
    `<div style="display:grid;grid-template-columns:1fr 1.1fr;gap:${H * 0.04}px;flex:1;` +
    `position:relative;z-index:1;align-items:stretch;">` +
    photo({ W: W * 0.4, src, tag: "Besøks-foto", radius: H * 0.014 }) +
    `<div style="display:flex;flex-direction:column;justify-content:center;gap:${H * 0.014}px;">` +
    `<div style="display:flex;align-items:center;gap:${H * 0.018}px;">` +
    pin(H * 0.04) +
    `<span style="font-family:${MONO};font-weight:700;font-size:${H * 0.024}px;color:${FT.red};` +
    `letter-spacing:0.16em;text-transform:uppercase;">${escapeHtml(location)}</span>` +
    `</div>` +
    `<div style="font-weight:800;font-size:${H * 0.084}px;text-transform:uppercase;line-height:1;` +
    `letter-spacing:-0.02em;">${escapeHtml(company)}</div>` +
    `<div style="font-size:${H * 0.026}px;color:rgba(255,255,255,0.7);line-height:1.45;` +
    `margin-top:${H * 0.008}px;">${escapeHtml(description)}</div>` +
    `</div>` +
    `</div>` +
    footerRow(W, H, { url: "fosen-tools.no/blogg" });
  return frame({ W, H, bg: "ink", decor: "rulers", pad: H * 0.07, children });
}

// =============================================================================
// 9A. STAND — Rød full-bleed messe-invitasjon
// =============================================================================

export function standA(W: number, H: number, data: StandData = {}): string {
  if (aspectOf(W, H) === "li") return standALI(W, H, data);
  const {
    eyebrow: eb = "MØT OSS",
    event = "Verktøymessen",
    year = "2026",
    pitch = "Kom innom for en prat om HDFI, verktøykontroll og skreddersøm.",
    date = "14.–16. mars",
    place = "Trondheim Spektrum",
    stand = "B-24",
    cta = "kom innom standen",
  } = data;
  const detail = ([k, v]: [string, string]): string =>
    `<div>` +
    `<div style="font-weight:800;font-size:${W * 0.016}px;color:${FT.ink};` +
    `letter-spacing:0.16em;text-transform:uppercase;">${escapeHtml(k)}</div>` +
    `<div style="font-weight:800;font-size:${W * 0.034}px;color:#fff;margin-top:${W * 0.006}px;` +
    `letter-spacing:-0.005em;">${escapeHtml(v)}</div>` +
    `</div>`;
  const children =
    `<div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:${W * 0.014}px;">` +
    `<div style="font-weight:800;font-size:${W * 0.02}px;letter-spacing:0.22em;color:${FT.ink};` +
    `text-transform:uppercase;">${escapeHtml(eb)}</div>` +
    `<div style="display:flex;align-items:flex-end;gap:${W * 0.018}px;flex-wrap:wrap;">` +
    `<div style="font-weight:800;font-size:${W * 0.084}px;color:#fff;text-transform:uppercase;` +
    `line-height:0.98;letter-spacing:-0.02em;">${escapeHtml(event)}</div>` +
    `<div style="font-weight:800;font-size:${W * 0.084}px;color:rgba(255,255,255,0.36);` +
    `line-height:0.98;letter-spacing:-0.02em;">${escapeHtml(year)}</div>` +
    `</div>` +
    rule({ color: "#fff", width: W * 0.07, style: `margin-top:${W * 0.006}px;` }) +
    `<div style="font-size:${W * 0.024}px;color:#fff;line-height:1.45;max-width:85%;` +
    `margin-top:${W * 0.012}px;font-weight:500;">${escapeHtml(pitch)}</div>` +
    `</div>` +
    `<div style="flex:1;margin-top:${W * 0.03}px;display:flex;align-items:center;` +
    `position:relative;z-index:1;">` +
    `<div style="display:grid;grid-template-columns:1fr 1.2fr 0.8fr;gap:${W * 0.018}px;flex:1;` +
    `border-top:2px solid rgba(255,255,255,0.45);border-bottom:2px solid rgba(255,255,255,0.45);` +
    `padding:${W * 0.024}px 0;">` +
    ([
      ["DATO", date],
      ["STED", place],
      ["STAND", stand],
    ] as [string, string][])
      .map(detail)
      .join("") +
    `</div>` +
    `</div>` +
    `<div style="margin-top:${W * 0.014}px;display:flex;flex-direction:column;gap:${W * 0.012}px;` +
    `align-items:flex-start;position:relative;z-index:1;">` +
    `<div style="padding:${W * 0.014}px ${W * 0.036}px;border:2px solid #fff;border-radius:999px;` +
    `font-weight:800;font-size:${W * 0.024}px;color:#fff;letter-spacing:0.04em;` +
    `text-transform:lowercase;">${escapeHtml(cta)}</div>` +
    `<div style="align-self:center;margin-top:${W * 0.008}px;">` +
    wordmarkRaw("white", undefined, `${W * 0.14}px`) +
    `</div>` +
    `</div>`;
  return frame({ W, H, bg: "red", decor: "rulers", pad: W * 0.05, children });
}

function standALI(W: number, H: number, data: StandData = {}): string {
  const {
    event = "Verktøymessen",
    year = "2026",
    pitch = "Kom innom for en prat om HDFI, verktøykontroll og skreddersøm.",
    date = "14.–16. mars",
    place = "Trondheim Spektrum",
    stand = "B-24",
    cta = "kom innom standen",
  } = data;
  const s = S(H);
  const detail = ([k, v]: [string, string]): string =>
    `<div>` +
    `<div style="font-weight:800;font-size:${s.bodyXs * 0.65}px;color:${FT.ink};` +
    `letter-spacing:0.18em;text-transform:uppercase;">${escapeHtml(k)}</div>` +
    `<div style="font-weight:800;font-size:${s.h4}px;color:#fff;margin-top:${s.gapXs * 0.2}px;` +
    `letter-spacing:-0.005em;">${escapeHtml(v)}</div>` +
    `</div>`;
  const children =
    `<div style="position:relative;z-index:1;display:flex;align-items:baseline;gap:${s.gapXs * 1.5}px;">` +
    `<div style="font-weight:800;font-size:${s.bodyXs}px;letter-spacing:0.22em;color:${FT.ink};` +
    `text-transform:uppercase;">MØT OSS</div>` +
    `<div style="font-weight:800;font-size:${s.h1}px;color:#fff;text-transform:uppercase;` +
    `line-height:1;letter-spacing:-0.02em;">${escapeHtml(event)}</div>` +
    `<div style="font-weight:800;font-size:${s.h1}px;color:rgba(255,255,255,0.36);` +
    `line-height:1;letter-spacing:-0.02em;">${escapeHtml(year)}</div>` +
    `</div>` +
    rule({
      color: "#fff",
      width: W * 0.06,
      style: `margin-top:${s.gapXs * 0.6}px;position:relative;z-index:1;`,
    }) +
    `<div style="flex:1;margin-top:${s.gapSm}px;display:grid;grid-template-columns:1.2fr 2fr;` +
    `gap:${s.gap}px;align-items:center;position:relative;z-index:1;">` +
    `<div style="font-size:${s.bodySm}px;color:#fff;line-height:1.45;font-weight:500;">${escapeHtml(pitch)}</div>` +
    `<div style="display:grid;grid-template-columns:1fr 1fr 0.7fr;gap:${s.gap}px;` +
    `border-top:2px solid rgba(255,255,255,0.45);border-bottom:2px solid rgba(255,255,255,0.45);` +
    `padding:${s.gapXs * 1.2}px 0;">` +
    ([
      ["DATO", date],
      ["STED", place],
      ["STAND", stand],
    ] as [string, string][])
      .map(detail)
      .join("") +
    `</div>` +
    `</div>` +
    `<div style="margin-top:${s.gapXs}px;display:flex;justify-content:space-between;align-items:center;` +
    `position:relative;z-index:1;">` +
    `<div style="padding:${s.gapXs * 0.7}px ${s.gapXs * 1.6}px;border:2px solid #fff;border-radius:999px;` +
    `font-weight:800;font-size:${s.bodyXs}px;color:#fff;letter-spacing:0.04em;">${escapeHtml(cta)}</div>` +
    wordmarkRaw("white", H * 0.05) +
    `</div>`;
  return frame({ W, H, bg: "red", decor: "rulers", pad: s.pad, children });
}

// =============================================================================
// 9B. STAND — Mørk ticket-stil
// =============================================================================

export function standB(W: number, H: number, data: StandData = {}): string {
  if (aspectOf(W, H) === "li") return standBLI(W, H, data);
  const {
    eyebrow: eb = "Messe 2026",
    event = "Verktøymessen",
    pitch = "Kom innom for en prat om HDFI, verktøykontroll og skreddersøm.",
    date = "14.–16. mars",
    place = "Trondheim Spektrum",
    stand = "B-24",
    cta = "Reserver tid",
    photo: src = null,
  } = data;
  const detail = (label: string, value: string): string =>
    `<div>` +
    `<div style="font-weight:800;font-size:${W * 0.012}px;color:${FT.red};` +
    `letter-spacing:0.18em;text-transform:uppercase;">${escapeHtml(label)}</div>` +
    `<div style="font-weight:800;font-size:${W * 0.022}px;margin-top:${W * 0.004}px;">${escapeHtml(value)}</div>` +
    `</div>`;
  const children =
    `<div style="position:relative;z-index:1;display:flex;align-items:center;` +
    `justify-content:space-between;">` +
    eyebrow(eb, { color: FT.red }) +
    `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:${mutedFor("ink")};` +
    `letter-spacing:0.16em;">FT-STAND-B24</div>` +
    `</div>` +
    `<div style="flex:1;margin-top:${W * 0.024}px;display:grid;grid-template-columns:1fr 1fr;` +
    `gap:${W * 0.028}px;position:relative;z-index:1;align-items:stretch;">` +
    `<div style="position:relative;">` +
    photo({ W, src, tag: "Messestand-foto", radius: W * 0.014 }) +
    `</div>` +
    `<div style="display:flex;flex-direction:column;justify-content:center;gap:${W * 0.014}px;">` +
    `<div style="font-weight:800;font-size:${W * 0.048}px;text-transform:uppercase;` +
    `letter-spacing:-0.015em;line-height:1.0;word-break:break-word;">${escapeHtml(event)}</div>` +
    rule({ color: FT.red, width: W * 0.06 }) +
    `<div style="font-size:${W * 0.02}px;color:${mutedFor("ink")};line-height:1.5;` +
    `max-width:95%;">${escapeHtml(pitch)}</div>` +
    `<div style="margin-top:${W * 0.018}px;padding:${W * 0.022}px;background:rgba(255,255,255,0.05);` +
    `border:1.5px dashed rgba(255,255,255,0.3);border-radius:${W * 0.012}px;` +
    `display:grid;grid-template-columns:1fr 1fr;row-gap:${W * 0.014}px;column-gap:${W * 0.018}px;">` +
    detail("DATO", date) +
    detail("STAND", stand) +
    `<div style="grid-column:1 / span 2;">` +
    detail("STED", place) +
    `</div>` +
    `</div>` +
    `</div>` +
    `</div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;align-items:center;` +
    `justify-content:space-between;position:relative;z-index:1;">` +
    `<div style="padding:${W * 0.012}px ${W * 0.028}px;background:${FT.red};color:#fff;` +
    `font-weight:800;font-size:${W * 0.022}px;letter-spacing:0.02em;border-radius:4px;">${escapeHtml(cta)}</div>` +
    wordmarkRaw("white", undefined, `${W * 0.13}px`) +
    `</div>`;
  return frame({ W, H, bg: "inkDeep", decor: "grid", pad: W * 0.045, children });
}

function standBLI(W: number, H: number, data: StandData = {}): string {
  const {
    event = "Verktøymessen",
    date = "14.–16. mars",
    place = "Trondheim Spektrum",
    stand = "B-24",
    pitch = "Kom innom for en prat om HDFI og verktøykontroll.",
    cta = "Reserver tid",
    photo: src = null,
  } = data;
  const s = S(H);
  const detail = ([k, v]: [string, string]): string =>
    `<div>` +
    `<div style="font-weight:800;font-size:${s.bodyXs * 0.55}px;color:${FT.red};` +
    `letter-spacing:0.16em;text-transform:uppercase;">${escapeHtml(k)}</div>` +
    `<div style="font-weight:800;font-size:${s.bodySm * 0.85}px;margin-top:${s.gapXs * 0.2}px;">${escapeHtml(v)}</div>` +
    `</div>`;
  const children =
    `<div style="display:flex;align-items:center;justify-content:space-between;` +
    `position:relative;z-index:1;">` +
    eyebrow("Messe 2026", { fontSize: s.bodyXs }) +
    `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.75}px;color:${mutedFor("ink")};` +
    `letter-spacing:0.16em;">FT-STAND-B24</div>` +
    `</div>` +
    `<div style="flex:1;margin-top:${s.gapSm}px;display:grid;grid-template-columns:1fr 1fr;` +
    `gap:${s.gap}px;position:relative;z-index:1;align-items:stretch;">` +
    photo({ W: W * 0.4, src, tag: "Messestand-foto", radius: s.radius * 0.5 }) +
    `<div style="display:flex;flex-direction:column;justify-content:center;gap:${s.gapXs * 0.6}px;">` +
    `<div style="font-weight:800;font-size:${s.h2}px;text-transform:uppercase;` +
    `letter-spacing:-0.015em;line-height:1.02;">${escapeHtml(event)}</div>` +
    rule({ color: FT.red, width: W * 0.04 }) +
    `<div style="font-size:${s.bodyXs}px;color:${mutedFor("ink")};line-height:1.45;` +
    `margin-top:${s.gapXs * 0.4}px;">${escapeHtml(pitch)}</div>` +
    `<div style="margin-top:${s.gapXs}px;padding:${s.gapXs * 1.2}px;background:rgba(255,255,255,0.05);` +
    `border:1.5px dashed rgba(255,255,255,0.3);border-radius:${s.radius * 0.4}px;` +
    `display:grid;grid-template-columns:1fr 1fr 1fr;gap:${s.gapXs}px;">` +
    ([
      ["DATO", date],
      ["STED", place],
      ["STAND", stand],
    ] as [string, string][])
      .map(detail)
      .join("") +
    `</div>` +
    `</div>` +
    `</div>` +
    `<div style="margin-top:${s.gapXs}px;display:flex;align-items:center;` +
    `justify-content:space-between;position:relative;z-index:1;">` +
    `<div style="padding:${s.gapXs * 0.7}px ${s.gapXs * 1.4}px;background:${FT.red};color:#fff;` +
    `font-weight:800;font-size:${s.bodyXs}px;border-radius:4px;">${escapeHtml(cta)}</div>` +
    wordmarkRaw("white", H * 0.05) +
    `</div>`;
  return frame({ W, H, bg: "inkDeep", decor: "grid", pad: s.pad, children });
}

// =============================================================================
// 9C. STAND — Modular spec-grid
// =============================================================================

export function standC(W: number, H: number, data: StandData = {}): string {
  if (aspectOf(W, H) === "li") return standCLI(W, H, data);
  const {
    event = "Verktøymessen",
    year = "2026",
    date = "14.–16. mars",
    place = "Trondheim Spektrum",
    stand = "B-24",
    cta = "kom innom standen",
  } = data;
  const cells: [string, string, string][] = [
    ["DATO", date, "01"],
    ["STED", place, "02"],
    ["STAND", stand, "03"],
    ["CTA", cta, "04"],
  ];
  const cell = ([k, v, n]: [string, string, string], i: number): string =>
    `<div style="background:${i === 3 ? FT.red : "rgba(255,255,255,0.04)"};` +
    `border:${i === 3 ? "none" : "1px solid rgba(255,255,255,0.12)"};` +
    `padding:${W * 0.022}px;border-radius:${W * 0.008}px;` +
    `display:flex;flex-direction:column;justify-content:space-between;">` +
    `<div style="display:flex;justify-content:space-between;align-items:baseline;">` +
    `<div style="font-weight:800;font-size:${W * 0.014}px;` +
    `color:${i === 3 ? "rgba(255,255,255,0.85)" : FT.red};` +
    `letter-spacing:0.22em;text-transform:uppercase;">${escapeHtml(k)}</div>` +
    `<div style="font-family:${MONO};font-size:${W * 0.014}px;` +
    `color:${i === 3 ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.4)"};">${escapeHtml(n)}</div>` +
    `</div>` +
    `<div style="font-weight:800;font-size:${W * 0.038}px;color:#fff;line-height:1.05;` +
    `letter-spacing:-0.005em;">${escapeHtml(v)}</div>` +
    `</div>`;
  const children =
    `<div style="position:relative;z-index:1;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.016}px;color:${FT.red};` +
    `letter-spacing:0.22em;text-transform:uppercase;">EVENT-INVITASJON · ${escapeHtml(year)}</div>` +
    `<div style="font-weight:800;font-size:${W * 0.13}px;text-transform:uppercase;line-height:0.92;` +
    `letter-spacing:-0.025em;margin-top:${W * 0.014}px;">${escapeHtml(event)}</div>` +
    `</div>` +
    `<div style="flex:1;margin-top:${W * 0.026}px;display:grid;grid-template-columns:1fr 1fr;` +
    `grid-template-rows:1fr 1fr;gap:${W * 0.014}px;position:relative;z-index:1;">` +
    cells.map(cell).join("") +
    `</div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;justify-content:space-between;align-items:center;` +
    `position:relative;z-index:1;border-top:1px solid rgba(255,255,255,0.18);padding-top:${W * 0.014}px;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.016}px;` +
    `letter-spacing:0.16em;text-transform:uppercase;">fosen-tools.no/messer</div>` +
    wordmarkRaw("white", undefined, `${W * 0.12}px`) +
    `</div>`;
  return frame({ W, H, bg: "inkDeep", decor: "corners", pad: W * 0.05, children });
}

function standCLI(W: number, H: number, data: StandData = {}): string {
  const {
    event = "Verktøymessen",
    year = "2026",
    date = "14.–16. mars",
    place = "Trondheim Spektrum",
    stand = "B-24",
  } = data;
  const cells: [string, string, string][] = [
    ["DATO", date, "01"],
    ["STED", place, "02"],
    ["STAND", stand, "03"],
  ];
  const cell = ([k, v, n]: [string, string, string]): string =>
    `<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);` +
    `padding:${H * 0.024}px;border-radius:${H * 0.01}px;` +
    `display:flex;flex-direction:column;justify-content:space-between;">` +
    `<div style="display:flex;justify-content:space-between;align-items:baseline;">` +
    `<div style="font-weight:800;font-size:${H * 0.02}px;color:${FT.red};` +
    `letter-spacing:0.22em;">${escapeHtml(k)}</div>` +
    `<div style="font-family:${MONO};font-size:${H * 0.02}px;color:rgba(255,255,255,0.4);">${escapeHtml(n)}</div>` +
    `</div>` +
    `<div style="font-weight:800;font-size:${H * 0.05}px;color:#fff;line-height:1.05;">${escapeHtml(v)}</div>` +
    `</div>`;
  const children =
    `<div style="position:relative;z-index:1;display:flex;align-items:baseline;` +
    `justify-content:space-between;">` +
    `<div>` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${H * 0.022}px;color:${FT.red};` +
    `letter-spacing:0.22em;text-transform:uppercase;">EVENT · ${escapeHtml(year)}</div>` +
    `<div style="font-weight:800;font-size:${H * 0.13}px;text-transform:uppercase;line-height:0.92;` +
    `letter-spacing:-0.025em;margin-top:${H * 0.014}px;">${escapeHtml(event)}</div>` +
    `</div>` +
    `</div>` +
    `<div style="flex:1;margin-top:${H * 0.04}px;display:grid;grid-template-columns:repeat(3,1fr);` +
    `gap:${H * 0.02}px;position:relative;z-index:1;">` +
    cells.map(cell).join("") +
    `</div>` +
    footerRow(W, H, { url: "fosen-tools.no/messer" });
  return frame({ W, H, bg: "inkDeep", decor: "corners", pad: H * 0.07, children });
}

// =============================================================================
// 10A. ANSATT — Portrettkort mørk
// =============================================================================

export function ansattA(W: number, H: number, data: AnsattData = {}): string {
  if (aspectOf(W, H) === "li") return ansattALI(W, H, data);
  const {
    eyebrow: eb = "MØT TEAMET",
    name = "Ola Nordmann",
    role = "CADLAB-tegner",
    yearsLabel = "8 år i FT",
    quote = "«Den beste følelsen er når verktøyet klikker på plass — eksakt der det skal.»",
    fact = "Har tegnet over 2 000 HDFI-innlegg siden 2018.",
    photo: src = null,
  } = data;
  const children =
    `<div style="flex:1;display:grid;grid-template-columns:1fr 1.1fr;gap:${W * 0.035}px;` +
    `position:relative;z-index:1;align-items:center;">` +
    `<div style="position:relative;aspect-ratio:1/1;max-height:${H * 0.7}px;">` +
    photo({ W, src, tag: "Portrett", radius: W * 0.018 }) +
    `</div>` +
    `<div style="display:flex;flex-direction:column;gap:${W * 0.012}px;">` +
    eyebrow(eb, { color: FT.red }) +
    `<div style="font-weight:800;font-size:${W * 0.054}px;text-transform:uppercase;` +
    `line-height:1.02;letter-spacing:-0.015em;">${escapeHtml(name)}</div>` +
    `<div style="display:flex;align-items:baseline;gap:${W * 0.016}px;margin-top:${W * 0.004}px;">` +
    `<span style="font-weight:800;font-size:${W * 0.026}px;color:${FT.red};">${escapeHtml(role)}</span>` +
    `<span style="font-size:${W * 0.018}px;color:${mutedFor("ink")};font-weight:600;">·  ${escapeHtml(yearsLabel)}</span>` +
    `</div>` +
    rule({ color: FT.red, width: W * 0.06, style: `margin-top:${W * 0.012}px;` }) +
    `<div style="font-style:italic;font-weight:600;font-size:${W * 0.024}px;line-height:1.4;` +
    `margin-top:${W * 0.018}px;color:#fff;">${escapeHtml(quote)}</div>` +
    `<div style="font-size:${W * 0.018}px;color:${mutedFor("ink")};margin-top:${W * 0.014}px;` +
    `line-height:1.5;">${escapeHtml(fact)}</div>` +
    `</div>` +
    `</div>` +
    `<div style="margin-top:${W * 0.022}px;position:relative;z-index:1;">` +
    wordmark("ink", W) +
    `</div>`;
  return frame({ W, H, bg: "ink", decor: "full", pad: W * 0.045, children });
}

function ansattALI(W: number, H: number, data: AnsattData = {}): string {
  const {
    name = "Ola Nordmann",
    role = "CADLAB-tegner",
    yearsLabel = "8 år i FT",
    quote = "«Den beste følelsen er når verktøyet klikker på plass — eksakt der det skal.»",
    fact = "Har tegnet over 2 000 HDFI-innlegg siden 2018.",
    photo: src = null,
  } = data;
  const s = S(H);
  const children =
    `<div style="display:grid;grid-template-columns:1fr 1.4fr;gap:${s.gap}px;flex:1;` +
    `position:relative;z-index:1;align-items:stretch;">` +
    photo({ W: W * 0.35, src, tag: "Portrett", radius: s.radius * 0.5 }) +
    `<div style="display:flex;flex-direction:column;justify-content:center;gap:${s.gapXs * 0.5}px;">` +
    eyebrow("MØT TEAMET", { fontSize: s.bodyXs }) +
    `<div style="font-weight:800;font-size:${s.h2}px;text-transform:uppercase;line-height:1;` +
    `letter-spacing:-0.015em;">${escapeHtml(name)}</div>` +
    `<div style="display:flex;align-items:baseline;gap:${s.gapXs}px;">` +
    `<span style="font-weight:800;font-size:${s.h4}px;color:${FT.red};">${escapeHtml(role)}</span>` +
    `<span style="font-size:${s.bodyXs * 0.85}px;color:${mutedFor("ink")};font-weight:600;">·  ${escapeHtml(yearsLabel)}</span>` +
    `</div>` +
    rule({ color: FT.red, width: W * 0.04, style: `margin-top:${s.gapXs * 0.4}px;` }) +
    `<div style="font-style:italic;font-weight:600;font-size:${s.bodySm}px;line-height:1.4;` +
    `margin-top:${s.gapXs * 0.4}px;">${escapeHtml(quote)}</div>` +
    `<div style="font-size:${s.bodyXs}px;color:${mutedFor("ink")};margin-top:${s.gapXs * 0.3}px;">${escapeHtml(fact)}</div>` +
    `</div>` +
    `</div>` +
    footerRow(W, H, { wordmarkOnly: true });
  return frame({ W, H, bg: "ink", decor: "full", pad: s.pad, children });
}

// =============================================================================
// 10B. ANSATT — Magasin krem · stats
// =============================================================================

export function ansattB(W: number, H: number, data: AnsattData = {}): string {
  if (aspectOf(W, H) === "li") return ansattBLI(W, H, data);
  const {
    name = "Ola Nordmann",
    role = "CADLAB-tegner",
    yearsLabel = "8 år i FT",
    quote = "Den beste følelsen er når verktøyet klikker på plass — eksakt der det skal.",
    fact = "Har tegnet over 2 000 HDFI-innlegg siden 2018.",
    stats = [
      ["HDFI-innlegg", "2 000+"],
      ["År i FT", "8"],
      ["Kaffe/dag", "4"],
    ],
    photo: src = null,
  } = data;
  const stat = ([k, v]: [string, string]): string =>
    `<div>` +
    `<div style="font-weight:800;font-size:${W * 0.028}px;color:${FT.ink};letter-spacing:-0.01em;">${escapeHtml(v)}</div>` +
    `<div style="font-size:${W * 0.013}px;color:rgba(15,17,21,0.55);text-transform:uppercase;` +
    `letter-spacing:0.14em;font-weight:700;margin-top:${W * 0.004}px;">${escapeHtml(k)}</div>` +
    `</div>`;
  const children =
    `<div style="position:relative;z-index:1;display:flex;justify-content:space-between;` +
    `align-items:flex-start;">` +
    `<div>` +
    eyebrow("Møt teamet", { color: FT.red }) +
    `<div style="font-weight:800;font-size:${W * 0.058}px;text-transform:uppercase;color:${FT.ink};` +
    `line-height:1.02;letter-spacing:-0.015em;margin-top:${W * 0.006}px;">${escapeHtml(name)}</div>` +
    `<div style="display:flex;align-items:baseline;gap:${W * 0.012}px;margin-top:${W * 0.006}px;">` +
    `<span style="font-weight:800;font-size:${W * 0.024}px;color:${FT.red};text-transform:uppercase;">${escapeHtml(role)}</span>` +
    `<span style="font-family:${MONO};font-size:${W * 0.014}px;color:rgba(15,17,21,0.55);` +
    `letter-spacing:0.1em;">·  ${escapeHtml(yearsLabel.toUpperCase())}</span>` +
    `</div>` +
    `</div>` +
    `</div>` +
    `<div style="flex:1;margin-top:${W * 0.024}px;display:grid;grid-template-columns:1fr 1.1fr;` +
    `gap:${W * 0.04}px;position:relative;z-index:1;">` +
    `<div style="position:relative;">` +
    photo({ W, src, tag: "Portrett", dark: false, radius: W * 0.014 }) +
    `</div>` +
    `<div style="display:flex;flex-direction:column;">` +
    `<div style="font-family:${SANS};font-style:italic;font-weight:700;font-size:${W * 0.034}px;` +
    `color:${FT.ink};line-height:1.25;letter-spacing:-0.005em;">` +
    `<span style="color:${FT.red};font-style:normal;font-size:1.4em;line-height:0;">“</span>` +
    `${escapeHtml(quote)}</div>` +
    `<div style="font-size:${W * 0.018}px;color:rgba(15,17,21,0.65);margin-top:${W * 0.018}px;` +
    `line-height:1.5;">${escapeHtml(fact)}</div>` +
    `<div style="margin-top:auto;padding-top:${W * 0.022}px;border-top:1.5px solid rgba(15,17,21,0.18);` +
    `display:grid;grid-template-columns:1fr 1fr 1fr;gap:${W * 0.014}px;">` +
    stats.map(stat).join("") +
    `</div>` +
    `</div>` +
    `</div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;justify-content:flex-end;` +
    `position:relative;z-index:1;">` +
    wordmarkRaw("ink", undefined, `${W * 0.13}px`) +
    `</div>`;
  return frame({ W, H, bg: "cream", decor: "corners", pad: W * 0.05, children });
}

function ansattBLI(W: number, H: number, data: AnsattData = {}): string {
  const {
    name = "Ola Nordmann",
    role = "CADLAB-tegner",
    yearsLabel = "8 år i FT",
    quote = "Den beste følelsen er når verktøyet klikker på plass — eksakt der det skal.",
    stats = [
      ["HDFI-innlegg", "2 000+"],
      ["År i FT", "8"],
      ["Kaffe/dag", "4"],
    ],
    photo: src = null,
  } = data;
  const s = S(H);
  const stat = ([k, v]: [string, string]): string =>
    `<div>` +
    `<div style="font-weight:800;font-size:${s.h4}px;color:${FT.ink};letter-spacing:-0.01em;">${escapeHtml(v)}</div>` +
    `<div style="font-size:${s.bodyXs * 0.6}px;color:rgba(15,17,21,0.55);text-transform:uppercase;` +
    `letter-spacing:0.14em;font-weight:700;margin-top:${s.gapXs * 0.15}px;">${escapeHtml(k)}</div>` +
    `</div>`;
  const children =
    `<div style="display:grid;grid-template-columns:0.8fr 1.4fr;gap:${s.gap}px;flex:1;` +
    `position:relative;z-index:1;">` +
    photo({ W: W * 0.3, src, tag: "Portrett", dark: false, radius: s.radius * 0.4 }) +
    `<div style="display:flex;flex-direction:column;gap:${s.gapXs * 0.5}px;">` +
    eyebrow("Møt teamet", { fontSize: s.bodyXs, color: FT.red }) +
    `<div style="font-weight:800;font-size:${s.h2}px;color:${FT.ink};text-transform:uppercase;` +
    `line-height:1;letter-spacing:-0.015em;">${escapeHtml(name)}</div>` +
    `<div style="display:flex;align-items:baseline;gap:${s.gapXs}px;">` +
    `<span style="font-weight:800;font-size:${s.h4}px;color:${FT.red};text-transform:uppercase;">${escapeHtml(role)}</span>` +
    `<span style="font-family:${MONO};font-size:${s.bodyXs * 0.7}px;color:rgba(15,17,21,0.55);` +
    `letter-spacing:0.1em;">·  ${escapeHtml(yearsLabel.toUpperCase())}</span>` +
    `</div>` +
    `<div style="font-style:italic;font-weight:700;font-size:${s.bodySm}px;color:${FT.ink};` +
    `line-height:1.3;margin-top:${s.gapXs * 0.4}px;">` +
    `<span style="color:${FT.red};font-style:normal;font-size:1.4em;line-height:0;">“</span> ${escapeHtml(quote)}</div>` +
    `<div style="margin-top:auto;padding-top:${s.gapXs}px;border-top:1.5px solid rgba(15,17,21,0.18);` +
    `display:grid;grid-template-columns:repeat(3,1fr);gap:${s.gapXs}px;">` +
    stats.map(stat).join("") +
    `</div>` +
    `</div>` +
    `</div>` +
    footerRow(W, H, { ink: true, wordmarkOnly: true });
  return frame({ W, H, bg: "cream", decor: "corners", pad: s.pad, children });
}

// =============================================================================
// 10C. ANSATT — ID-kort
// =============================================================================

export function ansattC(W: number, H: number, data: AnsattData = {}): string {
  if (aspectOf(W, H) === "li") return ansattCLI(W, H, data);
  const {
    name = "Ola Nordmann",
    role = "CADLAB-tegner",
    yearsLabel = "8 år i FT",
    quote = "Den beste følelsen er når verktøyet klikker på plass — eksakt der det skal.",
    employeeId = "FT-N-014",
    joined = "2018",
    photo: src = null,
  } = data;
  const fieldLabel = (txt: string): string =>
    `<div style="font-family:${MONO};font-size:${W * 0.012}px;color:rgba(15,17,21,0.5);` +
    `letter-spacing:0.16em;text-transform:uppercase;">${escapeHtml(txt)}</div>`;
  const children =
    `<div style="position:relative;z-index:1;background:#fff;border-radius:${W * 0.014}px;` +
    `border:1.5px solid rgba(15,17,21,0.15);padding:${W * 0.03}px;flex:1;` +
    `display:flex;flex-direction:column;gap:${W * 0.018}px;box-shadow:0 12px 32px rgba(15,17,21,0.08);">` +
    `<div style="display:flex;justify-content:space-between;align-items:flex-start;` +
    `border-bottom:2px solid rgba(15,17,21,0.85);padding-bottom:${W * 0.016}px;">` +
    `<div>` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.014}px;color:${FT.red};` +
    `letter-spacing:0.22em;text-transform:uppercase;">EMPLOYEE-CARD</div>` +
    `<div style="font-family:${MONO};font-size:${W * 0.018}px;color:${FT.ink};` +
    `margin-top:${W * 0.004}px;">${escapeHtml(employeeId)}</div>` +
    `</div>` +
    wordmarkRaw("ink", undefined, `${W * 0.13}px`) +
    `</div>` +
    `<div style="flex:1;display:grid;grid-template-columns:auto 1fr;gap:${W * 0.024}px;">` +
    `<div style="width:${W * 0.28}px;position:relative;">` +
    photo({ W: W * 0.3, src, dark: false, tag: "Portrett", radius: W * 0.006 }) +
    `</div>` +
    `<div style="display:flex;flex-direction:column;gap:${W * 0.01}px;">` +
    `<div>` +
    fieldLabel("NAVN") +
    `<div style="font-weight:800;font-size:${W * 0.034}px;color:${FT.ink};text-transform:uppercase;` +
    `line-height:1.05;margin-top:${W * 0.004}px;">${escapeHtml(name)}</div>` +
    `</div>` +
    `<div>` +
    fieldLabel("STILLING") +
    `<div style="font-weight:800;font-size:${W * 0.022}px;color:${FT.red};` +
    `margin-top:${W * 0.004}px;">${escapeHtml(role)}</div>` +
    `</div>` +
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:${W * 0.012}px;">` +
    `<div>` +
    fieldLabel("STARTET") +
    `<div style="font-weight:800;font-size:${W * 0.02}px;color:${FT.ink};` +
    `margin-top:${W * 0.004}px;">${escapeHtml(joined)}</div>` +
    `</div>` +
    `<div>` +
    fieldLabel("FARTSTID") +
    `<div style="font-weight:800;font-size:${W * 0.02}px;color:${FT.ink};` +
    `margin-top:${W * 0.004}px;">${escapeHtml(yearsLabel)}</div>` +
    `</div>` +
    `</div>` +
    `</div>` +
    `</div>` +
    `<div style="border-top:1.5px solid rgba(15,17,21,0.18);padding-top:${W * 0.016}px;">` +
    `<div style="font-style:italic;font-weight:700;font-size:${W * 0.022}px;color:${FT.ink};line-height:1.35;">` +
    `<span style="color:${FT.red};font-size:1.4em;font-style:normal;line-height:0;">“</span> ${escapeHtml(quote)}</div>` +
    `</div>` +
    `</div>`;
  return frame({ W, H, bg: "cream", decor: "corners", pad: W * 0.05, children });
}

function ansattCLI(W: number, H: number, data: AnsattData = {}): string {
  const {
    name = "Ola Nordmann",
    role = "CADLAB-tegner",
    yearsLabel = "8 år i FT",
    quote = "Den beste følelsen er når verktøyet klikker på plass.",
    employeeId = "FT-N-014",
    photo: src = null,
  } = data;
  const children =
    `<div style="background:#fff;border-radius:${H * 0.014}px;border:1.5px solid rgba(15,17,21,0.15);` +
    `padding:${H * 0.04}px;flex:1;box-shadow:0 12px 32px rgba(15,17,21,0.08);` +
    `display:grid;grid-template-columns:auto 1fr;gap:${H * 0.04}px;position:relative;z-index:1;">` +
    photo({ W: H * 0.5, src, dark: false, tag: "Portrett", radius: H * 0.008 }) +
    `<div style="display:flex;flex-direction:column;justify-content:center;gap:${H * 0.012}px;">` +
    `<div style="display:flex;justify-content:space-between;align-items:baseline;` +
    `border-bottom:2px solid rgba(15,17,21,0.85);padding-bottom:${H * 0.012}px;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${H * 0.022}px;color:${FT.red};` +
    `letter-spacing:0.22em;">EMPLOYEE · ${escapeHtml(employeeId)}</div>` +
    `<div style="font-family:${MONO};font-size:${H * 0.02}px;color:rgba(15,17,21,0.5);">${escapeHtml(yearsLabel)}</div>` +
    `</div>` +
    `<div style="font-weight:800;font-size:${H * 0.06}px;color:${FT.ink};text-transform:uppercase;` +
    `line-height:1;">${escapeHtml(name)}</div>` +
    `<div style="font-weight:800;font-size:${H * 0.032}px;color:${FT.red};">${escapeHtml(role)}</div>` +
    `<div style="font-style:italic;font-weight:700;font-size:${H * 0.028}px;color:${FT.ink};` +
    `line-height:1.3;margin-top:${H * 0.014}px;">` +
    `<span style="color:${FT.red};font-size:1.4em;font-style:normal;line-height:0;">“</span> ${escapeHtml(quote)}</div>` +
    `</div>` +
    `</div>`;
  return frame({ W, H, bg: "cream", decor: "corners", pad: H * 0.06, children });
}

// =============================================================================
// Font-face block (for full-bleed maler som ikke bruker frame())
// =============================================================================

function fontFaceBlock(): string {
  return fontFaceCss();
}
