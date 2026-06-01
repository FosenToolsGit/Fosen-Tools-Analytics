/**
 * Render Google Forms cover-image-banner for jubileum-påmelding.
 * 1600×400 (4:1) — standard Google Forms-overskrift-format.
 *
 * Kjør: npx tsx scripts/render-google-form-banner.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { renderHtmlToPng, fontFaceCss } from "../src/lib/services/render-common";

const OUT = path.join(homedir(), "Desktop", "jubileum-banner");
const W = 1600;
const H = 400;

const JUBILEUM_LOGO_PATH = path.join(process.cwd(), "public/social/brand-assets/jubileum-25aar.png");
const JUBILEUM_LOGO_DATA_URL = `data:image/png;base64,${readFileSync(JUBILEUM_LOGO_PATH).toString("base64")}`;

function buildHtml(): string {
  const ftRed = "#ED1C24";
  const ftInk = "#0F1115";

  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fontFaceCss()}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;}
body{
  font-family:'Manrope','Inter',Arial,sans-serif;
  background-color:${ftRed};
  background-image:
    radial-gradient(ellipse 60% 100% at 18% 30%, rgba(255,255,255,0.10), transparent 70%),
    radial-gradient(ellipse 50% 80% at 92% 80%, rgba(0,0,0,0.20), transparent 70%);
  color:#fff;
  position:relative;
  overflow:hidden;
  padding:54px 70px;
  display:flex;
  align-items:center;
  justify-content:space-between;
}

/* Subtile rutenett-mønster i bakgrunn */
.grid{
  position:absolute; inset:0;
  background-image:
    linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
  background-size:80px 80px;
  pointer-events:none;
}

/* Topp + bunn-stripe i hvit (signatur fra topp-banneret) */
.stripe-top, .stripe-bot{
  position:absolute; left:0; right:0; height:8px; background:#fff; opacity:0.85;
}
.stripe-top{ top:0; }
.stripe-bot{ bottom:0; }

/* VENSTRE: hovedbudskap */
.left{
  position:relative;
  z-index:2;
  display:flex;
  flex-direction:column;
  gap:18px;
}
.eyebrow{
  font-family:'JetBrains Mono','Roboto Mono',monospace;
  font-size:18px;
  font-weight:700;
  letter-spacing:0.32em;
  text-transform:uppercase;
  color:#fff;
  opacity:0.92;
  display:flex;
  align-items:center;
  gap:16px;
}
.eyebrow::before{
  content:"";
  display:block;
  width:60px;
  height:3px;
  background:#fff;
}
.jubileum-logo{
  display:block;
  height:200px;
  width:auto;
  filter:drop-shadow(0 4px 16px rgba(0,0,0,0.25));
}
.plus-line{
  display:flex;
  align-items:center;
  gap:18px;
  margin-top:4px;
}
.plus{
  font-size:36px;
  font-weight:900;
  color:#fff;
  opacity:0.7;
}
.store{
  display:inline-flex;
  align-items:center;
  gap:12px;
  padding:10px 22px;
  border-radius:5px;
  background:${ftInk};
  font-size:30px;
  font-weight:900;
  letter-spacing:0.13em;
  line-height:1;
  box-shadow:0 4px 16px rgba(0,0,0,0.30), inset 0 0 0 1px rgba(255,255,255,0.10);
}
.store small{
  font-weight:500;
  font-size:14px;
  letter-spacing:0.06em;
  text-transform:none;
  color:rgba(255,255,255,0.62);
}

/* HØYRE: dato */
.right{
  position:relative;
  z-index:2;
  display:flex;
  flex-direction:column;
  align-items:flex-end;
  gap:18px;
}
.date-eyebrow{
  font-family:'JetBrains Mono','Roboto Mono',monospace;
  font-size:18px;
  font-weight:700;
  letter-spacing:0.32em;
  text-transform:uppercase;
  color:rgba(255,255,255,0.85);
}
.date-big{
  font-size:96px;
  font-weight:900;
  line-height:0.85;
  letter-spacing:-0.02em;
  color:#fff;
  text-align:right;
}
.date-year{
  font-size:32px;
  font-weight:800;
  letter-spacing:0.08em;
  color:#fff;
  opacity:0.75;
}
.place{
  font-family:'JetBrains Mono','Roboto Mono',monospace;
  font-size:18px;
  font-weight:700;
  letter-spacing:0.28em;
  text-transform:uppercase;
  color:#fff;
  margin-top:6px;
  display:flex;
  align-items:center;
  gap:14px;
}
.place::after{
  content:"";
  display:block;
  width:48px;
  height:3px;
  background:#fff;
}

</style></head><body>
<div class="grid"></div>
<div class="stripe-top"></div>
<div class="stripe-bot"></div>

<div class="left">
  <div class="eyebrow">PÅMELDING</div>
  <img class="jubileum-logo" src="${JUBILEUM_LOGO_DATA_URL}" alt="25-årsjubileum 2001-2026 Fosen Tools" />
  <div class="plus-line">
    <div class="plus">+</div>
    <div class="store">PROFF-BUTIKK</div>
  </div>
</div>

<div class="right">
  <div class="date-eyebrow">VI FEIRER</div>
  <div class="date-big">26. JUNI</div>
  <div class="date-year">2026</div>
  <div class="place">BREKSTAD</div>
</div>

</body></html>`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`Rendrer banner (${W}×${H})…`);
  const png = await renderHtmlToPng(buildHtml(), W, H);
  const file = path.join(OUT, `google-form-banner-${W}x${H}.png`);
  writeFileSync(file, Buffer.from(png.base64, "base64"));
  console.log(`✓ Lagret: ${file}\n`);
  console.log(`Last opp denne PNG-en som overskrifts-bilde i Google Forms.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
