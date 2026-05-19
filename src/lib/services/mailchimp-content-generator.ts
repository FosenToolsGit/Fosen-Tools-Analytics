/**
 * MailchimpContentGenerator — mønster-basert generering av nyhetsbrev-innhold.
 * Tar et tema-input og produserer alt: subjectLine, ingress, midtseksjon, produkt-filter.
 */

import type { NewsletterInput, NewsletterProduct } from "./mailchimp-builder";

export type ThemeCategory =
  | "momentnokkel"
  | "milwaukee"
  | "manufacturer"
  | "hjulskift"
  | "verktoyvogn"
  | "skreddersom"
  | "product-category"
  | "general";

export interface GeneratedContent {
  themeSlug: string;
  topBadge: string;
  subjectLine: string;
  previewText: string;
  headingMain: string;
  headingSub: string;
  ingress: string;
  midtTitle: string;
  midtBody: string;
  midtCtaText: string;
  midtCtaUrl: string;
  preferredManufacturers: string[];
  productKeywords: string[];
}

const MONTH_NB = [
  "januar", "februar", "mars", "april", "mai",
  "juni", "juli", "august", "september", "oktober",
  "november", "desember",
];

function currentMonth(): string {
  return MONTH_NB[new Date().getMonth()];
}

const KNOWN_MANUFACTURERS = new Set([
  "wera", "knipex", "stahlwille", "snap-on", "snap on", "facom",
  "ledlenser", "pelicase", "hellberg", "husqvarna", "bahco",
  "leatherman", "mitutoyo", "rennsteig", "brockhaus", "brockhaus heuer",
  "kc tools", "sumake", "hultafors", "bondhus", "lista", "viking arm",
  "fluke", "zarges", "solid gear", "gigant", "gedore",
  "pb swiss tools", "mora", "halder", "irwin",
]);

/**
 * Autoritativ liste over alle 37 kategorier fra ProductMenu på fosen-tools.no.
 */
const PRODUCT_CATEGORIES: Array<{
  pattern: RegExp;
  slug: string;
  plural: string;
  singular: string;
}> = [
  { pattern: /\barbeidskl(ær|aer)\b/i, slug: "arbeidsklær", plural: "arbeidsklær", singular: "arbeidstøy" },
  { pattern: /\bbatteriverkt(øy|oy)\b/i, slug: "batteriverktøy", plural: "batteriverktøy", singular: "batteriverktøy" },
  { pattern: /\bbatterier?\b/i, slug: "batterier", plural: "batterier", singular: "batteri" },
  { pattern: /\bbrekkjern\b/i, slug: "brekkjern-og-maskinspett", plural: "brekkjern og maskinspett", singular: "brekkjern" },
  { pattern: /\bmaskinspett\b/i, slug: "brekkjern-og-maskinspett", plural: "brekkjern og maskinspett", singular: "maskinspett" },
  { pattern: /\bcontainer(e|er)?\b/i, slug: "containere", plural: "containere", singular: "container" },
  { pattern: /\b(dor|meisel)\b/i, slug: "dor-og-meisel", plural: "dor og meisel", singular: "dor" },
  { pattern: /\bfallsikring\b/i, slug: "fallsikring", plural: "fallsikring", singular: "fallsikring" },
  { pattern: /\bfiler?\b/i, slug: "filer-og-skraper", plural: "filer og skraper", singular: "fil" },
  { pattern: /\bskrape?r?\b/i, slug: "filer-og-skraper", plural: "skraper", singular: "skraper" },
  { pattern: /\bgaveartikler?\b/i, slug: "gaveartikler", plural: "gaveartikler", singular: "gaveartikkel" },
  { pattern: /\bhammere?\b/i, slug: "hammere", plural: "hammere", singular: "hammer" },
  { pattern: /\b(håndsag|baufil)\b/i, slug: "håndsag-og-baufil", plural: "håndsager og baufiler", singular: "håndsag" },
  { pattern: /\bsag(er)?\b/i, slug: "håndsag-og-baufil", plural: "sager", singular: "sag" },
  { pattern: /\binnredning\b/i, slug: "innredning", plural: "innredning", singular: "innredning" },
  { pattern: /\binspeksjon(sverktøy)?\b/i, slug: "inspeksjonsverktøy", plural: "inspeksjonsverktøy", singular: "inspeksjonsverktøy" },
  { pattern: /\b(skjære|stanse)verkt(øy|oy)\b/i, slug: "skjære-og-stanseverktøy", plural: "skjære- og stanseverktøy", singular: "skjæreverktøy" },
  { pattern: /\bkniv(er)?\b/i, slug: "skjære-og-stanseverktøy", plural: "kniver", singular: "kniv" },
  { pattern: /\bsaks(er)?\b/i, slug: "skjære-og-stanseverktøy", plural: "sakser", singular: "saks" },
  { pattern: /\bloddeverkt(øy|oy)\b/i, slug: "loddeverktøy", plural: "loddeverktøy", singular: "loddebolt" },
  { pattern: /\blodd(e|ing)?\b/i, slug: "loddeverktøy", plural: "loddeverktøy", singular: "loddebolt" },
  { pattern: /\blysutstyr\b/i, slug: "lysutstyr", plural: "lysutstyr", singular: "lampe" },
  { pattern: /\blykter?\b/i, slug: "lysutstyr", plural: "lykter", singular: "lykt" },
  { pattern: /\bløft\b/i, slug: "løft-og-last", plural: "løft og last", singular: "løfteutstyr" },
  { pattern: /\bmaskintilbehør\b/i, slug: "maskintilbehør", plural: "maskintilbehør", singular: "tilbehør" },
  { pattern: /\bmomentverkt(øy|oy)\b/i, slug: "momentverktøy", plural: "momentverktøy", singular: "momentverktøy" },
  { pattern: /\b(moment|klikk|nøkk)/i, slug: "momentverktøy", plural: "momentverktøy", singular: "momentnøkkel" },
  { pattern: /\b(måle|merking)\b/i, slug: "måling-og-merking", plural: "måle- og merkeverktøy", singular: "måleverktøy" },
  { pattern: /\b(skyvelære|målebånd|vater)\b/i, slug: "måling-og-merking", plural: "måleverktøy", singular: "måleverktøy" },
  { pattern: /\bnøkler?\b/i, slug: "nøkler", plural: "nøkler", singular: "nøkkel" },
  { pattern: /\b(fastnøkler|ringnøkler)\b/i, slug: "nøkler", plural: "nøkler", singular: "nøkkel" },
  { pattern: /\boppbevaring\b/i, slug: "oppbevaring", plural: "oppbevaring", singular: "oppbevaring" },
  { pattern: /\bpipe(r|sett)?\b/i, slug: "piper-og-skraller", plural: "piper og skraller", singular: "pipe" },
  { pattern: /\bskraller?\b/i, slug: "piper-og-skraller", plural: "skraller", singular: "skralle" },
  { pattern: /\bredskap(er)?\b/i, slug: "redskap", plural: "redskap", singular: "redskap" },
  { pattern: /\bskrustikker?\b/i, slug: "skrustikker", plural: "skrustikker", singular: "skrustikke" },
  { pattern: /\bskrutrekker(e)?\b/i, slug: "skrutrekkere", plural: "skrutrekkere", singular: "skrutrekker" },
  { pattern: /\bstige(r)?\b/i, slug: "stiger-og-plattformer", plural: "stiger og plattformer", singular: "stige" },
  { pattern: /\bplattform(er)?\b/i, slug: "stiger-og-plattformer", plural: "stiger og plattformer", singular: "plattform" },
  { pattern: /\btenge?r?\b/i, slug: "tenger", plural: "tenger", singular: "tang" },
  { pattern: /\btrykkluft(verktøy)?\b/i, slug: "trykkluftverktøy", plural: "trykkluftverktøy", singular: "trykkluftverktøy" },
  { pattern: /\butleie\b/i, slug: "utleie", plural: "utleie-utstyr", singular: "utleie" },
  { pattern: /\bverksted\b/i, slug: "verksted", plural: "verkstedutstyr", singular: "verkstedutstyr" },
  { pattern: /\b(elbil|ev|elektrisk bil)\b/i, slug: "verktøy-elbil", plural: "verktøy for elbil", singular: "elbilverktøy" },
  { pattern: /\bvde\b/i, slug: "verktøy-elbil", plural: "VDE-verktøy", singular: "VDE-verktøy" },
  { pattern: /\bverktøykoffert(er)?\b/i, slug: "verktøykoffert", plural: "verktøykoffert", singular: "verktøykoffert" },
  { pattern: /\bverktøysett\b/i, slug: "verktøysett", plural: "verktøysett", singular: "verktøysett" },
  { pattern: /\bverktøyvogn(er)?\b/i, slug: "verktøyvogner", plural: "verktøyvogner", singular: "verktøyvogn" },
  { pattern: /\bverneutstyr\b/i, slug: "verneutstyr", plural: "verneutstyr", singular: "verneutstyr" },
  { pattern: /\b(hjelm|hansker|hørselvern|vernebriller)\b/i, slug: "verneutstyr", plural: "verneutstyr", singular: "verneutstyr" },
  { pattern: /\btvinger?\b/i, slug: "tvinger", plural: "tvinger", singular: "tvinge" },
  { pattern: /\bdrill(er|maskin)?\b/i, slug: "batteriverktøy", plural: "drillmaskiner", singular: "drill" },
  { pattern: /\bborhammer(e)?\b/i, slug: "batteriverktøy", plural: "borhammere", singular: "borhammer" },
];

export function findProductCategory(themeInput: string) {
  const t = themeInput.toLowerCase().trim();
  for (const cat of PRODUCT_CATEGORIES) {
    if (cat.pattern.test(t)) return cat;
  }
  return null;
}

function detectCategory(themeInput: string): ThemeCategory {
  const t = themeInput.toLowerCase().trim();
  if (!t) return "general";
  if (/(moment|klikk|nøkk)/.test(t)) return "momentnokkel";
  if (/hjul/.test(t)) return "hjulskift";
  if (/(vogn|verktøyskap|verktoyskap|hdfi|skreddersøm|skreddersom|custom)/.test(t))
    return "skreddersom";
  if (t === "milwaukee" || t === "milwaukee tools") return "milwaukee";
  if (KNOWN_MANUFACTURERS.has(t.replace("-", " "))) return "manufacturer";
  if (findProductCategory(t)) return "product-category";
  return "general";
}

/**
 * Smart-parser for sammensatte tema-input som "Vårkampanje på Husqvarna" eller
 * "Hammere fra Wera 25% av". Henter ut alle komponenter samtidig.
 */
export interface ParsedTheme {
  /** Eksakt input fra bruker */
  raw: string;
  /** Detektert produsent (lowercase slug) — hvis tilstede */
  manufacturer?: string;
  /** Vakker fremvisningsversjon av produsent ("Husqvarna") */
  manufacturerDisplay?: string;
  /** Detektert produkt-kategori (slug + plural/singular) */
  productCategory?: { slug: string; plural: string; singular: string };
  /** Sesong-hint: vår/sommer/høst/vinter */
  seasonHint?: "vår" | "sommer" | "høst" | "vinter";
  /** True hvis kampanje/rabatt-ord finnes */
  kampanjeHint?: boolean;
  /** Rabatt-prosent funnet i tema (f.eks. "20%") */
  pctInTheme?: number;
}

const MANUFACTURERS_DISPLAY: Record<string, string> = {
  milwaukee: "Milwaukee", wera: "Wera", knipex: "Knipex", stahlwille: "Stahlwille",
  "snap-on": "Snap-on", facom: "Facom", ledlenser: "Ledlenser", pelicase: "Pelicase",
  hellberg: "Hellberg", husqvarna: "Husqvarna", bahco: "Bahco", leatherman: "Leatherman",
  mitutoyo: "Mitutoyo", rennsteig: "Rennsteig", brockhaus: "Brockhaus Heuer",
  "kc-tools": "KC Tools", sumake: "Sumake", hultafors: "Hultafors", bondhus: "Bondhus",
  lista: "Lista", "viking-arm": "Viking Arm", fluke: "Fluke", zarges: "Zarges",
  "solid-gear": "Solid Gear", gigant: "Gigant", gedore: "Gedore",
  "pb-swiss-tools": "PB Swiss Tools", mora: "Mora of Sweden", halder: "Halder", irwin: "Irwin",
};

export function parseTheme(input: string): ParsedTheme {
  const raw = input.trim();
  const t = raw.toLowerCase();
  const parsed: ParsedTheme = { raw };

  if (!t) return parsed;

  // 1) Manufacturer-deteksjon (ord-grenser så "wera" ikke matcher "weracid")
  for (const mfr of Object.keys(MANUFACTURERS_DISPLAY)) {
    const word = mfr.replace("-", " ");
    const re = new RegExp(`\\b${word.replace(/\s+/g, "[\\s-]?")}\\b`, "i");
    if (re.test(t)) {
      parsed.manufacturer = mfr;
      parsed.manufacturerDisplay = MANUFACTURERS_DISPLAY[mfr];
      break;
    }
  }

  // 2) Produkt-kategori
  const pc = findProductCategory(t);
  if (pc) parsed.productCategory = { slug: pc.slug, plural: pc.plural, singular: pc.singular };

  // 3) Sesong-hint
  if (/\b(vår|vaar|vårkampanje|vaarkampanje|påske|paaske)\b/i.test(t)) parsed.seasonHint = "vår";
  else if (/\b(sommer|sommerkampanje|ferie)\b/i.test(t)) parsed.seasonHint = "sommer";
  else if (/\b(høst|host|høstkampanje|hostkampanje)\b/i.test(t)) parsed.seasonHint = "høst";
  else if (/\b(vinter|vinterkampanje|jul|julekampanje|advent)\b/i.test(t)) parsed.seasonHint = "vinter";

  // 4) Kampanje/rabatt-hint
  if (/\b(kampanje|rabatt|tilbud|sale|salg|outlet|spar)\b/i.test(t)) parsed.kampanjeHint = true;

  // 5) Rabatt-prosent i tema (f.eks. "25%", "-20 %")
  const pctMatch = t.match(/(\d{1,2})\s*%/);
  if (pctMatch) {
    const pct = parseInt(pctMatch[1], 10);
    if (pct >= 5 && pct <= 90) parsed.pctInTheme = pct;
  }

  return parsed;
}

function pickVariant<T>(items: T[], variant: number): T {
  return items[variant % items.length];
}

export type FocusType = "rabatt" | "kvalitet" | "nyhet" | "sesong" | "annet";

export interface ContentOptions {
  focus?: FocusType;
  discountPct?: number;
  extraContext?: string;
}

export function generateContent(
  themeInput: string,
  variant: number = 0,
  options: ContentOptions = {}
): GeneratedContent {
  const parsed = parseTheme(themeInput);
  const base = generateBaseContent(themeInput, variant);
  const withCombo = applyParsedTheme(base, parsed);

  // Auto-overstyringer fra parsed tema:
  // - Hvis tema inneholder kampanje/rabatt-ord OG ingen eksplisitt focus er valgt
  //   (eller fokus=kvalitet som er default), aktiver rabatt-fokus
  // - Hvis tema har "%X" og ikke discountPct er gitt, bruk det
  const inferredFocus: FocusType | undefined =
    !options.focus || options.focus === "kvalitet"
      ? parsed.kampanjeHint
        ? "rabatt"
        : parsed.seasonHint
        ? "sesong"
        : undefined
      : undefined;
  const effectiveOptions: ContentOptions = {
    focus: options.focus ?? inferredFocus,
    discountPct: options.discountPct ?? parsed.pctInTheme,
    extraContext: options.extraContext,
  };

  return applyFocusAndContext(withCombo, effectiveOptions);
}

/**
 * Hvis parser fant BÅDE manufacturer og productCategory, kombiner dem
 * til et samlet tema (f.eks. "Husqvarna hammere"). Hvis bare manufacturer
 * finnes utenfor base-templaten (f.eks. base var generelt "hammere"), legg på.
 */
function applyParsedTheme(base: GeneratedContent, parsed: ParsedTheme): GeneratedContent {
  // Hvis ingen manufacturer er detektert, behold base som-er
  if (!parsed.manufacturer || !parsed.manufacturerDisplay) return base;

  const mfrDisplay = parsed.manufacturerDisplay;
  const mfrSlug = parsed.manufacturer;
  const result = { ...base };

  // Tilfelle 1: base er product-category (hammere/skrutrekkere/etc.) → legg på manufacturer
  if (parsed.productCategory) {
    const pc = parsed.productCategory;
    result.themeSlug = `${mfrSlug}-${pc.slug}-${MONTH_NB[new Date().getMonth()]}`;
    result.topBadge = `${mfrDisplay.toUpperCase()} ${pc.plural.toUpperCase()}`;
    // Milwaukee-mønster: "Milwaukee momentnøkler er her" (fortelling) + kort under-tekst
    result.subjectLine = `🔧 ${mfrDisplay} ${pc.plural} er her`;
    result.headingMain = `${mfrDisplay} ${pc.plural} er her`;
    result.headingSub = `plukket utvalg`;
    result.previewText = `Plukket utvalg ${pc.plural} fra ${mfrDisplay} — alt for daglig bruk.`;
    // KORT ingress (max 2 setninger, milwaukee-modell)
    result.ingress = `${mfrDisplay} ${pc.plural} fra ${pc.singular}-arbeid til tyngre oppgaver. Alle valgt for kvalitet og holdbarhet.`;
    result.midtTitle = `${mfrDisplay} — våre anbefalinger`;
    result.midtBody = `${mfrDisplay} er en av de etablerte navnene vi anbefaler i ${pc.plural}. Bygd for daglig bruk i verksted og industri.`;
    result.midtCtaText = `SE ALLE ${pc.plural.toUpperCase()} FRA ${mfrDisplay.toUpperCase()}`;
    result.midtCtaUrl = `https://fosen-tools.no/produkter/${encodeURI(pc.slug)}`;
    result.preferredManufacturers = [mfrSlug];
    result.productKeywords = [pc.singular, pc.plural];
    return result;
  }

  // Tilfelle 2: bare manufacturer
  // Milwaukee-mønster: punchy hovedtittel + kort ingress + logo-fokus
  result.themeSlug = `${mfrSlug}-${MONTH_NB[new Date().getMonth()]}`;
  result.topBadge = mfrDisplay.toUpperCase();
  result.subjectLine = `🔧 Nytt utvalg fra ${mfrDisplay}`;
  result.previewText = `Plukket utvalg fra ${mfrDisplay} — populært akkurat nå.`;
  result.headingMain = `${mfrDisplay} er her`;
  result.headingSub = "plukket utvalg";
  // KORT ingress — milwaukee-modell
  result.ingress = `Vi har samlet de mest populære produktene fra ${mfrDisplay}. Alt bygd for daglig bruk i verksted og industri.`;
  result.midtTitle = `${mfrDisplay} — våre anbefalinger`;
  result.midtBody = `${mfrDisplay} er en av de etablerte navnene i Fosen Tools-katalogen. Vi anbefaler dem til kunder som vil ha kvalitet over kort levetid.`;
  result.midtCtaText = `SE ALLE ${mfrDisplay.toUpperCase()}-PRODUKTER`;
  result.midtCtaUrl = `https://fosen-tools.no/${mfrSlug}`;
  result.preferredManufacturers = [mfrSlug];
  result.productKeywords = [];
  return result;
}

function generateBaseContent(
  themeInput: string,
  variant: number = 0
): GeneratedContent {
  const cat = detectCategory(themeInput);
  const month = currentMonth();
  const cleanInput = themeInput.toLowerCase().trim();

  if (cat === "momentnokkel") {
    return {
      themeSlug: `momentnokkel-milwaukee-${month}`,
      topBadge: "MILWAUKEE TILBUD",
      subjectLine: pickVariant(
        [
          "🔧 Riktig moment, første klikk — 20% av",
          "🔧 Klikket som forteller deg at det stemmer",
          "🔧 Verkstedets klikk-klassiker — 20% av",
          "🔧 Riktig moment, riktig hver gang",
        ],
        variant
      ),
      previewText: pickVariant(
        [
          "Dot-klikk-momentnøkler fra finmek til hjulbolter. Hele spekteret 20% rabatt.",
          'Fra 1/4" finmek til 1/2" hjulbolter — 5 til 340 Nm dekker det meste.',
          "Klikker når momentet er nådd, hver eneste gang. 20% på hele spekteret.",
        ],
        variant
      ),
      headingMain: pickVariant(
        ["Verkstedets klikk-klassiker", "Riktig moment, første klikk", "Klikket du kan stole på"],
        variant
      ),
      headingSub: pickVariant(
        ["hele spekteret 20% av", "Milwaukee 20% av", "20% på alle drive-størrelser"],
        variant
      ),
      ingress: pickVariant(
        [
          'Fem Milwaukee dot-klikk-momentnøkler fra 1/4" til 1/2" drive. 5 til 340 Nm dekker det meste mellom elektronikk-skruer og motor-/hjulbolter.',
          "Milwaukee-momentnøkler i klikkmekanikk — fra 5 Nm finmek til 340 Nm hjulbolter. 20% rabatt på alle.",
          'Hele momentspekteret fra Milwaukee — 1/4" til 1/2" drive, dot-klikk med lyd og taktil tilbakemelding. 20% av.',
        ],
        variant
      ),
      midtTitle: "Hvilken Nm-rangering trenger du?",
      midtBody:
        '1/4" 5–25 Nm til elektronikk, instrumenter og finmek. 3/8" 10–140 Nm til motorsykler, sykler og lett mekanikk. 1/2" 40–340 Nm til hjulbolter, motor- og chassis-arbeid. Bom på en, og enten knekker du bolten eller skrur du for løst.',
      midtCtaText: "SE HELE UTVALGET",
      midtCtaUrl: "https://fosen-tools.no/produkter/momentverkt%C3%B8y/momentn%C3%B8kkel",
      preferredManufacturers: ["milwaukee"],
      productKeywords: ["momentnøkkel", "moment"],
    };
  }

  if (cat === "milwaukee") {
    return {
      themeSlug: `milwaukee-${month}`,
      topBadge: "MILWAUKEE TILBUD",
      subjectLine: pickVariant(
        [
          "🔴 Milwaukee — den røde standarden",
          "🔴 Made for the trades — Milwaukee Tools",
          "🔴 Milwaukee — verktøy som tar arbeidsdagen din",
        ],
        variant
      ),
      previewText: "Profesjonelt Milwaukee-verktøy — bygd for industri, godkjent av verksted.",
      headingMain: "Milwaukee — den røde standarden",
      headingSub: "i hverdagen din",
      ingress:
        "Milwaukee Tool har vært den profesjonelles førstevalg i USA i over 100 år. Hos Fosen Tools fører vi hele kjernekatalogen — fra håndverktøy til M12/M18-batteripakker.",
      midtTitle: "Hvorfor Milwaukee?",
      midtBody:
        "Milwaukee bygger verktøy for de som skrur, sliper, kapper og borer hver dag. Robust kabinett, garanti som dekker bruk i industrien, og et batterisystem (M12, M18, MX FUEL) som dekker alt fra elektriker-skap til betongkjernebor.",
      midtCtaText: "SE ALLE MILWAUKEE-PRODUKTER",
      midtCtaUrl: "https://fosen-tools.no/milwaukee",
      preferredManufacturers: ["milwaukee"],
      productKeywords: [],
    };
  }

  if (cat === "hjulskift") {
    return {
      themeSlug: `hjulskift-${month}`,
      topBadge: "VÅRBIL-KAMPANJE",
      subjectLine: "🛞 Vårbilen ut — riktig moment før hjulene snurrer",
      previewText: "Momentnøkler, krysstrekker og hjulskifte-utstyr til norsk vår.",
      headingMain: "Vårbilen ut",
      headingSub: "riktig moment før hjulene snurrer",
      ingress:
        "Mai betyr sommerdekk og hjulskifte. Riktig moment på hjulboltene er ikke valgfritt — for lavt og hjulet kan løsne, for høyt og du knekker bolten eller forvrenger bremseskiven.",
      midtTitle: "Hva trenger du for trygt hjulskifte?",
      midtBody:
        'Momentnøkkel 40–200 Nm (vanlige biler), 1/2" pipenøkler i 17–22 mm, krysstrekker for å bryte rust, og et godt kryssjakk-stativ. Bruk alltid moment-spesifikasjon fra bilfabrikanten — IKKE øye-mål.',
      midtCtaText: "SE HJULSKIFTE-UTVALGET",
      midtCtaUrl: "https://fosen-tools.no/produkter/momentverkt%C3%B8y",
      preferredManufacturers: ["milwaukee", "facom", "stahlwille", "wera"],
      productKeywords: ["moment", "pipe", "kryss"],
    };
  }

  if (cat === "skreddersom") {
    return {
      themeSlug: `skreddersom-${month}`,
      topBadge: "HDFI / CUSTOM",
      subjectLine: "Skreddersydd — verktøy som passer akkurat ditt verksted",
      previewText: "HDFI fra CADLAB. Verktøyvogner og custom-koffert med segmentert plass.",
      headingMain: "Skreddersydd ditt verksted",
      headingSub: "klart til levering",
      ingress:
        "Hvert HDFI-innlegg vi sender ut er CADLAB-tegnet for kundens faktiske oppgaver. Resultat: hvert verktøy får sin egen plass, ingen FOD, lynrask kontroll.",
      midtTitle: 'HDFI — "Fosen Tools-standard"',
      midtBody:
        "Hver Custom-verktøyvogn som forlater Fosen Tools har et innlegg CADLAB-en vår har tegnet. Hvert verktøy får sin egen plass, ingen FOD, og lynrask kontroll — Forsvaret kaller det «Fosen Tools-standarden».",
      midtCtaText: "LES MER OM HDFI",
      midtCtaUrl: "https://fosen-tools.no/hdfi",
      preferredManufacturers: ["fosen-tools-custom", "fosen-tools"],
      productKeywords: ["vogn", "koffert", "hdfi"],
    };
  }

  if (cat === "product-category") {
    const pc = findProductCategory(themeInput);
    if (pc) {
      const capPlural = pc.plural.charAt(0).toUpperCase() + pc.plural.slice(1);
      return {
        themeSlug: `${pc.slug}-${month}`,
        topBadge: capPlural.toUpperCase(),
        subjectLine: pickVariant(
          [
            `🔧 ${capPlural} fra Fosen Tools`,
            `🔧 Hele ${pc.plural}-utvalget — plukket av oss`,
            `🔧 ${capPlural} for proff bruk`,
          ],
          variant
        ),
        previewText: pickVariant(
          [
            `Plukket utvalg av ${pc.plural} — fra premium-merker og daglig-brukbart.`,
            `${capPlural} til verksted, industri og hjemme. Topp-utvalget vårt akkurat nå.`,
            `${capPlural} som tåler arbeidsdagen — fra mekanikere til kalibrerings-verksted.`,
          ],
          variant
        ),
        headingMain: pickVariant(
          [capPlural, `${capPlural} for proff bruk`, `Plukket ${pc.plural}-utvalg`],
          variant
        ),
        headingSub: pickVariant(
          [`fra Fosen Tools`, `du kan stole på`, `for hverdagen i verksted`],
          variant
        ),
        ingress: pickVariant(
          [
            `Et plukket utvalg av ${pc.plural} fra de mest etablerte merkene vi fører — basert på faktiske besøk og klikks fra forrige nyhetsbrev.`,
            `${capPlural} til daglig bruk i verksted, industri og hjemme. Alle valgt for kvalitet og holdbarhet.`,
            `Vi har samlet ${pc.plural} fra topp-merker — fra finarbeid til tunge oppgaver.`,
          ],
          variant
        ),
        midtTitle: pickVariant(
          [
            `Riktig ${pc.singular} til riktig oppgave`,
            `Hvorfor kvalitet teller i ${pc.plural}`,
            `${capPlural} som blir brukt`,
          ],
          variant
        ),
        midtBody: pickVariant(
          [
            `Det er forskjell på en ${pc.singular} som ligger i skuffen og en som er på arbeidsbordet hver dag. Vi anbefaler etablerte merker med dokumentert holdbarhet — Wera, Knipex, Stahlwille, Milwaukee og andre — som gir samme kvalitet etter tusen bruk.`,
            `Fosen Tools har levert ${pc.plural} til verksted, forsvar og industri i 25 år. Vi vet hvilke som tåler dag-til-dag-bruk og hvilke som ender i skuffen etter første jobb.`,
            `Riktig ${pc.singular} er forskjellen på et bra arbeid og et som må gjøres om. Vi har plukket utvalg fra premium-merkene som tåler norsk arbeidsmiljø.`,
          ],
          variant
        ),
        midtCtaText: `SE HELE ${capPlural.toUpperCase()}-UTVALGET`,
        midtCtaUrl: `https://fosen-tools.no/produkter/${encodeURI(pc.slug)}`,
        preferredManufacturers: [],
        productKeywords: [pc.singular, pc.plural],
      };
    }
  }

  if (cat === "manufacturer") {
    const manufacturer = cleanInput.replace("-", " ");
    const slug = manufacturer.replace(/\s+/g, "-");
    const displayName = manufacturer.charAt(0).toUpperCase() + manufacturer.slice(1);
    return {
      themeSlug: `${slug}-${month}`,
      topBadge: displayName.toUpperCase(),
      subjectLine: `Produsent-spotlight: ${displayName}`,
      previewText: `Plukket utvalg fra ${displayName} — hva som selger best akkurat nå.`,
      headingMain: displayName,
      headingSub: "plukket utvalg",
      ingress: `Vi har samlet de mest populære produktene fra ${displayName} — alle med solide tall fra både nettsiden og forrige nyhetsbrev.`,
      midtTitle: `Hvorfor ${displayName}?`,
      midtBody: `${displayName} er en av de etablerte navnene i Fosen Tools-katalogen. Vi anbefaler dem til kunder som vil ha kvalitet over kort levetid.`,
      midtCtaText: `SE ALLE ${displayName.toUpperCase()}-PRODUKTER`,
      midtCtaUrl: `https://fosen-tools.no/${slug}`,
      preferredManufacturers: [slug],
      productKeywords: [],
    };
  }

  // General fallback
  return {
    themeSlug: `ftnett-${month}`,
    topBadge: "NYHETSBREV",
    subjectLine: "Nyheter fra Fosen Tools",
    previewText: "Plukket utvalg fra katalogen — populært akkurat nå.",
    headingMain: "Plukket utvalg",
    headingSub: "fra Fosen Tools",
    ingress:
      "Vi har samlet det mest populære fra katalogen — basert på faktiske side-besøk og klikks fra forrige utsendelse.",
    midtTitle: "Skreddersøm når du trenger det",
    midtBody:
      "Fosen Tools er mer enn katalog-salg. Vi tegner HDFI-skuminnlegg i vår egen CADLAB, leverer ferdig-pakkede Custom-vogner, og kalibrerer instrumenter. Aviation, forsvar og industri kaller det «Fosen Tools-standarden».",
    midtCtaText: "BLI KJENT MED OSS",
    midtCtaUrl: "https://fosen-tools.no/",
    preferredManufacturers: [],
    productKeywords: [],
  };
}

/**
 * Justerer generert content basert på fokus-type, rabatt-prosent og ekstra kontekst.
 * Beholder de andre feltene fra base-template, men overstyrer subjectLine/preview/headingSub/ingress/midt med fokus-spesifikk vinkling.
 */
function applyFocusAndContext(
  base: GeneratedContent,
  opts: ContentOptions
): GeneratedContent {
  const result = { ...base };
  const focus = opts.focus ?? "kvalitet";
  const ctx = opts.extraContext?.trim() ?? "";
  const pct = opts.discountPct;

  // === RABATT-fokus (Milwaukee-mønster: brand-narrativ + kort ingress) ===
  if (focus === "rabatt") {
    const pctText = pct ? `${pct}%` : "tilbud";

    // Hovedtittel: behold brand-narrativ (f.eks. "Husqvarna er her") UENDRET
    // Undertittel: prosent + fordel
    result.headingSub = pct ? `${pct}% på hele spekteret` : "kampanje-tilbud";

    // Subject: forsøk å bygge punchy "{brand-narrativ} — {pct}% av"-format
    // Hvis base.subjectLine allerede har "—", erstatt etter-deler
    if (base.subjectLine.includes(" — ") || base.subjectLine.includes(" – ")) {
      result.subjectLine = base.subjectLine.replace(/\s*[—–-]\s*.*$/, ` — ${pctText} av`);
    } else {
      result.subjectLine = `${base.subjectLine} — ${pctText} av`;
    }

    result.previewText = pct
      ? `${pct}% rabatt på utvalget. Tidsbegrenset.`
      : `Kampanje-tilbud akkurat nå.`;

    // KORT ingress (1-2 setninger, milwaukee-modell)
    // Behold ikke base.ingress siden den er ofte lang
    result.ingress = pct
      ? `Vi tilbyr ${pct}% rabatt på ${base.headingMain.toLowerCase()}. Tidsbegrenset kampanje.`
      : `Kampanje på utvalget akkurat nå. ${trimToSentences(base.ingress, 1)}`;
    if (ctx) result.ingress = `${ctx}. ${result.ingress}`;

    result.topBadge = pct ? `${pct}% RABATT` : "KAMPANJE";
    return result;
  }

  // === KVALITET-fokus (default) ===
  if (focus === "kvalitet") {
    result.previewText = `Plukket utvalg av etablerte merker — bygd for daglig bruk.`;
    // Kort ingress (max 2 setninger)
    result.ingress = ctx
      ? `${trimToSentences(base.ingress, 1)} ${ctx}.`
      : trimToSentences(base.ingress, 2);
    return result;
  }

  // === NYHET-fokus ===
  if (focus === "nyhet") {
    result.subjectLine = `🆕 Nye i sortimentet: ${base.headingMain}`;
    result.previewText = `Helt nye produkter i Fosen Tools-katalogen.`;
    result.headingSub = "nye i sortimentet";
    result.topBadge = "NYHETER";
    result.ingress = ctx
      ? `Nye produkter i sortimentet. ${ctx}.`
      : `Vi har plukket inn nye produkter i sortimentet.`;
    return result;
  }

  // === SESONG-fokus ===
  if (focus === "sesong") {
    const month = MONTH_NB[new Date().getMonth()];
    result.previewText = `Sesongplukk for ${month} — det folk rekker etter akkurat nå.`;
    result.topBadge = `SESONG: ${month.toUpperCase()}`;
    result.ingress = ctx
      ? `${ctx}. ${trimToSentences(base.ingress, 1)}`
      : `Sesongaktuelt utvalg for ${month}.`;
    return result;
  }

  // === ANNET — fri kontekst styrer alt ===
  if (focus === "annet") {
    if (ctx) {
      result.previewText = ctx.length > 100 ? `${ctx.slice(0, 97)}...` : ctx;
      result.ingress = `${ctx}. ${base.ingress}`;
    }
    return result;
  }

  return result;
}

export function suggestThemes(
  recentThemeSlugs: string[] = []
): Array<{ themeInput: string; label: string; reason: string }> {
  const month = new Date().getMonth();
  const ideas: Array<{ themeInput: string; label: string; reason: string }> = [];

  if (month >= 2 && month <= 5) {
    ideas.push({ themeInput: "hjulskift", label: "Hjulskift / vårbil", reason: "Mai/juni er hjulskift-sesong" });
    ideas.push({ themeInput: "momentnøkkel", label: "Momentnøkler", reason: "Brukes mye til hjulskifte og motorvedlikehold" });
  } else if (month >= 8 && month <= 10) {
    ideas.push({ themeInput: "hjulskift", label: "Vinterdekk / hjulskift", reason: "Vinterdekk-skifte før første snøfall" });
  } else if (month === 11 || month <= 1) {
    ideas.push({ themeInput: "ledlenser", label: "LED-lykt / lommeklenser", reason: "Mørketid — lyktekategorier topper i salg" });
  }

  ideas.push({ themeInput: "milwaukee", label: "Milwaukee-spotlight", reason: "Største merke i katalogen" });
  ideas.push({ themeInput: "wera", label: "Wera-spotlight", reason: "Premium tysk skrue-/momentverktøy" });
  ideas.push({ themeInput: "stahlwille", label: "Stahlwille-spotlight", reason: "Tysk presisjon, sterk i auto/aviation" });
  ideas.push({ themeInput: "skreddersøm", label: "Skreddersøm / HDFI", reason: "FT-spesialitet, Forsvaret-standard" });

  const usedSlugRoot = recentThemeSlugs.slice(0, 5).map((s) => s.split("-")[0]);
  const filtered = ideas.filter((i) => !usedSlugRoot.some((u) => i.themeInput.includes(u)));
  return (filtered.length >= 3 ? filtered : ideas).slice(0, 5);
}

export function filterProductsForTheme<
  T extends { url: string; name: string; score: number }
>(suggestions: T[], content: GeneratedContent): T[] {
  const filtered = suggestions.filter((s) => {
    const lowerUrl = s.url.toLowerCase();
    const lowerName = s.name.toLowerCase();

    if (content.preferredManufacturers.length > 0) {
      const match = content.preferredManufacturers.some((m) => lowerUrl.includes(`/${m}/`));
      if (!match) return false;
    }

    if (content.productKeywords.length > 0) {
      const match = content.productKeywords.some(
        (k) => lowerName.includes(k.toLowerCase()) || lowerUrl.includes(k.toLowerCase())
      );
      if (!match) return false;
    }

    return true;
  });

  // Hvis vi har filter-kriterier men 0 treff: returner tom (lar API-en fallback)
  if (content.preferredManufacturers.length > 0 || content.productKeywords.length > 0) {
    return filtered;
  }
  return suggestions;
}

export function toNewsletterInput(
  content: GeneratedContent,
  products: NewsletterProduct[],
  midtImageUrl = "",
  footerImageUrl = "",
  socialInstagram = "",
  socialLinkedin = ""
): NewsletterInput {
  return {
    themeSlug: content.themeSlug,
    subjectLine: content.subjectLine,
    previewText: content.previewText,
    headingMain: content.headingMain,
    headingSub: content.headingSub,
    ingress: content.ingress,
    products,
    midtTitle: content.midtTitle,
    midtBody: content.midtBody,
    midtCtaText: content.midtCtaText,
    midtCtaUrl: content.midtCtaUrl,
    midtImageUrl,
    topBadge: content.topBadge,
    footerImageUrl,
    socialInstagramPostUrl: socialInstagram,
    socialFacebookPostUrl: "https://www.facebook.com/fosentools",
    socialLinkedinPostUrl: socialLinkedin,
  };
}

/** Behold maks N setninger fra en lang tekst. */
function trimToSentences(text: string, max: number): string {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences || sentences.length <= max) return text;
  return sentences.slice(0, max).join(" ").trim();
}
