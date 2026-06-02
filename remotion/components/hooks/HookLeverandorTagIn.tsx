// HookLeverandorTagIn — leverandør-logo + "NYHET FRA [MERKE]" slammer
// inn. Signaliserer at FT er autorisert forhandler for store
// kvalitetsmerker. Brukes på Milwaukee/Wera/Husqvarna-nyheter.
//
// Visuell signatur: FT-ink-bg, leverandør-logo i senter (stor), eyebrow
// over, FT-stempel nederst som "Forhandlet av FOSEN TOOLS".

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { FT, MONO_FONT, SANS_FONT } from "../../theme";
import { FT_BRAND_MARK } from "../../ft-pipeline";
import { sfx, sfxVolume } from "../../audio-registry";
import type { HookProps } from "./types";

export const HookLeverandorTagIn: React.FC<HookProps> = ({
  eyebrow = "NYHET FRA",
  primaryText = "MILWAUKEE",
  logoUrl,
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  if (frame >= durationInFrames) return null;

  // Bg fades inn 0-6
  const bgT = interpolate(frame, [0, 6], [0, 1], {
    extrapolateRight: "clamp",
  });
  const bgExit = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Eyebrow fader inn 8-22
  const eyebrowT = interpolate(frame, [8, 22], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Logo slammer inn 18-40 med spring
  const logoSlam = spring({
    frame: frame - 18,
    fps,
    config: { damping: 14, stiffness: 220 },
  });

  // FT-stempel nederst fader inn 40-58
  const ftStampT = interpolate(frame, [40, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo-størrelse — leverandør-logo skal være stor (større enn FT)
  const logoMaxSize = width > 1600 ? 540 : 480;

  // FT-merket nederst — sentralisert spec
  const ftMarkWidth = FT_BRAND_MARK.widthFor(width) * 0.55;
  const ftMarkHeight = ftMarkWidth / FT_BRAND_MARK.aspect;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 60% 50% at 50% 35%, rgba(237, 28, 36, 0.18), transparent 70%), ${FT.ink}`,
        opacity: bgT * bgExit,
      }}
    >
      {/* Whoosh ved start */}
      <Sequence from={0}>
        <Audio
          src={sfx("whoosh-deep")}
          volume={sfxVolume("whoosh-deep") * 0.8}
        />
      </Sequence>

      {/* Eyebrow "NYHET FRA" */}
      <div
        style={{
          position: "absolute",
          top: height * 0.16,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: eyebrowT,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 28,
            color: FT.red,
            letterSpacing: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            padding: "12px 32px",
            border: `1.5px solid ${FT.red}`,
            background: "rgba(237, 28, 36, 0.08)",
          }}
        >
          {eyebrow}
        </div>
      </div>

      {/* Leverandør-logo (eller tekst-fallback) */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: logoSlam,
          transform: `scale(${0.86 + 0.14 * logoSlam})`,
        }}
      >
        {logoUrl ? (
          <Img
            src={logoUrl}
            style={{
              maxWidth: logoMaxSize,
              maxHeight: logoMaxSize * 0.5,
              objectFit: "contain",
              filter: "brightness(1.05) drop-shadow(0 0 24px rgba(255,255,255,0.18))",
            }}
          />
        ) : (
          <div
            style={{
              fontFamily: SANS_FONT,
              fontSize: width > 1600 ? 160 : 130,
              fontWeight: 800,
              color: FT.white,
              letterSpacing: -2,
              textAlign: "center",
              textShadow: "0 0 40px rgba(255, 255, 255, 0.18)",
            }}
          >
            {primaryText}
          </div>
        )}
      </AbsoluteFill>

      {/* FT-stempel nederst — "Forhandlet av FT-merket" */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.1,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          opacity: ftStampT,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 16,
            color: "rgba(255, 255, 255, 0.5)",
            letterSpacing: 6,
            fontWeight: 500,
            textTransform: "uppercase",
          }}
        >
          Forhandlet av
        </div>
        <Img
          src={staticFile(FT_BRAND_MARK.src)}
          style={{
            width: ftMarkWidth,
            height: ftMarkHeight,
            objectFit: "contain",
            boxShadow: FT_BRAND_MARK.boxShadow,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
