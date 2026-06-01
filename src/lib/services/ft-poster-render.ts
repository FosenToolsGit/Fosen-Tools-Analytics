/**
 * ft-poster-render.ts — server-side HTML→PNG-render for FT-poster.
 *
 * Implementerer de samme tre sjangrene som Remotion-komposisjonene
 * (Referanse-spotlight, Definisjon, HeroPoster), men som STILLBILDE.
 * Brukes for «Bilde»/«Karusell»/«Story»-poster der vi ikke trenger
 * video — raskere enn å bundle Remotion for ett frame.
 *
 * Multi-aspect:
 *   - 1:1   → 1080×1080  (Facebook / Instagram feed)
 *   - 4:5   → 1080×1350  (Instagram portrett)
 *   - 16:9  → 1920×1080  (LinkedIn / desktop)
 *
 * Bruker Manrope-font + Playwright (samme pattern som
 * produkt-variant-render.ts).
 */

import {
  FT,
  escapeHtml,
  renderHtmlToPng,
  fontFaceCss,
  wordmarkDataUrl,
} from "./render-common";

// =============================================================================
// Aspect-mapping
// =============================================================================

export type PosterAspect = "1:1" | "4:5" | "16:9";

export const POSTER_DIMS: Record<PosterAspect, { w: number; h: number }> = {
  "1:1": { w: 1080, h: 1080 },
  "4:5": { w: 1080, h: 1350 },
  "16:9": { w: 1920, h: 1080 },
};

// =============================================================================
// FT-pil-SVG som inline-streng
// =============================================================================

function ftArrowSvg(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="display:inline-block;vertical-align:middle;">
    <path d="M16.4133 6L15.5553 6.92298L19.6739 11.3473H2V12.6527H19.6739L15.5541 17.077L16.4145 18L22 12L16.4145 6H16.4133Z" fill="${color}"/>
  </svg>`;
}

// =============================================================================
// Referanse-poster
// =============================================================================

export type ReferansePosterInput = {
  aspect: PosterAspect;
  eyebrow: string; // "LEVERT TIL ANDØYA SPACE"
  headline: string; // "SKREDDERSYDD HDFI"
  imageUrl: string | null; // produktfoto
  bodyLines: string[];
  ctaUrl?: string;
};

function refDims(aspect: PosterAspect) {
  if (aspect === "16:9") {
    return {
      headlineSize: 72,
      eyebrowSize: 22,
      bodySize: 26,
      underlineWidth: 120,
      underlineThickness: 6,
      padding: 72,
      layout: "horizontal" as const,
    };
  }
  if (aspect === "1:1") {
    return {
      headlineSize: 62,
      eyebrowSize: 20,
      bodySize: 26,
      underlineWidth: 100,
      underlineThickness: 6,
      padding: 68,
      layout: "vertical" as const,
    };
  }
  // 4:5
  return {
    headlineSize: 72,
    eyebrowSize: 22,
    bodySize: 30,
    underlineWidth: 110,
    underlineThickness: 6,
    padding: 80,
    layout: "vertical" as const,
  };
}

function commonStyles(): string {
  return `${fontFaceCss()}
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:100%;height:100%;}
  body{font-family:'Manrope',-apple-system,sans-serif;color:${FT.white};
    background:radial-gradient(ellipse 60% 55% at 18% 12%, rgba(237,28,36,0.20), transparent 70%), ${FT.ink};
    overflow:hidden;position:relative;}
  .grid-overlay{position:absolute;inset:0;
    background-image:linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
    background-size:120px 120px;opacity:0.45;}
  .eyebrow{font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${FT.red};line-height:1;}
  .h1{font-weight:800;letter-spacing:0.04em;text-transform:uppercase;line-height:1.05;color:${FT.white};}
  .underline{background:${FT.red};margin-top:18px;}
  .body{font-weight:500;color:rgba(255,255,255,0.88);line-height:1.45;}
  .cta{display:inline-flex;align-items:center;gap:12px;font-weight:700;color:${FT.white};letter-spacing:0.04em;}
  .img-wrap{display:flex;align-items:center;justify-content:center;
    border:2px solid rgba(255,255,255,0.10);border-radius:4px;
    background:rgba(255,255,255,0.02);overflow:hidden;}
  .img-wrap img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;}
  .img-fallback{font-weight:800;color:${FT.red};letter-spacing:0.1em;}`;
}

function imageBlock(url: string | null, fallbackSize: number): string {
  if (!url) {
    return `<div class="img-wrap" style="width:100%;height:100%;"><div class="img-fallback" style="font-size:${fallbackSize}px;">FT</div></div>`;
  }
  return `<div class="img-wrap" style="width:100%;height:100%;"><img src="${escapeHtml(
    url,
  )}" alt=""/></div>`;
}

export async function renderReferansePoster(
  input: ReferansePosterInput,
): Promise<{ base64: string; mimeType: string }> {
  const { w, h } = POSTER_DIMS[input.aspect];
  const d = refDims(input.aspect);
  const bodyHtml = input.bodyLines
    .slice(0, 3)
    .map(
      (l) =>
        `<div style="font-size:${d.bodySize}px;">${escapeHtml(l)}</div>`,
    )
    .join("");
  const ctaHtml = input.ctaUrl
    ? `<div class="cta" style="font-size:${Math.round(d.bodySize * 0.92)}px;margin-top:14px;">
        <span>${escapeHtml(input.ctaUrl)}</span>${ftArrowSvg(
          Math.round(d.bodySize * 0.9),
          FT.red,
        )}</div>`
    : "";

  let content: string;
  if (d.layout === "horizontal") {
    content = `
      <div style="position:relative;width:100%;height:100%;padding:${d.padding}px;
        display:flex;flex-direction:row;gap:60px;align-items:stretch;">
        <div style="flex:1 1 0;display:flex;flex-direction:column;justify-content:center;gap:28px;">
          <div class="eyebrow" style="font-size:${d.eyebrowSize}px;">${escapeHtml(input.eyebrow)}</div>
          <div>
            <div class="h1" style="font-size:${d.headlineSize}px;">${escapeHtml(input.headline)}</div>
            <div class="underline" style="width:${d.underlineWidth}px;height:${d.underlineThickness}px;"></div>
          </div>
          <div class="body" style="margin-top:12px;display:flex;flex-direction:column;gap:14px;">
            ${bodyHtml}${ctaHtml}
          </div>
        </div>
        <div style="flex:1 1 0;display:flex;align-items:center;justify-content:center;">
          ${imageBlock(input.imageUrl, 180)}
        </div>
      </div>`;
  } else {
    content = `
      <div style="position:relative;width:100%;height:100%;padding:${d.padding}px;
        display:flex;flex-direction:column;justify-content:space-between;gap:30px;">
        <div style="display:flex;flex-direction:column;gap:24px;">
          <div class="eyebrow" style="font-size:${d.eyebrowSize}px;">${escapeHtml(input.eyebrow)}</div>
          <div>
            <div class="h1" style="font-size:${d.headlineSize}px;">${escapeHtml(input.headline)}</div>
            <div class="underline" style="width:${d.underlineWidth}px;height:${d.underlineThickness}px;"></div>
          </div>
        </div>
        <div style="flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;">
          ${imageBlock(input.imageUrl, 220)}
        </div>
        <div class="body" style="display:flex;flex-direction:column;gap:14px;">
          ${bodyHtml}${ctaHtml}
        </div>
      </div>`;
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${commonStyles()}</style></head><body>
    <div class="grid-overlay"></div>
    ${content}
  </body></html>`;

  return await renderHtmlToPng(html, w, h);
}

// =============================================================================
// Definisjon-poster (krem-bg)
// =============================================================================

export type DefinisjonPosterInput = {
  aspect: PosterAspect;
  eyebrow: string;
  headline: string;
  bodyLines: string[];
};

function defDims(aspect: PosterAspect) {
  if (aspect === "16:9") {
    return {
      headlineSize: 56,
      eyebrowSize: 20,
      bodySize: 26,
      underlineWidth: 130,
      maxWidth: 1200,
      padding: 80,
    };
  }
  if (aspect === "1:1") {
    return {
      headlineSize: 50,
      eyebrowSize: 18,
      bodySize: 24,
      underlineWidth: 110,
      maxWidth: 900,
      padding: 80,
    };
  }
  return {
    headlineSize: 58,
    eyebrowSize: 22,
    bodySize: 28,
    underlineWidth: 120,
    maxWidth: 900,
    padding: 96,
  };
}

export async function renderDefinisjonPoster(
  input: DefinisjonPosterInput,
): Promise<{ base64: string; mimeType: string }> {
  const { w, h } = POSTER_DIMS[input.aspect];
  const d = defDims(input.aspect);

  const bodyHtml = input.bodyLines
    .slice(0, 5)
    .map(
      (l) =>
        `<div style="font-size:${d.bodySize}px;font-weight:500;line-height:1.6;color:#222;text-align:center;letter-spacing:0.01em;">${escapeHtml(l)}</div>`,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  ${fontFaceCss()}
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:100%;height:100%;}
  body{font-family:'Manrope',-apple-system,sans-serif;background:#F5F7FA;color:${FT.ink};overflow:hidden;}
  </style></head><body>
    <div style="width:100%;height:100%;padding:${d.padding}px;display:flex;align-items:center;justify-content:center;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:50px;max-width:${d.maxWidth}px;width:100%;">
        <div style="font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${FT.red};font-size:${d.eyebrowSize}px;line-height:1;">
          ${escapeHtml(input.eyebrow)}
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:22px;">
          <div style="font-weight:800;letter-spacing:0.04em;text-transform:uppercase;line-height:1.08;color:${FT.ink};text-align:center;font-size:${d.headlineSize}px;">
            ${escapeHtml(input.headline)}
          </div>
          <div style="width:${d.underlineWidth}px;height:6px;background:${FT.red};"></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:14px;align-items:center;">
          ${bodyHtml}
        </div>
      </div>
    </div>
  </body></html>`;

  return await renderHtmlToPng(html, w, h);
}

// =============================================================================
// Hero-poster (med bilde-bakgrunn)
// =============================================================================

export type HeroPosterImageInput = {
  aspect: PosterAspect;
  imageUrl?: string;
  brand: string;
  tagline: string;
  ctaText?: string;
};

function heroDims(aspect: PosterAspect) {
  if (aspect === "16:9") {
    return {
      brandSize: 64,
      taglineSize: 28,
      ctaSize: 24,
      stripeWidth: 70,
      padding: 72,
    };
  }
  if (aspect === "1:1") {
    return {
      brandSize: 54,
      taglineSize: 26,
      ctaSize: 22,
      stripeWidth: 60,
      padding: 64,
    };
  }
  return {
    brandSize: 64,
    taglineSize: 28,
    ctaSize: 26,
    stripeWidth: 70,
    padding: 80,
  };
}

export async function renderHeroPoster(
  input: HeroPosterImageInput,
): Promise<{ base64: string; mimeType: string }> {
  const { w, h } = POSTER_DIMS[input.aspect];
  const d = heroDims(input.aspect);

  const bg = input.imageUrl
    ? `background-image:url('${escapeHtml(input.imageUrl)}');background-size:cover;background-position:center;`
    : `background:radial-gradient(ellipse 60% 55% at 18% 12%, rgba(237,28,36,0.24), transparent 70%), ${FT.ink};`;

  const ctaHtml = input.ctaText
    ? `<div style="position:absolute;right:${d.padding}px;bottom:${d.padding}px;
        display:inline-flex;align-items:center;gap:14px;
        padding:${Math.round(d.ctaSize * 0.55)}px ${Math.round(d.ctaSize * 1.2)}px;
        border-radius:999px;background:${FT.white};border:1px solid rgba(255,255,255,0.8);
        font-weight:700;font-size:${d.ctaSize}px;color:${FT.ink};letter-spacing:0.02em;">
        <span>${escapeHtml(input.ctaText)}</span>
        ${ftArrowSvg(Math.round(d.ctaSize * 1.1), FT.red)}
      </div>`
    : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  ${fontFaceCss()}
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:100%;height:100%;}
  body{font-family:'Manrope',-apple-system,sans-serif;color:${FT.white};overflow:hidden;position:relative;${bg}}
  .overlay{position:absolute;inset:0;background:linear-gradient(180deg, transparent 40%, rgba(15,17,21,0.92) 100%);}
  </style></head><body>
    <div class="overlay"></div>
    <div style="position:absolute;left:${d.padding}px;bottom:${d.padding}px;display:flex;flex-direction:column;gap:18px;max-width:70%;">
      <div style="width:${d.stripeWidth}px;height:4px;background:${FT.red};"></div>
      <div style="font-weight:800;font-size:${d.brandSize}px;letter-spacing:0.06em;text-transform:uppercase;color:${FT.white};line-height:1;">
        ${escapeHtml(input.brand)}
      </div>
      <div style="font-weight:500;font-size:${d.taglineSize}px;color:rgba(255,255,255,0.92);line-height:1.35;max-width:760px;">
        ${escapeHtml(input.tagline)}
      </div>
    </div>
    ${ctaHtml}
  </body></html>`;

  return await renderHtmlToPng(html, w, h);
}

// =============================================================================
// Convenience: write to disk
// =============================================================================

export async function renderReferansePosterToFile(
  input: ReferansePosterInput,
  outPath: string,
): Promise<void> {
  const fs = await import("node:fs");
  const { base64 } = await renderReferansePoster(input);
  fs.writeFileSync(outPath, Buffer.from(base64, "base64"));
}

export async function renderDefinisjonPosterToFile(
  input: DefinisjonPosterInput,
  outPath: string,
): Promise<void> {
  const fs = await import("node:fs");
  const { base64 } = await renderDefinisjonPoster(input);
  fs.writeFileSync(outPath, Buffer.from(base64, "base64"));
}

export async function renderHeroPosterToFile(
  input: HeroPosterImageInput,
  outPath: string,
): Promise<void> {
  const fs = await import("node:fs");
  const { base64 } = await renderHeroPoster(input);
  fs.writeFileSync(outPath, Buffer.from(base64, "base64"));
}

// keep imports referenced (used by future expansions)
void wordmarkDataUrl;
