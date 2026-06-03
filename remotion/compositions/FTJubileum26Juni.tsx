// FTJubileum26Juni — animert TV-loop for 25-årsjubileum + butikkåpning
// 26. juni 2026. Bygd til å kjøre på UniFi-kioskskjerm i butikken
// uten innlogging (kan også vises på Brit sin skjerm via prisplakat-
// share-token-mønsteret).
//
// Multi-format: portrait (1080×1920 stående TV) + landscape (1920×1080
// liggende TV / monitor). Velges via `format`-prop.
//
// Animasjons-beats (600 frames @ 30fps = 20 sek):
//   0-30    AmbientLayer fader inn, topp-tekst (25-ÅRSJUBILEUM) ankommer
//   30-90   Stor dato slammer inn (spring) med pulserende glow
//   90-150  Subtitle "LEVERANDØR STANDER · HOLD AV DAGEN" + tagline
//   150-240 Tids-blokk slammer inn (åpningstid + grilling) med pulse
//   240-480 8 partnere fader inn én og én (~30 frames hver)
//   480-600 Hold — kontinuerlig scanline, jubileumslogoer puster
//
// Designet for å kjøre i loop, så slutten matcher (mer eller mindre)
// starten. Subtilt scanline-pass og blueprint-pulse gjør at det ikke
// kjenner statisk.

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { AmbientLayer } from "../components/AmbientLayer";
import { FT_BRAND_MARK, MUSIC_BED_VOLUME } from "../ft-pipeline";
import { musicBed } from "../audio-registry";
import { FT, MONO_FONT, SANS_FONT } from "../theme";
import type { VideoFormat } from "../types";

export type FTJubileum26JuniProps = {
  format: VideoFormat;
  /** Dato vist stort sentralt. */
  date: string;
  /** Åpningstid, f.eks. "10:00–16:00". */
  openingHours: string;
  /** Grilling-tid, f.eks. "11:00–13:00". */
  grillingHours: string;
  /** Partnere som vises i grid (8 stk for plakat-pariltet). */
  partners: { name: string; logoUrl?: string | null }[];
  /** Skru av/på music-bed (default på). Kan dempes hvis TV har eget lyd-spor. */
  silent?: boolean;
};

export const SAMPLE_FT_JUBILEUM: FTJubileum26JuniProps = {
  format: "reel",
  date: "26. JUNI 2026",
  openingHours: "10:00–16:00",
  grillingHours: "11:00–13:00",
  // Per 2. juni 2026: bare milwaukee, wera, zweibruder er upload-et til
  // Supabase. Soudal/Picard/Halder/Red Bull/Tesla bruker tekst-fallback
  // til Adrian har upload-et de andre via scripts/upload-leverandor-logoer.mjs.
  partners: [
    { name: "MILWAUKEE", logoUrl: supabaseLogoUrl("milwaukee") },
    { name: "WERA", logoUrl: supabaseLogoUrl("wera") },
    { name: "SOUDAL", logoUrl: null },
    { name: "PICARD", logoUrl: null },
    { name: "HALDER", logoUrl: null },
    { name: "ZWEIBRÜDER", logoUrl: supabaseLogoUrl("zweibruder") },
    { name: "RED BULL", logoUrl: null },
    { name: "TESLA", logoUrl: null },
  ],
  silent: false,
};

function supabaseLogoUrl(slug: string): string {
  return `https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/social_assets/brand-assets/leverandor-logoer/${slug}.png`;
}

export const FTJubileum26Juni: React.FC<FTJubileum26JuniProps> = ({
  date,
  openingHours,
  grillingHours,
  partners,
  silent = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const isLandscape = width > height;

  // ── Animasjons-beats ──────────────────────────────────────────

  // Topp-tekst (25-ÅRSJUBILEUM · BUTIKKÅPNING)
  const topT = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Dato slam
  const dateSpring = spring({
    frame: frame - 30,
    fps: 30,
    config: { damping: 14, stiffness: 220 },
  });

  // Pulse på dato (kontinuerlig fra frame 60)
  const datePulse = 0.6 + 0.4 * Math.sin((frame - 60) * 0.075);

  // Subtitle + tagline
  const subtitleT = interpolate(frame, [90, 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineT = interpolate(frame, [110, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tids-blokk slam
  const timeSpring = spring({
    frame: frame - 150,
    fps: 30,
    config: { damping: 16, stiffness: 200 },
  });
  // Pulse på åpningstid-boksen
  const timePulse = 0.7 + 0.3 * Math.sin((frame - 180) * 0.1);

  // Partner-stagger (8 partnere fra frame 240, ~24 frames hver)
  const partnerSpring = (i: number) =>
    spring({
      frame: frame - (240 + i * 24),
      fps: 30,
      config: { damping: 14, stiffness: 200 },
    });

  // Jubileumslogoer nederst
  const jubileumLogosT = interpolate(frame, [500, 560], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Kontinuerlig scanline (sveiper sakte ned over hele loopen)
  const scanlineY = ((frame * 0.18) % 130) - 15; // -15% til 115% i % av height

  return (
    <AbsoluteFill style={{ background: FT.red }}>
      {/* Music bed (kan slås av) */}

      {/* AmbientLayer over rødflate — gir tekstur og "alive" */}
      <AbsoluteFill style={{ opacity: 0.4 }}>
        <AmbientLayer variant="ink-deep" intensity={0.4} />
      </AbsoluteFill>

      {/* Subtilt rød-gradient-shimmer */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 30% 25%, rgba(255, 255, 255, 0.08), transparent 60%), radial-gradient(ellipse 50% 50% at 75% 80%, rgba(0, 0, 0, 0.22), transparent 70%)",
        }}
      />

      {/* Scanline-sveip — kontinuerlig sakte ned */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${scanlineY}%`,
          height: 100,
          background:
            "linear-gradient(to bottom, transparent, rgba(255,255,255,0.10), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* ── Topp-tekst ── */}
      <div
        style={{
          position: "absolute",
          top: isLandscape ? height * 0.08 : height * 0.05,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: topT,
          transform: `translateY(${(1 - topT) * 12}px)`,
        }}
      >
        {/* FT-merket */}
        <Img
          src={staticFile(FT_BRAND_MARK.src)}
          style={{
            width: Math.min(width * 0.42, 420),
            height: "auto",
            objectFit: "contain",
            marginBottom: 16,
            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.4)",
          }}
        />
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: isLandscape ? 22 : 24,
            color: "rgba(255, 255, 255, 0.85)",
            letterSpacing: 6,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          25-årsjubileum · Butikkåpning
        </div>
        {/* Gull-aksent-linje */}
        <div
          style={{
            marginTop: 12,
            width: 80,
            height: 2,
            background:
              "linear-gradient(to right, transparent, #DBB78B, transparent)",
          }}
        />
      </div>

      {/* ── Stor dato ── */}
      <div
        style={{
          position: "absolute",
          top: isLandscape ? height * 0.27 : height * 0.18,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: dateSpring,
          transform: `scale(${0.84 + 0.16 * dateSpring})`,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: isLandscape ? 140 : 130,
            color: FT.white,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            lineHeight: 0.95,
            textAlign: "center",
            textShadow: `0 8px 24px rgba(0, 0, 0, 0.5), 0 0 ${30 + 30 * datePulse}px rgba(255, 255, 255, ${0.18 + 0.12 * datePulse})`,
            textTransform: "uppercase",
          }}
        >
          {date}
        </div>
      </div>

      {/* ── Subtitle ── */}
      <div
        style={{
          position: "absolute",
          top: isLandscape ? height * 0.46 : height * 0.32,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: isLandscape ? 56 : 60,
            color: FT.white,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            lineHeight: 1.05,
            textAlign: "center",
            textTransform: "uppercase",
            opacity: subtitleT,
            transform: `translateY(${(1 - subtitleT) * 10}px)`,
            maxWidth: width * 0.9,
          }}
        >
          Leverandør-stander
          <br />
          Hold av dagen
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: MONO_FONT,
            fontSize: isLandscape ? 18 : 20,
            color: "rgba(255, 255, 255, 0.78)",
            letterSpacing: 4,
            fontWeight: 500,
            textTransform: "uppercase",
            textAlign: "center",
            opacity: taglineT,
            transform: `translateY(${(1 - taglineT) * 6}px)`,
          }}
        >
          Vi feirer 25 år &amp; åpner ombygget butikk · Brekstad
        </div>
      </div>

      {/* ── Tids-blokk (åpningstid + grilling) ── */}
      <div
        style={{
          position: "absolute",
          top: isLandscape ? height * 0.62 : height * 0.46,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: isLandscape ? 32 : 20,
          opacity: timeSpring,
          transform: `translateY(${(1 - timeSpring) * 14}px)`,
        }}
      >
        <TimeCard
          icon="clock"
          label="ÅPENT"
          time={openingHours}
          pulse={timePulse}
          isLandscape={isLandscape}
        />
        <TimeCard
          icon="grill"
          label="GRILLING"
          time={grillingHours}
          pulse={timePulse}
          isLandscape={isLandscape}
        />
      </div>

      {/* ── Partner-grid på mørk seksjon ── */}
      <div
        style={{
          position: "absolute",
          bottom: isLandscape ? height * 0.04 : height * 0.04,
          left: 0,
          right: 0,
          background:
            "linear-gradient(to bottom, transparent, rgba(15, 17, 21, 0.95) 12%, rgba(15, 17, 21, 0.98))",
          padding: isLandscape
            ? "60px 80px 60px"
            : "70px 60px 60px",
        }}
      >
        {/* "MØT EKSPERTENE"-banner */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            marginBottom: 28,
            opacity: interpolate(frame, [220, 260], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              flex: 1,
              maxWidth: 80,
              height: 1,
              background:
                "linear-gradient(to right, transparent, #DBB78B)",
            }}
          />
          <div
            style={{
              fontFamily: MONO_FONT,
              fontSize: isLandscape ? 18 : 20,
              color: "#DBB78B",
              letterSpacing: 5,
              fontWeight: 600,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Møt ekspertene · Få faglig påfyll · Still spørsmål
          </div>
          <div
            style={{
              flex: 1,
              maxWidth: 80,
              height: 1,
              background:
                "linear-gradient(to left, transparent, #DBB78B)",
            }}
          />
        </div>

        {/* 4×2 partner-grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: isLandscape ? 16 : 12,
            maxWidth: width * 0.92,
            margin: "0 auto",
          }}
        >
          {partners.slice(0, 8).map((p, i) => {
            const t = partnerSpring(i);
            return (
              <PartnerCard
                key={i}
                name={p.name}
                logoUrl={p.logoUrl ?? null}
                opacity={t}
                translateY={(1 - t) * 14}
                isLandscape={isLandscape}
              />
            );
          })}
        </div>

        {/* Jubileumslogoer nederst */}
        <div
          style={{
            marginTop: isLandscape ? 28 : 32,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: isLandscape ? 48 : 36,
            opacity: jubileumLogosT,
          }}
        >
          <Img
            src={staticFile("/brosjyre/Jubileumslogo-25aar.svg")}
            style={{
              height: isLandscape ? 70 : 76,
              width: "auto",
              objectFit: "contain",
            }}
          />
          <Img
            src={staticFile("/brosjyre/Jubileumslogo-100aar.svg")}
            style={{
              height: isLandscape ? 56 : 60,
              width: "auto",
              objectFit: "contain",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Tids-kort (åpent / grilling) ────────────────────────────────

const TimeCard: React.FC<{
  icon: "clock" | "grill";
  label: string;
  time: string;
  pulse: number;
  isLandscape: boolean;
}> = ({ icon, label, time, pulse, isLandscape }) => {
  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.32)",
        border: `2px solid rgba(255, 255, 255, ${0.6 + 0.2 * pulse})`,
        borderRadius: 6,
        padding: isLandscape ? "18px 28px" : "20px 28px",
        display: "flex",
        alignItems: "center",
        gap: 18,
        boxShadow: `0 0 ${16 + 12 * pulse}px rgba(255, 255, 255, ${0.15 + 0.12 * pulse})`,
        minWidth: isLandscape ? 280 : 290,
      }}
    >
      <TimeIcon kind={icon} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 16,
            color: "rgba(255, 255, 255, 0.7)",
            letterSpacing: 4,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: isLandscape ? 30 : 32,
            color: FT.white,
            fontWeight: 700,
            letterSpacing: 0.3,
            lineHeight: 1.0,
          }}
        >
          {time}
        </div>
      </div>
    </div>
  );
};

const TimeIcon: React.FC<{ kind: "clock" | "grill" }> = ({ kind }) => {
  if (kind === "clock") {
    return (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="9.5"
          stroke="white"
          strokeWidth="1.6"
        />
        <line
          x1="12"
          y1="12"
          x2="12"
          y2="7.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="12"
          y1="12"
          x2="15.5"
          y2="13.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="12" r="1.2" fill="white" />
      </svg>
    );
  }
  // grill — flame icon
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3 C 10 6, 7.5 8, 7 11 C 6.4 14.5, 8.5 17.5, 12 18 C 15.5 17.5, 17.6 14.5, 17 11 C 16.5 8.5, 14.5 7.5, 13.5 5 C 13 4, 12.5 3.4, 12 3 Z"
        fill="white"
        opacity="0.9"
      />
      <path
        d="M12 8 C 10.8 10, 9.8 11.5, 9.5 13 C 9.2 14.8, 10.4 16.4, 12 16.6 C 13.6 16.4, 14.8 14.8, 14.5 13 C 14.2 11.5, 13.2 10, 12 8 Z"
        fill="#FFD86C"
      />
    </svg>
  );
};

// ── Partner-kort (logo eller tekst-fallback) ────────────────────

const PartnerCard: React.FC<{
  name: string;
  logoUrl: string | null;
  opacity: number;
  translateY: number;
  isLandscape: boolean;
}> = ({ name, logoUrl, opacity, translateY, isLandscape }) => {
  return (
    <div
      style={{
        background: FT.white,
        borderRadius: 6,
        padding: isLandscape ? "18px 14px" : "22px 16px",
        height: isLandscape ? 78 : 90,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `translateY(${translateY}px)`,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
      }}
    >
      {logoUrl ? (
        <Img
          src={logoUrl}
          style={{
            maxWidth: "92%",
            maxHeight: "84%",
            objectFit: "contain",
          }}
        />
      ) : (
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: isLandscape ? 22 : 24,
            color: FT.ink,
            fontWeight: 800,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          {name}
        </div>
      )}
    </div>
  );
};
