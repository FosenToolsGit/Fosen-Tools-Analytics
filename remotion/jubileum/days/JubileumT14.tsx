// T-14 (fre 12. juni) — SAVE THE DATE.
// Stort 26. JUNI 2026-reveal. Datoen splittes (26 ← juni → 2026), så
// 25-årslogoen poppes inn under, så festen-er-her-mood med konfetti.

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
  JubileumLogo25,
  RevealText,
  fade,
} from "../shared";
import type { T14Props } from "../types";

export const JubileumT14: React.FC<T14Props> = ({ dateLine, subtitle, place }) => {
  // 180 frames @ 30fps = 6 sek
  return (
    <AbsoluteFill>
      <JubileumBackdrop tone="ink" />
      <Sequence from={0} durationInFrames={70}>
        <SceneDate dateLine={dateLine} />
      </Sequence>
      <Sequence from={60} durationInFrames={70}>
        <SceneLogo subtitle={subtitle} place={place} />
      </Sequence>
      <Sequence from={120} durationInFrames={60}>
        <SceneFest />
      </Sequence>
      <EventFooter delay={130} />
    </AbsoluteFill>
  );
};

const SceneDate: React.FC<{ dateLine: string }> = ({ dateLine }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Datoen splittes inn fra to sider og møtes i midten
  const [day, month, year] = dateLine.split(" ");
  const o = fade(frame, 0, 14, 999, 1000);
  const offLeft = interpolate(frame, [0, fps * 0.8], [-400, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const offRight = interpolate(frame, [0, fps * 0.8], [400, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        opacity: o,
      }}
    >
      <JubEyebrow text="SAVE THE DATE" delay={6} />
      <div style={{ display: "flex", gap: 36, alignItems: "baseline" }}>
        <span
          style={{
            fontFamily: SANS_FONT,
            fontSize: 320,
            fontWeight: 800,
            color: FT.white,
            lineHeight: 0.82,
            letterSpacing: -10,
            transform: `translateX(${offLeft}px)`,
          }}
        >
          {day}
        </span>
        <span
          style={{
            fontFamily: SANS_FONT,
            fontSize: 110,
            fontWeight: 800,
            color: FT.red,
            fontStyle: "italic",
            letterSpacing: -2,
          }}
        >
          {month}
        </span>
        <span
          style={{
            fontFamily: SANS_FONT,
            fontSize: 110,
            fontWeight: 800,
            color: FT.white,
            letterSpacing: -2,
            transform: `translateX(${offRight}px)`,
          }}
        >
          {year}
        </span>
      </div>
    </AbsoluteFill>
  );
};

const SceneLogo: React.FC<{ subtitle: string; place: string }> = ({
  subtitle,
  place,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 30,
      }}
    >
      <div style={{ transform: `scale(${0.5 + pop * 0.5})` }}>
        <JubileumLogo25 width={420} />
      </div>
      <RevealText text={subtitle} fontSize={56} delay={18} maxWidth={880} />
      <RevealText
        text={place}
        fontSize={28}
        delay={28}
        color={FT.red}
        family={MONO_FONT}
        letterSpacing={6}
      />
    </AbsoluteFill>
  );
};

const SceneFest: React.FC = () => {
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <Confetti count={28} seed={3} />
      <RevealText
        text="VI GLEDER OSS"
        fontSize={92}
        delay={4}
        color={FT.white}
      />
      <div style={{ marginTop: 36 }}>
        <FTWordmark variant="white" width={320} />
      </div>
    </AbsoluteFill>
  );
};
