#!/usr/bin/env node
/**
 * Pre-renderer FT-logoer og brand-paletten som PNG.
 * Disse brukes som INPUT-bilder til Nano Banana for brand-consistency.
 * Lagres i public/social/brand-assets/.
 */
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";

const OUT = "public/social/brand-assets";
fs.mkdirSync(OUT, { recursive: true });

function svgToPng(svgPath, outName, width = 1024) {
  const svg = fs.readFileSync(svgPath, "utf-8");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background: "rgba(0,0,0,0)",
  });
  const pngBuf = resvg.render().asPng();
  const outPath = path.join(OUT, outName);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`✅ ${outPath} (${pngBuf.length} bytes, ${width}px)`);
}

// FT wordmark (hvit på transparent — bruk på rød/mørk bakgrunn)
svgToPng("public/brosjyre/Fosen-Tools_white.svg", "ft-wordmark-white.png", 2048);

// FT wordmark — gjør en rød versjon ved å bytte fill
const whiteWordmark = fs.readFileSync(
  "public/brosjyre/Fosen-Tools_white.svg",
  "utf-8"
);
const redWordmark = whiteWordmark.replace(/fill="#fff"/g, 'fill="#ED1C24"');
fs.writeFileSync("/tmp/ft-wordmark-red.svg", redWordmark);
svgToPng("/tmp/ft-wordmark-red.svg", "ft-wordmark-red.png", 2048);

const inkWordmark = whiteWordmark.replace(/fill="#fff"/g, 'fill="#0F1115"');
fs.writeFileSync("/tmp/ft-wordmark-ink.svg", inkWordmark);
svgToPng("/tmp/ft-wordmark-ink.svg", "ft-wordmark-ink.png", 2048);

// Jubileumslogoer (gull-gradient — for milepael-archetype)
svgToPng("public/brosjyre/Jubileumslogo-25aar.svg", "jubileum-25aar.png", 1024);
svgToPng(
  "public/brosjyre/Jubileumslogo-100aar.svg",
  "jubileum-100aar.png",
  1024
);

// Brand-palett som ett bilde (referanse til Nano Banana om FT-fargevalg)
const paletteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400">
  <rect x="0" y="0" width="400" height="400" fill="#ED1C24"/>
  <rect x="400" y="0" width="400" height="400" fill="#0F1115"/>
  <rect x="800" y="0" width="400" height="400" fill="#FFFFFF"/>
  <text x="200" y="350" fill="#FFFFFF" font-family="sans-serif" font-size="36" text-anchor="middle">FT-rød #ED1C24</text>
  <text x="600" y="350" fill="#FFFFFF" font-family="sans-serif" font-size="36" text-anchor="middle">FT-ink #0F1115</text>
  <text x="1000" y="350" fill="#0F1115" font-family="sans-serif" font-size="36" text-anchor="middle">FT-hvit #FFFFFF</text>
</svg>`;
fs.writeFileSync("/tmp/ft-palette.svg", paletteSvg);
svgToPng("/tmp/ft-palette.svg", "ft-palette.png", 1200);

console.log("\nDone. Brand-assets klar for Nano Banana som input-referanser.");
