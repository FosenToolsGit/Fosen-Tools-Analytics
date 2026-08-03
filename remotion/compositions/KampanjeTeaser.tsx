// KampanjeTeaser — multi-produkt-karusell: intro -> 3-6 produkter med
// crossfade -> CTA. Bra for ukens kampanje / sesongsalg. Hver produkt-
// slot viser bilde + navn + pris (+ rabatt-burst hvis satt).

import React from "react";
import {
  AbsoluteFill,
  Audio,
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
  Burst,
  Eyebrow,
  OutroCta,
  Wordmark,
  fade,
  formatNOK,
} from "../components/shared";
import { sfx, sfxVolume } from "../audio-registry";
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
        <Wordmark variant="color" width={560} />
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
        <Wordmark variant="color" width={210} />
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
        {/* Vis KUN overstreket førpris når det er en reell rabatt.
            Scrapere returnerer ofte prisFør === pris når varen ikke er nedsatt,
            og da blir «16 123,- → 16 123,-» villedende prismarkedsføring. */}
        {p.priceBefore && p.priceBefore > p.priceNow ? (
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

// ── komposisjons-rot ─────────────────────────────────────────────────

export const KampanjeTeaser: React.FC<KampanjeTeaserProps> = (props) => {
  const products = props.products.slice(0, 6);
  const slotCount = Math.max(1, products.length);
  // 8-frame overlap mellom slots så crossfade-en føles glatt.
  const slotFrames = Math.round(CAROUSEL_DURATION / slotCount) + 8;

  return (
    <AbsoluteFill>
      <Backdrop tone="ink" />

      {/* SFX-hits — fyrer kun på animasjons-events, ingen bakgrunnsmusikk */}
      {/* Intro whoosh — wordmark + headline pop-in */}
      <Sequence from={0} durationInFrames={30}>
        <Audio src={sfx("whoosh-cinematic")} volume={sfxVolume("whoosh-cinematic")} />
      </Sequence>
      {/* Per-produkt soft-sweep — fyrer på hvert crossfade */}
      {products.map((p, i) => {
        const from =
          CAROUSEL_START + Math.round((CAROUSEL_DURATION / slotCount) * i);
        return (
          <Sequence
            key={`sfx-${p.name}-${i}`}
            from={Math.max(0, from - 4)}
            durationInFrames={28}
          >
            <Audio src={sfx("soft-sweep")} volume={sfxVolume("soft-sweep")} />
          </Sequence>
        );
      })}
      {/* Outro impact */}
      <Sequence from={OUTRO_FROM} durationInFrames={50}>
        <Audio src={sfx("impact-movie")} volume={sfxVolume("impact-movie")} />
      </Sequence>

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
        <OutroCta ctaUrl={props.ctaUrl} wordmarkWidth={640} ctaSize={36} />
      </Sequence>
    </AbsoluteFill>
  );
};
