/**
 * Konverterer ISO 3166-1 alpha-2-koder til norske landnavn.
 * Brukes i Enkelprodukt-generatoren for å vise «Opprinnelsesland»
 * lesbart når XLSX-fila kun har 2-bokstavers landkode (f.eks. «CZ»).
 *
 * Returnerer landnavn på norsk hvis koden er kjent, ellers returnerer
 * inputen uendret (kan være fullt navn allerede, eller ukjent kode).
 */

const ISO2_TO_NB: Record<string, string> = {
  // Europa
  AT: "Østerrike",
  BE: "Belgia",
  BG: "Bulgaria",
  CH: "Sveits",
  CZ: "Tsjekkia",
  DE: "Tyskland",
  DK: "Danmark",
  EE: "Estland",
  ES: "Spania",
  FI: "Finland",
  FR: "Frankrike",
  GB: "Storbritannia",
  UK: "Storbritannia",
  GR: "Hellas",
  HR: "Kroatia",
  HU: "Ungarn",
  IE: "Irland",
  IS: "Island",
  IT: "Italia",
  LT: "Litauen",
  LU: "Luxembourg",
  LV: "Latvia",
  NL: "Nederland",
  NO: "Norge",
  PL: "Polen",
  PT: "Portugal",
  RO: "Romania",
  RS: "Serbia",
  SE: "Sverige",
  SI: "Slovenia",
  SK: "Slovakia",
  TR: "Tyrkia",
  UA: "Ukraina",
  // Asia
  CN: "Kina",
  HK: "Hongkong",
  ID: "Indonesia",
  IL: "Israel",
  IN: "India",
  JP: "Japan",
  KR: "Sør-Korea",
  MY: "Malaysia",
  PH: "Filippinene",
  SG: "Singapore",
  TH: "Thailand",
  TW: "Taiwan",
  VN: "Vietnam",
  // Nord-Amerika
  CA: "Canada",
  MX: "Mexico",
  US: "USA",
  // Sør-Amerika
  AR: "Argentina",
  BR: "Brasil",
  CL: "Chile",
  // Oseania
  AU: "Australia",
  NZ: "New Zealand",
  // Afrika
  EG: "Egypt",
  MA: "Marokko",
  ZA: "Sør-Afrika",
};

export function iso2ToCountry(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (trimmed.length === 0) return "";

  // Hvis det allerede er et fullt landnavn (>= 4 tegn), returner som-er
  if (trimmed.length >= 4) return trimmed;

  // Hvis 2 (eller 3) bokstaver — slå opp i tabellen
  const upper = trimmed.toUpperCase();
  if (ISO2_TO_NB[upper]) return ISO2_TO_NB[upper];

  // 3-bokstavs-koder vi har sett: behandle på samme måte (returner uendret hvis ikke i tabell)
  return trimmed;
}
