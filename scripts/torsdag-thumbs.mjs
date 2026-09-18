/**
 * Thumbnails for torsdagens «Ukens tips».
 *   16:9 (1280×720) → YouTube · 9:16 (1080×1920) → IG/FB reel-cover
 * Produktfoto på hvit plate, leverandørlogo som avsender.  npm run torsdag:thumbs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const font = (f) => fs.readFileSync(path.join(ROOT, "public/social/fonts", f)).toString("base64");
const M800 = font("manrope-latin-800-normal.woff2");
const M700 = font("manrope-latin-700-normal.woff2");
const logoB64 = fs.readFileSync(path.join(ROOT, "public/brosjyre/fosentools_logo_ny2.png")).toString("base64");

const POSTER = [
  { dato: "2026-08-27", data: "torsdag-facom" },
  { dato: "2026-09-03", data: "torsdag-wera" },
  { dato: "2026-09-10", data: "torsdag-kc-kraftadapter" },
  { dato: "2026-09-17", data: "torsdag-knipex-ergostrip" },
];

const uri = async (u) => "data:image;base64," + Buffer.from(await (await fetch(u)).arrayBuffer()).toString("base64");

const CSS = (w, h) => `
@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${M800}) format("woff2");font-weight:800}
@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${M700}) format("woff2");font-weight:700}
*{margin:0;padding:0;box-sizing:border-box}
body{width:${w}px;height:${h}px;overflow:hidden;font-family:Manrope,Arial,sans-serif;background:#0F1115}
.bg{position:absolute;inset:0;background:linear-gradient(118deg,#0c0e13 0%,#151922 48%,#1b2029 64%,#12151c 100%)}
.glod{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(237,28,36,.30) 0%,rgba(237,28,36,.08) 44%,transparent 70%)}
.rutenett{position:absolute;inset:0;opacity:.45;background-image:linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),
linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px);background-size:60px 60px}
.kant{position:absolute;left:0;top:0;bottom:0;width:12px;background:linear-gradient(180deg,#ED1C24,#b3151b);z-index:9}
.merke{display:inline-block;background:#ED1C24;color:#fff;font-weight:800;text-transform:uppercase;letter-spacing:.16em}
h1{color:#fff;font-weight:800;line-height:.95;text-transform:uppercase;text-shadow:0 6px 30px rgba(0,0,0,.6)}
.strek{background:#ED1C24;border-radius:4px}
.tagline{color:#b6bec9;font-weight:700;letter-spacing:.04em}
.plate{position:absolute;background:#fff;overflow:hidden;box-shadow:0 26px 66px rgba(0,0,0,.66),0 0 0 1px rgba(255,255,255,.07)}
.plate img{position:absolute;inset:7%;width:86%;height:86%;object-fit:contain}
.levbrikke{position:absolute;background:#fff;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 28px rgba(0,0,0,.5)}
.levbrikke img{max-width:92%;max-height:84%;object-fit:contain}
.logo{position:absolute;z-index:10}
`;

const wide = (p) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS(1280,720)}
.glod{width:780px;height:780px;right:-170px;top:-140px}
.tekst{position:absolute;left:60px;top:104px;width:540px;z-index:6}
.merke{font-size:15px;padding:7px 15px}
h1{font-size:62px;margin-top:18px}
.strek{width:140px;height:7px;margin:20px 0 16px}
.tagline{font-size:19px;line-height:1.4}
.plate{right:56px;top:88px;width:430px;height:440px;border-radius:20px}
.levbrikke{left:60px;bottom:112px;width:186px;height:74px}
.logo{left:60px;bottom:44px;width:200px}
</style></head><body>
<div class="bg"></div><div class="glod"></div><div class="rutenett"></div><div class="kant"></div>
<div class="tekst"><span class="merke">Ukens tips</span><h1>${p.navn}</h1>
<div class="strek"></div><div class="tagline">${p.tagline}</div></div>
<div class="plate"><img src="${p.foto}"></div>
<div class="levbrikke"><img src="${p.lev}"></div>
<img class="logo" src="data:image/png;base64,${logoB64}">
</body></html>`;

const reel = (p) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS(1080,1920)}
.glod{width:960px;height:960px;right:-240px;top:900px}
.tekst{position:absolute;left:62px;right:110px;top:250px;z-index:6}
.merke{font-size:22px;padding:10px 22px}
h1{font-size:92px;margin-top:24px}
.strek{width:190px;height:9px;margin:26px 0 20px}
.tagline{font-size:27px;line-height:1.45}
.plate{left:62px;right:62px;top:790px;height:620px;border-radius:26px}
.levbrikke{left:62px;bottom:320px;width:250px;height:100px}
.logo{left:62px;bottom:180px;width:290px}
</style></head><body>
<div class="bg"></div><div class="glod"></div><div class="rutenett"></div><div class="kant"></div>
<div class="tekst"><span class="merke">Ukens tips</span><h1>${p.navn}</h1>
<div class="strek"></div><div class="tagline">${p.tagline}</div></div>
<div class="plate"><img src="${p.foto}"></div>
<div class="levbrikke"><img src="${p.lev}"></div>
<img class="logo" src="data:image/png;base64,${logoB64}">
</body></html>`;

const nettleser = await chromium.launch();
for (const p of POSTER) {
  const d = JSON.parse(fs.readFileSync(`scripts/data/${p.data}.json`, "utf8"));
  p.navn = d.productName;
  p.tagline = d.productTagline;
  p.foto = await uri(d.productImageUrl);
  p.lev = await uri(d.supplierLogoUrl);
  const ut = path.join("out/dagens", p.dato, "torsdag-leverandor-tips");
  const base = fs.readdirSync(ut).find((f) => f.endsWith("-reel.mp4"))?.replace("-reel.mp4", "");
  if (!base) { console.log(`⚠️  ${p.dato}: fant ingen reel`); continue; }
  for (const [navn, html, w, h] of [["16x9", wide(p), 1280, 720], ["9x16", reel(p), 1080, 1920]]) {
    const pg = await nettleser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await pg.setContent(html, { waitUntil: "networkidle" });
    await pg.evaluate(() => document.fonts.ready);
    await pg.evaluate(() => {
      const h1 = document.querySelector("h1"); const boks = h1.parentElement;
      let px = parseFloat(getComputedStyle(h1).fontSize);
      while (px > 34 && (h1.scrollWidth > boks.clientWidth || h1.scrollHeight > boks.clientHeight * 1.7)) {
        px -= 2; h1.style.fontSize = px + "px";
      }
    });
    const bin = await pg.screenshot({ type: "jpeg", quality: 92 });
    await pg.close();
    fs.writeFileSync(path.join(ut, `${base}-thumb-${navn}.jpg`), bin);
    console.log(`✓ ${base}-thumb-${navn}.jpg  ${Math.round(bin.length/1024)} kB`);
  }
}
await nettleser.close();
