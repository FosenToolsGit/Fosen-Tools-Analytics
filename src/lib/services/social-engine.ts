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
  bgCream: `Solid warm off-white #F8F5EE background (NOT pure white — slightly cream/parchment colored).`,

  decorOnDark: `MANDATORY blueprint decoration (thin white lines, 1-1.5px, 50-60% opacity — this is FT's engineering DNA signature, EVERY FT poster has it):
- TOP-RIGHT corner: a CAD-style dimension/ruler line with small tickmarks, length ~10-15% of canvas width
- BOTTOM-LEFT corner: a small 3x3 grid pattern + thin technical corner-bracket line
- BOTTOM-RIGHT corner: a small gear/cog outline OR a circle-with-radiating-dots pattern, + a thin connecting callout line
- TOP-LEFT corner: a thin technical line-connector with a tiny terminator dot
Do not skip these. They are mandatory brand signature.`,

  decorOnCream: `MANDATORY: same blueprint decoration as the FT signature (CAD-dimension line top-right, grid bottom-left, gear bottom-right, connector top-left), but rendered in FT-ink #0F1115 at 25-30% opacity (since background is light).`,

  wordmarkOnDark: `MANDATORY WORDMARK: render the official "FOSEN TOOLS" wordmark (provided as a brand reference image — use it EXACTLY, do not invent letterforms) at bottom-center of canvas. WRAP the wordmark inside a thin (1-1.5px) white rectangular frame with rounded corners — frame width is wordmark-width + 30% padding, frame height is wordmark-height + 12% vertical padding. Wordmark size is 10-14% of canvas width.`,

  wordmarkOnCream: `MANDATORY WORDMARK: same as above but the wordmark and frame are rendered in FT-ink #0F1115 (dark variant) since background is cream.`,

  typographyOnDark: `TYPOGRAPHY: Manrope Black/800 or near-identical geometric sans-serif. Headline text is MASSIVE — fills 65-80% of canvas width when stacked. Tight line-height (1.0-1.1), tight tracking. ALL text in pure white #FFFFFF. ONE single keyword inside the statement MAY be FT-red #ED1C24 for emphasis (used sparingly — only if it visually anchors the meaning, see "Forsvarets *verktøykontroll* i din hverdag" reference). Natural sentence case — NOT ALL CAPS unless a single short label.`,

  typographyOnCream: `TYPOGRAPHY: Manrope Black/800. Headline in FT-ink #0F1115. Same scale, line-height and tracking as on dark.`,

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
function styleModifier(style: string | null | undefined): string {
  if (style === "profesjonell") {
    return `

=== STYLE OVERRIDE: PROFESJONELL (CINEMATIC) ===
OVERRIDE the background and mood instructions above with this:
- Background: full-bleed FT-ink #0F1115 (deep dark gray-black), NOT white. Apply a subtle FT-red #ED1C24 radial glow from one corner (15-25% opacity max), then fade to dark.
- Atmosphere element: include a FADED, BLURRED background silhouette evoking precision/defense quality — a faint military jet, technical schematic line-art, or industrial machinery contour at 8-15% opacity, positioned bottom or behind text. Must not compete with hero text.
- Lighting: cinematic, dramatic, premium-defense aesthetic.
- All text remains the same color hierarchy but on dark bg: hero text = pure white, accents = FT-red.
- Wordmark in white variant (not ink), positioned per archetype spec.
Reference image «jagerfly-industriell-kvalitet.jpg» shows the exact target mood — match its darkness, depth, and ghost-element placement.`;
  }
  if (style === "skreddersydd") {
    return `

=== STYLE OVERRIDE: SKREDDERSYDD (CAD/WIREFRAME) ===
OVERRIDE the background and mood instructions above with this:
- Background: full-bleed FT-red #ED1C24, overlaid with thin white wireframe technical drawings — calipers, gears, CNC tool outlines, blueprint grids (15-25% opacity, no fills).
- Atmosphere: engineering precision, CAD-blueprint mood, hand-drafted technical illustration aesthetic.
- Hero text remains as specified, layered ON TOP of wireframe with full opacity. Text stays readable.
- Wordmark in white variant, positioned per archetype spec.
Reference image «skum-er-bare-skum.jpg» shows the exact target aesthetic — match its red bg + white wireframe overlay.`;
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
  const heroTextShort = shortenForImage(heroText);

  const eyebrow = context.eyebrow?.toLowerCase().trim() ?? "";

  switch (archetype) {
    case "definisjon":
      // Ordbok-stil på krem bg. Match referansene «Skreddersydd» og «Verktøykontroll».
      return {
        prompt: `Editorial dictionary-entry poster.

LAYOUT (match the FT «Skreddersydd» reference exactly):
1. ${FT_DESIGN.bgCream}
2. Hero word at upper-left third, MASSIVE (Manrope Black, FT-ink #0F1115, 55-65% canvas width): "${heroTextShort}"
3. Immediately to the right of the hero word, in smaller italic gray: "${eyebrow || "adjektiv"}"
4. Phonetic pronunciation in tracked monospace gray (small), to the right of the italic label: "/${(eyebrow ? eyebrow : "kort-form")}/"
5. Thin horizontal hairline below the hero word, FT-ink at 20% opacity, full width
6. ONE definition sentence below the hairline, Manrope Regular, FT-ink, smaller (~5% canvas height). Compose a SHORT crisp definition (max ~14 words) that captures the FT-meaning of "${heroTextShort}" — engineering, precision, brukerflyt-orientert. ONE noun inside the sentence MAY be visually underlined with a thin FT-red curved hand-drawn underline (sparingly). End sentence with an asterisk.
7. Asterisk footnote at very bottom-left in tiny gray italic: short context-line (e.g. "Oppnådd gjennom HDFI-presisjon."). Compose to match.

${FT_DESIGN.spellingRule}

${FT_DESIGN.decorOnCream}

${FT_DESIGN.wordmarkOnCream}

${FT_DESIGN.typographyOnCream}

${FT_DESIGN.references}

${FT_DESIGN.negatives}${styleModifier(context.style)}`,
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
   Break lines on natural phrase boundaries (do NOT hyphenate words). End with a period if statement-form. ONE single keyword in the headline MAY be FT-red (use only if it visually anchors the meaning).
3. NO subtitle, NO support text in image.

${FT_DESIGN.spellingRule}

${FT_DESIGN.decorOnDark}

${FT_DESIGN.wordmarkOnDark}

${FT_DESIGN.typographyOnDark}

${FT_DESIGN.optionalSubtagline}

${FT_DESIGN.references}

${FT_DESIGN.negatives}${styleModifier(context.style)}`,
        aspectRatio: aspectMap[archetype],
      };

    case "kontrast":
      // 4:5 to-spalter sammenligning, men nå med FT-decor + framed wordmark.
      return {
        prompt: `Vertical two-column comparison poster (4:5), FT-style.

LAYOUT:
1. LEFT column (50% width): muted gray #4D4D4D background (NOT pure gray — slightly desaturated cool).
   - Small white uppercase label top, tracked: "HYLLEVARE"
2. RIGHT column (50% width): FT-red #ED1C24 background.
   - Small white uppercase label top, tracked: composed dynamically from headline "${heroTextShort}" (extract the FT-side concept, max 1-2 words, e.g. "SKREDDERSYDD")
3. Center divider: thin white vertical line (1.5px), full height.
4. Below the labels in each column: optional small visual icon (wireframe outline, white) representing the contrast. Same line-weight as decoration. Optional — only include if the contrast suggests a clear visual pair (e.g. caliper vs tape-measure, neat-vs-chaotic drawer).
5. Above the two columns at very top-center: ONE short framing line in white (small italic): a phrase from "${heroTextShort}".

${FT_DESIGN.spellingRule}

${FT_DESIGN.decorOnDark}

${FT_DESIGN.wordmarkOnDark}

${FT_DESIGN.references}

${FT_DESIGN.negatives}${styleModifier(context.style)}`,
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
4. Below the number, supporting headline in 2-3 lines of bold white sans-serif (Manrope Black, ~12-15% canvas height per line): the rest of the statement from "${heroTextShort}", broken naturally. RENDER EXACTLY — do not paraphrase.
5. If the number is "25" or "100" (jubileum), color the number with a gold gradient: #85704D at top → #DBB78B at bottom.

${FT_DESIGN.spellingRule}

${FT_DESIGN.decorOnDark}

${FT_DESIGN.wordmarkOnDark}

${FT_DESIGN.references}

${FT_DESIGN.negatives}${styleModifier(context.style)}`,
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
3. BELOW the quote (slightly smaller, regular weight): a 2-3 word reaction/judgment in white (compose a SHORT framing line that reacts to the quote — e.g. "Feil startpunkt.", "Riktig spørsmål.", "Bygget på dette."). Composed to match the topic tone.
4. NO attribution in the image (attribution goes in the caption).

${FT_DESIGN.spellingRule}

${FT_DESIGN.decorOnDark}

${FT_DESIGN.wordmarkOnDark}

${FT_DESIGN.references}

${FT_DESIGN.negatives}${styleModifier(context.style)}`,
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
3. LOWER HALF (40% canvas height): set on a slightly darker black band that ends at the shield's bottom edge (subtle band-cut effect). Render the headline EXACTLY as given below, broken across 2-3 lines, MASSIVE bold sans-serif (Manrope Black, fills 75% canvas width). ONE keyword from the headline may be in FT-red for emphasis (use sparingly).
   Headline text (use VERBATIM — do not paraphrase, do not add words): "${heroTextShort}"
4. Just below headline: ONE small supporting sentence in white (~50% opacity), single line, italic-ish, like a tagline.

${FT_DESIGN.spellingRule}

${FT_DESIGN.decorOnDark}

${FT_DESIGN.wordmarkOnDark}

${FT_DESIGN.typographyOnDark}

${FT_DESIGN.optionalSubtagline}

${FT_DESIGN.references}

${FT_DESIGN.negatives}${styleModifier(context.style)}`,
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
        style: input.style ?? null,
      }
    );

    if (imgPrompt) {
      try {
        // Bygg referansebilder: brand-assets + godkjente innlegg + evt. produktbilde
        const refs: ImageRef[] = brandRefsFor(input.archetype, {
          isJubilee: detectJubilee(heroText),
          wordmarkVariant: wordmarkVariantFor(input.archetype),
        });

        // Style-refs: archetype-mappe + _all/ + valgfri _<style>/
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
