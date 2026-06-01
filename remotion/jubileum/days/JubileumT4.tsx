// T-4 (man 22. juni) — SPESIELLE GJESTER (Red Bull + Tesla Mobile).
// To gjest-kort side-om-side som glir inn fra hver sin side, med
// "+ OG +"-glyph mellom — så et pulserende blå/rød samspill.

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
import type { T4Props } from "../types";

export const JubileumT4: React.FC<T4Props> = ({ eyebrow, guestA, guestB, subline }) => {
  return (
    <AbsoluteFill>
      <JubileumBackdrop tone="ink" />
      <Sequence from={0} durationInFrames={50}>
        <SceneIntro eyebrow={eyebrow} />
      </Sequence>
      <Sequence from={40} durationInFrames={130}>
        <SceneGuests guestA={guestA} guestB={guestB} />
      </Sequence>
      <Sequence from={160} durationInFrames={60}>
        <SceneSub subline={subline} />
      </Sequence>
      <EventFooter delay={160} />
    </AbsoluteFill>
  );
};

const SceneIntro: React.FC<{ eyebrow: string }> = ({ eyebrow }) => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", opacity: o, gap: 20 }}
    >
      <JubEyebrow text={eyebrow} delay={4} />
      <RevealText text="MØT DEM HOS OSS" fontSize={72} delay={10} />
    </AbsoluteFill>
  );
};

const SceneGuests: React.FC<{ guestA: string; guestB: string }> = ({
  guestA,
  guestB,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const offA = interpolate(frame, [0, fps], [-700, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const offB = interpolate(frame, [0, fps], [700, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 50,
        padding: 60,
      }}
    >
      <GuestCard name={guestA} accent="#0048FF" offset={offA} />
      <div
        style={{
          fontFamily: SANS_FONT,
          fontSize: 120,
          fontWeight: 900,
          color: FT.red,
          fontStyle: "italic",
          letterSpacing: -4,
        }}
      >
        +
      </div>
      <GuestCard name={guestB} accent={FT.red} offset={offB} />
    </AbsoluteFill>
  );
};

const GuestCard: React.FC<{ name: string; accent: string; offset: number }> = ({
  name,
  accent,
  offset,
}) => {
  return (
    <div
      style={{
        width: 420,
        height: 480,
        background: `linear-gradient(180deg, ${accent}, ${accent}DD)`,
        border: `4px solid ${FT.white}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        transform: `translateX(${offset}px)`,
        boxShadow: `0 0 60px ${accent}77`,
        gap: 20,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 999,
          background: FT.white,
          color: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: SANS_FONT,
          fontWeight: 900,
          fontSize: 40,
        }}
      >
        ★
      </div>
      <div
        style={{
          fontFamily: SANS_FONT,
          fontSize: 56,
          fontWeight: 900,
          color: FT.white,
          textAlign: "center",
          lineHeight: 1.05,
          whiteSpace: "pre-line",
          letterSpacing: -1,
          textWrap: "balance" as React.CSSProperties["textWrap"],
        }}
      >
        {name}
      </div>
      <div
        style={{
          fontFamily: MONO_FONT,
          fontSize: 18,
          fontWeight: 700,
          color: FT.white,
          letterSpacing: 4,
          opacity: 0.8,
        }}
      >
        SPESIELL GJEST
      </div>
    </div>
  );
};

const SceneSub: React.FC<{ subline: string }> = ({ subline }) => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 14, 999, 1000);
  return (
    <AbsoluteFill
      style={{ alignItems: "center", justifyContent: "center", opacity: o, gap: 28 }}
    >
      <RevealText text={subline} fontSize={36} weight={600} uppercase={false} maxWidth={900} />
      <FTWordmark variant="white" width={260} />
    </AbsoluteFill>
  );
};
