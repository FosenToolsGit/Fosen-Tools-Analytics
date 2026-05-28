import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { scrapeFromPdfText } from "@/lib/services/enkelprodukt-scraper";
import { destillProduct } from "@/lib/services/enkelprodukt-destillery";

/**
 * Tar en stack med PDF-er (Hultafors-datablader) og parser alle parallelt.
 * For hver PDF detekterer vi modellnr (Snickers «6943», «2539», ...) så
 * UI-en kan koble PDF-en til basket-variantene som deler samme modellnr.
 *
 * Returns { pdfs: BatchedPdfInfo[] }
 */

interface BatchedPdfInfo {
  filename: string;
  /** Detektert modellnr fra første sifre i PDF-tekst (4-7 siffer). */
  model_code: string | null;
  /** Produkttype detektert via destillery (BUKSE/JAKKE/HANSKER/...). */
  type_code: string;
  /** Pre-bygget Beskrivelse 1 fra PDF (uten farge/størrelse — basket fyller på). */
  beskr1_base: string;
  /** Ferdig destillery-output (felles for alle varianter av denne modellen). */
  produsent: string;
  produktinformasjon: string;
  gruppenivaa_1: string;
  gruppenivaa_2: string;
  gruppenivaa_3: string;
  enhet: string;
  /** Rå utdrag for å la operatør verifisere parse-resultatet. */
  title: string;
  description_short: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid FormData" }, { status: 400 });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Mangler filer (PDF)" }, { status: 400 });
  }
  if (files.length > 30) {
    return NextResponse.json({ error: "Maks 30 PDF-er per batch" }, { status: 413 });
  }

  // Dynamisk import av pdf-parse v1 — samme mønster som parse-pdf-ruten
  type PdfParseV1 = (buf: Buffer) => Promise<{ text: string; numpages: number }>;
  const mod = (await import("pdf-parse")) as unknown as { default: PdfParseV1 } | PdfParseV1;
  const pdfParse: PdfParseV1 =
    typeof mod === "function" ? mod : (mod as { default: PdfParseV1 }).default;

  const results = await Promise.all(
    files.map(async (file): Promise<BatchedPdfInfo | { filename: string; error: string }> => {
      try {
        if (file.size > 25 * 1024 * 1024) {
          return { filename: file.name, error: "PDF for stor (maks 25 MB)" };
        }
        const buf = Buffer.from(await file.arrayBuffer());
        const r = await pdfParse(buf);
        const text = (r.text || "").trim();
        if (!text || text.length < 30) {
          return { filename: file.name, error: "Ingen lesbar tekst (scannet PDF?)" };
        }
        const raw = scrapeFromPdfText(text, file.name);
        const destilled = await destillProduct(raw);
        // beskr1 fra destillery er ferdig formattert «TYPE KODE SPEC1 SPEC2 ...»
        // Den blir vår "base" — variant-spesifikk farge+størrelse legges på i UI.
        return {
          filename: file.name,
          model_code: raw.model_code ?? raw.mpn ?? null,
          // Trekk ut bare type-prefiksen og spec-tokenene (drop modellkoden fra
          // mid-strengen så vi ikke dupliserer den når basket legger på str/farge).
          type_code: extractTypeCode(destilled.produktbeskrivelse_1),
          beskr1_base: destilled.produktbeskrivelse_1,
          produsent: destilled.produsent || "",
          produktinformasjon: destilled.produktinformasjon || "",
          gruppenivaa_1: destilled.gruppenivaa_1 || "",
          gruppenivaa_2: destilled.gruppenivaa_2 || "",
          gruppenivaa_3: destilled.gruppenivaa_3 || "",
          enhet: destilled.enhet || "stk",
          title: raw.title || "",
          description_short: raw.description_short || "",
        };
      } catch (err) {
        return { filename: file.name, error: err instanceof Error ? err.message : "Parse-feil" };
      }
    }),
  );

  return NextResponse.json({
    count: results.length,
    pdfs: results.filter((r): r is BatchedPdfInfo => !("error" in r)),
    errors: results.filter((r): r is { filename: string; error: string } => "error" in r),
  });
}

/** Lest første ord (produkttype) av en Beskrivelse 1, eks. «BUKSE 6943 KL2». */
function extractTypeCode(beskr1: string): string {
  const m = beskr1.trim().match(/^([A-ZÆØÅ/]+)\b/);
  return m ? m[1] : "";
}

export const runtime = "nodejs";
export const maxDuration = 120;
