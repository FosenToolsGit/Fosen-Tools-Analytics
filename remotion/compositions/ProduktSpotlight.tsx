// ProduktSpotlight — vertikalt produkt-klipp: intro -> produktbilde med
// spring -> navn + produsent -> pris med count-up + rabatt-burst ->
// USP-punkter -> CTA. Ren presentasjon; alt kommer via props.

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
  Burst,
  CornerBrackets,
  Eyebrow,
  OutroCta,
  Wordmark,
  fade,
  formatNOK,
} from "../components/shared";
import type { ProduktSpotlightProps } from "../types";

// ── produktbilde (eller fallback) ────────────────────────────────────

const ProductImage: React.FC<{
  url: string | null;
  manufacturer: string;
}> = ({ url, manufacturer }) => {
  if (url) {
    return (
      <Img
        src={url}
        style={{
          width: "84%",
          height: "84%",
          objectFit: "contain",
          filter: "drop-shadow(0 30px 50px rgba(0,0,0,0.55))",
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: "72%",
        height: "72%",
        borderRadius: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(150deg, ${FT.slate}, ${FT.inkDeep})`,
        border: `2px solid rgba(255,255,255,0.10)`,
        fontFamily: SANS_FONT,
        fontWeight: 800,
        fontSize: 220,
        color: FT.red,
      }}
    >
      {manufacturer.slice(0, 1).toUpperCase()}
    </div>
  );
};

// ── scene 1 · intro ──────────────────────────────────────────────────

const IntroScene: React.FC<{ eyebrow: string }> = ({ eyebrow }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 16 } });
  const o = fade(frame, 0, 12, 60, 78);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        opacity: o,
        gap: 44,
      }}
    >
      <div
        style={{
          transform: `scale(${0.8 + pop * 0.2})`,
          display: "flex",
        }}
      >
        <Wordmark variant="color" width={640} />
      </div>
      <div style={{ transform: `translateY(${(1 - pop) * 30}px)` }}>
        <Eyebrow text={eyebrow} />
      </div>
    </AbsoluteFill>
  );
};

// ── scene 2 · produkt ────────────────────────────────────────────────

const ProductScene: React.FC<ProduktSpotlightProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade(frame, 0, 14, 158, 175);

  const imgPop = spring({ frame: frame - 6, fps, config: { damping: 14 } });
  const namePop = spring({ frame: frame - 26, fps, config: { damping: 12 } });
  // Tell NED fra veiledende pris til kampanjepris. Hvis ingen før-pris
  // er satt, start ~30% over for å beholde «rabatt-følelsen». Aldri OPP
  // mot nå-prisen — det får folk til å tenke «Oi, dyrt!» før kampanje-
  // prisen lander.
  const startPrice = p.priceBefore ?? Math.round(p.priceNow * 1.3);
  const price = Math.round(
    interpolate(frame, [54, 92], [startPrice, p.priceNow], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

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
        <Wordmark variant="color" width={240} />
      </div>

      {/* produktbilde-ramme */}
      <div
        style={{
          marginTop: 36,
          width: 720,
          height: 720,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.04)",
          border: "2px solid rgba(255,255,255,0.10)",
          borderRadius: 36,
          transform: `scale(${0.72 + imgPop * 0.28})`,
          position: "relative",
        }}
      >
        <CornerBrackets color={FT.red} arm={70} thickness={4} />
        <ProductImage url={p.imageUrl} manufacturer={p.manufacturer} />
        {p.discountPct ? (
          <div
            style={{
              position: "absolute",
              top: -54,
              right: -40,
              transform: `rotate(-14deg) scale(${imgPop})`,
            }}
          >
            <Burst text={`-${p.discountPct}%`} size={220} />
          </div>
        ) : null}
      </div>

      {/* produsent + navn */}
      <div
        style={{
          marginTop: 30,
          opacity: namePop,
          transform: `translateY(${(1 - namePop) * 36}px)`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 32,
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
            marginTop: 10,
            fontFamily: SANS_FONT,
            fontWeight: 800,
            fontSize: 74,
            lineHeight: 1.04,
            letterSpacing: -1.5,
            color: FT.white,
            maxWidth: 900,
          }}
        >
          {p.productName}
        </div>
        {p.sku ? (
          <div
            style={{
              marginTop: 12,
              fontFamily: MONO_FONT,
              fontSize: 26,
              color: FT.inkMute,
            }}
          >
            Art.nr {p.sku}
          </div>
        ) : null}
      </div>

      {/* pris — skjules hvis priceNow er 0 og ingen priceBefore (HDFI/skreddersøm uten prislapp) */}
      {p.priceNow > 0 || p.priceBefore ? (
        <>
          <div
            style={{
              marginTop: 30,
              display: "flex",
              alignItems: "baseline",
              gap: 26,
              opacity: fade(frame, 50, 64, 174, 175),
            }}
          >
            {p.priceBefore ? (
              <div
                style={{
                  fontFamily: SANS_FONT,
                  fontWeight: 600,
                  fontSize: 52,
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
                fontSize: 132,
                lineHeight: 1,
                letterSpacing: -3,
                color: FT.red,
              }}
            >
              {formatNOK(price)}
            </div>
          </div>
          <div
            style={{
              marginTop: 6,
              fontFamily: MONO_FONT,
              fontSize: 26,
              letterSpacing: 2,
              color: FT.inkMute,
              opacity: fade(frame, 50, 64, 174, 175),
            }}
          >
            EKS. MVA
          </div>
        </>
      ) : (
        /* Skreddersøm-tagline når det ikke er noen pris */
        <div
          style={{
            marginTop: 30,
            fontFamily: SANS_FONT,
            fontWeight: 800,
            fontSize: 96,
            lineHeight: 1,
            letterSpacing: -1.5,
            color: FT.red,
            opacity: fade(frame, 50, 64, 174, 175),
          }}
        >
          SKREDDERSØM
        </div>
      )}
    </AbsoluteFill>
  );
};

// ── scene 3 · USP-punkter ────────────────────────────────────────────

const BulletsScene: React.FC<ProduktSpotlightProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Bullets-scene utvidet til 130 frames (~4.3s) — fadeout nær slutten
  // så folk faktisk rekker å lese alle USP-punktene.
  const o = fade(frame, 0, 14, 115, 130);
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        padding: 96,
        flexDirection: "column",
        justifyContent: "center",
        gap: 40,
      }}
    >
      <Eyebrow text="Hvorfor denne" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 30,
        }}
      >
        {p.bullets.slice(0, 4).map((b, i) => {
          const pop = spring({
            frame: frame - 10 - i * 8,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              key={b}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                opacity: pop,
                transform: `translateX(${(1 - pop) * -60}px)`,
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  background: FT.red,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: SANS_FONT,
                  fontWeight: 800,
                  fontSize: 34,
                  color: FT.white,
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  fontFamily: SANS_FONT,
                  fontWeight: 600,
                  fontSize: 46,
                  lineHeight: 1.2,
                  color: FT.white,
                }}
              >
                {b}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ── komposisjons-rot ─────────────────────────────────────────────────

export const ProduktSpotlight: React.FC<ProduktSpotlightProps> = (props) => {
  return (
    <AbsoluteFill>
      <Backdrop tone="ink" />
      <Sequence durationInFrames={80}>
        <IntroScene eyebrow={props.eyebrow} />
      </Sequence>
      <Sequence from={70} durationInFrames={175}>
        <ProductScene {...props} />
      </Sequence>
      <Sequence from={235} durationInFrames={130}>
        <BulletsScene {...props} />
      </Sequence>
      <Sequence from={355} durationInFrames={65}>
        <OutroCta ctaUrl={props.ctaUrl} wordmarkWidth={640} ctaSize={46} />
      </Sequence>
    </AbsoluteFill>
  );
};
