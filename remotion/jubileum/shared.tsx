// Delte primitiver for jubileum-video-komposisjonene. 15 dag-spesifikke
// videoer (T-14 → DAGEN) bygger oppå disse for å holde et felles visuelt
// språk: FT-rød, Manrope, 25-årslogo, samme ramme/footer-mønster.

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

import { FT, SANS_FONT, MONO_FONT } from "../theme";

export const JUBILEUM_LOGO_25 = "/social/brand-assets/jubileum-25aar.png";
export const JUBILEUM_LOGO_100 = "/social/brand-assets/jubileum-100aar.png";
export const FT_WORDMARK_WHITE = "/social/brand-assets/ft-wordmark-white.png";
export const FT_WORDMARK_INK = "/social/brand-assets/ft-wordmark-ink.png";

export const EVENT_DATE = "26. JUNI 2026";
export const EVENT_PLACE = "INDUSTRIGATA 1 · BREKSTAD";
export const EVENT_HOURS = "10:00 – 16:00";

// ── helpers ──────────────────────────────────────────────────────────

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

// ── jubileums-bakgrunner ──────────────────────────────────────────────

/**
 * FT-ink bakgrunn med drivende rutenett + signatur-stripe topp/bunn +
 * gull-glød fra venstre kant for jubileumsfeel.
 */
export const JubileumBackdrop: React.FC<{
  tone?: "ink" | "red" | "cream" | "deep";
  stripeColor?: string;
}> = ({ tone = "ink", stripeColor }) => {
  const frame = useCurrentFrame();
  let bg = "";
  let line = "rgba(255,255,255,0.07)";
  let stripe = stripeColor ?? FT.red;
  if (tone === "ink") {
    bg = `radial-gradient(ellipse 60% 55% at 18% 12%, rgba(237,28,36,0.24), transparent 70%), radial-gradient(ellipse 50% 40% at 85% 90%, rgba(219,183,139,0.18), transparent 75%), ${FT.ink}`;
  } else if (tone === "deep") {
    bg = `radial-gradient(ellipse 70% 60% at 50% 20%, rgba(237,28,36,0.18), transparent 75%), ${FT.inkDeep}`;
  } else if (tone === "red") {
    bg = `radial-gradient(ellipse 70% 60% at 20% 100%, rgba(0,0,0,0.32), transparent 70%), ${FT.red}`;
    line = "rgba(255,255,255,0.12)";
    stripe = stripeColor ?? FT.white;
  } else {
    bg = `radial-gradient(ellipse 80% 60% at 20% 100%, rgba(237,28,36,0.10), transparent 70%), ${FT.creamWarm}`;
    line = "rgba(15,17,21,0.08)";
    stripe = stripeColor ?? FT.red;
  }
  return (
    <AbsoluteFill style={{ background: bg }}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
          backgroundSize: "96px 96px",
          transform: `translateY(${(frame * 0.35) % 96}px)`,
        }}
      />
      <Stripe top color={stripe} />
      <Stripe bottom color={stripe} />
    </AbsoluteFill>
  );
};

const Stripe: React.FC<{ top?: boolean; bottom?: boolean; color: string }> = ({
  top,
  bottom,
  color,
}) => (
  <div
    style={{
      position: "absolute",
      top: top ? 0 : undefined,
      bottom: bottom ? 0 : undefined,
      left: 0,
      right: 0,
      height: 14,
      background: color,
    }}
  />
);

// ── 25-års-logo ──────────────────────────────────────────────────────

export const JubileumLogo25: React.FC<{ width?: number }> = ({ width = 360 }) => (
  <Img
    src={staticFile(JUBILEUM_LOGO_25)}
    style={{ width, height: "auto", objectFit: "contain" }}
  />
);

export const JubileumLogo100: React.FC<{ width?: number }> = ({ width = 360 }) => (
  <Img
    src={staticFile(JUBILEUM_LOGO_100)}
    style={{ width, height: "auto", objectFit: "contain" }}
  />
);

// ── FT wordmark ──────────────────────────────────────────────────────

export const FTWordmark: React.FC<{
  variant?: "white" | "ink";
  width?: number;
}> = ({ variant = "white", width = 320 }) => (
  <Img
    src={staticFile(variant === "white" ? FT_WORDMARK_WHITE : FT_WORDMARK_INK)}
    style={{ width, height: "auto", objectFit: "contain" }}
  />
);

// ── stort tall (count-up countdown) ──────────────────────────────────

/**
 * Animert hovedtall — typisk 14, 7, 1, 25, 100. Bruker en svidd
 * gull-gradient som matcher den offisielle 25-årslogoen.
 */
export const BigNumber: React.FC<{
  value: number;
  unit?: string;
  countUp?: boolean;
  gold?: boolean;
  ink?: boolean;
  fontSize?: number;
}> = ({ value, unit, countUp = true, gold = true, ink = false, fontSize = 480 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const displayed = countUp
    ? Math.round(interpolate(frame, [0, fps * 1.2], [0, value], { extrapolateRight: "clamp" }))
    : value;
  const gradient = gold
    ? `linear-gradient(180deg, ${FT.goldTop} 0%, ${FT.goldBottom} 100%)`
    : `linear-gradient(180deg, #ffffff 0%, #d6d6d6 100%)`;
  const textColor = ink ? FT.ink : "transparent";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: fontSize * 0.04,
        transform: `scale(${0.6 + pop * 0.4})`,
      }}
    >
      <span
        style={{
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize,
          lineHeight: 0.82,
          letterSpacing: -fontSize * 0.05,
          background: ink ? "none" : gradient,
          WebkitBackgroundClip: ink ? undefined : "text",
          backgroundClip: ink ? undefined : "text",
          color: textColor,
          WebkitTextFillColor: ink ? FT.ink : "transparent",
        }}
      >
        {displayed}
      </span>
      {unit ? (
        <span
          style={{
            fontFamily: SANS_FONT,
            fontWeight: 800,
            fontSize: fontSize * 0.18,
            fontStyle: "italic",
            color: ink ? FT.ink : FT.white,
            paddingBottom: fontSize * 0.1,
            letterSpacing: 1,
          }}
        >
          {unit.toUpperCase()}
        </span>
      ) : null}
    </div>
  );
};

// ── animert tekst (slide-up / fade-in) ─────────────────────────────────

export const RevealText: React.FC<{
  text: string;
  delay?: number;
  fontSize?: number;
  color?: string;
  weight?: number;
  italic?: boolean;
  letterSpacing?: number;
  uppercase?: boolean;
  align?: "left" | "center" | "right";
  maxWidth?: number;
  family?: string;
}> = ({
  text,
  delay = 0,
  fontSize = 64,
  color = FT.white,
  weight = 800,
  italic = false,
  letterSpacing = -0.5,
  uppercase = true,
  align = "center",
  maxWidth,
  family,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  const opacity = interpolate(f, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ty = interpolate(f, [0, fps * 0.5], [28, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        fontFamily: family ?? SANS_FONT,
        fontWeight: weight,
        fontStyle: italic ? "italic" : "normal",
        fontSize,
        color,
        textTransform: uppercase ? "uppercase" : "none",
        letterSpacing,
        textAlign: align,
        opacity,
        transform: `translateY(${ty}px)`,
        lineHeight: 1.05,
        maxWidth,
        textWrap: "balance" as React.CSSProperties["textWrap"],
      }}
    >
      {text}
    </div>
  );
};

// ── eyebrow med rød markør-stripe ────────────────────────────────────

export const JubEyebrow: React.FC<{ text: string; color?: string; delay?: number }> = ({
  text,
  color = FT.red,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  const opacity = interpolate(f, [0, fps * 0.35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        fontFamily: MONO_FONT,
        fontSize: 26,
        fontWeight: 700,
        letterSpacing: 5,
        textTransform: "uppercase",
        color,
        opacity,
      }}
    >
      <div style={{ width: 50, height: 4, background: color }} />
      {text}
    </div>
  );
};

// ── confetti partikler ───────────────────────────────────────────────

/**
 * Konfetti — små rektangler som faller fra topp + roterer. Brukes for
 * å markere DAGEN-videoen og avsluttende frames på flere komposisjoner.
 */
export const Confetti: React.FC<{ count?: number; colors?: string[]; seed?: number }> = ({
  count = 36,
  colors = [FT.red, FT.burstYellow, FT.white, FT.goldTop],
  seed = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const particles = Array.from({ length: count }, (_, i) => {
    const r = pseudo(seed * 100 + i);
    const r2 = pseudo(seed * 100 + i + 0.5);
    const r3 = pseudo(seed * 100 + i + 1);
    const startX = r * width;
    const driftX = (r2 - 0.5) * 200;
    const duration = fps * (2.5 + r2 * 2);
    const t = (frame + i * 4) / duration;
    const y = (t % 1) * (height + 100) - 80;
    const x = startX + driftX * (t % 1);
    const rotate = (frame + i * 18) * (r3 > 0.5 ? 6 : -6);
    const w = 8 + r * 14;
    const h = 14 + r3 * 14;
    const c = colors[i % colors.length];
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: w,
          height: h,
          background: c,
          transform: `rotate(${rotate}deg)`,
          borderRadius: 2,
          opacity: 0.92,
        }}
      />
    );
  });
  return <AbsoluteFill style={{ pointerEvents: "none" }}>{particles}</AbsoluteFill>;
};

function pseudo(n: number): number {
  const x = Math.sin(n * 99.991) * 43758.5453;
  return x - Math.floor(x);
}

// ── footer-event-band ────────────────────────────────────────────────

/**
 * Felles footer-bånd nederst på alle jubileum-videoer:
 *   "26. JUNI 2026 · BREKSTAD · 10–16 · fosen-tools.no"
 * Slik kjenner seeren igjen videoene som del av samme kampanje.
 */
export const EventFooter: React.FC<{ delay?: number; lightBg?: boolean }> = ({
  delay = 0,
  lightBg = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  const opacity = interpolate(f, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const color = lightBg ? FT.ink : FT.white;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: MONO_FONT,
        fontSize: 22,
        fontWeight: 700,
        letterSpacing: 3,
        color,
        opacity,
        textTransform: "uppercase",
      }}
    >
      {EVENT_DATE} · BREKSTAD · {EVENT_HOURS}
    </div>
  );
};

// ── glow-stripe (animert horisontal lysstripe) ───────────────────────

export const GlowStripe: React.FC<{
  y: number;
  color?: string;
  thickness?: number;
  startDelay?: number;
}> = ({ y, color = FT.red, thickness = 8, startDelay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const f = frame - startDelay;
  const len = interpolate(f, [0, fps * 0.6], [0, width], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: 0,
        width: len,
        height: thickness,
        background: color,
        boxShadow: `0 0 24px ${color}88`,
      }}
    />
  );
};

// ── format-helper ────────────────────────────────────────────────────

export type VideoFormat = "reel" | "square" | "wide";

export const DIMENSIONS: Record<
  VideoFormat,
  { width: number; height: number }
> = {
  reel: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  wide: { width: 1920, height: 1080 },
};
