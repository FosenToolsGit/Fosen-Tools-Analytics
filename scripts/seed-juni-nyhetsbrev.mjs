/**
 * Seeder de 4 resterende juni-utgavene som diskusjonsgrunnlag for Erik:
 *
 *   Tir 9. juni  — Utgave 2: Soudal, Halder, Picard (fagmerker)
 *   Tir 16. juni — Utgave 3: Facom, Husqvarna, Snap-on (premium-merker)
 *   Tir 23. juni — Utgave 4: Reminder, 3 dager igjen til jubileet
 *   Tir 30. juni — Utgave 5: Takk for jubileet + tilbake til hverdagen
 *
 * Alle har scheduledSendDate satt så de dukker opp på riktig dag i
 * innhold-kalenderen. Utgave 2 bruker text-fallback for logo-celler
 * siden Soudal/Halder/Picard-logoene ikke er lastet opp til Supabase
 * ennå (rendreren viser merkenavn i stor uppercase i stedet).
 *
 *   node --env-file=.env.local scripts/seed-juni-nyhetsbrev.mjs
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

function utm(campaign) {
  return `utm_source=mailchimp&utm_medium=email&utm_campaign=${campaign}`;
}

// ─── UTGAVE 2 ───────────────────────────────────────────────────────
// Tir 9. juni 2026 — Soudal, Halder, Picard
const utgave2 = {
  title: "UTGAVE 2/5: Soudal, Halder og Picard, tre fagmerker (9. juni)",
  scheduledSendDate: "2026-06-09",
  utmCampaign: "2026-06-09-tre-fagmerker",
  suppliers: [
    {
      name: "Soudal",
      tagline: "Belgisk lim, fugemasse og tetning",
      logoUrl: "", // mangler — viser navnet som tekst i stedet
      ctaText: "Se Soudal-sortimentet →",
      ctaUrl: "https://fosen-tools.no/soudal",
      description:
        "Soudal er Europas største uavhengige produsent av silikon, lim, " +
        "PU-skum og bygge-kjemikalier. Vi fører bredt sortiment for både " +
        "håndverker og industri.",
      logoWidth: 150,
    },
    {
      name: "Halder",
      tagline: "Tyske ryggløse hammere",
      logoUrl: "",
      ctaText: "Se Halder-sortimentet →",
      ctaUrl: "https://fosen-tools.no/halder",
      description:
        "Halder Simplex-hammere er den globale standarden for ryggløse " +
        "hammere. Skiftbare slag-hoder, holdbart hus, kvalitet du arver.",
      logoWidth: 150,
    },
    {
      name: "Picard",
      tagline: "Tyske smedhammere og spesialverktøy",
      logoUrl: "",
      ctaText: "Spør oss om Picard →",
      ctaUrl: "https://fosen-tools.no/kundesenter/kontakt-oss",
      description:
        "Picard har laget hammere siden 1857. Vi tar inn sortimentet til " +
        "Fosen Tools nå, og lanserer det offisielt på jubileet 26. juni. " +
        "Kontakt oss om du vil se prøvene tidlig.",
      logoWidth: 150,
    },
  ],
  content: {
    themeSlug: "2026-06-09-tre-fagmerker",
    topBadge: "🛠️ TRE FAGMERKER",
    subjectLine: "Soudal, Halder og Picard, tre fagmerker hos Fosen Tools",
    previewText:
      "Belgisk lim, tyske ryggløse hammere og hammer-spesialister siden 1857. " +
      "Tre fagmerker vi løfter frem denne uken.",
    headingMain: "Tre fagmerker",
    headingSub: "Soudal · Halder · Picard",
    ingress:
      "Forrige uke presenterte vi Milwaukee, Wera og Zweibrüder. Denne uken " +
      "tar vi tre merker til som vi er stolte av å føre. Soudal dekker " +
      "lim, fugemasse og tetning. Halder lager de ryggløse hammerne mekanikere " +
      "og montører sverger til. Picard har laget kvalitets-hammere i Tyskland " +
      "siden 1857, og lanseres formelt hos oss på jubileet 26. juni.",
    midtTitle: "VI FYLLER 25 ÅR 26. JUNI",
    midtBody:
      "17 dager til vi feirer 25 år som leverandør av kvalitetsverktøy. " +
      "Fredag 26. juni åpner vi dørene til vår nye PROFF-butikk på Brekstad " +
      "mellom 10:00 og 16:00. Du er hjertelig velkommen innom for å se " +
      "sortimentet, møte leverandørene og hilse på teamet.",
    midtCtaText: "Les mer",
    midtCtaUrl: "https://fosen-tools.no/",
    preferredManufacturers: ["Soudal", "Halder", "Picard"],
    productKeywords: ["fagmerker", "tyske"],
  },
};

// ─── UTGAVE 3 ───────────────────────────────────────────────────────
// Tir 16. juni 2026 — Facom, Husqvarna, Snap-on
const utgave3 = {
  title: "UTGAVE 3/5: Facom, Husqvarna og Snap-on, premium-merker (16. juni)",
  scheduledSendDate: "2026-06-16",
  utmCampaign: "2026-06-16-premium-merker",
  suppliers: [
    {
      name: "Facom",
      tagline: "Fransk premium-verktøy",
      logoUrl: `${LOGO_BASE}/facom.png`,
      ctaText: "Se Facom-sortimentet →",
      ctaUrl: "https://fosen-tools.no/facom",
      description:
        "Facom har vært industri-standard for mekanikere og vedlikehold " +
        "siden 1918. Verktøyvogner, momentnøkler, pipesett og " +
        "spesialverktøy i kvalitet du bygger karrieren rundt.",
      logoWidth: 150,
    },
    {
      name: "Husqvarna",
      tagline: "Diamantverktøy og kraftmaskiner",
      logoUrl: `${LOGO_BASE}/husqvarna.png`,
      ctaText: "Se Husqvarna-sortimentet →",
      ctaUrl: "https://fosen-tools.no/husqvarna",
      description:
        "Diamantsagblader, kappesager, kjernebor og kraftmaskiner for bygg " +
        "og anlegg. Husqvarna leverer profesjonelt utstyr til håndverkere " +
        "som krever maks oppetid.",
      logoWidth: 160,
    },
    {
      name: "Snap-on",
      tagline: "Amerikansk premium med livstidsgaranti",
      logoUrl: `${LOGO_BASE}/snap-on.png`,
      ctaText: "Se Snap-on-sortimentet →",
      ctaUrl: "https://fosen-tools.no/snapon",
      description:
        "Snap-on er det merket profesjonelle mekanikere i bilbransje og " +
        "industri bruker hver dag. Livstidsgaranti, presisjon og " +
        "servicenettverk over hele landet.",
      logoWidth: 150,
    },
  ],
  content: {
    themeSlug: "2026-06-16-premium-merker",
    topBadge: "⭐ PREMIUM-MERKENE",
    subjectLine: "Facom, Husqvarna og Snap-on, tre premium-merker hos oss",
    previewText:
      "Fransk premium-verktøy, svensk kraftutstyr og amerikansk livstidsgaranti. " +
      "Tre merker fagfolk velger når kvalitet er viktigst.",
    headingMain: "Tre premium-merker",
    headingSub: "Facom · Husqvarna · Snap-on",
    ingress:
      "Når jobben krever det beste, velger fagfolk premium. Denne uken " +
      "løfter vi frem tre merker som har bygd seg opp som standarden i " +
      "sine respektive fagområder. Facom for mekanikere og industri, " +
      "Husqvarna for bygg og anlegg, og Snap-on for de som ikke aksepterer " +
      "kompromiss.",
    midtTitle: "10 DAGER IGJEN TIL VI FEIRER 25 ÅR",
    midtBody:
      "Fredag 26. juni åpner vi dørene til ny PROFF-butikk på Brekstad mellom " +
      "10:00 og 16:00. På plass: Milwaukee, Wera, Soudal, Halder, Picard og " +
      "Zweibrüder, pluss spesielle gjester Red Bull og Tesla Mobile Service. " +
      "Eksklusive dagstilbud kun i butikken.",
    midtCtaText: "Les mer",
    midtCtaUrl: "https://fosen-tools.no/",
    preferredManufacturers: ["Facom", "Husqvarna", "Snap-on"],
    productKeywords: ["premium", "kvalitet"],
  },
};

// ─── UTGAVE 4 ───────────────────────────────────────────────────────
// Tir 23. juni 2026 — Reminder, 3 dager igjen
const utgave4 = {
  title: "UTGAVE 4/5: Reminder, 3 dager igjen til jubileet (23. juni)",
  scheduledSendDate: "2026-06-23",
  utmCampaign: "2026-06-23-reminder",
  suppliers: [], // ren reminder, ingen leverandører
  content: {
    themeSlug: "2026-06-23-reminder",
    topBadge: "🎉 3 DAGER IGJEN",
    subjectLine: "🎉 3 dager igjen: Vi sees fredag på Brekstad",
    previewText:
      "Fredag 26. juni feirer vi 25 år og åpner ny PROFF-butikk på Brekstad. " +
      "10:00 – 16:00. Vi gleder oss.",
    headingMain: "Vi sees fredag",
    headingSub: "26. juni · 10:00 – 16:00 · Brekstad",
    ingress:
      "Det er bare 3 dager igjen til vi feirer 25 år og åpner dørene til ny " +
      "PROFF-butikk på Brekstad. Vi har gledet oss til denne dagen lenge, og " +
      "håper du tar turen innom. Her er programmet og hvem du møter.",
    midtTitle: "PROGRAM 26. JUNI · 10:00 – 16:00",
    midtBody:
      "10:00 — Dørene åpner og messen starter\n" +
      "11:00 – 13:00 — Enkel servering\n" +
      "13:00 — PROFF-presentasjon\n\n" +
      "På plass: Milwaukee, Wera, Soudal, Halder, Picard og Zweibrüder.\n" +
      "Spesielle gjester: Red Bull og Tesla Mobile Service.\n\n" +
      "🎯 Eksklusive dagstilbud KUN i butikken, disse ligger ikke ute på nett.\n" +
      "🎁 Goodiebag til de første som kommer.\n\n" +
      "Adresse: Industrigata 1, 7130 Brekstad",
    midtCtaText: "Les mer",
    midtCtaUrl: "https://fosen-tools.no/",
    preferredManufacturers: [],
    productKeywords: ["jubileum"],
  },
  templateVariant: "jubileum-leverandor", // beholder banner, men 0 leverandører = rent reminder-format
};

// ─── UTGAVE 5 ───────────────────────────────────────────────────────
// Tir 30. juni 2026 — Takk for jubileet
const utgave5 = {
  title: "UTGAVE 5/5: Takk for jubileet (30. juni)",
  scheduledSendDate: "2026-06-30",
  utmCampaign: "2026-06-30-takk",
  suppliers: [], // standard mal, tilbake til hverdagen
  content: {
    themeSlug: "2026-06-30-takk",
    topBadge: "🙏 TAKK FOR JUBILEET",
    subjectLine: "Takk for at dere kom innom på jubileet",
    previewText:
      "25-årsjubileet og PROFF-åpningen ble en uforglemmelig dag takket være alle som " +
      "tok turen innom. Tusen takk!",
    headingMain: "Takk for jubileet",
    headingSub: "En dag vi sent vil glemme",
    ingress:
      "Fredag 26. juni feiret vi 25 år sammen med kunder, leverandører og " +
      "venner av huset. Det var en dag fylt med fagprat, gode tilbud, " +
      "spennende demonstrasjoner og hyggelige møter. Tusen takk til alle " +
      "som tok turen innom Brekstad, og takk til Milwaukee, Wera, Soudal, " +
      "Halder, Picard og Zweibrüder for at dere stilte opp. " +
      "Nå er PROFF-butikken offisielt åpen, og vi ser frem til å se dere igjen.",
    midtTitle: "PROFF-BUTIKKEN ER OFFISIELT ÅPEN",
    midtBody:
      "Du finner oss på Industrigata 1, 7130 Brekstad. " +
      "Vanlige åpningstider: mandag til fredag 07:00 – 15:00. " +
      "Velkommen innom for en prat om verktøy og spesialløsninger.",
    midtCtaText: "Se sortimentet",
    midtCtaUrl: "https://fosen-tools.no/",
    preferredManufacturers: [],
    productKeywords: ["sommer"],
  },
  templateVariant: "standard", // jubileet er over, tilbake til standard-mal
  showFridayPost: true,         // gjenoppta kundehistorie-seksjon
  showMidtCta: true,
};

// ─── Felles seeder ───────────────────────────────────────────────────
function buildWizardState(utgave) {
  return {
    themeInput: utgave.title,
    focus: "annet",
    discountPct: "",
    extraContext: utgave.title,
    productCount: 0,
    onlyInStock: true,
    manualProductUrls: "",
    variant: 0,
    preview: { content: utgave.content, products: [] },
    editContent: utgave.content,
    editProducts: [],
    editSuppliers: utgave.suppliers,
    midtImageInput: "",
    midtImageUrl: "https://fosen-tools.no/userfiles/image/HDFI/HDFI-svart-bedre.jpg",
    footerImageInput: "",
    footerImageUrl: "",
    socialInstagram: `https://www.instagram.com/fosentools/?${utm(utgave.utmCampaign)}&utm_content=footer-social`,
    socialLinkedin: `https://www.linkedin.com/company/fosen-tools-as?${utm(utgave.utmCampaign)}&utm_content=footer-social`,
    templateVariant: utgave.templateVariant ?? "jubileum-leverandor",
    showFridayPost: utgave.showFridayPost ?? false,
    showMidtCta: utgave.showMidtCta ?? false,
    scheduledSendDate: utgave.scheduledSendDate,
  };
}

async function seedOne(utgave) {
  console.log(`📧 Seeder: ${utgave.title}`);
  await sb.from("newsletter_wizard_drafts").delete().eq("title", utgave.title);
  const { data, error } = await sb
    .from("newsletter_wizard_drafts")
    .insert({
      user_id: OWNER_USER_ID,
      title: utgave.title,
      wizard_state: buildWizardState(utgave),
      status: "draft",
    })
    .select()
    .single();
  if (error) {
    console.error(`  ❌ ${error.message}`);
    return;
  }
  console.log(`  ✅ ${data.id} · planlagt ${utgave.scheduledSendDate}`);
}

for (const utgave of [utgave2, utgave3, utgave4, utgave5]) {
  await seedOne(utgave);
}

console.log("\n✅ Alle 4 utkast opprettet!");
console.log("\nÅpne i UI:");
console.log("  http://localhost:3001/innleggsbygger/nyhetsbrev-oversikt");
console.log("  https://fosen-tools-analytics.vercel.app/innleggsbygger/nyhetsbrev-oversikt");
console.log("\nPå innhold-kalenderen:");
console.log("  http://localhost:3001/innhold-kalender");
console.log("  https://fosen-tools-analytics.vercel.app/innhold-kalender");
