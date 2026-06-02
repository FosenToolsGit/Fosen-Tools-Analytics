// FTBlueprintFrame — corner-bracket overlay that frames a content
// region. Inspired by Hundo Hunter's HUD corner-brackets, retuned for
// FT's industrial brand: thin red strokes with a subtle pulse.
//
// Use inside Scene 2 to make any image / card read as "designed in
// CADLAB" — visual cue for engineering, not stock imagery.

import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { FT } from "../theme";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export const FTBlueprintFrame: React.FC<{
  /** When to start showing the brackets (relative to current frame). */
  from?: number;
  /** Animation duration in frames. */
  durationInFrames?: number;
  /** Inset from each edge, in px. */
  inset?: number;
  /** Length of each L-arm. */
  arm?: number;
  /** Stroke width. */
  stroke?: number;
  /** Color. Defaults to FT-rød. */
  color?: string;
  /** Subtle pulse on/off. */
  pulse?: boolean;
}> = ({
  from = 0,
  durationInFrames = 30,
  inset = 60,
  arm = 80,
  stroke = 3,
  color = FT.red,
  pulse = true,
}) => {
  const frame = useCurrentFrame();
  const local = frame - from;
  if (local < 0) return null;

  // Brackets animate in sequentially: TL → TR → BR → BL.
  const phase = Math.min(1, local / Math.max(1, durationInFrames));
  const progressFor: Record<Corner, number> = {
    "top-left": Math.min(1, phase * 4),
    "top-right": Math.min(1, Math.max(0, (phase - 0.15) * 4)),
    "bottom-right": Math.min(1, Math.max(0, (phase - 0.3) * 4)),
    "bottom-left": Math.min(1, Math.max(0, (phase - 0.45) * 4)),
  };

  // Pulse cycles every 60 frames once visible.
  const pulseFactor = pulse
    ? 0.85 + 0.15 * Math.sin((local - durationInFrames) * 0.1)
    : 1;
  const opacity = phase * pulseFactor;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      {(Object.keys(progressFor) as Corner[]).map((corner) => (
        <CornerBracket
          key={corner}
          corner={corner}
          inset={inset}
          arm={arm * progressFor[corner]}
          stroke={stroke}
          color={color}
        />
      ))}
    </AbsoluteFill>
  );
};

const CornerBracket: React.FC<{
  corner: Corner;
  inset: number;
  arm: number;
  stroke: number;
  color: string;
}> = ({ corner, inset, arm, stroke, color }) => {
  const isTop = corner.startsWith("top");
  const isLeft = corner.endsWith("left");
  const v: React.CSSProperties = {
    position: "absolute",
    [isTop ? "top" : "bottom"]: inset,
    [isLeft ? "left" : "right"]: inset,
    background: color,
  };
  return (
    <>
      <div style={{ ...v, width: arm, height: stroke }} />
      <div style={{ ...v, width: stroke, height: arm }} />
    </>
  );
};
