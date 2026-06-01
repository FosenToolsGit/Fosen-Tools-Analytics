// CADLABProsess — 3-scene reel som forteller HDFI-fortellingen slik den
// stoettes paa fosen-tools.no: 01 CAD-TEGNET -> 02 CNC-MASKINERT ->
// 03 KLAR FOR BRUK -> outro med CTA. Hver scene har et stort
// trinn-nummer (01/02/03), FTHeading med signatur-underline, subtekst,
// og enten et bilde eller stilisert fallback-grafikk.
//
// Total: 330 frames @ 30fps = 11 sek. Scene-grenser: 0-100 / 100-200 /
// 200-300 / 300-330.

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

import { FT, SANS_FONT } from "../theme";
import { Backdrop, Wordmark, fade } from "../components/shared";
import {
  FTCADLABStempel,
  FTHeading,
  FTLeverandorTicker,
} from "../components/ft-elements";
import type { CADLABProsessProps } from "../types";

// Re-eksporter slik at Root.tsx + scripts/render-video.ts kan importere
// SAMPLE_CADLAB direkte fra types.ts (single source of truth).
export type { CADLABProsessProps } from "../types";
export { SAMPLE_CADLAB } from "../types";

// ── felles helpers ───────────────────────────────────────────────────

/**
 * Stort trinn-nummer ("01" / "02" / "03") med roed glow og fade-in.
 * Plasseres typisk oeverst i venstre kolonne.
 */
const StepNumber: React.FC<{ value: string; frame: number }> = ({
  value,
  frame,
}) => {
  const o = fade(frame, 0, 14, 999, 1000);
  const slide = interpolate(frame, [0, 20], [-40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 18,
        opacity: o,
        transform: `translateX(${slide}px)`,
      }}
    >
      <div
        style={{
          fontFamily: SANS_FONT,
          fontWeight: 800,
          fontSize: 280,
          lineHeight: 0.82,
          letterSpacing: -10,
          color: FT.red,
          textShadow: "0 8px 60px rgba(237,28,36,0.45)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          background: FT.white,
          transform: "translateY(-30px)",
        }}
      />
    </div>
  );
};

/** Liten ramme/karusell rundt bilder eller fallback-grafikk. */
const MediaFrame: React.FC<{ children: React.ReactNode; frame: number }> = ({
  children,
  frame,
}) => {
  const pop = interpolate(frame, [6, 30], [0.92, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const o = fade(frame, 4, 22, 999, 1000);
  return (
    <div
      style={{
        position: "relative",
        width: 760,
        height: 460,
        borderRadius: 24,
        overflow: "hidden",
        border: `3px solid ${FT.red}`,
        background: FT.slate,
        opacity: o,
        transform: `scale(${pop})`,
      }}
    >
      {children}
    </div>
  );
};

/** Bilde med Ken Burns-zoom — fallback til stilisert grafikk hvis null. */
const KenBurnsOrFallback: React.FC<{
  imageUrl: string | undefined;
  frame: number;
  fallback: React.ReactNode;
}> = ({ imageUrl, frame, fallback }) => {
  const zoom = interpolate(frame, [0, 100], [1, 1.08], {
    extrapolateRight: "clamp",
  });
  if (!imageUrl) {
    return <>{fallback}</>;
  }
  return (
    <Img
      src={imageUrl}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${zoom})`,
      }}
    />
  );
};

// ── fallback-grafikker (rendres naar bilde mangler) ──────────────────

const CADBlueprintFallback: React.FC = () => {
  const frame = useCurrentFrame();
  // Tegnings-progresjon (0 -> 1) som en synlig "blueprint trekker linjer".
  const draw = interpolate(frame, [10, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const line = "rgba(255,255,255,0.32)";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(160deg, #0E2D4A 0%, #06162A 100%)`,
        overflow: "hidden",
      }}
    >
      {/* Rutenett */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          opacity: 0.55,
        }}
      />
      {/* Tegnet objekt (en stilisert HDFI-skuffe i hvit kontur) */}
      <svg
        viewBox="0 0 760 460"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <g
          fill="none"
          stroke={FT.white}
          strokeWidth={3}
          strokeDasharray={1200}
          strokeDashoffset={1200 * (1 - draw)}
        >
          <rect x={120} y={120} width={520} height={220} rx={12} />
          <rect x={160} y={160} width={140} height={70} rx={8} />
          <rect x={320} y={160} width={140} height={70} rx={8} />
          <rect x={480} y={160} width={120} height={70} rx={8} />
          <rect x={160} y={250} width={300} height={70} rx={8} />
          <rect x={480} y={250} width={120} height={70} rx={8} />
        </g>
      </svg>
    </div>
  );
};

const CNCMillingFallback: React.FC = () => {
  const frame = useCurrentFrame();
  // En "kutte-hodet" beveger seg over en plate
  const tx = interpolate(frame, [0, 100], [80, 600], {
    extrapolateRight: "clamp",
  });
  const ty = interpolate(frame, [0, 100], [120, 320], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(180deg, ${FT.slate} 0%, ${FT.inkDeep} 100%)`,
        overflow: "hidden",
      }}
    >
      {/* "skum-plate" */}
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 60,
          right: 60,
          bottom: 60,
          borderRadius: 12,
          background: "#1a1a1a",
          border: "2px solid rgba(255,255,255,0.18)",
          backgroundImage:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06), transparent 60%)",
        }}
      />
      {/* allerede kuttede silhuetter */}
      <svg
        viewBox="0 0 760 460"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <g fill="#000" stroke={FT.red} strokeWidth={2}>
          <rect x={120} y={110} width={120} height={70} rx={8} />
          <rect x={260} y={110} width={120} height={70} rx={8} />
          <rect x={120} y={200} width={260} height={70} rx={8} />
        </g>
      </svg>
      {/* CNC-hode (roed prikke + trail) */}
      <div
        style={{
          position: "absolute",
          width: 26,
          height: 26,
          left: tx,
          top: ty,
          borderRadius: 999,
          background: FT.red,
          boxShadow: "0 0 24px rgba(237,28,36,0.85)",
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
};

const FinishedHDFIFallback: React.FC = () => {
  // Ferdig HDFI-skuffe i FT-roed med svarte verktoey-utsparinger.
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: FT.red,
        padding: 30,
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: 16,
      }}
    >
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          style={{
            background: "#000",
            borderRadius: 8,
            border: "2px solid rgba(0,0,0,0.4)",
            boxShadow: "inset 0 4px 16px rgba(0,0,0,0.6)",
          }}
        />
      ))}
    </div>
  );
};

// ── felles scene-layout (split: tall+tekst venstre, bilde hoeyre) ────

const SceneLayout: React.FC<{
  step: string;
  stepLabel: string;
  heading: string;
  subtext: string;
  media: React.ReactNode;
}> = ({ step, stepLabel, heading, subtext, media }) => {
  const frame = useCurrentFrame();
  const headingPop = spring({
    frame: frame - 16,
    fps: 30,
    config: { damping: 14 },
  });
  const subO = fade(frame, 36, 56, 999, 1000);
  return (
    <AbsoluteFill
      style={{
        padding: 86,
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
      >
        <StepNumber value={step} frame={frame} />
        <div
          style={{
            fontFamily: SANS_FONT,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: FT.inkDim,
            opacity: fade(frame, 8, 22, 999, 1000),
          }}
        >
          {stepLabel}
        </div>
      </div>

      <MediaFrame frame={frame}>{media}</MediaFrame>

      <div
        style={{
          opacity: headingPop,
          transform: `translateY(${(1 - headingPop) * 30}px)`,
        }}
      >
        <FTHeading size={72} centered>
          {heading}
        </FTHeading>
      </div>

      <div
        style={{
          fontFamily: SANS_FONT,
          fontWeight: 500,
          fontSize: 32,
          lineHeight: 1.32,
          textAlign: "center",
          color: "rgba(255,255,255,0.86)",
          maxWidth: 860,
          opacity: subO,
        }}
      >
        {subtext}
      </div>
    </AbsoluteFill>
  );
};

// ── scenene ──────────────────────────────────────────────────────────

const Scene1CAD: React.FC<CADLABProsessProps> = (p) => {
  const frame = useCurrentFrame();
  return (
    <SceneLayout
      step="01"
      stepLabel="Steg én"
      heading="CAD-tegnet"
      subtext="I CADLAB på Brekstad, tegnet ned til siste millimeter."
      media={
        <KenBurnsOrFallback
          imageUrl={p.cadImageUrl}
          frame={frame}
          fallback={<CADBlueprintFallback />}
        />
      }
    />
  );
};

const Scene2CNC: React.FC<CADLABProsessProps> = (p) => {
  const frame = useCurrentFrame();
  return (
    <SceneLayout
      step="02"
      stepLabel="Steg to"
      heading="CNC-maskinert"
      subtext="Hver fordypning maskinert med 0,1 mm presisjon."
      media={
        <KenBurnsOrFallback
          imageUrl={p.cncImageUrl}
          frame={frame}
          fallback={<CNCMillingFallback />}
        />
      }
    />
  );
};

const Scene3Finished: React.FC<CADLABProsessProps> = (p) => {
  const frame = useCurrentFrame();
  const subtext = p.customerName
    ? `${p.productName} — levert til ${p.customerName}.`
    : `${p.productName} — klar for bruk.`;
  return (
    <SceneLayout
      step="03"
      stepLabel="Steg tre"
      heading="Klar for bruk"
      subtext={subtext}
      media={
        <KenBurnsOrFallback
          imageUrl={p.finishedImageUrl}
          frame={frame}
          fallback={<FinishedHDFIFallback />}
        />
      }
    />
  );
};

// ── outro ────────────────────────────────────────────────────────────

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
        <Wordmark variant="color" width={520} />
      </div>
      <FTCADLABStempel theme="dark" />
      <div
        style={{
          marginTop: 14,
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
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 18 }}>
        <FTLeverandorTicker size={22} />
      </div>
    </AbsoluteFill>
  );
};

// ── komposisjons-rot ─────────────────────────────────────────────────

export const CADLABProsess: React.FC<CADLABProsessProps> = (props) => {
  return (
    <AbsoluteFill>
      <Backdrop tone="ink" />
      <Sequence durationInFrames={100}>
        <Scene1CAD {...props} />
      </Sequence>
      <Sequence from={100} durationInFrames={100}>
        <Scene2CNC {...props} />
      </Sequence>
      <Sequence from={200} durationInFrames={100}>
        <Scene3Finished {...props} />
      </Sequence>
      <Sequence from={300} durationInFrames={30}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
