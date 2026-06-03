/**
 * finn-pa-lager.mjs — finn FT-produkter som er på lager + priset + har bilde.
 *
 *   node scripts/finn-pa-lager.mjs --merke wera [--limit 12]
 *
 * Returnerer produkter sortert på pris (lavest først av de "ikke trivielle"),
 * klar til å brukes som leverandør-/produkt-tips i torsdag-rytmen.
 */

const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
}

const merke = arg("merke", "wera");
const limit = parseInt(arg("limit", "12"));
const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

console.log(`🔍 Henter ${merke}-katalogen fra fosen-tools.no...\n`);

// 1. Hent alle produkt-IDer
const listHtml = await fetch(`https://fosen-tools.no/${merke}`, { headers: { "User-Agent": UA } }).then(r => r.text());
const idSet = new Set();
for (const m of listHtml.matchAll(new RegExp(`/${merke}/(\\d+)`, "g"))) idSet.add(m[1]);
const ids = [...idSet];
console.log(`📦 Fant ${ids.length} produkt-IDer\n`);

// 2. Scrape hver — navn, pris, lager, bilde
async function scrapeOne(id) {
  const html = await fetch(`https://fosen-tools.no/${merke}/${id}`, { headers: { "User-Agent": UA } }).then(r => r.text());
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    const json = JSON.parse(m[1]);
    const arr = Array.isArray(json) ? json : [json];
    const p = arr.find(x => x["@type"] === "Product" || x["@type"] === "ProductGroup");
    if (!p) return null;
    const offer = p.offers || (Array.isArray(p.offers) ? p.offers[0] : null);
    const offers = Array.isArray(p.offers) ? p.offers : (p.offers ? [p.offers] : []);
    // ProductGroup kan ha flere offers (varianter) — bruke første in-stock
    const inStockOffer = offers.find(o => o.availability?.includes("InStock"));
    const offerToUse = inStockOffer || offers[0];
    const price = parseFloat(offerToUse?.price || 0);
    const inStock = offerToUse?.availability?.includes("InStock") || false;
    const image = Array.isArray(p.image) ? p.image[0] : p.image;
    return {
      id,
      navn: p.name || "",
      pris: price,
      lager: inStock,
      bilde: image || null,
      url: `https://fosen-tools.no/${merke}/${id}`,
    };
  } catch { return null; }
}

const produkter = [];
const BATCH = 8;
for (let i = 0; i < ids.length; i += BATCH) {
  const batch = ids.slice(i, i + BATCH);
  const r = await Promise.all(batch.map(scrapeOne));
  produkter.push(...r.filter(Boolean));
  process.stdout.write(`\r  ${produkter.length}/${ids.length}`);
}
console.log(`\n`);

// 3. Filter: på lager + pris > 0 + har bilde
const valgbare = produkter.filter(p => p.lager && p.pris > 0 && p.bilde);
console.log(`✅ ${valgbare.length} produkter på lager med pris + bilde\n`);

// 4. Sorter på pris stigende
valgbare.sort((a, b) => a.pris - b.pris);

// 5. Skriv ut topp N i tabell-form
console.log(`Topp ${Math.min(limit, valgbare.length)} (sortert på pris):\n`);
console.log("PRIS       NAVN                                             ID       URL");
console.log("─".repeat(120));
for (const p of valgbare.slice(0, limit)) {
  const prisStr = `${p.pris.toFixed(0).padStart(6)} kr`;
  const navn = p.navn.slice(0, 50).padEnd(50);
  console.log(`${prisStr}  ${navn}  ${p.id.padEnd(8)} ${p.url}`);
}

// 6. Skriv JSON-fil med toppene for videre bruk
const out = `scripts/data/${merke}-pa-lager.json`;
const fs = await import("node:fs");
fs.writeFileSync(out, JSON.stringify(valgbare.slice(0, limit), null, 2));
console.log(`\n💾 ${out}`);
