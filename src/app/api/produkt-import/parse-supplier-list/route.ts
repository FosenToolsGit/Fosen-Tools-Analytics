import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { classify } from "@/lib/services/produktgruppe-classifier";
import { compactName } from "@/lib/services/name-compactor";
import { lookupWeraSeries } from "@/lib/services/wera-series";

/**
 * Parser en leverandør-prisliste (XLSX) til en liste produkter klare for import.
 * Støtter foreløpig Wera-formatet. Nye leverandører kan legges til som preset.
 */

export interface ParsedSupplierProduct {
  /** Internal index for selection UI */
  idx: number;
  name: string;
  ean: string;
  leverandorProdNr: string;
  produktinformasjon: string;
  variantverdi: string;
  kostpris: number | null;
  listePris: number | null;
  kostvaluta: string;
  produsent: string;
  /** Multicase leverandørnummer (f.eks. 600069 for Wera) */
  hovedleverandor: string;
  opprinnelsesland: string;
  bildeFilnavn: string;
  imageSourceUrl: string;
  webshopUrl: string;
  packingUnit: number | null;
  nettovekt: number | null;
  /** Foreslått Produktgruppe 1/2/3 (kan være null hvis ingen regel matcher) */
  suggestedG1: string | null;
  suggestedG2: string | null;
  suggestedG3: string | null;
}

type PresetParser = (rows: unknown[][]) => ParsedSupplierProduct[];

const PRESETS: Record<string, { label: string; parser: PresetParser }> = {
  wera: { label: "Wera (Händlernettopreisliste)", parser: parseWera },
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const preset = String(formData.get("preset") ?? "wera");
  if (!(file instanceof File)) return NextResponse.json({ error: "Mangler fil" }, { status: 400 });
  if (!PRESETS[preset]) return NextResponse.json({ error: `Ukjent preset: ${preset}` }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
    const products = PRESETS[preset].parser(rows);
    return NextResponse.json({ count: products.length, products });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parsing feilet" },
      { status: 500 }
    );
  }
}

/**
 * Wera-format (PL_WERA_*_Norwegian.xlsx):
 * Header på rad 8 (1-indexed), data fra rad 9.
 * Kolonner: 1=Sort key, 2=item (DE), 3=code, 4=Description Norwegian, 5=Marketing desc Norwegian,
 *           6=size/content, 7=currency, 8=min qty, 9=EUR/piece, 10=RRP, 12=packing unit, 13=EAN,
 *           15=country of origin, 16=pic name, 17=webshop URL, 18=product weight (g)
 */
function parseWera(rows: unknown[][]): ParsedSupplierProduct[] {
  const products: ParsedSupplierProduct[] = [];
  // Finn header-rad (inneholder "code" eller "EAN") — vanligvis rad-index 7 (0-indexed)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i];
    if (Array.isArray(row) && row.some((c) => typeof c === "string" && /^code$/i.test(c.trim()))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) throw new Error("Fant ikke header-rad i Wera-prislisten");

  const startRow = headerIdx + 1;
  for (let r = startRow; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const code = str(row[2]);
    const nameNo = str(row[3]);
    if (!code || !nameNo) continue;

    const marketingNo = str(row[4]);
    let cls = classify(nameNo, marketingNo);
    // Fallback: hvis klassifisereren ikke fant gruppe, prøv Wera serie-lookup
    // (869/4 → 1/4" hex pipe, 869/9 → 4mm Halfmoon presisjon, osv.)
    if (!cls.g1) {
      const series = lookupWeraSeries(nameNo, marketingNo);
      if (series && series.g1) {
        cls = { g1: series.g1, g2: series.g2, g3: series.g3 };
      }
    }
    const sizeContent = str(row[5]);
    const compacted = compactName(nameNo, sizeContent, marketingNo);
    products.push({
      idx: products.length,
      name: compacted.name,
      ean: str(row[12]),
      leverandorProdNr: code,
      produktinformasjon: str(row[4]),
      variantverdi: str(row[5]),
      kostpris: numOrNull(row[8]),
      listePris: numOrNull(row[9]),
      kostvaluta: str(row[6]) || "EUR",
      produsent: "Wera",
      hovedleverandor: "600069",
      // Wera er tysk merke — bruker DE som standard, ignorerer produksjonsland fra XLSX
      // (mange Wera-produkter produseres i CZ men brand-tilhørighet er tysk)
      opprinnelsesland: "DE",
      // Multicase forventer UNC-sti til lokal Multicase-mappe (\\tsclient\Multicase\)
      bildeFilnavn: str(row[15]) ? `\\\\tsclient\\Multicase\\${str(row[15])}` : "",
      imageSourceUrl: "",
      webshopUrl: str(row[16]),
      packingUnit: numOrNull(row[11]),
      nettovekt: weightToGrams(row[17]),
      suggestedG1: cls.g1,
      suggestedG2: cls.g2,
      suggestedG3: cls.g3,
    });
  }
  return products;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}
function weightToGrams(v: unknown): number | null {
  return numOrNull(v);
}
