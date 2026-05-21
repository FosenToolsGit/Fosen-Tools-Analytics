/**
 * Test produkt_variant-archetype-prompt (HDFI farger).
 * Genererer 3 bilder (FB 1:1, IG 3:4, LI 16:9) til Desktop.
 */

import { GoogleGenAI } from "@google/genai";
import { writeFileSync } from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const heroTextShort = "SEKS FARGER. ÉN STANDARD.";
const redWord = "SEKS";
const body = "Rød. Svart. Hvit. Blå. Gul. Lyse grå.";

const FT_BG_INK = `Full-bleed FT-ink #0F1115 background with a subtle FT-red #ED1C24 radial glow from one corner (15-20% opacity max), fading to near-black.`;
const DECOR_DARK = `MANDATORY blueprint decoration (thin white lines, 1-1.5px, 50-60% opacity): CAD-dimension line top-right, small grid bottom-left, gear/circle bottom-right, connector top-left.`;

const WORDMARK_SPACE = `WORDMARK SPACE — ABSOLUTE REQUIREMENT: the bottom 15-20% of the canvas MUST be ENTIRELY EMPTY (or contain only the thin corner blueprint decoration). This area is reserved for post-processing.

DO NOT render — under any circumstances — ANY of the following in the bottom area or anywhere else in the image:
- "FOSEN TOOLS" text
- "Fosen Tools" text
- Any signature, logo, brand mark, wordmark
- The literal text "wordmark", "composite", "logo", or any meta-label
- Any framed text capsule or pill-shape with text inside
- ANY duplicate brand mark

The bottom strip must be VISUALLY BLANK — only the canvas background color with possibly the blueprint corner decoration. ANY text or logo rendered there is a generation failure.`;

const TYPO_DARK = `TYPOGRAPHY: Korolev/Heebo/Manrope ExtraBold condensed sans-serif, ALL UPPERCASE, letter-spacing 0.08em, pure white #FFFFFF.
ACCENT-LINE: a thin solid FT-red #ED1C24 rectangle (~1/10 canvas width, 2-3px thick), centered, 16-24px below headline. PURELY VISUAL — NO "70px" or dimension text on or near the line.`;

const NEGATIVES = `STRICTLY AVOID: AI humans, cartoon, photo-realistic stock, hex codes on swatches, dimension text annotations, fake wordmarks, lens flares.`;

const SPELLING = `NORWEGIAN SPELLING IS CRITICAL: render every Norwegian word EXACTLY (æ ø å intact).`;

const redWordInstruction = `RED EMPHASIS: the COMPLETE word "${redWord}" (all ${redWord.length} letters) inside the headline MUST be FT-red #ED1C24. ENTIRE word red, NOT a fragment. All other headline words remain white.`;

const prompt = `Product-variant grid poster — FT-style.

LAYOUT (top to bottom):
1. ${FT_BG_INK}
2. TOP THIRD: Headline rendered EXACTLY as: "${heroTextShort}"
   - MASSIVE bold sans-serif (Manrope Black, white), fills 70-80% canvas width
   - Break across 2-3 lines on natural phrase boundaries
   ${redWordInstruction}
3. MIDDLE HALF (40-50% canvas height): Product-variant grid showing 6 HDFI plate samples.
   - Render EXACTLY 6 swatches in a 2×3 grid. Count: ONE, TWO, THREE, FOUR, FIVE, SIX. No duplicates.
   - Each swatch has a SMALL white text label centered below it with æ ø å intact: "Rød/Hvit", "Svart/Hvit", "Hvit/Svart", "Blå/Hvit", "Gul/Svart", "Lyse grå/Svart".

   CRITICAL — CORRECT HDFI ANATOMY (do NOT render as flat painted rectangles):
   HDFI is a LAYERED product. Each swatch visualizes 3 layers:
   - TOP LAYER: a rounded rectangular plastic plate in the PRIMARY color (first color in label, e.g. RED for "Rød/Hvit"). Dominant surface.
   - ENGRAVED TOOL CUTOUT: inside the plate, a tool-silhouette CUTOUT shape (wrench, screwdriver, or pliers — vary). This is a milled-out depression, NOT a tool drawn on top.
   - ENGRAVING RIM: around the edge of the cutout, a thin VISIBLE rim (2-4px) in the SECONDARY color (second color, e.g. WHITE for "Rød/Hvit"). This is the lower plastic layer exposed by CNC engraving — like a relief border.
   - INSIDE THE CUTOUT (recessed area where the tool would rest): BLACK FOAM. ALWAYS black, regardless of plate color. This is the bottom foam layer visible because the plate is cut through.

   COLOR DECONSTRUCTION:
   - "Rød/Hvit" = RED plate, WHITE rim around cutout, BLACK foam inside cutout
   - "Svart/Hvit" = BLACK plate, WHITE rim, BLACK foam inside (rim visible but rest of swatch reads black)
   - "Hvit/Svart" = WHITE plate, BLACK rim, BLACK foam
   - "Blå/Hvit" = BLUE plate (deep navy #1B4C85), WHITE rim, BLACK foam
   - "Gul/Svart" = YELLOW plate, BLACK rim, BLACK foam
   - "Lyse grå/Svart" = LIGHT GREY plate, BLACK rim, BLACK foam

   The correct visual reads as: dominant plate color → engraved cutout shape → thin contrast rim → black recessed area. Like a relief stamp die, not a printed graphic.

   NO hex codes (e.g. "B184C85"), NO color values, NO dimension text written ON the swatches.

4. BOTTOM AREA above wordmark space: white italic Manrope Regular at 70% opacity: "${body}"

${SPELLING}

${DECOR_DARK}

${WORDMARK_SPACE}

${TYPO_DARK}

${NEGATIVES}`;

const PLATFORMS = [
  { slug: "facebook", aspect: "1:1" },
  { slug: "instagram", aspect: "3:4" },
  { slug: "linkedin", aspect: "16:9" },
];

console.log("Tester produkt_variant-prompt (HDFI anatomi-fix)…\n");

for (const { slug, aspect } of PLATFORMS) {
  console.log(`[${slug}] aspect=${aspect}…`);
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: `${prompt}\n\nMANDATORY OUTPUT FORMAT: ${aspect} aspect ratio.` }] }],
      config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect } },
    });

    let b64 = null;
    for (const cand of response.candidates ?? []) {
      for (const part of cand.content?.parts ?? []) {
        if (part.inlineData?.data) { b64 = part.inlineData.data; break; }
      }
      if (b64) break;
    }
    if (!b64) { console.log(`  ❌ Ingen bilde returnert`); continue; }

    const buf = Buffer.from(b64, "base64");
    const outPath = `${process.env.HOME}/Desktop/hdfi-anatomi-${slug}-${aspect.replace(":", "x")}.png`;
    writeFileSync(outPath, buf);
    console.log(`  ✓ ${outPath} (${(buf.length / 1024).toFixed(0)} kB)`);
  } catch (err) {
    console.log(`  ❌ Feil: ${err.message}`);
  }
}

console.log("\nFerdig.");
