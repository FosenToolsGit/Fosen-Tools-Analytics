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
 * Generér strukturert JSON-output for captions per plattform.
 * Vi bruker responseSchema for å garantere riktig form.
 */
export async function generateCaptionsJson(
  input: CaptionGenInput
): Promise<CaptionGenResult> {
  const ai = getClient();
  const model = input.model ?? DEFAULT_TEXT_MODEL;

  const response = await ai.models.generateContent({
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
              "Valgfri støttesetning for arketyper som krever det (definisjon, sertifikat, milepael). Maks 12 ord, naturlig norsk. For definisjon: kort presis ordbok-stil-definisjon. For sertifikat: trust-anker-setning. For milepael: kontekst-setning. La være tomt hvis ingen passer. Eksempel for «Skreddersydd»: «CAD-tegnet, CNC-maskinert og segmentert etter brukerens arbeidsflyt.»",
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
  });

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
    model,
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
  const model = input.model ?? DEFAULT_IMAGE_MODEL;
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

  const response = await ai.models.generateContent({
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
  });

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

  return { images, model, usage: extractUsage(response.usageMetadata) };
}
