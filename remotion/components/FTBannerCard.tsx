// FTBannerCard — caption-style overlay that explains what's happening
// in Scene 2. Sits at the bottom of the canvas by default, has an
// accent-bar on the left edge in FT-rød, FT-cream text on a blur-bg.
//
// Renders only inside the [from, from+durationInFrames] window — uses
// global frame logic, so this component must be mounted OUTSIDE any
// containing Sequence (consistent with Hundo Hunter's BannerCard).

import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { FT, MONO_FONT, SANS_FONT } from "../theme";

export const FTBannerCard: React.FC<{
  /** Bold caption — the main thing the viewer reads. */
  headline: string;
  /** Optional secondary line below. */
  subline?: string;
  /** Global frame to appear at. */
  from: number;
  /** How long the card stays on screen. */
  durationInFrames?: number;
  /** Y position from top in px on a 1920-tall canvas. */
  yPosition?: number;
  /** Accent color for the left bar + subline. */
  accent?: string;
  /** Side inset, in px. */
  inset?: number;
}> = ({
  headline,
  subline,
  from,
  durationInFrames = 90,
  yPosition,
  accent = FT.red,
  inset = 48,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const local = frame - from;
  if (local < 0 || local > durationInFrames) return null;

  // Default Y position: 200px from bottom of whatever canvas height we
  // have, so it sits comfortably above the bottom safe area on Reels +
  // 4:5 + 16:9.
  const y = yPosition ?? height - 280;

  const enter = spring({
    frame: local,
    fps,
    config: { damping: 14, stiffness: 200 },
  });
  const exit = interpolate(
    local,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ zIndex: 80, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: y,
          left: inset,
          right: inset,
          padding: "26px 32px 26px 38px",
          borderRadius: 8,
          background:
            "linear-gradient(135deg, rgba(15,17,21,0.85), rgba(15,17,21,0.70))",
          border: `1px solid rgba(255, 255, 255, 0.08)`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow:
            "0 14px 36px rgba(0,0,0,0.45), 0 0 22px rgba(237, 28, 36, 0.18)",
          opacity: enter * exit,
          transform: `translateY(${(1 - enter) * 16}px)`,
        }}
      >
        {/* Accent bar on left edge */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            background: accent,
            borderTopLeftRadius: 8,
            borderBottomLeftRadius: 8,
          }}
        />
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 42,
            fontWeight: 800,
            color: FT.white,
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            lineHeight: 1.15,
          }}
        >
          {headline}
        </div>
        {subline && (
          <div
            style={{
              marginTop: 10,
              fontFamily: MONO_FONT,
              fontSize: 20,
              fontWeight: 500,
              color: accent,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {subline}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
