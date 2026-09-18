/**
 * og-bilde.mjs — delingsbilde 1200×630 for fosen-tools.no
 * Samme system som FT Aviation sine, i FT-drakt.
 *
 *   node scripts/og-bilde.mjs --etikett "FRIKSJONSPASTA" --tittel "Screw Grab" \
 *     --tekst "Én dråpe gir grep mellom verktøy og feste." --ut ~/Desktop/x.jpg
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "fs";

const a = process.argv.slice(2);
const arg = (n, d = "") => { const i = a.indexOf("--" + n); return i === -1 ? d : (a[i + 1] ?? d); };
const etikett = arg("etikett"), tekst = arg("tekst");
// ord med bindestrek skal aldri brytes over to linjer
const tittel = arg("tittel").replace(/(\S*\p{L}-\p{L}\S*)/gu, '<span style="white-space:nowrap">$1</span>');
const tittelRen = arg("tittel");
const ut = arg("ut"), merke = arg("merkelogo"), produkt = arg("produkt");
const forside = a.includes("--forside");
const foer = arg("for"), etter = arg("etter");
if (!tittelRen || !ut) { console.error("påkrevd: --tittel og --ut"); process.exit(1); }
if (!/-og\.jpg$/.test(ut)) {
  console.error(`✗ Filnavnet må slutte på "-og.jpg", ellers stemmer det ikke med og:image-URL-en.`);
  console.error(`  Fikk: ${ut.split("/").pop()}`);
  process.exit(1);
}

// Størrelsen kan ikke velges på total lengde alene. Et langt sammensatt ord
// som VERKTØYVOGN kan ikke brytes, og bleier ut av spalta ved siden av et
// bilde. Derfor settes et tak utledet av det lengste ordet.
const spalte = produkt ? 560 : 1080;
const lengsteOrd = Math.max(...tittelRen.split(/\s+/).map(o => o.length), 1);
const basis = (produkt ? 0.86 : 1) * (tittelRen.length > 22 ? 74 : tittelRen.length > 14 ? 88 : 104);
const tittelPx = Math.round(Math.min(basis, (spalte * 0.94) / (lengsteOrd * 0.60)));

const b64 = (p, t) => `data:${t};base64,${readFileSync(p).toString("base64")}`;
const font = f => readFileSync(`public/social/fonts/${f}`).toString("base64");
const ftLogo = b64("public/brosjyre/fosentools_logo_ny2.png", "image/png");
const merkeLogo = merke ? b64(merke, "image/png") : null;
const produktBilde = produkt ? b64(produkt, "image/png") : null;
const baFoer = foer ? b64(foer, "image/png") : null;
const baEtter = etter ? b64(etter, "image/png") : null;
const trygg = (f,t) => { try { return b64(f,t); } catch { return null; } };
const jub25 = forside ? trygg("/tmp/jub/Jubileumslogo-25aar.png", "image/png") : null;
const jub100 = forside ? trygg("/tmp/jub/Jubileumslogo-100aar.png", "image/png") : null;

const kropp = forside ? `
<div class="grid"></div>
<div class="glow" style="left:50%;top:-280px;transform:translateX(-50%);width:1280px;height:920px"></div>
<div class="topp"></div>
<div class="fs">
  <div class="fs-topp">
    <img class="fs-logo" src="${ftLogo}">
    <div class="fs-jub"><img src="${jub25}"><img class="j100" src="${jub100}"></div>
  </div>
  <div class="fs-tag">${tittel}</div>
  ${baFoer && baEtter ? `
  <div class="ba">
    <div class="ba-en"><img src="${baFoer}"><div class="ba-lbl">Før</div></div>
    <div class="ba-pil">&rarr;</div>
    <div class="ba-en"><img src="${baEtter}"><div class="ba-lbl etter">Etter, med HDFI</div></div>
  </div>` : `<div class="fs-rule"></div>${tekst ? `<div class="fs-tekst">${tekst}</div>` : ""}`}
</div>
<div class="fs-bunn"><span class="v">fosen-tools.no</span><span class="h">Industrigata 1 &middot; 7130 Brekstad</span></div>
` : `
<div class="grid"></div><div class="glow"></div><div class="glow2"></div><div class="topp"></div>
<div class="inn">
  <img class="logo" src="${ftLogo}">
  ${merkeLogo ? `<img class="brand" src="${merkeLogo}">` : ""}
  ${produktBilde ? `<div class="sokkel"></div><img class="produkt" src="${produktBilde}">` : ""}
  <div class="midt">
    ${etikett ? `<div class="etikett">${etikett}</div>` : ""}
    <div class="tittel">${tittel}</div>
    <div class="rule"></div>
    ${tekst ? `<div class="tekst">${tekst}</div>` : ""}
  </div>
  <div class="bunn"><span class="v">fosen-tools.no</span><span class="h">Proff-verkt&oslash;y &middot; Brekstad</span></div>
</div>`;

const html = `<style>
@font-face{font-family:M;font-weight:800;src:url(data:font/woff2;base64,${font("manrope-latin-800-normal.woff2")}) format("woff2")}
@font-face{font-family:M;font-weight:700;src:url(data:font/woff2;base64,${font("manrope-latin-700-normal.woff2")}) format("woff2")}
@font-face{font-family:M;font-weight:400;src:url(data:font/woff2;base64,${font("manrope-latin-400-normal.woff2")}) format("woff2")}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:630px;font-family:M,sans-serif;position:relative;overflow:hidden;
  background:#0F1115;color:#fff}
.grid{position:absolute;inset:0;opacity:.5;
  background-image:linear-gradient(rgba(255,255,255,.030) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(255,255,255,.030) 1px,transparent 1px);
  background-size:74px 74px}
.glow{position:absolute;width:1000px;height:1000px;left:-330px;top:-250px;border-radius:50%;
  background:radial-gradient(circle,rgba(237,28,36,.30) 0%,rgba(237,28,36,.07) 42%,transparent 68%)}
.glow2{position:absolute;width:760px;height:760px;right:-260px;bottom:-320px;border-radius:50%;
  background:radial-gradient(circle,rgba(237,28,36,.14) 0%,transparent 66%)}
.topp{position:absolute;top:0;left:0;right:0;height:7px;background:#ED1C24}
.inn{position:relative;height:100%;padding:56px 64px 50px;display:flex;flex-direction:column;align-items:stretch}
.logo{height:44px;width:auto;align-self:flex-start;flex:0 0 auto}
.brand{position:absolute;top:56px;right:64px;max-height:40px;max-width:230px;
  width:auto;object-fit:contain;opacity:.95}
.midt{margin-top:auto;margin-bottom:auto;padding-top:14px}
.etikett{font-weight:800;font-size:21px;letter-spacing:.30em;color:#ED1C24;
  text-transform:uppercase;margin-bottom:16px}
.tittel{font-weight:800;font-size:${tittelPx}px;max-width:${produktBilde ? 560 : 1080}px;
  line-height:1.02;letter-spacing:-.018em;text-transform:uppercase}
.rule{width:132px;height:5px;background:#ED1C24;margin:26px 0 22px}
.tekst{font-weight:400;font-size:26px;line-height:1.48;max-width:${produktBilde ? 545 : 800}px;color:#D8DCE2}
/* max-width er påkrevd. Uten den blir et liggende foto 382px høyt og
   573px bredt, og legger seg over tittelen og brødteksten. Stående
   utklipp som Screw Grab-flaska er smalere enn taket og påvirkes ikke. */
.produkt{position:absolute;right:104px;bottom:104px;height:382px;width:auto;
  max-width:420px;object-fit:contain;filter:drop-shadow(0 26px 46px rgba(0,0,0,.65))}
.sokkel{position:absolute;right:74px;bottom:88px;width:290px;height:40px;
  transform:translateX(0);border-radius:50%;
  background:radial-gradient(ellipse,rgba(0,0,0,.62) 0%,transparent 70%)}
.bunn{display:flex;justify-content:space-between;align-items:center;
  font-weight:700;font-size:16px;letter-spacing:.20em;text-transform:uppercase}
.bunn .v{color:#9AA3AF}
.bunn .h{color:#6B727C}

/* forside — eget uttrykk, med før og etter */
.fs{position:relative;height:100%;display:flex;flex-direction:column;
  align-items:center;text-align:center;padding:42px 62px 0}
.fs-topp{width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}
.fs-logo{height:42px;width:auto}
.fs-tag{font-weight:800;font-size:${tittelRen.length > 60 ? 31 : 39}px;line-height:1.2;letter-spacing:-.012em;max-width:${tittelRen.length > 60 ? 960 : 920}px}
.ba{display:flex;align-items:center;gap:20px;margin-top:24px;width:100%;justify-content:center}
.ba-en{flex:0 0 auto;width:462px}
.ba-en img{width:100%;height:auto;display:block;border-radius:9px;box-shadow:0 16px 34px rgba(0,0,0,.55)}
.ba-lbl{margin-top:10px;font-weight:800;font-size:15px;letter-spacing:.22em;text-transform:uppercase;color:#8B929B}
.ba-lbl.etter{color:#ED1C24}
.ba-pil{font-size:32px;color:#ED1C24;font-weight:800;margin-bottom:24px}
.fs-rule{width:150px;height:5px;background:#ED1C24;margin:26px 0 22px}
.fs-tekst{font-weight:400;font-size:25px;line-height:1.5;max-width:820px;color:#D8DCE2}
.fs-jub{display:flex;align-items:center;gap:18px;opacity:.88}
.fs-jub img{height:48px;width:auto}
.fs-jub .j100{height:36px}
.fs-bunn{position:absolute;left:64px;right:64px;bottom:44px;display:flex;
  justify-content:space-between;font-weight:700;font-size:16px;letter-spacing:.20em;text-transform:uppercase}
.fs-bunn .v{color:#9AA3AF}
.fs-bunn .h{color:#6B727C}
</style>
${kropp}`;

const br = await chromium.launch();
// Rendres i 2x og skaleres ned etterpå. deviceScaleFactor 1 rastrerer i nøyaktig
// utgangsstørrelse, og da blir typografi og kanter bløte.
const p = await br.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await p.setContent(html, { waitUntil: "load" });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
// OG-bilder hentes av scrapere og vises smått. Skarpheten kommer fra 2x-rendringen,
// ikke fra filstørrelsen — vi skalerer ned til 1200x630 og komprimerer til under
// ~250 kB så delingskortet lastes raskt.
const raa = await p.screenshot({ type: "png" });
const { default: sharp } = await import("sharp");
let bilde = sharp(raa).resize(1200, 630, { kernel: "lanczos3" });
let buf = await bilde.jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:2:0" }).toBuffer();
if (buf.length > 260_000) buf = await bilde.jpeg({ quality: 74, mozjpeg: true }).toBuffer();
writeFileSync(ut, buf);
console.log(`  ${Math.round(buf.length / 1024)} kB`);
await br.close();
console.log("→", ut);
