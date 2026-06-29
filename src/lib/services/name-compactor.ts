/**
 * Komprimerer leverandørens lange produktnavn til Multicase «Produktbeskrivelse 1»
 * (maks 40 tegn, UPPERCASE).
 *
 * Rekkefølge på navnet:
 *   1. TYPE («Hva er produktet?» — Sporskrutrekker, Pipenøkkel, Avbitertang osv.)
 *   2. STØRRELSE / PROFIL (PH2, TX10, 0.5x3.0x80, 13MM)
 *   3. SPESIFIKASJON (modellnummer som 3334, Kraftform Kompakt osv.)
 *   4. VDE (hvis applicable)
 *
 * Materialer (rustfritt stål osv.) dropp først hvis vi går over 40 tegn.
 */

export interface CompactNameResult {
  name: string;
  tags: string[];
}

/** Norske produkttype-keywords i prioritetsrekkefølge (mer spesifikke først) */
const TYPE_KEYWORDS: string[] = [
  // Klinger (utskiftbare) — VIKTIG: må sjekkes FØR skrutrekker fordi navnet ofte
  // ikke har «klinge», men marketing description har det
  "Utskiftbar klinge",
  "Adapterklinge",
  "Klinge",
  // Skrutrekkersett
  "Skrutrekkersett",
  // Skrutrekkere
  "Bitsskrutrekker",
  "Vinkelskrutrekker",
  "Sporskrutrekker",
  "Stjerneskrutrekker",
  "Pozidrivskrutrekker",
  "Torx-skrutrekker",
  "Sekskantskrutrekker",
  "Momentskrutrekker",
  "Skrutrekker",
  // Nøkler
  "Kombinasjonsnøkkel",
  "Pipenøkkel",
  "Fastnøkkel",
  "Ringnøkkel",
  "Skiftenøkkel",
  "Skrallenøkkel",
  "Momentnøkkel",
  "L-nøkkel",
  "Stjernenøkkel",
  "Slagnøkkel",
  "Hakenøkkel",
  // Tenger
  "Avbitertang",
  "Kombinasjonstang",
  "Vannpumpetang",
  "Spisstang",
  "Seegeringstang",
  "Universaltang",
  "Avisoleringstang",
  "Krympetang",
  "Boltekutter",
  "Rørkutter",
  "Blindmuttertang",
  "Gripetang",
  "Flattang",
  "Tang",
  // Spenningstester
  "Spenningstester",
  // Bits / tilbehør
  "Bitsholder",
  "Bitssett",
  "Bits",
];

// «Sett/serie»-keywords som ikke er produkt-typer alene men brukes som suffiks
const SERIES_HINTS: string[] = ["Kraftform", "Kompakt", "Micro", "Stubby", "Electronics", "ESD", "Joker", "Tool-Check"];

const SIZE_PATTERN = /\d+[.,]?\d*\s*[xX×]\s*\d+[.,]?\d*(?:\s*[xX×]\s*\d+[.,]?\d*)?\s*(?:MM)?/i;
const SINGLE_DIM_PATTERN = /\b\d+[.,]?\d*\s*MM\b/i;
const PROFILE_PATTERN = /\b(?:PH\s?\d{1,2}|PZ\s?\d{1,2}|TX\s?\d{1,3}|TIP\s?\d{1,3}|TR\s?\d{1,2}|HEX\s?\d{1,2}|SQ\s?\d{1,2})\b/i;
const VDE_PATTERN = /\bVDE\b/i;
const MODEL_PATTERN = /^\s*(\d{3,5}|\d{1,2}\.\d{1,3})\b/; // Wera 3334, 3335, 8000A osv. ved start

/**
 * Passform / drev — det viktigste søkekriteriet på skrutrekkere, bits og nøkler.
 * Norsk drive-vokabular i prioritetsrekkefølge (mest spesifikke først).
 * Brukes når navnet IKKE har en forkortet profil (PH2/TX10/HEX5) som allerede
 * forteller passformen. Søker i både navn og marketing-tekst.
 */
const DRIVE_KEYWORDS: Array<[RegExp, string]> = [
  [/\btorx[\s-]*plus\b|\bIP\d+\b/i, "TORX PLUS"],
  [/\btorx\b|\bTX\d+\b/i, "TORX"],
  [/\bpozidri[vw]\b|\bPZ\d+\b/i, "POZIDRIV"],
  [/\b(?:phillips|stjerne|kryssspor|kryss-spor)\b|\bPH\d+\b/i, "STJERNE"],
  [/\b(?:innvendig\s+sekskant|sekskant|sechskant|unbrako|hex[\s-]*plus|umbraco)\b|\bHEX\b/i, "SEKSKANT"],
  [/\b(?:firkant|vierkant|square\s*drive)\b/i, "FIRKANT"],
  [/\b(?:sporskrue|spor|slisset|slotted|rett\s*kjerv|schlitz)\b/i, "SPOR"],
];

/** Finner passform/drev fra tekst. Returnerer kort UPPERCASE-token, "" hvis ukjent. */
function detectDrive(text: string): string {
  if (!text) return "";
  for (const [re, label] of DRIVE_KEYWORDS) if (re.test(text)) return label;
  return "";
}

// Materialer / fyllord som strykes ved trang plass
const FILLER_PATTERNS: RegExp[] = [
  /\brustfritt\s+stål\b/gi,
  /\brustfritt\b/gi,
  /\bisolert\b/gi,
  /\bkromvanadium\b/gi,
  /\bkrom-vanadium\b/gi,
  /\bcr-v\b/gi,
  /\bmagnetisk\b/gi,
];

export function compactName(rawName: string, sizeContent?: string, marketingDesc?: string): CompactNameResult {
  const raw = (rawName || "").trim();
  const marketing = (marketingDesc || "").trim();
  const tags: string[] = [];

  // 1. Modellnummer fra start (Wera 3335 osv.)
  const modelMatch = raw.match(MODEL_PATTERN);
  const model = modelMatch ? modelMatch[1] : "";

  // 2. Type-keyword (søk i navn OG marketing description — viktig for klinge/blad-produkter
  //    der navnet ikke nevner type)
  const typeKeyword = detectType(raw) || detectType(marketing);

  // 2b. Passform / drev (SEKSKANT, TORX, SPOR ...) — det viktigste søkekriteriet.
  //     Hopp over hvis typen allerede inneholder passformen (f.eks. «Sporskrutrekker»).
  let drive = detectDrive(raw) || detectDrive(marketing);
  if (drive && typeKeyword && typeKeyword.toUpperCase().includes(drive.split(" ")[0])) drive = "";

  // 2c. Kulehode (ball end) → «M/KULE». Lav prioritet: vises bare hvis det er plass (droppes
  //     først ved 40-tegns-trimming). NB: Wera-prislisten har skrivefeilen «kulekode».
  const BALL_PATTERN = /\bkuleh?ode\b|\bkulekode\b|\bball[\s-]*end\b/i;
  const ball = BALL_PATTERN.test(raw) || BALL_PATTERN.test(marketing) ? "M/KULE" : "";

  // 3. Profile (PH2, TX10 etc.) — sjekk også «PZ 0 x 157mm»-mønsteret der profil og lengde står sammen
  let profile = "";
  let size = "";
  const profileWithLength = raw.match(/\b(PH|PZ|TX|TIP|TR|HEX|SQ)\s?(\d{1,3})\s*[xX×]\s*(\d+[.,]?\d*)\s*MM?/i);
  if (profileWithLength) {
    profile = `${profileWithLength[1].toUpperCase()}${profileWithLength[2]}`;
    size = `${profileWithLength[3].replace(",", ".")}MM`;
  } else {
    const profileMatch = raw.match(PROFILE_PATTERN);
    if (profileMatch) profile = profileMatch[0].replace(/\s+/g, "");
  }

  // Firkant-drev (square drive) — adapter-klinger for piper, f.eks. «1/4 piper», «1/4 x 154mm»
  // Mønsteret tar OGSÅ med lengden etter «x» så vi ikke mister 154mm-delen
  const SQUARE_DRIVE_WITH_LENGTH = /\b(1\/4|3\/8|1\/2|5\/8|3\/4|1-1\/2|1\.5)["”]?\s*[xX×]\s*(\d+[.,]?\d*)\s*MM?/i;
  const SQUARE_DRIVE_BARE = /\b(1\/4|3\/8|1\/2|5\/8|3\/4|1-1\/2|1\.5)["”]?\b/;
  let rawForSize = raw;
  const contextText = (raw + " " + (marketing || "")).toLowerCase();
  const isSquareDriveContext = /firkant|piper|socket|sockets|drive|driv|klinge|adapterklinge/.test(contextText);

  if (isSquareDriveContext && !profile) {
    const sqWithLen = raw.match(SQUARE_DRIVE_WITH_LENGTH);
    if (sqWithLen) {
      const driveSize = sqWithLen[1].replace(/\s+/g, "");
      profile = `${driveSize}"`;
      size = `${sqWithLen[2].replace(",", ".")}MM`;
      tags.push(`FIRKANT ${driveSize}"`);
      // Fjern hele mønsteret fra raw så SIZE_PATTERN ikke prøver å re-matche
      rawForSize = raw.replace(SQUARE_DRIVE_WITH_LENGTH, " ");
    } else {
      const sqBare = raw.match(SQUARE_DRIVE_BARE);
      if (sqBare) {
        const driveSize = sqBare[1].replace(/\s+/g, "");
        profile = `${driveSize}"`;
        tags.push(`FIRKANT ${driveSize}"`);
        const sqStripRe = new RegExp(`\\b${sqBare[1].replace(/\//g, "\\/")}["”]?\\s*[xX×]?\\s*`, "g");
        rawForSize = raw.replace(sqStripRe, " ");
      }
    }
  }

  if (profile) tags.push(profile);

  // 4. Size — fra navn eller sizeContent (hvis ikke allerede satt via profileWithLength).
  //    Splitter ut lengden i 3D-størrelser (NxNxN) — siste tall er typisk lengde:
  //    «0.5 x 3 x 80 mm» → «0.5X3 80MM». Skiller bedre mellom profil-mål og lengde.
  const normalize = (s: string) =>
    s.replace(/(\d),(\d)/g, "$1.$2").replace(/(\d)\s*[×xX]\s*(\d)/g, "$1x$2");
  const formatSize = (raw: string): string => {
    const cleaned = raw.replace(/\s+/g, "").replace(/MM$/i, "").toUpperCase();
    // Match 3D-dimensjon: NxNxN → splitt siste tall som lengde
    const m3d = cleaned.match(/^(\d+(?:\.\d+)?)X(\d+(?:\.\d+)?)X(\d+(?:\.\d+)?)$/);
    if (m3d) return `${m3d[1]}X${m3d[2]} ${m3d[3]}MM`;
    if (!cleaned.endsWith("MM") && /\d/.test(cleaned)) return cleaned + "MM";
    return cleaned;
  };
  // Tomme-brøk (hex-bits/imperiale skrutrekkere): «7/64"» er selve passform-målet og
  //  MÅ bevares — ellers kolliderer 7/64", 9/64", 5/32" til samme navn. Beholder også lengden.
  if (!size) {
    const inch = `${rawForSize} ${sizeContent ?? ""}`.match(/\b(\d{1,2}\/\d{1,2})\s*["”]/);
    if (inch) {
      const lenM = rawForSize.match(/[xX×]\s*(\d+[.,]?\d*)\s*MM/i);
      size = `${inch[1]}"` + (lenM ? ` ${lenM[1].replace(",", ".")}MM` : "");
    }
  }
  if (!size) {
    const sizeFromName = normalize(rawForSize).match(SIZE_PATTERN);
    if (sizeFromName) {
      size = formatSize(sizeFromName[0]);
    } else if (sizeContent) {
      const sc = normalize(sizeContent);
      const m = sc.match(SIZE_PATTERN);
      if (m) size = formatSize(m[0]);
    }
  }
  if (!size) {
    const single = normalize(rawForSize).match(SINGLE_DIM_PATTERN);
    if (single) size = formatSize(single[0]);
  }

  // 5. VDE
  const isVde = VDE_PATTERN.test(raw);
  if (isVde) tags.push("VDE");

  // Hent serie-hint (Kompakt, Micro, Stubby osv.)
  const seriesHints = SERIES_HINTS.filter((h) => new RegExp(`\\b${escapeReg(h)}\\b`, "i").test(raw));

  // En forkortet profil (PH2/TX10/HEX5) forteller allerede passformen → da er drive-ordet overflødig
  if (profile) drive = "";

  // Bygg første-utkast: TYPE → PASSFORM → M/KULE → PROFIL → STR → MODELL → VDE → SERIE
  // (M/KULE + serie er lav prioritet og droppes først ved trang plass)
  const parts: string[] = [];
  if (typeKeyword) parts.push(typeKeyword);
  if (drive) parts.push(drive);
  if (ball) parts.push(ball);
  if (profile) parts.push(profile);
  if (size) parts.push(size);
  if (model) parts.push(model);
  if (isVde) parts.push("VDE");
  if (seriesHints.length > 0) parts.push(seriesHints.join(" "));

  let candidate = parts.join(" ").toUpperCase().trim();

  // Hvis kandidat er for kort (lite info detektert) eller mangler type — fall tilbake til rensket rå navn
  if (!typeKeyword || candidate.length < 10) {
    let s = raw.toUpperCase();
    for (const p of FILLER_PATTERNS) s = s.replace(p, " ");
    s = s.replace(/,\s*/g, " ").replace(/\s{2,}/g, " ").trim();
    if (s.length <= 40) return { name: s, tags };
    return { name: s.slice(0, 40), tags };
  }

  // Hvis vi har fått en god kompakt versjon, returner
  if (candidate && candidate.length <= 40) {
    return { name: candidate, tags };
  }

  // Over 40 tegn — fjern serie-hint, så modell, så VDE i prioritetsrekkefølge (passform beholdes)
  if (candidate.length > 40) {
    candidate = [typeKeyword, drive, profile, size, model, isVde ? "VDE" : ""].filter(Boolean).join(" ").toUpperCase();
  }
  if (candidate.length > 40 && model) {
    candidate = [typeKeyword, drive, profile, size, isVde ? "VDE" : ""].filter(Boolean).join(" ").toUpperCase();
  }
  if (candidate.length > 40 && isVde) {
    candidate = [typeKeyword, drive, profile, size].filter(Boolean).join(" ").toUpperCase();
  }
  return { name: candidate.slice(0, 40).trim(), tags };
}

function detectType(text: string): string {
  if (!text) return "";

  // 1. Eksplisitte type-keywords (mest spesifikke først)
  for (const t of TYPE_KEYWORDS) {
    const re = new RegExp(`\\b${escapeReg(t)}\\b`, "i");
    if (re.test(text)) return t;
  }

  // 2. Heuristikk: norske substantiv-endinger som beskriver verktøy/produkter.
  //    Plukker det første ordet som ender på en slik suffiks i de første ~10 tokens.
  //    Gjør ukjente leverandør-typer (Wera, Knipex osv.) automatisk søkbare.
  const NOUN_SUFFIXES = [
    "klinge", "skrutrekker", "skrutrekkere", "nøkkel", "nøkler",
    "tang", "tester", "holder", "trekker", "kutter", "saks",
    "meisel", "hammer", "kniv", "bor", "fil", "linje", "stamp",
    "skive", "blad", "sett",
  ];
  const tokens = text
    .replace(/[,\.;\(\)\[\]\/]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4)
    .slice(0, 12);
  const STOP_PREFIXES = ["høykvalitets", "kraftform", "wera", "isolert", "rustfritt", "premium"];
  for (const tok of tokens) {
    const lower = tok.toLowerCase();
    if (STOP_PREFIXES.includes(lower)) continue;
    // Sjekk om token ender på en kjent norsk verktøy-suffiks
    for (const suffix of NOUN_SUFFIXES) {
      if (lower.endsWith(suffix.toLowerCase()) && lower.length <= 25) {
        // Returner ordet med stor forbokstav (uppercased av compactor uansett)
        return tok.replace(/^[a-zæøå]/, (c) => c.toUpperCase());
      }
    }
  }
  return "";
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
