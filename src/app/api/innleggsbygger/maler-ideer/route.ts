import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { scrapePageByUrl } from "@/lib/services/scrape-product";
import { generateStructuredJson } from "@/lib/services/gemini";

/**
 * POST /api/innleggsbygger/maler-ideer
 *
 * Idémyldring for det design-porterte 108-layout-systemet (/innleggsbygger/maler).
 * Scraper en URL og ber Gemini foreslå ~6 post-ideer — hver mappet til én av
 * de 12 arketypene + retning (A/B/C). Selve felt-innholdet kommer som en
 * fokusert JSON-streng (`dataJson`) per arketype — det gir mye mer pålitelig
 * utfylling enn ett gigantisk flat-schema.
 *
 * Body: { url: string }
 * Response: { ideas: { mal, variant, label, summary, data }[], source }
 */

export const maxDuration = 60;

const SYSTEM = `Du er innholdsstrateg for Fosen Tools AS — norsk verktøy-
leverandør i Brekstad (25 år i 2026, del av familiekonsern med 100 år bak seg).
Du foreslår konkrete post-ideer for sosiale medier basert på en gitt nettside.

FT-KONTEKST:
- Egen produksjon: HDFI (skreddersydde skuminnlegg for verktøykontroll),
  FT Systemvegg, Weapon Storage, verktøyvogner. CADLAB = egen tegneavdeling.
- Sterk B2B-profil: forsvar, industri, aviation, offshore, verksted.
- 40+ merker (Wera, Knipex, Snap-on, Milwaukee, Facom m.fl.).
- TERMINOLOGI: «CNC-maskinert», ALDRI «CNC-frest». HDFI omtales bare «HDFI».

ARKETYPER (mal-feltet):
- feature   : tjeneste-/verdiforslag-post (HDFI, CADLAB).
- prosess   : «slik jobber vi» — nummererte steg.
- leveranse : «levert til kunde» — vis en konkret jobb.
- besok     : «på besøk hos» — kundebesøk/reportasje.
- stand     : messe-invitasjon.
- ansatt    : «møt teamet» — presenter en ansatt.
- sitat     : stort kundesitat.
- milepael  : jubileums-tall / statistikk.
- produkt-single / produkt-grid / produkt-mfr / produkt-variant : produkt-
  maler. Foreslå KUN hvis siden tydelig er en produkt-/merke-side.

RETNING (variant): A = FT-klassisk mørk, B = editorial/krem, C = industriell
poster. Velg den som kler idéen.

For hver idé: sett «dataJson» til en GYLDIG JSON-objekt-streng med feltene for
arketypen du valgte. Bruk EKSAKT disse feltnavnene (fyll bare relevante felt,
ferdig konkret norsk tekst — ikke plassholdere):

- feature: { eyebrow, kicker, headline, accent, subhead, description, chapter,
  cta, bullets:["punkt",...], bulletsNum:[{num,txt}] }
- prosess: { eyebrow, headline, accent, cta, steps:[{num,title,desc}] }   (3-5 steg)
- leveranse: { eyebrow, customer, industry, headline, accent, description,
  deliveryDate, orderNo, url, facts:[{label,value}] }
- besok: { company, location, description, quote, coords, date, url }
- stand: { eyebrow, event, year, pitch, date, place, stand, cta }
- ansatt: { eyebrow, name, role, yearsLabel, quote, fact, employeeId, joined,
  stats:[{label,value}] }
- sitat: { quote, name, role, company }
- milepael: { brand, number, unit, headline, subhead, certNo, timeline:[{year,label}] }
- produkt-single: { eyebrow, manufacturer, name, priceBefore, priceNow, discount, sku, url }
- produkt-grid: { items:[{name,priceBefore,priceNow,discount}] }
- produkt-mfr: { manufacturer, tagline, items:[{name,priceBefore,priceNow,discount}] }
- produkt-variant: {}

REGLER:
- Lag nøyaktig 6 ulike idéer med VARIERTE arketyper — ikke 6 like.
- accent = ETT ord som finnes i headline. headline kort (3-8 ord).
- Ikke ta med «photo»-felt — brukeren velger bilde selv.
- label = 2-5 ords korttittel. summary = én setning om hvorfor posten funker.
- dataJson MÅ være gyldig JSON som kan parses (dobbel-fnutt rundt nøkler/verdier).`;

const STR = { type: "string" } as const;

const IDEA_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          mal: {
            type: "string",
            enum: [
              "produkt-single",
              "produkt-grid",
              "produkt-mfr",
              "produkt-variant",
              "feature",
              "prosess",
              "leveranse",
              "besok",
              "stand",
              "ansatt",
              "sitat",
              "milepael",
            ],
          },
          variant: { type: "string", enum: ["A", "B", "C"] },
          label: STR,
          summary: STR,
          dataJson: {
            type: "string",
            description:
              "Gyldig JSON-objekt-streng med arketype-feltene (se instruks).",
          },
        },
        required: ["mal", "variant", "label", "summary", "dataJson"],
      },
    },
  },
  required: ["ideas"],
};

interface RawIdea {
  mal?: string;
  variant?: string;
  label?: string;
  summary?: string;
  dataJson?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    ]
      .filter(Boolean)
      .join("\n");

    const result = await generateStructuredJson({
      systemInstruction: SYSTEM,
      userPrompt: `Foreslå 6 post-idéer basert på dette sideinnholdet:\n\n${sideTekst}`,
      responseSchema: IDEA_SCHEMA,
      temperature: 0.85,
    });

    const parsed = result.json as { ideas?: RawIdea[] };
    const rawIdeas = Array.isArray(parsed.ideas) ? parsed.ideas : [];

    const ideas = rawIdeas
      .filter((r) => r && typeof r.mal === "string")
      .map((r) => {
        let data: Record<string, unknown> = {};
        try {
          const j = JSON.parse(r.dataJson ?? "{}");
          if (j && typeof j === "object") data = j as Record<string, unknown>;
        } catch {
          data = {};
        }
        return {
          mal: r.mal,
          variant: ["A", "B", "C"].includes(r.variant ?? "") ? r.variant : "A",
          label: r.label ?? "",
          summary: r.summary ?? "",
          data,
        };
      });

    return NextResponse.json({
      ideas,
      source: { name: page.name, url: page.source_url, images: page.images },
      model: result.model,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("maler-ideer feilet:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
