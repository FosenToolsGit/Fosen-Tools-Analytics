// AudioTrack — wrapper rundt Remotion's <Audio>-komponent som legger på
// fade-in / fade-out via volume-callback. Brukes for bakgrunns-musikk
// eller voice-over i komposisjonene.
//
// All audio er valgfri — komponentene må kunne renderes uten lyd også
// (kall ikke AudioTrack hvis `src` er null/tom).

import React from "react";
import { Audio, interpolate, staticFile } from "remotion";

export type AudioTrackProps = {
  /** Absolutt URL eller path relativ til public/ (uten ledende `/`).
   *  Hvis path starter med `/social/...` bruker vi staticFile direkte. */
  src: string;
  /** 0-1, baseline volum. Default 0.6. */
  volume?: number;
  /** Frame der lyden skal starte å spille (relativt til Sequence). */
  startFrame?: number;
  /** Frame der lyden skal stoppe. */
  endFrame?: number;
  /** Fade inn over første 10 frames. Default true. */
  fadeIn?: boolean;
  /** Fade ut over siste 10 frames før endFrame. Default true. */
  fadeOut?: boolean;
};

const FADE_FRAMES = 10;

/** Volum-callback som Remotion kaller per frame. */
function makeVolume(
  base: number,
  startFrame: number,
  endFrame: number | undefined,
  fadeIn: boolean,
  fadeOut: boolean,
): (frame: number) => number {
  return (frame: number) => {
    // Stille før vi har startet, og etter at vi har endt.
    if (frame < startFrame) return 0;
    if (endFrame !== undefined && frame > endFrame) return 0;

    let vol = base;

    if (fadeIn) {
      const inEnd = startFrame + FADE_FRAMES;
      const fIn = interpolate(frame, [startFrame, inEnd], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      vol = vol * fIn;
    }

    if (fadeOut && endFrame !== undefined) {
      const outStart = endFrame - FADE_FRAMES;
      const fOut = interpolate(frame, [outStart, endFrame], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      vol = vol * fOut;
    }

    return vol;
  };
}

/** Normaliser src — hvis det starter med `/` antar vi public-path. */
function resolveSrc(src: string): string {
  if (/^https?:\/\//.test(src)) return src;
  // staticFile håndterer både `social/...` og `/social/...`-form.
  const trimmed = src.replace(/^\/+/, "");
  return staticFile(trimmed);
}

/**
 * AudioTrack — fade-aktiv lyd-wrapper. Bruk inni en `<Sequence>` slik
 * at start/end er relativt til sequence-en sin egen tidslinje.
 *
 *   <Sequence from={0} durationInFrames={300}>
 *     <AudioTrack src="/social/sfx/whoosh-cinematic.wav" volume={0.5} />
 *   </Sequence>
 */
export const AudioTrack: React.FC<AudioTrackProps> = ({
  src,
  volume = 0.6,
  startFrame = 0,
  endFrame,
  fadeIn = true,
  fadeOut = true,
}) => {
  if (!src) return null;
  const resolved = resolveSrc(src);
  const volCb = makeVolume(volume, startFrame, endFrame, fadeIn, fadeOut);
  return <Audio src={resolved} volume={volCb} />;
};
