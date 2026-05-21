/**
 * Wera tilkoblings-serie → drev/feste-type kartlegging.
 * Wera produktnavn følger mønsteret «{serie}/{tilkoblingsnummer}» (f.eks. «869/4», «869/9»)
 * der tilkoblingsnummeret indikerer hvilket drev/feste produktet har.
 *
 * Kildene:
 *  - Wera Tilkoblingsserie 4 = 1/4" sekskant (Hex 6,3 mm) — DIN ISO 1173-F 6,3
 *  - Wera Tilkoblingsserie 9 = 4 mm Halfmoon (presisjon/micro)
 *  - Wera Tilkoblingsserie 21 = 4 mm HIOS (micro elektronikk)
 *
 * Brukes til å beriker pipe/bits-klassifisering når marketing description
 * mangler eksplisitt drev-info.
 */

export interface WeraSeriesInfo {
  /** Beskrivende navn på tilkoblings-typen */
  driveType: string;
  /** Foreslått G1/G2/G3 hvis produktet ikke har annen tydelig klassifisering */
  g1: string | null;
  g2: string | null;
  g3: string | null;
}

/**
 * Family-suffix → drive-info.
 * Family suffix kommer fra produktnavn-mønster «\d+/\d` (f.eks. 869/9 → suffix 9).
 */
const FAMILY_SUFFIX_MAP: Record<string, WeraSeriesInfo> = {
  // Tilkoblingsserie 1: Wera-specific (skrutrekker-håndtak), brukt på Kraftform-klinge
  "1": { driveType: "Kraftform-håndtak", g1: "Skrutrekkere", g2: "Klinger", g3: "Holder" },
  // Tilkoblingsserie 4: 1/4" sekskant (DIN ISO 1173-F 6,3)
  "4": { driveType: "1/4\" hex", g1: "Piper og skraller", g2: "1/4\"", g3: "Sekskant" },
  // Tilkoblingsserie 6: 5/16" sekskant
  "6": { driveType: "5/16\" hex", g1: null, g2: null, g3: null },
  // Tilkoblingsserie 7: 7/16" sekskant
  "7": { driveType: "7/16\" hex", g1: null, g2: null, g3: null },
  // Tilkoblingsserie 8: 8 mm sekskant
  "8": { driveType: "8 mm hex", g1: null, g2: null, g3: null },
  // Tilkoblingsserie 9: 4 mm Halfmoon (presisjon)
  "9": { driveType: "4 mm Halfmoon", g1: "Skrutrekkere", g2: "Presisjon", g3: "Sekskant" },
  // Tilkoblingsserie 11: HIOS 5 mm
  "11": { driveType: "HIOS 5 mm", g1: null, g2: null, g3: null },
  // Tilkoblingsserie 12: 6.35 mm
  "12": { driveType: "6.35 mm", g1: null, g2: null, g3: null },
  // Tilkoblingsserie 21: 4 mm HIOS (micro elektronikk)
  "21": { driveType: "4 mm HIOS", g1: "Skrutrekkere", g2: "Presisjon", g3: "Sekskant" },
  // Tilkoblingsserie 25: 4 mm IS
  "25": { driveType: "4 mm IS", g1: null, g2: null, g3: null },
  // Tilkoblingsserie 67: 4 mm SAE
  "67": { driveType: "4 mm SAE", g1: null, g2: null, g3: null },
};

/**
 * Trekker ut Wera tilkoblings-suffiks fra et produktnavn.
 * Eksempler:
 *   «869/4 PIPER 5.5 X 50 MM» → «4»
 *   «869/9 piper, 2.5 x 44 mm» → «9»
 *   «8790 A VDE ZYKLOP PIPE» → null (ingen «/N»-suffiks)
 *   «1013 KRAFTFORM MICRO BITSHÅNDHOLDER» → null
 */
export function extractWeraFamilySuffix(name: string): string | null {
  const m = name.match(/\b\d{2,4}\/(\d{1,2})\b/);
  return m ? m[1] : null;
}

/**
 * Detekterer Wera tilkoblings-serie fra marketing description.
 * Marketing nevner ofte «Halfmoon drev (Wera serie 9)», «tilkoblingsserie 4», osv.
 */
export function detectSeriesFromMarketing(marketing: string): string | null {
  const text = marketing.toLowerCase();
  // «Wera serie X» eller «tilkoblingsserie X»
  const m1 = text.match(/(?:wera\s+serie|tilkoblingsserie)\s+(\d{1,2})/);
  if (m1) return m1[1];
  // Halfmoon → serie 9
  if (/halfmoon/.test(text)) return "9";
  // HIOS → serie 21 (assumed)
  if (/\bhios\b/.test(text)) return "21";
  return null;
}

/**
 * Hoved-API: gi best mulig drev-/klassifiserings-hint basert på Wera-navn + marketing.
 */
export function lookupWeraSeries(name: string, marketing?: string): WeraSeriesInfo | null {
  // Først: prøv family-suffix fra navn
  const familySuffix = extractWeraFamilySuffix(name);
  if (familySuffix && FAMILY_SUFFIX_MAP[familySuffix]) {
    return FAMILY_SUFFIX_MAP[familySuffix];
  }
  // Deretter: prøv marketing-mønster
  if (marketing) {
    const detected = detectSeriesFromMarketing(marketing);
    if (detected && FAMILY_SUFFIX_MAP[detected]) {
      return FAMILY_SUFFIX_MAP[detected];
    }
  }
  return null;
}
