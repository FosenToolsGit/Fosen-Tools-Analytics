// Remotion komposisjons-register. `npm run video:studio` aapner disse i
// Remotion Studio; render-pipelinen treffer dem via id.
//
// Hver komposisjon bruker `calculateMetadata` til aa lese `format`-feltet
// fra props og sette video-dimensjonene — saa Reel / kvadrat / bred er
// samme komposisjon, ikke tre registreringer.

import React from "react";
import { Composition } from "remotion";

import { ProduktSpotlight } from "./compositions/ProduktSpotlight";
import { LeveranseReel } from "./compositions/LeveranseReel";
import { MilepaelClip } from "./compositions/MilepaelClip";
import { KampanjeTeaser } from "./compositions/KampanjeTeaser";
import { SitatClip } from "./compositions/SitatClip";
import { HdfiHero } from "./compositions/HdfiHero";
import { KundeLeveranseV2 } from "./compositions/KundeLeveranseV2";
import { HdfiBeforeAfter } from "./compositions/HdfiBeforeAfter";
import { TeamPortrett } from "./compositions/TeamPortrett";
import { CADLABProsess } from "./compositions/CADLABProsess";
import { ReferanseSpotlight } from "./compositions/ReferanseSpotlight";
import { Definisjon } from "./compositions/Definisjon";
import { HeroPoster } from "./compositions/HeroPoster";
import { FTReferanseStory } from "./compositions/FTReferanseStory";
import { FTHDFISpotlight } from "./compositions/FTHDFISpotlight";
import { FTDefinisjonNeo } from "./compositions/FTDefinisjonNeo";
import { FTMilepaelV2 } from "./compositions/FTMilepaelV2";
import { FTSitatV2 } from "./compositions/FTSitatV2";
import { FTProsessSpotlight } from "./compositions/FTProsessSpotlight";
import { FTHDFIvsHyllevare } from "./compositions/FTHDFIvsHyllevare";
import { FTKundeResultat } from "./compositions/FTKundeResultat";
import { FTHvorforHDFI } from "./compositions/FTHvorforHDFI";
import { FTLeverandorNyhet } from "./compositions/FTLeverandorNyhet";
import {
  DIMENSIONS,
  SAMPLE_CADLAB,
  SAMPLE_DEFINISJON,
  SAMPLE_FT_DEFINISJON,
  SAMPLE_FT_HDFI,
  SAMPLE_FT_HVORFOR,
  SAMPLE_FT_KUNDERES,
  SAMPLE_FT_LEVERANDOR,
  SAMPLE_FT_MILEPAEL,
  SAMPLE_FT_PROSESS,
  SAMPLE_FT_REFERANSE,
  SAMPLE_FT_SITAT,
  SAMPLE_FT_VSHYLLEVARE,
  SAMPLE_HDFI,
  SAMPLE_HDFI_BA,
  SAMPLE_HERO_POSTER,
  SAMPLE_KAMPANJE,
  SAMPLE_KUNDE_V2,
  SAMPLE_LEVERANSE,
  SAMPLE_MILEPAEL,
  SAMPLE_PRODUKT,
  SAMPLE_REFERANSE,
  SAMPLE_SITAT,
  SAMPLE_TEAM,
  type VideoFormat,
} from "./types";
import {
  JubileumT14,
  JubileumT13,
  JubileumT12,
  JubileumT11,
  JubileumT10,
  JubileumT9,
  JubileumT8,
  JubileumT7,
  JubileumT6,
  JubileumT5,
  JubileumT4,
  JubileumT3,
  JubileumT2,
  JubileumT1,
  JubileumDagen,
  SAMPLE_T14,
  SAMPLE_T13,
  SAMPLE_T12,
  SAMPLE_T11,
  SAMPLE_T10_MILWAUKEE,
  SAMPLE_T9_WERA,
  SAMPLE_T8_SOUDAL,
  SAMPLE_T7,
  SAMPLE_T6,
  SAMPLE_T5,
  SAMPLE_T4,
  SAMPLE_T3,
  SAMPLE_T2,
  SAMPLE_T1,
  SAMPLE_DAGEN,
} from "./jubileum";

const FPS = 30;

/** Leser `format` fra props og gir dimensjonene. Delt av alle tre. */
function dimsFromFormat(props: { format: VideoFormat }): {
  width: number;
  height: number;
} {
  const d = DIMENSIONS[props.format] ?? DIMENSIONS.reel;
  return { width: d.width, height: d.height };
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ProduktSpotlight"
        component={ProduktSpotlight}
        durationInFrames={420}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_PRODUKT}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="LeveranseReel"
        component={LeveranseReel}
        durationInFrames={390}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_LEVERANSE}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="MilepaelClip"
        component={MilepaelClip}
        durationInFrames={300}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_MILEPAEL}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="KampanjeTeaser"
        component={KampanjeTeaser}
        durationInFrames={430}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_KAMPANJE}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="SitatClip"
        component={SitatClip}
        durationInFrames={300}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_SITAT}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="HdfiHero"
        component={HdfiHero}
        // 4 scener: 90 + 240 + 150 + 150 = 630 frames @ 30fps = 21s
        // (USP + outro utvidet til 5s hver så seeren rekker å lese)
        durationInFrames={630}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_HDFI}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />

      {/* ── nye Pakke 3-komposisjoner (multi-scene + audio + captions) ── */}
      <Composition
        id="KundeLeveranseV2"
        component={KundeLeveranseV2}
        // 6 scener: 60 + 60·N(bilder) + 80 + 70 = 450 frames @ 30fps = 15s
        durationInFrames={450}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_KUNDE_V2}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="HdfiBeforeAfter"
        component={HdfiBeforeAfter}
        // 4 scener: 30 + 60 + 90 + 60 = 240 frames @ 30fps = 8s
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_HDFI_BA}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="TeamPortrett"
        component={TeamPortrett}
        // 4 scener: 60 + 120 + 120 + 60 = 360 frames @ 30fps = 12s
        durationInFrames={360}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_TEAM}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="CADLABProsess"
        component={CADLABProsess}
        // 4 scener: 100 + 100 + 100 + 30 = 330 frames @ 30fps = 11s
        durationInFrames={330}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_CADLAB}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />

      {/* ── nye juni-2026-komposisjoner (matcher fosen-tools.no-DNA) ── */}
      <Composition
        id="ReferanseSpotlight"
        component={ReferanseSpotlight}
        // 1 hovedscene m/ sekvensiell fade-in, rolig zoom — 11s
        durationInFrames={330}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_REFERANSE}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="Definisjon"
        component={Definisjon}
        // Linje-for-linje fade-in på definisjon — 10s
        durationInFrames={300}
        fps={FPS}
        width={1080}
        height={1080}
        defaultProps={SAMPLE_DEFINISJON}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="HeroPoster"
        component={HeroPoster}
        // Brand-presence m/ subtil zoom — 8s
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_HERO_POSTER}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />

      {/* ── FT-pipeline (juni 2026): 4-scene-mal med Four Editors-transitions ── */}
      <Composition
        id="FTReferanseStory"
        component={FTReferanseStory}
        durationInFrames={600}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_FT_REFERANSE}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="FTHDFISpotlight"
        component={FTHDFISpotlight}
        durationInFrames={600}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_FT_HDFI}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="FTDefinisjonNeo"
        component={FTDefinisjonNeo}
        durationInFrames={630}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_FT_DEFINISJON}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="FTMilepaelV2"
        component={FTMilepaelV2}
        durationInFrames={600}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_FT_MILEPAEL}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="FTSitatV2"
        component={FTSitatV2}
        durationInFrames={600}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_FT_SITAT}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />

      {/* ── Salgs-orienterte (2026-06-02) — bygd for å SELGE HDFI ── */}
      <Composition
        id="FTProsessSpotlight"
        component={FTProsessSpotlight}
        durationInFrames={640}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_FT_PROSESS}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="FTHDFIvsHyllevare"
        component={FTHDFIvsHyllevare}
        durationInFrames={600}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_FT_VSHYLLEVARE}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="FTKundeResultat"
        component={FTKundeResultat}
        durationInFrames={600}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_FT_KUNDERES}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="FTHvorforHDFI"
        component={FTHvorforHDFI}
        durationInFrames={600}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_FT_HVORFOR}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="FTLeverandorNyhet"
        component={FTLeverandorNyhet}
        durationInFrames={600}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_FT_LEVERANDOR}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />

      {/* ── 15 jubileum-komposisjoner (26. juni 2026) ── */}
      <Composition
        id="JubileumT14"
        component={JubileumT14}
        durationInFrames={180}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_T14}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="JubileumT13"
        component={JubileumT13}
        durationInFrames={190}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_T13}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="JubileumT12"
        component={JubileumT12}
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_T12}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="JubileumT11"
        component={JubileumT11}
        durationInFrames={240}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_T11}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="JubileumT10"
        component={JubileumT10}
        durationInFrames={200}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_T10_MILWAUKEE}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="JubileumT9"
        component={JubileumT9}
        durationInFrames={200}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_T9_WERA}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="JubileumT8"
        component={JubileumT8}
        durationInFrames={200}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_T8_SOUDAL}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="JubileumT7"
        component={JubileumT7}
        durationInFrames={220}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_T7}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="JubileumT6"
        component={JubileumT6}
        durationInFrames={230}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_T6}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="JubileumT5"
        component={JubileumT5}
        durationInFrames={230}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_T5}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="JubileumT4"
        component={JubileumT4}
        durationInFrames={220}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_T4}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="JubileumT3"
        component={JubileumT3}
        durationInFrames={230}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_T3}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="JubileumT2"
        component={JubileumT2}
        durationInFrames={220}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_T2}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="JubileumT1"
        component={JubileumT1}
        durationInFrames={230}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_T1}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
      <Composition
        id="JubileumDagen"
        component={JubileumDagen}
        durationInFrames={260}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_DAGEN}
        calculateMetadata={({ props }) => dimsFromFormat(props)}
      />
    </>
  );
};
