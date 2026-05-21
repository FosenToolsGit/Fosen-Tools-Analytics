/**
 * Deterministisk approach: labels plasseres INNI swatch's nedre tredjedel
 * med en mørk strip bak (dekker AI-rendret tekst hvis noe). Ingen pixel-detect,
 * ingen forsøk på å finne "den ekte bunnen".
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { writeFileSync, readFileSync } from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const FONT_DIR = path.join(process.cwd(), "public/social/fonts");
const fontExtraBold = readFileSync(path.join(FONT_DIR, "manrope-latin-800-normal.woff2")).toString("base64");
const fontRegular = readFileSync(path.join(FONT_DIR, "manrope-latin-400-normal.woff2")).toString("base64");
const fontFaces = `
@font-face { font-family: 'Manrope'; font-weight: 400; src: url(data:font/woff2;base64,${fontRegular}) format('woff2'); }
@font-face { font-family: 'Manrope'; font-weight: 800; src: url(data:font/woff2;base64,${fontExtraBold}) format('woff2'); }`;

function escapeXml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function breakLines(text, max) {
  const ws = text.trim().split(/\s+/); const ls = []; let c = "";
  for (const w of ws) { const x = c ? `${c} ${w}` : w; if (x.length > max && c) { ls.push(c); c = w; } else c = x; if (ls.length >= 4) break; }
  if (c && ls.length < 4) ls.push(c);
  return ls.length > 0 ? ls : [text];
}

const swatchPrompt = `Product-variant SWATCH-GRID — visual elements only, NO TEXT.

CRITICAL: ZERO text. No words, labels, headlines, hex codes.

LAYOUT:
1. Full-bleed FT-ink #0F1115 bg with subtle FT-red glow.
2. TOP THIRD: empty canvas.
3. MIDDLE HALF: 6 HDFI swatches in 2×3 grid.
   HDFI ANATOMY: colored plate + tool-cutout + rim + black foam.
   ROW 1: red+white, black+white, white+black
   ROW 2: navy+white, yellow+black, grey+black
   Leave ~8% empty space below each row.
4. BOTTOM: empty.

Blueprint decoration in corners. STRICTLY AVOID humans, cartoon.`;

async function visionDetect(imageB64, W, H) {
  const prompt = `Image has 6 HDFI swatches in 2×3 grid. Return bounding box of each colored plate (reading order). Coordinates 0-1000.
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

function buildOverlay(W, H, headline, redWord, body, labels, boxes) {
  const isLandscape = W > H * 1.2;
  const isPortrait = H > W * 1.2;
  const upper = headline.toUpperCase();
  const redUp = (redWord ?? "").toUpperCase();
  const heroFS = Math.round(W * (isLandscape ? 0.06 : 0.085));
  const heroLH = Math.round(heroFS * 1.1);
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
  const heroText = `<text x="${heroX}" y="${heroStartY}" font-family="Manrope, sans-serif" font-weight="800" font-size="${heroFS}" fill="#FFFFFF" letter-spacing="2">${tspans}</text>`;
  const accentY = heroStartY + heroLH * lines.length - heroLH * 0.3;
  const accent = `<rect x="${heroX}" y="${accentY}" width="${Math.round(W * 0.08)}" height="3" fill="#ED1C24"/>`;

  // LABELS INNI SWATCH NEDRE TREDJEDEL — med mørk strip bak
  const labelFS = Math.round(W * (isLandscape ? 0.024 : 0.027));
  const labelSvgs = boxes.slice(0, labels.length).map((box, i) => {
    const cx = box.x + box.w / 2;
    // Label-Y: 80% nede i swatch (innenfor swatch, men under tool-cutout som er sentrert)
    const cy = box.y + box.h * 0.82;
    // Strip bak: 90% bredde, ~1.5x font-høyde
    const stripW = box.w * 0.92;
    const stripH = labelFS * 1.5;
    const stripX = cx - stripW / 2;
    const stripY = cy - labelFS * 0.85;
    return `<rect x="${stripX}" y="${stripY}" width="${stripW}" height="${stripH}" rx="${Math.round(labelFS * 0.2)}" fill="rgba(0,0,0,0.78)"/>
            <text x="${cx}" y="${cy}" font-family="Manrope, sans-serif" font-weight="700" font-size="${labelFS}" fill="#FFFFFF" text-anchor="middle">${escapeXml(labels[i] ?? "")}</text>`;
  }).join("");

  let bodyEl = "";
  if (body) {
    const bFS = Math.round(W * 0.024);
    const bY = Math.round(H * (isLandscape ? 0.92 : 0.86));
    bodyEl = `<text x="${W/2}" y="${bY}" font-family="Manrope, sans-serif" font-weight="400" font-style="italic" font-size="${bFS}" fill="#FFFFFF" fill-opacity="0.85" text-anchor="middle">${escapeXml(body)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><style>${fontFaces}</style></defs>${heroText}${accent}${labelSvgs}${bodyEl}</svg>`;
}

const LABELS = ["Rød/Hvit", "Svart/Hvit", "Hvit/Svart", "Blå/Hvit", "Gul/Svart", "Lyse grå/Svart"];
const PLATFORMS = [
  { slug: "facebook", aspect: "1:1" },
  { slug: "instagram", aspect: "3:4" },
  { slug: "linkedin", aspect: "16:9" },
];

for (const { slug, aspect } of PLATFORMS) {
  console.log(`\n[${slug}] aspect=${aspect}`);
  try {
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
    writeFileSync(`${process.env.HOME}/Desktop/inside-${slug}-1-ai.png`, buf);

    console.log("  Vision X-bounds…");
    const boxes = await visionDetect(b64, W, H);
    console.log("  Composite (labels inside swatches, dark strip bak)…");
    const svg = buildOverlay(W, H, "Seks farger. Én standard.", "Seks", "Rød. Svart. Hvit. Blå. Gul. Lyse grå.", LABELS, boxes);
    const composed = await sharp(buf).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
    writeFileSync(`${process.env.HOME}/Desktop/inside-${slug}-2-final.png`, composed);
    console.log(`  ✓ ~/Desktop/inside-${slug}-2-final.png`);
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
  }
}
console.log("\nFerdig.");
