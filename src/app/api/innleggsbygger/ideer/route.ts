import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { scrapePageByUrl } from "@/lib/services/scrape-product";
import { generateStructuredJson } from "@/lib/services/gemini";

/**
 * POST /api/innleggsbygger/ideer
 *
 * Idémyldring for innleggsbyggeren. Tar en URL (f.eks. fosen-tools.no/hdfi),
 * scraper sideinnholdet og ber Gemini foreslå ~6 konkrete post-ideer — hver
 * mappet til en av tilstedeværelse-malene eller feature-malen, med ferdig
 * utfylte felter. Brukeren velger en idé og får skjemaet auto-fylt.
 *
 * Body: { url: string }
 * Response: { ideas: Idea[], source: { name, url } }
 */

export const maxDuration = 60;

// Tekst-drevne maler idémyldringen kan foreslå (offer/produkt-tilbud
// krever ekte priser → utelatt med vilje).
const SYSTEM = `Du er innholdsstrateg for Fosen Tools AS — en norsk verktøy-
leverandør i Brekstad (25 år i 2026, del av familiekonsern med 100 år bak seg).
Du foreslår konkrete idéer til poster for sosiale medier (Facebook/Instagram/
LinkedIn) basert på innholdet på en gitt nettside.

FT-KONTEKST:
- Egen produksjon: HDFI (skreddersydde skuminnlegg for verktøykontroll),
  FT Systemvegg, Weapon Storage, verktøyvogner.
- CADLAB — egen tegne-/utviklingsavdeling. HDFI er CAD-tegnet og CNC-maskinert.
- «Fosen Tools standard» referert av Forsvaret. Sterk B2B-profil: forsvar,
  industri, aviation, offshore, verksted, beredskap.
- 40+ merker (Wera, Knipex, Snap-on, Milwaukee, Facom m.fl.).
- TERMINOLOGI: skriv «CNC-maskinert», ALDRI «CNC-frest». HDFI omtales bare
  som «HDFI» — aldri «HDFI-skum» eller «HDFI-skuminnlegg».

MAL-TYPER du kan foreslå (felt-krav i parentes — fyll KUN relevante felter):
- prosess  : Slik jobber vi, steg for steg. (headline, redWord, steps[2-5]
             {title,text}, eyebrow?, cta?)
- leveranse: «Levert til {kunde}» — vis frem en konkret jobb. (customer,
             headline, redWord?, segment?, description?, eyebrow?, cta?)
- besok    : «På besøk hos {bedrift}». (company, location?, description?,
             eyebrow?, cta?)
- stand    : Messe/arrangement. (eventName, location, date, redWord?,
             standNr?, description?, eyebrow?, cta?)
- ansatt   : «Møt teamet» — presenter en ansatt. (name, role, years?, quote?,
             funFact?, eyebrow?)
- sitat    : Stort kundesitat. (quote, attributionName, attributionRole?,
             attributionCompany?)
- milepael : Stort tall — jubileum/statistikk. (number, unit?, headline?,
             body?, eyebrow?)
- partner  : Fremhev en samarbeidspartner/merke. (partnerName, headline?,
             description?, eyebrow?, cta?)
- feature  : Tjeneste-post — fordeler + CTA. (headline, redWord?, intro?,
             benefits[3-5], eyebrow?, cta?)

REGLER FOR IDÉENE:
- Lag 6 ulike idéer med VARIERTE mal-typer — ikke 6 feature-poster.
- FYLL UT ALLE FELTENE for malen du velger — også de valgfrie (eyebrow, cta,
  segment, redWord, intro, funFact osv.). Skjemaet skal være 100% komplett
  så brukeren kan generere posten direkte uten å skrive noe selv.
- Tekst skal være ferdig, norsk, konkret og publiseringsklar — ikke
  plassholdere. Bruk faktiske poenger fra siden.
- headline: kort og kraftig (3-8 ord). redWord: ETT ord som finnes i headline.
- cta: alltid fyll inn — typisk «fosen-tools.no» eller en relevant under-side.
- For «ansatt»/«besok»/«stand»/«leveranse»/«sitat»: hvis siden ikke gir
  konkrete navn/kunder, foreslå idéen med en tydelig [plassholder] brukeren
  fyller inn — men behold den hvis mal-typen passer temaet.
- Ikke dikt opp falske kundesitater med ekte firmanavn — bruk [Kunde] som
  attributionCompany hvis ukjent.
- background: «ink» (mørk, standard), «red» (kraftig — bra for sitat/stand),
  «cream» (lys, rolig). Velg det som kler malen.
- label: 2-5 ords kort tittel på idé-kortet. summary: én setning om hvorfor
  posten funker.

BILDER:
- Malene leveranse/besok/ansatt har et bildefelt (imageUrl), partner har
  partnerLogoUrl. Hvis brukeren har gitt en liste med bilder fra siden,
  velg det MEST RELEVANTE og sett imageUrl/partnerLogoUrl til EKSAKT den
  URL-en (kopiér uendret — ikke dikt opp URL-er).
- Hvis ingen av bildene passer, la bildefeltet stå tomt — brukeren laster
  opp eget bilde i UI-et.`;

const IDEA_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          template: { type: "string", enum: ["mal", "feature"] },
          mal: {
            type: "string",
            enum: [
              "prosess",
              "leveranse",
              "besok",
              "stand",
              "ansatt",
              "sitat",
              "milepael",
              "partner",
            ],
            description: "Kun når template=mal. Utelat for feature.",
          },
          background: { type: "string", enum: ["ink", "red", "cream"] },
          label: { type: "string" },
          summary: { type: "string" },
          eyebrow: { type: "string" },
          headline: { type: "string" },
          redWord: { type: "string" },
          intro: { type: "string" },
          cta: { type: "string" },
          customer: { type: "string" },
          segment: { type: "string" },
          description: { type: "string" },
          company: { type: "string" },
          location: { type: "string" },
          eventName: { type: "string" },
          date: { type: "string" },
          standNr: { type: "string" },
          name: { type: "string" },
          role: { type: "string" },
          years: { type: "string" },
          quote: { type: "string" },
          funFact: { type: "string" },
          attributionName: { type: "string" },
          attributionRole: { type: "string" },
          attributionCompany: { type: "string" },
          number: { type: "string" },
          unit: { type: "string" },
          body: { type: "string" },
          partnerName: { type: "string" },
          imageUrl: {
            type: "string",
            description:
              "Kun for leveranse/besok/ansatt. EKSAKT bilde-URL fra listen brukeren ga — ikke dikt opp.",
          },
          partnerLogoUrl: {
            type: "string",
            description: "Kun for partner. EKSAKT logo-URL fra listen — ikke dikt opp.",
          },
          benefits: { type: "array", items: { type: "string" } },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                text: { type: "string" },
              },
              required: ["title", "text"],
            },
          },
        },
        required: ["template", "background", "label", "summary"],
      },
    },
  },
  required: ["ideas"],
};

// Felter som MÅ være fylt for at malen skal kunne rendres direkte.
const REQUIRED_FIELDS: Record<string, string[]> = {
  feature: ["headline"],
  prosess: ["headline"],
  leveranse: ["customer", "headline"],
  besok: ["company"],
  stand: ["eventName", "location", "date"],
  ansatt: ["name", "role"],
  sitat: ["quote", "attributionName"],
  milepael: ["number"],
  partner: ["partnerName"],
};
const FIELD_PLACEHOLDER: Record<string, string> = {
  customer: "[Kundenavn]",
  company: "[Bedrift]",
  location: "[Sted]",
  date: "[Dato]",
  eventName: "[Arrangement]",
  name: "[Navn]",
  role: "[Rolle]",
  attributionName: "[Navn]",
  partnerName: "[Partner]",
  number: "25",
  quote: "[Sitat]",
};

/**
 * Sikrer at hver idé har alle påkrevde felt fylt ut — Gemini hopper noen
 * ganger over valgfrie/påkrevde felt. Headline faller tilbake til label,
 * andre felt får en tydelig [plassholder] brukeren kan redigere.
 */
function backfillIdea(idea: Record<string, unknown>): Record<string, unknown> {
  const key = idea.template === "feature" ? "feature" : String(idea.mal ?? "");
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const label = str(idea.label);

  for (const f of REQUIRED_FIELDS[key] ?? []) {
    if (!str(idea[f])) {
      idea[f] =
        f === "headline" && label
          ? label
          : FIELD_PLACEHOLDER[f] ?? label ?? "[Fyll inn]";
    }
  }
  // cta — alle maler unntatt sitat/ansatt bruker det
  if (key !== "sitat" && key !== "ansatt" && !str(idea.cta)) {
    idea.cta = "fosen-tools.no";
  }
  // prosess trenger minst 2 steg
  if (key === "prosess") {
    const steps = Array.isArray(idea.steps) ? idea.steps : [];
    if (steps.length < 2) {
      idea.steps = [
        { title: "Steg 1", text: "[Beskriv første steg]" },
        { title: "Steg 2", text: "[Beskriv andre steg]" },
        { title: "Steg 3", text: "[Beskriv tredje steg]" },
      ];
    }
  }
  // feature trenger minst ett fordel-punkt
  if (key === "feature") {
    const b = Array.isArray(idea.benefits)
      ? idea.benefits.filter((x) => typeof x === "string" && x.trim())
      : [];
    if (b.length === 0) {
      idea.benefits = ["[Fordel 1]", "[Fordel 2]", "[Fordel 3]"];
    }
  }
  return idea;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = (body.url ?? "").trim();
  if (!url) {
    return NextResponse.json({ error: "Mangler url" }, { status: 400 });
  }

  try {
    const page = await scrapePageByUrl(url, { jsImages: true });

    const sideTekst = [
      `URL: ${page.source_url}`,
      `Tittel: ${page.name}`,
      page.description ? `Meta-beskrivelse: ${page.description}` : "",
      page.sections.length
        ? `Seksjoner (H2): ${page.sections.join(" · ")}`
        : "",
      page.bullets.length
        ? `Innholdsutdrag:\n${page.bullets.map((b) => `- ${b}`).join("\n")}`
        : "",
      page.images.length
        ? `Bilder funnet på siden (bruk EKSAKT URL ved valg av imageUrl):\n${page.images
            .map((u) => `- ${u}`)
            .join("\n")}`
        : "Ingen bilder funnet på siden.",
    ]
      .filter(Boolean)
      .join("\n");

    const userPrompt = `Her er innholdet fra en Fosen Tools-side. Foreslå 6 ulike
post-idéer basert på dette innholdet:

${sideTekst}`;

    const result = await generateStructuredJson({
      systemInstruction: SYSTEM,
      userPrompt,
      responseSchema: IDEA_SCHEMA,
      temperature: 0.9,
    });

    const parsed = result.json as { ideas?: unknown };
    const rawIdeas = Array.isArray(parsed.ideas) ? parsed.ideas : [];
    const ideas = rawIdeas
      .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
      .map((i) => backfillIdea(i));

    return NextResponse.json({
      ideas,
      source: { name: page.name, url: page.source_url, images: page.images },
      model: result.model,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("idémyldring feilet:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
