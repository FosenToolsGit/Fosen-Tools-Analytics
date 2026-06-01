// Props-typer for hver av de 15 jubileum-video-komposisjonene.
//
// Hver komposisjon har et `format`-felt — `calculateMetadata` i Root.tsx
// leser det og setter dimensjoner (1080×1920 / 1080×1080 / 1920×1080),
// så samme komposisjon kan rendres som Reel / Kvadrat / Bred uten egne
// registreringer.
//
// Hver komposisjon eksporterer også et `SAMPLE_*`-objekt som standard
// defaultProps i Studio.

import type { VideoFormat } from "./shared";

// =============================================================================
// T-14 · Save the date
// =============================================================================

export type T14Props = {
  format: VideoFormat;
  /** "26. JUNI 2026" — hovedlinje. */
  dateLine: string;
  /** "25 ÅR + BUTIKKÅPNING" — undertittel. */
  subtitle: string;
  /** "BREKSTAD" — sted. */
  place: string;
};

export const SAMPLE_T14: T14Props = {
  format: "reel",
  dateLine: "26. JUNI 2026",
  subtitle: "25 ÅR + BUTIKKÅPNING",
  place: "BREKSTAD",
};

// =============================================================================
// T-13 · Bak kulissene — ombygging
// =============================================================================

export type T13Props = {
  format: VideoFormat;
  /** "OMBYGGING · BREKSTAD" */
  eyebrow: string;
  /** "Vi gjør plass til neste 25 år" */
  headline: string;
  /** Tre punkt-stikkord under headline. */
  bullets: [string, string, string];
};

export const SAMPLE_T13: T13Props = {
  format: "reel",
  eyebrow: "OMBYGGING · BREKSTAD",
  headline: "VI GJØR PLASS\nTIL NESTE 25 ÅR",
  bullets: [
    "Ny butikk-layout",
    "Demo-soner for HDFI",
    "Bedre flyt for proffkundene",
  ],
};

// =============================================================================
// T-12 · Erik-sitat
// =============================================================================

export type T12Props = {
  format: VideoFormat;
  /** Sitatet — uten anførselstegn (de tegnes som SVG). */
  quote: string;
  /** Navn. */
  name: string;
  /** Rolle. */
  role: string;
};

export const SAMPLE_T12: T12Props = {
  format: "reel",
  quote:
    "Vi har aldri solgt verktøy alene. Vi har solgt riktig verktøy for hverdagen — og fulgt opp etterpå.",
  name: "Erik Bonsaksen",
  role: "Daglig leder · Fosen Tools",
};

// =============================================================================
// T-11 · Program
// =============================================================================

export type T11Props = {
  format: VideoFormat;
  /** "PROGRAM 26. JUNI" */
  eyebrow: string;
  /** Tidslinje — typisk [["10:00","Dørene åpner"],["11–13","Servering"],["13:00","PROFF"]] */
  schedule: { time: string; label: string }[];
};

export const SAMPLE_T11: T11Props = {
  format: "reel",
  eyebrow: "PROGRAM 26. JUNI",
  schedule: [
    { time: "10:00", label: "Dørene åpner" },
    { time: "11–13", label: "Enkel servering" },
    { time: "13:00", label: "PROFF-presentasjon" },
    { time: "16:00", label: "Vi takker for besøket" },
  ],
};

// =============================================================================
// T-10/9/8 · Partner-spotlights (Milwaukee/Wera/Soudal)
// =============================================================================

export type PartnerProps = {
  format: VideoFormat;
  /** Partner-navn (vises stort). */
  partner: string;
  /** Akzent-farge (matcher partnerens brand). */
  accentColor: string;
  /** USP-tagline, f.eks. "Tysk presisjon siden 1936". */
  tagline: string;
  /** "M18 · M12 · MX FUEL" — chips/specs som vises under. */
  chips: string[];
};

export const SAMPLE_T10_MILWAUKEE: PartnerProps = {
  format: "reel",
  partner: "MILWAUKEE",
  accentColor: "#DC0000",
  tagline: "M18 OG M12-ØKOSYSTEMET — DIREKTE FRA TEAMET",
  chips: ["M18 FUEL", "M12", "MX FUEL", "PACKOUT"],
};

export const SAMPLE_T9_WERA: PartnerProps = {
  format: "reel",
  partner: "WERA",
  accentColor: "#13B04C",
  tagline: "TYSK PRESISJON SIDEN 1936",
  chips: ["KRAFTFORM", "JOKER", "TOOL REBEL"],
};

export const SAMPLE_T8_SOUDAL: PartnerProps = {
  format: "reel",
  partner: "SOUDAL",
  accentColor: "#003C82",
  tagline: "BELGISK LIM, FUGEMASSE OG FOAM",
  chips: ["LIM", "FUGEMASSE", "FOAM"],
};

// =============================================================================
// T-7 · En uke igjen!
// =============================================================================

export type T7Props = {
  format: VideoFormat;
  /** Stort tall — 7. */
  daysLeft: number;
  /** "DAGER" eller "DAG". */
  unit: string;
  /** "EN UKE TIL VI FEIRER 25 ÅR" */
  headline: string;
};

export const SAMPLE_T7: T7Props = {
  format: "reel",
  daysLeft: 7,
  unit: "DAGER",
  headline: "ÉN UKE TIL VI FEIRER 25 ÅR",
};

// =============================================================================
// T-6 · Goodiebag-teaser
// =============================================================================

export type T6Props = {
  format: VideoFormat;
  /** "100" — antall goodiebags. */
  count: number;
  /** "Goodiebag til de første 100" */
  headline: string;
  /** Bullets: T-skjorte, leverandør-overraskelse, rabatt-kupong. */
  contents: string[];
};

export const SAMPLE_T6: T6Props = {
  format: "reel",
  count: 100,
  headline: "GOODIEBAG TIL\nDE FØRSTE 100",
  contents: [
    "FT 25-års-T-skjorte",
    "Leverandør-overraskelse",
    "Rabattkupong — gyldig hele dagen",
  ],
};

// =============================================================================
// T-5 · 100 år i konsernet
// =============================================================================

export type T5Props = {
  format: VideoFormat;
  /** Tidslinje-årstall + label. */
  timeline: { year: string; label: string }[];
  /** "Et helt århundre" */
  headline: string;
};

export const SAMPLE_T5: T5Props = {
  format: "reel",
  timeline: [
    { year: "1926", label: "Familien starter" },
    { year: "2001", label: "Fosen Tools stiftes" },
    { year: "2026", label: "25 år + 100 år" },
  ],
  headline: "ET HELT ÅRHUNDRE\nMED VERDISKAPING",
};

// =============================================================================
// T-4 · Spesielle gjester (Red Bull + Tesla)
// =============================================================================

export type T4Props = {
  format: VideoFormat;
  /** "SPESIELLE GJESTER" */
  eyebrow: string;
  /** Gjest-1 navn. */
  guestA: string;
  /** Gjest-2 navn. */
  guestB: string;
  /** Linje under, f.eks. "+ Leverandørene på plass". */
  subline: string;
};

export const SAMPLE_T4: T4Props = {
  format: "reel",
  eyebrow: "SPESIELLE GJESTER",
  guestA: "RED BULL",
  guestB: "TESLA\nMOBILE SERVICE",
  subline: "+ Leverandørene på plass hele dagen",
};

// =============================================================================
// T-3 · PROFF-presentasjon kl 13
// =============================================================================

export type T3Props = {
  format: VideoFormat;
  /** "PROFF-PRESENTASJON" */
  eyebrow: string;
  /** "13:00" — klokkeslett. */
  time: string;
  /** "Faktura · ordre · innkjøp — én flyt." */
  pitch: string;
};

export const SAMPLE_T3: T3Props = {
  format: "reel",
  eyebrow: "PROFF-PRESENTASJON",
  time: "13:00",
  pitch: "FAKTURA · ORDRE · INNKJØP — ÉN FLYT",
};

// =============================================================================
// T-2 · Konkurranser + servering
// =============================================================================

export type T2Props = {
  format: VideoFormat;
  /** 4 høydepunkter for dagen. */
  highlights: string[];
};

export const SAMPLE_T2: T2Props = {
  format: "reel",
  highlights: [
    "Eksklusive dagstilbud",
    "Konkurranser med premier",
    "Enkel servering 11–13",
    "Faglig påfyll hele dagen",
  ],
};

// =============================================================================
// T-1 · I MORGEN!
// =============================================================================

export type T1Props = {
  format: VideoFormat;
  /** "I MORGEN" eller "I MORGEN FEIRER VI". */
  headline: string;
  /** Subline med tid + sted. */
  subline: string;
};

export const SAMPLE_T1: T1Props = {
  format: "reel",
  headline: "I MORGEN",
  subline: "INDUSTRIGATA 1, BREKSTAD · 10:00 – 16:00",
};

// =============================================================================
// DAGEN · VI ER ÅPNE
// =============================================================================

export type DagenProps = {
  format: VideoFormat;
  /** "VI ER ÅPNE" / "VELKOMMEN INN". */
  headline: string;
  /** Programmet vises som chips. */
  chips: string[];
};

export const SAMPLE_DAGEN: DagenProps = {
  format: "reel",
  headline: "VI ER ÅPNE",
  chips: ["MILWAUKEE", "WERA", "SOUDAL", "PICARD/HALDER", "ZWEIBRÜDER", "RED BULL", "TESLA"],
};

// =============================================================================
// Komposisjons-ID + VideoType (UI-konsumert)
// =============================================================================

export type JubileumVideoType =
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

export const JUBILEUM_COMPOSITION_ID: Record<JubileumVideoType, string> = {
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
