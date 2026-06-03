// FTKundeResultat — kundereferanse MED konkret tall. "0 FOD-hendelser
// på 18 måneder", "73% raskere verktøysøk". Tallet er kjernen,
// ikke et bilde av leveransen.
//
//   0-90    Hook C: Stat Shock (stort tall fyller frame)
//   75-99   FTTransition (wipe-bright + Whoosh Sweep)
//   90-450  Scene 2: kunde + bransje + tall (mindre nå),
//           beskrivelse, leveransebilde.
//   435-465 FTTransition (wipe-open-blur + Soft Sweep)
//   450-600 Scene 3: FTOutroCta

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
import { FTOutroCta } from "../components/FTOutroCta";
import { FTTransition } from "../components/FTTransition";
import { MUSIC_BED_VOLUME } from "../ft-pipeline";
import { musicBed } from "../audio-registry";
import { FT, MONO_FONT, SANS_FONT } from "../theme";
import type { FTKundeResultatProps } from "../types";

const LOADING_END = 90;
const SCENE_2_END = 450;
const OUTRO_START = 450;

export const FTKundeResultat: React.FC<FTKundeResultatProps> = ({
  customer,
  industry,
  statValue,
  statContext,
  description,
  imageUrl,
  ctaUrl,
  tagline,
}) => {
  return (
    <AbsoluteFill>
      <AmbientLayer variant="ink" />

      {/* Hook C: stat shock med tall + kontekst */}
      <Sequence from={0} durationInFrames={LOADING_END}>
        <FTHook
          kind="stat-shock"
          eyebrow={customer ? customer.toUpperCase() : industry.toUpperCase()}
          primaryText={statValue}
          secondaryText={statContext}
        />
      </Sequence>

      <FTTransition from={75} kind="wipe-bright" />

      <Sequence
        from={LOADING_END - 5}
        durationInFrames={SCENE_2_END - LOADING_END + 5}
      >
        <KundeScene2
          customer={customer}
          industry={industry}
          statValue={statValue}
          statContext={statContext}
          description={description}
          imageUrl={imageUrl ?? null}
        />
      </Sequence>

      <FTTransition from={OUTRO_START - 15} kind="wipe-open-blur" />

      <Sequence from={OUTRO_START} durationInFrames={150}>
        <FTOutroCta
          tagline={tagline ?? "Sertifisert leverandør gjennom 25 år"}
          url={ctaUrl ?? "fosen-tools.no/referanser"}
        />
      </Sequence>
    </AbsoluteFill>
  );
};

const KundeScene2: React.FC<{
  customer: string | null;
  industry: string;
  statValue: string;
  statContext: string;
  description: string;
  imageUrl: string | null;
}> = ({ customer, industry, statValue, statContext, description, imageUrl }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const sceneT = interpolate(frame, [0, 4], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Kunde-navn + bransje slammer inn
  const customerSpring = spring({
    frame: frame - 12,
    fps,
    config: { damping: 14, stiffness: 200 },
  });

  // Tallet (mindre nå enn i Hook) fader inn 40-60
  const statT = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Beskrivelse + bilde fader inn 80-120
  const descT = interpolate(frame, [80, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const imgT = interpolate(frame, [100, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const kenBurns = interpolate(frame, [100, 360], [1.0, 1.04], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: sceneT }}>
      {/* Kunde-navn + bransje øverst */}
      <div
        style={{
          position: "absolute",
          top: height * 0.08,
          left: width * 0.08,
          right: width * 0.08,
          opacity: customerSpring,
          transform: `translateY(${(1 - customerSpring) * 10}px)`,
        }}
      >
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 20,
            color: FT.red,
            letterSpacing: 6,
            fontWeight: 600,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {industry}
        </div>
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 56,
            color: FT.white,
            fontWeight: 800,
            letterSpacing: 0.3,
            lineHeight: 1.1,
          }}
        >
          {customer ?? "TIDLIGERE LEVERANSE"}
        </div>
      </div>

      {/* Tall + kontekst — mindre enn i hook, men fortsatt prominent */}
      <div
        style={{
          position: "absolute",
          top: height * 0.22,
          left: width * 0.08,
          right: width * 0.08,
          opacity: statT,
          display: "flex",
          alignItems: "baseline",
          gap: 22,
          borderTop: `1.5px solid rgba(237, 28, 36, 0.4)`,
          borderBottom: `1.5px solid rgba(237, 28, 36, 0.4)`,
          padding: "20px 0",
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 160,
            fontWeight: 800,
            color: FT.red,
            letterSpacing: -4,
            lineHeight: 0.9,
            textShadow: "0 0 36px rgba(237, 28, 36, 0.4)",
          }}
        >
          {statValue}
        </div>
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 28,
            color: FT.white,
            fontWeight: 600,
            letterSpacing: 0.3,
            lineHeight: 1.2,
          }}
        >
          {statContext}
        </div>
      </div>

      {/* Bilde-boks */}
      <div
        style={{
          position: "absolute",
          top: height * 0.43,
          left: width * 0.08,
          right: width * 0.08,
          height: height * 0.32,
          background: FT.inkDeep,
          overflow: "hidden",
          opacity: imgT,
        }}
      >
        {imageUrl ? (
          <Img
            src={imageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: `scale(${kenBurns})`,
              transformOrigin: "center",
            }}
          />
        ) : (
          <KundeFallback />
        )}
        <FTBlueprintFrame from={120} inset={16} arm={48} stroke={2} />
      </div>

      {/* Beskrivelse nederst */}
      <div
        style={{
          position: "absolute",
          bottom: height * 0.08,
          left: width * 0.08,
          right: width * 0.08,
          opacity: descT,
        }}
      >
        <div
          style={{
            fontFamily: SANS_FONT,
            fontSize: 24,
            color: "rgba(255, 255, 255, 0.85)",
            fontWeight: 500,
            lineHeight: 1.4,
            borderLeft: `3px solid ${FT.red}`,
            paddingLeft: 16,
          }}
        >
          {description}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const KundeFallback: React.FC = () => (
  <AbsoluteFill
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `radial-gradient(ellipse at center, rgba(237, 28, 36, 0.08), transparent 70%), ${FT.inkDeep}`,
    }}
  >
    <svg width="55%" height="55%" viewBox="0 0 100 60">
      <rect x={5} y={5} width={90} height={6} fill={FT.red} opacity={0.85} />
      <rect x={5} y={11} width={90} height={3} fill="#fff" opacity={0.6} />
      <rect x={5} y={14} width={90} height={40} fill="#0a0a0a" />
      <rect x={12} y={22} width={22} height={10} fill="#1a1a1a" rx={1} />
      <rect x={38} y={22} width={18} height={10} fill="#1a1a1a" rx={1} />
      <rect x={60} y={22} width={32} height={10} fill="#1a1a1a" rx={1} />
      <rect x={12} y={36} width={28} height={8} fill="#1a1a1a" rx={1} />
      <rect x={44} y={36} width={26} height={8} fill="#1a1a1a" rx={1} />
      <rect x={74} y={36} width={18} height={8} fill="#1a1a1a" rx={1} />
    </svg>
  </AbsoluteFill>
);
