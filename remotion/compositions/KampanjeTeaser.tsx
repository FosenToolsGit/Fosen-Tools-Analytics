// KampanjeTeaser — multi-produkt-karusell: intro -> 3-6 produkter med
// crossfade -> CTA. Bra for ukens kampanje / sesongsalg. Hver produkt-
// slot viser bilde + navn + pris (+ rabatt-burst hvis satt).

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

import { FT, MONO_FONT, SANS_FONT, TAGLINE } from "../theme";
import {
  Backdrop,
  Burst,
  Eyebrow,
  Wordmark,
  fade,
  formatNOK,
} from "../components/shared";
import type { KampanjeProdukt, KampanjeTeaserProps } from "../types";

// Total varighet er låst i Root.tsx (430 frames @ 30fps). Karusellen
// fordeler 300 frames jevnt på N produkter.
const INTRO = 80;
const OUTRO_FROM = 370;
const CAROUSEL_START = 70;
const CAROUSEL_DURATION = 310;

// ── intro ────────────────────────────────────────────────────────────

const IntroScene: React.FC<{
  eyebrow: string;
  headline: string;
  subhead: string;
}> = ({ eyebrow, headline, subhead }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14 } });
  const o = fade(frame, 0, 14, 64, 80);
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
      <div style={{ transform: `scale(${0.84 + pop * 0.16})`, display: "flex" }}>
        <Wordmark variant="white" width={520} />
      </div>
      <Eyebrow text={eyebrow} />
      <div
        style={{
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: 92,
          lineHeight: 1.02,
          letterSpacing: -2.5,
          textAlign: "center",
          color: FT.white,
          maxWidth: 920,
          transform: `translateY(${(1 - pop) * 30}px)`,
        }}
      >
        {headline}
      </div>
      <div
        style={{
          fontFamily: SANS_FONT,
          fontWeight: 600,
          fontSize: 38,
          textAlign: "center",
          color: FT.inkDim,
          maxWidth: 880,
        }}
      >
        {subhead}
      </div>
    </AbsoluteFill>
  );
};

// ── ett produkt i karusellen ─────────────────────────────────────────

const ProductSlide: React.FC<{
  p: KampanjeProdukt;
  slotFrames: number;
}> = ({ p, slotFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 12-frame fade inn/ut innenfor slot-en.
  const o = fade(frame, 0, 14, slotFrames - 14, slotFrames);
  const imgPop = spring({ frame, fps, config: { damping: 14 } });
  const zoom = interpolate(frame, [0, slotFrames], [1, 1.06], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        opacity: o,
        padding: 86,
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ alignSelf: "flex-start" }}>
        <Wordmark variant="white" width={260} />
      </div>

      {/* bilde-ramme */}
      <div
        style={{
          marginTop: 24,
          width: 760,
          height: 760,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.04)",
          border: "2px solid rgba(255,255,255,0.10)",
          borderRadius: 36,
          position: "relative",
          transform: `scale(${0.78 + imgPop * 0.22})`,
        }}
      >
        {p.imageUrl ? (
          <Img
            src={p.imageUrl}
            style={{
              width: "82%",
              height: "82%",
              objectFit: "contain",
              filter: "drop-shadow(0 26px 44px rgba(0,0,0,0.55))",
              transform: `scale(${zoom})`,
            }}
          />
        ) : (
          <div
            style={{
              fontFamily: SANS_FONT,
              fontWeight: 800,
              fontSize: 200,
              color: FT.red,
            }}
          >
            {p.manufacturer.slice(0, 1).toUpperCase()}
          </div>
        )}
        {p.discountPct ? (
          <div
            style={{
              position: "absolute",
              top: -50,
              right: -36,
              transform: "rotate(-14deg)",
            }}
          >
            <Burst text={`-${p.discountPct}%`} size={210} />
          </div>
        ) : null}
      </div>

      {/* produsent + navn */}
      <div
        style={{
          marginTop: 28,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: FT.red,
          }}
        >
          {p.manufacturer}
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: SANS_FONT,
            fontWeight: 800,
            fontSize: 60,
            lineHeight: 1.05,
            letterSpacing: -1.2,
            color: FT.white,
            maxWidth: 900,
          }}
        >
          {p.name}
        </div>
      </div>

      {/* pris */}
      <div
        style={{
          marginTop: 24,
          display: "flex",
          alignItems: "baseline",
          gap: 22,
        }}
      >
        {p.priceBefore ? (
          <div
            style={{
              fontFamily: SANS_FONT,
              fontWeight: 600,
              fontSize: 44,
              color: FT.inkMute,
              textDecorationLine: "line-through",
              textDecorationColor: FT.red,
              textDecorationThickness: "4px",
            }}
          >
            {formatNOK(p.priceBefore)}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: SANS_FONT,
            fontWeight: 800,
            fontSize: 110,
            lineHeight: 1,
            letterSpacing: -2,
            color: FT.red,
          }}
        >
          {formatNOK(p.priceNow)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── outro / CTA ──────────────────────────────────────────────────────

const OutroScene: React.FC<{ ctaUrl: string }> = ({ ctaUrl }) => {
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
        <Wordmark variant="white" width={560} />
      </div>
      <div
        style={{
          padding: "26px 50px",
          borderRadius: 999,
          background: FT.red,
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: 46,
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
          fontSize: 30,
          textAlign: "center",
          color: FT.inkDim,
          maxWidth: 860,
        }}
      >
        {TAGLINE}
      </div>
    </AbsoluteFill>
  );
};

// ── komposisjons-rot ─────────────────────────────────────────────────

export const KampanjeTeaser: React.FC<KampanjeTeaserProps> = (props) => {
  const products = props.products.slice(0, 6);
  const slotCount = Math.max(1, products.length);
  // 8-frame overlap mellom slots så crossfade-en føles glatt.
  const slotFrames = Math.round(CAROUSEL_DURATION / slotCount) + 8;

  return (
    <AbsoluteFill>
      <Backdrop tone="ink" />
      <Sequence durationInFrames={INTRO}>
        <IntroScene
          eyebrow={props.eyebrow}
          headline={props.headline}
          subhead={props.subhead}
        />
      </Sequence>
      {products.map((p, i) => {
        const from =
          CAROUSEL_START + Math.round((CAROUSEL_DURATION / slotCount) * i);
        return (
          <Sequence
            key={`${p.name}-${i}`}
            from={from}
            durationInFrames={slotFrames}
          >
            <ProductSlide p={p} slotFrames={slotFrames} />
          </Sequence>
        );
      })}
      <Sequence from={OUTRO_FROM} durationInFrames={60}>
        <OutroScene ctaUrl={props.ctaUrl} />
      </Sequence>
    </AbsoluteFill>
  );
};
