/**
 * Idé-motor — genererer 5-7 daglige innholdsforslag basert på:
 *
 *   1. Markedsanalysen (`memory/project_salgsanalyse_markedsstrategi_2026.md`)
 *      — kategorier, GAP-er, vinnere, omsetningsandeler
 *   2. Caption-mønstre (`feedback_social_caption_optimization.md`)
 *      — +144% lift på skreddersøm/HDFI/CADLAB, +93% på emoji-start,
 *        −94% på filosofisk forsvar-prat, tor/fre kl 12 best
 *   3. Dag-i-uka logikk (mandag = bedrift, torsdag/fredag = leveranser)
 *   4. Sesong + rytme (juni = før sommerferien, sommer-bestselgere)
 *   5. Hva som IKKE er postet siste 30 dager (cross-ref `platform_posts`)
 *
 * Output: 5-7 konkrete idéer, hver med:
 *   - tema-kategori (HDFI, aviation, FT-custom, etc)
 *   - format-anbefaling (bilde / reel / karusell)
 *   - caption-skisse
 *   - markedsdata-kontekst (hvorfor denne idéen)
 *   - destinasjon-knapper (Innleggsmaler, Innholdsmotor, Remotion)
 *
 * Designprinsipp: aldri foreslå to dager på rad det samme. Bruker dato
 * som seed til Fisher-Yates shuffle, slik at hele teamet ser samme
 * forslag samme dag.
 */

export type IdeFormat = "bilde" | "reel" | "karusell" | "story";
export type IdeKategori =
  | "hdfi-skreddersom"
  | "aviation-forsvar"
  | "ft-custom"
  | "containere"      // GAP fra markedsanalysen
  | "innredning"      // GAP — Mobilreol HI280
  | "pelican-kofferter" // GAP
  | "premium-merker"
  | "batteriverktoy"
  | "bedrift-historie"
  | "team-portrett"
  | "produkt-spotlight"
  | "kunde-leveranse"
  | "miljofyrtarn"
  | "messe-event";

export interface IdeDestinasjon {
  label: string;
  href: string;
  /** Brukes for å åpne Innleggsmaler med riktig arketype + variant pre-utfylt. */
  prefill?: Record<string, string>;
}

export interface IdeTemplate {
  id: string;
  kategori: IdeKategori;
  emoji: string;
  tittel: string;
  vinkling: string;          // 1-2 setningers beskrivelse av idéen
  format: IdeFormat;
  /** Kort caption-skisse (40-80 tegn) som starter posten. Forfatteren bygger ut. */
  caption_skisse: string;
  /** Hvorfor denne idéen — kobling til markedsanalyse. */
  markedsdata: string;
  /** Hva slags input/bilde trengs for å produsere posten. */
  trenger: string;
  /** Anbefalte destinasjoner i appen. */
  destinasjoner: IdeDestinasjon[];
  /** Dager-i-uka denne idéen passer (0=søn ... 6=lør). Tom = alle. */
  beste_dager?: number[];
}

// ─── Idé-bibliotek (utvides over tid) ────────────────────────────────
//
// Hver kategori har 3-6 variante ideer slik at sampling gir variasjon.
// Når en idé er postet, marker den (manuelt eller via platform_posts-
// match) så den ikke gjentar seg innen 30 dager.

const TEMPLATES: IdeTemplate[] = [
  // ─── HDFI/CADLAB skreddersøm (+144% lift, sterkeste driver) ────────
  {
    id: "hdfi-prosess-cadlab",
    kategori: "hdfi-skreddersom",
    emoji: "🛠️",
    tittel: "CADLAB til ferdig HDFI",
    vinkling:
      "Vis hele prosessen: CAD-tegning på skjerm, CNC-maskin i drift, " +
      "ferdig skuff med verktøy på plass. Treffer +144%-mønsteret med " +
      "skreddersøm + HDFI + CADLAB.",
    format: "reel",
    caption_skisse: "🛠️ Slik tar vi en idé fra tegning til ferdig.",
    markedsdata:
      "FT Custom + HDFI er 5.3% av oms med 48.6% DG — vår høyeste margin. " +
      "+144% engagement-lift når posten bruker «skreddersydd / HDFI / CADLAB».",
    trenger: "Video-klipp fra CADLAB, CNC-maskin og ferdig produkt (15-30 sek)",
    destinasjoner: [
      { label: "Generér i Remotion (LeveranseReel)", href: "/innleggsbygger/maler" },
      { label: "Lag bilde i Innleggsmaler", href: "/innleggsbygger/maler" },
    ],
    beste_dager: [4, 5], // tor/fre — beste posting-vindu
  },
  {
    id: "hdfi-for-etter",
    kategori: "hdfi-skreddersom",
    emoji: "🔴",
    tittel: "Før / etter: tom skuff vs HDFI",
    vinkling:
      "Karusell eller reel som viser samme skuff før (kaos) og etter (HDFI). " +
      "Vis konkret hvilke verktøy som er på plass.",
    format: "karusell",
    caption_skisse: "🔴 Samme skuff. Helt annen kontroll.",
    markedsdata:
      "Eriks vinkling fra 12. mai — den enkleste fortellingen av FT-verdien. " +
      "HDFI-siden får 11 klikk per nyhetsbrev (topp 10 Mailchimp).",
    trenger: "2 bilder av samme skuff — før HDFI og med HDFI",
    destinasjoner: [
      { label: "Lag karusell i Innholdsmotor", href: "/innholdsmotor" },
    ],
    beste_dager: [4, 5],
  },
  {
    id: "hdfi-farger",
    kategori: "hdfi-skreddersom",
    emoji: "🎨",
    tittel: "HDFI i 6 standardfarger",
    vinkling:
      "Vis hvordan ulike farger brukes til 5S-zoning, brann-sertifisering, " +
      "ESD-områder. Farger som funksjon, ikke bare dekor.",
    format: "bilde",
    caption_skisse: "🎨 Seks farger. Én standard.",
    markedsdata:
      "HDFI er +144%-driver. Farger er en del av skreddersømmen.",
    trenger: "Bilde av HDFI i ulike farger (kan generes i Innholdsmotor)",
    destinasjoner: [
      { label: "Generér i Innholdsmotor (produkt_variant)", href: "/innholdsmotor" },
    ],
  },

  // ─── Aviation/Forsvar (7.2% oms, 54.6% DG — undermarkedsført) ──────
  {
    id: "aviation-leveranse",
    kategori: "aviation-forsvar",
    emoji: "✈️",
    tittel: "Leveranse til aviation-kunde",
    vinkling:
      "«Levert til [kunde]»-format. Vis koffert/verktøyskap på vei ut " +
      "eller hos kunden. Lufttransport, Norwegian Aero, Fosen VGS Flyfag, " +
      "Widerøe — alle er gode kundenavn å vise.",
    format: "reel",
    caption_skisse: "✈️ Levert til [kunde-navn].",
    markedsdata:
      "Aviation/Forsvar custom = 7.2% av oms, men HØYESTE DG på 54.6%. " +
      "Mest lønnsom kategori, men undermarkedsført i SoMe.",
    trenger: "Bilder/video fra siste aviation-leveranse + kunde-tillatelse",
    destinasjoner: [
      { label: "Lag reel i Remotion (LeveranseReel)", href: "/innleggsbygger/maler" },
    ],
    beste_dager: [4, 5],
  },
  {
    id: "aviation-f35",
    kategori: "aviation-forsvar",
    emoji: "🛩️",
    tittel: "F-35 Engine Plug / EOR-kit",
    vinkling:
      "Kennon Products F-35 plugs er topp-3 produkt i revenue. Vis " +
      "produktet i drift, hvorfor det er kritisk, hvilke flyvåpen vi leverer til.",
    format: "bilde",
    caption_skisse: "🛩️ Når presisjonen må stemme første gang.",
    markedsdata:
      "F-35 Engine Plug (335k) + Air Intake Kit (205k) = topp 3 og 5 i revenue. " +
      "Aviation/Forsvar = 54.6% DG.",
    trenger: "Bilde av F-35-plug eller koffert, evt. video fra hangar",
    destinasjoner: [
      { label: "Lag bilde i Innholdsmotor", href: "/innholdsmotor" },
    ],
  },

  // ─── FT Custom verktøyvogner (5.3% oms, 49% DG) ────────────────────
  {
    id: "ft-custom-vogn",
    kategori: "ft-custom",
    emoji: "🛞",
    tittel: "Custom verktøyvogn levert",
    vinkling:
      "Topp-produktet er Equinor Åsgard-vognen (299k). Vis en lignende " +
      "custom-vogn på vei ut eller åpnet med HDFI på plass.",
    format: "reel",
    caption_skisse: "🛞 Levert til [kunde] — designet hos oss.",
    markedsdata:
      "FT Custom-vogner = 5.3% av oms, 49% DG. " +
      "FTINDU2 (Custom-vogn) er topp 7 GA4-side med 61 views/90d.",
    trenger: "Bilder/video fra siste custom-vogn-leveranse",
    destinasjoner: [
      { label: "Lag reel i Remotion (LeveranseReel)", href: "/innleggsbygger/maler" },
      { label: "Generér i Innholdsmotor", href: "/innholdsmotor" },
    ],
    beste_dager: [4, 5],
  },

  // ─── Containere & moduler (12.4% oms, GAP — null markedsføring) ─────
  {
    id: "containere-pelicase",
    kategori: "containere",
    emoji: "📦",
    tittel: "Container & oppbevaring",
    vinkling:
      "12.4% av omsetningen, men NULL tilstedeværelse i SoMe. " +
      "Vis CONTAINEX 8FT, mobilhotell eller pelicase-løsninger.",
    format: "bilde",
    caption_skisse: "📦 Vannett, mobilt, klart for bruk.",
    markedsdata:
      "Containere & moduler er 12.4% av oms — STØRSTE kategori. " +
      "Men har null SoMe-tilstedeværelse — GAP.",
    trenger: "Bilde av container/mobilhotell på Brekstad eller hos kunde",
    destinasjoner: [
      { label: "Lag bilde i Innleggsmaler", href: "/innleggsbygger/maler" },
    ],
  },

  // ─── Innredning/lager-løsninger (3.2% oms, GAP) ─────────────────────
  {
    id: "innredning-5s",
    kategori: "innredning",
    emoji: "🏭",
    tittel: "Mobilreol / 5S-Lean-løsning",
    vinkling:
      "Mobilreol HI280 alene = 532k i revenue. Vis hvordan 5S-Lean " +
      "innredning gjør verkstedet mer effektivt. Lista AG kabinetter " +
      "(52% DG) eller GIGANT mobilreol.",
    format: "karusell",
    caption_skisse: "🏭 Verkstedet ditt fortjener bedre.",
    markedsdata:
      "GIGANT (740k oms) + Lista AG (52% DG) er underrepresenterte. " +
      "GAP-kategori i markedsanalysen.",
    trenger: "Bilder fra kunde-verksted før/etter, eller produktbilde av reol",
    destinasjoner: [
      { label: "Lag karusell i Innholdsmotor", href: "/innholdsmotor" },
    ],
  },

  // ─── Premium-merker (Facom, Husqvarna, Snap-on) ─────────────────────
  {
    id: "premium-bestseller",
    kategori: "premium-merker",
    emoji: "⭐",
    tittel: "Premium-bestseller i fokus",
    vinkling:
      "Velg ett produkt: Husqvarna diamantsagblad (top Mailchimp), Facom " +
      "verktøyvogn (22 klikk) eller Snap-on klassiker. Vis det rent.",
    format: "bilde",
    caption_skisse: "⭐ Når jobben krever det beste.",
    markedsdata:
      "Husqvarna diamantsagblad = 22 Mailchimp-klikk (topp 1). " +
      "Facom verktøyvogn = 22 klikk. Premium-merkene leverer.",
    trenger: "Produktbilde fra fosen-tools.no eller egen foto",
    destinasjoner: [
      { label: "Generér i Innleggsmaler (produktSingle)", href: "/innleggsbygger/maler" },
    ],
  },

  // ─── Batteriverktøy (Milwaukee — topp GA4-trafikk) ──────────────────
  {
    id: "milwaukee-okosystem",
    kategori: "batteriverktoy",
    emoji: "🔋",
    tittel: "M18/M12-økosystemet i drift",
    vinkling:
      "Vis bredden av Milwaukee-økosystemet i én post — drill, sirkelsag, " +
      "muttertrekker, lader på samme batteripakke. 200+ maskiner.",
    format: "karusell",
    caption_skisse: "🔋 Én batteripakke. 200+ maskiner.",
    markedsdata:
      "Milwaukee er topp leverandør (1.46M oms). /produkter/batteriverktøy " +
      "er mest besøkte side (101 views/90d).",
    trenger: "Flate-bilde av Milwaukee-utvalg eller egne produktbilder",
    destinasjoner: [
      { label: "Lag karusell i Innleggsmaler", href: "/innleggsbygger/maler" },
    ],
  },

  // ─── Bedrift-historie / Brekstad / 25 år ────────────────────────────
  {
    id: "bedrift-brekstad",
    kategori: "bedrift-historie",
    emoji: "🏭",
    tittel: "25 år fra Brekstad",
    vinkling:
      "Bedrifts-DNA. Fasaden, helikopterlandingsplassen, lokalene. Stedet " +
      "som har bygd det FT er i dag. Ikke jubileums-pushing — heller " +
      "stolthet over historikken.",
    format: "bilde",
    caption_skisse: "🏭 25 år fra Brekstad.",
    markedsdata:
      "Brand-bygging. «Fosen Tools-standard» er referert av Forsvaret — " +
      "vi er etablert som premium leverandør i 25 år.",
    trenger: "Bilde av lokalene, helikopter-landing, eller team utenfor",
    destinasjoner: [
      { label: "Lag i Innleggsmaler (milepael)", href: "/innleggsbygger/maler" },
    ],
    beste_dager: [1], // mandag — passer bedrift-start-uka
  },
  {
    id: "bedrift-miljofyrtarn",
    kategori: "miljofyrtarn",
    emoji: "🌱",
    tittel: "Miljøfyrtårn + solcellepark",
    vinkling:
      "100% selvforsynt fornybar energi. Solcellepark fra 2023, elektriske " +
      "firmakjøretøy. Bærekraft som B2B-fortrinn.",
    format: "bilde",
    caption_skisse: "🌱 Sertifisert grønt siden 2023.",
    markedsdata:
      "Anbud i offentlig sektor og store bedrifter krever Miljøfyrtårn-" +
      "sertifisering — vi har det. Konkurransefortrinn i salg.",
    trenger: "Bilde av solcellepark, elbil eller Miljøfyrtårn-skilt",
    destinasjoner: [
      { label: "Lag i Innleggsmaler (statement)", href: "/innleggsbygger/maler" },
    ],
  },

  // ─── Team-portrett (sosialt, hverdag) ──────────────────────────────
  {
    id: "team-hverdag",
    kategori: "team-portrett",
    emoji: "👋",
    tittel: "Møt teamet bak FT",
    vinkling:
      "Portrett av en ansatt: hva de gjør, hvor lenge de har vært her, " +
      "hva de brenner for. Bygger «folk vi liker å handle av»-følelse.",
    format: "bilde",
    caption_skisse: "👋 Hils på [navn] — [rolle] siden [år].",
    markedsdata:
      "Brand-bygging. B2B-kunder velger leverandører de stoler på — " +
      "mennesker bygger den tilliten.",
    trenger: "Portrett-bilde av ansatt + 2-3 setninger fra dem",
    destinasjoner: [
      { label: "Lag i Innleggsmaler (ansatt)", href: "/innleggsbygger/maler" },
    ],
    beste_dager: [1], // mandag
  },

  // ─── Kunde-leveranse (+38% stolthet, +144% skreddersøm) ─────────────
  {
    id: "kunde-levert",
    kategori: "kunde-leveranse",
    emoji: "🚚",
    tittel: "Levert til [kunde]",
    vinkling:
      "Klassisk +144% mønster: «Levert til [bedrift]». Vis produktet på " +
      "vei ut eller hos kunden. Konkret historie om hva som ble levert.",
    format: "reel",
    caption_skisse: "🚚 Levert til [kunde].",
    markedsdata:
      "+38% lift på «stolthet-tone» (levert/ferdigstilt). +144% når kombinert " +
      "med skreddersøm/HDFI. Konkrete leveranser slår filosofiske poster med −94%.",
    trenger: "Bilder/video fra leveransen + kunde-tillatelse",
    destinasjoner: [
      { label: "Lag reel i Remotion (LeveranseReel)", href: "/innleggsbygger/maler" },
    ],
    beste_dager: [4, 5],
  },

  // ─── Produkt-spotlight (kobler til nyhetsbrev) ──────────────────────
  {
    id: "produkt-spotlight-bestseller",
    kategori: "produkt-spotlight",
    emoji: "🛠️",
    tittel: "Toppselger denne måneden",
    vinkling:
      "Spotlight på ett bestselger-produkt med pris, bilde og kort " +
      "fordels-tekst. Driver direkte salg.",
    format: "bilde",
    caption_skisse: "🛠️ [Produkt-navn] — [én-linjers fordel].",
    markedsdata:
      "Produkt-spotlight kobler til nyhetsbrev-utsendelsen samme uke. " +
      "Toppselgere har bevist trekkraft i tidligere kampanjer.",
    trenger: "Produktbilde + pris fra fosen-tools.no",
    destinasjoner: [
      { label: "Lag i Innleggsmaler (produktSingle)", href: "/innleggsbygger/maler" },
      { label: "Bygg innholdspakke fra produkt-URL", href: "/innleggsbygger/maler" },
    ],
    beste_dager: [2], // tirsdag — sammenfaller med nyhetsbrev-tirsdag
  },
];

// ─── Sample-logikk: dato-seedet shuffle ──────────────────────────────

/** Stable hash av YYYY-MM-DD til 32-bit integer for å seede shuffle. */
function dateHash(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = (h << 5) - h + dateStr.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Linear congruential generator — deterministisk Math.random()-erstatning. */
function lcg(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** Fisher-Yates shuffle med seedet RNG. */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface IdeFeedInput {
  /** YYYY-MM-DD — bestemmer hvilke ideer som velges. Default = i dag (Oslo-tid). */
  date?: string;
  /** Antall ideer å returnere. Default 6. */
  count?: number;
  /** Hvis satt: skip ideer hvis ID er i denne lista (typisk «nylig postet»). */
  exclude_ids?: string[];
}

export function generateIdeFeed(input: IdeFeedInput = {}): IdeTemplate[] {
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const count = input.count ?? 6;
  const exclude = new Set(input.exclude_ids ?? []);

  // Filtrér ut nylig brukte ideer
  let pool = TEMPLATES.filter((t) => !exclude.has(t.id));

  // Prioritér ideer som passer dagens ukedag
  const weekday = new Date(date + "T12:00:00").getDay(); // 0=søn..6=lør
  pool = pool.sort((a, b) => {
    const aMatch = a.beste_dager?.includes(weekday) ? 0 : 1;
    const bMatch = b.beste_dager?.includes(weekday) ? 0 : 1;
    return aMatch - bMatch;
  });

  // Sample 2/3 fra topp (dag-matchende), 1/3 fra resten — for variasjon
  const topCount = Math.ceil(count * 0.66);
  const topPool = pool.slice(0, Math.max(topCount * 2, count));
  const restPool = pool.slice(Math.max(topCount * 2, count));

  const rng = lcg(dateHash(date));
  const shuffledTop = shuffle(topPool, rng).slice(0, topCount);
  const shuffledRest = shuffle(restPool, rng).slice(0, count - topCount);

  return [...shuffledTop, ...shuffledRest].slice(0, count);
}

/** For UI: kategori-label på norsk. */
export const KATEGORI_LABEL: Record<IdeKategori, string> = {
  "hdfi-skreddersom": "HDFI · Skreddersøm",
  "aviation-forsvar": "Aviation · Forsvar",
  "ft-custom": "FT Custom",
  containere: "Containere & moduler",
  innredning: "Innredning · 5S-Lean",
  "pelican-kofferter": "Pelican-kofferter",
  "premium-merker": "Premium-merker",
  batteriverktoy: "Batteriverktøy",
  "bedrift-historie": "Bedrift & historie",
  "team-portrett": "Team",
  "produkt-spotlight": "Produkt-spotlight",
  "kunde-leveranse": "Kunde-leveranse",
  miljofyrtarn: "Miljø",
  "messe-event": "Messe · Event",
};

export const FORMAT_LABEL: Record<IdeFormat, string> = {
  bilde: "📷 Bilde",
  reel: "🎬 Reel",
  karusell: "🎠 Karusell",
  story: "📱 Story",
};
