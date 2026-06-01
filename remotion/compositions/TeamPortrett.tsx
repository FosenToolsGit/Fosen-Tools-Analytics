// TeamPortrett — ansatt-intro-klipp. Bra for "møt teamet"-serien på
// Meta/LinkedIn. 4 scener, ~360 frames @ 30fps = 12s:
//   1. "MØT TEAMET" eyebrow + word-by-word reveal (0-60)
//   2. Portrett med Ken Burns + navn/rolle/siden (60-180)
//   3. Quote stor på rød/ink bakgrunn, typewriter (180-300)
//   4. Outro med FT-logo (300-360)

import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { FT, MONO_FONT, SANS_FONT } from "../theme";
import { Backdrop, Wordmark, fade } from "../components/shared";
import { AnimatedCaptions } from "../components/animated-captions";
import type { TeamPortrettProps } from "../types";

// ── stilisert fallback når portrett mangler ──────────────────────────

const PortrettImage: React.FC<{
  url: string | null;
  name: string;
}> = ({ url, name }) => {
  // Hooks må alltid kjøres i samme rekkefølge — kall useCurrentFrame
  // før evt. early return.
  const frame = useCurrentFrame();
  if (url) {
    const zoom = interpolate(frame, [0, 120], [1.0, 1.07], {
      extrapolateRight: "clamp",
    });
    return (
      <Img
        src={url}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${zoom})`,
        }}
      />
    );
  }
  // Fallback — initialer på FT-rød/ink-bakgrunn.
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: `linear-gradient(150deg, ${FT.slate}, ${FT.inkDeep})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: SANS_FONT,
        fontWeight: 800,
        fontSize: 320,
        letterSpacing: -8,
        color: FT.red,
      }}
    >
      {initials || "FT"}
    </div>
  );
};

// ── scene 1 · "MØT TEAMET" intro (0-60) ──────────────────────────────

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 16 } });
  const o = fade(frame, 0, 12, 48, 60);
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        alignItems: "center",
        justifyContent: "center",
        padding: 86,
        gap: 36,
      }}
    >
      <div
        style={{
          fontFamily: MONO_FONT,
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: 8,
          textTransform: "uppercase",
          color: FT.red,
          transform: `translateY(${(1 - pop) * 24}px)`,
        }}
      >
        Møt teamet
      </div>
      <div
        style={{
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: 96,
          letterSpacing: -3,
          color: FT.white,
          textAlign: "center",
        }}
      >
        <AnimatedCaptions
          text="Menneskene bak verktøyene"
          startFrame={6}
          durationInFrames={40}
          style="wordByWord"
          fontSize={88}
          position="center"
          color={FT.white}
          maxWidth={920}
          pillBackground={null}
        />
      </div>
    </AbsoluteFill>
  );
};

// ── scene 2 · portrett med Ken Burns (60-180) ────────────────────────

const PortrettScene: React.FC<TeamPortrettProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade(frame, 0, 16, 100, 120);
  const namePop = spring({
    frame: frame - 14,
    fps,
    config: { damping: 13 },
  });
  const rolePop = spring({
    frame: frame - 36,
    fps,
    config: { damping: 14 },
  });
  const sincePop = spring({
    frame: frame - 60,
    fps,
    config: { damping: 14 },
  });
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div
        style={{
          position: "absolute",
          inset: 60,
          borderRadius: 28,
          overflow: "hidden",
          border: "2px solid rgba(255,255,255,0.10)",
        }}
      >
        <PortrettImage url={p.photoUrl} name={p.name} />
      </div>

      {/* Mørk gradient nederst */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          bottom: 60,
          height: "52%",
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          background:
            "linear-gradient(180deg, transparent 0%, rgba(15,17,21,0.92) 70%)",
        }}
      />

      {/* Tekst-overlay nederst */}
      <div
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          bottom: 140,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 70,
            height: 5,
            background: FT.red,
            opacity: namePop,
          }}
        />
        <div
          style={{
            fontFamily: SANS_FONT,
            fontWeight: 800,
            fontSize: 108,
            lineHeight: 0.96,
            letterSpacing: -3,
            color: FT.white,
            opacity: namePop,
            transform: `translateY(${(1 - namePop) * 30}px)`,
          }}
        >
          {p.name}
        </div>
        <div
          style={{
            fontFamily: SANS_FONT,
            fontWeight: 600,
            fontSize: 44,
            color: FT.inkDim,
            opacity: rolePop,
            transform: `translateY(${(1 - rolePop) * 22}px)`,
          }}
        >
          {p.role}
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: MONO_FONT,
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: FT.red,
            opacity: sincePop,
            transform: `translateY(${(1 - sincePop) * 18}px)`,
          }}
        >
          {`I FT siden ${p.since}`}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── scene 3 · quote (180-300) ────────────────────────────────────────

const QuoteScene: React.FC<TeamPortrettProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade(frame, 0, 16, 100, 120);
  const quotePop = spring({
    frame: frame - 8,
    fps,
    config: { damping: 14 },
  });
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        background: FT.red,
        padding: 96,
        flexDirection: "column",
        justifyContent: "center",
        gap: 30,
      }}
    >
      {/* Stor anførselstegn */}
      <div
        style={{
          fontFamily: SANS_FONT,
          fontSize: 320,
          lineHeight: 0.8,
          fontWeight: 800,
          color: FT.white,
          marginBottom: -80,
          opacity: 0.96,
          transform: `translateY(${(1 - quotePop) * 24}px)`,
        }}
      >
        “
      </div>

      <div
        style={{
          fontFamily: SANS_FONT,
          fontStyle: "italic",
          fontWeight: 700,
          fontSize: 56,
          lineHeight: 1.28,
          color: FT.white,
          maxWidth: 900,
        }}
      >
        <AnimatedCaptions
          text={p.quote}
          startFrame={14}
          durationInFrames={80}
          style="typewriter"
          fontSize={56}
          position="center"
          color={FT.white}
          maxWidth={900}
          pillBackground={null}
        />
      </div>

      <div
        style={{
          marginTop: 22,
          display: "flex",
          alignItems: "center",
          gap: 22,
        }}
      >
        <div
          style={{
            width: 60,
            height: 4,
            background: FT.white,
          }}
        />
        <div
          style={{
            fontFamily: SANS_FONT,
            fontWeight: 800,
            fontSize: 38,
            color: FT.white,
          }}
        >
          {p.name}
        </div>
        <div
          style={{
            fontFamily: SANS_FONT,
            fontWeight: 500,
            fontSize: 28,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {p.role}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── scene 4 · outro (300-360) ────────────────────────────────────────

const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 15 } });
  const o = fade(frame, 0, 12, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        alignItems: "center",
        justifyContent: "center",
        padding: 86,
        gap: 30,
      }}
    >
      <div style={{ transform: `scale(${0.82 + pop * 0.18})` }}>
        <Wordmark variant="color" width={540} />
      </div>
      <div
        style={{
          fontFamily: SANS_FONT,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 32,
          textAlign: "center",
          color: FT.inkDim,
          maxWidth: 820,
          transform: `translateY(${(1 - pop) * 22}px)`,
        }}
      >
        Vi er ansiktene bak hvert eneste HDFI-innlegg.
      </div>
    </AbsoluteFill>
  );
};

// ── komposisjons-rot ─────────────────────────────────────────────────

export const TeamPortrett: React.FC<TeamPortrettProps> = (props) => {
  return (
    <AbsoluteFill>
      <Backdrop tone="ink" />
      <Sequence durationInFrames={60}>
        <IntroScene />
      </Sequence>
      <Sequence from={60} durationInFrames={120}>
        <PortrettScene {...props} />
      </Sequence>
      <Sequence from={180} durationInFrames={120}>
        <QuoteScene {...props} />
      </Sequence>
      <Sequence from={300} durationInFrames={60}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
