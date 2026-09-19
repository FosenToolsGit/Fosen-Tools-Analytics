/**
 * Feltdata og labdata for nøkkelsidene på fosen-tools.no.
 *   node --env-file=.env.local scripts/pagespeed-feltdata.mjs
 *
 * Krever PAGESPEED_API_KEY i .env.local. Nøkkelen lages gratis i Google Cloud —
 * se ~/Desktop/FT-pagespeed-nokkel.html for oppskriften.
 *
 * Feltdata (CrUX) er hva ekte besøkende opplevde siste 28 dager. Labdata
 * (Lighthouse) er én simulert måling. Feltdata er fasit; lab er diagnose.
 */
const KEY = process.env.PAGESPEED_API_KEY;
if (!KEY) { console.error("PAGESPEED_API_KEY mangler i .env.local. Oppskrift: ~/Desktop/FT-pagespeed-nokkel.html"); process.exit(1); }

const SIDER = [
  ["forsiden",            "https://fosen-tools.no/"],
  ["produktkatalogen",    "https://fosen-tools.no/produkter"],
  ["kategoriside",        "https://fosen-tools.no/produkter/verkt%C3%B8yvogner"],
  ["produsentside",       "https://fosen-tools.no/snapon"],
  ["produktside",         "https://fosen-tools.no/milwaukee/115322/luftbl%C3%A5ser-m18-bbl-0-milwaukee"],
  ["kampanjeside",        "https://fosen-tools.no/kampanjer/knipexkupp"],
  ["referansecase",       "https://fosen-tools.no/referanser/verktoyvogn_med_hjul"],
];

const ms = n => n == null ? "—" : n >= 1000 ? (n/1000).toFixed(2)+" s" : Math.round(n)+" ms";
const dom = (m, felt) => {
  const d = m?.[felt];
  if (!d) return null;
  return { p75: d.percentile, god: d.distributions?.[0]?.proportion, kat: d.category };
};
const pct = x => x == null ? "—" : (x*100).toFixed(0)+" %";

async function hent(url, strategy) {
  const q = new URLSearchParams({ url, strategy, key: KEY });
  for (const k of ["performance"]) q.append("category", k);
  const r = await fetch(`https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`);
  if (!r.ok) return { feil: `${r.status} ${(await r.text()).slice(0,120)}` };
  const j = await r.json();
  const felt = j.loadingExperience?.metrics;
  const origin = j.originLoadingExperience?.metrics;
  const lab = j.lighthouseResult?.audits;
  return {
    harFelt: !!felt,
    lcp: dom(felt, "LARGEST_CONTENTFUL_PAINT_MS") || dom(origin, "LARGEST_CONTENTFUL_PAINT_MS"),
    inp: dom(felt, "INTERACTION_TO_NEXT_PAINT") || dom(origin, "INTERACTION_TO_NEXT_PAINT"),
    cls: dom(felt, "CUMULATIVE_LAYOUT_SHIFT_SCORE") || dom(origin, "CUMULATIVE_LAYOUT_SHIFT_SCORE"),
    ttfb: dom(felt, "EXPERIMENTAL_TIME_TO_FIRST_BYTE") || dom(origin, "EXPERIMENTAL_TIME_TO_FIRST_BYTE"),
    fraOrigin: !felt && !!origin,
    score: j.lighthouseResult?.categories?.performance?.score,
    labLcp: lab?.["largest-contentful-paint"]?.numericValue,
    labTbt: lab?.["total-blocking-time"]?.numericValue,
    ubruktCss: lab?.["unused-css-rules"]?.details?.overallSavingsBytes,
    ubruktJs: lab?.["unused-javascript"]?.details?.overallSavingsBytes,
    renderBlokk: (lab?.["render-blocking-resources"]?.details?.items||[]).map(i=>i.url),
  };
}

const ut = [];
for (const [navn, url] of SIDER) {
  for (const strategy of ["mobile", "desktop"]) {
    process.stdout.write(`\r  måler ${navn} (${strategy}) …            `);
    ut.push({ navn, url, strategy, ...(await hent(url, strategy)) });
    await new Promise(s => setTimeout(s, 1200));
  }
}
console.log("\n");

console.log("═══ FELTDATA FRA EKTE BESØKENDE (CrUX, siste 28 dager) ═══");
console.log("  Terskler: LCP under 2,5 s · INP under 200 ms · CLS under 0,1\n");
console.log("  side              enhet      LCP   god%     INP   god%     CLS   TTFB   kilde");
for (const r of ut) {
  if (r.feil) { console.log(`  ${r.navn.padEnd(17)} ${r.strategy.padEnd(9)} FEIL ${r.feil}`); continue; }
  const k = r.harFelt ? "siden" : r.fraOrigin ? "hele domenet" : "ingen data";
  console.log(`  ${r.navn.padEnd(17)} ${r.strategy.padEnd(9)} ${ms(r.lcp?.p75).padStart(7)} ${pct(r.lcp?.god).padStart(6)} ${ms(r.inp?.p75).padStart(7)} ${pct(r.inp?.god).padStart(6)} ${String(r.cls?.p75 ?? "—").padStart(7)} ${ms(r.ttfb?.p75).padStart(7)}   ${k}`);
}

console.log("\n═══ LABDATA (Lighthouse) — diagnose ═══");
console.log("  side              enhet     score      LCP     TBT   ubrukt CSS   ubrukt JS");
for (const r of ut) {
  if (r.feil) continue;
  const kb = b => b == null ? "—" : Math.round(b/1024)+" kB";
  console.log(`  ${r.navn.padEnd(17)} ${r.strategy.padEnd(9)} ${(r.score!=null?Math.round(r.score*100):"—").toString().padStart(5)} ${ms(r.labLcp).padStart(8)} ${ms(r.labTbt).padStart(7)} ${kb(r.ubruktCss).padStart(12)} ${kb(r.ubruktJs).padStart(11)}`);
}

const blokk = new Map();
for (const r of ut) for (const u of r.renderBlokk||[]) blokk.set(u, (blokk.get(u)||0)+1);
if (blokk.size) {
  console.log("\n── ressurser som blokkerer opptegning ──");
  for (const [u,n] of [...blokk].sort((a,b)=>b[1]-a[1])) console.log(`  på ${n} målinger  ${u.slice(0,100)}`);
}
console.log("\nKjørt " + new Date().toLocaleString("nb-NO"));
