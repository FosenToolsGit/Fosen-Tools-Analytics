// FTLeverandorNyhet — produkt-nyhet fra Milwaukee/Wera/Husqvarna med
// FT som autorisert forhandler. Datadrevet: tar `supplierSlug` + logo
// + produkt-info, bygger ut Scene 2 automatisk.
//
//   0-90    Hook F: Leverandør Tag-in (logo + "NYHET FRA")
//   75-99   FTTransition (wipe-bright + Whoosh Deep)
//   90-470  Scene 2: Stort leverandør-logo + produktnavn + tagline,
//           USP-bullets, produktbilde med blueprint-frame, FT-stempel
//   455-485 FTTransition (light-leak-middle + Whoosh Cinematic)
//   470-600 Scene 3: FTOutroCta med leverandør-URL

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

import { AmbientLayer } from "../components/AmbientLayer";
import { FTHook } from "../components/hooks/FTHook";
import { FTBlueprintFrame } from "../components/FTBlueprintFrame";
import { FTHeadingReveal } from "../components/FTHeadingReveal";
import { FTOutroCta } from "../components/FTOutroCta";
import { FTTransition } from "../components/FTTransition";
import { MUSIC_BED_VOLUME } from "../ft-pipeline";
import { musicBed } from "../audio-registry";
import { FT, MONO_FONT, SANS_FONT } from "../theme";
import type { FTLeverandorNyhetProps } from "../types";

const LOADING_END = 90;
const SCENE_2_END = 470;
const OUTRO_START = 470;

export const FTLeverandorNyhet: React.FC<FTLeverandorNyhetProps> = ({
  supplierSlug,
  supplierName,
  supplierLogoUrl,
  productName,
  productTagline,
  bullets,
  productImageUrl,
  ctaUrl,
  eyebrowOverride,
  badgeLabel,
  musicVariant,
}) => {
  const eyebrowText = eyebrowOverride ?? "Nyhet fra";
  const badgeText = badgeLabel ?? "NYHET";
  return (
    <AbsoluteFill>
      <AmbientLayer variant="ink" />

      <Sequence from={0} durationInFrames={LOADING_END}>
        <FTHook
          kind="leverandor-tagin"
          eyebrow={eyebrowText}
          primaryText={supplierName}
          logoUrl={supplierLogoUrl}
        />
      </Sequence>

      <FTTransition from={75} kind="wipe-bright" />

      <Sequence
        from={LOADING_END - 5}
        durationInFrames={SCENE_2_END - LOADING_END + 5}
      >
        <LeverandorScene2
          supplierName={supplierName}
          supplierLogoUrl={supplierLogoUrl}
          productName={productName}
          productTagline={productTagline}
          bullets={bullets}
          productImageUrl={productImageUrl ?? null}
          badgeText={badgeText}
        />
      </Sequence>

      <FTTransition from={OUTRO_START - 15} kind="light-leak-middle" />

      <Sequence from={OUTRO_START} durationInFrames={130}>
        <FTOutroCta
          tagline={productTagline}
          url={ctaUrl ?? `fosen-tools.no/${supplierSlug}`}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

const LeverandorScene2: React.FC<{
  supplierName: string;
  supplierLogoUrl: string | null;
  productName: string;
  productTagline: string;
  bullets: string[];
  productImageUrl: string | null;
  badgeText?: string;
}> = ({ supplierName, supplierLogoUrl, productName, productTagline, bullets, productImageUrl, badgeText = "NYHET" }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const sceneT = interpolate(frame, [0, 4], [0, 1], {
    extrapolateRight: "clamp",
  });
  const logoSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, stiffness: 200 },
  });
  const taglineT = interpolate(frame, [50, 75], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const imgT = interpolate(frame, [80, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const imgScale = interpolate(frame, [80, 360], [0.96, 1.03], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bulletSpring = (i: number) =>
    spring({
      frame: frame - (160 + i * 10),
      fps,
      config: { damping: 16, stiffness: 200 },
    });

  return (
    <AbsoluteFill style={{ opacity: sceneT }}>
      {/* Leverandør-logo + badge sentralt øverst */}
      <div
        style={{
          position: "absolute",
          top: height * 0.06,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          opacity: logoSpring,
          transform: `translateY(${(1 - logoSpring) * 10}px)`,
        }}
      >
        {supplierLogoUrl ? (
          <Img
            src={supplierLogoUrl}
            style={{
              height: 195,
              maxWidth: width * 0.82,
              objectFit: "contain",
              filter: "brightness(1.1)",
            }}
          />
        ) : (
          <div
            style={{
              fontFamily: SANS_FONT,
              fontSize: 76,
              fontWeight: 800,
              color: FT.white,
              letterSpacing: 1,
            }}
          >
            {supplierName}
          </div>
        )}
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 28,
            color: FT.red,
            letterSpacing: 5,
            fontWeight: 800,
            textTransform: "uppercase",
            padding: "10px 22px",
            border: `2px solid ${FT.red}`,
            borderRadius: 2,
            background: "rgba(237, 28, 36, 0.1)",
          }}
        >
          {badgeText}
        </div>
      </div>

      {/* Produktnavn — H1 (sentrert). Auto-skalér font basert på lengde
          så lange navn ikke kolliderer med tagline. */}
      <div
        style={{
          position: "absolute",
          top: height * 0.265,
          left: width * 0.04,
          right: width * 0.04,
          display: "flex",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <FTHeadingReveal
          text={productName}
          from={25}
          fontSize={productName.length > 14 ? 64 : 84}
          maxWidth={width * 0.92}
          underlineWidthFactor={0.5}
        />
      </div>

      {/* Tagline — sentrert (over produktbilde) */}
      <div
        style={{
          position: "absolute",
          top: height * 0.395,
          left: width * 0.06,
          right: width * 0.06,
          opacity: taglineT,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 32,
            color: "rgba(255, 255, 255, 0.9)",
            fontWeight: 600,
            letterSpacing: 0.3,
            lineHeight: 1.3,
          }}
        >
          {productTagline}
        </div>
      </div>

      {/* Produktbilde-boks (under tagline, over bullets) */}
      <div
        style={{
          position: "absolute",
          top: height * 0.48,
          left: width * 0.08,
          right: width * 0.08,
          height: height * 0.28,
          background: FT.inkDeep,
          overflow: "hidden",
          opacity: imgT,
          borderRadius: 4,
        }}
      >
        {productImageUrl ? (
          <Img
            src={productImageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: `scale(${imgScale})`,
              transformOrigin: "center",
            }}
          />
        ) : (
          <LeverandorFallback supplierName={supplierName} />
        )}
        <FTBlueprintFrame from={100} inset={18} arm={50} stroke={2} />
      </div>

      {/* USP-bullets nederst */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.07,
          left: width * 0.08,
          right: width * 0.08,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {bullets.slice(0, 3).map((b, i) => {
          const t = bulletSpring(i);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                opacity: t,
                transform: `translateX(${(1 - t) * 18}px)`,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  background: FT.red,
                  flexShrink: 0,
                  boxShadow: `0 0 10px ${FT.red}aa`,
                }}
              />
              <div
                style={{
                  fontFamily: SANS_FONT,
                  fontSize: 30,
                  color: FT.white,
                  fontWeight: 600,
                  lineHeight: 1.3,
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

const LeverandorFallback: React.FC<{ supplierName: string }> = ({ supplierName }) => (
  <AbsoluteFill
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `radial-gradient(ellipse at center, rgba(255,255,255,0.04), transparent 70%), ${FT.inkDeep}`,
    }}
  >
    <div
      style={{
        fontFamily: SANS_FONT,
        fontSize: 72,
        fontWeight: 800,
        color: "rgba(255, 255, 255, 0.15)",
        letterSpacing: -2,
        textTransform: "uppercase",
      }}
    >
      {supplierName}
    </div>
  </AbsoluteFill>
);
