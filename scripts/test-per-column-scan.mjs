/**
 * Per-kolonne-scan for swatch-detect.
 *
 * For HVER Vision-swatch tar vi X-rangen (med litt indent) og scanner vertikalt.
 * I den smale stripen er bg-pixler mye mer dominante enn i helbilde — gir tydeligere signal.
 * Finn connected stretches der >50% av X-rangen er "non-bg". Match til Vision-Y.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { writeFileSync, readFileSync } from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// PER-KOLONNE SCAN
// ─────────────────────────────────────────────────────────────────────────────
async function perColumnScan(imageBuf, visionBoxes) {
  const { data, info } = await sharp(imageBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  // Funksjon: count non-bg pixels i en gitt rect (xStart..xEnd, ved y)
  function countNonBgAtY(y, xStart, xEnd) {
    let count = 0;
    for (let x = xStart; x <= xEnd && x < W; x++) {
      if (x < 0) continue;
      const idx = (y * W + x) * C;
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const chroma = max - min;
      if (lum > 50 || chroma > 25) count++;
    }
    return count;
  }

  // Identifiser kolonner basert på Vision-x. Group boxes by similar x-center.
  // (Hver Vision-swatch tilhører én kolonne — vi grouper sammen rader i samme kol)
  const boxesByColumn = new Map();
  for (const box of visionBoxes) {
    const xCenter = box.x + box.w / 2;
    // Find existing column within tolerance
    let foundKey = null;
    for (const key of boxesByColumn.keys()) {
      if (Math.abs(key - xCenter) < box.w * 0.4) { foundKey = key; break; }
    }
    const key = foundKey ?? xCenter;
    if (!boxesByColumn.has(key)) boxesByColumn.set(key, []);
    boxesByColumn.get(key).push(box);
  }

  const result = new Map(); // box → {trueTop, trueBottom}

  for (const [_, columnBoxes] of boxesByColumn) {
    // For denne kolonnen, finn samlet X-range (median)
    const xs = columnBoxes.map(b => b.x);
    const ws = columnBoxes.map(b => b.w);
    const xCenter = columnBoxes[0].x + columnBoxes[0].w / 2;
    const colW = Math.max(...ws);
    const xStart = Math.round(xCenter - colW * 0.4); // 80% av bredden, sentrert
    const xEnd = Math.round(xCenter + colW * 0.4);
    const colPixelCount = xEnd - xStart + 1;
    const threshold = colPixelCount * 0.4; // krev >=40% non-bg-pixels i raden

    // Scan vertikalt: for hver Y, count non-bg
    const yProj = [];
    for (let y = 0; y < H; y++) {
      yProj.push(countNonBgAtY(y, xStart, xEnd));
    }

    // Find connected stretches over threshold
    const stretches = [];
    let inStretch = false, startY = 0;
    for (let y = 0; y < H; y++) {
      if (yProj[y] > threshold) {
        if (!inStretch) { startY = y; inStretch = true; }
      } else {
        if (inStretch) {
          stretches.push({ top: startY, bottom: y - 1 });
          inStretch = false;
        }
      }
    }
    if (inStretch) stretches.push({ top: startY, bottom: H - 1 });

    // Filtrer ut for små stretches
    const minH = H * 0.04;
    const validStretches = stretches.filter(s => s.bottom - s.top >= minH);

    // Match hver Vision-box til closest stretch (etter Y-overlap)
    for (const box of columnBoxes) {
      const boxYCenter = box.y + box.h / 2;
      let best = null, bestDist = Infinity;
      for (const s of validStretches) {
        const sCenter = (s.top + s.bottom) / 2;
        const dist = Math.abs(sCenter - boxYCenter);
        if (dist < bestDist) { bestDist = dist; best = s; }
      }
      result.set(box, best ? { trueTop: best.top, trueBottom: best.bottom } : null);
    }
  }

  return visionBoxes.map(box => {
    const r = result.get(box);
    return { ...box, trueTop: r?.trueTop ?? box.y, trueBottom: r?.trueBottom ?? box.y + box.h };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AI + Vision (samme som før)
// ─────────────────────────────────────────────────────────────────────────────
const swatchPrompt = `Product-variant SWATCH-GRID — visual elements only, NO TEXT.

CRITICAL: ZERO text. No words, no letters, no labels, no headlines, no hex codes.

LAYOUT:
1. Full-bleed FT-ink #0F1115 bg with subtle FT-red glow.
2. TOP THIRD: empty canvas.
3. MIDDLE HALF: 6 HDFI swatches in 2×3 grid. HDFI anatomy: colored plate + tool-cutout + rim + black foam.
   ROW 1: red+white, black+white, white+black
   ROW 2: navy+white, yellow+black, grey+black
   Leave ~10% canvas-height empty space below each row.
4. BOTTOM: empty.

Blueprint decoration in corners.

NO text anywhere. STRICTLY AVOID humans, cartoon, photo-realistic stock.`;

async function visionDetect(imageB64, W, H) {
  const prompt = `This image has exactly 6 HDFI swatches in a 2×3 grid. Return bounding box of each colored plate (in reading order top-left to bottom-right).
Use normalized coordinates 0-1000.
Output: {"boxes":[{"x":0,"y":0,"w":0,"h":0},...]}`;
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
// Composite
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

function buildOverlay(W, H, headline, redWord, body, labels, boxes) {
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
  const labelSvgs = boxes.slice(0, labels.length).map((box, i) => {
    const cx = box.x + box.w / 2;
    const swatchBottom = box.trueBottom; // pixel-presis!
    const sameColumn = boxes.filter((b, j) =>
      j !== i && Math.abs(b.x + b.w/2 - cx) < box.w * 0.4 && b.y > swatchBottom
    );
    const nextRowTop = sameColumn.length > 0 ? Math.min(...sameColumn.map(b => b.trueTop ?? b.y)) : H;
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
    if (!b64) { console.log("  ❌"); continue; }
    const buf = Buffer.from(b64, "base64");
    const meta = await sharp(buf).metadata();
    const W = meta.width, H = meta.height;
    writeFileSync(`${process.env.HOME}/Desktop/colscan-${slug}-1-ai.png`, buf);

    console.log("  Steg 2: Vision X-bounds…");
    const visionBoxes = await visionDetect(b64, W, H);

    console.log("  Steg 3: Per-kolonne pixel-scan…");
    const extended = await perColumnScan(buf, visionBoxes);
    extended.forEach((b, i) => {
      console.log(`    [${i+1}] ${LABELS[i]}: vision-y=${b.y} h=${b.h} bottom=${b.y+b.h} → trueTop=${b.trueTop} trueBottom=${b.trueBottom}`);
    });

    console.log("  Steg 4: Composite…");
    const svg = buildOverlay(W, H, "Seks farger. Én standard.", "Seks", "Rød. Svart. Hvit. Blå. Gul. Lyse grå.", LABELS, extended);
    const composed = await sharp(buf).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
    writeFileSync(`${process.env.HOME}/Desktop/colscan-${slug}-2-final.png`, composed);
    console.log(`  ✓ ~/Desktop/colscan-${slug}-2-final.png`);
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
  }
}
console.log("\nFerdig.");
