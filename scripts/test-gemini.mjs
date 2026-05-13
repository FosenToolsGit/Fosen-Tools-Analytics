#!/usr/bin/env node
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODELS = [
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-image-preview",
  "gemini-2.0-flash-exp-image-generation",
  "imagen-4.0-fast-generate-001",
];

for (const model of MODELS) {
  console.log(`\n=== ${model} ===`);
  try {
    // Try generateContent first (Gemini 2.x supports inline image output)
    const res = await ai.models.generateContent({
      model,
      contents:
        "Generate a minimalist red poster with the word 'TEST' in large white sans-serif typography, centered, on solid red background #ED1C24. No other elements.",
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });
    const candidates = res.candidates ?? [];
    let imgCount = 0;
    for (const c of candidates) {
      for (const part of c.content?.parts ?? []) {
        if (part.inlineData?.data) imgCount++;
        if (part.text) console.log("  TEXT:", part.text.slice(0, 80));
      }
    }
    console.log(`  ✅ generateContent returnerte ${imgCount} bilde(r)`);
  } catch (e) {
    const msg = e.message?.slice(0, 200) ?? String(e);
    console.log(`  ❌ generateContent: ${msg}`);
  }

  // Try generateImages for imagen models
  if (model.startsWith("imagen-")) {
    try {
      const img = await ai.models.generateImages({
        model,
        prompt:
          "Minimalist red poster with TEST in white typography on red background.",
        config: { numberOfImages: 1, aspectRatio: "1:1" },
      });
      console.log(`  ✅ generateImages returnerte ${img.generatedImages?.length ?? 0} bilde(r)`);
    } catch (e) {
      const msg = e.message?.slice(0, 200) ?? String(e);
      console.log(`  ❌ generateImages: ${msg}`);
    }
  }
}
