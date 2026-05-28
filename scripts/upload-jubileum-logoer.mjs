/**
 * Laster opp 8 leverandør-/gjest-logoer til Supabase Storage og oppdaterer
 * jubileum-playlist-en med logo_url per partner.
 *
 *   node --env-file=.env.local scripts/upload-jubileum-logoer.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PLAYLIST_ID = "be34f461-4847-4de5-aa2e-bb8beaa8645c";
const LOGO_DIR = "/Users/adrianhpettersen/Downloads/Jubilemumslogoer";
const BUCKET = "social_assets";
const STORAGE_PREFIX = "jubileum-2026/logoer";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Map partner-name (matcher seed-scriptet) → logo-filnavn
const PARTNER_LOGO_MAP = [
  { name: "Milwaukee", file: "Milwaukee_Logo.svg" },
  { name: "Wera", file: "Wera_Tools_logo.svg" },
  { name: "Soudal", file: "Soudal.svg" },
  { name: "Picard", file: "RGB_Picard_Logo_2024.svg" },
  { name: "Halder", file: "erwin-halder-kg-vector-logo.svg" },
  { name: "Zweibrüder\n(Ledlenser)", file: "Zweibrueder_Logo_K0.png" },
  { name: "Red Bull", file: "redbull-logo-svgrepo-com.svg" },
  { name: "Tesla\nMobile Service", file: "Tesla_Motors.svg" },
];

const mimeFor = (file) => {
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
};

console.log("📤 Laster opp logoer til Supabase Storage...\n");

const uploaded = [];
for (const { name, file } of PARTNER_LOGO_MAP) {
  const localPath = path.join(LOGO_DIR, file);
  const buffer = readFileSync(localPath);
  const storagePath = `${STORAGE_PREFIX}/${file}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeFor(file),
      upsert: true,
    });
  if (error) {
    console.error(`  ❌ ${name}: ${error.message}`);
    continue;
  }
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);
  console.log(`  ✅ ${name.replace(/\n/g, " ")} → ${publicUrl}`);
  uploaded.push({ name, logo_url: publicUrl });
}

// Oppdater playlist-en
console.log("\n🔄 Oppdaterer playlist med logo-URLer...");

const { data: playlist, error: fetchErr } = await supabase
  .from("pricetag_playlists")
  .select("settings")
  .eq("id", PLAYLIST_ID)
  .single();

if (fetchErr || !playlist) {
  console.error("Kunne ikke hente playlist:", fetchErr);
  process.exit(1);
}

const settings = playlist.settings;
const rundellSlide = settings.custom_slides.find(
  (s) => s.template === "partners_rundell",
);
if (!rundellSlide) {
  console.error("Fant ikke partners_rundell-slide i playlisten");
  process.exit(1);
}

// Match logo-url per partner (matcher på name)
rundellSlide.partners = rundellSlide.partners.map((p) => {
  const match = uploaded.find((u) => u.name === p.name);
  return match ? { ...p, logo_url: match.logo_url } : p;
});

const { error: updateErr } = await supabase
  .from("pricetag_playlists")
  .update({ settings, updated_at: new Date().toISOString() })
  .eq("id", PLAYLIST_ID);

if (updateErr) {
  console.error("Update feilet:", updateErr);
  process.exit(1);
}

console.log("\n✅ Playlist oppdatert!");
console.log(`   Lokal preview: http://localhost:3001/prisplakat/share/b1479239-47fd-4552-88ac-174fa366ddfe/play`);
