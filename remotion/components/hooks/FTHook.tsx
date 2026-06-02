// FTHook — singel dispatcher som velger riktig hook basert på `kind`.
// Komposisjoner bruker dette i Scene 1 så hver komposisjon kan
// overstyre åpningen mens vi har én enkel `<FTHook kind="..." />`
// kontrakt overalt.

import React from "react";

import { FTLoadingScreen } from "../FTLoadingScreen";
import { HookEyebrowSlam } from "./HookEyebrowSlam";
import { HookStatShock } from "./HookStatShock";
import { HookVisualReveal } from "./HookVisualReveal";
import { HookProcessGlimpse } from "./HookProcessGlimpse";
import { HookLeverandorTagIn } from "./HookLeverandorTagIn";
import type { HookKind, HookProps } from "./types";

export type FTHookProps = HookProps & {
  kind: HookKind;
};

export const FTHook: React.FC<FTHookProps> = ({ kind, ...rest }) => {
  switch (kind) {
    case "brand-coldopen":
      return (
        <FTLoadingScreen
          eyebrow={rest.eyebrow}
          tagline={rest.tagline}
          durationInFrames={rest.durationInFrames}
        />
      );
    case "eyebrow-slam":
      return <HookEyebrowSlam {...rest} />;
    case "stat-shock":
      return <HookStatShock {...rest} />;
    case "visual-reveal":
      return <HookVisualReveal {...rest} />;
    case "process-glimpse":
      return <HookProcessGlimpse {...rest} />;
    case "leverandor-tagin":
      return <HookLeverandorTagIn {...rest} />;
  }
};

export type { HookKind, HookProps } from "./types";
