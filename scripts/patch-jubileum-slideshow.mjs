/**
 * Patch jubileum-slideshow per tilbakemelding fra butikk-test:
 *   - Datoen "26. juni" må stå tydeligere fram → flyttes til hovedtittel
 *     på intro + outro, og dukker opp som eyebrow på partner-slide.
 *   - "Våre partnere & spesielle gjester" → "Disse møter du hos oss".
 *
 *   node --env-file=.env.local scripts/patch-jubileum-slideshow.mjs
 */

import { createClient } from "@supabase/supabase-js";

const PLAYLIST_ID = "be34f461-4847-4de5-aa2e-bb8beaa8645c";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: row, error: fetchErr } = await sb
  .from("pricetag_playlists")
  .select("settings")
  .eq("id", PLAYLIST_ID)
  .single();

if (fetchErr) {
  console.error("❌ Hent:", fetchErr);
  process.exit(1);
}

const settings = row.settings;
const slides = settings.custom_slides ?? [];

const patched = slides.map((s) => {
  if (s.id === "intro") {
    return {
      ...s,
      eyebrow: "25-ÅRSJUBILEUM · BUTIKKÅPNING",
      title: "26. JUNI\n2026",
      subtitle: "Vi feirer 25 år & åpner ombygget butikk · Brekstad",
    };
  }
  if (s.id === "program") {
    return {
      ...s,
      eyebrow: "26. JUNI · PROGRAM",
      // Tittel uendret: "ÅPENT FRA\n10:00 — 15:00"
    };
  }
  if (s.id === "partners-rundell") {
    return {
      ...s,
      eyebrow: "26. JUNI · BREKSTAD",
      title: "DISSE MØTER\nDU HOS OSS",
      subtitle: "Møt ekspertene · få faglig påfyll · still spørsmål",
    };
  }
  if (s.id === "highlights") {
    return {
      ...s,
      eyebrow: "26. JUNI · DET VENTER DEG",
    };
  }
  if (s.id === "outro") {
    return {
      ...s,
      eyebrow: "VELKOMMEN INN",
      title: "26. JUNI\n2026",
      subtitle: "Industrigata 1, Brekstad · 10:00 — 15:00",
    };
  }
  return s;
});

const newSettings = { ...settings, custom_slides: patched };

const { error: upErr } = await sb
  .from("pricetag_playlists")
  .update({ settings: newSettings })
  .eq("id", PLAYLIST_ID);

if (upErr) {
  console.error("❌ Update:", upErr);
  process.exit(1);
}

console.log("✅ Jubileum-slideshow oppdatert.");
console.log("   - Intro tittel: '26. JUNI 2026'");
console.log("   - Partner-slide tittel: 'DISSE MØTER DU HOS OSS'");
console.log("   - Outro tittel: '26. JUNI 2026'");
console.log("   - Dato i eyebrow på program + highlights også\n");
console.log("Skjermen reload-er av seg selv hvert 5. min, eller refresh manuelt.");
