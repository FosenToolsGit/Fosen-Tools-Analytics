// Story-grafikk 1080×1920 til IG/FB. Bilde full-bleed + FT-rabattoverlegg.
import { chromium } from "playwright";
import { readFileSync, existsSync } from "fs";
import path from "path";

const [, , bilde, rabatt, merke, presisering, utfil] = process.argv;
if (!bilde || !existsSync(bilde)) { console.error("Mangler bilde:", bilde); process.exit(1); }

const b64 = (p) => `data:image/${path.extname(p).slice(1).replace("jpg","jpeg")};base64,${readFileSync(p).toString("base64")}`;
const foto = b64(bilde);
const fs_logo = b64("public/brosjyre/factory-store-horizontal-white.png");
const font = (f) => readFileSync(`public/social/fonts/${f}`).toString("base64");

const html = `<style>
@font-face{font-family:Manrope;font-weight:800;src:url(data:font/woff2;base64,${font("manrope-latin-800-normal.woff2")}) format("woff2")}
@font-face{font-family:Manrope;font-weight:700;src:url(data:font/woff2;base64,${font("manrope-latin-700-normal.woff2")}) format("woff2")}
@font-face{font-family:Manrope;font-weight:400;src:url(data:font/woff2;base64,${font("manrope-latin-400-normal.woff2")}) format("woff2")}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1920px;font-family:Manrope,sans-serif;overflow:hidden;position:relative;background:#0F1115}
.foto{position:absolute;inset:0;background:url('${foto}') center/cover no-repeat}
.topp{position:absolute;inset:0 0 auto 0;height:460px;
  background:linear-gradient(180deg,rgba(15,17,21,.86) 0%,rgba(15,17,21,.34) 62%,rgba(15,17,21,0) 100%)}
.bunn{position:absolute;inset:auto 0 0 0;height:1180px;
  background:linear-gradient(0deg,rgba(15,17,21,.985) 0%,rgba(15,17,21,.975) 42%,rgba(15,17,21,.80) 63%,rgba(15,17,21,.30) 84%,rgba(15,17,21,0) 100%)}
.inn{position:absolute;inset:0;padding:230px 84px 300px;display:flex;flex-direction:column;color:#fff}
.fs{width:300px;opacity:.95}
.midt{margin-top:auto;display:flex;flex-direction:column;gap:26px}
.merke{font-weight:800;font-size:44px;letter-spacing:.20em;text-transform:uppercase;opacity:.9}
.rab{font-weight:800;font-size:236px;line-height:.86;color:#fff;letter-spacing:-.02em}
.rab em{font-style:normal;color:#ED1C24}
.pres{font-weight:700;font-size:37px;line-height:1.35;max-width:880px;opacity:.95}
.pills{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px}
.pill{background:#fff;color:#0F1115;font-weight:800;font-size:26px;letter-spacing:.10em;
  text-transform:uppercase;padding:15px 28px;border-radius:999px}
.strek{width:120px;height:7px;background:#ED1C24;border-radius:4px;margin:4px 0 2px}
.sted{margin-top:34px;font-weight:700;font-size:30px;opacity:.86;line-height:1.4}
</style>
<div class="foto"></div><div class="topp"></div><div class="bunn"></div>
<div class="inn">
  <img class="fs" src="${fs_logo}">
  <div class="midt">
    <div class="merke">${merke}</div>
    <div class="strek"></div>
    <div class="rab">−${rabatt}<em>%</em></div>
    <div class="pres">${presisering}</div>
    <div class="pills"><span class="pill">Kun i dag</span><span class="pill">Kun varer på lager</span></div>
    <div class="sted">Kun i proff-butikken<br>Industrigata 1, Brekstad</div>
  </div>
</div>`;

const br = await chromium.launch();
// 2x-rendring, nedskalering skjer ikke — story vises i full høyde og skal være skarp
const p = await br.newPage({ viewport:{width:1080,height:1920}, deviceScaleFactor:2 });
await p.setContent(html, { waitUntil:"load" });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);
await p.screenshot({ path: utfil });
await br.close();
console.log("→", utfil);
