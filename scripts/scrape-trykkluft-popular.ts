/**
 * Scrape de mest populære KC Tools + Sumake trykkluft-produktene
 * (basert på GA4 page views siste 90d) og rendre kampanje-video.
 */

import { scrapeProductByUrl } from "../src/lib/services/scrape-product";

const URLS = [
  "https://fosen-tools.no/sumake/f3823/lakksprøyte-hvlp-1-3mm-vann-olje-sumake",
  "https://fosen-tools.no/sumake/f3824/lakksprøyte-hvlp-1-6mm-vann-olje-sumake",
  "https://fosen-tools.no/sumake/f4123/blåsepistol-250-mm-blå-messinggjenger-sumake",
  "https://fosen-tools.no/kc-tools/f4015/nålebanker-rett-19-nål-410mm-4000rpm-2-6kg-kc-tools",
];

async function main() {
  console.log("Scraping…\n");
  const results = [];
  for (const url of URLS) {
    try {
      const p = await scrapeProductByUrl(url);
      const short = p.name.length > 50 ? p.name.slice(0, 47) + "…" : p.name;
      console.log(
        `✓ ${p.manufacturer ?? "?"} | ${short} | nå: ${p.price_now} | før: ${p.price_before} | lager: ${p.in_stock}`,
      );
      results.push({ url, ...p });
    } catch (e) {
      console.error(`✗ ${url}: ${(e as Error).message}`);
    }
  }
  console.log("\nFull data:");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
