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

export interface ImageGenInput {
  prompt: string;
  aspectRatio?: "1:1" | "4:5" | "16:9" | "9:16" | "3:4";
  model?: string;
  numberOfImages?: number;
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
 * VIKTIG: gemini-2.5-flash-image bruker `generateContent` med
 * `responseModalities: ["IMAGE"]`, IKKE `generateImages`-API-et.
 *
 * Aspect ratio styres via prompt-tekst (modellen støtter ikke aspectRatio-flag
 * direkte for free-tier). Vi inkluderer ratio i prompten.
 *
 * Free-tier har strenge rate-limits — fang 429 og rapporter tydelig.
 */
export async function generateImage(
  input: ImageGenInput
): Promise<ImageGenResult> {
  const ai = getClient();
  const model = input.model ?? DEFAULT_IMAGE_MODEL;
  const aspect = input.aspectRatio ?? "1:1";

  // Inkluder aspect ratio i prompten siden modellen ikke har eksplisitt flag
  const promptWithAspect = `${input.prompt}\n\nAspect ratio: ${aspect}. Render at high resolution suitable for social media.`;

  const response = await ai.models.generateContent({
    model,
    contents: promptWithAspect,
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
