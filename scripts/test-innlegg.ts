/**
 * Render alle 108 innleggsmal-layouts (12 arketyper × A/B/C × fb/ig/li).
 * Skriver til /tmp/innlegg-test/. Kjør: npx tsx scripts/test-innlegg.ts [mal]
 */

import { mkdirSync, writeFileSync } from "fs";
import {
  renderInnlegg,
  INNLEGG_MALER,
  type InnleggVariant,
  type AspectKey,
} from "../src/lib/services/innlegg";
import { closeRenderBrowser } from "../src/lib/services/render-common";

const OUT = "/tmp/innlegg-test";
const VARIANTS: InnleggVariant[] = ["A", "B", "C"];
const ASPECTS: AspectKey[] = ["fb", "ig", "li"];
const onlyMal = process.argv[2];

async function main() {
  mkdirSync(OUT, { recursive: true });
  let ok = 0;
  let fail = 0;
  const maler = onlyMal
    ? INNLEGG_MALER.filter((m) => m === onlyMal)
    : INNLEGG_MALER;

  for (const mal of maler) {
    for (const v of VARIANTS) {
      for (const a of ASPECTS) {
        try {
          const png = await renderInnlegg(mal, v, a, {});
          writeFileSync(
            `${OUT}/${mal}-${v}-${a}.png`,
            Buffer.from(png.base64, "base64")
          );
          ok++;
          console.log(`✓ ${mal}-${v}-${a} (${png.width}×${png.height})`);
        } catch (e) {
          fail++;
          console.error(`✗ ${mal}-${v}-${a}: ${(e as Error).message}`);
        }
      }
    }
  }
  await closeRenderBrowser();
  console.log(`\nFerdig — ${ok} OK, ${fail} feilet. Mappe: ${OUT}`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
