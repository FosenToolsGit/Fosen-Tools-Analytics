// Remotion-inngangspunkt — registrerer komposisjons-roten. Referert av
// remotion.config.ts og render-pipelinens bundle()-kall.

import { registerRoot } from "remotion";

import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
