/**
 * Lager en ferdig 25-årsjubileum-nyhetsbrev-mal som standard-utgangspunkt
 * for juni-utsendelsen. Lagres i `newsletter_wizard_drafts` med team-wide
 * tilgang (alle FT-brukere kan åpne og redigere via UI).
 *
 *   SEED_OWNER_USER_ID=<uid> node --env-file=.env.local scripts/seed-jubileum-nyhetsbrev.mjs
 *
 * Etter kjøring:
 *  - Åpne /innleggsbygger/nyhetsbrev-bygger → «Mine utkast»
 *  - Finn «STANDARD: 25-årsjubileum + åpning PROFF-butikk»
 *  - Justér tekstene, legg til evt. produkter, opprett kampanje i Mailchimp
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_USER_ID = process.env.SEED_OWNER_USER_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OWNER_USER_ID) {
  console.error("Mangler env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_OWNER_USER_ID");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── GeneratedContent: tekstene som bygger nyhetsbrevet ───────────────
const editContent = {
  themeSlug: "jubileum-2026-06-26",
  topBadge: "🎉 25 ÅR + ÅPNING PROFF-BUTIKK",
  subjectLine: "🎉 Vi feirer 25 år — kom innom 26. juni",
  previewText: "Vi åpner PROFF-butikk og inviterer til en hel dag med tilbud, leverandører og noen spesielle gjester. Møt oss på Brekstad!",
  headingMain: "Vi feirer 25 år",
  headingSub: "Velkommen til åpning av PROFF-butikk · 26. juni",
  ingress:
    "I 25 år har vi levert verktøy og skreddersydde løsninger til håndverkere, " +
    "industri og Forsvaret. Torsdag 26. juni markerer vi jubileet OG åpner " +
    "dørene til PROFF-butikk på Brekstad — med en innholdsrik dag full " +
    "av eksklusive tilbud, faglig påfyll og besøk fra bransjens sterkeste " +
    "leverandører.",
  midtTitle: "PROGRAM 26. JUNI · 10:00 — 16:00",
  midtBody:
    "10:00 — Dørene åpner og messen starter\n" +
    "11:00 — 13:00 — Enkel servering\n" +
    "13:00 — PROFF presentasjon\n\n" +
    "På plass denne dagen: Milwaukee, Wera, Soudal, Picard/Halder og " +
    "Zweibrüder. I tillegg får vi besøk av Red Bull og Tesla Mobile Service.\n\n" +
    "✨ Eksklusive dagstilbud · 🎯 Konkurranser og aktiviteter · " +
    "🛠️ Faglig påfyll direkte fra ekspertene · 🎁 Goodiebag til de første",
  midtCtaText: "Les mer",
  midtCtaUrl:
    "https://fosen-tools.no/?utm_source=mailchimp&utm_medium=email&utm_campaign=jubileum-2026-06-26&utm_content=midt-cta",
  preferredManufacturers: ["Milwaukee", "Wera", "Soudal"],
  productKeywords: ["jubileum", "tilbud"],
};

// ─── Hele wizard-state-payloaden ─────────────────────────────────────
const wizardState = {
  themeInput: "25-årsjubileum + åpning PROFF-butikk",
  focus: "annet",
  discountPct: "",
  extraContext:
    "Vi feirer 25 år 26. juni 2026 og åpner samtidig PROFF-butikk på " +
    "Brekstad. Innholdsrik dag 10:00 – 16:00 med leverandører (Milwaukee, " +
    "Wera, Soudal, Picard/Halder, Zweibrüder) og spesielle gjester " +
    "(Red Bull, Tesla Mobile Service). Eksklusive dagstilbud, " +
    "konkurranser, goodiebag. PROFF presentasjon kl 13.",
  productCount: 3,
  onlyInStock: true,
  manualProductUrls: "",
  variant: 0,
  preview: { content: editContent, products: [] },
  editContent,
  editProducts: [],
  midtImageInput: "",
  midtImageUrl: "https://fosen-tools.no/userfiles/image/HDFI/HDFI-svart-bedre.jpg",
  footerImageInput: "",
  footerImageUrl: "",
  socialInstagram:
    "https://www.instagram.com/fosentools/?utm_source=mailchimp&utm_medium=email&utm_campaign=jubileum-2026-06-26&utm_content=footer-social",
  socialLinkedin:
    "https://www.linkedin.com/company/fosen-tools-as?utm_source=mailchimp&utm_medium=email&utm_campaign=jubileum-2026-06-26&utm_content=footer-social",
  templateVariant: "jubileum",
};

console.log("📧 Setter inn jubileum-mal-utkast...");

const { data, error } = await sb
  .from("newsletter_wizard_drafts")
  .insert({
    user_id: OWNER_USER_ID,
    title: "STANDARD: 25-årsjubileum + åpning PROFF-butikk",
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
console.log("\n🛠  Rediger i UI (lokalt):");
console.log("   http://localhost:3001/innleggsbygger/nyhetsbrev-bygger");
console.log("\n📅 Anbefalt sendetid: tirsdag 16. juni kl 11:00");
console.log("   (1 uke før eventet — matcher FT-publiseringsrytmen)");
