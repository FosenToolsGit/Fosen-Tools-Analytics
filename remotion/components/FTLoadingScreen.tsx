// FTLoadingScreen — 3-second brand cold-open (90 frames @ 30 fps).
// Adapted from Hundo Hunter's LoadingScreen but retuned for FT's
// industrial / B2B brand: no radar, no holographic gradient. Instead
// a blueprint grid sweeps, a centered cross-hair "+" assembles, the
// FOSEN TOOLS wordmark snaps in with its signature 70px red underline,
// and a CADLAB · BREKSTAD status line settles below.
//
// Returns null after the screen has faded out so the parent Sequence
// can move on. Always renders against AmbientLayer-style backdrop —
// host composition should mount that first.
//
// Timing (90 frames):
//   0-30   blueprint cross-hair "+" assembles in center
//   25-50  CADLAB · BREKSTAD eyebrow fades in
//   45-65  FOSEN TOOLS wordmark snaps in, scales 0.92→1.0
//   55-75  70px red underline draws under wordmark, left→right
//   70-90  tagline fades in below
//   80-90  whole screen fades out (so Scene 2 can take over)

import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { FT, SANS_FONT, MONO_FONT } from "../theme";
import { BEAT, FT_BRAND_MARK } from "../ft-pipeline";

export const FTLoadingScreen: React.FC<{
  /** Tagline below the wordmark. */
  tagline?: string;
  /** Status eyebrow above the wordmark. */
  eyebrow?: string;
  /** Override total duration. Defaults to BEAT.loadingScreen (90). */
  durationInFrames?: number;
}> = ({
  tagline = "Skreddersydd på Brekstad",
  eyebrow = "CADLAB · BREKSTAD",
  durationInFrames = BEAT.loadingScreen,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Don't render anything past the screen's exit.
  if (frame >= durationInFrames) return null;

  // Animation phases.
  const crossT = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const eyebrowT = interpolate(frame, [25, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const wordmarkT = interpolate(frame, [45, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const wordmarkScale = interpolate(frame, [45, 65], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const underlineT = interpolate(frame, [55, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineT = interpolate(frame, [70, 85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Cross-hair "+" arm sizes assemble from 0 to full.
  const armLen = 240 * crossT;

  // Logo-spec fra FT_BRAND_MARK — autoritativ kilde. Aldri overstyrt.
  const wmWidth = FT_BRAND_MARK.widthFor(width);
  const wmHeight = FT_BRAND_MARK.heightFor(width);
  const underlineWidth =
    wmWidth * FT_BRAND_MARK.accentStripe.widthFactor * underlineT;

  return (
    <AbsoluteFill
      style={{ opacity: exit, fontFamily: SANS_FONT, color: FT.white }}
    >
      {/* Center cross-hair "+" — engineering reticle, not radar sweep */}
      <div
        style={{
          position: "absolute",
          left: width / 2,
          top: height / 2 - 200,
          width: 0,
          height: 0,
        }}
      >
        {/* Horizontal arm */}
        <div
          style={{
            position: "absolute",
            left: -armLen / 2,
            top: -1,
            width: armLen,
            height: 2,
            background: FT.red,
            opacity: 0.85,
          }}
        />
        {/* Vertical arm */}
        <div
          style={{
            position: "absolute",
            left: -1,
            top: -armLen / 2,
            width: 2,
            height: armLen,
            background: FT.red,
            opacity: 0.85,
          }}
        />
        {/* Center dot */}
        <div
          style={{
            position: "absolute",
            left: -6,
            top: -6,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: FT.red,
            boxShadow: `0 0 18px ${FT.red}`,
            opacity: crossT,
          }}
        />
        {/* Outer pulse ring */}
        <div
          style={{
            position: "absolute",
            left: -32,
            top: -32,
            width: 64,
            height: 64,
            borderRadius: "50%",
            border: `1px solid ${FT.red}`,
            opacity: 0.4 * crossT,
          }}
        />
      </div>

      {/* Eyebrow line above wordmark */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: height / 2 + 80,
          display: "flex",
          justifyContent: "center",
          opacity: eyebrowT,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 22,
            color: "rgba(255, 255, 255, 0.55)",
            letterSpacing: 6,
            fontWeight: 500,
          }}
        >
          {eyebrow}
        </div>
      </div>

      {/* FT-merket — rød-bakgrunn-logo (default per FT brand-policy
          1. juni 2026: bruk ALLTID rød-bakgrunn-versjonen, hvit kun når
          flaten allerede er FT-rød). 5:1 aspekt, 2000×399. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: height / 2 + 110,
          display: "flex",
          justifyContent: "center",
          opacity: wordmarkT,
          transform: `scale(${wordmarkScale})`,
        }}
      >
        <Img
          src={staticFile(FT_BRAND_MARK.src)}
          style={{
            width: wmWidth,
            height: wmHeight,
            display: "block",
            objectFit: "contain",
            boxShadow: FT_BRAND_MARK.boxShadow,
          }}
        />
      </div>

      {/* Hvit aksent-stripe under merket (flaten ER FT-rød etter
          logoen, så hvit gir tydeligst kontrast). */}
      <div
        style={{
          position: "absolute",
          left: width / 2 - underlineWidth / 2,
          top: height / 2 + 110 + wmHeight + FT_BRAND_MARK.marginBelow,
          width: underlineWidth,
          height: FT_BRAND_MARK.accentStripe.height,
          background: FT_BRAND_MARK.accentStripe.color,
          opacity: FT_BRAND_MARK.accentStripe.opacity,
        }}
      />

      {/* Tagline below underline */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: height / 2 + 110 + wmHeight + FT_BRAND_MARK.marginBelow + 28,
          display: "flex",
          justifyContent: "center",
          opacity: taglineT,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 26,
            color: "rgba(255, 255, 255, 0.72)",
            letterSpacing: 1,
            fontWeight: 500,
          }}
        >
          {tagline}
        </div>
      </div>
    </AbsoluteFill>
  );
};
