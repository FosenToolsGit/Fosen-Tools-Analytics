import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

/**
 * Composite tekst-overlay på AI-generert bilde — server-side.
 *
 * Hvorfor: Nano Banana 2 misstaver norske bokstaver konsekvent ("Rød" → "Rod",
 * "Blå" → "Bla"), kutter ord, rendrer hex-koder som "B184C85" inn i bildet,
 * og lager duplikate wordmarks tross instruks. Vi løser dette ved å la AI
 * KUN rendre visuelle elementer (bakgrunn, decor, swatches), så
 * composite-er vi all tekst med sharp+SVG hvor norske bokstaver fungerer
 * perfekt og typografi er låst til FT-spec.
 *
 * Mønsteret er det samme som compositeFosenToolsWordmark — ekte assets på
 * topp av AI-bildet.
 */

const FONT_DIR = path.join(process.cwd(), "public/social/fonts");
let fontCache: Record<string, string | null> = {};

function loadFontBase64(filename: string): string | null {
  if (fontCache[filename] !== undefined) return fontCache[filename];
  const fp = path.join(FONT_DIR, filename);
  if (!fs.existsSync(fp)) {
    fontCache[filename] = null;
    return null;
  }
  const buf = fs.readFileSync(fp);
  const b64 = buf.toString("base64");
  fontCache[filename] = b64;
  return b64;
}

function buildFontFaceCss(): string {
  const regular = loadFontBase64("manrope-latin-400-normal.woff2");
  const bold = loadFontBase64("manrope-latin-700-normal.woff2");
  const extraBold = loadFontBase64("manrope-latin-800-normal.woff2");
  const faces: string[] = [];
  if (regular)
    faces.push(`@font-face { font-family: 'Manrope'; font-weight: 400; src: url(data:font/woff2;base64,${regular}) format('woff2'); }`);
  if (bold)
    faces.push(`@font-face { font-family: 'Manrope'; font-weight: 700; src: url(data:font/woff2;base64,${bold}) format('woff2'); }`);
  if (extraBold)
    faces.push(`@font-face { font-family: 'Manrope'; font-weight: 800; src: url(data:font/woff2;base64,${extraBold}) format('woff2'); }`);
  return faces.join("\n");
}

// =============================================================================
// Tool-silhuette SVG-paths (vises som CUTOUT i HDFI-swatches)
// viewBox 100×100, sentrert. Stilisert FT-stil — ikke fotorealistisk.
// =============================================================================

const TOOL_PATHS = {
  // Skiftenøkkel — to U-formede åpninger med håndtak
  wrench:
    "M22,30 a8,8 0 0 1 0,40 L22,55 L30,55 L30,80 L40,80 L40,55 L60,55 L60,80 L70,80 L70,55 L78,55 L78,70 a8,8 0 0 0 0,-40 L78,45 L70,45 L70,20 L60,20 L60,45 L40,45 L40,20 L30,20 L30,45 L22,45 Z",
  // Skrutrekker — håndtak (kvadrat) + skaft + flat tip
  screwdriver:
    "M42,12 L58,12 L58,40 L62,40 L62,80 L60,86 L40,86 L38,80 L38,40 L42,40 Z",
  // Tang — to symmetriske kvelver med håndtak
  pliers:
    "M30,15 L42,15 L48,50 L52,50 L58,15 L70,15 L62,55 L60,90 L40,90 L38,55 Z",
};

function getToolPath(index: number): string {
  // Variér mellom de 3 tool-formene
  const keys = ["wrench", "screwdriver", "pliers"] as const;
  return TOOL_PATHS[keys[index % keys.length]];
}

// =============================================================================
// Swatch-rendering — full HDFI-anatomi (plate + cutout + rim + foam + tool)
// =============================================================================

interface SwatchSpec {
  plateColor: string;
  rimColor: string;
  label: string;
  toolIndex: number; // hvilken tool-silhuett
}

function renderSwatch(
  x: number,
  y: number,
  w: number,
  h: number,
  swatch: SwatchSpec
): string {
  const radius = Math.round(Math.min(w, h) * 0.12);
  // Tool-cutout: midt i swatchen, ~60% bredde, ~60% høyde
  const toolW = Math.round(w * 0.6);
  const toolH = Math.round(h * 0.6);
  const toolX = x + (w - toolW) / 2;
  const toolY = y + (h - toolH) / 2;
  // Cutout-rektangel (bakgrunn for tool = rim)
  const cutoutRimPad = Math.round(Math.min(toolW, toolH) * 0.04);
  // Black foam inni (cutout-form med padding)
  const foamPad = Math.round(Math.min(toolW, toolH) * 0.05);

  const toolPath = getToolPath(swatch.toolIndex);
  // viewBox 100×100 i path — skaler til toolW × toolH
  // Strategi: bruk transform-attributet for å plassere og skalere path-en

  return `
    <!-- Plate (top layer i farge) -->
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" ry="${radius}"
          fill="${swatch.plateColor}" stroke="rgba(0,0,0,0.15)" stroke-width="1"/>

    <!-- Rim (gravering — secondary color synlig som tynn ramme) -->
    <g transform="translate(${toolX - cutoutRimPad}, ${toolY - cutoutRimPad})">
      <path d="${toolPath}" fill="${swatch.rimColor}"
            transform="scale(${(toolW + cutoutRimPad * 2) / 100}, ${(toolH + cutoutRimPad * 2) / 100})"/>
    </g>

    <!-- Black foam (innerst, der verktøyet hviler) -->
    <g transform="translate(${toolX + foamPad}, ${toolY + foamPad})">
      <path d="${toolPath}" fill="#0a0a0a"
            transform="scale(${(toolW - foamPad * 2) / 100}, ${(toolH - foamPad * 2) / 100})"/>
    </g>

    <!-- Subtil høylys på platen for 3D-effekt -->
    <rect x="${x}" y="${y}" width="${w}" height="${Math.round(h * 0.12)}"
          rx="${radius}" ry="${radius}" fill="rgba(255,255,255,0.08)"/>
  `;
}

// =============================================================================
// XML-escape
// =============================================================================

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// =============================================================================
// Headline-bygger — multi-line med red-word emphasis
// =============================================================================

/**
 * Bygger tspan-elementer for en headline der ÉT nøkkelord er rødt.
 * Headline brytes på naturlige mellomrom hvis lengre enn ~16 tegn per linje.
 */
function buildHeadlineTspans(
  headline: string,
  redWord: string | null,
  options: {
    fontSize: number;
    lineHeight: number;
    startY: number;
    x: number;
    color: string;
    redColor: string;
  }
): { svg: string; totalHeight: number; lineCount: number } {
  // Tving uppercase for FT-stil
  const upper = headline.toUpperCase();
  const redWordUpper = (redWord ?? "").toUpperCase().trim();

  // Bryt på naturlige boundaries — søk etter beste linjebrudd
  const lines = breakLines(upper, 16);

  // Bygg tspans, der eventuelt redWord rendres rødt
  const tspans: string[] = [];
  lines.forEach((line, i) => {
    const dy = i === 0 ? 0 : options.lineHeight;
    if (
      redWordUpper &&
      new RegExp(`\\b${escapeRegex(redWordUpper)}\\b`).test(line)
    ) {
      // Split linje rundt redWord
      const parts = line.split(new RegExp(`(\\b${escapeRegex(redWordUpper)}\\b)`));
      const tspanInner = parts
        .map((p) =>
          p === redWordUpper
            ? `<tspan fill="${options.redColor}">${escapeXml(p)}</tspan>`
            : escapeXml(p)
        )
        .join("");
      tspans.push(
        `<tspan x="${options.x}" dy="${dy}">${tspanInner}</tspan>`
      );
    } else {
      tspans.push(
        `<tspan x="${options.x}" dy="${dy}">${escapeXml(line)}</tspan>`
      );
    }
  });

  const svg = `<text x="${options.x}" y="${options.startY}" font-family="Manrope, 'Helvetica Neue', sans-serif" font-weight="800" font-size="${options.fontSize}" fill="${options.color}" letter-spacing="2">${tspans.join("")}</text>`;

  return {
    svg,
    totalHeight: options.lineHeight * lines.length,
    lineCount: lines.length,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Bryt en streng til linjer på ~maxChars tegn — på mellomrom-grenser.
 * Returnerer minst én linje, max 4.
 */
function breakLines(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
    if (lines.length >= 4) break;
  }
  if (current && lines.length < 4) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

// =============================================================================
// Layout-typer per archetype
// =============================================================================

/** Bounding-box for et swatch (fra Vision-detect). */
export interface SwatchBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Hvor Vision sier vi naturlig skal plassere label-tekst (sentert på cx,cy). */
  label_anchor?: {
    cx: number;
    cy: number;
    zw?: number;
    zh?: number;
    position?: "below" | "above" | "left" | "right" | "inside_bottom" | "inside_top";
  };
}

export type CompositeTextLayout =
  | {
      kind: "produkt_variant";
      headline: string;
      redWord?: string | null;
      body?: string | null;
      swatchLabels: string[]; // 6 labels, lengde matcher antall swatches
      /** Detekterte swatch-koordinater fra Vision. Hvis tom → fallback til hardkodet grid. */
      swatchBoxes?: SwatchBox[];
    }
  | {
      kind: "statement";
      headline: string;
      redWord?: string | null;
      subtagline?: string | null;
    }
  | {
      kind: "milepael";
      heroNumber: string;
      unit?: string | null;
      body?: string | null;
    };

export interface CompositeTextResult {
  base64: string;
  mimeType: string;
}

// =============================================================================
// Per-archetype overlay-bygger
// =============================================================================

function buildProdVariantOverlay(
  canvasW: number,
  canvasH: number,
  layout: Extract<CompositeTextLayout, { kind: "produkt_variant" }>
): string {
  const isLandscape = canvasW > canvasH * 1.2;
  const isPortrait = canvasH > canvasW * 1.2;
  const fontFaces = buildFontFaceCss();

  // ───────────────────────────────────────────────────────────────────────
  // HEADLINE (top — server-side rendered med Manrope + æøå)
  // ───────────────────────────────────────────────────────────────────────
  const heroFontSize = Math.round(canvasW * (isLandscape ? 0.06 : 0.085));
  const heroLineHeight = Math.round(heroFontSize * 1.1);
  const heroX = Math.round(canvasW * 0.06);
  const heroStartY = Math.round(canvasH * (isPortrait ? 0.13 : 0.15));

  const headlineBlock = buildHeadlineTspans(
    layout.headline,
    layout.redWord ?? null,
    {
      fontSize: heroFontSize,
      lineHeight: heroLineHeight,
      startY: heroStartY,
      x: heroX,
      color: "#FFFFFF",
      redColor: "#ED1C24",
    }
  );

  const accentY = heroStartY + headlineBlock.totalHeight - heroLineHeight * 0.3;
  const accentLine = `<rect x="${heroX}" y="${accentY}" width="${Math.round(canvasW * 0.08)}" height="3" fill="#ED1C24" />`;

  // ───────────────────────────────────────────────────────────────────────
  // LABELS — posisjoneres via swatch-koordinater fra Gemini Vision (Alt A).
  // Hvis koordinater finnes → bruk dem. Fallback: hardkodet 3×2 grid.
  // ───────────────────────────────────────────────────────────────────────
  const labelFontSize = Math.round(canvasW * (isLandscape ? 0.022 : 0.027));
  const labelSvgs: string[] = [];
  const labels = layout.swatchLabels.slice(0, 6);

  if (layout.swatchBoxes && layout.swatchBoxes.length > 0) {
    // PRESISJON — bruk Vision-detekterte swatch-bounds.
    // For label-Y: beregn smart slik at den ikke overlapper med rad under.
    const boxes = layout.swatchBoxes.slice(0, labels.length);

    boxes.forEach((box, i) => {
      const cx = box.x + box.w / 2;
      const swatchBottom = box.y + box.h;

      // Finn neste swatch i samme kolonne (rad N+1, samme cx)
      const sameColumn = boxes.filter(
        (b, j) =>
          j !== i &&
          Math.abs(b.x + b.w / 2 - cx) < box.w * 0.4 &&
          b.y > swatchBottom
      );
      const nextRowTop = sameColumn.length > 0
        ? Math.min(...sameColumn.map((b) => b.y))
        : canvasH; // ingen rad under → bruk canvas-bunn som limit

      const gap = nextRowTop - swatchBottom;
      const idealPadding = labelFontSize + 6;
      // Hvis gap er stor nok → standard padding under swatch
      // Hvis gap er for liten → senterer label i tilgjengelig gap
      let cy: number;
      if (gap >= idealPadding + labelFontSize) {
        // Bra plass — standard placement rett under
        cy = swatchBottom + idealPadding;
      } else {
        // Trangt — senterer label i tilgjengelig gap, med litt offset
        cy = swatchBottom + Math.max(gap * 0.55, labelFontSize * 0.85);
      }

      labelSvgs.push(
        `<text x="${cx}" y="${cy}" font-family="Manrope, 'Helvetica Neue', sans-serif" font-weight="500" font-size="${labelFontSize}" fill="#FFFFFF" text-anchor="middle">${escapeXml(labels[i] ?? "")}</text>`
      );
    });
  } else {
    // FALLBACK — hardkodet 3×2 grid (best-guess hvis Vision ikke virket)
    const gridCols = 3;
    const gridStartY = Math.round(canvasH * (isLandscape ? 0.5 : isPortrait ? 0.42 : 0.45));
    const swatchH = Math.round(canvasH * (isLandscape ? 0.32 : 0.16));
    const gridMarginX = Math.round(canvasW * 0.08);
    const usableW = canvasW - gridMarginX * 2;
    const swatchW = Math.round(usableW / gridCols);
    const gapY = Math.round(canvasH * 0.025);

    labels.forEach((label, i) => {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const cx = gridMarginX + col * swatchW + swatchW / 2;
      const cy = gridStartY + row * (swatchH + gapY) + swatchH + labelFontSize + 6;
      labelSvgs.push(
        `<text x="${cx}" y="${cy}" font-family="Manrope, 'Helvetica Neue', sans-serif" font-weight="500" font-size="${labelFontSize}" fill="#FFFFFF" text-anchor="middle">${escapeXml(label)}</text>`
      );
    });
  }

  // ───────────────────────────────────────────────────────────────────────
  // BODY (italic, nederst over wordmark-område)
  // ───────────────────────────────────────────────────────────────────────
  let bodyEl = "";
  if (layout.body) {
    const bodyFontSize = Math.round(canvasW * 0.024);
    const bodyY = Math.round(canvasH * (isLandscape ? 0.92 : 0.86));
    bodyEl = `<text x="${canvasW / 2}" y="${bodyY}" font-family="Manrope, 'Helvetica Neue', sans-serif" font-weight="400" font-style="italic" font-size="${bodyFontSize}" fill="#FFFFFF" fill-opacity="0.85" text-anchor="middle">${escapeXml(layout.body)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
  <defs>
    <style>${fontFaces}</style>
  </defs>
  ${headlineBlock.svg}
  ${accentLine}
  ${labelSvgs.join("\n  ")}
  ${bodyEl}
</svg>`;
}

function buildStatementOverlay(
  canvasW: number,
  canvasH: number,
  layout: Extract<CompositeTextLayout, { kind: "statement" }>
): string {
  const fontFaces = buildFontFaceCss();
  const isLandscape = canvasW > canvasH * 1.2;
  // Statement: hero-text fyller mesteparten av canvas
  const heroFontSize = Math.round(canvasW * (isLandscape ? 0.075 : 0.11));
  const heroLineHeight = Math.round(heroFontSize * 1.1);
  const heroX = Math.round(canvasW * 0.06);
  const heroStartY = Math.round(canvasH * 0.28);

  const headlineBlock = buildHeadlineTspans(
    layout.headline,
    layout.redWord ?? null,
    {
      fontSize: heroFontSize,
      lineHeight: heroLineHeight,
      startY: heroStartY,
      x: heroX,
      color: "#FFFFFF",
      redColor: "#ED1C24",
    }
  );

  const accentY = heroStartY + headlineBlock.totalHeight - heroLineHeight * 0.3;
  const accentLine = `<rect x="${heroX}" y="${accentY}" width="${Math.round(canvasW * 0.08)}" height="3" fill="#ED1C24" />`;

  let subEl = "";
  if (layout.subtagline) {
    const subFontSize = Math.round(canvasW * 0.028);
    const subY = Math.round(canvasH * 0.82);
    subEl = `<text x="${canvasW / 2}" y="${subY}" font-family="Manrope, 'Helvetica Neue', sans-serif" font-weight="400" font-style="italic" font-size="${subFontSize}" fill="#FFFFFF" fill-opacity="0.85" text-anchor="middle">${escapeXml(layout.subtagline)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
  <defs><style>${fontFaces}</style></defs>
  ${headlineBlock.svg}
  ${accentLine}
  ${subEl}
</svg>`;
}

function buildMilepaelOverlay(
  canvasW: number,
  canvasH: number,
  layout: Extract<CompositeTextLayout, { kind: "milepael" }>
): string {
  const fontFaces = buildFontFaceCss();
  const numFontSize = Math.round(canvasW * 0.4);
  const numX = canvasW / 2;
  const numY = Math.round(canvasH * 0.5);
  const numEl = `<text x="${numX}" y="${numY}" font-family="Manrope, 'Helvetica Neue', sans-serif" font-weight="800" font-size="${numFontSize}" fill="#FFFFFF" text-anchor="middle">${escapeXml(layout.heroNumber)}</text>`;

  let unitEl = "";
  if (layout.unit) {
    const unitFontSize = Math.round(numFontSize * 0.18);
    unitEl = `<text x="${numX + numFontSize * 0.45}" y="${numY}" font-family="Manrope, 'Helvetica Neue', sans-serif" font-weight="400" font-style="italic" font-size="${unitFontSize}" fill="#FFFFFF" text-anchor="start">${escapeXml(layout.unit)}</text>`;
  }

  let bodyEl = "";
  if (layout.body) {
    const bodyFontSize = Math.round(canvasW * 0.035);
    const bodyY = Math.round(canvasH * 0.75);
    bodyEl = `<text x="${canvasW / 2}" y="${bodyY}" font-family="Manrope, 'Helvetica Neue', sans-serif" font-weight="700" font-size="${bodyFontSize}" fill="#FFFFFF" text-anchor="middle">${escapeXml(layout.body)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">
  <defs><style>${fontFaces}</style></defs>
  ${numEl}
  ${unitEl}
  ${bodyEl}
</svg>`;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Composite tekst-overlay på et AI-generert bilde.
 *
 * Bruk: kall ETTER eventuell compositeFosenToolsWordmark (men før storage-upload).
 */
export async function compositeText(
  imageBase64: string,
  mimeType: string,
  layout: CompositeTextLayout
): Promise<CompositeTextResult> {
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const baseImg = sharp(imageBuffer);
  const meta = await baseImg.metadata();
  const canvasW = meta.width ?? 1024;
  const canvasH = meta.height ?? 1024;

  let svg: string;
  switch (layout.kind) {
    case "produkt_variant":
      svg = buildProdVariantOverlay(canvasW, canvasH, layout);
      break;
    case "statement":
      svg = buildStatementOverlay(canvasW, canvasH, layout);
      break;
    case "milepael":
      svg = buildMilepaelOverlay(canvasW, canvasH, layout);
      break;
    default:
      // Fallback: ingen overlay
      return { base64: imageBase64, mimeType };
  }

  const outputBuffer = await baseImg
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();

  return {
    base64: outputBuffer.toString("base64"),
    mimeType: "image/png",
  };
}
