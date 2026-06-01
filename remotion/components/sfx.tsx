// SFX-helpers — punktlige lyd-effekter som plasseres på bestemte frames
// i en komposisjon. Bruker filer i public/social/sfx/.
//
// Hver helper returnerer en kort <Audio>-komponent som starter på det
// gitte frame-et og fades ut ved slutten. Alle er rene presentasjon —
// kall dem fra Sequence-er i komposisjonene.

import React from "react";
import { Audio, interpolate, staticFile } from "remotion";

/** Hvor mange frames hver SFX-effekt varer (~0.5-0.8s @ 30fps). */
const DEFAULT_SFX_DURATION = 18;

type SfxProps = {
  /** Frame der lyden starter (relativt til Sequence). */
  frame: number;
  /** Antall frames effekten varer. Default 18 (~0.6s). */
  durationInFrames?: number;
  /** Baseline volum (0-1). Default 0.7. */
  volume?: number;
};

/** Lager en kort fade-out-volume-callback for SFX. */
function makeSfxVolume(
  base: number,
  startFrame: number,
  durationInFrames: number,
): (frame: number) => number {
  const endFrame = startFrame + durationInFrames;
  const fadeStart = startFrame + Math.floor(durationInFrames * 0.6);
  return (f: number) => {
    if (f < startFrame) return 0;
    if (f > endFrame) return 0;
    const tail = interpolate(f, [fadeStart, endFrame], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return base * tail;
  };
}

/** Generisk SFX-renderer. */
const Sfx: React.FC<SfxProps & { src: string }> = ({
  frame,
  durationInFrames = DEFAULT_SFX_DURATION,
  volume = 0.7,
  src,
}) => {
  const volCb = makeSfxVolume(volume, frame, durationInFrames);
  return <Audio src={staticFile(src)} volume={volCb} />;
};

/** Filmisk whoosh — bra for scene-bytter og reveal. */
export const whooshAt: React.FC<SfxProps> = (p) => (
  <Sfx {...p} src="social/sfx/whoosh-cinematic.wav" />
);

/** Dyp whoosh — alternativ til whooshAt, mer bass-tung. */
export const whooshDeepAt: React.FC<SfxProps> = (p) => (
  <Sfx {...p} src="social/sfx/whoosh-deep.wav" />
);

/** Boom-impact — for store reveals (logo, hovedoverskrift). */
export const impactAt: React.FC<SfxProps> = (p) => (
  <Sfx {...p} src="social/sfx/impact-boom.wav" volume={p.volume ?? 0.75} />
);

/** Bass-hit — kortere enn impactAt, bra for tekst-pop. */
export const hitBassAt: React.FC<SfxProps> = (p) => (
  <Sfx {...p} src="social/sfx/hit-bass.wav" />
);

/** Boom-hit — tett, kort impuls (god for nummer-pop). */
export const clickAt: React.FC<SfxProps> = (p) => (
  <Sfx
    {...p}
    src="social/sfx/hit-boom.wav"
    durationInFrames={p.durationInFrames ?? 10}
    volume={p.volume ?? 0.6}
  />
);
