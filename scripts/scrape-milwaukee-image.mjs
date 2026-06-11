import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const URL = process.argv[2] || "https://no.milwaukeetool.eu/no-no/-/m18-fhsagsv0125x-0x";
const OUT = process.argv[3] || "Milwaukee-Q2-bilder/scraped.png";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });

// Vent på lazy-loaded bilder
await page.waitForTimeout(2000);

// Finn alle product-image-URLer på siden
const images = await page.evaluate(() => {
  const imgs = Array.from(document.querySelectorAll("img"));
  return imgs
    .map((img) => ({
      src: img.src || img.dataset.src || img.dataset.lazySrc,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      alt: img.alt,
    }))
    .filter((i) => i.src && i.width > 300)
    .sort((a, b) => b.width * b.height - a.width * a.height);
});

console.log(`Fant ${images.length} bilder (>300px):`);
for (const img of images.slice(0, 5)) {
  console.log(`  ${img.width}×${img.height}: ${img.src.substring(0, 100)} (${img.alt})`);
}

if (images.length === 0) {
  await browser.close();
  process.exit(1);
}

// Last ned største bilde
const best = images[0];
const response = await page.goto(best.src);
const buf = await response.body();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buf);
console.log(`\n✅ Lagret: ${OUT} (${(buf.length / 1024).toFixed(0)} kB, ${best.width}×${best.height})`);

await browser.close();
