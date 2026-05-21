/**
 * Test produkt-tilbud-render — alle 3 layouts, alle aspecter.
 * Kjør: npx tsx scripts/test-offer-render.ts
 */

import { writeFileSync } from "fs";
import {
  renderOfferPng,
  closeOfferBrowser,
  type OfferProduct,
} from "../src/lib/services/produkt-tilbud-render";

const HOME = process.env.HOME;

// Realistiske FT-dummy-produkter (priser fra Sommersalg-preset-konteksten)
const FACOM_VOGN: OfferProduct = {
  name: "Facom verktøyvogn JET+ 8 skuffer",
  manufacturer: "Facom",
  priceNow: 16990,
  priceBefore: 28990,
};
const GRID_PRODUCTS: OfferProduct[] = [
  { name: "Facom verktøykoffert 105 deler", manufacturer: "Facom", priceNow: 3490, priceBefore: 4990 },
  { name: "Milwaukee M18 slagskrutrekker", manufacturer: "Milwaukee", priceNow: 2790, priceBefore: 3690 },
  { name: "Knipex Cobra vannpumpetang", manufacturer: "Knipex", priceNow: 690, priceBefore: 890 },
  { name: "Wera Kraftform skrutrekkersett 12 deler", manufacturer: "Wera", priceNow: 1290, priceBefore: 1790 },
  { name: "Bahco skiftnøkkel 250 mm", manufacturer: "Bahco", priceNow: 420, priceBefore: 590 },
  { name: "Hultafors brekkjern 600 mm", manufacturer: "Hultafors", priceNow: 540, priceBefore: 720 },
];
const WERA_PRODUCTS: OfferProduct[] = [
  { name: "Wera Kraftform Kompakt 20 bits", manufacturer: "Wera", priceNow: 890, priceBefore: 1190 },
  { name: "Wera 950 sekskant-sett", manufacturer: "Wera", priceNow: 640, priceBefore: 820 },
  { name: "Wera Joker skrallenøkkel-sett", manufacturer: "Wera", priceNow: 1490, priceBefore: 1990 },
  { name: "Wera Tool-Check Plus", manufacturer: "Wera", priceNow: 790, priceBefore: 990 },
  { name: "Wera 2go verktøyveske", manufacturer: "Wera", priceNow: 590 },
  { name: "Wera Kraftform Micro ESD", manufacturer: "Wera", priceNow: 540, priceBefore: 690 },
];

const ASPECTS = [
  { slug: "fb", w: 1080, h: 1080 },
  { slug: "ig", w: 1080, h: 1350 },
  { slug: "li", w: 1200, h: 675 },
];

const CASES = [
  {
    name: "single",
    input: (w: number, h: number) => ({
      layout: "single" as const,
      products: [FACOM_VOGN],
      eyebrow: "Ukens tilbud",
      headline: "Spar 12 000",
      cta: "fosen-tools.no",
      background: "ink" as const,
      width: w,
      height: h,
    }),
  },
  {
    name: "grid",
    input: (w: number, h: number) => ({
      layout: "grid" as const,
      products: GRID_PRODUCTS,
      eyebrow: "Kampanje",
      headline: "Ukens beste tilbud",
      cta: "fosen-tools.no",
      background: "ink" as const,
      width: w,
      height: h,
    }),
  },
  {
    name: "manufacturer",
    input: (w: number, h: number) => ({
      layout: "manufacturer" as const,
      products: WERA_PRODUCTS,
      manufacturer: "Wera",
      headline: "Mest kjøpt fra Wera",
      cta: "fosen-tools.no/wera",
      background: "red" as const,
      width: w,
      height: h,
    }),
  },
];

async function main() {
  for (const c of CASES) {
    for (const a of ASPECTS) {
      const png = await renderOfferPng(c.input(a.w, a.h));
      const out = `${HOME}/Desktop/offer-${c.name}-${a.slug}.png`;
      writeFileSync(out, Buffer.from(png.base64, "base64"));
      console.log(`✓ ${out} (${a.w}×${a.h})`);
    }
  }
  await closeOfferBrowser();
  console.log("Ferdig.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
