// FTHeadingReveal — H1-style heading with the signature FT 70px red
// underline that draws in from left. Matches the look of every page
// heading on fosen-tools.no (FosenTools.scss .ftseo-heading::after).
//
// The text snaps in via interpolate (NOT spring — spring feels like
// app lag), and the underline draws separately ~10 frames later.

import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

import { FT, SANS_FONT } from "../theme";

export const FTHeadingReveal: React.FC<{
  /** The heading text. Will be rendered UPPERCASE. */
  text: string;
  /** Local frame this component first appears at. */
  from?: number;
  /** Font size in px. */
  fontSize?: number;
  /** Width the heading is allowed to take (for wrapping). */
  maxWidth?: number;
  /** Text color. */
  color?: string;
  /** Underline color. */
  underlineColor?: string;
  /** Underline thickness (px). */
  underlineThickness?: number;
  /** Underline length factor (0-1 of text width). */
  underlineWidthFactor?: number;
  /** Letter spacing in px (or em). */
  letterSpacing?: string | number;
  /** Alignment. */
  align?: "left" | "center";
}> = ({
  text,
  from = 0,
  fontSize = 78,
  maxWidth = 900,
  color = FT.white,
  underlineColor = FT.red,
  underlineThickness = 6,
  underlineWidthFactor = 0.5,
  letterSpacing = "0.04em",
  align = "left",
}) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  if (local < 0) return null;

  const textT = interpolate(local, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });
  const textY = interpolate(local, [0, 18], [16, 0], {
    extrapolateRight: "clamp",
  });
  const underlineT = interpolate(local, [10, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        maxWidth,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize,
          lineHeight: 1.05,
          letterSpacing,
          color,
          textTransform: "uppercase",
          opacity: textT,
          transform: `translateY(${textY}px)`,
          textAlign: align,
        }}
      >
        {text}
      </h1>
      <div
        style={{
          marginTop: 18,
          height: underlineThickness,
          width: `${underlineWidthFactor * 100 * underlineT}%`,
          maxWidth: maxWidth * underlineWidthFactor,
          background: underlineColor,
          boxShadow: `0 0 14px ${underlineColor}77`,
        }}
      />
    </div>
  );
};
