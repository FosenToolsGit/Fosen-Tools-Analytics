// FTHDFISpotlight — produkt-/feature-spotlight med 3 USP-bullets.
// Brukes for HDFI-spesifikt, men også for andre egne produkter
// (FT Systemvegg, Mobilhotell, weapon storage).
//
//   0-90    Scene 1: FTLoadingScreen
//   75-99   FTTransition (wipe-bw-up + Whoosh Cinematic) — sterk
//           kontrast som skjærer gjennom og åpner Scene 2.
//   90-470  Scene 2: Eyebrow + H1 + tagline + produktbilde med
//           FTBlueprintFrame, 3 USP-bullets staggered 8 frames apart,
//           FTBannerCard nederst med climax-hook.
//   455-485 FTTransition (light-leak-middle + Whoosh Cinematic)
//   470-600 Scene 3: FTOutroCta med produkt-CTA URL.

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
import { FTBannerCard } from "../components/FTBannerCard";
import { FTBlueprintFrame } from "../components/FTBlueprintFrame";
import { FTHeadingReveal } from "../components/FTHeadingReveal";
import { FTLoadingScreen } from "../components/FTLoadingScreen";
import { FTOutroCta } from "../components/FTOutroCta";
import { FTTransition } from "../components/FTTransition";
import { MUSIC_BED_VOLUME } from "../ft-pipeline";
import { musicBed, sfx, sfxVolume } from "../audio-registry";
import { FT, MONO_FONT, SANS_FONT } from "../theme";
import type { FTHDFISpotlightProps } from "../types";

const LOADING_END = 90;
const SCENE_2_END = 470;
const OUTRO_START = 470;

export const FTHDFISpotlight: React.FC<FTHDFISpotlightProps> = ({
  eyebrow,
  headline,
  tagline,
  imageUrl,
  bullets,
  bannerHeadline,
  bannerSubline,
  ctaUrl,
}) => {
  return (
    <AbsoluteFill>
      <AmbientLayer variant="ink" />

      {/* Riser plays subtly under Scene 2's first half */}
      <Sequence from={LOADING_END} durationInFrames={120}>
        <Audio src={sfx("riser-slow")} volume={sfxVolume("riser-slow") * 0.6} />
      </Sequence>

      {/* Scene 1 */}
      <Sequence from={0} durationInFrames={LOADING_END}>
        <FTLoadingScreen
          eyebrow="EGEN PRODUKSJON · CADLAB"
          tagline="HDFI fra Brekstad"
        />
      </Sequence>

      {/* Scene 1 → Scene 2 */}
      <FTTransition from={75} kind="wipe-bw-up" />

      {/* Scene 2 */}
      <Sequence
        from={LOADING_END - 5}
        durationInFrames={SCENE_2_END - LOADING_END + 5}
      >
        <HDFIScene2
          eyebrow={eyebrow}
          headline={headline}
          tagline={tagline}
          imageUrl={imageUrl}
          bullets={bullets}
        />
      </Sequence>

      {/* Banner card lands ~6 sec into Scene 2 (after bullets) */}
      {bannerHeadline && (
        <FTBannerCard
          headline={bannerHeadline}
          subline={bannerSubline}
          from={LOADING_END + 170}
          durationInFrames={140}
        />
      )}

      {/* Scene 2 → Outro */}
      <FTTransition from={OUTRO_START - 15} kind="light-leak-middle" />

      {/* Scene 3 */}
      <Sequence from={OUTRO_START} durationInFrames={130}>
        <FTOutroCta
          tagline="Skreddersydd på Brekstad"
          url={ctaUrl ?? "fosen-tools.no/hdfi"}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

const HDFIScene2: React.FC<{
  eyebrow: string;
  headline: string;
  tagline: string;
  imageUrl: string | null;
  bullets: string[];
}> = ({ eyebrow, headline, tagline, imageUrl, bullets }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const sceneT = interpolate(frame, [0, 4], [0, 1], {
    extrapolateRight: "clamp",
  });
  const eyebrowT = interpolate(frame, [12, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineT = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const imgT = interpolate(frame, [70, 100], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const imgScale = interpolate(frame, [70, 320], [0.96, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // FT-rød pulse ring around image, breathes every 60 frames
  const pulse = 0.5 + 0.5 * Math.sin((frame - 90) * 0.1);

  // Bullets stagger in starting frame 130, 8 frames apart
  const bulletSpring = (i: number) =>
    spring({
      frame: frame - (130 + i * 8),
      fps,
      config: { damping: 16, stiffness: 180 },
    });

  const imgBoxH = height * 0.42;
  const imgBoxW = width * 0.7;
  const imgBoxTop = height * 0.22;
  const imgBoxLeft = (width - imgBoxW) / 2;

  return (
    <AbsoluteFill style={{ opacity: sceneT }}>
      {/* Eyebrow */}
      <div
        style={{
          position: "absolute",
          top: height * 0.08,
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
            fontSize: 22,
            color: FT.red,
            letterSpacing: 6,
            fontWeight: 600,
            textTransform: "uppercase",
            padding: "8px 22px",
            border: `1px solid ${FT.red}`,
            borderRadius: 2,
          }}
        >
          {eyebrow}
        </div>
      </div>

      {/* Heading centered */}
      <div
        style={{
          position: "absolute",
          top: height * 0.115,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <FTHeadingReveal
          text={headline}
          from={25}
          fontSize={108}
          align="center"
          underlineWidthFactor={0.4}
        />
      </div>

      {/* Tagline */}
      <div
        style={{
          position: "absolute",
          top: height * 0.175,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: taglineT,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 28,
            color: "rgba(255, 255, 255, 0.72)",
            fontWeight: 500,
            textAlign: "center",
            maxWidth: width * 0.78,
            letterSpacing: 0.5,
          }}
        >
          {tagline}
        </div>
      </div>

      {/* Pulsing FT-red ring behind image */}
      <div
        style={{
          position: "absolute",
          top: imgBoxTop - 24,
          left: imgBoxLeft - 24,
          width: imgBoxW + 48,
          height: imgBoxH + 48,
          borderRadius: 8,
          border: `2px solid ${FT.red}`,
          opacity: 0.25 + 0.35 * pulse,
          boxShadow: `0 0 ${20 + 30 * pulse}px rgba(237, 28, 36, ${0.18 + 0.18 * pulse})`,
        }}
      />

      {/* Image box */}
      <div
        style={{
          position: "absolute",
          top: imgBoxTop,
          left: imgBoxLeft,
          width: imgBoxW,
          height: imgBoxH,
          overflow: "hidden",
          borderRadius: 4,
          background: FT.inkDeep,
          opacity: imgT,
        }}
      >
        {imageUrl ? (
          <Img
            src={imageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: `scale(${imgScale})`,
              transformOrigin: "center",
            }}
          />
        ) : (
          <HDFIFallback />
        )}
        <FTBlueprintFrame from={90} inset={18} arm={50} stroke={2.5} />
      </div>

      {/* 3 USP bullets */}
      <div
        style={{
          position: "absolute",
          top: imgBoxTop + imgBoxH + 50,
          left: width * 0.08,
          right: width * 0.08,
          display: "flex",
          flexDirection: "column",
          gap: 16,
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
                gap: 18,
                opacity: t,
                transform: `translateX(${(1 - t) * 24}px)`,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  background: FT.red,
                  flexShrink: 0,
                  boxShadow: `0 0 12px ${FT.red}aa`,
                }}
              />
              <div
                style={{
                  fontFamily: SANS_FONT,
                  fontSize: 30,
                  color: FT.white,
                  fontWeight: 600,
                  letterSpacing: 0.3,
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

/** HDFI cross-section stylized fallback */
const HDFIFallback: React.FC = () => (
  <AbsoluteFill
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `radial-gradient(ellipse at center, rgba(237, 28, 36, 0.10), transparent 70%), ${FT.inkDeep}`,
    }}
  >
    <svg width="70%" height="70%" viewBox="0 0 200 120">
      {/* Top red layer */}
      <rect x={10} y={20} width={180} height={14} fill={FT.red} opacity={0.85} />
      {/* White contrast */}
      <rect x={10} y={34} width={180} height={5} fill="#fff" opacity={0.7} />
      {/* Black foam */}
      <rect x={10} y={39} width={180} height={56} fill="#000" />
      {/* Tool silhouette cutouts (just darker rects) */}
      <rect x={20} y={48} width={60} height={20} fill="#1a1a1a" rx={2} />
      <rect x={90} y={48} width={45} height={20} fill="#1a1a1a" rx={2} />
      <rect x={145} y={48} width={40} height={20} fill="#1a1a1a" rx={2} />
      <rect x={20} y={75} width={80} height={12} fill="#1a1a1a" rx={2} />
      <rect x={110} y={75} width={75} height={12} fill="#1a1a1a" rx={2} />
      {/* Label */}
      <text
        x={100}
        y={110}
        fill="rgba(255, 255, 255, 0.4)"
        fontSize={6}
        textAnchor="middle"
        fontFamily="monospace"
        letterSpacing={2}
      >
        HDFI · CAD-TEGNET · CNC-MASKINERT
      </text>
    </svg>
  </AbsoluteFill>
);
