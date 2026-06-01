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
import {
  DIMENSIONS,
  SAMPLE_HDFI,
  SAMPLE_KAMPANJE,
  SAMPLE_LEVERANSE,
  SAMPLE_MILEPAEL,
  SAMPLE_PRODUKT,
  SAMPLE_SITAT,
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
