// FTTransition — drops a Four Editors light-wipe overlay (additive
// screen-blend) on top of the running scenes for a short window, and
// fires the matching SFX. Used at scene boundaries.
//
// IMPORTANT: must live OUTSIDE any <Sequence> because `from` here is a
// global frame number, not a sequence-local frame. The component
// subtracts `from` from useCurrentFrame() itself.
//
// Usage:
//   <FTTransition from={75} kind="wipe-warm" />          // 24-frame wipe
//   <FTTransition from={470} kind="light-leak-warm" />   // outro flourish
//
// Audio: by default plays TRANSITION_DEFAULT_SFX[kind]. Override via
// `sfx` prop. Set `silent` to skip audio entirely.

import React from "react";
import { AbsoluteFill, Audio, Sequence, Video } from "remotion";

import {
  TRANSITION_DEFAULT_SFX,
  TRANSITION_DURATION_FRAMES,
  transition,
  type Transition,
} from "../transition-registry";
import { sfx, sfxVolume, type Sfx } from "../audio-registry";

export const FTTransition: React.FC<{
  /** Global frame to start the transition on. */
  from: number;
  /** Which overlay to use. */
  kind: Transition;
  /** Override duration. Defaults to TRANSITION_DURATION_FRAMES[kind]. */
  durationInFrames?: number;
  /** Override SFX. Defaults to TRANSITION_DEFAULT_SFX[kind]. */
  sfx?: Sfx;
  /** Skip audio entirely. */
  silent?: boolean;
  /** Override volume (otherwise uses sfxVolume()). */
  volume?: number;
  /** Z-index for the overlay. */
  zIndex?: number;
}> = ({
  from,
  kind,
  durationInFrames = TRANSITION_DURATION_FRAMES[kind],
  sfx: sfxOverride,
  silent = false,
  volume,
  zIndex = 100,
}) => {
  const sfxHandle: Sfx = sfxOverride ?? TRANSITION_DEFAULT_SFX[kind];
  const vol = volume ?? sfxVolume(sfxHandle);

  return (
    <>
      {/* Visual overlay */}
      <Sequence from={from} durationInFrames={durationInFrames}>
        <AbsoluteFill
          style={{
            mixBlendMode: "screen",
            zIndex,
            pointerEvents: "none",
          }}
        >
          <Video
            src={transition(kind)}
            startFrom={0}
            endAt={durationInFrames}
            volume={0}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </AbsoluteFill>
      </Sequence>

      {/* SFX hits at the start of the transition */}
      {!silent && (
        <Sequence from={from}>
          <Audio src={sfx(sfxHandle)} volume={vol} />
        </Sequence>
      )}
    </>
  );
};
