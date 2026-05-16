import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_IMAGE_MODEL } from "./gemini";

/**
 * Gemini context caching for FT brand-assets.
 *
 * Vi sender 6 PNG-er (~9000 tokens) som referansebilder ved HVER image-gen-call.
 * Context caching tillater oss å laste opp disse én gang per kjøre-instans,
 * deretter referere cache-navnet i hver call — billigere + raskere + mer
 * konsistent (samme cached bytes hver gang).
 *
 * TTL: 1 time. Auto-recreate ved utløp. Per-process cache (Vercel cold start
 * skaper ny cache, men varmt instans gjenbruker).
 */

interface CachedRef {
  name: string;
  expiresAt: number;
}

let imageBrandCache: CachedRef | null = null;
let createInFlight: Promise<string> | null = null;

const TTL_SECONDS = 3600; // 1 time
const SAFETY_BUFFER_MS = 60_000; // refresh 60s før faktisk utløp

let _client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY mangler");
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

const BRAND_ASSET_FILES: Array<[key: string, file: string, label: string]> = [
  [
    "wordmark_white",
    "ft-wordmark-white.png",
    "BRAND REFERENCE: Fosen Tools wordmark — white variant. Reference shape only — we do NOT render this in AI output (composited server-side).",
  ],
  [
    "wordmark_ink",
    "ft-wordmark-ink.png",
    "BRAND REFERENCE: Fosen Tools wordmark — ink/dark variant.",
  ],
  [
    "wordmark_red",
    "ft-wordmark-red.png",
    "BRAND REFERENCE: Fosen Tools wordmark — red variant.",
  ],
  [
    "palette",
    "ft-palette.png",
    "BRAND REFERENCE: official FT color palette — FT-red #ED1C24, FT-ink #0F1115, FT-white #FFFFFF. Output must use ONLY these three colors + optional gold gradient on jubilee marks.",
  ],
  [
    "jubileum_25",
    "jubileum-25aar.png",
    "BRAND REFERENCE: FT 25-year jubilee mark, gold gradient. Use only when post is about 25-year milestone.",
  ],
  [
    "jubileum_100",
    "jubileum-100aar.png",
    "BRAND REFERENCE: FT group 100-year jubilee mark, gold gradient. Use only when post mentions 100 years in family conglomerate.",
  ],
];

function loadAllBrandAssetParts(): Array<
  | { text: string }
  | { inlineData: { data: string; mimeType: string } }
> {
  const parts: Array<
    | { text: string }
    | { inlineData: { data: string; mimeType: string } }
  > = [];
  const dir = path.join(process.cwd(), "public/social/brand-assets");
  for (const [, file, label] of BRAND_ASSET_FILES) {
    const fp = path.join(dir, file);
    if (!fs.existsSync(fp)) continue;
    parts.push({ text: label });
    parts.push({
      inlineData: {
        data: fs.readFileSync(fp).toString("base64"),
        mimeType: "image/png",
      },
    });
  }
  return parts;
}

async function createImageBrandCache(): Promise<string> {
  const ai = getClient();
  const parts = loadAllBrandAssetParts();
  if (parts.length === 0)
    throw new Error("Ingen FT brand-assets funnet for cache.");

  const cache = await ai.caches.create({
    model: DEFAULT_IMAGE_MODEL,
    config: {
      contents: [{ role: "user", parts }],
      displayName: "ft-brand-image-cache",
      ttl: `${TTL_SECONDS}s`,
    },
  });

  if (!cache.name) throw new Error("Cache opprettet uten navn.");

  imageBrandCache = {
    name: cache.name,
    expiresAt: Date.now() + TTL_SECONDS * 1000,
  };

  return cache.name;
}

/**
 * Returnerer navnet på en aktiv brand-image-cache. Oppretter en hvis ingen
 * finnes eller hvis eksisterende er utløpt. Singleton in-flight promise
 * forhindrer race-condition ved samtidige calls.
 */
export async function getOrCreateImageBrandCache(): Promise<string> {
  // Sjekk eksisterende
  if (
    imageBrandCache &&
    imageBrandCache.expiresAt > Date.now() + SAFETY_BUFFER_MS
  ) {
    return imageBrandCache.name;
  }

  // Hvis allerede in-flight, vent på den
  if (createInFlight) return createInFlight;

  createInFlight = createImageBrandCache().finally(() => {
    createInFlight = null;
  });
  return createInFlight;
}

/** Tøm cache lokalt (force ny opprettelse på neste call). Brukes for testing. */
export function resetImageBrandCache(): void {
  imageBrandCache = null;
}
