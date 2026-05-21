import { SupabaseClient } from "@supabase/supabase-js";
import {
  generateCaptionsJson,
  generateImage,
  DEFAULT_TEXT_MODEL,
  DEFAULT_IMAGE_MODEL,
  type ImageRef,
} from "./gemini";
import { approvedRefsFor, fetchImageAsRef } from "./brand-assets";
import {
  compositeFosenToolsWordmark,
  wordmarkVariantForBg,
} from "./composite-wordmark";
import { compositeText, type CompositeTextLayout } from "./composite-text";
import { getOrCreateImageBrandCache } from "./gemini-cache";
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
  | "produkt_variant"
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
  | "sertifikat"
  | "produkt_variant";

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
  /**
   * Visuell stil for bildegen. Henter ekstra refs fra public/social/approved-posts/_<style>/.
   * "auto" eller undefined = bare archetype + _all/-refs.
   * Faktiske mapper bestemmer hva som er gyldig (profesjonell, skreddersydd, ...).
   */
  style?: string | null;
}

export interface GenerateDraftResult {
  captions: {
    facebook: { caption: string; first_comment_hashtags?: string; alt_text: string; reasoning: string };
    instagram: { caption: string; first_comment_hashtags: string; alt_text: string; reasoning: string };
    linkedin: { caption: string; hashtags: string; alt_text: string; reasoning: string };
    /** Kort headline optimalisert for poster-display (5-8 ord, FT-tone) */
    image_headline?: string;
    /** ETT nøkkelord fra image_headline som skal være FT-rødt for emphasis */
    image_headline_red_word?: string;
    /** Optional kort tagline-linje under hovedheadline (3-6 ord italic) */
    image_subtagline?: string;
    /** Optional støttesetning (definisjon-tekst, trust-anker, kontekst — maks 12 ord) */
    image_body?: string;
    /** Kontrast venstre-spalte-label (default «HYLLEVARE») */
    image_kontrast_left_label?: string;
    /** Kontrast høyre-spalte-label (default «SKREDDERSYDD») */
    image_kontrast_right_label?: string;
    internal_notes?: string;
  };
  ai_images: Array<{
    storage_path: string;
    public_url: string;
    archetype: Archetype;
    prompt: string;
    /** Hvilken plattform dette bildet er optimalisert for. Tom = legacy single-image. */
    platform?: "facebook" | "instagram" | "linkedin";
    /** Aspect ratio som ble brukt ved generering (f.eks. "1:1", "4:5", "16:9"). */
    aspect_ratio?: string;
  }>;
  model_used: string;
  generation_cost_estimate: number;
}

/**
 * Per-plattform aspect-ratio for AI-genererte bilder.
 *
 *   Facebook  → 1:1   (sikker i alle feed-plasseringer)
 *   Instagram → 4:5   (portrait, max engagement i feed — SDK mapper til 3:4)
 *   LinkedIn  → 16:9  (landscape, optimalt for desktop-scroll og link-preview)
 *
 * Bestilt av bruker 21. mai 2026 — ett bilde per plattform med riktig aspect.
 */
export const PLATFORM_ASPECT_RATIOS: Array<{
  platform: "facebook" | "instagram" | "linkedin";
  aspectRatio: "1:1" | "4:5" | "16:9";
  label: string;
}> = [
  // MIDLERTIDIG: kun 1:1 mens vi itererer på tekst-rendering for produkt_variant.
  // Aktiver IG 4:5 og LI 16:9 igjen når tekst er stabil.
  { platform: "facebook", aspectRatio: "1:1", label: "Facebook feed (1:1)" },
];

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
  "image_headline": "<KORT FT-stil hovedheadline for poster-bildet. 5-8 ord på norsk. Naturlig setning som splitter pent over 2-3 linjer. SELVSTENDIG (ikke avhengig av annet for kontekst). End med . eller ?. Eksempler: «Halvparten av skuffene bør stå tomme.» / «Bygget for null feilmargin.» / «Forsvarets standard i din hverdag.»>",
  "image_headline_red_word": "<ETT nøkkelord fra image_headline som skal være FT-rødt for emphasis (resten av teksten er hvit). Velg ordet som visuelt anker meningen. Hvis ingen åpenbar, la være tomt.>",
  "image_subtagline": "<Valgfri kort italic-linje under headline (3-6 ord). Tomt hvis ingen passer. Eksempler: «Bygget for null feilmargin.», «Visuell kontroll. Ikke fredagsdugnad.»>",
  "image_body": "<MAKS 8 ord. KORT, presis, naturlig norsk. Foretrekk enkle ord (Nano Banana misstaver komplekse). For DEFINISJON: ordbok-stil. For SERTIFIKAT: trust-anker. For MILEPAEL: kontekst. Eksempler: «CAD-tegnet og CNC-maskinert.», «Bygget for null feilmargin.», «Levert til Forsvaret i tjuesju år.» La være tomt hvis ingen kort passer.>",
  "image_kontrast_left_label": "<KUN for archetype=kontrast. 1-2 ord. Default «HYLLEVARE» når kontrasten er FT vs hyllevare. Tomt hvis ikke kontrast.>",
  "image_kontrast_right_label": "<KUN for archetype=kontrast. 1-2 ord. Default «SKREDDERSYDD». Tomt hvis ikke kontrast.>",
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
 *
 * Vi sender IKKE source_url eller rå HTML til Gemini — kun strukturert
 * data som ble scrapet og kuratert server-side. Det gir bedre kontroll
 * over hva modellen ser, hindrer URL-overslukning, og gir den klar
 * side-spesifikk kontekst i stedet for å la den gjette fra URL-shape.
 */
export function buildUserPrompt(input: GenerateDraftInput): string {
  const parts: string[] = [];

  parts.push(
    `# Topic-input\n\nKind: ${input.topic_kind}\nArchetype: ${input.archetype}\nTittel: ${input.title}`
  );

  if (input.brief) {
    parts.push(`\n## Brief fra operatør\n\n${input.brief}`);
  }

  if (input.source_data && Object.keys(input.source_data).length > 0) {
    const scraped = input.source_data as Partial<ScrapedProduct> & {
      sections?: string[];
      description?: string;
    };
    const isProduct = !!(
      scraped.manufacturer ||
      scraped.sku ||
      scraped.price_now ||
      scraped.discount_pct
    );

    if (isProduct) {
      // Produktside-flow (har JSON-LD Product)
      const lines: string[] = [];
      if (scraped.name) lines.push(`Navn: ${scraped.name}`);
      if (scraped.manufacturer)
        lines.push(`Produsent: ${scraped.manufacturer}`);
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
    } else {
      // Side-fallback-flow (custom-side, bransje-side, landingsside)
      const lines: string[] = [];
      if (scraped.name) lines.push(`Sidetittel (H1): ${scraped.name}`);
      if (scraped.description)
        lines.push(`Meta-beskrivelse: ${scraped.description}`);
      if (scraped.sections?.length)
        lines.push(
          `Under-temaer på siden (H2):\n  - ${scraped.sections.join("\n  - ")}`
        );
      if (scraped.bullets?.length)
        lines.push(
          `Intro-tekst fra siden:\n  - ${scraped.bullets.join("\n  - ")}`
        );
      if (lines.length > 0) {
        parts.push(
          `\n## Strukturert sideinnhold\n\n` +
            `(Disse feltene er scrapet og rensket server-side fra fosen-tools.no — bruk dem som kilde til vinkling, men ikke siter dem direkte.)\n\n` +
            lines.join("\n")
        );
      }
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
// =============================================================================
// FT VISUAL LANGUAGE — felles design-tokens for ALLE archetype-prompts
//
// Analysert fra 29 godkjente FT-poster. Tre signature-elementer som er
// gjennomgangende i alle: (1) blueprint-tekniske dekor-linjer i hjørner,
// (2) Manrope Black multi-line typografi, (3) FOSEN TOOLS wordmark i frame
// bunn-senter. Disse må være med på HVER bildegenerering.
// =============================================================================

const FT_DESIGN = {
  bgRed: `Full-bleed solid FT-red #ED1C24 background — saturated, no gradient.`,
  bgInk: `Full-bleed FT-ink #0F1115 background (deep dark gray-black) with a subtle FT-red #ED1C24 radial glow originating from one corner (15-20% opacity max), fading smoothly to near-black at the opposite corner.`,
  bgCream: `Solid light beige newspaper-print background, color #F5F1E8 — warm BUT NOT pink, NOT rosa, NOT salmon. Think uncoated cream paper / vintage book page. Slightly desaturated yellow-beige, not warm enough to look orange. If unsure, lean toward more gray than warm.`,

  decorOnDark: `MANDATORY blueprint decoration (thin white lines, 1-1.5px, 50-60% opacity — this is FT's engineering DNA signature, EVERY FT poster has it):
- TOP-RIGHT corner: a CAD-style dimension/ruler line with small tickmarks, length ~10-15% of canvas width
- BOTTOM-LEFT corner: a small 3x3 grid pattern + thin technical corner-bracket line
- BOTTOM-RIGHT corner: a small gear/cog outline OR a circle-with-radiating-dots pattern, + a thin connecting callout line
- TOP-LEFT corner: a thin technical line-connector with a tiny terminator dot
Do not skip these. They are mandatory brand signature.`,

  decorOnCream: `MANDATORY: same blueprint decoration as the FT signature (CAD-dimension line top-right, grid bottom-left, gear bottom-right, connector top-left), but rendered in FT-ink #0F1115 at 25-30% opacity (since background is light).`,

  // VIKTIG: AI skal IKKE rendre FOSEN TOOLS wordmark — vi composite-r den ekte
  // PNG-en server-side via compositeFosenToolsWordmark(). Nano Banana 2 misstaver
  // den konsekvent («SUSEN TOOLS» etc). Reserve plass i layout, men ikke skriv.
  wordmarkReservedSpace: `WORDMARK SPACE — ABSOLUTE REQUIREMENT: the bottom 15-20% of the canvas MUST be ENTIRELY EMPTY (or contain only the thin corner blueprint decoration). This area is reserved for post-processing.

DO NOT render — under any circumstances — ANY of the following in the bottom area or anywhere else in the image:
- "FOSEN TOOLS" text
- "Fosen Tools" text
- Any signature, logo, brand mark, wordmark
- The literal text "wordmark", "composite", "logo", or any meta-label
- Any framed text capsule or pill-shape with text inside
- ANY duplicate brand mark (a single wordmark would already be wrong — multiple is even worse)

The bottom strip must be VISUALLY BLANK — only the canvas background color (red, ink, or cream as specified) with possibly the blueprint corner decoration. ANY text or logo rendered there will be considered a generation failure and counted as a typo. We add the official FT wordmark PNG ourselves server-side after AI generation completes — your job is to leave the space ABSOLUTELY EMPTY for us.`,

  typographyOnDark: `TYPOGRAPHY — Fosen Tools nettside-stil (matcher fosen-tools.no/ftseo-heading):
- PRIMARY: Korolev Bold 700 (commercial) — substitute with closest visual match like Heebo Bold or Manrope ExtraBold. The font MUST be a condensed/semi-condensed geometric sans-serif with sharp terminals and industrial precision feel.
- Headlines: ALL UPPERCASE, letter-spacing 0.08em (tracked), pure white #FFFFFF
- Hero-text size: MASSIVE — fills 65-80% of canvas width when stacked
- Line-height: tight (1.1-1.15) for multi-line stacks
- Multi-line: break on natural phrase boundaries, NEVER hyphenate
- ONE keyword inside headline MAY be FT-red #ED1C24 for emphasis (sparingly)
- REQUIRED: a thin solid FT-red #ED1C24 horizontal line (short, roughly 1/10 of canvas width, 2-3 pixels thick), centered horizontally, sits 16-24px BELOW the headline. This is a PURELY VISUAL graphic element — a solid red rectangle/line shape. DO NOT render any text labels, dimension markers, or annotations like "70px" near or on it. The line is just a red line, nothing more. (This is the FT signature underline from .ftseo-heading::after on fosen-tools.no — every FT heading has it.)`,

  typographyOnCream: `TYPOGRAPHY — Fosen Tools nettside-stil:
- PRIMARY: Korolev Bold 700 — substitute with Heebo Bold / Manrope ExtraBold (condensed geometric sans-serif).
- Headlines: ALL UPPERCASE for short labels (under 5 words), letter-spacing 0.08em. For the dictionary-style hero word in definisjon: lowercase or mixed-case is OK if it matches the «Skreddersydd»-ref.
- Hero-text color: FT-ink #111111 (NOT pure black — slightly softer)
- Body text: 17px proportional, color #222222, line-height 1.7
- REQUIRED: a thin solid FT-red #ED1C24 horizontal line (short, roughly 1/10 of canvas width, 2-3 pixels thick), positioned below the hero word's hairline area. PURELY VISUAL — DO NOT render any "70px" or dimension text near it. Same as ftseo-heading::after — every FT heading has it.`,

  optionalSubtagline: `OPTIONAL SUBTAGLINE: ONE short italic line above the wordmark frame, small (3-5% canvas height), 60-70% opacity. Example tone: "Bygget for null feilmargin", "Visuell kontroll. Ikke fredagsdugnad.", "5S skal gjøre rot umulig." Include ONLY if you can compose one that genuinely fits the topic — otherwise omit entirely. NEVER include if it would mean inventing new claims.`,

  negatives: `STRICTLY AVOID: AI-generated humans or faces, cartoon characters, photo-realistic stock photography, decorative noise, watermarks, fake or clip-art certification badges, generic shield-with-checkmark icons that look like clip-art (if a shield is needed it must be custom geometric FT-style), blue/green/orange/yellow accents (palette is ONLY FT-red #ED1C24, FT-ink #0F1115, white, plus optional gold gradient #85704D→#DBB78B on jubilee marks), gradient backgrounds, abstract empty circles or hexagons "representing" things, sketch-doodle illustrations, hand-drawn-marker aesthetics, beveled 3D effects, lens flares, fake product photos.`,

  spellingRule: `NORWEGIAN SPELLING IS CRITICAL: render every Norwegian word EXACTLY as written, character-by-character, including æ ø å. DO NOT invent letters, combine words, or substitute English-looking spellings. DO NOT add extra letters at word-ends. If a word feels long, render it correctly anyway — never truncate mid-word, never approximate. Examples of FORBIDDEN typos: "verktøylössurnees" (correct: "verktøyløsninger"), "skuffenne" (correct: "skuffen"). If unsure of a word, prefer to OMIT IT rather than misspell. Better short and correct than long and wrong.`,

  references: `BRAND REFERENCE images at the start of this conversation: (1) the official FT wordmark — use EXACTLY, do not redraw or invent letterforms; (2) the official FT color palette — match precisely; (3) approved-post style references showing the target visual language with the mandatory blueprint decoration, multi-line bold typography, and framed wordmark. Replicate that language.`,
};

/** Lag en wireframe-illustrasjon-instruksjon for et gitt subject. */
function ftHeroWireframe(subject: string): string {
  return `HERO ELEMENT — wireframe line-illustration: a single large CAD-blueprint line drawing of ${subject}, rendered in thin white lines (1.5-2px) with NO fills, isometric or 3/4 perspective. Size: 40-55% of canvas. Position: behind/around text, must not overlap critical text. Style: clean technical drafting (NOT sketchy, NOT realistic render, NOT marker-doodle). Same line-weight and aesthetic as the corner decoration but larger.`;
}

/**
 * Stil-overstyringer som appenderes ETTER archetype-prompten. Recency-bias i
 * Gemini gjør at de siste direktivene vinner — derfor kan vi bytte ut bakgrunn
 * og mood her uten å rewrite hele prompten. Tomme strings = ingen overstyring.
 */
function styleModifier(
  style: string | null | undefined,
  archetype?: Archetype
): string {
  // Definisjon har unik cream-bg-layout som IKKE skal overstyres av style.
  // Style-overrides gir mening for andre archetyper som har red/ink-bg.
  if (archetype === "definisjon") return "";
  if (style === "profesjonell") {
    return `

=== STYLE OVERRIDE: PROFESJONELL (FT-HVERDAG) ===
OVERRIDE the background and mood instructions above with this:
- Background: full-bleed FT-ink #111111 (deep gray-black, matches fosen-tools.no ft-color-ink), apply a subtle FT-red #ED1C24 radial glow from one corner (10-20% opacity max), fading to near-black at opposite corner.
- ATMOSPHERE ELEMENT — center/lower area: include a FADED, BLURRED background sketch (white/light-gray outline drawing, NO fill, 10-18% opacity) of a FOSEN TOOLS-themed scene — choose one:
  (a) A modular verktøyvogn (tool cart) with multiple open drawers showing color-segmented HDFI foam inserts holding tools in precise outlined positions (THIS IS THE PRIMARY CHOICE — matches FT product DNA)
  (b) A workshop bench with a HDFI insert and a few tools (wrenches, screwdrivers) cut precisely into the foam
  (c) A close-up of an HDFI drawer with one tool slot empty (highlighting visual control)
  Do NOT use military jets, vehicles, or aviation imagery unless the brief explicitly references aviation/defense use cases.
- Style: clean wireframe blueprint sketch lines (1.5px) — engineering CAD aesthetic, NOT marker-doodle. Same line-weight as the corner decoration but larger and centrally placed behind the text.
- Lighting: cinematic depth, premium engineering brand feel.
- Text: hero in white, ONE keyword may be FT-red.
- Wordmark variant: white.`;
  }
  if (style === "skreddersydd") {
    return `

=== STYLE OVERRIDE: SKREDDERSYDD (CAD/WIREFRAME) ===
OVERRIDE the background and mood instructions above with this:
- Background: full-bleed FT-red #ED1C24, overlaid with thin white wireframe technical drawings — verktøyvogn med HDFI-skuffer, calipers, gears, CNC tool outlines, blueprint grids (15-25% opacity, no fills).
- Atmosphere: engineering precision, CAD-blueprint mood, hand-drafted technical illustration aesthetic. Wireframe should evoke Fosen Tools' HDFI-CADLAB engineering process specifically.
- Hero text remains as specified, layered ON TOP of wireframe with full opacity. Text stays readable.
- Wordmark in white variant, positioned per archetype spec.`;
  }
  return "";
}

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
    /** Visuell stil-overstyring (profesjonell/skreddersydd) */
    style?: string | null;
    /** Ett ord fra hero_text som skal være FT-rødt (LLM-komponert) */
    red_word?: string | null;
    /** Kort italic-tagline under hero (LLM-komponert) */
    subtagline?: string | null;
    /** Støttesetning (verbatim) — brukes i definisjon/sertifikat (LLM-komponert) */
    body?: string | null;
    /** Kontrast venstre-spalte-label (verbatim) */
    kontrast_left?: string | null;
    /** Kontrast høyre-spalte-label (verbatim) */
    kontrast_right?: string | null;
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
    produkt_variant: "1:1",
  };

  // Hero-tekst for caption-bruk (kan være lang)
  const rawHero = (
    context.hero_text ??
    context.statement ??
    context.title ??
    ""
  ).trim();
  const heroText =
    rawHero.length > 140 ? rawHero.slice(0, 137).trim() + "…" : rawHero;

  // KORT hero-tekst for IMAGE-rendering — Nano Banana misstaver lange norske
  // ord. Maks ~60 tegn. Strategi: (1) prøv å kutte på setningsgrense (.!?)
  // innenfor max-grensen — beholder komplette setninger. (2) ellers kutt på
  // ord-grense. Aldri midt-i-ord, aldri midt-i-setning hvis vi kan unngå det.
  function shortenForImage(text: string, maxChars = 60): string {
    if (text.length <= maxChars) return text;

    // (1) Setnings-kutt: finn siste .!? innenfor maxChars
    const window = text.slice(0, maxChars + 1);
    const sentenceMatch = window.match(/^[\s\S]*[.!?](?=\s|$)/);
    if (sentenceMatch) {
      const cut = sentenceMatch[0].trim();
      if (cut.length >= 20) return cut; // unngå for korte sentence-cuts
    }

    // (2) Ord-kutt: bygg opp ord for ord til vi treffer maxChars
    const words = text.split(/\s+/);
    let out = "";
    for (const w of words) {
      const next = out ? `${out} ${w}` : w;
      if (next.length > maxChars) break;
      out = next;
    }
    return out || words[0]; // fallback
  }
  const heroTextShortMixedCase = shortenForImage(heroText);
  // Korolev FT-stil = ALL UPPERCASE for headlines. Uppercase server-side så
  // Gemini bare rendrer verbatim (eliminerer "Title Case"-inkonsistens).
  // Definisjon-archetype beholder mixed case (matcher ordbok-stil).
  const heroTextShort =
    archetype === "definisjon"
      ? heroTextShortMixedCase
      : heroTextShortMixedCase.toUpperCase();

  const eyebrow = context.eyebrow?.toLowerCase().trim() ?? "";
  // red_word må også uppercases for å matche heroTextShort-renderingen
  const redWord = context.red_word?.trim()
    ? archetype === "definisjon"
      ? context.red_word.trim()
      : context.red_word.trim().toUpperCase()
    : "";
  const subtagline = context.subtagline?.trim() ?? "";
  const body = context.body?.trim() ?? "";
  const kontrastLeft = context.kontrast_left?.trim() || "HYLLEVARE";
  const kontrastRight = context.kontrast_right?.trim() || "SKREDDERSYDD";

  // Instruks om red-keyword-emphasis (kun hvis caption-LLM ga oss et ord
  // som faktisk finnes i hero-teksten).
  const redWordInstruction =
    redWord && heroTextShort.toLowerCase().includes(redWord.toLowerCase())
      ? `MANDATORY RED EMPHASIS — CRITICAL: the COMPLETE word "${redWord}" (all ${redWord.length} letters: ${redWord.split("").join("-")}) inside the headline MUST be rendered in FT-red #ED1C24 (vivid red, not maroon). Render the ENTIRE word red — NOT just the first 1-2 letters, NOT a fragment. All OTHER headline words remain pure white #FFFFFF. This red-word treatment is REQUIRED, not optional — it is the FT signature visual hook. Do not skip it. Do not change which word is red. Render exactly: where "${redWord}" appears in the headline, color ALL letters of it FT-red; everything else white.`
      : `(No red-keyword emphasis for this post — all headline text is white.)`;

  // Subtagline-instruks (overstyrer FT_DESIGN.optionalSubtagline når satt)
  const subtaglineInstruction = subtagline
    ? `SUBTAGLINE — render EXACTLY this short line just above the wordmark area, small italic white at 70% opacity: "${subtagline}"`
    : `(Skip subtagline for this post.)`;

  switch (archetype) {
    case "definisjon":
      // Ordbok-stil på krem bg. Match referansene «Skreddersydd» og «Verktøykontroll».
      return {
        prompt: `Editorial dictionary-entry poster.

LAYOUT (match the FT «Skreddersydd» reference exactly):
1. ${FT_DESIGN.bgCream}
2. Hero word at upper-left third, MASSIVE (Manrope Black, FT-ink #0F1115, 55-65% canvas width): "${heroTextShort}"
3. Immediately to the right of the hero word, in smaller italic gray: "${eyebrow || "adjektiv"}"
4. (Skip pronunciation guide — Nano Banana misspells phonetic transcriptions. Leave space here clean.)
5. Thin horizontal hairline below the hero word, FT-ink at 20% opacity, full width
6. ${
          body
            ? `Definition sentence below the hairline — render this text EXACTLY (verbatim, do not paraphrase, do not invent words), Manrope Regular, FT-ink, smaller (~5% canvas height): "${body}" — end with a period. ONE noun MAY be visually underlined with a thin FT-red curved hand-drawn underline.`
            : `(No definition body for this post — leave whitespace below hairline.)`
        }

NO OTHER TEXT in the image (no footnote, no pronunciation guide, no examples). The hero word + eyebrow + optional body are the COMPLETE text content. Do NOT invent supporting text.

${FT_DESIGN.spellingRule}

${FT_DESIGN.decorOnCream}

${FT_DESIGN.wordmarkReservedSpace}

${FT_DESIGN.typographyOnCream}

${FT_DESIGN.references}

${FT_DESIGN.negatives}${styleModifier(context.style, archetype)}`,
        aspectRatio: aspectMap[archetype],
      };

    case "statement":
      // Stor multi-line statement på rød bg (FT-signatur-stil).
      return {
        prompt: `FT-style typographic poster — match the «Du trenger ikke militært budsjett» reference.

LAYOUT:
1. ${FT_DESIGN.bgRed}
2. The headline IS the hero — render this text EXACTLY, broken across 2-4 lines, MASSIVE bold sans-serif (Manrope Black, white, fills 70-80% of canvas width when wrapped):
"${heroTextShort}"
   Break lines on natural phrase boundaries (do NOT hyphenate words). End with a period if statement-form.
   ${redWordInstruction}
3. ${subtaglineInstruction}

${FT_DESIGN.spellingRule}

${FT_DESIGN.decorOnDark}

${FT_DESIGN.wordmarkReservedSpace}

${FT_DESIGN.typographyOnDark}

${FT_DESIGN.references}

${FT_DESIGN.negatives}${styleModifier(context.style, archetype)}`,
        aspectRatio: aspectMap[archetype],
      };

    case "kontrast":
      // 4:5 to-spalter sammenligning, men nå med FT-decor + framed wordmark.
      // ALL tekst er VERBATIM fra caller — ingen AI-komposisjon (eliminer typo-risk).
      return {
        prompt: `Vertical two-column comparison poster (4:5), FT-style.

LAYOUT:
1. LEFT column (50% width): muted gray #4D4D4D background (slightly desaturated cool, NOT pure gray).
   - At top: small white uppercase label, tracked, rendered EXACTLY as: "${kontrastLeft}"
2. RIGHT column (50% width): FT-red #ED1C24 background.
   - At top: small white uppercase label, tracked, rendered EXACTLY as: "${kontrastRight}"
3. Center divider: thin white vertical line (1.5px), full height of the columns.
4. Optional small wireframe icon in each column (white line-art, 1.5px) representing the contrast — only abstract icons (e.g. messy-vs-organized drawer outline). NO text labels on icons.
5. Top center above columns: ${heroTextShort ? `render the framing line EXACTLY as: "${heroTextShort}" (small white italic, single line)` : "(no top framing line)"}.

NO OTHER TEXT in the image. Do NOT compose bullets, descriptions, or supporting sentences. The two labels and optional top line are the COMPLETE text content. Any additional text would be a typo and must be omitted.

${FT_DESIGN.spellingRule}

${FT_DESIGN.decorOnDark}

${FT_DESIGN.wordmarkReservedSpace}

${FT_DESIGN.references}

${FT_DESIGN.negatives}${styleModifier(context.style, archetype)}`,
        aspectRatio: aspectMap[archetype],
      };

    case "milepael":
      // Massiv tall + støttekst — match «100 år med verktøy i familien»-referansen.
      return {
        prompt: `Milestone poster — match the FT «100 år med verktøy i familien» reference exactly.

LAYOUT:
1. ${FT_DESIGN.bgRed}
2. Hero number stacked at upper half — MASSIVE (60% canvas height), Manrope Black italic-slanted display style, white. Extract the primary number from the text: "${heroTextShort}" — render JUST the number (e.g. "100", "25", "20+", "1200+").
3. Small italic label inline to the right of the number, lowercase, smaller (15-20% of number height): the unit (e.g. "år", "timer", "kunder")
4. ${body ? `Below the number, supporting headline in 2-3 lines of bold white sans-serif (Manrope Black, ~12-15% canvas height per line). Render EXACTLY as: "${body}". Do NOT paraphrase, do NOT add words.` : `(No supporting body for this post — leave whitespace below number.)`}
5. If the number is "25" or "100" (jubileum), color the number with a gold gradient: #85704D at top → #DBB78B at bottom.

NO OTHER TEXT in the image. The number + eyebrow + optional body are the COMPLETE text content.
${redWordInstruction}
${subtaglineInstruction}

${FT_DESIGN.spellingRule}

${FT_DESIGN.decorOnDark}

${FT_DESIGN.wordmarkReservedSpace}

${FT_DESIGN.references}

${FT_DESIGN.negatives}${styleModifier(context.style, archetype)}`,
        aspectRatio: aspectMap[archetype],
      };

    case "sitat":
      // Sitat-kort. Match «Vi trenger åtte skuffer.»-referansen.
      return {
        prompt: `Quote-card poster (4:5), FT-style.

LAYOUT:
1. ${FT_DESIGN.bgRed}
2. The quote IS the hero. Render this text EXACTLY in white Manrope Black wrapped across 2-3 lines, fills 65-75% canvas width, surrounded by chevron-style quotation marks «...»:
«${heroTextShort}»
3. ${subtagline ? `BELOW the quote (slightly smaller, regular weight, white): render EXACTLY as: "${subtagline}"` : "(No reaction-line for this post — leave whitespace below quote.)"}
4. NO attribution, NO supporting sentence in the image. The quote + optional reaction-line are the COMPLETE text content.
${redWordInstruction}

${FT_DESIGN.spellingRule}

${FT_DESIGN.decorOnDark}

${FT_DESIGN.wordmarkReservedSpace}

${FT_DESIGN.references}

${FT_DESIGN.negatives}${styleModifier(context.style, archetype)}`,
        aspectRatio: aspectMap[archetype],
      };

    case "sertifikat":
      // Trust-anker. Match «Forsvarets verktøykontroll i din hverdag»-referansen
      // EKSAKT — mørk bg med skjold som hero, ikke abstrakte sirkler.
      return {
        prompt: `Trust-signal poster — match the FT «Forsvarets verktøykontroll i din hverdag» reference EXACTLY.

LAYOUT:
1. ${FT_DESIGN.bgInk}
2. UPPER HALF (60% canvas height): a single LARGE FT-red #ED1C24 SHIELD shape, centered horizontally. The shield is a custom geometric FT-style shape (rounded top, pointed bottom — NOT a generic clip-art shield, NOT a heraldic crest). Inside the shield, a single bold WHITE checkmark glyph, centered, filling ~50% of shield interior.
3. LOWER HALF (40% canvas height): set on a slightly darker black band that ends at the shield's bottom edge (subtle band-cut effect). Render the headline EXACTLY as given below, broken across 2-3 lines, MASSIVE bold sans-serif (Manrope Black, fills 75% canvas width).
   Headline text (use VERBATIM — do not paraphrase, do not add words): "${heroTextShort}"
   ${redWordInstruction}
4. ${
        body
          ? `Trust-anchor sentence below headline (white, small, italic-ish, single line, ~50% opacity) — render EXACTLY: "${body}"`
          : subtaglineInstruction
      }

${FT_DESIGN.spellingRule}

${FT_DESIGN.decorOnDark}

${FT_DESIGN.wordmarkReservedSpace}

${FT_DESIGN.typographyOnDark}

${FT_DESIGN.references}

${FT_DESIGN.negatives}${styleModifier(context.style, archetype)}`,
        aspectRatio: aspectMap[archetype],
      };

    case "produkt_variant":
      // AI rendrer ALT selv (swatches + headline + labels + body).
      // Server-side composite legger kun på FT-wordmark etterpå.
      // Tekst-instruksjonene er ekstra eksplisitte for å unngå norske-bokstav-feil.
      return {
        prompt: `FT-style product-variant poster — HDFI fargevisning. Square 1:1 format.

═══════════════════════════════════════════════════════════════
NORWEGIAN TEXT RENDERING — CRITICAL, READ TWICE
═══════════════════════════════════════════════════════════════
Norwegian uses three special characters: æ ø å. These MUST be rendered EXACTLY when they appear in text. They are NOT optional, NOT decorative, NOT substituted with a/o.

EVERY text element below must be rendered VERBATIM — character by character — exactly as I write it. If a word feels long or unusual, render it correctly anyway. NEVER substitute, NEVER abbreviate, NEVER remove diacritics.

Forbidden mistakes (these are GENERATION FAILURES):
- "Rod" instead of "Rød" — the ø MUST be visible
- "Bla" instead of "Blå" — the å MUST be visible
- "Lyse gra" instead of "Lyse grå" — the å MUST be visible
- "Sva" instead of "Svart" — render the FULL word
- "EN" instead of "ÉN" — preserve the acute accent
- Combined typos like "RodHwit" or "Bla/Hvit" — render EACH word complete

If you cannot render æ ø å correctly, OMIT the text rather than misspell it. Better to leave blank than to typo. But TRY first — these are standard Latin extended characters, you can render them.

═══════════════════════════════════════════════════════════════

LAYOUT (top to bottom on a 1024×1024 canvas):

1. ${FT_DESIGN.bgInk}
2. ${FT_DESIGN.decorOnDark}

3. TOP THIRD: headline. Render the EXACT character sequence below across 2 lines, MASSIVE bold sans-serif (Manrope Black or Heebo Bold) in pure white #FFFFFF, fills 75% of canvas width. The single word "SEKS" must be rendered in FT-red #ED1C24 — all other words remain white.
   Line 1: "SEKS FARGER."
   Line 2: "ÉN STANDARD."
   (Note: "ÉN" has an acute accent É — render exactly. "FARGER" has no special chars. "STANDARD" ends with a period.)

4. MIDDLE HALF: Render EXACTLY 6 HDFI swatches in a 2×3 grid (NOT 7, NOT 8, no duplicates).

   HDFI ANATOMY (3-layer relief structure — NOT flat painted rectangles):
   - TOP LAYER: rounded rectangular plastic plate in PRIMARY color (dominant surface area)
   - ENGRAVED TOOL CUTOUT inside plate (wrench, screwdriver, or pliers — vary between swatches). Actual milled-out depression, NOT a tool drawn on top.
   - ENGRAVING RIM around cutout: thin 2-4px in SECONDARY color (lower plastic layer exposed by CNC)
   - INSIDE CUTOUT: BLACK FOAM (always black, regardless of plate color)

   SWATCH COLORS + LABELS — render each label EXACTLY as written below, directly below its swatch, in small white sans-serif, ALL diacritics intact:

   ROW 1:
   • Swatch 1: RED plate + WHITE rim + BLACK foam.  Label: "Rød/Hvit"  (R-ø-d-/-H-v-i-t — note the ø)
   • Swatch 2: BLACK plate + WHITE rim + BLACK foam.  Label: "Svart/Hvit"  (full word "Svart", no abbreviation)
   • Swatch 3: WHITE plate + BLACK rim + BLACK foam.  Label: "Hvit/Svart"

   ROW 2:
   • Swatch 4: DEEP NAVY BLUE plate + WHITE rim + BLACK foam.  Label: "Blå/Hvit"  (B-l-å-/-H-v-i-t — note the å)
   • Swatch 5: INDUSTRIAL YELLOW plate + BLACK rim + BLACK foam.  Label: "Gul/Svart"
   • Swatch 6: LIGHT GREY plate + BLACK rim + BLACK foam.  Label: "Lyse grå/Svart"  (note the å in grå)

   Each label is a single line of small white text centered directly below its swatch. No hex codes on swatches, no extra captions, no descriptions.

5. BOTTOM AREA (just above wordmark reserved space): ${body ? `Render the following short italic line EXACTLY as written, centered, white at 70% opacity: "${body}"` : `leave empty`}

${FT_DESIGN.spellingRule}

${FT_DESIGN.wordmarkReservedSpace}

${FT_DESIGN.typographyOnDark}

${FT_DESIGN.references}

${FT_DESIGN.negatives}

OVERRIDE: Blue/yellow/grey colored swatches ARE ALLOWED — they represent actual product variants, not design accent.${styleModifier(context.style, archetype)}`,
        aspectRatio: aspectMap[archetype],
      };

    case "foto":
    default:
      // foto = ekte foto, ingen AI-bilde-gen
      return { prompt: "", aspectRatio: "1:1" };
  }
}

// Mark ftHeroWireframe as referenced for future use (kontrast wireframes etc).
void ftHeroWireframe;

/**
 * Bygger CompositeTextLayout for server-side tekst-overlay basert på
 * archetype + caption-LLM-output. Returnerer null hvis archetype ikke
 * krever overlay (foto) eller hvis vi ikke har implementert layout enda.
 */
function buildTextLayoutFor(
  archetype: Archetype,
  captions: GenerateDraftResult["captions"],
  bodyOverride: string | null
): CompositeTextLayout | null {
  const headline = captions.image_headline?.trim() ?? "";
  const redWord = captions.image_headline_red_word?.trim() ?? null;
  const body =
    bodyOverride?.trim() || captions.image_body?.trim() || null;
  const subtagline = captions.image_subtagline?.trim() || null;

  switch (archetype) {
    case "produkt_variant":
      // AI rendrer alt selv (inkludert labels). Vi gjør IKKE composite-text
      // her — bare wordmark legges på via separat compositeFosenToolsWordmark.
      return null;
    case "statement":
      if (!headline) return null;
      return {
        kind: "statement",
        headline,
        redWord,
        subtagline,
      };
    case "milepael": {
      const heroNumber = extractHeroText("milepael", {
        topic_kind: "milepael",
        archetype,
        title: headline,
        brief: undefined,
      });
      if (!heroNumber) return null;
      return {
        kind: "milepael",
        heroNumber,
        unit: "år",
        body,
      };
    }
    default:
      return null; // foto, definisjon, kontrast, sitat, sertifikat — beholder AI-rendered text for nå
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

  // Milepael: prøv å trekke ut tall først (matcher FT-mønsteret «100 år»)
  if (archetype === "milepael") {
    const numMatch = (brief + " " + title).match(/\b(\d{1,4}\+?)\b/);
    if (numMatch) return numMatch[1];
  }

  // Foretrekk brief (mer kuratert), ellers tittel.
  // Returnerer den FULLE strengen — shortenForImage() i buildImagePrompt
  // kutter til riktig lengde på ord-grense per archetype-behov.
  return brief || title;
}

function extractEyebrow(
  archetype: Archetype,
  input: GenerateDraftInput
): string {
  if (archetype === "definisjon") {
    // Smart ordklasse-deteksjon basert på endings (Norwegian)
    const word = (input.brief || input.title).trim().toLowerCase();
    // Substantiv-endings: ing, het, dom, skap, sjon, ment, isme, else
    if (/(ing|het|dom|skap|sjon|ment|isme|else|tet)$/.test(word))
      return "substantiv";
    // Verb-endings (presens-form): rer, ner, der, der
    if (/(erer|enter|ifiserer)$/.test(word)) return "verb";
    // Adjektiv-endings: sk, ig, lig, løs, full, et, dd, bar
    if (/(sk|ig|lig|løs|full|et|dd|bar)$/.test(word)) return "adjektiv";
    return "substantiv"; // safe default — de fleste FT-hovedord er substantiver
  }
  if (archetype === "milepael") {
    const heroNum = extractHeroText(archetype, input);
    if (/^\d+\+?$/.test(heroNum)) return "år";
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

  // 4. Generér bilder hvis archetype krever det og user_id finnes
  //    Vi genererer ETT bilde per plattform (FB 1:1, IG 4:5, LinkedIn 16:9)
  //    så hvert nettsted får optimal aspect-ratio i feed.
  const aiImages: GenerateDraftResult["ai_images"] = [];
  let lastImageUsage: import("./gemini").UsageStats | undefined;
  if (input.archetype !== "foto" && !input.skip_image && input.user_id) {
    // Hero-tekst: foretrekk LLM-komponert image_headline (fluent norsk + FT-tone)
    // over mekanisk brief/title-trunkering. Faller tilbake til extractHeroText
    // hvis caption-modellen ikke leverte image_headline.
    const llmHeadline = captions.image_headline?.trim();
    const heroText = llmHeadline || extractHeroText(input.archetype, input);
    const eyebrow = extractEyebrow(input.archetype, input);

    // Bygg referanse-bilder ÉN gang (de er felles på tvers av plattformer)
    const refs: ImageRef[] = [];
    for (const ref of approvedRefsFor(input.archetype, { style: input.style ?? null })) {
      refs.push(ref);
    }
    const scraped = input.source_data as Partial<ScrapedProduct> | null;
    if (scraped?.image_url) {
      const productRef = await fetchImageAsRef(
        scraped.image_url,
        "PRODUCT REFERENCE: scraped product photo from fosen-tools.no for visual/content context. You may incorporate the product theme but DO NOT redraw the product photorealistically — the image should be typography-focused per the archetype spec."
      );
      if (productRef) refs.push(productRef);
    }

    let brandCacheName: string | null = null;
    try {
      brandCacheName = await getOrCreateImageBrandCache();
    } catch (cacheErr) {
      console.warn("Brand-cache utilgjengelig, fortsetter uten:", cacheErr);
    }

    // Wordmark-bakgrunn er bestemt av archetype (samme for alle plattformer)
    const bgType: "red" | "ink" | "cream" =
      input.archetype === "definisjon"
        ? "cream"
        : input.archetype === "sertifikat" ||
            input.archetype === "sitat" ||
            input.archetype === "produkt_variant"
          ? "ink"
          : "red";

    // Loop over plattformer — ÉN bilde per plattform med riktig aspect
    for (const { platform, aspectRatio: platformAspect } of PLATFORM_ASPECT_RATIOS) {
      const { prompt: imgPrompt } = buildImagePrompt(input.archetype, {
        title: input.title,
        statement: input.brief,
        captions,
        hero_text: heroText,
        eyebrow,
        style: input.style ?? null,
        red_word: captions.image_headline_red_word?.trim() || null,
        subtagline: captions.image_subtagline?.trim() || null,
        body: captions.image_body?.trim() || null,
        kontrast_left: captions.image_kontrast_left_label?.trim() || null,
        kontrast_right: captions.image_kontrast_right_label?.trim() || null,
      });

      if (!imgPrompt) continue;

      try {
        const imgResult = await generateImage({
          prompt: imgPrompt,
          aspectRatio: platformAspect,
          referenceImages: refs,
          cachedContent: brandCacheName,
        });
        lastImageUsage = imgResult.usage;

        if (imgResult.usage) {
          const cacheHit = imgResult.usage.cachedTokens > 0;
          console.log(
            `[image-gen ${platform} ${platformAspect}] tokens: prompt=${imgResult.usage.promptTokens} cached=${imgResult.usage.cachedTokens} output=${imgResult.usage.outputTokens} → cache ${cacheHit ? "HIT ✓" : "MISS"}`
          );
        }

        for (const img of imgResult.images) {
          let processed = { base64: img.base64, mimeType: img.mimeType };

          // Steg 1: server-side tekst-overlay (norske bokstaver, ingen typos)
          // — for archetyper hvor det fungerer pålitelig (statement, milepael).
          // produkt_variant lar AI rendre alt selv pga at swatch-layout varierer
          // for mye for automatic label-placement.
          const textLayout = buildTextLayoutFor(input.archetype, captions, null);
          if (textLayout) {
            try {
              processed = await compositeText(
                processed.base64,
                processed.mimeType,
                textLayout
              );
            } catch (textErr) {
              console.error(
                "Text-composite feilet, fortsetter med wordmark uten tekst:",
                textErr
              );
            }
          }

          // Steg 2: wordmark-overlay
          try {
            processed = await compositeFosenToolsWordmark(
              processed.base64,
              processed.mimeType,
              { variant: wordmarkVariantForBg(bgType) }
            );
          } catch (compErr) {
            console.error(
              "Wordmark-composite feilet, bruker rå AI-bilde:",
              compErr
            );
            // Faller tilbake til AI-bilde uten overlay
          }
          const saved = await saveBase64ImageToStorage(
            supabase,
            processed.base64,
            processed.mimeType,
            input.user_id,
            `${input.topic_kind}-${input.archetype}-${platform}`
          );
          aiImages.push({
            storage_path: saved.storage_path,
            public_url: saved.public_url,
            archetype: input.archetype,
            prompt: imgPrompt,
            platform,
            aspect_ratio: platformAspect,
          });
        }
      } catch (e) {
        console.error(`Image-gen feilet for ${platform}:`, e);
        // Ikke fatal — caption-gen var allerede vellykket; andre plattformer kan
        // fortsatt lykkes
      }
    }
  }

  // Cost-kalkulering basert på REELL usage fra Gemini-responses.
  // Pricing per modell (USD per token, gjeldende 2026 Q2):
  //   gemini-2.5-flash:           input 0.075/M, cached 0.019/M, output 0.30/M
  //   gemini-2.5-flash-image:     input 0.30/M, cached 0.075/M, output 30.00/M
  // (Image-output prises som "image tokens" ~1290/bilde × $30/M ≈ $0.04/bilde)
  const captionUsage = captionResult.usage;
  const imageUsage = lastImageUsage;
  const captionCost = captionUsage
    ? ((captionUsage.promptTokens - captionUsage.cachedTokens) * 0.075 +
        captionUsage.cachedTokens * 0.019 +
        captionUsage.outputTokens * 0.3) /
      1_000_000
    : 0.0002;
  // Cost per generation × antall bilder vi faktisk genererte
  const imageCostPerCall = imageUsage
    ? ((imageUsage.promptTokens - imageUsage.cachedTokens) * 0.3 +
        imageUsage.cachedTokens * 0.075 +
        imageUsage.outputTokens * 30) /
      1_000_000
    : 0.04;
  const imageCost = aiImages.length * imageCostPerCall;

  return {
    captions,
    ai_images: aiImages,
    model_used: captionResult.model,
    generation_cost_estimate: Number((captionCost + imageCost).toFixed(6)),
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
    style?: string | null;
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
      style: options.style ?? null,
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
      // Strukturert side-innhold til prompt-bygger — sender IKKE URL videre.
      source_data: {
        name: page.name,
        bullets: page.bullets,
        sections: page.sections,
        ...(page.description ? { description: page.description } : {}),
      },
      // Ingen user_photos: og:image er typisk global FT-default, ikke
      // sidens faktiske innhold. Brukeren kan laste opp manuelt om ønskelig.
      user_photos: [],
      user_id: options.user_id,
      style: options.style ?? null,
    };
  }
}

export { DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL };
