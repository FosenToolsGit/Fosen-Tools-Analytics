"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Download, Loader2, Plus, Trash2, Link as LinkIcon, ClipboardPaste, Layers, ChevronDown, Upload, Search, AlertTriangle, PackageX, ListChecks } from "lucide-react";
import hierarki from "@/lib/data/produktgruppe-hierarki.json";
import { detectSB, type SBConfidence } from "@/lib/services/sb-detect";

const HIERARKI = hierarki as Record<string, Record<string, string[]>>;

const MAX_BESKRIVELSE = 40;

function buildBeskrivelse2(mpn: string | null | undefined, manufacturer: string | null | undefined): string {
  const m = (mpn ?? "").trim();
  const p = (manufacturer ?? "").trim();
  if (m && p) return `${m} - ${p}`.slice(0, MAX_BESKRIVELSE);
  if (p) return p.slice(0, MAX_BESKRIVELSE);
  return "";
}

interface SupplierProduct {
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
  hovedleverandor: string;
  opprinnelsesland: string;
  bildeFilnavn: string;
  imageSourceUrl: string;
  webshopUrl: string;
  packingUnit: number | null;
  nettovekt: number | null;
  suggestedG1: string | null;
  suggestedG2: string | null;
  suggestedG3: string | null;
  rawName: string;
  isSB: boolean;
  sbConfidence: SBConfidence;
  sbReason: string;
  /** Produktet finnes allerede i Multicase (matchet mot «MC sortiment»-arket). */
  alleredeInne: boolean;
}

/**
 * Multicase forventer full UNC-sti til bildet i Bilde-mappen. Lokal mappe heter
 * «Multicase» og mountes via RDP som \\tsclient\Multicase\, så det blir den
 * pathen som faktisk havner i XLSX-en. Filen lagres uten --Hero_1-suffiks
 * siden det er Wera/leverandør-konvensjonen.
 */
const MULTICASE_BILDE_PREFIX = "\\\\tsclient\\Multicase\\";

function buildBildeFilnavn(imageUrl: string | null | undefined, mpn: string | null | undefined): string {
  if (!imageUrl) return "";
  let ext = "jpg";
  try {
    const pathname = new URL(imageUrl).pathname;
    const m = pathname.match(/\.([a-z0-9]{2,4})(?:\?|$)/i);
    if (m) ext = m[1].toLowerCase();
  } catch {
    // ignore
  }
  const cleanMpn = (mpn ?? "").trim().replace(/[/\\?%*:|"<>]/g, "");
  if (cleanMpn) return `${MULTICASE_BILDE_PREFIX}${cleanMpn}.${ext}`;
  try {
    const base = new URL(imageUrl).pathname.split("/").pop();
    return base ? `${MULTICASE_BILDE_PREFIX}${base}` : "";
  } catch {
    return "";
  }
}

interface ProductRow {
  id: string;
  name: string;
  ean: string;
  altVarenr: string;
  leverandorProdNr: string;
  produktbeskrivelse2: string;
  variantverdi1: string;
  kostpris: string;
  listePris1: string;
  kolli: string;
  antallIKjopsforp: string;
  nettovekt: string;
  bildeFilnavn: string;
  /** Web-URL til bildet vi vil laste ned til ZIP (tom = ingen nedlasting) */
  imageSourceUrl: string;
  produktinformasjon: string;
  sourceUrl: string;
  scraping: boolean;
  /** Per-produkt produktgrupper (overstyrer defaults) */
  produktgruppe1: string;
  produktgruppe2: string;
  produktgruppe3: string;
  /** Ufiltrert leverandør-navn (før kompaktering) — bevart for SB-deteksjon. */
  rawName: string;
  /** Per-produkt opprinnelsesland (overstyrer defaults.opprinnelsesland). */
  opprinnelsesland: string;
  /** Operatør har manuelt avvist SB-flagget — produktet regnes ikke som SB. */
  sbCleared: boolean;
}

interface VariantGroup {
  id: string;
  hasVariants: boolean;
  parentName: string;
  variant1: string; // "Farge", "Størrelse"
  products: ProductRow[];
}

interface Defaults {
  avsender: string;
  produktgruppe1: string;
  produktgruppe2: string;
  produktgruppe3: string;
  hovedansvarlig1: string;
  enhet: string;
  hovedleverandor: string;
  leveringstid: string;
  kostvaluta: string;
  frakt: string;
  toll: string;
  produsent: string;
  opprinnelsesland: string;
  registrertAv: string;
}

/**
 * Kvalitets-score for produktrad — produkter med høyere score «trenger mer arbeid»
 * (mangler kritiske felter) og bobles opp i lista.
 */
function productRowQualityScore(
  p: ProductRow,
  defaults: { produktgruppe1: string; produktgruppe2: string; produktgruppe3: string }
): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 0;
  const g1 = p.produktgruppe1 || defaults.produktgruppe1;
  const g2 = p.produktgruppe2 || defaults.produktgruppe2;
  const g3 = p.produktgruppe3 || defaults.produktgruppe3;
  if (!g1) { score += 100; issues.push("mangler G1"); }
  else if (!g2) { score += 50; issues.push("mangler G2"); }
  else if (!g3) { score += 30; issues.push("mangler G3"); }
  if (!p.name.trim()) { score += 80; issues.push("mangler navn"); }
  else if (p.name.length > 40) { score += 20; issues.push("navn >40 tegn"); }
  if (!p.ean.trim()) { score += 15; issues.push("mangler EAN"); }
  if (!p.kostpris.trim()) { score += 25; issues.push("mangler kostpris"); }
  if (!p.bildeFilnavn.trim()) { score += 40; issues.push("mangler bilde"); }
  if (!p.produktinformasjon || p.produktinformasjon.length < 50) {
    score += 30;
    issues.push("tynn produktinfo");
  }
  return { score, issues };
}

function newRow(): ProductRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    ean: "",
    altVarenr: "",
    leverandorProdNr: "",
    produktbeskrivelse2: "",
    variantverdi1: "",
    kostpris: "",
    listePris1: "",
    kolli: "",
    antallIKjopsforp: "",
    nettovekt: "",
    bildeFilnavn: "",
    imageSourceUrl: "",
    produktinformasjon: "",
    sourceUrl: "",
    scraping: false,
    produktgruppe1: "",
    produktgruppe2: "",
    produktgruppe3: "",
    rawName: "",
    opprinnelsesland: "",
    sbCleared: false,
  };
}

/** SB-deteksjon for en produktrad — kjøres på rå + redigerte felter. */
function rowSB(p: ProductRow) {
  return detectSB({
    rawName: p.rawName,
    name: p.name,
    url: p.sourceUrl,
    marketing: p.produktinformasjon,
  });
}

function newGroup(): VariantGroup {
  return {
    id: crypto.randomUUID(),
    hasVariants: false,
    parentName: "",
    variant1: "Farge",
    products: [newRow()],
  };
}

export default function ProduktImportPage() {
  const [defaults, setDefaults] = useState<Defaults>({
    avsender: "Fosen Tools AS",
    produktgruppe1: "",
    produktgruppe2: "",
    produktgruppe3: "",
    hovedansvarlig1: "AHP",
    enhet: "Stk",
    hovedleverandor: "",
    leveringstid: "7",
    kostvaluta: "NOK",
    frakt: "",
    toll: "",
    produsent: "",
    opprinnelsesland: "",
    registrertAv: "",
  });
  const [groups, setGroups] = useState<VariantGroup[]>([newGroup()]);
  const [generating, setGenerating] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);

  // Leverandør-prisliste-import
  const [supplierPreset, setSupplierPreset] = useState<"wera">("wera");
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [supplierSelected, setSupplierSelected] = useState<Set<number>>(new Set());
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierStatus, setSupplierStatus] = useState<{ kind: "error" | "success" | "info"; msg: string } | null>(null);
  const supplierFileInputRef = useRef<HTMLInputElement>(null);
  const [hideSB, setHideSB] = useState(true);
  const [hideInne, setHideInne] = useState(true);

  // EK1 produktdata-opplasting (Wera media-eksport)
  const [ek1Loading, setEk1Loading] = useState(false);
  const ek1FileInputRef = useRef<HTMLInputElement>(null);

  // Last opp tidligere generert XLSX (gjenoppta arbeid)
  const [resumeLoading, setResumeLoading] = useState(false);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);

  // Wera-bilde-ZIP-upload — bilder lastet ned fra https://www.wera.de/no/service-hjelp/produktdata-/medieeksport
  // Bilder matches mot produkter via leverandør-produktnummer som finnes i filnavnet.
  const [weraImages, setWeraImages] = useState<Map<string, { filename: string; base64: string }>>(new Map());
  const [weraZipLoading, setWeraZipLoading] = useState(false);
  const weraZipInputRef = useRef<HTMLInputElement>(null);

  // Wera deep-scrape state
  const [deepScrapeLoading, setDeepScrapeLoading] = useState(false);
  const [deepScrapeProgress, setDeepScrapeProgress] = useState<{ done: number; total: number } | null>(null);
  const [reclassifyLoading, setReclassifyLoading] = useState(false);
  const [sortNeedsWork, setSortNeedsWork] = useState(true);
  // SB-oppryddingsfase
  const [sbPanelOpen, setSbPanelOpen] = useState(false);
  // Produkt som er «hoppet til» fra et panel — markeres kort med ring
  const [highlightProdId, setHighlightProdId] = useState<string | null>(null);

  function updateDefault(field: keyof Defaults, v: string) {
    setDefaults((d) => ({ ...d, [field]: v }));
  }

  function updateGroup(gid: string, patch: Partial<VariantGroup>) {
    setGroups((gs) => gs.map((g) => (g.id === gid ? { ...g, ...patch } : g)));
  }

  function updateProduct(gid: string, pid: string, patch: Partial<ProductRow>) {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === gid
          ? { ...g, products: g.products.map((p) => (p.id === pid ? { ...p, ...patch } : p)) }
          : g
      )
    );
  }

  function addProductToGroup(gid: string) {
    setGroups((gs) =>
      gs.map((g) => (g.id === gid ? { ...g, products: [...g.products, newRow()] } : g))
    );
  }

  function removeProduct(gid: string, pid: string) {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === gid ? { ...g, products: g.products.filter((p) => p.id !== pid) } : g
      )
    );
  }

  /** Scroller til en produktrad i editoren og markerer den kort. */
  function goToProduct(id: string) {
    setHighlightProdId(id);
    requestAnimationFrame(() => {
      document.getElementById(`ftprod-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    window.setTimeout(() => setHighlightProdId((cur) => (cur === id ? null : cur)), 2600);
  }

  /** Fjerner flere produkter på tvers av grupper (brukes av SB-oppryddingen). */
  function removeProducts(ids: Set<string>) {
    if (ids.size === 0) return;
    setGroups((gs) => {
      const next = gs
        .map((g) => ({ ...g, products: g.products.filter((p) => !ids.has(p.id)) }))
        .filter((g) => g.products.length > 0);
      return next.length > 0 ? next : [newGroup()];
    });
  }

  function addGroup() {
    setGroups((gs) => [...gs, newGroup()]);
  }

  function removeGroup(gid: string) {
    setGroups((gs) => gs.filter((g) => g.id !== gid));
  }

  async function scrapeUrl(gid: string, pid: string, url: string) {
    if (!url.trim()) return;
    updateProduct(gid, pid, { scraping: true });
    try {
      const res = await fetch("/api/produkt-import/scrape-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Feil ved henting: ${err.error ?? res.status}`);
        updateProduct(gid, pid, { scraping: false });
        return;
      }
      const data = await res.json();
      updateProduct(gid, pid, {
        scraping: false,
        name: (data.name || "").toUpperCase().slice(0, 40),
        ean: data.ean || "",
        leverandorProdNr: data.mpn || "",
        kostpris: data.price_now ? String(data.price_now) : "",
        listePris1: data.price_before ? String(data.price_before) : (data.price_now ? String(data.price_now) : ""),
        // «(leverandør produktnummer) - (produsent)» — Fosen Tools-konvensjon
        produktbeskrivelse2: buildBeskrivelse2(data.mpn, data.manufacturer),
        produktinformasjon: data.bullets?.length ? data.bullets.map((b: string) => `• ${b}`).join("\n") : data.description || "",
        // Multicase-konvensjon: «{lev-prodnr}--Hero_1.{ext}» hvis MPN finnes, ellers utleds fra URL
        bildeFilnavn: buildBildeFilnavn(data.image_url, data.mpn),
        imageSourceUrl: data.image_url || "",
        produktgruppe1: data.suggestedG1 ?? "",
        produktgruppe2: data.suggestedG2 ?? "",
        produktgruppe3: data.suggestedG3 ?? "",
      });
    } catch (err) {
      alert(`Feil: ${err instanceof Error ? err.message : "ukjent"}`);
      updateProduct(gid, pid, { scraping: false });
    }
  }

  /**
   * Lim inn TSV/CSV fra regneark — parser kolonner i rekkefølge:
   * Navn[TAB]EAN[TAB]LevProdNr[TAB]Variantverdi[TAB]Kostpris[TAB]Listepris[TAB]Kolli
   * Bruker tab, semikolon eller minst 2 mellomrom som separator.
   */
  function importPaste() {
    const lines = pasteText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;

    const newRows = lines.map((line) => {
      const cells = line.split(/\t|;|  +/).map((c) => c.trim());
      const row = newRow();
      row.name = cells[0] ?? "";
      row.ean = cells[1] ?? "";
      row.leverandorProdNr = cells[2] ?? "";
      row.variantverdi1 = cells[3] ?? "";
      row.kostpris = (cells[4] ?? "").replace(",", ".").replace(/\s/g, "");
      row.listePris1 = (cells[5] ?? "").replace(",", ".").replace(/\s/g, "");
      row.kolli = cells[6] ?? "";
      return row;
    });

    // Erstatter siste gruppen sine produkter med de innlimte
    setGroups((gs) => {
      if (gs.length === 0) return [{ ...newGroup(), products: newRows }];
      const last = gs[gs.length - 1];
      const updated = { ...last, products: newRows };
      return [...gs.slice(0, -1), updated];
    });
    setPasteText("");
    setPasteOpen(false);
  }

  /**
   * Deep-scrape Wera-produktsidene for alle produkter i alle grupper.
   * Henter drev, profil, bilde-URL via Playwright (cached i Supabase).
   * Beriker hver produkt-rad med scraped data.
   */
  /**
   * Hent allerede cached Wera-data uten å starte ny Playwright-scraping.
   * Bruker når deep-scrape feilet midt-batch, eller når du bare vil bruke
   * data som alt finnes i Supabase-cachen.
   */
  /**
   * Last opp en tidligere generert produktimport-XLSX og gjenoppta arbeidet.
   * Parser samme format som vi eksporterer (54 Multicase-kolonner), rekonstruerer
   * ProductRow[] og legger inn i en ny gruppe.
   */
  async function handleResumeXlsx(file: File) {
    setResumeLoading(true);
    setSupplierStatus({ kind: "info", msg: `Leser ${file.name}...` });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/produkt-import/parse-multicase-export", { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSupplierStatus({ kind: "error", msg: `Feil: ${err.error ?? res.status}` });
        return;
      }
      const data = await res.json() as { count: number; rows: Array<Record<string, unknown>> };

      // Map Multicase-kolonner tilbake til ProductRow-struktur
      const newRows: ProductRow[] = data.rows
        .filter((row) => row["Produktbeskrivelse 1"])
        .map((row) => {
          const r = newRow();
          const str = (k: string) => String(row[k] ?? "").trim();
          const num = (k: string) => {
            const v = row[k];
            if (v == null || v === "") return "";
            return String(v);
          };
          r.name = str("Produktbeskrivelse 1");
          r.ean = str("EANnr");
          r.altVarenr = str("AltVarenr");
          r.leverandorProdNr = str("Leverandør produktnummer");
          r.produktbeskrivelse2 = str("Produktbeskrivelse 2");
          r.kostpris = num("Hovedleverandør kostpris  ");
          r.listePris1 = num("ListePris1");
          r.kolli = num("Antall kolli");
          r.antallIKjopsforp = num("Antall enheter i kjøpsforpakning");
          r.nettovekt = num("Nettovekt");
          r.bildeFilnavn = str("BildeFilnavn");
          r.produktinformasjon = str("Produktinformasjon");
          r.produktgruppe1 = str("Produktgruppe 1");
          r.produktgruppe2 = str("Produktgruppe 2");
          r.produktgruppe3 = str("Produktgruppe 3");
          r.variantverdi1 = str("Variantverdi1");
          r.opprinnelsesland = str("Opprinnelsesland");
          return r;
        });

      if (newRows.length === 0) {
        setSupplierStatus({ kind: "error", msg: "Ingen produkt-rader funnet i fila" });
        return;
      }

      // Hent defaults fra første rad — Avsender, Produsent, Hovedleverandør, Kostvaluta osv.
      const firstRow = data.rows.find((r) => r["Avsender"]) ?? data.rows[0];
      if (firstRow) {
        setDefaults((d) => ({
          ...d,
          avsender: String(firstRow["Avsender"] ?? d.avsender),
          hovedansvarlig1: String(firstRow["Hovedansvarlig 1"] ?? d.hovedansvarlig1),
          enhet: String(firstRow["Enhet"] ?? d.enhet),
          hovedleverandor: String(firstRow["Hovedleverandør"] ?? d.hovedleverandor),
          leveringstid: String(firstRow["Leveringstid"] ?? d.leveringstid),
          kostvaluta: String(firstRow["Kostvaluta"] ?? d.kostvaluta),
          frakt: firstRow["Frakt%"] != null ? String(firstRow["Frakt%"]) : d.frakt,
          toll: firstRow["Toll%"] != null ? String(firstRow["Toll%"]) : d.toll,
          produsent: String(firstRow["Produsent"] ?? d.produsent),
          opprinnelsesland: String(firstRow["Opprinnelsesland"] ?? d.opprinnelsesland),
          registrertAv: String(firstRow["Registrert av"] ?? d.registrertAv),
        }));
      }

      // Lag ny gruppe med alle radene
      setGroups((gs) => [
        ...gs,
        { id: crypto.randomUUID(), hasVariants: false, parentName: "", variant1: "Farge", products: newRows },
      ]);

      const missing = newRows.filter((r) => !r.produktgruppe1).length;
      setSupplierStatus({
        kind: "success",
        msg: `Lastet ${newRows.length} produkter fra XLSX${missing > 0 ? ` (${missing} mangler produktgruppe — bruk «Bruk cached Wera-data» eller redigér manuelt)` : ""}`,
      });
    } catch (err) {
      setSupplierStatus({ kind: "error", msg: `Network-feil: ${err instanceof Error ? err.message : "ukjent"}` });
    } finally {
      setResumeLoading(false);
    }
  }

  async function handleUseCachedOnly() {
    const allRows = groups.flatMap((g) => g.products).filter((p) => p.leverandorProdNr.trim());
    if (allRows.length === 0) {
      setSupplierStatus({ kind: "info", msg: "Ingen produkter — importer fra Wera-prisliste først" });
      return;
    }
    const codes = Array.from(new Set(allRows.map((p) => p.leverandorProdNr)));
    setDeepScrapeLoading(true);
    setSupplierStatus({ kind: "info", msg: `Henter cached data for ${codes.length} produkter...` });
    try {
      const res = await fetch("/api/produkt-import/wera-deep-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes, cacheOnly: true }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSupplierStatus({ kind: "error", msg: `Feil: ${err.error ?? res.status}` });
        return;
      }
      const data = await res.json() as {
        cache_hits: number;
        results: Array<{
          code: string;
          source: "cache" | "live" | "failed";
          data: {
            imageUrl: string | null;
            suggestedG1: string | null;
            suggestedG2: string | null;
            suggestedG3: string | null;
            produktinformasjonHtml: string | null;
          } | null;
        }>;
      };

      const byCode = new Map<string, NonNullable<typeof data.results[number]["data"]>>();
      for (const r of data.results) {
        if (r.data) byCode.set(r.code, r.data);
      }

      let enrichedCount = 0;
      setGroups((gs) => gs.map((g) => ({
        ...g,
        products: g.products.map((p) => {
          const cached = byCode.get(p.leverandorProdNr);
          if (!cached) return p;
          enrichedCount++;
          return {
            ...p,
            produktgruppe1: p.produktgruppe1 || cached.suggestedG1 || p.produktgruppe1,
            produktgruppe2: p.produktgruppe2 || cached.suggestedG2 || p.produktgruppe2,
            produktgruppe3: p.produktgruppe3 || cached.suggestedG3 || p.produktgruppe3,
            imageSourceUrl: cached.imageUrl || p.imageSourceUrl,
            produktinformasjon: p.produktinformasjon.trim()
              ? p.produktinformasjon
              : cached.produktinformasjonHtml || p.produktinformasjon,
          };
        }),
      })));

      const notInCache = codes.length - data.cache_hits;
      setSupplierStatus({
        kind: notInCache > 0 ? "info" : "success",
        msg: `Hentet fra cache: ${data.cache_hits} av ${codes.length} produkter (${notInCache} ikke i cache, må deep-scrapes separat).`,
      });
    } catch (err) {
      setSupplierStatus({ kind: "error", msg: `Network-feil: ${err instanceof Error ? err.message : "ukjent"}` });
    } finally {
      setDeepScrapeLoading(false);
    }
  }

  async function handleWeraDeepScrape() {
    const allRows = groups.flatMap((g) => g.products).filter((p) => p.leverandorProdNr.trim());
    if (allRows.length === 0) {
      setSupplierStatus({ kind: "info", msg: "Ingen produkter å scrape — importer fra Wera-prisliste først" });
      return;
    }
    const codes = Array.from(new Set(allRows.map((p) => p.leverandorProdNr)));
    setDeepScrapeLoading(true);
    setDeepScrapeProgress({ done: 0, total: codes.length });
    setSupplierStatus({ kind: "info", msg: `Starter deep-scrape av ${codes.length} produkter (kan ta 5-15 min for store batcher)...` });
    try {
      const res = await fetch("/api/produkt-import/wera-deep-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSupplierStatus({ kind: "error", msg: `Deep-scrape feilet: ${err.error ?? res.status}` });
        return;
      }
      const data = await res.json() as {
        total: number;
        cache_hits: number;
        scraped: number;
        failed: number;
        results: Array<{
          code: string;
          source: "cache" | "live" | "failed";
          data: {
            name: string | null;
            driveType: string | null;
            profile: string | null;
            sizeMm: string | null;
            lengthMm: number | null;
            imageUrl: string | null;
            isVde: boolean;
            suggestedG1: string | null;
            suggestedG2: string | null;
            suggestedG3: string | null;
            produktinformasjonHtml: string | null;
          } | null;
        }>;
      };

      // Bygg lookup-map kode → scrape-data
      const byCode = new Map<string, NonNullable<typeof data.results[number]["data"]>>();
      for (const r of data.results) {
        if (r.data) byCode.set(r.code, r.data);
      }

      // Beriker produktradene
      setGroups((gs) => gs.map((g) => ({
        ...g,
        products: g.products.map((p) => {
          const scraped = byCode.get(p.leverandorProdNr);
          if (!scraped) return p;
          return {
            ...p,
            // Bare overstyr produktgrupper hvis de er tomme (operatør kan ha satt manuelt)
            produktgruppe1: p.produktgruppe1 || scraped.suggestedG1 || p.produktgruppe1,
            produktgruppe2: p.produktgruppe2 || scraped.suggestedG2 || p.produktgruppe2,
            produktgruppe3: p.produktgruppe3 || scraped.suggestedG3 || p.produktgruppe3,
            // Backfill rånavn fra Wera-siden (ender på « SB» for SB-varer) så
            // SB-oppryddingsfasen fanger produkter importert uten prisliste
            rawName: p.rawName || scraped.name || p.rawName,
            imageSourceUrl: scraped.imageUrl || p.imageSourceUrl,
            // SEO-HTML overstyrer kun hvis produktinfo er tom (operatør kan ha redigert)
            produktinformasjon: p.produktinformasjon.trim()
              ? p.produktinformasjon
              : scraped.produktinformasjonHtml || p.produktinformasjon,
          };
        }),
      })));

      const enriched = data.results.filter((r) => r.data && (r.data.suggestedG1 || r.data.imageUrl)).length;
      setSupplierStatus({
        kind: "success",
        msg: `Deep-scrape ferdig: ${data.cache_hits} fra cache, ${data.scraped} ny-scrapet, ${data.failed} feilet. ${enriched} produkter ble beriket.`,
      });
    } catch (err) {
      setSupplierStatus({ kind: "error", msg: `Network-feil under deep-scrape: ${err instanceof Error ? err.message : "ukjent"}` });
    } finally {
      setDeepScrapeLoading(false);
      setDeepScrapeProgress(null);
    }
  }

  /**
   * Re-klassifiserer alle (eller valgte) cachede Wera-produkter med nyeste
   * klassifiserings-regler — uten Playwright. Sekunder, ikke timer.
   */
  async function handleWeraReclassifyCache() {
    setReclassifyLoading(true);
    setSupplierStatus({ kind: "info", msg: "Re-klassifiserer alle cachede Wera-produkter..." });
    try {
      const res = await fetch("/api/produkt-import/wera-reclassify-cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSupplierStatus({ kind: "error", msg: `Re-klassifisering feilet: ${err.error ?? res.status}` });
        return;
      }
      const data = await res.json();
      setSupplierStatus({
        kind: "success",
        msg: `Re-klassifisert ${data.updated} cachede produkter. HTML regenerert: ${data.html_generated}. Kjør deep-scrape igjen (eller re-importer prislisten) for å plukke opp endringene på produktradene.`,
      });
    } catch (err) {
      setSupplierStatus({ kind: "error", msg: `Network-feil: ${err instanceof Error ? err.message : "ukjent"}` });
    } finally {
      setReclassifyLoading(false);
    }
  }

  /**
   * Deep-scrape EN enkelt produktrad — for raske enkelt-import-flyter eller
   * når du vil teste/oppdatere ett spesifikt produkt uten å vente på hele batch.
   */
  async function scrapeWeraSingleProduct(gid: string, pid: string) {
    const row = groups.find((g) => g.id === gid)?.products.find((p) => p.id === pid);
    if (!row) return;
    const code = row.leverandorProdNr.trim();
    if (!code) {
      alert("Mangler leverandør-produktnummer");
      return;
    }
    updateProduct(gid, pid, { scraping: true });
    try {
      const res = await fetch("/api/produkt-import/wera-deep-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: [code] }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Feil: ${err.error ?? res.status}`);
        return;
      }
      const data = await res.json() as {
        results: Array<{
          code: string;
          source: "cache" | "live" | "failed";
          data: {
            name: string | null;
            imageUrl: string | null;
            suggestedG1: string | null;
            suggestedG2: string | null;
            suggestedG3: string | null;
            produktinformasjonHtml: string | null;
          } | null;
        }>;
      };
      const result = data.results[0];
      if (!result?.data) {
        alert(`Fant ikke produkt ${code} på wera.de`);
        return;
      }
      const d = result.data;
      updateProduct(gid, pid, {
        produktgruppe1: row.produktgruppe1 || d.suggestedG1 || "",
        produktgruppe2: row.produktgruppe2 || d.suggestedG2 || "",
        produktgruppe3: row.produktgruppe3 || d.suggestedG3 || "",
        imageSourceUrl: d.imageUrl || row.imageSourceUrl,
        produktinformasjon: row.produktinformasjon.trim()
          ? row.produktinformasjon
          : d.produktinformasjonHtml || row.produktinformasjon,
      });
    } catch (err) {
      alert(`Network-feil: ${err instanceof Error ? err.message : "ukjent"}`);
    } finally {
      updateProduct(gid, pid, { scraping: false });
    }
  }

  async function handleWeraMediaZip(file: File) {
    setWeraZipLoading(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(file);
      const next = new Map<string, { filename: string; base64: string }>();
      // Wera-koder er 11 sifre. Trekker ut første 11-sifrede tall fra filnavnet (uten path-segment).
      const PRODUCT_CODE_RE = /(\d{11})/;
      const entries = Object.values(zip.files).filter((e) => !e.dir);
      let imageEntries = 0;
      for (const entry of entries) {
        const base = entry.name.split("/").pop() ?? entry.name;
        if (!/\.(jpe?g|png|webp)$/i.test(base)) continue;
        imageEntries++;
        const codeMatch = base.match(PRODUCT_CODE_RE);
        if (!codeMatch) continue;
        const code = codeMatch[1];
        // Behold første treff per kode (typisk Hero_1.jpg er primær)
        if (next.has(code)) continue;
        const buf = await entry.async("base64");
        next.set(code, { filename: base, base64: buf });
      }
      setWeraImages(next);
      const matched = Array.from(next.keys()).filter((code) =>
        groups.some((g) => g.products.some((p) => p.leverandorProdNr === code))
      ).length;
      setSupplierStatus({
        kind: "success",
        msg: `Lastet ${next.size} unike bilder fra Wera-ZIP (${imageEntries} bildefiler totalt). ${matched} matcher dine importerte produkter.`,
      });
    } catch (err) {
      setSupplierStatus({
        kind: "error",
        msg: `Feil ved opplasting av ZIP: ${err instanceof Error ? err.message : "ukjent"}`,
      });
    } finally {
      setWeraZipLoading(false);
    }
  }

  async function handleSupplierFile(file: File) {
    setSupplierLoading(true);
    setSupplierProducts([]);
    setSupplierSelected(new Set());
    setSupplierSearch("");
    setSupplierStatus({ kind: "info", msg: `Leser «${file.name}» (${(file.size / 1024).toFixed(0)} kB)...` });
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("preset", supplierPreset);
      const res = await fetch("/api/produkt-import/parse-supplier-list", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const detail = err.error ?? `HTTP ${res.status}${res.status === 401 ? " — du er logget ut. Refresh siden." : ""}`;
        setSupplierStatus({ kind: "error", msg: `Feil ved opplasting: ${detail}` });
        return;
      }
      const data = await res.json();
      setSupplierProducts(data.products as SupplierProduct[]);
      setSupplierOpen(true);
      const inne = data.alleredeInneCount ?? 0;
      const mc = data.mcSortimentCount ?? 0;
      const inneMsg = mc > 0
        ? ` «MC sortiment»-arket har ${mc} produkter — ${inne} av prislisten er allerede inne (skjult).`
        : "";
      setSupplierStatus({
        kind: "success",
        msg: `Leste ${data.count} produkter fra ${supplierPreset.toUpperCase()}-prisliste.${inneMsg}`,
      });
    } catch (err) {
      setSupplierStatus({ kind: "error", msg: `Network-feil: ${err instanceof Error ? err.message : "ukjent"}` });
    } finally {
      setSupplierLoading(false);
    }
  }

  /**
   * Beriker importerte produktrader med Wera EK1-produktdata (media-eksport).
   * Matches på leverandør-produktnummer ↔ EK1 `product_id`.
   */
  async function handleEk1File(file: File) {
    setEk1Loading(true);
    setSupplierStatus({ kind: "info", msg: `Leser EK1-produktdata «${file.name}»...` });
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/produkt-import/parse-ek1", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSupplierStatus({ kind: "error", msg: `EK1-feil: ${err.error ?? `HTTP ${res.status}`}` });
        return;
      }
      const data = (await res.json()) as {
        count: number;
        items: Array<{
          code: string;
          ean: string;
          compactedName: string;
          produktinformasjonHtml: string;
          opprinnelsesland: string;
          bildeFilnavn: string;
          suggestedG1: string | null;
          suggestedG2: string | null;
          suggestedG3: string | null;
        }>;
      };
      const norm = (c: string) => {
        let s = c.trim();
        if (/^\d+$/.test(s) && s.length < 11) s = s.padStart(11, "0");
        return s;
      };
      const byCode = new Map<string, (typeof data.items)[number]>();
      for (const it of data.items) byCode.set(norm(it.code), it);

      // Tell treff på gjeldende produktrader
      let merged = 0;
      for (const g of groups) {
        for (const p of g.products) {
          if (byCode.has(norm(p.leverandorProdNr))) merged++;
        }
      }

      setGroups((gs) =>
        gs.map((g) => ({
          ...g,
          products: g.products.map((p) => {
            const it = byCode.get(norm(p.leverandorProdNr));
            if (!it) return p;
            const hasGrupper = Boolean(p.produktgruppe1 || p.produktgruppe2 || p.produktgruppe3);
            return {
              ...p,
              // EK1s offisielle navn er autoritativt — kompakteres til Produktbeskrivelse 1
              name: it.compactedName || p.name,
              // EK1s rike HTML-beskrivelse er autoritativ — overstyrer marketing-teksten
              produktinformasjon: it.produktinformasjonHtml || p.produktinformasjon,
              opprinnelsesland: it.opprinnelsesland || p.opprinnelsesland,
              bildeFilnavn: it.bildeFilnavn || p.bildeFilnavn,
              ean: p.ean || it.ean,
              // Fyll produktgrupper kun hvis de er tomme (ikke overstyr operatør)
              produktgruppe1: hasGrupper ? p.produktgruppe1 : it.suggestedG1 ?? p.produktgruppe1,
              produktgruppe2: hasGrupper ? p.produktgruppe2 : it.suggestedG2 ?? p.produktgruppe2,
              produktgruppe3: hasGrupper ? p.produktgruppe3 : it.suggestedG3 ?? p.produktgruppe3,
            };
          }),
        }))
      );

      setSupplierStatus({
        kind: merged > 0 ? "success" : "info",
        msg: `EK1: ${data.count} produkter i fila — ${merged} matchet og beriket (navn, HTML-beskrivelse, opprinnelsesland, bilde).${
          merged === 0 ? " Importer produkter fra prislisten først." : ""
        }`,
      });
    } catch (err) {
      setSupplierStatus({ kind: "error", msg: `Network-feil: ${err instanceof Error ? err.message : "ukjent"}` });
    } finally {
      setEk1Loading(false);
    }
  }

  function addSelectedSupplierProducts() {
    const selectedProducts = supplierProducts.filter((p) => supplierSelected.has(p.idx));
    if (selectedProducts.length === 0) {
      alert("Velg minst ett produkt først");
      return;
    }
    const newRows: ProductRow[] = selectedProducts.map((sp) => {
      const r = newRow();
      r.name = sp.name.toUpperCase().slice(0, 40);
      r.ean = sp.ean;
      r.leverandorProdNr = sp.leverandorProdNr;
      r.produktbeskrivelse2 = buildBeskrivelse2(sp.leverandorProdNr, sp.produsent);
      r.produktinformasjon = sp.produktinformasjon;
      r.kostpris = sp.kostpris != null ? String(sp.kostpris) : "";
      r.listePris1 = sp.listePris != null ? String(sp.listePris) : "";
      r.kolli = sp.packingUnit != null ? String(sp.packingUnit) : "";
      r.nettovekt = sp.nettovekt != null ? String(sp.nettovekt) : "";
      r.bildeFilnavn = sp.bildeFilnavn;
      r.sourceUrl = sp.webshopUrl;
      // Per-produkt produktgrupper fra klassifiseren
      r.produktgruppe1 = sp.suggestedG1 ?? "";
      r.produktgruppe2 = sp.suggestedG2 ?? "";
      r.produktgruppe3 = sp.suggestedG3 ?? "";
      // Bevar rånavnet så SB-oppryddingsfasen kan dobbeltsjekke senere
      r.rawName = sp.rawName;
      // Per-produkt opprinnelsesland fra prislisten
      r.opprinnelsesland = sp.opprinnelsesland;
      return r;
    });

    // Sett bare leverandør-relaterte defaults (ikke produktgrupper — per produkt nå)
    const firstProd = selectedProducts[0];
    setDefaults((d) => ({
      ...d,
      produsent: d.produsent || firstProd.produsent,
      hovedleverandor: d.hovedleverandor || firstProd.hovedleverandor,
      kostvaluta: d.kostvaluta && d.kostvaluta !== "NOK" ? d.kostvaluta : firstProd.kostvaluta,
      opprinnelsesland: d.opprinnelsesland || firstProd.opprinnelsesland,
    }));

    const classified = newRows.filter((r) => r.produktgruppe1).length;
    const unknown = newRows.length - classified;
    if (unknown > 0) {
      setSupplierStatus({ kind: "info", msg: `Lagt til ${newRows.length} produkter. ${classified} fikk auto-klassifisert produktgruppe; ${unknown} må settes manuelt.` });
    } else {
      setSupplierStatus({ kind: "success", msg: `Lagt til ${newRows.length} produkter — alle har auto-klassifisert produktgruppe.` });
    }

    // Lag ny gruppe med valgte produkter
    setGroups((gs) => [...gs, { id: crypto.randomUUID(), hasVariants: false, parentName: "", variant1: "Farge", products: newRows }]);

    // Lukk panelet
    setSupplierOpen(false);
    setSupplierProducts([]);
    setSupplierSelected(new Set());
    setSupplierSearch("");
  }

  async function generateXlsx() { await generate("xlsx"); }
  async function generateZip() { await generate("zip"); }

  async function generate(target: "xlsx" | "zip") {
    // Sjekk at hvert produkt har produktgrupper (per-produkt eller fallback til defaults)
    const allProducts = groups.flatMap((g) => g.products).filter((p) => p.name.trim());
    const missingGrupper = allProducts.filter((p) =>
      (!p.produktgruppe1 && !defaults.produktgruppe1) ||
      (!p.produktgruppe2 && !defaults.produktgruppe2) ||
      (!p.produktgruppe3 && !defaults.produktgruppe3)
    );
    if (missingGrupper.length > 0) {
      const ok = window.confirm(
        `${missingGrupper.length} av ${allProducts.length} produkter mangler Produktgruppe 1/2/3 (obligatorisk i Multicase). Generere likevel?`
      );
      if (!ok) return;
    }
    setGenerating(true);
    try {
      const body = {
        defaults: {
          avsender: defaults.avsender,
          produktgruppe1: defaults.produktgruppe1 || undefined,
          produktgruppe2: defaults.produktgruppe2 || undefined,
          produktgruppe3: defaults.produktgruppe3 || undefined,
          hovedansvarlig1: defaults.hovedansvarlig1,
          enhet: defaults.enhet,
          hovedleverandor: defaults.hovedleverandor || undefined,
          leveringstid: defaults.leveringstid ? parseInt(defaults.leveringstid) : undefined,
          kostvaluta: defaults.kostvaluta,
          frakt: defaults.frakt ? parseFloat(defaults.frakt) : undefined,
          toll: defaults.toll ? parseFloat(defaults.toll) : undefined,
          produsent: defaults.produsent || undefined,
          opprinnelsesland: defaults.opprinnelsesland || undefined,
          registrertAv: defaults.registrertAv || undefined,
        },
        embeddedImages: target === "zip" ? Array.from(weraImages.entries()).map(([code, img]) => ({
          productCode: code,
          filename: img.filename,
          base64: img.base64,
        })) : undefined,
        groups: groups.map((g) => ({
          parent: g.hasVariants && g.parentName.trim()
            ? {
                name: g.parentName.toUpperCase(),
                variant1: g.variant1,
                isParent: true,
              }
            : undefined,
          products: g.products
            .filter((p) => p.name.trim())
            .map((p) => ({
              name: p.name.toUpperCase(),
              ean: p.ean || undefined,
              altVarenr: p.altVarenr || undefined,
              leverandorProdNr: p.leverandorProdNr || undefined,
              produktbeskrivelse2: p.produktbeskrivelse2 || undefined,
              variant1: g.hasVariants ? g.variant1 : undefined,
              variantverdi1: g.hasVariants ? p.variantverdi1 || undefined : undefined,
              kostpris: p.kostpris ? parseFloat(p.kostpris) : undefined,
              listePris1: p.listePris1 ? parseFloat(p.listePris1) : undefined,
              kolli: p.kolli ? parseInt(p.kolli) : undefined,
              antallIKjopsforp: p.antallIKjopsforp ? parseInt(p.antallIKjopsforp) : undefined,
              nettovekt: p.nettovekt ? parseFloat(p.nettovekt) : undefined,
              bildeFilnavn: p.bildeFilnavn || undefined,
              imageSourceUrl: p.imageSourceUrl || undefined,
              sourceUrl: p.sourceUrl || undefined,
              produktinformasjon: p.produktinformasjon || undefined,
              produktgruppe1: p.produktgruppe1 || undefined,
              produktgruppe2: p.produktgruppe2 || undefined,
              produktgruppe3: p.produktgruppe3 || undefined,
              opprinnelsesland: p.opprinnelsesland || undefined,
            })),
        })).filter((g) => g.products.length > 0 || g.parent),
      };

      const endpoint = target === "zip" ? "/api/produkt-import/generate-zip" : "/api/produkt-import/generate-xlsx";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Feil: ${err.error ?? res.status}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = target === "zip" ? `produktimport-${stamp}.zip` : `produktimport-${stamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (target === "zip") {
        const total = res.headers.get("X-Image-Count");
        const embedded = res.headers.get("X-Image-Embedded");
        const scraped = res.headers.get("X-Image-Scraped");
        const failed = res.headers.get("X-Image-Failed");
        if (total) {
          const parts = [`${total} bilder klare i ZIP`];
          if (Number(embedded) > 0) parts.push(`${embedded} fra Wera-opplasting`);
          if (Number(scraped) > 0) parts.push(`${scraped} scraped fra leverandør`);
          if (Number(failed) > 0) parts.push(`${failed} feilet (se bilder-feilet.txt)`);
          alert(parts.join(" • "));
        }
      }
    } catch (err) {
      alert(`Feil: ${err instanceof Error ? err.message : "ukjent"}`);
    } finally {
      setGenerating(false);
    }
  }

  const totalProducts = groups.reduce((sum, g) => sum + g.products.filter((p) => p.name.trim()).length + (g.hasVariants && g.parentName.trim() ? 1 : 0), 0);
  const totalNeedsWork = groups.reduce(
    (sum, g) => sum + g.products.filter((p) => p.name.trim() && productRowQualityScore(p, defaults).score > 0).length,
    0
  );

  /**
   * SB-oppryddingsfase: kjører detectSB på nytt over alle tillagte produkter.
   * 🔴 sure = trygt SB (kan masse-fjernes), 🟡 maybe = manuell vurdering.
   */
  const sbReview = useMemo(() => {
    const sure: Array<{ groupId: string; p: ProductRow; reason: string }> = [];
    const maybe: Array<{ groupId: string; p: ProductRow; reason: string }> = [];
    for (const g of groups) {
      for (const p of g.products) {
        if (!p.name.trim()) continue;
        if (p.sbCleared) continue; // operatør har avvist SB-flagget manuelt
        const r = rowSB(p);
        if (!r.isSB) continue;
        if (r.confidence === "sure") sure.push({ groupId: g.id, p, reason: r.reason });
        else maybe.push({ groupId: g.id, p, reason: r.reason });
      }
    }
    return { sure, maybe };
  }, [groups]);
  const sbTotal = sbReview.sure.length + sbReview.maybe.length;

  /** Returnerer produkter for en gruppe, sortert etter score hvis sortNeedsWork = true */
  function sortedProducts(products: ProductRow[]): Array<{ p: ProductRow; pi: number; quality: ReturnType<typeof productRowQualityScore> }> {
    const indexed = products.map((p, pi) => ({ p, pi, quality: productRowQualityScore(p, defaults) }));
    if (!sortNeedsWork) return indexed;
    return [...indexed].sort((a, b) => b.quality.score - a.quality.score);
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Produkt-import</h1>
        <p className="text-gray-400">Lag XLSX-importfil for Multicase med felles defaults og auto-fill fra leverandør-URL eller regneark.</p>
      </div>

      {/* Defaults */}
      <section className="bg-gray-900/50 rounded-lg border border-gray-800 p-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-1">Felles defaults — gjelder alle produkter</h2>
        <p className="text-xs text-gray-500 mb-4">Produktgruppe 1/2/3 settes per produkt (auto-klassifisert). Defaults nedenfor brukes som fallback hvis et produkt ikke har egne grupper.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Avsender" value={defaults.avsender} onChange={(v) => updateDefault("avsender", v)} />
          <Combobox
            label="Produktgruppe 1"
            value={defaults.produktgruppe1}
            options={Object.keys(HIERARKI)}
            onChange={(v) => setDefaults((d) => ({ ...d, produktgruppe1: v, produktgruppe2: "", produktgruppe3: "" }))}
            placeholder="Velg eller søk..."
          />
          <Combobox
            label="Produktgruppe 2"
            value={defaults.produktgruppe2}
            options={defaults.produktgruppe1 && HIERARKI[defaults.produktgruppe1] ? Object.keys(HIERARKI[defaults.produktgruppe1]) : []}
            onChange={(v) => setDefaults((d) => ({ ...d, produktgruppe2: v, produktgruppe3: "" }))}
            placeholder={defaults.produktgruppe1 ? "Velg eller søk..." : "Velg G1 først"}
            disabled={!defaults.produktgruppe1}
          />
          <Combobox
            label="Produktgruppe 3"
            value={defaults.produktgruppe3}
            options={defaults.produktgruppe1 && defaults.produktgruppe2 && HIERARKI[defaults.produktgruppe1]?.[defaults.produktgruppe2] ? HIERARKI[defaults.produktgruppe1][defaults.produktgruppe2] : []}
            onChange={(v) => updateDefault("produktgruppe3", v)}
            placeholder={defaults.produktgruppe2 ? "Velg eller søk..." : "Velg G2 først"}
            disabled={!defaults.produktgruppe2}
          />
          <Field label="Hovedansvarlig 1" value={defaults.hovedansvarlig1} onChange={(v) => updateDefault("hovedansvarlig1", v)} />
          <Field label="Enhet" value={defaults.enhet} onChange={(v) => updateDefault("enhet", v)} />
          <Field label="Hovedleverandør (nr.)" value={defaults.hovedleverandor} onChange={(v) => updateDefault("hovedleverandor", v)} placeholder="600310" />
          <Field label="Leveringstid (dager)" value={defaults.leveringstid} onChange={(v) => updateDefault("leveringstid", v)} />
          <Field label="Kostvaluta" value={defaults.kostvaluta} onChange={(v) => updateDefault("kostvaluta", v)} />
          <Field label="Frakt%" value={defaults.frakt} onChange={(v) => updateDefault("frakt", v)} />
          <Field label="Toll%" value={defaults.toll} onChange={(v) => updateDefault("toll", v)} />
          <Field label="Produsent" value={defaults.produsent} onChange={(v) => updateDefault("produsent", v)} placeholder="f.eks. Hellberg Safety" />
          <Field label="Opprinnelsesland" value={defaults.opprinnelsesland} onChange={(v) => updateDefault("opprinnelsesland", v)} />
          <Field label="Registrert av" value={defaults.registrertAv} onChange={(v) => updateDefault("registrertAv", v)} placeholder="Initialer" />
        </div>
      </section>

      {/* Leverandør-prisliste-import */}
      <section className="bg-purple-950/30 border border-purple-800/50 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-purple-200 uppercase tracking-wider">Importer fra leverandør-prisliste</h2>
            <p className="text-xs text-purple-300/70 mt-1">Last opp XLSX fra leverandør (f.eks. Wera Händlernettopreisliste). Velg deretter hvilke produkter du vil ta inn.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={supplierPreset}
              onChange={(e) => setSupplierPreset(e.target.value as "wera")}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
            >
              <option value="wera">Wera</option>
            </select>
            <input
              ref={supplierFileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleSupplierFile(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => supplierFileInputRef.current?.click()}
              disabled={supplierLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded text-sm"
            >
              {supplierLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {supplierLoading ? "Leser..." : "Last opp XLSX"}
            </button>
            <input
              ref={resumeFileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeXlsx(f); e.target.value = ""; }}
            />
            <button
              type="button"
              onClick={() => resumeFileInputRef.current?.click()}
              disabled={resumeLoading || supplierLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded text-sm"
              title="Last opp en tidligere generert produktimport-XLSX og fortsett der du slapp"
            >
              {resumeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {resumeLoading ? "Leser..." : "Gjenoppta fra XLSX"}
            </button>
          </div>
        </div>

        {/* Wera deep-scrape via Playwright */}
        <div className="mt-3 pt-3 border-t border-purple-800/40 flex items-center justify-between gap-3">
          <div className="text-xs text-purple-200/80">
            <strong>Deep-scrape Wera-produktsider:</strong> Henter drev/profil/bilde direkte fra wera.de via Playwright. Resultatet caches så hvert produkt scrapes kun én gang. Beriker tomme produktgrupper med automatisk klassifisering.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUseCachedOnly}
              disabled={deepScrapeLoading || groups.flatMap(g => g.products).filter(p => p.leverandorProdNr.trim()).length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded text-sm whitespace-nowrap"
              title="Hent allerede cached Wera-data uten å starte ny Playwright-scrape. Sekunder. Bruk etter at en scrape stoppet midt-batch."
            >
              {deepScrapeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Bruk cached Wera-data
            </button>
            <button
              type="button"
              onClick={handleWeraReclassifyCache}
              disabled={reclassifyLoading || deepScrapeLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded text-sm whitespace-nowrap"
              title="Kjør oppdaterte klassifiserings-regler på allerede cachede produkter — uten å re-scrape via Playwright. Sekunder, ikke timer."
            >
              {reclassifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
              {reclassifyLoading ? "Re-klassifiserer..." : "Re-klassifiser cache"}
            </button>
            <button
              type="button"
              onClick={handleWeraDeepScrape}
              disabled={deepScrapeLoading || groups.flatMap(g => g.products).filter(p => p.leverandorProdNr.trim()).length === 0}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded text-sm whitespace-nowrap"
            >
              {deepScrapeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {deepScrapeLoading
                ? deepScrapeProgress
                  ? `Scraper ${deepScrapeProgress.done}/${deepScrapeProgress.total}...`
                  : "Scraper..."
                : "Deep-scrape Wera-sider"}
            </button>
          </div>
        </div>

        {/* Wera-bilde-ZIP opplaster */}
        <div className="mt-3 pt-3 border-t border-purple-800/40 flex items-center justify-between gap-3">
          <div className="text-xs text-purple-200/80">
            <strong>Bilder fra Wera media-eksport:</strong> Gå til{" "}
            <a href="https://www.wera.de/no/service-hjelp/produktdata-/medieeksport" target="_blank" rel="noreferrer" className="underline hover:text-purple-100">
              wera.de/medieeksport
            </a>
            {" "}→ velg produktene → last ned ZIP → last opp her. Vi matcher på lev-prodnr automatisk.
            {weraImages.size > 0 && <span className="ml-2 text-green-300 font-medium">{weraImages.size} bilder klare</span>}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={weraZipInputRef}
              type="file"
              accept=".zip"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleWeraMediaZip(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => weraZipInputRef.current?.click()}
              disabled={weraZipLoading}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-sm whitespace-nowrap"
            >
              {weraZipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {weraZipLoading ? "Pakker ut..." : "Last opp Wera-bilde-ZIP"}
            </button>
            {weraImages.size > 0 && (
              <button
                onClick={() => setWeraImages(new Map())}
                className="px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs"
              >
                Tøm
              </button>
            )}
          </div>
        </div>

        {/* EK1 produktdata-opplaster */}
        <div className="mt-3 pt-3 border-t border-purple-800/40 flex items-center justify-between gap-3">
          <div className="text-xs text-purple-200/80">
            <strong>EK1 produktdata:</strong> Last opp <code>EK1_product_data_no_*.xlsx</code> fra Wera media-eksport. Beriker importerte produkter med kompaktert navn, ferdig HTML-beskrivelse, opprinnelsesland og bildenavn — matches på produktnummer. Importer fra prislisten først.
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={ek1FileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleEk1File(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => ek1FileInputRef.current?.click()}
              disabled={ek1Loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-sm whitespace-nowrap"
            >
              {ek1Loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {ek1Loading ? "Leser..." : "Last opp EK1 produktdata"}
            </button>
          </div>
        </div>

        {supplierStatus && (
          <div className={`mt-2 px-3 py-2 rounded text-xs ${
            supplierStatus.kind === "error" ? "bg-red-900/40 border border-red-700/60 text-red-200" :
            supplierStatus.kind === "success" ? "bg-green-900/40 border border-green-700/60 text-green-200" :
            "bg-blue-900/40 border border-blue-700/60 text-blue-200"
          }`}>
            {supplierStatus.msg}
          </div>
        )}

        {supplierOpen && supplierProducts.length > 0 && (
          <SupplierTable
            products={supplierProducts}
            selected={supplierSelected}
            onToggle={(idx) => setSupplierSelected((prev) => {
              const next = new Set(prev);
              if (next.has(idx)) next.delete(idx); else next.add(idx);
              return next;
            })}
            search={supplierSearch}
            onSearchChange={setSupplierSearch}
            onSelectAllFiltered={(idxs) => setSupplierSelected((prev) => new Set([...prev, ...idxs]))}
            onClearAll={() => setSupplierSelected(new Set())}
            onAdd={addSelectedSupplierProducts}
            onClose={() => setSupplierOpen(false)}
            hideSB={hideSB}
            onToggleHideSB={() => setHideSB((v) => !v)}
            hideAlleredeInne={hideInne}
            onToggleHideAlleredeInne={() => setHideInne((v) => !v)}
          />
        )}
      </section>

      {/* Grupper */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white">
              Produkter ({totalProducts}){totalNeedsWork > 0 && <span className="ml-2 text-xs text-amber-400 font-normal">• {totalNeedsWork} trenger arbeid</span>}
            </h2>
            <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer select-none">
              <input type="checkbox" checked={sortNeedsWork} onChange={(e) => setSortNeedsWork(e.target.checked)} />
              Sortér «trenger arbeid» øverst
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSbPanelOpen((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm text-white ${sbTotal > 0 ? "bg-red-600/80 hover:bg-red-600" : "bg-gray-700 hover:bg-gray-600"}`}
              title="Gå gjennom produktene på nytt og flagg SB-varer (selvbetjening/blister)"
            >
              <PackageX className="h-4 w-4" />
              Dobbeltsjekk SB
              {sbTotal > 0 && (
                <span className="bg-red-900/80 text-red-100 rounded px-1.5 text-[10px] font-bold">{sbTotal}</span>
              )}
            </button>
            <button
              onClick={() => setPasteOpen(!pasteOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded text-sm"
            >
              <ClipboardPaste className="h-4 w-4" />
              Lim inn fra regneark
            </button>
            <button
              onClick={addGroup}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
            >
              <Layers className="h-4 w-4" />
              Ny gruppe
            </button>
          </div>
        </div>

        {sbPanelOpen && (
          <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-purple-300" />
                SB-gjennomgang — dobbeltsjekk før eksport
              </h3>
              <button onClick={() => setSbPanelOpen(false)} className="text-xs text-gray-400 hover:text-gray-200">Lukk</button>
            </div>
            {sbTotal === 0 ? (
              <p className="text-sm text-green-300">✅ Ingen SB-produkter funnet blant {totalProducts} produkter.</p>
            ) : (
              <>
                <p className="text-xs text-gray-400">
                  SB = selvbetjening/blister-forpakning for butikk-display. Disse er som regel duplikater av bulk-varianten og bør ikke importeres.
                </p>
                {sbReview.sure.length > 0 && (
                  <div className="border border-red-800/50 rounded overflow-hidden">
                    <div className="flex items-center justify-between bg-red-950/50 px-3 py-2">
                      <span className="text-sm font-semibold text-red-300">🔴 Sikre SB-produkter ({sbReview.sure.length})</span>
                      <button
                        onClick={() => {
                          if (confirm(`Fjern alle ${sbReview.sure.length} sikre SB-produkter?`)) {
                            removeProducts(new Set(sbReview.sure.map((s) => s.p.id)));
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-medium"
                      >
                        <Trash2 className="h-3 w-3" />
                        Fjern alle sikre SB
                      </button>
                    </div>
                    <ul className="divide-y divide-gray-800 max-h-60 overflow-y-auto">
                      {sbReview.sure.map(({ p, reason }) => (
                        <li key={p.id} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                          <span className="text-white truncate flex-1" title={p.rawName || p.name}>{p.name || p.rawName}</span>
                          <span className="text-gray-500 truncate w-44">{reason}</span>
                          <button
                            onClick={() => goToProduct(p.id)}
                            className="px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 whitespace-nowrap"
                          >
                            Gå til
                          </button>
                          <button onClick={() => removeProducts(new Set([p.id]))} className="text-red-400 hover:text-red-300 whitespace-nowrap">Fjern</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {sbReview.maybe.length > 0 && (
                  <div className="border border-amber-800/50 rounded overflow-hidden">
                    <div className="bg-amber-950/50 px-3 py-2">
                      <span className="text-sm font-semibold text-amber-300">🟡 Mulige SB — vurder manuelt ({sbReview.maybe.length})</span>
                    </div>
                    <ul className="divide-y divide-gray-800 max-h-60 overflow-y-auto">
                      {sbReview.maybe.map(({ p, reason }) => (
                        <li key={p.id} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                          <span className="text-white truncate flex-1" title={p.rawName || p.name}>{p.name || p.rawName}</span>
                          <span className="text-amber-500/80 truncate w-44">{reason}</span>
                          <button
                            onClick={() => goToProduct(p.id)}
                            className="px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 whitespace-nowrap"
                          >
                            Gå til
                          </button>
                          <button onClick={() => removeProducts(new Set([p.id]))} className="text-red-400 hover:text-red-300 whitespace-nowrap">Fjern</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {pasteOpen && (
          <div className="bg-blue-950/30 border border-blue-800/50 rounded p-4">
            <p className="text-sm text-blue-200 mb-2">
              Lim inn fra Excel/Numbers. Forventet kolonne-rekkefølge per rad:<br/>
              <code className="text-xs text-blue-300">Navn → EAN → Lev.prod.nr → Variantverdi → Kostpris → Listepris → Kolli</code>
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="REFLEKSDEKALER SECTOR GUL&#9;7391441005307&#9;11301-401&#9;Gul&#9;52.80&#9;125&#9;96"
              className="w-full h-32 bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white font-mono"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={importPaste} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm">Importer til siste gruppe</button>
              <button onClick={() => { setPasteText(""); setPasteOpen(false); }} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded text-sm">Avbryt</button>
            </div>
          </div>
        )}

        {groups.map((group, gi) => (
          <div key={group.id} className="bg-gray-900/50 border border-gray-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">Gruppe {gi + 1}</span>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={group.hasVariants}
                    onChange={(e) => updateGroup(group.id, { hasVariants: e.target.checked })}
                  />
                  Har varianter (mor + barn)
                </label>
              </div>
              {groups.length > 1 && (
                <button
                  onClick={() => removeGroup(group.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Fjern gruppe
                </button>
              )}
            </div>

            {group.hasVariants && (
              <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-gray-800">
                <Field
                  label="Mor-navn (parent)"
                  value={group.parentName}
                  onChange={(v) => updateGroup(group.id, { parentName: v })}
                  placeholder="f.eks. REFLEKSDEKALER SECTOR"
                />
                <Field
                  label="Variant-akse"
                  value={group.variant1}
                  onChange={(v) => updateGroup(group.id, { variant1: v })}
                  placeholder="Farge, Størrelse..."
                />
              </div>
            )}

            <div className="space-y-3">
              {sortedProducts(group.products).map(({ p, pi, quality }) => (
                <div
                  key={p.id}
                  id={`ftprod-${p.id}`}
                  className={`bg-gray-900 border rounded p-3 space-y-2 transition-all ${highlightProdId === p.id ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900" : ""} ${quality.score >= 100 ? "border-red-700/60" : quality.score >= 50 ? "border-amber-700/60" : quality.score > 0 ? "border-yellow-700/40" : "border-gray-800"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-8">#{pi + 1}</span>
                    {quality.score > 0 && (
                      <span
                        className={`inline-flex items-center ${quality.score >= 100 ? "text-red-400" : quality.score >= 50 ? "text-amber-400" : "text-yellow-500"}`}
                        title={`Trenger arbeid: ${quality.issues.join(", ")}`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                    )}
                    {(() => {
                      const sb = rowSB(p);
                      return sb.isSB && !p.sbCleared ? (
                        <span
                          title={`SB-vare (${sb.confidence === "sure" ? "sikker" : "mulig"}): ${sb.reason}`}
                          className={`inline-flex items-center gap-0.5 rounded px-1 text-[9px] font-semibold ${sb.confidence === "sure" ? "bg-red-900/70 text-red-300" : "bg-amber-900/70 text-amber-300"}`}
                        >
                          <PackageX className="h-3 w-3" />SB
                        </span>
                      ) : null;
                    })()}
                    <div className="flex-1 flex gap-1">
                      <input
                        type="url"
                        placeholder="Lim inn leverandør-URL for auto-fill..."
                        value={p.sourceUrl}
                        onChange={(e) => updateProduct(group.id, p.id, { sourceUrl: e.target.value })}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
                      />
                      <button
                        onClick={() => scrapeUrl(group.id, p.id, p.sourceUrl)}
                        disabled={p.scraping || !p.sourceUrl.trim()}
                        className="flex items-center gap-1 px-2 py-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded text-xs"
                        title="Scrape produkt-data fra URL-en til venstre"
                      >
                        {p.scraping ? <Loader2 className="h-3 w-3 animate-spin" /> : <LinkIcon className="h-3 w-3" />}
                        Hent
                      </button>
                      {/* Wera deep-scrape per-rad — kun synlig hvis lev-prodnr ser ut som Wera (11 sifre) */}
                      {/^\d{11}$/.test(p.leverandorProdNr.trim()) && (
                        <button
                          onClick={() => scrapeWeraSingleProduct(group.id, p.id)}
                          disabled={p.scraping}
                          className="flex items-center gap-1 px-2 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded text-xs"
                          title="Deep-scrape Wera-siden for denne raden (krever Wera-kode i Lev. prod.nr)"
                        >
                          {p.scraping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                          Wera
                        </button>
                      )}
                    </div>
                    {group.products.length > 1 && (
                      <button
                        onClick={() => removeProduct(group.id, p.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        aria-label="Fjern produkt"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {quality.score > 0 && (
                    <div className="flex items-start gap-1.5 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/40 rounded px-2 py-1">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
                      <span><strong>Trenger arbeid:</strong> {quality.issues.join(" · ")}</span>
                    </div>
                  )}
                  {(() => {
                    const sb = rowSB(p);
                    if (!sb.isSB) return null;
                    if (p.sbCleared) {
                      return (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 px-2 py-1">
                          <PackageX className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>SB-flagg fjernet manuelt.</span>
                          <button
                            onClick={() => updateProduct(group.id, p.id, { sbCleared: false })}
                            className="underline hover:text-gray-300"
                          >
                            Angre
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div className={`flex items-start gap-1.5 text-xs rounded px-2 py-1 ${sb.confidence === "sure" ? "text-red-300 bg-red-950/40 border border-red-800/40" : "text-amber-300 bg-amber-950/40 border border-amber-800/40"}`}>
                        <PackageX className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
                        <span className="flex-1">
                          <strong>{sb.confidence === "sure" ? "Sikker SB-vare:" : "Mulig SB-vare:"}</strong> {sb.reason}
                        </span>
                        {sb.confidence === "maybe" && (
                          <button
                            onClick={() => updateProduct(group.id, p.id, { sbCleared: true })}
                            className="px-1.5 py-0.5 rounded bg-amber-800/60 hover:bg-amber-700 text-amber-100 whitespace-nowrap"
                            title="Marker at dette IKKE er en SB-vare — fjerner SB-flagget"
                          >
                            Ikke SB
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <LimitedField
                      label="Navn (Produktbeskrivelse 1)"
                      value={p.name}
                      onChange={(v) => updateProduct(group.id, p.id, { name: v.toUpperCase() })}
                      max={MAX_BESKRIVELSE}
                      required
                    />
                    <Field label="EAN" value={p.ean} onChange={(v) => updateProduct(group.id, p.id, { ean: v })} />
                    <Field
                      label="Lev. prod.nr"
                      value={p.leverandorProdNr}
                      onChange={(v) => {
                        // Auto-oppdater Beskrivelse 2 hvis den følger «mpn - produsent»-mønsteret
                        const currentB2 = p.produktbeskrivelse2;
                        const oldMpn = p.leverandorProdNr;
                        const followsPattern = oldMpn && currentB2.startsWith(`${oldMpn} - `);
                        const newB2 = followsPattern
                          ? `${v} - ${currentB2.slice(oldMpn.length + 3)}`.slice(0, MAX_BESKRIVELSE)
                          : currentB2;
                        updateProduct(group.id, p.id, { leverandorProdNr: v, produktbeskrivelse2: newB2 });
                      }}
                    />
                    {group.hasVariants ? (
                      <Field label={`${group.variant1}-verdi`} value={p.variantverdi1} onChange={(v) => updateProduct(group.id, p.id, { variantverdi1: v })} />
                    ) : (
                      <LimitedField
                        label="Beskrivelse 2 («mpn - produsent»)"
                        value={p.produktbeskrivelse2}
                        onChange={(v) => updateProduct(group.id, p.id, { produktbeskrivelse2: v })}
                        max={MAX_BESKRIVELSE}
                        placeholder="05006507001 - Wera"
                      />
                    )}
                    <Field label="Kostpris" value={p.kostpris} onChange={(v) => updateProduct(group.id, p.id, { kostpris: v })} />
                    <Field label="Listepris" value={p.listePris1} onChange={(v) => updateProduct(group.id, p.id, { listePris1: v })} />
                    <Field label="Kolli" value={p.kolli} onChange={(v) => updateProduct(group.id, p.id, { kolli: v })} />
                    <Field label="Antall pr. forp." value={p.antallIKjopsforp} onChange={(v) => updateProduct(group.id, p.id, { antallIKjopsforp: v })} />
                    <Field
                      label="Opprinnelsesland"
                      value={p.opprinnelsesland}
                      onChange={(v) => updateProduct(group.id, p.id, { opprinnelsesland: v })}
                      placeholder={defaults.opprinnelsesland || "f.eks. CZ"}
                    />
                  </div>

                  {/* Per-produkt produktgrupper — overstyrer defaults */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800">
                    <Combobox
                      label="Produktgruppe 1"
                      value={p.produktgruppe1}
                      options={Object.keys(HIERARKI)}
                      onChange={(v) => updateProduct(group.id, p.id, { produktgruppe1: v, produktgruppe2: "", produktgruppe3: "" })}
                      placeholder={defaults.produktgruppe1 || "Bruker defaults"}
                    />
                    <Combobox
                      label="Produktgruppe 2"
                      value={p.produktgruppe2}
                      options={p.produktgruppe1 && HIERARKI[p.produktgruppe1] ? Object.keys(HIERARKI[p.produktgruppe1]) : []}
                      onChange={(v) => updateProduct(group.id, p.id, { produktgruppe2: v, produktgruppe3: "" })}
                      placeholder={defaults.produktgruppe2 || "Bruker defaults"}
                      disabled={!p.produktgruppe1}
                    />
                    <Combobox
                      label="Produktgruppe 3"
                      value={p.produktgruppe3}
                      options={p.produktgruppe1 && p.produktgruppe2 && HIERARKI[p.produktgruppe1]?.[p.produktgruppe2] ? HIERARKI[p.produktgruppe1][p.produktgruppe2] : []}
                      onChange={(v) => updateProduct(group.id, p.id, { produktgruppe3: v })}
                      placeholder={defaults.produktgruppe3 || "Bruker defaults"}
                      disabled={!p.produktgruppe2}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => addProductToGroup(group.id)}
              className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
            >
              <Plus className="h-4 w-4" />
              Legg til produkt
            </button>
          </div>
        ))}
      </section>

      <div className="sticky bottom-4 flex justify-end gap-2">
        <button
          onClick={generateXlsx}
          disabled={generating || totalProducts === 0}
          className="flex items-center gap-2 px-5 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-medium rounded shadow-lg"
        >
          {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          Bare XLSX
        </button>
        <button
          onClick={generateZip}
          disabled={generating || totalProducts === 0}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium rounded shadow-lg"
        >
          {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          {generating ? "Bygger ZIP..." : `Last ned ZIP (XLSX + bilder) — ${totalProducts} rader`}
        </button>
      </div>
    </div>
  );
}

function Combobox({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  return (
    <div className="block relative" ref={ref}>
      <span className="text-xs text-gray-400 mb-0.5 block">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="w-full flex items-center justify-between bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-orange-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed text-left"
      >
        <span className={value ? "text-white" : "text-gray-500"}>{value || placeholder || "Velg..."}</span>
        <ChevronDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
      </button>
      {open && !disabled && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded shadow-xl max-h-64 overflow-hidden flex flex-col">
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk..."
            className="bg-gray-800 border-b border-gray-700 px-2 py-1 text-sm text-white focus:outline-none"
          />
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-2 py-2 text-xs text-gray-500">Ingen treff</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); setSearch(""); }}
                  className={`block w-full text-left px-2 py-1 text-sm hover:bg-orange-600/20 ${opt === value ? "bg-orange-600/30 text-orange-300" : "text-gray-200"}`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SupplierTable({
  products,
  selected,
  onToggle,
  search,
  onSearchChange,
  onSelectAllFiltered,
  onClearAll,
  onAdd,
  onClose,
  hideSB,
  onToggleHideSB,
  hideAlleredeInne,
  onToggleHideAlleredeInne,
}: {
  products: SupplierProduct[];
  selected: Set<number>;
  onToggle: (idx: number) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onSelectAllFiltered: (idxs: number[]) => void;
  onClearAll: () => void;
  onAdd: () => void;
  onClose: () => void;
  hideSB: boolean;
  onToggleHideSB: () => void;
  hideAlleredeInne: boolean;
  onToggleHideAlleredeInne: () => void;
}) {
  // SB = Selbstbedienung / selvbetjening (blister-/opphengsforpakning for butikk).
  // Flagget settes ved parsing (detectSB på rå navn + URL-slug). Skjules som default.
  const filtered = useMemo(() => {
    const raw = search.trim().toLowerCase();
    let list = products;
    if (hideSB) list = list.filter((p) => !p.isSB);
    if (hideAlleredeInne) list = list.filter((p) => !p.alleredeInne);
    if (raw) {
      // Multi-token-søk: separer på whitespace/komma/semikolon/newline.
      // - 1 token: vanlig substring-match (eksisterende oppførsel)
      // - 2+ tokens: OR-match — vis produkter der MINST ETT felt matcher MINST ETT token.
      //   Bruker dette til å lime inn 10-100+ produktkoder samtidig.
      const tokens = raw.split(/[\s,;\n]+/).map((t) => t.trim()).filter(Boolean);
      if (tokens.length > 0) {
        const matchToken = (p: SupplierProduct, t: string) =>
          p.name.toLowerCase().includes(t) ||
          p.leverandorProdNr.toLowerCase().includes(t) ||
          p.ean.toLowerCase().includes(t) ||
          p.variantverdi.toLowerCase().includes(t);
        list = list.filter((p) => tokens.some((t) => matchToken(p, t)));
      }
    }
    return list;
  }, [products, search, hideSB, hideAlleredeInne]);
  const hiddenSbCount = useMemo(() => products.filter((p) => p.isSB).length, [products]);
  const alleredeInneCount = useMemo(() => products.filter((p) => p.alleredeInne).length, [products]);

  // Antall søketokens (for å vise "X av Y koder funnet"-info ved multi-token-søk)
  const searchTokens = useMemo(() => {
    const raw = search.trim().toLowerCase();
    if (!raw) return [] as string[];
    return raw.split(/[\s,;\n]+/).map((t) => t.trim()).filter(Boolean);
  }, [search]);
  const isMultiTokenSearch = searchTokens.length > 1;
  // Hvilke tokens fikk treff?
  const matchedTokens = useMemo(() => {
    if (!isMultiTokenSearch) return new Set<string>();
    const m = new Set<string>();
    for (const p of filtered) {
      const fields = [
        p.name.toLowerCase(),
        p.leverandorProdNr.toLowerCase(),
        p.ean.toLowerCase(),
        p.variantverdi.toLowerCase(),
      ];
      for (const t of searchTokens) {
        if (m.has(t)) continue;
        if (fields.some((f) => f.includes(t))) m.add(t);
      }
    }
    return m;
  }, [filtered, searchTokens, isMultiTokenSearch]);
  const missingTokens = useMemo(
    () => (isMultiTokenSearch ? searchTokens.filter((t) => !matchedTokens.has(t)) : []),
    [searchTokens, matchedTokens, isMultiTokenSearch],
  );

  const visible = filtered.slice(0, 200);

  return (
    <div className="mt-4 bg-gray-950 border border-purple-700/50 rounded p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Søk i ${products.length} produkter — lim inn flere koder/EAN separert av mellomrom eller linjeskift`}
            className="w-full bg-gray-900 border border-gray-700 rounded pl-7 pr-2 py-1 text-sm text-white"
          />
        </div>
        <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer select-none whitespace-nowrap" title="SB = Self-service Blister (oppheng-pakning for butikk)">
          <input type="checkbox" checked={hideSB} onChange={onToggleHideSB} />
          Skjul SB {hiddenSbCount > 0 && <span className="text-gray-500">({hiddenSbCount})</span>}
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer select-none whitespace-nowrap" title="Produkter vi allerede har i Multicase (fra «MC sortiment»-arket)">
          <input type="checkbox" checked={hideAlleredeInne} onChange={onToggleHideAlleredeInne} />
          Skjul allerede inne {alleredeInneCount > 0 && <span className="text-gray-500">({alleredeInneCount})</span>}
        </label>
        <button onClick={() => onSelectAllFiltered(filtered.map((p) => p.idx))} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs">
          Velg alle synlige ({filtered.length})
        </button>
        <button onClick={onClearAll} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs">
          Fjern alle
        </button>
        <button onClick={onClose} className="px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs">
          Lukk
        </button>
      </div>

      {/* Multi-token-søk: vis match-status så bruker ser hvilke koder som mangler i prislisten */}
      {isMultiTokenSearch && (
        <div className="mb-3 bg-gray-900 border border-gray-800 rounded p-2 text-xs">
          <div className="flex items-center gap-2 text-gray-300">
            <span className="font-semibold text-orange-400">
              {matchedTokens.size} av {searchTokens.length} søketokens fikk treff
            </span>
            {filtered.length > 0 && (
              <span className="text-gray-500">— {filtered.length} unike produkter</span>
            )}
          </div>
          {missingTokens.length > 0 && (
            <div className="mt-1.5 text-red-300">
              <span className="text-red-400">Mangler i prislisten:</span>{" "}
              <span className="font-mono text-[11px]">{missingTokens.join(", ")}</span>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto border border-gray-800 rounded max-h-96 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-900 sticky top-0">
            <tr className="text-left text-gray-400">
              <th className="px-2 py-1 w-8"></th>
              <th className="px-2 py-1">Kode</th>
              <th className="px-2 py-1">Navn</th>
              <th className="px-2 py-1">Foreslått gruppe</th>
              <th className="px-2 py-1">Størrelse/innhold</th>
              <th className="px-2 py-1 text-right">Kostpris</th>
              <th className="px-2 py-1 text-right">RRP</th>
              <th className="px-2 py-1">EAN</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const isSel = selected.has(p.idx);
              return (
                <tr
                  key={p.idx}
                  onClick={() => onToggle(p.idx)}
                  className={`cursor-pointer border-t border-gray-800 ${isSel ? "bg-purple-900/30" : "hover:bg-gray-900"}`}
                >
                  <td className="px-2 py-1">
                    <input type="checkbox" checked={isSel} onChange={() => onToggle(p.idx)} onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td className="px-2 py-1 font-mono text-gray-300">{p.leverandorProdNr}</td>
                  <td className="px-2 py-1 text-white">
                    {p.name}
                    {p.isSB && (
                      <span
                        title={p.sbReason}
                        className={`ml-1.5 inline-flex items-center gap-0.5 rounded px-1 text-[9px] font-semibold align-middle ${p.sbConfidence === "sure" ? "bg-red-900/70 text-red-300" : "bg-amber-900/70 text-amber-300"}`}
                      >
                        <PackageX className="h-2.5 w-2.5" />SB
                      </span>
                    )}
                    {p.alleredeInne && (
                      <span
                        title="Finnes allerede i Multicase («MC sortiment»)"
                        className="ml-1.5 inline-flex items-center rounded px-1 text-[9px] font-semibold align-middle bg-sky-900/70 text-sky-300"
                      >
                        I MC
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-gray-500">{p.suggestedG3 ? <span className="text-purple-300">{p.suggestedG1}/{p.suggestedG2}/{p.suggestedG3}</span> : <span className="italic">(ukjent)</span>}</td>
                  <td className="px-2 py-1 text-gray-400">{p.variantverdi}</td>
                  <td className="px-2 py-1 text-right text-gray-300">{p.kostpris != null ? `${p.kostpris.toFixed(2)} ${p.kostvaluta}` : "—"}</td>
                  <td className="px-2 py-1 text-right text-gray-400">{p.listePris != null ? p.listePris.toFixed(2) : "—"}</td>
                  <td className="px-2 py-1 font-mono text-gray-500 text-[10px]">{p.ean}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > 200 && (
        <div className="text-xs text-gray-500 mt-1">Viser første 200 av {filtered.length} treff — søk for å smalne ned</div>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-sm text-purple-200">{selected.size} valgt</span>
        <button
          onClick={onAdd}
          disabled={selected.size === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Legg til {selected.size} produkter
        </button>
      </div>
    </div>
  );
}

function LimitedField({
  label,
  value,
  onChange,
  max,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
  required?: boolean;
}) {
  const len = value.length;
  const over = len > max;
  const close = len > max - 5 && len <= max;
  const counterClass = over ? "text-red-400" : close ? "text-amber-400" : len > 0 ? "text-gray-500" : "text-gray-600";
  return (
    <label className="block">
      <span className="text-xs text-gray-400 mb-0.5 flex items-center justify-between">
        <span>
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </span>
        <span className={`text-[10px] font-mono ${counterClass}`}>{len}/{max}</span>
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        placeholder={placeholder}
        maxLength={max}
        className={`w-full bg-gray-800 border rounded px-2 py-1 text-sm text-white focus:outline-none ${over ? "border-red-500" : "border-gray-700 focus:border-orange-500"}`}
      />
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-400 mb-0.5 block">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-orange-500 focus:outline-none"
      />
    </label>
  );
}
