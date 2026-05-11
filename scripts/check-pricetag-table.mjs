// Seed en test-playlist med Husqvarna-produkter (forutsetter migrasjon 012 er kjørt)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Sjekk om pricetag_playlists eksisterer
const { error: checkErr } = await supa.from("pricetag_playlists").select("id").limit(1);
if (checkErr) {
  console.error("Tabell pricetag_playlists ikke kjørt ennå:", checkErr.message);
  console.error("Kjør migrasjon docs/migrations/012_pricetag_playlists.sql i Supabase SQL editor.");
  process.exit(1);
}
console.log("OK — pricetag_playlists eksisterer");
