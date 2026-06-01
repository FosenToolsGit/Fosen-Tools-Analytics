/**
 * Konverterer SVG-leverandør-logoer fra `Logoer/Logoer Wheel/SVG/` til PNG
 * og laster opp til Supabase Storage `social_assets/brand-assets/leverandor-logoer/`.
 *
 * Bruk:
 *   node --env-file=.env.local scripts/upload-leverandor-logoer.mjs [slug1 slug2 ...]
 *
 * Uten argumenter: laster opp ALLE 52 logoer.
 * Med argumenter: bare de oppgitte (matcher filnavn uten .svg-extension).
 *
 * Resultat: hver logo blir tilgjengelig på
 *   https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/social_assets/brand-assets/leverandor-logoer/{slug}.png
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SVG_DIR = join(__dirname, "..", "Logoer", "Logoer Wheel", "SVG");
const BUCKET = "social_assets";
const STORAGE_PREFIX = "brand-assets/leverandor-logoer";
const PNG_SIZE = 400; // 400x400 — god kvalitet for nyhetsbrev (rendres typisk på 120-200px)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Mangler env: NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Filename → public slug (vi normaliserer "pera-wera" til "wera" siden filnavnet ser ut som typo)
const SLUG_OVERRIDES = {
  "pera-wera": "wera",
  "brockhaus-hauer": "brockhaus-heuer",
  "peli-case": "pelicase",
  "voelkel": "volkel",
  "guehring": "guhring",
};

const arg = process.argv.slice(2);
const allFiles = readdirSync(SVG_DIR).filter((f) => f.endsWith(".svg"));
const targets = arg.length > 0
  ? allFiles.filter((f) => arg.some((a) => f.toLowerCase().includes(a.toLowerCase().replace(".svg", ""))))
  : allFiles;

console.log(`📦 Behandler ${targets.length} logo${targets.length === 1 ? "" : "er"}...`);

const results = [];

for (const file of targets) {
  const baseName = file.replace(/\.svg$/i, "");
  const slug = SLUG_OVERRIDES[baseName] ?? baseName;
  const storagePath = `${STORAGE_PREFIX}/${slug}.png`;

  try {
    const svgBuffer = readFileSync(join(SVG_DIR, file));
    const pngBuffer = await sharp(svgBuffer, { density: 300 })
      .resize(PNG_SIZE, PNG_SIZE, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toBuffer();

    const { error } = await sb.storage
      .from(BUCKET)
      .upload(storagePath, pngBuffer, {
        contentType: "image/png",
        cacheControl: "31536000", // 1 år
        upsert: true,
      });

    if (error) {
      console.error(`  ❌ ${file} → ${slug}: ${error.message}`);
      continue;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
    console.log(`  ✅ ${file} → ${publicUrl}`);
    results.push({ slug, url: publicUrl });
  } catch (e) {
    console.error(`  ❌ ${file}:`, e.message);
  }
}

console.log(`\n📋 ${results.length} logo${results.length === 1 ? "" : "er"} lastet opp.`);
console.log("\nURL-mønster (lim inn der du trenger):");
results.forEach((r) => console.log(`  ${r.slug}: ${r.url}`));
