/**
 * Seed-script: bygger en komplett butikk-slideshow for 25-årsjubileet
 * (26. juni 2026) og setter den inn i `pricetag_playlists`-tabellen.
 *
 *   node --env-file=.env.local scripts/seed-jubileum-playlist.mjs
 *
 * Etter kjøring:
 *  - Åpne /prisplakat → Mine prisplakater → "FT 25-årsjubileum"
 *  - Finpuss tekster i UI om ønskelig
 *  - Trykk "📺 Skjerm-URL" for å kopiere kiosk-URL til UniFi-skjermen
 *
 * Slideshow-strukturen (11 slides à 8 sek = ~88s loop):
 *  1.  Intro       — "25 ÅR · Vi åpner ombygget butikk"
 *  2.  Credentials — Dato + program i 3 trinn
 *  3.  Brand 1     — Milwaukee
 *  4.  Brand 2     — Wera
 *  5.  Brand 3     — Soudal
 *  6.  Brand 4     — Picard / Halder
 *  7.  Brand 5     — Zweibrüder
 *  8.  Brand 6     — Red Bull (spesiell gjest)
 *  9.  Brand 7     — Tesla mobile service (spesiell gjest)
 *  10. Credentials — Highlights (dagstilbud, konkurranser, goodiebag)
 *  11. Outro       — "Meld deg på i kassen" + adresse + kontakt
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Bytt ut med UID-en til den som skal eie playlisten (du selv eller en
// felles bruker — alle authenticated kan lese via team-RLS uansett).
const OWNER_USER_ID = process.env.SEED_OWNER_USER_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!OWNER_USER_ID) {
  console.error("Mangler SEED_OWNER_USER_ID (sett i .env.local eller eksporter)");
  console.error("Eksempel: SEED_OWNER_USER_ID=$(supabase auth-uid for-deg) node ...");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Felles styling for alle slides ──────────────────────────────────
const FT_RED = "#ED1C24";
const FT_INK = "#0F1115";
const FT_WHITE = "#FFFFFF";

const baseSlide = (id, template, order, overrides) => ({
  id,
  enabled: true,
  template,
  placement: "start",
  order,
  bg_color: FT_INK,
  text_color: FT_WHITE,
  accent_color: FT_RED,
  ...overrides,
});

const customSlides = [
  // Slide 1 — Intro
  baseSlide("intro", "intro", 0, {
    label: "Velkomst",
    bg_color: FT_RED,
    text_color: FT_WHITE,
    accent_color: FT_WHITE,
    top_logo: "ft-white",
    bottom_logo: "jub-25",
    eyebrow: "26. JUNI 2026",
    title: "25 ÅR\nVI ÅPNER\nOMBYGGET BUTIKK",
    subtitle: "Brekstad · Industrigata 1",
    divider: true,
    title_scale: 1.1,
  }),

  // Slide 2 — Program
  baseSlide("program", "credentials", 1, {
    label: "Program",
    bg_color: FT_INK,
    text_color: FT_WHITE,
    accent_color: FT_RED,
    eyebrow: "PROGRAM 26. JUNI",
    title: "DØRENE ÅPNER\nKL. 10:00",
    subtitle: "11:00 – 13:00  ·  Enkel servering\n13:00  ·  PROFF presentasjon",
    divider: true,
  }),

  // Slides 3-7 — Leverandører
  baseSlide("brand-milwaukee", "brand_spotlight", 2, {
    label: "Milwaukee",
    bg_color: "#D60E0F",
    text_color: FT_WHITE,
    accent_color: FT_WHITE,
    eyebrow: "PÅ PLASS",
    brand_name: "MILWAUKEE",
    subtitle: "M12 · M18 · MX FUEL — møt en av verdens største elektroverktøy-produsenter",
  }),
  baseSlide("brand-wera", "brand_spotlight", 3, {
    label: "Wera",
    bg_color: "#1B1E23",
    text_color: FT_WHITE,
    accent_color: "#00A04A",
    eyebrow: "PÅ PLASS",
    brand_name: "WERA",
    subtitle: "Tysk presisjon siden 1936 — Kraftform, Joker, Take-it-easy",
  }),
  baseSlide("brand-soudal", "brand_spotlight", 4, {
    label: "Soudal",
    bg_color: "#FFCB05",
    text_color: "#1B1E23",
    accent_color: "#1B1E23",
    eyebrow: "PÅ PLASS",
    brand_name: "SOUDAL",
    subtitle: "Verdens største uavhengige produsent av lim, fugemasse og PU-skum",
  }),
  baseSlide("brand-picard-halder", "brand_spotlight", 5, {
    label: "Picard / Halder",
    bg_color: "#0F1115",
    text_color: FT_WHITE,
    accent_color: FT_RED,
    eyebrow: "PÅ PLASS",
    brand_name: "PICARD\n&\nHALDER",
    subtitle: "Tyske premium-hammere og spesialverktøy",
  }),
  baseSlide("brand-zweibruder", "brand_spotlight", 6, {
    label: "Zweibrüder (Ledlenser)",
    bg_color: "#1B1E23",
    text_color: FT_WHITE,
    accent_color: "#F4D43A",
    eyebrow: "PÅ PLASS",
    brand_name: "ZWEIBRÜDER",
    subtitle: "Ledlenser-lykter — tysk LED-teknologi for profesjonelle",
  }),

  // Slides 8-9 — Spesielle gjester
  baseSlide("guest-redbull", "brand_spotlight", 7, {
    label: "Red Bull",
    bg_color: "#001489",
    text_color: FT_WHITE,
    accent_color: "#FFC72C",
    eyebrow: "SPESIELL GJEST",
    brand_name: "RED BULL",
    subtitle: "Innom for en boost? Red Bull er på plass hele dagen.",
  }),
  baseSlide("guest-tesla", "brand_spotlight", 8, {
    label: "Tesla Mobile Service",
    bg_color: "#0F1115",
    text_color: FT_WHITE,
    accent_color: "#E31937",
    eyebrow: "SPESIELL GJEST",
    brand_name: "TESLA\nMOBILE SERVICE",
    subtitle: "Mobil service-bil på plass — ta en titt på fremtidens elbil-vedlikehold",
  }),

  // Slide 10 — Highlights
  baseSlide("highlights", "credentials", 9, {
    label: "Highlights",
    bg_color: FT_INK,
    text_color: FT_WHITE,
    accent_color: FT_RED,
    eyebrow: "DET VENTER DEG",
    title: "EKSKLUSIVE\nDAGSTILBUD",
    subtitle: "Konkurranser · Faglig påfyll · Goodiebag til de første",
    divider: true,
  }),

  // Slide 11 — Outro / CTA
  baseSlide("outro", "outro", 10, {
    label: "Meld deg på",
    bg_color: FT_RED,
    text_color: FT_WHITE,
    accent_color: FT_WHITE,
    top_logo: "ft-white",
    bottom_logo: "jub-25",
    eyebrow: "VI SEES 26. JUNI",
    title: "MELD DEG PÅ\nVED KASSEN",
    subtitle: "Industrigata 1, 7130 Brekstad",
    phone: "+47 72 51 51 20",
    url: "fosen-tools.no",
    hours: "Man–fre 07:00–15:00",
    address: "Industrigata 1, Brekstad",
  }),
];

const playlist = {
  id: randomUUID(),
  user_id: OWNER_USER_ID,
  title: "FT 25-årsjubileum — Butikk-skjerm",
  format: "slideshow_landscape", // 16:9 for UniFi-skjerm under Packout-displayet
  products: [], // Ingen produkt-slides — alt er custom slides
  settings: {
    seconds_per_slide: 8,
    transition: "fade",
    accent_color: FT_RED,
    show_clock: false,
    show_stock_status: false,
    show_product_qr: false,
    custom_slides: customSlides,
  },
  share_token: randomUUID(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

console.log("🎬 Setter inn jubileum-playlist...");
console.log("  Tittel:", playlist.title);
console.log("  Format:", playlist.format);
console.log("  Antall slides:", customSlides.length);

const { data, error } = await supabase
  .from("pricetag_playlists")
  .insert(playlist)
  .select()
  .single();

if (error) {
  console.error("❌ Insert feilet:", error);
  process.exit(1);
}

console.log("\n✅ Playlist opprettet!");
console.log("   ID:", data.id);
console.log("   Share-token:", data.share_token);
console.log("\n📺 Kiosk-URL for UniFi-skjermen:");
console.log(
  `   https://fosen-tools-analytics.vercel.app/prisplakat/share/${data.share_token}/play`,
);
console.log("\n🛠  Rediger i UI:");
console.log(
  `   https://fosen-tools-analytics.vercel.app/prisplakat (se 'Mine prisplakater')`,
);
