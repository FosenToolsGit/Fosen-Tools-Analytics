// T-12 (søn 14. juni) — ERIK-SITAT.
// Krem-bakgrunn, store anførselstegn som SVG, sitat fade-typer inn linje
// for linje, så navn + rolle + 25-årslogo.

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { FT, SANS_FONT, MONO_FONT } from "../../theme";
import {
  EventFooter,
  JubileumBackdrop,
  JubileumLogo25,
  RevealText,
  fade,
} from "../shared";
import type { T12Props } from "../types";

export const JubileumT12: React.FC<T12Props> = ({ quote, name, role }) => {
  return (
    <AbsoluteFill>
      <JubileumBackdrop tone="cream" />
      <Sequence from={0} durationInFrames={50}>
        <SceneMark />
      </Sequence>
      <Sequence from={40} durationInFrames={140}>
        <SceneQuote quote={quote} />
      </Sequence>
      <Sequence from={170} durationInFrames={70}>
        <SceneAttribution name={name} role={role} />
      </Sequence>
      <EventFooter delay={170} lightBg />
    </AbsoluteFill>
  );
};

const SceneMark: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = interpolate(frame, [0, fps * 0.8], [0.4, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const o = fade(frame, 0, 10, 30, 50);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <svg
        width={280}
        height={280}
        viewBox="0 0 100 100"
        style={{ opacity: o, transform: `scale(${scale})` }}
      >
        <text
          x="50"
          y="80"
          textAnchor="middle"
          fontSize="120"
          fontFamily={SANS_FONT}
          fontWeight={800}
          fill={FT.red}
        >
          “
        </text>
      </svg>
    </AbsoluteFill>
  );
};

const SceneQuote: React.FC<{ quote: string }> = ({ quote }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wordCount = quote.split(" ").length;
  const wordsShown = Math.floor(
    interpolate(frame, [0, fps * 3.2], [0, wordCount], { extrapolateRight: "clamp" }),
  );
  const visible = quote.split(" ").slice(0, wordsShown).join(" ");
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 100 }}>
      <div
        style={{
          fontFamily: SANS_FONT,
          fontSize: 64,
          fontWeight: 600,
          fontStyle: "italic",
          color: FT.ink,
          lineHeight: 1.25,
          maxWidth: 900,
          textAlign: "center",
          textWrap: "balance" as React.CSSProperties["textWrap"],
        }}
      >
        {visible}
        <span style={{ color: FT.red, opacity: 0.4 }}>{visible.length < quote.length ? "▍" : ""}</span>
      </div>
    </AbsoluteFill>
  );
};

const SceneAttribution: React.FC<{ name: string; role: string }> = ({ name, role }) => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        opacity: o,
        padding: 80,
      }}
    >
      <div
        style={{
          width: 80,
          height: 4,
          background: FT.red,
        }}
      />
      <RevealText
        text={name}
        fontSize={56}
        color={FT.ink}
        weight={800}
        delay={4}
        letterSpacing={-1}
      />
      <div
        style={{
          fontFamily: MONO_FONT,
          fontSize: 26,
          fontWeight: 700,
          color: FT.red,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        {role}
      </div>
      <div style={{ marginTop: 36 }}>
        <JubileumLogo25 width={220} />
      </div>
    </AbsoluteFill>
  );
};
