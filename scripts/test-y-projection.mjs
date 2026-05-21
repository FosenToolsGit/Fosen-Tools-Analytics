/**
 * Y-projeksjon for å finne swatch-radene direkte fra bilde-data.
 *
 * Algoritme:
 *   1. For hver Y-rad, beregn average luminance over hele bildet
 *   2. Plot Y-projeksjon — bg-rader har lav lum, swatch-rader har høy
 *   3. Threshold (lum > THRESH) → markér rad som "swatch"
 *   4. Find connected stretches av swatch-rader → de er swatch-rad-Y-områdene
 *   5. Bruk dem som "true Y-bounds" for hver rad
 *
 * Output: { rad1Top, rad1Bottom, rad2Top, rad2Bottom }
 */

import sharp from "sharp";
import { writeFileSync } from "fs";

const imagePath = `${process.env.HOME}/Desktop/pixel-instagram-1-ai.png`;
const buf = await sharp(imagePath).toBuffer();
const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

console.log(`Canvas: ${W}×${H}`);

// Y-projeksjon: per Y, count "non-bg" pixels (pixels som ikke er FT-ink-mørke).
// Rad med swatches har mange ikke-bg-pixels (selv om en swatch er svart,
// har den lys rim + andre swatches kan være lyse). Rad uten swatches har 0-få.
//
// Threshold: brighter than bg ELLER skifte i farge fra omkringliggende pixels.
// Vi bruker chroma-detect: pixel er "ikke bg" hvis lum>60 ELLER farge har høyt saturation.
const yProj = new Array(H).fill(0);
for (let y = 0; y < H; y++) {
  let nonBg = 0;
  for (let x = 0; x < W; x++) {
    const idx = (y * W + x) * C;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const chroma = max - min; // saturation-proxy
    // Pixel er non-bg hvis lys ELLER har farge ELLER er svart med tydelig kant
    if (lum > 50 || chroma > 25) nonBg++;
  }
  yProj[y] = nonBg;
}

// Find min og max for diagnostikk
const minLum = Math.min(...yProj);
const maxLum = Math.max(...yProj);
console.log(`Y-projeksjon: min=${minLum.toFixed(1)}, max=${maxLum.toFixed(1)}`);

// Threshold: 8% av W = signifikant "swatch-stuff" på raden
const THRESH = Math.max(W * 0.08, (minLum + maxLum) * 0.15);
console.log(`Threshold: ${THRESH.toFixed(1)}`);

// Find connected stretches over threshold
const stretches = [];
let inStretch = false;
let startY = 0;
for (let y = 0; y < H; y++) {
  const aboveThresh = yProj[y] > THRESH;
  if (aboveThresh && !inStretch) {
    startY = y;
    inStretch = true;
  } else if (!aboveThresh && inStretch) {
    stretches.push({ top: startY, bottom: y - 1, height: y - 1 - startY });
    inStretch = false;
  }
}
if (inStretch) stretches.push({ top: startY, bottom: H - 1, height: H - 1 - startY });

// Filtrer ut små stretches (<5% canvas-høyde)
const minStretchH = Math.round(H * 0.05);
const swatchRows = stretches.filter(s => s.height >= minStretchH);

console.log(`\nFunnet ${swatchRows.length} swatch-rader (>5% canvas-h):`);
swatchRows.forEach((s, i) => console.log(`  Rad ${i+1}: y=${s.top}..${s.bottom}, h=${s.height}`));

// Draw debug overlay
const debugSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  ${swatchRows.map((s, i) => `<rect x="0" y="${s.top}" width="${W}" height="${s.height}" fill="none" stroke="${i === 0 ? '#0f0' : '#ff0'}" stroke-width="3"/>`).join("")}
  ${swatchRows.map((s, i) => `<text x="20" y="${s.top + 40}" fill="${i === 0 ? '#0f0' : '#ff0'}" font-size="32" font-weight="800">RAD ${i+1}: y=${s.top}-${s.bottom}</text>`).join("")}
</svg>`;
const debug = await sharp(buf).composite([{ input: Buffer.from(debugSvg), top: 0, left: 0 }]).png().toBuffer();
writeFileSync(`${process.env.HOME}/Desktop/y-projection-debug.png`, debug);
console.log("\nDebug-overlay lagret til ~/Desktop/y-projection-debug.png");
