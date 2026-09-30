// produktpost.mjs — statisk produktpost (4:5, 1:1, 9:16) fra ett produkt.
// Bruk: node scripts/produktpost.mjs --data fil.json [--ut ~/Desktop/mappe]
// JSON: { eyebrow, merke, overskrift, tekst, chips[], bildeUrl, utmappe }
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1] ?? d; };
const d = JSON.parse(readFileSync(arg("data"), "utf8"));
const UT = (arg("ut", d.utmappe) || `${process.env.HOME}/Desktop/FT-produktpost`).replace("~", process.env.HOME);
mkdirSync(UT, { recursive: true });

const b64 = (p, t) => `data:${t};base64,${readFileSync(p).toString("base64")}`;
const font = f => readFileSync(`public/social/fonts/${f}`).toString("base64");
const ft = b64("public/brosjyre/fosentools_logo_ny2.png", "image/png");

// Produktbildet frilegges. Multicase-foto ligger på hvit bunn med studioskygge.
// Terskel alene spiser ikke skyggen (den er middels grå), så vi flomfyller fra
// kantene: bare lys, nøytral bakgrunn som henger sammen med bildekanten fjernes.
// Da overlever hvite deler inne i produktet, som kutterhjulet.
const res = await fetch(d.bildeUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
const raw = Buffer.from(await res.arrayBuffer());
const { data: px, info } = await sharp(raw)
  .resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W0, height: H0, channels: CH } = info;
const bakgrunnsaktig = (i) => {
  const r = px[i], g = px[i + 1], b = px[i + 2];
  const lys = Math.min(r, g, b);
  const metning = Math.max(r, g, b) - lys;
  return metning <= 22 && lys >= 168;      // nøytral og lys
};
const sett = new Uint8Array(W0 * H0);
const kø = [];
for (let x = 0; x < W0; x++) { kø.push(x, (H0 - 1) * W0 + x); }
for (let y = 0; y < H0; y++) { kø.push(y * W0, y * W0 + W0 - 1); }
while (kø.length) {
  const n = kø.pop();
  if (sett[n]) continue;
  if (!bakgrunnsaktig(n * CH)) continue;
  sett[n] = 1;
  const x = n % W0, y = (n - x) / W0;
  if (x > 0) kø.push(n - 1);
  if (x < W0 - 1) kø.push(n + 1);
  if (y > 0) kø.push(n - W0);
  if (y < H0 - 1) kø.push(n + W0);
}
// Myk kant: full gjennomsiktighet på det reneste, gradvis inn mot motivet.
for (let n = 0; n < W0 * H0; n++) {
  if (!sett[n]) continue;
  const i = n * CH, lys = Math.min(px[i], px[i + 1], px[i + 2]);
  px[i + 3] = lys >= 240 ? 0 : Math.round(255 * (1 - (lys - 168) / (240 - 168)) * 0.55);
}
const prod = `data:image/png;base64,${(await sharp(px, { raw: info }).png().toBuffer()).toString("base64")}`;

const html = (W, H) => { const story = H > 1500, sq = W === H; const s = story ? 1.18 : (sq ? 0.94 : 1);
const bildeH = story ? Math.round(H * 0.46) : (sq ? Math.round(H * 0.44) : Math.round(H * 0.47));
return `<style>
@font-face{font-family:M;font-weight:800;src:url(data:font/woff2;base64,${font("manrope-latin-800-normal.woff2")}) format("woff2")}
@font-face{font-family:M;font-weight:700;src:url(data:font/woff2;base64,${font("manrope-latin-700-normal.woff2")}) format("woff2")}
@font-face{font-family:M;font-weight:400;src:url(data:font/woff2;base64,${font("manrope-latin-400-normal.woff2")}) format("woff2")}
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;font-family:M,sans-serif;overflow:hidden;position:relative;background:#0F1115;color:#fff}
.glow{position:absolute;width:${W*1.15}px;height:${W*1.15}px;left:${-W*.075}px;top:${-W*.22}px;border-radius:50%;
  background:radial-gradient(circle,rgba(237,28,36,.20) 0%,rgba(237,28,36,.05) 46%,transparent 68%)}
.topp{position:absolute;top:0;left:0;right:0;height:${8*s}px;background:#ED1C24;z-index:5}
.eyeb{position:absolute;top:${46*s}px;left:${54*s}px;right:${54*s}px;z-index:4;font-weight:800;font-size:${23*s}px;
  letter-spacing:.26em;text-transform:uppercase;color:#ED1C24}
.bilde{position:absolute;left:${54*s}px;right:${54*s}px;top:${96*s}px;height:${bildeH}px;
  background:url('${prod}') center/contain no-repeat;filter:drop-shadow(0 26px 50px rgba(0,0,0,.6))}
.tekst{position:absolute;left:${54*s}px;right:${54*s}px;bottom:${44*s}px;z-index:3}
.merke{font-weight:800;font-size:${21*s}px;letter-spacing:.22em;text-transform:uppercase;color:#9AA3AF;margin-bottom:${10*s}px}
.h1{font-weight:800;font-size:${(sq?58:68)*s}px;line-height:1.12;letter-spacing:-.02em;text-transform:uppercase}
.rule{width:${130*s}px;height:${6*s}px;background:#ED1C24;margin:${20*s}px 0 ${16*s}px}
.info{font-weight:400;font-size:${(sq?25:28)*s}px;line-height:1.42;color:#D8DCE2}
.chips{display:flex;flex-wrap:wrap;gap:${12*s}px;margin-top:${22*s}px}
.chips span{padding:${10*s}px ${18*s}px;border:${3*s}px solid #fff;font-weight:800;font-size:${19*s}px;
  letter-spacing:.11em;text-transform:uppercase}
.bunn{display:flex;justify-content:space-between;align-items:center;margin-top:${26*s}px;
  font-weight:700;font-size:${15*s}px;letter-spacing:.18em;text-transform:uppercase;color:#9AA3AF}
.bunn img{height:${30*s}px}
</style>
<div class="glow"></div><div class="topp"></div>
<div class="eyeb">${d.eyebrow}</div>
<div class="bilde"></div>
<div class="tekst">
  <div class="merke">${d.merke}</div>
  <div class="h1">${d.overskrift}</div>
  <div class="rule"></div>
  <div class="info">${d.tekst}</div>
  <div class="chips">${(d.chips || []).map(c => `<span>${c}</span>`).join("")}</div>
  <div class="bunn"><img src="${ft}"><span>Industrigata 1 &middot; Brekstad</span></div>
</div>`; };

const br = await chromium.launch();
for (const [W, H, key] of [[1080,1350,"4x5"],[1080,1080,"1x1"],[1080,1920,"9x16"]]) {
  const p = await br.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await p.setContent(html(W, H)); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const png = await p.screenshot({ type: "png" });
  const navn = `${d.filnavn || "produktpost"}-${key}`;
  await sharp(png).resize(W, H, { kernel: "lanczos3" }).png().toFile(`${UT}/${navn}.png`);
  console.log("✓", navn); await p.close();
}
await br.close(); console.log("\n→", UT);
