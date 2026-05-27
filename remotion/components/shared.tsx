// Delte FT-primitiver for video-komposisjonene. Ren presentasjon —
// importerer kun `remotion`, React og lokale theme-tokens.

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

import { BG, FT, MONO_FONT, SANS_FONT, TAGLINE, WORDMARK } from "../theme";

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
      {/* FT-rammer — rød topp- og bunnstripe i hver eneste frame.
          Signatur fra brosjyre-/website-stilen, gir industriell
          poster-følelse på alle videoer (ikke bare i outro). */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 14,
          background: isRed ? FT.white : FT.red,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 14,
          background: isRed ? FT.white : FT.red,
        }}
      />
    </AbsoluteFill>
  );
};

// ── wordmark ─────────────────────────────────────────────────────────

export const Wordmark: React.FC<{
  variant?: "color" | "white" | "red" | "ink";
  width?: number;
}> = ({ variant = "color", width = 360 }) => (
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

// ── corner-brackets (industriell hjørne-ramme) ───────────────────────

/**
 * Fire L-formede hjørne-merker rundt en boks. Plasser inni en
 * `position: relative`-forelder. Gir et industrielt/teknisk preg —
 * passer FT-stilen.
 */
export const CornerBrackets: React.FC<{
  color?: string;
  arm?: number;
  thickness?: number;
}> = ({ color = FT.red, arm = 56, thickness = 4 }) => {
  const base: React.CSSProperties = {
    position: "absolute",
    width: arm,
    height: arm,
  };
  return (
    <>
      <div
        style={{
          ...base,
          top: -thickness,
          left: -thickness,
          borderTop: `${thickness}px solid ${color}`,
          borderLeft: `${thickness}px solid ${color}`,
        }}
      />
      <div
        style={{
          ...base,
          top: -thickness,
          right: -thickness,
          borderTop: `${thickness}px solid ${color}`,
          borderRight: `${thickness}px solid ${color}`,
        }}
      />
      <div
        style={{
          ...base,
          bottom: -thickness,
          left: -thickness,
          borderBottom: `${thickness}px solid ${color}`,
          borderLeft: `${thickness}px solid ${color}`,
        }}
      />
      <div
        style={{
          ...base,
          bottom: -thickness,
          right: -thickness,
          borderBottom: `${thickness}px solid ${color}`,
          borderRight: `${thickness}px solid ${color}`,
        }}
      />
    </>
  );
};

// ── outro-CTA (delt avslutnings-scene) ───────────────────────────────

/**
 * Delt avslutnings-scene — wordmark + rød CTA-pille + taglinen i italic.
 * Brukes som siste Sequence i komposisjonene som ikke trenger noe
 * spesial-layout (ProduktSpotlight, KampanjeTeaser, SitatClip). Sikrer
 * at avslutningen ser lik ut på tvers og at tagline-regelen
 * («wordmarken er navnet — under den taglinen») håndheves ett sted.
 *
 * Komponenten bruker `useCurrentFrame` relativt til Sequence-en sin,
 * så bruk den slik:
 *
 *   <Sequence from={N} durationInFrames={60}>
 *     <OutroCta ctaUrl={props.ctaUrl} />
 *   </Sequence>
 */
export const OutroCta: React.FC<{
  ctaUrl: string;
  /** Wordmark-bredde (px). Default 540. */
  wordmarkWidth?: number;
  /** Font-size for CTA-pillen (px). Default 44. */
  ctaSize?: number;
  /** Font-size for taglinen (px). Default 30. */
  taglineSize?: number;
  /** Skjul taglinen hvis komposisjonen ikke trenger den. */
  hideTagline?: boolean;
}> = ({
  ctaUrl,
  wordmarkWidth = 540,
  ctaSize = 44,
  taglineSize = 30,
  hideTagline = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 15 } });
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        alignItems: "center",
        justifyContent: "center",
        padding: 86,
        gap: 34,
      }}
    >
      <div style={{ transform: `scale(${0.82 + pop * 0.18})` }}>
        <Wordmark variant="color" width={wordmarkWidth} />
      </div>
      <div
        style={{
          padding: `${Math.round(ctaSize * 0.55)}px ${Math.round(ctaSize * 1.1)}px`,
          borderRadius: 999,
          background: FT.red,
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: ctaSize,
          color: FT.white,
          transform: `translateY(${(1 - pop) * 36}px)`,
        }}
      >
        {ctaUrl}
      </div>
      {!hideTagline ? (
        <div
          style={{
            fontFamily: SANS_FONT,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: taglineSize,
            lineHeight: 1.32,
            textAlign: "center",
            color: FT.inkDim,
            maxWidth: 860,
          }}
        >
          {TAGLINE}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
