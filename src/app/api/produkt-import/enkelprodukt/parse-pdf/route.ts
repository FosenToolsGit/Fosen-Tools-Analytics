import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { scrapeFromHtml } from "@/lib/services/enkelprodukt-scraper";
import { destillProduct } from "@/lib/services/enkelprodukt-destillery";
import { detectPdfVariants, buildFocusedTextForVariant, type PdfVariant } from "@/lib/services/pdf-variants";

/**
 * Tar en opplastet PDF (produktdatablad, brosjyre, manual), ekstraherer tekst,
 * og kjører den gjennom samme destillery-pipeline som URL/HTML-modus.
 *
 * FormData: file (PDF), source_url (valgfri), scrape_b2b_prices (valgfri "true"/"false")
 */
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

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Mangler fil (PDF)" }, { status: 400 });
  }
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF for stor (maks 25 MB)" }, { status: 413 });
  }

  const sourceUrl = (formData.get("source_url") as string | null)?.trim() || undefined;
  const scrapeB2BPrices = formData.get("scrape_b2b_prices") === "true";

  // Velg variant — hvis brukeren har valgt en bestemt variant fra en
  // tidligere upload (samme PDF, andre pass), bygger vi destillering rundt den
  const selectedVariantRaw = formData.get("selected_variant");
  let selectedVariant: PdfVariant | null = null;
  if (typeof selectedVariantRaw === "string" && selectedVariantRaw.length > 2) {
    try { selectedVariant = JSON.parse(selectedVariantRaw); } catch { selectedVariant = null; }
  }
  // Hvis brukeren har sendt med rå PDF-tekst (fra forrige upload), bruk den
  // direkte — slipper å parse PDF-en på nytt
  const cachedTextRaw = formData.get("cached_text");
  const cachedText = typeof cachedTextRaw === "string" && cachedTextRaw.length > 30 ? cachedTextRaw : null;

  try {
    let text: string;
    let numPages = 0;
    let filename = "";

    if (cachedText) {
      // Bruker har valgt en variant fra en tidligere PDF — vi har teksten i state
      text = cachedText;
      filename = (formData.get("filename") as string) || "cached.pdf";
    } else {
      // Vanlig flyt — parse PDF
      // pdf-parse v2 bruker PDFParse-klassen + pdfjs-dist under panseret.
      // Next.js bundler ikke pdf.worker.mjs riktig i dev-server, så vi
      // deaktiverer worker (kjør parsing på hovedtråden — treig på store
      // PDF-er men virker for vanlige produktdatablader < 50 sider).
      type PdfParseV2 = {
        new (options: { data: Uint8Array }): {
          getText(): Promise<{ text: string; total: number }>;
          destroy(): Promise<void>;
        };
        setWorker?: (workerSrc?: string) => string;
      };
      const mod = (await import("pdf-parse")) as unknown as { PDFParse: PdfParseV2 };
      // Disable worker — pdf.worker.mjs blir ikke funnet i .next/dev/-pathen.
      // Tom streng = fake-worker (main thread fallback i pdfjs-dist).
      try { mod.PDFParse.setWorker?.(""); } catch { /* ignore */ }
      const buf = Buffer.from(await file.arrayBuffer());
      const parser = new mod.PDFParse({ data: new Uint8Array(buf) });
      try {
        const result = await parser.getText();
        text = (result.text || "").trim();
        numPages = result.total ?? 0;
      } finally {
        await parser.destroy().catch(() => undefined);
      }
      filename = file.name;
    }

    if (!text || text.length < 30) {
      return NextResponse.json(
        { error: "Fant ingen lesbar tekst i PDF-en (kanskje scannet bilde — bruk OCR først)." },
        { status: 422 },
      );
    }

    // Hvis brukeren har valgt en variant, fokusér teksten på den
    let workingText = text;
    if (selectedVariant) {
      workingText = buildFocusedTextForVariant(text, selectedVariant);
    }

    // Send teksten gjennom regex-baserte scraper
    const raw = await scrapeFromHtml(workingText, sourceUrl, { scrape_b2b_prices: scrapeB2BPrices });
    if (!raw.source_url) raw.source_url = `pdf://${filename}`;

    // Hvis variant er valgt og har EAN/kode, override scrape-data
    if (selectedVariant) {
      if (selectedVariant.ean) raw.ean = selectedVariant.ean;
      if (selectedVariant.code) raw.mpn = selectedVariant.code;
      // Berik title med variant-størrelse for bedre Beskrivelse 1
      if (selectedVariant.size && !raw.title.includes(selectedVariant.size)) {
        raw.title = raw.title ? `${raw.title} ${selectedVariant.size}` : `${selectedVariant.code} ${selectedVariant.size}`;
      }
    }

    if (!raw.title && !raw.description_short && raw.bullets.length === 0) {
      raw.title = filename.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ");
      raw.description_short = workingText.slice(0, 400);
      raw.description_long = workingText.slice(0, 3000);
    }

    const product = await destillProduct(raw);

    // Hvis ingen variant er valgt og PDF-en har variant-tabell, returnér variant-listen
    let variants: PdfVariant[] = [];
    if (!selectedVariant) {
      variants = detectPdfVariants(text);
    }

    return NextResponse.json({
      raw,
      product,
      pdf: {
        filename,
        pages: numPages,
        text_length: text.length,
        // Returnér rå-tekst i førstegangs-upload så variant-velgeren slipper å re-uploade fila
        full_text: variants.length > 0 ? text : null,
      },
      variants,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF-parsing feilet" },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
