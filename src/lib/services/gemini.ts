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

export interface CaptionGenResult {
  json: unknown;
  raw: string;
  model: string;
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
          internal_notes: { type: "string" },
        },
        required: ["facebook", "instagram", "linkedin"],
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

  return { json, raw, model };
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
}

export interface ImageGenResult {
  images: Array<{
    base64: string;
    mimeType: string;
  }>;
  model: string;
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

  const aspectDirective =
    aspect === "1:1"
      ? `MANDATORY OUTPUT FORMAT: render as a PERFECT SQUARE 1:1 image (2048×2048 pixels). NOT a wide banner. NOT landscape. NOT portrait. Width MUST EQUAL height exactly. Composition must work within square frame — do not stretch or letterbox.`
      : aspect === "4:5"
        ? `MANDATORY OUTPUT FORMAT: render as 4:5 portrait aspect (1638×2048 pixels). NOT square. NOT 16:9. Vertical orientation, slightly taller than wide.`
        : aspect === "9:16"
          ? `MANDATORY OUTPUT FORMAT: render as 9:16 portrait aspect (1152×2048 pixels). Vertical stories/reels format.`
          : `MANDATORY OUTPUT FORMAT: render as 16:9 landscape aspect (2048×1152 pixels).`;

  parts.push({
    text: `${input.prompt}\n\n${aspectDirective}`,
  });

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["IMAGE"],
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

  return { images, model };
}
