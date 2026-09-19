/**
 * Feltdata og labdata for nøkkelsidene på fosen-tools.no.
 *   node --env-file=.env.local scripts/pagespeed-feltdata.mjs
 *
 * Ingen API-nøkkel nødvendig. PageSpeed Insights godtar OAuth fra GA4-tjeneste-
 * kontoen så lenge scopet er «openid» — cloud-platform og webmasters.readonly
 * gir derimot 403. Det er hele trikset.
 *
 * Feltdata (CrUX) er hva ekte besøkende opplevde siste 28 dager. Labdata
 * (Lighthouse) er én simulert måling på strupet 4G. Feltdata er fasit; lab er diagnose.
 */
import { GoogleAuth } from "google-auth-library";
const auth = new GoogleAuth({
  credentials: { client_email: process.env.GA4_CLIENT_EMAIL, private_key: (process.env.GA4_PRIVATE_KEY||"").replace(/\\n/g,"\n") },
  scopes: ["openid"],
});
const { token } = await (await auth.getClient()).getAccessToken();

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
// CrUX rapporterer CLS som heltall ×100: 30 betyr 0,30.
const dom = (m, felt) => {
  const d = m?.[felt];
  if (!d) return null;
  const skala = felt === "CUMULATIVE_LAYOUT_SHIFT_SCORE" ? 100 : 1;
  return { p75: d.percentile / skala, god: d.distributions?.[0]?.proportion, kat: d.category };
};
const pct = x => x == null ? "—" : (x*100).toFixed(0)+" %";

async function hent(url, strategy) {
  const q = new URLSearchParams({ url, strategy, category: "performance" });
  const r = await fetch(`https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`,
    { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return { feil: `${r.status} ${(await r.text()).slice(0,120)}` };
  const j = await r.json();
  // origin_fallback=true betyr at CrUX ikke har nok data for denne URL-en
  // og svarer med tall for hele domenet i stedet.
  const perSide = j.loadingExperience && !j.loadingExperience.origin_fallback;
  const felt = perSide ? j.loadingExperience.metrics : null;
  const origin = (j.originLoadingExperience || j.loadingExperience)?.metrics;
  const lab = j.lighthouseResult?.audits;
  return {
    harFelt: !!felt,
    fallback: !!j.loadingExperience?.origin_fallback,
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
console.log("  Terskler: LCP under 2,5 s · INP under 200 ms · CLS under 0,1");
console.log("  NB: har CrUX for lite data for én URL, svarer den med tall for hele domenet.\n");
console.log("  side              enhet      LCP   god%     INP   god%     CLS   TTFB   kilde");
for (const r of ut) {
  if (r.feil) { console.log(`  ${r.navn.padEnd(17)} ${r.strategy.padEnd(9)} FEIL ${r.feil}`); continue; }
  const k = r.harFelt ? "siden" : r.fallback ? "hele domenet (for lite data per side)" : "ingen data";
  console.log(`  ${r.navn.padEnd(17)} ${r.strategy.padEnd(9)} ${ms(r.lcp?.p75).padStart(7)} ${pct(r.lcp?.god).padStart(6)} ${ms(r.inp?.p75).padStart(7)} ${pct(r.inp?.god).padStart(6)} ${(r.cls?.p75!=null?r.cls.p75.toFixed(2):"—").padStart(7)} ${ms(r.ttfb?.p75).padStart(7)}   ${k}`);
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
