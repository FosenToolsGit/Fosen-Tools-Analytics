/**
 * video-render.ts — Remotion render-tjeneste (KUN server / lokal).
 *
 * Bundler remotion/-prosjektet, velger komposisjon ut fra video-type, og
 * rendrer en MP4. Importerer @remotion/bundler + @remotion/renderer som
 * starter en headless Chrome — fungerer lokalt (`npm run dev`), ikke i en
 * vanlig Vercel serverless-funksjon. Video-byggeren er derfor markert
 * «Lokal» i UI (samme mønster som SEO-innhold-byggeren).
 *
 * Dette er det ENESTE data-bevisste laget — remotion/-bundelen ser kun
 * vanlig JSON via inputProps.
 */

import os from "node:os";
import path from "node:path";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";

import { bundle } from "@remotion/bundler";
import {
  ensureBrowser,
  renderMedia,
  selectComposition,
} from "@remotion/renderer";

import {
  COMPOSITION_ID,
  DIMENSIONS,
  type VideoFormat,
  type VideoType,
} from "../../../remotion/types";

// Re-eksporter så API-ruten kan importere alt fra @/lib/services/video-render
// uten dype relative stier inn i remotion/.
export { COMPOSITION_ID, DIMENSIONS };
export type { VideoFormat, VideoType };

export type RenderVideoInput = {
  type: VideoType;
  /** Props-objektet som matcher komposisjonen (inkludert `format`). */
  data: Record<string, unknown>;
};

export type RenderVideoResult = {
  buffer: Buffer;
  width: number;
  height: number;
  durationInFrames: number;
  fps: number;
};

/**
 * Bundle-cache på modulnivå. Bundling tar 10-20s — vi gjenbruker samme
 * serveUrl på tvers av renders i samme prosess. Endrer du filer i
 * remotion/, restart dev-serveren for å bygge på nytt.
 */
let bundlePromise: Promise<string> | null = null;

function getServeUrl(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({
      entryPoint: path.resolve(process.cwd(), "remotion/index.ts"),
      // public/ må peke til Next-appens public-mappe så staticFile()
      // finner FT-wordmark + jubileumslogo.
      publicDir: path.resolve(process.cwd(), "public"),
    }).catch((err) => {
      bundlePromise = null; // la neste forsøk prøve på nytt
      throw err;
    });
  }
  return bundlePromise;
}

export async function renderVideo(
  input: RenderVideoInput,
  onProgress?: (pct: number) => void,
): Promise<RenderVideoResult> {
  const compositionId = COMPOSITION_ID[input.type];
  if (!compositionId) {
    throw new Error(`Ukjent video-type: ${input.type}`);
  }

  // Laster ned headless Chrome ved første kjøring (~95 MB, kun én gang).
  await ensureBrowser();

  const serveUrl = await getServeUrl();
  const inputProps = input.data;

  // calculateMetadata i Root.tsx leser `format` og setter dimensjonene.
  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps,
  });

  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "ft-video-"));
  const outFile = path.join(tmpDir, "out.mp4");

  try {
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation: outFile,
      inputProps,
      onProgress: ({ progress }) => onProgress?.(progress),
      // Instagram-safe output: yuv420p (TV-range) + crf 22.
      // JPEG-intermediates arver full-range farger og gir `yuvj420p` —
      // PNG-intermediates gir ren `yuv420p` som IG/TikTok-transcoderne
      // forventer. (Uten dette avviser IG noen ganger stille opploadet.)
      imageFormat: "png",
      pixelFormat: "yuv420p",
      crf: 22,
    });
    const buffer = readFileSync(outFile);
    return {
      buffer,
      width: composition.width,
      height: composition.height,
      durationInFrames: composition.durationInFrames,
      fps: composition.fps,
    };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
