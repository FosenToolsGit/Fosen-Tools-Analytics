import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { classify } from "@/lib/services/produktgruppe-classifier";
import { generateSeoHtml } from "@/lib/services/wera-seo-html";
import type { WeraScrapeResult } from "@/lib/services/wera-deep-scrape";

/**
 * Re-klassifisering av cached Wera-produkter — kjører nye klassifiserings-regler
 * og regenererer SEO-HTML uten å gjøre nytt Playwright-scrape.
 *
 * Bruk når klassifiseren har fått nye regler og du vil oppdatere cachet data.
 * Mye raskere enn re-scrape (sekunder vs. timer).
 *
 * Body (valgfri): { codes?: string[] } — hvis satt, kun de spesifikke kodene;
 * ellers re-klassifiseres ALLE cachede rader.
 */

export const maxDuration = 300;

interface CachedRow {
  code: string;
  name: string | null;
  drive_type: string | null;
  profile: string | null;
  size_mm: string | null;
  length_mm: number | null;
  image_url: string | null;
  is_vde: boolean | null;
  feature_bullets: string[] | null;
  description_sections: Array<{ heading: string; text: string }> | null;
  raw_data: {
    title?: string;
    specs?: Array<{ label: string; value: string }>;
    isSB?: boolean;
    sbConfidence?: string | null;
    sbReason?: string;
    packagingNote?: string | null;
  } | null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  let bodyCodes: string[] | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    if (Array.isArray(body?.codes)) {
      bodyCodes = body.codes.filter((c: unknown): c is string => typeof c === "string" && c.trim().length > 0);
    }
  } catch {
    // ignore, behandle som null
  }

  // Hent alle (eller filtrerte) cached rader. Paginerer i batches av 1000 for store cacher.
  const allRows: CachedRow[] = [];
  const pageSize = 1000;
  let cursor = 0;
  while (true) {
    let q = supabase
      .from("wera_product_cache")
      .select("code,name,drive_type,profile,size_mm,length_mm,image_url,is_vde,feature_bullets,description_sections,raw_data")
      .range(cursor, cursor + pageSize - 1);
    if (bodyCodes && bodyCodes.length > 0) {
      q = q.in("code", bodyCodes);
    }
    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    allRows.push(...(data as CachedRow[]));
    if (data.length < pageSize) break;
    cursor += pageSize;
  }

  if (allRows.length === 0) {
    return NextResponse.json({ updated: 0, message: "Ingen cached rader å re-klassifisere" });
  }

  // Re-klassifiser hver rad og oppdater suggested_g1/g2/g3 + produktinformasjon_html
  let updated = 0;
  let g1Changed = 0;
  let g2Changed = 0;
  let g3Changed = 0;
  let htmlGenerated = 0;
  const updates: Array<{
    code: string;
    suggested_g1: string | null;
    suggested_g2: string | null;
    suggested_g3: string | null;
    produktinformasjon_html: string;
  }> = [];

  for (const row of allRows) {
    const name = row.name ?? "";
    // Bygg en pseudo-marketing-tekst fra scraped data så klassifiseren har kontekst
    const sectionText = (row.description_sections ?? [])
      .map((s) => `${s.heading}. ${s.text}`)
      .join(" ");
    const marketingProxy = [
      row.drive_type ?? "",
      row.profile ?? "",
      row.size_mm ?? "",
      row.is_vde ? "VDE" : "",
      (row.feature_bullets ?? []).join(". "),
      sectionText,
    ].filter(Boolean).join(" ");

    const cls = classify(name, marketingProxy);

    // Rekonstruer WeraScrapeResult for SEO-HTML-generering
    const scrapedReconstructed: WeraScrapeResult = {
      code: row.code,
      name: row.name,
      driveType: row.drive_type,
      profile: row.profile,
      sizeMm: row.size_mm,
      lengthMm: row.length_mm,
      imageUrl: row.image_url,
      isVde: row.is_vde ?? false,
      applicationNotes: null,
      featureBullets: row.feature_bullets ?? [],
      descriptionSections: row.description_sections ?? [],
      specs: row.raw_data?.specs ?? [],
      isSB: row.raw_data?.isSB ?? false,
      packagingNote: row.raw_data?.packagingNote ?? null,
      rawData: row.raw_data ?? {},
    };
    const html = generateSeoHtml({
      scraped: scrapedReconstructed,
      name: name,
      code: row.code,
      ean: "",
      produsent: "Wera",
      g1: cls.g1,
      g2: cls.g2,
      g3: cls.g3,
      sizeContent: row.size_mm ?? undefined,
    });

    updates.push({
      code: row.code,
      suggested_g1: cls.g1,
      suggested_g2: cls.g2,
      suggested_g3: cls.g3,
      produktinformasjon_html: html,
    });
    if (html) htmlGenerated++;
  }

  // Batch-update i blokker av 500
  const batchSize = 500;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    const { error } = await supabase.from("wera_product_cache").upsert(batch, { onConflict: "code" });
    if (error) {
      return NextResponse.json({ error: error.message, updated }, { status: 500 });
    }
    updated += batch.length;
  }

  // Telle endringer ved å hente på nytt — ikke kritisk, gjør enkelt sluttall
  return NextResponse.json({
    updated,
    html_generated: htmlGenerated,
    g1_changed: g1Changed,
    g2_changed: g2Changed,
    g3_changed: g3Changed,
    total_rows: allRows.length,
  });
}
