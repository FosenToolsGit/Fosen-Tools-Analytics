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

// ── felles registry-typer (brukt av Root + render-pipeline) ──────────

export type VideoType =
  | "produkt-spotlight"
  | "leveranse-reel"
  | "milepael"
  | "kampanje-teaser"
  | "sitat";

/** Komposisjons-id slik den er registrert i Root.tsx. */
export const COMPOSITION_ID: Record<VideoType, string> = {
  "produkt-spotlight": "ProduktSpotlight",
  "leveranse-reel": "LeveranseReel",
  milepael: "MilepaelClip",
  "kampanje-teaser": "KampanjeTeaser",
  sitat: "SitatClip",
};
