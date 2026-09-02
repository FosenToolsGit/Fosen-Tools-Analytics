/**
 * Utleder YouTube-tags for Fosen Tools-videoer fra tittel + beskrivelse.
 *
 * Bakgrunn: yt-last-opp.mjs satte aldri tags, så alle 17 FT-videoene fra
 * august 2026 lå usøkbare på annet enn ordene i tittel og beskrivelse
 * (FTA-videoene hadde 11-12 tags hver). Funnet 2. september 2026.
 *
 * Tre videotyper på kanalen, med ulike behov:
 *   leveranse  — skreddersydd HDFI (Equinor, Offshore Kit, FT Systemvegg …)
 *   tips       — ett produkt fra ett merke («Ukens tips»)
 *   topp3      — tre produkter i en kategori («Ukens topp 3»)
 *
 * ⚠️ «norskprodusert» settes KUN på leveranse-videoer. Det er HDFI-en vi
 * produserer selv; en Bahco-nøkkel er ikke norskprodusert, og taggen ville
 * vært direkte feil. Se feedback_norskprodusert_ikke_brekstad i memory.
 */

const MERKER = [
  "Expert by Facom", "Fosen Tools Custom", "PB Swiss Tools", "Brockhaus Heuer",
  "Solid Gear", "Viking Arm", "KC Tools", "Snap-on", "Milwaukee", "Stahlwille",
  "Hultafors", "Husqvarna", "Leatherman", "Ledlenser", "Zweibrüder", "Mitutoyo",
  "Rennsteig", "Pelicase", "Bondhus", "Knipex", "Gedore", "Sumake", "Zarges",
  "Bahco", "Picard", "Facom", "Fluke", "Gigant", "Rivit", "Wera", "Lista",
];

// [mønster, tag] — første treff i tittel+beskrivelse gir taggen
const ORD = [
  [/verkt(ø|o)yvogn/, "verktøyvogn"],
  [/verkt(ø|o)ykasse|verkt(ø|o)ykoffert/, "verktøykasse"],
  [/verkstedinnredning|innredning til|benkerekk/, "verkstedinnredning"],
  [/systemvegg/, "FT Systemvegg"],
  [/bilverksted|mekaniker/, "bilverksted"],
  [/offshore/, "offshore"],
  [/brann|redningstjeneste|utrykning/, "brann og redning"],
  [/flyfag|hangar|luftfart|aviation/, "luftfart"],
  [/\bhammer|slegge/, "hammer"],   // \b hindrer treff på «borhammer»
  [/n(ø|o)kkel|fastn(ø|o)kkel/, "fastnøkler"],
  [/skralle/, "skralle"],
  [/batteriverkt(ø|o)y|18v|m12|m18/, "batteriverktøy"],
  [/tang|avisoler|stripp/, "tenger"],
  [/pipesett|pipen(ø|o)kkel|pipe /, "pipesett"],
  [/\bbits\b|bitssett/, "bits"],
  [/adapter|overgang/, "adapter"],
  [/trykkluft/, "trykkluftverktøy"],
  [/skuff/, "verktøyoppbevaring"],
];

/** @returns {string[]} 8-14 tags, aldri over YouTubes 500-tegnsgrense */
// Faste avsnitt som avslutter hver beskrivelse. De nevner verktøyvogner,
// verkstedinnredning og «skreddersydde løsninger» uansett hva videoen viser,
// så de må vekk før vi leter etter emneord — ellers arver alle videoer
// hverandres tags.
const BOILERPLATE = /^(fosen tools (lager|fører)|mer på|søk var|vil du ha|kontakt|#)/i;

export function tagsFor({ tittel = "", beskrivelse = "" }) {
  const full = `${tittel}\n${beskrivelse}`.toLowerCase();
  const t = [tittel, ...beskrivelse.split(/\n+/).filter((l) => !BOILERPLATE.test(l.trim()))]
    .join("\n").toLowerCase();
  const tags = new Set(["Fosen Tools", "verktøy", "proffverktøy"]);

  for (const m of MERKER) if (full.includes(m.toLowerCase())) tags.add(m);

  // Typen avgjøres av TITTELEN, ikke beskrivelsen. Alle beskrivelser slutter
  // med «Fosen Tools … lager skreddersydde løsninger», så leser vi hele
  // teksten blir en Facom-nøkkel tagget «norskprodusert» — direkte feil.
  const serie = /^ukens (tips|topp)/i.test(tittel.trim());
  const erLeveranse = !serie;
  if (erLeveranse) {
    for (const x of ["HDFI", "verktøykontroll", "skreddersydd verktøy", "norskprodusert"]) tags.add(x);
  } else {
    // Serie-videoer: «Ukens tips» og «Ukens topp 3» viser produkter vi fører.
    tags.add("verktøytips");
    // Håndverktøy kun når det faktisk er det — batteridrevet er noe annet.
    if (!/batteriverkt(ø|o)y|18v|m12|m18|batteri/.test(t)) tags.add("håndverktøy");
  }

  for (const [re, tag] of ORD) if (re.test(t)) tags.add(tag);

  // YouTube kutter over 500 tegn totalt; hold god margin.
  const ut = [];
  let n = 0;
  for (const tag of tags) {
    if (ut.length >= 14 || n + tag.length + 1 > 450) break;
    ut.push(tag); n += tag.length + 1;
  }
  return ut;
}
