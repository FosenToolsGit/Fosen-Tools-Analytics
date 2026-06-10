/**
 * render-thumbnail.ts — rendrer en FT-thumbnail (statisk cover-image)
 * for en gitt reel-video.
 *
 * Brukes som cover-bilde i Instagram + Facebook (vises før video spilles).
 * Designet via FTThumbnail-komposisjon — IKKE en screenshot fra videoen.
 *
 * Bruk:
 *   npm run thumbnail -- --data scripts/data/referanse-helikopter-kit-2026-06-09.json --out out/dagens/2026-06-09/ft-referanse/thumbnail.jpg
 *
 * Eller med inline-args:
 *   npm run thumbnail -- --image https://... --eyebrow "Skreddersydd HDFI" --headline "Helikopter-kit" --tags "HDFI,PELI 0450,CADLAB" --out path/thumbnail.jpg
 */

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const args = process.argv.slice(2);
function arg(name: string, def?: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  return args[i + 1] ?? def;
}

const dataPath = arg("data");
const outPathRaw = arg("out");
if (!outPathRaw) {
  console.error("❌ --out <path> påkrevd");
  process.exit(1);
}
const outPath: string = outPathRaw;

// Les data fra JSON-fil hvis gitt, ellers fra CLI-args
type ThumbnailProps = {
  format: "reel" | "square" | "wide";
  imageUrl: string;
  eyebrow: string;
  headline: string;
  tags: string[];
  showJubileum?: boolean;
};

let props: ThumbnailProps;
if (dataPath) {
  if (!existsSync(dataPath)) {
    console.error(`❌ Data-fil finnes ikke: ${dataPath}`);
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(dataPath, "utf8"));
  props = {
    format: (raw.format ?? "reel") as ThumbnailProps["format"],
    imageUrl: raw.imageUrl ?? raw.imageUrls?.[0] ?? "",
    eyebrow: raw.eyebrow ?? "Skreddersydd HDFI",
    headline: raw.headline ?? "FT",
    tags: raw.tags ?? ["HDFI", "CADLAB"],
    showJubileum: raw.showJubileum ?? true,
  };
} else {
  props = {
    format: (arg("format", "reel") as ThumbnailProps["format"]) || "reel",
    imageUrl: arg("image") ?? "",
    eyebrow: arg("eyebrow") ?? "Skreddersydd HDFI",
    headline: arg("headline") ?? "FT",
    tags: (arg("tags") ?? "HDFI,CADLAB").split(",").map((s) => s.trim()),
    showJubileum: arg("showJubileum") !== "false",
  };
}

if (!props.imageUrl) {
  console.error("❌ imageUrl påkrevd (--image eller imageUrl/imageUrls i data)");
  process.exit(1);
}

async function main() {
  console.log(`\n🖼️  Rendrer thumbnail`);
  console.log(`  Format: ${props.format}`);
  console.log(`  Eyebrow: ${props.eyebrow}`);
  console.log(`  Headline: ${props.headline}`);
  console.log(`  Tags: ${props.tags.join(", ")}`);

  const t0 = performance.now();
  console.log("  ▸ Bundling Remotion...");
  const bundleLocation = await bundle({
    entryPoint: resolve("remotion/index.ts"),
    webpackOverride: (config) => config,
  });

  console.log("  ▸ Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "FTThumbnail",
    inputProps: props,
  });

  const fullOutPath = resolve(outPath);
  mkdirSync(dirname(fullOutPath), { recursive: true });

  console.log(`  ▸ Rendering ${composition.width}×${composition.height} JPG...`);
  await renderStill({
    composition,
    serveUrl: bundleLocation,
    output: fullOutPath,
    inputProps: props,
    imageFormat: "jpeg",
    jpegQuality: 92,
  });

  const sec = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅ Ferdig på ${sec}s`);
  console.log(`   ${fullOutPath}`);
  console.log(`\n   open "${fullOutPath}"`);
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
