/**
 * Test Alt A v2: Vision returnerer label_anchor (hvor AI har plass for tekst).
 * Composite-text plasserer labels på label_anchor-punkter — matcher AI's layout.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import { writeFileSync, readFileSync } from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// AI-prompt: swatches (kan inkludere label-plass naturlig)
// ─────────────────────────────────────────────────────────────────────────────
const swatchPrompt = `Product-variant SWATCH-GRID — visual elements only, NO TEXT.

CRITICAL: ZERO text in the image. No words, no letters, no labels, no headlines, no hex codes, no dimension annotations.

LAYOUT:
1. Full-bleed FT-ink #0F1115 background with subtle FT-red radial glow.
2. TOP THIRD: empty canvas (background + corner decoration only).
3. MIDDLE HALF: Render EXACTLY 6 HDFI swatches in a 2×3 grid (NOT 7, NOT 8).

   HDFI ANATOMY:
   - TOP LAYER: rounded rectangular plastic plate in PRIMARY color
   - ENGRAVED TOOL CUTOUT inside plate (wrench/screwdriver/pliers, vary)
   - ENGRAVING RIM: thin (2-4px) in SECONDARY color around cutout
   - INSIDE CUTOUT: BLACK FOAM (always black)

   COLOR ORDER (top-left → bottom-right):
   ROW 1: (1) RED+WHITE rim, (2) BLACK+WHITE rim, (3) WHITE+BLACK rim
   ROW 2: (4) NAVY BLUE+WHITE rim, (5) YELLOW+BLACK rim, (6) LIGHT GREY+BLACK rim

   IMPORTANT: Leave clear EMPTY SPACE (~10% canvas-height) BELOW each swatch row for server-side labels.

4. BOTTOM AREA: empty canvas.

MANDATORY blueprint decoration in corners (thin white lines).

ABSOLUTE TEXT FORBIDS: NO headline, NO labels, NO body, NO captions, NO hex codes, NO dimensions, NO wordmarks.

STRICTLY AVOID: AI humans, cartoon, photo-realistic stock.`;

// ─────────────────────────────────────────────────────────────────────────────
// Vision detect — returner swatch + label_anchor
// ─────────────────────────────────────────────────────────────────────────────
async function detectSwatchesV2(imageB64, imageMime, W, H) {
  const visionPrompt = `This image contains exactly 6 HDFI color sample swatches arranged in a grid. Each swatch is a rounded rectangular plastic plate with a tool-silhouette cutout, often with subtle frames or highlights at the edges.

For EACH swatch, return the FULL VISUAL BOUNDING BOX — include ALL of the following inside the box:
- The colored plate surface
- Any frame, highlight, shadow, or border around the plate
- Any small visual padding the swatch graphic occupies

In other words: the bounding box should cover the ENTIRE visual footprint of the swatch as the human eye perceives it (a card-shaped object). Be GENEROUS — include the visual padding/halo, not just the colored fill. If two swatches have empty space between them, that space is NOT part of either swatch box.

Then ALSO return label_anchor: the IDEAL CENTER-POINT (cx, cy) where a 1-3 word text label naturally belongs, OUTSIDE the swatch's full visual footprint (typically directly below it, in the empty area between this swatch and the next row).

Use normalized coordinates 0-1000. Return exactly 6 swatches in reading order (top-left → bottom-right).

Output (strict JSON, no markdown):
{
  "boxes": [
    {
      "x": 0, "y": 0, "w": 0, "h": 0,
      "label": "red plate",
      "label_anchor": {"cx": 0, "cy": 0, "position": "below"}
    },
    ...
  ]
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: [{
      role: "user",
      parts: [
        { text: visionPrompt },
        { inlineData: { data: imageB64, mimeType: imageMime } },
      ],
    }],
    config: { responseMimeType: "application/json", temperature: 0 },
  });

  const raw = response.text ?? "";
  const parsed = JSON.parse(raw);
  return (parsed.boxes ?? []).map((b) => ({
    x: Math.round((b.x / 1000) * W),
    y: Math.round((b.y / 1000) * H),
    w: Math.round((b.w / 1000) * W),
    h: Math.round((b.h / 1000) * H),
    label: b.label,
    label_anchor: b.label_anchor
      ? {
          cx: Math.round((b.label_anchor.cx / 1000) * W),
          cy: Math.round((b.label_anchor.cy / 1000) * H),
          position: b.label_anchor.position,
        }
      : null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Composite-text bruker label_anchor direkte
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
      const inner = parts.map((p) => p === redUp ? `<tspan fill="#ED1C24">${escapeXml(p)}</tspan>` : escapeXml(p)).join("");
      return `<tspan x="${heroX}" dy="${dy}">${inner}</tspan>`;
    }
    return `<tspan x="${heroX}" dy="${dy}">${escapeXml(line)}</tspan>`;
  }).join("");
  const heroText = `<text x="${heroX}" y="${heroStartY}" font-family="Manrope, sans-serif" font-weight="800" font-size="${heroFontSize}" fill="#FFFFFF" letter-spacing="2">${tspans}</text>`;
  const accentY = heroStartY + heroLH * lines.length - heroLH * 0.3;
  const accent = `<rect x="${heroX}" y="${accentY}" width="${Math.round(W * 0.08)}" height="3" fill="#ED1C24" />`;

  const labelFS = Math.round(W * (isLandscape ? 0.022 : 0.027));

  // Smart label-Y placement: senterer i gap mellom rader hvis trangt,
  // ellers standard padding under swatch.
  // Vision returnerer FULL visual bounds + label_anchor.
  // Hvis label_anchor er gitt og IKKE inni swatch-box, bruk den direkte.
  // Ellers fallback til "under swatch + 25% buffer".
  const swatchBoxes = boxes.slice(0, labels.length);
  const labelSvgs = swatchBoxes.map((box, i) => {
    const swatchBottom = box.y + box.h;
    let cx, cy;
    const anchor = box.label_anchor;
    const anchorInsideBox = anchor &&
      anchor.cx >= box.x && anchor.cx <= box.x + box.w &&
      anchor.cy >= box.y && anchor.cy <= box.y + box.h;
    if (anchor && !anchorInsideBox) {
      cx = anchor.cx;
      cy = anchor.cy;
    } else {
      // Fallback med 25% buffer
      cx = box.x + box.w / 2;
      const buffer = box.h * 0.15;
      const sameColumn = swatchBoxes.filter((b, j) =>
        j !== i &&
        Math.abs(b.x + b.w/2 - cx) < box.w * 0.4 &&
        b.y > swatchBottom
      );
      const nextRowTop = sameColumn.length > 0
        ? Math.min(...sameColumn.map(b => b.y))
        : H;
      const gap = nextRowTop - swatchBottom - buffer;
      const idealPadding = labelFS + 6;
      if (gap >= idealPadding + labelFS) {
        cy = swatchBottom + buffer + idealPadding;
      } else if (gap > labelFS * 1.2) {
        cy = swatchBottom + buffer + gap * 0.55;
      } else {
        cy = swatchBottom + buffer + labelFS + 2;
      }
    }
    return `<text x="${cx}" y="${cy}" font-family="Manrope, sans-serif" font-weight="500" font-size="${labelFS}" fill="#FFFFFF" text-anchor="middle">${escapeXml(labels[i] ?? "")}</text>`;
  }).join("");

  let bodyEl = "";
  if (body) {
    const bFS = Math.round(W * 0.024);
    const bY = Math.round(H * (isLandscape ? 0.92 : 0.86));
    bodyEl = `<text x="${W / 2}" y="${bY}" font-family="Manrope, sans-serif" font-weight="400" font-style="italic" font-size="${bFS}" fill="#FFFFFF" fill-opacity="0.85" text-anchor="middle">${escapeXml(body)}</text>`;
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
    console.log("  Steg 1: AI swatches…");
    const r1 = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: `${swatchPrompt}\n\nMANDATORY OUTPUT FORMAT: ${aspect} aspect ratio.` }] }],
      config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect } },
    });
    let b64 = null;
    for (const cand of r1.candidates ?? []) for (const part of cand.content?.parts ?? []) if (part.inlineData?.data) { b64 = part.inlineData.data; break; }
    if (!b64) { console.log("  ❌ Ingen AI-output"); continue; }
    const meta = await sharp(Buffer.from(b64, "base64")).metadata();
    const W = meta.width, H = meta.height;
    writeFileSync(`${process.env.HOME}/Desktop/altav2-${slug}-1-ai.png`, Buffer.from(b64, "base64"));

    console.log("  Steg 2: Vision detect (med label_anchor)…");
    const boxes = await detectSwatchesV2(b64, "image/png", W, H);
    boxes.forEach((b, i) => {
      const a = b.label_anchor ? `→ anchor(${b.label_anchor.cx},${b.label_anchor.cy}) ${b.label_anchor.position}` : "(no anchor)";
      console.log(`    [${i+1}] ${LABELS[i]}: box(${b.x},${b.y}) ${b.w}×${b.h} ${a}`);
    });
    if (boxes.length === 0) { console.log("  ⚠️ 0 swatches detected"); continue; }

    console.log("  Steg 3: Composite…");
    const svg = buildOverlay(W, H, "Seks farger. Én standard.", "Seks", "Rød. Svart. Hvit. Blå. Gul. Lyse grå.", LABELS, boxes);
    const composed = await sharp(Buffer.from(b64, "base64")).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
    writeFileSync(`${process.env.HOME}/Desktop/altav2-${slug}-2-final.png`, composed);
    console.log(`  ✓ ~/Desktop/altav2-${slug}-2-final.png`);
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
  }
}
console.log("\nFerdig.");
