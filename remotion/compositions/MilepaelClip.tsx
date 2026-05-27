// MilepaelClip — jubileums-/statistikk-klipp: intro -> stort tall som
// teller opp -> stoette-statistikk + jubileumslogo + CTA. Statisk
// innhold (ingen scraping) — ren animasjons-showcase paa roed FT-bunn.

import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { FT, JUBILEUM, SANS_FONT, TAGLINE } from "../theme";
import { Backdrop, Wordmark, fade } from "../components/shared";
import type { MilepaelClipProps } from "../types";

// ── scene 1 · intro ──────────────────────────────────────────────────

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 16 } });
  const o = fade(frame, 0, 12, 54, 72);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
        gap: 40,
        padding: 86,
      }}
    >
      <div style={{ transform: `scale(${0.8 + pop * 0.2})`, display: "flex" }}>
        <Wordmark variant="color" width={640} />
      </div>
      {/* Wordmarken er navnet — under den skriver vi taglinen, ikke
          brand-navnet på nytt. */}
      <div
        style={{
          fontFamily: SANS_FONT,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 32,
          lineHeight: 1.32,
          textAlign: "center",
          color: "rgba(255,255,255,0.92)",
          maxWidth: 860,
          transform: `translateY(${(1 - pop) * 30}px)`,
        }}
      >
        {TAGLINE}
      </div>
    </AbsoluteFill>
  );
};

// ── scene 2 · stort tall ─────────────────────────────────────────────

const NumberScene: React.FC<MilepaelClipProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade(frame, 0, 14, 128, 145);
  const count = Math.round(
    interpolate(frame, [16, 70], [0, p.number], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const numPop = spring({ frame: frame - 10, fps, config: { damping: 13 } });
  const headPop = spring({ frame: frame - 50, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        alignItems: "center",
        justifyContent: "center",
        padding: 86,
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 24,
          transform: `scale(${0.6 + numPop * 0.4})`,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontWeight: 800,
            fontSize: 520,
            lineHeight: 0.82,
            letterSpacing: -16,
            color: FT.white,
          }}
        >
          {count}
        </div>
        <div
          style={{
            fontFamily: SANS_FONT,
            fontWeight: 800,
            fontSize: 130,
            letterSpacing: -2,
            color: FT.ink,
          }}
        >
          {p.unit}
        </div>
      </div>
      <div
        style={{
          marginTop: 26,
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: 86,
          letterSpacing: -2,
          textAlign: "center",
          color: FT.white,
          opacity: headPop,
          transform: `translateY(${(1 - headPop) * 36}px)`,
        }}
      >
        {p.headline}
      </div>
      <div
        style={{
          marginTop: 14,
          fontFamily: SANS_FONT,
          fontWeight: 600,
          fontSize: 42,
          textAlign: "center",
          color: "rgba(255,255,255,0.82)",
          maxWidth: 880,
          opacity: fade(frame, 64, 80, 144, 145),
        }}
      >
        {p.subhead}
      </div>
    </AbsoluteFill>
  );
};

// ── scene 3 · statistikk + CTA ───────────────────────────────────────

const StatsScene: React.FC<MilepaelClipProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade(frame, 0, 14, 999, 1000);
  const logoPop = spring({ frame, fps, config: { damping: 15 } });
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        alignItems: "center",
        justifyContent: "center",
        padding: 86,
        gap: 48,
      }}
    >
      {p.showJubileum ? (
        <div style={{ transform: `scale(${0.78 + logoPop * 0.22})` }}>
          <Img
            src={staticFile(JUBILEUM.aar25)}
            style={{ width: 380, height: "auto", objectFit: "contain" }}
          />
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          gap: 28,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {p.stats.slice(0, 3).map((s, i) => {
          const pop = spring({
            frame: frame - 12 - i * 9,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              key={s.label}
              style={{
                width: 280,
                padding: "34px 20px",
                borderRadius: 24,
                background: "rgba(255,255,255,0.12)",
                border: "2px solid rgba(255,255,255,0.22)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                opacity: pop,
                transform: `translateY(${(1 - pop) * 40}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: SANS_FONT,
                  fontWeight: 800,
                  fontSize: 96,
                  lineHeight: 1,
                  color: FT.white,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontFamily: SANS_FONT,
                  fontWeight: 600,
                  fontSize: 30,
                  textAlign: "center",
                  color: "rgba(255,255,255,0.82)",
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          padding: "24px 48px",
          borderRadius: 999,
          background: FT.ink,
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: 44,
          color: FT.white,
        }}
      >
        {p.ctaUrl}
      </div>
    </AbsoluteFill>
  );
};

// ── komposisjons-rot ─────────────────────────────────────────────────

export const MilepaelClip: React.FC<MilepaelClipProps> = (props) => {
  return (
    <AbsoluteFill>
      <Backdrop tone="red" />
      <Sequence durationInFrames={72}>
        <IntroScene />
      </Sequence>
      <Sequence from={62} durationInFrames={150}>
        <NumberScene {...props} />
      </Sequence>
      <Sequence from={202} durationInFrames={98}>
        <StatsScene {...props} />
      </Sequence>
    </AbsoluteFill>
  );
};
