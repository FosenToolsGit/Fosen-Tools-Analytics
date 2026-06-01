/**
 * Render trykkluft-kampanje-posten (40% KC Tools & Sumake t.o.m. 4. juli)
 * i alle tre format. Skriver til ~/Desktop/trykkluft-2026/.
 *
 * Kjør: npx tsx scripts/render-trykkluft-post.ts
 */

import { mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { renderInnlegg, type AspectKey } from "../src/lib/services/innlegg";
import { closeRenderBrowser } from "../src/lib/services/render-common";

const OUT = path.join(homedir(), "Desktop", "trykkluft-2026");

const FEATURE_DATA = {
  eyebrow: "TRYKKLUFT-KAMPANJE · T.O.M. 4. JULI",
  headline: "40 % AV ALT FRA KC TOOLS & SUMAKE",
  subhead: "Profesjonelle trykkluftverktøy til kampanjepris",
  bullets: [
    "Muttertrekkere · 1/4\" til 1\"",
    "Trykklufthammer & meisel",
    "Sliper, polering & bor",
    "Skraller og skrutrekkere",
    "Tilbehør & koblinger",
  ],
  cta: "Se utvalget",
};

const FORMATS: { aspect: AspectKey; label: string }[] = [
  { aspect: "fb", label: "Facebook 1:1" },
  { aspect: "ig", label: "Instagram 4:5" },
  { aspect: "li", label: "LinkedIn 16:9" },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`Rendrer til: ${OUT}\n`);
  for (const { aspect, label } of FORMATS) {
    const png = await renderInnlegg("feature", "A", aspect, FEATURE_DATA);
    const file = path.join(OUT, `trykkluft-40pct-${aspect}.png`);
    writeFileSync(file, Buffer.from(png.base64, "base64"));
    console.log(`✓ ${label}  (${png.width}×${png.height})  →  ${file}`);
  }
  await closeRenderBrowser();
  console.log(`\nFerdig. Åpne mappen: open "${OUT}"`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
