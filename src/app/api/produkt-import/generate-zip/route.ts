import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import * as XLSX from "xlsx";
import JSZip from "jszip";

/**
 * Bygger ZIP med (a) Multicase-kompatibel Produktimport.xlsx og (b) en bilder/-mappe
 * med alle scrapede produktbilder lastet ned. Brukeren legger bilder-mappa rett inn
 * i sin lokale Multicase-mappe slik at importen finner filene.
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

type ColumnName = (typeof COLUMNS)[number];
type Row = Partial<Record<ColumnName, string | number | null>>;

interface ImportProductInput {
  name: string;
  ean?: string;
  altVarenr?: string;
  leverandorProdNr?: string;
  produktbeskrivelse2?: string;
  variant1?: string;
  variantverdi1?: string;
  variant2?: string;
  variantverdi2?: string;
  isParent?: boolean;
  kostpris?: number;
  listePris1?: number;
  listePris2?: number;
  listePris3?: number;
  kolli?: number;
  antallIKjopsforp?: number;
  nettovekt?: number;
  bildeFilnavn?: string;
  imageSourceUrl?: string;
  /** Leverandør-produktside (f.eks. wera.de/en/05032001001) — brukes til image-scrape hvis imageSourceUrl mangler */
  sourceUrl?: string;
  produktinformasjon?: string;
  produktgruppe1?: string;
  produktgruppe2?: string;
  produktgruppe3?: string;
  /** Per-produkt opprinnelsesland (overstyrer defaults.opprinnelsesland) */
  opprinnelsesland?: string;
}

interface EmbeddedImage {
  /** Leverandør-produktnummer fra filnavn (f.eks. «05032001001») */
  productCode: string;
  /** Original filnavn fra Wera media-eksport ZIP */
  filename: string;
  /** Base64-encoded bilde-bytes */
  base64: string;
}

interface ImportRequestBody {
  embeddedImages?: EmbeddedImage[];
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
    parent?: ImportProductInput;
    products: ImportProductInput[];
  }>;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  let body: ImportRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.groups || body.groups.length === 0) {
    return NextResponse.json({ error: "Ingen produkter å generere" }, { status: 400 });
  }

  // Indekser opplastede Wera-bilder per produktkode for raskt oppslag
  const embeddedByCode = new Map<string, EmbeddedImage>();
  for (const img of body.embeddedImages ?? []) {
    embeddedByCode.set(img.productCode, img);
  }

  // Bygg XLSX-rader + bestem image-strategi per produkt:
  //   1. Wera-bilde fra opplastet ZIP (hvis vi har det) — bruker direkte
  //   2. ImageSourceUrl satt (fra forrige scrape) — bruker direkte
  //   3. SourceUrl satt — server scraper image-URL fra produktsiden
  //   4. Ingen kilde — hopper over (filnavn refereres i XLSX men fil mangler)
  const rows: Row[] = [];
  const imageJobs: Array<{ filename: string; url: string }> = [];
  const scrapeJobs: Array<{ filename: string; sourceUrl: string }> = [];
  const directBytes: Array<{ filename: string; data: Buffer }> = [];
  for (const group of body.groups) {
    if (group.parent) rows.push(buildRow(group.parent, body.defaults, true));
    for (const product of group.products) {
      rows.push(buildRow(product, body.defaults, false));
      if (!product.bildeFilnavn) continue;

      // I XLSX-en lagrer vi full UNC-sti til lokal Multicase-mappe (\\tsclient\Multicase\X.jpg),
      // men i ZIP-en skal selve bildefilen ligge i bilder/-mappa med bare basenavnet.
      // Strip UNC-prefiks så vi får ren basename for ZIP-entry.
      const zipFilename = product.bildeFilnavn.replace(/^\\\\tsclient\\Multicase\\/i, "").replace(/^.*[\\/]/, "");
      const embedded = product.leverandorProdNr ? embeddedByCode.get(product.leverandorProdNr) : undefined;
      if (embedded) {
        directBytes.push({ filename: zipFilename, data: Buffer.from(embedded.base64, "base64") });
      } else if (product.imageSourceUrl) {
        imageJobs.push({ filename: zipFilename, url: product.imageSourceUrl });
      } else if (product.sourceUrl) {
        scrapeJobs.push({ filename: zipFilename, sourceUrl: product.sourceUrl });
      }
    }
  }

  // Scrape image-URL fra produkt-sider der vi mangler imageSourceUrl
  if (scrapeJobs.length > 0) {
    const scraped = await scrapeImageUrls(scrapeJobs, 4);
    imageJobs.push(...scraped);
  }

  const sheetData: (string | number | null)[][] = [
    [...COLUMNS],
    ...rows.map((r) => COLUMNS.map((col) => r[col] ?? null)),
  ];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!cols"] = COLUMNS.map((c) => ({ wch: Math.max(12, c.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produktimport");
  const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  // Last ned bilder parallelt med rimelig samtidighet
  const downloaded = await downloadImages(imageJobs, 4);

  // Bygg ZIP
  const zip = new JSZip();
  const stamp = new Date().toISOString().slice(0, 10);
  zip.file(`produktimport-${stamp}.xlsx`, xlsxBuffer);
  const imageFolder = zip.folder("bilder");
  if (imageFolder) {
    for (const img of directBytes) {
      imageFolder.file(img.filename, img.data);
    }
    for (const img of downloaded.success) {
      imageFolder.file(img.filename, img.data);
    }
  }
  if (downloaded.failed.length > 0) {
    const log = downloaded.failed.map((f) => `${f.filename}\t${f.url}\t${f.error}`).join("\n");
    zip.file("bilder-feilet.txt", `Filer som ikke kunne lastes ned:\n\n${log}`);
  }

  const zipUint8 = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const filename = `produktimport-${stamp}.zip`;

  return new NextResponse(zipUint8 as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Image-Count": String(downloaded.success.length + directBytes.length),
      "X-Image-Embedded": String(directBytes.length),
      "X-Image-Scraped": String(downloaded.success.length),
      "X-Image-Failed": String(downloaded.failed.length),
    },
  });
}

interface DownloadResult {
  success: Array<{ filename: string; data: Buffer }>;
  failed: Array<{ filename: string; url: string; error: string }>;
}

async function scrapeImageUrls(
  jobs: Array<{ filename: string; sourceUrl: string }>,
  concurrency: number
): Promise<Array<{ filename: string; url: string }>> {
  const results: Array<{ filename: string; url: string }> = [];
  let cursor = 0;
  const worker = async () => {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      try {
        const res = await fetch(job.sourceUrl, {
          headers: { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) continue;
        const html = await res.text();
        const imageUrl = extractImageUrl(html, job.sourceUrl);
        if (imageUrl) results.push({ filename: job.filename, url: imageUrl });
      } catch {
        // ignore — bilde mangler bare for denne, fortsett
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, jobs.length)) }, () => worker()));
  return results;
}

function extractImageUrl(html: string, baseUrl: string): string | null {
  // 1. JSON-LD Product.image
  const jsonLdMatches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1].trim());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const img = findImage(item);
        if (img) return resolveUrl(img, baseUrl);
      }
    } catch { /* ignore */ }
  }
  // 2. og:image
  const og = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i)
    ?? html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i);
  if (og) return resolveUrl(og[1], baseUrl);
  // 3. twitter:image
  const tw = html.match(/<meta\s+(?:property|name)=["']twitter:image["']\s+content=["']([^"']+)["']/i);
  if (tw) return resolveUrl(tw[1], baseUrl);
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findImage(node: any): string | null {
  if (!node || typeof node !== "object") return null;
  if (node.image) {
    const img = Array.isArray(node.image) ? node.image[0] : node.image;
    if (typeof img === "string") return img;
    if (img?.url) return img.url;
  }
  if (Array.isArray(node["@graph"])) {
    for (const item of node["@graph"]) {
      const found = findImage(item);
      if (found) return found;
    }
  }
  return null;
}

function resolveUrl(url: string, base: string): string {
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

async function downloadImages(
  jobs: Array<{ filename: string; url: string }>,
  concurrency: number
): Promise<DownloadResult> {
  const success: DownloadResult["success"] = [];
  const failed: DownloadResult["failed"] = [];
  // Dedup på filnavn — to varianter kan ha samme bilde
  const seen = new Set<string>();
  const uniqueJobs = jobs.filter((j) => {
    if (seen.has(j.filename)) return false;
    seen.add(j.filename);
    return true;
  });

  let cursor = 0;
  const worker = async () => {
    while (cursor < uniqueJobs.length) {
      const job = uniqueJobs[cursor++];
      try {
        const res = await fetch(job.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; FosenToolsImport/1.0)" },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          failed.push({ filename: job.filename, url: job.url, error: `HTTP ${res.status}` });
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        success.push({ filename: job.filename, data: buf });
      } catch (err) {
        failed.push({
          filename: job.filename,
          url: job.url,
          error: err instanceof Error ? err.message : "ukjent",
        });
      }
    }
  };

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, uniqueJobs.length)) }, () => worker());
  await Promise.all(workers);
  return { success, failed };
}

function buildRow(
  p: ImportProductInput,
  defaults: ImportRequestBody["defaults"],
  isParent: boolean
): Row {
  const produktinfo = p.produktinformasjon ?? "";
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
    "MorBarnKobling": null,
    "Variant1": p.variant1 ?? null,
    "Variantverdi1": isParent ? null : (p.variantverdi1 ?? null),
    "Variant2": p.variant2 ?? null,
    "Variantverdi2": isParent ? null : (p.variantverdi2 ?? null),
    "Hovedansvarlig 1": defaults.hovedansvarlig1 ?? "AHP",
    "Enhet": defaults.enhet ?? "Stk",
    "Hovedleverandør": defaults.hovedleverandor ? (parseFloat(defaults.hovedleverandor) || defaults.hovedleverandor) : null,
    "Leverandør produktnummer": isParent ? null : (p.leverandorProdNr ?? null),
    "Leveringstid": defaults.leveringstid ?? 7,
    "Kostvaluta": defaults.kostvaluta ?? "NOK",
    "Hovedleverandør kostpris  ": isParent ? 0.01 : (p.kostpris ?? null),
    "Frakt%": defaults.frakt ?? null,
    "Toll%": defaults.toll ?? null,
    "Produsent": defaults.produsent ?? null,
    "Opprinnelsesland": p.opprinnelsesland || defaults.opprinnelsesland || null,
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
    "Nettolengde": null, "Nettobredde": null, "Nettohøyde": null,
    "Bruttovekt": null, "Bruttolengde": null, "Bruttobredde": null, "Bruttohøyde": null,
    "Batchkontroll": null, "Holdbarhet": null, "ABC Status": null,
    "Hovedansvarlig 2": null,
    "Registrert av": defaults.registrertAv ?? null,
    "BildeFilnavn": p.bildeFilnavn ?? null,
    "Godkjenn": null, "MalVareNr": null,
    "Produktinformasjon": produktinfo || null,
  };
}

function parseEan(s: string): number | string {
  const cleaned = s.replace(/\D/g, "");
  if (cleaned.length === 0) return s;
  return cleaned.length > 12 ? cleaned : (parseInt(cleaned, 10) || cleaned);
}
