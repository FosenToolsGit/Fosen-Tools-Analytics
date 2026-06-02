// Extra Remotion-pipeline tokens that sit on top of `theme.ts`. Theme.ts
// owns the brand palette (FT-rød, ink, cream); this file owns the
// pipeline-specific layers — blueprint-blue tint for the always-on
// AmbientLayer, animation curves shared across compositions, and tagline
// variants we cycle through so the brand pulse never reads as identical
// each day.

export const BLUEPRINT = {
  /** Faint blueprint grid line color (over FT.ink). */
  gridLine: "rgba(255, 80, 80, 0.07)",
  /** Slightly stronger grid line every N cells. */
  gridLineMajor: "rgba(255, 80, 80, 0.14)",
  /** Cell size in px on a 1080-wide canvas. */
  cell: 48,
  /** Every Nth line is a major. */
  majorEvery: 4,
  /** Drift / dust particle color. */
  dust: "rgba(255, 255, 255, 0.32)",
  /** Slow radial-glow on AmbientLayer. */
  glow: "rgba(237, 28, 36, 0.18)",
} as const;

/** Standard rhythm units (in frames) so every composition's beats land
 *  predictably against the music/SFX bed. */
export const BEAT = {
  /** A "snap-in" (interpolate) — fastest move. */
  snap: 4,
  /** Standard fade in/out. */
  fade: 12,
  /** Stagger between items in a list. */
  stagger: 6,
  /** Banner card show duration. */
  bannerHold: 60,
  /** Time we hold the brand wordmark before fading. */
  wordmarkHold: 30,
  /** Loading screen total duration. */
  loadingScreen: 90,
  /** Outro total duration. */
  outro: 120,
} as const;

// Taglines har flyttet til ft-vocab.ts — den eneste autoritative kilden.
// Importer derfra:  import { pickTagline, TAGLINES } from "./ft-vocab";

// ── FT_BRAND_MARK — ÉN autoritativ logo-spec for hele pipelinen ────
// Adrian 2026-06-02: logoen skal ha lik størrelse hele veien, aldri
// virke malplassert. Alle hooks + outro + banner-overlays leser
// herfra; ingen ad-hoc dimensjoner.
//
// 5:1 aspekt (2000×399), rød-bakgrunn-versjon
// (public/brosjyre/fosentools_logo_ny2.png — FT brand-policy
// 1. juni 2026: bruk ALLTID rød-bakgrunn-versjonen, hvit kun når
// flaten allerede ER FT-rød).

export const FT_BRAND_MARK = {
  src: "/brosjyre/fosentools_logo_ny2.png",
  aspect: 5, // width / height
  /** Pixel-bredde for hver canvas-bredde. Holder logoen i samme
   *  visuelle størrelse uansett aspect — den ser aldri "for stor"
   *  eller "for liten" ut. */
  widthFor(canvasWidth: number): number {
    if (canvasWidth >= 1920) return 720; // wide 16:9
    return 640; // reel + square
  },
  heightFor(canvasWidth: number): number {
    return this.widthFor(canvasWidth) / this.aspect;
  },
  /** Drop-shadow + subtil rød glow. Brukes konsistent overalt. */
  boxShadow:
    "0 14px 36px rgba(0, 0, 0, 0.45), 0 0 28px rgba(237, 28, 36, 0.25)",
  /** Sidemargin under logoen mellom logo og påfølgende tekst. */
  marginBelow: 28,
  /** Hvit aksent-stripe under logoen (siden flaten ER FT-rød). */
  accentStripe: {
    height: 4,
    color: "#FFFFFF",
    opacity: 0.85,
    widthFactor: 0.55, // 55% av logo-bredde
  },
} as const;

/** Music-bed master volume — runs through entire video. Always-on by
 *  design (silence in 20-sec social video is fatal per Hundo Hunter A/B). */
export const MUSIC_BED_VOLUME = 0.22;

/** Outro chime volume — punches above music bed. */
export const OUTRO_CHIME_VOLUME = 0.75;

/** Canvas safe-area inset from each edge, in px on a 1080-wide canvas.
 *  Anything caption-critical should respect this so it doesn't get
 *  cropped on Instagram's variable safe zones. */
export const SAFE_AREA = {
  top: 200,
  bottom: 320,
  side: 80,
} as const;
