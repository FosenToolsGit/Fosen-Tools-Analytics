/**
 * Thumbnails for tirsdagens referanse-poster.
 *   16:9 (1280×720) → YouTube (som tvinger alt inn i dette formatet)
 *   9:16 (1080×1920) → forsidebilde på Instagram- og Facebook-reels
 *
 * Casene har ekte leveransefoto, så bildet får bære flaten. Teksten legges
 * på en mørk gradient slik at den er lesbar uansett motiv.
 * Kjør:  npm run tirsdag:thumbs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const font = (f) => fs.readFileSync(path.join(ROOT, "public/social/fonts", f)).toString("base64");
const M800 = font("manrope-latin-800-normal.woff2");
const M700 = font("manrope-latin-700-normal.woff2");
// FT-default: logoen med rød bakgrunn (5:1 — sett width, ikke height).
const logoB64 = fs.readFileSync(path.join(ROOT, "public/brosjyre/fosentools_logo_ny2.png")).toString("base64");

const POSTER = [
  { dato: "2026-08-25", data: "referanse-equinor-verktoykasse",  kicker: "OFFSHORE" },
  { dato: "2026-09-01", data: "referanse-innredning-bilverksted", kicker: "BILVERKSTED" },
  { dato: "2026-09-08", data: "referanse-mobilt-verksted-flyfag", kicker: "LUFTFART" },
  { dato: "2026-09-15", data: "referanse-brann-redning-innlegg",  kicker: "BRANN OG REDNING" },
];

async function somDataUri(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return "data:image/jpeg;base64," + Buffer.from(await r.arrayBuffer()).toString("base64");
}

const CSS = (w, h) => `
@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${M800}) format("woff2");font-weight:800}
@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${M700}) format("woff2");font-weight:700}
*{margin:0;padding:0;box-sizing:border-box}
body{width:${w}px;height:${h}px;overflow:hidden;font-family:Manrope,Arial,sans-serif;background:#0F1115}
.foto{position:absolute;inset:0;background-size:cover;background-position:center;filter:brightness(1.04) saturate(1.06)}
.skygge{position:absolute;inset:0}
.kant{position:absolute;left:0;top:0;bottom:0;width:12px;
background:linear-gradient(180deg,#ED1C24 0%,#b3151b 100%);z-index:9}
.kicker{display:inline-flex;align-items:center;gap:12px;color:#fff;font-weight:800;letter-spacing:.19em;
background:#ED1C24;text-transform:uppercase}
h1{color:#fff;font-weight:800;line-height:.93;text-transform:uppercase;letter-spacing:-.01em;
text-shadow:0 8px 40px rgba(0,0,0,.85)}
.strek{background:#ED1C24;border-radius:4px}
.sub{color:#e4e8ee;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
text-shadow:0 3px 18px rgba(0,0,0,.9)}
.logo{position:absolute;z-index:10}
`;

const wide = (p, foto) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS(1280,720)}
.foto{background-image:url(${foto})}
.skygge{background:linear-gradient(100deg,rgba(8,10,14,.95) 0%,rgba(8,10,14,.86) 34%,rgba(8,10,14,.45) 56%,rgba(8,10,14,.12) 78%,rgba(8,10,14,.30) 100%)}
.tekst{position:absolute;left:60px;top:112px;width:600px;z-index:6}
.kicker{font-size:17px;padding:8px 16px}
h1{font-size:76px;margin-top:20px}
.strek{width:150px;height:7px;margin:22px 0 16px}
.sub{font-size:20px;line-height:1.4}
.logo{left:60px;bottom:46px;width:212px}
</style></head><body>
<div class="foto"></div><div class="skygge"></div><div class="kant"></div>
<div class="tekst"><span class="kicker">${p.kicker}</span><h1>${p.headline}</h1>
<div class="strek"></div><div class="sub">${p.sub}</div></div>
<img class="logo" src="data:image/png;base64,${logoB64}">
</body></html>`;

const reel = (p, foto) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS(1080,1920)}
.foto{background-image:url(${foto})}
.skygge{background:linear-gradient(180deg,rgba(8,10,14,.55) 0%,rgba(8,10,14,.18) 26%,rgba(8,10,14,.55) 62%,rgba(8,10,14,.96) 88%,rgba(8,10,14,.99) 100%)}
.tekst{position:absolute;left:62px;right:110px;bottom:430px;z-index:6}
.kicker{font-size:24px;padding:11px 22px}
h1{font-size:104px;margin-top:26px}
.strek{width:200px;height:9px;margin:28px 0 22px}
.sub{font-size:28px;line-height:1.45}
.logo{left:62px;bottom:210px;width:300px}
</style></head><body>
<div class="foto"></div><div class="skygge"></div><div class="kant"></div>
<div class="tekst"><span class="kicker">${p.kicker}</span><h1>${p.headline}</h1>
<div class="strek"></div><div class="sub">${p.sub}</div></div>
<img class="logo" src="data:image/png;base64,${logoB64}">
</body></html>`;

const nettleser = await chromium.launch();
for (const p of POSTER) {
  const d = JSON.parse(fs.readFileSync(`scripts/data/${p.data}.json`, "utf8"));
  p.headline = d.headline;
  // Unngå at kicker og overskrift sier det samme — da faller kickeren tilbake
  // på hva slags innhold dette er.
  const likeOrd = p.kicker.replace(/\s+/g, "") === d.headline.replace(/\s+/g, "");
  if (likeOrd) p.kicker = "REFERANSE";
  p.sub = d.bannerSubline || d.tagline;
  const ut = path.join("out/dagens", p.dato, "ft-referanse");
  const base = fs.readdirSync(ut).find((f) => f.endsWith("-reel.mp4"))?.replace("-reel.mp4", "");
  if (!base) { console.log(`⚠️  ${p.dato}: fant ingen reel`); continue; }
  // Førstebildet i caset er hero-motivet
  const foto = await somDataUri(d.imageUrls[0]);
  for (const [navn, html, w, h] of [["16x9", wide(p, foto), 1280, 720], ["9x16", reel(p, foto), 1080, 1920]]) {
    const pg = await nettleser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await pg.setContent(html, { waitUntil: "networkidle" });
    await pg.evaluate(() => document.fonts.ready);
    await pg.evaluate(() => {
      const h1 = document.querySelector("h1"); const boks = h1.parentElement;
      let px = parseFloat(getComputedStyle(h1).fontSize);
      while (px > 38 && (h1.scrollWidth > boks.clientWidth || h1.scrollHeight > boks.clientHeight * 1.8)) {
        px -= 2; h1.style.fontSize = px + "px";
      }
    });
    const bin = await pg.screenshot({ type: "jpeg", quality: 92 });
    await pg.close();
    fs.writeFileSync(path.join(ut, `${base}-thumb-${navn}.jpg`), bin);
    console.log(`✓ ${base}-thumb-${navn}.jpg  ${Math.round(bin.length / 1024)} kB`);
  }
}
await nettleser.close();
