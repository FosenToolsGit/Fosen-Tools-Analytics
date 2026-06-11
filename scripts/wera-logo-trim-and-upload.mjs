/**
 * wera-logo-trim-and-upload.mjs
 *
 *   1. Les inn Wera-Logo-White.svg (ekte vektor fra Adrian)
 *   2. Trim viewBox til kun aktiv grafikk (fjerner negative space)
 *   3. Render til transparent PNG i høy oppløsning via sharp
 *   4. Last opp til Supabase (samme path som før — overskriver)
 *
 * Bruk:
 *   node --env-file=.env.local scripts/wera-logo-trim-and-upload.mjs
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "Wera-logo/Wera-Logo-White.svg");
const OUT_PNG = path.join(ROOT, "public/social/leverandor-logoer/wera-with-slogan-4c-white.png");

// ── les SVG, trim viewBox ───────────────────────────────────────────
// Original viewBox: "0 0 1080 1080"
// Aktiv grafikk-bbox (basert på clipPath-koordinatene i SVG):
//   x: 175 → 880 (grønt symbol slutter ved 874, tekst ca 875)
//   y: 370 → 803 (grønt symbol topp 374.98, slogan-tekst bunn ~803)
// Padding: 5 px på alle sider
const NEW_VIEWBOX = "170 365 720 445";

const svg = fs.readFileSync(SRC, "utf8");
const trimmedSvg = svg.replace(
  /viewBox="[^"]*"/,
  `viewBox="${NEW_VIEWBOX}"`,
);

// Render i 1200 bredde for høyoppløsning. Aspect følger viewBox (720:445).
const PNG_WIDTH = 1200;
const aspect = 445 / 720;
const PNG_HEIGHT = Math.round(PNG_WIDTH * aspect);

console.log(`🔄 Trimmer viewBox til "${NEW_VIEWBOX}"`);
console.log(`📐 Renderer til ${PNG_WIDTH}×${PNG_HEIGHT} transparent PNG`);

await sharp(Buffer.from(trimmedSvg))
  .resize(PNG_WIDTH, PNG_HEIGHT, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png({ compressionLevel: 9 })
  .toFile(OUT_PNG);

const stat = fs.statSync(OUT_PNG);
console.log(`✅ Lagret: ${OUT_PNG} (${(stat.size / 1024).toFixed(0)} kB)`);

// ── last opp til Supabase ───────────────────────────────────────────
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const buf = fs.readFileSync(OUT_PNG);
const target = "brand-assets/leverandor-logoer/wera-with-slogan.png";

console.log(`\n⬆️  social_assets/${target}`);
const { error } = await sb.storage.from("social_assets").upload(target, buf, {
  contentType: "image/png",
  upsert: true,
});

if (error) {
  console.error("❌", error);
  process.exit(1);
}

const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social_assets/${target}`;
console.log(`\n✅ Lastet opp.\n   ${url}`);
