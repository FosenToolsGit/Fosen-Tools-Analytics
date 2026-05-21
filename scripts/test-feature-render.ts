/**
 * Test feature/tjeneste-mal-render — alle aspecter.
 * Kjør: npx tsx scripts/test-feature-render.ts
 */

import { writeFileSync } from "fs";
import {
  renderFeaturePng,
  closeFeatureBrowser,
} from "../src/lib/services/feature-render";

const HOME = process.env.HOME;

const ASPECTS = [
  { slug: "fb", w: 1080, h: 1080 },
  { slug: "ig", w: 1080, h: 1350 },
  { slug: "li", w: 1200, h: 675 },
];

// HDFI-tjeneste-post (data fra fosen-tools.no/hdfi)
const HDFI_INPUT = {
  eyebrow: "Skreddersydd",
  headline: "HDFI — verktøykontroll med gravert silhuett",
  redWord: "HDFI",
  intro:
    "Skreddersydde skuminnlegg for effektiv organisering og visuell kontroll av verktøy.",
  benefits: [
    "CAD-tegnet i CADLAB, CNC-maskinert i Brekstad",
    "Null-absorberende skum + to-farget plastplate",
    "FOD-sikring satt i system for luftfart og forsvar",
    "Norsk produksjon på 100 % fornybar energi",
  ],
  cta: "fosen-tools.no/hdfi",
  background: "ink" as const,
};

async function main() {
  for (const a of ASPECTS) {
    const png = await renderFeaturePng({ ...HDFI_INPUT, width: a.w, height: a.h });
    const out = `${HOME}/Desktop/feature-hdfi-${a.slug}.png`;
    writeFileSync(out, Buffer.from(png.base64, "base64"));
    console.log(`✓ ${out} (${a.w}×${a.h})`);
  }
  // Variant: rød bakgrunn
  const red = await renderFeaturePng({
    ...HDFI_INPUT,
    background: "red",
    width: 1080,
    height: 1080,
  });
  writeFileSync(`${HOME}/Desktop/feature-hdfi-red.png`, Buffer.from(red.base64, "base64"));
  console.log(`✓ ${HOME}/Desktop/feature-hdfi-red.png (rød bakgrunn)`);

  await closeFeatureBrowser();
  console.log("Ferdig.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
