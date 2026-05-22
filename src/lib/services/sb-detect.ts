/**
 * SB-deteksjon — avgjør om et produkt er en SB-vare (Selbstbedienung /
 * selvbetjening), dvs. blister-/opphengsforpakning ment for butikk-display.
 *
 * Vi vil normalt IKKE importere SB-varianter til Multicase — de er duplikater
 * av bulk-varianten med butikkforpakning. SB-varianter slipper lett gjennom
 * fordi det kompakterte produktnavnet stripper bort «SB»-tokenet. Derfor kjører
 * vi deteksjon på RÅ felter (ufiltrert leverandørnavn + webshop-URL).
 *
 * Wera-konvensjon (bekreftet 22. mai 2026):
 *  - SB-produktnavn slutter på « SB»  («Kraftform Kompakt VDE 60 i Take it easy SB»)
 *  - SB-produktets URL-slug slutter på «-sb»  (.../kraftform-kompakt-...-take-it-easy-sb)
 *  - Bulk-varianten har samme navn uten « SB» og slug uten «-sb»
 *
 * Modulen er ren (ingen avhengigheter) så den kan brukes både server-side
 * (parser, deep-scrape) og client-side (oppryddingspanel).
 */

export type SBConfidence = "sure" | "maybe" | null;

export interface SBDetectInput {
  /** Ufiltrert leverandør-navn (Wera prisliste row[3], eller deep-scrape-tittel). */
  rawName?: string | null;
  /** Kompaktert/redigert navn — brukes som fallback hvis rawName mangler. */
  name?: string | null;
  /** Webshop-/produkt-URL. Slug-suffikset «-sb» er det sterkeste signalet. */
  url?: string | null;
  /** Marketing-/produktbeskrivelse. */
  marketing?: string | null;
  /** Størrelse-/innhold-felt. */
  size?: string | null;
  /** Pakke-spec fra deep-scrape (f.eks. «Selbstbedienung», «SB-Verpackung»). */
  packagingNote?: string | null;
}

export interface SBDetectResult {
  isSB: boolean;
  /** «sure» = trygt SB, «maybe» = trenger manuell vurdering, null = ren. */
  confidence: SBConfidence;
  /** Menneskelesbar begrunnelse for hvorfor produktet ble flagget. */
  reason: string;
}

/** « SB» som siste token i en streng (trimmer trailing tegnsetting/whitespace). */
const TRAILING_SB = /\bSB\s*$/i;
/** Frittstående «SB»-token hvor som helst i teksten. */
const STANDALONE_SB = /\bSB\b/i;
/** Eksplisitte pakke-/blister-ord (norsk + tysk). */
const PACKAGING_WORDS = /selbstbedienung|sb[-\s]?verpackung|selvbetjening|blisterpakn|blisterforpakn|sb[-\s]?pakk/i;
/** Svakere blister-/opphengs-ord. */
const BLISTER_HINT = /\bblister\b|oppheng|hengepakn|clip[-\s]?strip/i;

/** Trekker ut siste sti-segment fra en URL, lowercased og uten query/hash/slash. */
function urlSlug(url: string): string {
  let s = url.trim().toLowerCase();
  const cut = s.search(/[?#]/);
  if (cut >= 0) s = s.slice(0, cut);
  s = s.replace(/\/+$/, "");
  const lastSlash = s.lastIndexOf("/");
  return lastSlash >= 0 ? s.slice(lastSlash + 1) : s;
}

/**
 * Avgjør om et produkt er en SB-vare.
 *
 * 🔴 «sure»  — URL-slug slutter på «-sb», ELLER navnet slutter på « SB»,
 *              ELLER pakke-spec sier Selbstbedienung/SB-Verpackung.
 * 🟡 «maybe» — frittstående «SB»-token midt i tekst, eller blister-/opphengs-ord.
 */
export function detectSB(input: SBDetectInput): SBDetectResult {
  const rawName = (input.rawName ?? "").trim();
  const name = (input.name ?? "").trim();
  const marketing = (input.marketing ?? "").trim();
  const size = (input.size ?? "").trim();
  const packaging = (input.packagingNote ?? "").trim();

  // 🔴 SIKKER — URL-slug ender på «-sb» (Weras egen selvbetjenings-konvensjon)
  if (input.url) {
    const slug = urlSlug(input.url);
    if (/-sb$/.test(slug)) {
      return { isSB: true, confidence: "sure", reason: "URL-slug slutter på «-sb»" };
    }
  }

  // 🔴 SIKKER — navnet slutter på « SB»
  if (rawName && TRAILING_SB.test(rawName)) {
    return { isSB: true, confidence: "sure", reason: "Navn slutter på «SB»" };
  }
  if (name && TRAILING_SB.test(name)) {
    return { isSB: true, confidence: "sure", reason: "Navn slutter på «SB»" };
  }

  // 🔴 SIKKER — pakke-spec sier Selbstbedienung/SB-Verpackung
  if (packaging && PACKAGING_WORDS.test(packaging)) {
    return { isSB: true, confidence: "sure", reason: `Pakke-spec: «${packaging}»` };
  }

  // 🟡 MULIG — eksplisitte pakke-ord et sted i teksten
  for (const [label, text] of [
    ["navn", rawName || name],
    ["beskrivelse", marketing],
    ["størrelse", size],
  ] as const) {
    if (text && PACKAGING_WORDS.test(text)) {
      return { isSB: true, confidence: "maybe", reason: `«${text.match(PACKAGING_WORDS)?.[0]}» i ${label}` };
    }
  }

  // 🟡 MULIG — frittstående «SB»-token (ikke trailing) midt i navn/beskrivelse
  for (const [label, text] of [
    ["navn", rawName || name],
    ["beskrivelse", marketing],
  ] as const) {
    if (text && STANDALONE_SB.test(text)) {
      return { isSB: true, confidence: "maybe", reason: `Frittstående «SB» i ${label}` };
    }
  }

  // 🟡 MULIG — svakere blister-/opphengs-hint
  for (const [label, text] of [
    ["navn", rawName || name],
    ["beskrivelse", marketing],
    ["størrelse", size],
  ] as const) {
    if (text && BLISTER_HINT.test(text)) {
      return { isSB: true, confidence: "maybe", reason: `«${text.match(BLISTER_HINT)?.[0]}» i ${label}` };
    }
  }

  return { isSB: false, confidence: null, reason: "" };
}
