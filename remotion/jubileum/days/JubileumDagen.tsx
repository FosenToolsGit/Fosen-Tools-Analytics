// DAGEN (fre 26. juni) — VI ER ÅPNE!
// Dramatisk dør-åpning-animasjon: to røde paneler glir til hver side
// for å avsløre "VI ER ÅPNE" + konfetti + leverandør-chips-tape +
// jubileumslogo + FT-wordmark.

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
  JubileumBackdrop,
  JubileumLogo25,
  RevealText,
  fade,
} from "../shared";
import type { DagenProps } from "../types";

export const JubileumDagen: React.FC<DagenProps> = ({ headline, chips }) => {
  return (
    <AbsoluteFill>
      <JubileumBackdrop tone="ink" />
      <Sequence from={0} durationInFrames={110}>
        <SceneDoors headline={headline} />
      </Sequence>
      <Sequence from={100} durationInFrames={100}>
        <SceneChips chips={chips} />
      </Sequence>
      <Sequence from={190} durationInFrames={70}>
        <SceneOutro />
      </Sequence>
      <EventFooter delay={190} />
    </AbsoluteFill>
  );
};

const SceneDoors: React.FC<{ headline: string }> = ({ headline }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  // Dørene gliper fra hverandre etter 12 frames
  const doorOffset = interpolate(frame, [12, fps * 1.6], [0, width / 2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const showConfetti = frame > fps * 1.0;
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {/* Bakgrunnstekst — vises når dørene åpner */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30 }}>
        {showConfetti ? <Confetti count={40} seed={9} /> : null}
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 30,
            fontWeight: 700,
            color: FT.burstYellow,
            letterSpacing: 8,
            textTransform: "uppercase",
          }}
        >
          I DAG · 10:00 – 16:00
        </div>
        <RevealText text={headline} fontSize={180} color={FT.white} delay={fps * 1.2} letterSpacing={-6} />
      </AbsoluteFill>
      {/* Venstre dør */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "50%",
          height: "100%",
          background: `linear-gradient(135deg, ${FT.red}, #b81720)`,
          transform: `translateX(${-doorOffset}px)`,
          borderRight: `8px solid ${FT.white}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingRight: 60,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 220,
            fontWeight: 900,
            color: FT.white,
            opacity: doorOffset > 80 ? 0 : 1,
            letterSpacing: -8,
          }}
        >
          26
        </div>
      </div>
      {/* Høyre dør */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "50%",
          height: "100%",
          background: `linear-gradient(225deg, ${FT.red}, #b81720)`,
          transform: `translateX(${doorOffset}px)`,
          borderLeft: `8px solid ${FT.white}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingLeft: 60,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 220,
            fontWeight: 900,
            color: FT.white,
            opacity: doorOffset > 80 ? 0 : 1,
            letterSpacing: -8,
          }}
        >
          06
        </div>
      </div>
      {/* "ÅPNES NÅ"-tekst over dørene før de åpner */}
      {frame < fps * 0.5 ? (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              fontFamily: MONO_FONT,
              fontSize: 36,
              fontWeight: 800,
              color: FT.white,
              letterSpacing: 10,
              textTransform: "uppercase",
              background: FT.ink,
              padding: "16px 32px",
              border: `4px solid ${FT.white}`,
              transform: `translateY(${height * -0.2}px)`,
            }}
          >
            ÅPNES NÅ
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

const SceneChips: React.FC<{ chips: string[] }> = ({ chips }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", opacity: o, gap: 50, padding: 60 }}
    >
      <RevealText text="ALLE ER PÅ PLASS" fontSize={64} delay={4} />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 14,
          maxWidth: 900,
        }}
      >
        {chips.map((c, i) => (
          <Chip key={i} text={c} delay={fps * (0.3 + i * 0.07)} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  const opacity = interpolate(f, [0, fps * 0.25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const s = interpolate(f, [0, fps * 0.3], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        padding: "12px 24px",
        background: FT.burstYellow,
        color: FT.ink,
        fontFamily: SANS_FONT,
        fontSize: 24,
        fontWeight: 800,
        letterSpacing: 1,
        opacity,
        transform: `scale(${s})`,
        textTransform: "uppercase",
      }}
    >
      {text}
    </div>
  );
};

const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", opacity: o, gap: 28 }}
    >
      <Confetti count={32} seed={10} />
      <JubileumLogo25 width={320} />
      <RevealText text="VELKOMMEN INN!" fontSize={88} delay={6} />
      <FTWordmark variant="white" width={300} />
    </AbsoluteFill>
  );
};
