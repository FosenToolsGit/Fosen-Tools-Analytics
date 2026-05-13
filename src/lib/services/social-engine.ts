import { SupabaseClient } from "@supabase/supabase-js";
import {
  generateCaptionsJson,
  generateImage,
  DEFAULT_TEXT_MODEL,
  DEFAULT_IMAGE_MODEL,
} from "./gemini";
import { scrapeProductByUrl, type ScrapedProduct } from "./scrape-product";

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
 * Bygger Imagen-prompt fra archetype + kontekst.
 * Bruker archetype-spec sin "AI-prompt mal"-seksjon som mal.
 */
export function buildImagePrompt(
  archetype: Archetype,
  context: {
    title: string;
    captions?: GenerateDraftResult["captions"];
    statement?: string;
  }
): { prompt: string; aspectRatio: "1:1" | "4:5" | "16:9" | "9:16" } {
  // Aspect ratio per archetype (matcher corpus archetype-metadata)
  const aspectMap: Record<Archetype, "1:1" | "4:5" | "16:9" | "9:16"> = {
    foto: "1:1",
    definisjon: "1:1",
    statement: "1:1",
    kontrast: "4:5",
    milepael: "1:1",
    sitat: "4:5",
    sertifikat: "1:1",
  };

  // Negative prompt-segmenter for ALLE — Forbudene fra Native-avvisningene
  const sharedNegative = `STRICTLY NO: photorealistic foam inserts, photorealistic tool boxes, AI-generated humans or faces, cartoon characters, hand-drawn illustrations, flowers, abstract CAD sketches with empty rectangles, fake product photos, blue or green accents, gradient backgrounds (except gold on jubilee numbers), watermarks, stock-photo aesthetics, decorative noise, hashtag visualizations.`;

  const palette = `COLOR PALETTE STRICTLY LIMITED: FT-red #ED1C24, FT-ink #0F1115, white #FFFFFF. Optional gold gradient (#85704D → #DBB78B) only for jubilee numbers. Manrope font family.`;

  switch (archetype) {
    case "definisjon":
      return {
        prompt: `Dictionary-style poster, solid background (choose FT-red #ED1C24 OR FT-ink #0F1115).
Center-aligned typography ONLY:
  - Top: small italic word-class label (e.g. "adjektiv", "substantiv")
  - Hero line: the keyword "${context.title}" in MASSIVE Manrope 800, white, tight tracking
  - Below: 2-line definition in Manrope 500 sentence case
Footer: small FT-logo wordmark (white) bottom-left, 4mm equivalent height.
Editorial swiss-design feel. ${palette} ${sharedNegative}`,
        aspectRatio: aspectMap[archetype],
      };

    case "statement":
      return {
        prompt: `Maximalist typography poster, solid FT-red #ED1C24 full bleed.
ONE bold short statement centered: "${context.statement ?? context.title}" in Manrope 900, pure white.
Tight tracking, MASSIVE size (text fills 70% of canvas width).
Period/punctuation same size.
Footer: small FT-logo (white) bottom-center.
No other elements. ${palette} ${sharedNegative}`,
        aspectRatio: aspectMap[archetype],
      };

    case "kontrast":
      return {
        prompt: `Two-column comparison poster, vertical center divider.
LEFT column (50% width): muted gray #6E6E6E background. Header: negative side label. 3 bullets in white Manrope 500.
RIGHT column (50% width): FT-red #ED1C24 background. Header: "${context.title}". 3 bullets in white Manrope 600.
Top center: small FT-logo wordmark (white) bridging both columns.
${palette} ${sharedNegative}`,
        aspectRatio: aspectMap[archetype],
      };

    case "milepael":
      return {
        prompt: `Massive number poster. Background: solid FT-ink #0F1115.
Center: the number "${context.title}" in Manrope 900, MASSIVE (filling 80% of canvas height).
Number color: FT-red #ED1C24 OR gold gradient (#85704D → #DBB78B) for jubilee context.
Crisp edges, no glow, no shadows.
Above number: small uppercase Manrope 500 label (white, tracked).
Below number: single-line caption (white, Manrope 400).
Footer: small FT-logo wordmark (white).
${palette} ${sharedNegative}`,
        aspectRatio: aspectMap[archetype],
      };

    case "sitat":
      return {
        prompt: `Quote-card poster. Background: solid FT-ink #0F1115.
Center: large pull-quote text in Manrope 500 italic, white, occupying 55% of canvas height.
Quote: "${context.statement ?? context.title}"
Top-left: huge red opening-quote glyph (FT-red #ED1C24), about 1/3 canvas size, behind text.
Below quote: attribution line in Manrope 400, white, smaller — but actual attribution text will be in the post caption.
Footer: small FT-logo wordmark (white) bottom-center.
${palette} ${sharedNegative}`,
        aspectRatio: aspectMap[archetype],
      };

    case "sertifikat":
      return {
        prompt: `Trust-signal poster on solid white #FFFFFF background.
Top: heading "${context.title}" in Manrope 700, FT-ink #0F1115.
Center: 3-5 ABSTRACT geometric placeholder marks (circles, hexagons) — NOT real certification logos — each with a short text label in Manrope 600 below it.
Bottom: 2-line explainer text in Manrope 400 FT-ink.
Right edge: full-height vertical FT-red #ED1C24 stripe, ~4mm wide.
Footer: small FT-logo wordmark (FT-ink) bottom-left.
${palette} ${sharedNegative}`,
        aspectRatio: aspectMap[archetype],
      };

    case "foto":
    default:
      // foto = ekte foto, ingen AI-bilde-gen
      return { prompt: "", aspectRatio: "1:1" };
  }
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
    const { prompt: imgPrompt, aspectRatio } = buildImagePrompt(
      input.archetype,
      {
        title: input.title,
        statement: input.brief,
        captions,
      }
    );

    if (imgPrompt) {
      try {
        const imgResult = await generateImage({
          prompt: imgPrompt,
          aspectRatio,
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
}

export { DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL };
