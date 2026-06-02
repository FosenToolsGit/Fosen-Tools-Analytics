// HookProcessGlimpse — 3 stadier flashes inn 25 frames each (~0.8 sek
// per stadie) før Scene 2: CAD → CNC → HDFI. Hver med eget ord +
// kort visuell figur. Gir prosess-følelse uten å være pedantisk.

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { FT, MONO_FONT, SANS_FONT } from "../../theme";
import { sfx, sfxVolume } from "../../audio-registry";
import type { HookProps } from "./types";

const STAGES = [
  { label: "CAD", caption: "Tegnet i CADLAB", icon: "blueprint" as const },
  { label: "CNC", caption: "Maskinert på Brekstad", icon: "cnc" as const },
  { label: "HDFI", caption: "Levert til kunde", icon: "hdfi" as const },
];

export const HookProcessGlimpse: React.FC<HookProps> = ({
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  if (frame >= durationInFrames) return null;

  // Hvert stadie = 25 frames. 3 stadier = 75 frames. Resten er fade.
  const stageDuration = 25;
  const currentStage = Math.min(Math.floor(frame / stageDuration), STAGES.length - 1);
  const stageLocal = frame - currentStage * stageDuration;

  // Each stage: fade in 0-6, hold 6-18, fade out 18-25
  const stageT =
    stageLocal < 6
      ? interpolate(stageLocal, [0, 6], [0, 1])
      : stageLocal > 18
        ? interpolate(stageLocal, [18, 25], [1, 0])
        : 1;

  const stage = STAGES[currentStage]!;

  // SFX: soft-sweep ved hver stadie-overgang
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 60% 60% at center, rgba(237, 28, 36, 0.15), transparent 70%), ${FT.ink}`,
      }}
    >
      {/* Soft-sweep per stadie */}
      <Sequence from={0} durationInFrames={2}>
        <Audio src={sfx("soft-sweep")} volume={sfxVolume("soft-sweep")} />
      </Sequence>
      <Sequence from={25} durationInFrames={2}>
        <Audio src={sfx("soft-sweep")} volume={sfxVolume("soft-sweep")} />
      </Sequence>
      <Sequence from={50} durationInFrames={2}>
        <Audio src={sfx("soft-sweep")} volume={sfxVolume("soft-sweep")} />
      </Sequence>

      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: stageT,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
          {/* Ikon */}
          <StageIcon icon={stage.icon} />
          {/* Stadie-label */}
          <div
            style={{
              fontFamily: SANS_FONT,
              fontSize: width > 1600 ? 200 : 160,
              fontWeight: 800,
              color: FT.white,
              lineHeight: 0.9,
              letterSpacing: -4,
              textShadow: `0 0 40px rgba(237, 28, 36, 0.4)`,
            }}
          >
            {stage.label}
          </div>
          {/* Caption */}
          <div
            style={{
              fontFamily: MONO_FONT,
              fontSize: 24,
              color: FT.red,
              letterSpacing: 6,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {stage.caption}
          </div>
        </div>
      </AbsoluteFill>

      {/* Progress-pip nederst — 3 dots som lyser opp etter hvert stadie */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 16,
        }}
      >
        {STAGES.map((_, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: i <= currentStage ? FT.red : "rgba(255, 255, 255, 0.18)",
              boxShadow: i === currentStage ? `0 0 12px ${FT.red}` : "none",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const StageIcon: React.FC<{ icon: "blueprint" | "cnc" | "hdfi" }> = ({ icon }) => {
  // SVG stylized icons for each stage
  const size = 120;
  if (icon === "blueprint") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <rect x={10} y={10} width={80} height={80} fill="none" stroke={FT.red} strokeWidth={2} />
        <line x1={10} y1={50} x2={90} y2={50} stroke={FT.red} strokeWidth={1.5} strokeDasharray="3 2" />
        <line x1={50} y1={10} x2={50} y2={90} stroke={FT.red} strokeWidth={1.5} strokeDasharray="3 2" />
        <circle cx={50} cy={50} r={4} fill={FT.red} />
      </svg>
    );
  }
  if (icon === "cnc") {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <rect x={20} y={40} width={60} height={50} fill="none" stroke={FT.red} strokeWidth={2} />
        <rect x={45} y={20} width={10} height={25} fill={FT.red} />
        <line x1={50} y1={45} x2={50} y2={85} stroke={FT.red} strokeWidth={3} />
        <circle cx={50} cy={85} r={3} fill={FT.red} />
      </svg>
    );
  }
  // hdfi: skum-cross-section
  return (
    <svg width={size * 1.2} height={size} viewBox="0 0 120 100">
      <rect x={10} y={30} width={100} height={10} fill={FT.red} />
      <rect x={10} y={40} width={100} height={4} fill={FT.white} opacity={0.7} />
      <rect x={10} y={44} width={100} height={46} fill="#1a1a1a" />
      <rect x={20} y={52} width={28} height={14} fill="#0a0a0a" rx={1} />
      <rect x={52} y={52} width={20} height={14} fill="#0a0a0a" rx={1} />
      <rect x={76} y={52} width={24} height={14} fill="#0a0a0a" rx={1} />
    </svg>
  );
};
