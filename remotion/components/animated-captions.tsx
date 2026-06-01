// AnimatedCaptions — overlay-tekst som animeres inn på en av tre måter:
// typewriter (bokstav-for-bokstav), wordByWord (ord-for-ord med stagger
// fade), eller fadeIn (hele teksten fades inn samtidig).
//
// Brukes som visuelt overlay i video-komposisjonene — typisk nederst
// over en bildescene, eller midt på skjermen som body-text-reveal.

import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { FT, SANS_FONT } from "../theme";

export type CaptionStyle = "typewriter" | "wordByWord" | "fadeIn";
export type CaptionPosition = "center" | "top" | "bottom";

export type AnimatedCaptionsProps = {
  /** Teksten som vises (kan være flerords-setning). */
  text: string;
  /** Når i Sequence-en animasjonen begynner. */
  startFrame: number;
  /** Hvor lenge animasjonen varer (frames). */
  durationInFrames: number;
  /** Stil — typewriter / wordByWord / fadeIn. Default typewriter. */
  style?: CaptionStyle;
  /** Tekst-størrelse i px. Default 52. */
  fontSize?: number;
  /** Posisjon på skjermen. Default bottom. */
  position?: CaptionPosition;
  /** Tekstfarge. Default FT.white. */
  color?: string;
  /** Maks bredde (px). Default 880. */
  maxWidth?: number;
  /** Bakgrunnsfarge på en pille bak teksten (eks: `rgba(0,0,0,0.6)`).
   *  Sett til null for å slippe pille. */
  pillBackground?: string | null;
};

// ── helper: posisjon-styling ─────────────────────────────────────────

function positionStyle(position: CaptionPosition): React.CSSProperties {
  if (position === "top") {
    return {
      position: "absolute",
      top: "10%",
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
    };
  }
  if (position === "center") {
    return {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    };
  }
  // bottom
  return {
    position: "absolute",
    bottom: "12%",
    left: 0,
    right: 0,
    display: "flex",
    justifyContent: "center",
  };
}

// ── typewriter ───────────────────────────────────────────────────────

const Typewriter: React.FC<{
  text: string;
  startFrame: number;
  durationInFrames: number;
}> = ({ text, startFrame, durationInFrames }) => {
  const frame = useCurrentFrame();
  const chars = Math.max(text.length, 1);
  const charsShown = Math.round(
    interpolate(
      frame,
      [startFrame, startFrame + durationInFrames],
      [0, chars],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    ),
  );
  const visible = text.slice(0, charsShown);
  // Blinkende caret de første sekundene mens vi skriver.
  const caretOn = frame < startFrame + durationInFrames;
  return (
    <span>
      {visible}
      {caretOn ? (
        <span
          style={{
            display: "inline-block",
            width: "0.6ch",
            opacity: Math.floor(frame / 8) % 2 === 0 ? 1 : 0,
          }}
        >
          |
        </span>
      ) : null}
    </span>
  );
};

// ── word-by-word ─────────────────────────────────────────────────────

const WordByWord: React.FC<{
  text: string;
  startFrame: number;
  durationInFrames: number;
}> = ({ text, startFrame, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(/\s+/).filter(Boolean);
  const perWord = words.length > 0 ? durationInFrames / words.length : 0;

  return (
    <>
      {words.map((w, i) => {
        const wordStart = startFrame + Math.round(i * perWord);
        const pop = spring({
          frame: frame - wordStart,
          fps,
          config: { damping: 14, mass: 0.6 },
        });
        return (
          <span
            key={`${w}-${i}`}
            style={{
              display: "inline-block",
              opacity: pop,
              transform: `translateY(${(1 - pop) * 12}px)`,
              marginRight: "0.32em",
            }}
          >
            {w}
          </span>
        );
      })}
    </>
  );
};

// ── fade-in ──────────────────────────────────────────────────────────

const FadeIn: React.FC<{
  text: string;
  startFrame: number;
  durationInFrames: number;
}> = ({ text, startFrame, durationInFrames }) => {
  const frame = useCurrentFrame();
  const fadeWindow = Math.min(20, Math.floor(durationInFrames * 0.35));
  const o = interpolate(
    frame,
    [startFrame, startFrame + fadeWindow],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  return <span style={{ opacity: o }}>{text}</span>;
};

// ── hovedkomponent ───────────────────────────────────────────────────

export const AnimatedCaptions: React.FC<AnimatedCaptionsProps> = ({
  text,
  startFrame,
  durationInFrames,
  style = "typewriter",
  fontSize = 52,
  position = "bottom",
  color = FT.white,
  maxWidth = 880,
  pillBackground = "rgba(0,0,0,0.62)",
}) => {
  const frame = useCurrentFrame();
  // Skjul helt før vi har startet — sparer en frame med tom pille.
  if (frame < startFrame) return null;

  const inner =
    style === "typewriter" ? (
      <Typewriter
        text={text}
        startFrame={startFrame}
        durationInFrames={durationInFrames}
      />
    ) : style === "wordByWord" ? (
      <WordByWord
        text={text}
        startFrame={startFrame}
        durationInFrames={durationInFrames}
      />
    ) : (
      <FadeIn
        text={text}
        startFrame={startFrame}
        durationInFrames={durationInFrames}
      />
    );

  const padding = pillBackground ? "18px 32px" : "0";
  const borderRadius = pillBackground ? 18 : 0;

  return (
    <div style={positionStyle(position)}>
      <div
        style={{
          fontFamily: SANS_FONT,
          fontWeight: 700,
          fontSize,
          lineHeight: 1.22,
          color,
          textAlign: "center",
          maxWidth,
          padding,
          borderRadius,
          background: pillBackground ?? "transparent",
          // Minimum-bredde så pille-en ikke "snapper" på korte ord.
          minHeight: pillBackground ? fontSize * 1.3 : undefined,
        }}
      >
        {inner}
      </div>
    </div>
  );
};
