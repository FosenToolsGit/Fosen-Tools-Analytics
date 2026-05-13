#!/usr/bin/env node
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PROMPT_FT_DEFINISJON = `A typography-only poster on solid FT-red #ED1C24 background.
Aspect ratio 1:1.
Layout:
- Top center: small italic word "adjektiv" in Manrope 500, white
- Hero center: word "SKREDDERSYDD" in MASSIVE Manrope 800, pure white, tight tracking
- Below: two-line definition in Manrope 500 white: "CAD-tegnet, CNC-maskinert og segmentert etter brukerens arbeidsflyt."
- Bottom-left: small white text "FOSEN TOOLS"

STRICTLY NO photos, NO illustrations, NO product mockups, NO humans, NO decorative elements.
The text must be SPELLED EXACTLY as given. Editorial swiss-design feel.`;

console.log("=== Imagen 4.0 fast ===");
try {
  const img = await ai.models.generateImages({
    model: "imagen-4.0-fast-generate-001",
    prompt: PROMPT_FT_DEFINISJON,
    config: {
      numberOfImages: 1,
      aspectRatio: "1:1",
      outputMimeType: "image/png",
    },
  });
  for (const [i, g] of (img.generatedImages ?? []).entries()) {
    const bytes = g.image?.imageBytes;
    if (bytes) {
      const buf = Buffer.from(bytes, "base64");
      fs.writeFileSync(`/tmp/imagen-fast-${i + 1}.png`, buf);
      console.log(`✅ /tmp/imagen-fast-${i + 1}.png (${buf.length} bytes)`);
    }
  }
} catch (e) {
  console.log("❌", e.message?.slice(0, 300));
}

console.log("\n=== Imagen 4.0 generate (high quality) ===");
try {
  const img = await ai.models.generateImages({
    model: "imagen-4.0-generate-001",
    prompt: PROMPT_FT_DEFINISJON,
    config: {
      numberOfImages: 1,
      aspectRatio: "1:1",
      outputMimeType: "image/png",
    },
  });
  for (const [i, g] of (img.generatedImages ?? []).entries()) {
    const bytes = g.image?.imageBytes;
    if (bytes) {
      const buf = Buffer.from(bytes, "base64");
      fs.writeFileSync(`/tmp/imagen-hq-${i + 1}.png`, buf);
      console.log(`✅ /tmp/imagen-hq-${i + 1}.png (${buf.length} bytes)`);
    }
  }
} catch (e) {
  console.log("❌", e.message?.slice(0, 300));
}

console.log("\n=== Nano Banana (gemini-2.5-flash-image) ===");
try {
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: PROMPT_FT_DEFINISJON + "\n\nRender at 1024x1024.",
    config: { responseModalities: ["IMAGE"] },
  });
  let count = 0;
  for (const c of res.candidates ?? []) {
    for (const p of c.content?.parts ?? []) {
      if (p.inlineData?.data) {
        count++;
        const buf = Buffer.from(p.inlineData.data, "base64");
        fs.writeFileSync(`/tmp/nano-banana-${count}.png`, buf);
        console.log(`✅ /tmp/nano-banana-${count}.png (${buf.length} bytes)`);
      }
    }
  }
} catch (e) {
  console.log("❌", e.message?.slice(0, 300));
}
