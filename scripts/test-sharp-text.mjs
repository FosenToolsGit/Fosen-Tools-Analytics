/**
 * Test om sharp + SVG-overlay kan rendre norske bokstaver korrekt
 * med embedded Manrope-font.
 */

import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";

const fontPath = "public/social/fonts/manrope-latin-800-normal.woff2";
const fontBuf = readFileSync(fontPath);
const fontBase64 = fontBuf.toString("base64");

// Lag en rød test-bilde 1024×1024
const baseImg = await sharp({
  create: {
    width: 1024,
    height: 1024,
    channels: 3,
    background: { r: 237, g: 28, b: 36 }, // FT-red
  },
}).png().toBuffer();

// SVG-overlay med norske bokstaver
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <defs>
    <style>
      @font-face {
        font-family: 'Manrope';
        font-weight: 800;
        src: url(data:font/woff2;base64,${fontBase64}) format('woff2');
      }
      .hero { font-family: 'Manrope', sans-serif; font-weight: 800; fill: white; }
      .red-word { fill: #0F1115; }
    </style>
  </defs>
  <text x="50" y="200" font-size="90" class="hero">SEKS FARGER.</text>
  <text x="50" y="320" font-size="90" class="hero">ÉN STANDARD.</text>
  <text x="50" y="500" font-size="36" class="hero">Rød/Hvit · Svart/Hvit</text>
  <text x="50" y="560" font-size="36" class="hero">Hvit/Svart · Blå/Hvit</text>
  <text x="50" y="620" font-size="36" class="hero">Gul/Svart · Lyse grå/Svart</text>
  <text x="50" y="800" font-size="28" class="hero" font-style="italic">CAD-tegnet og CNC-maskinert.</text>
</svg>`;

const output = await sharp(baseImg)
  .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
  .png()
  .toBuffer();

writeFileSync(`${process.env.HOME}/Desktop/sharp-text-test.png`, output);
console.log(`✓ Lagret: ~/Desktop/sharp-text-test.png (${(output.length / 1024).toFixed(0)} kB)`);
console.log("Sjekk at norske bokstaver (æ ø å) rendres korrekt + Manrope-fonten");
