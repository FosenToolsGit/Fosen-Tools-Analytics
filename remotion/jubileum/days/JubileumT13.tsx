// T-13 (lør 13. juni) — BAK KULISSENE: OMBYGGING.
// Blueprint-stil: rutete bakgrunn, "konstruksjon"-vibes med animert
// progress-bar som fyller seg opp + 3 bullets som typer inn.

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { FT, MONO_FONT, SANS_FONT } from "../../theme";
import {
  EventFooter,
  FTWordmark,
  JubEyebrow,
  JubileumBackdrop,
  RevealText,
  fade,
} from "../shared";
import type { T13Props } from "../types";

export const JubileumT13: React.FC<T13Props> = ({ eyebrow, headline, bullets }) => {
  return (
    <AbsoluteFill>
      <JubileumBackdrop tone="deep" />
      <BlueprintGrid />
      <Sequence from={0} durationInFrames={70}>
        <SceneIntro eyebrow={eyebrow} headline={headline} />
      </Sequence>
      <Sequence from={60} durationInFrames={90}>
        <SceneProgress bullets={bullets} />
      </Sequence>
      <Sequence from={140} durationInFrames={50}>
        <SceneOutro />
      </Sequence>
      <EventFooter delay={140} />
    </AbsoluteFill>
  );
};

const BlueprintGrid: React.FC = () => {
  const line = "rgba(237,28,36,0.10)";
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }}
    />
  );
};

const SceneIntro: React.FC<{ eyebrow: string; headline: string }> = ({
  eyebrow,
  headline,
}) => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
        padding: 80,
        opacity: o,
      }}
    >
      <JubEyebrow text={eyebrow} delay={2} />
      <div style={{ whiteSpace: "pre-line", textAlign: "center" }}>
        <RevealText text={headline} fontSize={92} delay={12} maxWidth={900} />
      </div>
    </AbsoluteFill>
  );
};

const SceneProgress: React.FC<{ bullets: [string, string, string] }> = ({
  bullets,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const barWidth = interpolate(frame, [0, fps * 2.2], [0, width * 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 56,
        padding: 80,
      }}
    >
      <div
        style={{
          width: width * 0.7,
          height: 24,
          background: "rgba(255,255,255,0.10)",
          borderRadius: 12,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: barWidth,
            height: "100%",
            background: `linear-gradient(90deg, ${FT.red}, ${FT.burstYellow})`,
            boxShadow: `0 0 30px ${FT.red}88`,
          }}
        />
      </div>
      <div
        style={{
          fontFamily: MONO_FONT,
          fontSize: 28,
          fontWeight: 700,
          color: FT.burstYellow,
          letterSpacing: 4,
        }}
      >
        {Math.round((barWidth / (width * 0.7)) * 100)}%
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {bullets.map((b, i) => (
          <Bullet key={i} text={b} delay={fps * (0.6 + i * 0.4)} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Bullet: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  const opacity = interpolate(f, [0, fps * 0.35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tx = interpolate(f, [0, fps * 0.4], [-40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        opacity,
        transform: `translateX(${tx}px)`,
        fontFamily: SANS_FONT,
        fontSize: 38,
        fontWeight: 600,
        color: FT.white,
      }}
    >
      <span style={{ color: FT.red, fontWeight: 900 }}>+</span>
      {text}
    </div>
  );
};

const SceneOutro: React.FC = () => {
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 28 }}>
      <RevealText text="KLART 26. JUNI" fontSize={96} color={FT.burstYellow} />
      <FTWordmark variant="white" width={300} />
    </AbsoluteFill>
  );
};
