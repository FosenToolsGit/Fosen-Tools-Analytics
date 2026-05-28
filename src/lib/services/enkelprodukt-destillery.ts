/**
 * Destillerer raw scraped data fra Enkelprodukt-scraperen til ferdig
 * Multicase-import-data via Gemini. Produserer:
 *   - Produktbeskrivelse 1 (kort, 1-2 setninger, salgs-vinkling)
 *   - Produktbeskrivelse 2 (lengre, 3-5 setninger, faglig)
 *   - Produktinformasjon (rik HTML med h3/ul/table)
 *   - Foreslått Gruppenivå 1/2/3
 *   - Foreslått produsent
 *   - Foreslått enhet (stk/sett/paret/m/kg/pakke)
 */

import { classify } from "./produktgruppe-classifier";
import { buildEnkelproduktSeoHtml } from "./enkelprodukt-seo-html";
import type { ScrapedRaw } from "./enkelprodukt-scraper";

export interface DestilledProduct {
  /** Produktnavn — interndata, settes lik Beskrivelse 1 */
  name: string;
  /** Produsent (validert mot kjente FT-merker) */
  produsent: string;
  /** Enhet: stk / sett / paret / m / kg / pakke */
  enhet: string;
  /** Multicase Gruppenivå 1/2/3 */
  gruppenivaa_1: string;
  gruppenivaa_2: string;
  gruppenivaa_3: string;
  /** Beskrivelse 1 = produktnavnet (kort, norsk, max 40 tegn — Multicase-konvensjon) */
  produktbeskrivelse_1: string;
  /** Beskrivelse 2 = «{MPN} - {Produsent}» max 40 tegn — Wera-import-mønster */
  produktbeskrivelse_2: string;
  /** Rik HTML for "Produktinformasjon"-feltet: h3/ul/table */
  produktinformasjon: string;
  /** Original-data så operatør kan se hva som kom fra scrape */
  source_url: string;
  ean: string | null;
  mpn: string | null;
  price_now: number | null;
  price_before: number | null;
  currency: string | null;
  /** B2B-priser (hentet fra HTML-paste når brukeren krysset av "Hent kostpris/listepris") */
  kostpris: number | null;
  listepris: number | null;
  /** Opprinnelsesland (fra XLSX/scrape — eks. «Tyskland» eller «Vet ikke» hvis ikke oppgitt) */
  opprinnelsesland: string;
  /** Vurderings-flagg fra AI om kvaliteten på destilleringen */
  ai_notes: string;
}

const MAX_BESKR = 40;

/**
 * Bygger Beskrivelse 1 etter Wera-konvensjonen:
 *   (HVA DET ER) (KODE/PROFIL) (DIMENSJON/SPESIFIKASJONER)
 *
 * Eksempler:
 *   Wera 800/1 PZ/S 2 × 100 → «KLINGE PZ/S 2 100MM VDE KRAFTFORM»
 *   Snickers 6943 KL2 HL    → «BUKSE 6943 KL2 HL» (bruker fyller på farge/STR)
 *
 * Auto-fyller det som kan detekteres fra tittel/beskrivelse:
 *  - Produkttype (BUKSE, SKRUTREKKER, MOMENTNØKKEL, KLINGE, ...)
 *  - Modellkode (mpn ?? model_code)
 *  - Spec-forkortelser (KL2, HL, VDE, 1000V, PZ/S, ESD, ...)
 *  - Dimensjoner (mm i tittel)
 *
 * Farge og størrelse må fylles MANUELT i UI fordi de er typisk
 * variant-spesifikke og ikke ligger i fellesdatabladet.
 */
const PRODUCT_TYPES: Array<[RegExp, string]> = [
  // Klær / verneutstyr — spesifikke typer FØR generiske (rekkefølge avgjør)
  [/\barbeidsbukse|trouser/i, "BUKSE"],
  [/\bbukse(?!sele)/i, "BUKSE"],
  [/\bskalljakke|skalljacka|shell jacket/i, "SKALLJAKKE"],
  [/\bvinterjakke|winter jacket|winterjacket/i, "VINTERJAKKE"],
  [/\bfleecejakke|fleecejacka|fleece jacket/i, "FLEECEJAKKE"],
  [/\bsoftshell.{0,12}jakke|softshell jacket/i, "SOFTSHELL"],
  [/\bregnjakke|rain jacket/i, "REGNJAKKE"],
  [/\barbeidsjakke|work jacket/i, "JAKKE"],
  [/\bjakke|jacket/i, "JAKKE"],
  [/\bt-skjorte|t-shirt|tee-shirt|piké|piket/i, "T-SKJORTE"],
  [/\bskjorte|shirt/i, "SKJORTE"],
  [/\bgenser|sweater|hoodie/i, "GENSER"],
  [/\bvest\b/i, "VEST"],
  [/\bregntøy|regndress/i, "REGNTØY"],
  [/\bvernesko|safety boot|safety shoe/i, "VERNESKO"],
  [/\bhansker|gloves/i, "HANSKER"],
  [/\bhjelm|helmet/i, "HJELM"],
  [/\bvernebriller|safety glasses/i, "BRILLER"],
  [/\bhørselvern|hearing protect/i, "HØRSELVERN"],
  // Verktøy — håndholdt
  [/\bmomentnøkkel|torque wrench/i, "MOMENTNØKKEL"],
  [/\bskiftenøkkel|adjustable wrench/i, "SKIFTENØKKEL"],
  [/\bfastnøkkel|combination wrench/i, "FASTNØKKEL"],
  [/\bpipenøkkel|socket wrench/i, "PIPENØKKEL"],
  [/\bskralle\b|ratchet/i, "SKRALLE"],
  [/\bskrutrekker|screwdriver/i, "SKRUTREKKER"],
  [/\bklinge|blade/i, "KLINGE"],
  [/\bbits?\b/i, "BITS"],
  [/\bhammer/i, "HAMMER"],
  [/\btang|pliers/i, "TANG"],
  [/\bavbiter|cutter/i, "AVBITER"],
  [/\bkutter|knife|kniv\b/i, "KNIV"],
  [/\bsag\b|saw/i, "SAG"],
  // Eldrevet
  [/\bdrill|boremaskin/i, "DRILL"],
  [/\bmuttertrekker|impact wrench/i, "MUTTERTREKKER"],
  [/\bvinkelsliper|angle grinder/i, "VINKELSLIPER"],
  [/\bstikksag|jigsaw/i, "STIKKSAG"],
  // Belysning / måling
  [/\blommelykt|hodelykt|pannelampe|flashlight|headlamp/i, "LYKT"],
  [/\bmultimeter/i, "MULTIMETER"],
  [/\bskyvelære|caliper/i, "SKYVELÆRE"],
  // Storage
  [/\bverktøykoffert|tool case/i, "KOFFERT"],
  [/\bverktøyvogn|tool cart|trolley/i, "VOGN"],
  [/\bverktøyskap|tool cabinet/i, "SKAP"],
  [/\bpelicase|protector case/i, "PELICASE"],
  [/\bsekk|bag\b/i, "SEKK"],
  // Konsept
  [/\bsett\b|\bset\b|\bkit\b/i, "SETT"],
];

const SPEC_ABBREV: Array<[RegExp, string]> = [
  // Verneklasse
  [/klasse\s*1\b|class\s*1\b|\bkl\.?\s*1\b/i, "KL1"],
  [/klasse\s*2\b|class\s*2\b|\bkl\.?\s*2\b/i, "KL2"],
  [/klasse\s*3\b|class\s*3\b|\bkl\.?\s*3\b/i, "KL3"],
  // Klær-features
  [/hylsterlomm/i, "HL"],
  [/kneputelomm|kneeguard/i, "KP"],
  [/cordura/i, "CRD"],
  // Elektrisk
  [/\bvde\b/i, "VDE"],
  [/1000\s*v/i, "1000V"],
  [/\besd\b/i, "ESD"],
  [/\biec\s*60900/i, "IEC60900"],
  // Skrutrekker-profiler
  [/\bpz\/s\b|pozidriv\/slot/i, "PZ/S"],
  [/\bph\b(?!\d)/i, "PH"],
  [/\bpz\b(?!\d)/i, "PZ"],
  [/\btorx\b|\btx\b/i, "TX"],
  [/\bsekskant\b|hex\b/i, "HEX"],
  // Tetthet
  [/\bipx?7\b/i, "IP7"],
  [/\bipx?8\b/i, "IP8"],
  [/vanntett|waterproof/i, "VT"],
  // Kalibrering
  [/kalibrert|calibrated/i, "KAL"],
  [/\bdin\s*en\s*iso\s*6789/i, "ISO6789"],
];

/** Forkort en produkttittel til Wera-stil compact-kode. */
export function buildBeskrivelse1Compact(
  rawTitle: string,
  modelCode: string | null | undefined,
  mpn: string | null | undefined,
  context: string,
): string {
  const haystack = `${rawTitle} ${context}`.toLowerCase();

  // 1) Produkttype
  let typeCode = "";
  for (const [re, code] of PRODUCT_TYPES) {
    if (re.test(haystack)) { typeCode = code; break; }
  }

  // 2) Kode-token: foretrekk mpn (leverandørproduktnummer), fallback model_code
  const codeToken = ((mpn ?? "") || (modelCode ?? "")).trim();

  // 3) Spec-forkortelser (i prioritert rekkefølge, uten duplikater)
  const specsAdded: string[] = [];
  for (const [re, code] of SPEC_ABBREV) {
    if (re.test(haystack) && !specsAdded.includes(code)) specsAdded.push(code);
    if (specsAdded.length >= 6) break;
  }

  // 4) Dimensjon (mm-treff i tittel/beskrivelse)
  const dimMatch = haystack.match(/(\d+(?:[.,]\d+)?)\s*mm\b/);
  const dimToken = dimMatch ? `${dimMatch[1].replace(",", ".")}MM` : "";

  // 5) Bygg ved å legge tokens i prioritert rekkefølge inntil 40 tegn
  const tokens: string[] = [];
  if (typeCode) tokens.push(typeCode);
  if (codeToken) tokens.push(codeToken.toUpperCase());
  for (const s of specsAdded) tokens.push(s);
  if (dimToken && !tokens.includes(dimToken)) tokens.push(dimToken);

  let result = "";
  for (const t of tokens) {
    const next = result ? `${result} ${t}` : t;
    if (next.length > MAX_BESKR) break;
    result = next;
  }

  // Fallback: hvis ingenting matchet, bruk gammel UPPERCASE-tittel-logikk
  if (!result) {
    return (rawTitle || "").toUpperCase().slice(0, MAX_BESKR);
  }
  return result.slice(0, MAX_BESKR);
}

/**
 * Bygger Beskrivelse 2 etter Wera-import-mønsteret: «{MPN} - {Produsent}»
 * truncert til 40 tegn. Brukes både ved første destillering og når
 * MPN/produsent endres manuelt i UI.
 */
export function buildBeskrivelse2(
  mpn: string | null | undefined,
  produsent: string | null | undefined,
): string {
  const m = (mpn ?? "").trim();
  const p = (produsent ?? "").trim();
  if (m && p) return `${m} - ${p}`.slice(0, MAX_BESKR);
  if (p) return p.slice(0, MAX_BESKR);
  if (m) return m.slice(0, MAX_BESKR);
  return "";
}

/**
 * Hovedfunksjon: scrape → regel-basert klassifisering → produserer Multicase-felter.
 * INGEN Gemini-kall — deterministisk og raskt.
 *
 * - G1/G2/G3: produktgruppe-classifier (regel-basert)
 * - Beskrivelse 1: scrape title i CAPS, max 40 tegn
 * - Beskrivelse 2: «{MPN} - {Produsent}» Wera-mønster
 * - Produktinformasjon: SEO-rik HTML fra `buildEnkelproduktSeoHtml` (template-basert,
 *   etterligner Gemini-stilen med H2 + H3 + bruksområder + brand-positioning)
 */
export async function destillProduct(raw: ScrapedRaw): Promise<DestilledProduct> {
  // Regel-basert klassifisering (autoritativ — ingen Gemini-overstyring)
  const cls = classify(raw.title, raw.description_long || raw.description_short);
  const produsent = raw.manufacturer || "";
  // Beskrivelse 1: Wera-stil compact-kode (TYPE + KODE + SPESIFIKASJONER)
  const beskr1Context = [
    raw.description_short,
    raw.description_long,
    raw.bullets.join(" "),
  ].filter(Boolean).join(" ");
  const beskr1 = buildBeskrivelse1Compact(raw.title || "", raw.model_code, raw.mpn, beskr1Context);
  const beskr2 = buildBeskrivelse2(raw.mpn, produsent);

  return {
    name: beskr1,
    produsent,
    enhet: detectEnhet(raw.title),
    gruppenivaa_1: cls.g1 || "",
    gruppenivaa_2: cls.g2 || "",
    gruppenivaa_3: cls.g3 || "",
    produktbeskrivelse_1: beskr1,
    produktbeskrivelse_2: beskr2,
    produktinformasjon: buildEnkelproduktSeoHtml({
      raw,
      produsent,
      g1: cls.g1,
      g2: cls.g2,
      g3: cls.g3,
      ean: raw.ean,
      mpn: raw.mpn,
    }),
    ai_notes: cls.g1
      ? `Klassifisert deterministisk: ${cls.g1} > ${cls.g2} > ${cls.g3}.`
      : "Ingen klassifiseringsregel matchet — velg G1/G2/G3 manuelt.",
    source_url: raw.source_url,
    ean: raw.ean,
    mpn: raw.mpn,
    price_now: raw.price_now,
    price_before: raw.price_before,
    currency: raw.currency,
    kostpris: raw.kostpris,
    listepris: raw.listepris,
    opprinnelsesland: "Vet ikke",
  };
}

/** Detekterer enhet (stk/sett/pakke) fra produkt-tittel. Default: stk. */
function detectEnhet(title: string): string {
  const t = title.toLowerCase();
  if (/\bsett\b|\bset\b|kit\b|koffert/.test(t)) return "sett";
  if (/\bpaket\b|\bpakke\b|pack\b/.test(t)) return "pakke";
  if (/\bpar\b|paret/.test(t)) return "paret";
  if (/\brull(?:er)?\b|\broll/.test(t)) return "rull";
  return "stk";
}

