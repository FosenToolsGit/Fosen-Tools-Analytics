"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

// Felles FT-designkomponenter — portet fra Claude Design (ft-components.jsx).
// Alle leser CSS-tokens fra :root så Brand-panel kan overstyre i runtime.

import type { CSSProperties, ReactNode } from "react";

// CSS-vars med fallbacks — match Claude Design-output
const ftAccent = "var(--ft-red, #ed1c24)";
const ftInk = "var(--ft-ink, #111111)";
const ftText = "var(--ft-text-main, #111827)";
const ftBody = "var(--ft-text-body, #4b5563)";
const ftMuted = "var(--ft-text-muted, #6b7280)";
const ftPage = "var(--ft-bg-page, #f5f7fa)";
const ftCard = "var(--ft-card-bg, #ffffff)";
const ftBorder = "var(--ft-border-soft, rgba(148,163,184,0.4))";
const ftDeep = "var(--ft-deep, #0f1115)";
const ftHead = "var(--ft-head-font, \"Manrope\", \"Inter\", system-ui, sans-serif)";
const ftBodyFont = "var(--ft-body-font, \"Manrope\", \"Inter\", system-ui, sans-serif)";
const ftMono = "\"Roboto Mono\", ui-monospace, \"SFMono-Regular\", Menlo, monospace";

export const FT_TOKENS = {
  accent: ftAccent, ink: ftInk, text: ftText, body: ftBody, muted: ftMuted,
  page: ftPage, card: ftCard, border: ftBorder, deep: ftDeep,
  head: ftHead, bodyFont: ftBodyFont, mono: ftMono,
};

// ──────────────────────────────────────────────────────────────────────
// Eyebrow — uppercase letter-spaced lead-in
// ──────────────────────────────────────────────────────────────────────
export function Eyebrow({
  children, color, tracking = 0.12, size = 12, weight = 600, style,
}: {
  children: ReactNode;
  color?: string;
  tracking?: number;
  size?: number;
  weight?: number;
  style?: CSSProperties;
}) {
  return (
    <span style={{
      fontFamily: ftHead,
      fontSize: size,
      fontWeight: weight,
      letterSpacing: `${tracking}em`,
      textTransform: "uppercase",
      color: color || ftMuted,
      display: "inline-block",
      lineHeight: 1.1,
      ...style,
    }}>{children}</span>
  );
}

// ──────────────────────────────────────────────────────────────────────
// NeonCard — 3px røde rails på begge sider (print-vennlig, ingen glow)
// ──────────────────────────────────────────────────────────────────────
export type NeonVariant = "rails" | "inset" | "corner" | "frame" | "offset";

export function NeonCard({
  variant = "rails",
  rail = "var(--ft-rail-width, 3px)",
  bg = ftCard,
  pad = 22,
  children,
  style,
  ...rest
}: {
  variant?: NeonVariant;
  rail?: string;
  bg?: string;
  pad?: number | string;
  children: ReactNode;
  style?: CSSProperties;
  [k: string]: unknown;
}) {
  const base: CSSProperties = {
    position: "relative",
    background: bg,
    padding: pad,
    borderRadius: 0,
    boxSizing: "border-box",
  };
  const railLeft: CSSProperties = {
    position: "absolute", top: 0, bottom: 0, left: 0,
    width: rail, background: ftAccent,
  };
  const railRight: CSSProperties = { ...railLeft, left: "auto", right: 0 };

  if (variant === "rails") {
    return (
      <div className="ft-neon ft-neon-rails" style={{ ...base, ...style }} {...rest as any}>
        <span aria-hidden style={railLeft} />
        <span aria-hidden style={railRight} />
        {children}
      </div>
    );
  }
  if (variant === "inset") {
    return (
      <div className="ft-neon ft-neon-inset" style={{ ...base, ...style }} {...rest as any}>
        <span aria-hidden style={{ ...railLeft, left: 8, top: 8, bottom: 8 }} />
        <span aria-hidden style={{ ...railRight, right: 8, top: 8, bottom: 8 }} />
        {children}
      </div>
    );
  }
  if (variant === "corner") {
    return (
      <div className="ft-neon ft-neon-corner" style={{ ...base, border: `1px solid ${ftBorder}`, ...style }} {...rest as any}>
        <span aria-hidden style={{ ...railLeft, bottom: "auto", height: 24 }} />
        <span aria-hidden style={{ position: "absolute", left: 0, top: 0, height: rail, width: 24, background: ftAccent }} />
        {children}
      </div>
    );
  }
  if (variant === "frame") {
    return (
      <div className="ft-neon ft-neon-frame" style={{ ...base, border: `2px solid ${ftAccent}`, ...style }} {...rest as any}>{children}</div>
    );
  }
  if (variant === "offset") {
    return (
      <div className="ft-neon ft-neon-offset" style={{ ...base, ...style }} {...rest as any}>
        <span aria-hidden style={{ position: "absolute", left: -6, top: -6, bottom: 6, width: rail, background: ftAccent }} />
        <span aria-hidden style={{ position: "absolute", left: -6, top: -6, height: rail, right: 6, background: ftAccent }} />
        {children}
      </div>
    );
  }
  return <div style={{ ...base, ...style }} {...rest as any}>{children}</div>;
}

// ──────────────────────────────────────────────────────────────────────
// RedDivider — alle offisielle varianter
// ──────────────────────────────────────────────────────────────────────
export type DividerVariant = "h2" | "cta" | "vstripe" | "wide" | "stack" | "cross";

export function RedDivider({
  variant = "h2", width, color, style,
}: {
  variant?: DividerVariant; width?: number; color?: string; style?: CSSProperties;
}) {
  const c = color || ftAccent;
  if (variant === "h2") return <div style={{ width: width || 70, height: 3, background: c, ...style }} aria-hidden />;
  if (variant === "cta") return <div style={{ width: width || 22, height: 2, background: c, ...style }} aria-hidden />;
  if (variant === "vstripe") return <div style={{ width: 4, height: width || 64, background: c, ...style }} aria-hidden />;
  if (variant === "wide") return <div style={{ width: width || 140, height: 4, background: c, ...style }} aria-hidden />;
  if (variant === "stack") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3, ...style }} aria-hidden>
        <div style={{ width: width || 56, height: 2, background: c }} />
        <div style={{ width: (width || 56) * 0.45, height: 2, background: c }} />
      </div>
    );
  }
  if (variant === "cross") {
    return (
      <div style={{ position: "relative", width: width || 60, height: 18, ...style }} aria-hidden>
        <div style={{ position: "absolute", left: 0, right: 0, top: 8, height: 2, background: c }} />
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: c, transform: "translateX(-50%)" }} />
      </div>
    );
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────
// FtArrow — inline SVG-pil (matches fosen-tools.no eksakt)
// ──────────────────────────────────────────────────────────────────────
export const FtArrow = ({ size = 22 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden style={{ flex: "0 0 auto" }}>
    <path d="M16.4133 6L15.5553 6.92298L19.6739 11.3473H2V12.6527H19.6739L15.5541 17.077L16.4145 18L22 12L16.4145 6H16.4133Z" fill="currentColor" />
  </svg>
);

// ──────────────────────────────────────────────────────────────────────
// Sigill25Aar — sirkel-stempel rotert -12°
// ──────────────────────────────────────────────────────────────────────
export type SigillVariant = "ring" | "solid" | "dual" | "square";

export function Sigill25Aar({
  variant = "ring",
  size = 180,
  rotate = -12,
  color,
  label = "25 ÅR · 2001 — 2026 · FOSEN TOOLS · 25 ÅR · 2001 — 2026 · FOSEN TOOLS ·",
  inner = "25",
  innerSub = "ÅR I BRANSJEN",
}: {
  variant?: SigillVariant;
  size?: number;
  rotate?: number;
  color?: string;
  label?: string;
  inner?: string;
  innerSub?: string;
}) {
  const c = color || ftAccent;
  const uid = "sigil-" + Math.random().toString(36).slice(2, 8);
  const ringPath = `M ${size / 2}, ${size / 2} m -${size * 0.39}, 0 a ${size * 0.39},${size * 0.39} 0 1,1 ${size * 0.78},0 a ${size * 0.39},${size * 0.39} 0 1,1 -${size * 0.78},0`;

  if (variant === "ring") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: `rotate(${rotate}deg)` }}>
        <defs><path id={uid} d={ringPath} /></defs>
        <circle cx={size / 2} cy={size / 2} r={size * 0.46} fill="none" stroke={c} strokeWidth={1.5} />
        <circle cx={size / 2} cy={size / 2} r={size * 0.32} fill="none" stroke={c} strokeWidth={1} />
        <text style={{ fontFamily: ftHead, fontSize: size * 0.072, fontWeight: 700, letterSpacing: "0.18em", fill: c }}>
          <textPath href={`#${uid}`}>{label}</textPath>
        </text>
        <text x={size / 2} y={size / 2 + size * 0.02} textAnchor="middle" style={{ fontFamily: ftHead, fontSize: size * 0.28, fontWeight: 900, fill: c, letterSpacing: 0 }}>{inner}</text>
        <text x={size / 2} y={size / 2 + size * 0.18} textAnchor="middle" style={{ fontFamily: ftHead, fontSize: size * 0.058, fontWeight: 700, fill: c, letterSpacing: "0.18em" }}>{innerSub}</text>
      </svg>
    );
  }
  if (variant === "solid") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: `rotate(${rotate}deg)` }}>
        <defs><path id={uid} d={ringPath} /></defs>
        <circle cx={size / 2} cy={size / 2} r={size * 0.48} fill={c} />
        <circle cx={size / 2} cy={size / 2} r={size * 0.34} fill="none" stroke="#fff" strokeWidth={1} />
        <text style={{ fontFamily: ftHead, fontSize: size * 0.07, fontWeight: 700, letterSpacing: "0.18em", fill: "#fff" }}>
          <textPath href={`#${uid}`}>{label}</textPath>
        </text>
        <text x={size / 2} y={size / 2 + size * 0.02} textAnchor="middle" style={{ fontFamily: ftHead, fontSize: size * 0.3, fontWeight: 900, fill: "#fff" }}>{inner}</text>
        <text x={size / 2} y={size / 2 + size * 0.18} textAnchor="middle" style={{ fontFamily: ftHead, fontSize: size * 0.058, fontWeight: 700, fill: "#fff", letterSpacing: "0.18em" }}>{innerSub}</text>
      </svg>
    );
  }
  if (variant === "dual") {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: `rotate(${rotate}deg)` }}>
        <defs><path id={uid} d={`M ${size / 2}, ${size / 2} m -${size * 0.42}, 0 a ${size * 0.42},${size * 0.42} 0 1,1 ${size * 0.84},0 a ${size * 0.42},${size * 0.42} 0 1,1 -${size * 0.84},0`} /></defs>
        <circle cx={size / 2} cy={size / 2} r={size * 0.48} fill="none" stroke={c} strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={size * 0.46} fill="none" stroke={c} strokeWidth={0.8} />
        <circle cx={size / 2} cy={size / 2} r={size * 0.30} fill={c} />
        <text style={{ fontFamily: ftHead, fontSize: size * 0.075, fontWeight: 800, letterSpacing: "0.22em", fill: c }}>
          <textPath href={`#${uid}`}>{label}</textPath>
        </text>
        <text x={size / 2} y={size / 2 + size * 0.04} textAnchor="middle" style={{ fontFamily: ftHead, fontSize: size * 0.26, fontWeight: 900, fill: "#fff" }}>{inner}</text>
        <text x={size / 2} y={size / 2 + size * 0.18} textAnchor="middle" style={{ fontFamily: ftHead, fontSize: size * 0.055, fontWeight: 700, fill: "#fff", letterSpacing: "0.16em" }}>{innerSub}</text>
      </svg>
    );
  }
  // square
  return (
    <div style={{
      width: size, height: size, transform: `rotate(${rotate}deg)`, background: c, color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      textAlign: "center", padding: 12, boxSizing: "border-box",
    }}>
      <span style={{ fontFamily: ftHead, fontSize: size * 0.06, fontWeight: 700, letterSpacing: "0.22em" }}>FOSEN TOOLS</span>
      <span style={{ fontFamily: ftHead, fontSize: size * 0.34, fontWeight: 900, lineHeight: 0.9 }}>{inner}</span>
      <span style={{ fontFamily: ftHead, fontSize: size * 0.07, fontWeight: 800, letterSpacing: "0.14em", marginTop: 2 }}>ÅR · 2001 — 2026</span>
      <span style={{ fontFamily: ftHead, fontSize: size * 0.055, fontWeight: 600, letterSpacing: "0.16em", marginTop: size * 0.04, opacity: 0.85 }}>4. GENERASJON · BREKSTAD</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// PriceBurst — bullseye-konsentriske sirkler + alternativer
// ──────────────────────────────────────────────────────────────────────
export type BurstVariant = "bullseye" | "star8" | "star14" | "badge" | "ribbon" | "square";

export function PriceBurst({
  variant = "bullseye",
  size = 120,
  rotate = -8,
  color,
  textColor = "#fff",
  primary = "−30%",
  secondary = "SPAR",
  primarySize,
  style,
}: {
  variant?: BurstVariant;
  size?: number;
  rotate?: number;
  color?: string;
  textColor?: string;
  primary?: string;
  secondary?: string | null;
  primarySize?: number;
  style?: CSSProperties;
}) {
  const c = color || ftAccent;
  const transform = `rotate(${rotate}deg)`;
  const fontSize = primarySize || size * 0.28;

  const Label = () => (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: textColor }}>
      {secondary && <span style={{ fontFamily: ftHead, fontWeight: 700, fontSize: size * 0.1, letterSpacing: "0.18em", lineHeight: 1, marginBottom: 2 }}>{secondary}</span>}
      <span style={{ fontFamily: ftHead, fontWeight: 900, fontSize, lineHeight: 0.95 }}>{primary}</span>
    </div>
  );

  if (variant === "bullseye") {
    return (
      <div style={{ position: "relative", width: size, height: size, transform, ...style }}>
        <svg width={size} height={size} viewBox="0 0 80 80" style={{ position: "absolute", inset: 0 }}>
          <circle cx="40" cy="40" r="36" fill={c} />
          <circle cx="40" cy="40" r="30" fill="none" stroke="#fff" strokeWidth="1.5" />
          <circle cx="40" cy="40" r="24" fill="none" stroke="#fff" strokeWidth="0.7" />
        </svg>
        <Label />
      </div>
    );
  }
  if (variant === "star8") {
    return (
      <div style={{ position: "relative", width: size, height: size, transform, ...style }}>
        <svg width={size} height={size} viewBox="0 0 80 80" style={{ position: "absolute", inset: 0 }}>
          <polygon points="40,2 47,28 75,28 52,46 61,73 40,57 19,73 28,46 5,28 33,28" fill={c} />
        </svg>
        <Label />
      </div>
    );
  }
  if (variant === "star14") {
    return (
      <div style={{ position: "relative", width: size, height: size, transform, ...style }}>
        <svg width={size} height={size} viewBox="0 0 80 80" style={{ position: "absolute", inset: 0 }}>
          <polygon fill={c} points="40,2 44,18 58,8 56,24 72,22 62,34 76,40 62,46 72,58 56,56 58,72 44,62 40,78 36,62 22,72 24,56 8,58 18,46 4,40 18,34 8,22 24,24 22,8 36,18" />
        </svg>
        <Label />
      </div>
    );
  }
  if (variant === "badge") {
    return (
      <div style={{
        position: "relative", width: size, height: size * 0.7, transform, background: c, color: textColor,
        clipPath: "polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", ...style,
      }}>
        {secondary && <span style={{ fontFamily: ftHead, fontWeight: 700, fontSize: size * 0.085, letterSpacing: "0.2em" }}>{secondary}</span>}
        <span style={{ fontFamily: ftHead, fontWeight: 900, fontSize: fontSize * 0.9 }}>{primary}</span>
      </div>
    );
  }
  if (variant === "ribbon") {
    return (
      <div style={{
        position: "relative", width: size * 1.15, height: size * 0.36, transform, background: c, color: textColor,
        display: "flex", alignItems: "center", justifyContent: "center",
        clipPath: "polygon(0 0, 100% 0, 92% 50%, 100% 100%, 0 100%, 8% 50%)", ...style,
      }}>
        <span style={{ fontFamily: ftHead, fontWeight: 900, fontSize: size * 0.18, letterSpacing: "0.04em" }}>{primary}</span>
      </div>
    );
  }
  // square
  return (
    <div style={{
      position: "relative", width: size, height: size, transform, background: c, color: textColor,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", ...style,
    }}>
      {secondary && <span style={{ fontFamily: ftHead, fontWeight: 700, fontSize: size * 0.09, letterSpacing: "0.22em" }}>{secondary}</span>}
      <span style={{ fontFamily: ftHead, fontWeight: 900, fontSize, lineHeight: 0.95 }}>{primary}</span>
      <span style={{ position: "absolute", left: 6, right: 6, top: 6, bottom: 6, border: "1px solid rgba(255,255,255,0.4)", pointerEvents: "none" }} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// SertifikatBaand — hvit rad med sertifikat-merker
// ──────────────────────────────────────────────────────────────────────
export interface CertItem { label: string; sub: string }

export function SertifikatBaand({
  variant = "light",
  items,
  width = 720,
  style,
}: {
  variant?: "light" | "dark";
  items?: CertItem[];
  width?: number | string;
  style?: CSSProperties;
}) {
  const list = items || [
    { label: "Miljøfyrtårn", sub: "MF" },
    { label: "Gaselle 2023", sub: "DN" },
    { label: "25 år", sub: "25" },
    { label: "4. generasjon", sub: "4G" },
    { label: "Grønt Punkt", sub: "GP" },
  ];
  const isDark = variant === "dark";
  return (
    <div style={{
      width, padding: "18px 26px",
      background: isDark ? ftDeep : "#fff",
      borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : ftBorder}`,
      borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : ftBorder}`,
      display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap", justifyContent: "space-between",
      boxSizing: "border-box", ...style,
    }}>
      {list.map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: isDark ? "rgba(255,255,255,0.06)" : ftPage,
            border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : ftBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto",
          }}>
            <span style={{ fontFamily: ftMono, fontSize: 9, color: isDark ? "rgba(255,255,255,0.7)" : ftMuted }}>{c.sub}</span>
          </div>
          <span style={{ fontFamily: ftHead, fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: isDark ? "#fff" : ftText }}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// LogoTicker — horisontal marquee av leverandør-navn
// ──────────────────────────────────────────────────────────────────────
export function LogoTicker({
  width = 720, items, speed = 28, style,
}: {
  width?: number | string;
  items?: string[];
  speed?: number;
  style?: CSSProperties;
}) {
  const list = items || ["WERA", "KNIPEX", "SNAP-ON", "STAHLWILLE", "MILWAUKEE", "HUSQVARNA", "PELICASE", "HELLBERG", "FACOM", "FLUKE"];
  const doubled = [...list, ...list];
  return (
    <div style={{
      width, overflow: "hidden",
      borderTop: `1px solid ${ftBorder}`,
      borderBottom: `1px solid ${ftBorder}`,
      padding: "20px 0", background: "#fff", boxSizing: "border-box", ...style,
    }}>
      <div style={{ display: "flex", gap: 56, whiteSpace: "nowrap", animation: `ft-marquee ${speed}s linear infinite` }}>
        {doubled.map((label, i) => (
          <span key={i} style={{
            fontFamily: ftHead, fontSize: 18, fontWeight: 800, letterSpacing: "0.14em",
            color: ftMuted, textTransform: "uppercase", flex: "0 0 auto",
          }}>{label}</span>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// FTStripe — dekorativ topp-stripe (3 varianter)
// ──────────────────────────────────────────────────────────────────────
export function FTStripe({
  width = 480, variant = "standard", style,
}: {
  width?: number | string;
  variant?: "standard" | "minimal" | "red";
  style?: CSSProperties;
}) {
  if (variant === "standard") {
    return (
      <div style={{
        width, height: "100%", background: ftDeep, color: "#fff",
        display: "flex", alignItems: "center", position: "relative", boxSizing: "border-box", ...style,
      }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: ftAccent }} />
        <span style={{ marginLeft: "5.5%", fontFamily: ftHead, fontSize: "0.32em", fontWeight: 800, letterSpacing: "0.28em", textTransform: "uppercase", color: "#fff" }}>FOSEN TOOLS · BREKSTAD</span>
        <span style={{ marginLeft: "auto", marginRight: "5.5%", fontFamily: ftMono, fontSize: "0.28em", letterSpacing: "0.08em", color: "rgba(255,255,255,0.6)" }}>25 ÅR · 2001 — 2026</span>
      </div>
    );
  }
  if (variant === "minimal") {
    return (
      <div style={{
        width, height: "100%", background: "#fff",
        borderBottom: `1px solid ${ftBorder}`,
        display: "flex", alignItems: "center", position: "relative", boxSizing: "border-box", ...style,
      }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: ftAccent }} />
        <span style={{ marginLeft: "4.5%", fontFamily: ftHead, fontSize: "0.32em", fontWeight: 800, letterSpacing: "0.28em", textTransform: "uppercase", color: ftText }}>FOSEN TOOLS</span>
      </div>
    );
  }
  if (variant === "red") {
    return (
      <div style={{
        width, height: "100%", background: ftAccent, color: "#fff",
        display: "flex", alignItems: "center", boxSizing: "border-box", ...style,
      }}>
        <span style={{ marginLeft: "5.5%", fontFamily: ftHead, fontSize: "0.32em", fontWeight: 800, letterSpacing: "0.3em", textTransform: "uppercase" }}>KAMPANJE</span>
        <span style={{ marginLeft: "4%", fontFamily: ftMono, fontSize: "0.28em", letterSpacing: "0.08em", opacity: 0.85 }}>· GYLDIG TIL 31.05.2026</span>
      </div>
    );
  }
  return null;
}
