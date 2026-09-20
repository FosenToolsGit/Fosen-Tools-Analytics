/**
 * FT Aviation — ukesrapport som PDF.
 *   node --env-file=.env.local scripts/fta-ukesrapport.mjs
 * Henter GA4, Search Console, Facebook og YouTube (ukestall + topp videoer) og rendrer PDF til skrivebordet.
 */
import { GoogleAuth } from "google-auth-library";
import { chromium } from "playwright";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const GA4 = process.env.FTA_GA4_PROPERTY_ID || "properties/502811501";
const SITE = "sc-domain:ft-aviation.no";
const creds = { client_email: process.env.GA4_CLIENT_EMAIL,
  private_key: (process.env.GA4_PRIVATE_KEY || "").replace(/\\n/g, "\n") };
const d0 = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const G = { na: [d0(7), d0(1)], før: [d0(14), d0(8)] };
const S = { na: [d0(10), d0(4)], før: [d0(17), d0(11)] };
const NO = (n) => Number(n).toLocaleString("nb-NO");

const kli = async (s) => await new GoogleAuth({ credentials: creds, scopes: [s] }).getClient();
const GA4_FT = process.env.GA4_PROPERTY_ID || "properties/388008623"; // fosen-tools.no — /aviation-seksjonen
const ga = async (c, [a, b], body, prop = GA4) => (await c.request({
  url: `https://analyticsdata.googleapis.com/v1beta/${prop}:runReport`, method: "POST",
  data: { dateRanges: [{ startDate: a, endDate: b }], ...body } })).data;
const gs = async (c, [startDate, endDate], body) => (await c.request({
  url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
  method: "POST", data: { startDate, endDate, ...body } })).data.rows ?? [];
const v = (r, i = 0) => Number(r?.rows?.[0]?.metricValues?.[i]?.value || 0);
const rows = (r) => (r.rows || []).map((x) => [x.dimensionValues[0].value, Number(x.metricValues[0].value)]);
const pct = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);
const pil = (p) => p === null ? "" : p > 0 ? `<span class="opp">▲ ${p} %</span>`
  : p < 0 ? `<span class="ned">▼ ${Math.abs(p)} %</span>` : `<span class="flat">uendret</span>`;

console.log("Henter data …");
const ca = await kli("https://www.googleapis.com/auth/analytics.readonly");
const cs = await kli("https://www.googleapis.com/auth/webmasters.readonly");
const M = [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }, { name: "newUsers" }];
const [gn, gf] = await Promise.all([ga(ca, G.na, { metrics: M }), ga(ca, G.før, { metrics: M })]);
const kanaler = rows(await ga(ca, G.na, { dimensions: [{ name: "sessionDefaultChannelGroup" }],
  metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 6 }));
const sider = rows(await ga(ca, G.na, { dimensions: [{ name: "pagePath" }],
  metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 8 }));
const AV = { dimensionFilter: { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/aviation" } } } };
const [avN, avF] = await Promise.all([
  ga(ca, G.na, { ...AV, metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }] }, GA4_FT),
  ga(ca, G.før, { ...AV, metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }] }, GA4_FT)]);
const avSider = rows(await ga(ca, G.na, { ...AV, dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }],
  orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 8 }, GA4_FT));
const avKanal = rows(await ga(ca, G.na, { ...AV, dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }],
  orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 6 }, GA4_FT));
const hend = rows(await ga(ca, G.na, { dimensions: [{ name: "eventName" }],
  metrics: [{ name: "eventCount" }], orderBys: [{ metric: { metricName: "eventCount" }, desc: true }], limit: 14 }));

const sDag = await gs(cs, [d0(60), d0(1)], { dimensions: ["date"], rowLimit: 200 });
const sisteData = sDag.length ? sDag[sDag.length - 1].keys[0] : null;
const nyeDager = sDag.filter((r) => r.keys[0] >= d0(14));
const ord = await gs(cs, [d0(30), d0(1)], { dimensions: ["query"], rowLimit: 10 });

// --- Synlighetsvarsel -------------------------------------------------------
// FT Aviation var borte fra Google fra 20. juli til 30. august 2026 uten at
// noen oppdaget det. Nettstedet var oppe hele tiden, så GA4 ga ingen advarsel.
// Denne sjekken ser på Search Console-visninger alene.
const visnMellom = (fra, til) => sDag
  .filter((r) => r.keys[0] >= fra && r.keys[0] <= til)
  .reduce((s, r) => s + r.impressions, 0);
const sisteUke = visnMellom(d0(7), d0(1));
const forrigeUke = visnMellom(d0(14), d0(8));
const snitt30 = visnMellom(d0(37), d0(8)) / 30;
// dager på rad uten en eneste visning, regnet bakover fra siste dag med data
const medVisning = new Set(sDag.filter((r) => r.impressions > 0).map((r) => r.keys[0]));
let nullDager = 0;
for (let i = 1; i <= 45; i++) { if (medVisning.has(d0(i))) break; nullDager++; }

const TERSKEL = 50;          // visninger på sju dager
const FALL_PST = 70;         // prosent fall mot forrige uke
const fallPst = forrigeUke > 0 ? Math.round(((forrigeUke - sisteUke) / forrigeUke) * 100) : null;

let varsel = null;
if (nullDager >= 5)
  varsel = { grad: "kritisk", tittel: `Ingen visninger på ${nullDager} dager`,
    tekst: `Search Console har ikke registrert en eneste visning siden ${sisteData || "ukjent dato"}. Sjekk at nettstedet svarer, at robots.txt er uendret, og kjør URL-inspeksjon på forsiden.` };
else if (sisteUke < TERSKEL && snitt30 * 7 >= TERSKEL)
  varsel = { grad: "kritisk", tittel: `Bare ${NO(Math.round(sisteUke))} visninger denne uka`,
    tekst: `Under terskelen på ${TERSKEL}, mens snittet de foregående fire ukene tilsvarer ${NO(Math.round(snitt30 * 7))} i uka. Dette er mønsteret fra juli–august 2026, da nettstedet var usynlig i seks uker uten at det ble oppdaget.` };
else if (fallPst !== null && fallPst >= FALL_PST && forrigeUke >= TERSKEL)
  varsel = { grad: "advarsel", tittel: `Visningene falt ${fallPst} % på en uke`,
    tekst: `Fra ${NO(Math.round(forrigeUke))} til ${NO(Math.round(sisteUke))}. Et fall i denne størrelsen er som regel teknisk, ikke sesong. Sjekk indeksering før du leter etter innholdsårsaker.` };
else if (sisteUke < TERSKEL)
  varsel = { grad: "lav", tittel: `${NO(Math.round(sisteUke))} visninger denne uka`,
    tekst: `Under terskelen på ${TERSKEL}, men nivået har vært lavt en stund, så dette er trolig normalen og ikke et brudd.` };

console.log(varsel ? `  Synlighet: ${varsel.grad.toUpperCase()} — ${varsel.tittel}`
                   : `  Synlighet: ok (${Math.round(sisteUke)} visninger siste uke)`);

let fb = null;
try {
  const t = process.env.META_ACCESS_TOKEN;
  const acc = await (await fetch(`https://graph.facebook.com/v22.0/me/accounts?fields=name,id,access_token&access_token=${t}`)).json();
  const p = (acc.data || []).find((x) => x.name === "FT Aviation");
  if (p) {
    const since = Math.floor(new Date(G.na[0]).getTime() / 1000);
    const po = await (await fetch(`https://graph.facebook.com/v22.0/${p.id}/posts?fields=created_time,message,permalink_url&since=${since}&limit=10&access_token=${p.access_token}`)).json();
    fb = (po.data || []).map((x) => ({ dato: x.created_time.slice(0, 10),
      tekst: (x.message || "").split("\n")[0].slice(0, 90), url: x.permalink_url }));
  }
} catch {}

// ── YouTube ────────────────────────────────────────────────────────────────
// To veier: YouTube Analytics API gir ekte ukestall (visninger, sett-tid,
// abonnenter) når API-et er aktivert i Google Cloud-prosjektet og tokenet har
// yt-analytics.readonly-scope. Inntil da regnes ukestall ut fra et lokalt
// øyeblikksbilde av hver videos totale visninger (scripts/data/fta-yt-snapshot.json),
// som skrives ved hver kjøring — så uke-mot-uke er bare så godt som forrige kjøring.
let yt = null;
const YT_SNAP = path.join(path.dirname(fileURLToPath(import.meta.url)), "data", "fta-yt-snapshot.json");
try {
  const r = await (await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.YT_CLIENT_ID, client_secret: process.env.YT_CLIENT_SECRET,
      refresh_token: process.env.YT_REFRESH_TOKEN_FTA, grant_type: "refresh_token" }) })).json();
  if (r.access_token) {
    const H = { Authorization: `Bearer ${r.access_token}` };
    const yj = async (u) => { const x = await fetch(u, { headers: H }); if (!x.ok) throw new Error(`${x.status} ${u.split("?")[0]}`); return x.json(); };
    const ch = await yj("https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&mine=true");
    const st = ch.items?.[0]?.statistics ?? {};
    const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    const pl = uploads ? await yj(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploads}&maxResults=50`) : { items: [] };
    const ids = (pl.items ?? []).map((i) => i.contentDetails.videoId);
    const vids = {};
    for (let i = 0; i < ids.length; i += 50) {
      const vs = await yj(`https://www.googleapis.com/youtube/v3/videos?part=snippet,status,statistics,fileDetails&id=${ids.slice(i, i + 50).join(",")}`);
      for (const x of vs.items ?? []) {
        const strm = x.fileDetails?.videoStreams?.[0];
        vids[x.id] = { tittel: x.snippet.title.replace(/\s*\|\s*FT Aviation\s*$/, ""),
          publisert: (x.status.publishAt || x.snippet.publishedAt).slice(0, 10),
          format: strm ? (strm.heightPixels > strm.widthPixels ? "Short" : "16:9") : "",
          visninger: +x.statistics.viewCount || 0, likes: +x.statistics.likeCount || 0 };
      }
    }
    yt = { visninger: +st.viewCount || 0, abonnenter: +st.subscriberCount || 0, videoer: +st.videoCount || 0,
      nye: Object.entries(vids).filter(([, v]) => v.publisert >= G.na[0] && v.publisert <= G.na[1])
        .map(([id, v]) => ({ id, ...v })), kilde: null };

    // 1) Analytics API
    try {
      const an = async ([a, b], extra = "") => yj(`https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${a}&endDate=${b}&metrics=views,estimatedMinutesWatched,subscribersGained${extra}`);
      const [na, før, top] = await Promise.all([an(G.na), an(G.før), an(G.na, "&dimensions=video&sort=-views&maxResults=10")]);
      const row = (x) => x.rows?.[0] ?? [0, 0, 0];
      yt.uke = { visninger: row(na)[0], minutter: row(na)[1], abonnenter: row(na)[2] };
      yt.forrige = { visninger: row(før)[0], minutter: row(før)[1], abonnenter: row(før)[2] };
      yt.topp = (top.rows ?? []).map(([id, v, m]) => ({ id, tittel: vids[id]?.tittel ?? id, format: vids[id]?.format ?? "",
        uke: v, minutter: m, totalt: vids[id]?.visninger ?? null }));
      yt.kilde = "analytics";
    } catch (e) {
      // 2) Øyeblikksbilde-fallback
      const snap = fs.existsSync(YT_SNAP) ? JSON.parse(fs.readFileSync(YT_SNAP, "utf8")) : {};
      const iDag = d0(0);
      snap[iDag] = Object.fromEntries(Object.entries(vids).map(([id, v]) => [id, v.visninger]));
      const datoer = Object.keys(snap).sort();
      for (const d of datoer.slice(0, -12)) delete snap[d]; // behold ~12 uker
      fs.mkdirSync(YT_SNAP.replace(/\/[^/]+$/, ""), { recursive: true });
      fs.writeFileSync(YT_SNAP, JSON.stringify(snap, null, 1));
      const nærmest = (mål) => datoer.filter((d) => d < iDag && d <= mål).slice(-1)[0] ?? datoer.filter((d) => d < iDag)[0];
      const s7 = nærmest(G.na[0]), s14 = s7 ? datoer.filter((d) => d < s7 && d <= G.før[0]).slice(-1)[0] : undefined;
      const sum = (o) => Object.values(o ?? {}).reduce((a, b) => a + b, 0);
      const diff = (id, fra, til) => (til?.[id] ?? 0) - (fra?.[id] ?? 0);
      if (s7) {
        yt.uke = { visninger: sum(snap[iDag]) - sum(snap[s7]), fra: s7 };
        if (s14) yt.forrige = { visninger: sum(snap[s7]) - sum(snap[s14]) };
        yt.topp = Object.entries(vids).map(([id, v]) => ({ id, tittel: v.tittel, format: v.format,
          uke: diff(id, snap[s7], snap[iDag]), totalt: v.visninger }))
          .filter((x) => x.uke > 0).sort((a, b) => b.uke - a.uke).slice(0, 8);
      }
      yt.kilde = "snapshot";
      yt.feil = String(e.message);
    }
  }
} catch (e) { console.warn("YouTube:", e.message); }
if (yt?.feil) console.log("YouTube Analytics utilgjengelig (" + yt.feil + ") — bruker øyeblikksbilde.");

// totalUsers er GA4s unike brukere i perioden. newUsers viser hvor mange av dem
// som var innom for første gang, så resten er tilbakevendende.
const nyeNa = v(gn, 3), nyeFør = v(gf, 3);
const tilbNa = Math.max(0, v(gn, 1) - nyeNa), tilbFør = Math.max(0, v(gf, 1) - nyeFør);
const kpi = [
  ["Sesjoner", v(gn, 0), v(gf, 0)],
  ["Unike brukere", v(gn, 1), v(gf, 1)],
  ["Nye brukere", nyeNa, nyeFør],
  ["Tilbakevendende", tilbNa, tilbFør],
  ["Sidevisninger", v(gn, 2), v(gf, 2)],
];
const formStart = (hend.find((h) => h[0] === "form_start") || [, 0])[1];
const formSub = (hend.find((h) => /submit/.test(h[0])) || [, 0])[1];
const nedlast = (hend.find((h) => h[0] === "file_download") || [, 0])[1];

const html = `<!doctype html><html lang="no"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 14mm 13mm; }
*{box-sizing:border-box;margin:0;padding:0}
body{font:11pt/1.5 Manrope,system-ui,sans-serif;color:#1a2333;background:#fff}
.top{background:linear-gradient(135deg,#0A2240,#14448A);color:#fff;padding:22px 24px;border-radius:10px;margin-bottom:18px}
.top h1{font-size:20pt;font-weight:800;letter-spacing:.02em;text-transform:uppercase;line-height:1.1}
.top .sub{font-size:9.5pt;opacity:.8;margin-top:6px}
.top .gull{height:3px;width:70px;background:linear-gradient(90deg,#C9A227,#E7D08A);margin-top:12px}
h2{font-size:9pt;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#C9A227;
   margin:20px 0 9px;padding-bottom:5px;border-bottom:1px solid #dfe4ec}
.kpi{display:flex;gap:10px;margin-bottom:4px}
.kpi div{flex:1;border:1px solid #dfe4ec;border-radius:8px;padding:11px 13px}
.kpi b{display:block;font-size:19pt;font-weight:800;color:#0A2240;line-height:1.1}
.kpi span{font-size:8pt;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;display:block;margin-top:3px}
.opp{color:#1E7F46;font-weight:700}.ned{color:#C0392B;font-weight:700}.flat{color:#6b7280}
table{width:100%;border-collapse:collapse;font-size:9.5pt}
th{text-align:left;font-size:7.5pt;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;
   padding:5px 6px;border-bottom:1px solid #dfe4ec}
td{padding:5px 6px;border-bottom:1px solid #f0f2f6}
td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.note{background:#f7f9fc;border-left:3px solid #C9A227;padding:9px 13px;margin:10px 0;font-size:9.5pt;color:#41506b}
.note b{color:#1a2333}
.två{display:flex;gap:16px}.två>div{flex:1}
.pk{font-size:9pt;color:#41506b;margin:4px 0}
footer{margin-top:22px;padding-top:9px;border-top:1px solid #dfe4ec;font-size:8pt;color:#8a93a6;
  display:flex;justify-content:space-between}
.varsel{border-radius:6px;padding:10px 13px;margin:0 0 14px;font-size:9.5pt;line-height:1.5}
.varsel b{display:inline}
.varsel.kritisk{background:#3a1216;border-left:4px solid #c62828;color:#ffd9dc}
.varsel.advarsel{background:#3a2e12;border-left:4px solid #d6a127;color:#ffeec2}
.varsel.lav{background:#1e2430;border-left:4px solid #5c6b85;color:#cfd8e6}
.varsel.ok{background:#152616;border-left:4px solid #3f9e4d;color:#d6f0d9}
</style></head><body>
<div class="top"><h1>FT Aviation<br>Ukesrapport</h1>
<div class="sub">${G.na[0]} til ${G.na[1]} · sammenlignet med uka før</div>
<div class="gull"></div></div>

${varsel ? `<div class="varsel ${varsel.grad}"><b>${varsel.grad === "kritisk" ? "Varsel" : varsel.grad === "advarsel" ? "Se på dette" : "Merk"}: ${varsel.tittel}</b><br>${varsel.tekst}</div>`
  : `<div class="varsel ok"><b>Synlighet i Google er normal.</b> ${NO(Math.round(sisteUke))} visninger siste sju dager, mot ${NO(Math.round(forrigeUke))} uka før.</div>`}

<h2>Trafikk på nettsiden</h2>
<div class="kpi">${kpi.map(([n, a, b]) =>
  `<div><b>${NO(a)}</b><span>${n}</span><div style="font-size:8.5pt;margin-top:4px">${pil(pct(a, b))} <span style="color:#8a93a6">fra ${NO(b)}</span></div></div>`).join("")}</div>

<div class="två">
<div><h2>Hvor de kommer fra</h2><table><tr><th>Kanal</th><th class="n">Økter</th></tr>
${kanaler.map(([k, n]) => `<tr><td>${k}</td><td class="n">${NO(n)}</td></tr>`).join("")}</table></div>
<div><h2>Mest leste sider</h2><table><tr><th>Side</th><th class="n">Visn.</th></tr>
${sider.slice(0, 6).map(([p, n]) => `<tr><td>${p.slice(0, 40)}</td><td class="n">${NO(n)}</td></tr>`).join("")}</table></div>
</div>

<div style="page-break-inside:avoid"><h2>Aviation på fosen-tools.no</h2>
<div class="note" style="margin-bottom:8px">Trafikken til <b>/aviation</b>-seksjonen på fosen-tools.no, samme uke — luftfartskunder som kommer via hovednettstedet.</div>
<div class="kpi">
<div><b>${NO(v(avN, 0))}</b><span>økter</span><div style="font-size:8.5pt;margin-top:4px">${pil(pct(v(avN, 0), v(avF, 0)))} <span style="color:#8a93a6">fra ${NO(v(avF, 0))}</span></div></div>
<div><b>${NO(v(avN, 1))}</b><span>brukere</span><div style="font-size:8.5pt;margin-top:4px">${pil(pct(v(avN, 1), v(avF, 1)))} <span style="color:#8a93a6">fra ${NO(v(avF, 1))}</span></div></div>
<div><b>${NO(v(avN, 2))}</b><span>sidevisninger</span><div style="font-size:8.5pt;margin-top:4px">${pil(pct(v(avN, 2), v(avF, 2)))} <span style="color:#8a93a6">fra ${NO(v(avF, 2))}</span></div></div>
</div>
<div class="två">
<div><h2>Hvor de kommer fra</h2><table><tr><th>Kanal</th><th class="n">Økter</th></tr>
${avKanal.map(([k, n]) => `<tr><td>${k}</td><td class="n">${NO(n)}</td></tr>`).join("") || "<tr><td colspan=2>Ingen økter denne uka</td></tr>"}</table></div>
<div><h2>Mest leste aviation-sider</h2><table><tr><th>Side</th><th class="n">Visn.</th></tr>
${avSider.slice(0, 6).map(([p, n]) => `<tr><td>${(p === "/aviation" || p === "/aviation/" ? "/aviation (forsiden)" : p.replace(/^\/aviation/, "…")).slice(0, 40)}</td><td class="n">${NO(n)}</td></tr>`).join("") || "<tr><td colspan=2>Ingen visninger denne uka</td></tr>"}</table></div>
</div></div>

<h2>Kontaktskjemaet</h2>
<div class="kpi">
<div><b>${NO(formStart)}</b><span>begynte å fylle ut</span></div>
<div><b>${NO(formSub)}</b><span>sendte inn</span></div>
<div><b>${NO(nedlast)}</b><span>nedlastinger</span></div>
</div>
${formStart > 0 && formSub / Math.max(formStart, 1) < 0.15
  ? `<div class="note"><b>${formStart} begynte, ${formSub} kom gjennom.</b> Sporingen ble lagt om 2. september, så tall fra før den datoen er ikke til å stole på. Fra neste uke vet vi om det er skjemaet eller målingen som har vært problemet.</div>` : ""}

<h2>Søk i Google</h2>
${nyeDager.length < 3
  ? `<div class="note"><b>Search Console samler data igjen.</b> Eiendommen hadde et opphold fra 16. juli til ${sisteData || "slutten av august"}, og har foreløpig ${nyeDager.length} ${nyeDager.length === 1 ? "dag" : "dager"} med tall. Sitemapen ble meldt inn 2. september, og alle sytten sidene er nå kjent for Google. Reell uke-mot-uke-sammenligning kommer om et par uker.</div>`
  : ""}
${ord.length ? `<table><tr><th>Søkeord</th><th class="n">Klikk</th><th class="n">Visn.</th><th class="n">Snittplass</th></tr>
${ord.map((r) => `<tr><td>${r.keys[0]}</td><td class="n">${r.clicks}</td><td class="n">${r.impressions}</td><td class="n">${r.position.toFixed(1)}</td></tr>`).join("")}</table>` : ""}

<h2>Sosiale medier og video</h2>
<div class="två">
<div>${fb && fb.length ? `<div class="pk"><b>Facebook:</b> ${fb.length} ${fb.length === 1 ? "publisering" : "publiseringer"} denne uka</div>
${fb.map((p) => `<div class="pk">${p.dato} — ${p.tekst}…</div>`).join("")}`
  : `<div class="pk">Ingen Facebook-publiseringer registrert denne uka.</div>`}</div>
<div>${yt ? `<div class="pk"><b>YouTube:</b> ${yt.nye.length ? `${yt.nye.length} ${yt.nye.length === 1 ? "video publisert" : "videoer publisert"} denne uka` : "ingen nye videoer denne uka"}</div>
${yt.nye.map((v) => `<div class="pk">${v.publisert} — ${v.tittel.slice(0, 70)}${v.format ? ` <span style="color:#8a93a6">(${v.format})</span>` : ""}</div>`).join("")}` : `<div class="pk">YouTube-tall ikke tilgjengelig.</div>`}</div>
</div>

${yt ? `<div style="page-break-inside:avoid"><h2>YouTube</h2>
<div class="kpi">
<div><b>${yt.uke ? NO(yt.uke.visninger) : "–"}</b><span>visninger denne uka</span><div style="font-size:8.5pt;margin-top:4px">${yt.uke && yt.forrige ? `${pil(pct(yt.uke.visninger, yt.forrige.visninger))} <span style="color:#8a93a6">fra ${NO(yt.forrige.visninger)}</span>` : `<span style="color:#8a93a6">ingen uke å sammenligne med ennå</span>`}</div></div>
${yt.kilde === "analytics" ? `<div><b>${NO(Math.round(yt.uke.minutter))}</b><span>minutter sett</span><div style="font-size:8.5pt;margin-top:4px">${yt.forrige ? `${pil(pct(Math.round(yt.uke.minutter), Math.round(yt.forrige.minutter)))} <span style="color:#8a93a6">fra ${NO(Math.round(yt.forrige.minutter))}</span>` : ""}</div></div>
<div><b>${NO(yt.uke.abonnenter)}</b><span>nye abonnenter</span><div style="font-size:8.5pt;margin-top:4px"><span style="color:#8a93a6">${NO(yt.abonnenter)} totalt</span></div></div>`
  : `<div><b>${NO(yt.abonnenter)}</b><span>abonnenter</span></div>`}
<div><b>${NO(yt.visninger)}</b><span>visninger totalt</span><div style="font-size:8.5pt;margin-top:4px"><span style="color:#8a93a6">${yt.videoer} videoer på kanalen</span></div></div>
</div>
${yt.topp?.length ? `<table><tr><th>Video</th><th>Format</th><th class="n">Denne uka</th>${yt.kilde === "analytics" ? `<th class="n">Min. sett</th>` : ""}<th class="n">Totalt</th></tr>
${yt.topp.map((t) => `<tr><td>${t.tittel.slice(0, 58)}</td><td>${t.format}</td><td class="n">${NO(t.uke)}</td>${yt.kilde === "analytics" ? `<td class="n">${NO(Math.round(t.minutter))}</td>` : ""}<td class="n">${t.totalt === null ? "" : NO(t.totalt)}</td></tr>`).join("")}</table>` : ""}
${yt.kilde === "snapshot" ? `<div class="note" style="margin-top:8px">${yt.uke
  ? `Ukestallene er regnet fra forrige øyeblikksbilde av kanalen (${yt.uke.fra}), ikke fra YouTube Analytics.`
  : `<b>Første kjøring med YouTube-tall.</b> Øyeblikksbildet av kanalen er lagret, så neste ukes rapport får uke-mot-uke-visninger per video.`} Ekte ukestall med sett-tid kommer når YouTube Analytics API er slått på i Google Cloud og FTA-tokenet er fornyet med analytics-scope (<code>node scripts/yt-auth.mjs --kanal fta</code>).</div>` : ""}
</div>` : ""}

<footer><span>FT Aviation AS · Industrigata 1, N-7130 Brekstad</span>
<span>Generert ${new Date().toISOString().slice(0, 10)}</span></footer>
</body></html>`;

const ut = `${os.homedir()}/Desktop/FTA-ukesrapport-${G.na[1]}.pdf`;
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent(html, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: ut, format: "A4", printBackground: true });
await b.close();
console.log("✅ " + ut);
