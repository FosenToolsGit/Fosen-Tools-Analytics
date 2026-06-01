// T-7 (fre 19. juni) — ÉN UKE IGJEN!
// Massiv "7" count-up med gull-gradient (matcher 25-årslogoen) +
// pulsende ring rundt tallet + jubileumslogo.

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { FT, SANS_FONT } from "../../theme";
import {
  BigNumber,
  EventFooter,
  FTWordmark,
  JubEyebrow,
  JubileumBackdrop,
  JubileumLogo25,
  RevealText,
  fade,
} from "../shared";
import type { T7Props } from "../types";

export const JubileumT7: React.FC<T7Props> = ({ daysLeft, unit, headline }) => {
  return (
    <AbsoluteFill>
      <JubileumBackdrop tone="ink" />
      <Sequence from={0} durationInFrames={100}>
        <SceneNumber daysLeft={daysLeft} unit={unit} />
      </Sequence>
      <Sequence from={90} durationInFrames={80}>
        <SceneHeadline headline={headline} />
      </Sequence>
      <Sequence from={160} durationInFrames={60}>
        <SceneOutro />
      </Sequence>
      <EventFooter delay={160} />
    </AbsoluteFill>
  );
};

const SceneNumber: React.FC<{ daysLeft: number; unit: string }> = ({
  daysLeft,
  unit,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ringScale = 1 + 0.05 * Math.sin((frame / fps) * 3);
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
        gap: 16,
      }}
    >
      <JubEyebrow text="COUNTDOWN" delay={4} />
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: -120,
            border: `6px solid ${FT.red}`,
            borderRadius: 999,
            opacity: 0.3,
            transform: `scale(${ringScale})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: -60,
            border: `4px solid ${FT.burstYellow}`,
            borderRadius: 999,
            opacity: 0.5,
            transform: `scale(${ringScale * 1.02})`,
          }}
        />
        <BigNumber value={daysLeft} unit={unit} countUp fontSize={500} />
      </div>
    </AbsoluteFill>
  );
};

const SceneHeadline: React.FC<{ headline: string }> = ({ headline }) => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 30,
        opacity: o,
        padding: 80,
      }}
    >
      <RevealText
        text={headline}
        fontSize={66}
        delay={4}
        maxWidth={900}
        letterSpacing={-1}
      />
      <div
        style={{
          fontFamily: SANS_FONT,
          fontSize: 32,
          fontStyle: "italic",
          color: FT.burstYellow,
          fontWeight: 600,
        }}
      >
        Meld deg på i tide
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
        gap: 26,
      }}
    >
      <JubileumLogo25 width={280} />
      <FTWordmark variant="white" width={300} />
    </AbsoluteFill>
  );
};
