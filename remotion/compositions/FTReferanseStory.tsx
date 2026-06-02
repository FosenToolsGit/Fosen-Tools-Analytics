// FTReferanseStory — kundereferanse / leveranse-storytelling, "Levert
// til X"-formatet. Bygger på 4-scene-malen:
//
//   0-90    Scene 1: FTLoadingScreen (brand cold-open)
//   75-95   FTTransition (wipe-warm + Whoosh Sweep)
//   90-450  Scene 2: Eyebrow + H1 (med 70px-underline) + bilde i
//           blueprint-frame + 3 tag-chips + FTBannerCard på climax
//   435-465 FTTransition (wipe-open-blur + Soft Sweep)
//   450-600 Scene 3: FTOutroCta
//
// 600 frames @ 30fps = 20 sek. Multi-aspect via DIMENSIONS-mapper i
// Root.tsx.

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
import { FTHook } from "../components/hooks/FTHook";
import { FTOutroCta } from "../components/FTOutroCta";
import { FTTransition } from "../components/FTTransition";
import { MUSIC_BED_VOLUME } from "../ft-pipeline";
import { musicBed, sfx, sfxVolume } from "../audio-registry";
import { FT, MONO_FONT } from "../theme";
import type { FTReferanseStoryProps } from "../types";

const LOADING_END = 90;
const SCENE_2_START = 75;
const SCENE_2_END = 450;
const OUTRO_START = 450;

export const FTReferanseStory: React.FC<FTReferanseStoryProps> = ({
  eyebrow,
  headline,
  imageUrls,
  imageUrl,
  tags,
  bannerHeadline,
  bannerSubline,
  tagline,
  hook = "eyebrow-slam",
  customerLogoUrl,
}) => {
  // Bakoverkompat: hvis kaller fortsatt sender imageUrl (string), wrap til array
  const images: string[] = (imageUrls && imageUrls.length > 0)
    ? imageUrls
    : imageUrl ? [imageUrl] : [];

  // Split eyebrow for Hook B — "Levert til X" → eyebrow "LEVERT TIL"
  // + primary "X". Hvis ikke matching pattern, send hele eyebrow som
  // primaryText med "LEVERT" som default eyebrow-text.
  const m = eyebrow.match(/^([^A-ZÆØÅa-zæøå0-9]*)([A-ZÆØÅa-zæøå\s]+?)\s+(.+)$/);
  const hookEyebrow = m ? `${m[2]?.trim()}` : "Levert til";
  const hookPrimary = m ? m[3] : eyebrow;

  return (
    <AbsoluteFill>
      {/* Music bed runs through everything */}
      <Audio src={musicBed()} volume={MUSIC_BED_VOLUME} />

      {/* Always-on ambient backdrop (blueprint grid + dust) */}
      <AmbientLayer variant="ink" />

      {/* Scene 1 — åpnings-hook (default: eyebrow-slam = "LEVERT TIL X").
          Hvis customerLogoUrl er satt, vises logo i stedet for tekst-navn. */}
      <Sequence from={0} durationInFrames={LOADING_END}>
        <FTHook
          kind={hook}
          eyebrow={hookEyebrow}
          primaryText={hookPrimary?.toUpperCase()}
          logoUrl={customerLogoUrl ?? undefined}
          tagline={tagline ?? "Skreddersydd på Brekstad"}
          imageUrl={images[0] ?? null}
        />
      </Sequence>

      {/* Scene 1 → Scene 2 transition (warm wipe) */}
      <FTTransition from={SCENE_2_START} kind="wipe-warm" />

      {/* Scene 2 — leveranse story */}
      <Sequence
        from={LOADING_END - 5}
        durationInFrames={SCENE_2_END - LOADING_END + 5}
      >
        <ReferanseScene2
          eyebrow={eyebrow}
          headline={headline}
          images={images}
          tags={tags}
        />
      </Sequence>

      {/* Banner card lands ~3 sec into Scene 2 */}
      {bannerHeadline && (
        <FTBannerCard
          headline={bannerHeadline}
          subline={bannerSubline}
          from={LOADING_END + 80}
          durationInFrames={150}
        />
      )}

      {/* Soft-sweep SFX ved hvert bildeskift i karusellen.
          Carousel-koden definerer slots fra frame 40 i Scene 2 til
          frame 360. Vi ligger sweep-en 5 frames før hvert nye bilde
          (i = 1,2,3...) så den lander akkurat i overgang. */}
      {images.length > 1 &&
        Array.from({ length: images.length - 1 }, (_, idx) => {
          const i = idx + 1;
          const slotStart = 40 + i * ((360 - 40) / images.length);
          const sfxAt = LOADING_END - 5 + Math.round(slotStart) - 8;
          return (
            <Sequence key={`sweep-${i}`} from={sfxAt} durationInFrames={2}>
              <Audio
                src={sfx("soft-sweep")}
                volume={sfxVolume("soft-sweep") * 0.5}
              />
            </Sequence>
          );
        })}

      {/* Scene 2 → outro transition */}
      <FTTransition from={OUTRO_START - 15} kind="wipe-open-blur" />

      {/* Scene 3 — outro */}
      <Sequence from={OUTRO_START} durationInFrames={150}>
        <FTOutroCta tagline={tagline ?? "Skreddersydd på Brekstad"} />
      </Sequence>
    </AbsoluteFill>
  );
};

const ReferanseScene2: React.FC<{
  eyebrow: string;
  headline: string;
  images: string[];
  tags: string[];
}> = ({ eyebrow, headline, images, tags }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Snap-in (NEVER spring at scene boundary).
  const sceneT = interpolate(frame, [0, 4], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Scene 2 starter på frame 0 (lokalt). Image fader inn 12-40 og
  // får så individual cross-fade-bytter etterpå.
  const imgInT = interpolate(frame, [12, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Eyebrow + Heading sequenced.
  const eyebrowT = interpolate(frame, [30, 52], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tag chips stagger in starting at frame 80, 6 frames apart.
  const tagSpring = (i: number) =>
    spring({
      frame: frame - (80 + i * 6),
      fps,
      config: { damping: 14, stiffness: 200 },
    });

  // Image dimensions — centered, roughly 76% of canvas height for reel,
  // but limited to leave room for headline above + chips below.
  const imageBoxH = height * 0.55;
  const imageBoxW = width * 0.88;
  const imageBoxTop = height * 0.32;
  const imageBoxLeft = (width - imageBoxW) / 2;

  return (
    <AbsoluteFill style={{ opacity: sceneT }}>
      {/* Eyebrow at top */}
      <div
        style={{
          position: "absolute",
          top: height * 0.13,
          left: width * 0.075,
          right: width * 0.075,
          opacity: eyebrowT,
          transform: `translateY(${(1 - eyebrowT) * 8}px)`,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 24,
            color: FT.red,
            letterSpacing: 5,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>
      </div>

      {/* Heading with FT red underline */}
      <div
        style={{
          position: "absolute",
          top: height * 0.17,
          left: width * 0.075,
        }}
      >
        <FTHeadingReveal
          text={headline}
          from={40}
          fontSize={72}
          maxWidth={width * 0.85}
          underlineWidthFactor={0.55}
        />
      </div>

      {/* Image carousel — cycler gjennom bildene med cross-fade og
          Ken Burns. Hvert bilde har egen pan-retning (4 varianter)
          slik at karusellen ikke kjenner monoton selv på 3-4 bilder. */}
      <div
        style={{
          position: "absolute",
          top: imageBoxTop,
          left: imageBoxLeft,
          width: imageBoxW,
          height: imageBoxH,
          overflow: "hidden",
          borderRadius: 6,
          opacity: imgInT,
          background: FT.inkDeep,
        }}
      >
        {images.length > 0 ? (
          <ImageCarousel
            images={images}
            startFrame={40}
            endFrame={360}
            width={imageBoxW}
            height={imageBoxH}
          />
        ) : (
          <BlueprintFallback width={imageBoxW} height={imageBoxH} />
        )}
        {/* Blueprint frame brackets */}
        <FTBlueprintFrame
          from={50}
          inset={20}
          arm={64}
          stroke={3}
          color={FT.red}
        />
      </div>

      {/* Tag chips at bottom-right of image, stagger in */}
      <div
        style={{
          position: "absolute",
          left: imageBoxLeft,
          top: imageBoxTop + imageBoxH + 36,
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        {tags.slice(0, 4).map((tag, i) => {
          const t = tagSpring(i);
          return (
            <div
              key={tag}
              style={{
                padding: "10px 20px",
                borderRadius: 2,
                background: `rgba(237, 28, 36, 0.12)`,
                border: `1px solid ${FT.red}`,
                fontFamily: MONO_FONT,
                fontSize: 18,
                color: FT.white,
                letterSpacing: 3,
                fontWeight: 600,
                textTransform: "uppercase",
                opacity: t,
                transform: `translateY(${(1 - t) * 10}px)`,
              }}
            >
              {tag}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/**
 * ImageCarousel — viser flere bilder med cross-fade-bytter og
 * subtle Ken Burns på hvert bilde. Hver "slot" varer like lenge
 * (totalt span delt på antall bilder) med 12-frame fade-overlapp
 * mellom hvert.
 *
 * Pan-retning roterer mellom 4 varianter (center, top-left, bottom-right,
 * top-right) så feeden ikke kjenner monoton selv på 3-4 bilder.
 */
const ImageCarousel: React.FC<{
  images: string[];
  startFrame: number;
  endFrame: number;
  width: number;
  height: number;
}> = ({ images, startFrame, endFrame, width: _w, height: _h }) => {
  const frame = useCurrentFrame();
  const span = endFrame - startFrame;
  const slot = span / images.length;
  const overlap = 14; // frames cross-fade

  const panOrigins = [
    "center",
    "top left",
    "bottom right",
    "top right",
    "bottom left",
    "center",
  ];

  return (
    <>
      {images.map((src, i) => {
        const slotStart = startFrame + i * slot;
        const slotEnd = slotStart + slot;

        // Opacity: cross-fade i de første 14 frames, cross-fade ut de siste 14
        const fadeIn = interpolate(
          frame,
          [slotStart - overlap, slotStart + overlap],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const fadeOut = interpolate(
          frame,
          [slotEnd - overlap, slotEnd + overlap],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        // Første bilde: ingen fade-in fra negativ side
        const isFirst = i === 0;
        const isLast = i === images.length - 1;
        const opacity =
          (isFirst ? 1 : fadeIn) * (isLast ? 1 : fadeOut);

        // Ken Burns per bilde — fra 1.0 til 1.06 over slot-en
        const kenBurns = interpolate(
          frame,
          [slotStart - overlap, slotEnd + overlap],
          [1.0, 1.06],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        const origin = panOrigins[i % panOrigins.length] ?? "center";

        return (
          <Img
            key={`${src}-${i}`}
            src={src}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              opacity,
              transform: `scale(${kenBurns})`,
              transformOrigin: origin,
            }}
          />
        );
      })}
    </>
  );
};

/** Fallback when no imageUrl supplied — blueprint cross-section. */
const BlueprintFallback: React.FC<{ width: number; height: number }> = ({
  width,
  height,
}) => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, rgba(237, 28, 36, 0.10), transparent 65%), ${FT.inkDeep}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={width * 0.6} height={height * 0.55} viewBox="0 0 100 100">
        {/* Stylized HDFI cross-section */}
        <rect
          x={5}
          y={20}
          width={90}
          height={70}
          fill="none"
          stroke={FT.red}
          strokeWidth={0.6}
          strokeDasharray="3 2"
        />
        <rect x={5} y={20} width={90} height={6} fill={FT.red} opacity={0.4} />
        <text
          x={50}
          y={60}
          fill="rgba(255, 255, 255, 0.55)"
          fontSize={6}
          textAnchor="middle"
          fontFamily="monospace"
          letterSpacing={1.5}
        >
          HDFI
        </text>
        <text
          x={50}
          y={68}
          fill="rgba(255, 255, 255, 0.3)"
          fontSize={3.5}
          textAnchor="middle"
          fontFamily="monospace"
          letterSpacing={1}
        >
          CAD-TEGNET · CNC-MASKINERT
        </text>
      </svg>
    </AbsoluteFill>
  );
};
