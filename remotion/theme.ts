// Felles visuelle tokens for Fosen Tools Remotion-videoer. Speiler
// FT-merkevaren (roed / ink / Manrope) — samme palett som
// src/lib/services/innlegg/core.ts og brosjyre-editoren.
//
// Alt i remotion/ er bevisst selvstendig: importerer KUN `remotion`,
// React, `@remotion/google-fonts` og lokale filer. Live data ankommer
// som vanlig JSON via inputProps, slik at video-bundelen forblir
// frakoblet Next-appen.

import { loadFont as loadSans } from "@remotion/google-fonts/Manrope";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const sans = loadSans("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["latin"],
});
const mono = loadMono("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

export const SANS_FONT = sans.fontFamily;
export const MONO_FONT = mono.fontFamily;

// FT design-tokens — 1:1 med innlegg/core.ts.
export const FT = {
  red: "#ED1C24",
  ink: "#0F1115",
  inkDeep: "#06080B",
  white: "#FFFFFF",
  cream: "#F5F1E8",
  creamWarm: "#EFE6D3",
  burstYellow: "#F4D43A",
  goldTop: "#85704D",
  goldBottom: "#DBB78B",
  slate: "#1B1E23",
  inkDim: "rgba(255,255,255,0.62)",
  inkMute: "rgba(255,255,255,0.40)",
  creamDim: "rgba(15,17,21,0.62)",
  creamMute: "rgba(15,17,21,0.42)",
} as const;

// Bakgrunner — radial-gloed over flat farge, samme stil som BG i core.ts.
export const BG = {
  ink: `radial-gradient(ellipse 60% 55% at 18% 12%, rgba(237,28,36,0.24), transparent 70%), ${FT.ink}`,
  inkDeep: FT.inkDeep,
  red: `radial-gradient(ellipse 70% 60% at 80% 12%, rgba(0,0,0,0.30), transparent 70%), ${FT.red}`,
  cream: `radial-gradient(ellipse 80% 60% at 20% 100%, rgba(237,28,36,0.08), transparent 70%), ${FT.creamWarm}`,
} as const;

// Wordmark-PNG-ene ligger i public/ — Remotion serverer public/ som rot,
// saa en absolutt "/..."-sti fungerer i Studio og ved render.
export const WORDMARK = {
  /** Roed boks-versjon (SVG) — primaert for video-komposisjoner. */
  color: "/social/brand-assets/ft-wordmark-color.svg",
  white: "/social/brand-assets/ft-wordmark-white.png",
  red: "/social/brand-assets/ft-wordmark-red.png",
  ink: "/social/brand-assets/ft-wordmark-ink.png",
} as const;

export const JUBILEUM = {
  aar25: "/social/brand-assets/jubileum-25aar.png",
  aar100: "/social/brand-assets/jubileum-100aar.png",
} as const;

/**
 * Offisiell Fosen Tools-tagline. Vises som støtte-tekst i nærheten av
 * wordmarken (i stedet for å gjenta brand-navnet — wordmarken ER navnet).
 */
export const TAGLINE =
  "Din komplette leverandør av driftseffektive og bruker-tilrettelagte løsninger!";
