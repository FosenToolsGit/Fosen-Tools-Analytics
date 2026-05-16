import fs from "node:fs";
import path from "node:path";
import type { ImageRef } from "./gemini";

/**
 * Laster FT brand-assets fra disk som base64 ImageRef-objekter for å mate
 * Nano Banana med konsistent brand-referanse i hver image-gen-call.
 *
 * Per-process cache så vi bare leser fil-systemet én gang.
 */

let cache: Record<string, ImageRef> | null = null;

function loadOnce(): Record<string, ImageRef> {
  if (cache) return cache;
  const dir = path.join(process.cwd(), "public/social/brand-assets");

  const read = (name: string): ImageRef | null => {
    const p = path.join(dir, name);
    if (!fs.existsSync(p)) return null;
    const buf = fs.readFileSync(p);
    return {
      base64: buf.toString("base64"),
      mimeType: "image/png",
    };
  };

  cache = {};
  const files: Array<[string, string, string]> = [
    [
      "wordmark_white",
      "ft-wordmark-white.png",
      "BRAND REFERENCE: Fosen Tools wordmark logo in white. Use this exact letterform and proportions for the FT logo in the output image. Do NOT alter the spelling or letterforms.",
    ],
    [
      "wordmark_red",
      "ft-wordmark-red.png",
      "BRAND REFERENCE: Fosen Tools wordmark in FT-red #ED1C24. Same letterform, red color variant.",
    ],
    [
      "wordmark_ink",
      "ft-wordmark-ink.png",
      "BRAND REFERENCE: Fosen Tools wordmark in FT-ink #0F1115. Dark color variant.",
    ],
    [
      "jubileum_25",
      "jubileum-25aar.png",
      "BRAND REFERENCE: Fosen Tools 25-year jubilee mark in gold gradient. Use this when the post is about the 25-year milestone.",
    ],
    [
      "jubileum_100",
      "jubileum-100aar.png",
      "BRAND REFERENCE: Fosen Tools group 100-year jubilee mark in gold gradient. Use when the post mentions 100 years in the family conglomerate.",
    ],
    [
      "palette",
      "ft-palette.png",
      "BRAND REFERENCE: official FT color palette — FT-red #ED1C24 on left, FT-ink #0F1115 in middle, FT-white #FFFFFF on right. The output image must use ONLY these three colors (plus the gold gradient on jubilee marks if relevant).",
    ],
  ];

  for (const [key, fname, label] of files) {
    const ref = read(fname);
    if (ref) {
      ref.label = label;
      cache[key] = ref;
    }
  }
  return cache;
}

/**
 * Returner brand-asset-referanser tilpasset gitt archetype.
 * Vi pakker bare med relevante assets — for mange refs forvirrer modellen.
 */
export function brandRefsFor(
  archetype: string,
  options: {
    /** Ved milepæl 25/100: bruk jubileumslogo */
    isJubilee?: 25 | 100 | null;
    /** Bruk hvit eller mørk wordmark? Hvit = på rød/mørk bg, ink = på lys bg */
    wordmarkVariant?: "white" | "red" | "ink";
  } = {}
): ImageRef[] {
  const all = loadOnce();
  const refs: ImageRef[] = [];

  // Alltid: palett (lærer modellen FT-fargene)
  if (all.palette) refs.push(all.palette);

  // Wordmark — velg variant basert på bakgrunn
  const variant = options.wordmarkVariant ?? "white";
  const wordmarkKey =
    variant === "red"
      ? "wordmark_red"
      : variant === "ink"
        ? "wordmark_ink"
        : "wordmark_white";
  if (all[wordmarkKey]) refs.push(all[wordmarkKey]);

  // Jubileumslogo ved 25/100-årsmarkering
  if (archetype === "milepael") {
    if (options.isJubilee === 25 && all.jubileum_25) refs.push(all.jubileum_25);
    if (options.isJubilee === 100 && all.jubileum_100)
      refs.push(all.jubileum_100);
  }

  return refs;
}

/**
 * Last godkjente-innlegg som style-refs for en gitt archetype.
 *
 * Du kuratører lokalt: drop bilder i `public/social/approved-posts/<archetype>/`
 * (foto/definisjon/statement/kontrast/milepael/sitat/sertifikat — eller `_all/`
 * for refs som skal gjelde uansett archetype). Støttet filtype: .png/.jpg/.jpeg/.webp.
 *
 * Vi plukker tilfeldig opp til `limit` filer (default 3) for å holde ref-bunken
 * fokusert — for mange refs forvirrer Gemini. `_all/` blandes inn.
 *
 * Per-process cache så vi bare leser disk én gang per archetype.
 */
const approvedCache = new Map<string, ImageRef[]>();

const APPROVED_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function readApprovedDir(subdir: string): ImageRef[] {
  const dir = path.join(process.cwd(), "public/social/approved-posts", subdir);
  if (!fs.existsSync(dir)) return [];
  const out: ImageRef[] = [];
  for (const name of fs.readdirSync(dir)) {
    const ext = path.extname(name).toLowerCase();
    const mime = APPROVED_MIME[ext];
    if (!mime) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (!stat.isFile()) continue;
    if (stat.size > 5 * 1024 * 1024) continue; // Cap 5 MB per fil
    const buf = fs.readFileSync(full);
    out.push({
      base64: buf.toString("base64"),
      mimeType: mime,
      label: `STYLE REFERENCE (approved post — ${subdir}/${name}): match the visual style, composition, mood and typography approach of this image. This is a reference for HOW the output should look, not WHAT it should contain.`,
    });
  }
  return out;
}

export function approvedRefsFor(
  archetype: string,
  options: { limit?: number } = {}
): ImageRef[] {
  const limit = options.limit ?? 3;
  const cacheKey = `${archetype}|${limit}`;
  const cached = approvedCache.get(cacheKey);
  if (cached) return cached;

  const all = [...readApprovedDir(archetype), ...readApprovedDir("_all")];
  if (all.length === 0) {
    approvedCache.set(cacheKey, []);
    return [];
  }

  // Stokk og kutt til limit. Math.random gir variasjon på tvers av sesjoner —
  // brukeren vil at ulike runs skal se forskjellige refs etter hvert.
  const shuffled = all.slice().sort(() => Math.random() - 0.5).slice(0, limit);
  approvedCache.set(cacheKey, shuffled);
  return shuffled;
}

/**
 * Hent eksternt bilde (f.eks. scrapet produkt-foto fra fosen-tools.no) som
 * ImageRef. Returnerer null hvis fetch feiler eller responsen ikke er et bilde.
 */
export async function fetchImageAsRef(
  url: string,
  label?: string
): Promise<ImageRef | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "FosenToolsContentEngine/1.0" },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "image/jpeg";
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Begrens til 5 MB
    if (buf.length > 5 * 1024 * 1024) return null;
    return {
      base64: buf.toString("base64"),
      mimeType: ct,
      label,
    };
  } catch {
    return null;
  }
}
