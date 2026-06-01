// T-11 (man 15. juni) — PROGRAM-AVSLØRING.
// Vertikal tidslinje med klokkeslett som glider inn et om gangen,
// hvert med en rød "prikk" på linjen + label. Avslutter med
// PÅMELDING-CTA.

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
import type { T11Props } from "../types";

export const JubileumT11: React.FC<T11Props> = ({ eyebrow, schedule }) => {
  return (
    <AbsoluteFill>
      <JubileumBackdrop tone="ink" />
      <Sequence from={0} durationInFrames={50}>
        <SceneIntro eyebrow={eyebrow} />
      </Sequence>
      <Sequence from={40} durationInFrames={150}>
        <SceneTimeline schedule={schedule} />
      </Sequence>
      <Sequence from={180} durationInFrames={60}>
        <SceneCta />
      </Sequence>
      <EventFooter delay={180} />
    </AbsoluteFill>
  );
};

const SceneIntro: React.FC<{ eyebrow: string }> = ({ eyebrow }) => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
        gap: 24,
      }}
    >
      <JubEyebrow text={eyebrow} delay={4} />
      <RevealText text="PROGRAMMET ER KLART" fontSize={84} delay={12} />
    </AbsoluteFill>
  );
};

const SceneTimeline: React.FC<{ schedule: { time: string; label: string }[] }> = ({
  schedule,
}) => {
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        padding: 100,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 56,
          maxWidth: 800,
          position: "relative",
        }}
      >
        {/* Vertikal rød linje bak prikkene */}
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 16,
            bottom: 16,
            width: 4,
            background: `linear-gradient(180deg, ${FT.red}, ${FT.burstYellow})`,
            opacity: 0.45,
          }}
        />
        {schedule.map((s, i) => (
          <Slot key={i} time={s.time} label={s.label} delay={i * 18} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Slot: React.FC<{ time: string; label: string; delay: number }> = ({
  time,
  label,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  const opacity = interpolate(f, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tx = interpolate(f, [0, fps * 0.4], [80, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 36,
        opacity,
        transform: `translateX(${tx}px)`,
      }}
    >
      <div
        style={{
          width: 84,
          height: 84,
          borderRadius: 999,
          background: FT.red,
          border: `4px solid ${FT.white}`,
          flexShrink: 0,
          boxShadow: `0 0 26px ${FT.red}88`,
        }}
      />
      <div>
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 64,
            fontWeight: 800,
            color: FT.white,
            lineHeight: 1,
            letterSpacing: -2,
          }}
        >
          {time}
        </div>
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 24,
            fontWeight: 700,
            color: FT.burstYellow,
            letterSpacing: 3,
            textTransform: "uppercase",
            marginTop: 8,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};

const SceneCta: React.FC = () => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
        opacity: o,
      }}
    >
      <RevealText text="MELD DEG PÅ" fontSize={96} color={FT.white} />
      <div
        style={{
          padding: "22px 56px",
          background: FT.red,
          borderRadius: 999,
          fontFamily: SANS_FONT,
          fontSize: 36,
          fontWeight: 800,
          color: FT.white,
          letterSpacing: 1,
        }}
      >
        fosen-tools.no
      </div>
      <FTWordmark variant="white" width={260} />
    </AbsoluteFill>
  );
};
