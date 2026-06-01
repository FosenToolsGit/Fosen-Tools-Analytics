// T-5 (søn 21. juni) — 100 ÅR I KONSERNET.
// Horisontal tidslinje 1926 → 2001 → 2026 som tegnes inn, hver milepæl
// får en stor markør med årstall + label. Avslutter med 100 ÅR-tallet
// over 25-års-logo.

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
  BigNumber,
  EventFooter,
  FTWordmark,
  JubEyebrow,
  JubileumBackdrop,
  JubileumLogo100,
  RevealText,
  fade,
} from "../shared";
import type { T5Props } from "../types";

export const JubileumT5: React.FC<T5Props> = ({ timeline, headline }) => {
  return (
    <AbsoluteFill>
      <JubileumBackdrop tone="ink" />
      <Sequence from={0} durationInFrames={50}>
        <SceneIntro headline={headline} />
      </Sequence>
      <Sequence from={40} durationInFrames={130}>
        <SceneTimeline timeline={timeline} />
      </Sequence>
      <Sequence from={160} durationInFrames={70}>
        <SceneBigNumber />
      </Sequence>
      <EventFooter delay={160} />
    </AbsoluteFill>
  );
};

const SceneIntro: React.FC<{ headline: string }> = ({ headline }) => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
        gap: 24,
        padding: 80,
      }}
    >
      <JubEyebrow text="100 ÅR I KONSERNET" delay={4} />
      <div style={{ whiteSpace: "pre-line", textAlign: "center" }}>
        <RevealText text={headline} fontSize={68} delay={12} maxWidth={900} />
      </div>
    </AbsoluteFill>
  );
};

const SceneTimeline: React.FC<{ timeline: { year: string; label: string }[] }> = ({
  timeline,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const lineWidth = interpolate(frame, [10, fps * 1.8], [0, width * 0.78], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 80,
      }}
    >
      <div
        style={{
          position: "relative",
          width: width * 0.78,
          height: 360,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Horisontal linje */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            height: 6,
            width: lineWidth,
            background: `linear-gradient(90deg, ${FT.goldTop}, ${FT.goldBottom})`,
            transform: "translateY(-50%)",
            boxShadow: `0 0 24px ${FT.goldBottom}aa`,
          }}
        />
        {timeline.map((t, i) => (
          <Marker
            key={t.year}
            year={t.year}
            label={t.label}
            delay={fps * (0.6 + i * 0.5)}
            highlight={i === timeline.length - 1}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Marker: React.FC<{
  year: string;
  label: string;
  delay: number;
  highlight: boolean;
}> = ({ year, label, delay, highlight }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  const opacity = interpolate(f, [0, fps * 0.35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const s = interpolate(f, [0, fps * 0.4], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dotColor = highlight ? FT.red : FT.goldBottom;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 22,
        opacity,
        transform: `scale(${s})`,
        position: "relative",
        zIndex: 2,
      }}
    >
      <div
        style={{
          fontFamily: SANS_FONT,
          fontSize: 64,
          fontWeight: 800,
          color: FT.white,
          letterSpacing: -2,
        }}
      >
        {year}
      </div>
      <div
        style={{
          width: 36,
          height: 36,
          background: dotColor,
          borderRadius: 999,
          border: `5px solid ${FT.ink}`,
          boxShadow: `0 0 24px ${dotColor}aa`,
        }}
      />
      <div
        style={{
          fontFamily: MONO_FONT,
          fontSize: 20,
          fontWeight: 700,
          color: FT.inkDim,
          letterSpacing: 3,
          textAlign: "center",
          textTransform: "uppercase",
          maxWidth: 240,
        }}
      >
        {label}
      </div>
    </div>
  );
};

const SceneBigNumber: React.FC = () => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
        opacity: o,
      }}
    >
      <BigNumber value={100} unit="ÅR" countUp fontSize={420} />
      <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 16 }}>
        <JubileumLogo100 width={260} />
        <FTWordmark variant="white" width={260} />
      </div>
    </AbsoluteFill>
  );
};
