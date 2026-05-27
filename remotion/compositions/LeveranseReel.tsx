// LeveranseReel — "Levert til [kunde]"-klipp: intro -> kunde-avsloering
// -> leveranse-bilder (Ken Burns / rutenett) -> stikkord + CTA. Foelger
// +144%-engasjement-moensteret (skreddersoem + HDFI-vinkling).

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
import type { LeveranseReelProps } from "../types";

// ── bilde-blokk (Ken Burns ved 1 bilde, rutenett ved flere) ──────────

const ImageBlock: React.FC<{
  urls: string[];
  customer: string;
  anonymous: boolean;
}> = ({ urls, customer, anonymous }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 130], [1, 1.09], {
    extrapolateRight: "clamp",
  });

  if (urls.length === 0) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(150deg, ${FT.slate}, ${FT.inkDeep})`,
          border: "2px solid rgba(255,255,255,0.10)",
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: 260,
          color: FT.red,
        }}
      >
        {anonymous ? "·" : customer.slice(0, 1).toUpperCase()}
      </div>
    );
  }

  if (urls.length === 1) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 32,
          overflow: "hidden",
          border: "2px solid rgba(255,255,255,0.10)",
        }}
      >
        <Img
          src={urls[0]}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${zoom})`,
          }}
        />
      </div>
    );
  }

  const shown = urls.slice(0, 6);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        gridTemplateColumns: shown.length === 2 ? "1fr" : "1fr 1fr",
        gridAutoRows: "1fr",
        gap: 16,
      }}
    >
      {shown.map((u, i) => (
        <div
          key={`${u}-${i}`}
          style={{
            borderRadius: 22,
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.10)",
            // 5 bilder: la nr. 5 spenne over begge kolonner i siste rad.
            ...(shown.length === 5 && i === 4
              ? { gridColumn: "1 / span 2" }
              : null),
          }}
        >
          <Img
            src={u}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ))}
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
      <div style={{ transform: `scale(${0.8 + pop * 0.2})`, display: "flex" }}>
        <Wordmark variant="color" width={640} />
      </div>
      <div style={{ transform: `translateY(${(1 - pop) * 30}px)` }}>
        <Eyebrow text={eyebrow} />
      </div>
    </AbsoluteFill>
  );
};

// ── scene 2 · kunde ──────────────────────────────────────────────────

const KundeScene: React.FC<LeveranseReelProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade(frame, 0, 14, 128, 145);
  const namePop = spring({ frame: frame - 8, fps, config: { damping: 12 } });
  const headPop = spring({ frame: frame - 34, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        padding: 96,
        flexDirection: "column",
        justifyContent: "center",
        gap: 30,
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
        }}
      >
        Levert til
      </div>
      {/* Kunde-logo — kun når brukeren har levert en, og IKKE i anonym-modus
          (logo gir bort identiteten). */}
      {!p.anonymous && p.customerLogoUrl ? (
        <div
          style={{
            padding: "14px 22px",
            background: "rgba(255,255,255,0.96)",
            borderRadius: 14,
            alignSelf: "flex-start",
            opacity: namePop,
            transform: `translateY(${(1 - namePop) * 30}px)`,
          }}
        >
          <Img
            src={p.customerLogoUrl}
            style={{
              height: 110,
              width: "auto",
              maxWidth: 460,
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>
      ) : null}
      <div
        style={{
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: p.anonymous ? 96 : 128,
          lineHeight: 0.98,
          letterSpacing: -3,
          color: p.anonymous ? FT.inkDim : FT.white,
          fontStyle: p.anonymous ? "italic" : "normal",
          opacity: namePop,
          transform: `translateY(${(1 - namePop) * 44}px)`,
        }}
      >
        {p.anonymous ? "Konfidensielt" : p.customer}
      </div>
      <div style={{ display: "flex" }}>
        <Chip label={p.industry} />
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: SANS_FONT,
          fontWeight: 700,
          fontSize: 58,
          lineHeight: 1.15,
          color: FT.white,
          maxWidth: 900,
          opacity: headPop,
          transform: `translateY(${(1 - headPop) * 36}px)`,
        }}
      >
        {p.headline}
      </div>
    </AbsoluteFill>
  );
};

// ── scene 3 · bilder ─────────────────────────────────────────────────

const BildeScene: React.FC<LeveranseReelProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade(frame, 0, 16, 112, 130);
  const pop = spring({ frame, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill style={{ opacity: o, padding: 86 }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${0.92 + pop * 0.08})`,
        }}
      >
        <ImageBlock
          urls={p.imageUrls}
          customer={p.customer}
          anonymous={p.anonymous}
        />
      </div>
    </AbsoluteFill>
  );
};

// ── scene 4 · stikkord + CTA ─────────────────────────────────────────

const AvsluttScene: React.FC<LeveranseReelProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade(frame, 0, 14, 999, 1000);
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
      <div
        style={{
          fontFamily: SANS_FONT,
          fontWeight: 600,
          fontSize: 46,
          lineHeight: 1.3,
          color: FT.inkDim,
          maxWidth: 900,
        }}
      >
        {p.description}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {p.tags.slice(0, 4).map((t, i) => {
          const pop = spring({
            frame: frame - 8 - i * 7,
            fps,
            config: { damping: 14 },
          });
          return (
            <div
              key={t}
              style={{
                opacity: pop,
                transform: `translateY(${(1 - pop) * 24}px)`,
              }}
            >
              <Chip label={t} big />
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 20,
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        <Wordmark variant="color" width={240} />
        <div
          style={{
            padding: "20px 38px",
            borderRadius: 999,
            background: FT.red,
            fontFamily: SANS_FONT,
            fontWeight: 800,
            fontSize: 38,
            color: FT.white,
          }}
        >
          {p.ctaUrl}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── komposisjons-rot ─────────────────────────────────────────────────

export const LeveranseReel: React.FC<LeveranseReelProps> = (props) => {
  return (
    <AbsoluteFill>
      <Backdrop tone="ink" />
      <Sequence durationInFrames={78}>
        <IntroScene eyebrow={props.eyebrow} />
      </Sequence>
      <Sequence from={68} durationInFrames={150}>
        <KundeScene {...props} />
      </Sequence>
      <Sequence from={208} durationInFrames={130}>
        <BildeScene {...props} />
      </Sequence>
      <Sequence from={328} durationInFrames={62}>
        <AvsluttScene {...props} />
      </Sequence>
    </AbsoluteFill>
  );
};
