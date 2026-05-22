import {
  FT,
  type Background,
  type AspectSlug,
  ASPECT_DIMS,
  escapeHtml,
  headlineHtml,
  accentFor,
  fgFor,
  decorSvgs,
  wordmarkBlock,
  jubileumLogoDataUrl,
  checkSvg,
  pinSvg,
  imageOrPlaceholder,
  fontFaceCss,
  backgroundCss,
  renderHtmlToPng,
} from "./render-common";

/**
 * Mal-bibliotek for Innleggsbygger — FT-tilstedeværelse-poster.
 *
 * 8 maler for å fremme produksjon, leveranser, besøk, messer, ansatte,
 * kundesitat, milepæler og partnere. Alt deterministisk HTML→PNG.
 *
 * Felles infrastruktur i render-common.ts. Hver mal her er en ren
 * template-funksjon — Claude Design kan polere CSS-en senere.
 */

// =============================================================================
// Datamodell — discriminated union på `mal`
// =============================================================================

interface MalBase {
  background?: Background;
  width: number;
  height: number;
  /**
   * Valgfritt bilde. Når satt bytter malen til foto-variant: bildet legges
   * som kolonne (landscape) eller toppband (portrett) og tekstinnholdet
   * flyttes inn ved siden av / under.
   */
  imageUrl?: string | null;
}

export interface MalProsess extends MalBase {
  mal: "prosess";
  eyebrow?: string | null;
  headline: string;
  redWord?: string | null;
  steps: { title: string; text: string }[];
  cta?: string | null;
}

export interface MalLeveranse extends MalBase {
  mal: "leveranse";
  eyebrow?: string | null;
  customer: string;
  headline: string;
  redWord?: string | null;
  description?: string | null;
  segment?: string | null;
  cta?: string | null;
}

export interface MalBesok extends MalBase {
  mal: "besok";
  eyebrow?: string | null;
  company: string;
  location?: string | null;
  description?: string | null;
  cta?: string | null;
}

export interface MalStand extends MalBase {
  mal: "stand";
  eyebrow?: string | null;
  eventName: string;
  redWord?: string | null;
  location: string;
  date: string;
  standNr?: string | null;
  description?: string | null;
  cta?: string | null;
}

export interface MalAnsatt extends MalBase {
  mal: "ansatt";
  eyebrow?: string | null;
  name: string;
  role: string;
  years?: string | null;
  funFact?: string | null;
  quote?: string | null;
}

export interface MalSitat extends MalBase {
  mal: "sitat";
  quote: string;
  attributionName: string;
  attributionRole?: string | null;
  attributionCompany?: string | null;
}

export interface MalMilepael extends MalBase {
  mal: "milepael";
  eyebrow?: string | null;
  number: string;
  unit?: string | null;
  headline?: string | null;
  body?: string | null;
}

export interface MalPartner extends MalBase {
  mal: "partner";
  eyebrow?: string | null;
  partnerName: string;
  partnerLogoUrl?: string | null;
  headline?: string | null;
  description?: string | null;
  cta?: string | null;
}

export type MalInput =
  | MalProsess
  | MalLeveranse
  | MalBesok
  | MalStand
  | MalAnsatt
  | MalSitat
  | MalMilepael
  | MalPartner;

export type MalType = MalInput["mal"];

// =============================================================================
// Felles CSS for alle maler
// =============================================================================

function commonCss(W: number, H: number, bg: Background): string {
  const fg = fgFor(bg);
  const accent = accentFor(bg);
  return `
  .eyebrow{font-weight:800;font-size:${W * 0.024}px;letter-spacing:0.22em;
    text-transform:uppercase;color:${accent};margin-bottom:${H * 0.014}px;}
  .headline{font-weight:800;line-height:1.07;letter-spacing:0.01em;text-transform:uppercase;}
  .accent{width:${W * 0.075}px;height:3px;background:${accent};margin:${H * 0.018}px 0;}
  .body-text{font-weight:400;line-height:1.5;color:${bg === "cream" ? "rgba(15,17,21,0.78)" : "rgba(255,255,255,0.85)"};}
  .cta{align-self:flex-start;width:fit-content;font-weight:800;font-size:${W * 0.024}px;
    letter-spacing:0.06em;color:${fg};
    border:1.6px solid ${bg === "cream" ? "rgba(15,17,21,0.5)" : "rgba(255,255,255,0.6)"};
    border-radius:999px;padding:${W * 0.013}px ${W * 0.042}px;text-transform:lowercase;}
  .main{flex:1;display:flex;flex-direction:column;min-height:0;}`;
}

// Felles bygge-blokker
function eyebrowEl(text: string | null | undefined): string {
  return text ? `<div class="eyebrow">${escapeHtml(text)}</div>` : "";
}
function ctaEl(text: string | null | undefined): string {
  return text
    ? `<div class="cta" style="margin-top:auto;">${escapeHtml(text)}</div>`
    : "";
}

/**
 * Felles ramme for alle maler. Uten bilde: tekstinnholdet fyller hele flaten.
 * Med bilde: foto-variant — bildet legges som kolonne (landscape) eller
 * toppband (portrett), tekstinnholdet flyttes ved siden av / under.
 *
 * `content` skal være et flex-column-innhold (frameMal pakker det i en
 * flex:1-kolonne). Wordmark-pillen legges alltid nederst.
 */
function frameMal(opts: {
  W: number;
  H: number;
  land: boolean;
  bg: Background;
  content: string;
  imageUrl?: string | null;
  imageLabel?: string;
}): string {
  const { W, H, land, bg, content, imageUrl } = opts;
  const wm = wordmarkBlock(W, bg);
  if (imageUrl) {
    const photo = `<div style="flex:0 0 ${land ? "44%" : "46%"};min-height:0;${
      land ? "" : `margin-bottom:${H * 0.032}px;`
    }display:flex;">${imageOrPlaceholder(
      imageUrl,
      W,
      opts.imageLabel ?? "Foto",
      "cover"
    )}</div>`;
    return `<div class="main" style="${
      land
        ? `flex-direction:row;align-items:stretch;gap:${W * 0.045}px;`
        : ""
    }">
      ${photo}
      <div style="flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;">${content}</div>
    </div>${wm}`;
  }
  return `<div class="main">${content}</div>${wm}`;
}

/** Tekst-skala — krymper hovedtekst litt i foto-variant (smalere spalte). */
function textScale(hasImage: boolean): number {
  return hasImage ? 0.82 : 1;
}

// =============================================================================
// Mal 1 — Prosess/produksjon
// =============================================================================

function renderProsess(m: MalProsess, W: number, H: number, land: boolean): string {
  const bg = m.background ?? "ink";
  const accent = accentFor(bg);
  const hasImg = !!m.imageUrl;
  const k = textScale(hasImg);
  const steps = m.steps.slice(0, 5);
  const stepFont = (land ? W * 0.018 : W * 0.024) * (hasImg ? 0.92 : 1);
  const stepTitleFont = (land ? W * 0.022 : W * 0.028) * (hasImg ? 0.92 : 1);
  const numSize = W * 0.05 * (hasImg ? 0.85 : 1);
  const stepsHtml = steps
    .map(
      (s, i) => `<div class="step">
      <div class="step-num" style="width:${numSize}px;height:${numSize}px;
        font-size:${numSize * 0.46}px;background:${accent};">${i + 1}</div>
      <div class="step-body">
        <div class="step-title" style="font-size:${stepTitleFont}px;">${escapeHtml(s.title)}</div>
        <div class="step-text body-text" style="font-size:${stepFont}px;">${escapeHtml(s.text)}</div>
      </div>
    </div>`
    )
    .join("");
  const content = `${eyebrowEl(m.eyebrow)}
    <div class="headline" style="font-size:${(land ? W * 0.044 : W * 0.062) * k}px;">
      ${headlineHtml(m.headline, m.redWord)}</div>
    <div class="accent"></div>
    <div style="display:flex;flex-direction:column;gap:${H * 0.018}px;
      justify-content:center;flex:1;margin:${H * 0.022}px 0;">${stepsHtml}</div>
    ${ctaEl(m.cta)}
    <style>
      .step{display:flex;gap:${W * 0.022}px;align-items:flex-start;}
      .step-num{flex:0 0 auto;border-radius:50%;color:#fff;font-weight:800;
        display:flex;align-items:center;justify-content:center;}
      .step-body{flex:1;min-width:0;}
      .step-title{font-weight:800;text-transform:uppercase;letter-spacing:0.01em;}
      .step-text{margin-top:${H * 0.005}px;}
    </style>`;
  return frameMal({ W, H, land, bg, content, imageUrl: m.imageUrl, imageLabel: "Prosessfoto" });
}

// =============================================================================
// Mal 2 — Leveranse til kunde
// =============================================================================

function renderLeveranse(m: MalLeveranse, W: number, H: number, land: boolean): string {
  const bg = m.background ?? "ink";
  const accent = accentFor(bg);
  const k = textScale(!!m.imageUrl);
  const content = `${eyebrowEl(m.eyebrow ?? "Levert")}
    <div class="headline" style="font-size:${(land ? W * 0.04 : W * 0.056) * k}px;">
      ${headlineHtml(m.headline, m.redWord)}</div>
    <div class="accent"></div>
    <div style="font-weight:800;font-size:${W * 0.032}px;color:${accent};
      text-transform:uppercase;">${escapeHtml(m.customer)}</div>
    ${
      m.segment
        ? `<div class="body-text" style="font-size:${W * 0.02}px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.7;margin-top:${H * 0.004}px;">${escapeHtml(m.segment)}</div>`
        : ""
    }
    ${
      m.description
        ? `<div class="body-text" style="font-size:${(land ? W * 0.021 : W * 0.025) * k}px;margin-top:${H * 0.02}px;">${escapeHtml(m.description)}</div>`
        : ""
    }
    ${ctaEl(m.cta)}`;
  return frameMal({ W, H, land, bg, content, imageUrl: m.imageUrl, imageLabel: "Leveransefoto" });
}

// =============================================================================
// Mal 3 — Besøk hos bedrift
// =============================================================================

function renderBesok(m: MalBesok, W: number, H: number, land: boolean): string {
  const bg = m.background ?? "ink";
  const accent = accentFor(bg);
  const fg = fgFor(bg);
  const k = textScale(!!m.imageUrl);
  const content = `${eyebrowEl(m.eyebrow ?? "På besøk hos")}
    <div class="headline" style="font-size:${(land ? W * 0.046 : W * 0.062) * k}px;">
      ${escapeHtml(m.company.toUpperCase())}</div>
    <div class="accent"></div>
    ${
      m.location
        ? `<div style="display:flex;align-items:center;gap:${W * 0.012}px;">
        ${pinSvg(W * 0.03, accent)}
        <span style="font-weight:700;font-size:${W * 0.024}px;color:${fg};">${escapeHtml(m.location)}</span></div>`
        : ""
    }
    ${
      m.description
        ? `<div class="body-text" style="font-size:${(land ? W * 0.021 : W * 0.025) * k}px;margin-top:${H * 0.018}px;">${escapeHtml(m.description)}</div>`
        : ""
    }
    ${ctaEl(m.cta)}`;
  return frameMal({ W, H, land, bg, content, imageUrl: m.imageUrl, imageLabel: "Besøksfoto" });
}

// =============================================================================
// Mal 4 — Stand/messe
// =============================================================================

function renderStand(m: MalStand, W: number, H: number, land: boolean): string {
  const bg = m.background ?? "ink";
  const accent = accentFor(bg);
  const fg = fgFor(bg);
  const k = textScale(!!m.imageUrl);
  const infoItem = (label: string, value: string) =>
    `<div style="display:flex;flex-direction:column;gap:${H * 0.004}px;">
      <span style="font-weight:800;font-size:${W * 0.018}px;letter-spacing:0.12em;
        text-transform:uppercase;color:${accent};">${escapeHtml(label)}</span>
      <span style="font-weight:700;font-size:${W * 0.028}px;color:${fg};">${escapeHtml(value)}</span>
    </div>`;
  const content = `${eyebrowEl(m.eyebrow ?? "Møt oss")}
    <div class="headline" style="font-size:${(land ? W * 0.05 : W * 0.07) * k}px;">
      ${headlineHtml(m.eventName, m.redWord)}</div>
    <div class="accent"></div>
    ${m.description ? `<div class="body-text" style="font-size:${W * 0.023}px;margin-bottom:${H * 0.018}px;">${escapeHtml(m.description)}</div>` : ""}
    <div style="display:flex;gap:${W * 0.05}px;flex-wrap:wrap;margin:${H * 0.018}px 0;flex:1;align-content:center;">
      ${infoItem("Dato", m.date)}
      ${infoItem("Sted", m.location)}
      ${m.standNr ? infoItem("Stand", m.standNr) : ""}
    </div>
    ${ctaEl(m.cta ?? "kom innom standen")}`;
  return frameMal({ W, H, land, bg, content, imageUrl: m.imageUrl, imageLabel: "Standfoto" });
}

// =============================================================================
// Mal 5 — Ansatt-presentasjon
// =============================================================================

function renderAnsatt(m: MalAnsatt, W: number, H: number, land: boolean): string {
  const bg = m.background ?? "ink";
  const accent = accentFor(bg);
  const fg = fgFor(bg);
  const k = textScale(!!m.imageUrl);
  const content = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    ${eyebrowEl(m.eyebrow ?? "Møt teamet")}
    <div class="headline" style="font-size:${(land ? W * 0.05 : W * 0.06) * k}px;">${escapeHtml(m.name.toUpperCase())}</div>
    <div style="font-weight:700;font-size:${W * 0.027 * k}px;color:${accent};margin-top:${H * 0.006}px;">
      ${escapeHtml(m.role)}${m.years ? ` · ${escapeHtml(m.years)}` : ""}</div>
    <div class="accent"></div>
    ${m.quote ? `<div style="font-weight:700;font-style:italic;font-size:${W * 0.026 * k}px;color:${fg};line-height:1.4;">«${escapeHtml(m.quote)}»</div>` : ""}
    ${m.funFact ? `<div class="body-text" style="font-size:${W * 0.021 * k}px;margin-top:${H * 0.014}px;">${escapeHtml(m.funFact)}</div>` : ""}
  </div>`;
  return frameMal({ W, H, land, bg, content, imageUrl: m.imageUrl, imageLabel: "Portrettfoto" });
}

// =============================================================================
// Mal 6 — Kundesitat
// =============================================================================

function renderSitat(m: MalSitat, W: number, H: number, land: boolean): string {
  const bg = m.background ?? "red";
  const accent = accentFor(bg);
  const fg = fgFor(bg);
  const k = textScale(!!m.imageUrl);
  const attr = [m.attributionName, m.attributionRole, m.attributionCompany]
    .filter(Boolean)
    .join(" · ");
  const content = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    <div style="font-weight:800;font-size:${W * 0.18}px;line-height:0.6;color:${accent};
      opacity:0.5;">&ldquo;</div>
    <div style="font-weight:800;font-size:${(land ? W * 0.044 : W * 0.058) * k}px;line-height:1.18;
      color:${fg};margin:${H * 0.01}px 0 ${H * 0.03}px;">${escapeHtml(m.quote)}</div>
    <div style="display:flex;align-items:center;gap:${W * 0.018}px;">
      <div style="width:${W * 0.05}px;height:3px;background:${accent};"></div>
      <span style="font-weight:700;font-size:${W * 0.024}px;color:${fg};">${escapeHtml(attr)}</span>
    </div>
  </div>`;
  return frameMal({ W, H, land, bg, content, imageUrl: m.imageUrl, imageLabel: "Foto" });
}

// =============================================================================
// Mal 7 — Milepæl/jubileum
// =============================================================================

function renderMilepael(m: MalMilepael, W: number, H: number, land: boolean): string {
  const bg = m.background ?? "ink";
  const accent = accentFor(bg);
  const fg = fgFor(bg);
  const isJubilee = m.number === "25" || m.number === "100";
  const numColor = isJubilee
    ? `background:linear-gradient(${FT.goldTop},${FT.goldBottom});-webkit-background-clip:text;background-clip:text;color:transparent;`
    : `color:${fg};`;
  const k = textScale(!!m.imageUrl);
  const content = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
    ${eyebrowEl(m.eyebrow)}
    <div style="display:flex;align-items:baseline;gap:${W * 0.02}px;justify-content:center;">
      <span style="font-weight:800;font-size:${(land ? W * 0.26 : W * 0.34) * k}px;line-height:0.95;${numColor}">
        ${escapeHtml(m.number)}</span>
      ${m.unit ? `<span style="font-weight:700;font-style:italic;font-size:${W * 0.05 * k}px;color:${fg};">${escapeHtml(m.unit)}</span>` : ""}
    </div>
    <div style="width:${W * 0.09}px;height:3px;background:${accent};margin:${H * 0.022}px 0;"></div>
    ${m.headline ? `<div class="headline" style="font-size:${W * 0.038 * k}px;">${escapeHtml(m.headline)}</div>` : ""}
    ${m.body ? `<div class="body-text" style="font-size:${W * 0.023}px;max-width:88%;margin-top:${H * 0.016}px;">${escapeHtml(m.body)}</div>` : ""}
  </div>`;
  return frameMal({ W, H, land, bg, content, imageUrl: m.imageUrl, imageLabel: "Foto" });
}

// =============================================================================
// Mal 8 — Partner/samarbeid
// =============================================================================

function renderPartner(m: MalPartner, W: number, H: number, land: boolean): string {
  const bg = m.background ?? "ink";
  const k = textScale(!!m.imageUrl);
  const logo = m.partnerLogoUrl
    ? `<img src="${escapeHtml(m.partnerLogoUrl)}" alt="${escapeHtml(m.partnerName)}"
        style="max-height:${H * 0.12}px;max-width:${W * 0.42}px;width:auto;object-fit:contain;"/>`
    : `<span style="font-weight:800;font-size:${W * 0.055 * k}px;text-transform:uppercase;letter-spacing:0.02em;">${escapeHtml(m.partnerName)}</span>`;
  const content = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;justify-content:center;">
    ${eyebrowEl(m.eyebrow ?? "Samarbeidspartner")}
    <div style="display:flex;align-items:center;justify-content:center;
      min-height:${H * 0.13}px;margin-bottom:${H * 0.012}px;">${logo}</div>
    ${m.headline ? `<div class="headline" style="font-size:${W * 0.04 * k}px;">${escapeHtml(m.headline)}</div>` : ""}
    <div class="accent" style="margin-left:auto;margin-right:auto;"></div>
    ${m.description ? `<div class="body-text" style="font-size:${W * 0.023}px;max-width:88%;">${escapeHtml(m.description)}</div>` : ""}
    ${m.cta ? `<div class="cta" style="align-self:center;margin-top:${H * 0.024}px;">${escapeHtml(m.cta)}</div>` : ""}
  </div>`;
  return frameMal({ W, H, land, bg, content, imageUrl: m.imageUrl, imageLabel: "Foto" });
}

// =============================================================================
// Dispatcher
// =============================================================================

export function buildMalHtml(input: MalInput): string {
  const W = input.width;
  const H = input.height;
  const land = W > H * 1.2;
  const bg: Background = input.background ?? "ink";
  const pad = land ? W * 0.045 : W * 0.06;

  let content: string;
  switch (input.mal) {
    case "prosess":
      content = renderProsess(input, W, H, land);
      break;
    case "leveranse":
      content = renderLeveranse(input, W, H, land);
      break;
    case "besok":
      content = renderBesok(input, W, H, land);
      break;
    case "stand":
      content = renderStand(input, W, H, land);
      break;
    case "ansatt":
      content = renderAnsatt(input, W, H, land);
      break;
    case "sitat":
      content = renderSitat(input, W, H, land);
      break;
    case "milepael":
      content = renderMilepael(input, W, H, land);
      break;
    case "partner":
      content = renderPartner(input, W, H, land);
      break;
  }

  return `<!doctype html><html><head><meta charset="utf-8"><style>
  ${fontFaceCss()}
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:${W}px;height:${H}px;}
  body{font-family:'Manrope',-apple-system,sans-serif;background:${backgroundCss(bg)};
    color:${fgFor(bg)};padding:${pad}px;display:flex;flex-direction:column;
    position:relative;overflow:hidden;}
  ${commonCss(W, H, bg)}
  </style></head><body>
  ${decorSvgs(W, pad, bg)}
  ${content}
  </body></html>`;
}

export async function renderMalPng(
  input: MalInput
): Promise<{ base64: string; mimeType: string }> {
  const html = buildMalHtml(input);
  return renderHtmlToPng(html, input.width, input.height);
}

/** Aspect-slug → dimensjoner. */
export function dimsFor(aspect: AspectSlug): { w: number; h: number } {
  return ASPECT_DIMS[aspect] ?? ASPECT_DIMS.fb;
}

// Mark jubileum-import som referert (brukt ved fremtidig logo-variant)
void jubileumLogoDataUrl;
void checkSvg;
