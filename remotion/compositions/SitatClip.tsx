// SitatClip — kundesitat-klipp: intro -> stort sitat med atribuering ->
// CTA. Bra som trust-signal / referanse-innlegg.

import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { FT, SANS_FONT, TAGLINE } from "../theme";
import { Backdrop, Eyebrow, Wordmark, fade } from "../components/shared";
import type { SitatClipProps } from "../types";

// ── scene 1 · intro ──────────────────────────────────────────────────

const IntroScene: React.FC<{ eyebrow: string }> = ({ eyebrow }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 16 } });
  const o = fade(frame, 0, 12, 54, 70);
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
        <Wordmark variant="white" width={520} />
      </div>
      <div style={{ transform: `translateY(${(1 - pop) * 30}px)` }}>
        <Eyebrow text={eyebrow} />
      </div>
    </AbsoluteFill>
  );
};

// ── scene 2 · sitat ──────────────────────────────────────────────────

const QuoteScene: React.FC<SitatClipProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade(frame, 0, 16, 158, 175);
  const quotePop = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const attrPop = spring({ frame: frame - 50, fps, config: { damping: 14 } });
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
      {/* stor rød anførselstegn-dekor */}
      <div
        style={{
          fontFamily: SANS_FONT,
          fontSize: 360,
          lineHeight: 0.8,
          fontWeight: 800,
          color: FT.red,
          marginBottom: -100,
          opacity: 0.95,
          transform: `translateY(${(1 - quotePop) * 30}px)`,
        }}
      >
        “
      </div>

      <div
        style={{
          fontFamily: SANS_FONT,
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: 58,
          lineHeight: 1.28,
          color: FT.white,
          maxWidth: 920,
          opacity: quotePop,
          transform: `translateY(${(1 - quotePop) * 36}px)`,
        }}
      >
        {p.quote}
      </div>

      <div
        style={{
          marginTop: 24,
          display: "flex",
          alignItems: "center",
          gap: 28,
          opacity: attrPop,
          transform: `translateY(${(1 - attrPop) * 24}px)`,
        }}
      >
        {/* rød strek-aksent */}
        <div
          style={{
            width: 60,
            height: 4,
            background: FT.red,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: SANS_FONT,
              fontWeight: 800,
              fontSize: 42,
              color: FT.white,
              lineHeight: 1.1,
            }}
          >
            {p.attributionName}
          </div>
          <div
            style={{
              marginTop: 4,
              fontFamily: SANS_FONT,
              fontWeight: 500,
              fontSize: 28,
              color: FT.inkDim,
            }}
          >
            {p.attributionRole}
            {p.attributionCompany ? ` · ${p.attributionCompany}` : ""}
          </div>
        </div>
        {p.companyLogoUrl ? (
          <div
            style={{
              padding: "10px 16px",
              background: "rgba(255,255,255,0.96)",
              borderRadius: 10,
              flexShrink: 0,
            }}
          >
            <Img
              src={p.companyLogoUrl}
              style={{
                height: 70,
                width: "auto",
                maxWidth: 220,
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

// ── scene 3 · CTA ────────────────────────────────────────────────────

const CtaScene: React.FC<{ ctaUrl: string }> = ({ ctaUrl }) => {
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
        gap: 34,
      }}
    >
      <div style={{ transform: `scale(${0.82 + pop * 0.18})` }}>
        <Wordmark variant="white" width={520} />
      </div>
      <div
        style={{
          padding: "24px 46px",
          borderRadius: 999,
          background: FT.red,
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: 42,
          color: FT.white,
          transform: `translateY(${(1 - pop) * 36}px)`,
        }}
      >
        {ctaUrl}
      </div>
      <div
        style={{
          fontFamily: SANS_FONT,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 28,
          textAlign: "center",
          color: FT.inkDim,
          maxWidth: 820,
        }}
      >
        {TAGLINE}
      </div>
    </AbsoluteFill>
  );
};

// ── komposisjons-rot ─────────────────────────────────────────────────

export const SitatClip: React.FC<SitatClipProps> = (props) => {
  return (
    <AbsoluteFill>
      <Backdrop tone="ink" />
      <Sequence durationInFrames={70}>
        <IntroScene eyebrow={props.eyebrow} />
      </Sequence>
      <Sequence from={60} durationInFrames={180}>
        <QuoteScene {...props} />
      </Sequence>
      <Sequence from={230} durationInFrames={70}>
        <CtaScene ctaUrl={props.ctaUrl} />
      </Sequence>
    </AbsoluteFill>
  );
};
