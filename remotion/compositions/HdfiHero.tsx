// HdfiHero — dedikert HDFI-fortelling som visualiserer 3-lags-strukturen
// (FT-rød plastplate topp / hvit kontrast under / sort skum bunn) og en
// CNC-kutt-animasjon som maskinerer ut en verktøy-silhuett.
//
// 5 scener, ~16 sek totalt @ 30fps:
//   0-90    Intro       FT-logo + eyebrow + HDFI-tittel
//   90-240  Lag-reveal  3-lags exploded view med navngitte lag
//   240-360 CNC-kutt    Verktøy-silhuett maskineres ut, hvit kontur fremtre
//   360-450 USP-stack   Bullets med stagger
//   450-540 Outro       CTA + FT-wordmark + 25-årslogo
//
// Bruker `light-leak-middle.mov` som overlay i intro+outro for filmisk
// stil, og `whoosh-cinematic.wav` + `impact-boom.wav` på sentrale beats.

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  staticFile,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  OffthreadVideo,
  Easing,
} from "remotion";

import { FT, MONO_FONT, SANS_FONT, BG, WORDMARK, JUBILEUM } from "../theme";
import { fade } from "../components/shared";
import type { HdfiHeroProps } from "../types";

// ── felles helpers ──────────────────────────────────────────────────

const easeOut = Easing.out(Easing.cubic);
const easeInOut = Easing.inOut(Easing.cubic);

/** Stagger-fade for en linje med gitt index. */
const lineO = (frame: number, idx: number, startFrame: number) =>
  fade(frame, startFrame + idx * 8, startFrame + idx * 8 + 14, 9999, 10000);

// ── scene 1 · intro ──────────────────────────────────────────────────

const IntroScene: React.FC<HdfiHeroProps> = (p) => {
  const frame = useCurrentFrame();
  const o = fade(frame, 0, 12, 78, 90);

  // FT-logo gli inn fra top
  const logoY = interpolate(frame, [0, 18], [-60, 0], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const logoO = fade(frame, 0, 14, 999, 1000);

  // Eyebrow + tittel — stagger
  const eyebrowO = fade(frame, 14, 26, 999, 1000);
  const titleScale = interpolate(frame, [20, 38], [0.85, 1], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const titleO = fade(frame, 20, 36, 999, 1000);
  const taglineO = fade(frame, 36, 50, 999, 1000);

  return (
    <AbsoluteFill style={{ opacity: o, background: BG.ink }}>
      {/* Lett rød radial-glow bak tittel */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 45% 35% at 50% 50%, rgba(237,28,36,0.30), transparent 75%)",
        }}
      />

      {/* FT-logo øverst */}
      <div
        style={{
          position: "absolute",
          top: 110,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: logoO,
          transform: `translateY(${logoY}px)`,
        }}
      >
        <Img
          src={staticFile(WORDMARK.color)}
          style={{ width: 460, height: "auto", objectFit: "contain" }}
        />
      </div>

      {/* Senter-blokk */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingInline: 80,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 28,
            letterSpacing: 8,
            color: FT.red,
            fontWeight: 700,
            marginBottom: 24,
            opacity: eyebrowO,
          }}
        >
          {p.eyebrow}
        </div>

        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 340,
            lineHeight: 0.9,
            letterSpacing: -10,
            fontWeight: 800,
            color: FT.white,
            opacity: titleO,
            transform: `scale(${titleScale})`,
          }}
        >
          {p.title}
        </div>

        <div
          style={{
            marginTop: 28,
            fontFamily: SANS_FONT,
            fontSize: 38,
            fontWeight: 600,
            color: FT.inkDim,
            opacity: taglineO,
            maxWidth: 900,
            lineHeight: 1.25,
          }}
        >
          {p.tagline}
        </div>

        {/* Rød 70px-underline-signatur (matcher fosen-tools.no) */}
        <div
          style={{
            marginTop: 38,
            width: 220,
            height: 6,
            background: FT.red,
            opacity: titleO,
          }}
        />
      </AbsoluteFill>

      {/* Light-leak overlay */}
      <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.35 }}>
        <OffthreadVideo
          src={staticFile("/social/overlays/light-leak-middle.mov")}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── scene 2 · 3-lags struktur + farge-sykling ────────────────────────
//
// Viser HDFI sin oppbygging (3 lag stacket vertikalt) OG demonstrerer
// fargene ved at topp-plata + kontrast-laget skifter farge gjennom scenen.
// Skumplata (bunn) er alltid sort. Labelen oppdateres med aktiv kombo.

/** De 6 standard farge-kombinasjonene Fosen Tools faktisk leverer. */
const LAYER_COMBOS = [
  { top: FT.red, sub: "#FFFFFF", topName: "RØD", subName: "HVIT" },
  { top: "#1A1A1A", sub: "#FFFFFF", topName: "SVART", subName: "HVIT" },
  { top: "#FFFFFF", sub: "#1A1A1A", topName: "HVIT", subName: "SVART" },
  { top: "#1E5BB8", sub: "#FFFFFF", topName: "BLÅ", subName: "HVIT" },
  { top: "#F4D43A", sub: "#1A1A1A", topName: "GUL", subName: "SVART" },
  { top: "#C8C8C8", sub: "#1A1A1A", topName: "LYS GRÅ", subName: "SVART" },
];

/** Lerp mellom to hex-farger (krever 6-tegns hex som "#ED1C24"). */
function lerpHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 0xff;
  const ag = (pa >> 8) & 0xff;
  const ab = pa & 0xff;
  const br = (pb >> 16) & 0xff;
  const bg = (pb >> 8) & 0xff;
  const bb = pb & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Relativ luminans 0-1 (0=svart, 1=hvit). */
function luminance(hex: string): number {
  const p = parseInt(hex.slice(1), 16);
  const r = (p >> 16) & 0xff;
  const g = (p >> 8) & 0xff;
  const b = p & 0xff;
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

const LayersScene: React.FC<HdfiHeroProps> = (_p) => {
  const frame = useCurrentFrame();
  const sceneO = fade(frame, 0, 12, 220, 240);

  // Explode-progress: 0 → 1 over frame 25-65
  const spread = interpolate(frame, [25, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });

  // Farge-sykling: starter på frame 70, hver kombo varer 28 frames
  // (≈0.93s). Med 6 kombos → 168 frames total = scenen slutter ~frame 238.
  const cycleStart = 70;
  const comboDur = 28;
  const cycleFrame = Math.max(0, frame - cycleStart);
  const comboIdx = Math.min(
    LAYER_COMBOS.length - 1,
    Math.floor(cycleFrame / comboDur),
  );
  const nextIdx = Math.min(LAYER_COMBOS.length - 1, comboIdx + 1);
  // Lerp-progress innen aktiv kombo (0 → 1)
  const intra = (cycleFrame % comboDur) / comboDur;
  // Lerp KUN i siste 15% av komboen — gir lenger «hold» på hver farge
  // og en rask, men jevn fargeovergang ved combo-grensen.
  const lerpT = Math.max(0, Math.min(1, (intra - 0.85) / 0.15));
  const cur = LAYER_COMBOS[comboIdx];
  const nxt = LAYER_COMBOS[nextIdx];
  const topColor = lerpHex(cur.top, nxt.top, lerpT);
  const subColor = lerpHex(cur.sub, nxt.sub, lerpT);
  // Label følger CURRENT combo (snapper på combo-grensen, ikke under
  // lerp) — gir én ren tekstovergang per combo i stedet for to flicker.
  const labelComboName = `${cur.topName} / ${cur.subName}`;

  // Universell sub-tekstur: subtil highlight på topp + skygge på bunn.
  // Bruker SAMME tekstur for alle farger så vi unngår threshold-flicker
  // når subColor lerper på tvers av hvit/sort.
  const subTexture =
    "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, transparent 40%, rgba(0,0,0,0.14) 100%)";

  const headerO = fade(frame, 0, 18, 220, 240);

  // Card-dimensjoner
  const cardW = 920;
  const plateW = 480;
  const plateH = 90;
  const labelW = 380;
  const gap = 30;
  const rowH = 130;
  const yOffsets = [-spread * 70, 0, spread * 70];

  const layers = [
    {
      key: "top",
      label: "PLASTPLATE",
      bg: topColor,
      texture:
        "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, transparent 40%, rgba(0,0,0,0.14) 100%)",
    },
    {
      key: "mid",
      label: "KONTRAST",
      bg: subColor,
      texture: subTexture,
    },
    {
      key: "bot",
      label: "SKUMPLATE",
      // Løftet fra #0A til #2A for at det skal være synlig mot mørk bakgrunn
      bg: "#2A2A2A",
      // Mer markert porøs-skum-tekstur (flere prikker, lysere)
      texture:
        "radial-gradient(circle 3px at 18% 28%, rgba(255,255,255,0.18) 0%, transparent 55%), radial-gradient(circle 2.5px at 52% 62%, rgba(255,255,255,0.15) 0%, transparent 55%), radial-gradient(circle 2px at 78% 22%, rgba(255,255,255,0.13) 0%, transparent 55%), radial-gradient(circle 2.5px at 32% 75%, rgba(255,255,255,0.14) 0%, transparent 55%), radial-gradient(circle 2px at 88% 70%, rgba(255,255,255,0.12) 0%, transparent 55%), radial-gradient(circle 2px at 65% 35%, rgba(255,255,255,0.10) 0%, transparent 55%)",
    },
  ];

  // Lysere bakgrunn enn vanlig BG.ink — gir hele scenen mer pop
  const litBg = `
    radial-gradient(ellipse 70% 50% at 50% 50%, rgba(237,28,36,0.18), transparent 70%),
    radial-gradient(ellipse 60% 40% at 50% 100%, rgba(255,255,255,0.06), transparent 60%),
    ${FT.ink}
  `;

  return (
    <AbsoluteFill style={{ opacity: sceneO, background: litBg }}>
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: headerO,
          paddingInline: 80,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 26,
            letterSpacing: 8,
            color: FT.red,
            fontWeight: 700,
          }}
        >
          OPPBYGGING
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: SANS_FONT,
            fontSize: 84,
            fontWeight: 800,
            color: FT.white,
            lineHeight: 1,
            letterSpacing: -2,
            textAlign: "center",
          }}
        >
          TRE LAG. ÉN STANDARD.
        </div>
        {/* Utdypende sub-tagline (samme stil som intro-tagline) */}
        <div
          style={{
            marginTop: 22,
            fontFamily: SANS_FONT,
            fontSize: 32,
            fontWeight: 600,
            color: FT.inkDim,
            lineHeight: 1.3,
            textAlign: "center",
            maxWidth: 880,
            opacity: fade(frame, 30, 50, 220, 240),
          }}
        >
          To-farget plastplate over sort skum.
          <br />
          Topplagets farge er din 5S-identitet.
        </div>
      </div>

      {/* Lag-rader */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 320,
        }}
      >
        <div
          style={{
            position: "relative",
            width: cardW,
            height: rowH * 3 + 40,
          }}
        >
          {layers.map((layer, i) => {
            const yBase = i * rowH;
            // Smooth luminans-basert border: lyse plater får mørk rim
            // som hjelper kanten å pop'e, mørke plater får nesten ingen.
            // (Bruker luminance-funksjon i stedet for hex-equality som
            //  flicker'er når lerp-fargen passerer hvit.)
            const lum = luminance(layer.bg);
            const borderAlpha = Math.max(0, (lum - 0.5) * 0.5);
            return (
              <div
                key={layer.key}
                style={{
                  position: "absolute",
                  top: yBase + yOffsets[i],
                  left: 0,
                  width: cardW,
                  display: "flex",
                  alignItems: "center",
                  gap,
                  justifyContent: "center",
                }}
              >
                {/* Plate-visualisering */}
                <div
                  style={{
                    position: "relative",
                    width: plateW,
                    height: plateH,
                    background: layer.bg,
                    borderRadius: 6,
                    // Subtle red rim-light + smooth luminans-basert
                    // mørk-border (interpoleres jevnt med fargen, ingen flicker)
                    boxShadow: `0 22px 48px rgba(0,0,0,0.55), inset 0 -3px 0 rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,${borderAlpha.toFixed(3)}), 0 0 0 2px rgba(237,28,36,0.16), 0 0 32px rgba(237,28,36,0.12)`,
                    overflow: "hidden",
                  }}
                >
                  <AbsoluteFill style={{ background: layer.texture }} />
                </div>

                {/* Label */}
                <div style={{ width: labelW, opacity: fade(frame, 65, 85, 220, 240) }}>
                  <div
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: 22,
                      fontWeight: 700,
                      letterSpacing: 4,
                      color: FT.inkDim,
                    }}
                  >
                    {layer.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Aktiv kombo-navn nederst — oppdateres dynamisk */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: fade(frame, 70, 90, 220, 240),
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 22,
            letterSpacing: 6,
            color: FT.red,
            fontWeight: 700,
          }}
        >
          AKTIV KOMBO
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: SANS_FONT,
            fontSize: 76,
            fontWeight: 800,
            color: FT.white,
            lineHeight: 1,
            letterSpacing: -1.5,
            textAlign: "center",
          }}
        >
          {labelComboName}
        </div>
        {/* Dot-indicator: 6 prikker, aktiv prikk er FT-rød, resten dim */}
        <div style={{ display: "flex", gap: 14, marginTop: 22 }}>
          {LAYER_COMBOS.map((_, i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: i === comboIdx ? FT.red : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── scene 3 · farge-kombinasjons-grid ────────────────────────────────
//
// Viser HDFI sitt fargesystem som et 2×3-grid (6 swatches). Hver swatch
// har et topp-lag (synlig farge) og en CNC-kuttet silhuett som avslører
// sub-laget under. Labels viser farge-kombinasjonen («Rød / Hvit» osv.).
// Swatchene fader inn med stagger så seeren leser dem én etter én.

const COMBOS: Array<{ top: string; sub: string; topName: string; subName: string }> = [
  { top: "#ED1C24", sub: "#FFFFFF", topName: "Rød", subName: "Hvit" },
  { top: "#0A0A0A", sub: "#FFFFFF", topName: "Sort", subName: "Hvit" },
  { top: "#0A0A0A", sub: "#F4D43A", topName: "Sort", subName: "Gul" },
  { top: "#F4D43A", sub: "#0A0A0A", topName: "Gul", subName: "Sort" },
  { top: "#1E5BB8", sub: "#FFFFFF", topName: "Blå", subName: "Hvit" },
  { top: "#2E7D32", sub: "#FFFFFF", topName: "Grønn", subName: "Hvit" },
];

const Swatch: React.FC<{
  combo: (typeof COMBOS)[number];
  size: number;
  opacity: number;
}> = ({ combo, size, opacity }) => {
  // En stilisert «verktøy-cutout» som viser sub-laget gjennom topp-laget
  // — forenklet skrutrekker-form midt i swatchen.
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        background: combo.top,
        borderRadius: 14,
        boxShadow:
          "0 14px 30px rgba(0,0,0,0.45), inset 0 -3px 0 rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.06)",
        overflow: "hidden",
        opacity,
        border: combo.top === "#FFFFFF" ? "1px solid #ccc" : "none",
      }}
    >
      {/* Subtle highlight på topp-laget */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(155deg, rgba(255,255,255,0.10) 0%, transparent 35%)",
        }}
      />
      {/* Skrutrekker-silhuett (sub-laget «kuttet» gjennom) */}
      <svg
        viewBox="0 0 100 100"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        {/* Hovedform: håndtak + skaft + blad */}
        <path
          d="M 18 50 L 18 44 Q 18 42 20 42 L 38 42 L 38 46 L 76 46 L 80 48 L 80 52 L 76 54 L 38 54 L 38 58 L 20 58 Q 18 58 18 56 Z"
          fill={combo.sub}
        />
        {/* Innskåret kontur — markerer kantene av CNC-kuttet */}
        <path
          d="M 18 50 L 18 44 Q 18 42 20 42 L 38 42 L 38 46 L 76 46 L 80 48 L 80 52 L 76 54 L 38 54 L 38 58 L 20 58 Q 18 58 18 56 Z"
          fill="none"
          stroke={combo.top === "#0A0A0A" ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.20)"}
          strokeWidth={0.6}
        />
        {/* Inngravert art.nr-label */}
        <text
          x="50"
          y="78"
          textAnchor="middle"
          fontSize="6"
          fontFamily="monospace"
          fontWeight="700"
          fill={combo.top === "#0A0A0A" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)"}
          letterSpacing="0.8"
        >
          ART.NR
        </text>
      </svg>
    </div>
  );
};

const ColorComboScene: React.FC<HdfiHeroProps> = (_p) => {
  const frame = useCurrentFrame();
  const sceneO = fade(frame, 0, 12, 100, 120);

  const headerO = fade(frame, 0, 18, 999, 1000);

  return (
    <AbsoluteFill style={{ opacity: sceneO, background: BG.ink }}>
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: headerO,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 26,
            letterSpacing: 8,
            color: FT.red,
            fontWeight: 700,
          }}
        >
          FARGE-KOMBINASJONER
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: SANS_FONT,
            fontSize: 84,
            fontWeight: 800,
            color: FT.white,
            lineHeight: 1,
            letterSpacing: -2,
            textAlign: "center",
          }}
        >
          DITT 5S-SYSTEM
          <br />
          <span style={{ color: FT.red }}>I DIN FARGE.</span>
        </div>
      </div>

      {/* 2×3 swatch-grid */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 200,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gridTemplateRows: "repeat(3, auto)",
            gap: "60px 80px",
            width: 800,
          }}
        >
          {COMBOS.map((combo, i) => {
            // Stagger: hver swatch fader inn 6 frames etter forrige
            const start = 24 + i * 6;
            const o = fade(frame, start, start + 14, 999, 1000);
            const yShift = interpolate(frame, [start, start + 18], [20, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: easeOut,
            });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  transform: `translateY(${yShift}px)`,
                  opacity: o,
                }}
              >
                <Swatch combo={combo} size={260} opacity={1} />
                <div
                  style={{
                    fontFamily: MONO_FONT,
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: 4,
                    color: FT.white,
                    textAlign: "center",
                  }}
                >
                  {combo.topName.toUpperCase()} / {combo.subName.toUpperCase()}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── scene 4 · USP-stack ──────────────────────────────────────────────

const UspScene: React.FC<HdfiHeroProps> = (p) => {
  const frame = useCurrentFrame();
  // Utvidet til 150 frames (5s) så seeren rekker å lese alle 4 bullets
  const sceneO = fade(frame, 0, 12, 135, 150);

  // Lysere bakgrunn enn standard BG.ink — gir mer kontrast for hvit tekst
  const litBg = `
    radial-gradient(ellipse 65% 50% at 50% 30%, rgba(237,28,36,0.16), transparent 70%),
    ${FT.ink}
  `;

  return (
    <AbsoluteFill style={{ opacity: sceneO, background: litBg, padding: 96 }}>
      <AbsoluteFill
        style={{ alignItems: "center", justifyContent: "center", padding: 96 }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 26,
            letterSpacing: 8,
            color: FT.red,
            fontWeight: 700,
            marginBottom: 30,
            opacity: fade(frame, 0, 14, 999, 1000),
          }}
        >
          HVORFOR HDFI
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 32,
            width: "100%",
            maxWidth: 880,
          }}
        >
          {p.bullets.map((b, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                opacity: lineO(frame, i, 14),
                transform: `translateX(${interpolate(
                  frame,
                  [14 + i * 8, 14 + i * 8 + 16],
                  [-30, 0],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut },
                )}px)`,
              }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  background: FT.red,
                  flexShrink: 0,
                  transform: "rotate(45deg)",
                }}
              />
              <div
                style={{
                  fontFamily: SANS_FONT,
                  fontSize: 50,
                  fontWeight: 700,
                  color: FT.white,
                  lineHeight: 1.15,
                  letterSpacing: -0.5,
                }}
              >
                {b}
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── scene 5 · outro ──────────────────────────────────────────────────

const OutroScene: React.FC<HdfiHeroProps> = (p) => {
  const frame = useCurrentFrame();
  // Utvidet til 150 frames (5s) — CTA + 25-årslogo holdes lenger på skjerm
  const sceneO = fade(frame, 0, 12, 135, 150);

  // CTA gli inn nedenfra
  const ctaY = interpolate(frame, [18, 38], [40, 0], {
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const ctaO = fade(frame, 14, 32, 999, 1000);
  const jubileumO = fade(frame, 32, 50, 999, 1000);

  return (
    <AbsoluteFill style={{ opacity: sceneO, background: BG.red }}>
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          padding: 96,
          textAlign: "center",
        }}
      >
        <Img
          src={staticFile(WORDMARK.color)}
          style={{ width: 540, height: "auto", objectFit: "contain", marginBottom: 60 }}
        />

        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 30,
            letterSpacing: 8,
            color: FT.white,
            fontWeight: 700,
            opacity: ctaO,
          }}
        >
          BESØK
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: SANS_FONT,
            fontSize: 80,
            fontWeight: 800,
            color: FT.white,
            lineHeight: 1,
            letterSpacing: -2,
            opacity: ctaO,
            transform: `translateY(${ctaY}px)`,
          }}
        >
          {p.ctaUrl}
        </div>

        {/* 25-årslogo nederst */}
        <div
          style={{
            position: "absolute",
            bottom: 100,
            opacity: jubileumO,
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <Img
            src={staticFile(JUBILEUM.aar25)}
            style={{ width: 180, height: "auto", objectFit: "contain" }}
          />
        </div>
      </AbsoluteFill>

      {/* Light-leak for outro */}
      <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.28 }}>
        <OffthreadVideo
          src={staticFile("/social/overlays/light-leak-middle.mov")}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── hovedkomposisjon ─────────────────────────────────────────────────

export const HdfiHero: React.FC<HdfiHeroProps> = (props) => {
  // Scene-lengder (frames) — totalt 630 frames @ 30fps = 21s
  // - S1 intro 3s
  // - S2 lag + farge-sykling 8s
  // - S4 USPs 5s (utvidet så seeren rekker å lese)
  // - S5 outro 5s (utvidet så CTA + jubileumslogo henger lenger)
  const S1 = 90;
  const S2 = 240;
  const S4 = 150;
  const S5 = 150;

  return (
    <AbsoluteFill style={{ background: FT.inkDeep }}>
      <Sequence durationInFrames={S1}>
        <IntroScene {...props} />
        {/* Whoosh ved logo-appear */}
        <Audio src={staticFile("/social/sfx/whoosh-cinematic.wav")} volume={0.7} />
      </Sequence>

      <Sequence from={S1} durationInFrames={S2}>
        <LayersScene {...props} />
        {/* Deep impact når lagene eksploderer */}
        <Audio
          src={staticFile("/social/sfx/hit-bass.wav")}
          volume={0.45}
          startFrom={0}
        />
      </Sequence>

      <Sequence from={S1 + S2} durationInFrames={S4}>
        <UspScene {...props} />
        {/* Whoosh-deep ved scene-skifte */}
        <Audio src={staticFile("/social/sfx/whoosh-deep.wav")} volume={0.55} />
      </Sequence>

      <Sequence from={S1 + S2 + S4} durationInFrames={S5}>
        <OutroScene {...props} />
        {/* BOOM-impact ved CTA */}
        <Audio src={staticFile("/social/sfx/impact-boom.wav")} volume={0.6} />
      </Sequence>
    </AbsoluteFill>
  );
};
