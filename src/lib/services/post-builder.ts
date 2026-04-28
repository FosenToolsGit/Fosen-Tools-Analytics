/**
 * Post Builder service — analyserer historiske innlegg og foreslår nye
 * captions, temaer og produksjonstips basert på hva som har fungert best.
 *
 * To bruksområder:
 *  - Sosiale medier (Meta — Facebook/Instagram). Caption-mønstre, organiske
 *    filming-ideer, Native-prompts (Nano Banana 2).
 *  - Nyhetsbrev (Mailchimp). Subject line-mønstre, emne-forslag, populære
 *    lenker som fortjener oppfølgings-kampanje.
 */

export interface RawPost {
  id: number;
  platform: string;
  platform_post_id: string;
  published_at: string;
  title: string | null;
  content_snippet: string | null;
  post_url: string | null;
  thumbnail_url: string | null;
  post_type: string | null;
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
}

export interface CaptionPattern {
  /** En menneske-vennlig beskrivelse av mønsteret */
  label: string;
  /** Hvor sterkt mønsteret korrelerer med høy engasjement */
  lift_pct: number;
  /** Antall poster mønsteret er observert i */
  matches: number;
  /** Konkret eksempel-caption som passer mønsteret */
  example: string | null;
  /** Praktisk anbefaling */
  recommendation: string;
}

export interface ScoredPost {
  id: number;
  caption: string;
  published_at: string;
  post_type: string | null;
  post_url: string | null;
  engagement_score: number;
  engagement_rate: number; // engagement / reach
  raw_engagement: number;
  reach: number;
  caption_length: number;
  has_emoji: boolean;
  has_question: boolean;
  has_cta: boolean;
  hashtags: number;
  emoji_count: number;
  word_count: number;
}

export interface CaptionSuggestion {
  caption: string;
  rationale: string;
  pattern_used: string;
}

export interface NativePromptSuggestion {
  theme: string;
  product_focus: string;
  prompt: string;
  caption_seed: string;
  reasoning: string;
}

export interface OrganicIdea {
  format: "video" | "reel" | "carousel" | "photo" | "story";
  title: string;
  description: string;
  shot_list: string[];
  caption_seed: string;
  best_day_hint?: string;
}

const CTA_TERMS = [
  "se mer",
  "les mer",
  "klikk",
  "kjøp",
  "bestill",
  "ta kontakt",
  "send oss",
  "ring oss",
  "kommenter",
  "del",
  "tagg",
  "lik",
  "følg",
  "trykk lenken",
  "lenke i bio",
  "sjekk ut",
  "besøk",
  "registrer",
  "meld deg",
  "få tilbud",
];

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1FA70}-\u{1FAFF}]/gu;
const HASHTAG_REGEX = /#[\wæøåÆØÅ]+/g;

export function scorePosts(posts: RawPost[]): ScoredPost[] {
  return posts
    .filter((p) => (p.content_snippet ?? p.title ?? "").trim().length > 0)
    .map((p) => {
      const caption = (p.content_snippet || p.title || "").trim();
      const lower = caption.toLowerCase();
      const reach = Math.max(1, Number(p.reach) || Number(p.impressions) || 0);
      const rawEngagement =
        (Number(p.likes) || 0) +
        (Number(p.comments) || 0) * 3 + // kommentarer veier mer
        (Number(p.shares) || 0) * 5 + // delinger veier mest
        (Number(p.clicks) || 0);

      const engagementRate = reach > 0 ? rawEngagement / reach : 0;
      const emojiMatches = caption.match(EMOJI_REGEX) || [];
      const hashtags = (caption.match(HASHTAG_REGEX) || []).length;

      return {
        id: p.id,
        caption,
        published_at: p.published_at,
        post_type: p.post_type,
        post_url: p.post_url,
        engagement_score: rawEngagement,
        engagement_rate: engagementRate,
        raw_engagement: rawEngagement,
        reach,
        caption_length: caption.length,
        has_emoji: emojiMatches.length > 0,
        has_question: caption.includes("?"),
        has_cta: CTA_TERMS.some((t) => lower.includes(t)),
        hashtags,
        emoji_count: emojiMatches.length,
        word_count: caption.split(/\s+/).filter(Boolean).length,
      };
    });
}

export function findCaptionPatterns(scored: ScoredPost[]): CaptionPattern[] {
  if (scored.length === 0) return [];

  const overallAvgRate =
    scored.reduce((s, p) => s + p.engagement_rate, 0) / scored.length;
  if (overallAvgRate === 0) return [];

  const patterns: CaptionPattern[] = [];

  function pattern(
    label: string,
    predicate: (p: ScoredPost) => boolean,
    recommendation: string
  ) {
    const matches = scored.filter(predicate);
    if (matches.length < 2) return;
    const avgRate =
      matches.reduce((s, p) => s + p.engagement_rate, 0) / matches.length;
    const lift = ((avgRate - overallAvgRate) / overallAvgRate) * 100;
    const example =
      matches.sort((a, b) => b.engagement_rate - a.engagement_rate)[0]
        ?.caption ?? null;
    patterns.push({
      label,
      lift_pct: Math.round(lift * 10) / 10,
      matches: matches.length,
      example,
      recommendation,
    });
  }

  pattern(
    "Inneholder spørsmål (?)",
    (p) => p.has_question,
    "Avslutt eller åpne med et åpent spørsmål — driver kommentarer."
  );
  pattern(
    "Inneholder tydelig CTA",
    (p) => p.has_cta,
    "Bruk en konkret oppfordring (f.eks. «sjekk ut», «kommenter», «kjøp nå»)."
  );
  pattern(
    "Bruker emojis",
    (p) => p.has_emoji,
    "1–3 relevante emojis bryter opp teksten og øker stopp-effekten i feed."
  );
  pattern(
    "Kort caption (≤80 tegn)",
    (p) => p.caption_length > 0 && p.caption_length <= 80,
    "Hold deg under 80 tegn — driver høyere engasjement på Meta i snitt."
  );
  pattern(
    "Mellomlang caption (81–200 tegn)",
    (p) => p.caption_length > 80 && p.caption_length <= 200,
    "Legg vekt på første setning — den må stå alene før «se mer»-knappen."
  );
  pattern(
    "Lang caption (>200 tegn)",
    (p) => p.caption_length > 200,
    "Bruk linjeskift og emojis for å gjøre teksten lett å scanne."
  );
  pattern(
    "Inneholder hashtags",
    (p) => p.hashtags > 0,
    "Bruk 2–5 spissede hashtags (f.eks. #verktøy #snapon)."
  );
  pattern(
    "Tall i teksten",
    (p) => /\d/.test(p.caption),
    "Konkrete tall (rabatt, mengde, dimensjon) gir troverdighet."
  );

  return patterns
    .filter((p) => p.lift_pct > 0)
    .sort((a, b) => b.lift_pct - a.lift_pct);
}

export function findBestPosts(scored: ScoredPost[], n = 5): ScoredPost[] {
  return [...scored]
    .filter((p) => p.reach >= 50) // unngå ekstreme outliers fra små poster
    .sort((a, b) => b.engagement_rate - a.engagement_rate)
    .slice(0, n);
}

export function bestDayOfWeek(scored: ScoredPost[]): {
  day: string;
  avg_rate: number;
} | null {
  if (scored.length === 0) return null;
  const days = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
  const buckets = new Map<number, number[]>();
  for (const p of scored) {
    const dow = new Date(p.published_at).getDay();
    if (!buckets.has(dow)) buckets.set(dow, []);
    buckets.get(dow)!.push(p.engagement_rate);
  }
  let best: { day: string; avg_rate: number } | null = null;
  for (const [dow, rates] of buckets) {
    if (rates.length < 2) continue;
    const avg = rates.reduce((s, r) => s + r, 0) / rates.length;
    if (!best || avg > best.avg_rate) {
      best = { day: days[dow], avg_rate: avg };
    }
  }
  return best;
}

/**
 * Bygger nye captions basert på de beste mønstrene + topp-performers.
 * Mønster-basert (ingen LLM) — tar topp-caption som grunn-mal og gir
 * 3–5 varianter for ulike produkt-temaer.
 */
export function generateCaptionSuggestions(
  scored: ScoredPost[],
  patterns: CaptionPattern[],
  themes: string[]
): CaptionSuggestion[] {
  if (scored.length === 0 || themes.length === 0) return [];

  const usePatterns = patterns.slice(0, 3);
  const includeQuestion = usePatterns.some((p) => p.label.includes("spørsmål"));
  const includeEmoji = usePatterns.some((p) => p.label.includes("emoji"));
  const includeCTA = usePatterns.some((p) => p.label.includes("CTA"));
  const targetShort = usePatterns.some((p) => p.label.includes("Kort"));

  const emojiPool = ["🛠️", "🔧", "⚡", "🔥", "✅", "💪", "🎯"];

  return themes.map((theme, i) => {
    const emoji = includeEmoji ? `${emojiPool[i % emojiPool.length]} ` : "";
    let caption: string;

    if (targetShort) {
      caption = includeQuestion
        ? `${emoji}${theme} — har du prøvd den nye?`
        : `${emoji}${theme} på lager nå.`;
      if (includeCTA) caption += " Sjekk ut →";
    } else {
      const opener = includeQuestion
        ? `Lurer du på hvilken ${theme.toLowerCase()} som passer deg?`
        : `Ny ${theme.toLowerCase()} inne.`;
      const body = `Bygget for proff bruk — daglig drift, tøffe miljøer, lang levetid.`;
      const cta = includeCTA ? " Bestill via lenken eller stikk innom butikken." : "";
      caption = `${emoji}${opener} ${body}${cta}`;
    }

    const usedPatterns = usePatterns.map((p) => p.label).join(", ");
    return {
      caption,
      pattern_used: usedPatterns || "Topp-performer-mal",
      rationale: `Basert på de ${usePatterns.length} sterkeste mønstrene fra dine egne poster: ${usedPatterns}.`,
    };
  });
}

/**
 * Genererer Native-prompts (Nano Banana 2) — beskrivende tekst som brukeren
 * limer inn i Native-appen for å lage produktbilder.
 */
export function generateNativePrompts(themes: string[]): NativePromptSuggestion[] {
  const styles = [
    {
      style: "Industriell verksted-setting",
      light: "varmt sidelys gjennom verkstedsvindu",
      mood: "profesjonelt, robust",
    },
    {
      style: "Ren produktshot på betonggulv",
      light: "softboks over, minimal skygge",
      mood: "minimalistisk, moderne",
    },
    {
      style: "I bruk-situasjon (mekanikerhånd holder verktøyet)",
      light: "naturlig dagslys, høyt kontrastnivå",
      mood: "autentisk, action",
    },
    {
      style: "Flat-lay med tilbehør rundt",
      light: "jevnt diffust ovenfra",
      mood: "organisert, oversiktlig",
    },
  ];

  return themes.map((theme, i) => {
    const s = styles[i % styles.length];
    const prompt = [
      `${theme} fra Fosen Tools.`,
      `Stil: ${s.style}.`,
      `Lyssetting: ${s.light}.`,
      `Stemning: ${s.mood}.`,
      `Komposisjon: produktet i fokus, minimal tekst, plass til logo i nedre høyre hjørne.`,
      `Format: 1:1 (Instagram-post) eller 4:5 (feed).`,
      `Fargepalett: dempet industri-tone — grått, sort, små inntrykk av Fosen-rødt.`,
      `Skarp produktdetalj, kjenne kvaliteten på materialene.`,
    ].join(" ");

    return {
      theme,
      product_focus: theme,
      prompt,
      caption_seed: `Ny ${theme.toLowerCase()} i butikken — bygget for proff bruk.`,
      reasoning: `Bilde-stilen «${s.style}» gir Fosen Tools sin profesjonelle posisjonering.`,
    };
  });
}

/**
 * Forslag til organiske innlegg — filming og praktiske ideer som ikke
 * er AI-generert.
 */
export function generateOrganicIdeas(themes: string[]): OrganicIdea[] {
  const templates: Array<(theme: string) => OrganicIdea> = [
    (theme) => ({
      format: "reel",
      title: `Unboxing: ${theme}`,
      description: `Kort reel (15–30 sek) der du pakker opp produktet, viser detaljer og første-inntrykk.`,
      shot_list: [
        "Esken på arbeidsbordet — close-up av logo",
        "Hånd som åpner esken (POV)",
        "Detalj-shot av produktet — teksturer og kvalitet",
        "Avsluttende shot: produktet ferdig stilt opp",
      ],
      caption_seed: `Endelig kommet inn 🛠️ ${theme} — sjekk hva som lå i esken.`,
      best_day_hint: "Tirsdag–torsdag formiddag",
    }),
    (theme) => ({
      format: "video",
      title: `Før/etter: ${theme} i bruk`,
      description: `Vis et reelt arbeidsoppdrag der ${theme.toLowerCase()} løser et problem. Før-bilde, prosess, etter-bilde.`,
      shot_list: [
        "Klar tale: hva er problemet?",
        "Verktøyet i bruk — flere vinkler",
        "Resultatet — close-up",
        "Tekst-overlay: «Tid spart: X minutter»",
      ],
      caption_seed: `Slik håndterer du [oppgave] med ${theme.toLowerCase()}. Mekanikerne våre bruker den daglig.`,
      best_day_hint: "Onsdag–fredag",
    }),
    (theme) => ({
      format: "carousel",
      title: `${theme}: 5 ting du ikke visste`,
      description: `Karusell-post med 5 slides. Hvert kort fremhever én funksjon eller bruksmåte.`,
      shot_list: [
        "Slide 1: Tittel + produkt-shot",
        "Slide 2–6: Én funksjon per kort med ikon + bilde",
        "Siste slide: «Bestill nå» + lenke",
      ],
      caption_seed: `5 grunner til at ${theme.toLowerCase()} er verdt investeringen 🔧 Sveip →`,
      best_day_hint: "Mandag eller torsdag",
    }),
    (theme) => ({
      format: "story",
      title: `Spørsmål-sticker: ${theme}`,
      description: `Story med spørsmål-sticker — lar følgerne stille spørsmål om produktet. Svar i påfølgende stories.`,
      shot_list: [
        "Bilde av produktet i hånd",
        "Sticker: «Spør meg om [produktnavn]»",
        "Følg opp med 3–5 svar-stories",
      ],
      caption_seed: `Spør oss om ${theme.toLowerCase()} 👇`,
      best_day_hint: "Når som helst — bygger relasjon",
    }),
    (theme) => ({
      format: "photo",
      title: `Kunde-case: ${theme}`,
      description: `Bilde av en faktisk kunde (med tillatelse) som bruker produktet — gir sosial bevisning.`,
      shot_list: [
        "Kontekst-shot: kunden i sitt verksted/anlegg",
        "Detalj av produktet i bruk",
        "Sitat-overlay fra kunden",
      ],
      caption_seed: `«${theme} har spart oss timer hver uke.» — [Kundenavn], [Bedrift]`,
      best_day_hint: "Mandag — uke-starter med inspirasjon",
    }),
  ];

  return themes.flatMap((theme, i) => {
    // Variér ideer per tema
    const idx1 = i % templates.length;
    const idx2 = (i + 2) % templates.length;
    return [templates[idx1](theme), templates[idx2](theme)];
  });
}

/* ============================================================
 * Nyhetsbrev (Mailchimp)
 * ============================================================ */

export interface SubjectPattern {
  label: string;
  matches: number;
  avg_open_rate: number;
  lift_pct: number;
  example: string | null;
  recommendation: string;
}

export interface NewsletterTopic {
  topic: string;
  subject_line_options: string[];
  preview_text: string;
  outline: string[];
  rationale: string;
}

export interface NewsletterPost extends RawPost {
  /** Mailchimp lagrer åpninger i likes-feltet (per service) */
  unique_opens: number;
  open_rate: number; // unique_opens / reach
  click_rate: number; // clicks / reach
}

export function enrichNewsletterPosts(posts: RawPost[]): NewsletterPost[] {
  return posts.map((p) => {
    const sent = Math.max(1, Number(p.reach) || 0);
    const opens = Number(p.likes) || 0; // mailchimp service lagrer unique_opens her
    const clicks = Number(p.clicks) || 0;
    return {
      ...p,
      unique_opens: opens,
      open_rate: sent > 0 ? opens / sent : 0,
      click_rate: sent > 0 ? clicks / sent : 0,
    };
  });
}

export function findSubjectPatterns(posts: NewsletterPost[]): SubjectPattern[] {
  if (posts.length === 0) return [];
  const overallAvg =
    posts.reduce((s, p) => s + p.open_rate, 0) / posts.length;
  if (overallAvg === 0) return [];

  const patterns: SubjectPattern[] = [];

  function pattern(
    label: string,
    predicate: (p: NewsletterPost) => boolean,
    recommendation: string
  ) {
    const matches = posts.filter((p) => {
      const subject = (p.content_snippet || p.title || "").trim();
      return subject.length > 0 && predicate(p);
    });
    if (matches.length < 2) return;
    const avg =
      matches.reduce((s, p) => s + p.open_rate, 0) / matches.length;
    const lift = ((avg - overallAvg) / overallAvg) * 100;
    const example = matches.sort((a, b) => b.open_rate - a.open_rate)[0];
    patterns.push({
      label,
      matches: matches.length,
      avg_open_rate: Math.round(avg * 1000) / 10,
      lift_pct: Math.round(lift * 10) / 10,
      example: example
        ? (example.content_snippet || example.title || "").trim()
        : null,
      recommendation,
    });
  }

  const subjectOf = (p: NewsletterPost) =>
    ((p.content_snippet || p.title || "") as string).toLowerCase();

  pattern(
    "Spørsmål i emne",
    (p) => subjectOf(p).includes("?"),
    "Spørsmål skaper nysgjerrighet i innboksen — særlig hvis det er konkret."
  );
  pattern(
    "Inneholder tall",
    (p) => /\d/.test(subjectOf(p)),
    "Konkrete tall (rabatter, antall, dimensjoner) øker åpningsraten."
  );
  pattern(
    "Kort emne (≤40 tegn)",
    (p) => {
      const len = (p.content_snippet || p.title || "").length;
      return len > 0 && len <= 40;
    },
    "Hold deg under 40 tegn — mobile innbokser kapper resten."
  );
  pattern(
    "Mellomlangt emne (41–60 tegn)",
    (p) => {
      const len = (p.content_snippet || p.title || "").length;
      return len > 40 && len <= 60;
    },
    "Sweetspot for desktop-innbokser — gir rom for nok kontekst."
  );
  pattern(
    "Bruker emoji",
    (p) => EMOJI_REGEX.test(subjectOf(p)),
    "1 relevant emoji helt i starten kan løfte åpningsraten markant."
  );
  pattern(
    "Inneholder «ny» eller «nyhet»",
    (p) => /\bny(het)?\b/i.test(subjectOf(p)),
    "Nyhetsord trigger nysgjerrighet — bruk når det faktisk er nytt."
  );
  pattern(
    "Inneholder rabatt / tilbud",
    (p) => /\b(tilbud|rabatt|kampanje|spar|%)\b/i.test(subjectOf(p)),
    "Tilbuds-emner gir typisk høyest klikk — men bruk sparsomt for å unngå tretthet."
  );
  pattern(
    "Personalisert tone (du/deg)",
    (p) => /\b(du|deg|din|ditt)\b/i.test(subjectOf(p)),
    "Direkte tiltale fungerer bedre enn upersonlig firma-stemme."
  );

  return patterns.sort((a, b) => b.lift_pct - a.lift_pct);
}

export function generateNewsletterTopics(
  patterns: SubjectPattern[],
  topProducts: string[]
): NewsletterTopic[] {
  const useNumbers = patterns.some((p) => p.label.includes("tall") && p.lift_pct > 0);
  const useQuestion = patterns.some((p) => p.label.includes("Spørsmål") && p.lift_pct > 0);
  const useEmoji = patterns.some((p) => p.label.includes("emoji") && p.lift_pct > 0);

  const emoji = useEmoji ? "🛠️ " : "";

  return topProducts.slice(0, 6).map((product) => {
    const subjectOptions: string[] = [];
    if (useQuestion) {
      subjectOptions.push(`${emoji}Lurer du på hvilken ${product.toLowerCase()} som passer?`);
    }
    if (useNumbers) {
      subjectOptions.push(`${emoji}3 grunner til å velge ${product.toLowerCase()}`);
    }
    subjectOptions.push(`${emoji}Ny ${product.toLowerCase()} inne — sjekk utvalget`);
    subjectOptions.push(`${emoji}${product}: anbefalt av mekanikerne`);

    return {
      topic: product,
      subject_line_options: subjectOptions.slice(0, 4),
      preview_text: `Få oversikt over hele ${product.toLowerCase()}-utvalget vårt — pluss tips fra verkstedet.`,
      outline: [
        `Intro: hvorfor ${product.toLowerCase()} er viktig for proffene`,
        `Anbefaling: 2–3 modeller med kort begrunnelse`,
        `Kunde-case eller bruksvideo`,
        `Tilbud / fri frakt over X kr`,
        `CTA-knapp til kategorisiden`,
      ],
      rationale: `Basert på topp-emner og hva som faktisk har blitt klikket mest på i tidligere kampanjer.`,
    };
  });
}
