import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

/**
 * Composite ekte FOSEN TOOLS wordmark PNG på AI-generert bilde.
 *
 * Hvorfor: Nano Banana 2 misstaver ofte wordmark («SUSEN TOOLS» etc), selv
 * når wordmark er sendt som referansebilde. Server-side overlay eliminerer
 * typo-risikoen helt — vi limer på den ekte PNG-en.
 *
 * Posisjon: bunn-senter, ~12% canvas-bredde, med tynn hvit rounded-frame
 * rundt (matcher FT-stil). For ink-variant (krem bg) brukes mørk wordmark.
 */

export type WordmarkVariant = "white" | "ink" | "red";

interface CompositeOptions {
  /** Hvilken wordmark-variant (bestemmes av bakgrunnen). */
  variant: WordmarkVariant;
  /** Wordmark-bredde som % av canvas-bredde. */
  widthPct?: number;
  /** Avstand fra bunn som % av canvas-høyde. */
  bottomMarginPct?: number;
  /** Skal vi tegne en tynn frame rundt wordmark? */
  drawFrame?: boolean;
}

const WORDMARK_FILES: Record<WordmarkVariant, string> = {
  white: "ft-wordmark-white.png",
  ink: "ft-wordmark-ink.png",
  red: "ft-wordmark-red.png",
};

let wordmarkCache: Partial<Record<WordmarkVariant, Buffer>> = {};

function loadWordmark(variant: WordmarkVariant): Buffer {
  const cached = wordmarkCache[variant];
  if (cached) return cached;
  const filePath = path.join(
    process.cwd(),
    "public/social/brand-assets",
    WORDMARK_FILES[variant]
  );
  if (!fs.existsSync(filePath)) {
    throw new Error(`Wordmark file mangler: ${filePath}`);
  }
  const buf = fs.readFileSync(filePath);
  wordmarkCache[variant] = buf;
  return buf;
}

export async function compositeFosenToolsWordmark(
  imageBase64: string,
  mimeType: string,
  options: CompositeOptions
): Promise<{ base64: string; mimeType: string }> {
  const widthPct = options.widthPct ?? 0.14;
  const bottomMarginPct = options.bottomMarginPct ?? 0.05;
  const drawFrame = options.drawFrame ?? true;

  const imageBuffer = Buffer.from(imageBase64, "base64");
  const baseImg = sharp(imageBuffer);
  const meta = await baseImg.metadata();
  const canvasW = meta.width ?? 1024;
  const canvasH = meta.height ?? 1024;

  // Beregn wordmark-størrelse
  const targetWordmarkW = Math.round(canvasW * widthPct);
  const wordmarkBuf = loadWordmark(options.variant);
  const wordmarkResized = await sharp(wordmarkBuf)
    .resize({ width: targetWordmarkW })
    .png()
    .toBuffer();
  const wordmarkMeta = await sharp(wordmarkResized).metadata();
  const wordmarkW = wordmarkMeta.width ?? targetWordmarkW;
  const wordmarkH = wordmarkMeta.height ?? Math.round(targetWordmarkW / 7);

  // Frame-dimensjoner: 30% padding horizontalt, 30% padding vertikalt
  const framePadX = Math.round(wordmarkW * 0.3);
  const framePadY = Math.round(wordmarkH * 0.5);
  const frameW = wordmarkW + framePadX * 2;
  const frameH = wordmarkH + framePadY * 2;

  // Posisjon: bunn-senter med margin
  const frameX = Math.round((canvasW - frameW) / 2);
  const frameY = canvasH - frameH - Math.round(canvasH * bottomMarginPct);
  const wordmarkX = frameX + framePadX;
  const wordmarkY = frameY + framePadY;

  const composites: sharp.OverlayOptions[] = [];

  if (drawFrame) {
    const frameColor = options.variant === "ink" ? "#0F1115" : "#FFFFFF";
    const radius = Math.round(frameH * 0.25);
    // Tynn rounded frame som SVG
    const frameSvg = `<svg width="${frameW}" height="${frameH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="${frameW - 2}" height="${frameH - 2}"
        rx="${radius}" ry="${radius}"
        fill="none" stroke="${frameColor}" stroke-width="1.5" />
    </svg>`;
    composites.push({
      input: Buffer.from(frameSvg),
      left: frameX,
      top: frameY,
    });
  }

  composites.push({
    input: wordmarkResized,
    left: wordmarkX,
    top: wordmarkY,
  });

  const outputBuffer = await baseImg.composite(composites).png().toBuffer();

  return {
    base64: outputBuffer.toString("base64"),
    mimeType: "image/png",
  };
}

/** Velg riktig variant basert på archetype (matcher bakgrunns-fargen). */
export function wordmarkVariantForBg(
  bgType: "red" | "ink" | "cream"
): WordmarkVariant {
  if (bgType === "cream") return "ink";
  return "white";
}
