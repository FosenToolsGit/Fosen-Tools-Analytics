// T-6 (lør 20. juni) — GOODIEBAG-TEASER.
// Stilisert SVG-gave-eske som "åpner seg" (lokket lyfter), så 100-tall
// poppes inn + tre innholds-bullets med liten gave-ikon.

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
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
import type { T6Props } from "../types";

export const JubileumT6: React.FC<T6Props> = ({ count, headline, contents }) => {
  return (
    <AbsoluteFill>
      <JubileumBackdrop tone="ink" />
      <Sequence from={0} durationInFrames={90}>
        <SceneGift count={count} />
      </Sequence>
      <Sequence from={80} durationInFrames={100}>
        <SceneContents headline={headline} contents={contents} />
      </Sequence>
      <Sequence from={170} durationInFrames={60}>
        <SceneOutro />
      </Sequence>
      <EventFooter delay={170} />
    </AbsoluteFill>
  );
};

const SceneGift: React.FC<{ count: number }> = ({ count }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lidLift = interpolate(frame, [10, fps * 1.4], [0, -100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lidRotate = interpolate(frame, [10, fps * 1.4], [0, -10], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const numberPop = spring({
    frame: frame - fps * 1.2,
    fps,
    config: { damping: 12 },
  });
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
        gap: 30,
      }}
    >
      <JubEyebrow text="GOODIEBAG" delay={4} />
      {frame > fps * 1.0 ? <Confetti count={20} seed={2} /> : null}
      <div style={{ position: "relative", width: 360, height: 340 }}>
        {/* Eskens kropp */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 240,
            background: FT.red,
            border: `6px solid ${FT.white}`,
            boxShadow: `0 0 50px ${FT.red}88`,
          }}
        />
        {/* Bånd vertikalt */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            marginLeft: -22,
            width: 44,
            height: 240,
            background: FT.burstYellow,
          }}
        />
        {/* Lokket */}
        <div
          style={{
            position: "absolute",
            top: 100,
            left: -10,
            right: -10,
            height: 60,
            background: FT.red,
            border: `6px solid ${FT.white}`,
            transform: `translateY(${lidLift}px) rotate(${lidRotate}deg)`,
            transformOrigin: "left bottom",
          }}
        />
        {/* Sløyfe på lokket */}
        <div
          style={{
            position: "absolute",
            top: 60,
            left: "50%",
            marginLeft: -50,
            width: 100,
            height: 60,
            background: FT.burstYellow,
            borderRadius: "50%",
            transform: `translateY(${lidLift}px) rotate(${lidRotate}deg)`,
            transformOrigin: "left bottom",
          }}
        />
      </div>
      <div
        style={{
          fontFamily: SANS_FONT,
          fontSize: 220,
          fontWeight: 900,
          color: FT.burstYellow,
          lineHeight: 0.85,
          letterSpacing: -8,
          transform: `scale(${0.5 + numberPop * 0.5})`,
        }}
      >
        {count}
      </div>
    </AbsoluteFill>
  );
};

const SceneContents: React.FC<{ headline: string; contents: string[] }> = ({
  headline,
  contents,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
        gap: 50,
        padding: 80,
      }}
    >
      <div style={{ whiteSpace: "pre-line", textAlign: "center" }}>
        <RevealText text={headline} fontSize={72} maxWidth={900} delay={4} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {contents.map((c, i) => (
          <Row key={i} text={c} delay={fps * (0.5 + i * 0.3)} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Row: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  const opacity = interpolate(f, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tx = interpolate(f, [0, fps * 0.4], [40, 0], {
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
        fontSize: 36,
        fontWeight: 600,
        color: FT.white,
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          background: FT.burstYellow,
          color: FT.ink,
          fontSize: 22,
          fontWeight: 900,
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ★
      </span>
      {text}
    </div>
  );
};

const SceneOutro: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
      }}
    >
      <div
        style={{
          fontFamily: MONO_FONT,
          fontSize: 24,
          fontWeight: 700,
          color: FT.burstYellow,
          letterSpacing: 5,
        }}
      >
        TIL DE FØRSTE 100
      </div>
      <RevealText text="TA TUREN INNOM" fontSize={88} delay={6} />
      <FTWordmark variant="white" width={260} />
    </AbsoluteFill>
  );
};
