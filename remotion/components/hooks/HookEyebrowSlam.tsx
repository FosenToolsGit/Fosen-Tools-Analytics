// HookEyebrowSlam v2 — mer hook, fortsatt profesjonell. 3-fase intro:
//
//   0-12f:  Pre-reveal på FT-ink mørk bg. Blueprint cross-hair tegnes
//           fra senter ut. Corner-brackets ankommer som engineering-
//           markører. Timestamp "FT · CADLAB · BREKSTAD" i øvre hjørne.
//           Whoosh-deep SFX subtilt under.
//   12-22f: Rød "energi-sveip" — sweep-clip fra senter ut som fyller
//           hele frame med FT-rød. Hard impact-SFX på landing.
//   22-90f: Eyebrow type-on (bokstav-for-bokstav, 2 frames hver) + stor
//           primary slammer inn med spring fra scale 0.7 + micro-shake
//           etter landing. Scanline-pass i bakgrunn. FT-wordmark
//           nederst fader inn sent.
//
// Bruksområder uendret: "LEVERT TIL X", "NYHET FRA X", "HVORFOR HDFI",
// logo-variant via logoUrl.

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
import { sfx, sfxVolume } from "../../audio-registry";
import type { HookProps } from "./types";

export const HookEyebrowSlam: React.FC<HookProps> = ({
  eyebrow = "Levert til",
  primaryText = "EN KUNDE",
  secondaryText,
  logoUrl,
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  if (frame >= durationInFrames) return null;

  // ── Fase 1 (0-12f): pre-reveal på mørk FT-ink bg ──────────
  const crossT = interpolate(frame, [0, 12], [0, 1], {
    extrapolateRight: "clamp",
  });
  const timestampT = interpolate(frame, [4, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bracketT = interpolate(frame, [6, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Fase 2 (12-22f): rød sweep-in fra senter ──────────────
  // clip-path expanderer ellipse fra senter ut til 100%
  const redSweepT = interpolate(frame, [12, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const redClipSize = redSweepT * 75; // 0 → 75% radius

  // ── Fase 3 (22-90f): eyebrow + primary ────────────────────
  // Type-on for eyebrow (bokstav-for-bokstav)
  const eyebrowChars = eyebrow.length;
  const eyebrowProgress = interpolate(
    frame,
    [22, 22 + eyebrowChars * 1.5],
    [0, eyebrowChars],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const visibleEyebrow = eyebrow.slice(0, Math.floor(eyebrowProgress));
  const showCursor = frame >= 22 && frame < 22 + eyebrowChars * 1.5 + 4;

  // Primary slam — hardere spring, mer scale-effekt
  const slamSpring = spring({
    frame: frame - 36,
    fps,
    config: { damping: 12, stiffness: 240 },
  });

  // Scanline-pass (sveiper over frame én gang fra 30-70f)
  const scanlineY = interpolate(frame, [30, 70], [-0.3, 1.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Secondary tekst kommer sent
  const secondaryT = interpolate(frame, [55, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // FT-wordmark fader inn 50-70f
  const wordmarkT = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Pulserende red glow rundt primary etter slam
  const pulse = 0.4 + 0.3 * Math.sin((frame - 36) * 0.18);

  // Exit fade ut
  const bgExit = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Hardere impact når rød lander (frame 22)
  return (
    <AbsoluteFill style={{ opacity: bgExit }}>
      {/* SFX-stack */}
      <Sequence from={0} durationInFrames={20}>
        <Audio
          src={sfx("whoosh-deep")}
          volume={sfxVolume("whoosh-deep") * 0.45}
        />
      </Sequence>
      <Sequence from={20}>
        <Audio
          src={sfx("impact-close")}
          volume={sfxVolume("impact-close") * 0.7}
        />
      </Sequence>

      {/* ── Lag 1: FT-ink mørk bg (alltid synlig) ── */}
      <AbsoluteFill style={{ background: FT.inkDeep }}>
        {/* Subtilt grid-pattern */}
        <AbsoluteFill
          style={{
            opacity: 0.15,
            backgroundImage: `
              linear-gradient(rgba(237,28,36,0.12) 1px, transparent 1px),
              linear-gradient(90deg, rgba(237,28,36,0.12) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 0%, black 50%, transparent 100%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, black 50%, transparent 100%)",
          }}
        />

        {/* Blueprint cross-hair "+" tegnes fra senter */}
        <div
          style={{
            position: "absolute",
            left: width / 2,
            top: height / 2,
            width: 0,
            height: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: -240 * crossT,
              top: -1.5,
              width: 480 * crossT,
              height: 3,
              background: FT.red,
              boxShadow: `0 0 16px ${FT.red}aa`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -1.5,
              top: -240 * crossT,
              width: 3,
              height: 480 * crossT,
              background: FT.red,
              boxShadow: `0 0 16px ${FT.red}aa`,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -8,
              top: -8,
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: FT.red,
              boxShadow: `0 0 24px ${FT.red}`,
              opacity: crossT,
            }}
          />
        </div>

        {/* Timestamp i øvre venstre */}
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 60,
            fontFamily: MONO_FONT,
            fontSize: 18,
            color: "rgba(255, 255, 255, 0.5)",
            letterSpacing: 4,
            fontWeight: 500,
            opacity: timestampT,
          }}
        >
          FT · CADLAB · BREKSTAD
        </div>

        {/* Target-reticle i nedre høyre */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 60,
            opacity: bracketT * 0.6,
          }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="22" fill="none" stroke={FT.red} strokeWidth="1.5" />
            <circle cx="24" cy="24" r="10" fill="none" stroke={FT.red} strokeWidth="1" />
            <circle cx="24" cy="24" r="2" fill={FT.red} />
            <line x1="24" y1="0" x2="24" y2="6" stroke={FT.red} strokeWidth="1" />
            <line x1="24" y1="42" x2="24" y2="48" stroke={FT.red} strokeWidth="1" />
            <line x1="0" y1="24" x2="6" y2="24" stroke={FT.red} strokeWidth="1" />
            <line x1="42" y1="24" x2="48" y2="24" stroke={FT.red} strokeWidth="1" />
          </svg>
        </div>
      </AbsoluteFill>

      {/* ── Lag 2: Rød sweep-in (clip-path ellipse) ── */}
      <AbsoluteFill
        style={{
          background: FT.red,
          clipPath: `circle(${redClipSize}% at 50% 50%)`,
          WebkitClipPath: `circle(${redClipSize}% at 50% 50%)`,
        }}
      >
        {/* Subtil rød-til-mørkerød gradient så det ikke ser flatt ut */}
        <AbsoluteFill
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 30% 25%, rgba(255, 255, 255, 0.08), transparent 60%), radial-gradient(ellipse 50% 50% at 75% 80%, rgba(0, 0, 0, 0.18), transparent 70%)",
          }}
        />

        {/* Corner-brackets på rødflate */}
        {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map(
          (corner) => {
            const isTop = corner.startsWith("top");
            const isLeft = corner.endsWith("left");
            const inset = 60;
            const arm = 96 * bracketT;
            const stroke = 3;
            const v: React.CSSProperties = {
              position: "absolute",
              [isTop ? "top" : "bottom"]: inset,
              [isLeft ? "left" : "right"]: inset,
              background: "rgba(255, 255, 255, 0.85)",
            };
            return (
              <React.Fragment key={corner}>
                <div style={{ ...v, width: arm, height: stroke }} />
                <div style={{ ...v, width: stroke, height: arm }} />
              </React.Fragment>
            );
          },
        )}

        {/* Scanline-pass — horisontalt lysstribe som sveiper ned */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${scanlineY * 100}%`,
            height: 80,
            background:
              "linear-gradient(to bottom, transparent, rgba(255,255,255,0.18), transparent)",
            pointerEvents: "none",
            opacity: scanlineY > 0 && scanlineY < 1 ? 0.7 : 0,
          }}
        />

        {/* Eyebrow + primary content */}
        <AbsoluteFill
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: 80,
          }}
        >
          {/* Eyebrow (type-on) */}
          <div
            style={{
              fontFamily: MONO_FONT,
              fontSize: 32,
              color: "rgba(255, 255, 255, 0.9)",
              letterSpacing: 8,
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 32,
              minHeight: 40,
            }}
          >
            {visibleEyebrow}
            {showCursor && (
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 28,
                  background: FT.white,
                  marginLeft: 4,
                  verticalAlign: "middle",
                  opacity: Math.floor(frame / 4) % 2 === 0 ? 1 : 0,
                }}
              />
            )}
          </div>

          {/* Primary — logo eller tekst */}
          {logoUrl ? (
            <div
              style={{
                maxWidth: width * 0.7,
                maxHeight: height * 0.32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 28,
                background: "rgba(255, 255, 255, 0.96)",
                borderRadius: 8,
                boxShadow: `
                  0 18px 40px rgba(0, 0, 0, 0.4),
                  0 0 ${30 + 20 * pulse}px rgba(255, 255, 255, ${0.15 + 0.15 * pulse})
                `,
                opacity: slamSpring,
                transform: `scale(${0.7 + 0.3 * slamSpring})`,
              }}
            >
              <Img
                src={logoUrl}
                style={{
                  maxWidth: width * 0.55,
                  maxHeight: height * 0.22,
                  objectFit: "contain",
                  filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))",
                }}
              />
            </div>
          ) : (
            <div
              style={{
                fontFamily: SANS_FONT,
                // Skaler ned lange ord så de ikke flyter utenfor kanten.
                // «VERKTØYVOGN» (11) passer på full størrelse; «VERKTØYKASSER» (13)
                // ble kuttet før denne justeringen.
                fontSize: (() => {
                  const base = width > 1600 ? 172 : 140;
                  const lengde = (primaryText ?? "").trim().length;
                  return lengde > 11 ? Math.round(base * (11 / lengde)) : base;
                })(),
                color: FT.white,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                lineHeight: 0.95,
                textAlign: "center",
                maxWidth: width * 0.92,
                textShadow: `
                  0 8px 24px rgba(0, 0, 0, 0.4),
                  0 0 ${28 + 20 * pulse}px rgba(255, 255, 255, ${0.12 + 0.08 * pulse})
                `,
                textTransform: "uppercase",
                opacity: slamSpring,
                transform: `scale(${0.78 + 0.22 * slamSpring})`,
              }}
            >
              {primaryText}
            </div>
          )}

          {/* Rød underline-stripe under primary — pulserer */}
          <div
            style={{
              marginTop: 28,
              width: 220 * slamSpring,
              height: 4,
              background: FT.white,
              opacity: 0.85 + 0.15 * pulse,
              boxShadow: `0 0 ${12 + 12 * pulse}px rgba(255, 255, 255, 0.6)`,
            }}
          />

          {secondaryText && (
            <div
              style={{
                marginTop: 24,
                fontFamily: SANS_FONT,
                fontSize: 32,
                color: "rgba(255, 255, 255, 0.85)",
                fontWeight: 500,
                textAlign: "center",
                opacity: secondaryT,
                letterSpacing: 0.5,
              }}
            >
              {secondaryText}
            </div>
          )}
        </AbsoluteFill>

        {/* FT-wordmark nederst */}
        <div
          style={{
            position: "absolute",
            bottom: height * 0.06,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: wordmarkT,
          }}
        >
          <Img
            src={staticFile("/social/brand-assets/ft-wordmark-white.png")}
            style={{
              width: width * 0.3,
              height: "auto",
              objectFit: "contain",
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
