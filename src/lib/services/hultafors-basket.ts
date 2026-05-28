/**
 * Parser for Hultafors/Snickers basket-XLSX (eksportert fra
 * Hultafors B2B-portalen). Filen har bare 2 kolonner:
 *   StockCode | Quantity
 *
 * Hver StockCode er en 11-sifret variant-kode på formatet
 *   MMMMCCCCSSS
 * der:
 *   - MMMM (4 sifre) = modellnr (Snickers «6943», «2539» osv.)
 *   - CCCC (4 sifre) = fargekode (Hi-Vis: 6604, 6600 ...)
 *   - SSS  (3 sifre) = størrelseskode (trouser: 044-064, gloves: 005-012)
 *
 * Denne parseren brukes som SUPPLEMENT til PDF-modus i Enkelprodukt-
 * generatoren: PDF gir felles produkt-info (BUKSE 6943 KL2 HL CRD),
 * basket gir variantene (per farge + størrelse).
 */

import * as XLSX from "xlsx";

export interface HultaforsVariant {
  /** Full 11-sifret stock-kode (= leverandørproduktnummer) */
  stock_code: string;
  /** Antall fra basket-fila (sjelden relevant for produkt-import) */
  quantity: number;
  /** Første 4 sifre — modellnr (Snickers «6943») */
  model_code: string;
  /** Midt-4 sifre — Hultafors-fargekode */
  color_code: string;
  /** Siste 3 sifre — størrelseskode */
  size_code: string;
  /** Tolket farge-navn hvis kjent fargekode, ellers null */
  color_label: string | null;
  /** Tolket størrelse (f.eks. «54» for trouser-størrelse, «8» for hansker) */
  size_label: string;
}

/**
 * Kjente Hultafors/Snickers Workwear-fargekoder.
 * Listen er ikke uttømmende — ukjente koder returnerer null så bruker
 * kan fylle inn manuelt.
 */
/**
 * Kompakt-fargekoder etter Snickers/Multicase-konvensjonen i FT
 * (3-8 tegn så de får plass i Beskrivelse 1 sammen med type + modellnr + str).
 *
 * Eksempler fra fakturaen: «GUL» (Hi-Vis gul), «GUL/SORT» (Hi-Vis gul / Sort),
 * «SORT», «MAR» (Marineblå). Ikke alle hi-vis-produkter trenger /SORT-suffiks
 * — det avhenger av om svart kontrast er en sentral del av produktet (bukse
 * = ja, jakke noen ganger = nei). Default tilbyr vi den lengre varianten.
 */
const SNICKERS_COLORS: Record<string, string> = {
  "0400": "SORT",
  "0404": "SORT",
  "6604": "GUL/SORT",
  "6606": "GUL/STÅL",
  "6600": "GUL",
  "6700": "ORANSJE",
  "6730": "ORANSJE/SORT",
  "9595": "HVIT",
  "5800": "STÅL/SORT",
  "5804": "STÅL/SORT",
  "0466": "SORT/GUL",
  "0467": "SORT/ORANSJE",
  "0480": "SORT/KHAKI",
  "0418": "SORT/MAR",
  "7474": "KAMO",
  "4100": "BRUN",
  "1800": "MAR",
  "1804": "MAR/SORT",
  "9500": "GRÅ",
  "2000": "RØD",
  "0904": "ANTR/SORT",
};

/**
 * Tolker størrelses-kode basert på verdi-rekkevidde.
 *  - 040-070 → trouser/jakke EU-størrelse som tall (54, 56, ...)
 *  - 001-012 → klær-størrelse mappet til bokstav. SNICKERS-konvensjonen
 *               er en INTERN slot-index, IKKE EU-glove-tall:
 *                 003=XS, 004=S, 005=M, 006=L, 007=XL, 008=XXL, 009=XXXL
 *               (verifisert mot Hultafors-faktura: 2539 005 = T-skjorte M,
 *               2539 008 = T-skjorte XXL).
 *  - Ellers   → returner som rå streng
 *
 * NB: Vester og enkelte produkter bruker S/M, M/L, L/XL-kombinasjoner —
 * dette ses kun manuelt. Default-mapping treffer ~90% av klær.
 */
const CLOTHING_SIZES: Record<number, string> = {
  1: "XS",
  2: "XS",
  3: "XS",
  4: "S",
  5: "M",
  6: "L",
  7: "XL",
  8: "XXL",
  9: "XXXL",
  10: "XXXL",
  11: "XXXL",
  12: "XXXL",
};

function decodeSize(sizeCode: string): string {
  const n = parseInt(sizeCode, 10);
  if (Number.isNaN(n)) return sizeCode;
  // Trouser/jakke — beholdt som tall (EU-størrelse)
  if (n >= 40 && n <= 70) return String(n);
  // Klær — bokstav-størrelser
  if (n >= 1 && n <= 12) return CLOTHING_SIZES[n] ?? String(n);
  return sizeCode;
}

/** True hvis størrelsen er bokstav (XS/S/M/L/XL/XXL/XXXL) — eksportert
 *  så UI kan velge mellom «STR: 54» vs «STR: M»-format hvis ønsket
 *  (selv om vi nå alltid bruker STR:-prefiks for begge). */
export function isLetterSize(sizeLabel: string): boolean {
  return /^(XS|S|M|L|XL|XXL|XXXL|S\/M|M\/L|L\/XL)$/i.test(sizeLabel);
}

/**
 * Parser et basket-XLSX-buffer og returnerer dekodede varianter.
 * Validerer at fila har korrekt header («StockCode», «Quantity») og
 * at stock-koder er 11 sifre. Kaster Error med beskrivende melding
 * hvis format er feil.
 */
export function parseHultaforsBasket(buffer: Buffer): HultaforsVariant[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) throw new Error("Tomt regneark — fant ingen sheets");
  const ws = wb.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  if (rows.length === 0) {
    throw new Error("Regnearket er tomt (ingen rader etter header)");
  }

  // Sjekk at vi har StockCode-kolonnen (case-insensitive, tåler variasjon)
  const sampleKeys = Object.keys(rows[0]);
  const stockKey = sampleKeys.find((k) => /^stock\s*code$|^stockcode$|^varenr$/i.test(k));
  const qtyKey = sampleKeys.find((k) => /^quantity$|^qty$|^antall$/i.test(k));
  if (!stockKey) {
    throw new Error(
      `Fant ingen «StockCode»-kolonne. Funnet kolonner: ${sampleKeys.join(", ")}. ` +
        `Forventet header er «StockCode | Quantity» (Hultafors basket-eksport).`,
    );
  }

  const variants: HultaforsVariant[] = [];
  for (const row of rows) {
    const codeRaw = String(row[stockKey] ?? "").trim();
    if (!codeRaw) continue;
    // Tåler både ren tall-string og tall-format
    const code = codeRaw.replace(/\s+/g, "");
    if (!/^\d{10,12}$/.test(code)) {
      // Hopp over rader som ikke ser ut som en stock-kode
      continue;
    }
    // Normaliser til 11 sifre (pad foran om 10-sifret)
    const code11 = code.padStart(11, "0");
    const modelCode = code11.slice(0, 4);
    const colorCode = code11.slice(4, 8);
    const sizeCode = code11.slice(8, 11);

    const qtyRaw = qtyKey ? row[qtyKey] : 1;
    const qty = typeof qtyRaw === "number" ? qtyRaw : parseInt(String(qtyRaw).trim(), 10);

    variants.push({
      stock_code: code11,
      quantity: Number.isFinite(qty) ? qty : 1,
      model_code: modelCode,
      color_code: colorCode,
      size_code: sizeCode,
      color_label: SNICKERS_COLORS[colorCode] ?? null,
      size_label: decodeSize(sizeCode),
    });
  }

  if (variants.length === 0) {
    throw new Error(
      "Fant ingen gyldige Hultafors-koder (11-sifrede tall i StockCode-kolonnen).",
    );
  }

  return variants;
}
