/**
 * wera-meta.mjs — metatittel og metabeskrivelse per produktgruppe.
 *
 *   node --env-file=.env.local scripts/wera-meta.mjs "Momentnøkler"
 *   node --env-file=.env.local scripts/wera-meta.mjs --grupper     (list alle)
 *
 * Kilder: wera_product_cache (dypskrapet) med fallback til FT sin produktside.
 * Kjører generering → kontroll → retting, inntil 3 runder, og skriver CSV.
 */
import fs from "node:fs";
import XLSX from "xlsx";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const UT = "/Users/adrianhpettersen/Multicase";

const arg = process.argv[2];
const rens = s => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

// ── kilder ────────────────────────────────────────────────────────────
const kat = XLSX.utils.sheet_to_json(
  XLSX.readFile(`${UT}/SjekkeOmDetErNoenProdukterPåNettSomHar0kr som utsalgspris.xls`).Sheets["Multicase"], { defval: "" });
// Sveipet over hvilke varer som finnes på nett. Ligger i scripts/data/ fordi
// /tmp tømmes ved omstart — det skjedde 9. september og kostet 40 minutters sveip.
const paaNett = new Set();
let harSveip = false;
for (const f of ["scripts/data/paa-nett.json", "/tmp/fasit.json", "/tmp/rest2-sjekket.json"])
  if (fs.existsSync(f)) { harSveip = true; for (const x of JSON.parse(fs.readFileSync(f, "utf8"))) if (x.paaNett) paaNett.add(x.varenr); }
if (!harSveip) console.log("⚠ Ingen sveipefil funnet — tar med alle produkter, også de uten produktside.\n");

const seen = new Set(), alle = [];
for (const r of kat) {
  const k = String(r.VareNr).trim(); if (!k || seen.has(k)) continue; seen.add(k);
  if (!/WERA/i.test(String(r.HovedLeverandør)) && !/WERA/i.test(String(r.ProdusentNavn))) continue;
  alle.push({ k, d1: String(r.ProduktDesc1).trim(), d2: String(r.ProduktDesc2).trim(),
    lev: String(r.LeverandProduktNr).trim(), gruppe: String(r.GruppeLev2Txt) || String(r.GruppeLev1Txt),
    nett: paaNett.has(k) });
}
if (arg === "--grupper") {
  const g = {}; for (const x of alle.filter(x => !harSveip || x.nett)) g[x.gruppe] = (g[x.gruppe] || 0) + 1;
  Object.entries(g).sort((a, b) => b[1] - a[1]).forEach(([n, c]) => console.log(String(c).padStart(5) + "  " + n));
  process.exit(0);
}
const GRUPPE = arg;
const w = alle.filter(x => (!harSveip || x.nett) && x.gruppe === GRUPPE);
if (!w.length) { console.error(`Fant ingen produkter i gruppa "${GRUPPE}". Kjør --grupper for liste.`); process.exit(1); }
console.log(`${GRUPPE}: ${w.length} produkter\n`);

// cache
const cache = new Map(); let off = 0;
while (true) {
  const r = await fetch(`${SUPA}/rest/v1/wera_product_cache?select=code,description_sections,produktinformasjon_html&limit=500&offset=${off}`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  const d = await r.json(); d.forEach(x => cache.set(String(x.code).trim(), x));
  if (d.length < 500) break; off += 500;
}

// kildetekst
const kilder = [];
for (const x of w) {
  const c = cache.get(x.lev);
  let kilde = "";
  if (c) {
    const ds = Array.isArray(c.description_sections) ? c.description_sections.map(s => s.text || "").join(" ") : "";
    kilde = rens(ds || c.produktinformasjon_html).slice(0, 700);
  }
  if (!kilde) {
    try {
      const r = await fetch(`https://fosen-tools.no/x/${x.k}/x`, { headers: { "User-Agent": UA }, redirect: "follow" });
      const tx = rens((await r.text()).replace(/<script[\s\S]*?<\/script>/g, " "));
      kilde = ((tx.match(/Teknisk info(.{0,600})/) || tx.match(/Beskrivelse(.{0,600})/) || [])[1] || "").trim();
      if (/Nyhetsmail|Register deg/.test(kilde.slice(0, 60))) kilde = "";
    } catch {}
  }
  kilder.push({ varenr: x.k, navn: x.d1, tillegg: x.d2, kilde: kilde.slice(0, 600) });
}
console.log(`Kilde funnet for ${kilder.filter(k => k.kilde).length} av ${kilder.length}\n`);

// ── kontroll ──────────────────────────────────────────────────────────
const norm = s => String(s).toLowerCase().replace(/[\s.,–-]/g, "");
// ord som IKKE er modellkode selv om de står i Produktbeskrivelse 2
const IKKEKODE = /^(wera|og|for|med|type|mm|nm|kg|stk|deler|del|justerbar|fast|høyre|venstre|høyre\/venstregange|momentnøkkel|skrutrekker|nøkkel|sett|bits?|bitsinf|inkl|uten|til|i|på|av|som|den|det|en|et)$/i;
const tallene = s => (String(s).match(/\d+(?:[.,]\d+)?/g) || []);

function kontroller(ut) {
  const feil = new Map(); const T = new Map(), B = new Map();
  const legg = (v, m) => feil.set(v, [...(feil.get(v) || []), m]);
  for (const o of ut) {
    const k = kilder.find(x => x.varenr === o.varenr); if (!k) continue;
    if (T.has(o.tittel)) legg(o.varenr, `duplikat tittel med ${T.get(o.tittel)}`); else T.set(o.tittel, o.varenr);
    if (B.has(o.beskrivelse)) legg(o.varenr, `duplikat beskrivelse med ${B.get(o.beskrivelse)}`); else B.set(o.beskrivelse, o.varenr);
    if (o.tittel.length > 58) legg(o.varenr, `tittel ${o.tittel.length} tegn, maks 58`);
    if (o.beskrivelse.length < 110) legg(o.varenr, `beskrivelse ${o.beskrivelse.length} tegn, minst 110`);
    if (o.beskrivelse.length > 160) legg(o.varenr, `beskrivelse ${o.beskrivelse.length} tegn, maks 160`);
    const kode = k.tillegg.replace(/[–-]?\s*Wera\s*$/i, "").trim();
    // ledd som må overleve: alt med siffer, og serienavn (Stor forbokstav eller bindestrek)
    const maaMed = x => x.length >= 2 && !IKKEKODE.test(x) &&
      (/\d/.test(x) || /-/.test(x) || /^[A-ZÆØÅ][a-zæøå]/.test(x));
    const mangler = kode.split(/[\s,]+/).filter(maaMed)
      .filter(x => !norm(o.tittel).includes(norm(x)));
    if (mangler.length) legg(o.varenr, `mistet fra modellkode: ${mangler.join(" ")}`);
    // svenske ord fra kildenavnet skal ikke overleve i tittelen
    const sv = o.tittel.match(/\b(insats\w*|verktyg\w*|nyckel\w*|nycklar|skruvmejsel\w*|tång|hylsa)\b/gi);
    if (sv) legg(o.varenr, `svensk ord i tittel: ${[...new Set(sv)].join(" ")}`);
    const kilde = norm(k.navn + k.tillegg + k.kilde);
    const nye = [...new Set([...tallene(o.tittel), ...tallene(o.beskrivelse)])].filter(t => !kilde.includes(norm(t)));
    if (nye.length) legg(o.varenr, `tall ikke i kilden: ${nye.join(", ")}`);
  }
  return feil;
}

// ── generering ────────────────────────────────────────────────────────
const REGLER = `Merket er Wera.

TITTEL
- Produkttype først, så mål eller kapasitet, så Wera og modellkoden.
- 45 til 58 tegn. Nettbutikken legger selv på " - Fosen Tools AS", så ikke skriv firmanavn.
- Norsk setningsform, ikke VERSALER. Enheter med mellomrom: 50 Nm, 200 mm, 1/4".
- Kildenavnet kan inneholde svenske ord. Skriv alltid norsk: innstikk, ikke insats. Verktøy, ikke verktyg. Nøkkel, ikke nyckel.
- Skriv ut forkortelser: DR. faller bort, HF blir holdefunksjon, GJ KLINGE blir gjennomgående klinge, M/ blir med, MAG blir magnet.
- ALLE mål, innsatsstørrelser og modellkoder fra "navn" og "tillegg" må være med, også serienavn som Click-Torque og suffiks som SB.

BESKRIVELSE
- 120 til 155 tegn, aldri under 110 eller over 160. Én til to hele setninger på norsk.
- Start med merke og modell, si hva produktet er og hva som kjennetegner det.
- Bruk kun opplysninger fra "kilde", "navn" eller "tillegg".
- To produkter som skiller seg i størrelse må ha ulik beskrivelse.

ABSOLUTT
- Aldri finn på spesifikasjoner, tall eller egenskaper som ikke står i kildedataene.
- Hver tittel og hver beskrivelse må være unik.

Svar med ren JSON: [{"varenr":"...","tittel":"...","beskrivelse":"..."}]`;

async function kall(prompt) {
  for (const m of ["gemini-2.5-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"])
    for (let f = 0; f < 3; f++) {
      try { return await ai.models.generateContent({ model: m, contents: prompt }); }
      catch (e) { if (![503, 429].includes(e.status)) throw e; await new Promise(s => setTimeout(s, 5000 * (f + 1))); }
    }
  return null;
}
async function generer(batch, retting) {
  const p = retting
    ? `Rett disse metatitlene og metabeskrivelsene. Feilene står i "problem" og MÅ løses.\n\n${REGLER}\n\n${JSON.stringify(batch, null, 1)}`
    : `Skriv metatittel og metabeskrivelse for produktsider i en norsk nettbutikk for proffverktøy.\n\n${REGLER}\n\nPRODUKTER:\n${JSON.stringify(batch, null, 1)}`;
  const venta = new Set(batch.map(b => b.varenr));
  for (let f = 0; f < 3; f++) {
    const r = await kall(p); if (!r) continue;
    let d = []; try { d = JSON.parse(r.text.replace(/```json|```/g, "").trim()); } catch { continue; }
    d = d.filter(o => venta.has(o.varenr) && o.tittel && o.beskrivelse);
    if (d.length === venta.size) return d;
    console.log(`\n  batch ga ${d.length} av ${venta.size}, prøver igjen`);
    await new Promise(s => setTimeout(s, 3000));
  }
  return [];
}

let ut = [];
for (let i = 0; i < kilder.length; i += 10) {
  ut.push(...await generer(kilder.slice(i, i + 10), false));
  process.stdout.write(`\r  runde 1: ${ut.length}/${kilder.length}`);
  await new Promise(s => setTimeout(s, 1200));
}
console.log("");

for (let runde = 2; runde <= 3; runde++) {
  const feil = kontroller(ut);
  if (!feil.size) break;
  console.log(`  runde ${runde}: retter ${feil.size}`);
  const batch = [...feil.entries()].map(([v, m]) => {
    const k = kilder.find(x => x.varenr === v), o = ut.find(x => x.varenr === v);
    return { ...k, forrige_tittel: o.tittel, forrige_beskrivelse: o.beskrivelse, problem: m };
  });
  const nye = new Map();
  for (let i = 0; i < batch.length; i += 8) {
    (await generer(batch.slice(i, i + 8), true)).forEach(o => nye.set(o.varenr, o));
    await new Promise(s => setTimeout(s, 1200));
  }
  ut = ut.map(o => nye.get(o.varenr) || o);
}

// ── resultat ──────────────────────────────────────────────────────────
const feil = kontroller(ut);
console.log(`\n${"═".repeat(60)}`);
console.log(`${GRUPPE}: ${ut.length} produkter, ${feil.size} med gjenstående avvik\n`);
for (const o of ut.slice(0, 8)) {
  console.log(`${o.varenr}  [${String(o.tittel.length).padStart(2)}] ${o.tittel}`);
  console.log(`          [${o.beskrivelse.length}] ${o.beskrivelse}`);
}
if (feil.size) { console.log(`\nAvvik:`); for (const [v, m] of feil) console.log(`  ${v}  ${m.join(" · ")}`); }

const mistet = kilder.filter(k => !ut.some(o => o.varenr === k.varenr));
if (mistet.length) {
  console.error(`\n🔴 STOPP: ${mistet.length} produkter mangler i resultatet — ${mistet.map(m => m.varenr).join(", ")}`);
  console.error("   CSV er IKKE skrevet. Kjør gruppa på nytt.");
  process.exit(1);
}
const q = s => `"${String(s).replace(/"/g, '""')}"`;
const K = new Map(kilder.map(x => [x.varenr, x]));
const rad = (o, v) => `${o.varenr};${q(K.get(o.varenr).navn)};${q(K.get(o.varenr).tillegg)};${q(v)};Norsk`;
const slug = GRUPPE.toLowerCase().replace(/[^a-zæøå0-9]+/g, "-");
fs.writeFileSync(`${UT}/KJØR-wera-${slug}-tittel.csv`,
  "﻿" + 'Varenummer;"Produktbeskrivelse 1";"Produktbeskrivelse 2";MetaTitle;Språk\n' + ut.map(o => rad(o, o.tittel)).join("\n") + "\n");
fs.writeFileSync(`${UT}/KJØR-wera-${slug}-beskrivelse.csv`,
  "﻿" + 'Varenummer;"Produktbeskrivelse 1";"Produktbeskrivelse 2";MetaDescription;Språk\n' + ut.map(o => rad(o, o.beskrivelse)).join("\n") + "\n");
console.log(`\n${UT}/KJØR-wera-${slug}-tittel.csv`);
console.log(`${UT}/KJØR-wera-${slug}-beskrivelse.csv`);
