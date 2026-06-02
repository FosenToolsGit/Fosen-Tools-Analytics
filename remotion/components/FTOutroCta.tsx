// FTOutroCta — closes every composition. White wordmark on FT-ink bg,
// FT-rød underline, tagline + URL below, capped with an impact-movie
// stinger SFX and a light-leak-warm flourish.
//
// Sized for a Sequence with `from` set to the outro start. Component
// counts from its own first frame (sequence-local).

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  Video,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { FT, MONO_FONT, SANS_FONT } from "../theme";
import { FT_BRAND_MARK, OUTRO_CHIME_VOLUME } from "../ft-pipeline";
import { sfx } from "../audio-registry";
import { transition } from "../transition-registry";

export const FTOutroCta: React.FC<{
  /** Tagline above URL — keep short. */
  tagline?: string;
  /** URL shown below tagline. */
  url?: string;
  /** Skip the impact-movie stinger. */
  silent?: boolean;
  /** Skip the light-leak overlay. */
  noLeak?: boolean;
}> = ({
  tagline = "Skreddersydd på Brekstad",
  url = "fosen-tools.no",
  silent = false,
  noLeak = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Wordmark snaps in 0-12, underline draws 8-28, text fades 18-32.
  const wordmarkT = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 160 },
  });
  const underlineT = interpolate(frame, [8, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textT = interpolate(frame, [18, 32], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo-spec fra FT_BRAND_MARK — autoritativ kilde. Aldri overstyrt.
  const wmWidth = FT_BRAND_MARK.widthFor(width);
  const wmHeight = FT_BRAND_MARK.heightFor(width);
  const underlineWidth =
    wmWidth * FT_BRAND_MARK.accentStripe.widthFactor * underlineT;

  return (
    <AbsoluteFill style={{ background: FT.ink }}>
      {/* Subtle vignette so the wordmark pops */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.55) 100%)",
          opacity: 0.6,
        }}
      />

      {/* Light-leak flourish */}
      {!noLeak && (
        <Sequence from={0} durationInFrames={42}>
          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              pointerEvents: "none",
            }}
          >
            <Video
              src={transition("light-leak-warm")}
              startFrom={0}
              endAt={42}
              volume={0}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </AbsoluteFill>
        </Sequence>
      )}

      {/* Stinger SFX */}
      {!silent && <Audio src={sfx("impact-movie")} volume={OUTRO_CHIME_VOLUME} />}

      {/* FT-merket — rød-bakgrunn-logo (default per FT brand-policy
          1. juni 2026). 5:1 aspekt. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: height / 2 - wmHeight / 2 - 20,
          display: "flex",
          justifyContent: "center",
          opacity: wordmarkT,
          transform: `scale(${0.94 + 0.06 * wordmarkT})`,
        }}
      >
        <Img
          src={staticFile(FT_BRAND_MARK.src)}
          style={{
            width: wmWidth,
            height: wmHeight,
            objectFit: "contain",
            boxShadow: FT_BRAND_MARK.boxShadow,
          }}
        />
      </div>

      {/* Hvit aksent-stripe under merket. */}
      <div
        style={{
          position: "absolute",
          left: width / 2 - underlineWidth / 2,
          top: height / 2 + wmHeight / 2 + FT_BRAND_MARK.marginBelow,
          width: underlineWidth,
          height: FT_BRAND_MARK.accentStripe.height,
          background: FT_BRAND_MARK.accentStripe.color,
          opacity: FT_BRAND_MARK.accentStripe.opacity,
        }}
      />

      {/* Tagline + URL */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: height / 2 + wmHeight / 2 + 60,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          opacity: textT,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 30,
            color: "rgba(255, 255, 255, 0.78)",
            letterSpacing: 1,
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          {tagline}
        </div>
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 26,
            color: FT.red,
            letterSpacing: 4,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          → {url}
        </div>
      </div>
    </AbsoluteFill>
  );
};
