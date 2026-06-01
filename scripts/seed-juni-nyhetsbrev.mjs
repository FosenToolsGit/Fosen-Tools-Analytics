/**
 * Juni-nyhetsbrev for tirsdags-utsendelser (9. – 30. juni 2026).
 *
 * Vinkling per Erik-feedback (1. juni): ordinære nyhetsbrev skal IKKE
 * fokusere på 26. juni-jubileet. Kun den nederste 25-års-raden er
 * tilstede; ingen rød banner i toppen.
 *
 *   Tir 9. juni  — Utgave 2: «Topp 5 på fosen-tools.no»
 *                  Datadrevne bestselgere (Mailchimp-klikk + salg)
 *   Tir 16. juni — Utgave 3: «Skreddersøm fra CADLAB» (HDFI/FT Custom)
 *                  Brand-bygging-tema. +144%-mønsteret.
 *   Tir 23. juni — Utgave 4: «Innredning som gjør jobben enklere»
 *                  GAP-kategori fra markedsanalysen. 3 leverandører.
 *   Tir 30. juni — Utgave 5: «Klar for sommerprosjektene»
 *                  Sesongtreff, 5 sortiment-bredde-produkter.
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

const JUBILEUM_FOOTER = "Vi feirer 25 år fredag 26. juni 2026";

// ─── UTGAVE 2 — Tir 9. juni — TOPP 5 PÅ FOSEN-TOOLS.NO ──────────────
const CAMP2 = "2026-06-09-topp5";
const utgave2 = {
  title: "UTGAVE 2/5: Topp 5 på fosen-tools.no (9. juni)",
  scheduledSendDate: "2026-06-09",
  templateVariant: "standard",
  suppliers: [],
  products: [
    {
      url: `https://fosen-tools.no/milwaukee/118205/bor-skrutrekker-m18-onedd3-502x-fuel-one-key-milwaukee${utm(CAMP2, "milwaukee-onedd3").slice(1)}`,
      name: "BOR/SKRUTREKKER M18 ONEDD3-502X",
      brandSku: "Milwaukee",
      priceText: priceText(6290),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/28808/image/a965617d-3e86-48b5-a328-ecba1eaac20c/m18_onedd3-0x--hero_1.w900.png",
    },
    {
      url: `https://fosen-tools.no/facom/125604${utm(CAMP2, "facom-125604").slice(1)}`,
      name: "VERKTØYKOFFERT 181 PCS FACOM",
      brandSku: "Facom",
      priceText: priceText(4990),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-fosentools-public/documents/67179/image/601b66a1-ea05-45e0-bb9d-711d03f80655/ecomm_large-bv.gms181pb_5.w900.jpg",
    },
    {
      url: `https://fosen-tools.no/husqvarna/123742/diamantsagblad-s35-400-15-25-dot-4-20-elite-cut-husqvarna${utm(CAMP2, "husqvarna-s35").slice(1)}`,
      name: "DIAMANTSAGBLAD S35 ELITE CUT 400 MM",
      brandSku: "Husqvarna",
      priceText: priceText(2875),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/27827/image/bb908d39-c205-4a16-b100-71cb059d041f/ko-538541.w900.png",
    },
    {
      url: `https://fosen-tools.no/brockhaus-heuer/v0184${utm(CAMP2, "brockhaus-skrustikke").slice(1)}`,
      name: "SKRUSTIKKE 160 MM STANDARD",
      brandSku: "Brockhaus Heuer",
      priceText: priceText(6557),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/56377/image/838beeb0-39d2-4c33-9c4c-a61df637b76e/100.w900.jpg",
    },
    {
      url: `https://fosen-tools.no/rivit/119362/blindmuttertang-pro-riv740-18v-popnut-m3-m12-lader-2x2ah-batteri-koffert${utm(CAMP2, "rivit-riv740").slice(1)}`,
      name: "BLINDMUTTERTANG PRO RIV740 18V",
      brandSku: "Rivit",
      priceText: priceText(16123),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/33918/image/def5a2e6-fb26-4640-8ae2-cc97fad96147/6352000_1.w900.jpg",
    },
  ],
  content: {
    themeSlug: CAMP2,
    topBadge: "🛠️ TOPP 5 PÅ FOSEN-TOOLS.NO",
    subjectLine: "Topp 5: produktene flest klikker på akkurat nå",
    previewText:
      "Bor/skrutrekker, verktøykoffert, diamantsagblad, skrustikke og blindmuttertang. Fem produkter som har trukket flest klikk og kjøp siste måned.",
    headingMain: "Topp 5 akkurat nå",
    headingSub: "De mest klikkede og solgte produktene siste 30 dager",
    ingress:
      "Vi har sett gjennom hva abonnentene har klikket på og hva som har solgt mest, " +
      "og samlet de fem mest aktuelle produktene fra sortimentet vårt. Klassiske verktøy, " +
      "kvalitetsmerker, fra fem ulike kategorier.",
    midtTitle: "OVER 40 MERKER PÅ LAGER",
    midtBody:
      "Hos Fosen Tools fører vi over 40 merker for håndverkere, industri, " +
      "Forsvaret og aviation. Finner du ikke det du leter etter på nett, " +
      "tar vi gjerne en prat om spesialløsninger.",
    midtCtaText: "Se hele sortimentet",
    midtCtaUrl: `https://fosen-tools.no/produkter${utm(CAMP2, "alle-produkter")}`,
    preferredManufacturers: [],
    productKeywords: ["topp", "bestsellere"],
  },
  showFridayPost: true,
  showMidtCta: true,
  hideJubileumBanner: true,
  jubileumFooterText: JUBILEUM_FOOTER,
};

// ─── UTGAVE 3 — Tir 16. juni — SKREDDERSØM FRA CADLAB ───────────────
const CAMP3 = "2026-06-16-cadlab";
const utgave3 = {
  title: "UTGAVE 3/5: Skreddersøm fra CADLAB (16. juni)",
  scheduledSendDate: "2026-06-16",
  templateVariant: "standard",
  suppliers: [],
  products: [],
  content: {
    themeSlug: CAMP3,
    topBadge: "🛠️ EGEN PRODUKSJON",
    subjectLine: "Skreddersydd, ikke standardvare",
    previewText:
      "Hver HDFI-løsning er CAD-tegnet og CNC-maskinert i Brekstad. Tilpasset akkurat dine verktøy.",
    headingMain: "Skreddersøm fra CADLAB",
    headingSub: "CAD-tegnet, CNC-maskinert, klart for bruk",
    ingress:
      "Standardvarer er greit for standarjobber. Når jobben krever presisjon, " +
      "kontroll og rask gjenfinning, leverer vi skreddersøm fra vår egen CADLAB " +
      "på Brekstad. HDFI, FT Custom-vogner, Aviation-kofferter, " +
      "alt designet for akkurat det du skal gjøre.",
    midtTitle: "HDFI — STANDARDEN BLANT FAGFOLK",
    midtBody:
      "HDFI (High Density Foam Insert) gir hvert verktøy en fast plass. " +
      "CAD-tegnet etter dine verktøy, CNC-maskinert i Brekstad, levert i " +
      "Pelicase eller egen koffert-løsning. Brukt av Forsvaret, kommersiell " +
      "aviation, offshore og industri.\n\n" +
      "Vi tar imot tegning eller verktøysett og leverer ferdig løsning på " +
      "2-4 uker.",
    midtCtaText: "Les mer om HDFI",
    midtCtaUrl: `https://fosen-tools.no/hdfi${utm(CAMP3, "midt-cta")}`,
    preferredManufacturers: [],
    productKeywords: ["hdfi", "skreddersøm", "cadlab"],
  },
  // Mekanikersett-bilde — referanse fra HDFI-eksempelsamling
  midtImageUrlOverride: "https://fosen-tools.no/userfiles/image/Inspirasjon/Kasseløsninger/Medium kofferter HDFI/Snapon 1.jpeg",
  showFridayPost: true,
  showMidtCta: true,
  hideJubileumBanner: true,
  jubileumFooterText: JUBILEUM_FOOTER,
};

// ─── UTGAVE 4 — Tir 23. juni — INNREDNING SOM VIRKER ────────────────
const CAMP4 = "2026-06-23-innredning";
const utgave4 = {
  title: "UTGAVE 4/5: Innredning som gjør jobben enklere (23. juni)",
  scheduledSendDate: "2026-06-23",
  templateVariant: "jubileum-leverandor",
  products: [],
  suppliers: [
    {
      name: "Gigant",
      tagline: "Verkstedutstyr og lagerinnredning",
      logoUrl: `${LOGO_BASE}/gigant.png`,
      ctaText: "Se Gigant-sortimentet →",
      ctaUrl: `https://fosen-tools.no/gigant${utm(CAMP4, "gigant")}`,
      description:
        "Mobilreoler, traller, pallekarmer og hyllesystem. " +
        "Komplett verkstedinnredning fra Würth-gruppen.",
      logoWidth: 150,
    },
    {
      name: "Lista AG",
      tagline: "Sveitsiske kabinetter og skuffsystemer",
      logoUrl: `${LOGO_BASE}/lista.png`,
      ctaText: "Se Lista-sortimentet →",
      ctaUrl: `https://fosen-tools.no/lista-ag${utm(CAMP4, "lista")}`,
      description:
        "Tunge, modulære skuffsystemer for fagfolk som krever presisjon. " +
        "Sveitsisk håndverk siden 1945.",
      logoWidth: 150,
    },
    {
      name: "Zarges",
      tagline: "Profesjonelle transport-kasser og stiger",
      logoUrl: `${LOGO_BASE}/zarges.png`,
      ctaText: "Se Zarges-sortimentet →",
      ctaUrl: `https://fosen-tools.no/zarges${utm(CAMP4, "zarges")}`,
      description:
        "Aluminium-kasser, stiger og logistikkløsninger bygd for daglig hard bruk. " +
        "Tysk kvalitet, levert til industri og forsvar.",
      logoWidth: 150,
    },
  ],
  content: {
    themeSlug: CAMP4,
    topBadge: "🏭 INNREDNING",
    subjectLine: "Verkstedet ditt fortjener bedre",
    previewText:
      "Tre merker som leverer innredning og oppbevaring som tåler hverdagen: Gigant, Lista og Zarges.",
    headingMain: "Innredning som gjør jobben enklere",
    headingSub: "Gigant · Lista AG · Zarges",
    ingress:
      "God innredning sparer tid og rygg. Hyllesystem, skuffer og kasser som " +
      "tåler verkstedet, fra leverandører som har bygd seg opp på " +
      "kvalitet og holdbarhet.",
    midtTitle: "5S OG LEAN I VERKSTEDET",
    midtBody:
      "Vi hjelper deg sette opp 5S/Lean-løsninger med fargekoding, " +
      "merking og skreddersydde HDFI-innlegg. Kontakt oss for en " +
      "kartlegging av verkstedet.",
    midtCtaText: "Kontakt oss",
    midtCtaUrl: `https://fosen-tools.no/kundesenter/kontakt-oss${utm(CAMP4, "midt-cta")}`,
    preferredManufacturers: ["Gigant", "Lista", "Zarges"],
    productKeywords: ["innredning", "5s", "lager"],
  },
  showFridayPost: true,
  showMidtCta: true,
  hideJubileumBanner: true,
  jubileumFooterText: JUBILEUM_FOOTER,
};

// ─── UTGAVE 5 — Tir 30. juni — KLAR FOR SOMMERPROSJEKTENE ───────────
const CAMP5 = "2026-06-30-sommer";
const utgave5 = {
  title: "UTGAVE 5/5: Klar for sommerprosjektene (30. juni)",
  scheduledSendDate: "2026-06-30",
  templateVariant: "standard",
  suppliers: [],
  products: [
    {
      url: `https://fosen-tools.no/pelicase/v0412/kasse-peli-1550-sort-innv-dot--m%C3%A5l-473x360x196-mm-peli${utm(CAMP5, "peli-1550").slice(1)}`,
      name: "KASSE PELI 1550 SORT",
      brandSku: "Pelicase",
      priceText: priceText(3958),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/60434/image/4d240ffc-f361-4dbe-8025-58e30f50cd5f/1p1550u.w900.jpg",
    },
    {
      url: `https://fosen-tools.no/husqvarna/126313/k1-pace-komplett-kappel%C3%B8sning-husqvarna-10pcnt-rabatt${utm(CAMP5, "husqvarna-k1").slice(1)}`,
      name: "K1 PACE KOMPLETT KAPPELØSNING",
      brandSku: "Husqvarna",
      priceText: priceText(37545),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-fosentools-public/documents/69858/image/c98aada9-022f-4215-a8b1-04b104f1304f/126313.w900.png",
    },
    {
      url: `https://fosen-tools.no/milwaukee/115381/sirkelsag-m18-ccs55-0-milwaukee${utm(CAMP5, "milwaukee-ccs55").slice(1)}`,
      name: "SIRKELSAG M18 CCS55-0",
      brandSku: "Milwaukee",
      priceText: priceText(3475),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/52148/image/ff5a89f2-c16a-47a2-8318-c596cfdfc78a/m18_ccs55-0--hero_1.w900.jpg",
    },
    {
      url: `https://fosen-tools.no/ledlenser/116926${utm(CAMP5, "ledlenser-hf6r").slice(1)}`,
      name: "HODELYKT HF6R WORK",
      brandSku: "Zweibrüder",
      priceText: priceText(974),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/36217/image/9a206217-72f8-47d1-99eb-0f618fcc7451/productpage%2B(1).png",
    },
    {
      url: `https://fosen-tools.no/wera/123436/pipesett-1-4-tool-check-plus-1-39-deler-wera${utm(CAMP5, "wera-tool-check").slice(1)}`,
      name: "PIPESETT 1/4\" TOOL-CHECK PLUS",
      brandSku: "Wera",
      priceText: priceText(1609),
      imageUrl: "https://mc10256fosentools.blob.core.windows.net/mc10256no-multicaseteststaging-public/mc10256nomulticaseteststaging/28225/image/8ad46f48-9f81-4d0c-9ea5-b598a859415c/05049055001.w900.jpg",
    },
  ],
  content: {
    themeSlug: CAMP5,
    topBadge: "☀️ SOMMERPROSJEKT-KLAR",
    subjectLine: "Klar for sommerprosjektene? Fem favoritter herfra",
    previewText:
      "Pelican-koffert, motorkappesag, sirkelsag, hodelykt og pipesett. Fem produkter som dekker det meste av sommerprosjektene.",
    headingMain: "Klar for sommerprosjektene",
    headingSub: "Fem favoritter for bygget, hytta og verkstedet",
    ingress:
      "Sommeren er prosjekt-tid. Vi har plukket fem produkter fra fem ulike " +
      "merker som dekker det meste av hva du trenger, fra robust oppbevaring " +
      "til kraftmaskiner og presisjonsverktøy.",
    midtTitle: "FERIE ELLER FAGJOBB?",
    midtBody:
      "Vi holder åpent hele sommeren på Brekstad. Industrigata 1, mandag–fredag " +
      "07:00–15:00. Trenger du noe spesielt? Ring oss på 72 51 51 20.",
    midtCtaText: "Se sortimentet",
    midtCtaUrl: `https://fosen-tools.no/${utm(CAMP5, "midt-cta")}`,
    preferredManufacturers: [],
    productKeywords: ["sommer"],
  },
  showFridayPost: true,
  showMidtCta: true,
  hideJubileumBanner: true,
  jubileumFooterText: JUBILEUM_FOOTER,
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
    midtImageUrl: utgave.midtImageUrlOverride
      ?? "https://fosen-tools.no/userfiles/image/HDFI/HDFI-svart-bedre.jpg",
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

// Slett gamle versjoner (alle titler vi har brukt tidligere for utgavene 2–5)
const obsoleteTitles = [
  "UTGAVE 2/5: Soudal, Halder og Picard, tre fagmerker (9. juni)",
  "UTGAVE 2/5: 5 toppselgere fra messen (9. juni)",
  "UTGAVE 3/5: Facom, Husqvarna og Snap-on, premium-merker (16. juni)",
  "UTGAVE 3/5: Soudal, Halder og Picard, tre fagmerker (16. juni)",
  "UTGAVE 4/5: Reminder, 3 dager igjen til jubileet (23. juni)",
  "UTGAVE 4/5: 3 dager igjen + spesielle gjester (23. juni)",
  "UTGAVE 5/5: Takk for jubileet (30. juni)",
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
