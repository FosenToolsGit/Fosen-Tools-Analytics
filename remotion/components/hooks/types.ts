// Hook-typer: varianter av Scene 1 (åpningen). Hver komposisjon
// velger sin default hook, og kan overstyres via prop. Slik unngår vi
// at hver FT-video starter likt — feeden får visuell variasjon mens
// brand-merket holdes konsistent (FT_BRAND_MARK overalt).
//
// Alle hooks varer 90 frames (3 sek) som standard.

export type HookKind =
  | "brand-coldopen" // A: FTLoadingScreen — radar/blueprint + wordmark
  | "eyebrow-slam" // B: "LEVERT TIL X" slammer rødt
  | "stat-shock" // C: Stort tall fyller frame
  | "visual-reveal" // D: Bildet kommer fra svart med light-leak
  | "process-glimpse" // E: 0.3 sek glimt CAD → CNC → HDFI
  | "leverandor-tagin"; // F: Leverandør-logo slammer inn

export type HookProps = {
  /** Tagline brukt under wordmark (varierer per hook). */
  tagline?: string;
  /** Eyebrow over hovedteksten (hva slags innhold er dette). */
  eyebrow?: string;
  /** Hovedtekst (for stat-shock: tallet; for eyebrow-slam: kundenavn). */
  primaryText?: string;
  /** Secondary tekst (for stat-shock: enhet "år"; for eyebrow-slam: "Norwegian Aero"). */
  secondaryText?: string;
  /** Image-URL hvis hook trenger bilde (visual-reveal, leverandor-tagin). */
  imageUrl?: string | null;
  /** Leverandør-logo-URL (leverandor-tagin). */
  logoUrl?: string | null;
  /** Total varighet i frames. Default 90. */
  durationInFrames?: number;
};
