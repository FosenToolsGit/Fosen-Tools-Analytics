// Delte FT-primitiver for video-komposisjonene. Ren presentasjon —
// importerer kun `remotion`, React og lokale theme-tokens.

import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";

import { BG, FT, MONO_FONT, SANS_FONT, WORDMARK } from "../theme";

// ── helpers ──────────────────────────────────────────────────────────

/** Fade 0->1 over [inStart,inEnd] og 1->0 over [outStart,outEnd]. */
export function fade(
  f: number,
  inStart: number,
  inEnd: number,
  outStart: number,
  outEnd: number,
): number {
  return (
    interpolate(f, [inStart, inEnd], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) *
    interpolate(f, [outStart, outEnd], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
}

/** NOK-format i FT-stil: 1290 -> "1 290,-". */
export function formatNOK(n: number): string {
  const rounded = Math.round(n);
  const spaced = rounded
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${spaced},-`;
}

// ── animert bakgrunn ─────────────────────────────────────────────────

/** FT industriell bakgrunn: flat farge + drivende rutenett + roed gloed. */
export const Backdrop: React.FC<{ tone?: "ink" | "red" }> = ({
  tone = "ink",
}) => {
  const frame = useCurrentFrame();
  const isRed = tone === "red";
  const line = isRed ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.07)";
  return (
    <AbsoluteFill style={{ background: isRed ? BG.red : BG.ink }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
          backgroundSize: "96px 96px",
          transform: `translateY(${(frame * 0.35) % 96}px)`,
        }}
      />
      {!isRed ? (
        <div
          style={{
            position: "absolute",
            width: 1100,
            height: 1100,
            left: "50%",
            top: "26%",
            marginLeft: -550,
            marginTop: -550,
            borderRadius: 999,
            background: `radial-gradient(circle, rgba(237,28,36,0.28), transparent 66%)`,
            filter: "blur(60px)",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

// ── wordmark ─────────────────────────────────────────────────────────

export const Wordmark: React.FC<{
  variant?: "white" | "red" | "ink";
  width?: number;
}> = ({ variant = "white", width = 360 }) => (
  <Img
    src={staticFile(WORDMARK[variant])}
    style={{ width, height: "auto", objectFit: "contain" }}
  />
);

// ── eyebrow ──────────────────────────────────────────────────────────

export const Eyebrow: React.FC<{ text: string; color?: string }> = ({
  text,
  color = FT.red,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 16,
      fontFamily: MONO_FONT,
      fontSize: 30,
      fontWeight: 700,
      letterSpacing: 5,
      textTransform: "uppercase",
      color,
    }}
  >
    <div style={{ width: 44, height: 4, background: color }} />
    {text}
  </div>
);

// ── chip ─────────────────────────────────────────────────────────────

export const Chip: React.FC<{
  label: string;
  color?: string;
  ink?: boolean;
  big?: boolean;
}> = ({ label, color = FT.red, ink = false, big = false }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      padding: big ? "16px 32px" : "11px 24px",
      borderRadius: 999,
      border: `2px solid ${color}`,
      background: `${color}22`,
      color: ink ? FT.ink : FT.white,
      fontFamily: SANS_FONT,
      fontWeight: 700,
      fontSize: big ? 40 : 30,
      letterSpacing: 0.3,
    }}
  >
    {label}
  </div>
);

// ── rabatt-burst ─────────────────────────────────────────────────────

/** Gul stjerne-burst med rabatt-tekst — speiler PriceBurst i brosjyra. */
export const Burst: React.FC<{ text: string; size?: number }> = ({
  text,
  size = 230,
}) => {
  const points = 16;
  const r1 = size / 2;
  const r2 = size * 0.42;
  const path = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 === 0 ? r1 : r2;
    const a = (Math.PI / points) * i - Math.PI / 2;
    return `${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <polygon
          points={path}
          fill={FT.burstYellow}
          stroke={FT.ink}
          strokeWidth={4}
        />
      </svg>
      <div
        style={{
          position: "relative",
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: size * 0.21,
          lineHeight: 0.95,
          textAlign: "center",
          color: FT.ink,
          letterSpacing: -1,
        }}
      >
        {text}
      </div>
    </div>
  );
};
