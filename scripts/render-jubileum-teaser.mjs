/**
 * Jubileums-teaser — uke 24 (12. juni), T-14 i jubileums-kalenderen
 *
 * Geo-rettet Facebook/Instagram ads i 4 formater:
 *   • 4:5 (1080×1350)  — IG/FB feed-portrett
 *   • 1:1 (1080×1080)  — IG/FB feed-kvadrat
 *   • 9:16 (1080×1920) — Reels + Stories
 *   • 1.91:1 (1200×628) — FB landscape feed, FB højre kolonne, link previews
 *
 * Output:
 *   ~/Downloads/jubileum-teaser-2026-06/01-teaser-26juni-{format}.png
 *
 *   node scripts/render-jubileum-teaser.mjs
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = process.cwd();
const HERO_IMG = path.join(ROOT, "Jubileum-teaser/forside-rent-002.png");
const FONT_DIR = path.join(ROOT, "public/social/fonts");
const ASSET_DIR = path.join(ROOT, "public/brosjyre");
const OUT_DIR = path.join(os.homedir(), "Downloads/jubileum-teaser-2026-06");

// ─── Formater ──────────────────────────────────────────────────────────
const FORMATS = [
  { name: "4-5", w: 1080, h: 1350, layout: "portrait" },
  { name: "1-1", w: 1080, h: 1080, layout: "square" },
  { name: "9-16", w: 1080, h: 1920, layout: "tall" },
  { name: "1-91-1", w: 1200, h: 628, layout: "landscape" },
];

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

const ftLogoBuf = fs.readFileSync(path.join(ASSET_DIR, "fosentools_logo_ny2.png"));
const ftLogoDataUri = `data:image/png;base64,${ftLogoBuf.toString("base64")}`;

const heroDataUri = `data:image/png;base64,${fs.readFileSync(HERO_IMG).toString("base64")}`;

// ─── FT-tokens ─────────────────────────────────────────────────────────
const FT = {
  red: "#ED1C24",
  ink: "#0F1115",
  white: "#FFFFFF",
  goldTop: "#85704D",
  goldBottom: "#DBB78B",
  gold: "#C9A06A",
};

// ─── Layout helpers ────────────────────────────────────────────────────
function scaleFor(layout) {
  // Sett dimensjoner basert på format så tekst og elementer passer
  switch (layout) {
    case "portrait":   // 4:5 — original
      return { topPct: "32%", topPad: 50, ftLogoH: 46, eyebrowSize: 32, h1Size: 104, jub25H: 170, bottomPad: 46, safeBottom: 0, dateLabelSize: 32, dateSize: 156, junSize: 86, titleSize: 50, timeSize: 42, addrSize: 26 };
    case "square":     // 1:1 — kompakt
      return { topPct: "38%", topPad: 38, ftLogoH: 38, eyebrowSize: 26, h1Size: 78, jub25H: 130, bottomPad: 32, safeBottom: 0, dateLabelSize: 24, dateSize: 110, junSize: 60, titleSize: 38, timeSize: 32, addrSize: 20 };
    case "tall":       // 9:16 — Reels/Stories (info løftes opp av trygg sone)
      return { topPct: "22%", topPad: 60, ftLogoH: 56, eyebrowSize: 38, h1Size: 130, jub25H: 200, bottomPad: 64, safeBottom: 340, bgPos: "center top", bgSize: "1080px auto", dateLabelSize: 40, dateSize: 200, junSize: 110, titleSize: 60, timeSize: 52, addrSize: 32 };
    case "landscape":  // 1.91:1 — egen horisontal layout
      return null;
  }
}

// ─── HTML (vertikal: 4:5 / 1:1 / 9:16) ─────────────────────────────────
function htmlVertical(W, H, s) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_FACE_CSS}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;}
body{font-family:'Manrope',-apple-system,sans-serif;color:${FT.white};position:relative;overflow:hidden;}
</style></head><body>

  <div style="position:absolute;inset:0;background:${FT.ink};"></div>
  <div style="position:absolute;inset:0;background-image:url('${heroDataUri}');
    background-repeat:no-repeat;background-size:${s.bgSize || "cover"};background-position:${s.bgPos || "center 35%"};"></div>

  <div style="position:absolute;top:0;left:0;right:0;height:${s.topPct};
    background:linear-gradient(180deg,rgba(15,17,21,0.78) 0%,rgba(15,17,21,0.4) 60%,transparent 100%);
    padding:${s.topPad}px ${s.topPad + 6}px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">

    <div style="flex:1;">
      <img src="${ftLogoDataUri}" alt="Fosen Tools" style="height:${s.ftLogoH}px;width:auto;display:block;margin-bottom:18px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5));"/>
      <div style="font-size:${s.eyebrowSize}px;font-weight:800;letter-spacing:0.28em;color:${FT.goldBottom};text-transform:uppercase;margin-bottom:14px;">
        Vi feirer 25 år
      </div>
      <div style="font-size:${s.h1Size}px;font-weight:800;color:${FT.white};line-height:0.96;letter-spacing:-0.025em;">
        HOLD AV<br/>DAGEN
      </div>
    </div>

    <img src="${jub25DataUri}" alt="25 år" style="height:${s.jub25H}px;width:auto;flex-shrink:0;"/>

  </div>

  <div style="position:absolute;bottom:0;left:0;right:0;background:${FT.red};
    padding:${s.bottomPad}px ${s.bottomPad + 10}px ${s.bottomPad + 10 + (s.safeBottom || 0)}px;color:${FT.white};">

    <div style="position:absolute;top:0;left:0;right:0;height:6px;
      background:linear-gradient(90deg,${FT.goldTop},${FT.goldBottom},${FT.goldTop});"></div>

    <div style="display:flex;align-items:stretch;gap:32px;">

      <div style="flex-shrink:0;">
        <div style="font-size:${s.dateLabelSize}px;font-weight:800;letter-spacing:0.24em;color:${FT.goldBottom};text-transform:uppercase;margin-bottom:4px;">
          Fredag
        </div>
        <div style="font-size:${s.dateSize}px;font-weight:800;line-height:0.85;letter-spacing:-0.035em;color:${FT.white};">
          26.
        </div>
        <div style="font-size:${s.junSize}px;font-weight:800;line-height:1;letter-spacing:0.02em;color:${FT.white};margin-top:-2px;">
          JUNI
        </div>
      </div>

      <div style="width:3px;background:rgba(255,255,255,0.32);align-self:stretch;"></div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:18px;">
        <div style="font-size:${s.titleSize}px;font-weight:800;line-height:1.1;color:${FT.white};">
          25 år &amp;<br/>åpning PROFF-butikk
        </div>
        <div style="margin-top:10px;">
          <div style="font-size:${s.timeSize}px;font-weight:800;letter-spacing:0.04em;line-height:1;color:${FT.white};">
            10:00 – 16:00
          </div>
          <div style="font-size:${s.addrSize}px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${FT.goldBottom};margin-top:12px;">
            Industrigata 1 · Brekstad
          </div>
        </div>
      </div>
    </div>
  </div>

</body></html>`;
}

// ─── HTML (9:16 — flexbox: bilde fyller til gull-linje, info-boks bunn) ──
function htmlTall(W, H, s) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_FACE_CSS}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;}
body{font-family:'Manrope',-apple-system,sans-serif;color:${FT.white};display:flex;flex-direction:column;overflow:hidden;background:${FT.ink};}
</style></head><body>

  <!-- Bilde-område: fyller alt over rød boks, flush mot toppen -->
  <div style="flex:1;position:relative;background-image:url('${heroDataUri}');
    background-size:165%;background-position:center 26%;background-repeat:no-repeat;background-color:${FT.ink};">

    <!-- Topp gradient + tekst-overlay -->
    <div style="position:absolute;top:0;left:0;right:0;padding:${s.topPad}px ${s.topPad + 6}px;
      background:linear-gradient(180deg,rgba(15,17,21,0.82) 0%,rgba(15,17,21,0.45) 55%,transparent 100%);
      display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
      <div style="flex:1;">
        <img src="${ftLogoDataUri}" alt="Fosen Tools" style="height:${s.ftLogoH}px;width:auto;display:block;margin-bottom:18px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5));"/>
        <div style="font-size:${s.eyebrowSize}px;font-weight:800;letter-spacing:0.28em;color:${FT.goldBottom};text-transform:uppercase;margin-bottom:14px;">
          Vi feirer 25 år
        </div>
        <div style="font-size:${s.h1Size}px;font-weight:800;color:${FT.white};line-height:0.96;letter-spacing:-0.025em;text-shadow:0 4px 18px rgba(0,0,0,0.4);">
          HOLD AV<br/>DAGEN
        </div>
      </div>
      <img src="${jub25DataUri}" alt="25 år" style="height:${s.jub25H}px;width:auto;flex-shrink:0;"/>
    </div>
  </div>

  <!-- Rød info-boks (bunn, med trygg-sone-padding for Reels-UI) -->
  <div style="flex-shrink:0;position:relative;background:${FT.red};
    padding:${s.bottomPad}px ${s.bottomPad + 10}px ${s.bottomPad + 10 + (s.safeBottom || 0)}px;color:${FT.white};">
    <div style="position:absolute;top:0;left:0;right:0;height:6px;
      background:linear-gradient(90deg,${FT.goldTop},${FT.goldBottom},${FT.goldTop});"></div>
    <div style="display:flex;align-items:stretch;gap:32px;">
      <div style="flex-shrink:0;">
        <div style="font-size:${s.dateLabelSize}px;font-weight:800;letter-spacing:0.24em;color:${FT.goldBottom};text-transform:uppercase;margin-bottom:4px;">Fredag</div>
        <div style="font-size:${s.dateSize}px;font-weight:800;line-height:0.85;letter-spacing:-0.035em;color:${FT.white};">26.</div>
        <div style="font-size:${s.junSize}px;font-weight:800;line-height:1;letter-spacing:0.02em;color:${FT.white};margin-top:-2px;">JUNI</div>
      </div>
      <div style="width:3px;background:rgba(255,255,255,0.32);align-self:stretch;"></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:18px;">
        <div style="font-size:${s.titleSize}px;font-weight:800;line-height:1.1;color:${FT.white};">
          25 år &amp;<br/>åpning PROFF-butikk
        </div>
        <div style="margin-top:10px;">
          <div style="font-size:${s.timeSize}px;font-weight:800;letter-spacing:0.04em;line-height:1;color:${FT.white};">10:00 – 16:00</div>
          <div style="font-size:${s.addrSize}px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${FT.goldBottom};margin-top:12px;">Industrigata 1 · Brekstad</div>
        </div>
      </div>
    </div>
  </div>

</body></html>`;
}

// ─── HTML (landscape: 1.91:1) ──────────────────────────────────────────
function htmlLandscape(W, H) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_FACE_CSS}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;}
body{font-family:'Manrope',-apple-system,sans-serif;color:${FT.white};position:relative;overflow:hidden;display:flex;}
</style></head><body>

  <!-- Venstre: drone-bilde med tekst-overlay -->
  <div style="width:55%;height:100%;position:relative;background-image:url('${heroDataUri}');background-size:cover;background-position:center 35%;">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,17,21,0.7) 0%,rgba(15,17,21,0.3) 60%,transparent 100%);padding:36px 42px;display:flex;flex-direction:column;justify-content:space-between;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
        <img src="${ftLogoDataUri}" alt="Fosen Tools" style="height:36px;width:auto;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.5));"/>
        <img src="${jub25DataUri}" alt="25 år" style="height:96px;width:auto;flex-shrink:0;"/>
      </div>
      <div>
        <div style="font-size:22px;font-weight:800;letter-spacing:0.28em;color:${FT.goldBottom};text-transform:uppercase;margin-bottom:10px;">
          Vi feirer 25 år
        </div>
        <div style="font-size:74px;font-weight:800;color:${FT.white};line-height:0.96;letter-spacing:-0.025em;">
          HOLD AV DAGEN
        </div>
      </div>
    </div>
  </div>

  <!-- Høyre: FT-rød info-panel -->
  <div style="width:45%;height:100%;background:${FT.red};padding:36px 42px;color:${FT.white};display:flex;flex-direction:column;justify-content:center;position:relative;">

    <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,${FT.goldTop},${FT.goldBottom},${FT.goldTop});"></div>

    <div style="display:flex;align-items:flex-start;gap:24px;">
      <div style="flex-shrink:0;">
        <div style="font-size:18px;font-weight:800;letter-spacing:0.24em;color:${FT.goldBottom};text-transform:uppercase;margin-bottom:2px;">Fredag</div>
        <div style="font-size:108px;font-weight:800;line-height:0.85;letter-spacing:-0.035em;color:${FT.white};">26.</div>
        <div style="font-size:58px;font-weight:800;line-height:1;letter-spacing:0.02em;color:${FT.white};">JUNI</div>
      </div>

      <div style="width:2px;background:rgba(255,255,255,0.32);align-self:stretch;"></div>

      <div style="flex:1;display:flex;flex-direction:column;gap:14px;">
        <div style="font-size:30px;font-weight:800;line-height:1.15;color:${FT.white};">
          25 år &amp;<br/>åpning PROFF-butikk
        </div>
        <div>
          <div style="font-size:26px;font-weight:800;letter-spacing:0.04em;line-height:1;color:${FT.white};">10:00 – 16:00</div>
          <div style="font-size:16px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${FT.goldBottom};margin-top:8px;">Industrigata 1 · Brekstad</div>
        </div>
      </div>
    </div>
  </div>

</body></html>`;
}

// ─── Render ────────────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("🚀 Starter Chromium…");
  const browser = await chromium.launch({ headless: true });

  for (const fmt of FORMATS) {
    const page = await browser.newPage({
      viewport: { width: fmt.w, height: fmt.h },
      deviceScaleFactor: 2,
    });

    const s = scaleFor(fmt.layout);
    const html = fmt.layout === "landscape"
      ? htmlLandscape(fmt.w, fmt.h)
      : fmt.layout === "tall"
      ? htmlTall(fmt.w, fmt.h, s)
      : htmlVertical(fmt.w, fmt.h, s);

    await page.setContent(html, { waitUntil: "networkidle", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);

    const outPath = path.join(OUT_DIR, `01-teaser-26juni-${fmt.name}.png`);
    await page.screenshot({ path: outPath, type: "png" });

    const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(0);
    console.log(`  ✅ ${path.basename(outPath)}  (${fmt.w}×${fmt.h}, ${sizeKb} kB)`);

    await page.close();
  }

  await browser.close();
  console.log(`\n🎉 Ferdig: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
