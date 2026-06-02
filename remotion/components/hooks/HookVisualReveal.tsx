// HookVisualReveal — bildet kommer fra mørkt med en varm light-leak.
// Ingen tekst først, bare visuell anchoring.
//
// Bruksområder: sterke leveranse-bilder, kunde-portretter, sitater
// der bildet skal snakke før ordene kommer.

import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  Video,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { FT, MONO_FONT } from "../../theme";
import { transition } from "../../transition-registry";
import type { HookProps } from "./types";

export const HookVisualReveal: React.FC<HookProps> = ({
  primaryText,
  secondaryText,
  imageUrl,
  durationInFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  if (frame >= durationInFrames) return null;

  // Image fader inn fra svart 0-40
  const imgT = interpolate(frame, [0, 40], [0, 1], {
    extrapolateRight: "clamp",
  });
  // Subtle scale 1.08 → 1.0 (close-up → settle)
  const scale = interpolate(frame, [0, 50], [1.08, 1.0], {
    extrapolateRight: "clamp",
  });

  // Eventuell tekst-overlay fader inn etter 50
  const textT = interpolate(frame, [55, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit-fade 80-90
  const exit = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ background: FT.inkDeep, opacity: exit }}>
      {/* Bildet */}
      {imageUrl && (
        <AbsoluteFill style={{ opacity: imgT }}>
          <Img
            src={imageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${scale})`,
            }}
          />
          {/* Vignette så bildet sentreres visuelt */}
          <AbsoluteFill
            style={{
              background:
                "radial-gradient(ellipse 80% 80% at center, transparent 30%, rgba(0,0,0,0.65) 100%)",
            }}
          />
        </AbsoluteFill>
      )}

      {/* Warm light-leak ved scene-start (gir filmic feel) */}
      <Sequence from={4} durationInFrames={36}>
        <AbsoluteFill
          style={{
            mixBlendMode: "screen",
            pointerEvents: "none",
          }}
        >
          <Video
            src={transition("light-leak-warm")}
            startFrom={0}
            endAt={36}
            volume={0}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Valgfri eyebrow + primary tekst nederst */}
      {primaryText && (
        <div
          style={{
            position: "absolute",
            bottom: height * 0.1,
            left: width * 0.08,
            right: width * 0.08,
            opacity: textT,
            transform: `translateY(${(1 - textT) * 12}px)`,
          }}
        >
          {secondaryText && (
            <div
              style={{
                fontFamily: MONO_FONT,
                fontSize: 20,
                color: FT.red,
                letterSpacing: 6,
                fontWeight: 600,
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              {secondaryText}
            </div>
          )}
          <div
            style={{
              fontFamily: MONO_FONT,
              fontSize: 38,
              color: FT.white,
              fontWeight: 700,
              letterSpacing: 0.5,
              textShadow: "0 2px 12px rgba(0, 0, 0, 0.7)",
            }}
          >
            {primaryText}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};
