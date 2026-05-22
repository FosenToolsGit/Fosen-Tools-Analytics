/**
 * Innleggsmaler — gruppe 4: SITAT (kundesitat) + MILEPÆL (jubileums-tall).
 *
 * Portert 1:1 fra Claude Design-kilden (`innlegg-maler-stories2.jsx`,
 * `innlegg-maler-c.jsx`, `innlegg-maler-li.jsx`). Hver mal i 3 visuelle
 * retninger (A/B/C) + egne landscape-layouts (LI). Bygger HTML-strenger
 * som rendres deterministisk til PNG via `frame()` + Playwright.
 */

import {
  FT,
  MONO,
  mutedFor,
  escapeHtml,
  aspectOf,
  DecorVariant,
  wordmark,
  wordmarkImg,
  rule,
  eyebrow,
  frame,
} from "./core";

// =============================================================================
// Data-modeller
// =============================================================================

export interface SitatData {
  quote?: string;
  name?: string;
  role?: string;
  company?: string;
  photo?: string | null;
}

export interface MilepaelData {
  brand?: string;
  number?: string;
  unit?: string;
  headline?: string;
  subhead?: string;
  timeline?: { year: string; label: string }[];
  certNo?: string;
}

// =============================================================================
// LI scale-helper (speiler `S(H)` i innlegg-maler-li.jsx)
// =============================================================================

interface SScale {
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

function S(H: number): SScale {
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
// Felles footer-rad for LI (speiler `FooterRow` i innlegg-maler-li.jsx)
// =============================================================================

function footerRow(
  W: number,
  H: number,
  opts: {
    url?: string;
    dark?: boolean;
    ink?: boolean;
    italic?: string;
    wordmarkOnly?: boolean;
    monoLabel?: string;
  } = {}
): string {
  const s = S(H);
  const { url, ink = false, italic, monoLabel } = opts;
  const wmVariant: "white" | "ink" = ink ? "ink" : "white";
  const left =
    `<div style="display:flex;align-items:center;gap:${s.gapXs * 1.5}px;flex:1;">` +
    (url
      ? `<div style="padding:${s.gapXs * 0.5}px ${s.gapXs * 1.4}px;` +
        `border:1.5px solid ${ink ? "rgba(15,17,21,0.4)" : "rgba(255,255,255,0.5)"};border-radius:999px;` +
        `font-weight:700;font-size:${s.bodyXs}px;">${escapeHtml(url)}</div>`
      : "") +
    (italic
      ? `<div style="font-style:italic;font-size:${s.bodyXs}px;` +
        `color:${ink ? "rgba(15,17,21,0.6)" : mutedFor("ink")};">${escapeHtml(italic)}</div>`
      : "") +
    (monoLabel
      ? `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.75}px;letter-spacing:0.18em;` +
        `color:${ink ? "rgba(15,17,21,0.55)" : mutedFor("ink")};">${escapeHtml(monoLabel)}</div>`
      : "") +
    `</div>`;
  return (
    `<div style="margin-top:${s.gapXs}px;display:flex;align-items:center;justify-content:space-between;` +
    `position:relative;z-index:1;gap:${s.gap}px;">` +
    left +
    wordmarkImg(wmVariant, { height: H * 0.05 }) +
    `</div>`
  );
}

// =============================================================================
// 11A. SITAT — Rød full-bleed kundesitat (FT-rød)
// =============================================================================

export function sitatA(W: number, H: number, data: SitatData): string {
  if (aspectOf(W, H) === "li") return sitatALI(W, H, data);
  const {
    quote = "Fosen Tools leverer en standard vi ikke finner andre steder. HDFI-løsningene deres har endret hvordan vi jobber.",
    name = "Kari Hansen",
    role = "Verkstedsleder",
    company = "Lufttransport AS",
  } = data;
  const decor: DecorVariant = "corners";
  return frame({
    W,
    H,
    bg: "red",
    decor,
    pad: W * 0.06,
    children:
      `<div style="position:relative;z-index:1;">` +
      `<div style="font-weight:800;font-size:${W * 0.18}px;line-height:0.7;` +
      `color:rgba(15,17,21,0.45);font-family:Manrope, serif;">&ldquo;</div>` +
      `</div>` +
      `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:1;">` +
      `<div style="font-weight:800;font-size:${W * 0.052}px;color:#fff;line-height:1.18;` +
      `letter-spacing:-0.01em;text-wrap:pretty;">${escapeHtml(quote)}</div>` +
      `<div style="display:flex;align-items:center;gap:${W * 0.018}px;margin-top:${W * 0.032}px;">` +
      `<div style="width:${W * 0.04}px;height:2px;background:${FT.ink};"></div>` +
      `<div style="font-size:${W * 0.022}px;font-weight:700;color:#fff;">` +
      `${escapeHtml(name)} · ${escapeHtml(role)} · ${escapeHtml(company)}</div>` +
      `</div>` +
      `</div>` +
      `<div style="margin-top:${W * 0.022}px;position:relative;z-index:1;` +
      `display:flex;justify-content:center;">` +
      wordmarkImg("white", { width: W * 0.14 }) +
      `</div>`,
  });
}

function sitatALI(W: number, H: number, data: SitatData): string {
  const {
    quote = "Fosen Tools leverer en standard vi ikke finner andre steder. HDFI-løsningene deres har endret hvordan vi jobber.",
    name = "Kari Hansen",
    role = "Verkstedsleder",
    company = "Lufttransport AS",
  } = data;
  const s = S(H);
  const decor: DecorVariant = "corners";
  return frame({
    W,
    H,
    bg: "red",
    decor,
    pad: s.pad,
    children:
      `<div style="position:relative;z-index:1;display:grid;grid-template-columns:0.3fr 1fr;` +
      `gap:${s.gap}px;flex:1;align-items:center;">` +
      `<div style="font-weight:800;font-size:${H * 0.32}px;line-height:0.6;` +
      `color:rgba(15,17,21,0.45);font-family:Manrope, serif;text-align:right;">&ldquo;</div>` +
      `<div>` +
      `<div style="font-weight:800;font-size:${s.h3}px;color:#fff;line-height:1.2;` +
      `letter-spacing:-0.01em;text-wrap:pretty;">${escapeHtml(quote)}</div>` +
      `<div style="display:flex;align-items:center;gap:${s.gapXs}px;margin-top:${s.gapSm}px;">` +
      `<div style="width:${H * 0.04}px;height:2px;background:${FT.ink};"></div>` +
      `<div style="font-size:${s.bodyXs}px;font-weight:700;color:#fff;">` +
      `${escapeHtml(name)} · ${escapeHtml(role)} · ${escapeHtml(company)}</div>` +
      `</div>` +
      `</div>` +
      `</div>` +
      `<div style="display:flex;justify-content:center;position:relative;z-index:1;">` +
      wordmarkImg("white", { height: H * 0.05 }) +
      `</div>`,
  });
}

// =============================================================================
// 11B. SITAT — Krem editorial, sitat med foto, ramme rundt
// =============================================================================

export function sitatB(W: number, H: number, data: SitatData): string {
  if (aspectOf(W, H) === "li") return sitatBLI(W, H, data);
  const {
    quote = "Fosen Tools leverer en standard vi ikke finner andre steder. HDFI-løsningene deres har endret hvordan vi jobber.",
    name = "Kari Hansen",
    role = "Verkstedsleder",
    company = "Lufttransport AS",
    photo = null,
  } = data;
  const decor: DecorVariant = "rulers";
  const photoInner = photo
    ? `<img src="${escapeHtml(photo)}" alt="" style="width:100%;height:100%;object-fit:cover;"/>`
    : `<div style="width:100%;height:100%;background:repeating-linear-gradient(135deg,` +
      `rgba(15,17,21,0.04) 0 14px,rgba(15,17,21,0.08) 14px 28px);` +
      `display:flex;align-items:center;justify-content:center;">` +
      `<div style="font-family:${MONO};font-size:${W * 0.018}px;font-weight:500;` +
      `letter-spacing:0.12em;text-transform:uppercase;color:rgba(15,17,21,0.42);` +
      `padding:8px 14px;border:1px dashed rgba(15,17,21,0.32);border-radius:4px;">` +
      `Portrett · sitat</div></div>`;
  return frame({
    W,
    H,
    bg: "cream",
    decor,
    pad: W * 0.05,
    children:
      `<div style="flex:1;display:grid;grid-template-columns:0.85fr 1.3fr;gap:${W * 0.035}px;` +
      `align-items:center;position:relative;z-index:1;">` +
      `<div style="position:relative;aspect-ratio:4/5;max-height:${H * 0.7}px;">` +
      `<div style="width:100%;height:100%;border-radius:${W * 0.014}px;overflow:hidden;position:relative;">` +
      photoInner +
      `</div>` +
      `</div>` +
      `<div style="display:flex;flex-direction:column;gap:${W * 0.014}px;">` +
      `<div style="font-weight:800;font-size:${W * 0.16}px;line-height:0.6;color:${FT.red};` +
      `font-family:Manrope, serif;height:${W * 0.1}px;">&ldquo;</div>` +
      `<div style="font-weight:700;font-style:italic;font-size:${W * 0.034}px;color:${FT.ink};` +
      `line-height:1.28;letter-spacing:-0.005em;text-wrap:pretty;">${escapeHtml(quote)}</div>` +
      `<div style="margin-top:${W * 0.018}px;padding-top:${W * 0.018}px;` +
      `border-top:2px solid rgba(15,17,21,0.18);display:flex;flex-direction:column;">` +
      `<div style="font-weight:800;font-size:${W * 0.024}px;color:${FT.ink};` +
      `text-transform:uppercase;letter-spacing:0.005em;">${escapeHtml(name)}</div>` +
      `<div style="font-weight:600;font-size:${W * 0.018}px;color:rgba(15,17,21,0.65);` +
      `margin-top:${W * 0.002}px;">${escapeHtml(role)} · ${escapeHtml(company)}</div>` +
      `</div>` +
      `</div>` +
      `</div>` +
      `<div style="margin-top:${W * 0.022}px;display:flex;align-items:center;` +
      `justify-content:space-between;position:relative;z-index:1;">` +
      `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:rgba(15,17,21,0.55);` +
      `letter-spacing:0.18em;">KUNDESITAT · 2026</div>` +
      wordmarkImg("ink", { width: W * 0.13 }) +
      `</div>`,
  });
}

function sitatBLI(W: number, H: number, data: SitatData): string {
  const {
    quote = "Fosen Tools leverer en standard vi ikke finner andre steder. HDFI-løsningene deres har endret hvordan vi jobber.",
    name = "Kari Hansen",
    role = "Verkstedsleder",
    company = "Lufttransport AS",
    photo = null,
  } = data;
  const s = S(H);
  const decor: DecorVariant = "rulers";
  const pw = W * 0.25;
  const photoInner = photo
    ? `<img src="${escapeHtml(photo)}" alt="" style="width:100%;height:100%;object-fit:cover;"/>`
    : `<div style="width:100%;height:100%;background:repeating-linear-gradient(135deg,` +
      `rgba(15,17,21,0.04) 0 14px,rgba(15,17,21,0.08) 14px 28px);` +
      `display:flex;align-items:center;justify-content:center;">` +
      `<div style="font-family:${MONO};font-size:${pw * 0.018}px;font-weight:500;` +
      `letter-spacing:0.12em;text-transform:uppercase;color:rgba(15,17,21,0.42);` +
      `padding:8px 14px;border:1px dashed rgba(15,17,21,0.32);border-radius:4px;">` +
      `Portrett · sitat</div></div>`;
  return frame({
    W,
    H,
    bg: "cream",
    decor,
    pad: s.pad,
    children:
      `<div style="display:grid;grid-template-columns:0.6fr 1.4fr;gap:${s.gap}px;flex:1;` +
      `position:relative;z-index:1;align-items:center;">` +
      `<div style="width:100%;height:100%;border-radius:${s.radius * 0.4}px;overflow:hidden;position:relative;">` +
      photoInner +
      `</div>` +
      `<div style="display:flex;flex-direction:column;gap:${s.gapXs * 0.5}px;">` +
      `<div style="font-weight:800;font-size:${H * 0.18}px;line-height:0.6;color:${FT.red};` +
      `font-family:Manrope, serif;height:${H * 0.1}px;">&ldquo;</div>` +
      `<div style="font-weight:700;font-style:italic;font-size:${s.h4}px;color:${FT.ink};` +
      `line-height:1.25;text-wrap:pretty;">${escapeHtml(quote)}</div>` +
      `<div style="margin-top:${s.gapXs}px;padding-top:${s.gapXs}px;` +
      `border-top:2px solid rgba(15,17,21,0.18);">` +
      `<div style="font-weight:800;font-size:${s.h4}px;color:${FT.ink};` +
      `text-transform:uppercase;">${escapeHtml(name)}</div>` +
      `<div style="font-weight:600;font-size:${s.bodyXs}px;color:rgba(15,17,21,0.65);` +
      `margin-top:${s.gapXs * 0.15}px;">${escapeHtml(role)} · ${escapeHtml(company)}</div>` +
      `</div>` +
      `</div>` +
      `</div>` +
      footerRow(W, H, { ink: true, monoLabel: "KUNDESITAT · 2026" }),
  });
}

// =============================================================================
// 11C. SITAT — Stort type-forward pull-quote
// =============================================================================

export function sitatC(W: number, H: number, data: SitatData): string {
  if (aspectOf(W, H) === "li") return sitatCLI(W, H, data);
  const {
    quote = "Fosen Tools leverer en standard vi ikke finner andre steder.",
    name = "Kari Hansen",
    role = "Verkstedsleder",
    company = "Lufttransport AS",
  } = data;
  const decor: DecorVariant = "rulers";
  return frame({
    W,
    H,
    bg: "ink",
    decor,
    pad: W * 0.07,
    children:
      `<div style="position:relative;z-index:1;flex:1;display:flex;flex-direction:column;justify-content:center;">` +
      `<div style="font-weight:800;font-size:${W * 0.32}px;color:${FT.red};line-height:0.7;` +
      `font-family:Manrope, serif;position:absolute;top:${-W * 0.04}px;left:${-W * 0.02}px;opacity:0.95;">&ldquo;</div>` +
      `<div style="font-weight:800;font-size:${W * 0.054}px;line-height:1.18;color:#fff;` +
      `letter-spacing:-0.01em;text-wrap:pretty;margin-top:${W * 0.06}px;position:relative;z-index:2;">` +
      `${escapeHtml(quote)}</div>` +
      `<div style="margin-top:${W * 0.04}px;position:relative;z-index:2;">` +
      `<div style="display:flex;align-items:center;gap:${W * 0.014}px;">` +
      `<div style="width:${W * 0.05}px;height:2px;background:${FT.red};"></div>` +
      `<div style="font-weight:800;font-size:${W * 0.024}px;color:#fff;text-transform:uppercase;">` +
      `${escapeHtml(name)}</div>` +
      `</div>` +
      `<div style="font-size:${W * 0.02}px;color:rgba(255,255,255,0.65);` +
      `margin-top:${W * 0.006}px;margin-left:${W * 0.07}px;">${escapeHtml(role)} · ${escapeHtml(company)}</div>` +
      `</div>` +
      `</div>` +
      `<div style="margin-top:${W * 0.022}px;display:flex;justify-content:space-between;align-items:center;` +
      `position:relative;z-index:1;border-top:1px solid rgba(255,255,255,0.18);padding-top:${W * 0.014}px;">` +
      `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.016}px;` +
      `color:rgba(255,255,255,0.6);letter-spacing:0.18em;text-transform:uppercase;">REFERANSE · 2026</div>` +
      wordmarkImg("white", { width: W * 0.12 }) +
      `</div>`,
  });
}

function sitatCLI(W: number, H: number, data: SitatData): string {
  const {
    quote = "Fosen Tools leverer en standard vi ikke finner andre steder.",
    name = "Kari Hansen",
    role = "Verkstedsleder",
    company = "Lufttransport AS",
  } = data;
  const decor: DecorVariant = "rulers";
  return frame({
    W,
    H,
    bg: "ink",
    decor,
    pad: H * 0.08,
    children:
      `<div style="position:relative;z-index:1;flex:1;display:flex;flex-direction:column;justify-content:center;">` +
      `<div style="font-weight:800;font-size:${H * 0.4}px;color:${FT.red};line-height:0.6;` +
      `font-family:Manrope, serif;position:absolute;top:${-H * 0.04}px;left:${-H * 0.02}px;opacity:0.95;">&ldquo;</div>` +
      `<div style="font-weight:800;font-size:${H * 0.072}px;line-height:1.2;color:#fff;` +
      `letter-spacing:-0.01em;text-wrap:pretty;margin-top:${H * 0.04}px;position:relative;z-index:2;max-width:88%;">` +
      `${escapeHtml(quote)}</div>` +
      `<div style="margin-top:${H * 0.04}px;display:flex;align-items:center;gap:${H * 0.024}px;` +
      `position:relative;z-index:2;">` +
      `<div style="width:${H * 0.06}px;height:2px;background:${FT.red};"></div>` +
      `<div>` +
      `<div style="font-weight:800;font-size:${H * 0.03}px;color:#fff;text-transform:uppercase;">` +
      `${escapeHtml(name)}</div>` +
      `<div style="font-size:${H * 0.022}px;color:rgba(255,255,255,0.65);">` +
      `${escapeHtml(role)} · ${escapeHtml(company)}</div>` +
      `</div>` +
      `</div>` +
      `</div>` +
      footerRow(W, H, { dark: true, monoLabel: "REFERANSE · 2026" }),
  });
}

// =============================================================================
// 12A. MILEPÆL — Gulltall sentrert (FT-standard refined)
// =============================================================================

export function milepaelA(W: number, H: number, data: MilepaelData): string {
  if (aspectOf(W, H) === "li") return milepaelALI(W, H, data);
  const {
    brand = "FOSEN TOOLS",
    number = "25",
    unit = "år",
    headline = "Et kvart århundre med verktøyløsninger",
    subhead = "Siden 2001 — del av et familiekonsern med 100 år bak seg.",
  } = data;
  const goldGradient = `linear-gradient(180deg, ${FT.goldTop} 0%, ${FT.goldBottom} 100%)`;
  const decor: DecorVariant = "full";
  return frame({
    W,
    H,
    bg: "ink",
    decor,
    pad: W * 0.05,
    children:
      `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;` +
      `text-align:center;position:relative;z-index:1;gap:${W * 0.012}px;">` +
      `<div style="font-weight:800;font-size:${W * 0.024}px;letter-spacing:0.22em;` +
      `color:${FT.red};text-transform:uppercase;">${escapeHtml(brand)}</div>` +
      `<div style="display:flex;align-items:flex-end;gap:${W * 0.012}px;line-height:0.85;` +
      `margin-top:${W * 0.018}px;">` +
      `<span style="font-weight:800;font-size:${W * 0.36}px;background:${goldGradient};` +
      `-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;` +
      `color:transparent;letter-spacing:-0.04em;">${escapeHtml(number)}</span>` +
      `<span style="font-weight:800;font-size:${W * 0.066}px;color:#fff;font-style:italic;` +
      `padding-bottom:${W * 0.024}px;">${escapeHtml(unit)}</span>` +
      `</div>` +
      rule({ color: FT.red, width: W * 0.08, style: `margin-top:${W * 0.024}px;` }) +
      `<div style="font-weight:800;font-size:${W * 0.038}px;color:#fff;text-transform:uppercase;` +
      `line-height:1.1;margin-top:${W * 0.024}px;letter-spacing:-0.005em;max-width:85%;text-wrap:balance;">` +
      `${escapeHtml(headline)}</div>` +
      `<div style="font-size:${W * 0.02}px;color:${mutedFor("ink")};` +
      `margin-top:${W * 0.014}px;max-width:80%;">${escapeHtml(subhead)}</div>` +
      `</div>` +
      `<div style="margin-top:${W * 0.018}px;position:relative;z-index:1;">` +
      wordmark("ink", W) +
      `</div>`,
  });
}

function milepaelALI(W: number, H: number, data: MilepaelData): string {
  const {
    brand = "FOSEN TOOLS",
    number = "25",
    unit = "år",
    headline = "Et kvart århundre med verktøyløsninger",
    subhead = "Siden 2001 — del av et familiekonsern med 100 år bak seg.",
  } = data;
  const gold = `linear-gradient(180deg, ${FT.goldTop} 0%, ${FT.goldBottom} 100%)`;
  const s = S(H);
  const decor: DecorVariant = "full";
  return frame({
    W,
    H,
    bg: "ink",
    decor,
    pad: s.pad,
    children:
      `<div style="flex:1;display:grid;grid-template-columns:auto 1fr;gap:${s.gap}px;` +
      `align-items:center;position:relative;z-index:1;">` +
      `<div style="display:flex;align-items:flex-end;gap:${s.gapXs * 0.5}px;line-height:0.85;">` +
      `<span style="font-weight:800;font-size:${s.bigNum}px;background:${gold};` +
      `-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;` +
      `letter-spacing:-0.04em;">${escapeHtml(number)}</span>` +
      `<span style="font-weight:800;font-size:${s.h2}px;color:#fff;font-style:italic;` +
      `padding-bottom:${H * 0.03}px;">${escapeHtml(unit)}</span>` +
      `</div>` +
      `<div style="display:flex;flex-direction:column;gap:${s.gapXs * 0.4}px;">` +
      `<div style="font-weight:800;font-size:${s.bodyXs}px;letter-spacing:0.22em;` +
      `color:${FT.red};text-transform:uppercase;">${escapeHtml(brand)}</div>` +
      rule({ color: FT.red, width: W * 0.05 }) +
      `<div style="font-weight:800;font-size:${s.h3}px;color:#fff;text-transform:uppercase;` +
      `line-height:1.1;margin-top:${s.gapXs * 0.3}px;text-wrap:balance;">${escapeHtml(headline)}</div>` +
      `<div style="font-size:${s.bodyXs}px;color:${mutedFor("ink")};` +
      `margin-top:${s.gapXs * 0.3}px;line-height:1.45;">${escapeHtml(subhead)}</div>` +
      `</div>` +
      `</div>` +
      footerRow(W, H, { dark: true, wordmarkOnly: true }),
  });
}

// =============================================================================
// 12B. MILEPÆL — Tidslinje + foto-strip
// =============================================================================

export function milepaelB(W: number, H: number, data: MilepaelData): string {
  if (aspectOf(W, H) === "li") return milepaelBLI(W, H, data);
  const {
    brand = "FOSEN TOOLS",
    number = "25",
    unit = "år",
    headline = "1 verksted. 25 år. Tusenvis av løsninger.",
    timeline = [
      { year: "2001", label: "Etablert i Brekstad" },
      { year: "2008", label: "Første HDFI-leveranse til Forsvaret" },
      { year: "2018", label: "CADLAB åpner — eget designteam" },
      { year: "2026", label: "25 år — fortsatt familieeid" },
    ],
  } = data;
  const goldGradient = `linear-gradient(180deg, ${FT.goldTop} 0%, ${FT.goldBottom} 100%)`;
  const decor: DecorVariant = "rulers";
  return frame({
    W,
    H,
    bg: "ink",
    decor,
    pad: W * 0.045,
    children:
      `<div style="display:grid;grid-template-columns:auto 1fr;gap:${W * 0.04}px;flex:1;` +
      `position:relative;z-index:1;align-items:center;">` +
      `<div style="display:flex;flex-direction:column;gap:${W * 0.01}px;">` +
      `<div style="font-weight:800;font-size:${W * 0.02}px;letter-spacing:0.22em;` +
      `color:${FT.red};text-transform:uppercase;">${escapeHtml(brand)}</div>` +
      `<div style="display:flex;align-items:flex-end;gap:${W * 0.008}px;line-height:0.85;">` +
      `<span style="font-weight:800;font-size:${W * 0.28}px;background:${goldGradient};` +
      `-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;` +
      `color:transparent;letter-spacing:-0.04em;">${escapeHtml(number)}</span>` +
      `<span style="font-weight:800;font-size:${W * 0.052}px;color:#fff;font-style:italic;` +
      `padding-bottom:${W * 0.018}px;">${escapeHtml(unit)}</span>` +
      `</div>` +
      rule({ color: FT.red, width: W * 0.05, style: `margin-top:${W * 0.006}px;` }) +
      `<div style="font-weight:800;font-size:${W * 0.028}px;color:#fff;text-transform:uppercase;` +
      `line-height:1.1;max-width:${W * 0.38}px;margin-top:${W * 0.012}px;letter-spacing:-0.005em;">` +
      `${escapeHtml(headline)}</div>` +
      `</div>` +
      `<div style="position:relative;padding-left:${W * 0.024}px;` +
      `border-left:2px solid rgba(255,255,255,0.18);">` +
      timeline
        .map(
          (item) =>
            `<div style="position:relative;padding-bottom:${W * 0.024}px;padding-left:${W * 0.018}px;">` +
            `<div style="position:absolute;left:${-W * 0.024 - W * 0.011}px;top:0;` +
            `width:${W * 0.022}px;height:${W * 0.022}px;border-radius:50%;` +
            `background:${FT.red};border:3px solid #fff;box-shadow:0 0 0 2px rgba(237,28,36,0.4);"></div>` +
            `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.022}px;` +
            `color:${FT.burstYellow};letter-spacing:0.04em;">${escapeHtml(item.year)}</div>` +
            `<div style="font-weight:700;font-size:${W * 0.02}px;color:#fff;` +
            `margin-top:${W * 0.004}px;line-height:1.35;">${escapeHtml(item.label)}</div>` +
            `</div>`
        )
        .join("") +
      `</div>` +
      `</div>` +
      `<div style="margin-top:${W * 0.018}px;display:flex;align-items:center;` +
      `justify-content:space-between;position:relative;z-index:1;">` +
      `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:${mutedFor("ink")};` +
      `letter-spacing:0.18em;">EST. 2001 · BREKSTAD</div>` +
      wordmark("ink", W) +
      `</div>`,
  });
}

function milepaelBLI(W: number, H: number, data: MilepaelData): string {
  const {
    brand = "FOSEN TOOLS",
    number = "25",
    unit = "år",
    headline = "25 år. Tusenvis av løsninger.",
    timeline = [
      { year: "2001", label: "Etablert" },
      { year: "2008", label: "Forsvarsleveranse" },
      { year: "2018", label: "CADLAB åpner" },
      { year: "2026", label: "25 år" },
    ],
  } = data;
  const gold = `linear-gradient(180deg, ${FT.goldTop} 0%, ${FT.goldBottom} 100%)`;
  const s = S(H);
  const decor: DecorVariant = "rulers";
  return frame({
    W,
    H,
    bg: "ink",
    decor,
    pad: s.pad,
    children:
      `<div style="position:relative;z-index:1;display:flex;align-items:center;gap:${s.gap}px;">` +
      `<div style="display:flex;align-items:flex-end;gap:${s.gapXs * 0.4}px;line-height:0.85;">` +
      `<span style="font-weight:800;font-size:${s.bigNum * 0.7}px;background:${gold};` +
      `-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;` +
      `letter-spacing:-0.04em;">${escapeHtml(number)}</span>` +
      `<span style="font-weight:800;font-size:${s.h3}px;color:#fff;font-style:italic;` +
      `padding-bottom:${H * 0.02}px;">${escapeHtml(unit)}</span>` +
      `</div>` +
      `<div>` +
      `<div style="font-weight:800;font-size:${s.bodyXs}px;letter-spacing:0.22em;` +
      `color:${FT.red};text-transform:uppercase;">${escapeHtml(brand)}</div>` +
      `<div style="font-weight:800;font-size:${s.h3}px;color:#fff;text-transform:uppercase;` +
      `line-height:1.05;margin-top:${s.gapXs * 0.3}px;letter-spacing:-0.005em;">${escapeHtml(headline)}</div>` +
      `</div>` +
      `</div>` +
      `<div style="flex:1;margin-top:${s.gapSm}px;display:grid;grid-template-columns:repeat(4,1fr);` +
      `gap:${s.gapSm}px;position:relative;z-index:1;align-items:center;">` +
      `<div style="position:absolute;left:0;right:0;top:30%;height:2px;background:rgba(255,255,255,0.18);"></div>` +
      timeline
        .map(
          (item) =>
            `<div style="display:flex;flex-direction:column;align-items:center;gap:${s.gapXs * 0.3}px;` +
            `position:relative;z-index:1;">` +
            `<div style="width:${H * 0.04}px;height:${H * 0.04}px;border-radius:50%;` +
            `background:${FT.red};border:3px solid #fff;box-shadow:0 0 0 2px rgba(237,28,36,0.4);"></div>` +
            `<div style="font-family:${MONO};font-weight:700;font-size:${s.bodySm}px;` +
            `color:${FT.burstYellow};letter-spacing:0.04em;margin-top:${s.gapXs * 0.4}px;">` +
            `${escapeHtml(item.year)}</div>` +
            `<div style="font-weight:700;font-size:${s.bodyXs * 0.9}px;color:#fff;` +
            `text-align:center;line-height:1.3;">${escapeHtml(item.label)}</div>` +
            `</div>`
        )
        .join("") +
      `</div>` +
      footerRow(W, H, { dark: true, monoLabel: "EST. 2001 · BREKSTAD" }),
  });
}

// =============================================================================
// 12C. MILEPÆL — Industrielt sertifikat
// =============================================================================

export function milepaelC(W: number, H: number, data: MilepaelData): string {
  if (aspectOf(W, H) === "li") return milepaelCLI(W, H, data);
  const {
    brand = "FOSEN TOOLS",
    number = "25",
    unit = "år",
    headline = "Et kvart århundre med verktøyløsninger",
    subhead = "Siden 2001. Del av et familiekonsern med 100 år bak seg.",
    certNo = "FT-25-2026",
  } = data;
  const gold = `linear-gradient(180deg, ${FT.goldTop} 0%, ${FT.goldBottom} 100%)`;
  const decor: DecorVariant = "corners";
  return frame({
    W,
    H,
    bg: "inkDeep",
    decor,
    pad: W * 0.06,
    children:
      `<div style="position:relative;z-index:1;border:3px double rgba(219,183,139,0.45);` +
      `padding:${W * 0.04}px;flex:1;display:flex;flex-direction:column;justify-content:space-between;` +
      `align-items:center;text-align:center;">` +
      `<div style="display:flex;justify-content:space-between;width:100%;">` +
      `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.014}px;` +
      `color:#DBB78B;letter-spacing:0.22em;text-transform:uppercase;">JUBILEUM · ${escapeHtml(certNo)}</div>` +
      `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:rgba(255,255,255,0.5);` +
      `letter-spacing:0.16em;">2001 → 2026</div>` +
      `</div>` +
      `<div style="display:flex;flex-direction:column;align-items:center;gap:${W * 0.014}px;">` +
      `<div style="font-weight:800;font-size:${W * 0.024}px;color:${FT.red};` +
      `letter-spacing:0.22em;text-transform:uppercase;">${escapeHtml(brand)}</div>` +
      `<div style="display:flex;align-items:flex-end;gap:${W * 0.014}px;line-height:0.85;">` +
      `<span style="font-weight:800;font-size:${W * 0.36}px;background:${gold};` +
      `-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;` +
      `letter-spacing:-0.04em;">${escapeHtml(number)}</span>` +
      `<span style="font-weight:800;font-size:${W * 0.066}px;color:#DBB78B;font-style:italic;` +
      `padding-bottom:${W * 0.024}px;">${escapeHtml(unit)}</span>` +
      `</div>` +
      rule({ color: "#DBB78B", width: W * 0.1, height: 2, style: `margin-top:${W * 0.014}px;` }) +
      `<div style="font-weight:800;font-size:${W * 0.032}px;color:#fff;text-transform:uppercase;` +
      `line-height:1.1;max-width:85%;margin-top:${W * 0.018}px;letter-spacing:-0.005em;">` +
      `${escapeHtml(headline)}</div>` +
      `<div style="font-size:${W * 0.018}px;color:rgba(255,255,255,0.6);max-width:80%;">` +
      `${escapeHtml(subhead)}</div>` +
      `</div>` +
      `<div style="display:flex;justify-content:space-between;align-items:center;width:100%;">` +
      `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:rgba(255,255,255,0.45);` +
      `letter-spacing:0.16em;text-transform:uppercase;">BREKSTAD · NORGE</div>` +
      wordmarkImg("white", { width: W * 0.12 }) +
      `</div>` +
      `</div>`,
  });
}

function milepaelCLI(W: number, H: number, data: MilepaelData): string {
  const {
    brand = "FOSEN TOOLS",
    number = "25",
    unit = "år",
    headline = "25 år med verktøyløsninger",
    certNo = "FT-25-2026",
  } = data;
  const gold = `linear-gradient(180deg, ${FT.goldTop} 0%, ${FT.goldBottom} 100%)`;
  const decor: DecorVariant = "corners";
  return frame({
    W,
    H,
    bg: "inkDeep",
    decor,
    pad: H * 0.07,
    children:
      `<div style="border:3px double rgba(219,183,139,0.45);padding:${H * 0.04}px;flex:1;` +
      `position:relative;z-index:1;display:grid;grid-template-columns:auto 1fr;gap:${H * 0.04}px;` +
      `align-items:center;">` +
      `<div style="display:flex;align-items:flex-end;gap:${H * 0.014}px;line-height:0.85;">` +
      `<span style="font-weight:800;font-size:${H * 0.36}px;background:${gold};` +
      `-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;` +
      `letter-spacing:-0.04em;">${escapeHtml(number)}</span>` +
      `<span style="font-weight:800;font-size:${H * 0.07}px;color:#DBB78B;font-style:italic;` +
      `padding-bottom:${H * 0.024}px;">${escapeHtml(unit)}</span>` +
      `</div>` +
      `<div style="display:flex;flex-direction:column;gap:${H * 0.012}px;">` +
      `<div style="font-family:${MONO};font-weight:700;font-size:${H * 0.022}px;` +
      `color:#DBB78B;letter-spacing:0.22em;text-transform:uppercase;">JUBILEUM · ${escapeHtml(certNo)}</div>` +
      `<div style="font-weight:800;font-size:${H * 0.024}px;color:${FT.red};` +
      `letter-spacing:0.22em;text-transform:uppercase;">${escapeHtml(brand)}</div>` +
      rule({ color: "#DBB78B", width: H * 0.1, height: 2 }) +
      `<div style="font-weight:800;font-size:${H * 0.045}px;color:#fff;text-transform:uppercase;` +
      `line-height:1.1;letter-spacing:-0.005em;margin-top:${H * 0.006}px;">${escapeHtml(headline)}</div>` +
      `<div style="font-family:${MONO};font-size:${H * 0.02}px;color:rgba(255,255,255,0.5);` +
      `letter-spacing:0.16em;margin-top:${H * 0.008}px;">2001 → 2026 · BREKSTAD</div>` +
      `</div>` +
      `</div>`,
  });
}

// Hold eyebrow-helperen referert (kan brukes av fremtidige milepael-varianter).
void eyebrow;
