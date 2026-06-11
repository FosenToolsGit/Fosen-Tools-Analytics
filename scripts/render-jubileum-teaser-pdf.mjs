/**
 * Jubileums-teaser — beslutnings-PDF til Erik
 *
 * En A4 PDF med teaser-bildet, captions for FB/IG/LinkedIn, og full GEO-ad-plan
 * med budsjett-tabell og tidslinje. Til godkjenning før vi setter opp annonsen
 * i Meta Ads Manager.
 *
 *   node scripts/render-jubileum-teaser-pdf.mjs
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = process.cwd();
const TEASER_IMG = path.join(os.homedir(), "Downloads/jubileum-teaser-2026-06/01-teaser-26juni.png");
const FONT_DIR = path.join(ROOT, "public/social/fonts");
const ASSET_DIR = path.join(ROOT, "public/brosjyre");
const OUT_PATH = path.join(os.homedir(), "Downloads/jubileum-teaser-2026-06/Jubileum-Teaser-til-Erik.pdf");

// ─── Font + asset inlining ─────────────────────────────────────────────
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
  .map(
    ([w, b]) =>
      `@font-face{font-family:'Manrope';font-weight:${w};src:url(data:font/woff2;base64,${b}) format('woff2');}`,
  )
  .join("\n");

const jub25Svg = fs.readFileSync(path.join(ASSET_DIR, "Jubileumslogo-25aar.svg"), "utf-8");
const jub25DataUri = `data:image/svg+xml;base64,${Buffer.from(jub25Svg).toString("base64")}`;

const teaserDataUri = `data:image/png;base64,${fs.readFileSync(TEASER_IMG).toString("base64")}`;

// ─── FT design-tokens ──────────────────────────────────────────────────
const FT = {
  red: "#ED1C24",
  redDark: "#B8141A",
  ink: "#0F1115",
  inkLight: "#1B1E23",
  white: "#FFFFFF",
  goldTop: "#85704D",
  goldBottom: "#DBB78B",
  grey: "#F5F7FA",
  greyText: "#475569",
};

// ─── HTML ──────────────────────────────────────────────────────────────
function html() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_FACE_CSS}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{font-family:'Manrope',-apple-system,sans-serif;color:${FT.ink};
  -webkit-font-smoothing:antialiased;line-height:1.4;}
body{background:#fff;}
.page{width:210mm;height:297mm;padding:13mm 14mm 18mm;page-break-after:always;
  position:relative;display:flex;flex-direction:column;overflow:hidden;}
.page:last-child{page-break-after:auto;}

.brand-stripe{position:absolute;top:0;left:0;right:0;height:6mm;
  background:linear-gradient(90deg,${FT.red} 0%,${FT.red} 70%,${FT.goldBottom} 100%);}

.header{display:flex;align-items:center;justify-content:space-between;margin-top:8mm;margin-bottom:6mm;}
.header h1{font-size:18pt;font-weight:800;color:${FT.ink};letter-spacing:-0.01em;line-height:1.1;}
.header .meta{font-size:8pt;font-weight:700;letter-spacing:0.18em;color:${FT.greyText};text-transform:uppercase;text-align:right;}
.header .meta .date{color:${FT.red};margin-top:2px;}

.eyebrow{font-size:8pt;font-weight:800;letter-spacing:0.28em;color:${FT.red};
  text-transform:uppercase;margin-bottom:3mm;}
.h2{font-size:13pt;font-weight:800;color:${FT.ink};margin-bottom:3mm;letter-spacing:-0.01em;}
.h3{font-size:10pt;font-weight:800;color:${FT.ink};margin-bottom:2mm;text-transform:uppercase;letter-spacing:0.08em;}
p{font-size:9pt;color:${FT.ink};margin-bottom:2mm;}
.small{font-size:8pt;color:${FT.greyText};}

.summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin:4mm 0 6mm;}
.summary-card{background:${FT.grey};padding:5mm 6mm;border-radius:2mm;border-left:3px solid ${FT.red};}
.summary-card .label{font-size:7.5pt;font-weight:800;letter-spacing:0.2em;color:${FT.greyText};text-transform:uppercase;margin-bottom:1.5mm;}
.summary-card .value{font-size:14pt;font-weight:800;color:${FT.ink};line-height:1.05;}
.summary-card .sub{font-size:8pt;color:${FT.greyText};margin-top:1mm;}

.teaser-preview{display:flex;justify-content:center;margin:1mm 0 4mm;flex:1;align-items:center;}
.teaser-preview img{max-height:115mm;width:auto;box-shadow:0 6mm 14mm rgba(0,0,0,0.18);border-radius:1mm;}

.caption-card{background:#fff;border:1px solid #E2E8F0;border-radius:2mm;
  padding:4mm 5mm;margin-bottom:3mm;page-break-inside:avoid;}
.caption-card .platform{display:flex;align-items:center;gap:3mm;margin-bottom:2mm;}
.caption-card .platform .icon{font-size:13pt;}
.caption-card .platform .name{font-size:9.5pt;font-weight:800;color:${FT.ink};letter-spacing:0.04em;}
.caption-card .platform .badge{margin-left:auto;font-size:6.5pt;font-weight:800;letter-spacing:0.18em;
  background:${FT.ink};color:${FT.white};padding:1mm 2.5mm;border-radius:1mm;text-transform:uppercase;}
.caption-card .text{font-size:8.5pt;line-height:1.45;color:${FT.ink};white-space:pre-wrap;font-family:'Manrope',sans-serif;}
.caption-card .hashtags{margin-top:2.5mm;padding-top:2.5mm;border-top:1px dashed #CBD5E1;
  font-size:7.5pt;color:${FT.greyText};font-style:italic;}

.budget-table{width:100%;border-collapse:collapse;margin:3mm 0 4mm;font-size:9pt;}
.budget-table th{background:${FT.ink};color:${FT.white};font-weight:800;padding:2.5mm 4mm;
  text-align:left;font-size:8pt;letter-spacing:0.06em;text-transform:uppercase;}
.budget-table th:last-child{text-align:right;}
.budget-table td{padding:2mm 4mm;border-bottom:1px solid #E2E8F0;}
.budget-table td:last-child{text-align:right;font-weight:700;}
.budget-table tr.highlight td{background:${FT.grey};font-weight:800;color:${FT.red};border-bottom:none;}
.timeline-table td{padding:1.5mm 4mm;font-size:8pt;}

.targeting-box{background:${FT.grey};border-radius:2mm;padding:5mm 6mm;margin-bottom:5mm;}
.targeting-box .row{display:flex;justify-content:space-between;padding:2mm 0;
  border-bottom:1px solid #E2E8F0;font-size:9pt;}
.targeting-box .row:last-child{border-bottom:none;}
.targeting-box .row .label{font-weight:800;color:${FT.greyText};letter-spacing:0.04em;text-transform:uppercase;font-size:7.5pt;}
.targeting-box .row .val{color:${FT.ink};font-weight:600;text-align:right;flex-shrink:0;margin-left:8mm;max-width:55%;}

.timeline{margin:3mm 0;}
.timeline-item{display:flex;gap:4mm;padding:3mm 0;border-bottom:1px solid #E2E8F0;font-size:9pt;}
.timeline-item:last-child{border-bottom:none;}
.timeline-item .when{flex-shrink:0;width:30mm;font-weight:800;color:${FT.red};letter-spacing:0.04em;}
.timeline-item .what{color:${FT.ink};}

.callout{background:${FT.red};color:${FT.white};padding:5mm 6mm;border-radius:2mm;margin:4mm 0;
  font-size:9pt;line-height:1.5;}
.callout .label{font-size:7.5pt;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;
  color:${FT.goldBottom};margin-bottom:2mm;}
.callout strong{font-weight:800;}

.footer{position:absolute;bottom:5mm;left:14mm;right:14mm;display:flex;justify-content:space-between;align-items:center;
  border-top:1px solid #E2E8F0;padding-top:3mm;font-size:7pt;color:${FT.greyText};letter-spacing:0.1em;
  text-transform:uppercase;font-weight:700;}
.footer .jub{height:8mm;width:auto;}

.divider-gold{height:2px;background:linear-gradient(90deg,${FT.goldTop},${FT.goldBottom},${FT.goldTop});
  margin:4mm 0 5mm;border-radius:1px;}
</style></head><body>

<!-- ════════════════════════ SIDE 1 ════════════════════════ -->
<div class="page">
  <div class="brand-stripe"></div>

  <div class="header">
    <div>
      <h1>Jubileums-teaser<br/>26. juni 2026</h1>
    </div>
    <div class="meta">
      Til Erik · Adrian<br/>
      <span class="date">3. juni 2026</span>
    </div>
  </div>

  <div class="eyebrow">For godkjenning · GEO-ad uke 24</div>

  <p style="font-size:10pt;color:${FT.greyText};line-height:1.55;">
    Første teaser-post i jubileums-kampanjen — geo-rettet mot Fosen-regionen
    via betalt Facebook/Instagram-promotering. Bygger nysgjerrighet rundt
    25-årsjubileet og åpningen av PROFF-butikk fredag 26. juni.
  </p>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Publisering</div>
      <div class="value">Torsdag 12. juni</div>
      <div class="sub">Kl 12:00 · matcher +144 % engasjements-vinduet</div>
    </div>
    <div class="summary-card">
      <div class="label">Budsjett (paid)</div>
      <div class="value">~280 kr</div>
      <div class="sub">20 kr/dag × 14 dager</div>
    </div>
    <div class="summary-card">
      <div class="label">Kanaler</div>
      <div class="value">FB · IG · LinkedIn</div>
      <div class="sub">Organisk + GEO-ad på FB+IG</div>
    </div>
    <div class="summary-card">
      <div class="label">Format</div>
      <div class="value">4:5 · 1080×1350</div>
      <div class="sub">Optimal for FB/IG-feed</div>
    </div>
  </div>

  <div class="h3">Teaser-bilde</div>
  <div class="teaser-preview">
    <img src="${teaserDataUri}" alt="Jubileums-teaser 26. juni"/>
  </div>

  <div class="footer">
    <span>FOSEN TOOLS · JUBILEUM 26. JUNI · TIL ERIK</span>
    <img class="jub" src="${jub25DataUri}" alt=""/>
    <span>SIDE 1 / 5</span>
  </div>
</div>

<!-- ════════════════════════ SIDE 2 ════════════════════════ -->
<div class="page">
  <div class="brand-stripe"></div>

  <div class="header">
    <div>
      <h1>Caption-pakke</h1>
    </div>
    <div class="meta">
      Jubileums-teaser<br/>
      <span class="date">2 plattformer</span>
    </div>
  </div>

  <p class="small" style="margin-bottom:5mm;">
    Captions er klare til kopier/lim. Alle inkluderer geo-anchor (Brekstad/Industrigata),
    dato og hint om åpning uten å røpe alle leverandørene — disse spares til T-7 og T-3
    i jubileums-kalenderen.
  </p>

  <div class="caption-card">
    <div class="platform">
      <span class="icon">📱</span>
      <span class="name">Facebook (organic + GEO-ad-tekst)</span>
      <span class="badge">~500 tegn</span>
    </div>
    <div class="text">🎉 Det skjer noe stort på Brekstad 26. juni.

Vi feirer 25 år &amp; åpner PROFF-butikk — fredag 10:00–16:00.

✨ Eksklusive priser, leverandører på besøk, grilling fra kl. 11.

⚠️ Dagstilbudene gjelder KUN for deg som er fysisk i butikken på Brekstad denne dagen. Ikke på nett, ikke på telefon, ikke per e-post — kun for besøkende på plass.

📍 Industrigata 1 · Brekstad
🗓️ Fredag 26. juni · 10:00–16:00

Hold av dagen — mer info kommer 👀</div>
  </div>

  <div class="caption-card">
    <div class="platform">
      <span class="icon">📷</span>
      <span class="name">Instagram</span>
      <span class="badge">~300 tegn</span>
    </div>
    <div class="text">🎉 26. juni skjer det.

25 år &amp; åpning PROFF-butikk på Brekstad — fredag 10:00–16:00.

✨ Eksklusive priser
🛠️ Leverandører på besøk
🔥 Grilling fra kl. 11

⚠️ Dagstilbudene fås KUN i butikken denne fredagen. Ikke nett, ikke telefon — du må være på plass.

Mer info kommer 🤫

📍 Industrigata 1</div>
    <div class="hashtags">#FosenTools #Brekstad #Ørland #Fosen #25år #Jubileum #ÅpningPROFFButikk #Industrigata #HoldAvDagen #FredagPåBrekstad #Trøndelag</div>
  </div>

  <div class="callout" style="margin-top:6mm;">
    <div class="label">Kanal-valg</div>
    LinkedIn er <strong>droppet</strong> for denne teaseren — følgerne der er bygd
    for mer fag-/nasjonalt orientert innhold. Vi sparer LinkedIn-vinklene til senere
    poster i kampanjen der det passer bedre (f.eks. <em>100 år i konsernet</em> og
    <em>PROFF-presentasjon kl. 13</em>).
  </div>

  <div class="footer">
    <span>FOSEN TOOLS · JUBILEUM 26. JUNI · TIL ERIK</span>
    <img class="jub" src="${jub25DataUri}" alt=""/>
    <span>SIDE 2 / 5</span>
  </div>
</div>

<!-- ════════════════════════ SIDE 3 ════════════════════════ -->
<div class="page">
  <div class="brand-stripe"></div>

  <div class="header">
    <div>
      <h1>GEO-ad-plan &amp; budsjett</h1>
    </div>
    <div class="meta">
      Meta Ads Manager<br/>
      <span class="date">Forslag til oppsett</span>
    </div>
  </div>

  <div class="eyebrow">Annonse-budsjett</div>
  <table class="budget-table">
    <thead>
      <tr><th>Periode</th><th>Daglig</th><th>Dager</th><th>Sum</th></tr>
    </thead>
    <tbody>
      <tr><td>Uke 24 (12.–18. juni)</td><td>20 kr</td><td>7</td><td>140 kr</td></tr>
      <tr><td>Uke 25 (19.–22. juni)</td><td>20 kr</td><td>4</td><td>80 kr</td></tr>
      <tr><td>Sluttspurt (23.–25. juni)</td><td>40–50 kr</td><td>3</td><td>120–150 kr</td></tr>
      <tr class="highlight"><td>Totalt</td><td></td><td>14</td><td>~340–370 kr</td></tr>
    </tbody>
  </table>

  <p class="small" style="margin-bottom:5mm;">
    Bumpen siste 3 dagene gir høyere frekvens når folk tar avgjørelsen om å komme.
    Hvis dette er for mye, kan vi holde flatt 20 kr/dag → totalt 280 kr.
  </p>

  <div class="eyebrow">Estimert rekkevidde (Meta-prognose)</div>
  <div class="targeting-box">
    <div class="row"><span class="label">Estimerte visninger</span><span class="val">4 000 – 9 000 totalt</span></div>
    <div class="row"><span class="label">Unike personer nådd</span><span class="val">1 500 – 3 000</span></div>
    <div class="row"><span class="label">Frekvens (visn./person)</span><span class="val">2–3</span></div>
    <div class="row"><span class="label">Andel av Fosen-befolkn.</span><span class="val">5–10 % (30 km radius)</span></div>
  </div>

  <div class="eyebrow">Targeting-oppsett</div>
  <div class="targeting-box">
    <div class="row"><span class="label">Kampanjemål</span><span class="val">Engagement / Reach</span></div>
    <div class="row"><span class="label">Geografi</span><span class="val">30 km radius rundt Brekstad</span></div>
    <div class="row"><span class="label">Demografi</span><span class="val">25–65+ år · alle</span></div>
    <div class="row"><span class="label">Interesser</span><span class="val">Verktøy, byggebransje, mekanikk, Forsvaret, motor</span></div>
    <div class="row"><span class="label">Plassering</span><span class="val">FB-feed + IG-feed + Stories</span></div>
    <div class="row"><span class="label">Frekvens-cap</span><span class="val">Maks 3 visninger / person</span></div>
    <div class="row"><span class="label">Format</span><span class="val">Single image 4:5</span></div>
    <div class="row"><span class="label">CTA-knapp</span><span class="val">«Lær mer» / «Send melding»</span></div>
  </div>

  <div class="footer">
    <span>FOSEN TOOLS · JUBILEUM 26. JUNI · TIL ERIK</span>
    <img class="jub" src="${jub25DataUri}" alt=""/>
    <span>SIDE 3 / 5</span>
  </div>
</div>

<!-- ════════════════════════ SIDE 4 — TIDSLINJE + GODKJENNING ════════════════════════ -->
<div class="page">
  <div class="brand-stripe"></div>

  <div class="header">
    <div>
      <h1>Tidslinje &amp; godkjenning</h1>
    </div>
    <div class="meta">
      Meta Ads Manager<br/>
      <span class="date">Kampanjen kjører 12.–25. juni</span>
    </div>
  </div>

  <div class="eyebrow">Annonse-tidslinje</div>
  <div class="timeline">
    <div class="timeline-item">
      <span class="when">Torsdag 12. juni</span>
      <span class="what">Organisk post live på FB + IG (kl 12:00)</span>
    </div>
    <div class="timeline-item">
      <span class="when">Fredag 13. juni</span>
      <span class="what">GEO-ad starter på FB + IG (20 kr/dag, 30 km Brekstad)</span>
    </div>
    <div class="timeline-item">
      <span class="when">Tirsdag 23. juni</span>
      <span class="what">Bumpe daglig budsjett til 40–50 kr/dag (siste 3 dager)</span>
    </div>
    <div class="timeline-item">
      <span class="when">Torsdag 25. juni</span>
      <span class="what">Siste teaser-dag · ad pauses neste morgen</span>
    </div>
    <div class="timeline-item">
      <span class="when">Fredag 26. juni</span>
      <span class="what">EVENT-DAG · butikken åpen 10:00–16:00 · grilling fra kl. 11</span>
    </div>
  </div>

  <div class="callout">
    <div class="label">Til godkjenning</div>
    Klart for igangsetting på <strong>~340–370 kr</strong> i totalt budsjett, eller flat
    <strong>~280 kr</strong> hvis vi holder oss på 20 kr/dag hele veien.<br/>
    Send go så setter Adrian opp annonsen i Meta Ads Manager.
  </div>

  <div class="footer">
    <span>FOSEN TOOLS · JUBILEUM 26. JUNI · TIL ERIK</span>
    <img class="jub" src="${jub25DataUri}" alt=""/>
    <span>SIDE 4 / 5</span>
  </div>
</div>

<!-- ════════════════════════ SIDE 5 ════════════════════════ -->
<div class="page">
  <div class="brand-stripe"></div>

  <div class="header">
    <div>
      <h1>Hele kampanje-tråden</h1>
    </div>
    <div class="meta">
      14 poster<br/>
      <span class="date">12.–26. juni</span>
    </div>
  </div>

  <p style="font-size:10pt;color:${FT.greyText};line-height:1.55;margin-bottom:5mm;">
    Drone-bildet er bevisst rolig på dag 1 — det forteller HVOR, og roer ned før vi
    spe-er på med ansikter, BTS, leverandører og crescendo siste uka.
  </p>

  <div class="eyebrow">Redaksjonell kalender</div>
  <table class="budget-table timeline-table" style="font-size:8pt;">
    <thead>
      <tr>
        <th style="width:14mm;">Dag</th>
        <th style="width:30mm;">Dato</th>
        <th>Tema</th>
        <th style="width:34mm;">Type</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:${FT.grey};">
        <td style="font-weight:800;color:${FT.red};">T-14</td>
        <td>Fre 12.6</td>
        <td><strong>Save the date</strong></td>
        <td>TEASER (denne)</td>
      </tr>
      <tr>
        <td style="font-weight:800;">T-13</td>
        <td>Lør 13.6</td>
        <td>Bak kulissene — ombygging</td>
        <td>Behind-the-scenes</td>
      </tr>
      <tr>
        <td style="font-weight:800;">T-12</td>
        <td>Søn 14.6</td>
        <td>Erik om 25 år</td>
        <td>Personlig sitat</td>
      </tr>
      <tr>
        <td style="font-weight:800;">T-11</td>
        <td>Man 15.6</td>
        <td>Programmet 26. juni</td>
        <td>Info / tidsplan</td>
      </tr>
      <tr>
        <td style="font-weight:800;">T-10</td>
        <td>Tir 16.6</td>
        <td>Partner: Milwaukee</td>
        <td>Leverandør-spotlight</td>
      </tr>
      <tr>
        <td style="font-weight:800;">T-9</td>
        <td>Ons 17.6</td>
        <td>Partner: Wera</td>
        <td>Leverandør-spotlight</td>
      </tr>
      <tr>
        <td style="font-weight:800;">T-8</td>
        <td>Tor 18.6</td>
        <td>Partner: Soudal</td>
        <td>Leverandør-spotlight</td>
      </tr>
      <tr>
        <td style="font-weight:800;">T-7</td>
        <td>Fre 19.6</td>
        <td>En uke igjen!</td>
        <td>Countdown</td>
      </tr>
      <tr>
        <td style="font-weight:800;">T-6</td>
        <td>Lør 20.6</td>
        <td>Goodiebag-teaser</td>
        <td>Hook</td>
      </tr>
      <tr>
        <td style="font-weight:800;">T-5</td>
        <td>Søn 21.6</td>
        <td>100 år i konsernet</td>
        <td>Hero / historie</td>
      </tr>
      <tr>
        <td style="font-weight:800;">T-4</td>
        <td>Man 22.6</td>
        <td>Spesielle gjester (Red Bull + Tesla)</td>
        <td>Bigger reveal</td>
      </tr>
      <tr>
        <td style="font-weight:800;">T-3</td>
        <td>Tir 23.6</td>
        <td>PROFF-presentasjon kl 13</td>
        <td>Programdetalj</td>
      </tr>
      <tr>
        <td style="font-weight:800;">T-2</td>
        <td>Ons 24.6</td>
        <td>Konkurranser + servering</td>
        <td>Hype</td>
      </tr>
      <tr>
        <td style="font-weight:800;">T-1</td>
        <td>Tor 25.6</td>
        <td>I morgen!</td>
        <td>Final push</td>
      </tr>
      <tr class="highlight">
        <td>DAG</td>
        <td>Fre 26.6</td>
        <td><strong>VI ER ÅPNE!</strong></td>
        <td>Live fra eventet</td>
      </tr>
    </tbody>
  </table>

  <p class="small" style="margin-top:4mm;">
    Hele kalenderen ligger ferdig i appen under <strong>/innleggsbygger/jubileum</strong> —
    der ligger ferdige captions, dato-spesifikke videoer (T-14 → T-1) og UTM-linker for hver dag.
  </p>

  <div class="callout" style="margin-top:6mm;">
    <div class="label">Tråden</div>
    Hver post bygger på forrige — vi går fra <strong>rolig dag 1</strong> (geo-anchor)
    → BTS + ansikter → leverandører → countdown → crescendo. Saumløs dramaturgi som
    krysser hele Fosen-publikum (lokale + Forsvar + industri) uten å gjenta seg selv.
  </div>

  <div class="footer">
    <span>FOSEN TOOLS · JUBILEUM 26. JUNI · TIL ERIK</span>
    <img class="jub" src="${jub25DataUri}" alt=""/>
    <span>SIDE 5 / 5</span>
  </div>
</div>

</body></html>`;
}

// ─── Render PDF ────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });

  console.log("🚀 Starter Chromium…");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.setContent(html(), { waitUntil: "networkidle", timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);

  await page.pdf({
    path: OUT_PATH,
    format: "A4",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await page.close();
  await browser.close();

  const sizeKb = (fs.statSync(OUT_PATH).size / 1024).toFixed(0);
  console.log(`  ✅ ${path.basename(OUT_PATH)} (${sizeKb} kB)`);
  console.log(`\n🎉 Ferdig: ${OUT_PATH}`);
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
