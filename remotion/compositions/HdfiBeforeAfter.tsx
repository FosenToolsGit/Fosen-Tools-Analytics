// HdfiBeforeAfter — split-screen før/etter-klipp. Viser kontrasten
// mellom kaotisk hyllevare-skuff (FØR) og skreddersydd HDFI (ETTER).
// Den sterkeste FT-fortellingen i visuell form.
//
// 4 scener, ~240 frames @ 30fps = 8s:
//   1. "FØR" + før-bilde (0-30)
//   2. Split-reveal — vertikal sveip viser begge bilder (30-90)
//   3. Full ETTER med "HDFI" stort (90-180)
//   4. CTA outro (180-240)

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
import type { HdfiBeforeAfterProps } from "../types";

// ── stilisert fallback når bilde mangler ─────────────────────────────

const ImageOrFallback: React.FC<{
  url: string | null;
  label: "FOER" | "ETTER";
}> = ({ url, label }) => {
  if (url) {
    return (
      <Img
        src={url}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    );
  }
  // Fallback: enkel stilisert representasjon. "FØR" = kaos (mange små
  // firkanter), "ETTER" = HDFI-rute (regelmessig rutenett).
  if (label === "FOER") {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(150deg, ${FT.slate}, ${FT.inkDeep})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 36,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridAutoRows: "1fr",
            gap: 4,
            opacity: 0.55,
          }}
        >
          {Array.from({ length: 49 }).map((_, i) => {
            // Deterministisk "kaos" — IKKE Math.random (Remotion-regel).
            const skew = ((i * 37) % 13) - 6;
            const rot = ((i * 53) % 23) - 11;
            return (
              <div
                key={i}
                style={{
                  background:
                    i % 5 === 0
                      ? "rgba(237,28,36,0.4)"
                      : "rgba(255,255,255,0.16)",
                  borderRadius: 4,
                  transform: `translateY(${skew}px) rotate(${rot}deg)`,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  }
  // ETTER — ryddig HDFI-grid med rød topp-lag og verktøy-silhuetter.
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: FT.red,
        padding: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "repeat(5, 1fr)",
          gap: 14,
        }}
      >
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: FT.ink,
              borderRadius: 8,
              border: "2px solid rgba(255,255,255,0.10)",
            }}
          />
        ))}
      </div>
    </div>
  );
};

// ── scene 1 · FØR (0-30) ─────────────────────────────────────────────

const FoerScene: React.FC<HdfiBeforeAfterProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14 } });
  const o = fade(frame, 0, 8, 24, 30);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div
        style={{
          position: "absolute",
          inset: 60,
          borderRadius: 24,
          overflow: "hidden",
          border: "2px solid rgba(255,255,255,0.10)",
        }}
      >
        <ImageOrFallback url={p.beforeImageUrl} label="FOER" />
      </div>
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transform: `scale(${0.7 + pop * 0.3})`,
        }}
      >
        <div
          style={{
            padding: "28px 64px",
            background: FT.ink,
            border: `4px solid ${FT.red}`,
            fontFamily: SANS_FONT,
            fontWeight: 800,
            fontSize: 160,
            letterSpacing: -2,
            color: FT.white,
          }}
        >
          FØR
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── scene 2 · split-reveal (30-90) ───────────────────────────────────

const SplitScene: React.FC<HdfiBeforeAfterProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Vertikal sveip 0% -> 100% over 60 frames. Bruker clip-path-prosent
  // — venstre del viser før-bildet til en gitt prosent.
  const sweep = interpolate(frame, [0, 50], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const labelPop = spring({
    frame: frame - 20,
    fps,
    config: { damping: 14 },
  });
  return (
    <AbsoluteFill>
      {/* ETTER-bildet ligger underst (synes når sweep > 0) */}
      <AbsoluteFill style={{ padding: 60 }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 24,
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.10)",
          }}
        >
          <ImageOrFallback url={p.afterImageUrl} label="ETTER" />
        </div>
      </AbsoluteFill>

      {/* FØR-bildet på toppen — klippes vekk fra venstre */}
      <AbsoluteFill
        style={{
          padding: 60,
          clipPath: `inset(0 ${sweep}% 0 0)`,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 24,
            overflow: "hidden",
            border: "2px solid rgba(255,255,255,0.10)",
          }}
        >
          <ImageOrFallback url={p.beforeImageUrl} label="FOER" />
        </div>
      </AbsoluteFill>

      {/* Vertikal rød skille-linje midt i sveipen */}
      <div
        style={{
          position: "absolute",
          top: 60,
          bottom: 60,
          left: `${sweep}%`,
          width: 6,
          background: FT.red,
          transform: "translateX(-3px)",
          boxShadow: "0 0 24px rgba(237,28,36,0.55)",
        }}
      />

      {/* FØR-label (venstre) */}
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 100,
          padding: "12px 28px",
          background: "rgba(15,17,21,0.82)",
          border: `2px solid ${FT.red}`,
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: 56,
          color: FT.white,
          letterSpacing: -1,
          opacity: labelPop,
          transform: `translateY(${(1 - labelPop) * 18}px)`,
        }}
      >
        FØR
      </div>

      {/* ETTER-label (høyre) */}
      <div
        style={{
          position: "absolute",
          top: 120,
          right: 100,
          padding: "12px 28px",
          background: "rgba(237,28,36,0.92)",
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: 56,
          color: FT.white,
          letterSpacing: -1,
          opacity: labelPop,
          transform: `translateY(${(1 - labelPop) * 18}px)`,
        }}
      >
        ETTER
      </div>
    </AbsoluteFill>
  );
};

// ── scene 3 · full ETTER (90-180) ────────────────────────────────────

const EtterScene: React.FC<HdfiBeforeAfterProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade(frame, 0, 14, 80, 90);
  const hdfiPop = spring({ frame: frame - 4, fps, config: { damping: 12 } });
  const descPop = spring({ frame: frame - 30, fps, config: { damping: 14 } });
  const customerPop = spring({
    frame: frame - 50,
    fps,
    config: { damping: 14 },
  });
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div
        style={{
          position: "absolute",
          inset: 60,
          borderRadius: 24,
          overflow: "hidden",
          border: "2px solid rgba(255,255,255,0.10)",
        }}
      >
        <ImageOrFallback url={p.afterImageUrl} label="ETTER" />
      </div>
      {/* Mørk gradient nederst for å lese tekst på bildet */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          bottom: 60,
          height: "62%",
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          background:
            "linear-gradient(180deg, transparent 0%, rgba(15,17,21,0.92) 65%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          bottom: 220,
          display: "flex",
          flexDirection: "column",
          gap: 26,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontWeight: 800,
            fontSize: 280,
            lineHeight: 0.86,
            letterSpacing: -8,
            color: FT.white,
            transform: `scale(${0.7 + hdfiPop * 0.3})`,
            transformOrigin: "left bottom",
          }}
        >
          HDFI
        </div>
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: FT.red,
            opacity: customerPop,
          }}
        >
          {p.customerName}
        </div>
        <div
          style={{
            fontFamily: SANS_FONT,
            fontWeight: 600,
            fontSize: 40,
            lineHeight: 1.3,
            color: FT.white,
            maxWidth: 860,
            opacity: descPop,
            transform: `translateY(${(1 - descPop) * 22}px)`,
          }}
        >
          {p.description}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── scene 4 · outro (180-240) ────────────────────────────────────────

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
        gap: 36,
      }}
    >
      <div style={{ transform: `scale(${0.82 + pop * 0.18})` }}>
        <Wordmark variant="color" width={540} />
      </div>
      <div
        style={{
          padding: "22px 44px",
          borderRadius: 999,
          background: FT.red,
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: 42,
          color: FT.white,
          transform: `translateY(${(1 - pop) * 30}px)`,
        }}
      >
        fosen-tools.no/hdfi
      </div>
    </AbsoluteFill>
  );
};

// ── komposisjons-rot ─────────────────────────────────────────────────

export const HdfiBeforeAfter: React.FC<HdfiBeforeAfterProps> = (props) => {
  return (
    <AbsoluteFill>
      <Backdrop tone="ink" />
      <Sequence durationInFrames={30}>
        <FoerScene {...props} />
      </Sequence>
      <Sequence from={30} durationInFrames={60}>
        <SplitScene {...props} />
      </Sequence>
      <Sequence from={90} durationInFrames={90}>
        <EtterScene {...props} />
      </Sequence>
      <Sequence from={180} durationInFrames={60}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
