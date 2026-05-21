/**
 * Test Alt B: AI rendrer KUN backdrop (bakgrunn + decor + mood).
 * Server-side rendrer alle swatches + tekst + labels.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { writeFileSync, readFileSync } from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// AI-prompt: ATMOSPHERIC BACKDROP ONLY
// ─────────────────────────────────────────────────────────────────────────────
const backdropPrompt = `Atmospheric backdrop for FT product-variant poster — empty canvas with mood only.

CRITICAL OUTPUT RULE: The entire image is a clean atmospheric BACKDROP. Server-side renders ALL foreground content (swatches, text, labels, wordmark) on top. Do NOT render any of the following:
- Any text, words, letters, labels, headlines whatsoever
- Any swatches, color samples, plates, or product representations
- Any tool silhouettes, wrenches, screwdrivers, pliers (foreground)
- Any logos, wordmarks, brand marks, signatures
- Any dimension annotations, hex codes, callout numbers
- Any foreground objects competing for attention

What TO render:
1. Full-bleed FT-ink #0F1115 background (deep dark gray-black) with a subtle FT-red #ED1C24 radial glow originating from one corner (10-15% opacity max), fading smoothly to near-black at the opposite corner.
2. MANDATORY blueprint decoration (thin white lines, 1-1.5px, 40-50% opacity): CAD-dimension top-right, small grid bottom-left, gear/circle bottom-right, connector top-left.
3. Subtle atmospheric element — a faded wireframe sketch of a verktøyvogn (tool cart with closed drawers) positioned in the lower-right or lower-left 40% of canvas. VERY low opacity (8-12%), thin white lines (1-1.5px). Mood/depth only — must NOT compete with future foreground content. Keep upper 30% and middle 50% of canvas relatively clean for server-side overlay.

That is the ENTIRE image: backdrop + corner decoration + one faded atmosphere element. Nothing more.

STRICTLY AVOID: AI humans, cartoon, photo-realistic stock, fake product photos, foreground swatches, brand marks, headlines, captions.`;

// ─────────────────────────────────────────────────────────────────────────────
// Server-side render (mirror av composite-text.ts)
// ─────────────────────────────────────────────────────────────────────────────

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

const TOOL_PATHS = {
  wrench: "M22,30 a8,8 0 0 1 0,40 L22,55 L30,55 L30,80 L40,80 L40,55 L60,55 L60,80 L70,80 L70,55 L78,55 L78,70 a8,8 0 0 0 0,-40 L78,45 L70,45 L70,20 L60,20 L60,45 L40,45 L40,20 L30,20 L30,45 L22,45 Z",
  screwdriver: "M42,12 L58,12 L58,40 L62,40 L62,80 L60,86 L40,86 L38,80 L38,40 L42,40 Z",
  pliers: "M30,15 L42,15 L48,50 L52,50 L58,15 L70,15 L62,55 L60,90 L40,90 L38,55 Z",
};

const HDFI_PALETTE = [
  { plateColor: "#B21F24", rimColor: "#FFFFFF", label: "Rød/Hvit", tool: "wrench" },
  { plateColor: "#1A1A1A", rimColor: "#FFFFFF", label: "Svart/Hvit", tool: "screwdriver" },
  { plateColor: "#F5F5F5", rimColor: "#1A1A1A", label: "Hvit/Svart", tool: "pliers" },
  { plateColor: "#1B4C85", rimColor: "#FFFFFF", label: "Blå/Hvit", tool: "wrench" },
  { plateColor: "#F2E546", rimColor: "#1A1A1A", label: "Gul/Svart", tool: "screwdriver" },
  { plateColor: "#C7C7C7", rimColor: "#1A1A1A", label: "Lyse grå/Svart", tool: "pliers" },
];

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function breakLines(text, maxChars) {
  const words = text.trim().split(/\s+/);
  const lines = []; let cur = "";
  for (const w of words) {
    const c = cur ? `${cur} ${w}` : w;
    if (c.length > maxChars && cur) { lines.push(cur); cur = w; } else cur = c;
    if (lines.length >= 4) break;
  }
  if (cur && lines.length < 4) lines.push(cur);
  return lines.length > 0 ? lines : [text];
}

function renderSwatch(x, y, w, h, sw) {
  const radius = Math.round(Math.min(w, h) * 0.12);
  const toolW = Math.round(w * 0.6);
  const toolH = Math.round(h * 0.6);
  const toolX = x + (w - toolW) / 2;
  const toolY = y + (h - toolH) / 2;
  const rimPad = Math.round(Math.min(toolW, toolH) * 0.04);
  const foamPad = Math.round(Math.min(toolW, toolH) * 0.05);
  const toolPath = TOOL_PATHS[sw.tool];

  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}" fill="${sw.plateColor}" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>
    <g transform="translate(${toolX - rimPad}, ${toolY - rimPad})">
      <path d="${toolPath}" fill="${sw.rimColor}" transform="scale(${(toolW + rimPad * 2) / 100}, ${(toolH + rimPad * 2) / 100})"/>
    </g>
    <g transform="translate(${toolX + foamPad}, ${toolY + foamPad})">
      <path d="${toolPath}" fill="#0a0a0a" transform="scale(${(toolW - foamPad * 2) / 100}, ${(toolH - foamPad * 2) / 100})"/>
    </g>
    <rect x="${x}" y="${y}" width="${w}" height="${Math.round(h * 0.12)}" rx="${radius}" ry="${radius}" fill="rgba(255,255,255,0.08)"/>
  `;
}

function buildOverlay(W, H, headline, redWord, body) {
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
      const inner = parts.map((p) => p === redUp ? `<tspan fill="#ED1C24">${escapeXml(p)}</tspan>` : escapeXml(p)).join("");
      return `<tspan x="${heroX}" dy="${dy}">${inner}</tspan>`;
    }
    return `<tspan x="${heroX}" dy="${dy}">${escapeXml(line)}</tspan>`;
  }).join("");

  const heroText = `<text x="${heroX}" y="${heroStartY}" font-family="Manrope, 'Helvetica Neue', sans-serif" font-weight="800" font-size="${heroFontSize}" fill="#FFFFFF" letter-spacing="2">${tspans}</text>`;
  const accentY = heroStartY + heroLH * lines.length - heroLH * 0.3;
  const accent = `<rect x="${heroX}" y="${accentY}" width="${Math.round(W * 0.08)}" height="3" fill="#ED1C24" />`;

  // 3×2 grid
  const gridCols = 3;
  const gridRows = 2;
  const gridStartY = Math.round(H * (isLandscape ? 0.32 : isPortrait ? 0.38 : 0.38));
  const gridEndY = Math.round(H * (isLandscape ? 0.85 : 0.78));
  const gridUsableH = gridEndY - gridStartY;
  const labelSpace = Math.round(H * 0.04);
  const rowGap = Math.round(H * 0.01);
  const swatchH = Math.round((gridUsableH - labelSpace * gridRows - rowGap * (gridRows - 1)) / gridRows);
  const gridMarginX = Math.round(W * 0.07);
  const colGap = Math.round(W * 0.025);
  const gridUsableW = W - gridMarginX * 2;
  const swatchW = Math.round((gridUsableW - colGap * (gridCols - 1)) / gridCols);
  const labelFS = Math.round(W * (isLandscape ? 0.022 : 0.027));

  const swatchSvgs = [];
  const labelSvgs = [];
  HDFI_PALETTE.forEach((sw, i) => {
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    const x = gridMarginX + col * (swatchW + colGap);
    const y = gridStartY + row * (swatchH + labelSpace + rowGap);
    swatchSvgs.push(renderSwatch(x, y, swatchW, swatchH, sw));
    const cx = x + swatchW / 2;
    const cy = y + swatchH + labelFS + 4;
    labelSvgs.push(
      `<text x="${cx}" y="${cy}" font-family="Manrope, 'Helvetica Neue', sans-serif" font-weight="500" font-size="${labelFS}" fill="#FFFFFF" text-anchor="middle">${escapeXml(sw.label)}</text>`
    );
  });

  let bodyEl = "";
  if (body) {
    const bFS = Math.round(W * 0.024);
    const bY = Math.round(H * (isLandscape ? 0.92 : 0.86));
    bodyEl = `<text x="${W / 2}" y="${bY}" font-family="Manrope, 'Helvetica Neue', sans-serif" font-weight="400" font-style="italic" font-size="${bFS}" fill="#FFFFFF" fill-opacity="0.85" text-anchor="middle">${escapeXml(body)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><style>${fontFaces}</style></defs>${heroText}${accent}${swatchSvgs.join("")}${labelSvgs.join("")}${bodyEl}</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { slug: "facebook", aspect: "1:1" },
  { slug: "instagram", aspect: "3:4" },
  { slug: "linkedin", aspect: "16:9" },
];

for (const { slug, aspect } of PLATFORMS) {
  console.log(`\n[${slug}] aspect=${aspect}`);
  try {
    console.log("  AI rendrer backdrop…");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: `${backdropPrompt}\n\nMANDATORY OUTPUT FORMAT: ${aspect} aspect ratio.` }] }],
      config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect } },
    });

    let b64 = null;
    for (const cand of response.candidates ?? []) {
      for (const part of cand.content?.parts ?? []) {
        if (part.inlineData?.data) { b64 = part.inlineData.data; break; }
      }
      if (b64) break;
    }
    if (!b64) { console.log("  ❌ Ingen AI-output"); continue; }

    const aiBuf = Buffer.from(b64, "base64");
    writeFileSync(`${process.env.HOME}/Desktop/altb-${slug}-1-backdrop.png`, aiBuf);

    const meta = await sharp(aiBuf).metadata();
    const W = meta.width;
    const H = meta.height;
    console.log(`  AI-backdrop: ${W}×${H}`);

    console.log("  Server-side render swatches + tekst…");
    const svg = buildOverlay(W, H, "Seks farger. Én standard.", "Seks", "Rød. Svart. Hvit. Blå. Gul. Lyse grå.");
    const composed = await sharp(aiBuf).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();

    const outPath = `${process.env.HOME}/Desktop/altb-${slug}-2-final.png`;
    writeFileSync(outPath, composed);
    console.log(`  ✓ ${outPath}`);
  } catch (err) {
    console.log(`  ❌ Feil: ${err.message}`);
  }
}

console.log("\nFerdig. Sjekk Desktop for altb-{platform}-{1-backdrop|2-final}.png");
