import { GoogleGenAI } from "@google/genai";

/**
 * Tynn wrapper rundt Google GenAI SDK.
 * Bruker GEMINI_API_KEY fra env.
 *
 * Modeller:
 * - Tekst: gemini-2.5-flash (rask + billig) eller gemini-2.5-pro (mer kapabel)
 * - Bilde: gemini-2.5-flash-image (a.k.a. "Nano Banana 2") — funker på free-tier
 *   (Imagen 4.0 krever paid plan, vi unngår det)
 */

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY mangler i .env.local. Sett den fra Google AI Studio."
      );
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export const DEFAULT_TEXT_MODEL = "gemini-2.5-flash";
export const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

export interface CaptionGenInput {
  systemInstruction: string;
  userPrompt: string;
  model?: string;
}

export interface UsageStats {
  /** Tokens i request (uten cached del) */
  promptTokens: number;
  /** Tokens fra cached content (priset til ~25%) */
  cachedTokens: number;
  /** Tokens i output (modellens generering) */
  outputTokens: number;
  /** Sum tokens (alle delene) */
  totalTokens: number;
}

export interface CaptionGenResult {
  json: unknown;
  raw: string;
  model: string;
  usage?: UsageStats;
}

function extractUsage(usageMetadata: unknown): UsageStats | undefined {
  if (!usageMetadata || typeof usageMetadata !== "object") return undefined;
  const m = usageMetadata as Record<string, number | undefined>;
  return {
    promptTokens: m.promptTokenCount ?? 0,
    cachedTokens: m.cachedContentTokenCount ?? 0,
    outputTokens: m.candidatesTokenCount ?? m.totalTokenCount ?? 0,
    totalTokens: m.totalTokenCount ?? 0,
  };
}

/**
 * Retry-helper for Gemini API-kall. Auto-retry på 503 (UNAVAILABLE) og 429
 * (RESOURCE_EXHAUSTED) med eksponentiell backoff. Faller tilbake til
 * `fallbackModel` på siste forsøk hvis primær-modell fortsatt feiler.
 *
 * Gemini 2.5 Flash har periodisk «high demand» og returnerer 503 — vi vil ikke
 * la det stoppe hele Innholdsmotor.
 */
async function withRetryAndFallback<T>(
  primaryModel: string,
  fallbackModel: string,
  attemptFn: (model: string) => Promise<T>
): Promise<T> {
  const maxAttempts = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const model = attempt === maxAttempts ? fallbackModel : primaryModel;
    try {
      return await attemptFn(model);
    } catch (err) {
      lastErr = err;
      const isRetryable = isRetryableGeminiError(err);
      if (!isRetryable || attempt === maxAttempts) {
        // Siste forsøk feilet OG er ikke retryable → kast
        if (!isRetryable) throw err;
      }
      // Backoff: 1s, 2s, 4s
      const backoffMs = Math.pow(2, attempt - 1) * 1000;
      console.warn(
        `[gemini] ${model} feilet (forsøk ${attempt}/${maxAttempts}): ${(err as Error).message?.slice(0, 100)}. Retry om ${backoffMs}ms${attempt === maxAttempts - 1 ? ` (bytter til fallback ${fallbackModel})` : ""}`
      );
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
  throw lastErr;
}

function isRetryableGeminiError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; message?: string };
  if (e.status === 503 || e.status === 429) return true;
  const msg = e.message ?? "";
  return (
    /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overload|rate limit/i.test(msg)
  );
}

/**
 * Generér strukturert JSON-output for captions per plattform.
 * Vi bruker responseSchema for å garantere riktig form.
 */
export async function generateCaptionsJson(
  input: CaptionGenInput
): Promise<CaptionGenResult> {
  const ai = getClient();
  const primaryModel = input.model ?? DEFAULT_TEXT_MODEL;
  // Fallback til Flash-Lite hvis primær er overbelastet
  const fallbackModel = "gemini-2.5-flash-lite";

  const response = await withRetryAndFallback(primaryModel, fallbackModel, (model) =>
    ai.models.generateContent({
    model,
    contents: input.userPrompt,
    config: {
      systemInstruction: input.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          facebook: {
            type: "object",
            properties: {
              caption: { type: "string" },
              first_comment_hashtags: { type: "string" },
              alt_text: { type: "string" },
              reasoning: { type: "string" },
            },
            required: ["caption", "alt_text", "reasoning"],
          },
          instagram: {
            type: "object",
            properties: {
              caption: { type: "string" },
              first_comment_hashtags: { type: "string" },
              alt_text: { type: "string" },
              reasoning: { type: "string" },
            },
            required: ["caption", "first_comment_hashtags", "alt_text", "reasoning"],
          },
          linkedin: {
            type: "object",
            properties: {
              caption: { type: "string" },
              hashtags: { type: "string" },
              alt_text: { type: "string" },
              reasoning: { type: "string" },
            },
            required: ["caption", "hashtags", "alt_text", "reasoning"],
          },
          image_headline: {
            type: "string",
            description:
              "Kort FT-stil hovedheadline for poster-bildet. 5-8 ord på norsk, naturlig setning, splitter pent over 2-3 linjer. Skal være selvstendig (ikke avhengig av annet for kontekst). Eksempler: «Halvparten av skuffene bør stå tomme.» / «Forsvarets standard i din hverdag.» / «Bygget for null feilmargin.»",
          },
          image_headline_red_word: {
            type: "string",
            description:
              "ETT nøkkelord fra image_headline som skal være FT-rødt for emphasis (resten av teksten er hvit). Velg ordet som visuelt anker meningen. Eksempel: i «Forsvarets verktøykontroll i din hverdag» → «verktøykontroll». La være tomt hvis ingen åpenbar.",
          },
          image_subtagline: {
            type: "string",
            description:
              "Valgfri kort italic-linje under hovedheadline (3-6 ord). Eksempler: «Bygget for null feilmargin.», «Visuell kontroll. Ikke fredagsdugnad.», «5S skal gjøre rot umulig.» La være tomt hvis ingen passer.",
          },
          image_body: {
            type: "string",
            description:
              "Valgfri støttesetning for arketyper som krever det (definisjon, sertifikat, milepael). MAKS 8 ord. KORT, presis, naturlig norsk. Foretrekk enkle ord — Nano Banana misstaver lange/sammensatte ord, så bytt ut komplekse ord med enklere synonymer der mulig. For definisjon: ordbok-stil. For sertifikat: trust-anker. For milepael: kontekst. La være tomt hvis ingen kort passer. Eksempler: «CAD-tegnet og CNC-maskinert etter din arbeidsflyt.», «Bygget for null feilmargin.», «Levert til Forsvaret i tjuesju år.»",
          },
          image_kontrast_left_label: {
            type: "string",
            description:
              "KUN for archetype=kontrast. Venstre spalte sin etikett (1-2 ord). Default «HYLLEVARE» når kontrasten er FT vs hyllevare. Andre eksempler: «GENERISK», «FØR», «STANDARD». La være tomt hvis ikke kontrast.",
          },
          image_kontrast_right_label: {
            type: "string",
            description:
              "KUN for archetype=kontrast. Høyre spalte sin etikett (1-2 ord). Default «SKREDDERSYDD». Andre eksempler: «HDFI», «ETTER», «FT-LØSNING». La være tomt hvis ikke kontrast.",
          },
          internal_notes: { type: "string" },
        },
        required: [
          "facebook",
          "instagram",
          "linkedin",
          "image_headline",
        ],
      },
      temperature: 0.7,
    },
  })
  );

  const raw = response.text ?? "";
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `Gemini returnerte ikke gyldig JSON: ${String(e)}. Raw: ${raw.slice(0, 500)}`
    );
  }

  return {
    json,
    raw,
    model: primaryModel,
    usage: extractUsage(response.usageMetadata),
  };
}

export interface ImageRef {
  /** Base64-encoded image data (uten data:image-prefix) */
  base64: string;
  /** image/png, image/jpeg, image/webp */
  mimeType: string;
  /** Beskrivelse av hva bildet er (sendes som tekst-part rett etter) — Nano Banana bruker det */
  label?: string;
}

export interface ImageGenInput {
  prompt: string;
  aspectRatio?: "1:1" | "4:5" | "16:9" | "9:16" | "3:4";
  model?: string;
  numberOfImages?: number;
  /** Referansebilder som Nano Banana skal bruke som stil/innholds-grunnlag.
   * Brukes til å pakke FT-logo, brand-palett og produkt-foto inn i hver call. */
  referenceImages?: ImageRef[];
  /** Cached content name (fra ai.caches.create). Brukes for FT brand-assets
   * så vi ikke re-uploader 6 PNG-er ved hver call. Per-call refs sendes
   * fortsatt inline. */
  cachedContent?: string | null;
}

export interface ImageGenResult {
  images: Array<{
    base64: string;
    mimeType: string;
  }>;
  model: string;
  usage?: UsageStats;
}

/**
 * Generér bilder med Gemini 2.5 Flash Image (Nano Banana 2).
 *
 * Multi-image input støttes: pass FT-logo + brand-palett + produkt-foto som
 * `referenceImages` så modellen brand-matcher output. Dette er hvordan Native
 * holder visuell konsistens.
 *
 * Aspect ratio styres via prompt-tekst.
 */
export async function generateImage(
  input: ImageGenInput
): Promise<ImageGenResult> {
  const ai = getClient();
  const primaryModel = input.model ?? DEFAULT_IMAGE_MODEL;
  // Image-modellen har ingen åpen «lite»-fallback per nå — retry samme modell.
  // Hvis vi får 503 etter 3 forsøk lar vi feilen propagere (caller håndterer).
  const fallbackModel = primaryModel;
  const aspect = input.aspectRatio ?? "1:1";

  // Bygg multi-part contents: [referansebilder med labels] + [hovedprompt]
  const parts: Array<
    | { text: string }
    | { inlineData: { data: string; mimeType: string } }
  > = [];

  for (const ref of input.referenceImages ?? []) {
    if (ref.label) parts.push({ text: ref.label });
    parts.push({
      inlineData: { data: ref.base64, mimeType: ref.mimeType },
    });
  }

  // Nano Banana 2 støtter "1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9".
  // IKKE "4:5" — vi mapper det til nærmeste "3:4" portrait.
  const sdkAspect = aspect === "4:5" ? "3:4" : aspect;

  parts.push({
    text: `${input.prompt}\n\nMANDATORY OUTPUT FORMAT: ${sdkAspect} aspect ratio. The composition must work within this frame.`,
  });

  const response = await withRetryAndFallback(primaryModel, fallbackModel, (model) =>
    ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["IMAGE"],
      // Eksplisitt aspect ratio via SDK — text-direktivet alene ignoreres ofte
      // av Nano Banana 2, men imageConfig.aspectRatio er hard constraint.
      imageConfig: {
        aspectRatio: sdkAspect,
      },
      // Referer til pre-cached FT brand-assets (sparer ~9000 tokens per call)
      ...(input.cachedContent ? { cachedContent: input.cachedContent } : {}),
    },
  })
  );

  const images: Array<{ base64: string; mimeType: string }> = [];
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const data = part.inlineData?.data;
      const mime = part.inlineData?.mimeType ?? "image/png";
      if (data) images.push({ base64: data, mimeType: mime });
    }
  }

  if (images.length === 0) {
    throw new Error(
      "Gemini 2.5 Flash Image returnerte ingen bilder (kan være rate-limit eller safety-block)."
    );
  }

  return { images, model: primaryModel, usage: extractUsage(response.usageMetadata) };
}

// =============================================================================
// VISION-DETECT — finn bounding-bokser i et bilde
// =============================================================================

export interface DetectedBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Beskrivelse (f.eks. "red plate with wrench", "yellow plate"). */
  label?: string;
  /** Hvor AI har naturlig visuell plass for en tekst-label.
   * (cx, cy) er senter av label-zone; (zw, zh) er størrelse hvis kjent. */
  label_anchor?: {
    cx: number;
    cy: number;
    zw?: number;
    zh?: number;
    /** Hvilken side label-zone er på (f.eks. "below", "right", "inside_bottom"). */
    position?: "below" | "above" | "left" | "right" | "inside_bottom" | "inside_top";
  };
}

/**
 * Bruk Gemini Vision til å detektere koordinatene av N visuelle objekter
 * (typisk produkt-swatches) i et bilde. Bildet sendes som inline image og
 * modellen returnerer JSON med bounding-boxes.
 *
 * Gemini returnerer normaliserte koordinater (0-1000 per akse — så vi
 * konverterer til pixel-koordinater med imageWidth/imageHeight).
 */
export async function detectSwatchPositions(
  imageBase64: string,
  imageMimeType: string,
  imageWidth: number,
  imageHeight: number,
  expectedCount: number = 6
): Promise<DetectedBox[]> {
  const ai = getClient();
  const visionModel = "gemini-2.5-flash";

  const prompt = `This image contains exactly ${expectedCount} HDFI color sample swatches arranged in a grid. Each swatch is a rounded rectangular plastic plate (red, black, white, blue, yellow, or grey) with a tool-silhouette cutout.

For EACH swatch, return TWO pieces of information:
1. swatch_box: bounding box of JUST the colored plate (NOT including any text or space below it)
2. label_anchor: the IDEAL CENTER-POINT (cx, cy) where a small text label naturally belongs, based on the existing visual layout. Look at the image carefully — where is there CLEAR EMPTY SPACE near each swatch that is suitable for a 1-3 word text label? It is usually directly below the swatch, but can be to the side, above, or inside (if the swatch has a dark band at the bottom suitable for white text). Choose the most natural position THAT ACTUALLY HAS EMPTY ROOM — do not anchor to areas already crowded with other shapes or AI-rendered text.

Use normalized coordinates 0-1000 (x=500 means horizontal center, y=500 means vertical center). Return exactly ${expectedCount} swatches in reading order (top-left to bottom-right).

Output format (strict JSON, no markdown):
{
  "boxes": [
    {
      "x": 0, "y": 0, "w": 0, "h": 0,
      "label": "red plate",
      "label_anchor": {"cx": 0, "cy": 0, "zw": 0, "zh": 0, "position": "below"}
    },
    ...
  ]
}

x/y/w/h are the swatch_box (top-left corner + size). label_anchor.cx/cy is the IDEAL CENTER-POINT for label text. position is one of "below" / "above" / "left" / "right" / "inside_bottom" / "inside_top". zw/zh (optional) is the size of the empty zone if known.`;

  const response = await withRetryAndFallback(
    visionModel,
    "gemini-2.5-flash-lite",
    (model) =>
      ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              { inlineData: { data: imageBase64, mimeType: imageMimeType } },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.0,
        },
      })
  );

  const raw = response.text ?? "";
  type RawAnchor = {
    cx: number;
    cy: number;
    zw?: number;
    zh?: number;
    position?: NonNullable<DetectedBox["label_anchor"]>["position"];
  };
  type RawBox = {
    x: number;
    y: number;
    w: number;
    h: number;
    label?: string;
    label_anchor?: RawAnchor;
  };
  let parsed: { boxes?: RawBox[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Vision-detect: ugyldig JSON: ${raw.slice(0, 200)}`);
  }

  const boxes = parsed.boxes ?? [];

  // Konverter normaliserte 0-1000-koordinater til pixel
  return boxes.map((b) => ({
    x: Math.round((b.x / 1000) * imageWidth),
    y: Math.round((b.y / 1000) * imageHeight),
    w: Math.round((b.w / 1000) * imageWidth),
    h: Math.round((b.h / 1000) * imageHeight),
    label: b.label,
    label_anchor: b.label_anchor
      ? {
          cx: Math.round((b.label_anchor.cx / 1000) * imageWidth),
          cy: Math.round((b.label_anchor.cy / 1000) * imageHeight),
          zw: b.label_anchor.zw
            ? Math.round((b.label_anchor.zw / 1000) * imageWidth)
            : undefined,
          zh: b.label_anchor.zh
            ? Math.round((b.label_anchor.zh / 1000) * imageHeight)
            : undefined,
          position: b.label_anchor.position,
        }
      : undefined,
  }));
}
