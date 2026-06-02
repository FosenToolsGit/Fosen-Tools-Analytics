// HookEyebrowSlam — full FT-rød flate, eyebrow + kundenavn slammer
// inn med snap-in animasjon, holder, smelter over til Scene 2.
//
// Bruksområder:
//   - "LEVERT TIL NORWEGIAN AERO"
//   - "NYHET FRA MILWAUKEE"
//   - "HVORFOR HDFI"
//
// Visuell signatur: ren rød flate (FT-rød), hvit FT-logo i øvre del,
// stort hvit tekst i senter, FT-bracket-detalj i hjørner.

import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { FT, MONO_FONT, SANS_FONT } from "../../theme";
import type { HookProps } from "./types";

export const HookEyebrowSlam: React.FC<HookProps> = ({
  eyebrow = "Levert til",
  primaryText = "EN KUNDE",
  secondaryText,
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  if (frame >= durationInFrames) return null;

  // Bg-rød snapper inn 0-5, holder, fader ut 80-90
  const bgT = interpolate(frame, [0, 5], [0, 1], {
    extrapolateRight: "clamp",
  });
  const bgExit = interpolate(
    frame,
    [durationInFrames - 12, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Eyebrow + primary slammer inn 8-25 med spring
  const slamT = spring({
    frame: frame - 8,
    fps,
    config: { damping: 12, stiffness: 220 },
  });

  // Secondary fader inn 30-50
  const secondaryT = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: FT.red, opacity: bgT * bgExit }}>
      {/* Subtil rød-til-mørkerød radial-gradient så det ikke ser flatt ut */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 30% 25%, rgba(255, 255, 255, 0.08), transparent 60%), radial-gradient(ellipse 50% 50% at 75% 80%, rgba(0, 0, 0, 0.18), transparent 70%)",
        }}
      />

      {/* FT-bracket-detaljer i hjørner (white-on-red) */}
      <CornerBracket position="top-left" />
      <CornerBracket position="bottom-right" />

      {/* Eyebrow + primary — slammer inn */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 80,
          opacity: slamT,
          transform: `scale(${0.92 + 0.08 * slamT})`,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 32,
            color: "rgba(255, 255, 255, 0.85)",
            letterSpacing: 8,
            fontWeight: 600,
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: width > 1600 ? 120 : 96,
            color: FT.white,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 1.0,
            textAlign: "center",
            maxWidth: width * 0.85,
            textShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
            textTransform: "uppercase",
          }}
        >
          {primaryText}
        </div>
        {secondaryText && (
          <div
            style={{
              marginTop: 32,
              fontFamily: SANS_FONT,
              fontSize: 36,
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

      {/* Hvit FT-wordmark nederst (siden flaten allerede ER FT-rød,
          bruker vi hvit wordmark her — eneste stedet vi gjør det
          per brand-policy 1. juni 2026) */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.08,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: slamT,
        }}
      >
        <Img
          src={staticFile("/social/brand-assets/ft-wordmark-white.png")}
          style={{
            width: width * 0.32,
            height: "auto",
            objectFit: "contain",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const CornerBracket: React.FC<{
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}> = ({ position }) => {
  const isTop = position.startsWith("top");
  const isLeft = position.endsWith("left");
  const inset = 60;
  const arm = 96;
  const stroke = 3;
  const v: React.CSSProperties = {
    position: "absolute",
    [isTop ? "top" : "bottom"]: inset,
    [isLeft ? "left" : "right"]: inset,
    background: "rgba(255, 255, 255, 0.7)",
  };
  return (
    <>
      <div style={{ ...v, width: arm, height: stroke }} />
      <div style={{ ...v, width: stroke, height: arm }} />
    </>
  );
};
