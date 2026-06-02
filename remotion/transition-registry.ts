// Typed registry for video transition overlays in
// remotion/public/transitions/. All assets are from Four Editors' Wipe
// and Light + Lens Flares packs — no glitch / RGB-distortion overlays;
// only professional light-based wipes and burns suitable for a B2B
// industrial brand.

import { staticFile } from "remotion";
import type { Sfx } from "./audio-registry";

/** Every named transition overlay. Keep in sync with files in
 *  `remotion/public/transitions/`. */
export type Transition =
  | "wipe-bright" // standard scene-to-scene, neutral light wash (~24 frames)
  | "wipe-warm" // warm amber wipe — leveranser / mennesker / kunde-stories
  | "wipe-bw-up" // black-and-white vertical wipe — hard kontrast (CADLAB → ferdig)
  | "wipe-open-blur" // soft blur open — outro / soft scene exit
  | "wipe-up" // vertical wipe up — moving forward / new section
  | "light-leak-middle" // warm leak from center — climactic reveal
  | "light-leak-warm"; // dark-to-bright leak — outro / final flourish

/** Pairing each transition with a default SFX that lands on its beat.
 *  Override on a per-use basis if a composition wants something else. */
export const TRANSITION_DEFAULT_SFX: Record<Transition, Sfx> = {
  "wipe-bright": "whoosh-sweep",
  "wipe-warm": "whoosh-sweep",
  "wipe-bw-up": "whoosh-cinematic",
  "wipe-open-blur": "soft-sweep",
  "wipe-up": "whoosh-sweep",
  "light-leak-middle": "whoosh-cinematic",
  "light-leak-warm": "impact-movie",
};

/** How many frames each overlay typically runs at 30 fps. Used so
 *  FTTransition can clip to the overlay's natural length. */
export const TRANSITION_DURATION_FRAMES: Record<Transition, number> = {
  "wipe-bright": 24,
  "wipe-warm": 24,
  "wipe-bw-up": 30,
  "wipe-open-blur": 28,
  "wipe-up": 24,
  "light-leak-middle": 36,
  "light-leak-warm": 42,
};

/** Resolve a transition handle to a staticFile() path. */
export function transition(name: Transition): string {
  return staticFile(`transitions/${name}.mp4`);
}
