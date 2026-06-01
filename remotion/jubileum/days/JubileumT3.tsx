// T-3 (tir 23. juni) — PROFF-PRESENTASJON kl 13.
// Stor analog klokke som tikker frem til 13:00, deretter pitch-tekst
// "FAKTURA · ORDRE · INNKJØP" som tre roterende chips.

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
  RevealText,
  fade,
} from "../shared";
import type { T3Props } from "../types";

export const JubileumT3: React.FC<T3Props> = ({ eyebrow, time, pitch }) => {
  return (
    <AbsoluteFill>
      <JubileumBackdrop tone="ink" />
      <Sequence from={0} durationInFrames={100}>
        <SceneClock eyebrow={eyebrow} time={time} />
      </Sequence>
      <Sequence from={90} durationInFrames={100}>
        <ScenePitch pitch={pitch} />
      </Sequence>
      <Sequence from={180} durationInFrames={50}>
        <SceneOutro />
      </Sequence>
      <EventFooter delay={180} />
    </AbsoluteFill>
  );
};

const SceneClock: React.FC<{ eyebrow: string; time: string }> = ({
  eyebrow,
  time,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Klokken roterer fra 9:00 til 13:00 (240 grader rotasjon)
  const hourRot = interpolate(frame, [10, fps * 2.2], [-90, 30], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const minuteRot = interpolate(frame, [10, fps * 2.2], [0, 720], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const o = fade(frame, 0, 14, 999, 1000);
  const showTime = frame > fps * 2.0;
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
        gap: 40,
      }}
    >
      <JubEyebrow text={eyebrow} delay={4} />
      <div
        style={{
          position: "relative",
          width: 420,
          height: 420,
        }}
      >
        {/* Klokke-ring */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            border: `8px solid ${FT.white}`,
            background: FT.inkDeep,
            boxShadow: `0 0 60px ${FT.red}55, inset 0 0 30px rgba(0,0,0,0.5)`,
          }}
        />
        {/* 12 markører */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * 360 - 90;
          const isMajor = i % 3 === 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: 4,
                height: isMajor ? 26 : 14,
                background: isMajor ? FT.red : FT.white,
                transformOrigin: "50% 200px",
                transform: `translate(-50%, -200px) rotate(${angle}deg)`,
              }}
            />
          );
        })}
        {/* Minuttviser */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 4,
            height: 160,
            background: FT.white,
            transformOrigin: "50% 100%",
            transform: `translate(-50%, -100%) rotate(${minuteRot}deg)`,
            borderRadius: 2,
          }}
        />
        {/* Timeviser */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 8,
            height: 110,
            background: FT.red,
            transformOrigin: "50% 100%",
            transform: `translate(-50%, -100%) rotate(${hourRot}deg)`,
            borderRadius: 4,
            boxShadow: `0 0 20px ${FT.red}aa`,
          }}
        />
        {/* Senterpunkt */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 24,
            height: 24,
            background: FT.red,
            borderRadius: 999,
            transform: "translate(-50%, -50%)",
            border: `3px solid ${FT.white}`,
          }}
        />
      </div>
      {showTime ? (
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 100,
            fontWeight: 900,
            color: FT.burstYellow,
            letterSpacing: -4,
            textShadow: `0 0 30px ${FT.burstYellow}aa`,
          }}
        >
          {time}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const ScenePitch: React.FC<{ pitch: string }> = ({ pitch }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade(frame, 0, 14, 999, 1000);
  const parts = pitch.split("·").map((s) => s.trim());
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
        gap: 50,
        padding: 60,
      }}
    >
      <RevealText text="FAGLIG PÅFYLL" fontSize={72} delay={4} />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 16,
        }}
      >
        {parts.map((p, i) => (
          <Chip key={i} text={p} delay={fps * (0.4 + i * 0.18)} />
        ))}
      </div>
      <div
        style={{
          fontFamily: MONO_FONT,
          fontSize: 22,
          color: FT.burstYellow,
          letterSpacing: 4,
          fontWeight: 700,
        }}
      >
        ca 30 min · for verksted og bedrift
      </div>
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  const opacity = interpolate(f, [0, fps * 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const s = interpolate(f, [0, fps * 0.4], [0.6, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        padding: "14px 32px",
        background: FT.red,
        borderRadius: 12,
        fontFamily: SANS_FONT,
        fontSize: 38,
        fontWeight: 800,
        color: FT.white,
        opacity,
        transform: `scale(${s})`,
        letterSpacing: 1,
        textTransform: "uppercase",
      }}
    >
      {text}
    </div>
  );
};

const SceneOutro: React.FC = () => {
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 26 }}>
      <RevealText text="SETT AV TIDEN" fontSize={88} />
      <FTWordmark variant="white" width={280} />
    </AbsoluteFill>
  );
};
