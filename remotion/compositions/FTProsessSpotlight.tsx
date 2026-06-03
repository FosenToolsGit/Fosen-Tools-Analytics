// FTProsessSpotlight — "Slik lager vi din HDFI". 4 stadier som
// vises sekvensielt, hver med eget bilde (eller stylized fallback) +
// label + beskrivelse. Erstatter "ordforklaring"-følelsen fra
// FTDefinisjonNeo med konkret vise-prosess.
//
//   0-90    Hook E: Process Glimpse (CAD → CNC → HDFI flash)
//   75-99   FTTransition (wipe-bright + Whoosh Sweep)
//   90-510  Scene 2: 4 stadier, ca 100 frames per. Hver med
//           soft-sweep ved overgang.
//   495-525 FTTransition (wipe-open-blur + Soft Sweep)
//   510-600 Scene 3: FTOutroCta

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { AmbientLayer } from "../components/AmbientLayer";
import { FTHook } from "../components/hooks/FTHook";
import { FTHeadingReveal } from "../components/FTHeadingReveal";
import { FTOutroCta } from "../components/FTOutroCta";
import { FTTransition } from "../components/FTTransition";
import { MUSIC_BED_VOLUME } from "../ft-pipeline";
import { musicBed, sfx, sfxVolume } from "../audio-registry";
import { FT, MONO_FONT, SANS_FONT } from "../theme";
import type { FTProsessSpotlightProps } from "../types";

const LOADING_END = 90;
const SCENE_2_END = 510;
const OUTRO_START = 510;
const STAGE_DURATION = 105; // 4 stadier × 105 = 420 frames

export const FTProsessSpotlight: React.FC<FTProsessSpotlightProps> = ({
  eyebrow,
  headline,
  stages,
  ctaUrl,
  tagline,
}) => {
  return (
    <AbsoluteFill>
      <AmbientLayer variant="ink" />

      {/* Scene 1 — Hook E (Process Glimpse) */}
      <Sequence from={0} durationInFrames={LOADING_END}>
        <FTHook kind="process-glimpse" />
      </Sequence>

      <FTTransition from={75} kind="wipe-bright" />

      {/* Scene 2 — 4 stadier */}
      <Sequence
        from={LOADING_END - 5}
        durationInFrames={SCENE_2_END - LOADING_END + 5}
      >
        <ProsessScene2 eyebrow={eyebrow} headline={headline} stages={stages} />
      </Sequence>

      {/* Soft-sweep ved hver stadie-overgang */}
      {stages.map((_, i) => (
        <Sequence
          key={i}
          from={LOADING_END + i * STAGE_DURATION + 2}
          durationInFrames={2}
        >
          <Audio src={sfx("soft-sweep")} volume={sfxVolume("soft-sweep") * 0.5} />
        </Sequence>
      ))}

      <FTTransition from={OUTRO_START - 15} kind="wipe-open-blur" />

      <Sequence from={OUTRO_START} durationInFrames={130}>
        <FTOutroCta
          tagline={tagline ?? "Egen CADLAB · CNC-maskinert"}
          url={ctaUrl ?? "fosen-tools.no/hdfi"}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

const ProsessScene2: React.FC<{
  eyebrow: string;
  headline: string;
  stages: FTProsessSpotlightProps["stages"];
}> = ({ eyebrow, headline, stages }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const sceneT = interpolate(frame, [0, 4], [0, 1], {
    extrapolateRight: "clamp",
  });
  const eyebrowT = interpolate(frame, [12, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Hvilket stadie er aktivt? Frame 100 → stage 0, frame 205 → stage 1, etc.
  // Subtraherer overlap-buffer
  const localFrame = frame - 60;
  const activeStage = Math.min(
    Math.max(0, Math.floor(localFrame / STAGE_DURATION)),
    stages.length - 1,
  );
  const stageLocal = localFrame - activeStage * STAGE_DURATION;

  // Per-stadie fade-in 0-15, hold til STAGE_DURATION-15, fade-ut siste 15.
  const stageInT = interpolate(stageLocal, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stageOutT =
    activeStage < stages.length - 1
      ? interpolate(
          stageLocal,
          [STAGE_DURATION - 15, STAGE_DURATION],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        )
      : 1;
  const stageT = stageInT * stageOutT;

  const stage = stages[activeStage]!;

  // Stagger-progress-indikator nederst (dots som lyser opp)
  return (
    <AbsoluteFill style={{ opacity: sceneT }}>
      {/* Eyebrow + heading på topp — vises gjennom hele Scene 2 */}
      <div
        style={{
          position: "absolute",
          top: height * 0.08,
          left: width * 0.08,
          right: width * 0.08,
          opacity: eyebrowT,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 22,
            color: FT.red,
            letterSpacing: 6,
            fontWeight: 600,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          {eyebrow}
        </div>
        <FTHeadingReveal
          text={headline}
          from={20}
          fontSize={56}
          maxWidth={width * 0.85}
          underlineWidthFactor={0.4}
        />
      </div>

      {/* Aktivt stadie — stort kort i sentrum */}
      <div
        style={{
          position: "absolute",
          top: height * 0.32,
          left: width * 0.08,
          right: width * 0.08,
          bottom: height * 0.2,
          opacity: stageT,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Stadie-nummer + label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontFamily: MONO_FONT,
              fontSize: 28,
              color: FT.red,
              fontWeight: 700,
              letterSpacing: 4,
              border: `2px solid ${FT.red}`,
              padding: "12px 18px",
              borderRadius: 4,
              boxShadow: `0 0 24px rgba(237, 28, 36, 0.3)`,
            }}
          >
            {String(activeStage + 1).padStart(2, "0")} / {String(stages.length).padStart(2, "0")}
          </div>
          <div
            style={{
              fontFamily: SANS_FONT,
              fontSize: 56,
              color: FT.white,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {stage.label}
          </div>
        </div>

        {/* Bilde-eller-fallback */}
        <div
          style={{
            flex: 1,
            background: FT.inkDeep,
            border: `1px solid rgba(237, 28, 36, 0.3)`,
            borderRadius: 4,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          {stage.imageUrl ? (
            <Img
              src={stage.imageUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <StageFallback stage={activeStage} label={stage.label} />
          )}
        </div>

        {/* Beskrivelse */}
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 30,
            color: "rgba(255, 255, 255, 0.85)",
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          {stage.description}
        </div>
      </div>

      {/* Progress-pip nederst */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.08,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 14,
        }}
      >
        {stages.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === activeStage ? 28 : 10,
              height: 6,
              borderRadius: 3,
              background: i <= activeStage ? FT.red : "rgba(255, 255, 255, 0.18)",
              transition: "width 0.3s",
              boxShadow: i === activeStage ? `0 0 12px ${FT.red}` : "none",
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// Stylized stage-fallback når imageUrl mangler
const StageFallback: React.FC<{ stage: number; label: string }> = ({ stage, label }) => {
  // Forskjellig SVG per stadie så hver ser distinkt ut
  const renderSvg = () => {
    if (stage === 0) {
      // Konsept — håndskisse-stil
      return (
        <svg width="40%" height="40%" viewBox="0 0 100 100">
          <rect x={15} y={20} width={70} height={50} fill="none" stroke={FT.red} strokeWidth={1.5} strokeDasharray="4 3" />
          <path d="M 25 35 Q 40 25 55 35 T 80 35" fill="none" stroke={FT.red} strokeWidth={2} />
          <circle cx={50} cy={50} r={2} fill={FT.red} />
        </svg>
      );
    }
    if (stage === 1) {
      // CAD — blueprint med målepiler
      return (
        <svg width="40%" height="40%" viewBox="0 0 100 100">
          <rect x={20} y={25} width={60} height={40} fill="none" stroke={FT.red} strokeWidth={1.5} />
          <line x1={20} y1={75} x2={80} y2={75} stroke={FT.red} strokeWidth={1.5} />
          <path d="M 22 73 L 24 75 L 22 77 Z" fill={FT.red} />
          <path d="M 78 73 L 76 75 L 78 77 Z" fill={FT.red} />
          <text x={50} y={84} fill={FT.red} fontSize={5} fontFamily="monospace" textAnchor="middle" letterSpacing={1}>CAD</text>
        </svg>
      );
    }
    if (stage === 2) {
      // CNC — maskin med kuttebjelke
      return (
        <svg width="40%" height="40%" viewBox="0 0 100 100">
          <rect x={15} y={45} width={70} height={35} fill="none" stroke={FT.red} strokeWidth={1.5} />
          <rect x={45} y={20} width={10} height={28} fill={FT.red} />
          <line x1={50} y1={48} x2={50} y2={75} stroke={FT.red} strokeWidth={2} />
          <circle cx={50} cy={75} r={3} fill={FT.red} />
        </svg>
      );
    }
    // Levert — HDFI-skum-tverrsnitt
    return (
      <svg width="50%" height="40%" viewBox="0 0 120 60">
        <rect x={10} y={5} width={100} height={8} fill={FT.red} />
        <rect x={10} y={13} width={100} height={4} fill="#fff" opacity={0.7} />
        <rect x={10} y={17} width={100} height={38} fill="#1a1a1a" />
        <rect x={20} y={25} width={28} height={20} fill="#0a0a0a" rx={2} />
        <rect x={52} y={25} width={20} height={20} fill="#0a0a0a" rx={2} />
        <rect x={76} y={25} width={26} height={20} fill="#0a0a0a" rx={2} />
      </svg>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      {renderSvg()}
      <div
        style={{
          fontFamily: MONO_FONT,
          fontSize: 18,
          color: FT.red,
          letterSpacing: 4,
          fontWeight: 500,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
    </div>
  );
};
