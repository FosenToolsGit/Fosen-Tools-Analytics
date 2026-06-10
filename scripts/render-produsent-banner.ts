/**
 * render-produsent-banner.ts — 10000×2500 banner for produsent-sider
 * (matcher ft-hero-scaled SlideshowTop på fosen-tools.no).
 *
 * Bruk:
 *   npm run produsent-banner -- \
 *     --brand "Picard" \
 *     --tagline "Tyske presisjonshammere" \
 *     --year 1857 \
 *     --logo "https://.../picard.png" \
 *     --hero "https://www.picard-hammer.de/.../csm_01-PICARD_....jpg" \
 *     --out out/banners/picard-banner.jpg
 */

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
function arg(name: string, def?: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  return args[i + 1] ?? def;
}

const brand = arg("brand");
const tagline = arg("tagline");
const yearStr = arg("year");
const logo = arg("logo");
const hero = arg("hero");
const outRaw = arg("out");

if (!brand || !tagline || !yearStr || !outRaw) {
  console.error("❌ påkrevd: --brand, --tagline, --year, --out");
  process.exit(1);
}
const outPath: string = outRaw;

async function main() {
  console.log(`\n🖼️  Rendrer produsent-banner for ${brand}`);
  console.log(`   Tagline: ${tagline}`);
  console.log(`   Est. ${yearStr}`);
  console.log(`   Logo: ${logo ?? "(ingen — bruker brand-tekst)"}`);
  console.log(`   Hero: ${hero ?? "(ingen — bare gradient)"}`);

  const t0 = performance.now();
  console.log("  ▸ Bundling Remotion...");
  const bundleLocation = await bundle({
    entryPoint: resolve("remotion/index.ts"),
    webpackOverride: (config) => config,
  });

  const inputProps = {
    brandName: brand!,
    tagline: tagline!,
    estYear: parseInt(yearStr!, 10),
    logoUrl: logo,
    heroImageUrl: hero,
  };

  console.log("  ▸ Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "FTProdusentBanner",
    inputProps,
  });

  const fullOutPath = resolve(outPath);
  mkdirSync(dirname(fullOutPath), { recursive: true });

  console.log(`  ▸ Rendering ${composition.width}×${composition.height} JPG...`);
  await renderStill({
    composition,
    serveUrl: bundleLocation,
    output: fullOutPath,
    inputProps,
    imageFormat: "jpeg",
    jpegQuality: 90,
  });

  const sec = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ Ferdig på ${sec}s`);
  console.log(`   ${fullOutPath}`);
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
