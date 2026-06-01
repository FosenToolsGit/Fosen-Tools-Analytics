// Props-kontrakt for Fosen Tools video-komposisjonene. Render-pipelinen
// (scripts/render-video.ts + API-ruten) henter live data og mapper den
// til disse formene; komposisjonene ser kun vanlig JSON.
//
// Hver props-type har et `format`-felt — `calculateMetadata` i Root.tsx
// leser det og setter video-dimensjonene, slik at samme komposisjon kan
// rendres som Reel / kvadrat / bred uten egne registreringer.

// ── format ───────────────────────────────────────────────────────────

export type VideoFormat = "reel" | "square" | "wide";

export const DIMENSIONS: Record<
  VideoFormat,
  { width: number; height: number; label: string }
> = {
  reel: { width: 1080, height: 1920, label: "Reel / TikTok / Shorts (9:16)" },
  square: { width: 1080, height: 1080, label: "Kvadrat-feed (1:1)" },
  wide: { width: 1920, height: 1080, label: "YouTube / bred (16:9)" },
};

// ── produkt-spotlight ────────────────────────────────────────────────

export type ProduktSpotlightProps = {
  format: VideoFormat;
  /** Liten etikett over alt, f.eks. "UKENS TILBUD" / "NYHET". */
  eyebrow: string;
  /** Produktnavn — hovedoverskrift. */
  productName: string;
  /** Produsent-navn, f.eks. "Wera". */
  manufacturer: string;
  /** Produsent-logo (URL), eller null for ren tekst-fallback. */
  manufacturerLogoUrl: string | null;
  /** Produktbilde (URL), eller null for stilisert fallback. */
  imageUrl: string | null;
  /** Foer-pris i NOK, eller null hvis ingen rabatt. */
  priceBefore: number | null;
  /** Naa-pris i NOK. */
  priceNow: number;
  /** Rabatt i prosent, eller null. */
  discountPct: number | null;
  /** FT-artikkelnummer, eller null. */
  sku: string | null;
  /** USP-punkter, vises som stagger-liste. */
  bullets: string[];
  /** CTA-tekst nederst, f.eks. "fosen-tools.no/wera". */
  ctaUrl: string;
};

export const SAMPLE_PRODUKT: ProduktSpotlightProps = {
  format: "reel",
  eyebrow: "Ukens tilbud",
  productName: "Kraftform Kompakt 20 Tool Finder",
  manufacturer: "Wera",
  manufacturerLogoUrl: null,
  imageUrl: null,
  priceBefore: 1290,
  priceNow: 899,
  discountPct: 30,
  sku: "05057460001",
  bullets: [
    "20 bits + bitsholder i ett",
    "Take-it-easy fargekoding",
    "Tysk presisjon, livstidskvalitet",
  ],
  ctaUrl: "fosen-tools.no/wera",
};

// ── leveranse-reel ───────────────────────────────────────────────────

export type LeveranseReelProps = {
  format: VideoFormat;
  /** Etikett, typisk "Levert". */
  eyebrow: string;
  /** Kundenavn, f.eks. "TESS VEST". Skjules når `anonymous = true`. */
  customer: string;
  /** Bransje / kontekst, f.eks. "Offshore". */
  industry: string;
  /** Kunde-logo (URL), eller null. Skjules når `anonymous = true`. */
  customerLogoUrl: string | null;
  /** Skjul kundeidentitet — vis "Konfidensielt" + bransje, ikke logo. */
  anonymous: boolean;
  /** Hovedoverskrift om leveransen. */
  headline: string;
  /** Kort beskrivelse (1-2 setninger). */
  description: string;
  /** 1-6 bilder av leveransen (URL-er). Tom liste = fallback-kort. */
  imageUrls: string[];
  /** Stikkord-chips, f.eks. ["HDFI", "CADLAB", "CNC-maskinert"]. */
  tags: string[];
  /** CTA-tekst nederst. */
  ctaUrl: string;
};

export const SAMPLE_LEVERANSE: LeveranseReelProps = {
  format: "reel",
  eyebrow: "Levert",
  customer: "TESS VEST",
  industry: "Offshore",
  customerLogoUrl: null,
  anonymous: false,
  headline: "Skreddersydd HDFI for kraftpipe 22-38 mm",
  description:
    "OPTI-koffert med CAD-tegnet, CNC-maskinert skuminnlegg — hver pipe har sin plass.",
  imageUrls: [],
  tags: ["HDFI", "CADLAB", "CNC-maskinert"],
  ctaUrl: "fosen-tools.no",
};

// ── milepael-klipp ───────────────────────────────────────────────────

export type MilepaelStat = { value: string; label: string };

export type MilepaelClipProps = {
  format: VideoFormat;
  /** Etikett over tallet. */
  eyebrow: string;
  /** Hovedtallet som teller opp, f.eks. 25. */
  number: number;
  /** Enhet under/etter tallet, f.eks. "AAR". */
  unit: string;
  /** Hovedoverskrift. */
  headline: string;
  /** Underoverskrift. */
  subhead: string;
  /** Inntil 3 stoette-statistikker. */
  stats: MilepaelStat[];
  /** Vis offisiell jubileumslogo (25-aar). */
  showJubileum: boolean;
  /** CTA-tekst nederst. */
  ctaUrl: string;
};

export const SAMPLE_MILEPAEL: MilepaelClipProps = {
  format: "reel",
  // Ikke gjenta brand-navnet — wordmarken ER navnet. Bruk en kategori-
  // label eller la den stå tom; IntroScene viser TAGLINE i stedet.
  eyebrow: "Milepæl 2026",
  number: 25,
  unit: "ÅR",
  headline: "Verktøy for fagfolk",
  subhead: "Del av et familiekonsern med 100 år bak seg.",
  stats: [
    { value: "100", label: "år i konsernet" },
    { value: "40+", label: "merker på lager" },
    { value: "4.", label: "generasjon" },
  ],
  showJubileum: true,
  ctaUrl: "fosen-tools.no",
};

// ── kampanje-teaser (multi-produkt-karusell) ─────────────────────────

export type KampanjeProdukt = {
  name: string;
  manufacturer: string;
  imageUrl: string | null;
  priceBefore: number | null;
  priceNow: number;
  discountPct: number | null;
};

export type KampanjeTeaserProps = {
  format: VideoFormat;
  /** Liten etikett, f.eks. "KAMPANJE". */
  eyebrow: string;
  /** Hovedoverskrift, f.eks. "Vårsalget er i gang". */
  headline: string;
  /** Sekundær linje under headline, f.eks. "Inntil 30% rabatt". */
  subhead: string;
  /** 3-6 produkter i karusellen. */
  products: KampanjeProdukt[];
  /** CTA-tekst nederst. */
  ctaUrl: string;
};

export const SAMPLE_KAMPANJE: KampanjeTeaserProps = {
  format: "reel",
  eyebrow: "Kampanje",
  headline: "Vårsalget er i gang",
  subhead: "Utvalgte produkter til kampanjepris",
  products: [
    {
      name: "Kraftform Kompakt 20",
      manufacturer: "Wera",
      imageUrl: null,
      priceBefore: 1290,
      priceNow: 899,
      discountPct: 30,
    },
    {
      name: "Cobra QuickSet vannpumpetang",
      manufacturer: "Knipex",
      imageUrl: null,
      priceBefore: 990,
      priceNow: 690,
      discountPct: 30,
    },
    {
      name: "Manoskop momentnøkkel 730N/20",
      manufacturer: "Stahlwille",
      imageUrl: null,
      priceBefore: 4900,
      priceNow: 3920,
      discountPct: 20,
    },
  ],
  ctaUrl: "fosen-tools.no/kampanje",
};

// ── sitat-klipp (kundesitat) ─────────────────────────────────────────

export type SitatClipProps = {
  format: VideoFormat;
  /** Liten etikett, f.eks. "Kunden sier". */
  eyebrow: string;
  /** Sitatet — uten anførselstegn, vi tegner dem som SVG. */
  quote: string;
  /** Navn på personen som siteres. */
  attributionName: string;
  /** Rolle, f.eks. "Innkjøpsansvarlig". */
  attributionRole: string;
  /** Selskap, f.eks. "Norwegian Aero". */
  attributionCompany: string;
  /** Selskapslogo (URL), eller null for ren tekst. */
  companyLogoUrl: string | null;
  /** CTA-tekst nederst. */
  ctaUrl: string;
};

export const SAMPLE_SITAT: SitatClipProps = {
  format: "reel",
  eyebrow: "Kunden sier",
  quote:
    "Fosen Tools leverte en HDFI-løsning som var skreddersydd helt ned til siste pipe — det er forskjellen mellom et verktøykap og en arbeidsstasjon.",
  attributionName: "Ola Nordmann",
  attributionRole: "Innkjøpsansvarlig",
  attributionCompany: "Eksempel AS",
  companyLogoUrl: null,
  ctaUrl: "fosen-tools.no/referanser",
};

// ── referanse-spotlight ──────────────────────────────────────────────

export type ReferanseSpotlightProps = {
  format: VideoFormat;
  /** Eyebrow over H1, f.eks. "LEVERT TIL ANDØYA SPACE". */
  eyebrow: string;
  /** Hovedoverskrift — 2–3 ord, UPPERCASE-rendres automatisk. */
  headline: string;
  /** Produktfoto-URL eller null for fallback. */
  imageUrl: string | null;
  /** 1–3 linjer body-tekst (CAD-tegnet, CNC-maskinert, levert mai 2026). */
  bodyLines: string[];
  /** Valgfri CTA-URL nederst, f.eks. "fosen-tools.no/referanser". */
  ctaUrl?: string;
};

export const SAMPLE_REFERANSE: ReferanseSpotlightProps = {
  format: "reel",
  eyebrow: "Levert til Andøya Space",
  headline: "Skreddersydd HDFI",
  imageUrl: null,
  bodyLines: [
    "CAD-tegnet, CNC-maskinert.",
    "Levert mai 2026.",
  ],
  ctaUrl: "fosen-tools.no/referanser",
};

// ── definisjon ───────────────────────────────────────────────────────

export type DefinisjonProps = {
  format: VideoFormat;
  /** Mini-tekst over H1 — selve fagordet, f.eks. "HDFI" / "CADLAB". */
  eyebrow: string;
  /** Hovedoverskrift — 3–6 ord. */
  headline: string;
  /** 3–5 linjer body-tekst, hver linje en konsept-byggeklosse. */
  bodyLines: string[];
};

export const SAMPLE_DEFINISJON: DefinisjonProps = {
  format: "square",
  eyebrow: "HDFI",
  headline: "Verktøykontroll med gravert silhuett",
  bodyLines: [
    "Substantiv,",
    "CAD-tegnet, CNC-maskinert,",
    "segmentert etter brukerens arbeidsflyt.",
  ],
};

// ── hero-poster ──────────────────────────────────────────────────────

export type HeroPosterProps = {
  format: VideoFormat;
  /** Video-URL for bakgrunn — har prioritet over imageUrl. */
  videoUrl?: string;
  /** Stillbilde-fallback hvis videoUrl er tom. */
  imageUrl?: string;
  /** Brand-tekst (UPPERCASE-rendres), f.eks. "FOSEN TOOLS". */
  brand: string;
  /** Tagline under brand, f.eks. "Profesjonelle verktøyløsninger". */
  tagline: string;
  /** Valgfri CTA-knapp-tekst, f.eks. "Kontakt oss". */
  ctaText?: string;
};

export const SAMPLE_HERO_POSTER: HeroPosterProps = {
  format: "reel",
  videoUrl: undefined,
  imageUrl: undefined,
  brand: "FOSEN TOOLS",
  tagline: "Profesjonelle verktøyløsninger",
  ctaText: "Kontakt oss",
};

// ── felles registry-typer (brukt av Root + render-pipeline) ──────────

export type VideoType =
  | "produkt-spotlight"
  | "leveranse-reel"
  | "milepael"
  | "kampanje-teaser"
  | "sitat"
  | "hdfi-hero"
  | "kunde-leveranse-v2"
  | "hdfi-before-after"
  | "team-portrett"
  | "cadlab-prosess"
  | "referanse-spotlight"
  | "definisjon"
  | "hero-poster"
  | "jub-t14"
  | "jub-t13"
  | "jub-t12"
  | "jub-t11"
  | "jub-t10"
  | "jub-t9"
  | "jub-t8"
  | "jub-t7"
  | "jub-t6"
  | "jub-t5"
  | "jub-t4"
  | "jub-t3"
  | "jub-t2"
  | "jub-t1"
  | "jub-dagen";

/** Komposisjons-id slik den er registrert i Root.tsx. */
export const COMPOSITION_ID: Record<VideoType, string> = {
  "produkt-spotlight": "ProduktSpotlight",
  "leveranse-reel": "LeveranseReel",
  milepael: "MilepaelClip",
  "kampanje-teaser": "KampanjeTeaser",
  sitat: "SitatClip",
  "hdfi-hero": "HdfiHero",
  "kunde-leveranse-v2": "KundeLeveranseV2",
  "hdfi-before-after": "HdfiBeforeAfter",
  "team-portrett": "TeamPortrett",
  "cadlab-prosess": "CADLABProsess",
  "referanse-spotlight": "ReferanseSpotlight",
  definisjon: "Definisjon",
  "hero-poster": "HeroPoster",
  "jub-t14": "JubileumT14",
  "jub-t13": "JubileumT13",
  "jub-t12": "JubileumT12",
  "jub-t11": "JubileumT11",
  "jub-t10": "JubileumT10",
  "jub-t9": "JubileumT9",
  "jub-t8": "JubileumT8",
  "jub-t7": "JubileumT7",
  "jub-t6": "JubileumT6",
  "jub-t5": "JubileumT5",
  "jub-t4": "JubileumT4",
  "jub-t3": "JubileumT3",
  "jub-t2": "JubileumT2",
  "jub-t1": "JubileumT1",
  "jub-dagen": "JubileumDagen",
};

// ── hdfi-hero ────────────────────────────────────────────────────────
// Dedikert HDFI-video: visualiserer 3-lags-strukturen (rød plast topp /
// hvit kontrast under / sort skum bunn) + CNC-kutt-animasjon som viser
// hvordan en verktøy-silhuett blir maskinert ut. Bruker FT-logo,
// 25-årslogo, og Four Editors light-leak + whoosh-SFX for filmisk feel.

export type HdfiHeroProps = {
  format: VideoFormat;
  /** Hovedtittel — typisk "HDFI" alene. */
  title: string;
  /** Lille etikett over tittelen, f.eks. "EGEN PRODUKSJON". */
  eyebrow: string;
  /** Sub-tagline under tittelen i intro-scenen. */
  tagline: string;
  /** USP-punkter for closing-scenen (3-5 stk). */
  bullets: string[];
  /** CTA-tekst nederst, f.eks. "fosen-tools.no/hdfi". */
  ctaUrl: string;
};

export const SAMPLE_HDFI: HdfiHeroProps = {
  format: "reel",
  title: "HDFI",
  eyebrow: "EGEN PRODUKSJON",
  tagline: "Verktøykontroll med gravert silhuett",
  bullets: [
    "Designet i CADLABen vår",
    "CNC-maskinert",
    "Forebygger FOD",
    "Identisk gravering på verktøy og HDFI",
  ],
  ctaUrl: "fosen-tools.no/hdfi",
};

// ── kunde-leveranse v2 (multi-scene reel) ────────────────────────────

export type KundeLeveranseV2Props = {
  format: VideoFormat;
  /** Kundenavn — skjules når `anonymous = true`. */
  customer: string;
  /** Bransje, f.eks. "Offshore" / "Forsvar". */
  industry: string;
  /** Kunde-logo (URL), eller null. */
  customerLogoUrl: string | null;
  /** Hovedoverskrift om leveransen. */
  heading: string;
  /** Body-tekst (2-3 setninger) som typewriter-rendres. */
  bodyText: string;
  /** 3-6 bilde-URL-er for galleri-scenene. */
  images: string[];
  /** 2-4 stikkord/highlights som vises over bildene + i outro-chips. */
  highlights: string[];
  /** CTA-URL nederst. */
  ctaUrl: string;
  /** Skjul kundeidentitet — vis "BRANSJEKUNDE" i stedet. */
  anonymous: boolean;
};

export const SAMPLE_KUNDE_V2: KundeLeveranseV2Props = {
  format: "reel",
  customer: "Norwegian Aero",
  industry: "Aviation",
  customerLogoUrl: null,
  heading: "Skreddersydd verktøyløsning for vingedrift",
  bodyText:
    "CAD-tegnet i CADLAB, CNC-maskinert i Brekstad. Hver pipe og hver nøkkel har sin egen plass, og avvik oppdages før de blir et problem.",
  images: [],
  highlights: ["HDFI", "CADLAB", "CNC-maskinert", "FOD-sikret"],
  ctaUrl: "fosen-tools.no/aviation",
  anonymous: false,
};

// ── hdfi før/etter (split-screen) ────────────────────────────────────

export type HdfiBeforeAfterProps = {
  format: VideoFormat;
  /** Før-bilde (URL) — kaotisk hyllevare-skuff. Null gir fallback. */
  beforeImageUrl: string | null;
  /** Etter-bilde (URL) — skreddersydd HDFI-skuff. Null gir fallback. */
  afterImageUrl: string | null;
  /** Kundenavn, f.eks. "Norwegian Aero". */
  customerName: string;
  /** Kort beskrivelse av leveransen (1-2 setninger). */
  description: string;
};

export const SAMPLE_HDFI_BA: HdfiBeforeAfterProps = {
  format: "reel",
  beforeImageUrl: null,
  afterImageUrl: null,
  customerName: "Norwegian Aero",
  description:
    "Fra rotete hyllevare til skreddersydd HDFI med gravert silhuett — hver pipe på rett plass.",
};

// ── team-portrett (ansatt-intro) ─────────────────────────────────────

export type TeamPortrettProps = {
  format: VideoFormat;
  /** Fullt navn. */
  name: string;
  /** Rolle/tittel. */
  role: string;
  /** Årstall ansatt, f.eks. "2018". */
  since: string;
  /** Sitat fra personen. */
  quote: string;
  /** Portrett-URL, eller null for initial-fallback. */
  photoUrl: string | null;
};

export const SAMPLE_TEAM: TeamPortrettProps = {
  format: "reel",
  name: "Erik Strøm",
  role: "Daglig leder",
  since: "2018",
  quote:
    "Vi selger ikke verktøy fordi vi har mange, vi selger riktig verktøy for hverdagen.",
  photoUrl: null,
};

// ── cadlab-prosess (3-scene HDFI-fortelling) ─────────────────────────

export type CADLABProsessProps = {
  format: VideoFormat;
  /** Produktnavn — vises i scene 3 og outro. */
  productName: string;
  /** Kundenavn — valgfritt, vises i scene 3 som "for {customerName}". */
  customerName?: string;
  /** CAD-skjerm-bilde til scene 1. Undefined gir blueprint-fallback. */
  cadImageUrl?: string;
  /** CNC-bilde til scene 2. Undefined gir kutt-moenster-fallback. */
  cncImageUrl?: string;
  /** Ferdig HDFI-bilde til scene 3. Undefined gir paletten-fallback. */
  finishedImageUrl?: string;
};

export const SAMPLE_CADLAB: CADLABProsessProps = {
  format: "reel",
  productName: "Aviation EOR Kit",
  customerName: "Norwegian Aero",
  cadImageUrl: undefined,
  cncImageUrl: undefined,
  finishedImageUrl: undefined,
};
