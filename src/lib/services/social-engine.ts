import { SupabaseClient } from "@supabase/supabase-js";
import {
  generateCaptionsJson,
  generateImage,
  DEFAULT_TEXT_MODEL,
  DEFAULT_IMAGE_MODEL,
  type ImageRef,
} from "./gemini";
import { brandRefsFor, approvedRefsFor, fetchImageAsRef } from "./brand-assets";
import {
  scrapeProductByUrl,
  scrapePageByUrl,
  ScrapeProductError,
  type ScrapedProduct,
} from "./scrape-product";

/**
 * Social Engine — caption + bilde-gen for Innholdsmotor.
 *
 * Pipeline:
 *   1. Last korpus + aktiv feedback fra Supabase
 *   2. Bygg system-prompt fra korpus + feedback
 *   3. Bygg user-prompt fra topic-kontekst (URL-data, brief, photos)
 *   4. Generér captions (per plattform JSON)
 *   5. Generér AI-bilde (hvis archetype != 'foto')
 *   6. Lagre bilde til Storage, returnér public URLs
 */

export type TopicKind =
  | "leveranse"
  | "prosess"
  | "produktlansering"
  | "bransje_kontekst"
  | "milepael"
  | "edukativ"
  | "evergreen"
  | "kampanje";

export type Archetype =
  | "foto"
  | "definisjon"
  | "statement"
  | "kontrast"
  | "milepael"
  | "sitat"
  | "sertifikat";

export interface CorpusEntry {
  kind: string;
  slug: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface FeedbackEntry {
  kind: string;
  platform: string | null;
  before_text: string | null;
  after_text: string | null;
  reason: string;
  created_at: string;
}

export interface GenerateDraftInput {
  topic_kind: TopicKind;
  archetype: Archetype;
  title: string;
  brief?: string;
  source_url?: string | null;
  source_data?: Partial<ScrapedProduct> | Record<string, unknown> | null;
  user_photos?: Array<{ path: string; public_url: string; alt?: string }>;
  /** Bruker-ID for Storage-upload (når archetype krever bilde-gen) */
  user_id?: string;
  /** Hopp over AI-bilde-gen selv om archetype != 'foto' */
  skip_image?: boolean;
}

export interface GenerateDraftResult {
  captions: {
    facebook: { caption: string; first_comment_hashtags?: string; alt_text: string; reasoning: string };
    instagram: { caption: string; first_comment_hashtags: string; alt_text: string; reasoning: string };
    linkedin: { caption: string; hashtags: string; alt_text: string; reasoning: string };
    internal_notes?: string;
  };
  ai_images: Array<{
    storage_path: string;
    public_url: string;
    archetype: Archetype;
    prompt: string;
  }>;
  model_used: string;
  generation_cost_estimate: number;
}

const SOCIAL_BUCKET = "social_assets";

// =============================================================================
// Korpus + feedback-loading
// =============================================================================

export async function loadCorpus(
  supabase: SupabaseClient
): Promise<Record<string, CorpusEntry[]>> {
  const { data, error } = await supabase
    .from("social_corpus")
    .select("kind, slug, title, content, metadata")
    .eq("active", true)
    .order("kind", { ascending: true })
    .order("slug", { ascending: true });

  if (error) throw new Error(`Kunne ikke laste korpus: ${error.message}`);

  const grouped: Record<string, CorpusEntry[]> = {};
  for (const row of data ?? []) {
    const k = row.kind as string;
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(row as CorpusEntry);
  }
  return grouped;
}

export async function loadActiveFeedback(
  supabase: SupabaseClient,
  limit = 50
): Promise<FeedbackEntry[]> {
  const { data, error } = await supabase
    .from("social_feedback")
    .select("kind, platform, before_text, after_text, reason, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // Defensiv: hvis tabellen mangler eller annet, returner tom
    console.warn("loadActiveFeedback warning:", error.message);
    return [];
  }
  return (data ?? []) as FeedbackEntry[];
}

// =============================================================================
// Prompt-bygging
// =============================================================================

/**
 * Bygger den store system-prompten som inkluderer ALL kontekst:
 * - company / voice / visuelle regler
 * - plattform-regler
 * - topic-template
 * - archetype-spec
 * - topp-poster (positive eksempler)
 * - avviste mønstre
 * - LIVE feedback (siste 50)
 */
export function buildSystemPrompt(
  corpus: Record<string, CorpusEntry[]>,
  feedback: FeedbackEntry[],
  topicKind: TopicKind,
  archetype: Archetype
): string {
  const section = (label: string, entries?: CorpusEntry[]) => {
    if (!entries || entries.length === 0) return "";
    return `\n\n## ${label}\n\n${entries
      .map((e) => `### ${e.title}\n\n${e.content}`)
      .join("\n\n---\n\n")}`;
  };

  const oneFromKind = (kind: string, slug: string): CorpusEntry | undefined =>
    corpus[kind]?.find((e) => e.slug === slug);

  const topicTemplate = oneFromKind("topic_template", topicKind);
  const archetypeSpec = oneFromKind("archetype", archetype);

  // Kun de plattform-reglene som er aktuelle (alle 3 alltid)
  const platformRules = corpus.platform ?? [];

  // Topp-poster: bare topp 5 etter engagement
  const topPosts = (corpus.top_post ?? []).slice(0, 5);

  // Avviste mønstre: ALLE — disse er kritiske
  const rejectedPatterns = corpus.rejected_pattern ?? [];

  // Live feedback formatering
  const feedbackLines = feedback
    .slice(0, 30)
    .map((f) => {
      const platformTag = f.platform ? `[${f.platform}]` : "";
      const beforePart = f.before_text
        ? ` (original: "${f.before_text.slice(0, 120)}")`
        : "";
      return `- [${f.kind}]${platformTag} ${f.reason}${beforePart}`;
    })
    .join("\n");

  return `Du er FT-CONTENT-MOTOR — Fosen Tools' interne content engine.
Du skriver innlegg for Facebook, Instagram og LinkedIn på norsk (bokmål).
Output skal være strukturert JSON med per-plattform-varianter. Følg ALL doktrine under.

${section("KOMPANI-KONTEKST", corpus.company)}
${section("SKRIVESTIL-DOKTRINE", corpus.voice)}
${section("VISUELLE REGLER (KRITISK)", corpus.visual_rules)}
${section("PLATTFORM-REGLER (gjelder alle 3 — overhold char-cap og lift-mønstre)", platformRules)}
${section(`TOPIC-TEMPLATE for "${topicKind}"`, topicTemplate ? [topicTemplate] : [])}
${section(`ARCHETYPE: ${archetype}`, archetypeSpec ? [archetypeSpec] : [])}
${section("PRODUKT-KONTEKST", corpus.product)}
${section("POSITIVE EKSEMPLER (slik skal det høres ut)", topPosts)}
${section("⚠️ AVVISTE MØNSTRE — ALDRI GJENTA", rejectedPatterns)}

${feedbackLines ? `\n## LIVE FEEDBACK fra siste avvisninger/edits (KRITISK — IKKE GJENTA disse feilene)\n\n${feedbackLines}\n` : ""}

## RESPONS-FORMAT

Du skal returnere én JSON-objekt med disse feltene:

\`\`\`json
{
  "facebook": {
    "caption": "<140-280 tegn. Følg FB-mønstre fra plattform-regler. Emoji-opener anbefalt.>",
    "first_comment_hashtags": "<valgfri, hvis aktuelt>",
    "alt_text": "<beskrivelse av bilde, 1-2 setninger, til skjermlesere>",
    "reasoning": "<1 setning: hvorfor dette caption-valget — referer til regler/mønstre>"
  },
  "instagram": {
    "caption": "<opp til 2200 tegn, men hold konsist; hashtags IKKE i caption>",
    "first_comment_hashtags": "<5-15 relevante hashtags i én streng>",
    "alt_text": "<beskrivelse av bilde>",
    "reasoning": "<begrunnelse>"
  },
  "linkedin": {
    "caption": "<400-700 tegn faglig tone. Hook → kontekst → detalj → take-away>",
    "hashtags": "<3-5 faglige hashtags i én streng>",
    "alt_text": "<beskrivelse av bilde>",
    "reasoning": "<begrunnelse>"
  },
  "internal_notes": "<valgfri: noe operatøren bør vite>"
}
\`\`\`

KRITISKE REGLER:
- ALDRI bryt avviste mønstre eller live feedback
- ALDRI bruk «CNC-frest» (alltid «CNC-maskinert»)
- ALDRI kall HDFI for «skum», «plastplate» eller «innlegg»
- ALDRI bruk udokumenterte claims («Norges største», «siden 2008»)
- ALDRI åpne med spørsmål på Facebook (-33%)
- ALLTID bruk konkret kunde/sted hvis tilgjengelig
- ALLTID hold seg innenfor char-cap per plattform`;
}

/**
 * Bygger user-prompt fra topic-kontekst.
 */
export function buildUserPrompt(input: GenerateDraftInput): string {
  const parts: string[] = [];

  parts.push(`# Topic-input\n\nKind: ${input.topic_kind}\nArchetype: ${input.archetype}\nTittel: ${input.title}`);

  if (input.brief) {
    parts.push(`\n## Brief fra operatør\n\n${input.brief}`);
  }

  if (input.source_url) {
    parts.push(`\n## Kilde-URL\n\n${input.source_url}`);
  }

  if (input.source_data && Object.keys(input.source_data).length > 0) {
    const scraped = input.source_data as Partial<ScrapedProduct>;
    const lines: string[] = [];
    if (scraped.name) lines.push(`Navn: ${scraped.name}`);
    if (scraped.manufacturer) lines.push(`Produsent: ${scraped.manufacturer}`);
    if (scraped.sku) lines.push(`FT-art.nr: ${scraped.sku}`);
    if (scraped.price_now) lines.push(`Pris: ${scraped.price_now} NOK`);
    if (scraped.price_before)
      lines.push(`Før-pris: ${scraped.price_before} NOK`);
    if (scraped.discount_pct)
      lines.push(`Rabatt: ${scraped.discount_pct}%`);
    if (scraped.in_stock !== undefined)
      lines.push(`På lager: ${scraped.in_stock ? "ja" : "nei"}`);
    if (scraped.bullets?.length)
      lines.push(`USP-punkter:\n  - ${scraped.bullets.join("\n  - ")}`);
    if (lines.length > 0) {
      parts.push(`\n## Scrapet produkt-data\n\n${lines.join("\n")}`);
    }
  }

  if (input.user_photos && input.user_photos.length > 0) {
    parts.push(
      `\n## Opplastede foto (${input.user_photos.length} stk)\n\nBeskriv dem i alt_text-feltene. Bilder vil følge caption ved publisering.`
    );
  }

  parts.push(
    `\n\nGenerér nå JSON med Facebook/Instagram/LinkedIn-varianter etter doktrinen.`
  );

  return parts.join("\n");
}

// =============================================================================
// Bilde-prompt-bygging per archetype
// =============================================================================

/**
 * Bygger Nano Banana-prompt fra archetype + kontekst.
 *
 * KRITISK for 0 typos: hold TEKST KORT i bildet. Hovedord + minimal label kun.
 * Definisjoner, USPs, lengre tekst hører hjemme i caption (post-tekst), ikke
 * i bildet. Multi-image input via referenceImages gir brand-konsistens.
 */
export function buildImagePrompt(
  archetype: Archetype,
  context: {
    title: string;
    captions?: GenerateDraftResult["captions"];
    statement?: string;
    /** Kort hovedord til bildet (1-3 ord) — separat fra evt. lang tittel */
    hero_text?: string;
    /** Lite kontekst-label (1 ord, f.eks. "adjektiv") */
    eyebrow?: string;
  }
): { prompt: string; aspectRatio: "1:1" | "4:5" | "16:9" | "9:16" } {
  const aspectMap: Record<Archetype, "1:1" | "4:5" | "16:9" | "9:16"> = {
    foto: "1:1",
    definisjon: "1:1",
    statement: "1:1",
    kontrast: "4:5",
    milepael: "1:1",
    sitat: "4:5",
    sertifikat: "1:1",
  };

  const negatives = `STRICTLY DO NOT INCLUDE: AI-generated humans or faces, cartoon characters, hand-drawn illustrations, flowers, abstract CAD sketches with empty rectangles, fake product photos, blue or green accents, gradient backgrounds (except gold on jubilee marks), watermarks, stock-photo aesthetics, decorative noise, fake certification logos.`;

  const referenceUsage = `You have been provided BRAND REFERENCE images at the start of this conversation: the official Fosen Tools wordmark logo and the FT color palette. USE THE WORDMARK LOGO EXACTLY AS PROVIDED — do not redraw, restyle, or invent alternative wordmarks. Place it as a small footer or top-strip element. Match the color palette PRECISELY.`;

  // Hero-text = kortest mulig hovedord, max 2-3 ord
  const heroText = (context.hero_text ?? context.statement ?? context.title)
    .toUpperCase()
    .trim();
  const eyebrow = context.eyebrow?.toLowerCase().trim() ?? "";

  switch (archetype) {
    case "definisjon":
      return {
        prompt: `Editorial dictionary-style poster on solid FT-red #ED1C24 background.

EXACT TEXT TO RENDER (spell precisely):
  - Small italic label at top: "${eyebrow || "adjektiv"}"
  - Hero word centered: "${heroText}"
  - Footer: the Fosen Tools wordmark logo (from brand reference) bottom-center, white, small.

The hero word MUST be in a bold sans-serif font (Manrope 800 style), pure white, MASSIVE (60% canvas width), tight letter-spacing.
NO definition text, NO additional sentences in the image — just the eyebrow + hero word + logo.
Editorial swiss-design feel, generous whitespace.
${referenceUsage}
${negatives}`,
        aspectRatio: aspectMap[archetype],
      };

    case "statement":
      return {
        prompt: `Maximalist typography poster, full-bleed solid FT-red #ED1C24 background.

EXACT TEXT TO RENDER (spell precisely):
  - Main statement centered (max 4 short words): "${heroText}"
  - Footer: Fosen Tools wordmark (from brand reference) bottom-center, white, small.

Statement in Manrope 900 style, white, MASSIVE (fills 75% canvas width), tight tracking.
Period or punctuation rendered same size.
NO other text. NO supporting elements.
${referenceUsage}
${negatives}`,
        aspectRatio: aspectMap[archetype],
      };

    case "kontrast":
      return {
        prompt: `Vertical two-column comparison poster, 4:5 aspect ratio.

LEFT column (50% width): muted gray #6E6E6E background.
  Top label (small white): "HYLLEVARE"
RIGHT column (50% width): FT-red #ED1C24 background.
  Top label (small white): "${heroText}"

Center divider: thin white vertical line.
Top center: Fosen Tools wordmark (from brand reference) bridging both columns, white, small.

NO body text, NO bullets — just the two header labels. Typography only.
${referenceUsage}
${negatives}`,
        aspectRatio: aspectMap[archetype],
      };

    case "milepael":
      return {
        prompt: `Massive number poster, full-bleed solid FT-ink #0F1115 background.

EXACT TEXT TO RENDER:
  - Hero number centered: "${heroText}"
  - Small uppercase label above (tracked, white): "${eyebrow || "år"}"
  - Footer: Fosen Tools wordmark (from brand reference) bottom-center, white, small.

The number MUST be in Manrope 900 style, MASSIVE (80% canvas height).
If the number is "25" or "100", color it with the gold gradient style (#85704D → #DBB78B) — otherwise white.
NO supporting sentences in the image.
${referenceUsage}
${negatives}`,
        aspectRatio: aspectMap[archetype],
      };

    case "sitat":
      return {
        prompt: `Quote-card poster, 4:5 aspect ratio, solid FT-ink #0F1115 background.

EXACT TEXT TO RENDER (spell every character precisely):
  "${heroText}"
  (the quote text above, surrounded by quotation marks, centered)

  - Quote in Manrope 500 italic, white, ~55% canvas height.
  - Large red opening-quote glyph (FT-red #ED1C24) behind the quote, decorative.
  - NO attribution line in the image (it goes in the caption).
  - Footer: Fosen Tools wordmark (from brand reference) bottom-center, white, small.
${referenceUsage}
${negatives}`,
        aspectRatio: aspectMap[archetype],
      };

    case "sertifikat":
      return {
        prompt: `Trust-signal poster on solid white #FFFFFF background.

EXACT TEXT TO RENDER:
  - Heading at top, Manrope 700, FT-ink #0F1115: "${heroText}"
  - 3-5 ABSTRACT geometric shapes (circles or hexagons in FT-red and FT-ink) representing certifications — NO real logos, NO text labels under them in the image
  - Vertical FT-red #ED1C24 stripe along right edge (4% width, full height)
  - Footer: Fosen Tools wordmark (from brand reference, ink/dark variant) bottom-left, small.

Editorial layout, generous whitespace.
${referenceUsage}
${negatives}`,
        aspectRatio: aspectMap[archetype],
      };

    case "foto":
    default:
      // foto = ekte foto, ingen AI-bilde-gen
      return { prompt: "", aspectRatio: "1:1" };
  }
}

/**
 * Velg hvilken wordmark-variant som passer bakgrunnen til archetype.
 */
function wordmarkVariantFor(archetype: Archetype): "white" | "red" | "ink" {
  // sertifikat har hvit bg → ink wordmark
  if (archetype === "sertifikat") return "ink";
  // alle andre har rød eller mørk bg → hvit wordmark
  return "white";
}

/**
 * Detect 25/100-jubileum fra hero-tekst.
 */
function detectJubilee(heroText: string): 25 | 100 | null {
  const t = heroText.trim();
  if (t === "25" || /\b25\s*år/i.test(t)) return 25;
  if (t === "100" || /\b100\s*år/i.test(t)) return 100;
  return null;
}

/**
 * Pakker ut hero-tekst (max 2-3 ord) fra input. For definisjon: hovedordet.
 * For milepael: tallet. For statement: kort påstand.
 */
function extractHeroText(
  archetype: Archetype,
  input: GenerateDraftInput
): string {
  const brief = input.brief?.trim() ?? "";
  const title = input.title.trim();

  // Hvis brief inneholder en kort one-liner (under ~30 tegn), bruk den
  if (brief && brief.length <= 30 && !brief.includes("\n")) return brief;

  // Hvis tittel er kort, bruk den
  if (title.length <= 30) return title;

  // Ellers: ta første ordet av tittel
  const firstWord = title.split(/\s+/)[0] ?? title;
  // Spesialtilfeller
  if (archetype === "milepael") {
    const numMatch = (brief + " " + title).match(/\b(\d{1,3})\b/);
    if (numMatch) return numMatch[1];
  }
  return firstWord;
}

function extractEyebrow(
  archetype: Archetype,
  input: GenerateDraftInput
): string {
  if (archetype === "definisjon") return "adjektiv";
  if (archetype === "milepael") {
    const heroNum = extractHeroText(archetype, input);
    if (/^\d+$/.test(heroNum)) return "år";
  }
  if (archetype === "sertifikat") return "sertifisert";
  return "";
}

// =============================================================================
// Storage-upload
// =============================================================================

export async function saveBase64ImageToStorage(
  supabase: SupabaseClient,
  base64: string,
  mimeType: string,
  userId: string,
  filenamePrefix: string
): Promise<{ storage_path: string; public_url: string }> {
  const buf = Buffer.from(base64, "base64");
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const filename = `${filenamePrefix}-${Date.now()}.${ext}`;
  const path = `${userId}/${filename}`;

  const { error: upErr } = await supabase.storage
    .from(SOCIAL_BUCKET)
    .upload(path, buf, {
      contentType: mimeType,
      cacheControl: "31536000",
      upsert: false,
    });
  if (upErr) {
    throw new Error(`Storage-upload feilet: ${upErr.message}`);
  }

  const { data: pub } = supabase.storage.from(SOCIAL_BUCKET).getPublicUrl(path);
  return { storage_path: path, public_url: pub.publicUrl };
}

// =============================================================================
// Hovedflyt: generér en komplett draft (captions + evt. bilde)
// =============================================================================

export async function generateDraft(
  supabase: SupabaseClient,
  input: GenerateDraftInput
): Promise<GenerateDraftResult> {
  // 1. Last korpus + feedback
  const [corpus, feedback] = await Promise.all([
    loadCorpus(supabase),
    loadActiveFeedback(supabase, 50),
  ]);

  // 2. Bygg prompts
  const systemPrompt = buildSystemPrompt(
    corpus,
    feedback,
    input.topic_kind,
    input.archetype
  );
  const userPrompt = buildUserPrompt(input);

  // 3. Generér captions
  const captionResult = await generateCaptionsJson({
    systemInstruction: systemPrompt,
    userPrompt,
  });

  const captions = captionResult.json as GenerateDraftResult["captions"];

  // 4. Generér bilde hvis archetype krever det og user_id finnes
  const aiImages: GenerateDraftResult["ai_images"] = [];
  if (input.archetype !== "foto" && !input.skip_image && input.user_id) {
    // Hero-tekst (kort, max 2-3 ord) — bruker hero_text fra brief eller title.
    // Eyebrow = ordklasse for definisjon, "år" for milepael.
    const heroText = extractHeroText(input.archetype, input);
    const eyebrow = extractEyebrow(input.archetype, input);

    const { prompt: imgPrompt, aspectRatio } = buildImagePrompt(
      input.archetype,
      {
        title: input.title,
        statement: input.brief,
        captions,
        hero_text: heroText,
        eyebrow,
      }
    );

    if (imgPrompt) {
      try {
        // Bygg referansebilder: brand-assets + godkjente innlegg + evt. produktbilde
        const refs: ImageRef[] = brandRefsFor(input.archetype, {
          isJubilee: detectJubilee(heroText),
          wordmarkVariant: wordmarkVariantFor(input.archetype),
        });

        // Style-refs fra kuratert public/social/approved-posts/<archetype>/-mappe
        for (const ref of approvedRefsFor(input.archetype)) refs.push(ref);

        const scraped = input.source_data as Partial<ScrapedProduct> | null;
        if (scraped?.image_url) {
          const productRef = await fetchImageAsRef(
            scraped.image_url,
            "PRODUCT REFERENCE: scraped product photo from fosen-tools.no for visual/content context. You may incorporate the product theme but DO NOT redraw the product photorealistically — the image should be typography-focused per the archetype spec."
          );
          if (productRef) refs.push(productRef);
        }

        const imgResult = await generateImage({
          prompt: imgPrompt,
          aspectRatio,
          referenceImages: refs,
        });

        for (const img of imgResult.images) {
          const saved = await saveBase64ImageToStorage(
            supabase,
            img.base64,
            img.mimeType,
            input.user_id,
            `${input.topic_kind}-${input.archetype}`
          );
          aiImages.push({
            storage_path: saved.storage_path,
            public_url: saved.public_url,
            archetype: input.archetype,
            prompt: imgPrompt,
          });
        }
      } catch (e) {
        console.error("Image-gen feilet:", e);
        // Ikke fatal — caption-gen var allerede vellykket
      }
    }
  }

  return {
    captions,
    ai_images: aiImages,
    model_used: captionResult.model,
    generation_cost_estimate:
      0.0002 + (aiImages.length > 0 ? 0.04 : 0), // rough estimate
  };
}

// =============================================================================
// URL → topic-context
// =============================================================================

/**
 * Tar en fosen-tools.no URL, scraper produktdata, og pakker som GenerateDraftInput.
 * Caller må selv velge topic_kind og archetype.
 *
 * Fallback: hvis URL-en ikke er en produktside (mangler JSON-LD Product/ProductGroup),
 * scrapes generisk side-innhold (title, meta, h1, intro-paragrafer) i stedet — så
 * bransje-sider, custom-sider og landingssider også kan brukes som tema-kilde.
 */
export async function buildDraftInputFromUrl(
  url: string,
  options: {
    topic_kind?: TopicKind;
    archetype?: Archetype;
    brief?: string;
    user_id?: string;
  } = {}
): Promise<GenerateDraftInput> {
  try {
    const scraped = await scrapeProductByUrl(url);
    return {
      topic_kind: options.topic_kind ?? "produktlansering",
      archetype: options.archetype ?? "foto",
      title: scraped.name,
      brief: options.brief,
      source_url: url,
      source_data: scraped,
      user_photos: scraped.image_url
        ? [{ path: scraped.image_url, public_url: scraped.image_url }]
        : [],
      user_id: options.user_id,
    };
  } catch (err) {
    if (!(err instanceof ScrapeProductError) || err.status !== 422) throw err;

    const page = await scrapePageByUrl(url);
    return {
      topic_kind: options.topic_kind ?? "evergreen",
      archetype: options.archetype ?? "foto",
      title: page.name,
      brief: options.brief,
      source_url: url,
      source_data: {
        name: page.name,
        bullets: page.bullets,
        ...(page.description ? { description: page.description } : {}),
        ...(page.image_url ? { image_url: page.image_url } : {}),
      },
      user_photos: page.image_url
        ? [{ path: page.image_url, public_url: page.image_url }]
        : [],
      user_id: options.user_id,
    };
  }
}

export { DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL };
