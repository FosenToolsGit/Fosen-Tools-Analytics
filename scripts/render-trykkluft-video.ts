/**
 * Render trykkluft-kampanje-video (40% KC Tools & Sumake t.o.m. 4. juli)
 * som Remotion KampanjeTeaser i alle tre format.
 *
 * Kjør: npx tsx scripts/render-trykkluft-video.ts
 */

import { mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { renderVideo } from "../src/lib/services/video-render";
import type { VideoFormat } from "../remotion/types";

const OUT = path.join(homedir(), "Desktop", "trykkluft-2026");

// EKTE PRODUKT-DATA scrapet fra fosen-tools.no (mest populære trykkluft-
// produkter siste 90d basert på GA4 page views — KC Tools + Sumake)
const DATA = {
  eyebrow: "TRYKKLUFT-KAMPANJE · KC TOOLS & SUMAKE",
  headline: "40 % AV TRYKKLUFTVERKTØY",
  subhead: "T.o.m. 4. juli · så langt lageret rekker",
  products: [
    {
      name: "Lakksprøyte HVLP 1,3mm",
      manufacturer: "Sumake",
      imageUrl:
        "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/41301/image/a2468ece-82e3-4d61-8cfc-7a5cd35152bb/ss1303whg.w320.jpg",
      priceBefore: 2248,
      priceNow: 1349,
      discountPct: 40,
    },
    {
      name: "Nålebanker 19 nål 410mm",
      manufacturer: "KC Tools",
      imageUrl:
        "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/40624/image/53baacd6-f5d6-480b-8493-9e01836f27ce/60810_kc_tools_n_lebanker_rett_19_n_l_410mm_1.jpg",
      priceBefore: 2760,
      priceNow: 1656,
      discountPct: 40,
    },
    {
      name: "Lakksprøyte HVLP 1,6mm",
      manufacturer: "Sumake",
      imageUrl:
        "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/41302/image/436fe983-cb5a-4495-a608-15bdde8618df/ss1303whg16.jpg",
      priceBefore: 2248,
      priceNow: 1349,
      discountPct: 40,
    },
    {
      name: "Blåsepistol 250mm blå",
      manufacturer: "Sumake",
      imageUrl:
        "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/56866/image/ee1b7178-2512-4da5-8f63-0cf6e48ea735/10466_sumake_bl_sepistol_250mm_bl__1(1).w480.jpg",
      priceBefore: 96,
      priceNow: 58,
      discountPct: 40,
    },
  ],
  ctaUrl: "fosen-tools.no/produkter/trykkluftverktøy",
};

const FORMATS: { format: VideoFormat; label: string; suffix: string }[] = [
  { format: "reel", label: "Reel 9:16 (Stories/Reels)", suffix: "reel" },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`Rendrer videoer til: ${OUT}\n`);
  console.log("Første render trekker ned Chromium (~95 MB, én gang).\n");

  for (const { format, label, suffix } of FORMATS) {
    const t0 = Date.now();
    console.log(`⏳ Rendrer ${label}…`);
    const result = await renderVideo({
      type: "kampanje-teaser",
      data: { ...DATA, format },
    });
    const file = path.join(OUT, `trykkluft-40pct-video-${suffix}.mp4`);
    writeFileSync(file, result.buffer);
    const seconds = ((Date.now() - t0) / 1000).toFixed(1);
    const durSec = result.durationInFrames / result.fps;
    console.log(
      `✓ ${label}  (${result.width}×${result.height}, ${durSec.toFixed(1)}s @ ${result.fps}fps)  →  ${file}  [render: ${seconds}s]`,
    );
  }

  console.log(`\nFerdig. Åpne mappen: open "${OUT}"`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
