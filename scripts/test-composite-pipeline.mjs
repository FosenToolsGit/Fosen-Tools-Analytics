/**
 * Test hele pipelinen: AI rendrer kun visuelle elementer (swatches + bg)
 * → server-side composite legger på tekst + wordmark.
 *
 * Bruker direkte sharp+SVG (samme arkitektur som composite-text.ts).
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { writeFileSync, readFileSync } from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Steg 1: AI rendrer ANONYM swatch-grid (ingen tekst)
const anonymousSwatchPrompt = `Product-variant SWATCH-GRID — visual elements only, NO TEXT.

CRITICAL: ZERO text characters. No words, no labels, no headlines, no brand marks, no hex codes, no dimension annotations. Every text element is added server-side after generation. If you render ANY text, the generation is a failure.

LAYOUT:
1. Full-bleed FT-ink #0F1115 background with subtle FT-red #ED1C24 radial glow from one corner (15-20% opacity max).
2. TOP THIRD: completely EMPTY canvas (background only). Reserved for server-side headline overlay.
3. MIDDLE HALF: Render EXACTLY 6 HDFI swatch samples in a 2×3 grid.

   CORRECT HDFI ANATOMY: HDFI is layered (do NOT render as flat painted rectangles):
   - TOP LAYER: rounded rectangular plastic plate in the PRIMARY color.
   - ENGRAVED TOOL CUTOUT inside the plate: a tool-silhouette CUTOUT shape (wrench, screwdriver, or pliers — vary).
   - ENGRAVING RIM around the edge of cutout: thin VISIBLE rim (2-4px) in SECONDARY color (lower plastic layer exposed by CNC engraving — like a relief border).
   - INSIDE THE CUTOUT: BLACK FOAM. ALWAYS black, regardless of plate color.

   COLOR ORDER (top-left to bottom-right):
   ROW 1: (1) RED plate + WHITE rim, (2) BLACK plate + WHITE rim, (3) WHITE plate + BLACK rim
   ROW 2: (4) DEEP NAVY BLUE plate + WHITE rim, (5) INDUSTRIAL YELLOW plate + BLACK rim, (6) LIGHT GREY plate + BLACK rim
   All swatches have BLACK foam inside cutout.

   Leave SPACE between swatches (16-24px gap) AND below each swatch (~24-30px) for server-side label overlay.

4. BOTTOM AREA: completely EMPTY canvas. Reserved for server-side body-text + wordmark.

MANDATORY blueprint decoration (thin white lines, 50% opacity): CAD-dimension top-right, grid bottom-left, gear bottom-right, connector top-left.

ABSOLUTE TEXT FORBIDS:
- NO headline text
- NO swatch labels
- NO body text
- NO hex codes
- NO dimension annotations like "70px"
- NO wordmarks, logos, brand marks
- NO italic captions
The image is purely visual: background + decoration + 6 anatomically-correct swatches. NOTHING ELSE.

STRICTLY AVOID: AI humans, cartoon, photo-realistic stock, lens flares, fake product photos.`;

console.log("Steg 1: AI rendrer anonym swatch-grid…");

const PLATFORMS = [
  { slug: "facebook", aspect: "1:1" },
  { slug: "instagram", aspect: "3:4" },
  { slug: "linkedin", aspect: "16:9" },
];

// =============================================================================
// composite-text-LOGIC kopiert inn for test (mirror av composite-text.ts)
// =============================================================================

const FONT_DIR = path.join(process.cwd(), "public/social/fonts");
function loadFontB64(filename) {
  return readFileSync(path.join(FONT_DIR, filename)).toString("base64");
}
const fontRegular = loadFontB64("manrope-latin-400-normal.woff2");
const fontBold = loadFontB64("manrope-latin-700-normal.woff2");
const fontExtraBold = loadFontB64("manrope-latin-800-normal.woff2");
const fontFaces = `
@font-face { font-family: 'Manrope'; font-weight: 400; src: url(data:font/woff2;base64,${fontRegular}) format('woff2'); }
@font-face { font-family: 'Manrope'; font-weight: 700; src: url(data:font/woff2;base64,${fontBold}) format('woff2'); }
@font-face { font-family: 'Manrope'; font-weight: 800; src: url(data:font/woff2;base64,${fontExtraBold}) format('woff2'); }`;

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function breakLines(text, maxChars) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const c = cur ? `${cur} ${w}` : w;
    if (c.length > maxChars && cur) { lines.push(cur); cur = w; } else cur = c;
    if (lines.length >= 4) break;
  }
  if (cur && lines.length < 4) lines.push(cur);
  return lines.length > 0 ? lines : [text];
}

function buildOverlay(W, H, headline, redWord, body, swatchLabels) {
  const isLandscape = W > H * 1.2;
  const isPortrait = H > W * 1.2;
  const upper = headline.toUpperCase();
  const redUp = (redWord ?? "").toUpperCase();

  const heroFontSize = Math.round(W * (isLandscape ? 0.06 : 0.085));
  const heroLH = Math.round(heroFontSize * 1.1);
  const heroX = Math.round(W * 0.06);
  const heroStartY = Math.round(H * (isPortrait ? 0.13 : 0.15));

  const lines = breakLines(upper, 16);
  const tspans = lines.map((line, i) => {
    const dy = i === 0 ? 0 : heroLH;
    if (redUp && new RegExp(`\\b${escapeRegex(redUp)}\\b`).test(line)) {
      const parts = line.split(new RegExp(`(\\b${escapeRegex(redUp)}\\b)`));
      const inner = parts.map((p) =>
        p === redUp ? `<tspan fill="#ED1C24">${escapeXml(p)}</tspan>` : escapeXml(p)
      ).join("");
      return `<tspan x="${heroX}" dy="${dy}">${inner}</tspan>`;
    }
    return `<tspan x="${heroX}" dy="${dy}">${escapeXml(line)}</tspan>`;
  }).join("");

  const heroText = `<text x="${heroX}" y="${heroStartY}" font-family="Manrope, 'Helvetica Neue', sans-serif" font-weight="800" font-size="${heroFontSize}" fill="#FFFFFF" letter-spacing="2">${tspans}</text>`;
  const accentY = heroStartY + heroLH * lines.length - heroLH * 0.3;
  const accent = `<rect x="${heroX}" y="${accentY}" width="${Math.round(W * 0.08)}" height="3" fill="#ED1C24" />`;

  // Swatch-labels under hver swatch
  const gridCols = isLandscape ? 6 : 3;
  const gridStartY = Math.round(H * (isLandscape ? 0.5 : isPortrait ? 0.42 : 0.45));
  const swatchH = Math.round(H * (isLandscape ? 0.32 : 0.16));
  const gridMargin = Math.round(W * 0.08);
  const usableW = W - gridMargin * 2;
  const swatchW = Math.round(usableW / gridCols);
  const gapY = Math.round(H * 0.025);
  const labelFS = Math.round(W * (isLandscape ? 0.022 : 0.027));
  const labelEls = swatchLabels.slice(0, 6).map((label, i) => {
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    const cx = gridMargin + col * swatchW + swatchW / 2;
    const cy = gridStartY + row * (swatchH + gapY) + swatchH + labelFS + 6;
    return `<text x="${cx}" y="${cy}" font-family="Manrope, 'Helvetica Neue', sans-serif" font-weight="500" font-size="${labelFS}" fill="#FFFFFF" text-anchor="middle">${escapeXml(label)}</text>`;
  }).join("\n  ");

  let bodyEl = "";
  if (body) {
    const bFS = Math.round(W * 0.024);
    const bY = Math.round(H * (isLandscape ? 0.85 : 0.83));
    bodyEl = `<text x="${W / 2}" y="${bY}" font-family="Manrope, 'Helvetica Neue', sans-serif" font-weight="400" font-style="italic" font-size="${bFS}" fill="#FFFFFF" fill-opacity="0.85" text-anchor="middle">${escapeXml(body)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><style>${fontFaces}</style></defs>${heroText}${accent}${labelEls}${bodyEl}</svg>`;
}

// =============================================================================
// Hovedflyt: AI-gen → composite-text
// =============================================================================

for (const { slug, aspect } of PLATFORMS) {
  console.log(`\n[${slug}] aspect=${aspect}`);
  try {
    console.log("  AI-gen…");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: `${anonymousSwatchPrompt}\n\nMANDATORY OUTPUT FORMAT: ${aspect} aspect ratio.` }] }],
      config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect } },
    });

    let b64 = null;
    for (const cand of response.candidates ?? []) {
      for (const part of cand.content?.parts ?? []) {
        if (part.inlineData?.data) { b64 = part.inlineData.data; break; }
      }
      if (b64) break;
    }
    if (!b64) { console.log("  ❌ Ingen bilde fra AI"); continue; }

    const aiBuf = Buffer.from(b64, "base64");

    // Lagre rå AI-output
    writeFileSync(`${process.env.HOME}/Desktop/composite-${slug}-1-raw.png`, aiBuf);

    // Hent dimensjoner
    const meta = await sharp(aiBuf).metadata();
    const W = meta.width;
    const H = meta.height;
    console.log(`  AI-output: ${W}×${H}`);

    // Steg 2: server-side composite-text
    console.log("  Composite-text overlay…");
    const labels = ["Rød/Hvit", "Svart/Hvit", "Hvit/Svart", "Blå/Hvit", "Gul/Svart", "Lyse grå/Svart"];
    const svg = buildOverlay(W, H, "Seks farger. Én standard.", "Seks", "Rød. Svart. Hvit. Blå. Gul. Lyse grå.", labels);
    const composed = await sharp(aiBuf).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();

    const outPath = `${process.env.HOME}/Desktop/composite-${slug}-2-final.png`;
    writeFileSync(outPath, composed);
    console.log(`  ✓ Lagret: ${outPath}`);
  } catch (err) {
    console.log(`  ❌ Feil: ${err.message}`);
  }
}

console.log("\nFerdig. Sjekk Desktop:");
console.log("- composite-{platform}-1-raw.png = ren AI-output (kun visuelle elementer)");
console.log("- composite-{platform}-2-final.png = etter server-side composite-text");
