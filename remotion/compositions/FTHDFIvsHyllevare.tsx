// FTHDFIvsHyllevare — visuell før/etter. Kaotisk hyllevare vs ordnet
// HDFI. Først venstre side (FØR), så høyre side (ETTER) slider inn,
// så ROI-tagline lander.
//
//   0-90    Hook D: Visual Reveal (start mørkt, fade inn)
//   75-99   FTTransition (wipe-bw-up — hard kontrast)
//   90-470  Scene 2: split-screen før/etter, ROI-tagline + 3 bullets
//   455-485 FTTransition (light-leak-middle)
//   470-600 Scene 3: FTOutroCta

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
import type { FTHDFIvsHyllevareProps } from "../types";

const LOADING_END = 90;
const SCENE_2_END = 470;
const OUTRO_START = 470;

export const FTHDFIvsHyllevare: React.FC<FTHDFIvsHyllevareProps> = ({
  eyebrow,
  headline,
  beforeImageUrl,
  afterImageUrl,
  roiTagline,
  bullets,
  ctaUrl,
  tagline,
}) => {
  return (
    <AbsoluteFill>
      <Audio src={musicBed()} volume={MUSIC_BED_VOLUME} />
      <AmbientLayer variant="ink" />

      <Sequence from={0} durationInFrames={LOADING_END}>
        <FTHook
          kind="visual-reveal"
          imageUrl={beforeImageUrl}
          primaryText="FØR"
          secondaryText={eyebrow}
        />
      </Sequence>

      <FTTransition from={75} kind="wipe-bw-up" />

      <Sequence
        from={LOADING_END - 5}
        durationInFrames={SCENE_2_END - LOADING_END + 5}
      >
        <VsHyllevareScene2
          eyebrow={eyebrow}
          headline={headline}
          beforeImageUrl={beforeImageUrl}
          afterImageUrl={afterImageUrl}
          roiTagline={roiTagline}
          bullets={bullets}
        />
      </Sequence>

      <Sequence from={LOADING_END + 80} durationInFrames={4}>
        <Audio src={sfx("impact-close")} volume={sfxVolume("impact-close") * 0.8} />
      </Sequence>

      <FTTransition from={OUTRO_START - 15} kind="light-leak-middle" />

      <Sequence from={OUTRO_START} durationInFrames={130}>
        <FTOutroCta
          tagline={tagline ?? "Verktøykontroll for fagfolk"}
          url={ctaUrl ?? "fosen-tools.no/hdfi"}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

const VsHyllevareScene2: React.FC<{
  eyebrow: string;
  headline: string;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  roiTagline: string;
  bullets: string[];
}> = ({ eyebrow, headline, beforeImageUrl, afterImageUrl, roiTagline, bullets }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const sceneT = interpolate(frame, [0, 4], [0, 1], {
    extrapolateRight: "clamp",
  });
  const eyebrowT = interpolate(frame, [12, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Før-bildet er allerede synlig fra Hook D, fade-in 30-60
  const beforeT = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Etter-bildet slider inn fra høyre 80-115
  const afterSpring = spring({
    frame: frame - 80,
    fps,
    config: { damping: 16, stiffness: 180 },
  });

  // ROI-tagline lander 120-150
  const roiT = interpolate(frame, [120, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Bullets stagger 180+
  const bulletSpring = (i: number) =>
    spring({
      frame: frame - (180 + i * 14),
      fps,
      config: { damping: 16, stiffness: 200 },
    });

  // Side-side layout for før/etter
  const splitTop = height * 0.18;
  const splitH = height * 0.36;
  const splitW = width * 0.42;
  const gap = width * 0.04;
  const leftX = (width - splitW * 2 - gap) / 2;
  const rightX = leftX + splitW + gap;

  return (
    <AbsoluteFill style={{ opacity: sceneT }}>
      {/* Eyebrow */}
      <div
        style={{
          position: "absolute",
          top: height * 0.06,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: eyebrowT,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 24,
            color: FT.red,
            letterSpacing: 8,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
      </div>

      {/* Heading centered */}
      <div
        style={{
          position: "absolute",
          top: height * 0.1,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <FTHeadingReveal
          text={headline}
          from={25}
          fontSize={62}
          align="center"
          underlineWidthFactor={0.35}
        />
      </div>

      {/* FØR-kort venstre */}
      <BeforeAfterCard
        x={leftX}
        y={splitTop}
        w={splitW}
        h={splitH}
        opacity={beforeT}
        label="FØR"
        sublabel="Hyllevare"
        accent="rgba(255, 255, 255, 0.45)"
        imageUrl={beforeImageUrl}
        isBefore
      />

      {/* ETTER-kort høyre — slider inn */}
      <div
        style={{
          opacity: afterSpring,
          transform: `translateX(${(1 - afterSpring) * 80}px)`,
        }}
      >
        <BeforeAfterCard
          x={rightX}
          y={splitTop}
          w={splitW}
          h={splitH}
          opacity={1}
          label="ETTER"
          sublabel="HDFI"
          accent={FT.red}
          imageUrl={afterImageUrl}
          isBefore={false}
        />
      </div>

      {/* ROI-tagline */}
      <div
        style={{
          position: "absolute",
          top: splitTop + splitH + 32,
          left: width * 0.08,
          right: width * 0.08,
          opacity: roiT,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 38,
            color: FT.white,
            fontWeight: 700,
            lineHeight: 1.3,
            textAlign: "center",
            borderLeft: `4px solid ${FT.red}`,
            borderRight: `4px solid ${FT.red}`,
            padding: "16px 32px",
          }}
        >
          {roiTagline}
        </div>
      </div>

      {/* 3 bullets */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.08,
          left: width * 0.08,
          right: width * 0.08,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {bullets.slice(0, 3).map((b, i) => {
          const t = bulletSpring(i);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                opacity: t,
                transform: `translateX(${(1 - t) * 16}px)`,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  background: FT.red,
                  flexShrink: 0,
                  boxShadow: `0 0 10px ${FT.red}aa`,
                }}
              />
              <div
                style={{
                  fontFamily: SANS_FONT,
                  fontSize: 22,
                  color: FT.white,
                  fontWeight: 500,
                  letterSpacing: 0.2,
                }}
              >
                {b}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const BeforeAfterCard: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
  label: string;
  sublabel: string;
  accent: string;
  imageUrl: string | null;
  isBefore: boolean;
}> = ({ x, y, w, h, opacity, label, sublabel, accent, imageUrl, isBefore }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: FT.inkDeep,
        border: `1.5px solid ${accent}`,
        borderRadius: 4,
        overflow: "hidden",
        opacity,
        boxShadow: isBefore
          ? "none"
          : `0 12px 32px rgba(237, 28, 36, 0.25), 0 0 24px rgba(237, 28, 36, 0.18)`,
      }}
    >
      {/* Bilde eller fallback */}
      {imageUrl ? (
        <Img
          src={imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: isBefore ? "saturate(0.5) brightness(0.85)" : "none",
          }}
        />
      ) : (
        <BeforeAfterFallback isBefore={isBefore} />
      )}

      {/* Label-stripe */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          padding: "8px 14px",
          background: isBefore ? "rgba(0, 0, 0, 0.7)" : FT.red,
          fontFamily: MONO_FONT,
          fontSize: 16,
          color: FT.white,
          letterSpacing: 4,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      {/* Sublabel */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          right: 16,
          fontFamily: SANS_FONT,
          fontSize: 24,
          color: FT.white,
          fontWeight: 600,
          letterSpacing: 0.5,
          textShadow: "0 2px 8px rgba(0,0,0,0.7)",
        }}
      >
        {sublabel}
      </div>
    </div>
  );
};

const BeforeAfterFallback: React.FC<{ isBefore: boolean }> = ({ isBefore }) => {
  if (isBefore) {
    // Kaotisk hyllevare-fallback — tilfeldig verktøy-bokser
    return (
      <AbsoluteFill style={{ background: "#2a2520" }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
          {Array.from({ length: 18 }).map((_, i) => {
            const x = (i * 17) % 90;
            const y = ((i * 23) % 70) + 10;
            const w = 8 + ((i * 3) % 12);
            const h = 4 + ((i * 5) % 6);
            const rot = ((i * 37) % 30) - 15;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={w}
                height={h}
                fill="#5a5044"
                stroke="#3a3328"
                strokeWidth={0.4}
                transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}
                opacity={0.7 + ((i * 7) % 30) / 100}
              />
            );
          })}
        </svg>
      </AbsoluteFill>
    );
  }
  // Ordnet HDFI-fallback — verktøy-silhuetter perfekt plassert
  return (
    <AbsoluteFill style={{ background: "#0a0a0a" }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <rect x={5} y={10} width={90} height={4} fill={FT.red} opacity={0.8} />
        <rect x={5} y={14} width={90} height={2} fill="#fff" opacity={0.5} />
        <g fill="#1a1a1a">
          <rect x={10} y={20} width={20} height={6} rx={1} />
          <rect x={34} y={20} width={20} height={6} rx={1} />
          <rect x={58} y={20} width={20} height={6} rx={1} />
          <rect x={82} y={20} width={12} height={6} rx={1} />
          <rect x={10} y={30} width={16} height={5} rx={1} />
          <rect x={30} y={30} width={20} height={5} rx={1} />
          <rect x={54} y={30} width={18} height={5} rx={1} />
          <rect x={76} y={30} width={18} height={5} rx={1} />
          <rect x={10} y={40} width={28} height={5} rx={1} />
          <rect x={42} y={40} width={24} height={5} rx={1} />
          <rect x={70} y={40} width={24} height={5} rx={1} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
