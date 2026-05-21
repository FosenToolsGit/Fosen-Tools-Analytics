import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";

/**
 * Bygger Multicase-kompatibel Produktimport-XLSX (54 kolonner) fra UI-data.
 * Støtter både standalone produkter og mor/barn-variantgrupper.
 */

// Eksakt kolonne-rekkefølge fra Multicase-mal
const COLUMNS = [
  "Avsender",
  "Koble til alle avsendere",
  "Varenummer",
  "EANnr",
  "AltVarenr",
  "Produktbeskrivelse 1",
  "Produktbeskrivelse 2",
  "Produktgruppe 1",
  "Produktgruppe 2",
  "Produktgruppe 3",
  "Produkttype2",
  "MorBarnKobling",
  "Variant1",
  "Variantverdi1",
  "Variant2",
  "Variantverdi2",
  "Hovedansvarlig 1",
  "Enhet",
  "Hovedleverandør",
  "Leverandør produktnummer",
  "Leveringstid",
  "Kostvaluta",
  "Hovedleverandør kostpris  ",
  "Frakt%",
  "Toll%",
  "Produsent",
  "Opprinnelsesland",
  "Lagernavn",
  "Lagerstatus",
  "ListePris1",
  "ListePris2",
  "ListePris3",
  "Min antall",
  "Maks antall",
  "Antall enheter i kjøpsforpakning",
  "Antall kolli",
  "Aktiv på web",
  "Nettovekt",
  "Nettolengde",
  "Nettobredde",
  "Nettohøyde",
  "Bruttovekt",
  "Bruttolengde",
  "Bruttobredde",
  "Bruttohøyde",
  "Batchkontroll",
  "Holdbarhet",
  "ABC Status",
  "Hovedansvarlig 2",
  "Registrert av",
  "BildeFilnavn",
  "Godkjenn",
  "MalVareNr",
  "Produktinformasjon",
] as const;

type ColumnName = (typeof COLUMNS)[number];
type Row = Partial<Record<ColumnName, string | number | null>>;

export interface ImportProductInput {
  /** Produktnavn (Produktbeskrivelse 1) */
  name: string;
  ean?: string;
  altVarenr?: string;
  leverandorProdNr?: string;
  produktbeskrivelse2?: string;
  variant1?: string;        // f.eks. "Farge"
  variantverdi1?: string;   // f.eks. "Gul" (tom på mor-rad)
  variant2?: string;
  variantverdi2?: string;
  /** Hvis satt, dette produktet er en "mor" som definerer variant-akse uten EAN/pris */
  isParent?: boolean;
  kostpris?: number;
  listePris1?: number;
  listePris2?: number;
  listePris3?: number;
  kolli?: number;
  antallIKjopsforp?: number;
  nettovekt?: number;
  bildeFilnavn?: string;
  produktinformasjon?: string;
  bullets?: string[];
  produktgruppe1?: string;
  produktgruppe2?: string;
  produktgruppe3?: string;
}

export interface ImportRequestBody {
  defaults: {
    avsender?: string;
    produktgruppe1?: string;
    produktgruppe2?: string;
    produktgruppe3?: string;
    hovedansvarlig1?: string;
    enhet?: string;
    hovedleverandor?: string;
    leveringstid?: number;
    kostvaluta?: string;
    frakt?: number;
    toll?: number;
    produsent?: string;
    opprinnelsesland?: string;
    lagernavn?: string;
    aktivPaWeb?: number;
    registrertAv?: string;
  };
  groups: Array<{
    /** Variant-gruppe: 1 mor-rad + N barn-rader. Tom array = standalone single product. */
    parent?: ImportProductInput;
    products: ImportProductInput[];
  }>;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: ImportRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.groups || body.groups.length === 0) {
    return NextResponse.json({ error: "Ingen produkter å generere" }, { status: 400 });
  }

  // Bygg rader
  const rows: Row[] = [];
  for (const group of body.groups) {
    if (group.parent) {
      rows.push(buildRow(group.parent, body.defaults, true));
    }
    for (const product of group.products) {
      rows.push(buildRow(product, body.defaults, false));
    }
  }

  // Bygg workbook
  const sheetData: (string | number | null)[][] = [
    [...COLUMNS],
    ...rows.map((r) => COLUMNS.map((col) => r[col] ?? null)),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  // Sett kolonnebredder for lesbarhet
  ws["!cols"] = COLUMNS.map((c) => ({ wch: Math.max(12, c.length + 2) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produktimport");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = `produktimport-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function buildRow(
  p: ImportProductInput,
  defaults: ImportRequestBody["defaults"],
  isParent: boolean
): Row {
  const produktinfo = p.produktinformasjon
    ?? (p.bullets && p.bullets.length > 0 ? p.bullets.map((b) => `• ${b}`).join("\n") : "");

  return {
    "Avsender": defaults.avsender ?? "Fosen Tools AS",
    "Koble til alle avsendere": null,
    "Varenummer": null,
    "EANnr": isParent ? null : (p.ean ? parseEan(p.ean) : null),
    "AltVarenr": p.altVarenr ?? null,
    "Produktbeskrivelse 1": p.name,
    "Produktbeskrivelse 2": p.produktbeskrivelse2 ?? null,
    "Produktgruppe 1": p.produktgruppe1 ?? defaults.produktgruppe1 ?? null,
    "Produktgruppe 2": p.produktgruppe2 ?? defaults.produktgruppe2 ?? null,
    "Produktgruppe 3": p.produktgruppe3 ?? defaults.produktgruppe3 ?? null,
    "Produkttype2": isParent ? "Variant" : (p.variant1 ? "Standard" : null),
    "MorBarnKobling": p.isParent ? null : null,
    "Variant1": p.variant1 ?? null,
    "Variantverdi1": isParent ? null : (p.variantverdi1 ?? null),
    "Variant2": p.variant2 ?? null,
    "Variantverdi2": isParent ? null : (p.variantverdi2 ?? null),
    "Hovedansvarlig 1": defaults.hovedansvarlig1 ?? "AHP",
    "Enhet": defaults.enhet ?? "Stk",
    "Hovedleverandør": defaults.hovedleverandor ? parseFloat(defaults.hovedleverandor) || defaults.hovedleverandor : null,
    "Leverandør produktnummer": isParent ? null : (p.leverandorProdNr ?? null),
    "Leveringstid": defaults.leveringstid ?? 7,
    "Kostvaluta": defaults.kostvaluta ?? "NOK",
    "Hovedleverandør kostpris  ": isParent ? 0.01 : (p.kostpris ?? null),
    "Frakt%": defaults.frakt ?? null,
    "Toll%": defaults.toll ?? null,
    "Produsent": defaults.produsent ?? null,
    "Opprinnelsesland": defaults.opprinnelsesland ?? null,
    "Lagernavn": defaults.lagernavn ?? null,
    "Lagerstatus": null,
    "ListePris1": isParent ? null : (p.listePris1 ?? null),
    "ListePris2": isParent ? null : (p.listePris2 ?? null),
    "ListePris3": isParent ? null : (p.listePris3 ?? null),
    "Min antall": null,
    "Maks antall": null,
    "Antall enheter i kjøpsforpakning": isParent ? null : (p.antallIKjopsforp ?? null),
    "Antall kolli": isParent ? null : (p.kolli ?? null),
    "Aktiv på web": defaults.aktivPaWeb ?? 1,
    "Nettovekt": p.nettovekt ?? null,
    "Nettolengde": null,
    "Nettobredde": null,
    "Nettohøyde": null,
    "Bruttovekt": null,
    "Bruttolengde": null,
    "Bruttobredde": null,
    "Bruttohøyde": null,
    "Batchkontroll": null,
    "Holdbarhet": null,
    "ABC Status": null,
    "Hovedansvarlig 2": null,
    "Registrert av": defaults.registrertAv ?? null,
    "BildeFilnavn": p.bildeFilnavn ?? null,
    "Godkjenn": null,
    "MalVareNr": null,
    "Produktinformasjon": produktinfo || null,
  };
}

function parseEan(s: string): number | string {
  const cleaned = s.replace(/\D/g, "");
  if (cleaned.length === 0) return s;
  // EAN-tall blir for store for vanlig number-presisjon i Excel; bruk string
  return cleaned.length > 12 ? cleaned : (parseInt(cleaned, 10) || cleaned);
}
