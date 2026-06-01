// T-1 (tor 25. juni) — I MORGEN!
// Massiv pulserende "1" med glødende rød ring, så "I MORGEN"-headline
// med urgency-mood. Avslutter med 25-årslogo + tid/sted.

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
  FTWordmark,
  JubEyebrow,
  JubileumBackdrop,
  JubileumLogo25,
  RevealText,
  fade,
} from "../shared";
import type { T1Props } from "../types";

export const JubileumT1: React.FC<T1Props> = ({ headline, subline }) => {
  return (
    <AbsoluteFill>
      <JubileumBackdrop tone="ink" />
      <Sequence from={0} durationInFrames={100}>
        <SceneOne />
      </Sequence>
      <Sequence from={90} durationInFrames={90}>
        <SceneHeadline headline={headline} subline={subline} />
      </Sequence>
      <Sequence from={170} durationInFrames={60}>
        <SceneOutro />
      </Sequence>
      <EventFooter delay={170} />
    </AbsoluteFill>
  );
};

const SceneOne: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Pulserende ring
  const pulse = 1 + 0.08 * Math.sin((frame / fps) * 5);
  const o = fade(frame, 0, 14, 999, 1000);
  // Tallet zoomer inn fra liten
  const scale = interpolate(frame, [0, fps * 0.8], [0.4, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
        gap: 26,
      }}
    >
      <JubEyebrow text="1 DAG IGJEN" delay={4} color={FT.red} />
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: -200,
            border: `8px solid ${FT.red}`,
            borderRadius: 999,
            opacity: 0.35,
            transform: `scale(${pulse})`,
            boxShadow: `0 0 80px ${FT.red}aa`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: -100,
            border: `4px solid ${FT.white}`,
            borderRadius: 999,
            opacity: 0.55,
            transform: `scale(${pulse * 1.03})`,
          }}
        />
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 760,
            fontWeight: 900,
            color: FT.red,
            lineHeight: 0.82,
            letterSpacing: -40,
            transform: `scale(${scale})`,
            textShadow: `0 0 80px ${FT.red}99`,
          }}
        >
          1
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneHeadline: React.FC<{ headline: string; subline: string }> = ({
  headline,
  subline,
}) => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
        gap: 36,
        padding: 80,
      }}
    >
      <RevealText
        text={headline}
        fontSize={150}
        color={FT.white}
        delay={4}
        letterSpacing={-4}
      />
      <div
        style={{
          width: 80,
          height: 6,
          background: FT.red,
        }}
      />
      <div
        style={{
          fontFamily: MONO_FONT,
          fontSize: 26,
          fontWeight: 700,
          color: FT.white,
          letterSpacing: 4,
          textAlign: "center",
        }}
      >
        {subline}
      </div>
    </AbsoluteFill>
  );
};

const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
        gap: 28,
      }}
    >
      <JubileumLogo25 width={300} />
      <RevealText text="VI GLEDER OSS!" fontSize={64} delay={6} color={FT.burstYellow} />
      <FTWordmark variant="white" width={280} />
    </AbsoluteFill>
  );
};
