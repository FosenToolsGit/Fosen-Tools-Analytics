// ReferanseSpotlight — "Levert til [kunde]"-stil. Matcher
// som-forslag-2026-06.md seksjon 2. Bygd på +144%-engasjements-mønsteret
// (skreddersydd + HDFI + levert). Multi-aspect via format-prop.
//
// Layout:
//   - Eyebrow (rød UPPERCASE) — "LEVERT TIL [KUNDE]"
//   - H1 (Manrope 800, UPPERCASE, hvit) + 90px rød underline 6px under
//   - Produktfoto (contain, rolig 1.0 → 1.04 zoom over 5s)
//   - Body 2 linjer + pil-SVG + dato/CTA
//   - Sequentiell fade-in på hvert element

import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";

import { FT, SANS_FONT } from "../theme";
import { fade } from "../components/shared";
import {
  FTArrow,
  FTBackground,
  FTEyebrow,
  FTHeading,
} from "../components/ft-elements";
import type { ReferanseSpotlightProps, VideoFormat } from "../types";

// ── format-spesifikk skalering ───────────────────────────────────────

function dimsFor(format: VideoFormat): {
  headlineSize: number;
  eyebrowSize: number;
  bodySize: number;
  underlineWidth: number;
  underlineThickness: number;
  padding: number;
  imageMaxHeight: string;
  layout: "vertical" | "horizontal";
} {
  if (format === "wide") {
    return {
      headlineSize: 78,
      eyebrowSize: 20,
      bodySize: 30,
      underlineWidth: 120,
      underlineThickness: 6,
      padding: 96,
      imageMaxHeight: "60%",
      layout: "horizontal",
    };
  }
  if (format === "square") {
    return {
      headlineSize: 68,
      eyebrowSize: 18,
      bodySize: 30,
      underlineWidth: 100,
      underlineThickness: 6,
      padding: 80,
      imageMaxHeight: "48%",
      layout: "vertical",
    };
  }
  // reel
  return {
    headlineSize: 76,
    eyebrowSize: 22,
    bodySize: 34,
    underlineWidth: 110,
    underlineThickness: 6,
    padding: 88,
    imageMaxHeight: "50%",
    layout: "vertical",
  };
}

// ── bilde-blokk (object-fit: contain, rolig zoom) ────────────────────

const ImageBlock: React.FC<{
  url: string | null;
  format: VideoFormat;
}> = ({ url, format }) => {
  const frame = useCurrentFrame();
  // Rolig 1.0 → 1.04 over ~150 frames (5s @ 30fps)
  const zoom = interpolate(frame, [0, 150], [1.0, 1.04], {
    extrapolateRight: "clamp",
  });

  if (!url) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255,255,255,0.04)",
          border: "2px solid rgba(255,255,255,0.10)",
          borderRadius: 4,
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: format === "wide" ? 180 : 220,
          color: FT.red,
          letterSpacing: "0.1em",
        }}
      >
        FT
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        border: "2px solid rgba(255,255,255,0.10)",
        borderRadius: 4,
        background: "rgba(255,255,255,0.02)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Img
        src={url}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          objectFit: "contain",
          transform: `scale(${zoom})`,
          transformOrigin: "center",
        }}
      />
    </div>
  );
};

// ── hovedscene ───────────────────────────────────────────────────────

const MainScene: React.FC<ReferanseSpotlightProps> = (p) => {
  const frame = useCurrentFrame();
  const dims = dimsFor(p.format);

  // Sekvensiell fade-in: eyebrow 0–18, H1 18–36, bilde 36–60, body 60–84
  const oEye = fade(frame, 0, 18, 999, 1000);
  const oHead = fade(frame, 18, 36, 999, 1000);
  const oImg = fade(frame, 36, 60, 999, 1000);
  const oBody = fade(frame, 60, 84, 999, 1000);

  if (dims.layout === "horizontal") {
    // wide: 2 kolonner side om side
    return (
      <AbsoluteFill
        style={{
          padding: dims.padding,
          flexDirection: "row",
          alignItems: "stretch",
          gap: 60,
        }}
      >
        {/* Venstre: tekst */}
        <div
          style={{
            flex: "1 1 0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 28,
          }}
        >
          <div style={{ opacity: oEye }}>
            <FTEyebrow size={dims.eyebrowSize}>{p.eyebrow}</FTEyebrow>
          </div>
          <div style={{ opacity: oHead }}>
            <FTHeading
              size={dims.headlineSize}
              underlineWidth={dims.underlineWidth}
              underlineThickness={dims.underlineThickness}
            >
              {p.headline}
            </FTHeading>
          </div>
          <div style={{ opacity: oBody, marginTop: 12 }}>
            <BodyBlock
              lines={p.bodyLines}
              ctaUrl={p.ctaUrl}
              bodySize={dims.bodySize}
            />
          </div>
        </div>
        {/* Høyre: bilde */}
        <div
          style={{
            flex: "1 1 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: oImg,
          }}
        >
          <ImageBlock url={p.imageUrl} format={p.format} />
        </div>
      </AbsoluteFill>
    );
  }

  // vertical (reel / square)
  return (
    <AbsoluteFill
      style={{
        padding: dims.padding,
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 30,
      }}
    >
      {/* Topp: eyebrow + H1 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ opacity: oEye }}>
          <FTEyebrow size={dims.eyebrowSize}>{p.eyebrow}</FTEyebrow>
        </div>
        <div style={{ opacity: oHead }}>
          <FTHeading
            size={dims.headlineSize}
            underlineWidth={dims.underlineWidth}
            underlineThickness={dims.underlineThickness}
          >
            {p.headline}
          </FTHeading>
        </div>
      </div>

      {/* Midt: bilde */}
      <div
        style={{
          flex: "1 1 auto",
          minHeight: dims.imageMaxHeight,
          maxHeight: dims.imageMaxHeight,
          opacity: oImg,
        }}
      >
        <ImageBlock url={p.imageUrl} format={p.format} />
      </div>

      {/* Bunn: body + CTA */}
      <div style={{ opacity: oBody }}>
        <BodyBlock
          lines={p.bodyLines}
          ctaUrl={p.ctaUrl}
          bodySize={dims.bodySize}
        />
      </div>
    </AbsoluteFill>
  );
};

const BodyBlock: React.FC<{
  lines: string[];
  ctaUrl?: string;
  bodySize: number;
}> = ({ lines, ctaUrl, bodySize }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 18,
    }}
  >
    {lines.slice(0, 3).map((line, i) => (
      <div
        key={i}
        style={{
          fontFamily: SANS_FONT,
          fontWeight: 500,
          fontSize: bodySize,
          lineHeight: 1.45,
          color: "rgba(255,255,255,0.86)",
        }}
      >
        {line}
      </div>
    ))}
    {ctaUrl ? (
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontFamily: SANS_FONT,
          fontWeight: 700,
          fontSize: bodySize * 0.92,
          color: FT.white,
          letterSpacing: "0.04em",
        }}
      >
        <span>{ctaUrl}</span>
        <FTArrow size={bodySize * 0.9} color={FT.red} />
      </div>
    ) : null}
  </div>
);

// ── komposisjons-rot ─────────────────────────────────────────────────

export const ReferanseSpotlight: React.FC<ReferanseSpotlightProps> = (
  props,
) => {
  return (
    <AbsoluteFill>
      <FTBackground variant="ink" />
      <Sequence durationInFrames={330}>
        <MainScene {...props} />
      </Sequence>
    </AbsoluteFill>
  );
};
