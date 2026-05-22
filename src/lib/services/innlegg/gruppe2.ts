/**
 * Innleggsmaler — Gruppe 2: FEATURE, PROSESS, LEVERANSE.
 *
 * Portert fra Claude Design-kildene:
 *   - innlegg-maler-feature.jsx   (FeatureA, FeatureB)
 *   - innlegg-maler-stories1.jsx  (ProsessA/B, LeveranseA/B)
 *   - innlegg-maler-c.jsx         (FeatureC, ProsessC, LeveranseC)
 *   - innlegg-maler-li.jsx        (alle *LI landscape-varianter)
 *
 * Hver mal-funksjon returnerer et fullstendig HTML-dokument via `frame(...)`.
 * Bygger utelukkende på primitiver fra `core.ts`.
 */

import {
  FT,
  MONO,
  escapeHtml,
  formatNOK,
  headlineHtml,
  aspectOf,
  wordmark,
  wordmarkImg,
  burst,
  checkCircle,
  pin,
  photo,
  eyebrow,
  rule,
  frame,
  mutedFor,
} from "./core";

void burst;
void pin;
void formatNOK;

// =============================================================================
// Datamodeller
// =============================================================================

export interface FeatureData {
  eyebrow?: string;
  headline?: string;
  accent?: string;
  subhead?: string;
  kicker?: string;
  bullets?: string[];
  bulletsNum?: [string, string][];
  chapter?: string;
  description?: string;
  cta?: string;
  photo?: string | null;
}

export type ProsessStep = [title: string, desc: string];
export type ProsessStepNum = [num: string, title: string, desc: string];
export type ProsessStepC = [title: string, desc: string, num: string];

export interface ProsessData {
  eyebrow?: string;
  headline?: string;
  accent?: string;
  steps?: ProsessStep[];
  stepsNum?: ProsessStepNum[];
  stepsC?: ProsessStepC[];
  cta?: string;
  photo?: string | null;
}

export interface LeveranseData {
  eyebrow?: string;
  customer?: string;
  industry?: string;
  headline?: string;
  accent?: string;
  description?: string;
  url?: string;
  photo?: string | null;
  facts?: [label: string, value: string][];
  deliveryDate?: string;
  orderNo?: string;
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
// FooterRow (speiler innlegg-maler-li.jsx — bart wordmark-bilde via `wordmarkImg`)
// =============================================================================

function footerRow(
  W: number,
  H: number,
  opts: {
    url?: string;
    ink?: boolean;
    italic?: string;
    monoLabel?: string;
  } = {}
): string {
  void W; // wordmark sizes off H; W beholdt i signaturen for kall-paritet
  const s = S(H);
  const ink = opts.ink ?? false;
  const urlPart = opts.url
    ? `<div style="padding:${s.gapXs * 0.5}px ${s.gapXs * 1.4}px;` +
      `border:1.5px solid ${ink ? "rgba(15,17,21,0.4)" : "rgba(255,255,255,0.5)"};border-radius:999px;` +
      `font-weight:700;font-size:${s.bodyXs}px;">${escapeHtml(opts.url)}</div>`
    : "";
  const italicPart = opts.italic
    ? `<div style="font-style:italic;font-size:${s.bodyXs}px;` +
      `color:${ink ? "rgba(15,17,21,0.6)" : mutedFor("ink")};">${escapeHtml(opts.italic)}</div>`
    : "";
  const monoPart = opts.monoLabel
    ? `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.75}px;letter-spacing:0.18em;` +
      `color:${ink ? "rgba(15,17,21,0.55)" : mutedFor("ink")};">${escapeHtml(opts.monoLabel)}</div>`
    : "";
  const wm = wordmarkImg(ink ? "ink" : "white", { height: H * 0.05 });
  return (
    `<div style="margin-top:${s.gapXs}px;display:flex;align-items:center;` +
    `justify-content:space-between;position:relative;z-index:1;gap:${s.gap}px;">` +
    `<div style="display:flex;align-items:center;gap:${s.gapXs * 1.5}px;flex:1;">` +
    `${urlPart}${italicPart}${monoPart}</div>` +
    `${wm}</div>`
  );
}

// =============================================================================
// 5A. FEATURE — Foto-forward (44% foto venstre, tekst høyre)
// =============================================================================

export function featureA(W: number, H: number, data: FeatureData = {}): string {
  if (aspectOf(W, H) === "li") return featureALI(W, H, data);
  const {
    eyebrow: eb = "EGEN PRODUKSJON",
    headline = "HDFI — Verktøykontroll med presisjon",
    accent = "HDFI",
    subhead = "Skreddersydde skuminnlegg som gir hvert verktøy sin faste plass.",
    bullets = [
      "CAD-tegnet og CNC-maskinert i Brekstad",
      "Synlig kontroll — du ser umiddelbart hva som mangler",
      "FOD-sikring for luftfart og forsvar",
      "Tåler olje, løsemidler og hard bruk",
    ],
    cta = "fosen-tools.no/hdfi",
    photo: photoSrc = null,
  } = data;
  const children =
    `<div style="display:flex;gap:${W * 0.04}px;flex:1;position:relative;z-index:1;">` +
    `<div style="flex:0 0 44%;position:relative;">` +
    `${photo({ W, src: photoSrc, tag: "CADLAB", radius: W * 0.018 })}</div>` +
    `<div style="flex:1;display:flex;flex-direction:column;gap:${W * 0.012}px;">` +
    `${eyebrow(eb, { color: FT.red })}` +
    `<div style="font-weight:800;font-size:${W * 0.05}px;text-transform:uppercase;` +
    `line-height:1.04;letter-spacing:-0.01em;">${headlineHtml(headline, accent)}</div>` +
    `${rule({ color: FT.red, width: W * 0.07, style: `margin:${W * 0.004}px 0 ${W * 0.012}px;` })}` +
    `<div style="font-size:${W * 0.022}px;color:${mutedFor("ink")};line-height:1.5;max-width:95%;">` +
    `${escapeHtml(subhead)}</div>` +
    `<div style="display:flex;flex-direction:column;gap:${W * 0.014}px;margin-top:${W * 0.018}px;">` +
    bullets
      .map(
        (b) =>
          `<div style="display:flex;gap:${W * 0.016}px;align-items:flex-start;">` +
          `${checkCircle(W * 0.034, FT.red)}` +
          `<div style="font-weight:700;font-size:${W * 0.022}px;line-height:1.35;flex:1;padding-top:${W * 0.002}px;">` +
          `${escapeHtml(b)}</div></div>`
      )
      .join("") +
    `</div></div></div>` +
    `<div style="margin-top:${W * 0.025}px;display:flex;flex-direction:column;gap:${W * 0.012}px;` +
    `position:relative;z-index:1;align-items:center;">` +
    `<div style="padding:${W * 0.014}px ${W * 0.036}px;border:1.5px solid rgba(255,255,255,0.5);border-radius:999px;` +
    `font-weight:700;font-size:${W * 0.024}px;">${escapeHtml(cta)}</div>` +
    `${wordmark("ink", W)}</div>`;
  return frame({ W, H, bg: "ink", decor: "full", pad: W * 0.045, children });
}

function featureALI(W: number, H: number, data: FeatureData = {}): string {
  const {
    eyebrow: eb = "EGEN PRODUKSJON",
    headline = "HDFI — Verktøykontroll med presisjon",
    accent = "HDFI",
    subhead = "Skreddersydde skuminnlegg som gir hvert verktøy sin faste plass.",
    bullets = ["CAD + CNC i Brekstad", "Synlig kontroll", "FOD-sikring", "Tåler hard bruk"],
    cta = "fosen-tools.no/hdfi",
    photo: photoSrc = null,
  } = data;
  const s = S(H);
  const children =
    `<div style="display:grid;grid-template-columns:1fr 1.3fr;gap:${s.gap}px;flex:1;` +
    `position:relative;z-index:1;align-items:stretch;">` +
    `${photo({ W: W * 0.4, src: photoSrc, tag: "CADLAB", radius: s.radius * 0.5 })}` +
    `<div style="display:flex;flex-direction:column;gap:${s.gapXs * 0.8}px;">` +
    `${eyebrow(eb, { color: FT.red, fontSize: s.bodyXs })}` +
    `<div style="font-weight:800;font-size:${s.h3}px;text-transform:uppercase;` +
    `line-height:1.04;letter-spacing:-0.01em;">${headlineHtml(headline, accent)}</div>` +
    `${rule({ color: FT.red, width: W * 0.05, style: `margin-top:${s.gapXs * 0.3}px;` })}` +
    `<div style="font-size:${s.bodyXs}px;color:${mutedFor("ink")};line-height:1.45;max-width:95%;">` +
    `${escapeHtml(subhead)}</div>` +
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:${s.gapXs}px;margin-top:${s.gapXs * 0.5}px;">` +
    bullets
      .map(
        (b) =>
          `<div style="display:flex;gap:${s.gapXs * 0.7}px;align-items:center;">` +
          `${checkCircle(H * 0.038, FT.red)}` +
          `<div style="font-weight:700;font-size:${s.bodyXs}px;line-height:1.25;">${escapeHtml(b)}</div></div>`
      )
      .join("") +
    `</div></div></div>` +
    footerRow(W, H, { url: cta });
  return frame({ W, H, bg: "ink", decor: "full", pad: s.pad, children });
}

// =============================================================================
// 5B. FEATURE — Editorial. Stor type, lite foto-portal, krem
// =============================================================================

export function featureB(W: number, H: number, data: FeatureData = {}): string {
  if (aspectOf(W, H) === "li") return featureBLI(W, H, data);
  const {
    eyebrow: eb = "Egen produksjon",
    headline = "Verktøykontroll med presisjon",
    accent = "presisjon",
    kicker = "HDFI",
    subhead = "Skreddersydde skuminnlegg — CAD-tegnet og CNC-maskinert etter dine verktøy.",
    bulletsNum = [
      ["01", "CAD + CNC i Brekstad"],
      ["02", "Synlig kontroll"],
      ["03", "FOD-sikkert"],
      ["04", "Tåler hard bruk"],
    ],
    cta = "fosen-tools.no/hdfi",
    photo: photoSrc = null,
  } = data;
  const wmInk = wordmarkImg("ink", { width: W * 0.14 });
  const children =
    `<div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:${W * 0.008}px;">` +
    `${eyebrow(eb, { color: FT.red })}` +
    `<div style="display:flex;align-items:baseline;gap:${W * 0.018}px;">` +
    `<div style="font-weight:800;font-size:${W * 0.105}px;color:${FT.red};letter-spacing:-0.02em;line-height:1;">` +
    `${escapeHtml(kicker)}</div>` +
    `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:rgba(15,17,21,0.5);letter-spacing:0.18em;">` +
    `HIGH-DENSITY FOAM INSERT</div></div>` +
    `<div style="font-weight:800;font-size:${W * 0.052}px;text-transform:uppercase;color:${FT.ink};` +
    `line-height:1.05;margin-top:${W * 0.014}px;letter-spacing:-0.01em;max-width:88%;">` +
    `${headlineHtml(headline, accent, { accentColor: FT.red })}</div>` +
    `<div style="font-size:${W * 0.022}px;color:rgba(15,17,21,0.7);max-width:85%;margin-top:${W * 0.012}px;line-height:1.5;">` +
    `${escapeHtml(subhead)}</div></div>` +
    `<div style="flex:1;margin-top:${W * 0.03}px;display:grid;grid-template-columns:1.05fr 1fr;` +
    `gap:${W * 0.03}px;position:relative;z-index:1;">` +
    `<div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:${W * 0.014}px;">` +
    bulletsNum
      .map(
        ([num, txt]) =>
          `<div style="border:1.5px solid rgba(15,17,21,0.15);padding:${W * 0.016}px;border-radius:${W * 0.01}px;` +
          `display:flex;flex-direction:column;justify-content:space-between;background:rgba(255,255,255,0.4);">` +
          `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:${FT.red};letter-spacing:0.1em;">` +
          `${escapeHtml(num)}</div>` +
          `<div style="font-weight:800;font-size:${W * 0.024}px;color:${FT.ink};text-transform:uppercase;line-height:1.15;">` +
          `${escapeHtml(txt)}</div></div>`
      )
      .join("") +
    `</div>` +
    `<div style="position:relative;">` +
    `${photo({ W, src: photoSrc, tag: "CADLAB foto", dark: false, radius: W * 0.014 })}</div></div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;align-items:center;justify-content:space-between;` +
    `position:relative;z-index:1;">` +
    `<div style="font-weight:800;font-size:${W * 0.022}px;color:${FT.ink};letter-spacing:0.02em;">` +
    `${escapeHtml(cta)}</div>` +
    `${wmInk}</div>`;
  return frame({ W, H, bg: "cream", decor: "rulers", pad: W * 0.05, children });
}

function featureBLI(W: number, H: number, data: FeatureData = {}): string {
  const {
    kicker = "HDFI",
    headline = "Verktøykontroll med presisjon",
    accent = "presisjon",
    subhead = "Skreddersydde skuminnlegg — CAD-tegnet og CNC-maskinert etter dine verktøy.",
    bulletsNum = [
      ["01", "CAD + CNC"],
      ["02", "Synlig kontroll"],
      ["03", "FOD-sikker"],
      ["04", "Tåler bruk"],
    ],
    cta = "fosen-tools.no/hdfi",
  } = data;
  const s = S(H);
  const children =
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:${s.gap}px;flex:1;position:relative;z-index:1;">` +
    `<div style="display:flex;flex-direction:column;justify-content:center;gap:${s.gapXs * 0.6}px;">` +
    `<div style="display:flex;align-items:baseline;gap:${s.gapXs}px;">` +
    `<div style="font-weight:800;font-size:${s.h1 * 1.4}px;color:${FT.red};letter-spacing:-0.02em;line-height:0.85;">` +
    `${escapeHtml(kicker)}</div></div>` +
    `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.75}px;color:rgba(15,17,21,0.5);letter-spacing:0.18em;">` +
    `HIGH-DENSITY FOAM INSERT</div>` +
    `<div style="font-weight:800;font-size:${s.h3}px;text-transform:uppercase;color:${FT.ink};` +
    `line-height:1.05;margin-top:${s.gapXs}px;letter-spacing:-0.005em;">` +
    `${headlineHtml(headline, accent, { accentColor: FT.red })}</div>` +
    `<div style="font-size:${s.bodyXs}px;color:rgba(15,17,21,0.7);line-height:1.45;margin-top:${s.gapXs * 0.4}px;">` +
    `${escapeHtml(subhead)}</div></div>` +
    `<div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:${s.gapXs}px;">` +
    bulletsNum
      .map(
        ([num, txt]) =>
          `<div style="border:1.5px solid rgba(15,17,21,0.15);padding:${s.gapXs}px;border-radius:${s.radius * 0.3}px;` +
          `display:flex;flex-direction:column;justify-content:space-between;background:rgba(255,255,255,0.4);">` +
          `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.7}px;color:${FT.red};letter-spacing:0.1em;">` +
          `${escapeHtml(num)}</div>` +
          `<div style="font-weight:800;font-size:${s.bodySm}px;color:${FT.ink};text-transform:uppercase;line-height:1.15;">` +
          `${escapeHtml(txt)}</div></div>`
      )
      .join("") +
    `</div></div>` +
    footerRow(W, H, { url: cta, ink: true });
  return frame({ W, H, bg: "cream", decor: "rulers", pad: s.pad, children });
}

// =============================================================================
// 4C. FEATURE — Numbered chapter, type-forward
// =============================================================================

export function featureC(W: number, H: number, data: FeatureData = {}): string {
  if (aspectOf(W, H) === "li") return featureCLI(W, H, data);
  const {
    chapter = "CH. 04",
    kicker = "HDFI",
    headline = "Verktøykontroll med presisjon",
    description = "Skreddersydde skuminnlegg som gir hvert verktøy sin faste plass. CAD-tegnet, CNC-maskinert, kvalitetssikret.",
    cta = "fosen-tools.no/hdfi",
  } = data;
  const children =
    `<div style="display:flex;justify-content:space-between;position:relative;z-index:1;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.022}px;color:${FT.red};letter-spacing:0.18em;">` +
    `${escapeHtml(chapter)}</div>` +
    `<div style="font-family:${MONO};font-size:${W * 0.016}px;letter-spacing:0.16em;color:rgba(255,255,255,0.55);` +
    `text-transform:uppercase;">FOSEN TOOLS · TJENESTE</div></div>` +
    `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:1;` +
    `gap:${W * 0.018}px;">` +
    `<div style="font-weight:800;font-size:${W * 0.22}px;color:#fff;line-height:0.85;letter-spacing:-0.03em;` +
    `text-transform:uppercase;">${escapeHtml(kicker)}</div>` +
    `${rule({ color: FT.red, width: W * 0.18, height: 6 })}` +
    `<div style="font-weight:800;font-size:${W * 0.052}px;color:#fff;text-transform:uppercase;` +
    `line-height:1.05;letter-spacing:-0.01em;max-width:90%;">${escapeHtml(headline.toUpperCase())}</div>` +
    `<div style="font-size:${W * 0.022}px;color:rgba(255,255,255,0.7);line-height:1.5;max-width:85%;` +
    `margin-top:${W * 0.008}px;">${escapeHtml(description)}</div></div>` +
    `<div style="display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1;` +
    `border-top:1px solid rgba(255,255,255,0.18);padding-top:${W * 0.018}px;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.02}px;letter-spacing:0.06em;">` +
    `${escapeHtml(cta)}</div>` +
    `${wordmarkImg("white", { width: W * 0.13 })}</div>`;
  return frame({ W, H, bg: "ink", decor: "rulers", pad: W * 0.06, children });
}

function featureCLI(W: number, H: number, data: FeatureData = {}): string {
  const {
    chapter = "CH. 04",
    kicker = "HDFI",
    headline = "Verktøykontroll med presisjon",
    description = "Skreddersydde skuminnlegg. CAD + CNC.",
    cta = "fosen-tools.no/hdfi",
  } = data;
  const children =
    `<div style="display:flex;justify-content:space-between;position:relative;z-index:1;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${H * 0.026}px;color:${FT.red};letter-spacing:0.18em;">` +
    `${escapeHtml(chapter)}</div>` +
    `<div style="font-family:${MONO};font-size:${H * 0.02}px;letter-spacing:0.16em;color:rgba(255,255,255,0.55);">` +
    `FT · TJENESTE</div></div>` +
    `<div style="display:grid;grid-template-columns:auto 1fr;gap:${H * 0.06}px;flex:1;align-items:center;` +
    `position:relative;z-index:1;">` +
    `<div style="font-weight:800;font-size:${H * 0.32}px;color:#fff;line-height:0.85;letter-spacing:-0.03em;">` +
    `${escapeHtml(kicker)}</div>` +
    `<div>` +
    `${rule({ color: FT.red, width: H * 0.14, height: 4 })}` +
    `<div style="font-weight:800;font-size:${H * 0.07}px;color:#fff;text-transform:uppercase;line-height:1.05;` +
    `margin-top:${H * 0.02}px;letter-spacing:-0.005em;">${escapeHtml(headline.toUpperCase())}</div>` +
    `<div style="font-size:${H * 0.028}px;color:rgba(255,255,255,0.7);line-height:1.45;margin-top:${H * 0.018}px;">` +
    `${escapeHtml(description)}</div></div></div>` +
    footerRow(W, H, { url: cta });
  return frame({ W, H, bg: "ink", decor: "rulers", pad: H * 0.07, children });
}

// =============================================================================
// 6A. PROSESS — Vertikal nummerert timeline, foto venstre
// =============================================================================

export function prosessA(W: number, H: number, data: ProsessData = {}): string {
  if (aspectOf(W, H) === "li") return prosessALI(W, H, data);
  const {
    eyebrow: eb = "SLIK JOBBER VI",
    headline = "Fra idé til ferdig HDFI",
    accent = "HDFI",
    steps = [
      ["CAD-tegning", "Hver posisjon tegnes i CADLAB etter dine verktøy."],
      ["CNC-maskinering", "Eksakt passform maskineres ut i Brekstad."],
      ["Kvalitetskontroll", "Hver leveranse sjekkes mot spesifikasjon."],
      ["Levering", "Ferdig løsning, klar til bruk — typisk 2-4 uker."],
    ],
    cta = "fosen-tools.no/hdfi",
    photo: photoSrc = null,
  } = data;
  const children =
    `<div style="display:grid;grid-template-columns:1fr 1.1fr;gap:${W * 0.032}px;flex:1;` +
    `position:relative;z-index:1;">` +
    `<div style="position:relative;">` +
    `${photo({ W, src: photoSrc, tag: "CADLAB", radius: W * 0.018 })}</div>` +
    `<div style="display:flex;flex-direction:column;">` +
    `${eyebrow(eb, { color: FT.red })}` +
    `<div style="font-weight:800;font-size:${W * 0.046}px;text-transform:uppercase;line-height:1.05;` +
    `letter-spacing:-0.01em;margin-top:${W * 0.006}px;">${headlineHtml(headline, accent)}</div>` +
    `<div style="display:flex;flex-direction:column;gap:${W * 0.018}px;margin-top:${W * 0.024}px;">` +
    steps
      .map(
        ([title, desc], i) =>
          `<div style="display:flex;gap:${W * 0.018}px;align-items:flex-start;">` +
          `<div style="width:${W * 0.044}px;height:${W * 0.044}px;border-radius:50%;background:${FT.red};` +
          `color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;` +
          `font-size:${W * 0.022}px;flex-shrink:0;">${i + 1}</div>` +
          `<div style="flex:1;">` +
          `<div style="font-weight:800;font-size:${W * 0.024}px;text-transform:uppercase;letter-spacing:0.005em;">` +
          `${escapeHtml(title)}</div>` +
          `<div style="font-size:${W * 0.018}px;color:${mutedFor("ink")};margin-top:${W * 0.004}px;line-height:1.4;">` +
          `${escapeHtml(desc)}</div></div></div>`
      )
      .join("") +
    `</div></div></div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;flex-direction:column;gap:${W * 0.012}px;` +
    `align-items:center;position:relative;z-index:1;">` +
    `<div style="padding:${W * 0.012}px ${W * 0.032}px;border:1.5px solid rgba(255,255,255,0.5);border-radius:999px;` +
    `font-weight:700;font-size:${W * 0.022}px;">${escapeHtml(cta)}</div>` +
    `${wordmark("ink", W)}</div>`;
  return frame({ W, H, bg: "ink", decor: "full", pad: W * 0.045, children });
}

function prosessALI(W: number, H: number, data: ProsessData = {}): string {
  const {
    headline = "Fra idé til ferdig HDFI",
    accent = "HDFI",
    steps = [
      ["CAD-tegning", "Tegnes i CADLAB."],
      ["CNC-maskinering", "Maskineres i Brekstad."],
      ["Kvalitetskontroll", "Sjekkes mot spec."],
      ["Levering", "Klar — 2-4 uker."],
    ],
    cta = "fosen-tools.no/hdfi",
  } = data;
  const s = S(H);
  const children =
    `<div style="display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1;">` +
    `<div>` +
    `${eyebrow("SLIK JOBBER VI", { color: FT.red, fontSize: s.bodyXs })}` +
    `<div style="font-weight:800;font-size:${s.h3}px;text-transform:uppercase;line-height:1.04;` +
    `margin-top:${s.gapXs * 0.3}px;">${headlineHtml(headline, accent)}</div></div></div>` +
    `<div style="flex:1;margin-top:${s.gapSm}px;display:grid;grid-template-columns:repeat(4,1fr);` +
    `gap:${s.gapSm}px;position:relative;z-index:1;">` +
    steps
      .map(
        ([title, desc], i) =>
          `<div style="display:flex;flex-direction:column;gap:${s.gapXs * 0.8}px;">` +
          `<div style="width:${H * 0.08}px;height:${H * 0.08}px;border-radius:50%;background:${FT.red};color:#fff;` +
          `display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${s.h4}px;">${i + 1}</div>` +
          `<div style="font-weight:800;font-size:${s.bodySm}px;text-transform:uppercase;line-height:1.1;">` +
          `${escapeHtml(title)}</div>` +
          `<div style="font-size:${s.bodyXs * 0.9}px;color:${mutedFor("ink")};line-height:1.4;">` +
          `${escapeHtml(desc)}</div></div>`
      )
      .join("") +
    `</div>` +
    footerRow(W, H, { url: cta });
  return frame({ W, H, bg: "ink", decor: "full", pad: s.pad, children });
}

// =============================================================================
// 6B. PROSESS — Horisontal CAD-blueprint timeline, krem
// =============================================================================

export function prosessB(W: number, H: number, data: ProsessData = {}): string {
  if (aspectOf(W, H) === "li") return prosessBLI(W, H, data);
  const {
    eyebrow: eb = "Vår prosess",
    headline = "4 steg til ferdig HDFI",
    accent = "4",
    stepsNum = [
      ["01", "CAD", "Tegnes i CADLAB."],
      ["02", "CNC", "Maskineres i Brekstad."],
      ["03", "QC", "Sjekkes mot spec."],
      ["04", "2-4 uker", "Klar til bruk."],
    ],
    cta = "fosen-tools.no/hdfi",
  } = data;
  const wmInk = wordmarkImg("ink", { width: W * 0.14 });
  const children =
    `<div style="position:relative;z-index:1;">` +
    `${eyebrow(eb, { color: FT.red })}` +
    `<div style="font-weight:800;font-size:${W * 0.062}px;text-transform:uppercase;color:${FT.ink};` +
    `line-height:1.05;letter-spacing:-0.01em;margin-top:${W * 0.008}px;">` +
    `${headlineHtml(headline, accent, { accentColor: FT.red })}</div>` +
    `${rule({ color: FT.red, width: W * 0.07, style: `margin-top:${W * 0.014}px;` })}</div>` +
    `<div style="flex:1;margin-top:${W * 0.05}px;display:flex;align-items:center;position:relative;z-index:1;">` +
    `<div style="position:absolute;left:0;right:0;top:50%;height:1.5px;z-index:0;` +
    `background-image:repeating-linear-gradient(to right, rgba(15,17,21,0.35) 0 6px, transparent 6px 14px);` +
    `background-size:14px 1.5px;background-color:transparent;"></div>` +
    `<div style="flex:1;display:grid;grid-template-columns:repeat(4, 1fr);gap:${W * 0.024}px;` +
    `position:relative;z-index:1;">` +
    stepsNum
      .map(
        ([num, title, desc]) =>
          `<div style="display:flex;flex-direction:column;align-items:center;gap:${W * 0.01}px;">` +
          `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:rgba(15,17,21,0.55);letter-spacing:0.1em;">` +
          `${escapeHtml(num)}</div>` +
          `<div style="width:${W * 0.08}px;height:${W * 0.08}px;border-radius:50%;background:${FT.ink};color:#fff;` +
          `display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${W * 0.022}px;` +
          `text-align:center;line-height:1.05;border:3px solid ${FT.cream};box-shadow:0 4px 12px rgba(15,17,21,0.18);">` +
          `${escapeHtml(title.split(" ")[0])}</div>` +
          `<div style="margin-top:${W * 0.012}px;font-weight:800;font-size:${W * 0.022}px;text-transform:uppercase;` +
          `color:${FT.ink};text-align:center;">${escapeHtml(title)}</div>` +
          `<div style="font-size:${W * 0.016}px;color:rgba(15,17,21,0.62);text-align:center;line-height:1.4;">` +
          `${escapeHtml(desc)}</div></div>`
      )
      .join("") +
    `</div></div>` +
    `<div style="margin-top:${W * 0.04}px;display:flex;align-items:center;justify-content:space-between;` +
    `position:relative;z-index:1;">` +
    `<div style="font-weight:800;font-size:${W * 0.022}px;color:${FT.ink};letter-spacing:0.02em;">` +
    `${escapeHtml(cta)}</div>` +
    `${wmInk}</div>`;
  return frame({ W, H, bg: "cream", decor: "grid", pad: W * 0.05, children });
}

function prosessBLI(W: number, H: number, data: ProsessData = {}): string {
  const {
    eyebrow: eb = "Vår prosess",
    headline = "4 steg til ferdig HDFI",
    accent = "4",
    stepsNum = [
      ["01", "CAD", "Tegnes i CADLAB"],
      ["02", "CNC", "Maskineres i Brekstad"],
      ["03", "QC", "Sjekkes mot spec"],
      ["04", "2-4u", "Klar til bruk"],
    ],
    cta = "fosen-tools.no/hdfi",
  } = data;
  const s = S(H);
  const children =
    `<div style="position:relative;z-index:1;display:flex;justify-content:space-between;align-items:baseline;">` +
    `<div>` +
    `${eyebrow(eb, { color: FT.red, fontSize: s.bodyXs })}` +
    `<div style="font-weight:800;font-size:${s.h3}px;color:${FT.ink};text-transform:uppercase;line-height:1.04;` +
    `margin-top:${s.gapXs * 0.3}px;letter-spacing:-0.005em;">` +
    `${headlineHtml(headline, accent, { accentColor: FT.red })}</div></div></div>` +
    `<div style="flex:1;margin-top:${s.gapSm}px;display:flex;align-items:center;position:relative;z-index:1;">` +
    `<div style="position:absolute;left:${H * 0.06}px;right:${H * 0.06}px;top:50%;height:1.5px;` +
    `background-image:repeating-linear-gradient(to right, rgba(15,17,21,0.4) 0 6px, transparent 6px 14px);` +
    `background-size:14px 1.5px;"></div>` +
    `<div style="flex:1;display:grid;grid-template-columns:repeat(4,1fr);gap:${s.gapSm}px;` +
    `position:relative;z-index:1;">` +
    stepsNum
      .map(
        ([num, title, desc]) =>
          `<div style="display:flex;flex-direction:column;align-items:center;gap:${s.gapXs * 0.4}px;">` +
          `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.7}px;color:rgba(15,17,21,0.55);letter-spacing:0.1em;">` +
          `${escapeHtml(num)}</div>` +
          `<div style="width:${H * 0.12}px;height:${H * 0.12}px;border-radius:50%;background:${FT.ink};color:#fff;` +
          `display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${s.h4}px;` +
          `border:3px solid ${FT.cream};box-shadow:0 4px 12px rgba(15,17,21,0.18);">${escapeHtml(title)}</div>` +
          `<div style="margin-top:${s.gapXs * 0.5}px;font-weight:800;font-size:${s.bodyXs}px;color:${FT.ink};` +
          `text-transform:uppercase;text-align:center;">${escapeHtml(title)}</div>` +
          `<div style="font-size:${s.bodyXs * 0.75}px;color:rgba(15,17,21,0.62);text-align:center;line-height:1.4;">` +
          `${escapeHtml(desc)}</div></div>`
      )
      .join("") +
    `</div></div>` +
    footerRow(W, H, { url: cta, ink: true });
  return frame({ W, H, bg: "cream", decor: "grid", pad: s.pad, children });
}

// =============================================================================
// 5C. PROSESS — Vertikal manual / spec-sheet
// =============================================================================

export function prosessC(W: number, H: number, data: ProsessData = {}): string {
  if (aspectOf(W, H) === "li") return prosessCLI(W, H, data);
  const {
    headline = "Slik jobber vi",
    stepsC = [
      ["CAD-tegning", "Hver posisjon tegnes i CADLAB etter dine verktøy.", "01"],
      ["CNC-maskinering", "Eksakt passform maskineres ut i Brekstad.", "02"],
      ["Kvalitetskontroll", "Hver leveranse sjekkes mot spesifikasjon.", "03"],
      ["Levering", "Ferdig løsning klar til bruk. Typisk 2-4 uker.", "04"],
    ],
    cta = "fosen-tools.no/hdfi",
  } = data;
  const wmInk = wordmarkImg("ink", { width: W * 0.13 });
  const children =
    `<div style="position:relative;z-index:1;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.016}px;color:${FT.red};` +
    `letter-spacing:0.22em;text-transform:uppercase;">SPEC · PROSESS · 4 STEG</div>` +
    `<div style="font-weight:800;font-size:${W * 0.06}px;color:${FT.ink};text-transform:uppercase;` +
    `line-height:1.02;margin-top:${W * 0.012}px;letter-spacing:-0.015em;">${escapeHtml(headline.toUpperCase())}</div>` +
    `${rule({ color: FT.red, width: W * 0.08, style: `margin-top:${W * 0.014}px;` })}</div>` +
    `<div style="flex:1;margin-top:${W * 0.028}px;position:relative;z-index:1;display:flex;` +
    `flex-direction:column;gap:${W * 0.014}px;">` +
    stepsC
      .map(([title, desc, num], i) => {
        const borderTop =
          i === 0 ? "2px solid rgba(15,17,21,0.85)" : "1px solid rgba(15,17,21,0.15)";
        const borderBottom =
          i === stepsC.length - 1 ? "2px solid rgba(15,17,21,0.85)" : "none";
        const mark = i === stepsC.length - 1 ? "»" : "·";
        return (
          `<div style="display:grid;grid-template-columns:auto 1fr auto;gap:${W * 0.024}px;align-items:center;` +
          `padding:${W * 0.018}px ${W * 0.022}px;border-top:${borderTop};border-bottom:${borderBottom};">` +
          `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.028}px;color:${FT.red};` +
          `letter-spacing:-0.01em;">${escapeHtml(num)}</div>` +
          `<div>` +
          `<div style="font-weight:800;font-size:${W * 0.026}px;color:${FT.ink};text-transform:uppercase;line-height:1.05;">` +
          `${escapeHtml(title)}</div>` +
          `<div style="font-size:${W * 0.018}px;color:rgba(15,17,21,0.7);margin-top:${W * 0.004}px;line-height:1.4;">` +
          `${escapeHtml(desc)}</div></div>` +
          `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:rgba(15,17,21,0.5);letter-spacing:0.1em;">` +
          `${mark}</div></div>`
        );
      })
      .join("") +
    `</div>` +
    `<div style="margin-top:${W * 0.022}px;display:flex;justify-content:space-between;align-items:center;` +
    `position:relative;z-index:1;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.018}px;color:${FT.ink};letter-spacing:0.06em;">` +
    `${escapeHtml(cta)}</div>` +
    `${wmInk}</div>`;
  return frame({ W, H, bg: "cream", decor: "grid", pad: W * 0.06, children });
}

function prosessCLI(W: number, H: number, data: ProsessData = {}): string {
  const {
    headline = "Slik jobber vi",
    stepsC = [
      ["CAD", "Tegnes i CADLAB.", "01"],
      ["CNC", "Maskineres i Brekstad.", "02"],
      ["QC", "Sjekkes mot spec.", "03"],
      ["Levering", "Klar til bruk.", "04"],
    ],
    cta = "fosen-tools.no/hdfi",
  } = data;
  const children =
    `<div style="display:flex;justify-content:space-between;align-items:baseline;position:relative;z-index:1;">` +
    `<div>` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${H * 0.022}px;color:${FT.red};` +
    `letter-spacing:0.22em;text-transform:uppercase;">SPEC · 4 STEG</div>` +
    `<div style="font-weight:800;font-size:${H * 0.07}px;color:${FT.ink};text-transform:uppercase;line-height:1.02;` +
    `margin-top:${H * 0.014}px;letter-spacing:-0.015em;">${escapeHtml(headline.toUpperCase())}</div></div></div>` +
    `<div style="flex:1;margin-top:${H * 0.04}px;display:grid;grid-template-columns:repeat(4,1fr);` +
    `gap:${H * 0.03}px;position:relative;z-index:1;">` +
    stepsC
      .map(
        ([title, desc, num]) =>
          `<div style="display:flex;flex-direction:column;gap:${H * 0.012}px;` +
          `border-top:2px solid rgba(15,17,21,0.85);padding-top:${H * 0.016}px;">` +
          `<div style="font-family:${MONO};font-weight:700;font-size:${H * 0.034}px;color:${FT.red};">` +
          `${escapeHtml(num)}</div>` +
          `<div style="font-weight:800;font-size:${H * 0.032}px;color:${FT.ink};text-transform:uppercase;line-height:1.05;">` +
          `${escapeHtml(title)}</div>` +
          `<div style="font-size:${H * 0.022}px;color:rgba(15,17,21,0.7);line-height:1.4;">${escapeHtml(desc)}</div></div>`
      )
      .join("") +
    `</div>` +
    footerRow(W, H, { url: cta, ink: true });
  return frame({ W, H, bg: "cream", decor: "grid", pad: H * 0.07, children });
}

// =============================================================================
// 7A. LEVERANSE — Editorial foto-stort
// =============================================================================

export function leveranseA(W: number, H: number, data: LeveranseData = {}): string {
  if (aspectOf(W, H) === "li") return leveranseALI(W, H, data);
  const {
    eyebrow: eb = "LEVERT",
    headline = "Skreddersydd Opti-koffert med HDFI",
    accent = "HDFI",
    customer = "TESS Vest",
    industry = "Industri",
    description = "Kraftpipe-sett 22-38 mm i koffert med CNC-maskinert HDFI — hver pipe har sin plass.",
    url = "fosen-tools.no",
    photo: photoSrc = null,
  } = data;
  const wmWhite = wordmarkImg("white", { width: W * 0.13 });
  const children =
    `<div style="flex:1;display:flex;flex-direction:column;gap:${W * 0.022}px;position:relative;z-index:1;">` +
    `<div style="flex:0 0 52%;position:relative;">` +
    `${photo({ W, src: photoSrc, tag: "Leveranse-foto", radius: W * 0.018 })}` +
    `<div style="position:absolute;top:${W * 0.018}px;left:${W * 0.018}px;background:${FT.red};color:#fff;` +
    `padding:${W * 0.008}px ${W * 0.018}px;font-weight:800;font-size:${W * 0.02}px;letter-spacing:0.2em;` +
    `text-transform:uppercase;">${escapeHtml(eb)}</div></div>` +
    `<div style="flex:1;display:flex;flex-direction:column;gap:${W * 0.01}px;">` +
    `<div style="font-weight:800;font-size:${W * 0.04}px;text-transform:uppercase;line-height:1.05;` +
    `letter-spacing:-0.005em;">${headlineHtml(headline, accent)}</div>` +
    `${rule({ color: FT.red, width: W * 0.06, style: `margin:${W * 0.004}px 0 ${W * 0.008}px;` })}` +
    `<div style="display:flex;align-items:baseline;gap:${W * 0.018}px;">` +
    `<div style="font-weight:800;font-size:${W * 0.028}px;color:${FT.red};text-transform:uppercase;">` +
    `${escapeHtml(customer)}</div>` +
    `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:${mutedFor("ink")};letter-spacing:0.16em;` +
    `text-transform:uppercase;">${escapeHtml(industry)}</div></div>` +
    `<div style="font-size:${W * 0.02}px;color:${mutedFor("ink")};line-height:1.5;margin-top:${W * 0.008}px;` +
    `max-width:94%;">${escapeHtml(description)}</div></div></div>` +
    `<div style="margin-top:${W * 0.018}px;display:flex;align-items:center;justify-content:space-between;` +
    `position:relative;z-index:1;">` +
    `<div style="padding:${W * 0.01}px ${W * 0.028}px;border:1.5px solid rgba(255,255,255,0.4);border-radius:999px;` +
    `font-weight:700;font-size:${W * 0.02}px;">${escapeHtml(url)}</div>` +
    `${wmWhite}</div>`;
  return frame({ W, H, bg: "ink", decor: "corners", pad: W * 0.045, children });
}

function leveranseALI(W: number, H: number, data: LeveranseData = {}): string {
  const {
    headline = "Skreddersydd Opti-koffert med HDFI",
    accent = "HDFI",
    customer = "TESS Vest",
    industry = "Industri",
    description = "Kraftpipe-sett 22-38 mm i koffert med CNC-maskinert HDFI — hver pipe har sin plass.",
    url = "fosen-tools.no",
    photo: photoSrc = null,
  } = data;
  const s = S(H);
  const children =
    `<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:${s.gap}px;flex:1;` +
    `position:relative;z-index:1;align-items:stretch;">` +
    `<div style="position:relative;">` +
    `${photo({ W: W * 0.5, src: photoSrc, tag: "Leveranse-foto", radius: s.radius * 0.5 })}` +
    `<div style="position:absolute;top:${s.gapXs}px;left:${s.gapXs}px;background:${FT.red};color:#fff;` +
    `padding:${s.gapXs * 0.5}px ${s.gapXs * 1.2}px;font-weight:800;font-size:${s.bodyXs}px;letter-spacing:0.2em;">` +
    `LEVERT</div></div>` +
    `<div style="display:flex;flex-direction:column;gap:${s.gapXs * 0.6}px;justify-content:center;">` +
    `<div style="font-weight:800;font-size:${s.h3}px;text-transform:uppercase;line-height:1.05;">` +
    `${headlineHtml(headline, accent)}</div>` +
    `${rule({ color: FT.red, width: W * 0.05, style: `margin:${s.gapXs * 0.4}px 0;` })}` +
    `<div style="display:flex;align-items:baseline;gap:${s.gapXs * 1.2}px;">` +
    `<div style="font-weight:800;font-size:${s.h4}px;color:${FT.red};text-transform:uppercase;">` +
    `${escapeHtml(customer)}</div>` +
    `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.7}px;color:${mutedFor("ink")};letter-spacing:0.14em;` +
    `text-transform:uppercase;">${escapeHtml(industry)}</div></div>` +
    `<div style="font-size:${s.bodyXs}px;color:${mutedFor("ink")};line-height:1.45;margin-top:${s.gapXs * 0.4}px;">` +
    `${escapeHtml(description)}</div></div></div>` +
    footerRow(W, H, { url });
  return frame({ W, H, bg: "ink", decor: "corners", pad: s.pad, children });
}

// =============================================================================
// 7B. LEVERANSE — Krem case-study, foto høyre, sak-stil
// =============================================================================

export function leveranseB(W: number, H: number, data: LeveranseData = {}): string {
  if (aspectOf(W, H) === "li") return leveranseBLI(W, H, data);
  const {
    customer = "TESS Vest",
    industry = "Industri",
    headline = "Skreddersydd Opti-koffert med HDFI",
    accent = "HDFI",
    description = "Kraftpipe-sett 22-38 mm i koffert med CNC-maskinert HDFI — hver pipe har sin plass.",
    facts = [
      ["Leveringstid", "3 uker"],
      ["Antall posisjoner", "14"],
      ["Materiale", "HDFI 30 mm"],
    ],
    photo: photoSrc = null,
  } = data;
  const wmInk = wordmarkImg("ink", { width: W * 0.13 });
  const children =
    `<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:${W * 0.04}px;flex:1;` +
    `position:relative;z-index:1;">` +
    `<div style="display:flex;flex-direction:column;">` +
    `${eyebrow("Levert til", { color: FT.red })}` +
    `<div style="font-weight:800;font-size:${W * 0.062}px;text-transform:uppercase;color:${FT.ink};line-height:1;` +
    `margin-top:${W * 0.006}px;letter-spacing:-0.01em;">${escapeHtml(customer)}</div>` +
    `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:rgba(15,17,21,0.55);letter-spacing:0.18em;` +
    `margin-top:${W * 0.006}px;text-transform:uppercase;">${escapeHtml(industry)}</div>` +
    `${rule({ color: FT.red, width: W * 0.06, style: `margin-top:${W * 0.018}px;` })}` +
    `<div style="font-weight:800;font-size:${W * 0.032}px;color:${FT.ink};line-height:1.15;text-transform:uppercase;` +
    `letter-spacing:-0.005em;margin-top:${W * 0.018}px;max-width:95%;">` +
    `${headlineHtml(headline, accent, { accentColor: FT.red })}</div>` +
    `<div style="font-size:${W * 0.018}px;color:rgba(15,17,21,0.7);line-height:1.5;margin-top:${W * 0.014}px;` +
    `max-width:92%;">${escapeHtml(description)}</div>` +
    `<div style="margin-top:${W * 0.024}px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:${W * 0.012}px;` +
    `border-top:1.5px solid rgba(15,17,21,0.18);padding-top:${W * 0.018}px;">` +
    facts
      .map(
        ([k, v]) =>
          `<div>` +
          `<div style="font-size:${W * 0.012}px;color:rgba(15,17,21,0.55);text-transform:uppercase;` +
          `letter-spacing:0.14em;font-weight:700;">${escapeHtml(k)}</div>` +
          `<div style="font-weight:800;font-size:${W * 0.024}px;color:${FT.ink};margin-top:${W * 0.004}px;">` +
          `${escapeHtml(v)}</div></div>`
      )
      .join("") +
    `</div></div>` +
    `<div style="position:relative;">` +
    `${photo({ W, src: photoSrc, tag: "Leveranse-foto", dark: false, radius: W * 0.014 })}</div></div>` +
    `<div style="margin-top:${W * 0.024}px;display:flex;align-items:center;justify-content:space-between;` +
    `position:relative;z-index:1;">` +
    `<div style="font-weight:800;font-size:${W * 0.02}px;color:${FT.ink};letter-spacing:0.02em;">` +
    `fosen-tools.no/leveranser</div>` +
    `${wmInk}</div>`;
  return frame({ W, H, bg: "cream", decor: "corners", pad: W * 0.05, children });
}

function leveranseBLI(W: number, H: number, data: LeveranseData = {}): string {
  const {
    customer = "TESS Vest",
    industry = "Industri",
    headline = "Skreddersydd Opti-koffert med HDFI",
    accent = "HDFI",
    description = "Kraftpipe-sett 22-38 mm i koffert med CNC-maskinert HDFI.",
    facts = [
      ["Leveringstid", "3 uker"],
      ["Posisjoner", "14"],
      ["Materiale", "HDFI 30 mm"],
    ],
    photo: photoSrc = null,
  } = data;
  const s = S(H);
  const children =
    `<div style="display:grid;grid-template-columns:1fr 1.1fr;gap:${s.gap}px;flex:1;` +
    `position:relative;z-index:1;">` +
    `<div style="display:flex;flex-direction:column;gap:${s.gapXs * 0.4}px;justify-content:center;">` +
    `${eyebrow("Levert til", { color: FT.red, fontSize: s.bodyXs })}` +
    `<div style="font-weight:800;font-size:${s.h2}px;text-transform:uppercase;color:${FT.ink};line-height:1;` +
    `letter-spacing:-0.01em;">${escapeHtml(customer)}</div>` +
    `<div style="font-family:${MONO};font-size:${s.bodyXs * 0.7}px;color:rgba(15,17,21,0.55);letter-spacing:0.16em;` +
    `text-transform:uppercase;">${escapeHtml(industry)}</div>` +
    `${rule({ color: FT.red, width: W * 0.04, style: `margin-top:${s.gapXs * 0.5}px;` })}` +
    `<div style="font-weight:800;font-size:${s.h4}px;color:${FT.ink};line-height:1.15;text-transform:uppercase;` +
    `margin-top:${s.gapXs * 0.5}px;">${headlineHtml(headline, accent, { accentColor: FT.red })}</div>` +
    `<div style="font-size:${s.bodyXs}px;color:rgba(15,17,21,0.7);line-height:1.45;margin-top:${s.gapXs * 0.3}px;">` +
    `${escapeHtml(description)}</div></div>` +
    `<div style="position:relative;display:flex;flex-direction:column;">` +
    `${photo({ W: W * 0.5, src: photoSrc, dark: false, radius: s.radius * 0.4, style: "flex:1;" })}` +
    `<div style="margin-top:${s.gapXs}px;display:grid;grid-template-columns:repeat(3,1fr);gap:${s.gapXs}px;` +
    `border-top:1.5px solid rgba(15,17,21,0.18);padding-top:${s.gapXs}px;">` +
    facts
      .map(
        ([k, v]) =>
          `<div>` +
          `<div style="font-size:${s.bodyXs * 0.6}px;color:rgba(15,17,21,0.55);text-transform:uppercase;` +
          `letter-spacing:0.14em;font-weight:700;">${escapeHtml(k)}</div>` +
          `<div style="font-weight:800;font-size:${s.bodySm}px;color:${FT.ink};margin-top:${s.gapXs * 0.2}px;">` +
          `${escapeHtml(v)}</div></div>`
      )
      .join("") +
    `</div></div></div>` +
    footerRow(W, H, { url: "fosen-tools.no/leveranser", ink: true });
  return frame({ W, H, bg: "cream", decor: "corners", pad: s.pad, children });
}

// =============================================================================
// 6C. LEVERANSE — Stempel / postkort
// =============================================================================

export function leveranseC(W: number, H: number, data: LeveranseData = {}): string {
  if (aspectOf(W, H) === "li") return leveranseCLI(W, H, data);
  const {
    customer = "TESS Vest",
    industry = "Industri",
    headline = "Skreddersydd Opti-koffert med HDFI",
    description = "Kraftpipe-sett 22-38 mm i koffert med CNC-maskinert HDFI — hver pipe har sin plass.",
    deliveryDate = "15.03.2026",
    orderNo = "FT-2026-0421",
    photo: photoSrc = null,
  } = data;
  const wmInk = wordmarkImg("ink", { width: W * 0.13 });
  const children =
    `<div style="position:absolute;top:${W * 0.06}px;right:${W * 0.06}px;transform:rotate(8deg);` +
    `border:4px solid ${FT.red};padding:${W * 0.012}px ${W * 0.022}px;color:${FT.red};font-weight:800;` +
    `font-size:${W * 0.026}px;letter-spacing:0.05em;border-radius:6px;z-index:2;background:rgba(245,241,232,0.92);">` +
    `LEVERT ✓</div>` +
    `<div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:${W * 0.014}px;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.014}px;color:rgba(15,17,21,0.6);` +
    `letter-spacing:0.18em;text-transform:uppercase;">ORDRE ${escapeHtml(orderNo)}</div></div>` +
    `<div style="flex:1;margin-top:${W * 0.022}px;position:relative;z-index:1;">` +
    `${photo({ W, src: photoSrc, dark: false, tag: "Leveranse-foto", radius: W * 0.012, style: "height:62%;" })}` +
    `<div style="margin-top:${W * 0.022}px;display:grid;grid-template-columns:1fr auto;gap:${W * 0.018}px;">` +
    `<div>` +
    `<div style="display:flex;align-items:baseline;gap:${W * 0.018}px;">` +
    `<div style="font-weight:800;font-size:${W * 0.038}px;color:${FT.red};text-transform:uppercase;">` +
    `${escapeHtml(customer)}</div>` +
    `<div style="font-family:${MONO};font-size:${W * 0.014}px;color:rgba(15,17,21,0.55);letter-spacing:0.14em;` +
    `text-transform:uppercase;">${escapeHtml(industry)}</div></div>` +
    `<div style="font-weight:800;font-size:${W * 0.032}px;color:${FT.ink};text-transform:uppercase;line-height:1.1;` +
    `margin-top:${W * 0.008}px;letter-spacing:-0.005em;">${escapeHtml(headline.toUpperCase())}</div>` +
    `<div style="font-size:${W * 0.018}px;color:rgba(15,17,21,0.7);line-height:1.5;margin-top:${W * 0.01}px;` +
    `max-width:95%;">${escapeHtml(description)}</div></div>` +
    `<div style="text-align:right;">` +
    `<div style="font-family:${MONO};font-size:${W * 0.012}px;color:rgba(15,17,21,0.5);letter-spacing:0.16em;` +
    `text-transform:uppercase;">LEVERT</div>` +
    `<div style="font-weight:800;font-size:${W * 0.022}px;color:${FT.ink};margin-top:${W * 0.004}px;">` +
    `${escapeHtml(deliveryDate)}</div></div></div></div>` +
    `<div style="margin-top:${W * 0.018}px;display:flex;justify-content:space-between;align-items:center;` +
    `position:relative;z-index:1;border-top:2px solid rgba(15,17,21,0.85);padding-top:${W * 0.014}px;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${W * 0.018}px;color:${FT.ink};letter-spacing:0.06em;">` +
    `fosen-tools.no</div>` +
    `${wmInk}</div>`;
  return frame({ W, H, bg: "creamWarm", decor: "corners", pad: W * 0.05, children });
}

function leveranseCLI(W: number, H: number, data: LeveranseData = {}): string {
  const {
    customer = "TESS Vest",
    industry = "Industri",
    headline = "Skreddersydd Opti-koffert med HDFI",
    description = "Kraftpipe-sett 22-38 mm — hver pipe har sin plass.",
    orderNo = "FT-2026-0421",
    photo: photoSrc = null,
  } = data;
  const children =
    `<div style="position:absolute;top:${H * 0.05}px;right:${H * 0.05}px;transform:rotate(8deg);` +
    `border:3px solid ${FT.red};padding:${H * 0.014}px ${H * 0.022}px;color:${FT.red};font-weight:800;` +
    `font-size:${H * 0.034}px;letter-spacing:0.05em;border-radius:6px;z-index:2;background:rgba(245,241,232,0.92);">` +
    `LEVERT ✓</div>` +
    `<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:${H * 0.04}px;flex:1;` +
    `position:relative;z-index:1;align-items:stretch;">` +
    `${photo({ W: W * 0.5, src: photoSrc, dark: false, tag: "Leveranse-foto", radius: H * 0.014 })}` +
    `<div style="display:flex;flex-direction:column;justify-content:center;gap:${H * 0.012}px;">` +
    `<div style="font-family:${MONO};font-weight:700;font-size:${H * 0.022}px;color:rgba(15,17,21,0.55);` +
    `letter-spacing:0.18em;text-transform:uppercase;">ORDRE ${escapeHtml(orderNo)}</div>` +
    `<div style="display:flex;align-items:baseline;gap:${H * 0.024}px;">` +
    `<div style="font-weight:800;font-size:${H * 0.06}px;color:${FT.red};text-transform:uppercase;` +
    `letter-spacing:-0.01em;line-height:1;">${escapeHtml(customer)}</div>` +
    `<div style="font-family:${MONO};font-size:${H * 0.02}px;color:rgba(15,17,21,0.55);letter-spacing:0.14em;` +
    `text-transform:uppercase;">${escapeHtml(industry)}</div></div>` +
    `<div style="font-weight:800;font-size:${H * 0.04}px;color:${FT.ink};text-transform:uppercase;line-height:1.1;` +
    `letter-spacing:-0.005em;">${escapeHtml(headline.toUpperCase())}</div>` +
    `<div style="font-size:${H * 0.024}px;color:rgba(15,17,21,0.7);line-height:1.45;">` +
    `${escapeHtml(description)}</div></div></div>` +
    footerRow(W, H, { url: "fosen-tools.no", ink: true });
  return frame({ W, H, bg: "creamWarm", decor: "corners", pad: H * 0.06, children });
}
