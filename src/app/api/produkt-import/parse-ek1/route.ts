import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { classify } from "@/lib/services/produktgruppe-classifier";
import { generateProductInfoHtml } from "@/lib/services/wera-seo-html";
import type { WeraScrapeResult } from "@/lib/services/wera-deep-scrape";

/**
 * Parser Wera EK1-produktdata (media-eksport, `EK1_product_data_no_*.xlsx`).
 *
 * EK1 er Weras offisielle produkt-masterdata: rik HTML-beskrivelse, USP-bullets,
 * bruksområde-tips, opprinnelsesland, bildenavn og dimensjoner.
 *
 * Ruta bygger en SUPER-OPTIMALISERT SEO-produktinfo ved å slå sammen EK1-data
 * med eventuell cachet deep-scrape-data (`wera_product_cache`). Resultatet
 * brukes til å berike produktrader som er importert fra prislisten — matches
 * på `product_id` ↔ leverandør-produktnummer.
 */

export interface Ek1Item {
  code: string;
  ean: string;
  name: string;
  /** Opprinnelsesland per produkt (CZ/DE/TW/...). */
  opprinnelsesland: string;
  /** UNC-sti til produktbildet. */
  bildeFilnavn: string;
  category: string;
  typeofproduct: string;
  /** Produktgruppe-forslag fra klassifisereren basert på EK1 navn + kategori. */
  suggestedG1: string | null;
  suggestedG2: string | null;
  suggestedG3: string | null;
  // Rå EK1-innhold brukt til SEO-HTML-bygging
  catalogTextHtml: string;
  catalogText: string;
  contentInfo: string;
  bullets: string[];
  tips: string[];
  numberOfParts: string;
  dims: { width: string; length: string; height: string; unit: string; weight: string; weightUnit: string };
  /** Ferdig kombinert SEO-HTML (EK1 + valgfri deep-scrape) — settes i POST. */
  produktinformasjonHtml: string;
}

const MULTICASE_BILDE_PREFIX = "\\\\tsclient\\Multicase\\";

interface WeraCacheRow {
  code: string;
  name: string | null;
  drive_type: string | null;
  profile: string | null;
  size_mm: string | null;
  length_mm: number | null;
  image_url: string | null;
  is_vde: boolean | null;
  application_notes: string | null;
  feature_bullets: string[] | null;
  description_sections: Array<{ heading: string; text: string }> | null;
  raw_data: { specs?: Array<{ label: string; value: string }>; isSB?: boolean; packagingNote?: string | null } | null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Mangler fil" }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
    const items = parseEk1Rows(rows);

    // Slå opp cachet deep-scrape så SEO-HTML kan kombinere begge kildene
    const codes = items.map((i) => i.code);
    const { data: cached } = await supabase
      .from("wera_product_cache")
      .select("code,name,drive_type,profile,size_mm,length_mm,image_url,is_vde,application_notes,feature_bullets,description_sections,raw_data")
      .in("code", codes);
    const cachedMap = new Map<string, WeraCacheRow>();
    for (const row of (cached ?? []) as WeraCacheRow[]) cachedMap.set(row.code, row);

    for (const item of items) {
      const c = cachedMap.get(item.code);
      const scraped: WeraScrapeResult | null = c
        ? {
            code: c.code,
            name: c.name,
            driveType: c.drive_type,
            profile: c.profile,
            sizeMm: c.size_mm,
            lengthMm: c.length_mm,
            imageUrl: c.image_url,
            isVde: c.is_vde ?? false,
            applicationNotes: c.application_notes,
            featureBullets: c.feature_bullets ?? [],
            descriptionSections: c.description_sections ?? [],
            specs: c.raw_data?.specs ?? [],
            isSB: c.raw_data?.isSB ?? false,
            packagingNote: c.raw_data?.packagingNote ?? null,
            rawData: c.raw_data ?? {},
          }
        : null;
      item.produktinformasjonHtml = generateProductInfoHtml({
        produsent: "Wera",
        name: item.name,
        code: item.code,
        ean: item.ean,
        opprinnelsesland: item.opprinnelsesland,
        g1: item.suggestedG1,
        g2: item.suggestedG2,
        g3: item.suggestedG3,
        catalogTextHtml: item.catalogTextHtml,
        catalogText: item.catalogText,
        contentInfo: item.contentInfo,
        bullets: item.bullets,
        tips: item.tips,
        numberOfParts: item.numberOfParts,
        dims: item.dims,
        scraped,
      });
    }

    return NextResponse.json({
      count: items.length,
      deepScrapeMatched: items.filter((i) => cachedMap.has(i.code)).length,
      items,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parsing feilet" },
      { status: 500 }
    );
  }
}

/** Parser EK1-rader (header på rad 0) til Ek1Item[]. Eksportert for testbarhet. */
export function parseEk1Rows(rows: unknown[][]): Ek1Item[] {
  if (rows.length < 2) throw new Error("Tom EK1-fil");

  // Header-navn → kolonne-indeks (robust mot kolonne-rekkefølge)
  const header = rows[0];
  const hmap = new Map<string, number>();
  header.forEach((c, i) => {
    if (typeof c === "string") {
      const k = c.trim().toLowerCase();
      if (k && !hmap.has(k)) hmap.set(k, i);
    }
  });
  const col = (name: string): number => hmap.get(name) ?? -1;
  const at = (row: unknown[], idx: number): unknown => (idx >= 0 ? row[idx] : null);

  const cCode = col("product_id");
  if (cCode < 0) {
    throw new Error("Fant ikke «product_id»-kolonnen — er dette en EK1-produktdatafil?");
  }
  const cEan = col("ean");
  const cName = col("name");
  const cHtml = col("catalog_text_html");
  const cText = col("catalog_text");
  const cContentInfo = col("content_info");
  const cParts = col("number_of_parts");
  const cCoo = col("ursprungsland");
  const cImg = col("product_image");
  const cCat = col("category");
  const cType = col("typeofproduct");
  const cWidth = col("product_width");
  const cLength = col("product_length");
  const cHeight = col("product_height");
  const cDimUnit = col("product_dimension_unit");
  const cWeight = col("product_weight");
  const cWeightUnit = col("product_weight_unit");
  // shop_bullet_points1–8 + tipp_1–8_text — løs opp kolonne-indekser én gang
  const cBullets = Array.from({ length: 8 }, (_, n) => col(`shop_bullet_points${n + 1}`));
  const cTips = Array.from({ length: 8 }, (_, n) => col(`tipp_${n + 1}_text`));

  const items: Ek1Item[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const code = str(at(row, cCode));
    if (!code) continue;
    const name = str(at(row, cName));
    const category = str(at(row, cCat));
    const typeofproduct = str(at(row, cType));
    const img = str(at(row, cImg));
    const cls = classify(name, `${category} ${typeofproduct}`.trim());

    const bullets: string[] = [];
    for (const ci of cBullets) {
      const v = str(at(row, ci));
      if (v) bullets.push(v);
    }
    const tips: string[] = [];
    for (const ci of cTips) {
      const v = str(at(row, ci));
      if (v) tips.push(v);
    }

    items.push({
      code,
      ean: str(at(row, cEan)),
      name,
      opprinnelsesland: str(at(row, cCoo)),
      bildeFilnavn: img ? `${MULTICASE_BILDE_PREFIX}${img}` : "",
      category,
      typeofproduct,
      suggestedG1: cls.g1,
      suggestedG2: cls.g2,
      suggestedG3: cls.g3,
      catalogTextHtml: str(at(row, cHtml)),
      catalogText: str(at(row, cText)),
      contentInfo: str(at(row, cContentInfo)),
      bullets,
      tips,
      numberOfParts: str(at(row, cParts)),
      dims: {
        width: str(at(row, cWidth)),
        length: str(at(row, cLength)),
        height: str(at(row, cHeight)),
        unit: str(at(row, cDimUnit)),
        weight: str(at(row, cWeight)),
        weightUnit: str(at(row, cWeightUnit)),
      },
      produktinformasjonHtml: "",
    });
  }
  return items;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}
