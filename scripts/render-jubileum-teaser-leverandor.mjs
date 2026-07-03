/**
 * Jubileums-teaser MED LEVERANDØRER — variant for Meta ad
 *
 * Erstatter den nederste røde info-panel med en hvit "leverandører på besøk"-
 * stripe med 8 logoer. Hero på toppen er kompakt så vi får plass til logoene.
 *
 * 4 formater (samme som original teaser):
 *   • 4:5  (1080×1350)  — FB/IG feed
 *   • 1:1  (1080×1080)  — IG/FB kvadrat
 *   • 9:16 (1080×1920)  — Reel/Story
 *   • 1.91:1 (1200×628) — FB landscape
 *
 * Output: ~/Downloads/jubileum-teaser-2026-06/02-leverandor-{format}.png
 *   node scripts/render-jubileum-teaser-leverandor.mjs
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
  { name: "4-5",     w: 1080, h: 1350, layout: "portrait" },
  { name: "1-1",     w: 1080, h: 1080, layout: "square" },
  { name: "9-16",    w: 1080, h: 1920, layout: "tall" },
  { name: "1-91-1",  w: 1200, h: 628,  layout: "landscape" },
];

// ─── Inline font ───────────────────────────────────────────────────────
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

// ─── Assets ────────────────────────────────────────────────────────────
const jub25Svg = fs.readFileSync(path.join(ASSET_DIR, "Jubileumslogo-25aar.svg"), "utf-8");
const jub25 = `data:image/svg+xml;base64,${Buffer.from(jub25Svg).toString("base64")}`;
const ftLogo = `data:image/png;base64,${fs.readFileSync(path.join(ASSET_DIR, "fosentools_logo_ny2.png")).toString("base64")}`;
const heroDataUri = `data:image/png;base64,${fs.readFileSync(HERO_IMG).toString("base64")}`;

// Leverandør-logoer fra Supabase
const SUPABASE_BASE = "https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/social_assets/brand-assets/leverandor-logoer";
const LEVERANDORER = [
  { slug: "milwaukee",  alt: "Milwaukee" },
  { slug: "wera",       alt: "Wera" },
  { slug: "soudal",     alt: "Soudal" },
  { slug: "picard",     alt: "Picard" },
  { slug: "halder",     alt: "Halder" },
  { slug: "zweibruder", alt: "Zweibrüder" },
];
const GJESTER = [
  { slug: "redbull",    alt: "Red Bull" },
  { slug: "tesla",      alt: "Tesla Mobile Service" },
];

// ─── FT-tokens ─────────────────────────────────────────────────────────
const FT = {
  red: "#ED1C24",
  ink: "#0F1115",
  white: "#FFFFFF",
  paper: "#F4F1EC",
  goldTop: "#85704D",
  goldBottom: "#F0CE84",
};

// ─── Layout helpers ────────────────────────────────────────────────────
function scaleFor(layout) {
  switch (layout) {
    case "portrait":   // 4:5 — 1080×1350
      return { heroH: 52, ftLogoH: 40, jub25H: 140, eyebrowSize: 24, h1Size: 200, subSize: 44, datepillSize: 26,
               pillPadV: 20, pillPadH: 30,
               levCols: 3, levRows: 2, levEyebrowSize: 18, levLogoH: 105,
               gjestCols: 2, gjestEyebrowSize: 18, gjestLogoH: 120, safeBottom: 0,
               heroAlign: "space-between", bottomAlign: "center" };
    case "square":     // 1:1 — 1080×1080
      return { heroH: 50, ftLogoH: 36, jub25H: 116, eyebrowSize: 20, h1Size: 156, subSize: 36, datepillSize: 20,
               pillPadV: 16, pillPadH: 24,
               levCols: 3, levRows: 2, levEyebrowSize: 14, levLogoH: 78,
               gjestCols: 2, gjestEyebrowSize: 14, gjestLogoH: 88, safeBottom: 0,
               heroAlign: "space-between", bottomAlign: "center" };
    case "tall":       // 9:16 — 1080×1920 — Reels/Stories
      return { heroH: 48, ftLogoH: 50, jub25H: 170, eyebrowSize: 26, h1Size: 220, subSize: 48, datepillSize: 32,
               pillPadV: 22, pillPadH: 32,
               levCols: 3, levRows: 2, levEyebrowSize: 22, levLogoH: 120,
               gjestCols: 2, gjestEyebrowSize: 22, gjestLogoH: 140, safeBottom: 340,
               bgPos: "center 18%", bgSize: "1080px auto",
               heroAlign: "flex-start", bottomAlign: "flex-start" };
    case "landscape":  // 1.91:1 — 1200×628 — egen layout
      return null;
  }
}

// ─── HTML (vertikal: 4:5 / 1:1 / 9:16) ─────────────────────────────────
function htmlVertical(W, H, s, layout) {
  const pad = layout === "tall" ? 60 : 44;
  const gap = layout === "tall" ? 14 : 10;
  const sectionGap = layout === "tall" ? 32 : 24;

  const levCells = LEVERANDORER.map(p => `
    <div style="background:${FT.white};display:flex;align-items:center;justify-content:center;
      padding:10px;border-radius:5px;height:${s.levLogoH}px;
      box-shadow:0 3px 10px rgba(0,0,0,0.3);">
      <img src="${SUPABASE_BASE}/${p.slug}.png?v=5" alt="${p.alt}"
        style="max-width:92%;max-height:92%;object-fit:contain;display:block;"/>
    </div>
  `).join("");

  const gjestCells = GJESTER.map(p => `
    <div style="background:${FT.white};display:flex;align-items:center;justify-content:center;
      padding:14px;border-radius:6px;height:${s.gjestLogoH}px;
      box-shadow:0 4px 14px rgba(0,0,0,0.35);">
      <img src="${SUPABASE_BASE}/${p.slug}.png?v=5" alt="${p.alt}"
        style="max-width:90%;max-height:90%;object-fit:contain;display:block;"/>
    </div>
  `).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_FACE_CSS}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;}
body{font-family:'Manrope',-apple-system,sans-serif;color:${FT.white};display:flex;flex-direction:column;overflow:hidden;background:${FT.ink};}
</style></head><body>

  <!-- HERO: ren drone-foto med subtil tech-overlay (FT-blueprint DNA) -->
  <div style="flex:0 0 ${s.heroH}%;position:relative;background:${FT.ink};overflow:hidden;">
    <!-- Drone-bildet — full bredde, ingen rødt overlay -->
    <div style="position:absolute;inset:0;background-image:url('${heroDataUri}');
      background-repeat:no-repeat;background-size:${s.bgSize || "cover"};background-position:${s.bgPos || "center 35%"};"></div>

    <!-- Mørk gradient kun nederst for tekst-legibility (ikke fullt overlay) -->
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,17,21,0.50) 0%,rgba(15,17,21,0.15) 30%,rgba(15,17,21,0.55) 70%,rgba(15,17,21,0.92) 100%);"></div>

    <!-- FT-SIGNATUR: Blueprint-grid overlay — tech/engineering-DNA -->
    <div style="position:absolute;inset:0;background-image:
      linear-gradient(rgba(240,206,132,0.10) 1px,transparent 1px),
      linear-gradient(90deg,rgba(240,206,132,0.10) 1px,transparent 1px);
      background-size:80px 80px;pointer-events:none;"></div>

    <!-- FT-SIGNATUR: Hjørne-brackets i gull (CADLAB-tech) -->
    <div style="position:absolute;top:${pad - 6}px;left:${pad - 6}px;width:48px;height:48px;
      border-top:3px solid ${FT.goldBottom};border-left:3px solid ${FT.goldBottom};z-index:3;"></div>
    <div style="position:absolute;top:${pad - 6}px;right:${pad - 6}px;width:48px;height:48px;
      border-top:3px solid ${FT.goldBottom};border-right:3px solid ${FT.goldBottom};z-index:3;"></div>

    <div style="position:relative;z-index:2;padding:${pad}px ${pad}px ${pad}px;height:100%;
      display:flex;flex-direction:column;justify-content:${s.heroAlign};">

      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
        <img src="${ftLogo}" alt="Fosen Tools" style="height:${s.ftLogoH}px;width:auto;display:block;
          filter:drop-shadow(0 4px 14px rgba(0,0,0,0.7));"/>
        <img src="${jub25}" alt="25 år" style="height:${s.jub25H}px;width:auto;flex-shrink:0;
          filter:drop-shadow(0 4px 18px rgba(0,0,0,0.5));"/>
      </div>

      <div style="${s.heroAlign === "flex-start" ? "margin-top:auto;margin-bottom:auto;" : ""}">

        <!-- Eyebrow med rød accent-stripe -->
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
          <div style="width:42px;height:4px;background:${FT.red};"></div>
          <div style="font-size:${s.eyebrowSize}px;font-weight:800;letter-spacing:0.36em;color:${FT.goldBottom};text-transform:uppercase;text-shadow:0 2px 10px rgba(0,0,0,0.7);">
            25-&aring;rsjubileum
          </div>
        </div>

        <!-- HUGE date — pop med kontrast: hvit + gull aksent -->
        <div style="font-size:${s.h1Size}px;font-weight:800;color:${FT.white};line-height:0.82;letter-spacing:-0.04em;margin-bottom:12px;text-shadow:0 8px 28px rgba(0,0,0,0.6);">
          26.<span style="color:${FT.goldBottom};">06</span>
        </div>

        <!-- "Hold av dagen" — kursiv-style accent -->
        <div style="font-size:${s.subSize}px;font-weight:800;color:${FT.white};letter-spacing:-0.015em;line-height:1.0;margin-bottom:26px;text-shadow:0 4px 14px rgba(0,0,0,0.6);text-transform:uppercase;">
          Hold av dagen
        </div>

        <!-- Info-pille med Grilling fra 11 — større + mer pop -->
        <div style="display:inline-block;background:rgba(15,17,21,0.78);padding:${s.pillPadV}px ${s.pillPadH}px;border-radius:8px;
          font-size:${s.datepillSize}px;font-weight:800;letter-spacing:0.03em;line-height:1.3;border:2px solid rgba(240,206,132,0.42);
          box-shadow:0 6px 20px rgba(0,0,0,0.45);">
          <span style="color:${FT.goldBottom};">Fredag 26. juni</span> &nbsp;<span style="opacity:0.4">|</span>&nbsp;
          10:00&ndash;16:00 &nbsp;<span style="opacity:0.4">|</span>&nbsp;
          Grilling fra 11
        </div>
      </div>
    </div>
  </div>

  <!-- BUNN: ink-panel med to seksjoner — leverandører + gjester -->
  <div style="flex:1;background:${FT.ink};color:${FT.white};
    padding:${layout === "tall" ? 40 : pad}px ${pad}px ${pad + (s.safeBottom || 0)}px;
    display:flex;flex-direction:column;justify-content:${s.bottomAlign || "center"};">

    <!-- Seksjon 1: Leverandører -->
    <div style="margin-bottom:${sectionGap}px;">
      <div style="font-size:${s.levEyebrowSize}px;font-weight:800;letter-spacing:0.36em;text-transform:uppercase;
        color:${FT.goldBottom};text-align:center;margin-bottom:14px;">
        Leverand&oslash;rer p&aring; bes&oslash;k
      </div>
      <div style="display:grid;grid-template-columns:repeat(${s.levCols},1fr);gap:${gap}px;width:100%;">
        ${levCells}
      </div>
    </div>

    <!-- Seksjon 2: Spesielle gjester -->
    <div>
      <div style="font-size:${s.gjestEyebrowSize}px;font-weight:800;letter-spacing:0.36em;text-transform:uppercase;
        color:${FT.red};text-align:center;margin-bottom:14px;">
        &plus; Spesielle gjester
      </div>
      <div style="display:grid;grid-template-columns:repeat(${s.gjestCols},1fr);gap:${gap + 4}px;width:100%;">
        ${gjestCells}
      </div>
    </div>
  </div>

</body></html>`;
}

// ─── HTML (landscape: 1.91:1) ──────────────────────────────────────────
function htmlLandscape(W, H) {
  const levCells = LEVERANDORER.map(p => `
    <div style="background:${FT.white};display:flex;align-items:center;justify-content:center;
      padding:8px;border-radius:4px;height:62px;box-shadow:0 3px 10px rgba(0,0,0,0.3);">
      <img src="${SUPABASE_BASE}/${p.slug}.png?v=5" alt="${p.alt}"
        style="max-width:92%;max-height:92%;object-fit:contain;display:block;"/>
    </div>
  `).join("");
  const gjestCells = GJESTER.map(p => `
    <div style="background:${FT.white};display:flex;align-items:center;justify-content:center;
      padding:10px;border-radius:5px;height:72px;box-shadow:0 4px 12px rgba(0,0,0,0.35);">
      <img src="${SUPABASE_BASE}/${p.slug}.png?v=5" alt="${p.alt}"
        style="max-width:90%;max-height:90%;object-fit:contain;display:block;"/>
    </div>
  `).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_FACE_CSS}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;}
body{font-family:'Manrope',-apple-system,sans-serif;color:${FT.white};display:flex;overflow:hidden;background:${FT.ink};}
</style></head><body>

  <!-- Venstre: ren drone-foto hero (52% bredde) — samme stil som de andre formatene -->
  <div style="width:52%;height:100%;position:relative;background:${FT.ink};overflow:hidden;">
    <!-- Drone-bildet uten rødt overlay -->
    <div style="position:absolute;inset:0;background-image:url('${heroDataUri}');
      background-size:cover;background-position:center 35%;"></div>

    <!-- Mørk gradient kun for tekst-legibility -->
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,17,21,0.50) 0%,rgba(15,17,21,0.15) 30%,rgba(15,17,21,0.55) 70%,rgba(15,17,21,0.92) 100%);"></div>

    <!-- FT-SIGNATUR: Blueprint-grid -->
    <div style="position:absolute;inset:0;background-image:
      linear-gradient(rgba(240,206,132,0.10) 1px,transparent 1px),
      linear-gradient(90deg,rgba(240,206,132,0.10) 1px,transparent 1px);
      background-size:60px 60px;pointer-events:none;"></div>

    <!-- FT-SIGNATUR: Gull-hjørne-brackets -->
    <div style="position:absolute;top:28px;left:28px;width:36px;height:36px;
      border-top:3px solid ${FT.goldBottom};border-left:3px solid ${FT.goldBottom};z-index:3;"></div>
    <div style="position:absolute;top:28px;right:28px;width:36px;height:36px;
      border-top:3px solid ${FT.goldBottom};border-right:3px solid ${FT.goldBottom};z-index:3;"></div>

    <div style="position:relative;z-index:2;padding:34px 36px;height:100%;
      display:flex;flex-direction:column;justify-content:space-between;">

      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
        <img src="${ftLogo}" alt="Fosen Tools" style="height:32px;width:auto;
          filter:drop-shadow(0 4px 14px rgba(0,0,0,0.7));"/>
        <img src="${jub25}" alt="25 år" style="height:84px;width:auto;flex-shrink:0;
          filter:drop-shadow(0 4px 18px rgba(0,0,0,0.5));"/>
      </div>

      <div>
        <!-- Eyebrow med rød accent-stripe -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="width:28px;height:3px;background:${FT.red};"></div>
          <div style="font-size:11px;font-weight:800;letter-spacing:0.36em;color:${FT.goldBottom};text-transform:uppercase;text-shadow:0 2px 10px rgba(0,0,0,0.7);">
            25-&aring;rsjubileum
          </div>
        </div>

        <!-- HUGE date: hvit + gull-aksent -->
        <div style="font-size:120px;font-weight:800;color:${FT.white};line-height:0.82;letter-spacing:-0.04em;margin-bottom:8px;text-shadow:0 6px 22px rgba(0,0,0,0.6);">
          26.<span style="color:${FT.goldBottom};">06</span>
        </div>

        <!-- "Hold av dagen" -->
        <div style="font-size:24px;font-weight:800;color:${FT.white};letter-spacing:-0.01em;line-height:1.0;margin-bottom:14px;text-shadow:0 4px 14px rgba(0,0,0,0.6);text-transform:uppercase;">
          Hold av dagen
        </div>

        <!-- Info-pille med Grilling fra 11 -->
        <div style="display:inline-block;background:rgba(15,17,21,0.78);padding:12px 18px;border-radius:7px;
          font-size:14px;font-weight:800;letter-spacing:0.03em;line-height:1.3;border:2px solid rgba(240,206,132,0.42);
          box-shadow:0 4px 14px rgba(0,0,0,0.45);">
          <span style="color:${FT.goldBottom};">Fredag 26. juni</span> &nbsp;<span style="opacity:0.4">|</span>&nbsp;
          10:00&ndash;16:00 &nbsp;<span style="opacity:0.4">|</span>&nbsp;
          Grilling fra 11
        </div>
      </div>
    </div>
  </div>

  <!-- Høyre: 2 seksjoner på ink (48% bredde) -->
  <div style="width:48%;height:100%;background:${FT.ink};color:${FT.white};padding:28px;
    display:flex;flex-direction:column;justify-content:center;gap:20px;">

    <div>
      <div style="font-size:11px;font-weight:800;letter-spacing:0.36em;text-transform:uppercase;
        color:${FT.goldBottom};text-align:center;margin-bottom:12px;">
        Leverand&oslash;rer p&aring; bes&oslash;k
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;">
        ${levCells}
      </div>
    </div>

    <div>
      <div style="font-size:11px;font-weight:800;letter-spacing:0.36em;text-transform:uppercase;
        color:${FT.red};text-align:center;margin-bottom:12px;">
        &plus; Spesielle gjester
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
        ${gjestCells}
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
      : htmlVertical(fmt.w, fmt.h, s, fmt.layout);

    await page.setContent(html, { waitUntil: "networkidle", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);

    const outPath = path.join(OUT_DIR, `02-leverandor-${fmt.name}.png`);
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
