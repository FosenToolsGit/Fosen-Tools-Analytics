// FT-signaturelementer — gjenbrukbare komponenter som speiler
// fosen-tools.no-merkevaren (ftseo-heading med roed underline, hero-
// banner med moerk gradient, CADLAB-stempel, leverandoer-ticker).
//
// Som de andre filene i remotion/: ren presentasjon, importerer KUN
// `remotion`, React og lokale theme-tokens.

import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
} from "remotion";

import { FT, SANS_FONT } from "../theme";
import type { VideoFormat } from "../types";

// ── FTHeading ────────────────────────────────────────────────────────

/**
 * H1-stil som matcher nettsidens `.ftseo-heading`. UPPERCASE, 800-vekt,
 * letter-spacing 0.08em, og en 70px roed underline rett under teksten
 * — signaturelementet fra fosen-tools.no.
 */
export const FTHeading: React.FC<{
  children: string;
  size?: number;
  color?: string;
  centered?: boolean;
}> = ({ children, size = 56, color = FT.white, centered = false }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: centered ? "center" : "flex-start",
        gap: 16,
      }}
    >
      <div
        style={{
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.05,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color,
          textAlign: centered ? "center" : "left",
          margin: 0,
        }}
      >
        {children}
      </div>
      <div
        style={{
          width: 70,
          height: 4,
          background: FT.red,
        }}
      />
    </div>
  );
};

// ── FTHeroBanner ─────────────────────────────────────────────────────

/**
 * Stor fullbredde-bilde-hero med moerk gradient over, eyebrow oeverst,
 * FTHeading sentralt og subhead under. Matcher nettsidens banner-hero
 * (ft-hero-scaled).
 */
export const FTHeroBanner: React.FC<{
  imageUrl: string;
  headline: string;
  subhead?: string;
  eyebrow?: string;
  format: VideoFormat;
}> = ({ imageUrl, headline, subhead, eyebrow, format }) => {
  // Skaler headline med format slik at den ikke blir grotesk stor i wide.
  const headlineSize =
    format === "wide" ? 96 : format === "square" ? 80 : 88;
  const eyebrowSize = format === "wide" ? 28 : 26;
  const subheadSize = format === "wide" ? 36 : 34;

  return (
    <AbsoluteFill>
      {/* Bakgrunns-bilde — fyller hele frame */}
      <Img
        src={imageUrl}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      {/* Moerk gradient over (60% i midten, tyngre i bunn for tekst-kontrast) */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(15,17,21,0.55) 0%, rgba(15,17,21,0.40) 45%, rgba(15,17,21,0.82) 100%)",
        }}
      />
      {/* Tekst-innhold sentrert */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: 86,
          gap: 28,
        }}
      >
        {eyebrow ? (
          <div
            style={{
              fontFamily: SANS_FONT,
              fontWeight: 700,
              fontSize: eyebrowSize,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: FT.red,
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <FTHeading size={headlineSize} centered>
          {headline}
        </FTHeading>
        {subhead ? (
          <div
            style={{
              fontFamily: SANS_FONT,
              fontWeight: 500,
              fontSize: subheadSize,
              lineHeight: 1.32,
              textAlign: "center",
              color: "rgba(255,255,255,0.92)",
              maxWidth: 920,
            }}
          >
            {subhead}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── FTCADLABStempel ──────────────────────────────────────────────────

/**
 * Trust-stempel «EGEN PRODUKSJON SIDEN 2004» — liten badge med roed
 * border, plasseres typisk nederst i hjoernet. `theme="dark"` gir hvit
 * tekst paa ink-bakgrunn; `theme="light"` gir svart tekst paa krem.
 */
export const FTCADLABStempel: React.FC<{
  theme?: "dark" | "light";
}> = ({ theme = "dark" }) => {
  const isDark = theme === "dark";
  const textColor = isDark ? FT.white : FT.ink;
  const bgColor = isDark ? FT.ink : FT.cream;
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "14px 26px",
        gap: 4,
        border: `3px solid ${FT.red}`,
        borderRadius: 4,
        background: bgColor,
        fontFamily: SANS_FONT,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          fontSize: 22,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: textColor,
          lineHeight: 1,
        }}
      >
        Egen produksjon
      </div>
      <div
        style={{
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: FT.red,
          lineHeight: 1,
        }}
      >
        siden 2004
      </div>
    </div>
  );
};

// ── FTLeverandorTicker ───────────────────────────────────────────────

const TICKER_BRANDS = [
  "Milwaukee",
  "Wera",
  "Snap-on",
  "Facom",
  "Husqvarna",
  "Zweibrüder",
  "Stahlwille",
  "Knipex",
];

/**
 * Scrollende leverandoer-baand. Rotateres horisontalt over 6 sekunder
 * (180 frames @ 30fps) i en infinity loop. Tekst-only (ikke logoer) for
 * enkelthets skyld og maksimal kompatibilitet med render-pipelinen.
 */
export const FTLeverandorTicker: React.FC<{
  /** Loop-varighet i frames. Default 180 (6 sek @ 30fps). */
  loopFrames?: number;
  /** Font-size for hver merkenavn-pille. */
  size?: number;
}> = ({ loopFrames = 180, size = 28 }) => {
  const frame = useCurrentFrame();
  // Repeter listen to ganger saa loopen virker uten kant-blink.
  const items = [...TICKER_BRANDS, ...TICKER_BRANDS];
  const progress = (frame % loopFrames) / loopFrames;
  // Forskyver -50% (en full kopi til venstre) over loopen.
  const translateX = interpolate(progress, [0, 1], [0, -50]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: size * 2.4,
        overflow: "hidden",
        background: FT.inkDeep,
        borderTop: `2px solid ${FT.red}`,
        borderBottom: `2px solid ${FT.red}`,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 56,
          paddingLeft: 56,
          transform: `translateX(${translateX}%)`,
          whiteSpace: "nowrap",
        }}
      >
        {items.map((brand, i) => (
          <div
            key={`${brand}-${i}`}
            style={{
              fontFamily: SANS_FONT,
              fontWeight: 700,
              fontSize: size,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: FT.white,
              display: "flex",
              alignItems: "center",
              gap: 56,
            }}
          >
            {brand}
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: 999,
                background: FT.red,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
