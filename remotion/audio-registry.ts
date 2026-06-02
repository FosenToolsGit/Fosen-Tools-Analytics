// Typed registry for sound effects in remotion/public/sfx/. Use named
// handles ("whoosh-sweep") rather than raw paths, so a file rename only
// needs one update here.
//
// All files were licensed via Adrian's Four Editors pack (Cinematic
// Sound Library + Ultimate Social Content SFX + Wipe and Light SFX),
// extracted 2026-06-02. License covers commercial use.

import { staticFile } from "remotion";

/** Every named SFX. Keep in sync with files in `remotion/public/sfx/`. */
export type Sfx =
  | "whoosh-sweep" // standard scene-to-scene whoosh, mid-tone
  | "whoosh-cinematic" // build-up whoosh, climactic
  | "whoosh-deep" // bass whoosh, brand reveals
  | "riser-slow" // 2-3 sec build to count-up / milestone climax
  | "riser-hope" // bright build to positive payoff
  | "impact-close" // soft thud, banner-card land
  | "impact-movie" // outro stinger
  | "soft-sweep" // banner-card / element snap-in
  | "quick-sweep"; // UI tap / button-press feel

/** Recommended volume per SFX. Used by FTTransition + outro so beats land
 *  consistently without us having to remember levels per file. */
export const SFX_VOLUME: Record<Sfx, number> = {
  "whoosh-sweep": 0.55,
  "whoosh-cinematic": 0.65,
  "whoosh-deep": 0.7,
  "riser-slow": 0.5,
  "riser-hope": 0.55,
  "impact-close": 0.55,
  "impact-movie": 0.75,
  "soft-sweep": 0.45,
  "quick-sweep": 0.5,
};

/** Resolve an SFX handle to a staticFile() path. */
export function sfx(name: Sfx): string {
  return staticFile(`sfx/${name}.wav`);
}

/** Volume for an SFX. */
export function sfxVolume(name: Sfx): number {
  return SFX_VOLUME[name];
}

/** Music bed — runs through entire composition at low volume (~0.22).
 *  Same file always — `Ambience Hope` from Four Editors gives a soft
 *  build-up that loops cleanly. Override by passing a different
 *  staticFile() path on the consumer side. */
export function musicBed(): string {
  return staticFile("sfx/music-bed.wav");
}
