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
import {
  DIMENSIONS,
  SAMPLE_KAMPANJE,
  SAMPLE_LEVERANSE,
  SAMPLE_MILEPAEL,
  SAMPLE_PRODUKT,
  SAMPLE_SITAT,
  type VideoFormat,
} from "./types";

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
        durationInFrames={360}
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
    </>
  );
};
