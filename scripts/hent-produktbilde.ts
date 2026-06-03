/**
 * hent-produktbilde.ts — scrape én fosen-tools-URL og returner produktbilde-URL.
 *
 * Bruk:
 *   npm run produktbilde -- --url https://fosen-tools.no/wera/05022053001
 *
 * Output: skriver produktbilde-URL til stdout. Kan brukes inline:
 *   IMG=$(npm run produktbilde -- --url "...")
 */

import { scrapeProductByUrl } from "../src/lib/services/scrape-product";

const args = process.argv.slice(2);
function arg(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  return args[i + 1];
}

const url = arg("url");
if (!url) {
  console.error("❌ Mangler --url");
  process.exit(1);
}

(async () => {
  try {
    console.log(`🔍 Scraper: ${url}`);
    const product = await scrapeProductByUrl(url);

    if (!product) {
      console.error("❌ Kunne ikke parse produktdata (JSON-LD mangler).");
      process.exit(1);
    }

    console.log(`\n  Navn:        ${product.name}`);
    console.log(`  Produsent:   ${product.manufacturer ?? "(ingen)"}`);
    console.log(`  Pris:        ${product.price_now ?? "-"} NOK`);
    console.log(`  Bilde-URL:   ${product.image_url ?? "(ingen)"}`);
    console.log(`  Lager:       ${product.in_stock === true ? "JA" : product.in_stock === false ? "NEI" : "?"}`);

    if (!product.image_url) {
      console.error("\n⚠️  Bilde-URL mangler i JSON-LD.");
      process.exit(2);
    }

    console.log(`\n✅ Bilde funnet. Bruk denne URL-en som productImageUrl i JSON-data:\n`);
    console.log(`   "${product.image_url}"`);
  } catch (err) {
    console.error("❌", err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();
