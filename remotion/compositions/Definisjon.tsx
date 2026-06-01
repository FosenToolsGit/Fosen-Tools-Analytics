// Definisjon — ordbok-stil for FT-fagord (HDFI, CADLAB, FOD, 5S, Lean).
// Matcher som-forslag-2026-06.md seksjon 3. Krem-hvit bakgrunn, mørk
// tekst, linje-for-linje fade-in.
//
// Layout:
//   - Krem-bakgrunn (#F5F7FA — kald blå-grå)
//   - Senter-justert kolonne, max-width 800px
//   - Eyebrow rød (HDFI / CADLAB / FOD)
//   - H1 mørk ink + 110px rød underline 6px
//   - 3-4 body-linjer i ord-grupper, hver linje en konsept-byggeklosse
//   - Linje-for-linje fade-in 0.4s per linje

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
} from "remotion";

import { FT, SANS_FONT } from "../theme";
import { fade } from "../components/shared";
import {
  FTBackground,
  FTEyebrow,
  FTHeading,
} from "../components/ft-elements";
import type { DefinisjonProps, VideoFormat } from "../types";

// ── format-spesifikk skalering ───────────────────────────────────────

function dimsFor(format: VideoFormat): {
  headlineSize: number;
  eyebrowSize: number;
  bodySize: number;
  underlineWidth: number;
  maxWidth: number;
  padding: number;
} {
  if (format === "wide") {
    return {
      headlineSize: 64,
      eyebrowSize: 20,
      bodySize: 28,
      underlineWidth: 140,
      maxWidth: 1200,
      padding: 96,
    };
  }
  if (format === "square") {
    return {
      headlineSize: 52,
      eyebrowSize: 18,
      bodySize: 24,
      underlineWidth: 110,
      maxWidth: 900,
      padding: 80,
    };
  }
  // reel
  return {
    headlineSize: 60,
    eyebrowSize: 22,
    bodySize: 28,
    underlineWidth: 120,
    maxWidth: 880,
    padding: 96,
  };
}

const MainScene: React.FC<DefinisjonProps> = (p) => {
  const frame = useCurrentFrame();
  const dims = dimsFor(p.format);

  // Sekvensiell fade-in: eyebrow 0-12, H1 12-30, body linje for linje
  const oEye = fade(frame, 0, 14, 999, 1000);
  const oHead = fade(frame, 14, 36, 999, 1000);
  // Hver body-linje starter 12 frames etter forrige (0.4s @ 30fps)
  const bodyStart = 38;
  const bodyStep = 12;

  return (
    <AbsoluteFill
      style={{
        padding: dims.padding,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 50,
          maxWidth: dims.maxWidth,
          width: "100%",
        }}
      >
        {/* Eyebrow */}
        <div style={{ opacity: oEye }}>
          <FTEyebrow size={dims.eyebrowSize}>{p.eyebrow}</FTEyebrow>
        </div>

        {/* H1 m/ underline — centered */}
        <div style={{ opacity: oHead, width: "100%" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 22,
            }}
          >
            <div
              style={{
                fontFamily: SANS_FONT,
                fontWeight: 800,
                fontSize: dims.headlineSize,
                lineHeight: 1.08,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: FT.ink,
                textAlign: "center",
              }}
            >
              {p.headline}
            </div>
            <div
              style={{
                width: dims.underlineWidth,
                height: 6,
                background: FT.red,
              }}
            />
          </div>
        </div>

        {/* Body — linje for linje */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            alignItems: "center",
          }}
        >
          {p.bodyLines.slice(0, 5).map((line, i) => {
            const start = bodyStart + i * bodyStep;
            const o = fade(frame, start, start + 12, 999, 1000);
            return (
              <div
                key={i}
                style={{
                  opacity: o,
                  fontFamily: SANS_FONT,
                  fontWeight: 500,
                  fontSize: dims.bodySize,
                  lineHeight: 1.6,
                  color: "#222",
                  textAlign: "center",
                  letterSpacing: "0.01em",
                }}
              >
                {line}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── komposisjons-rot ─────────────────────────────────────────────────

export const Definisjon: React.FC<DefinisjonProps> = (props) => {
  // Suppress unused warnings — vi bruker FTHeading/FTBackground indirekte
  // i andre komposisjoner; her holder vi en clean implementasjon.
  void FTHeading;
  return (
    <AbsoluteFill>
      <FTBackground variant="cream" />
      <Sequence durationInFrames={300}>
        <MainScene {...props} />
      </Sequence>
    </AbsoluteFill>
  );
};
