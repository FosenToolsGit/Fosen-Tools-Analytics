/**
 * render-video.ts — CLI-render av Remotion-videoene.
 *
 *   npm run video:render              # rendrer alle 3 med sample-data
 *   npm run video:render -- produkt   # kun produkt-spotlight
 *   npm run video:render -- leveranse # kun leveranse-reel
 *   npm run video:render -- milepael  # kun milepael
 *
 * Dette er en offline-trygg variant: den bruker SAMPLE_*-dataene fra
 * remotion/types.ts. Web-UI-et (/innleggsbygger/maler → Video) bruker
 * API-ruten /api/innleggsbygger/video med ekte, brukerstyrt data.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderVideo } from "../src/lib/services/video-render";
import {
  SAMPLE_HDFI_BA,
  SAMPLE_KAMPANJE,
  SAMPLE_KUNDE_V2,
  SAMPLE_LEVERANSE,
  SAMPLE_MILEPAEL,
  SAMPLE_PRODUKT,
  SAMPLE_SITAT,
  SAMPLE_TEAM,
  type VideoType,
} from "../remotion/types";

const JOBS: Record<
  string,
  { type: VideoType; data: Record<string, unknown>; out: string }
> = {
  produkt: {
    type: "produkt-spotlight",
    data: { ...SAMPLE_PRODUKT },
    out: "produkt-spotlight.mp4",
  },
  leveranse: {
    type: "leveranse-reel",
    data: { ...SAMPLE_LEVERANSE },
    out: "leveranse-reel.mp4",
  },
  milepael: {
    type: "milepael",
    data: { ...SAMPLE_MILEPAEL },
    out: "milepael.mp4",
  },
  kampanje: {
    type: "kampanje-teaser",
    data: { ...SAMPLE_KAMPANJE },
    out: "kampanje-teaser.mp4",
  },
  sitat: {
    type: "sitat",
    data: { ...SAMPLE_SITAT },
    out: "sitat.mp4",
  },
  "kunde-v2": {
    type: "kunde-leveranse-v2",
    data: { ...SAMPLE_KUNDE_V2 },
    out: "kunde-leveranse-v2.mp4",
  },
  "hdfi-ba": {
    type: "hdfi-before-after",
    data: { ...SAMPLE_HDFI_BA },
    out: "hdfi-before-after.mp4",
  },
  "team": {
    type: "team-portrett",
    data: { ...SAMPLE_TEAM },
    out: "team-portrett.mp4",
  },
};

async function main(): Promise<void> {
  const arg = process.argv[2];
  const keys = arg && JOBS[arg] ? [arg] : Object.keys(JOBS);

  mkdirSync("out", { recursive: true });

  for (const key of keys) {
    const job = JOBS[key];
    console.log(`\n▸ Rendrer ${job.type} …`);
    const result = await renderVideo(job, (pct) => {
      process.stdout.write(`\r  ${Math.round(pct * 100)}%   `);
    });
    const outPath = path.join("out", job.out);
    writeFileSync(outPath, result.buffer);
    console.log(
      `✓ ${outPath}  (${result.width}×${result.height}, ` +
        `${(result.buffer.byteLength / 1024 / 1024).toFixed(1)} MB)`,
    );
  }
  console.log("\nFerdig.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
