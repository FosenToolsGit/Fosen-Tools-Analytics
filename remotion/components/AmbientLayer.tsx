// AmbientLayer — always-on background that establishes FT's
// engineering / industrial DNA. Composes: (1) FT-ink gradient bg, (2)
// faint blueprint grid that gently breathes, (3) sparse dust particles
// drifting upward, (4) a slow radial glow in the bottom-left corner.
//
// Goal: NEVER static. Even a Definition card with no other motion should
// feel alive. This is how we avoid the "white background, black text,
// dead Reel" failure mode from the first-pass renders.

import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import { FT } from "../theme";
import { BLUEPRINT } from "../ft-pipeline";

type Variant = "ink" | "ink-deep" | "cream";

export const AmbientLayer: React.FC<{
  variant?: Variant;
  /** 0-1, scales all motion. Defaults to 1. */
  intensity?: number;
}> = ({ variant = "ink", intensity = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Background — variant decides base + radial overlay.
  const bgStyle = useMemo(() => {
    if (variant === "cream") {
      return {
        background: `radial-gradient(ellipse 70% 60% at 20% 90%, rgba(237, 28, 36, 0.06), transparent 70%), ${FT.creamWarm}`,
      };
    }
    if (variant === "ink-deep") {
      return { background: FT.inkDeep };
    }
    return {
      background: `radial-gradient(ellipse 60% 55% at 18% 12%, rgba(237, 28, 36, 0.22), transparent 70%), ${FT.ink}`,
    };
  }, [variant]);

  // Blueprint grid breathing — opacity oscillates between 0.55 and 1.0
  // over 6 seconds, so the grid pulses subtly like a live HUD.
  const breathe = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(frame * 0.035));
  const gridOpacity = 0.85 * breathe * intensity;

  // Determine grid line color based on variant — over cream we need a
  // much darker line, not the rgba-white-on-dark default.
  const lineColor =
    variant === "cream"
      ? "rgba(15, 17, 21, 0.05)"
      : BLUEPRINT.gridLine;
  const lineMajorColor =
    variant === "cream"
      ? "rgba(15, 17, 21, 0.10)"
      : BLUEPRINT.gridLineMajor;

  // Deterministic dust particles — 36 dots that drift upward at varying
  // speeds. Position seeded by index so it's reproducible.
  const dust = useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => {
      const sx = ((i * 137.5) % 100);
      const speed = 0.18 + ((i * 7) % 11) * 0.025;
      const phase = (i * 53) % 360;
      const size = 1 + ((i * 13) % 5) * 0.6;
      return { sx, speed, phase, size };
    });
  }, []);

  // Slow radial glow in bottom-left — gently shifts in opacity over
  // ~12 seconds.
  const glowOpacity =
    0.55 + 0.45 * (0.5 + 0.5 * Math.sin(frame * 0.018 + 1.2));

  return (
    <AbsoluteFill style={bgStyle}>
      {/* Blueprint grid */}
      <AbsoluteFill
        style={{
          opacity: gridOpacity,
          backgroundImage: `
            linear-gradient(${lineMajorColor} 1px, transparent 1px),
            linear-gradient(90deg, ${lineMajorColor} 1px, transparent 1px),
            linear-gradient(${lineColor} 1px, transparent 1px),
            linear-gradient(90deg, ${lineColor} 1px, transparent 1px)
          `,
          backgroundSize: `
            ${BLUEPRINT.cell * BLUEPRINT.majorEvery}px ${BLUEPRINT.cell * BLUEPRINT.majorEvery}px,
            ${BLUEPRINT.cell * BLUEPRINT.majorEvery}px ${BLUEPRINT.cell * BLUEPRINT.majorEvery}px,
            ${BLUEPRINT.cell}px ${BLUEPRINT.cell}px,
            ${BLUEPRINT.cell}px ${BLUEPRINT.cell}px
          `,
          maskImage:
            variant === "cream"
              ? "radial-gradient(ellipse at center, black 0%, black 45%, transparent 95%)"
              : "radial-gradient(ellipse at center, black 0%, black 55%, transparent 100%)",
          WebkitMaskImage:
            variant === "cream"
              ? "radial-gradient(ellipse at center, black 0%, black 45%, transparent 95%)"
              : "radial-gradient(ellipse at center, black 0%, black 55%, transparent 100%)",
        }}
      />

      {/* Slow bottom-left radial glow */}
      {variant !== "cream" && (
        <div
          style={{
            position: "absolute",
            left: -width * 0.15,
            bottom: -height * 0.1,
            width: width * 0.7,
            height: height * 0.5,
            background: `radial-gradient(ellipse at center, ${BLUEPRINT.glow} 0%, transparent 60%)`,
            opacity: glowOpacity * intensity,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Dust particles drifting upward */}
      {dust.map((d, i) => {
        // y drifts up — at frame 0 dot is at bottom + phase offset; over
        // time it rises and wraps.
        const baseY = ((d.phase + frame * d.speed) % 120) - 10;
        const y = height * (1 - baseY / 100);
        const opacity = 0.18 + 0.22 * Math.sin((frame + i * 11) * 0.04);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${d.sx}%`,
              top: y,
              width: d.size,
              height: d.size,
              borderRadius: "50%",
              background:
                variant === "cream"
                  ? "rgba(15, 17, 21, 0.32)"
                  : BLUEPRINT.dust,
              opacity: opacity * intensity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
