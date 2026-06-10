// FTProdusentBanner — statisk 10000×2500 banner for produsent-sider
// på fosen-tools.no (matcher ft-hero-scaled SlideshowTop-formatet).
//
// Design:
//   - Mørk bakgrunn med subtle radial glow
//   - Venstre 40%: produsent-logo + tagline + etablerings-år
//   - Høyre 60%: hero-bilde av produsentens produkt med diagonal mask
//   - FT-merket nederst-høyre som "forhandlet av"-indikator
//
// Brukes via `npm run produsent-banner -- --slug picard --logo ... --hero ...`
// eller direkte i Remotion Studio for design-iterasjon.

import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

import { FT, SANS_FONT, MONO_FONT } from "../theme";
import type { FTProdusentBannerProps } from "../types";

export const FTProdusentBanner: React.FC<FTProdusentBannerProps> = ({
  brandName,
  tagline,
  estYear,
  logoUrl,
  heroImageUrl,
}) => {
  // V4 bruker ikke tagline/estYear — beholdt i props for API-kompatibilitet
  void tagline; void estYear;

  return (
    <AbsoluteFill style={{ background: FT.ink, overflow: "hidden" }}>
      {/* Hero-bilde høyre side med diagonal mask (65% bredde) */}
      {heroImageUrl ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "65%",
            height: "100%",
            clipPath: "polygon(8% 0, 100% 0, 100% 100%, 0% 100%)",
            overflow: "hidden",
          }}
        >
          <Img
            src={heroImageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              filter: "saturate(1.05) contrast(1.05)",
            }}
          />
          {/* Dark gradient venstre-til-midt så tekst-overlay er lesbar */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(15,17,21,1) 0%, rgba(15,17,21,0.45) 18%, rgba(15,17,21,0.0) 45%, rgba(15,17,21,0.45) 100%)",
            }}
          />
        </div>
      ) : null}

      {/* Subtle radial red glow venstre */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 45% 80% at 18% 50%, rgba(237,28,36,0.30), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Venstre side: bare Picard-logoen med myk hvit glow bak */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Blueprint-grid bak logoen — tekniske tegneblokk-linjer som fader */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              // Vertikale + horisontale tynne linjer (cyan/teknisk hvit) hver 80px
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), " +
              "linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px), " +
              // Tykkere linje hver 400px (major grid)
              "linear-gradient(to right, rgba(255,255,255,0.10) 2px, transparent 2px), " +
              "linear-gradient(to bottom, rgba(255,255,255,0.10) 2px, transparent 2px)",
            backgroundSize: "80px 80px, 80px 80px, 400px 400px, 400px 400px",
            // Radial mask så grid fader til transparent mot kantene
            maskImage:
              "radial-gradient(ellipse 60% 75% at 50% 50%, black 20%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 60% 75% at 50% 50%, black 20%, transparent 75%)",
            pointerEvents: "none",
          }}
        />

        {/* Diagonal kryss-marker midt i grid (cross-hair, kun synlig der grid er sterk) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(135deg, transparent calc(50% - 1px), rgba(255,255,255,0.08) calc(50% - 1px), rgba(255,255,255,0.08) calc(50% + 1px), transparent calc(50% + 1px)), " +
              "linear-gradient(45deg, transparent calc(50% - 1px), rgba(255,255,255,0.08) calc(50% - 1px), rgba(255,255,255,0.08) calc(50% + 1px), transparent calc(50% + 1px))",
            maskImage:
              "radial-gradient(circle 350px at 50% 50%, black 0%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(circle 350px at 50% 50%, black 0%, transparent 100%)",
            pointerEvents: "none",
          }}
        />

        {logoUrl ? (
          // Bounding-box: respekterer både maks-bredde og maks-høyde
          // så kvadrat-logoer (Picard, Wera, Milwaukee) OG brede logoer
          // (Halder 7:1) rendres innenfor samme visuelle "ramme".
          <div
            style={{
              position: "relative",
              width: 3200,
              height: 1300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Img
              src={logoUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                // Stacked drop-shadows → ekte "outer glow" som popper på mørk bg
                filter:
                  "drop-shadow(0 0 12px rgba(255,255,255,0.45)) " +
                  "drop-shadow(0 0 30px rgba(255,255,255,0.30)) " +
                  "drop-shadow(0 0 70px rgba(255,255,255,0.15))",
                imageRendering: "auto",
              }}
            />
          </div>
        ) : (
          <div
            style={{
              position: "relative",
              fontFamily: SANS_FONT,
              fontSize: 360,
              fontWeight: 900,
              color: FT.white,
              letterSpacing: -8,
              lineHeight: 0.85,
              textTransform: "uppercase",
            }}
          >
            {brandName}
          </div>
        )}
      </div>

      {/* FT-merket nederst-høyre — "forhandlet av Fosen Tools" */}
      <div
        style={{
          position: "absolute",
          right: 220,
          bottom: 180,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 24,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 40,
            fontWeight: 700,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: 8,
            textTransform: "uppercase",
            textShadow: "0 2px 12px rgba(0,0,0,0.8)",
          }}
        >
          Forhandlet av
        </div>
        <Img
          src={staticFile("brosjyre/fosentools_logo_ny2.png")}
          style={{
            width: 720,
            height: 144,
            objectFit: "contain",
            filter: "drop-shadow(0 8px 28px rgba(0,0,0,0.7))",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
