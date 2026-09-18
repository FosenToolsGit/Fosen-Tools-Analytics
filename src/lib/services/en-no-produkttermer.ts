/**
 * Engelsk → norsk produkttermer. Brukes når kilden er en engelskspråklig
 * leverandørportal (Milwaukee/TTI, Snickers) slik at klassifiseringen og
 * navne-kompaktoren — som begge er bygget på norske ord — treffer.
 *
 * Oversetter KUN produkttypen (substantivet), ikke hele setninger.
 */
const TERMER: Array<[RegExp, string]> = [
  // meisel / dor
  [/\bflat chisel\b|\bchisel\b/gi, "meisel"],
  [/\bpoint chisel\b|\bpointed chisel\b/gi, "spissmeisel"],
  [/\bscaling chisel\b/gi, "skrapemeisel"],
  [/\bcenter punch\b|\bcentre punch\b/gi, "kjørner"],
  // bor
  [/\bhammer drill bit\b|\bdrill bit\b|\bhammer bit\b/gi, "bor"],
  [/\bhole saw\b/gi, "hullsag"],
  [/\bcore bit\b/gi, "kjernebor"],
  // måling / laser
  [/\bplane laser\b|\bline laser\b|\blaser level\b|\blaser\b/gi, "laser"],
  [/\blaser distance meter\b|\bdistance meter\b/gi, "avstandsmåler"],
  [/\bspirit level\b|\blevel\b(?!l)/gi, "vater"],
  [/\btape measure\b|\bmeasuring tape\b/gi, "målebånd"],
  // maskiner
  [/\bimpact wrench\b/gi, "muttertrekker"],
  [/\bimpact driver\b/gi, "slagskrutrekker"],
  [/\bpercussion drill\b|\bhammer drill\b/gi, "borhammer"],
  [/\brotary hammer\b/gi, "borhammer"],
  [/\bangle grinder\b/gi, "vinkelsliper"],
  [/\bcircular saw\b/gi, "sirkelsag"],
  [/\breciprocating saw\b/gi, "bajonettsag"],
  [/\bjigsaw\b/gi, "stikksag"],
  [/\bdrill driver\b|\bdrill\/driver\b/gi, "drill"],
  [/\bwork light\b|\bflood light\b|\bflashlight\b|\btorch\b/gi, "lykt"],
  [/\bvacuum cleaner\b|\bwet\/dry vac\b/gi, "støvsuger"],
  // håndverktøy
  [/\bpliers\b/gi, "tang"],
  [/\bside cutter\b|\bdiagonal cutter\b/gi, "avbiter"],
  [/\bscrewdriver\b/gi, "skrutrekker"],
  [/\bwrench\b|\bspanner\b/gi, "nøkkel"],
  [/\bhammer\b/gi, "hammer"],
  [/\bknife\b/gi, "kniv"],
  [/\btape\b(?=\s|$)/gi, "tape"],
  // oppbevaring / annet
  [/\bbaseball cap\b|\bcap\b(?!acit)/gi, "caps"],
  [/\bbeanie\b|\bknitted hat\b/gi, "lue"],
  [/\btool box\b|\btoolbox\b/gi, "verktøykasse"],
  [/\borganiser\b|\borganizer\b/gi, "organiser"],
  [/\bbattery pack\b|\bbattery\b/gi, "batteri"],
  [/\bcharger\b/gi, "lader"],
];

/** Erstatter engelske produkttermer med norske i en tittel/beskrivelse. */
export function tilNorskeTermer(tekst: string): string {
  let ut = tekst || "";
  for (const [re, no] of TERMER) ut = ut.replace(re, no);
  return ut;
}

/** true hvis teksten inneholder minst én kjent engelsk produktterm. */
export function harEngelskTerm(tekst: string): boolean {
  return TERMER.some(([re]) => { re.lastIndex = 0; return re.test(tekst || ""); });
}

const LAND: Record<string, string> = {
  DE: "Tyskland", CN: "Kina", TW: "Taiwan", CZ: "Tsjekkia", PL: "Polen", IT: "Italia",
  FR: "Frankrike", ES: "Spania", US: "USA", JP: "Japan", KR: "Sør-Korea", IN: "India",
  SE: "Sverige", NO: "Norge", DK: "Danmark", FI: "Finland", NL: "Nederland",
  AT: "Østerrike", CH: "Sveits", GB: "Storbritannia", UK: "Storbritannia",
  VN: "Vietnam", TH: "Thailand", MY: "Malaysia", TR: "Tyrkia", HU: "Ungarn",
  SK: "Slovakia", RO: "Romania", PT: "Portugal", BE: "Belgia", MX: "Mexico",
  ID: "Indonesia", BD: "Bangladesh", PK: "Pakistan", LK: "Sri Lanka", KH: "Kambodsja",
  MA: "Marokko", TN: "Tunisia", EE: "Estland", LT: "Litauen", LV: "Latvia",
  BG: "Bulgaria", SI: "Slovenia", HR: "Kroatia", RS: "Serbia", UA: "Ukraina",
};

/** Slår opp opprinnelsesland i spec-tabellen. Returnerer «Vet ikke» hvis ikke oppgitt. */
export function landFraSpecs(specs: Array<{ key: string; value: string }>): string {
  const rad = specs.find((s) => /country of origin|opprinnelse|made in|produksjonsland/i.test(s.key));
  const v = (rad?.value || "").trim();
  if (!v) return "Vet ikke";
  const kode = v.toUpperCase().replace(/[^A-Z]/g, "");
  if (kode.length === 2 && LAND[kode]) return LAND[kode];
  return v;
}
