/**
 * Bing Webmaster Tools — trafikk, søkeord og sider.
 *   node --env-file=.env.local scripts/bing-stats.mjs
 * Krever BING_WEBMASTER_API_KEY i .env.local (bing.com/webmasters → tannhjul → API access).
 */
const K = process.env.BING_WEBMASTER_API_KEY;
const SITE = "https://fosen-tools.no/";
const BASE = "https://ssl.bing.com/webmaster/api.svc/json";

if (!K) { console.error("BING_WEBMASTER_API_KEY mangler i .env.local"); process.exit(1); }

async function kall(metode, params = {}) {
  const q = new URLSearchParams({ apikey: K, siteUrl: SITE, ...params });
  const r = await fetch(`${BASE}/${metode}?${q}`, { headers: { Accept: "application/json" } });
  const t = await r.text();
  if (!r.ok) throw new Error(`${metode}: ${r.status} ${t.slice(0, 200)}`);
  return JSON.parse(t).d;
}

/** Bing sender datoer som /Date(1756...)/ */
const dato = (s) => {
  const m = /\/Date\((\d+)/.exec(String(s));
  return m ? new Date(+m[1]).toISOString().slice(0, 10) : String(s);
};
const pct = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(2) + " %" : "–");

const tall = (x) => String(x).padStart(6);

console.log("BING WEBMASTER — fosen-tools.no\n");

// 1. Daglig trafikk
try {
  const rader = (await kall("GetRankAndTrafficStats")).map(r => ({
    d: dato(r.Date), klikk: r.Clicks || 0, visn: r.Impressions || 0,
  })).sort((a, b) => a.d.localeCompare(b.d));
  const k = rader.reduce((s, r) => s + r.klikk, 0), v = rader.reduce((s, r) => s + r.visn, 0);
  console.log(`═══ TRAFIKK (${rader.length} dager) — ${k} klikk, ${v} visninger, CTR ${pct(k, v)}`);
  for (const r of rader.slice(-14)) console.log(`   ${r.d}  klikk ${tall(r.klikk)}   visn ${tall(r.visn)}   ${pct(r.klikk, r.visn)}`);
} catch (e) { console.log("  trafikk:", e.message); }

// 2. Søkeord
try {
  const rå = await kall("GetQueryStats");
  const agg = new Map();
  for (const r of rå) {
    const n = String(r.Query || "").trim().toLowerCase();
    const o = agg.get(n) || { q: n, klikk: 0, visn: 0 };
    o.klikk += r.Clicks || 0; o.visn += r.Impressions || 0;
    agg.set(n, o);
  }
  const q = [...agg.values()].sort((a, b) => b.visn - a.visn);
  console.log(`\n═══ TOPP SØKEORD (${q.length} totalt)`);
  for (const r of q.slice(0, 20))
    console.log(`   ${String(r.q).slice(0, 38).padEnd(40)} visn ${tall(r.visn)}  klikk ${tall(r.klikk)}  ${pct(r.klikk, r.visn).padStart(8)}`);
} catch (e) { console.log("\n  søkeord:", e.message); }

// 3. Sider
try {
  const råP = await kall("GetPageStats");
  const aggP = new Map();
  for (const r of råP) {
    let u = (r.Query || r.Url || "").replace("https://fosen-tools.no", "");
    try { u = decodeURIComponent(u); } catch {}
    const o = aggP.get(u) || { u, klikk: 0, visn: 0 };
    o.klikk += r.Clicks || 0; o.visn += r.Impressions || 0;
    aggP.set(u, o);
  }
  const p = [...aggP.values()].sort((a, b) => b.visn - a.visn);
  console.log(`\n═══ TOPP SIDER (${p.length} totalt)`);
  for (const r of p.slice(0, 15))
    console.log(`   ${r.u.slice(0, 46).padEnd(48)} visn ${tall(r.visn)}  klikk ${tall(r.klikk)}`);
} catch (e) { console.log("\n  sider:", e.message); }
