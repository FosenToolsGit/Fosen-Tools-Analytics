/**
 * Thumbnails for mandagspostene.
 *   16:9 (1280×720) → YouTube. YouTube tvinger alt inn i dette formatet,
 *                     også på Shorts (verifisert 24. aug 2026).
 *   9:16 (1080×1920) → forsidebilde på Instagram- og Facebook-reels.
 *
 * Leser produktlenkene rett fra captions.html i hver mandagsmappe, så den
 * fungerer på framtidige mandager uten endring.  npm run mandag:thumbs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const ROOT = process.cwd();
const font = (f) => fs.readFileSync(path.join(ROOT, "public/social/fonts", f)).toString("base64");
const M800 = font("manrope-latin-800-normal.woff2");
const M700 = font("manrope-latin-700-normal.woff2");
// FT-default er logoen med rød bakgrunn. Hvit wordmark er KUN for flater som
// allerede er FT-røde — mørk bakgrunn teller ikke. 2000×399, altså 5:1: sett width.
const logoB64 = fs.readFileSync(path.join(ROOT, "public/brosjyre/fosentools_logo_ny2.png")).toString("base64");

const POSTER = [
  { dato: "2026-08-31", eyebrow: "UKENS TOPP 3", tittel: "VERKTØYSETT",      under: "MILWAUKEE · TOOLGUARD · FT CUSTOM" },
  { dato: "2026-09-07", eyebrow: "UKENS TOPP 3", tittel: "PIPER & SKRALLER", under: "WERA · ADAPTERE OG BITSPIPER" },
  { dato: "2026-09-14", eyebrow: "UKENS TOPP 3", tittel: "OPPBEVARING",      under: "PACKOUT · PELI · FØRSTEHJELP" },
  { dato: "2026-09-21", eyebrow: "UKENS TOPP 3", tittel: "TENGER",           under: "KABELKUTTER · BLINDMUTTERVERKTØY" },
];

async function hentBilder(dato) {
  const dir = fs.readdirSync(path.join("out/dagens", dato)).find((d) => d.startsWith("mandag-"));
  const cap = fs.readFileSync(path.join("out/dagens", dato, dir, "captions.html"), "utf8");
  const urls = [...cap.matchAll(/→\s*(https:\/\/fosen-tools\.no\/[^\s?<]+)/g)].map((m) => m[1]).slice(0, 3);
  const nettleser = await chromium.launch();
  const pg = await nettleser.newPage({ userAgent: UA });
  const bilder = [];
  for (const u of urls) {
    await pg.goto(u, { waitUntil: "networkidle", timeout: 60000 });
    const img = await pg.evaluate(() => {
      for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const j = JSON.parse(s.textContent);
          for (const o of (Array.isArray(j) ? j : [j])) {
            if (String(o["@type"]).includes("Product")) {
              const im = Array.isArray(o.image) ? o.image[0] : o.image;
              if (im) return im;
            }
          }
        } catch {}
      }
      return null;
    });
    if (img) {
      const r = await fetch(img);
      bilder.push("data:image/jpeg;base64," + Buffer.from(await r.arrayBuffer()).toString("base64"));
    }
  }
  await nettleser.close();
  return { bilder, dir };
}

const CSS = (w, h) => `
@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${M800}) format("woff2");font-weight:800}
@font-face{font-family:Manrope;src:url(data:font/woff2;base64,${M700}) format("woff2");font-weight:700}
*{margin:0;padding:0;box-sizing:border-box}
body{width:${w}px;height:${h}px;overflow:hidden;font-family:Manrope,Arial,sans-serif;background:#0F1115}
.bg{position:absolute;inset:0;background:linear-gradient(115deg,#0c0e13 0%,#141821 46%,#1a1f2a 62%,#12151c 100%)}
.glod{position:absolute;border-radius:50%;
background:radial-gradient(circle,rgba(237,28,36,.34) 0%,rgba(237,28,36,.10) 42%,transparent 68%)}
.rutenett{position:absolute;inset:0;opacity:.5;
background-image:linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),
linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px);background-size:60px 60px}
.skra{position:absolute;background:#ED1C24;transform:skewX(-12deg)}
.kant{position:absolute;left:0;top:0;bottom:0;width:12px;
background:linear-gradient(180deg,#ED1C24 0%,#b3151b 100%);z-index:12}
.eyebrow{display:inline-flex;align-items:center;gap:13px;color:#ED1C24;font-weight:800;letter-spacing:.2em}
.eyebrow::before{content:"";height:5px;background:#ED1C24;display:block}
h1{color:#fff;font-weight:800;line-height:.92;letter-spacing:-.01em;text-transform:uppercase;
text-shadow:0 6px 34px rgba(0,0,0,.6)}
.strek{background:#ED1C24;border-radius:4px}
.under{color:#aeb6c2;font-weight:700;letter-spacing:.07em;text-transform:uppercase}
.chips{display:flex;flex-wrap:wrap}
.chip{border:2px solid rgba(255,255,255,.2);color:#e8eaef;font-weight:800;text-transform:uppercase;
letter-spacing:.06em;border-radius:99px;white-space:nowrap}
.chip.rod{border-color:#ED1C24;background:rgba(237,28,36,.16);color:#fff}
.kort{position:absolute;background:#fff;overflow:hidden;
box-shadow:0 26px 60px rgba(0,0,0,.62), 0 0 0 1px rgba(255,255,255,.07)}
.kort img{position:absolute;inset:8%;width:84%;height:84%;object-fit:contain}
.nr{position:absolute;background:#ED1C24;color:#fff;font-weight:800;
display:flex;align-items:center;justify-content:center;z-index:3;box-shadow:0 6px 18px rgba(0,0,0,.45)}
.logo{position:absolute;z-index:11}
`;

const kort = (b, i, stil, nrStil) =>
  `<div class="kort" style="${stil}"><img src="${b}"><span class="nr" style="${nrStil}">${i + 1}</span></div>`;

const wide = (p, bilder) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS(1280, 720)}
.glod{width:820px;height:820px;right:-190px;top:-160px}
.skra{right:-60px;top:-40px;width:150px;height:800px;opacity:.11}
.tekst{position:absolute;left:60px;top:92px;width:520px;z-index:6}
.eyebrow{font-size:20px}.eyebrow::before{width:38px}
h1{font-size:82px;margin-top:15px}
.strek{width:140px;height:7px;margin:20px 0 16px}
.under{font-size:18px;line-height:1.4}
.chips{gap:9px;margin-top:22px}
.chip{font-size:14px;padding:7px 15px}
.logo{left:60px;bottom:46px;width:212px}
</style></head><body>
<div class="bg"></div><div class="glod"></div><div class="rutenett"></div><div class="skra"></div><div class="kant"></div>
<div class="tekst"><span class="eyebrow">${p.eyebrow}</span><h1>${p.tittel}</h1>
<div class="strek"></div><div class="under">${p.under}</div>
<div class="chips"><span class="chip rod">På lager</span><span class="chip">Brekstad</span></div></div>
${kort(bilder[0], 0, "right:52px;top:74px;width:404px;height:462px;border-radius:20px", "left:0;bottom:0;width:56px;height:56px;font-size:27px;border-top-right-radius:16px")}
${kort(bilder[1], 1, "right:474px;top:150px;width:188px;height:198px;border-radius:15px", "left:0;bottom:0;width:38px;height:38px;font-size:18px;border-top-right-radius:12px")}
${kort(bilder[2], 2, "right:474px;top:368px;width:188px;height:198px;border-radius:15px", "left:0;bottom:0;width:38px;height:38px;font-size:18px;border-top-right-radius:12px")}
<img class="logo" src="data:image/png;base64,${logoB64}">
</body></html>`;

const reel = (p, bilder) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS(1080, 1920)}
.glod{width:1000px;height:1000px;right:-260px;top:560px}
.skra{right:-70px;top:-60px;width:170px;height:1400px;opacity:.1}
.tekst{position:absolute;left:62px;right:120px;top:250px;z-index:6}
.eyebrow{font-size:27px}.eyebrow::before{width:50px}
h1{font-size:112px;margin-top:20px}
.strek{width:190px;height:9px;margin:28px 0 22px}
.under{font-size:26px;line-height:1.45}
.chips{gap:12px;margin-top:30px}
.chip{font-size:20px;padding:10px 22px}
.logo{left:62px;bottom:168px;width:300px}
</style></head><body>
<div class="bg"></div><div class="glod"></div><div class="rutenett"></div><div class="skra"></div><div class="kant"></div>
<div class="tekst"><span class="eyebrow">${p.eyebrow}</span><h1>${p.tittel}</h1>
<div class="strek"></div><div class="under">${p.under}</div>
<div class="chips"><span class="chip rod">På lager</span><span class="chip">Brekstad</span></div></div>
${kort(bilder[0], 0, "left:62px;right:62px;top:830px;height:470px;border-radius:24px", "left:0;bottom:0;width:66px;height:66px;font-size:32px;border-top-right-radius:18px")}
${kort(bilder[1], 1, "left:62px;top:1330px;width:452px;height:330px;border-radius:20px", "left:0;bottom:0;width:52px;height:52px;font-size:25px;border-top-right-radius:15px")}
${kort(bilder[2], 2, "right:62px;top:1330px;width:452px;height:330px;border-radius:20px", "left:0;bottom:0;width:52px;height:52px;font-size:25px;border-top-right-radius:15px")}
<img class="logo" src="data:image/png;base64,${logoB64}">
</body></html>`;

const nettleser = await chromium.launch();
for (const p of POSTER) {
  const { bilder, dir } = await hentBilder(p.dato);
  if (bilder.length < 3) { console.log(`⚠️  ${p.dato}: bare ${bilder.length} bilder`); continue; }
  const ut = path.join("out/dagens", p.dato, dir);
  const base = fs.readdirSync(ut).find((f) => f.endsWith("-reel.mp4"))?.replace("-reel.mp4", "") || `mandag-${p.dato}`;
  for (const [navn, html, w, h] of [["16x9", wide(p, bilder), 1280, 720], ["9x16", reel(p, bilder), 1080, 1920]]) {
    const pg = await nettleser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await pg.setContent(html, { waitUntil: "networkidle" });
    await pg.evaluate(() => document.fonts.ready);
    // Overskriften skal aldri flomme ut i produktkortene.
    await pg.evaluate(() => {
      const h1 = document.querySelector("h1");
      const boks = h1.parentElement;
      let px = parseFloat(getComputedStyle(h1).fontSize);
      while (px > 40 && (h1.scrollWidth > boks.clientWidth || h1.scrollHeight > boks.clientHeight * 1.6)) {
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
