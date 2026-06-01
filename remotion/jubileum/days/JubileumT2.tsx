// T-2 (ons 24. juni) — KONKURRANSER + SERVERING.
// 4 høydepunkt-kort som glir inn i grid med roterende ikoner.
// Festlig mood — gul/rød palett.

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
  Confetti,
  EventFooter,
  FTWordmark,
  JubEyebrow,
  JubileumBackdrop,
  RevealText,
  fade,
} from "../shared";
import type { T2Props } from "../types";

const ICONS = ["%", "🏆", "🍽️", "🛠️"];

export const JubileumT2: React.FC<T2Props> = ({ highlights }) => {
  return (
    <AbsoluteFill>
      <JubileumBackdrop tone="ink" />
      <Sequence from={0} durationInFrames={40}>
        <SceneIntro />
      </Sequence>
      <Sequence from={30} durationInFrames={140}>
        <SceneGrid highlights={highlights} />
      </Sequence>
      <Sequence from={160} durationInFrames={60}>
        <SceneOutro />
      </Sequence>
      <EventFooter delay={160} />
    </AbsoluteFill>
  );
};

const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", opacity: o, gap: 24 }}
    >
      <JubEyebrow text="2 DAGER IGJEN" delay={4} color={FT.burstYellow} />
      <RevealText text="DET VENTER DEG" fontSize={88} delay={10} />
    </AbsoluteFill>
  );
};

const SceneGrid: React.FC<{ highlights: string[] }> = ({ highlights }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
      }}
    >
      {frame > fps * 1.0 ? <Confetti count={18} seed={4} /> : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 380px)",
          gap: 28,
        }}
      >
        {highlights.map((h, i) => (
          <Card key={i} text={h} icon={ICONS[i] ?? "★"} delay={fps * (0.2 + i * 0.25)} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Card: React.FC<{ text: string; icon: string; delay: number }> = ({
  text,
  icon,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  const opacity = interpolate(f, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ty = interpolate(f, [0, fps * 0.5], [80, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        width: 380,
        height: 320,
        background: `linear-gradient(135deg, ${FT.red}, ${FT.red}DD)`,
        border: `4px solid ${FT.white}`,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        opacity,
        transform: `translateY(${ty}px)`,
        boxShadow: `0 20px 40px rgba(0,0,0,0.4)`,
      }}
    >
      <div
        style={{
          fontFamily: SANS_FONT,
          fontSize: 120,
          fontWeight: 900,
          color: FT.burstYellow,
          lineHeight: 1,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: SANS_FONT,
          fontSize: 32,
          fontWeight: 800,
          color: FT.white,
          lineHeight: 1.15,
          textTransform: "uppercase",
          letterSpacing: -0.5,
          textWrap: "balance" as React.CSSProperties["textWrap"],
        }}
      >
        {text}
      </div>
    </div>
  );
};

const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", opacity: o, gap: 26 }}
    >
      <Confetti count={24} seed={5} />
      <div
        style={{
          fontFamily: MONO_FONT,
          fontSize: 24,
          fontWeight: 700,
          color: FT.burstYellow,
          letterSpacing: 5,
        }}
      >
        BREKSTAD · 10:00 – 16:00
      </div>
      <RevealText text="TA TUREN!" fontSize={108} delay={6} color={FT.burstYellow} />
      <FTWordmark variant="white" width={260} />
    </AbsoluteFill>
  );
};
