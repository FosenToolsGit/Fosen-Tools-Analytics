import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import * as XLSX from "xlsx";

/**
 * Parser en Multicase masseimport-XLSX (samme format som /api/produkt-import/export-multicase
 * produserer) og returnerer en liste med produkter som operatør kan bla gjennom i
 * Enkelprodukt-generatoren — én og én — for å copy-paste inn i Multicase manuelt.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Mangler fil" }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer", raw: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return NextResponse.json({ error: "Ingen ark i XLSX" }, { status: 400 });

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: true,
    });

    // Normaliser rader til ett konsistent format for UI-en
    const products = rows
      .map((r, idx) => normalizeRow(r, idx))
      .filter((p) => p.produktbeskrivelse_1 || p.leverandor_produktnummer);

    return NextResponse.json({ count: products.length, products });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parsing feilet" },
      { status: 500 },
    );
  }
}

export interface XlsxProduct {
  idx: number;
  varenummer: string;
  ean: string;
  alt_varenr: string;
  produktbeskrivelse_1: string;
  produktbeskrivelse_2: string;
  produktgruppe_1: string;
  produktgruppe_2: string;
  produktgruppe_3: string;
  enhet: string;
  produsent: string;
  hovedleverandor: string;
  leverandor_produktnummer: string;
  opprinnelsesland: string;
  bilde_filnavn: string;
  produktinformasjon: string;
  nettovekt: number | null;
  // Pris-felter
  kostpris: number | null;
  listepris_1: number | null;
  listepris_2: number | null;
  listepris_3: number | null;
  /** Hele original-raden bevart for «kopier som JSON»-funksjon */
  raw: Record<string, unknown>;
}

function str(r: Record<string, unknown>, key: string): string {
  const v = r[key];
  if (v === null || v === undefined) return "";
  return String(v).trim();
}
function num(r: Record<string, unknown>, key: string): number | null {
  const v = r[key];
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

function normalizeRow(r: Record<string, unknown>, idx: number): XlsxProduct {
  return {
    idx,
    varenummer: str(r, "Varenummer"),
    ean: str(r, "EANnr"),
    alt_varenr: str(r, "AltVarenr"),
    produktbeskrivelse_1: str(r, "Produktbeskrivelse 1"),
    produktbeskrivelse_2: str(r, "Produktbeskrivelse 2"),
    produktgruppe_1: str(r, "Produktgruppe 1"),
    produktgruppe_2: str(r, "Produktgruppe 2"),
    produktgruppe_3: str(r, "Produktgruppe 3"),
    enhet: str(r, "Enhet"),
    produsent: str(r, "Produsent"),
    hovedleverandor: str(r, "Hovedleverandør"),
    leverandor_produktnummer: str(r, "Leverandør produktnummer"),
    opprinnelsesland: str(r, "Opprinnelsesland"),
    bilde_filnavn: str(r, "BildeFilnavn"),
    produktinformasjon: str(r, "Produktinformasjon"),
    nettovekt: num(r, "Nettovekt"),
    kostpris: num(r, "Hovedleverandør kostpris  "), // merk to mellomrom — Multicase-konvensjon
    listepris_1: num(r, "ListePris1"),
    listepris_2: num(r, "ListePris2"),
    listepris_3: num(r, "ListePris3"),
    raw: r,
  };
}

export const runtime = "nodejs";
export const maxDuration = 60;
