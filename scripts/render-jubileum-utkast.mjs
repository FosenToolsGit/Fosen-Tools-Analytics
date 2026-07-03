/**
 * Jubileums-utkast v3 — 10 poster (T-11 → DAG) i 4:5 (1080×1350)
 *
 * v3: Editorial premium. Mindre er mer. Én sterk typografisk statement per
 *     post, foto-fokus, restraint på gull og rødt. Inspirert av teaseren.
 *
 * Output: ~/Downloads/jubileum-utkast-2026-06/T-XX-{slug}-4-5.png
 *   node scripts/render-jubileum-utkast.mjs
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = process.cwd();
const FONT_DIR = path.join(ROOT, "public/social/fonts");
const ASSET_DIR = path.join(ROOT, "public/brosjyre");
const OUT_DIR = path.join(os.homedir(), "Downloads/jubileum-utkast-2026-06");

const W = 1080;
const H = 1350;

// ─── Inline font + assets ──────────────────────────────────────────────
function loadB64(file) {
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file).toString("base64");
}
const fonts = {
  400: loadB64(path.join(FONT_DIR, "manrope-latin-400-normal.woff2")),
  700: loadB64(path.join(FONT_DIR, "manrope-latin-700-normal.woff2")),
  800: loadB64(path.join(FONT_DIR, "manrope-latin-800-normal.woff2")),
};
const FONT_FACE_CSS = Object.entries(fonts)
  .filter(([_, b]) => b)
  .map(([w, b]) => `@font-face{font-family:'Manrope';font-weight:${w};src:url(data:font/woff2;base64,${b}) format('woff2');}`)
  .join("\n");

const jub25Svg = fs.readFileSync(path.join(ASSET_DIR, "Jubileumslogo-25aar.svg"), "utf-8");
const jub25 = `data:image/svg+xml;base64,${Buffer.from(jub25Svg).toString("base64")}`;
const jub100Svg = fs.readFileSync(path.join(ASSET_DIR, "Jubileumslogo-100aar.svg"), "utf-8");
const jub100 = `data:image/svg+xml;base64,${Buffer.from(jub100Svg).toString("base64")}`;
const ftLogo = `data:image/png;base64,${fs.readFileSync(path.join(ASSET_DIR, "fosentools_logo_ny2.png")).toString("base64")}`;

// ─── FT-tokens ─────────────────────────────────────────────────────────
const FT = {
  red: "#ED1C24",
  redDeep: "#A8141A",
  ink: "#0F1115",
  inkSoft: "#1A1D23",
  white: "#FFFFFF",
  goldTop: "#85704D",
  goldMid: "#C9A06A",
  goldBottom: "#F0CE84",
  paper: "#F4F1EC",
};

// ─── Editorial helpers ─────────────────────────────────────────────────

/** Gull-gradient signatur-stripe (teaser-DNA) */
function goldStripe(height = 5) {
  return `<div style="position:absolute;top:0;left:0;right:0;height:${height}px;background:linear-gradient(90deg,${FT.goldTop},${FT.goldBottom},${FT.goldTop});z-index:6;"></div>`;
}

/** Datostempel — elegant, sirkulær, gull-kant. Brukes som signatur-anker */
function dateStamp({ top = "auto", right = "auto", bottom = "auto", left = "auto", size = 160 }) {
  return `
    <div style="position:absolute;top:${top};right:${right};bottom:${bottom};left:${left};
      width:${size}px;height:${size}px;border-radius:50%;background:${FT.red};
      border:3px solid ${FT.goldBottom};
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      box-shadow:0 8px 24px rgba(0,0,0,0.4);z-index:5;">
      <div style="font-size:11px;font-weight:800;letter-spacing:0.24em;color:${FT.goldBottom};text-transform:uppercase;margin-bottom:2px;">Fredag</div>
      <div style="font-size:${Math.round(size * 0.42)}px;font-weight:800;line-height:0.9;color:${FT.white};letter-spacing:-0.04em;">26.</div>
      <div style="font-size:${Math.round(size * 0.16)}px;font-weight:800;letter-spacing:0.08em;color:${FT.white};margin-top:-2px;">JUNI</div>
    </div>
  `;
}

/** Eyebrow-chip — liten gull-tag for tema-label */
function eyebrowChip(text, color = FT.goldBottom) {
  return `<div style="display:inline-block;font-size:16px;font-weight:800;letter-spacing:0.3em;color:${color};text-transform:uppercase;padding-bottom:8px;border-bottom:2px solid ${color};">${text}</div>`;
}

/** Foto-placeholder — minimal, refined */
function photoPlaceholder(label, height = "100%") {
  return `
    <div style="position:relative;width:100%;height:${height};
      background:linear-gradient(135deg,#252830 0%,#1a1d23 100%);
      display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <div style="text-align:center;color:rgba(255,255,255,0.55);font-family:'Manrope',sans-serif;
        padding:24px 36px;border:1.5px dashed rgba(240,206,132,0.35);">
        <div style="font-size:13px;font-weight:800;letter-spacing:0.28em;text-transform:uppercase;color:${FT.goldBottom};margin-bottom:8px;">📷 Foto</div>
        <div style="font-size:22px;font-weight:800;color:${FT.white};letter-spacing:0.01em;">${label}</div>
      </div>
    </div>`;
}

/** Topp-bånd: liten FT-logo + 25/100-logo, refined */
function brandRow({ ftH = 30, jubH = 64, padding = "24px 32px", jub100Show = false, onDark = true } = {}) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:${padding};position:relative;z-index:3;">
      <img src="${ftLogo}" alt="Fosen Tools" style="height:${ftH}px;width:auto;display:block;"/>
      <div style="display:flex;gap:12px;align-items:center;">
        ${jub100Show ? `<img src="${jub100}" alt="100 år" style="height:${jubH}px;width:auto;display:block;"/>` : ""}
        <img src="${jub25}" alt="25 år" style="height:${jubH}px;width:auto;display:block;"/>
      </div>
    </div>
  `;
}

/** Bunn-meta: dato + sted, editorial-feel */
function metaBar({ bg = FT.ink } = {}) {
  return `
    <div style="background:${bg};color:${FT.white};padding:18px 32px;display:flex;justify-content:space-between;align-items:center;gap:20px;border-top:1px solid rgba(240,206,132,0.25);">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="font-size:24px;font-weight:800;color:${FT.goldBottom};letter-spacing:-0.02em;">26.06</div>
        <div style="width:1px;height:18px;background:rgba(255,255,255,0.25);"></div>
        <div style="font-size:14px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${FT.white};">10:00–16:00</div>
      </div>
      <div style="font-size:13px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.7);">Industrigata 1 · Brekstad</div>
    </div>
  `;
}

/** Base HTML-wrapper */
function wrap(body, bg = FT.ink) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_FACE_CSS}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;}
body{font-family:'Manrope',-apple-system,sans-serif;background:${bg};color:${FT.white};
  display:flex;flex-direction:column;overflow:hidden;position:relative;}
</style></head><body>${body}</body></html>`;
}

// ─── 10 poster — editorial pop ─────────────────────────────────────────

// ═══ T-11 · BAK KULISSENE ═════════════════════════════════════════════
function html_T11_BTS() {
  return wrap(`
    ${brandRow()}
    <div style="flex:1;position:relative;overflow:hidden;">
      ${photoPlaceholder("BTS: Ombygging av PROFF-flate")}
      <!-- Editorial overlay nede til venstre -->
      <div style="position:absolute;bottom:36px;left:36px;right:36px;z-index:4;">
        ${eyebrowChip("Bak kulissene")}
        <div style="font-size:96px;font-weight:800;line-height:0.92;letter-spacing:-0.03em;color:${FT.white};margin-top:18px;text-shadow:0 4px 20px rgba(0,0,0,0.5);">
          Vi bygger<br/>noe stort.
        </div>
        <div style="font-size:20px;font-weight:700;color:${FT.goldBottom};letter-spacing:0.14em;text-transform:uppercase;margin-top:16px;">
          Ny PROFF-butikk · Åpner 26. juni
        </div>
      </div>
      ${goldStripe()}
    </div>
    ${metaBar()}
  `);
}

// ═══ T-10 · ARNE FRODE-SITAT ═══════════════════════════════════════════
function html_T10_Sitat() {
  return wrap(`
    ${brandRow({ jub100Show: true, jubH: 60 })}
    <!-- Foto top -->
    <div style="height:44%;position:relative;">
      ${photoPlaceholder("Portrett: Arne Frode Pettersen", "100%")}
    </div>
    <!-- Sitat på paper-bakgrunn for editorial-feel -->
    <div style="flex:1;background:${FT.paper};color:${FT.ink};padding:42px 50px 32px;display:flex;flex-direction:column;justify-content:space-between;position:relative;">
      <!-- Gull-stripe -->
      <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,${FT.goldTop},${FT.goldBottom},${FT.goldTop});"></div>
      <!-- Stor open-quote i gull -->
      <div style="font-size:140px;line-height:0.7;color:${FT.goldMid};font-family:Georgia,serif;font-weight:900;margin-bottom:-20px;opacity:0.5;">"</div>
      <div style="font-size:32px;font-weight:700;line-height:1.35;color:${FT.ink};font-style:italic;flex:1;">
        [Sitat fra Arne Frode kommer inn her — om hva 25 år med Fosen Tools betyr, eller 100 år i familiekonsernet]
      </div>
      <div style="border-top:1px solid rgba(15,17,21,0.18);padding-top:18px;margin-top:18px;">
        <div style="font-size:22px;font-weight:800;letter-spacing:-0.01em;color:${FT.ink};">Arne Frode Pettersen</div>
        <div style="font-size:13px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:${FT.red};margin-top:6px;">25 år Fosen Tools · 100 år i konsernet</div>
      </div>
    </div>
  `);
}

// ═══ T-9 · PROGRAMMET ═════════════════════════════════════════════════
function html_T9_Programmet() {
  const program = [
    { t: "10:00", l: "Vi åpner dørene" },
    { t: "11:00", l: "Grilling starter" },
    { t: "13:00", l: "PROFF-butikk-presentasjon" },
    { t: "16:00", l: "Vi stenger" },
  ];
  const rows = program.map(p => `
    <div style="display:flex;align-items:baseline;gap:32px;padding:20px 0;border-bottom:1px solid rgba(255,255,255,0.18);">
      <div style="font-size:42px;font-weight:800;color:${FT.goldBottom};letter-spacing:-0.02em;min-width:140px;">${p.t}</div>
      <div style="font-size:28px;font-weight:700;color:${FT.white};line-height:1.2;flex:1;">${p.l}</div>
    </div>`).join("");

  return wrap(`
    <div style="position:relative;height:100%;background:${FT.ink};display:flex;flex-direction:column;">
      ${goldStripe()}
      ${brandRow()}
      <div style="padding:24px 50px 40px;flex:1;display:flex;flex-direction:column;">
        ${eyebrowChip("Programmet")}
        <div style="font-size:104px;font-weight:800;line-height:0.9;letter-spacing:-0.035em;color:${FT.white};margin-top:18px;">
          26. juni
        </div>
        <div style="font-size:26px;font-weight:800;color:${FT.goldBottom};letter-spacing:0.06em;margin-top:6px;margin-bottom:32px;">
          10:00 – 16:00
        </div>
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
          ${rows}
        </div>
        <div style="font-size:14px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.6);margin-top:30px;text-align:center;">
          Industrigata 1 · Brekstad
        </div>
      </div>
    </div>
  `, FT.ink);
}

// ═══ T-8 · MILWAUKEE / T-4 · SOUDAL ════════════════════════════════════
function html_Leverandor({ brand, tag, photoLabel }) {
  return wrap(`
    ${brandRow()}
    <div style="flex:1;position:relative;overflow:hidden;">
      ${photoPlaceholder(photoLabel)}
      <!-- Editorial overlay -->
      <div style="position:absolute;bottom:0;left:0;right:0;padding:36px;
        background:linear-gradient(0deg,rgba(15,17,21,0.92) 0%,rgba(15,17,21,0.75) 60%,transparent 100%);z-index:4;">
        ${eyebrowChip("Leverandør på besøk")}
        <div style="font-size:120px;font-weight:800;line-height:0.92;letter-spacing:-0.045em;color:${FT.white};margin-top:14px;">
          ${brand}
        </div>
        <div style="font-size:22px;font-weight:700;color:${FT.goldBottom};letter-spacing:0.14em;text-transform:uppercase;margin-top:10px;">
          ${tag} · 26. juni
        </div>
      </div>
      ${dateStamp({ top: "30px", right: "30px", size: 130 })}
      ${goldStripe()}
    </div>
    ${metaBar()}
  `);
}
function html_T8_Milwaukee() { return html_Leverandor({ brand: "Milwaukee", tag: "Amerikansk kraft", photoLabel: "Milwaukee-produkt" }); }
function html_T4_Soudal()    { return html_Leverandor({ brand: "Soudal",    tag: "Belgisk kvalitet",  photoLabel: "Soudal-produkt" }); }

// ═══ T-7 · WERA + 1 UKE IGJEN ══════════════════════════════════════════
function html_T7_Wera() {
  return wrap(`
    <div style="position:relative;height:100%;background:${FT.ink};display:flex;flex-direction:column;">
      ${goldStripe()}
      ${brandRow()}
      <!-- Typografisk countdown -->
      <div style="padding:30px 50px 24px;text-align:center;border-bottom:1px solid rgba(240,206,132,0.25);">
        ${eyebrowChip("Countdown")}
        <div style="display:flex;align-items:baseline;justify-content:center;gap:24px;margin-top:18px;">
          <div style="font-size:240px;font-weight:800;line-height:0.85;color:${FT.white};letter-spacing:-0.06em;">1</div>
          <div style="text-align:left;">
            <div style="font-size:38px;font-weight:800;color:${FT.goldBottom};letter-spacing:-0.01em;line-height:1;">uke</div>
            <div style="font-size:38px;font-weight:800;color:${FT.red};letter-spacing:-0.01em;line-height:1;margin-top:6px;">igjen</div>
          </div>
        </div>
      </div>
      <!-- Wera-spotlight -->
      <div style="flex:1;position:relative;overflow:hidden;">
        ${photoPlaceholder("Wera-produkt")}
        <div style="position:absolute;bottom:0;left:0;right:0;padding:30px 36px;
          background:linear-gradient(0deg,rgba(15,17,21,0.92) 0%,rgba(15,17,21,0.6) 70%,transparent 100%);z-index:4;">
          ${eyebrowChip("Leverandør på besøk")}
          <div style="font-size:88px;font-weight:800;letter-spacing:-0.04em;line-height:0.95;color:${FT.white};margin-top:10px;">WERA</div>
          <div style="font-size:18px;font-weight:700;color:${FT.goldBottom};letter-spacing:0.14em;text-transform:uppercase;margin-top:8px;">
            Tysk presisjon · 26. juni
          </div>
        </div>
      </div>
      ${metaBar()}
    </div>
  `);
}

// ═══ T-3 · RED BULL + TESLA ════════════════════════════════════════════
function html_T3_RedBullTesla() {
  return wrap(`
    <div style="position:relative;height:100%;background:${FT.ink};display:flex;flex-direction:column;">
      ${goldStripe()}
      ${brandRow()}
      <div style="flex:1;padding:30px 50px 30px;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          ${eyebrowChip("Spesielle gjester")}
          <div style="font-size:100px;font-weight:800;line-height:0.92;letter-spacing:-0.035em;color:${FT.white};margin-top:18px;">
            Du leste<br/><span style="color:${FT.goldBottom};">rett.</span>
          </div>
        </div>
        <div style="display:flex;gap:18px;align-items:stretch;height:280px;">
          <div style="flex:1;background:${FT.white};border:2px solid ${FT.goldBottom};border-radius:4px;display:flex;align-items:center;justify-content:center;padding:24px;">
            <div style="text-align:center;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.24em;color:${FT.goldMid};text-transform:uppercase;margin-bottom:14px;">Logo kommer</div>
              <div style="font-size:46px;font-weight:800;color:${FT.ink};letter-spacing:-0.02em;line-height:1;">Red Bull</div>
            </div>
          </div>
          <div style="flex:1;background:${FT.white};border:2px solid ${FT.goldBottom};border-radius:4px;display:flex;align-items:center;justify-content:center;padding:24px;">
            <div style="text-align:center;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.24em;color:${FT.goldMid};text-transform:uppercase;margin-bottom:14px;">Logo kommer</div>
              <div style="font-size:46px;font-weight:800;color:${FT.ink};letter-spacing:-0.02em;line-height:1;">Tesla</div>
            </div>
          </div>
        </div>
        <div style="font-size:22px;font-weight:700;color:${FT.goldBottom};letter-spacing:0.14em;text-transform:uppercase;text-align:center;">
          På Brekstad · 26. juni
        </div>
      </div>
      ${metaBar()}
    </div>
  `);
}

// ═══ T-2 · HYPE ═══════════════════════════════════════════════════════
function html_T2_Hype() {
  const items = [
    { ico: "🔥", l: "Grilling", s: "Fra kl. 11" },
    { ico: "🎁", l: "Goodiebag", s: "Til besøkende" },
    { ico: "🎯", l: "Konkurranser", s: "Skikkelige premier" },
  ];
  const cards = items.map(it => `
    <div style="background:${FT.ink};padding:30px 22px;display:flex;flex-direction:column;align-items:center;text-align:center;flex:1;border:1px solid rgba(240,206,132,0.35);">
      <div style="font-size:60px;line-height:1;margin-bottom:14px;">${it.ico}</div>
      <div style="font-size:24px;font-weight:800;color:${FT.white};letter-spacing:-0.01em;line-height:1;">${it.l}</div>
      <div style="font-size:13px;font-weight:800;color:${FT.goldBottom};letter-spacing:0.14em;margin-top:8px;text-transform:uppercase;">${it.s}</div>
    </div>`).join("");

  return wrap(`
    <div style="position:relative;height:100%;background:${FT.red};display:flex;flex-direction:column;">
      ${goldStripe()}
      ${brandRow()}
      <div style="padding:24px 50px 36px;flex:1;display:flex;flex-direction:column;">
        ${eyebrowChip("2 dager igjen")}
        <div style="font-size:96px;font-weight:800;line-height:0.92;letter-spacing:-0.035em;color:${FT.white};margin-top:18px;margin-bottom:32px;">
          Det skjer<br/>noe stort.
        </div>
        <div style="display:flex;gap:14px;flex:1;align-items:stretch;">
          ${cards}
        </div>
        <div style="font-size:14px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.85);margin-top:24px;text-align:center;">
          Alt kun i butikken · Industrigata 1 · Brekstad
        </div>
      </div>
    </div>
  `, FT.red);
}

// ═══ T-1 · I MORGEN ════════════════════════════════════════════════════
function html_T1_IMorgen() {
  return wrap(`
    <div style="position:relative;height:100%;display:flex;flex-direction:column;overflow:hidden;background:${FT.ink};">
      <!-- Foto top -->
      <div style="height:46%;position:relative;">
        ${photoPlaceholder("Generasjons-/historiebilde", "100%")}
        <div style="position:absolute;top:0;left:0;right:0;padding:24px 32px;
          background:linear-gradient(180deg,rgba(15,17,21,0.85) 0%,transparent 100%);
          display:flex;justify-content:space-between;align-items:center;z-index:3;">
          <img src="${ftLogo}" alt="Fosen Tools" style="height:30px;width:auto;"/>
          <div style="display:flex;gap:12px;align-items:center;">
            <img src="${jub25}" alt="25 år" style="height:64px;"/>
            <img src="${jub100}" alt="100 år" style="height:64px;"/>
          </div>
        </div>
      </div>
      <!-- I MORGEN -->
      <div style="background:${FT.red};color:${FT.white};padding:36px 40px 28px;position:relative;">
        ${eyebrowChip("I morgen", FT.goldBottom)}
        <div style="display:flex;align-items:baseline;gap:18px;margin-top:14px;">
          <div style="font-size:160px;font-weight:800;line-height:0.85;letter-spacing:-0.04em;color:${FT.white};">26.</div>
          <div>
            <div style="font-size:48px;font-weight:800;color:${FT.goldBottom};letter-spacing:-0.02em;line-height:1;">JUNI</div>
            <div style="font-size:18px;font-weight:800;letter-spacing:0.14em;color:${FT.white};text-transform:uppercase;margin-top:6px;">10–16</div>
          </div>
        </div>
        <div style="font-size:22px;font-weight:700;line-height:1.3;margin-top:14px;color:rgba(255,255,255,0.95);">
          25 år Fosen Tools · 100 år i konsernet
        </div>
      </div>
      <!-- Warning -->
      <div style="flex:1;background:${FT.ink};color:${FT.white};padding:24px 40px;display:flex;align-items:center;gap:18px;border-top:2px solid ${FT.goldBottom};">
        <div style="font-size:34px;flex-shrink:0;">⚠</div>
        <div>
          <div style="font-size:22px;font-weight:800;line-height:1.25;color:${FT.white};">
            Dagstilbudene gjelder <span style="color:${FT.goldBottom};">KUN i butikken</span>
          </div>
          <div style="font-size:15px;font-weight:700;color:rgba(255,255,255,0.7);margin-top:6px;line-height:1.35;">
            Ikke nett. Ikke telefon. Du må være på plass.
          </div>
        </div>
      </div>
    </div>
  `);
}

// ═══ DAG · VI ER ÅPNE ═════════════════════════════════════════════════
function html_DAG_VierApne() {
  return wrap(`
    <div style="position:relative;height:100%;display:flex;flex-direction:column;overflow:hidden;background:${FT.ink};">
      <!-- Live-foto -->
      <div style="height:58%;position:relative;">
        ${photoPlaceholder("Live foto fra butikken på dagen", "100%")}
        <div style="position:absolute;top:0;left:0;right:0;padding:24px 32px;
          background:linear-gradient(180deg,rgba(15,17,21,0.85) 0%,transparent 100%);
          display:flex;justify-content:space-between;align-items:center;z-index:3;">
          <img src="${ftLogo}" alt="Fosen Tools" style="height:32px;width:auto;"/>
          <img src="${jub25}" alt="25 år" style="height:72px;"/>
        </div>
        <!-- ÅPENT-pulse i hjørne -->
        <div style="position:absolute;top:32px;right:140px;background:${FT.red};color:${FT.white};padding:8px 18px;font-size:14px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;border:1.5px solid ${FT.goldBottom};">
          ● Åpent nå
        </div>
      </div>
      <!-- VI ER ÅPNE -->
      <div style="background:${FT.red};color:${FT.white};padding:36px 36px 28px;position:relative;">
        ${goldStripe(4)}
        <div style="font-size:130px;font-weight:800;line-height:0.85;letter-spacing:-0.045em;color:${FT.white};text-align:center;">
          Vi er <span style="color:${FT.goldBottom};">åpne</span>
        </div>
      </div>
      <!-- Info -->
      <div style="flex:1;background:${FT.ink};color:${FT.white};padding:22px 36px;display:flex;justify-content:space-between;align-items:center;gap:20px;border-top:1px solid rgba(240,206,132,0.3);">
        <div>
          <div style="font-size:13px;font-weight:800;letter-spacing:0.22em;color:${FT.goldBottom};text-transform:uppercase;margin-bottom:6px;">Brekstad feirer</div>
          <div style="font-size:24px;font-weight:800;line-height:1.1;color:${FT.white};">
            25 år · 100 år i konsernet
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:18px;font-weight:800;color:${FT.white};letter-spacing:0.04em;">Åpent til 16</div>
          <div style="font-size:12px;font-weight:700;color:rgba(255,255,255,0.65);letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;">Industrigata 1</div>
        </div>
      </div>
    </div>
  `);
}

// ─── Render-loop ───────────────────────────────────────────────────────
const POSTS = [
  { id: "T-11", slug: "bts-ombygging",    name: "Bak kulissene",       html: html_T11_BTS },
  { id: "T-10", slug: "arne-frode-sitat", name: "Arne Frode-sitat",    html: html_T10_Sitat },
  { id: "T-9",  slug: "programmet",       name: "Programmet 26. juni", html: html_T9_Programmet },
  { id: "T-8",  slug: "milwaukee",        name: "Milwaukee-spotlight", html: html_T8_Milwaukee },
  { id: "T-7",  slug: "wera-countdown",   name: "Wera + 1 uke igjen",  html: html_T7_Wera },
  { id: "T-4",  slug: "soudal",           name: "Soudal-spotlight",    html: html_T4_Soudal },
  { id: "T-3",  slug: "redbull-tesla",    name: "Red Bull + Tesla",    html: html_T3_RedBullTesla },
  { id: "T-2",  slug: "hype",             name: "Goodiebag + hype",    html: html_T2_Hype },
  { id: "T-1",  slug: "i-morgen",         name: "I morgen + 100 år",   html: html_T1_IMorgen },
  { id: "DAG",  slug: "vi-er-aapne",      name: "VI ER ÅPNE!",         html: html_DAG_VierApne },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log("🚀 Starter Chromium…");
  const browser = await chromium.launch({ headless: true });
  for (const post of POSTS) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    await page.setContent(post.html(), { waitUntil: "networkidle", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    const outPath = path.join(OUT_DIR, `${post.id}-${post.slug}-4-5.png`);
    await page.screenshot({ path: outPath, type: "png" });
    const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(0);
    console.log(`  ✅ ${post.id} · ${post.name.padEnd(28)} (${sizeKb} kB)`);
    await page.close();
  }
  await browser.close();
  console.log(`\n🎉 Ferdig (${POSTS.length} utkast): ${OUT_DIR}`);
}

main().catch((err) => { console.error("❌", err); process.exit(1); });
