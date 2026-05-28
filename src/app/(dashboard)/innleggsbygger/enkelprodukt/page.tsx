"use client";

import { useState, useMemo } from "react";
import {
  Loader2, Link as LinkIcon, Download, Copy, Check, AlertTriangle,
  Sparkles, RefreshCw, FileText, Image as ImageIcon, Code, FileSpreadsheet,
  FileUp,
} from "lucide-react";
import hierarki from "@/lib/data/produktgruppe-hierarki.json";
import { iso2ToCountry } from "@/lib/services/iso-country";

const HIERARKI = hierarki as Record<string, Record<string, string[]>>;

interface DestilledProduct {
  name: string;
  produsent: string;
  enhet: string;
  gruppenivaa_1: string;
  gruppenivaa_2: string;
  gruppenivaa_3: string;
  produktbeskrivelse_1: string;
  produktbeskrivelse_2: string;
  produktinformasjon: string;
  source_url: string;
  ean: string | null;
  mpn: string | null;
  price_now: number | null;
  price_before: number | null;
  currency: string | null;
  kostpris: number | null;
  listepris: number | null;
  opprinnelsesland: string;
  ai_notes: string;
}

interface ScrapedRaw {
  source_url: string;
  title: string;
  manufacturer: string | null;
  ean: string | null;
  mpn: string | null;
  description_short: string;
  description_long: string;
  bullets: string[];
  specs: Array<{ key: string; value: string }>;
  images: string[];
  price_now: number | null;
  price_before: number | null;
  currency: string | null;
  kostpris: number | null;
  listepris: number | null;
  domain: string;
}

const ENHETER = ["stk", "sett", "paret", "pakke", "m", "kg", "rull"];

type InputMode = "url" | "html" | "xlsx" | "pdf" | "basket";

interface HultaforsVariant {
  stock_code: string;
  quantity: number;
  model_code: string;
  color_code: string;
  size_code: string;
  color_label: string | null;
  size_label: string;
}

interface XlsxProduct {
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
  kostpris: number | null;
  listepris_1: number | null;
  listepris_2: number | null;
  listepris_3: number | null;
}

export default function EnkelproduktPage() {
  const [mode, setMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [sourceUrlHint, setSourceUrlHint] = useState("");
  const [scrapeB2BPrices, setScrapeB2BPrices] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<ScrapedRaw | null>(null);
  const [product, setProduct] = useState<DestilledProduct | null>(null);
  const [downloadingImage, setDownloadingImage] = useState<string | null>(null);

  // PDF-modus state — varianter detektert i felles PDF (Wera-serier osv.)
  interface PdfVariantInfo {
    label: string;
    fields: Record<string, string>;
    raw_line: string;
    code: string | null;
    ean: string | null;
    size: string | null;
  }
  const [pdfVariants, setPdfVariants] = useState<PdfVariantInfo[]>([]);
  const [pdfFullText, setPdfFullText] = useState<string>("");
  const [pdfFilename, setPdfFilename] = useState<string>("");
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number | null>(null);

  // XLSX-modus state
  const [xlsxProducts, setXlsxProducts] = useState<XlsxProduct[]>([]);
  const [xlsxFilename, setXlsxFilename] = useState<string>("");
  const [selectedXlsxIdx, setSelectedXlsxIdx] = useState<number | null>(null);
  const [xlsxSearch, setXlsxSearch] = useState("");
  const [xlsxDone, setXlsxDone] = useState<Set<number>>(new Set());

  // Hultafors basket-modus state
  const [basketVariants, setBasketVariants] = useState<HultaforsVariant[]>([]);
  const [basketFilename, setBasketFilename] = useState<string>("");
  const [selectedBasketIdx, setSelectedBasketIdx] = useState<number | null>(null);
  const [basketDone, setBasketDone] = useState<Set<number>>(new Set());
  /** PDF-batch koblet til basket: hver PDF parses og matches mot
   *  basket-varianter via modellnr (første 4 sifre). */
  interface BasketPdf {
    filename: string;
    model_code: string | null;
    type_code: string;
    beskr1_base: string;
    produsent: string;
    produktinformasjon: string;
    gruppenivaa_1: string;
    gruppenivaa_2: string;
    gruppenivaa_3: string;
    enhet: string;
    title: string;
    description_short: string;
  }
  const [basketPdfs, setBasketPdfs] = useState<BasketPdf[]>([]);
  const [basketPdfsLoading, setBasketPdfsLoading] = useState(false);
  const [basketPdfErrors, setBasketPdfErrors] = useState<Array<{ filename: string; error: string }>>([]);

  const g2Options = useMemo(
    () => (product?.gruppenivaa_1 ? Object.keys(HIERARKI[product.gruppenivaa_1] || {}) : []),
    [product?.gruppenivaa_1],
  );
  const g3Options = useMemo(
    () =>
      product?.gruppenivaa_1 && product?.gruppenivaa_2
        ? HIERARKI[product.gruppenivaa_1]?.[product.gruppenivaa_2] || []
        : [],
    [product?.gruppenivaa_1, product?.gruppenivaa_2],
  );

  const canSubmit = useMemo(() => {
    if (mode === "url") return url.trim().length > 0;
    return html.trim().length > 30;
  }, [mode, url, html]);

  async function handleScrape() {
    if (!canSubmit) return;
    setScraping(true);
    setError(null);
    try {
      const body =
        mode === "url"
          ? { url: url.trim(), scrape_b2b_prices: scrapeB2BPrices }
          : {
              html: html,
              source_url: sourceUrlHint.trim() || undefined,
              scrape_b2b_prices: scrapeB2BPrices,
            };
      const res = await fetch("/api/produkt-import/enkelprodukt/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Henting feilet");
        return;
      }
      setRaw(data.raw);
      setProduct(data.product);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nettverksfeil");
    } finally {
      setScraping(false);
    }
  }

  async function handleRegenerate() {
    if (!raw) return;
    setScraping(true);
    setError(null);
    try {
      const body =
        raw.source_url && mode === "url"
          ? { url: raw.source_url, scrape_b2b_prices: scrapeB2BPrices }
          : { html, source_url: raw.source_url, scrape_b2b_prices: scrapeB2BPrices };
      const res = await fetch("/api/produkt-import/enkelprodukt/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Regenerering feilet");
        return;
      }
      setProduct(data.product);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nettverksfeil");
    } finally {
      setScraping(false);
    }
  }

  function update<K extends keyof DestilledProduct>(key: K, value: DestilledProduct[K]) {
    if (!product) return;
    const next = { ...product, [key]: value } as DestilledProduct;
    // Wera-import-mønster: Beskrivelse 2 = «{MPN} - {Produsent}» (max 40 tegn).
    // Auto-resync hver gang MPN eller Produsent endres, MEN bare hvis nåværende B2
    // fortsatt følger mønsteret (operatør kan overstyre B2 manuelt).
    if (key === "mpn" || key === "produsent") {
      const expectedOld = buildBeskrivelse2(product.mpn, product.produsent);
      const currentB2 = (product.produktbeskrivelse_2 || "").trim();
      if (!currentB2 || currentB2 === expectedOld) {
        next.produktbeskrivelse_2 = buildBeskrivelse2(next.mpn, next.produsent);
      }
    }
    // Beskrivelse 1 og name speiler hverandre — ALLTID i CAPS (Multicase-konvensjon),
    // max 40 tegn.
    if (key === "produktbeskrivelse_1") {
      const upper = String(value).toUpperCase().slice(0, 40);
      next.produktbeskrivelse_1 = upper;
      next.name = upper;
    }
    if (key === "name") {
      const upper = String(value).toUpperCase().slice(0, 40);
      next.name = upper;
      next.produktbeskrivelse_1 = upper;
    }
    setProduct(next);
  }

  // Speil av server-side helperen — duplisert klient-side for at vi ikke
  // skal trenge round-trip på hver tastaturanslag.
  function buildBeskrivelse2(
    mpn: string | null | undefined,
    produsent: string | null | undefined,
  ): string {
    const m = (mpn ?? "").trim();
    const p = (produsent ?? "").trim();
    if (m && p) return `${m} - ${p}`.slice(0, 40);
    if (p) return p.slice(0, 40);
    if (m) return m.slice(0, 40);
    return "";
  }

  async function downloadImage(imageUrl: string, format: "jpg" | "png" | "webp") {
    setDownloadingImage(`${imageUrl}-${format}`);
    try {
      const params = new URLSearchParams({ url: imageUrl, format });
      if (product?.mpn) params.set("filename", product.mpn);
      const res = await fetch(`/api/produkt-import/enkelprodukt/download-image?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || `Nedlasting feilet (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const cd = res.headers.get("content-disposition") || "";
      const m = cd.match(/filename="([^"]+)"/);
      a.download = m ? m[1] : `image.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Nedlasting feilet");
    } finally {
      setDownloadingImage(null);
    }
  }

  function reset() {
    setUrl("");
    setHtml("");
    setSourceUrlHint("");
    setRaw(null);
    setProduct(null);
    setError(null);
  }

  async function handlePdfUpload(file: File) {
    setScraping(true);
    setError(null);
    setPdfVariants([]);
    setSelectedVariantIdx(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (sourceUrlHint.trim()) fd.append("source_url", sourceUrlHint.trim());
      if (scrapeB2BPrices) fd.append("scrape_b2b_prices", "true");
      const res = await fetch("/api/produkt-import/enkelprodukt/parse-pdf", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "PDF-parsing feilet");
        return;
      }
      setRaw(data.raw);
      setProduct(data.product);
      // Hvis PDF inneholder en variant-tabell, lagre den
      if (Array.isArray(data.variants) && data.variants.length >= 2) {
        setPdfVariants(data.variants);
        setPdfFilename(data.pdf?.filename || file.name);
        if (typeof data.pdf?.full_text === "string") setPdfFullText(data.pdf.full_text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nettverksfeil");
    } finally {
      setScraping(false);
    }
  }

  async function selectPdfVariant(idx: number) {
    const variant = pdfVariants[idx];
    if (!variant || !pdfFullText) return;
    setScraping(true);
    setError(null);
    try {
      const fd = new FormData();
      // Vi sender en dummy fil med 0 bytes — backend forventer en File men vi
      // bruker cached_text i stedet. La oss bygge en ekte mini-File for å unngå validering-feil
      fd.append("file", new File([new Uint8Array(0)], pdfFilename, { type: "application/pdf" }));
      fd.append("cached_text", pdfFullText);
      fd.append("filename", pdfFilename);
      fd.append("selected_variant", JSON.stringify(variant));
      if (sourceUrlHint.trim()) fd.append("source_url", sourceUrlHint.trim());
      if (scrapeB2BPrices) fd.append("scrape_b2b_prices", "true");
      const res = await fetch("/api/produkt-import/enkelprodukt/parse-pdf", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Variant-destillering feilet");
        return;
      }
      setRaw(data.raw);
      setProduct(data.product);
      setSelectedVariantIdx(idx);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nettverksfeil");
    } finally {
      setScraping(false);
    }
  }

  async function handleXlsxUpload(file: File) {
    setScraping(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/produkt-import/enkelprodukt/parse-xlsx", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "XLSX-parsing feilet");
        return;
      }
      setXlsxProducts(data.products || []);
      setXlsxFilename(file.name);
      setSelectedXlsxIdx(null);
      setXlsxDone(new Set());
      setProduct(null);
      setRaw(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nettverksfeil");
    } finally {
      setScraping(false);
    }
  }

  async function handleBasketPdfsUpload(files: FileList) {
    if (files.length === 0) return;
    setBasketPdfsLoading(true);
    setBasketPdfErrors([]);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/produkt-import/enkelprodukt/parse-pdfs-batch", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "PDF-batch-parsing feilet");
        return;
      }
      // Slå sammen med eksisterende PDF-er (lar bruker dryppe-laste flere)
      setBasketPdfs((prev) => [...prev, ...(data.pdfs || [])]);
      if (data.errors && data.errors.length > 0) {
        setBasketPdfErrors((prev) => [...prev, ...data.errors]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nettverksfeil ved PDF-batch");
    } finally {
      setBasketPdfsLoading(false);
    }
  }

  /** Finn PDF som matcher en basket-variants modellnr (første 4 sifre). */
  function findPdfForVariant(v: HultaforsVariant): BasketPdf | null {
    // Eksakt match først (4-sifrede modellkoder)
    let pdf = basketPdfs.find((p) => p.model_code === v.model_code) || null;
    if (pdf) return pdf;
    // Fallback: PDF's model_code kan være 6-11 siffer (hele leverandørproduktnr)
    // som starter med samme 4 — prøv prefix
    pdf = basketPdfs.find((p) => p.model_code?.startsWith(v.model_code)) || null;
    return pdf;
  }

  async function handleBasketUpload(file: File) {
    setScraping(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/produkt-import/enkelprodukt/parse-basket", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Basket-parsing feilet");
        return;
      }
      setBasketVariants(data.variants || []);
      setBasketFilename(file.name);
      setSelectedBasketIdx(null);
      setBasketDone(new Set());
      setProduct(null);
      setRaw(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nettverksfeil");
    } finally {
      setScraping(false);
    }
  }

  /** Klikk på en basket-variant → bygg start-data for én Multicase-rad.
   *  Hvis en matchende PDF er lastet opp, beriker vi med produkttype,
   *  spec-tokens, produktgruppe, produktinformasjon m.m. */
  function selectBasketVariant(idx: number) {
    const v = basketVariants[idx];
    if (!v) return;
    const pdf = findPdfForVariant(v);
    const produsent = pdf?.produsent || "Snickers Workwear";

    // Størrelse: alltid med STR:-prefiks (matcher Multicase-konvensjonen
    // i FT-fakturaen — «STR: 54», «STR: M», «STR: XXL», «STR: S/M»)
    const sizeFragment = v.size_label ? `STR: ${v.size_label}` : "";
    // Farge: bruk de korte tabel-verdiene direkte (GUL, GUL/SORT, SORT, ...)
    const colorFragment = v.color_label
      ? v.color_label.toUpperCase()
      : `FARGE ${v.color_code}`;

    // Bygg Beskrivelse 1: PDF-base (TYPE + spec-tokens) + farge + størrelse
    // PDF.beskr1_base er allerede «BUKSE 6943 KL2 HL CRD» — vi appender variant-info
    let beskr1: string;
    if (pdf?.beskr1_base) {
      // Hvis basket-modellkode IKKE er i PDF-base, injiser den
      const base = pdf.beskr1_base.includes(v.model_code)
        ? pdf.beskr1_base
        : pdf.type_code
          ? `${pdf.type_code} ${v.model_code}${pdf.beskr1_base.replace(pdf.type_code, "")}`
          : pdf.beskr1_base;
      beskr1 = [base, colorFragment, sizeFragment].filter(Boolean).join(" ").slice(0, 40);
    } else {
      // Ingen matchende PDF — bare variant-info, operatør fyller produkttype
      beskr1 = [v.model_code, colorFragment, sizeFragment].filter(Boolean).join(" ").slice(0, 40);
    }
    const beskr2 = `${v.stock_code} - ${produsent}`.slice(0, 40);

    const destilled: DestilledProduct = {
      name: beskr1,
      produsent,
      enhet: pdf?.enhet || "stk",
      gruppenivaa_1: pdf?.gruppenivaa_1 || "",
      gruppenivaa_2: pdf?.gruppenivaa_2 || "",
      gruppenivaa_3: pdf?.gruppenivaa_3 || "",
      produktbeskrivelse_1: beskr1,
      produktbeskrivelse_2: beskr2,
      produktinformasjon: pdf?.produktinformasjon || "",
      source_url: pdf ? `basket+pdf://${basketFilename}+${pdf.filename}` : `basket://${basketFilename}`,
      ean: null,
      mpn: v.stock_code,
      price_now: null,
      price_before: null,
      currency: "NOK",
      kostpris: null,
      listepris: null,
      opprinnelsesland: "Sverige",
      ai_notes: pdf
        ? `Hultafors basket-rad ${idx + 1}/${basketVariants.length}. ` +
          `Beriket fra PDF «${pdf.filename}» (modell ${v.model_code} matcher). ` +
          `Farge ${v.color_code}${v.color_label ? ` (${v.color_label})` : ""} · Str ${v.size_label}.`
        : `Hultafors basket-rad ${idx + 1}/${basketVariants.length}. ` +
          `Modell ${v.model_code} · Farge ${v.color_code}${v.color_label ? ` (${v.color_label})` : ""} · Str ${v.size_label}. ` +
          `INGEN matchende PDF — last opp PDF for å berike produkttype/spec/gruppe.`,
    };
    setProduct(destilled);
    setRaw(null);
    setSelectedBasketIdx(idx);
  }

  function selectXlsxProduct(idx: number) {
    const p = xlsxProducts.find((x) => x.idx === idx);
    if (!p) return;
    // Map XLSX-rad til DestilledProduct-shape
    const destilled: DestilledProduct = {
      name: p.produktbeskrivelse_1,
      produsent: p.produsent || p.hovedleverandor || "",
      enhet: p.enhet || "stk",
      gruppenivaa_1: p.produktgruppe_1 || "",
      gruppenivaa_2: p.produktgruppe_2 || "",
      gruppenivaa_3: p.produktgruppe_3 || "",
      produktbeskrivelse_1: p.produktbeskrivelse_1,
      // Hvis B2 mangler i XLSX, regenerer den fra leverandørproduktnr + produsent
      produktbeskrivelse_2:
        p.produktbeskrivelse_2 ||
        buildBeskrivelse2(p.leverandor_produktnummer, p.produsent),
      produktinformasjon: p.produktinformasjon || "",
      source_url: "",
      ean: p.ean || null,
      // Wera-konvensjon: MPN = leverandørproduktnummer (ikke alt-prod.nr)
      mpn: p.leverandor_produktnummer || p.alt_varenr || null,
      price_now: p.listepris_1,
      price_before: null,
      currency: "NOK",
      kostpris: p.kostpris,
      listepris: p.listepris_1,
      // CZ → Tsjekkia, DE → Tyskland, osv. Returnerer "Vet ikke" hvis blank.
      opprinnelsesland: p.opprinnelsesland ? iso2ToCountry(p.opprinnelsesland) : "Vet ikke",
      ai_notes: `Lastet fra ${xlsxFilename} — rad ${idx + 1} av ${xlsxProducts.length}`,
    };
    setProduct(destilled);
    setRaw(null);
    setSelectedXlsxIdx(idx);
  }

  function markCurrentAsDone() {
    if (selectedXlsxIdx == null) return;
    const newDone = new Set(xlsxDone);
    newDone.add(selectedXlsxIdx);
    setXlsxDone(newDone);
    // Hopp til neste ikke-ferdige
    goToNext(true);
  }

  function goToNext(skipDone = true) {
    if (selectedXlsxIdx == null || xlsxProducts.length === 0) return;
    const currentPos = xlsxProducts.findIndex((p) => p.idx === selectedXlsxIdx);
    for (let i = currentPos + 1; i < xlsxProducts.length; i++) {
      if (!skipDone || !xlsxDone.has(xlsxProducts[i].idx)) {
        selectXlsxProduct(xlsxProducts[i].idx);
        return;
      }
    }
    // Wrap around — fra start
    for (let i = 0; i < currentPos; i++) {
      if (!skipDone || !xlsxDone.has(xlsxProducts[i].idx)) {
        selectXlsxProduct(xlsxProducts[i].idx);
        return;
      }
    }
  }

  function goToPrev() {
    if (selectedXlsxIdx == null || xlsxProducts.length === 0) return;
    const currentPos = xlsxProducts.findIndex((p) => p.idx === selectedXlsxIdx);
    const prevIdx = currentPos > 0 ? currentPos - 1 : xlsxProducts.length - 1;
    selectXlsxProduct(xlsxProducts[prevIdx].idx);
  }

  // Filtrert produktliste basert på søk
  const filteredXlsxProducts = useMemo(() => {
    const q = xlsxSearch.trim().toLowerCase();
    if (!q) return xlsxProducts;
    return xlsxProducts.filter(
      (p) =>
        p.produktbeskrivelse_1.toLowerCase().includes(q) ||
        p.leverandor_produktnummer.toLowerCase().includes(q) ||
        p.varenummer.toLowerCase().includes(q) ||
        p.ean.toLowerCase().includes(q) ||
        p.produsent.toLowerCase().includes(q),
    );
  }, [xlsxProducts, xlsxSearch]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Enkelprodukt-generator</h1>
          <p className="text-gray-400 text-sm">
            Hent ett produkt om gangen — lim inn URL, HTML/body fra leverandør-side,
            last opp PDF (datablad) eller velg fra en masseimport-XLSX. Auto-genererer
            ferdige Multicase-felter med copy-paste-knapper.
          </p>
        </div>

        {/* Modus-veksler */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setMode("url")}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1.5 transition ${
                mode === "url"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              URL
            </button>
            <button
              onClick={() => setMode("html")}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1.5 transition ${
                mode === "html"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              HTML / Body
            </button>
            <button
              onClick={() => setMode("xlsx")}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1.5 transition ${
                mode === "xlsx"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Masseimport-XLSX
            </button>
            <button
              onClick={() => setMode("pdf")}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1.5 transition ${
                mode === "pdf"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <FileUp className="w-3.5 h-3.5" />
              PDF
            </button>
            <button
              onClick={() => setMode("basket")}
              className={`px-3 py-1.5 text-sm rounded flex items-center gap-1.5 transition ${
                mode === "basket"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Hultafors basket
            </button>
          </div>

          {mode === "url" ? (
            <div className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www-de.wera.de/no/produkter/..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !scraping && canSubmit) handleScrape();
                }}
              />
            </div>
          ) : mode === "pdf" ? (
            <div className="space-y-3">
              <div className="text-xs text-gray-400">
                Last opp en PDF (produktdatablad, brosjyre, manual). Vi henter tekst, gjenkjenner
                navn/produsent/spesifikasjoner og bygger ferdige Multicase-felter.
                Scannede PDF-er uten tekst-lag krever OCR først.
              </div>
              <label className="block">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePdfUpload(f);
                  }}
                  className="block w-full text-xs text-gray-400
                    file:mr-3 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-orange-600 file:text-white
                    hover:file:bg-orange-700
                    file:cursor-pointer cursor-pointer"
                />
              </label>
              <input
                type="url"
                value={sourceUrlHint}
                onChange={(e) => setSourceUrlHint(e.target.value)}
                placeholder="Valgfri kilde-URL (lagres som referanse hvis produktet finnes online)"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
              />
            </div>
          ) : mode === "basket" ? (
            <div className="space-y-3">
              <div className="text-xs text-gray-400">
                Last opp en Hultafors basket-XLSX (eksportert fra B2B-portalen).
                Hver rad blir en variant — vi dekoder 11-sifret StockCode til
                modellnr + farge + størrelse. Klikk en variant for å fylle ut
                feltene. Bruk PDF-modus FØR for å hente felles produkt-info
                (BUKSE 6943 KL2 HL CRD), så supplerer basket-fila variantene.
              </div>
              <label className="block">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleBasketUpload(f);
                  }}
                  className="block w-full text-xs text-gray-400
                    file:mr-3 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-orange-600 file:text-white
                    hover:file:bg-orange-700
                    file:cursor-pointer cursor-pointer"
                />
              </label>
              {basketVariants.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded p-3 text-xs text-gray-300 flex items-center justify-between">
                  <span>
                    ✓ <strong>{basketVariants.length}</strong> varianter fra{" "}
                    <code className="text-orange-300">{basketFilename}</code> —{" "}
                    <span className="text-green-400">{basketDone.size} ferdig</span>,{" "}
                    <span className="text-gray-400">{basketVariants.length - basketDone.size} igjen</span>
                  </span>
                  <button
                    onClick={() => {
                      setBasketVariants([]);
                      setBasketFilename("");
                      setBasketDone(new Set());
                      setSelectedBasketIdx(null);
                      setProduct(null);
                    }}
                    className="text-gray-500 hover:text-red-400"
                  >
                    Fjern fil
                  </button>
                </div>
              )}

              {/* PDF-batch — last opp alle PDF-er som dekker basket-modellene */}
              {basketVariants.length > 0 && (
                <div className="pt-3 mt-3 border-t border-gray-800 space-y-2">
                  <div className="text-xs text-gray-300 font-semibold flex items-center gap-1.5">
                    <FileUp className="w-3.5 h-3.5 text-orange-400" />
                    Last opp PDF-er (én eller flere — matches automatisk per modellnr)
                  </div>
                  <label className="block">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      multiple
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleBasketPdfsUpload(e.target.files);
                          // Reset så samme fil kan lastes på nytt
                          e.target.value = "";
                        }
                      }}
                      className="block w-full text-xs text-gray-400
                        file:mr-3 file:py-2 file:px-4
                        file:rounded file:border-0
                        file:text-sm file:font-semibold
                        file:bg-gray-700 file:text-white
                        hover:file:bg-gray-600
                        file:cursor-pointer cursor-pointer"
                    />
                  </label>
                  {basketPdfsLoading && (
                    <div className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Parser PDF-er…
                    </div>
                  )}
                  {basketPdfs.length > 0 && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded p-2 space-y-1 max-h-40 overflow-y-auto">
                      {basketPdfs.map((p, i) => {
                        // Tell hvor mange varianter denne PDF-en matcher
                        const matchCount = basketVariants.filter((v) =>
                          p.model_code === v.model_code ||
                          (p.model_code && p.model_code.startsWith(v.model_code)),
                        ).length;
                        return (
                          <div
                            key={`${p.filename}-${i}`}
                            className="flex items-center justify-between text-[11px] gap-2"
                          >
                            <span className="text-gray-300 truncate flex-1">
                              <code className="text-orange-300">{p.model_code || "(?)"}</code>{" "}
                              {p.type_code && <span className="text-gray-400">{p.type_code} —</span>}{" "}
                              <span className="text-gray-500">{p.filename}</span>
                            </span>
                            <span className={matchCount > 0 ? "text-green-400" : "text-yellow-400"}>
                              {matchCount} match
                            </span>
                            <button
                              onClick={() => setBasketPdfs((prev) => prev.filter((_, j) => j !== i))}
                              className="text-gray-600 hover:text-red-400"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {basketPdfErrors.length > 0 && (
                    <div className="bg-red-950/40 border border-red-900 rounded p-2 text-[11px] text-red-300 space-y-0.5">
                      {basketPdfErrors.map((e, i) => (
                        <div key={i}>
                          <code>{e.filename}</code>: {e.error}
                        </div>
                      ))}
                    </div>
                  )}
                  {basketPdfs.length > 0 && (() => {
                    const unmatchedModels = Array.from(
                      new Set(
                        basketVariants
                          .filter((v) => !findPdfForVariant(v))
                          .map((v) => v.model_code),
                      ),
                    );
                    if (unmatchedModels.length === 0) {
                      return (
                        <div className="text-[11px] text-green-400 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Alle modeller i basket har matchende PDF.
                        </div>
                      );
                    }
                    return (
                      <div className="text-[11px] text-yellow-300">
                        Mangler PDF for modell: {unmatchedModels.join(", ")}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : mode === "xlsx" ? (
            <div className="space-y-3">
              <div className="text-xs text-gray-400">
                Last opp en ferdig produktimport-XLSX (samme format som Multicase masseimport).
                Du får en søkbar produktliste — klikk på et produkt for å fylle ut copy-paste-feltene.
              </div>
              <label className="block">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleXlsxUpload(f);
                  }}
                  className="block w-full text-xs text-gray-400
                    file:mr-3 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-orange-600 file:text-white
                    hover:file:bg-orange-700
                    file:cursor-pointer cursor-pointer"
                />
              </label>
              {xlsxProducts.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded p-3 text-xs text-gray-300 flex items-center justify-between">
                  <span>
                    ✓ <strong>{xlsxProducts.length}</strong> produkter fra{" "}
                    <code className="text-orange-300">{xlsxFilename}</code> —{" "}
                    <span className="text-green-400">{xlsxDone.size} ferdig</span>,{" "}
                    <span className="text-gray-400">{xlsxProducts.length - xlsxDone.size} igjen</span>
                  </span>
                  <button
                    onClick={() => {
                      setXlsxProducts([]);
                      setXlsxFilename("");
                      setXlsxDone(new Set());
                      setSelectedXlsxIdx(null);
                      setProduct(null);
                    }}
                    className="text-gray-500 hover:text-red-400"
                  >
                    Fjern fil
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-gray-400">
                Lim inn HTML-kilden eller body-teksten fra produktsiden (Cmd+U → kopier alt,
                eller høyreklikk på siden → «Vis kildekode»). Brukes når siden krever innlogging
                eller skjuler priser.
              </div>
              <textarea
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder="<html>...&#10;Eller bare body-tekst kopiert fra siden."
                rows={10}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-xs font-mono text-white focus:border-orange-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="url"
                  value={sourceUrlHint}
                  onChange={(e) => setSourceUrlHint(e.target.value)}
                  placeholder="Valgfri kilde-URL (for produsent-deteksjon og bilde-absolutt-URL)"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Felles innstillinger — kun for URL/HTML/PDF-modus (ikke XLSX) */}
          {mode !== "xlsx" && mode !== "basket" && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={scrapeB2BPrices}
                  onChange={(e) => setScrapeB2BPrices(e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                Hent kostpris og listepris
                {mode === "url" && (
                  <span className="text-[10px] text-gray-500 italic">
                    (krever vanligvis HTML-modus, sider med B2B-priser er innloggede)
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                {product && (
                  <button
                    onClick={reset}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded text-sm border border-gray-700"
                  >
                    Nullstill
                  </button>
                )}
                {/* PDF har auto-trigger via file-input — skjul Hent-knappen */}
                {mode !== "pdf" && (
                  <button
                    onClick={handleScrape}
                    disabled={!canSubmit || scraping}
                    className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-5 py-2 rounded text-sm font-semibold flex items-center gap-2"
                  >
                    {scraping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Henter…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Hent og generer
                      </>
                    )}
                  </button>
                )}
                {mode === "pdf" && scraping && (
                  <div className="text-sm text-gray-400 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Parser PDF…
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 bg-red-950/50 border border-red-900 rounded p-3 text-sm text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* PDF varianter — vises når én PDF inneholder flere størrelser/varianter */}
        {mode === "pdf" && pdfVariants.length >= 2 && (
          <div className="bg-gray-900 border border-orange-700/40 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-orange-300 flex items-center gap-2">
                <FileUp className="w-4 h-4" />
                PDF inneholder {pdfVariants.length} varianter — velg størrelsen du vil ha
              </h2>
              <span className="text-xs text-gray-500">{pdfFilename}</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Felles datablad med flere størrelser. Klikk en variant for å berike Multicase-feltene med den spesifikke størrelsens kode/EAN/dimensjoner.
              Beskrivelsen er felles for alle.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              {pdfVariants.map((v, i) => {
                const isSelected = selectedVariantIdx === i;
                return (
                  <button
                    key={`${v.code ?? ""}-${i}`}
                    onClick={() => selectPdfVariant(i)}
                    disabled={scraping}
                    className={`text-left p-2 rounded border text-xs transition ${
                      isSelected
                        ? "border-orange-500 bg-orange-950/40 text-orange-100"
                        : "border-gray-700 bg-gray-800 hover:border-orange-600 hover:bg-gray-750 text-gray-200"
                    } disabled:opacity-50`}
                  >
                    <div className="font-mono text-gray-300 mb-0.5">{v.code || "(ingen kode)"}</div>
                    {v.size && (
                      <div className="text-orange-300 font-semibold">{v.size}</div>
                    )}
                    {v.ean && (
                      <div className="text-[10px] text-gray-500 font-mono">EAN: {v.ean}</div>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedVariantIdx != null && (
              <div className="mt-3 text-xs text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Felter under er fylt for variant {pdfVariants[selectedVariantIdx].code}.
                Klikk en annen variant for å bytte.
              </div>
            )}
          </div>
        )}

        {/* Hultafors basket-varianter */}
        {mode === "basket" && basketVariants.length > 0 && (
          <div className="bg-gray-900 border border-orange-700/40 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-orange-300 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Hultafors-varianter ({basketVariants.length})
              </h2>
              <span className="text-xs text-gray-500">{basketFilename}</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              Klikk en variant — vi fyller leverandørproduktnr + farge + størrelse.
              Du må selv legge inn produkttype foran (BUKSE/JAKKE/HANSKER/...) og
              velge produktgruppe. Bruk PDF-modus FØR for å hente felles produkt-info
              hvis du har Hultafors-datablad.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
              {basketVariants.map((v, i) => {
                const isSelected = selectedBasketIdx === i;
                const isDone = basketDone.has(i);
                const matchedPdf = findPdfForVariant(v);
                return (
                  <button
                    key={`${v.stock_code}-${i}`}
                    onClick={() => selectBasketVariant(i)}
                    disabled={scraping}
                    className={`text-left p-2.5 rounded border text-xs transition ${
                      isSelected
                        ? "border-orange-500 bg-orange-950/40 text-orange-100"
                        : isDone
                          ? "border-green-800 bg-green-950/20 text-gray-400"
                          : "border-gray-700 bg-gray-800 hover:border-orange-600 text-gray-200"
                    } disabled:opacity-50`}
                  >
                    <div className="font-mono text-gray-300 mb-1 flex items-center gap-1">
                      {isDone && <Check className="w-3 h-3 text-green-500" />}
                      {v.stock_code}
                      {matchedPdf && (
                        <span className="ml-auto text-[9px] text-green-400 bg-green-950/40 px-1 rounded">
                          PDF
                        </span>
                      )}
                    </div>
                    <div className="text-orange-300 font-semibold">
                      {matchedPdf?.type_code ? `${matchedPdf.type_code} ` : ""}
                      {v.model_code} · Str {v.size_label}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {v.color_label ?? `Farge ${v.color_code} (ukjent)`}
                    </div>
                    {v.quantity > 1 && (
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Antall i basket: {v.quantity}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedBasketIdx != null && (
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Felter under er fylt for variant {basketVariants[selectedBasketIdx].stock_code}.
                </div>
                <button
                  onClick={() => {
                    if (selectedBasketIdx == null) return;
                    const newDone = new Set(basketDone);
                    newDone.add(selectedBasketIdx);
                    setBasketDone(newDone);
                    // Hopp til neste ikke-ferdige
                    for (let i = selectedBasketIdx + 1; i < basketVariants.length; i++) {
                      if (!newDone.has(i)) { selectBasketVariant(i); return; }
                    }
                    for (let i = 0; i < selectedBasketIdx; i++) {
                      if (!newDone.has(i)) { selectBasketVariant(i); return; }
                    }
                  }}
                  className="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Marker som ferdig + neste
                </button>
              </div>
            )}
          </div>
        )}

        {/* XLSX produktliste — vises når masseimport er lastet */}
        {mode === "xlsx" && xlsxProducts.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Produkter i fila ({filteredXlsxProducts.length} {xlsxSearch && `av ${xlsxProducts.length}`})
              </h2>
              {selectedXlsxIdx != null && (
                <div className="flex gap-2">
                  <button
                    onClick={goToPrev}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded text-xs border border-gray-700"
                  >
                    ← Forrige
                  </button>
                  <button
                    onClick={markCurrentAsDone}
                    className="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Marker ferdig + neste
                  </button>
                  <button
                    onClick={() => goToNext(false)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded text-xs border border-gray-700"
                  >
                    Neste →
                  </button>
                </div>
              )}
            </div>

            <input
              type="text"
              value={xlsxSearch}
              onChange={(e) => setXlsxSearch(e.target.value)}
              placeholder="Søk etter navn, MPN, EAN, produsent…"
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none mb-3"
            />

            <div className="max-h-72 overflow-y-auto border border-gray-800 rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-850 text-gray-400 sticky top-0">
                  <tr>
                    <th className="text-left py-2 px-2 w-8"></th>
                    <th className="text-left py-2 px-2">Beskrivelse 1</th>
                    <th className="text-left py-2 px-2">Lev.prod.nr</th>
                    <th className="text-left py-2 px-2">EAN</th>
                    <th className="text-left py-2 px-2">Produsent</th>
                    <th className="text-left py-2 px-2 w-12">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredXlsxProducts.slice(0, 200).map((p) => {
                    const isSelected = selectedXlsxIdx === p.idx;
                    const isDone = xlsxDone.has(p.idx);
                    return (
                      <tr
                        key={p.idx}
                        onClick={() => selectXlsxProduct(p.idx)}
                        className={`cursor-pointer border-t border-gray-800 transition ${
                          isSelected
                            ? "bg-orange-950/40 text-orange-100"
                            : isDone
                            ? "bg-green-950/20 text-gray-500 hover:bg-gray-800"
                            : "hover:bg-gray-800 text-gray-200"
                        }`}
                      >
                        <td className="py-1.5 px-2">{p.idx + 1}</td>
                        <td className="py-1.5 px-2 truncate max-w-[280px]" title={p.produktbeskrivelse_1}>
                          {p.produktbeskrivelse_1 || <em className="text-gray-600">tom</em>}
                        </td>
                        <td className="py-1.5 px-2 font-mono text-gray-400">
                          {p.leverandor_produktnummer}
                        </td>
                        <td className="py-1.5 px-2 font-mono text-gray-500">{p.ean}</td>
                        <td className="py-1.5 px-2 text-gray-400">{p.produsent}</td>
                        <td className="py-1.5 px-2">
                          {isDone ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : isSelected ? (
                            <Sparkles className="w-4 h-4 text-orange-400" />
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredXlsxProducts.length > 200 && (
                <div className="p-2 text-center text-xs text-gray-500 border-t border-gray-800">
                  Viser første 200 av {filteredXlsxProducts.length} — bruk søk for å filtrere.
                </div>
              )}
            </div>
          </div>
        )}

        {product && (
          <>
            {/* AI-notater */}
            {product.ai_notes && (
              <div className="bg-blue-950/30 border border-blue-900 rounded p-3 text-sm text-blue-200 mb-6 flex items-start gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{product.ai_notes}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* VENSTRE: Multicase-feltene (alle med copy-knapp) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-200">
                      Multicase-felter (klikk «📋» på hvert felt for å kopiere)
                    </h2>
                    <button
                      onClick={handleRegenerate}
                      disabled={scraping}
                      className="text-xs text-gray-400 hover:text-orange-400 flex items-center gap-1"
                      title="Generer beskrivelser på nytt med Gemini"
                    >
                      <RefreshCw className={`w-3 h-3 ${scraping ? "animate-spin" : ""}`} />
                      Regenerer
                    </button>
                  </div>

                  <div className="space-y-3">
                    <CopyInput
                      label="Beskrivelse 1 — PRODUKTNAVN I CAPS (max 40 tegn)"
                      value={product.produktbeskrivelse_1}
                      onChange={(v) => update("produktbeskrivelse_1", v)}
                      maxLength={40}
                      hint="Automatisk UPPERCASE — Multicase-konvensjon."
                    />
                    <CopyInput
                      label='Beskrivelse 2 — «{Leverandørproduktnr} - {Produsent}» (max 40 tegn)'
                      value={product.produktbeskrivelse_2}
                      onChange={(v) => update("produktbeskrivelse_2", v.slice(0, 40))}
                      maxLength={40}
                      hint="Syncer automatisk når du endrer MPN/Produsent — kun blandet store/små bokstaver."
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <CopyInput
                        label="Produsent"
                        value={product.produsent}
                        onChange={(v) => update("produsent", v)}
                      />
                      <CopySelect
                        label="Enhet"
                        value={product.enhet}
                        options={ENHETER}
                        onChange={(v) => update("enhet", v)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <CopySelect
                        label="Gruppenivå 1"
                        value={product.gruppenivaa_1}
                        options={["", ...Object.keys(HIERARKI)]}
                        onChange={(v) => {
                          update("gruppenivaa_1", v);
                          update("gruppenivaa_2", "");
                          update("gruppenivaa_3", "");
                        }}
                      />
                      <CopySelect
                        label="Gruppenivå 2"
                        value={product.gruppenivaa_2}
                        options={["", ...g2Options]}
                        disabled={!product.gruppenivaa_1}
                        onChange={(v) => {
                          update("gruppenivaa_2", v);
                          update("gruppenivaa_3", "");
                        }}
                      />
                      <CopySelect
                        label="Gruppenivå 3"
                        value={product.gruppenivaa_3}
                        options={["", ...g3Options]}
                        disabled={!product.gruppenivaa_2}
                        onChange={(v) => update("gruppenivaa_3", v)}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <CopyInput
                        label="GTIN (EAN)"
                        value={product.ean || ""}
                        onChange={(v) => update("ean", v || null)}
                      />
                      <CopyInput
                        label="Alt. prod.nr / MPN"
                        value={product.mpn || ""}
                        onChange={(v) => update("mpn", v || null)}
                      />
                      <CopyInput
                        label="Opprinnelsesland"
                        value={product.opprinnelsesland || ""}
                        onChange={(v) => update("opprinnelsesland", v)}
                        hint='ISO-koder fra XLSX (CZ, DE …) konverteres til norsk landnavn. "Vet ikke" hvis ikke oppgitt.'
                      />
                    </div>

                    {/* Pris-rad — vises også hvis vi har B2B-priser */}
                    <div className="grid grid-cols-4 gap-3">
                      <CopyInput
                        label={`Pris ${product.currency ? `(${product.currency})` : ""}`}
                        value={product.price_now != null ? String(product.price_now) : ""}
                        onChange={(v) => {
                          const n = parseFloat(v);
                          update("price_now", isNaN(n) ? null : n);
                        }}
                      />
                      <CopyInput
                        label="Før-pris"
                        value={product.price_before != null ? String(product.price_before) : ""}
                        onChange={(v) => {
                          const n = parseFloat(v);
                          update("price_before", isNaN(n) ? null : n);
                        }}
                      />
                      <CopyInput
                        label="Kostpris"
                        value={product.kostpris != null ? String(product.kostpris) : ""}
                        onChange={(v) => {
                          const n = parseFloat(v);
                          update("kostpris", isNaN(n) ? null : n);
                        }}
                        highlight={product.kostpris != null}
                      />
                      <CopyInput
                        label="Listepris"
                        value={product.listepris != null ? String(product.listepris) : ""}
                        onChange={(v) => {
                          const n = parseFloat(v);
                          update("listepris", isNaN(n) ? null : n);
                        }}
                        highlight={product.listepris != null}
                      />
                    </div>

                    {/* Produktinformasjon (HTML — Multicase «Produktinfo, 8000 byte») */}
                    <CopyField
                      label="Produktinformasjon (Multicase «Produktinfo, 8000 byte»)"
                      hint="Rik HTML — h3 + ul + table. Lim inn i Multicase «Endre»-popup-en."
                      value={product.produktinformasjon}
                      onChange={(v) => update("produktinformasjon", v)}
                      rows={12}
                      mono
                      counter
                    />
                    <details className="text-xs text-gray-400 -mt-2">
                      <summary className="cursor-pointer hover:text-orange-400 select-none">
                        Forhåndsvis HTML
                      </summary>
                      <div
                        className="mt-2 bg-white text-gray-900 p-4 rounded prose prose-sm max-w-none [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:ml-5 [&_table]:border-collapse [&_table]:my-2 [&_td]:border [&_td]:border-gray-300 [&_td]:px-2 [&_td]:py-1"
                        dangerouslySetInnerHTML={{ __html: product.produktinformasjon }}
                      />
                    </details>

                    {/* JSON-eksport */}
                    <div className="pt-3 border-t border-gray-800">
                      <CopyButton
                        label="Kopier alt som JSON (for hele produktet)"
                        text={JSON.stringify(product, null, 2)}
                        className="w-full bg-orange-700 hover:bg-orange-600 border-orange-600 text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* HØYRE: Bilder + kildedata */}
              <div className="space-y-4">
                {raw && raw.images.length > 0 && (
                  <FieldGroup title={`Bilder (${raw.images.length})`} icon={<ImageIcon className="w-4 h-4" />}>
                    <div className="grid grid-cols-2 gap-3">
                      {raw.images.map((img, i) => (
                        <div key={img + i} className="bg-gray-800 border border-gray-700 rounded p-2 flex flex-col gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt=""
                            className="w-full h-32 object-contain bg-white rounded"
                            loading="lazy"
                          />
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              onClick={() => downloadImage(img, "jpg")}
                              disabled={downloadingImage === `${img}-jpg`}
                              className="bg-gray-700 hover:bg-orange-700 disabled:bg-gray-800 text-white text-xs px-2 py-1 rounded flex items-center justify-center gap-1"
                            >
                              {downloadingImage === `${img}-jpg` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              JPG
                            </button>
                            <button
                              onClick={() => downloadImage(img, "png")}
                              disabled={downloadingImage === `${img}-png`}
                              className="bg-gray-700 hover:bg-orange-700 disabled:bg-gray-800 text-white text-xs px-2 py-1 rounded flex items-center justify-center gap-1"
                            >
                              {downloadingImage === `${img}-png` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3" />
                              )}
                              PNG
                            </button>
                          </div>
                          <div className="text-[10px] text-gray-500 truncate" title={img}>
                            {img.split("/").pop()}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      WebP/AVIF konverteres automatisk. Max bredde: 2000px, JPG-kvalitet 88%.
                    </p>
                  </FieldGroup>
                )}

                {raw && (
                  <FieldGroup title="Kildedata" icon={<FileText className="w-4 h-4" />}>
                    <div className="text-xs space-y-2">
                      {raw.source_url && <KV k="URL" v={raw.source_url} link />}
                      {raw.domain && <KV k="Domain" v={raw.domain} />}
                      {raw.bullets.length > 0 && (
                        <details>
                          <summary className="cursor-pointer text-gray-400 hover:text-orange-400">
                            {raw.bullets.length} bullets fra siden
                          </summary>
                          <ul className="list-disc ml-4 mt-1 text-gray-300">
                            {raw.bullets.map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                      {raw.specs.length > 0 && (
                        <details>
                          <summary className="cursor-pointer text-gray-400 hover:text-orange-400">
                            {raw.specs.length} tekniske specs
                          </summary>
                          <table className="mt-1 text-[11px] w-full">
                            <tbody>
                              {raw.specs.map((s, i) => (
                                <tr key={i} className="border-b border-gray-800">
                                  <td className="py-0.5 pr-2 text-gray-400 align-top">{s.key}</td>
                                  <td className="py-0.5 text-gray-200">{s.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </details>
                      )}
                    </div>
                  </FieldGroup>
                )}
              </div>
            </div>
          </>
        )}

        {!product && !scraping && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
            <Sparkles className="w-12 h-12 text-orange-500/30 mx-auto mb-3" />
            <p className="text-gray-400 mb-2">Klar til å hente et nytt produkt.</p>
            <p className="text-xs text-gray-500">
              {mode === "url"
                ? "Lim inn URL fra leverandør-side (Wera, KC Tools, Husqvarna m.fl.) eller fosen-tools.no."
                : "Lim inn HTML eller body-tekst kopiert fra produktsiden — fungerer også på innloggede B2B-portaler."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// UI-komponenter
// ──────────────────────────────────────────────────────────────────────

function FieldGroup({
  title,
  children,
  icon,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3">
        {icon}
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/** Tekstfelt med kopi-knapp + redigeringsmodus */
function CopyInput({
  label,
  value,
  onChange,
  highlight,
  maxLength,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  highlight?: boolean;
  maxLength?: number;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await copyToClipboard(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  const len = value.length;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-0.5">
        <span className="text-xs text-gray-400">{label}</span>
        {maxLength && (
          <span className={`text-[10px] ${len > maxLength ? "text-red-400" : "text-gray-500"}`}>
            {len} / {maxLength}
          </span>
        )}
      </div>
      <div className="flex">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 bg-gray-800 border border-gray-700 rounded-l px-2 py-1.5 text-sm text-white focus:border-orange-500 focus:outline-none ${
            highlight ? "border-orange-700/60 bg-orange-950/20" : ""
          }`}
        />
        <button
          onClick={copy}
          className="bg-gray-800 hover:bg-orange-700 border border-l-0 border-gray-700 px-2 rounded-r text-gray-300"
          title="Kopier"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      {hint && <p className="text-[10px] text-gray-500 mt-0.5 italic">{hint}</p>}
    </label>
  );
}

function CopySelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await copyToClipboard(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <label className="block">
      <span className="text-xs text-gray-400 mb-0.5 block">{label}</span>
      <div className="flex">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-l px-2 py-1.5 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-50"
        >
          {options.map((o) => (
            <option key={o} value={o}>
              {o || "—"}
            </option>
          ))}
        </select>
        <button
          onClick={copy}
          disabled={!value}
          className="bg-gray-800 hover:bg-orange-700 border border-l-0 border-gray-700 px-2 rounded-r text-gray-300 disabled:opacity-50"
          title="Kopier"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </label>
  );
}

function CopyField({
  label,
  hint,
  value,
  onChange,
  rows = 4,
  maxLength,
  mono,
  counter,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  maxLength?: number;
  mono?: boolean;
  counter?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await copyToClipboard(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  const showCounter = maxLength || counter;
  const len = value.length;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <div className="flex items-center gap-2">
          {showCounter && (
            <span
              className={`text-[10px] ${
                maxLength && len > maxLength ? "text-red-400" : "text-gray-500"
              }`}
            >
              {len}
              {maxLength ? ` / ${maxLength}` : ""}
            </span>
          )}
          <button
            onClick={copy}
            className="text-[11px] text-gray-400 hover:text-orange-400 flex items-center gap-1 px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-700"
            title="Kopier feltet"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-400" />
                Kopiert
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Kopier
              </>
            )}
          </button>
        </div>
      </div>
      {hint && <p className="text-[10px] text-gray-500 mb-1 italic">{hint}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:border-orange-500 focus:outline-none resize-y ${
          mono ? "font-mono text-xs" : ""
        }`}
      />
    </label>
  );
}

function CopyButton({
  label,
  text,
  className = "",
}: {
  label: string;
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={copy}
      className={`text-sm px-3 py-2 rounded flex items-center justify-center gap-2 border ${className}`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? "Kopiert" : label}
    </button>
  );
}

function KV({ k, v, link }: { k: string; v: string; link?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-500 min-w-[60px]">{k}:</span>
      {link ? (
        <a
          href={v}
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-400 hover:underline break-all"
        >
          {v}
        </a>
      ) : (
        <span className="text-gray-200 break-all">{v}</span>
      )}
    </div>
  );
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}
