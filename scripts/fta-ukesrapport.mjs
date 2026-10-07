/**
 * FT Aviation — ukesrapport som PDF.
 *   node --env-file=.env.local scripts/fta-ukesrapport.mjs
 * Henter GA4, Search Console, Facebook, Instagram og YouTube og rendrer PDF til skrivebordet.
 *
 *   --notat "Postet tail stand-videoen på LinkedIn."   (kan gjentas)
 *
 * Forsiden er laget for ledelsen (Erik, okt 2026): årsgraf over besøk uke for
 * uke, to–tre setninger om hva som skjedde, og vanlige ord i stedet for
 * GA4-begreper. Tallene er små, så forsiden sammenligner med snitt over flere
 * uker og samme periode i fjor, aldri prosent mot én uke. Detaljene ligger bak.
 * LinkedIn har ikke API, så det som er postet der må med via --notat.
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
// Uka = siste hele uke mandag–søndag, så tallene på forsiden og bak er de samme
// uansett hvilken dag rapporten kjøres.
const sønAvstand = ((new Date().getDay() + 6) % 7) + 1; // dager tilbake til sist søndag
const G = { na: [d0(sønAvstand + 6), d0(sønAvstand)], før: [d0(sønAvstand + 13), d0(sønAvstand + 7)] };
function dag(iso, n) { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); }
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
// Tallene er små, så prosent mot forrige uke svinger mye og gir feil bilde.
// Vis heller differansen i hele tall.
const pil = (a, b) => a > b ? `<span class="opp">▲ ${NO(a - b)} flere</span>`
  : a < b ? `<span class="ned">▼ ${NO(b - a)} færre</span>` : `<span class="flat">likt</span>`;
const NOTAT = process.argv.flatMap((a, i, l) => a === "--notat" && l[i + 1] ? [l[i + 1]] : []);
// GA4-kanalnavn → vanlige ord
const KANAL = { "Organic Search": "Fra Google-søk", "Direct": "Skrev adressen / bokmerke",
  "Referral": "Lenker fra andre nettsider", "Organic Social": "Fra sosiale medier",
  "Paid Search": "Google-annonser", "Paid Social": "Annonser i sosiale medier", "Email": "Fra e-post",
  "Organic Video": "Fra YouTube", "AI Assistant": "Fra ChatGPT o.l.", "Unassigned": "Ukjent kilde",
  "Cross-network": "Google-annonser", "Display": "Bannerannonser", "Organic Shopping": "Google Shopping" };
const kanal = (k) => KANAL[k] || k;
const tittel = (t, n = 44) => { const r = t.replace(/\s*[|–-]?\s*(FT Aviation|Fosen Tools( AS)?)\s*[|–-]?\s*/gi, " ").replace(/\s+/g, " ").trim() || t;
  return r.length <= n ? r : r.slice(0, n).replace(/\s+\S*$/, "") + " …"; };

console.log("Henter data …");
const ca = await kli("https://www.googleapis.com/auth/analytics.readonly");
const cs = await kli("https://www.googleapis.com/auth/webmasters.readonly");
const M = [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }, { name: "newUsers" }];
const [gn, gf] = await Promise.all([ga(ca, G.na, { metrics: M }), ga(ca, G.før, { metrics: M })]);
const kanaler = rows(await ga(ca, G.na, { dimensions: [{ name: "sessionDefaultChannelGroup" }],
  metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 6 }));
const sider = rows(await ga(ca, G.na, { dimensions: [{ name: "pageTitle" }],
  metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 8 }));
const AV = { dimensionFilter: { filter: { fieldName: "pagePath", stringFilter: { matchType: "BEGINS_WITH", value: "/aviation" } } } };
const [avN, avF] = await Promise.all([
  ga(ca, G.na, { ...AV, metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }] }, GA4_FT),
  ga(ca, G.før, { ...AV, metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "screenPageViews" }] }, GA4_FT)]);
const avSider = rows(await ga(ca, G.na, { ...AV, dimensions: [{ name: "pageTitle" }], metrics: [{ name: "screenPageViews" }],
  orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 8 }, GA4_FT));
const avKanal = rows(await ga(ca, G.na, { ...AV, dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }],
  orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 6 }, GA4_FT));
// --- Besøk uke for uke (forsidegrafen) ------------------------------------
// Bare hele ISO-uker tas med; en uke som ikke er ferdig ville sett ut som et fall.
const isoSondag = (yw) => { const y = +yw.slice(0, 4), w = +yw.slice(4);
  const j4 = new Date(Date.UTC(y, 0, 4)); const man = new Date(j4); man.setUTCDate(j4.getUTCDate() - ((j4.getUTCDay() + 6) % 7) + (w - 1) * 7);
  man.setUTCDate(man.getUTCDate() + 6); return man.toISOString().slice(0, 10); };
const ukeRader = rows(await ga(ca, ["2025-01-01", d0(1)], { dimensions: [{ name: "isoYearIsoWeek" }],
  metrics: [{ name: "sessions" }], orderBys: [{ dimension: { dimensionName: "isoYearIsoWeek" } }], limit: 300 }))
  .filter(([yw]) => isoSondag(yw) <= d0(1));
const ukeMap = Object.fromEntries(ukeRader);
const førsteUke = ukeRader[0]?.[0];             // eiendommen startet høsten 2025
const iÅr = String(new Date(d0(1)).getFullYear()), iFjor = String(+iÅr - 1);
const sisteHele = ukeRader.filter(([yw]) => yw.startsWith(iÅr)).slice(-1)[0]?.[0];
const sisteNr = sisteHele ? +sisteHele.slice(4) : 0;
const ukeVerdi = (år, w) => { const k = år + String(w).padStart(2, "0");
  return førsteUke && k >= førsteUke ? (ukeMap[k] || 0) : null; };
const serieÅr = Array.from({ length: sisteNr }, (_, i) => ukeVerdi(iÅr, i + 1));
const serieFjor = Array.from({ length: 52 }, (_, i) => ukeVerdi(iFjor, i + 1));
const sumUker = (serie, fra, til) => { const x = serie.slice(fra - 1, til); return x.some((v) => v === null) ? null : x.reduce((a, b) => a + b, 0); };
const s4 = sumUker(serieÅr, sisteNr - 3, sisteNr), s4før = sumUker(serieÅr, sisteNr - 7, sisteNr - 4);
const s4fjor = sumUker(serieFjor, sisteNr - 3, sisteNr);
const hittil = serieÅr.reduce((a, b) => a + (b || 0), 0);
const toppUke = serieÅr.reduce((m, v, i) => (v ?? 0) > m.v ? { v, w: i + 1 } : m, { v: -1, w: 0 });

const hend = rows(await ga(ca, G.na, { dimensions: [{ name: "eventName" }],
  metrics: [{ name: "eventCount" }], orderBys: [{ metric: { metricName: "eventCount" }, desc: true }], limit: 14 }));

const sDag = await gs(cs, [d0(60), d0(1)], { dimensions: ["date"], rowLimit: 200 });
const sisteData = sDag.length ? sDag[sDag.length - 1].keys[0] : null;
const nyeDager = sDag.filter((r) => r.keys[0] >= d0(14));
const ord = (await gs(cs, [d0(30), d0(1)], { dimensions: ["query"], rowLimit: 500 }))
  .filter((r) => r.clicks > 0).sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 10);

// --- Synlighetsvarsel -------------------------------------------------------
// FT Aviation var borte fra Google fra 20. juli til 30. august 2026 uten at
// noen oppdaget det. Nettstedet var oppe hele tiden, så GA4 ga ingen advarsel.
// Denne sjekken ser på Search Console-visninger alene.
const visnMellom = (fra, til) => sDag
  .filter((r) => r.keys[0] >= fra && r.keys[0] <= til)
  .reduce((s, r) => s + r.impressions, 0);
// Search Console ligger to–tre dager etter. Regnes uka som «siste sju dager»,
// mangler de siste dagene og uka ser ut som et fall (352 mot 809, uke 40).
// Derfor: de sju siste dagene som HAR data, mot de sju før.
const slutt = sisteData || d0(3);
const gscUke = [dag(slutt, 6), slutt];
const sisteUke = visnMellom(dag(slutt, 6), slutt);
const forrigeUke = visnMellom(dag(slutt, 13), dag(slutt, 7));
const snitt30 = visnMellom(dag(slutt, 36), dag(slutt, 7)) / 30;
const snitt4uker = visnMellom(dag(slutt, 34), dag(slutt, 7)) / 4;   // sju-dagers snitt, fire uker før
const ukerFør = [1, 2, 3, 4, 5, 6].map((u) => visnMellom(dag(slutt, 7 * u + 6), dag(slutt, 7 * u)));
// dager på rad uten en eneste visning, regnet bakover fra siste dag med data
const medVisning = new Set(sDag.filter((r) => r.impressions > 0).map((r) => r.keys[0]));
let nullDager = 0;
for (let i = 1; i <= 45; i++) { if (medVisning.has(d0(i))) break; nullDager++; }

const TERSKEL = 50;          // visninger på sju dager
const FALL_PST = 70;         // prosent fall mot forrige uke
const fallPst = forrigeUke > 0 ? Math.round(((forrigeUke - sisteUke) / forrigeUke) * 100) : null;

let varsel = null;
if (nullDager >= 5)
  varsel = { grad: "kritisk", tittel: `Ikke vist i Google på ${nullDager} dager`,
    tekst: `Search Console har ikke registrert en eneste visning siden ${sisteData || "ukjent dato"}. Sjekk at nettstedet svarer, at robots.txt er uendret, og kjør URL-inspeksjon på forsiden.` };
else if (sisteUke < TERSKEL && snitt30 * 7 >= TERSKEL)
  varsel = { grad: "kritisk", tittel: `Vist bare ${NO(Math.round(sisteUke))} ganger i Google denne uka`,
    tekst: `Under terskelen på ${TERSKEL}, mens snittet de foregående fire ukene tilsvarer ${NO(Math.round(snitt30 * 7))} i uka. Dette er mønsteret fra juli–august 2026, da nettstedet var usynlig i seks uker uten at det ble oppdaget.` };
else if (fallPst !== null && fallPst >= FALL_PST && forrigeUke >= TERSKEL)
  varsel = { grad: "advarsel", tittel: `Synligheten i Google falt ${fallPst} % på en uke`,
    tekst: `Fra ${NO(Math.round(forrigeUke))} til ${NO(Math.round(sisteUke))}. Et fall i denne størrelsen er som regel teknisk, ikke sesong. Sjekk indeksering før du leter etter innholdsårsaker.` };
else if (sisteUke < TERSKEL)
  varsel = { grad: "lav", tittel: `Vist ${NO(Math.round(sisteUke))} ganger i Google denne uka`,
    tekst: `Under terskelen på ${TERSKEL}, men nivået har vært lavt en stund, så dette er trolig normalen og ikke et brudd.` };

console.log(varsel ? `  Synlighet: ${varsel.grad.toUpperCase()} — ${varsel.tittel}`
                   : `  Synlighet: ok (${Math.round(sisteUke)} visninger siste uke)`);

let fb = null, ig = null;
try {
  const t = process.env.META_ACCESS_TOKEN;
  const acc = await (await fetch(`https://graph.facebook.com/v22.0/me/accounts?fields=name,id,access_token&access_token=${t}`)).json();
  const p = (acc.data || []).find((x) => x.name === "FT Aviation");
  if (p) {
    const since = Math.floor(new Date(G.na[0]).getTime() / 1000);
    const po = await (await fetch(`https://graph.facebook.com/v22.0/${p.id}/posts?fields=created_time,message,permalink_url&since=${since}&limit=10&access_token=${p.access_token}`)).json();
    fb = (po.data || []).filter((x) => x.created_time.slice(0, 10) <= G.na[1]).map((x) => ({ dato: x.created_time.slice(0, 10),
      tekst: (x.message || "").split("\n")[0].slice(0, 90), url: x.permalink_url }));
    const pi = await (await fetch(`https://graph.facebook.com/v22.0/${p.id}?fields=instagram_business_account&access_token=${p.access_token}`)).json();
    const igId = pi.instagram_business_account?.id;
    if (igId) {
      const m = await (await fetch(`https://graph.facebook.com/v22.0/${igId}/media?fields=caption,timestamp,permalink,media_product_type&limit=20&access_token=${p.access_token}`)).json();
      ig = (m.data || []).filter((x) => x.timestamp.slice(0, 10) >= G.na[0] && x.timestamp.slice(0, 10) <= G.na[1])
        .map((x) => ({ dato: x.timestamp.slice(0, 10), type: x.media_product_type === "REELS" ? "reel" : "innlegg",
          tekst: (x.caption || "").split("\n")[0].slice(0, 90) }));
    }
  }
} catch (e) { console.warn("Meta:", e.message); }

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
    const yj = async (u, forsøk = 2) => { const x = await fetch(u, { headers: H }); if (!x.ok && x.status === 401 && forsøk > 1) return yj(u, forsøk - 1); if (!x.ok) throw new Error(`${x.status} ${u.split("?")[0]}`); return x.json(); };
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
      // Uka avgrenses av øyeblikksbildene nærmest ukas grenser: siste bilde på
      // eller før mandag (start) og første bilde etter søndag (slutt). Uten det
      // ble alt fram til kjøredagen talt med — uke 40 viste 153 avspillinger,
      // der 105 kom mandag–onsdag uka etter.
      const mandagEtter = dag(G.na[1], -1);
      const før = (d) => datoer.filter((x) => x <= d).slice(-1)[0];
      const sSlutt = datoer.find((x) => x >= mandagEtter) ?? iDag;
      const s7 = før(G.na[0]), s14 = før(G.før[0]);
      const sum = (o) => Object.values(o ?? {}).reduce((a, b) => a + b, 0);
      const diff = (id, fra, til) => (til?.[id] ?? 0) - (fra?.[id] ?? 0);
      if (s7 && s7 < sSlutt) {
        yt.uke = { visninger: sum(snap[sSlutt]) - sum(snap[s7]), fra: s7 };
        if (s14 && s14 < s7) yt.forrige = { visninger: sum(snap[s7]) - sum(snap[s14]) };
        yt.topp = Object.entries(vids).map(([id, v]) => ({ id, tittel: v.tittel, format: v.format,
          uke: diff(id, snap[s7], snap[sSlutt]), totalt: v.visninger }))
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
  ["Besøk", v(gn, 0), v(gf, 0)],
  ["Personer", v(gn, 1), v(gf, 1)],
  ["Første gang", nyeNa, nyeFør],
  ["Kom tilbake", tilbNa, tilbFør],
  ["Sider lest", v(gn, 2), v(gf, 2)],
];
const formStart = (hend.find((h) => h[0] === "form_start") || [, 0])[1];
const formSub = (hend.find((h) => /submit/.test(h[0])) || [, 0])[1];
const nedlast = (hend.find((h) => h[0] === "file_download") || [, 0])[1];

// Tekst til Google-boksen. Uka før kan ha vært en topp; da er fallet ikke et
// tegn på noe galt, og det må stå hvorfor.
const fmtD = (iso) => `${+iso.slice(8)}. ${["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"][+iso.slice(5, 7) - 1]}`;
const googleTekst = (() => {
  const base = `Nettsiden ble vist ${NO(Math.round(sisteUke))} ganger i Google-søk ${fmtD(gscUke[0])}–${fmtD(gscUke[1])}, mot ${NO(Math.round(forrigeUke))} uka før.`;
  const nedPst = forrigeUke > 0 ? Math.round((1 - sisteUke / forrigeUke) * 100) : 0;
  if (nedPst < 25) return base + ` Snittet de fire ukene før var ${NO(Math.round(snitt4uker))}.`;
  const rekord = forrigeUke >= Math.max(...ukerFør.slice(1));
  const forklaring = rekord ? "Uka før var den høyeste vi har målt" : "Uka før lå uvanlig høyt";
  return base + ` ${forklaring}, så nedgangen er en retur til vanlig nivå: snittet de fire ukene før var ${NO(Math.round(snitt4uker))}, og denne uka ligger ${sisteUke >= snitt4uker ? "over" : "rett under"} det.`;
})();

// --- Forsiden: kort fortalt + årsgraf ---------------------------------------
const tall = (n) => ["null", "ett", "to", "tre", "fire", "fem", "seks", "sju", "åtte", "ni", "ti"][n] ?? NO(n);
const liste = (xs) => xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " og " + xs.slice(-1);
const pub = [];
if (yt?.nye?.length) {
  const titler = [...new Set(yt.nye.map((x) => x.tittel))];
  pub.push(`${titler.length === 1 ? `videoen «${titler[0]}»` : `${tall(titler.length)} videoer (${titler.map((t) => `«${t}»`).join(", ")})`} på YouTube`);
}
if (fb?.length) pub.push(`${tall(fb.length)} ${fb.length === 1 ? "innlegg" : "innlegg"} på Facebook`);
if (ig?.length) pub.push(`${tall(ig.length)} på Instagram`);
const ukaNå = serieÅr[sisteNr - 1] ?? v(gn, 0);
const snittFør = (() => { const x = serieÅr.slice(Math.max(0, sisteNr - 5), sisteNr - 1).filter((v) => v !== null); return x.length ? Math.round(x.reduce((a, b) => a + b, 0) / x.length) : null; })();
const kort = [
  pub.length ? `Denne uka la vi ut ${liste(pub)}.` : `Ingenting ble lagt ut på Facebook, Instagram eller YouTube denne uka.`,
  ...NOTAT.map((t) => t.trim().replace(/([^.!?])$/, "$1.")),
  `Nettsiden hadde ${NO(ukaNå)} besøk i uke ${sisteNr}${snittFør !== null ? `, mot ${NO(snittFør)} i snitt de fire ukene før` : ""}.`
    + (s4 !== null && s4fjor !== null ? ` De siste fire ukene ga ${NO(s4)} besøk, mot ${NO(s4fjor)} i de samme ukene i fjor.` : ""),
  yt?.uke && yt.forrige ? `YouTube-videoene ble spilt av ${NO(yt.uke.visninger)} ganger, mot ${NO(yt.forrige.visninger)} uka før.`
    + (yt.topp?.[0]?.uke > 0 ? ` Mest sett var «${yt.topp[0].tittel}»${yt.topp[0].format ? ` (${yt.topp[0].format})` : ""} med ${NO(yt.topp[0].uke)}.` : "") : "",
  formSub > 0 ? `${tall(formSub)[0].toUpperCase() + tall(formSub).slice(1)} sendte inn kontaktskjemaet.` : "",
].filter(Boolean);

const graf = (() => {
  const W = 690, H = 250, L = 34, R = 8, T = 22, B = 28, bw = (W - L - R) / 52;
  const maks = Math.max(10, ...serieÅr.map((v) => v ?? 0), ...serieFjor.map((v) => v ?? 0));
  const steg = maks > 100 ? 50 : maks > 40 ? 20 : 10, yMax = Math.ceil(maks / steg) * steg;
  const x = (w) => L + (w - 0.5) * bw, y = (v) => T + (H - T - B) * (1 - v / yMax);
  const g = [];
  for (let v = 0; v <= yMax; v += steg) g.push(`<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#e6eaf1"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end" font-size="8" fill="#8a93a6">${v}</text>`);
  const mnd = [[1, "jan"], [5, "feb"], [9, "mar"], [14, "apr"], [18, "mai"], [23, "jun"], [27, "jul"], [31, "aug"], [36, "sep"], [40, "okt"], [45, "nov"], [49, "des"]];
  for (const [w, n] of mnd) g.push(`<text x="${x(w)}" y="${H - 10}" font-size="8" fill="#8a93a6">${n}</text>`);
  serieÅr.forEach((v, i) => { if (v === null) return; const w = i + 1, siste = w === sisteNr;
    g.push(`<rect x="${x(w) - bw * 0.36}" y="${y(v)}" width="${bw * 0.72}" height="${y(0) - y(v)}" rx="1.5" fill="${siste ? "#C9A227" : "#A9C1E3"}"/>`); });
  // samme uke i fjor
  let seg = [];
  const fjorLinjer = [];
  serieFjor.forEach((v, i) => { if (v === null) { if (seg.length) fjorLinjer.push(seg); seg = []; } else seg.push(`${x(i + 1)},${y(v)}`); });
  if (seg.length) fjorLinjer.push(seg);
  for (const s of fjorLinjer) g.push(`<polyline points="${s.join(" ")}" fill="none" stroke="#8a93a6" stroke-width="1.3" stroke-dasharray="3 2.5"/>`);
  // fire ukers glidende snitt — demper svingningene i små tall
  const snitt = serieÅr.map((_, i) => { const x4 = serieÅr.slice(Math.max(0, i - 3), i + 1).filter((v) => v !== null); return i >= 3 && x4.length === 4 ? x4.reduce((a, b) => a + b, 0) / 4 : null; });
  const pts = snitt.map((v, i) => v === null ? null : `${x(i + 1)},${y(v)}`).filter(Boolean);
  if (pts.length > 1) g.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="#0A2240" stroke-width="2.2" stroke-linejoin="round"/>`);
  const etikett = (w, v, farge) => g.push(`<text x="${x(w)}" y="${y(v) - 5}" text-anchor="middle" font-size="9" font-weight="800" fill="${farge}">${v}</text>`);
  if (toppUke.w && toppUke.w !== sisteNr) etikett(toppUke.w, toppUke.v, "#41506b");
  if (sisteNr) etikett(sisteNr, serieÅr[sisteNr - 1], "#9a7a12");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" font-family="Manrope,sans-serif">${g.join("")}</svg>`;
})();

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
.kpi>div{flex:1;border:1px solid #dfe4ec;border-radius:8px;padding:11px 13px}
.kpi b{display:block;font-size:19pt;font-weight:800;color:#0A2240;line-height:1.1}
.kpi>div>span{font-size:8pt;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;display:block;margin-top:3px}
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
.kort{font-size:11.5pt;line-height:1.6;color:#1a2333;background:#f7f9fc;border-left:3px solid #C9A227;padding:12px 15px;border-radius:0 8px 8px 0}
.leg{display:flex;gap:18px;font-size:8.5pt;color:#41506b;margin:4px 0 12px}
.leg i{display:inline-block;width:14px;height:9px;margin-right:6px;vertical-align:-1px;border-radius:2px}
.kpi .s{font-size:8.5pt;color:#6b7280;margin-top:4px;line-height:1.4}
.forside{page-break-after:always}
.varsel.ok{background:#152616;border-left:4px solid #3f9e4d;color:#d6f0d9}
</style></head><body>
<div class="top"><h1>FT Aviation<br>Ukesrapport</h1>
<div class="sub">Uke ${sisteNr} · ${G.na[0]} til ${G.na[1]}</div>
<div class="gull"></div></div>

<div class="forside">
<h2 style="margin-top:4px">Kort fortalt</h2>
<div class="kort">${kort.join(" ")}</div>

<h2>Besøk på ft-aviation.no, uke for uke i ${iÅr}</h2>
${graf}
<div class="leg"><span><i style="background:#A9C1E3"></i>Besøk per uke</span><span><i style="background:#C9A227"></i>Uke ${sisteNr}</span>
<span><i style="background:#0A2240;height:3px"></i>Snitt fire uker</span>${serieFjor.some((v) => v !== null) ? `<span><i style="border-top:2px dashed #8a93a6;height:0;border-radius:0"></i>Samme uke i ${iFjor}</span>` : ""}</div>

<div class="kpi">
<div><b>${NO(ukaNå)}</b><span>besøk i uke ${sisteNr}</span><div class="s">${snittFør !== null ? `Snitt de fire ukene før: ${NO(snittFør)}` : ""}</div></div>
<div><b>${s4 === null ? "–" : NO(s4)}</b><span>besøk siste fire uker</span><div class="s">${s4før !== null ? `Fire uker før: ${NO(s4før)}` : ""}${s4fjor !== null ? `<br>Samme uker i ${iFjor}: ${NO(s4fjor)}` : ""}</div></div>
<div><b>${NO(hittil)}</b><span>besøk hittil i ${iÅr}</span><div class="s">${sisteNr ? `Snitt ${NO(Math.round(hittil / sisteNr))} per uke` : ""}</div></div>
<div><b>${toppUke.w ? NO(toppUke.v) : "–"}</b><span>beste uke i år</span><div class="s">${toppUke.w ? `Uke ${toppUke.w}` : ""}</div></div>
</div>
<div class="note" style="margin-top:12px">Tallene er små, så én uke kan svinge mye uten at noe har endret seg. Følg den mørke linja, snittet over fire uker, for å se retningen.</div>

${varsel ? `<div class="varsel ${varsel.grad}"><b>${varsel.grad === "kritisk" ? "Varsel" : varsel.grad === "advarsel" ? "Se på dette" : "Merk"}: ${varsel.tittel}</b><br>${varsel.tekst}</div>`
  : `<div class="varsel ok"><b>Synligheten i Google er normal.</b> ${googleTekst}</div>`}
</div>

<div class="top" style="padding:14px 24px;margin-bottom:6px"><h1 style="font-size:14pt">Detaljer for uka</h1></div>

<h2>Besøk på ft-aviation.no</h2>
<div class="kpi">${kpi.map(([n, a, b]) =>
  `<div><b>${NO(a)}</b><span>${n}</span><div style="font-size:8.5pt;margin-top:4px">${pil(a, b)} <span style="color:#8a93a6">fra ${NO(b)}</span></div></div>`).join("")}</div>

<div class="två">
<div><h2>Hvor de kom fra</h2><table><tr><th>Kom fra</th><th class="n">Besøk</th></tr>
${kanaler.map(([k, n]) => `<tr><td>${kanal(k)}</td><td class="n">${NO(n)}</td></tr>`).join("")}</table></div>
<div><h2>Mest leste sider</h2><table><tr><th>Side</th><th class="n">Ganger lest</th></tr>
${sider.slice(0, 6).map(([p, n]) => `<tr><td>${tittel(p)}</td><td class="n">${NO(n)}</td></tr>`).join("")}</table></div>
</div>

<div style="page-break-inside:avoid"><h2>Aviation på fosen-tools.no</h2>
<div class="note" style="margin-bottom:8px">Trafikken til <b>/aviation</b>-seksjonen på fosen-tools.no, samme uke — luftfartskunder som kommer via hovednettstedet.</div>
<div class="kpi">
<div><b>${NO(v(avN, 0))}</b><span>besøk</span><div style="font-size:8.5pt;margin-top:4px">${pil(v(avN, 0), v(avF, 0))} <span style="color:#8a93a6">fra ${NO(v(avF, 0))}</span></div></div>
<div><b>${NO(v(avN, 1))}</b><span>personer</span><div style="font-size:8.5pt;margin-top:4px">${pil(v(avN, 1), v(avF, 1))} <span style="color:#8a93a6">fra ${NO(v(avF, 1))}</span></div></div>
<div><b>${NO(v(avN, 2))}</b><span>sider lest</span><div style="font-size:8.5pt;margin-top:4px">${pil(v(avN, 2), v(avF, 2))} <span style="color:#8a93a6">fra ${NO(v(avF, 2))}</span></div></div>
</div>
<div class="två">
<div><h2>Hvor de kom fra</h2><table><tr><th>Kom fra</th><th class="n">Besøk</th></tr>
${avKanal.map(([k, n]) => `<tr><td>${kanal(k)}</td><td class="n">${NO(n)}</td></tr>`).join("") || "<tr><td colspan=2>Ingen besøk denne uka</td></tr>"}</table></div>
<div><h2>Mest leste aviation-sider</h2><table><tr><th>Side</th><th class="n">Ganger lest</th></tr>
${avSider.slice(0, 6).map(([p, n]) => `<tr><td>${tittel(p)}</td><td class="n">${NO(n)}</td></tr>`).join("") || "<tr><td colspan=2>Ingen sider lest denne uka</td></tr>"}</table></div>
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
${ord.length ? `<div class="pk" style="margin-bottom:6px">Søk i Google som ga klikk inn til nettsiden, siste 30 dager.</div>
<table><tr><th>Søkte på</th><th class="n">Klikket</th><th class="n">Vist i Google</th><th class="n">Plass i snitt</th></tr>
${ord.map((r) => `<tr><td>${r.keys[0]}</td><td class="n">${r.clicks}</td><td class="n">${r.impressions}</td><td class="n">${r.position.toFixed(1)}</td></tr>`).join("")}</table>` : ""}

<h2>Publisert denne uka</h2>
<div class="två">
<div>${fb && fb.length ? `<div class="pk"><b>Facebook:</b> ${fb.length} ${fb.length === 1 ? "publisering" : "publiseringer"} denne uka</div>
${fb.map((p) => `<div class="pk">${p.dato} — ${p.tekst}…</div>`).join("")}`
  : `<div class="pk">Ingen Facebook-publiseringer registrert denne uka.</div>`}
${ig && ig.length ? `<div class="pk" style="margin-top:8px"><b>Instagram:</b> ${ig.length} ${ig.length === 1 ? "publisering" : "publiseringer"}</div>
${ig.map((p) => `<div class="pk">${p.dato} — ${p.tekst}… <span style="color:#8a93a6">(${p.type})</span></div>`).join("")}` : ""}</div>
<div>${yt ? `<div class="pk"><b>YouTube:</b> ${yt.nye.length ? `${yt.nye.length} ${yt.nye.length === 1 ? "video publisert" : "videoer publisert"} denne uka` : "ingen nye videoer denne uka"}</div>
${yt.nye.map((v) => `<div class="pk">${v.publisert} — ${v.tittel.slice(0, 70)}${v.format ? ` <span style="color:#8a93a6">(${v.format})</span>` : ""}</div>`).join("")}` : `<div class="pk">YouTube-tall ikke tilgjengelig.</div>`}</div>
</div>

${yt ? `<div style="page-break-inside:avoid"><h2>YouTube</h2>
<div class="kpi">
<div><b>${yt.uke ? NO(yt.uke.visninger) : "–"}</b><span>avspillinger denne uka</span><div style="font-size:8.5pt;margin-top:4px">${yt.uke && yt.forrige ? `${pil(yt.uke.visninger, yt.forrige.visninger)} <span style="color:#8a93a6">fra ${NO(yt.forrige.visninger)}</span>` : `<span style="color:#8a93a6">ingen uke å sammenligne med ennå</span>`}</div></div>
${yt.kilde === "analytics" ? `<div><b>${NO(Math.round(yt.uke.minutter))}</b><span>minutter sett</span><div style="font-size:8.5pt;margin-top:4px">${yt.forrige ? `${pil(Math.round(yt.uke.minutter), Math.round(yt.forrige.minutter))} <span style="color:#8a93a6">fra ${NO(Math.round(yt.forrige.minutter))}</span>` : ""}</div></div>
<div><b>${NO(yt.uke.abonnenter)}</b><span>nye abonnenter</span><div style="font-size:8.5pt;margin-top:4px"><span style="color:#8a93a6">${NO(yt.abonnenter)} totalt</span></div></div>`
  : `<div><b>${NO(yt.abonnenter)}</b><span>abonnenter</span></div>`}
<div><b>${NO(yt.visninger)}</b><span>avspillinger totalt</span><div style="font-size:8.5pt;margin-top:4px"><span style="color:#8a93a6">${yt.videoer} videoer på kanalen</span></div></div>
</div>
${yt.topp?.length ? `<table><tr><th>Video</th><th>Format</th><th class="n">Denne uka</th>${yt.kilde === "analytics" ? `<th class="n">Minutter sett</th>` : ""}<th class="n">Totalt</th></tr>
${yt.topp.map((t) => `<tr><td>${t.tittel.slice(0, 58)}</td><td>${t.format}</td><td class="n">${NO(t.uke)}</td>${yt.kilde === "analytics" ? `<td class="n">${NO(Math.round(t.minutter))}</td>` : ""}<td class="n">${t.totalt === null ? "" : NO(t.totalt)}</td></tr>`).join("")}</table>` : ""}
</div>` : ""}

<footer><span>FT Aviation AS · Industrigata 1, N-7130 Brekstad</span>
<span>Generert ${new Date().toISOString().slice(0, 10)}</span></footer>
</body></html>`;

const utDir = `${os.homedir()}/Desktop/Fosen Tools/FT Aviation/Ukesrapporter`;
fs.mkdirSync(utDir, { recursive: true });
const ut = `${utDir}/FTA-ukesrapport-${G.na[1]}.pdf`;
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent(html, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: ut, format: "A4", printBackground: true });
await b.close();
console.log("✅ " + ut);
