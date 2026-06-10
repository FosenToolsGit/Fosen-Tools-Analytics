// FTThumbnail — statisk cover-image for FT-reels.
//
// Ikke en screenshot — designet spesifikt som thumbnail:
//   - Hero-bilde fyller hele canvas (object-fit cover) med mørkning
//   - FT-merket (rød boks) i toppen
//   - Stor headline (UPPERCASE, kondensert, hvit)
//   - Eyebrow over headline (mono, rødt)
//   - Tags-chips på bunnen
//   - Subtle rød accent-stripe under headline
//
// Brukes som cover-image for Instagram + Facebook reels. Adrian
// 9. juni 2026: «generere fine thumbnails som ser profesjonelle ut».
//
// Default canvas: 1080×1920 (vertical reel cover) — kan også rendres
// 1080×1080 (square preview) eller 1920×1080.

import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

import { FT, SANS_FONT, MONO_FONT } from "../theme";
import type { FTThumbnailProps } from "../types";

const RED_ACCENT_HEIGHT = 6;

export const FTThumbnail: React.FC<FTThumbnailProps> = ({
  imageUrl,
  eyebrow,
  headline,
  tags,
  showJubileum,
}) => {
  const headlineUpper = headline.toUpperCase();
  const eyebrowUpper = eyebrow.toUpperCase();

  return (
    <AbsoluteFill style={{ background: FT.ink, overflow: "hidden" }}>
      {/* Hero-bilde, dekker hele canvas med fokus mot midten */}
      {imageUrl ? (
        <Img
          src={imageUrl}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 38%",
            filter: "saturate(1.1) contrast(1.05)",
          }}
        />
      ) : null}

      {/* Mørk gradient bunn (60% nedover for å løfte tekst) */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(15,17,21,0.55) 0%, rgba(15,17,21,0.20) 32%, rgba(15,17,21,0.65) 65%, rgba(15,17,21,0.95) 100%)",
        }}
      />

      {/* Subtle red glow nederst */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 80% 30% at 50% 100%, rgba(237,28,36,0.30), transparent 70%)",
        }}
      />

      {/* TOPP: FT-merket + jubileums-pille */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 60,
          right: 60,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Img
          src={staticFile("brosjyre/fosentools_logo_ny2.png")}
          style={{
            width: 280,
            height: 56,
            objectFit: "contain",
            filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.45))",
          }}
        />
        {showJubileum ? (
          <div
            style={{
              fontFamily: MONO_FONT,
              fontSize: 17,
              fontWeight: 800,
              color: FT.white,
              padding: "8px 16px",
              border: `1.5px solid rgba(255,255,255,0.55)`,
              borderRadius: 999,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              background: "rgba(15,17,21,0.55)",
            }}
          >
            25 år
          </div>
        ) : null}
      </div>

      {/* MIDT: eyebrow + headline + accent-stripe */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          bottom: 280,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* Eyebrow (mono, rødt) */}
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 26,
            fontWeight: 800,
            color: FT.red,
            letterSpacing: 5,
            textTransform: "uppercase",
            textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          {eyebrowUpper}
        </div>

        {/* Headline (UPPERCASE, kondensert) */}
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: headlineUpper.length > 18 ? 110 : 140,
            fontWeight: 900,
            color: FT.white,
            lineHeight: 0.95,
            letterSpacing: -3,
            textTransform: "uppercase",
            textShadow: "0 4px 24px rgba(0,0,0,0.7)",
          }}
        >
          {headlineUpper}
        </div>

        {/* Rød accent-stripe (signatur FT-stilen) */}
        <div
          style={{
            width: 160,
            height: RED_ACCENT_HEIGHT,
            background: FT.red,
            marginTop: 4,
          }}
        />
      </div>

      {/* BUNN: Tags-chips */}
      <div
        style={{
          position: "absolute",
          left: 60,
          right: 60,
          bottom: 80,
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        {tags.map((tag) => (
          <div
            key={tag}
            style={{
              fontFamily: MONO_FONT,
              fontSize: 20,
              fontWeight: 800,
              color: FT.white,
              padding: "10px 18px",
              border: "1.5px solid rgba(255,255,255,0.45)",
              borderRadius: 4,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              background: "rgba(15,17,21,0.45)",
              backdropFilter: "blur(3px)",
            }}
          >
            {tag}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
