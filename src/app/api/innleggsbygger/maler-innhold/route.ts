import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { generateCaptionsJson } from "@/lib/services/gemini";

/**
 * POST /api/innleggsbygger/maler-innhold
 *
 * Genererer en ferdig innholdspakke for et innlegg laget i innleggsmaler:
 *  - Caption for Facebook, LinkedIn og Instagram (FT-stemme, datadrevne regler)
 *  - Alt-tekst for LinkedIn- og Instagram-bildet
 *  - Dedikerte UTM-lenker for Facebook + LinkedIn (Instagram får ingen — lenker
 *    er ikke klikkbare i IG-innlegg)
 *
 * Body: { brief?, mal?, label?, summary?, data?, destinationUrl?, campaign? }
 */

export const maxDuration = 60;

const SYSTEM = `Du er innholdsprodusent for Fosen Tools AS — norsk verktøy-
leverandør i Brekstad (25 år i 2026, del av familiekonsern med 100 år bak seg).
Du skriver ferdige captions for sosiale medier som kan publiseres direkte.

FT-KONTEKST:
- Egen produksjon: HDFI (skreddersydde skuminnlegg for verktøykontroll),
  FT Systemvegg, Weapon Storage, verktøyvogner. CADLAB = egen tegneavdeling.
- Sterk B2B-profil: forsvar, industri, aviation, offshore, verksted.
- TERMINOLOGI: «CNC-maskinert», ALDRI «CNC-frest». HDFI omtales bare «HDFI».

DATADREVNE CAPTION-REGLER (fra analyse av FTs egne poster):
- «Skreddersydd»/«HDFI»/«spesialtilpasset»-vinkling gir +144 % engasjement.
- Start gjerne med emoji (+93 %). 2+ emoji er greit.
- Stolthet-tone («levert», «ferdigstilt») funker. Unngå rene spørsmål-åpninger.
- Hold det konkret — vis en faktisk jobb/produkt, ikke filosofi.

PER PLATTFORM:
- Facebook: 100-280 tegn. Konkret «levert til X»-mønster. Lenke i teksten.
- LinkedIn: 400-700 tegn, litt mer fagspråk og kontekst. Lenke i teksten.
- Instagram: visuelt fokus, ingen klikkbar lenke (nevn «lenke i bio» ved behov).
  Hashtags skal i FØRSTE KOMMENTAR, ikke i selve teksten.

ALT-TEKST: beskriv hva som faktisk vises på bildet, kort og konkret, for
skjermlesere. Ikke markedsføringstekst.

Skriv alt på norsk. Captionen skal være ferdig — ingen plassholdere.`;

/** Slugifiser til ascii-kebab for UTM-campaign. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[æ]/g, "ae").replace(/[ø]/g, "o").replace(/[å]/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Bygger en UTM-tagget lenke for en plattform. */
function buildUtm(dest: string, source: "facebook" | "linkedin", campaign: string): string {
  try {
    const u = new URL(dest);
    u.searchParams.set("utm_source", source);
    u.searchParams.set("utm_medium", "social");
    u.searchParams.set("utm_campaign", campaign);
    u.searchParams.set("utm_content", source === "facebook" ? "fb" : "li");
    return u.toString();
  } catch {
    return "";
  }
}

interface Body {
  brief?: string;
  mal?: string;
  label?: string;
  summary?: string;
  data?: Record<string, unknown>;
  destinationUrl?: string;
  campaign?: string;
}

interface PlatformCaption {
  caption?: string;
  alt_text?: string;
  hashtags?: string;
  first_comment_hashtags?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const brief = (body.brief ?? "").trim();
  const label = (body.label ?? "").trim();
  const summary = (body.summary ?? "").trim();
  const dest = (body.destinationUrl ?? "").trim();
  const dataStr =
    body.data && Object.keys(body.data).length > 0
      ? JSON.stringify(body.data, null, 1)
      : "";

  if (!brief && !label && !dataStr) {
    return NextResponse.json(
      { error: "Trenger en brief eller et generert innlegg å skrive captions for" },
      { status: 400 }
    );
  }

  // UTM-campaign — auto fra label/mal + år-måned hvis ikke oppgitt
  const ym = new Date().toISOString().slice(0, 7);
  const campaign =
    (body.campaign ?? "").trim() ||
    `${slugify(label || body.mal || "innlegg")}-${ym}`;

  const kontekst = [
    brief ? `BRIEF: ${brief}` : "",
    body.mal ? `Arketype/layout: ${body.mal}` : "",
    label ? `Tittel på idéen: ${label}` : "",
    summary ? `Kort om idéen: ${summary}` : "",
    dataStr ? `Innholdet i innlegget (felt-verdier):\n${dataStr}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await generateCaptionsJson({
      systemInstruction: SYSTEM,
      userPrompt:
        `Skriv ferdige captions for dette Fosen Tools-innlegget:\n\n${kontekst}\n\n` +
        `Lever caption + alt-tekst for Facebook, Instagram og LinkedIn.`,
    });
    const json = (result.json ?? {}) as {
      facebook?: PlatformCaption;
      instagram?: PlatformCaption;
      linkedin?: PlatformCaption;
    };

    const fbUtm = dest ? buildUtm(dest, "facebook", campaign) : "";
    const liUtm = dest ? buildUtm(dest, "linkedin", campaign) : "";

    const fbCaption = (json.facebook?.caption ?? "").trim();
    const liCaption = (json.linkedin?.caption ?? "").trim();

    return NextResponse.json({
      campaign,
      facebook: {
        caption: fbUtm ? `${fbCaption}\n\n👉 ${fbUtm}` : fbCaption,
        altText: json.facebook?.alt_text ?? "",
        utm: fbUtm,
      },
      instagram: {
        // Instagram får ingen UTM-lenke — lenker er ikke klikkbare i IG-innlegg
        caption: (json.instagram?.caption ?? "").trim(),
        hashtags: json.instagram?.first_comment_hashtags ?? "",
        altText: json.instagram?.alt_text ?? "",
      },
      linkedin: {
        caption: liUtm ? `${liCaption}\n\n👉 ${liUtm}` : liCaption,
        hashtags: json.linkedin?.hashtags ?? "",
        altText: json.linkedin?.alt_text ?? "",
        utm: liUtm,
      },
      model: result.model,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("maler-innhold feilet:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
