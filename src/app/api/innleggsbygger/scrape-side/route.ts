import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { scrapePageByUrl } from "@/lib/services/scrape-product";

/**
 * GET /api/innleggsbygger/scrape-side?url=
 *
 * Scraper en tjeneste/custom-side (HDFI, CADLAB, bransje-sider) og returnerer
 * felter klare for feature-malen: headline (H1), intro (meta), benefits (H2-er).
 *
 * Brukes av innleggsbygger-UI «Hent fra side»-knapp for feature-malen.
 */

// H2-overskrifter som er navigasjon/footer-støy — ikke ekte fordeler
const NOISE_SECTIONS =
  /^(ofte stilte|kundesenter|kontakt|utforsk|fosen tools|meny|s[øo]k|nedlasting|relaterte|produkter|kategorier|merker|artikler|tilbeh[øo]r|alternativer|sitemap|skriv ut)/i;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Mangler url-parameter" }, { status: 400 });
  }

  try {
    const page = await scrapePageByUrl(url);

    // Benefits: H2-seksjoner som faktisk beskriver tjenesten (ikke nav/footer).
    // Fallback til intro-bullets hvis ingen gode seksjoner.
    let benefits = (page.sections ?? [])
      .map((s) => s.trim())
      .filter((s) => s.length >= 4 && s.length <= 70 && !NOISE_SECTIONS.test(s));

    if (benefits.length < 3) {
      const bulletFallback = (page.bullets ?? [])
        .map((b) => b.trim())
        .filter((b) => b.length >= 10 && b.length <= 90);
      benefits = [...benefits, ...bulletFallback];
    }
    benefits = benefits.slice(0, 5);

    // Intro: meta-beskrivelse, kuttet til rimelig lengde
    let intro = page.description?.trim() ?? "";
    if (intro.length > 160) intro = intro.slice(0, 157).trimEnd() + "…";

    return NextResponse.json({
      headline: page.name ?? "",
      intro: intro || null,
      benefits,
      source_url: page.source_url,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
