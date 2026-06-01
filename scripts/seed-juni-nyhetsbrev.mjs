/**
 * Seeder de 4 resterende juni-utgavene med variasjon i mal-typene og
 * datadrevet produktvalg basert på markedsanalysen (1. juni 2026):
 *
 *   Tir 9. juni  — Utgave 2: TOPP-PRODUKTER (jubileum-mal m/ produkt-grid)
 *                  5 ekte bestselgere fra Milwaukee + Wera basert på
 *                  Mailchimp-klikk + GA4-views siste 90d
 *   Tir 16. juni — Utgave 3: Tre fagmerker (jubileum-leverandor)
 *                  Soudal, Halder, Picard (text-fallback for manglende logoer)
 *   Tir 23. juni — Utgave 4: Spesielle gjester (jubileum-leverandor)
 *                  Red Bull + Tesla Mobile Service som «gjest-kort»
 *                  + program-info i midt
 *   Tir 30. juni — Utgave 5: Takk for jubileet (standard mal)
 *                  Fredagsbilde + kundehistorie tilbake på plass
 *
 * Fredagsbilde-seksjon er AV for 2. juni (allerede satt) og PÅ for alle
 * fremtidige utgaver per Erik-direktiv.
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

function utm(campaign, content) {
  return `?utm_source=mailchimp&utm_medium=email&utm_campaign=${campaign}&utm_content=${content}`;
}

function priceText(price) {
  if (typeof price !== "number" || price <= 0) return "Se pris";
  return `${price.toLocaleString("nb-NO")} kr`;
}

// ─── UTGAVE 2 — Tir 9. juni 2026 — TOPP-PRODUKTER ──────────────────
// Datadrevet utvalg: 5 ekte bestselgere fra Milwaukee + Wera basert på
// Mailchimp-klikk og GA4-views siste 90 dager. Bruker jubileum-malen
// (12-kol produkt-grid) — første gang vi viser produkter, ikke leverandører.
const CAMP2 = "2026-06-09-toppselgere";
const utgave2 = {
  title: "UTGAVE 2/5: 5 toppselgere fra messen (9. juni)",
  scheduledSendDate: "2026-06-09",
  templateVariant: "jubileum", // produkt-grid, ikke leverandør-grid
  suppliers: [],
  products: [
    {
      url: `https://fosen-tools.no/milwaukee/f9919/muttertrekker-1-2-dr-m12-fiwf12-0-milwaukee${utm(CAMP2, "muttertrekker-m12")}`,
      name: "MUTTERTREKKER 1/2\" M12 FIWF12-0",
      brandSku: "Milwaukee",
      priceText: priceText(950),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/55999/image/00aee763-6b11-4f8f-9b80-8dd7f41ff7cc/m12_fiwf12-0--hero_1.w720.jpg",
    },
    {
      url: `https://fosen-tools.no/milwaukee/120633${utm(CAMP2, "verktoyvogn-src46")}`,
      name: "VERKTØYVOGN 10 SKUFFER 117 CM SRC46-1",
      brandSku: "Milwaukee",
      priceText: priceText(16667),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/32403/image/66640dc9-0bd3-41ae-bc77-604be8b1eb80/4932478852--hero_1.w900.jpg",
    },
    {
      url: `https://fosen-tools.no/wera/123388${utm(CAMP2, "joker-skraller")}`,
      name: "SKRALLENØKKELSETT JOKER BLACK EDITION",
      brandSku: "Wera",
      priceText: priceText(3192),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/28314/image/39a99ead-9cc3-4ade-bddc-be60f998878c/05020017001.w900.jpg",
    },
    {
      url: `https://fosen-tools.no/milwaukee/115381/sirkelsag-m18-ccs55-0-milwaukee${utm(CAMP2, "sirkelsag-m18")}`,
      name: "SIRKELSAG M18 CCS55-0",
      brandSku: "Milwaukee",
      priceText: priceText(3475),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/52148/image/ff5a89f2-c16a-47a2-8318-c596cfdfc78a/m18_ccs55-0--hero_1.w900.jpg",
    },
    {
      url: `https://fosen-tools.no/milwaukee/126014/popnaglepistol-m12-bprt-milwaukee${utm(CAMP2, "popnaglepistol-m12")}`,
      name: "POPNAGLEPISTOL M12 BPRT-201X",
      brandSku: "Milwaukee",
      priceText: priceText(4190),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/55333/image/b3bd145d-e9fe-47f5-a7f9-c26286768128/m12_bprt-201x--hero_2.w900.jpg",
    },
  ],
  content: {
    themeSlug: CAMP2,
    topBadge: "🛠️ KLAR FOR JUBILEET?",
    subjectLine: "5 toppselgere fra Milwaukee og Wera, snart på messen",
    previewText:
      "Smaksprøver på hva som er på plass 26. juni. De mest klikkede og " +
      "mest sette produktene fra messe-leverandørene siste 90 dager.",
    headingMain: "5 toppselgere fra messen",
    headingSub: "De mest klikkede og mest sette produktene fra Milwaukee og Wera",
    ingress:
      "26. juni stiller Milwaukee, Wera og Zweibrüder med team i butikken " +
      "på Brekstad. Her er fem produkter du allerede har klikket på i " +
      "tidligere nyhetsbrev, klare for å testes og demonstreres på plass.",
    midtTitle: "17 DAGER IGJEN TIL JUBILEET",
    midtBody:
      "Fredag 26. juni feirer vi 25 år og åpner ny PROFF-butikk på Brekstad " +
      "mellom 10:00 og 16:00. På plass: Milwaukee, Wera, Soudal, Halder, " +
      "Picard og Zweibrüder, pluss spesielle gjester Red Bull og Tesla Mobile " +
      "Service.\n\n" +
      "🎯 Eksklusive dagstilbud KUN i butikken, disse legges ikke ut på nett.\n" +
      "🎁 Goodiebag til de første som kommer.",
    midtCtaText: "Les mer",
    midtCtaUrl: `https://fosen-tools.no/${utm(CAMP2, "midt-cta")}`,
    preferredManufacturers: ["Milwaukee", "Wera"],
    productKeywords: ["bestselgere", "milwaukee", "wera"],
  },
  showFridayPost: true,
  showMidtCta: false,
  hideJubileumBanner: true,
  jubileumFooterText: "Vi feirer 25 år fredag 26. juni 2026",
};

// ─── UTGAVE 3 — Tir 16. juni 2026 — TRE FAGMERKER ──────────────────
// Soudal, Halder, Picard som leverandør-kort med text-fallback for logoer
// (laster opp logoene før utsendelse).
const CAMP3 = "2026-06-16-tre-fagmerker";
const utgave3 = {
  title: "UTGAVE 3/5: Soudal, Halder og Picard, tre fagmerker (16. juni)",
  scheduledSendDate: "2026-06-16",
  templateVariant: "jubileum-leverandor",
  products: [],
  suppliers: [
    {
      name: "Soudal",
      tagline: "Belgisk lim, fugemasse og tetning",
      logoUrl: "",
      ctaText: "Se Soudal-sortimentet →",
      ctaUrl: `https://fosen-tools.no/soudal${utm(CAMP3, "soudal")}`,
      description:
        "Soudal er Europas største uavhengige produsent av silikon, lim, " +
        "PU-skum og bygge-kjemikalier. Vi fører Soudaflex, Fix All, " +
        "Soudafoam Click&Go og resten av profilkjeden — kvalitet håndverkere " +
        "stoler på i hverdagen.",
      logoWidth: 150,
    },
    {
      name: "Halder",
      tagline: "Tyske ryggløse hammere",
      logoUrl: "",
      ctaText: "Se Halder-sortimentet →",
      ctaUrl: `https://fosen-tools.no/halder${utm(CAMP3, "halder")}`,
      description:
        "Halder Simplex er den globale standarden for ryggløse hammere. " +
        "Skiftbare slag-hoder i ulike materialer (gummi, plast, kobber, " +
        "stål), holdbart hus, og et system du arver. Brukt av mekanikere, " +
        "montører og industri over hele Europa.",
      logoWidth: 150,
    },
    {
      name: "Picard",
      tagline: "Tyske smedhammere siden 1857",
      logoUrl: "",
      ctaText: "Spør oss om Picard →",
      ctaUrl: `https://fosen-tools.no/kundesenter/kontakt-oss${utm(CAMP3, "picard")}`,
      description:
        "Picard har laget hammere og spesialverktøy i Tyskland siden 1857. " +
        "Vi tar inn sortimentet til Fosen Tools nå og lanserer det offisielt " +
        "på jubileet 26. juni. Kontakt oss om du vil se utvalget tidlig — vi " +
        "viser gjerne frem demoeksemplarer på Brekstad.",
      logoWidth: 150,
    },
  ],
  content: {
    themeSlug: CAMP3,
    topBadge: "🛠️ TRE FAGMERKER",
    subjectLine: "Soudal, Halder og Picard, tre fagmerker hos Fosen Tools",
    previewText:
      "Belgisk lim, tyske ryggløse hammere og hammer-spesialister siden 1857. " +
      "Tre merker vi presenterer ti dager før jubileet.",
    headingMain: "Tre fagmerker",
    headingSub: "Soudal · Halder · Picard",
    ingress:
      "Forrige uke viste vi noen toppselgere fra Milwaukee og Wera. Denne " +
      "uken tar vi tre fagmerker til som kommer på besøk 26. juni. Soudal " +
      "for lim og fugemasse, Halder for de ryggløse hammerne som industrien " +
      "sverger til, og Picard som lanserer hele sitt smedhammer-sortiment " +
      "hos oss på jubileet.",
    midtTitle: "10 DAGER IGJEN TIL JUBILEET",
    midtBody:
      "Fredag 26. juni feirer vi 25 år og åpner ny PROFF-butikk på Brekstad " +
      "mellom 10:00 og 16:00. På plass: Milwaukee, Wera, Soudal, Halder, " +
      "Picard og Zweibrüder, pluss spesielle gjester Red Bull og Tesla Mobile " +
      "Service.\n\n" +
      "🎯 Eksklusive dagstilbud KUN i butikken, disse legges ikke ut på nett.\n" +
      "🎁 Goodiebag til de første som kommer.",
    midtCtaText: "Les mer",
    midtCtaUrl: `https://fosen-tools.no/${utm(CAMP3, "midt-cta")}`,
    preferredManufacturers: ["Soudal", "Halder", "Picard"],
    productKeywords: ["fagmerker"],
  },
  showFridayPost: true,
  showMidtCta: false,
  hideJubileumBanner: true,
  jubileumFooterText: "Vi feirer 25 år fredag 26. juni 2026",
};

// ─── UTGAVE 4 — Tir 23. juni 2026 — SPESIELLE GJESTER + REMINDER ───
// 2 «gjest»-kort (Red Bull, Tesla Mobile Service) som variasjon på
// leverandør-grid-en. Hovedfokus: 3 dager til jubileet.
const CAMP4 = "2026-06-23-spesielle-gjester";
const utgave4 = {
  title: "UTGAVE 4/5: 3 dager igjen + spesielle gjester (23. juni)",
  scheduledSendDate: "2026-06-23",
  templateVariant: "jubileum-leverandor",
  products: [],
  suppliers: [
    {
      name: "Red Bull",
      tagline: "Energi til hele dagen",
      logoUrl: "",
      ctaText: "Bli kjent →",
      ctaUrl: `https://fosen-tools.no/${utm(CAMP4, "red-bull")}`,
      description:
        "Red Bull stiller med team og servering hele dagen. Stikk innom for " +
        "en boks, en prat og litt ekstra energi mens du tester verktøy.",
      logoWidth: 130,
    },
    {
      name: "Tesla Mobile Service",
      tagline: "Tesla-service på stedet",
      logoUrl: "",
      ctaText: "Bli kjent →",
      ctaUrl: `https://fosen-tools.no/${utm(CAMP4, "tesla")}`,
      description:
        "Tesla Mobile Service kjører innom med servicebilen og forteller om " +
        "hvordan de bruker verktøy fra Fosen Tools i hverdagen. " +
        "Anledningen til å se Tesla-verktøyene tett på.",
      logoWidth: 150,
    },
  ],
  content: {
    themeSlug: CAMP4,
    topBadge: "🎉 3 DAGER IGJEN",
    subjectLine: "🎉 3 dager igjen: Vi sees fredag på Brekstad",
    previewText:
      "26. juni: 6 leverandører, 2 spesielle gjester (Red Bull og Tesla " +
      "Mobile Service), eksklusive dagstilbud og goodiebag. Vi gleder oss.",
    headingMain: "Vi sees fredag",
    headingSub: "26. juni · 10:00 – 16:00 · Brekstad",
    ingress:
      "3 dager igjen til vi feirer 25 år og åpner ny PROFF-butikk. I tillegg " +
      "til Milwaukee, Wera, Zweibrüder, Soudal, Halder og Picard, kommer to " +
      "spesielle gjester innom hele dagen. Møt dem og resten av oss på " +
      "Brekstad.",
    midtTitle: "PROGRAM 26. JUNI · 10:00 – 16:00",
    midtBody:
      "10:00 — Dørene åpner og messen starter\n" +
      "11:00 – 13:00 — Enkel servering\n" +
      "13:00 — PROFF-presentasjon\n\n" +
      "🎯 Eksklusive dagstilbud KUN i butikken, disse legges ikke ut på nett.\n" +
      "🎁 Goodiebag til de første som kommer.\n\n" +
      "Adresse: Industrigata 1, 7130 Brekstad",
    midtCtaText: "Les mer",
    midtCtaUrl: `https://fosen-tools.no/${utm(CAMP4, "midt-cta")}`,
    preferredManufacturers: [],
    productKeywords: ["reminder"],
  },
  showFridayPost: true,
  showMidtCta: false,
  hideJubileumBanner: true,
  jubileumFooterText: "Vi feirer 25 år fredag 26. juni 2026",
};

// ─── UTGAVE 5 — Tir 30. juni 2026 — TAKK + TILBAKE TIL HVERDAGEN ───
// Standard mal (jubileet er over), fredagsbilde aktivert med kundehistorie
// fra jubileet.
const CAMP5 = "2026-06-30-takk";
const utgave5 = {
  title: "UTGAVE 5/5: Takk for jubileet (30. juni)",
  scheduledSendDate: "2026-06-30",
  templateVariant: "standard",
  products: [],
  suppliers: [],
  content: {
    themeSlug: CAMP5,
    topBadge: "🙏 TAKK FOR JUBILEET",
    subjectLine: "Takk for at dere kom innom på jubileet",
    previewText:
      "25-årsjubileet og åpningen av ny PROFF-butikk ble en dag vi sent vil " +
      "glemme, takket være alle som tok turen innom Brekstad.",
    headingMain: "Takk for jubileet",
    headingSub: "En dag vi sent vil glemme",
    ingress:
      "Fredag 26. juni feiret vi 25 år sammen med kunder, leverandører og " +
      "venner av huset. Det var en dag fylt med fagprat, gode tilbud, " +
      "demonstrasjoner og hyggelige møter. Tusen takk til alle som tok turen " +
      "innom Brekstad, og takk til Milwaukee, Wera, Soudal, Halder, Picard, " +
      "Zweibrüder, Red Bull og Tesla Mobile Service for at dere stilte opp. " +
      "Nå er PROFF-butikken offisielt åpen, og vi ser frem til å se dere igjen.",
    midtTitle: "PROFF-BUTIKKEN ER OFFISIELT ÅPEN",
    midtBody:
      "Du finner oss på Industrigata 1, 7130 Brekstad. " +
      "Vanlige åpningstider: mandag til fredag 07:00 – 15:00. " +
      "Velkommen innom for en prat om verktøy og spesialløsninger.",
    midtCtaText: "Se sortimentet",
    midtCtaUrl: `https://fosen-tools.no/${utm(CAMP5, "midt-cta")}`,
    preferredManufacturers: [],
    productKeywords: ["sommer"],
  },
  showFridayPost: true,
  showMidtCta: true,
  jubileumFooterText: "Vi feirer 25 år fredag 26. juni 2026",
};

// ─── Felles seeder ───────────────────────────────────────────────────
function buildWizardState(utgave) {
  return {
    themeInput: utgave.title,
    focus: "annet",
    discountPct: "",
    extraContext: utgave.title,
    productCount: utgave.products.length,
    onlyInStock: true,
    manualProductUrls: "",
    variant: 0,
    preview: { content: utgave.content, products: utgave.products },
    editContent: utgave.content,
    editProducts: utgave.products,
    editSuppliers: utgave.suppliers,
    midtImageInput: "",
    midtImageUrl: "https://fosen-tools.no/userfiles/image/HDFI/HDFI-svart-bedre.jpg",
    footerImageInput: "",
    footerImageUrl: "",
    socialInstagram: `https://www.instagram.com/fosentools/${utm(utgave.content.themeSlug, "footer-social")}`,
    socialLinkedin: `https://www.linkedin.com/company/fosen-tools-as${utm(utgave.content.themeSlug, "footer-social")}`,
    templateVariant: utgave.templateVariant,
    showFridayPost: utgave.showFridayPost,
    showMidtCta: utgave.showMidtCta,
    hideJubileumBanner: utgave.hideJubileumBanner,
    jubileumFooterText: utgave.jubileumFooterText,
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
  console.log(`  ✅ ${data.id} · ${utgave.scheduledSendDate} · ${utgave.templateVariant} · ${utgave.products.length} produkter, ${utgave.suppliers.length} leverandører`);
}

// Slett gamle utkast med ulike titler så vi ikke får duplikater fra forrige kjøring
const obsoleteTitles = [
  "UTGAVE 2/5: Soudal, Halder og Picard, tre fagmerker (9. juni)",
  "UTGAVE 3/5: Facom, Husqvarna og Snap-on, premium-merker (16. juni)",
  "UTGAVE 4/5: Reminder, 3 dager igjen til jubileet (23. juni)",
];
for (const t of obsoleteTitles) {
  await sb.from("newsletter_wizard_drafts").delete().eq("title", t);
}

for (const utgave of [utgave2, utgave3, utgave4, utgave5]) {
  await seedOne(utgave);
}

console.log("\n✅ Alle 4 juni-utkast oppdatert!");
console.log("\nÅpne i UI:");
console.log("  https://fosen-tools-analytics.vercel.app/innleggsbygger/nyhetsbrev-oversikt");
console.log("  https://fosen-tools-analytics.vercel.app/innhold-kalender");
