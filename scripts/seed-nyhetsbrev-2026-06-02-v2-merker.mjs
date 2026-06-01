/**
 * Tirsdag 2. juni 2026 — utgave 1, VERSJON 3 (kort + mekanikersett-midt)
 *
 * Erik-feedback (1. juni):
 * - Alt for mye tekst, kort ned betraktelig
 * - Ingen 26. juni-fokus i ordinære nyhetsbrev (jubileums-mailer sendes separat)
 * - Midt: mekanikersett-referansen (HDFI custom)
 * - Helt nederst: én linje om 25-årsjubileet + jubileumslogo
 *
 * Teknikk:
 * - Bruker jubileum-leverandor-malen for å få leverandør-kort-rendring,
 *   men setter hideJubileumBanner=true så banneret skjules
 * - Leverandører Milwaukee, Wera, Zweibrüder med MYE kortere tekst
 * - jubileumFooterText: 25-års-linje rendres rett over svart bunn-footer
 *
 *   node --env-file=.env.local scripts/seed-nyhetsbrev-2026-06-02-v2-merker.mjs
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_USER_ID = process.env.SEED_OWNER_USER_ID ?? "3adc8b7e-97ae-475d-9a23-c5b0041053af";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Mangler env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LOGO_BASE =
  "https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/social_assets/brand-assets/leverandor-logoer";

const UTM = "utm_source=mailchimp&utm_medium=email&utm_campaign=2026-06-02-tre-merker";

// Leverandør-kort — mye kortere tekst per Erik-feedback
const editSuppliers = [
  {
    name: "Milwaukee",
    tagline: "M18 og M12-økosystemet",
    logoUrl: `${LOGO_BASE}/milwaukee.png`,
    ctaText: "Se sortimentet →",
    ctaUrl: `https://fosen-tools.no/milwaukee?${UTM}&utm_content=milwaukee`,
    description: "Over 200 maskiner på samme batteri og lader.",
    logoWidth: 160,
  },
  {
    name: "Wera",
    tagline: "Tysk presisjon",
    logoUrl: `${LOGO_BASE}/wera.png`,
    ctaText: "Se sortimentet →",
    ctaUrl: `https://fosen-tools.no/wera?${UTM}&utm_content=wera`,
    description: "Skrutrekkere og bits fagfolk velger først.",
    logoWidth: 150,
  },
  {
    name: "Zweibrüder",
    tagline: "Tyske LED-lykter",
    logoUrl: `${LOGO_BASE}/zweibruder.png`,
    ctaText: "Se sortimentet →",
    ctaUrl: `https://fosen-tools.no/zweibr%C3%BCder?${UTM}&utm_content=zweibruder`,
    description: "Robuste lykter for industri og hverdag.",
    logoWidth: 150,
  },
];

const editContent = {
  themeSlug: "2026-06-02-tre-merker",
  topBadge: "🛠️ TRE MERKER I SORTIMENTET",
  subjectLine: "Milwaukee, Wera og Zweibrüder, tre merker vi fører",
  previewText:
    "Tre toppmerker i sortimentet vårt: Milwaukee for batteriverktøy, Wera for tysk presisjon, Zweibrüder for LED-lykter.",
  headingMain: "Tre merker vi fører",
  headingSub: "Milwaukee · Wera · Zweibrüder",
  ingress:
    "Hos Fosen Tools fører vi over 40 merker. Denne uken løfter vi frem " +
    "tre av dem som dekker tre helt ulike fagområder.",
  midtTitle: "MEKANIKERSETT I PELI 1610",
  midtBody:
    "Skreddersydd Snap-on mekanikersett i HDFI-tilpasset Peli 1610-koffert. " +
    "CAD-tegnet, CNC-maskinert i Brekstad, klart for bruk dagen det leveres.",
  midtCtaText: "Se referansen",
  midtCtaUrl: `https://fosen-tools.no/referanser/medium-kofferter-hdfi/mekanikersett?${UTM}&utm_content=midt-cta`,
  preferredManufacturers: ["Milwaukee", "Wera", "Zweibrüder"],
  productKeywords: ["sortiment"],
};

const wizardState = {
  themeInput: "Utgave 1 v3: Tre merker + mekanikersett-referanse",
  focus: "annet",
  discountPct: "",
  extraContext:
    "VERSJON 3 etter Erik-feedback (1. juni): MYE kortere tekst. INGEN " +
    "26. juni-fokus (egne jubileums-mailer kommer separat). Tre merker " +
    "(Milwaukee/Wera/Zweibrüder) i kort form. Midtseksjon: HDFI mekanikersett-" +
    "referanse. Én linje om 25-årsjubileet rett over footeren.",
  productCount: 0,
  onlyInStock: true,
  manualProductUrls: "",
  variant: 0,
  preview: { content: editContent, products: [] },
  editContent,
  editProducts: [],
  editSuppliers,
  midtImageInput: "",
  // Mekanikersett-bilde fra referanse-siden
  midtImageUrl: "https://fosen-tools.no/userfiles/image/Inspirasjon/Kasseløsninger/Medium kofferter HDFI/Snapon 1.jpeg",
  footerImageInput: "",
  footerImageUrl: "",
  socialInstagram: `https://www.instagram.com/fosentools/?${UTM}&utm_content=footer-social`,
  socialLinkedin: `https://www.linkedin.com/company/fosen-tools-as?${UTM}&utm_content=footer-social`,
  templateVariant: "jubileum-leverandor",
  showFridayPost: false,
  showMidtCta: true, // «Se referansen»-knapp under mekanikersettet
  hideJubileumBanner: true, // INGEN 26. juni-banner i denne utgaven
  jubileumFooterText: "Vi feirer 25 år fredag 26. juni 2026",
  scheduledSendDate: "2026-06-02",
};

const title = "UTGAVE 1 V3: Tre merker + mekanikersett-referanse";

console.log("📧 Setter inn V3-utkast for tirsdag 2. juni 2026...");

// Slett gamle V2-titler så vi ikke får duplikater
const obsoleteTitles = [
  "UTGAVE 1 V2: Tre merker i sortimentet (Milwaukee, Wera, Zweibrüder)",
];
for (const t of obsoleteTitles) {
  await sb.from("newsletter_wizard_drafts").delete().eq("title", t);
}

await sb.from("newsletter_wizard_drafts").delete().eq("title", title);

const { data, error } = await sb
  .from("newsletter_wizard_drafts")
  .insert({
    user_id: OWNER_USER_ID,
    title,
    wizard_state: wizardState,
    status: "draft",
  })
  .select()
  .single();

if (error) {
  console.error("❌ Insert feilet:", error);
  process.exit(1);
}

console.log("\n✅ V3-utkast opprettet!");
console.log("   ID:", data.id);
console.log("   Tittel:", data.title);
console.log("   Jubileumsbanner SKJULT, jubileumsfooter-linje SYNLIG.");
console.log("\n🛠  Åpne i UI:");
console.log("   https://fosen-tools-analytics.vercel.app/innleggsbygger/nyhetsbrev-oversikt");
