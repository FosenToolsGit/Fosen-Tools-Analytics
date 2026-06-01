/**
 * Ad-hoc CLI som rendrer en HDFI-fokusert produkt-spotlight-video.
 * Brukes for å lage dagens innlegg (28. mai 2026) — kjøres lokalt og
 * legger MP4-en i `out/`.
 *
 *   npx tsx scripts/render-hdfi.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderVideo } from "../src/lib/services/video-render";
import type { HdfiHeroProps } from "../remotion/types";

const HDFI: HdfiHeroProps = {
  format: "reel",
  eyebrow: "EGEN PRODUKSJON",
  title: "HDFI",
  tagline: "Verktøykontroll med gravert silhuett",
  bullets: [
    "Designet i CADLABen vår",
    "CNC-maskinert",
    "Forebygger FOD",
    "Identisk gravering på verktøy og HDFI",
  ],
  ctaUrl: "fosen-tools.no/hdfi",
};

const outDir = path.resolve(process.cwd(), "out");
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "hdfi-hero-2026-05-28.mp4");

console.log("🎬 Rendrer HDFI-hero-video (3-lags + CNC-kutt, reel 1080×1920)...");
const start = Date.now();

renderVideo({
  type: "hdfi-hero",
  data: HDFI as unknown as Record<string, unknown>,
})
  .then((r) => {
    writeFileSync(outPath, r.buffer);
    const sec = ((Date.now() - start) / 1000).toFixed(1);
    const durSec = (r.durationInFrames / r.fps).toFixed(1);
    console.log(`✅ Ferdig på ${sec}s`);
    console.log(`   ${r.width}×${r.height}, ${durSec}s @ ${r.fps}fps`);
    console.log(`   → ${outPath}`);
  })
  .catch((err) => {
    console.error("❌ Render-feil:", err.message);
    process.exit(1);
  });
