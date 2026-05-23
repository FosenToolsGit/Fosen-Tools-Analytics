import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { scrapeWeraProducts, closeBrowser, type WeraScrapeResult } from "@/lib/services/wera-deep-scrape";
import { classify } from "@/lib/services/produktgruppe-classifier";
import { generateSeoHtml } from "@/lib/services/wera-seo-html";
import { detectSB, type SBConfidence } from "@/lib/services/sb-detect";

/**
 * Henter SB-flagg fra cachet/scraped raw_data. Faller tilbake til navn-basert
 * deteksjon for gamle cache-rader som ble lagret før SB-feltene fantes.
 */
function sbFromRawData(
  rawData: unknown,
  name: string | null
): { isSB: boolean; sbConfidence: SBConfidence; sbReason: string } {
  const rd = (rawData ?? {}) as Record<string, unknown>;
  if (typeof rd.isSB === "boolean") {
    return {
      isSB: rd.isSB,
      sbConfidence: (rd.sbConfidence as SBConfidence) ?? null,
      sbReason: typeof rd.sbReason === "string" ? rd.sbReason : "",
    };
  }
  const d = detectSB({ rawName: name });
  return { isSB: d.isSB, sbConfidence: d.confidence, sbReason: d.reason };
}

/**
 * Deep-scrape Wera-produkter via Playwright. Sjekker cache først så hvert
 * produkt bare scrapes én gang per ~180 dager.
 *
 * Request body: { codes: string[] }
 * Response:     { results: Array<{ code, data, source: 'cache'|'live'|'failed' }> }
 */

// Vercel Hobby tillater maks 300s — kjør i mindre batcher om scrapingen
// trenger mer tid (kø flere kall fra UI-en i stedet for én lang request).
export const maxDuration = 300;

interface RequestBody {
  codes?: string[];
  /** Hvis satt, hopper vi over Playwright-scraping og returnerer kun cached data.
   *  Brukes når man vil bruke allerede scrapede produkter uten risiko for å starte
   *  et nytt tidkrevende scrape (f.eks. etter at en stor scrape stoppet midt-batch). */
  cacheOnly?: boolean;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const codes = (body.codes ?? []).filter((c): c is string => typeof c === "string" && c.trim().length > 0);
  if (codes.length === 0) return NextResponse.json({ error: "Ingen koder" }, { status: 400 });

  // 1. Sjekk cache for alle koder
  const now = new Date().toISOString();
  const { data: cached } = await supabase
    .from("wera_product_cache")
    .select("*")
    .in("code", codes)
    .gt("expires_at", now);

  const cachedMap = new Map<string, NonNullable<typeof cached>[number]>();
  for (const row of cached ?? []) cachedMap.set(row.code, row);

  const cacheHits = codes.filter((c) => cachedMap.has(c));
  const cacheMisses = codes.filter((c) => !cachedMap.has(c));

  // 2. Scrape de som mangler i cache (eller har utløpt) — hopp over hvis cacheOnly
  let scrapedResults: Array<WeraScrapeResult | null> = [];
  if (cacheMisses.length > 0 && !body.cacheOnly) {
    try {
      scrapedResults = await scrapeWeraProducts(cacheMisses, 4);
    } finally {
      // Sørg for å lukke browser etter scraping så vi ikke lekker minne
      await closeBrowser().catch(() => undefined);
    }

    // 3. Lagre nye scrapes i cache + generer SEO-HTML
    const inserts = scrapedResults
      .filter((r): r is WeraScrapeResult => r !== null)
      .map((r) => {
        const enrichedText = [r.name, r.driveType, r.profile, r.sizeMm].filter(Boolean).join(" ");
        const cls = classify(enrichedText, r.applicationNotes ?? "");
        const html = generateSeoHtml({
          scraped: r,
          name: r.name ?? "",
          code: r.code,
          ean: "",
          produsent: "Wera",
          g1: cls.g1,
          g2: cls.g2,
          g3: cls.g3,
          sizeContent: r.sizeMm ?? undefined,
        });
        return {
          code: r.code,
          name: r.name,
          drive_type: r.driveType,
          profile: r.profile,
          size_mm: r.sizeMm,
          length_mm: r.lengthMm,
          image_url: r.imageUrl,
          is_vde: r.isVde,
          application_notes: r.applicationNotes,
          suggested_g1: cls.g1,
          suggested_g2: cls.g2,
          suggested_g3: cls.g3,
          raw_data: r.rawData,
          produktinformasjon_html: html,
          feature_bullets: r.featureBullets,
          description_sections: r.descriptionSections,
          scraped_at: now,
        };
      });

    if (inserts.length > 0) {
      await supabase.from("wera_product_cache").upsert(inserts, { onConflict: "code" });
    }
  }

  // 4. Bygg endelig response: cache-hits + scraped (alle kommer fra cache eller live)
  const scrapedByCode = new Map<string, WeraScrapeResult | null>();
  cacheMisses.forEach((code, i) => scrapedByCode.set(code, scrapedResults[i] ?? null));

  const results = codes.map((code) => {
    const cachedRow = cachedMap.get(code);
    if (cachedRow) {
      return {
        code,
        source: "cache" as const,
        data: {
          name: cachedRow.name,
          driveType: cachedRow.drive_type,
          profile: cachedRow.profile,
          sizeMm: cachedRow.size_mm,
          lengthMm: cachedRow.length_mm,
          imageUrl: cachedRow.image_url,
          isVde: cachedRow.is_vde,
          suggestedG1: cachedRow.suggested_g1,
          suggestedG2: cachedRow.suggested_g2,
          suggestedG3: cachedRow.suggested_g3,
          produktinformasjonHtml: cachedRow.produktinformasjon_html ?? null,
          ...sbFromRawData(cachedRow.raw_data, cachedRow.name),
        },
      };
    }
    const scraped = scrapedByCode.get(code);
    if (scraped) {
      const enrichedText = [scraped.name, scraped.driveType, scraped.profile, scraped.sizeMm].filter(Boolean).join(" ");
      const cls = classify(enrichedText, "");
      const html = generateSeoHtml({
        scraped,
        name: scraped.name ?? "",
        code: scraped.code,
        ean: "",
        produsent: "Wera",
        g1: cls.g1,
        g2: cls.g2,
        g3: cls.g3,
        sizeContent: scraped.sizeMm ?? undefined,
      });
      return {
        code,
        source: "live" as const,
        data: {
          name: scraped.name,
          driveType: scraped.driveType,
          profile: scraped.profile,
          sizeMm: scraped.sizeMm,
          lengthMm: scraped.lengthMm,
          imageUrl: scraped.imageUrl,
          isVde: scraped.isVde,
          suggestedG1: cls.g1,
          suggestedG2: cls.g2,
          suggestedG3: cls.g3,
          produktinformasjonHtml: html,
          isSB: scraped.isSB,
          sbConfidence: (scraped.rawData.sbConfidence as SBConfidence) ?? null,
          sbReason: typeof scraped.rawData.sbReason === "string" ? scraped.rawData.sbReason : "",
        },
      };
    }
    return { code, source: "failed" as const, data: null };
  });

  return NextResponse.json({
    total: codes.length,
    cache_hits: cacheHits.length,
    scraped: results.filter((r) => r.source === "live").length,
    failed: results.filter((r) => r.source === "failed").length,
    results,
  });
}
