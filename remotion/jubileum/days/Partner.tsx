// T-10/9/8 — PARTNER-SPOTLIGHTS (Milwaukee, Wera, Soudal).
//
// Felles komposisjon — partner-navn + accent-farge styrer alt visuelt.
// Tre scener:
//   1. PARTNER PÅ PLASS-eyebrow + partner-navnet i partner-fargen, BIG
//   2. Spec-chips som popper inn én etter én
//   3. 26. JUNI · BREKSTAD-revelering med FT-wordmark
//
// Rendres som tre separate komposisjoner (T10/T9/T8) men deler all kode.

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
  EventFooter,
  FTWordmark,
  GlowStripe,
  JubEyebrow,
  JubileumBackdrop,
  RevealText,
  fade,
} from "../shared";
import type { PartnerProps } from "../types";

const PartnerSpotlight: React.FC<PartnerProps> = ({ partner, accentColor, tagline, chips }) => {
  return (
    <AbsoluteFill>
      <JubileumBackdrop tone="ink" stripeColor={accentColor} />
      <Sequence from={0} durationInFrames={80}>
        <SceneName partner={partner} accentColor={accentColor} />
      </Sequence>
      <Sequence from={70} durationInFrames={90}>
        <SceneChips tagline={tagline} chips={chips} accentColor={accentColor} />
      </Sequence>
      <Sequence from={150} durationInFrames={50}>
        <SceneOutro accentColor={accentColor} />
      </Sequence>
      <EventFooter delay={150} />
    </AbsoluteFill>
  );
};

const SceneName: React.FC<{ partner: string; accentColor: string }> = ({
  partner,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
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
      <JubEyebrow text="PARTNER PÅ PLASS" color={accentColor} delay={4} />
      <GlowStripe y={420} color={accentColor} startDelay={6} thickness={6} />
      <div
        style={{
          fontFamily: SANS_FONT,
          fontSize: partner.length > 8 ? 180 : 220,
          fontWeight: 900,
          color: accentColor,
          letterSpacing: -6,
          transform: `scale(${0.6 + pop * 0.4})`,
          textShadow: `0 0 60px ${accentColor}44`,
        }}
      >
        {partner}
      </div>
      <GlowStripe y={870} color={accentColor} startDelay={10} thickness={6} />
    </AbsoluteFill>
  );
};

const SceneChips: React.FC<{
  tagline: string;
  chips: string[];
  accentColor: string;
}> = ({ tagline, chips, accentColor }) => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 50,
        opacity: o,
        padding: 80,
      }}
    >
      <RevealText
        text={tagline}
        fontSize={44}
        delay={4}
        weight={700}
        maxWidth={900}
      />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 18,
          justifyContent: "center",
          maxWidth: 900,
        }}
      >
        {chips.map((c, i) => (
          <SpecChip key={i} text={c} color={accentColor} delay={i * 8 + 18} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const SpecChip: React.FC<{ text: string; color: string; delay: number }> = ({
  text,
  color,
  delay,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  const opacity = interpolate(f, [0, fps * 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const s = interpolate(f, [0, fps * 0.35], [0.6, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        padding: "16px 30px",
        borderRadius: 999,
        border: `3px solid ${color}`,
        background: `${color}22`,
        fontFamily: SANS_FONT,
        fontSize: 28,
        fontWeight: 800,
        color: FT.white,
        opacity,
        transform: `scale(${s})`,
        letterSpacing: 1,
      }}
    >
      {text}
    </div>
  );
};

const SceneOutro: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        opacity: o,
      }}
    >
      <div
        style={{
          fontFamily: MONO_FONT,
          fontSize: 30,
          fontWeight: 700,
          color: accentColor,
          letterSpacing: 6,
        }}
      >
        26. JUNI · BREKSTAD
      </div>
      <RevealText text="MØT TEAMET" fontSize={96} delay={6} />
      <FTWordmark variant="white" width={280} />
    </AbsoluteFill>
  );
};

// Tre eksporterte komposisjoner med samme komponent men ulik default-data
export const JubileumT10: React.FC<PartnerProps> = (props) => <PartnerSpotlight {...props} />;
export const JubileumT9: React.FC<PartnerProps> = (props) => <PartnerSpotlight {...props} />;
export const JubileumT8: React.FC<PartnerProps> = (props) => <PartnerSpotlight {...props} />;
