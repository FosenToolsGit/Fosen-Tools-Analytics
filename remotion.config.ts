// Remotion CLI-config — brukt av `npm run video:studio`. Programmatiske
// renders (scripts/render-video.ts + API-ruten) sender sine egne options.

import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
