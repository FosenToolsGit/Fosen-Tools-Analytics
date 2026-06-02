// FTSpriteDisk — 2-letter monogram on a brushed-steel-look disk with
// FT-rød ring + glow. Used for kunde-portretts in FTSitatClip when we
// can't (or shouldn't) show the actual person's photo.
//
// This is the "sprite trick" adapted from Hundo Hunter's MonsBall:
// any time we'd reach for a stock photo or unlicensed logo, render a
// typographic placeholder instead. Reads as "real customer, identity
// withheld for confidentiality" — works in B2B leveranse-storytelling.

import React from "react";

import { FT, SANS_FONT } from "../theme";

export function initialsFor(name: string): string {
  if (!name) return "FT";
  // Split on whitespace/dash, take first letter of first two tokens.
  const tokens = name.replace(/[^A-Za-zÆØÅæøå\s-]/g, "").split(/[\s-]+/).filter(Boolean);
  if (tokens.length === 0) return "FT";
  if (tokens.length === 1) {
    const t = tokens[0]!;
    return (t.slice(0, 2)).toUpperCase();
  }
  return (tokens[0]![0]! + tokens[1]![0]!).toUpperCase();
}

export const FTSpriteDisk: React.FC<{
  /** Customer / person name — initials get extracted from this. */
  name: string;
  /** Overall size in px. */
  size?: number;
  /** Disk base fill — defaults to brushed steel / ink. */
  diskColor?: string;
  /** Ring color. */
  ringColor?: string;
  /** Initials text color. */
  initialsColor?: string;
}> = ({
  name,
  size = 320,
  diskColor = FT.ink,
  ringColor = FT.red,
  initialsColor = FT.white,
}) => {
  const initials = initialsFor(name);
  const fontSize = size * 0.38;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `
          radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), transparent 60%),
          radial-gradient(circle at 70% 80%, rgba(0,0,0,0.4), transparent 60%),
          ${diskColor}
        `,
        boxShadow: `
          inset 0 4px 12px rgba(255, 255, 255, 0.08),
          inset 0 -6px 14px rgba(0, 0, 0, 0.35),
          0 18px 36px rgba(0, 0, 0, 0.5),
          0 0 40px rgba(237, 28, 36, 0.35)
        `,
      }}
    >
      {/* FT-rød ring */}
      <div
        style={{
          position: "absolute",
          inset: 6,
          borderRadius: "50%",
          border: `3px solid ${ringColor}`,
          opacity: 0.85,
          boxShadow: `0 0 16px ${ringColor}88, inset 0 0 12px ${ringColor}44`,
        }}
      />
      {/* Inner subtle ring */}
      <div
        style={{
          position: "absolute",
          inset: 20,
          borderRadius: "50%",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      />
      {/* Initials */}
      <div
        style={{
          fontFamily: SANS_FONT,
          fontSize,
          fontWeight: 800,
          color: initialsColor,
          letterSpacing: -2,
          textShadow: `0 4px 12px rgba(0, 0, 0, 0.6)`,
        }}
      >
        {initials}
      </div>
    </div>
  );
};
