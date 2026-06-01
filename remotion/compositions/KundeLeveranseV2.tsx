// KundeLeveranseV2 — multi-scene leveranse-reel (4-6 scener). Bygger
// videre på LeveranseReel-mønsteret, men med:
//   - 3-6 bilder som hver får Ken Burns-pan (zoom 1.0 → 1.08)
//   - animerte caption-overlay med highlight-stikkord
//   - typewriter-reveal av body-tekst
//   - dedikert outro med CTA
//
// Total varighet ~450 frames @ 30fps = 15s. `format`-prop styrer
// dimensjoner via calculateMetadata i Root.tsx.

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
import {
  Backdrop,
  Chip,
  Eyebrow,
  Wordmark,
  fade,
} from "../components/shared";
import { AnimatedCaptions } from "../components/animated-captions";
import type { KundeLeveranseV2Props } from "../types";

// ── scene 1 · intro (0-60) ───────────────────────────────────────────

const IntroScene: React.FC<KundeLeveranseV2Props> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 16 } });
  const o = fade(frame, 0, 12, 48, 60);
  const customerLabel = p.anonymous ? "Bransjekunde" : p.customer;
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
      <div style={{ transform: `scale(${0.8 + pop * 0.2})`, display: "flex" }}>
        <Wordmark variant="color" width={560} />
      </div>
      <div
        style={{
          fontFamily: MONO_FONT,
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: 8,
          textTransform: "uppercase",
          color: FT.red,
          transform: `translateY(${(1 - pop) * 30}px)`,
        }}
      >
        Levert til
      </div>
      <div
        style={{
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: p.anonymous ? 88 : 120,
          lineHeight: 0.98,
          letterSpacing: -3,
          textAlign: "center",
          color: p.anonymous ? FT.inkDim : FT.white,
          fontStyle: p.anonymous ? "italic" : "normal",
          opacity: pop,
          transform: `translateY(${(1 - pop) * 44}px)`,
        }}
      >
        {customerLabel}
      </div>
      <div style={{ display: "flex" }}>
        <Chip label={p.industry} />
      </div>
    </AbsoluteFill>
  );
};

// ── scene 2-4 · bildegalleri med Ken Burns ───────────────────────────

const KenBurnsImage: React.FC<{
  url: string;
  highlight: string | undefined;
}> = ({ url, highlight }) => {
  const frame = useCurrentFrame();
  // Hvert bilde har egen Sequence (60 frames), så frame her er 0-59.
  const zoom = interpolate(frame, [0, 60], [1.0, 1.08], {
    extrapolateRight: "clamp",
  });
  const panX = interpolate(frame, [0, 60], [0, -1.2], {
    extrapolateRight: "clamp",
  });
  const o = fade(frame, 0, 10, 50, 60);
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
        <Img
          src={url}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${zoom}) translateX(${panX}%)`,
          }}
        />
      </div>
      {highlight ? (
        <AnimatedCaptions
          text={highlight}
          startFrame={6}
          durationInFrames={28}
          style="wordByWord"
          fontSize={48}
          position="bottom"
          pillBackground="rgba(15,17,21,0.78)"
        />
      ) : null}
    </AbsoluteFill>
  );
};

const FallbackImage: React.FC<{
  customer: string;
  anonymous: boolean;
}> = ({ customer, anonymous }) => (
  <AbsoluteFill
    style={{
      padding: 60,
    }}
  >
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(150deg, ${FT.slate}, ${FT.inkDeep})`,
        border: "2px solid rgba(255,255,255,0.10)",
        fontFamily: SANS_FONT,
        fontWeight: 800,
        fontSize: 240,
        color: FT.red,
      }}
    >
      {anonymous ? "·" : customer.slice(0, 1).toUpperCase()}
    </div>
  </AbsoluteFill>
);

// ── scene 5 · body med typewriter (300-380) ──────────────────────────

const BodyScene: React.FC<KundeLeveranseV2Props> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade(frame, 0, 14, 70, 80);
  const headPop = spring({ frame, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        padding: 96,
        flexDirection: "column",
        justifyContent: "center",
        gap: 36,
      }}
    >
      <Eyebrow text="Leveransen" />
      <div
        style={{
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: 78,
          lineHeight: 1.05,
          letterSpacing: -2,
          color: FT.white,
          maxWidth: 920,
          opacity: headPop,
          transform: `translateY(${(1 - headPop) * 32}px)`,
        }}
      >
        {p.heading}
      </div>
      <div
        style={{
          fontFamily: SANS_FONT,
          fontWeight: 500,
          fontSize: 38,
          lineHeight: 1.4,
          color: FT.inkDim,
          maxWidth: 900,
        }}
      >
        <AnimatedCaptions
          text={p.bodyText}
          startFrame={18}
          durationInFrames={56}
          style="typewriter"
          fontSize={38}
          position="center"
          color={FT.inkDim}
          maxWidth={900}
          pillBackground={null}
        />
      </div>
    </AbsoluteFill>
  );
};

// ── scene 6 · outro (380-450) ────────────────────────────────────────

const OutroScene: React.FC<KundeLeveranseV2Props> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 15 } });
  const o = fade(frame, 0, 14, 999, 1000);
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
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          justifyContent: "center",
          maxWidth: 900,
        }}
      >
        {p.highlights.slice(0, 4).map((t, i) => {
          const cp = spring({
            frame: frame - 12 - i * 8,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              key={`${t}-${i}`}
              style={{
                opacity: cp,
                transform: `translateY(${(1 - cp) * 24}px)`,
              }}
            >
              <Chip label={t} />
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 18,
          padding: "22px 44px",
          borderRadius: 999,
          background: FT.red,
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: 42,
          color: FT.white,
          transform: `translateY(${(1 - pop) * 36}px)`,
        }}
      >
        {p.ctaUrl}
      </div>
    </AbsoluteFill>
  );
};

// ── komposisjons-rot ─────────────────────────────────────────────────

export const KundeLeveranseV2: React.FC<KundeLeveranseV2Props> = (props) => {
  // 3-6 bilder, hvert med 60 frames (Sequence). Highlights mappes
  // 1:1 inn på første N bilder (resten av bildene viser bare bilde).
  const images = props.images.slice(0, 6);
  const highlights = props.highlights;

  return (
    <AbsoluteFill>
      <Backdrop tone="ink" />

      {/* Scene 1 — intro (0-60) */}
      <Sequence durationInFrames={60}>
        <IntroScene {...props} />
      </Sequence>

      {/* Scene 2-N — bildegalleri (60-300) */}
      {images.length > 0 ? (
        images.map((url, i) => {
          const start = 60 + i * 60;
          const highlight = highlights[i];
          return (
            <Sequence
              key={`${url}-${i}`}
              from={start}
              durationInFrames={60}
            >
              <KenBurnsImage url={url} highlight={highlight} />
            </Sequence>
          );
        })
      ) : (
        <Sequence from={60} durationInFrames={240}>
          <FallbackImage
            customer={props.customer}
            anonymous={props.anonymous}
          />
        </Sequence>
      )}

      {/* Scene 5 — body med typewriter (300-380) */}
      <Sequence from={300} durationInFrames={80}>
        <BodyScene {...props} />
      </Sequence>

      {/* Scene 6 — outro (380-450) */}
      <Sequence from={380} durationInFrames={70}>
        <OutroScene {...props} />
      </Sequence>
    </AbsoluteFill>
  );
};
