/**
 * Genererer HDFI-fargevariant bilde via Gemini Nano Banana 2.
 * Lagrer til ~/Desktop/hdfi-farger-2026-05-21.png for direkte opplasting.
 */

import { GoogleGenAI } from "@google/genai";
import { writeFileSync } from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const prompt = `
Square 1024x1024 product photograph in Fosen Tools brand style.

Subject: A flat-lay arrangement of 6 HDFI (High Density Foam Insert) tool tray samples,
arranged in 2 rows of 3, on a dark matte workshop surface. Each tray is a rectangular
foam insert with a two-tone laser-engraved top plate showing a stylized engraved
silhouette of a hand tool (wrench, screwdriver, pliers).

The 6 color combinations, clearly visible top-plate + engraved bottom layer:
1. Red top / White engraving (Fosen Tools red #B21F24)
2. Black top / White engraving
3. White top / Black engraving
4. Blue top / White engraving (deep navy #1B4C85)
5. Yellow top / Black engraving (industrial yellow #F2E546)
6. Light grey top / Black engraving

Style: Editorial product photography, clean, top-down view (slight 3/4 perspective).
Sharp focus, professional studio lighting from upper-left, soft shadows.
Background: matte dark workshop floor, subtle texture.

NO PEOPLE. NO HANDS. NO CARTOON. NO TEXT OR LOGOS visible.
Premium industrial, Swiss-design aesthetic. Fosen Tools brand: precise, calm, professional.
`.trim();

console.log("Genererer HDFI farge-bilde…");

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash-image",
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  config: {
    imageConfig: { aspectRatio: "1:1" },
  },
});

// Hent ut base64-bildet
let imageBase64 = null;
for (const cand of response.candidates ?? []) {
  for (const part of cand.content?.parts ?? []) {
    if (part.inlineData?.data) {
      imageBase64 = part.inlineData.data;
      break;
    }
  }
  if (imageBase64) break;
}

if (!imageBase64) {
  console.error("Ingen bilde returnert. Respons:", JSON.stringify(response, null, 2).slice(0, 500));
  process.exit(1);
}

const buf = Buffer.from(imageBase64, "base64");
const outPath = `${process.env.HOME}/Desktop/hdfi-farger-2026-05-21.png`;
writeFileSync(outPath, buf);

console.log(`\n✅ Bilde lagret: ${outPath}`);
console.log(`   Størrelse: ${(buf.length / 1024).toFixed(0)} kB`);

// Open in Preview
import { exec } from "child_process";
exec(`open "${outPath}"`);
console.log(`   Åpnet i Preview automatisk.`);
