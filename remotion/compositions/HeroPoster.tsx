// HeroPoster — brand-presence. Bakgrunn fra video-MP4 eller stillbilde
// med subtil zoom. Tekst nede-venstre: rød 4px-stripe, brand-tekst,
// tagline. CTA-knapp i hvit pill nederst-høyre med pil-ikon.
// Matcher som-forslag-2026-06.md seksjon 1.

import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { FT, SANS_FONT } from "../theme";
import { fade } from "../components/shared";
import { FTArrow, FTBackground } from "../components/ft-elements";
import type { HeroPosterProps, VideoFormat } from "../types";

// ── format-spesifikk skalering ───────────────────────────────────────

function dimsFor(format: VideoFormat): {
  brandSize: number;
  taglineSize: number;
  ctaSize: number;
  stripeWidth: number;
  padding: number;
} {
  if (format === "wide") {
    return {
      brandSize: 72,
      taglineSize: 32,
      ctaSize: 28,
      stripeWidth: 80,
      padding: 96,
    };
  }
  if (format === "square") {
    return {
      brandSize: 58,
      taglineSize: 28,
      ctaSize: 26,
      stripeWidth: 70,
      padding: 80,
    };
  }
  return {
    brandSize: 72,
    taglineSize: 30,
    ctaSize: 28,
    stripeWidth: 80,
    padding: 88,
  };
}

// ── bakgrunn (video eller bilde med subtil zoom) ─────────────────────

const HeroMedia: React.FC<{
  videoUrl?: string;
  imageUrl?: string;
}> = ({ videoUrl, imageUrl }) => {
  const frame = useCurrentFrame();
  // Rolig zoom 1.0 → 1.02 over hele varigheten
  const zoom = interpolate(frame, [0, 120], [1.0, 1.02], {
    extrapolateRight: "clamp",
  });

  if (videoUrl) {
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `scale(${zoom})`,
            transformOrigin: "center",
          }}
        >
          <OffthreadVideo
            src={videoUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            muted
          />
        </div>
      </AbsoluteFill>
    );
  }

  if (imageUrl) {
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${zoom})`,
            transformOrigin: "center",
          }}
        />
      </AbsoluteFill>
    );
  }

  // Fallback: ren ink-bakgrunn med subtil grid (FTBackground)
  return <FTBackground variant="ink" />;
};

// ── hovedscene ───────────────────────────────────────────────────────

const MainScene: React.FC<HeroPosterProps> = (p) => {
  const frame = useCurrentFrame();
  const { width: _w } = useVideoConfig();
  const dims = dimsFor(p.format);

  // Sekvensiell fade-in: stripe → brand → tagline → CTA
  const oStripe = fade(frame, 0, 16, 999, 1000);
  const oBrand = fade(frame, 12, 32, 999, 1000);
  const oTag = fade(frame, 22, 42, 999, 1000);
  const oCta = fade(frame, 40, 70, 999, 1000);

  // CTA glir inn fra høyre
  const ctaX = interpolate(frame, [40, 70], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <HeroMedia videoUrl={p.videoUrl} imageUrl={p.imageUrl} />

      {/* Mørk gradient nederst for tekst-kontrast */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, transparent 40%, rgba(15,17,21,0.92) 100%)",
        }}
      />

      {/* Tekst-blokk nederst-venstre */}
      <div
        style={{
          position: "absolute",
          left: dims.padding,
          bottom: dims.padding,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxWidth: "70%",
        }}
      >
        <div
          style={{
            width: dims.stripeWidth,
            height: 4,
            background: FT.red,
            opacity: oStripe,
          }}
        />
        <div
          style={{
            opacity: oBrand,
            fontFamily: SANS_FONT,
            fontWeight: 800,
            fontSize: dims.brandSize,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: FT.white,
            lineHeight: 1.0,
          }}
        >
          {p.brand}
        </div>
        <div
          style={{
            opacity: oTag,
            fontFamily: SANS_FONT,
            fontWeight: 500,
            fontSize: dims.taglineSize,
            color: "rgba(255,255,255,0.92)",
            lineHeight: 1.35,
            maxWidth: 760,
          }}
        >
          {p.tagline}
        </div>
      </div>

      {/* CTA-pill nederst-høyre */}
      {p.ctaText ? (
        <div
          style={{
            position: "absolute",
            right: dims.padding,
            bottom: dims.padding,
            opacity: oCta,
            transform: `translateX(${ctaX}px)`,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              padding: `${Math.round(dims.ctaSize * 0.55)}px ${Math.round(
                dims.ctaSize * 1.2,
              )}px`,
              borderRadius: 999,
              background: FT.white,
              border: "1px solid rgba(255,255,255,0.8)",
              fontFamily: SANS_FONT,
              fontWeight: 700,
              fontSize: dims.ctaSize,
              color: FT.ink,
              letterSpacing: "0.02em",
            }}
          >
            <span>{p.ctaText}</span>
            <FTArrow size={dims.ctaSize * 1.1} color={FT.red} />
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ── komposisjons-rot ─────────────────────────────────────────────────

export const HeroPoster: React.FC<HeroPosterProps> = (props) => {
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={240}>
        <MainScene {...props} />
      </Sequence>
    </AbsoluteFill>
  );
};
