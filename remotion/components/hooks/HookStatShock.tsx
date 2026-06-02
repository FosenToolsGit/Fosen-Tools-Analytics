// HookStatShock — stort tall fyller frame i 1.5 sek før Scene 2.
// For ROI / milepæl / "hvorfor"-format der et tall er kjernen.
//
// Eksempler:
//   primaryText: "73%"     secondaryText: "raskere verktøysøk"
//   primaryText: "0 mm"    secondaryText: "slark"
//   primaryText: "25 år"   secondaryText: "på Brekstad"
//   primaryText: "1500+"   secondaryText: "leveranser"

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { FT, MONO_FONT, SANS_FONT } from "../../theme";
import { sfx, sfxVolume } from "../../audio-registry";
import type { HookProps } from "./types";

export const HookStatShock: React.FC<HookProps> = ({
  eyebrow = "FOSEN TOOLS",
  primaryText = "25",
  secondaryText = "år",
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  if (frame >= durationInFrames) return null;

  // Sub-second riser, then impact-close on landing
  const bgT = interpolate(frame, [0, 6], [0, 1], {
    extrapolateRight: "clamp",
  });
  const bgExit = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Tall slammer inn 10-26 med harder spring
  const slam = spring({
    frame: frame - 10,
    fps,
    config: { damping: 10, stiffness: 280 },
  });

  // Eyebrow fader inn 4-20
  const eyebrowT = interpolate(frame, [4, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Secondary fader inn 30-50
  const secondaryT = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle pulse på tallet etter slam
  const pulse = 0.95 + 0.05 * Math.sin((frame - 26) * 0.18);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 70% 60% at 50% 50%, rgba(237, 28, 36, 0.35), transparent 70%), ${FT.ink}`,
        opacity: bgT * bgExit,
      }}
    >
      {/* Riser bygger opp + impact lander */}
      <Sequence from={0} durationInFrames={30}>
        <Audio src={sfx("riser-slow")} volume={sfxVolume("riser-slow") * 0.7} />
      </Sequence>
      <Sequence from={20}>
        <Audio
          src={sfx("impact-close")}
          volume={sfxVolume("impact-close") * 0.9}
        />
      </Sequence>

      {/* Eyebrow på topp */}
      <div
        style={{
          position: "absolute",
          top: 80,
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
            fontSize: 24,
            color: "rgba(255, 255, 255, 0.6)",
            letterSpacing: 8,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
      </div>

      {/* DET STORE TALLET — fyller frame */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: slam,
          transform: `scale(${0.85 + 0.15 * slam}) scale(${pulse})`,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: width > 1600 ? 480 : 380,
            fontWeight: 800,
            color: FT.white,
            lineHeight: 0.9,
            letterSpacing: -16,
            textShadow: `0 0 60px rgba(237, 28, 36, 0.4), 0 12px 36px rgba(0, 0, 0, 0.5)`,
          }}
        >
          {primaryText}
        </div>
      </AbsoluteFill>

      {/* Secondary — "år" / "raskere verktøysøk" */}
      {secondaryText && (
        <div
          style={{
            position: "absolute",
            bottom: 140,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: secondaryT,
          }}
        >
          <div
            style={{
              fontFamily: SANS_FONT,
              fontSize: 48,
              color: FT.red,
              fontWeight: 700,
              letterSpacing: 1,
              textAlign: "center",
            }}
          >
            {secondaryText}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
