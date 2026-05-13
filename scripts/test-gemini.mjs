#!/usr/bin/env node
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Test 1: Tekst-gen (cheap, sanity-check)
console.log("=== gemini-2.5-flash (tekst) ===");
try {
  const txt = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: "Si 'hallo Fosen Tools' på norsk, kun denne setningen.",
  });
  console.log("✅", txt.text?.slice(0, 80));
} catch (e) {
  console.log("❌", e.message?.slice(0, 200));
}

// Test 2: Nano Banana (Gemini 2.5 Flash Image)
console.log("\n=== gemini-2.5-flash-image (Nano Banana) ===");
try {
  const res = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents:
      "A typography-only poster on solid FT-red #ED1C24 background. Center: word 'SKREDDERSYDD' in massive Manrope 800, pure white, tight tracking. Italic 'adjektiv' label above. 2-line definition below: 'CAD-tegnet, CNC-maskinert og segmentert etter brukerens arbeidsflyt.' Small FT-logo wordmark bottom-left. Editorial swiss-design. NO photos, NO illustrations, NO product mockups, NO humans. Aspect 1:1.",
    config: {
      responseModalities: ["IMAGE"],
    },
  });
  let count = 0;
  for (const c of res.candidates ?? []) {
    for (const p of c.content?.parts ?? []) {
      if (p.inlineData?.data) {
        count++;
        const buf = Buffer.from(p.inlineData.data, "base64");
        fs.writeFileSync(`/tmp/nano-banana-test-${count}.png`, buf);
        console.log(`✅ Bilde ${count}: ${buf.length} bytes → /tmp/nano-banana-test-${count}.png`);
      }
    }
  }
  if (count === 0) console.log("❌ Ingen bilder returnert");
} catch (e) {
  console.log("❌", e.message?.slice(0, 300));
}

// Test 3: Imagen 4.0 fast (om paid plan er aktiv)
console.log("\n=== imagen-4.0-fast-generate-001 ===");
try {
  const img = await ai.models.generateImages({
    model: "imagen-4.0-fast-generate-001",
    prompt: "Typography poster: 'TEST' centered, white on red #ED1C24.",
    config: { numberOfImages: 1, aspectRatio: "1:1" },
  });
  console.log(`✅ ${img.generatedImages?.length ?? 0} bilde(r)`);
} catch (e) {
  console.log("❌", e.message?.slice(0, 300));
}
