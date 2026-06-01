/**
 * Tirsdag 2. juni 2026 — utgave 1 av 4 mot jubileet.
 * Tema: «Hold av datoen — møt 3 av leverandørene»
 * Leverandører som full-bredde kort: Milwaukee, Wera, Zweibrüder
 * (Soudal/Halder/Picard kommer i utgave 2 — tirsdag 9. juni)
 *
 *   node --env-file=.env.local scripts/seed-nyhetsbrev-2026-06-02.mjs
 *
 * Bruker templateVariant=jubileum-leverandor → renderSupplierRows i
 * mailchimp-builder.ts. Logoene ligger på Supabase Storage public bucket.
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

const UTM = "utm_source=mailchimp&utm_medium=email&utm_campaign=jubileum-2026-06-02-leverandorer";

// Leverandør-kort (full-bredde rader under hverandre)
const editSuppliers = [
  {
    name: "Milwaukee",
    tagline: "Batteriverktøy · M18 og M12-økosystemet",
    logoUrl: `${LOGO_BASE}/milwaukee.png`,
    ctaText: "Se sortimentet →",
    ctaUrl: `https://fosen-tools.no/milwaukee?${UTM}&utm_content=leverandor-milwaukee`,
    description:
      "Møt Milwaukee-teamet direkte i butikken. De viser frem de nyeste " +
      "maskinene i M18- og M12-økosystemet og svarer på spørsmål.",
    logoWidth: 160,
  },
  {
    name: "Wera",
    tagline: "Tysk presisjon · Skrutrekkere og bits",
    logoUrl: `${LOGO_BASE}/wera.png`,
    ctaText: "Se sortimentet →",
    ctaUrl: `https://fosen-tools.no/wera?${UTM}&utm_content=leverandor-wera`,
    description:
      "Wera er kjent for å re-tenke hvordan et håndverktøy skal kjennes i hånda. " +
      "Test Kraftform-grepet selv og kom hjem med en god deal.",
    logoWidth: 150,
  },
  {
    name: "Zweibrüder",
    tagline: "Tyske LED-lykter og lyktesystemer",
    logoUrl: `${LOGO_BASE}/zweibruder.png`,
    ctaText: "Se sortimentet →",
    // URL er https://fosen-tools.no/zweibrüder — ü blir encoded til %C3%BC i URL
    ctaUrl: `https://fosen-tools.no/zweibr%C3%BCder?${UTM}&utm_content=leverandor-zweibruder`,
    description:
      "Zweibrüder lager tyske LED-lykter og lyktesystemer bygd for industri, redning og hverdagsbruk. " +
      "Møt teamet og test de nyeste hode- og hånd-lyktene direkte i butikken.",
    logoWidth: 150,
  },
];

const editContent = {
  themeSlug: "jubileum-2026-06-02-leverandorer",
  topBadge: "🎉 25 ÅR + NY PROFF-BUTIKK",
  subjectLine: "🔧 Hold av 26. juni: Milwaukee, Wera og Zweibrüder på besøk",
  previewText:
    "Vi feirer 25 år og åpner ny PROFF-butikk på Brekstad. Tre av de seks " +
    "leverandørene presenterer vi nå — resten kommer i neste utgave.",
  headingMain: "Hold av 26. juni",
  headingSub: "25-årsjubileum · Ny PROFF-butikk · 6 leverandører på besøk",
  ingress:
    "26. juni feirer Fosen Tools 25 år, og åpner samtidig dørene til ny " +
    "PROFF-butikk på Brekstad. Seks av våre viktigste leverandører kommer på " +
    "besøk for å vise frem produktene sine og svare på spørsmål direkte. " +
    "I dag presenterer vi de tre første.\n\n" +
    "PS! Dagstilbudene gjelder KUN i butikken denne ene dagen, de legges ikke " +
    "ut på nett. Sett av fredagen og ta turen til Brekstad.",
  midtTitle: "PROGRAM 26. JUNI · 10:00 — 16:00",
  midtBody:
    "10:00 — Dørene åpner og messen starter\n" +
    "11:00 — 13:00 — Enkel servering\n" +
    "13:00 — PROFF-presentasjon\n\n" +
    "Også på plass: Soudal, Halder og Picard. Vi presenterer dem nærmere " +
    "i neste utgave. Pluss spesielle gjester: Red Bull og Tesla Mobile Service.\n\n" +
    "🎯 Eksklusive dagstilbud KUN i butikken, disse ligger ikke ute på nett. " +
    "Vil du ha de beste prisene, må du møte opp på Brekstad fredag 26. juni " +
    "mellom 10:00 og 16:00.\n\n" +
    "Konkurranser · Faglig påfyll · Goodiebag (begrenset)",
  midtCtaText: "Les mer",
  midtCtaUrl: `https://fosen-tools.no/?${UTM}&utm_content=midt-cta`,
  preferredManufacturers: ["Milwaukee", "Wera", "Zweibrüder"],
  productKeywords: ["jubileum", "tilbud"],
};

const wizardState = {
  themeInput: "Jubileum-utgave 1: Møt 3 av leverandørene",
  focus: "annet",
  discountPct: "",
  extraContext:
    "Utgave 1 av 4 mot 25-årsjubileet 26. juni 2026. Fremmer 3 av 6 " +
    "leverandører som kommer på besøk: Milwaukee, Wera, Zweibrüder. " +
    "Resten (Soudal, Halder, Picard) presenteres i utgave 2 tirsdag 9. juni. " +
    "Spesielle gjester denne dagen: Red Bull, Tesla Mobile Service.",
  productCount: 0,
  onlyInStock: true,
  manualProductUrls: "",
  variant: 0,
  preview: { content: editContent, products: [] },
  editContent,
  editProducts: [],
  editSuppliers,
  midtImageInput: "",
  midtImageUrl: "https://fosen-tools.no/userfiles/image/HDFI/HDFI-svart-bedre.jpg",
  footerImageInput: "",
  footerImageUrl: "",
  socialInstagram: `https://www.instagram.com/fosentools/?${UTM}&utm_content=footer-social`,
  socialLinkedin: `https://www.linkedin.com/company/fosen-tools-as?${UTM}&utm_content=footer-social`,
  templateVariant: "jubileum-leverandor",
  showFridayPost: false, // jubileum-utgave — ingen ekte ukentlig kundehistorie
  showMidtCta: false,    // midtseksjonen er program/info, ikke en ekstern destinasjon
};

const title = "JUBILEUM 1/4: Hold av 26. juni — Milwaukee, Wera, Zweibrüder";

console.log("📧 Setter inn (eller oppdaterer) utkast for tirsdag 2. juni 2026...");

// Slett evt. eksisterende utkast med samme tittel, så vi alltid starter rent
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

console.log("\n✅ Utkast opprettet!");
console.log("   ID:", data.id);
console.log("   Tittel:", data.title);
console.log("   Variant:", wizardState.templateVariant);
console.log("   Leverandører:", editSuppliers.map((s) => s.name).join(", "));
console.log("\n🛠  Rediger i UI (lokalt):");
console.log("   http://localhost:3001/innleggsbygger/nyhetsbrev-bygger");
console.log("\n   Eller på Vercel:");
console.log("   https://fosen-tools-analytics.vercel.app/innleggsbygger/nyhetsbrev-bygger");
console.log("\n📅 Anbefalt sendetid: tirsdag 2. juni 2026 kl 11:00");
