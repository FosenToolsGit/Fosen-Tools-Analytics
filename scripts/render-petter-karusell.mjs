/**
 * Petter Braa — fagbrev CNC-Maskinering · MEGET GODT · 22. mai 2026
 *
 * Lager 5 karusell-slides à 1080×1350 (4:5) til IG-feed, FB-feed og
 * LinkedIn. Skrives til ~/Downloads/petter-fagbrev-2026-06/.
 *
 * Stack: Playwright headless Chromium + Manrope-font inline, samme
 * mønster som a5-kundeark-renderer + jubileum-poster.
 *
 *   node scripts/render-petter-karusell.mjs
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ROOT = process.cwd();
const PETTER_DIR = path.join(ROOT, "Petter");
const FONT_DIR = path.join(ROOT, "public/social/fonts");
const ASSET_DIR = path.join(ROOT, "public/brosjyre");
const OUT_DIR = path.join(os.homedir(), "Downloads/petter-fagbrev-2026-06");

const W = 1080;
const H = 1350;

// ─── Font + brand-asset inlining ───────────────────────────────────────
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

function imgDataUri(file) {
  const buf = fs.readFileSync(file);
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

const IMG = {
  petter: imgDataUri(path.join(PETTER_DIR, "IMG_3804.jpg")),
  vogn: imgDataUri(path.join(PETTER_DIR, "IMG_3808.jpg")),
  q14: imgDataUri(path.join(PETTER_DIR, "IMG_3805.jpg")),
};

// ─── FT design-tokens ──────────────────────────────────────────────────
const FT = {
  red: "#ED1C24",
  redDark: "#B8141A",
  ink: "#0F1115",
  inkLight: "#1B1E23",
  white: "#FFFFFF",
  goldTop: "#85704D",
  goldBottom: "#DBB78B",
  gold: "#C9A06A",
};

// ─── Shared shell ──────────────────────────────────────────────────────
function shell(content, extraCss = "") {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONT_FACE_CSS}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;}
body{font-family:'Manrope',-apple-system,sans-serif;color:${FT.white};
  position:relative;overflow:hidden;width:${W}px;height:${H}px;}
.page-num{position:absolute;bottom:24px;right:36px;font-size:22px;font-weight:800;
  letter-spacing:0.18em;color:rgba(255,255,255,0.65);z-index:30;}
.jub-mark{position:absolute;bottom:24px;left:36px;height:52px;width:auto;z-index:30;
  opacity:0.95;}
${extraCss}
</style></head><body>${content}</body></html>`;
}

// ─── GULL-stempel SVG (rotert -8°) ────────────────────────────────────
function goldStamp(size = 480) {
  const r = size / 2;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"
    style="filter:drop-shadow(0 12px 32px rgba(0,0,0,0.45));">
  <defs>
    <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${FT.goldBottom}"/>
      <stop offset="40%" stop-color="${FT.gold}"/>
      <stop offset="100%" stop-color="${FT.goldTop}"/>
    </linearGradient>
    <linearGradient id="gg2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F5DBA5"/>
      <stop offset="100%" stop-color="${FT.goldTop}"/>
    </linearGradient>
  </defs>
  <circle cx="${r}" cy="${r}" r="${r - 8}" fill="url(#gg)" stroke="${FT.goldTop}" stroke-width="3"/>
  <circle cx="${r}" cy="${r}" r="${r - 28}" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>
  <circle cx="${r}" cy="${r}" r="${r - 42}" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1.5"/>
  <g transform="translate(${size * 0.018} ${-size * 0.018})">
    <text x="50%" y="28%" text-anchor="middle" fill="#1A1208" font-family="Manrope" font-weight="800" font-size="30" letter-spacing="6">FAGPRØVE</text>
    <line x1="${r - 70}" y1="${size * 0.33}" x2="${r + 70}" y2="${size * 0.33}" stroke="#1A1208" stroke-width="2" opacity="0.55"/>
    <text x="50%" y="51%" text-anchor="middle" fill="#1A1208" font-family="Manrope" font-weight="800" font-size="72" letter-spacing="2">MEGET</text>
    <text x="50%" y="68%" text-anchor="middle" fill="#1A1208" font-family="Manrope" font-weight="800" font-size="72" letter-spacing="2">GODT</text>
    <line x1="${r - 70}" y1="${size * 0.78}" x2="${r + 70}" y2="${size * 0.78}" stroke="#1A1208" stroke-width="2" opacity="0.55"/>
    <text x="50%" y="86%" text-anchor="middle" fill="#1A1208" font-family="Manrope" font-weight="800" font-size="24" letter-spacing="8">BESTÅTT</text>
  </g>
</svg>`;
}

// ─── Konfetti-burst SVG ────────────────────────────────────────────────
function confettiCorner(opts) {
  const { rotate = 0, x = 0, y = 0, size = 320 } = opts;
  const pieces = [];
  // Faste seeds — deterministisk
  const seed = [
    [0.12, 0.18, 28, FT.gold, 32],
    [0.32, 0.08, 16, FT.white, -12],
    [0.55, 0.22, 22, FT.goldBottom, 48],
    [0.18, 0.45, 18, FT.white, 65],
    [0.42, 0.42, 24, FT.gold, -38],
    [0.68, 0.05, 14, FT.white, 18],
    [0.78, 0.32, 20, FT.goldBottom, 78],
    [0.08, 0.62, 16, FT.gold, -55],
    [0.62, 0.55, 22, FT.white, 22],
    [0.88, 0.55, 18, FT.goldBottom, 5],
    [0.25, 0.72, 14, FT.gold, 88],
    [0.48, 0.78, 20, FT.white, -28],
    [0.72, 0.78, 16, FT.goldBottom, 62],
  ];
  for (const [sx, sy, sz, color, rot] of seed) {
    const px = sx * size;
    const py = sy * size;
    pieces.push(
      `<rect x="${px}" y="${py}" width="${sz}" height="${sz * 0.4}" fill="${color}" transform="rotate(${rot} ${px + sz / 2} ${py + sz / 2})" opacity="0.95"/>`,
    );
  }
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"
    style="position:absolute;left:${x}px;top:${y}px;transform:rotate(${rotate}deg);pointer-events:none;">
    ${pieces.join("")}
  </svg>`;
}

// ─── Page number + jub-mark helpers ───────────────────────────────────
function footer(n) {
  return `
    <img class="jub-mark" src="${jub25DataUri}" alt=""/>
    <div class="page-num">${n} / 5</div>
  `;
}

// =============================================================================
// SLIDE 1 — REN FEIRING
// =============================================================================
function slide1() {
  return shell(
    `
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,${FT.red} 0%,${FT.redDark} 100%);">
      <!-- Subtilt radial-glow midt-bak -->
      <div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 50% at 50% 38%, rgba(255,255,255,0.14), transparent 65%);"></div>
    </div>

    ${confettiCorner({ x: -40, y: -40, size: 380, rotate: 0 })}
    ${confettiCorner({ x: W - 340, y: -40, size: 380, rotate: 90 })}
    ${confettiCorner({ x: -30, y: H - 360, size: 380, rotate: 270 })}
    ${confettiCorner({ x: W - 350, y: H - 360, size: 380, rotate: 180 })}

    <div style="position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;padding:60px;text-align:center;z-index:5;">

      <div style="font-size:96px;font-weight:800;letter-spacing:0.01em;margin-bottom:2px;line-height:1;">
        🎉 GRATULERER 🎉
      </div>

      <div style="height:5px;width:220px;background:${FT.goldBottom};margin:18px auto 18px;"></div>

      <div style="font-size:148px;font-weight:800;letter-spacing:-0.015em;line-height:0.93;margin-bottom:18px;">
        PETTER BRAA
      </div>

      <div style="font-size:40px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;opacity:0.96;margin-bottom:24px;line-height:1.2;">
        <span style="font-weight:800;color:${FT.goldBottom};letter-spacing:0.04em;">MEGET GODT</span> bestått i<br/>
        <span style="font-weight:800;letter-spacing:0.03em;">CNC-Maskineringsfaget</span>
      </div>

      <div style="transform:rotate(-8deg);margin:0;">
        ${goldStamp(460)}
      </div>
    </div>

    ${footer(1)}
  `,
  );
}

// =============================================================================
// SLIDE 2 — 6 ÅRS PRAKSISKANDIDAT
// =============================================================================
function slide2() {
  return shell(
    `
    <div style="position:absolute;inset:0;display:flex;">
      <!-- Venstre 45%: fakta-panel -->
      <div style="width:45%;background:linear-gradient(180deg,${FT.ink} 0%,${FT.inkLight} 100%);
        padding:50px 38px 240px;display:flex;flex-direction:column;color:${FT.white};">

        <div style="font-size:28px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:${FT.goldBottom};margin-bottom:22px;line-height:1.22;">
          6 ÅR.<br/>FULL JOBB.<br/>FAGBREV.
        </div>

        <div style="font-size:76px;font-weight:800;letter-spacing:-0.02em;line-height:0.95;margin-bottom:6px;">
          PETTER<br/>BRAA
        </div>

        <div style="height:5px;width:84px;background:${FT.red};margin:20px 0 26px;"></div>

        <div style="font-size:22px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:${FT.goldBottom};margin-bottom:4px;">
          Startet hos FT
        </div>
        <div style="font-size:46px;font-weight:800;margin-bottom:20px;line-height:1;">
          Mai 2020
        </div>

        <div style="height:1px;background:linear-gradient(90deg,${FT.goldTop},${FT.goldBottom},transparent);margin-bottom:20px;"></div>

        <div style="font-size:22px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:${FT.goldBottom};margin-bottom:4px;">
          Praksiskandidat
        </div>
        <div style="font-size:46px;font-weight:800;margin-bottom:20px;line-height:1;">
          2025–2026
        </div>

        <div style="height:1px;background:linear-gradient(90deg,${FT.goldTop},${FT.goldBottom},transparent);margin-bottom:20px;"></div>

        <div style="font-size:22px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:${FT.goldBottom};margin-bottom:4px;">
          Fagprøve
        </div>
        <div style="font-size:36px;font-weight:800;line-height:1.18;">
          CNC-maskinering<br/>
          <span style="color:${FT.goldBottom};">MEGET GODT</span> bestått
        </div>
      </div>

      <!-- Høyre 55%: Petter-bilde -->
      <div style="width:55%;background-image:url('${IMG.petter}');background-size:cover;background-position:right center;"></div>
    </div>

    <!-- Bunn-quote-bånd (FT-rød) over begge kolonner -->
    <div style="position:absolute;left:0;right:0;bottom:0;background:${FT.red};
      padding:38px 52px 96px;color:${FT.white};">
      <div style="display:flex;gap:28px;align-items:flex-start;">
        <div style="font-size:140px;line-height:0.55;font-weight:800;color:${FT.goldBottom};flex-shrink:0;">❝</div>
        <div style="font-size:36px;font-weight:600;line-height:1.32;font-style:italic;">
          Fosen Tools har lagt godt til rette for at jeg kunne gjennomføre fagbrevet samtidig som jeg har vært i full jobb.
          <div style="margin-top:16px;font-size:24px;font-weight:800;font-style:normal;letter-spacing:0.18em;text-transform:uppercase;opacity:0.94;">— Petter Braa</div>
        </div>
      </div>
    </div>

    ${footer(2)}
  `,
  );
}

// =============================================================================
// SLIDE 3 — HOVED-QUOTE
// =============================================================================
function slide3() {
  return shell(
    `
    <div style="position:absolute;top:0;left:0;right:0;height:55%;
      background-image:url('${IMG.q14}');background-size:cover;background-position:center;">
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 50%,rgba(15,17,21,0.4) 100%);"></div>
    </div>

    <div style="position:absolute;bottom:0;left:0;right:0;height:45%;
      background:${FT.red};padding:46px 56px 100px;display:flex;flex-direction:column;justify-content:center;">

      <div style="font-size:190px;line-height:0.45;color:${FT.goldBottom};font-weight:800;margin-bottom:10px;">❝</div>

      <div style="font-size:56px;font-weight:700;line-height:1.22;color:${FT.white};font-style:italic;">
        Det har vært en spennende prosess, og bekreftelse på erfaringen jeg har bygget gjennom årene.
      </div>

      <div style="display:flex;align-items:center;gap:22px;margin-top:32px;">
        <div style="height:4px;width:74px;background:${FT.goldBottom};"></div>
        <div style="font-size:28px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:${FT.white};">
          Petter Braa
        </div>
      </div>
    </div>

    ${footer(3)}
  `,
  );
}

// =============================================================================
// SLIDE 4 — HÅNDVERKET (HDFI-vognen)
// =============================================================================
function slide4() {
  return shell(
    `
    <div style="position:absolute;inset:0;background-image:url('${IMG.vogn}');
      background-size:cover;background-position:center;"></div>

    <!-- Topp mørk gradient -->
    <div style="position:absolute;top:0;left:0;right:0;height:38%;
      background:linear-gradient(180deg,rgba(15,17,21,0.92) 0%,rgba(15,17,21,0.55) 70%,transparent 100%);
      padding:60px 56px;display:flex;flex-direction:column;">

      <div style="font-size:26px;font-weight:800;letter-spacing:0.24em;text-transform:uppercase;color:${FT.goldBottom};margin-bottom:20px;">
        Dette har Petter skreddersydd
      </div>

      <div style="font-size:88px;font-weight:800;line-height:1;letter-spacing:-0.02em;color:${FT.white};">
        Komplett Snap-on<br/>verktøysett i HDFI
      </div>
    </div>

    <!-- Bunn mørk gradient -->
    <div style="position:absolute;bottom:0;left:0;right:0;height:34%;
      background:linear-gradient(0deg,rgba(15,17,21,0.96) 0%,rgba(15,17,21,0.7) 60%,transparent 100%);
      padding:60px 56px 90px;display:flex;flex-direction:column;justify-content:flex-end;">

      <div style="display:flex;gap:18px;margin-bottom:24px;">
        ${["1/4\"", "3/8\"", "1/2\"", "3/4\""]
          .map(
            (s) =>
              `<div style="background:${FT.red};color:${FT.white};font-size:40px;font-weight:800;
              padding:16px 24px;letter-spacing:0.03em;">${s}</div>`,
          )
          .join("")}
      </div>

      <div style="font-size:40px;font-weight:800;line-height:1.25;color:${FT.white};">
        Skreddersydd HDFI<br/>
        <span style="color:${FT.goldBottom};">Tegnet i CADLABen<br/>CNC-maskinert hos Fosen Tools</span>
      </div>
    </div>

    ${footer(4)}
  `,
  );
}

// =============================================================================
// SLIDE 5 — HJERTELIG + CTA
// =============================================================================
function slide5() {
  return shell(
    `
    <div style="position:absolute;inset:0;background-image:url('${IMG.q14}');
      background-size:cover;background-position:center;"></div>
    <div style="position:absolute;inset:0;background:rgba(15,17,21,0.7);"></div>

    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:60px;">

      <div style="background:${FT.red};color:${FT.white};padding:74px 56px;
        box-shadow:0 30px 80px rgba(0,0,0,0.55);width:100%;
        position:relative;overflow:hidden;">

        <!-- Indre gull-strek øverst -->
        <div style="position:absolute;top:0;left:0;right:0;height:8px;
          background:linear-gradient(90deg,${FT.goldTop},${FT.goldBottom},${FT.goldTop});"></div>

        <div style="font-size:108px;font-weight:800;line-height:0.95;letter-spacing:-0.02em;margin-bottom:14px;">
          GRATULERER<br/>PETTER! 👏
        </div>

        <div style="height:5px;width:130px;background:${FT.goldBottom};margin:32px 0;"></div>

        <div style="font-size:42px;font-weight:700;line-height:1.28;margin-bottom:42px;">
          Hele Fosen Tools-familien<br/>feirer deg!
        </div>

        <div style="font-size:22px;font-weight:800;letter-spacing:0.24em;text-transform:uppercase;color:${FT.goldBottom};margin-bottom:10px;">
          Les mer om HDFI
        </div>
        <div style="font-size:44px;font-weight:800;letter-spacing:0.02em;">
          → fosen-tools.no/hdfi
        </div>
      </div>
    </div>

    ${footer(5)}
  `,
  );
}

// =============================================================================
// RUNNER
// =============================================================================
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("🚀 Starter Chromium…");
  const browser = await chromium.launch({ headless: true });

  const slides = [
    { name: "01-gratulerer.png", html: slide1() },
    { name: "02-praksiskandidat.png", html: slide2() },
    { name: "03-quote.png", html: slide3() },
    { name: "04-handverket.png", html: slide4() },
    { name: "05-hjertelig.png", html: slide5() },
  ];

  for (const s of slides) {
    const page = await browser.newPage({
      viewport: { width: W, height: H },
      deviceScaleFactor: 2,
    });
    await page.setContent(s.html, { waitUntil: "networkidle", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    const outPath = path.join(OUT_DIR, s.name);
    await page.screenshot({ path: outPath, type: "png" });
    await page.close();
    const size = (fs.statSync(outPath).size / 1024).toFixed(0);
    console.log(`  ✅ ${s.name} (${size} kB)`);
  }

  await browser.close();
  console.log(`\n🎉 5 slides ferdig i ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
