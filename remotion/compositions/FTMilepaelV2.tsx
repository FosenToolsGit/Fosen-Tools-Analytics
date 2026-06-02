// FTMilepaelV2 — stor count-up. For 25 år, 100 år, 1000 kunder,
// 40 leverandører, etc. Bygd rundt en Riser Slow som bygger fra Scene 2-
// start til count-up-climax, og en Impact Close som lander når tallet
// treffer sin endelige verdi.
//
//   0-90    Scene 1: FTLoadingScreen
//   75-99   FTTransition (wipe-up + Whoosh Sweep) — vertikal "fremover"
//   90-450  Scene 2: Eyebrow + COUNT-UP-tall (0 → value over 90 frames)
//           + "unit" rett ved tallet, deretter H1 + body-lines staggered.
//           Riser Slow under hele bygg-fasen, Impact Close på climax.
//   435-465 FTTransition (light-leak-middle + Impact Close)
//   450-600 Scene 3: FTOutroCta

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { AmbientLayer } from "../components/AmbientLayer";
import { FTHeadingReveal } from "../components/FTHeadingReveal";
import { FTHook } from "../components/hooks/FTHook";
import { FTOutroCta } from "../components/FTOutroCta";
import { FTTransition } from "../components/FTTransition";
import { MUSIC_BED_VOLUME } from "../ft-pipeline";
import { musicBed, sfx, sfxVolume } from "../audio-registry";
import { FT, MONO_FONT, SANS_FONT } from "../theme";
import type { FTMilepaelV2Props } from "../types";

const LOADING_END = 90;
const COUNT_START = 110; // frames inn i full komposisjon
const COUNT_END = 220;
const SCENE_2_END = 450;
const OUTRO_START = 450;

export const FTMilepaelV2: React.FC<FTMilepaelV2Props> = ({
  eyebrow,
  value,
  unit,
  headline,
  body,
  tagline,
  hook = "stat-shock",
}) => {
  return (
    <AbsoluteFill>
      <Audio src={musicBed()} volume={MUSIC_BED_VOLUME} />
      <AmbientLayer variant="ink" />

      {/* Riser builds under count-up */}
      <Sequence from={COUNT_START - 20} durationInFrames={140}>
        <Audio src={sfx("riser-slow")} volume={sfxVolume("riser-slow")} />
      </Sequence>

      {/* Impact lands when count-up finishes */}
      <Sequence from={COUNT_END}>
        <Audio src={sfx("impact-close")} volume={sfxVolume("impact-close")} />
      </Sequence>

      {/* Scene 1 — åpnings-hook (default: stat-shock = stort tall) */}
      <Sequence from={0} durationInFrames={LOADING_END}>
        <FTHook
          kind={hook}
          eyebrow={eyebrow}
          primaryText={String(value)}
          secondaryText={unit}
          tagline={tagline ?? "Fosen Tools"}
        />
      </Sequence>

      <FTTransition from={75} kind="wipe-up" />

      {/* Scene 2 */}
      <Sequence
        from={LOADING_END - 5}
        durationInFrames={SCENE_2_END - LOADING_END + 5}
      >
        <MilepaelScene2
          eyebrow={eyebrow}
          value={value}
          unit={unit}
          headline={headline}
          body={body}
        />
      </Sequence>

      <FTTransition from={OUTRO_START - 15} kind="light-leak-middle" />

      {/* Scene 3 */}
      <Sequence from={OUTRO_START} durationInFrames={150}>
        <FTOutroCta tagline={tagline ?? "Fosen Tools"} />
      </Sequence>
    </AbsoluteFill>
  );
};

const MilepaelScene2: React.FC<{
  eyebrow: string;
  value: number;
  unit: string;
  headline: string;
  body: string[];
}> = ({ eyebrow, value, unit, headline, body }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const sceneT = interpolate(frame, [0, 4], [0, 1], {
    extrapolateRight: "clamp",
  });
  const eyebrowT = interpolate(frame, [12, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Local count-up frame (counting from when Scene 2 was loaded)
  const countStartLocal = COUNT_START - LOADING_END + 5;
  const countEndLocal = COUNT_END - LOADING_END + 5;
  const countProgress = interpolate(
    frame,
    [countStartLocal, countEndLocal],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  // Ease-out cubic — ends slower than starts
  const eased = 1 - Math.pow(1 - countProgress, 3);
  const displayed = Math.round(value * eased);

  // Climax pop — value snaps to final 1.04x scale at end of count
  const pop = spring({
    frame: frame - countEndLocal,
    fps,
    config: { damping: 8, stiffness: 240 },
  });
  const numScale = 1 + 0.04 * Math.max(0, Math.min(1, pop));

  // Unit text appears at count-end
  const unitT = interpolate(frame, [countEndLocal, countEndLocal + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Headline + body appear after count climax
  const headT = countEndLocal + 24;
  const bodyT = (i: number) =>
    spring({
      frame: frame - (countEndLocal + 50 + i * 12),
      fps,
      config: { damping: 16, stiffness: 200 },
    });

  return (
    <AbsoluteFill style={{ opacity: sceneT }}>
      {/* Eyebrow */}
      <div
        style={{
          position: "absolute",
          top: height * 0.13,
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

      {/* The big number + unit */}
      <div
        style={{
          position: "absolute",
          top: height * 0.2,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 32,
          transform: `scale(${numScale})`,
          transformOrigin: "center",
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 360,
            fontWeight: 800,
            color: FT.white,
            lineHeight: 0.9,
            letterSpacing: -8,
            textShadow: `0 0 60px rgba(237, 28, 36, 0.32)`,
          }}
        >
          {displayed}
        </div>
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 80,
            fontWeight: 600,
            color: FT.red,
            opacity: unitT,
            letterSpacing: 1,
            textTransform: "lowercase",
          }}
        >
          {unit}
        </div>
      </div>

      {/* Headline */}
      <div
        style={{
          position: "absolute",
          top: height * 0.55,
          left: width * 0.08,
          right: width * 0.08,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <FTHeadingReveal
          text={headline}
          from={headT}
          fontSize={52}
          align="center"
          maxWidth={width * 0.8}
          underlineWidthFactor={0.4}
        />
      </div>

      {/* Body lines */}
      <div
        style={{
          position: "absolute",
          top: height * 0.72,
          left: width * 0.12,
          right: width * 0.12,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          alignItems: "center",
        }}
      >
        {body.slice(0, 3).map((line, i) => {
          const t = bodyT(i);
          return (
            <div
              key={i}
              style={{
                fontFamily: SANS_FONT,
                fontSize: 26,
                color: "rgba(255, 255, 255, 0.78)",
                fontWeight: 500,
                lineHeight: 1.4,
                textAlign: "center",
                opacity: t,
                transform: `translateY(${(1 - t) * 12}px)`,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
