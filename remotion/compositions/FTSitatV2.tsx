// FTSitatV2 — kundesitat. Bruker FTSpriteDisk (2-bokstavs-monogram på
// brushed-steel + FT-rød ring) når vi ikke har faktisk portrett — slik
// at vi kan dele sitater fra logistikkansvarlig hos Norwegian Aero
// uten å ha bilde av personen.
//
//   0-90    Scene 1: FTLoadingScreen
//   75-99   FTTransition (wipe-warm + Whoosh Sweep)
//   90-450  Scene 2: Stort " " glyph, sitat-tekst, sprite-disk +
//           navn/rolle/firma. Subtil rød pulse rundt disken.
//   435-465 FTTransition (wipe-open-blur + Soft Sweep)
//   450-600 Scene 3: FTOutroCta

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
import { FTOutroCta } from "../components/FTOutroCta";
import { FTSpriteDisk } from "../components/FTSpriteDisk";
import { FTTransition } from "../components/FTTransition";
import { MUSIC_BED_VOLUME } from "../ft-pipeline";
import { musicBed } from "../audio-registry";
import { FT, MONO_FONT, SANS_FONT } from "../theme";
import type { FTSitatV2Props } from "../types";

const LOADING_END = 90;
const SCENE_2_END = 450;
const OUTRO_START = 450;

export const FTSitatV2: React.FC<FTSitatV2Props> = ({
  quote,
  attributedTo,
  role,
  company,
  portraitUrl,
  tagline,
  hook = "visual-reveal",
}) => {
  return (
    <AbsoluteFill>
      <Audio src={musicBed()} volume={MUSIC_BED_VOLUME} />
      <AmbientLayer variant="ink" />

      <Sequence from={0} durationInFrames={LOADING_END}>
        <FTHook
          kind={hook}
          imageUrl={portraitUrl ?? null}
          eyebrow={company.toUpperCase()}
          primaryText={`«${quote.slice(0, 80)}${quote.length > 80 ? "…" : ""}»`}
          secondaryText="KUNDE-SITAT"
          tagline={tagline ?? "Verktøykontroll for fagfolk"}
        />
      </Sequence>

      <FTTransition from={75} kind="wipe-warm" />

      <Sequence
        from={LOADING_END - 5}
        durationInFrames={SCENE_2_END - LOADING_END + 5}
      >
        <SitatScene2
          quote={quote}
          attributedTo={attributedTo}
          role={role}
          company={company}
          portraitUrl={portraitUrl ?? null}
        />
      </Sequence>

      <FTTransition from={OUTRO_START - 15} kind="wipe-open-blur" />

      <Sequence from={OUTRO_START} durationInFrames={150}>
        <FTOutroCta tagline={tagline ?? "Verktøykontroll for fagfolk"} />
      </Sequence>
    </AbsoluteFill>
  );
};

const SitatScene2: React.FC<{
  quote: string;
  attributedTo: string;
  role: string;
  company: string;
  portraitUrl: string | null;
}> = ({ quote, attributedTo, role, company, portraitUrl }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const sceneT = interpolate(frame, [0, 4], [0, 1], {
    extrapolateRight: "clamp",
  });
  const glyphT = interpolate(frame, [16, 36], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const quoteT = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const diskSpring = spring({
    frame: frame - 130,
    fps,
    config: { damping: 16, stiffness: 180 },
  });
  const attT = interpolate(frame, [160, 190], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Disk pulse
  const pulse = 0.6 + 0.4 * Math.sin((frame - 130) * 0.07);

  return (
    <AbsoluteFill style={{ opacity: sceneT }}>
      {/* Giant opening quote-mark */}
      <div
        style={{
          position: "absolute",
          top: height * 0.07,
          left: width * 0.08,
          fontFamily: SANS_FONT,
          fontSize: 320,
          color: FT.red,
          fontWeight: 800,
          lineHeight: 0.7,
          opacity: glyphT * 0.5,
          letterSpacing: -10,
        }}
      >
        “
      </div>

      {/* The quote */}
      <div
        style={{
          position: "absolute",
          top: height * 0.22,
          left: width * 0.1,
          right: width * 0.1,
          opacity: quoteT,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 46,
            color: FT.white,
            fontWeight: 500,
            lineHeight: 1.3,
            letterSpacing: 0.2,
          }}
        >
          {quote}
        </div>
      </div>

      {/* Sprite disk + attribution */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.14,
          left: width * 0.1,
          right: width * 0.1,
          display: "flex",
          alignItems: "center",
          gap: 28,
          opacity: diskSpring,
          transform: `translateY(${(1 - diskSpring) * 16}px)`,
        }}
      >
        {/* Disk with pulse glow */}
        <div
          style={{
            position: "relative",
            width: 200,
            height: 200,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -20,
              borderRadius: "50%",
              background: `radial-gradient(circle at center, rgba(237, 28, 36, ${0.25 * pulse}), transparent 70%)`,
              filter: "blur(12px)",
            }}
          />
          {portraitUrl ? (
            <div
              style={{
                width: 200,
                height: 200,
                borderRadius: "50%",
                overflow: "hidden",
                border: `3px solid ${FT.red}`,
                boxShadow: `0 0 24px rgba(237, 28, 36, ${0.3 + 0.2 * pulse})`,
              }}
            >
              <Img
                src={portraitUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          ) : (
            <FTSpriteDisk name={attributedTo} size={200} />
          )}
        </div>

        {/* Name + role + company */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            opacity: attT,
          }}
        >
          <div
            style={{
              fontFamily: SANS_FONT,
              fontSize: 36,
              color: FT.white,
              fontWeight: 700,
              letterSpacing: 0.2,
            }}
          >
            {attributedTo}
          </div>
          <div
            style={{
              fontFamily: SANS_FONT,
              fontSize: 22,
              color: "rgba(255, 255, 255, 0.62)",
              fontWeight: 500,
            }}
          >
            {role}
          </div>
          <div
            style={{
              fontFamily: MONO_FONT,
              fontSize: 18,
              color: FT.red,
              letterSpacing: 4,
              fontWeight: 600,
              textTransform: "uppercase",
              marginTop: 4,
            }}
          >
            {company}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
