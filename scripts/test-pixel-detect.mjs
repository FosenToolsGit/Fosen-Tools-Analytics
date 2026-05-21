/**
 * Test pixel-presis swatch-bunn-detect.
 * Pipeline: AI-gen → Vision (X-bounds) → Pixel-scan (true Y-bottom) → composite.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { writeFileSync, readFileSync } from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// PIXEL-DETECT (mirror av src/lib/services/pixel-detect.ts)
// ─────────────────────────────────────────────────────────────────────────────
// Bg er mørk (FT-ink #0F1115 + evt. rød radial glow). Bruk luminance-grense.
// Luminance > 50 → swatch-pixel. Lavere → bg.
function luminance(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }
function isBg(r, g, b) {
  return luminance(r, g, b) < 45;
}

async function detectSwatchBottoms(imageBuf, boxes) {
  const { data, info } = await sharp(imageBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = [];
  for (const box of boxes) {
    const samples = 7;
    const indent = Math.round(box.w * 0.12);
    const xs = [];
    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1);
      xs.push(Math.round(box.x + indent + (box.w - indent * 2) * t));
    }
    const startY = box.y + box.h;
    const maxScan = Math.min(height - startY - 1, Math.round(height * 0.3));
    let trueBottom = startY;
    let bgRows = 0;
    const REQ = 2;
    for (let dy = 0; dy <= maxScan; dy++) {
      const y = startY + dy;
      if (y >= height) break;
      let bgCount = 0;
      for (const x of xs) {
        if (x < 0 || x >= width) continue;
        const idx = (y * width + x) * channels;
        if (isBg(data[idx], data[idx+1], data[idx+2])) bgCount++;
      }
      if (bgCount >= 5) {
        bgRows++;
        if (bgRows >= REQ) {
          trueBottom = y - REQ + 1;
          break;
        }
      } else {
        bgRows = 0;
        trueBottom = y;
      }
    }
    out.push({ ...box, trueBottom });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI prompt + Vision-detect (samme som før)
// ─────────────────────────────────────────────────────────────────────────────
const swatchPrompt = `Product-variant SWATCH-GRID — visual elements only, NO TEXT.

CRITICAL: ZERO text in the image. No words, no letters, no labels, no headlines, no hex codes.

LAYOUT:
1. Full-bleed FT-ink #0F1115 background with subtle FT-red radial glow.
2. TOP THIRD: empty canvas.
3. MIDDLE HALF: Render EXACTLY 6 HDFI swatches in a 2×3 grid.

   HDFI ANATOMY:
   - TOP LAYER: rounded rectangular plastic plate in PRIMARY color
   - ENGRAVED TOOL CUTOUT inside (wrench/screwdriver/pliers)
   - ENGRAVING RIM: thin in SECONDARY color around cutout
   - INSIDE CUTOUT: BLACK FOAM

   COLOR ORDER (top-left → bottom-right):
   ROW 1: (1) RED+WHITE rim, (2) BLACK+WHITE rim, (3) WHITE+BLACK rim
   ROW 2: (4) NAVY BLUE+WHITE rim, (5) YELLOW+BLACK rim, (6) LIGHT GREY+BLACK rim

   IMPORTANT: Leave clear EMPTY SPACE (~10% canvas-height) BELOW each swatch row.

4. BOTTOM AREA: empty canvas.

MANDATORY blueprint decoration in corners.

ABSOLUTE TEXT FORBIDS: NO headline, NO labels, NO body, NO captions, NO hex codes, NO dimensions, NO wordmarks.

STRICTLY AVOID: AI humans, cartoon, photo-realistic stock.`;

async function visionDetect(imageB64, W, H) {
  const prompt = `This image has exactly 6 HDFI swatches in a grid. For EACH, return bounding box of just the colored plate (in reading order).

Use normalized coordinates 0-1000.

Output JSON: {"boxes":[{"x":0,"y":0,"w":0,"h":0},...]}`;
  const r = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { data: imageB64, mimeType: "image/png" } }] }],
    config: { responseMimeType: "application/json", temperature: 0 },
  });
  const parsed = JSON.parse(r.text);
  return (parsed.boxes ?? []).map(b => ({
    x: Math.round((b.x / 1000) * W),
    y: Math.round((b.y / 1000) * H),
    w: Math.round((b.w / 1000) * W),
    h: Math.round((b.h / 1000) * H),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite-text
// ─────────────────────────────────────────────────────────────────────────────
const FONT_DIR = path.join(process.cwd(), "public/social/fonts");
const fontExtraBold = readFileSync(path.join(FONT_DIR, "manrope-latin-800-normal.woff2")).toString("base64");
const fontRegular = readFileSync(path.join(FONT_DIR, "manrope-latin-400-normal.woff2")).toString("base64");
const fontFaces = `
@font-face { font-family: 'Manrope'; font-weight: 400; src: url(data:font/woff2;base64,${fontRegular}) format('woff2'); }
@font-face { font-family: 'Manrope'; font-weight: 800; src: url(data:font/woff2;base64,${fontExtraBold}) format('woff2'); }`;

function escapeXml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function breakLines(text, maxChars) {
  const words = text.trim().split(/\s+/); const lines = []; let cur = "";
  for (const w of words) { const c = cur ? `${cur} ${w}` : w; if (c.length > maxChars && cur) { lines.push(cur); cur = w; } else cur = c; if (lines.length >= 4) break; }
  if (cur && lines.length < 4) lines.push(cur);
  return lines.length > 0 ? lines : [text];
}

function buildOverlay(W, H, headline, redWord, body, labels, boxesWithTrueBottom) {
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
      const inner = parts.map(p => p === redUp ? `<tspan fill="#ED1C24">${escapeXml(p)}</tspan>` : escapeXml(p)).join("");
      return `<tspan x="${heroX}" dy="${dy}">${inner}</tspan>`;
    }
    return `<tspan x="${heroX}" dy="${dy}">${escapeXml(line)}</tspan>`;
  }).join("");
  const heroText = `<text x="${heroX}" y="${heroStartY}" font-family="Manrope, sans-serif" font-weight="800" font-size="${heroFontSize}" fill="#FFFFFF" letter-spacing="2">${tspans}</text>`;
  const accentY = heroStartY + heroLH * lines.length - heroLH * 0.3;
  const accent = `<rect x="${heroX}" y="${accentY}" width="${Math.round(W * 0.08)}" height="3" fill="#ED1C24"/>`;

  const labelFS = Math.round(W * (isLandscape ? 0.022 : 0.027));
  const labelSvgs = boxesWithTrueBottom.slice(0, labels.length).map((box, i) => {
    const cx = box.x + box.w / 2;
    // Bruk trueBottom (pixel-presis) i stedet for box.y+box.h
    const swatchBottom = box.trueBottom;
    // Beregn neste rad's true-top (med samme algoritme)
    const sameColumn = boxesWithTrueBottom.filter((b, j) =>
      j !== i &&
      Math.abs(b.x + b.w/2 - cx) < box.w * 0.4 &&
      b.y > swatchBottom
    );
    const nextRowTop = sameColumn.length > 0 ? Math.min(...sameColumn.map(b => b.y)) : H;
    const gap = nextRowTop - swatchBottom;
    const idealPadding = labelFS + 6;
    let cy;
    if (gap >= idealPadding + labelFS) cy = swatchBottom + idealPadding;
    else if (gap > labelFS * 1.2) cy = swatchBottom + gap * 0.55;
    else cy = swatchBottom + labelFS + 2;
    return `<text x="${cx}" y="${cy}" font-family="Manrope, sans-serif" font-weight="500" font-size="${labelFS}" fill="#FFFFFF" text-anchor="middle">${escapeXml(labels[i] ?? "")}</text>`;
  }).join("");

  let bodyEl = "";
  if (body) {
    const bFS = Math.round(W * 0.024);
    const bY = Math.round(H * (isLandscape ? 0.92 : 0.86));
    bodyEl = `<text x="${W/2}" y="${bY}" font-family="Manrope, sans-serif" font-weight="400" font-style="italic" font-size="${bFS}" fill="#FFFFFF" fill-opacity="0.85" text-anchor="middle">${escapeXml(body)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><style>${fontFaces}</style></defs>${heroText}${accent}${labelSvgs}${bodyEl}</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
const LABELS = ["Rød/Hvit", "Svart/Hvit", "Hvit/Svart", "Blå/Hvit", "Gul/Svart", "Lyse grå/Svart"];
const PLATFORMS = [
  { slug: "facebook", aspect: "1:1" },
  { slug: "instagram", aspect: "3:4" },
  { slug: "linkedin", aspect: "16:9" },
];

for (const { slug, aspect } of PLATFORMS) {
  console.log(`\n[${slug}] aspect=${aspect}`);
  try {
    console.log("  Steg 1: AI swatches…");
    const r1 = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: `${swatchPrompt}\n\nMANDATORY OUTPUT FORMAT: ${aspect} aspect ratio.` }] }],
      config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect } },
    });
    let b64 = null;
    for (const cand of r1.candidates ?? []) for (const part of cand.content?.parts ?? []) if (part.inlineData?.data) { b64 = part.inlineData.data; break; }
    if (!b64) { console.log("  ❌ Ingen AI-output"); continue; }
    const buf = Buffer.from(b64, "base64");
    const meta = await sharp(buf).metadata();
    const W = meta.width, H = meta.height;
    writeFileSync(`${process.env.HOME}/Desktop/pixel-${slug}-1-ai.png`, buf);

    console.log("  Steg 2: Vision X-bounds…");
    const visionBoxes = await visionDetect(b64, W, H);
    console.log("  Steg 3: Pixel-scan true Y-bottoms…");
    const extended = await detectSwatchBottoms(buf, visionBoxes);
    extended.forEach((b, i) => {
      const extra = b.trueBottom - (b.y + b.h);
      console.log(`    [${i+1}] ${LABELS[i]}: vision-bottom=${b.y + b.h}, true-bottom=${b.trueBottom} (+${extra}px)`);
    });

    console.log("  Steg 4: Composite…");
    const svg = buildOverlay(W, H, "Seks farger. Én standard.", "Seks", "Rød. Svart. Hvit. Blå. Gul. Lyse grå.", LABELS, extended);
    const composed = await sharp(buf).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
    writeFileSync(`${process.env.HOME}/Desktop/pixel-${slug}-2-final.png`, composed);
    console.log(`  ✓ ~/Desktop/pixel-${slug}-2-final.png`);
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
  }
}
console.log("\nFerdig.");
