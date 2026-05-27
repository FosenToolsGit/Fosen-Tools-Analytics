/**
 * Detekterer størrelse-/variant-tabeller i PDF-tekst.
 *
 * Mange leverandører lager ÉN felles datablad-PDF som dekker flere varianter
 * (typisk Wera: en serie med PZ#0, PZ#1, PZ#2 i samme PDF, eller
 * Pelicase: en case-modell i flere størrelser).
 *
 * Funksjonen leter etter rad-mønstre som ser ut som varianter, parser ut
 * felter (kode, størrelse, EAN, vekt etc.) per variant, og returnerer dem
 * så UI-en kan vise dem som en liste å klikke på.
 */

export interface PdfVariant {
  /** Synlig label i UI — sammendrag av variantens nøkkelfelter */
  label: string;
  /** Felter detektert i variant-raden (key-value-par) */
  fields: Record<string, string>;
  /** Original-tekstlinje variant-raden ble parset fra */
  raw_line: string;
  /** Sannsynlig produktkode (Wera-format, EAN, eller annet) */
  code: string | null;
  /** Sannsynlig EAN-13 (13 sifre) */
  ean: string | null;
  /** Størrelses-beskrivelse (f.eks. «PZ 2 × 100mm», «1535 Air», «#2») */
  size: string | null;
}

const HEADER_KEYWORDS = [
  "art.?\\s*nr",
  "artikkel",
  "produktnr",
  "varenr",
  "ean",
  "gtin",
  "størrelse",
  "lengde",
  "vekt",
  "size",
  "length",
  "weight",
  "model",
  "type",
];

/**
 * Detekterer om PDF-teksten har en variant-tabell og parser ut radene.
 * Returnerer tom array hvis ingen tabell-struktur finnes (vanlig ÉN-produkts-PDF).
 */
export function detectPdfVariants(text: string): PdfVariant[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 4) return [];

  // 1. Finn en header-linje som inneholder minst 2 av HEADER_KEYWORDS
  let headerIdx = -1;
  let headerCols: string[] = [];
  const headerRe = new RegExp(`(${HEADER_KEYWORDS.join("|")})`, "i");

  for (let i = 0; i < Math.min(lines.length, 100); i++) {
    const matches = lines[i].match(new RegExp(headerRe, "gi"));
    if (matches && matches.length >= 2) {
      headerIdx = i;
      // Split header på mellomrom/tab — beholder kolonnenavn for label-bygging
      headerCols = lines[i].split(/\s{2,}|\t+/).map((c) => c.trim()).filter(Boolean);
      break;
    }
  }
  if (headerIdx < 0) return [];

  // 2. Parse rader etter header — leter etter rader som starter med en produktkode
  //    (10-13 sifre, eller alfanumerisk Wera-stil)
  const variants: PdfVariant[] = [];
  const codeRe = /^([\dA-Z][\dA-Z\-./]{4,15})\b/i;
  const eanRe = /\b(\d{8}|\d{12,14})\b/g;
  const sizeRe = /(?:#\s*\d|PZ\s*\d|PH\s*\d|TX\s*\d|TORX\s*\d|HEX\s*\d|SL\s*\d|[\dx,.]+\s*[xX×]\s*[\dx,.]+(?:\s*[xX×]\s*[\dx,.]+)?|\b\d+\s*mm\b)/i;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 8) continue;
    const codeMatch = line.match(codeRe);
    if (!codeMatch) continue;

    const code = codeMatch[1];
    const eans = [...line.matchAll(eanRe)].map((m) => m[1]);
    // Førsterstå EAN som ikke er samme som code
    const ean = eans.find((e) => e !== code) || null;
    const sizeMatch = line.match(sizeRe);
    const size = sizeMatch ? sizeMatch[0].trim() : null;

    // Splitt linjen i tokens for å bygge fields-objektet
    const tokens = line.split(/\s{2,}|\t+/).map((t) => t.trim()).filter(Boolean);
    const fields: Record<string, string> = {};
    for (let col = 0; col < Math.min(tokens.length, headerCols.length); col++) {
      const key = headerCols[col] || `kolonne_${col + 1}`;
      fields[key] = tokens[col];
    }

    variants.push({
      label: [code, size, ean].filter(Boolean).join(" · "),
      fields,
      raw_line: line,
      code,
      ean,
      size,
    });

    // Stop hvis vi har samlet 30 — for stort til at det er én produkt-PDF
    if (variants.length > 30) break;
  }

  // 3. Hvis vi bare har funnet 0-1 varianter, det er ikke en variant-PDF
  if (variants.length < 2) return [];

  return variants;
}

/**
 * Bygger en "fokusert tekst-versjon" for én valgt variant — den felles
 * beskrivelsen fra PDF-en + variantens spesifikke rad.
 * Brukes for å destillere variant-spesifikke Multicase-felter.
 */
export function buildFocusedTextForVariant(fullText: string, variant: PdfVariant): string {
  // Splitt teksten i seksjoner ved blank linje / heading
  const lines = fullText.split(/\r?\n/);
  // Behold alt FØR første variant-tabell-rad (= felles beskrivelse)
  const variantIdx = lines.findIndex((l) => l.includes(variant.raw_line.slice(0, 30)));
  let commonText = "";
  if (variantIdx > 0) {
    commonText = lines.slice(0, variantIdx).join("\n").trim();
  } else {
    // Fallback: bruk hele teksten
    commonText = fullText;
  }
  // Bygg variant-spesifikk seksjon
  const variantSection = [
    "=== Valgt variant ===",
    `Kode: ${variant.code}`,
    variant.size ? `Størrelse: ${variant.size}` : "",
    variant.ean ? `EAN: ${variant.ean}` : "",
    ...Object.entries(variant.fields).map(([k, v]) => `${k}: ${v}`),
    "",
    variant.raw_line,
  ].filter(Boolean).join("\n");

  return `${commonText}\n\n${variantSection}`;
}
