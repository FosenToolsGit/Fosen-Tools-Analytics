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
  /** Musikk-variant. Default "hope". */
  musicVariant?: "hope" | "life" | "faraway" | "deephigh" | "together" | "buildup";
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
  // FT-pipeline (juni 2026) — 4-scene-mal med Four Editors-transitions
  | "ft-referanse"
  | "ft-hdfi"
  | "ft-definisjon"
  | "ft-milepael"
  | "ft-sitat"
  // Salgs-orienterte (2026-06-02): bygd for å SELGE HDFI
  | "ft-prosess"
  | "ft-vshyllevare"
  | "ft-kunderes"
  | "ft-hvorfor"
  | "ft-leverandor"
  // Jubileum-event 26. juni 2026 — animert TV-loop for butikk-skjerm
  | "ft-jubileum-26juni"
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
  "ft-referanse": "FTReferanseStory",
  "ft-hdfi": "FTHDFISpotlight",
  "ft-definisjon": "FTDefinisjonNeo",
  "ft-milepael": "FTMilepaelV2",
  "ft-sitat": "FTSitatV2",
  "ft-prosess": "FTProsessSpotlight",
  "ft-vshyllevare": "FTHDFIvsHyllevare",
  "ft-kunderes": "FTKundeResultat",
  "ft-hvorfor": "FTHvorforHDFI",
  "ft-leverandor": "FTLeverandorNyhet",
  "ft-jubileum-26juni": "FTJubileum26Juni",
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
  customer: "Tidligere leveranse",
  industry: "Aviation",
  customerLogoUrl: null,
  heading: "Skreddersydd verktøyløsning",
  bodyText:
    "CAD-tegnet i CADLAB, CNC-maskinert på Brekstad. Hver pipe og hver nøkkel har sin egen plass, og avvik oppdages før de blir et problem.",
  images: [],
  highlights: ["HDFI", "CADLAB", "CNC-maskinert", "FOD-sikret"],
  ctaUrl: "fosen-tools.no/aviation",
  anonymous: true,
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
  customerName: "Tidligere leveranse",
  description:
    "Fra rotete hyllevare til skreddersydd HDFI med gravert silhuett, hver pipe på rett plass.",
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
  productName: "Skreddersydd HDFI",
  customerName: undefined,
  cadImageUrl: undefined,
  cncImageUrl: undefined,
  finishedImageUrl: undefined,
};

// ─────────────────────────────────────────────────────────────────────
// 4-SCENE-MAL — alle nye komposisjoner pr juni 2026 bruker samme shell:
// FTLoadingScreen (90 frames) → FTTransition → Scene 2 → FTTransition →
// FTOutroCta (120 frames). Det som varierer er Scene 2.
// ─────────────────────────────────────────────────────────────────────

// ── FTReferanseStory (kundereferanse / leveranse-storytelling) ──────

/** Hook-typer som komposisjoner kan velge åpning fra. */
export type HookKindStr =
  | "brand-coldopen"
  | "eyebrow-slam"
  | "stat-shock"
  | "visual-reveal"
  | "process-glimpse"
  | "leverandor-tagin";

export type FTReferanseStoryProps = {
  format: VideoFormat;
  /** Eyebrow over H1, f.eks. "LEVERT TIL NORWEGIAN AERO". */
  eyebrow: string;
  /** Hovedoverskrift — 2-4 ord. UPPERCASE-rendres automatisk. */
  headline: string;
  /** Liste med produktfoto-URL-er. 1-6 bilder. Tom liste = blueprint-fallback.
   *  Bildene crossfader gjennom Scene 2, ~3 sek per bilde med Ken Burns. */
  imageUrls?: string[];
  /** DEPRECATED — bruk imageUrls. Beholdt for bakoverkompatibilitet. */
  imageUrl?: string | null;
  /** 1-3 stikkord (HDFI, CADLAB, CNC-maskinert) som chips. */
  tags: string[];
  /** Banner-card-tekst som overlay, f.eks. "Skreddersydd verktøykontroll". */
  bannerHeadline?: string;
  /** Banner-subline. */
  bannerSubline?: string;
  /** Tagline brukt i outro. */
  tagline?: string;
  /** Åpnings-hook. Default: eyebrow-slam. */
  hook?: HookKindStr;
  /** Kunde-logo-URL. Hvis satt, vises som logo i Hook B i stedet for
   *  tekst-navn. Gir "Levert til [LOGO]"-effekt. */
  customerLogoUrl?: string | null;
};

export const SAMPLE_FT_REFERANSE: FTReferanseStoryProps = {
  format: "reel",
  // SAMPLE: bruker generisk frase. Faktiske kundenavn settes via
  // --data <fil>.json når Adrian har verifisert kunden.
  eyebrow: "Skreddersydd HDFI",
  headline: "Aviation EOR Kit",
  imageUrls: [],
  tags: ["HDFI", "CADLAB", "CNC-MASKINERT"],
  bannerHeadline: "Skreddersydd verktøykontroll",
  bannerSubline: "Fra konsept til ferdig",
  tagline: "Skreddersydd på Brekstad",
  customerLogoUrl: null,
};

// ── FTHDFISpotlight (HDFI-fokus med 3 USP-bullets) ──────────────────

export type FTHDFISpotlightProps = {
  format: VideoFormat;
  /** Lille etikett over tittel, f.eks. "EGEN PRODUKSJON". */
  eyebrow: string;
  /** Hovedtittel — typisk "HDFI" alene eller "HDFI / FOD-SIKRING". */
  headline: string;
  /** Tagline under tittel. */
  tagline: string;
  /** Produktbilde-URL, eller null for blueprint-fallback. */
  imageUrl: string | null;
  /** 3 USP-bullets — staggered inn. */
  bullets: string[];
  /** Banner-tekst som lander på climax. */
  bannerHeadline?: string;
  /** Banner-subline. */
  bannerSubline?: string;
  /** Outro CTA URL. */
  ctaUrl?: string;
};

export const SAMPLE_FT_HDFI: FTHDFISpotlightProps = {
  format: "reel",
  eyebrow: "Egen produksjon",
  headline: "HDFI",
  tagline: "Verktøykontroll med gravert silhuett",
  imageUrl: null,
  bullets: [
    "CAD-tegnet i CADLABen vår",
    "CNC-maskinert på Brekstad",
    "Identisk gravering på verktøy og innlegg",
  ],
  bannerHeadline: "FOD-sikker verktøykontroll",
  bannerSubline: "CADLAB · Brekstad",
  ctaUrl: "fosen-tools.no/hdfi",
};

// ── FTDefinisjonNeo (fagord — fix av krem/svart-versjon) ────────────

/**
 * FTDefinisjonNeo — refactored 2026-06-02. Brukes IKKE lenger som
 * generell fagord-ordbok (Adrian: «føles rart ut»). Beholdt KUN for
 * direkte HDFI/FOD-konsept-forklaring som lukker mot salg.
 *
 * For andre fagord/prosess-forklaringer, bruk i stedet:
 *   - FTProsessSpotlight (4-stadier — selger prosessen)
 *   - FTHvorforHDFI (3-grunner — selger fordelen)
 */
export type FTDefinisjonNeoProps = {
  format: VideoFormat;
  /** Fagordet — KUN "HDFI" eller "FOD" (compile-time guard). */
  term: "HDFI" | "FOD";
  /** Ordklasse, f.eks. "Substantiv" / "Adjektiv". */
  partOfSpeech: string;
  /** Definisjonens kjerne-setning. */
  definition: string;
  /** Etymologi / kontekst — 1-2 setninger. */
  etymology?: string;
  /** Eksempel-bruk eller sosial bevis. */
  example?: string;
  /** CTA-knapp-tekst nederst i Scene 2. Default "Få en demo". */
  ctaText?: string;
  /** Outro tagline. */
  tagline?: string;
  /** Outro CTA URL. */
  ctaUrl?: string;
};

export const SAMPLE_FT_DEFINISJON: FTDefinisjonNeoProps = {
  format: "reel",
  term: "HDFI",
  partOfSpeech: "Substantiv",
  definition:
    "CAD-tegnet skuminnlegg med gravert verktøy-silhuett. CNC-maskinert på Brekstad.",
  etymology: "High Density Foam Insert. Brukt av Forsvaret, aviation og industri.",
  example: "Hvert verktøy har én plass, og avvik oppdages før de blir et problem.",
  ctaText: "Få en demo",
  tagline: "Egen CADLAB · Brekstad",
  ctaUrl: "fosen-tools.no/hdfi",
};

// ── FTMilepaelV2 (stort tall — count-up med rød pulse) ──────────────

export type FTMilepaelV2Props = {
  format: VideoFormat;
  /** Lille etikett over tallet. */
  eyebrow: string;
  /** Tallet (count-up til denne verdien). */
  value: number;
  /** Tekst etter tallet, f.eks. "år", "kunder", "produkter". */
  unit: string;
  /** Hovedoverskrift under tallet. */
  headline: string;
  /** Body-tekst (1-3 setninger). */
  body: string[];
  /** Tagline brukt i outro. */
  tagline?: string;
  /** Åpnings-hook. Default: stat-shock. */
  hook?: HookKindStr;
};

export const SAMPLE_FT_MILEPAEL: FTMilepaelV2Props = {
  format: "reel",
  eyebrow: "Fosen Tools",
  value: 25,
  unit: "år",
  headline: "Levert til Forsvaret, aviation og industri",
  body: [
    "Etablert 2001 på Brekstad.",
    "Egen CADLAB og CNC-produksjon.",
    "Sertifisert leverandør gjennom 25 år.",
  ],
  tagline: "Fra 2001 til i dag",
};

// ── FTSitatV2 (kundesitat med FTSpriteDisk-monogram) ────────────────

export type FTSitatV2Props = {
  format: VideoFormat;
  /** Selve sitatet. */
  quote: string;
  /** Personens navn (initialer brukes på FTSpriteDisk). */
  attributedTo: string;
  /** Rolle/tittel, f.eks. "Logistikkansvarlig". */
  role: string;
  /** Kundenavn/firma, f.eks. "TESS VEST". */
  company: string;
  /** Bilde-URL hvis vi har et faktisk portrett. Null = bruk SpriteDisk. */
  portraitUrl?: string | null;
  /** Tagline brukt i outro. */
  tagline?: string;
  /** Åpnings-hook. Default: visual-reveal. */
  hook?: HookKindStr;
};

export const SAMPLE_FT_SITAT: FTSitatV2Props = {
  format: "reel",
  // SAMPLE: dette er placeholder. FTSitatV2 skal ALDRI publiseres
  // uten et VERIFISERT sitat fra en ekte navngitt person.
  // Bruk en annen komposisjon hvis du ikke har ekte sitat.
  quote: "[Verifisert kundesitat plasseres her]",
  attributedTo: "[Kundens navn]",
  role: "[Tittel]",
  company: "[Firma]",
  portraitUrl: null,
  tagline: "Verktøykontroll for fagfolk",
};

// ─────────────────────────────────────────────────────────────────────
// SALGS-ORIENTERTE KOMPOSISJONER — bygd for å selge HDFI direkte
// (B2B SoMe-research 2026-06-02: prosess > definisjon, tall > generelle
// påstander, før/etter driver konvertering).
// ─────────────────────────────────────────────────────────────────────

// ── FTProsessSpotlight: "Slik lager vi din HDFI" (4 stadier) ───────

export type FTProsessSpotlightProps = {
  format: VideoFormat;
  /** Lille etikett, default "SLIK LAGER VI DIN HDFI". */
  eyebrow: string;
  /** Hovedtittel — typisk "Skreddersydd HDFI" eller "Slik gjør vi det". */
  headline: string;
  /** 4 stadier (orden viktig — vises sekvensielt). */
  stages: {
    /** Stadie-navn, f.eks. "Konsept" / "CAD" / "CNC" / "Levert". */
    label: string;
    /** Kort beskrivelse av hva som skjer her. */
    description: string;
    /** Valgfri bilde-URL — uten = blueprint-/grafikk-fallback. */
    imageUrl?: string | null;
  }[];
  /** Outro-CTA. */
  ctaUrl?: string;
  /** Tagline brukt i outro. */
  tagline?: string;
};

export const SAMPLE_FT_PROSESS: FTProsessSpotlightProps = {
  format: "reel",
  eyebrow: "Slik lager vi din HDFI",
  headline: "Fra konsept til ferdig",
  stages: [
    {
      label: "Konsept",
      description: "Vi måler ditt verktøy og forstår arbeidsflyten.",
    },
    {
      label: "CAD",
      description: "Hvert verktøy får sin egen lomme i CADLABen.",
    },
    {
      label: "CNC",
      description: "Skummet CNC-maskineres på Brekstad.",
    },
    {
      label: "Levert",
      description: "Hver pipe har én plass — null FOD-risiko.",
    },
  ],
  ctaUrl: "fosen-tools.no/hdfi",
  tagline: "Egen CADLAB · CNC-maskinert",
};

// ── FTHDFIvsHyllevare: før/etter med ROI-tagline ────────────────────

export type FTHDFIvsHyllevareProps = {
  format: VideoFormat;
  /** Eyebrow, default "FØR vs ETTER". */
  eyebrow: string;
  /** Hovedtittel — typisk "Slutt på rotet" eller "Verktøykontroll". */
  headline: string;
  /** Før-bilde (kaotisk hyllevare). Null = stylisert fallback. */
  beforeImageUrl: string | null;
  /** Etter-bilde (ordnet HDFI). Null = stylisert fallback. */
  afterImageUrl: string | null;
  /** ROI-tagline, f.eks. "Reduserte verktøysøk-tid med 73%". */
  roiTagline: string;
  /** Tre punkter som forklarer hvorfor HDFI vinner. */
  bullets: string[];
  /** Outro-CTA. */
  ctaUrl?: string;
  /** Tagline brukt i outro. */
  tagline?: string;
};

export const SAMPLE_FT_VSHYLLEVARE: FTHDFIvsHyllevareProps = {
  format: "reel",
  eyebrow: "Før vs etter",
  headline: "Slutt på rotet",
  beforeImageUrl: null,
  afterImageUrl: null,
  roiTagline: "Hver pipe på rett plass. Hver gang.",
  bullets: [
    "Avvik oppdages før de blir et problem",
    "FOD-sikret verktøykontroll",
    "Verktøysøk-tid redusert betydelig",
  ],
  ctaUrl: "fosen-tools.no/hdfi",
  tagline: "Verktøykontroll for fagfolk",
};

// ── FTKundeResultat: kundereferanse med konkret tall ────────────────

export type FTKundeResultatProps = {
  format: VideoFormat;
  /** Kundenavn. Settes til null hvis konfidensielt. */
  customer: string | null;
  /** Bransje, f.eks. "Aviation" / "Forsvar" / "Offshore". */
  industry: string;
  /** Det konkrete tallet (count-up-mål). */
  statValue: string;
  /** Hva tallet betyr, f.eks. "raskere verktøysøk" / "null FOD-hendelser". */
  statContext: string;
  /** Kort beskrivelse av løsningen (1-2 setninger). */
  description: string;
  /** Valgfri bilde-URL av leveransen. */
  imageUrl?: string | null;
  /** Outro-CTA. */
  ctaUrl?: string;
  /** Tagline brukt i outro. */
  tagline?: string;
};

export const SAMPLE_FT_KUNDERES: FTKundeResultatProps = {
  format: "reel",
  // SAMPLE: kunde-navn er null = "TIDLIGERE LEVERANSE" rendres.
  // Sett customer til navn KUN når Adrian har verifisert kunden.
  customer: null,
  industry: "Aviation",
  statValue: "0",
  statContext: "FOD-hendelser på 18 måneder",
  description:
    "Skreddersydd HDFI med gravert silhuett for hver pipe. Avvik oppdages før de blir et problem.",
  imageUrl: null,
  ctaUrl: "fosen-tools.no/aviation",
  tagline: "Sertifisert leverandør gjennom 25 år",
};

// ── FTHvorforHDFI: 3-grunner salgs-pitch ────────────────────────────

export type FTHvorforHDFIProps = {
  format: VideoFormat;
  /** Eyebrow, default "HVORFOR HDFI". */
  eyebrow: string;
  /** Hovedtittel, default "Tre grunner". */
  headline: string;
  /** 3 grunner — kort headline + setning per. */
  reasons: { title: string; body: string }[];
  /** Closing-tagline. */
  closingTagline: string;
  /** Outro-CTA. */
  ctaUrl?: string;
  /** Tagline brukt i outro. */
  tagline?: string;
};

export const SAMPLE_FT_HVORFOR: FTHvorforHDFIProps = {
  format: "reel",
  eyebrow: "Hvorfor HDFI",
  headline: "Tre grunner",
  reasons: [
    {
      title: "FOD-sikret",
      body: "Hvert verktøy tilbake på rett plass. Null FOD-risiko.",
    },
    {
      title: "Sertifisert",
      body: "Levert til Forsvaret, aviation og industri.",
    },
    {
      title: "Skreddersydd",
      body: "CAD-tegnet i CADLAB. CNC-maskinert på Brekstad.",
    },
  ],
  closingTagline: "Det er din HDFI. Vi bygger den.",
  ctaUrl: "fosen-tools.no/hdfi",
  tagline: "Egen CADLAB · CNC-maskinert",
};

// ── FTLeverandorNyhet: produkt-nyhet fra Milwaukee/Wera/Husqvarna ───

export type FTLeverandorNyhetProps = {
  format: VideoFormat;
  /** Leverandør-slug, f.eks. "milwaukee" / "wera" / "husqvarna". */
  supplierSlug: string;
  /** Leverandør display-navn. */
  supplierName: string;
  /** URL til leverandør-logo (PNG/SVG). Vises i Hook F + outro. */
  supplierLogoUrl: string | null;
  /** Produktnavn. */
  productName: string;
  /** Produkt-tagline. */
  productTagline: string;
  /** USP-bullets (2-4). */
  bullets: string[];
  /** Produktbilde-URL. */
  productImageUrl?: string | null;
  /** Outro-CTA — typisk "fosen-tools.no/{merke-slug}". */
  ctaUrl?: string;
  /** Overstyr Hook F-eyebrow. Default "Nyhet fra". Sett f.eks. "Ukens tips". */
  eyebrowOverride?: string;
  /** Overstyr Scene 2-badge. Default "NYHET". Sett f.eks. "TIPS". */
  badgeLabel?: string;
  /** Musikk-variant. Default "hope". */
  musicVariant?: "hope" | "life" | "faraway" | "deephigh" | "together" | "buildup";
};

export const SAMPLE_FT_LEVERANDOR: FTLeverandorNyhetProps = {
  format: "reel",
  supplierSlug: "milwaukee",
  supplierName: "MILWAUKEE",
  supplierLogoUrl: null,
  productName: "M18 FUEL Slagdrill",
  productTagline: "Mer moment. Lengre kjøretid.",
  bullets: [
    "Børsteløs motor",
    "1357 Nm bremsemoment",
    "ONE-KEY-kompatibel",
  ],
  productImageUrl: null,
  ctaUrl: "fosen-tools.no/milwaukee",
};

// ── FTThumbnail (statisk cover-image for reels) ─────────────────────

export type FTThumbnailProps = {
  format: VideoFormat;
  /** Hero-bilde som fyller hele canvas. */
  imageUrl: string;
  /** Liten etikett over headline (UPPERCASE auto). */
  eyebrow: string;
  /** Hovedoverskrift (UPPERCASE auto). 1-4 ord. */
  headline: string;
  /** Tags-chips på bunnen (max 3-4 anbefalt). */
  tags: string[];
  /** Vis 25-årspille i toppen. */
  showJubileum?: boolean;
};

export const SAMPLE_FT_THUMBNAIL: FTThumbnailProps = {
  format: "reel",
  imageUrl: "https://fosen-tools.no/userfiles/image/HDFI/HDFI-svart-bedre.jpg",
  eyebrow: "Skreddersydd HDFI",
  headline: "Helikopter-kit",
  tags: ["HDFI", "PELI 0450", "CADLAB"],
  showJubileum: true,
};

// ── FTProdusentBanner (10000×2500 banner for produsent-sider) ──────

export type FTProdusentBannerProps = {
  /** Produsent-navn (vises som tekst hvis ingen logo). */
  brandName: string;
  /** Tagline (UPPERCASE auto), f.eks. "TYSKE PRESISJONSHAMMERE". */
  tagline: string;
  /** Etablerings-år. */
  estYear: number;
  /** URL til produsent-logo (transparent PNG/SVG). */
  logoUrl?: string;
  /** Hero-bilde for høyre side (cropped med diagonal mask). */
  heroImageUrl?: string;
};

export const SAMPLE_FT_PRODUSENT_BANNER: FTProdusentBannerProps = {
  brandName: "Picard",
  tagline: "Tyske presisjonshammere",
  estYear: 1857,
  logoUrl: "https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/social_assets/brand-assets/leverandor-logoer/picard.png",
  heroImageUrl: undefined,
};
