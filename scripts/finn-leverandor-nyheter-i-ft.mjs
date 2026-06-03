/**
 * Match leverandørs nyhetsliste mot FT-sortimentet.
 *
 * Bruker:
 *  - Q2 2026-modellkoder fra Milwaukee-PDFen (hardkodet for nå)
 *  - Lister alle Milwaukee-produkter fra fosen-tools.no
 *  - Returnerer kun de Q2-nyhetene som ER på lager / i sortimentet
 *
 *   node scripts/finn-leverandor-nyheter-i-ft.mjs
 */

// (ikke Playwright — bruker bare URL-IDene + scrape navn fra hver produktside via Googlebot)

// Q2 2026 modellkoder fra Milwaukee-PDFen (norsk prisliste)
const Q2_MODELLER = [
  { kode: "FIR14G2", navn: "M12 FUEL 1/4\" skralle", pris: 4090 },
  { kode: "FIR38G2", navn: "M12 FUEL 3/8\" skralle", pris: 4090 },
  { kode: "FIR12G2", navn: "M12 FUEL 1/2\" skralle", pris: 4090 },
  { kode: "FPS55", navn: "M18 FUEL dykksag", pris: 6525 },
  { kode: "FHSAGSV", navn: "M18 FUEL ONE-KEY 125 mm vinkelsliper", pris: 8750 },
  { kode: "LAF-0", navn: "M18 vifte", pris: 3150 },
  { kode: "BLCV2", navn: "M18 børsteløs støvsuger", pris: 2390 },
  { kode: "SMP2", navn: "MX FUEL lensepumpe", pris: 30690 },
  { kode: "IRPSUOP6", navn: "ROLL-ON strømforsyning 6.0 kWh", pris: 114290 },
  { kode: "FCST", navn: "M18 FUEL avmantlingsverktøy", pris: 16375 },
  { kode: "BLRP", navn: "M18 tømmeaggregat", pris: 20290 },
  { kode: "FRGRO2", navn: "M18 FUEL rillemaskin", pris: 32325 },
  { kode: "EFP-0", navn: "MX FUEL elektromuffesveisemaskin", pris: 55250 },
  { kode: "EFP-802", navn: "MX FUEL elektromuffesveisemaskin (m/batterier)", pris: 79025 },
];

console.log(`🔍 Søker etter ${Q2_MODELLER.length} Q2 2026-modeller på fosen-tools.no...\n`);

// 1. Hent alle Milwaukee-IDer fra katalog-siden via Googlebot UA
const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const listHtml = await fetch("https://fosen-tools.no/milwaukee", { headers: { "User-Agent": UA } }).then(r => r.text());
const idSet = new Set();
for (const m of listHtml.matchAll(/\/milwaukee\/(\d+)/g)) idSet.add(m[1]);
const idList = [...idSet];
console.log(`📦 Fant ${idList.length} Milwaukee-produkt-IDer i katalogen\n`);

// 2. For hver, hent navn fra JSON-LD via parallel fetch (begrenset til 8 om gangen)
async function fetchNavn(id) {
  const html = await fetch(`https://fosen-tools.no/milwaukee/${id}`, { headers: { "User-Agent": UA } }).then(r => r.text());
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[1]);
    const o = Array.isArray(obj) ? obj.find(x => x["@type"] === "Product" || x["@type"] === "ProductGroup") : obj;
    return { id, navn: o?.name || "", url: `https://fosen-tools.no/milwaukee/${id}` };
  } catch { return null; }
}

const produkter = [];
const BATCH = 8;
for (let i = 0; i < idList.length; i += BATCH) {
  const batch = idList.slice(i, i + BATCH);
  const results = await Promise.all(batch.map(fetchNavn));
  produkter.push(...results.filter(Boolean));
  process.stdout.write(`\r  ${produkter.length}/${idList.length} produkter scrapet`);
}
console.log(`\n`);

const treff = [];
for (const q2 of Q2_MODELLER) {
  const matches = produkter.filter((p) =>
    p.navn.toUpperCase().replace(/[\s-]/g, "").includes(q2.kode.toUpperCase().replace(/[\s-]/g, "")),
  );
  if (matches.length > 0) {
    treff.push({ q2, matches });
  }
}

if (treff.length === 0) {
  console.log("❌ Ingen av Q2-nyhetene er lagt inn i FT-katalogen ennå.");
} else {
  console.log(`✅ ${treff.length} Q2-nyhet${treff.length === 1 ? "" : "er"} er allerede i FT-sortimentet:\n`);
  for (const { q2, matches } of treff) {
    console.log(`  ${q2.kode} — ${q2.navn} (~${q2.pris} kr)`);
    for (const m of matches.slice(0, 3)) {
      console.log(`    → ${m.navn || "(uten navn)"}`);
      console.log(`      ${m.url}`);
    }
  }
}
