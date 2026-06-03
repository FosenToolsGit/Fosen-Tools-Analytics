// FTDefinisjonNeo — fagord-definisjon, MØRK versjon. Erstatter den
// gamle Definisjon-komposisjonen som hadde krem-bakgrunn + svart tekst
// (flat, kjedelig på SoMe-feed). Nå:
//
//   0-90    Scene 1: FTLoadingScreen (variant "ink-deep" for dramatisk åpning)
//   75-99   FTTransition (wipe-bw-up + Whoosh Cinematic) — hard kontrast
//   90-510  Scene 2: ORDBOK-eyebrow + STORT TERM med 70px rød underline,
//           ordklasse-italic, definisjon-blokk, etymologi, eksempel-quote.
//           Subtil rød radial-pulse rundt term. AmbientLayer aktiv.
//   495-525 FTTransition (wipe-open-blur + Soft Sweep)
//   510-600 Scene 3: FTOutroCta — kort, bare wordmark + tagline.

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { AmbientLayer } from "../components/AmbientLayer";
import { FTHeadingReveal } from "../components/FTHeadingReveal";
import { FTLoadingScreen } from "../components/FTLoadingScreen";
import { FTOutroCta } from "../components/FTOutroCta";
import { FTTransition } from "../components/FTTransition";
import { MUSIC_BED_VOLUME } from "../ft-pipeline";
import { musicBed } from "../audio-registry";
import { FT, MONO_FONT, SANS_FONT } from "../theme";
import type { FTDefinisjonNeoProps } from "../types";

const LOADING_END = 90;
const SCENE_2_END = 510;
const OUTRO_START = 510;

export const FTDefinisjonNeo: React.FC<FTDefinisjonNeoProps> = ({
  term,
  partOfSpeech,
  definition,
  etymology,
  example,
  ctaText,
  tagline,
  ctaUrl,
}) => {
  return (
    <AbsoluteFill>
      <AmbientLayer variant="ink-deep" intensity={0.7} />

      {/* Scene 1 — brand cold-open for HDFI/FOD-konsept */}
      <Sequence from={0} durationInFrames={LOADING_END}>
        <FTLoadingScreen
          eyebrow={`FT · ${term} forklart`}
          tagline={tagline ?? "Konsept-forklaring fra Brekstad"}
        />
      </Sequence>

      <FTTransition from={75} kind="wipe-bw-up" />

      {/* Scene 2 */}
      <Sequence
        from={LOADING_END - 5}
        durationInFrames={SCENE_2_END - LOADING_END + 5}
      >
        <DefinisjonScene2
          term={term}
          partOfSpeech={partOfSpeech}
          definition={definition}
          etymology={etymology}
          example={example}
          ctaText={ctaText}
        />
      </Sequence>

      <FTTransition from={OUTRO_START - 15} kind="wipe-open-blur" />

      <Sequence from={OUTRO_START} durationInFrames={120}>
        <FTOutroCta
          tagline={tagline ?? "Konsept-forklaring fra Brekstad"}
          url={ctaUrl ?? "fosen-tools.no/hdfi"}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

const DefinisjonScene2: React.FC<{
  term: string;
  partOfSpeech: string;
  definition: string;
  etymology?: string;
  example?: string;
  ctaText?: string;
}> = ({ term, partOfSpeech, definition, etymology, example, ctaText }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const sceneT = interpolate(frame, [0, 4], [0, 1], {
    extrapolateRight: "clamp",
  });
  const eyebrowT = interpolate(frame, [12, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const posT = interpolate(frame, [70, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const defT = interpolate(frame, [100, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const etyT = interpolate(frame, [160, 190], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exT = interpolate(frame, [230, 260], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Rød pulse-glow rundt termet — breathes every 90 frames
  const pulse = 0.5 + 0.5 * Math.sin((frame - 25) * 0.07);

  return (
    <AbsoluteFill style={{ opacity: sceneT }}>
      {/* "ORDBOK"-eyebrow */}
      <div
        style={{
          position: "absolute",
          top: height * 0.1,
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
            letterSpacing: 8,
            fontWeight: 600,
            textTransform: "uppercase",
            padding: "10px 28px",
            border: `1px solid ${FT.red}`,
            borderRadius: 2,
            background: "rgba(237, 28, 36, 0.08)",
          }}
        >
          FT · Ordbok
        </div>
      </div>

      {/* Rød pulse-glow bak termet */}
      <div
        style={{
          position: "absolute",
          left: width * 0.5 - 280,
          top: height * 0.22,
          width: 560,
          height: 220,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, rgba(237, 28, 36, ${0.18 + 0.14 * pulse}), transparent 70%)`,
          filter: "blur(20px)",
          pointerEvents: "none",
        }}
      />

      {/* TERM — det store ordet */}
      <div
        style={{
          position: "absolute",
          top: height * 0.18,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <FTHeadingReveal
          text={term}
          from={20}
          fontSize={148}
          align="center"
          letterSpacing="0.04em"
          underlineWidthFactor={0.38}
          underlineThickness={8}
        />
      </div>

      {/* Ordklasse (italic, dim) */}
      <div
        style={{
          position: "absolute",
          top: height * 0.36,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: posT,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 28,
            color: "rgba(255, 255, 255, 0.45)",
            fontStyle: "italic",
            fontWeight: 400,
            letterSpacing: 0.5,
          }}
        >
          /{partOfSpeech.toLowerCase()}/
        </div>
      </div>

      {/* Definisjon — kjerne-setning */}
      <div
        style={{
          position: "absolute",
          top: height * 0.42,
          left: width * 0.1,
          right: width * 0.1,
          opacity: defT,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 36,
            color: FT.white,
            fontWeight: 500,
            lineHeight: 1.35,
            textAlign: "center",
            letterSpacing: 0.2,
          }}
        >
          <span style={{ color: FT.red, marginRight: 12 }}>1.</span>
          {definition}
        </div>
      </div>

      {/* Etymologi */}
      {etymology && (
        <div
          style={{
            position: "absolute",
            top: height * 0.6,
            left: width * 0.12,
            right: width * 0.12,
            opacity: etyT,
          }}
        >
          <div
            style={{
              fontFamily: MONO_FONT,
              fontSize: 18,
              color: "rgba(255, 255, 255, 0.45)",
              letterSpacing: 3,
              textTransform: "uppercase",
              fontWeight: 500,
              marginBottom: 10,
              textAlign: "center",
            }}
          >
            ETYMOLOGI
          </div>
          <div
            style={{
              fontFamily: SANS_FONT,
              fontSize: 24,
              color: "rgba(255, 255, 255, 0.78)",
              lineHeight: 1.45,
              fontWeight: 400,
              textAlign: "center",
            }}
          >
            {etymology}
          </div>
        </div>
      )}

      {/* Eksempel */}
      {example && (
        <div
          style={{
            position: "absolute",
            top: height * 0.75,
            left: width * 0.1,
            right: width * 0.1,
            opacity: exT,
          }}
        >
          <div
            style={{
              fontFamily: SANS_FONT,
              fontSize: 22,
              color: FT.red,
              fontStyle: "italic",
              lineHeight: 1.5,
              fontWeight: 500,
              textAlign: "center",
              borderLeft: `3px solid ${FT.red}`,
              paddingLeft: 18,
              maxWidth: width * 0.7,
              margin: "0 auto",
            }}
          >
            {example}
          </div>
        </div>
      )}

      {/* CTA-knapp (salgs-orientert — refactor 2026-06-02) */}
      {ctaText && (
        <div
          style={{
            position: "absolute",
            bottom: height * 0.06,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            opacity: exT,
          }}
        >
          <div
            style={{
              fontFamily: SANS_FONT,
              fontSize: 26,
              color: FT.white,
              fontWeight: 700,
              letterSpacing: 0.5,
              padding: "16px 32px",
              background: FT.red,
              border: `2px solid ${FT.red}`,
              boxShadow: `0 14px 28px rgba(237, 28, 36, 0.4), 0 0 24px rgba(237, 28, 36, 0.3)`,
              textTransform: "uppercase",
            }}
          >
            {ctaText} →
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
