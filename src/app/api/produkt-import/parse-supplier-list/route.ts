import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { classify } from "@/lib/services/produktgruppe-classifier";
import { compactName } from "@/lib/services/name-compactor";
import { lookupWeraSeries } from "@/lib/services/wera-series";
import { detectSB, type SBConfidence } from "@/lib/services/sb-detect";

/**
 * Parser en leverandør-prisliste (XLSX) til en liste produkter klare for import.
 * Støtter foreløpig Wera-formatet. Nye leverandører kan legges til som preset.
 *
 * Kolonnene mappes via HEADER-NAVN (ikke faste indekser) så parseren tåler at
 * Wera setter inn / flytter kolonner mellom prisliste-versjoner.
 *
 * Hvis arbeidsboka også har et «MC sortiment»-ark (produkter vi allerede har i
 * Multicase), flagges matchende produkter med `alleredeInne` så UI kan skjule dem.
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
  /** Per-produkt opprinnelsesland fra «country of origin»-kolonnen. */
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
  /** Ufiltrert leverandør-navn (før kompaktering) — brukes til SB-deteksjon. */
  rawName: string;
  /** Flagget som SB-vare (selvbetjening/blister-forpakning). */
  isSB: boolean;
  /** «sure» = trygt SB, «maybe» = trenger manuell vurdering, null = ren. */
  sbConfidence: SBConfidence;
  /** Begrunnelse for SB-flagget. */
  sbReason: string;
  /** Produktet finnes allerede i Multicase (matchet mot «MC sortiment»-arket). */
  alleredeInne: boolean;
}

type PresetParser = (rows: unknown[][], mcCodes: Set<string>) => ParsedSupplierProduct[];

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
    // «MC sortiment»-ark (om det finnes) = produkter vi allerede har i Multicase
    const mcCodes = readMcSortiment(wb);
    const products = PRESETS[preset].parser(rows, mcCodes);
    return NextResponse.json({
      count: products.length,
      products,
      mcSortimentCount: mcCodes.size,
      alleredeInneCount: products.filter((p) => p.alleredeInne).length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parsing feilet" },
      { status: 500 }
    );
  }
}

/**
 * Leser «MC sortiment»-arket (produkter vi allerede har i Multicase) og
 * returnerer et sett med leverandør-produktnumre. Tomt sett hvis arket mangler.
 */
export function readMcSortiment(wb: XLSX.WorkBook): Set<string> {
  const codes = new Set<string>();
  const sheetName = wb.SheetNames.find((n) => /mc.?sortiment/i.test(n));
  if (!sheetName) return codes;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, defval: null });
  // Finn header-rad + kolonnen for «Leverandørs ProduktNr.»
  let codeCol = -1;
  let dataStart = 0;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    // NB: «.*» (ikke «\w*») fordi \w ikke matcher «ø» i «Leverandørs»
    const idx = row.findIndex(
      (c) => typeof c === "string" && /leverand.*produkt.?nr/i.test(c.trim())
    );
    if (idx >= 0) { codeCol = idx; dataStart = i + 1; break; }
  }
  if (codeCol < 0) return codes;
  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const c = normCode(row[codeCol]);
    if (c) codes.add(c);
  }
  return codes;
}

export function parseWera(rows: unknown[][], mcCodes: Set<string>): ParsedSupplierProduct[] {
  const products: ParsedSupplierProduct[] = [];

  // Finn header-rad (raden som inneholder «code»)
  let headerIdx = -1;
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i];
    if (Array.isArray(row) && row.some((c) => typeof c === "string" && /^code$/i.test(c.trim()))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) throw new Error("Fant ikke header-rad i Wera-prislisten");

  // Bygg header-navn → kolonne-indeks. Gjør parseren robust mot at Wera
  // setter inn nye kolonner (f.eks. «EUR/piece -20%», «NOK NTO PRIS»).
  const header = rows[headerIdx];
  const headerMap = new Map<string, number>();
  header.forEach((c, i) => {
    if (typeof c === "string") {
      const key = c.trim().toLowerCase().replace(/\s+/g, " ");
      if (key && !headerMap.has(key)) headerMap.set(key, i);
    }
  });
  const col = (...names: string[]): number => {
    for (const n of names) {
      const i = headerMap.get(n);
      if (i != null) return i;
    }
    return -1;
  };
  const at = (row: unknown[], idx: number): unknown => (idx >= 0 ? row[idx] : null);

  const cCode = col("code");
  const cName = col("description norwegian");
  const cMarketing = col("marketing description norwegian");
  const cSize = col("size/content");
  const cCurrency = col("currency");
  // Kostpris = vår netto innkjøp = «EUR/piece -20%» (kolonne J i ny prisliste).
  // Faller tilbake til «EUR/piece» for eldre prislister uten -20%-kolonnen.
  const cKost = col("eur/piece -20%", "eur/piece");
  const cList = col("rrp (eur/piece)", "rrp");
  const cPacking = col("packing unit (piece)", "packing unit");
  const cEan = col("ean");
  const cCoo = col("country of origin");
  const cPic = col("pic name");
  // Webshop-URL-kolonnen har tom header — den ligger rett etter «pic name».
  const cUrl = cPic >= 0 ? cPic + 1 : -1;
  const cWeight = col("product weight");

  if (cCode < 0 || cName < 0) {
    throw new Error("Fant ikke «code»/«Description Norwegian» i prislisten");
  }

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;
    const code = str(at(row, cCode));
    const nameNo = str(at(row, cName));
    if (!code || !nameNo) continue;

    const marketingNo = str(at(row, cMarketing));
    let cls = classify(nameNo, marketingNo);
    // Fallback: hvis klassifisereren ikke fant gruppe, prøv Wera serie-lookup
    // (869/4 → 1/4" hex pipe, 869/9 → 4mm Halfmoon presisjon, osv.)
    if (!cls.g1) {
      const series = lookupWeraSeries(nameNo, marketingNo);
      if (series && series.g1) {
        cls = { g1: series.g1, g2: series.g2, g3: series.g3 };
      }
    }
    const sizeContent = str(at(row, cSize));
    const compacted = compactName(nameNo, sizeContent, marketingNo);
    const webshopUrl = str(at(row, cUrl));
    const picName = str(at(row, cPic));
    // SB-deteksjon på RÅ felter (før kompaktering stripper «SB»-tokenet)
    const sb = detectSB({
      rawName: nameNo,
      name: compacted.name,
      url: webshopUrl,
      marketing: marketingNo,
      size: sizeContent,
    });
    products.push({
      idx: products.length,
      name: compacted.name,
      ean: str(at(row, cEan)),
      leverandorProdNr: code,
      produktinformasjon: marketingNo,
      variantverdi: sizeContent,
      kostpris: numOrNull(at(row, cKost)),
      listePris: numOrNull(at(row, cList)),
      kostvaluta: str(at(row, cCurrency)) || "EUR",
      produsent: "Wera",
      hovedleverandor: "600069",
      // Per-produkt opprinnelsesland (CZ/DE/TW/CN/PL/JP) — IKKE hardkodet
      opprinnelsesland: str(at(row, cCoo)),
      // Multicase forventer UNC-sti til lokal Multicase-mappe (\\tsclient\Multicase\)
      bildeFilnavn: picName ? `\\\\tsclient\\Multicase\\${picName}` : "",
      imageSourceUrl: "",
      webshopUrl,
      packingUnit: numOrNull(at(row, cPacking)),
      nettovekt: weightToGrams(at(row, cWeight)),
      suggestedG1: cls.g1,
      suggestedG2: cls.g2,
      suggestedG3: cls.g3,
      rawName: nameNo,
      isSB: sb.isSB,
      sbConfidence: sb.confidence,
      sbReason: sb.reason,
      alleredeInne: mcCodes.has(normCode(code)),
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
/** Normaliserer en leverandør-kode (Wera-koder er 11-sifrede med ledende null). */
function normCode(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v).trim();
  if (!s) return "";
  if (/^\d+$/.test(s) && s.length < 11) s = s.padStart(11, "0");
  return s;
}
