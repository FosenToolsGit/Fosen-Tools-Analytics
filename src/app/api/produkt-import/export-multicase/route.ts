import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";

/**
 * Eksporterer redigerte produktrader tilbake til Multicase-kompatibel XLSX.
 * Mottar JSON med rader (same struktur som parse-multicase-export returnerte),
 * skriver dem ut med eksakt kolonne-rekkefølge fra import-malen.
 */

const COLUMNS = [
  "Avsender","Koble til alle avsendere","Varenummer","EANnr","AltVarenr",
  "Produktbeskrivelse 1","Produktbeskrivelse 2","Produktgruppe 1","Produktgruppe 2","Produktgruppe 3",
  "Produkttype2","MorBarnKobling","Variant1","Variantverdi1","Variant2","Variantverdi2",
  "Hovedansvarlig 1","Enhet","Hovedleverandør","Leverandør produktnummer","Leveringstid",
  "Kostvaluta","Hovedleverandør kostpris  ","Frakt%","Toll%","Produsent","Opprinnelsesland",
  "Lagernavn","Lagerstatus","ListePris1","ListePris2","ListePris3","Min antall","Maks antall",
  "Antall enheter i kjøpsforpakning","Antall kolli","Aktiv på web","Nettovekt","Nettolengde",
  "Nettobredde","Nettohøyde","Bruttovekt","Bruttolengde","Bruttobredde","Bruttohøyde",
  "Batchkontroll","Holdbarhet","ABC Status","Hovedansvarlig 2","Registrert av","BildeFilnavn",
  "Godkjenn","MalVareNr","Produktinformasjon",
] as const;

interface RequestBody {
  rows?: Array<Record<string, unknown>>;
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
  const rows = body.rows ?? [];
  if (rows.length === 0) return NextResponse.json({ error: "Ingen rader" }, { status: 400 });

  // Bygg sheet med eksakt kolonne-rekkefølge
  const sheetData: (string | number | boolean | null)[][] = [
    [...COLUMNS],
    ...rows.map((r) => COLUMNS.map((col) => {
      const v = r[col];
      if (v === undefined || v === null) return null;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
      return String(v);
    })),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = COLUMNS.map((c) => ({ wch: Math.max(12, c.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produktimport");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const filename = `produktimport-edit-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
