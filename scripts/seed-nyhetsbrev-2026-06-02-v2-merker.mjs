/**
 * Tirsdag 2. juni 2026 — utgave 1, VERSJON 2 (produkt-fokus).
 *
 * Bygd om etter Erik sin tilbakemelding: ukas nyhetsbrev skal handle om de
 * tre MERKENE som lanseres samme dag (Milwaukee, Wera, Zweibrüder), ikke om
 * selve jubileums-eventet. Jubileumet er konteksten, ikke hovedhistorien.
 *
 * Forskjeller fra v1:
 *  - Tone: produkt-fokus, ikke event-/save-the-date
 *  - Subject: presenterer merkene som «tre i sortimentet», ikke «på besøk»
 *  - Per merke: hva merket er kjent for + invitasjon til sortimentet
 *  - Midtseksjon: kort, lavmælt påminnelse om åpningen 26. juni
 *  - Ingen «dagstilbud»-kommunikasjon (det er separat utsendelse)
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

// Hvert merke som et produkt-fokusert kort, ikke som «leverandør på besøk»
const editSuppliers = [
  {
    name: "Milwaukee",
    tagline: "Batteriverktøy som matcher din arbeidsdag",
    logoUrl: `${LOGO_BASE}/milwaukee.png`,
    ctaText: "Se Milwaukee-sortimentet →",
    ctaUrl: `https://fosen-tools.no/milwaukee?${UTM}&utm_content=milwaukee`,
    description:
      "M18- og M12-økosystemet gir deg over 200 maskiner som deler samme batteri og lader. " +
      "Bor- og slagdrill, vinkelslipere, sirkelsager, lykter, multiverktøy, hele veien til kompresjon og rørkutting. " +
      "Markedsledende på profesjonelt batteriverktøy.",
    logoWidth: 160,
  },
  {
    name: "Wera",
    tagline: "Tysk presisjon i håndverktøy",
    logoUrl: `${LOGO_BASE}/wera.png`,
    ctaText: "Se Wera-sortimentet →",
    ctaUrl: `https://fosen-tools.no/wera?${UTM}&utm_content=wera`,
    description:
      "Skrutrekkere med Kraftform-grep, presisjons-bits, momentnøkler og spesialverktøy. " +
      "Wera har bygd seg opp som de fagfolks førstevalg i Europa, kjent for ergonomi, slitestyrke og smarte detaljer som tar tid å forstå men umulig å gå tilbake fra.",
    logoWidth: 150,
  },
  {
    name: "Zweibrüder",
    tagline: "Profesjonelle LED-lykter",
    logoUrl: `${LOGO_BASE}/zweibruder.png`,
    ctaText: "Se Zweibrüder-sortimentet →",
    ctaUrl: `https://fosen-tools.no/zweibr%C3%BCder?${UTM}&utm_content=zweibruder`,
    description:
      "Hodelykter, hånd-lykter og arbeidslamper i tysk kvalitet. " +
      "Lang batteritid, robuste hus, høy lysstyrke når du trenger den. " +
      "Brukt av industri, redning og beredskapspersonell, men minst like nyttige i verkstedet og på hytta.",
    logoWidth: 150,
  },
];

const editContent = {
  themeSlug: "2026-06-02-tre-merker",
  topBadge: "🛠️ TRE MERKER I SORTIMENTET",
  subjectLine: "Milwaukee, Wera og Zweibrüder, tre toppmerker hos Fosen Tools",
  previewText:
    "Vi løfter frem tre av merkene vi fører: Milwaukee for batteridrevne maskiner, " +
    "Wera for tysk håndverktøy og Zweibrüder for proff-LED. Bla deg gjennom sortimentet.",
  headingMain: "Tre sterke merker",
  headingSub: "Milwaukee · Wera · Zweibrüder",
  ingress:
    "Hos Fosen Tools fører vi over 40 merker, og denne uken vil vi løfte frem tre " +
    "av dem ekstra. Milwaukee tar grunnarbeidet med batteridrevne maskiner. " +
    "Wera leverer tysk presisjon i håndverktøy. Zweibrüder gir deg lyset du trenger " +
    "når det er som mørkest. Tre veldig ulike merker, alle på lager hos oss.",
  midtTitle: "VI FYLLER 25 ÅR 26. JUNI",
  midtBody:
    "Fredag 26. juni feirer vi 25 år som leverandør av kvalitetsverktøy. " +
    "Vi har holdt på siden 2001 og åpner samme dag dørene til vår nye PROFF-butikk " +
    "på Brekstad. Du er hjertelig velkommen innom mellom 10:00 og 16:00 for å se " +
    "sortimentet, prate verktøy og hilse på teamet.",
  midtCtaText: "Les mer om besøket", // skjules av showMidtCta=false, men har en plass-holder
  midtCtaUrl: `https://fosen-tools.no/?${UTM}&utm_content=jubileum-info`,
  preferredManufacturers: ["Milwaukee", "Wera", "Zweibrüder"],
  productKeywords: ["batteri", "skrutrekker", "lykt"],
};

const wizardState = {
  themeInput: "Utgave 1 v2: Tre merker i sortimentet (produkt-fokus)",
  focus: "annet",
  discountPct: "",
  extraContext:
    "VERSJON 2 etter Erik-feedback (1. juni): Ukas nyhetsbrev skal handle om de " +
    "tre merkene Milwaukee, Wera, Zweibrüder, ikke om jubileums-eventet. " +
    "Produkt-fokus, ikke event-fokus. Jubileums-konteksten er kort omtalt i " +
    "midtseksjonen som «kom innom»-invitasjon, ingen dagstilbud-kommunikasjon. " +
    "Tone: forklarende for en kunde som ikke kjenner FT fra før.",
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
  showFridayPost: false,
  showMidtCta: false, // midtseksjonen er ren info, ingen ekstern destinasjon
};

const title = "UTGAVE 1 V2: Tre merker i sortimentet (Milwaukee, Wera, Zweibrüder)";

console.log("📧 Setter inn (eller oppdaterer) utkast V2 (produkt-fokus) for tirsdag 2. juni 2026...");

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

console.log("\n✅ Utkast V2 opprettet!");
console.log("   ID:", data.id);
console.log("   Tittel:", data.title);
console.log("\n🛠  Sammenlign med V1 («JUBILEUM 1/4…») i UI:");
console.log("   http://localhost:3001/innleggsbygger/nyhetsbrev-bygger");
console.log("   https://fosen-tools-analytics.vercel.app/innleggsbygger/nyhetsbrev-bygger");
console.log("\n📋 Vinkling V2: produkt-fokus, jubileums-info som lavmælt sub-tema");
console.log("📋 Vinkling V1: event-fokus, leverandører som besøkende");
