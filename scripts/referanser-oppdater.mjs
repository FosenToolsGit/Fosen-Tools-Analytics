// Holder /referanser på fosen-tools.no oppdatert av seg selv.
//
// Leser sitemapen, finner alle case-sidene under /referanser/{kategori}/{slug},
// rendrer de nye i en ekte nettleser (innholdet på Multicase lastes med JS) og
// henter tittel, kunde, bransje, løsning, år og første bilde. Lager en
// miniatyr per case og legger alt i én JSON-fil i Supabase Storage.
// Publiseringen på /referanser og kategorisidene leser den fila, så en ny
// case-side i Multicase dukker opp i rutenettene uten at noe limes inn.
//
// Kjøres av GitHub Actions (.github/workflows/referanser.yml) hver time.
// Lokalt:  node --env-file=.env.local scripts/referanser-oppdater.mjs [--alle] [--tørr]
//   --alle  rendrer alle casene på nytt (ellers bare nye, og alle én gang i døgnet)
//   --tørr  laster ikke opp noe, skriver JSON til scripts/data/referanser.json

import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";

const SITE = "https://fosen-tools.no";
const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "social_assets";
const MAPPE = "brand-assets/referanser";
const JSON_STI = `${MAPPE}/referanser.json`;
const PUBLIC = `${SUPA}/storage/v1/object/public/${BUCKET}`;
const ALLE = process.argv.includes("--alle");
const TORR = process.argv.includes("--tørr") || process.argv.includes("--torr");
const FULL_ETTER_TIMER = 20;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

// Rekkefølgen kategoriene vises i. Nye kategorier i sitemapen kommer etter, av seg selv.
const KAT_REKKE = ["verktøyvogner", "verktøykofferter", "verktøykasser", "verktøyinnlegg",
  "verkstedinnredning", "softcase", "våpenlagring", "lasermerking", "containere"];

if (!SUPA || !KEY) { console.error("Mangler NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

const ascii = (s) => s.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
  .normalize("NFKD").replace(/[^\x00-\x7f]/g, "").replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
const stor = (s) => s.charAt(0).toUpperCase() + s.slice(1);

async function lastOpp(sti, body, type, cache = "604800") {
  const r = await fetch(`${SUPA}/storage/v1/object/${BUCKET}/${sti}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": type, "x-upsert": "true", "cache-control": `max-age=${cache}` },
    body,
  });
  if (!r.ok) throw new Error(`Opplasting ${sti}: ${r.status} ${await r.text()}`);
}

// 1. Sitemapen er fasiten på hvilke sider som finnes
async function lesSitemap() {
  const t = await (await fetch(`${SITE}/sitemap.xml`, { headers: { "user-agent": UA } })).text();
  const urls = [...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decodeURIComponent(m[1].trim()).replace(SITE, ""));
  const kat = [], caser = [];
  for (const u of urls) {
    const p = u.split("/").filter(Boolean);
    if (p[0] !== "referanser") continue;
    if (p.length === 2) kat.push(p[1]);
    if (p.length === 3) caser.push({ kat: p[1], slug: p[2], sti: u });
  }
  return { kat, caser };
}

// 2. Forrige versjon av datafila, så vi bare rendrer det som er nytt
async function lesForrige() {
  try {
    const r = await fetch(`${PUBLIC}/${JSON_STI}?t=${Date.now()}`);
    if (r.ok) return await r.json();
  } catch {}
  return null;
}

// 3. Render én case-side og les faktaboksen
async function lesCase(page, sti) {
  await page.goto(SITE + encodeURI(sti), { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".ft-case__fakta", { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => [...document.images].some((i) => /\/userfiles\/image\/(Referanser|Inspirasjon)\//.test(i.getAttribute("src") || "")), null, { timeout: 8000 }).catch(() => {});
  return page.evaluate(() => {
    const tekst = (e) => (e ? e.textContent.replace(/\s+/g, " ").trim() : "");
    const fakta = {};
    const boks = document.querySelector(".ft-case__fakta");
    if (boks) {
      boks.querySelectorAll(".ft-case__felt").forEach((f) => { fakta[tekst(f.querySelector(".ft-case__k")).toLowerCase()] = tekst(f.querySelector(".ft-case__v")); });
      boks.querySelectorAll("dt").forEach((dt) => { fakta[tekst(dt).toLowerCase()] = tekst(dt.nextElementSibling); });
    }
    const img = [...document.images].map((i) => i.getAttribute("src") || "")
      .find((s) => /\/userfiles\/image\/(Referanser|Inspirasjon)\//.test(s));
    return {
      tittel: tekst(document.querySelector("h1")),
      kunde: fakta.kunde || "",
      bransje: fakta.bransje || "",
      losning: fakta["løsning"] || "",
      aar: parseInt(fakta.levert, 10) || null,
      bilde: img ? img.split("?")[0] : "",
      harFakta: !!boks,
    };
  });
}

// 4. Miniatyr: 600 px WebP i Supabase. Multicase har ingen bildeskalerer for /userfiles.
async function lagTommel(c) {
  const r = await fetch(SITE + c.bilde, { headers: { "user-agent": UA } });
  if (!r.ok || !/image/.test(r.headers.get("content-type") || "")) throw new Error(`bilde ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const ut = await sharp(buf).rotate().resize(600, 600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
  const sti = `${MAPPE}/${ascii(c.kat)}/${ascii(c.slug)}.webp`;
  if (!TORR) await lastOpp(sti, ut, "image/webp");
  return { tommel: `${PUBLIC}/${sti}`, kb: Math.round(ut.length / 1024) };
}

const start = Date.now();
const { kat: katSitemap, caser } = await lesSitemap();
if (caser.length < 50) { console.error(`Sitemapen ga bare ${caser.length} caser — avbryter uten å skrive noe.`); process.exit(1); }

const forrige = (ALLE ? null : await lesForrige()) || { caser: [] };
const gamle = new Map((forrige.caser || []).map((c) => [c.sti, { ...c, slug: c.sti.split("/").pop(), tommel: c.tommel ? (/^https?:/.test(c.tommel) ? c.tommel : PUBLIC + "/" + c.tommel) : "" }]));
const full = ALLE || !forrige.full || (Date.now() - Date.parse(forrige.full)) / 36e5 > FULL_ETTER_TIMER;
const aaRendre = caser.filter((c) => full || !gamle.has(c.sti));
console.log(`Sitemap: ${caser.length} caser i ${katSitemap.length} kategorier. ${full ? "Full runde" : "Bare nye"}: ${aaRendre.length} å rendre.`);

const nye = new Map();
const feil = [];
if (aaRendre.length) {
  const nett = await chromium.launch();
  const ctx = await nett.newContext({ userAgent: UA, viewport: { width: 1280, height: 900 } });
  await ctx.route(/(googletagmanager|google-analytics|cookiebot|facebook|freshchat|freshworks|hotjar)/, (r) => r.abort());
  const ko = [...aaRendre];
  await Promise.all(Array.from({ length: 4 }, async () => {
    const page = await ctx.newPage();
    while (ko.length) {
      const c = ko.shift();
      try {
        const d = await lesCase(page, c.sti);
        if (!d.tittel) throw new Error("ingen H1");
        const gml = gamle.get(c.sti);
        let tommel = gml && gml.bilde === d.bilde ? gml.tommel : "";
        if (!tommel && d.bilde) { try { tommel = (await lagTommel({ ...c, bilde: d.bilde })).tommel; } catch (e) { feil.push(`${c.sti}: miniatyr (${e.message})`); } }
        nye.set(c.sti, { ...c, ...d, tommel, forst_sett: gml?.forst_sett || new Date().toISOString() });
        delete nye.get(c.sti).harFakta;
        if (!d.harFakta) feil.push(`${c.sti}: fant ingen faktaboks`);
      } catch (e) {
        feil.push(`${c.sti}: ${e.message}`);
      }
    }
    await page.close();
  }));
  await nett.close();
}

// Sett sammen: rendret nå > forrige versjon. Sider som ikke lenger er i sitemapen faller ut.
// Klarte vi ikke rendre en side, beholder vi forrige versjon av den.
const alle = caser.map((c) => nye.get(c.sti) || gamle.get(c.sti)).filter(Boolean);
const rekkeIndeks = new Map(caser.map((c, i) => [c.sti, i]));
alle.sort((a, b) => (b.aar || 0) - (a.aar || 0) || Date.parse(b.forst_sett) - Date.parse(a.forst_sett) || rekkeIndeks.get(a.sti) - rekkeIndeks.get(b.sti));

const katSlugs = [...new Set([...katSitemap, ...alle.map((c) => c.kat)])]
  .sort((a, b) => ((KAT_REKKE.indexOf(a) + 1) || 99) - ((KAT_REKKE.indexOf(b) + 1) || 99) || a.localeCompare(b, "nb"));
const kategorier = katSlugs.map((k) => {
  const i = alle.filter((c) => c.kat === k);
  return { slug: k, navn: stor(k), sti: `/referanser/${k}`, antall: i.length, tommel: (i.find((c) => c.tommel) || {}).tommel || "" };
}).filter((k) => k.antall > 0);

const slank = (c) => ({
  sti: c.sti, kat: c.kat, tittel: c.tittel, kunde: c.kunde, bransje: c.bransje, losning: c.losning,
  aar: c.aar, bilde: c.bilde, tommel: c.tommel ? c.tommel.replace(PUBLIC + "/", "") : "", forst_sett: c.forst_sett,
});
const data = {
  oppdatert: new Date().toISOString(),
  base: PUBLIC + "/",
  full: full ? new Date().toISOString() : forrige.full,
  antall: alle.length,
  kategorier: kategorier.map((k) => ({ ...k, tommel: k.tommel.replace(PUBLIC + "/", "") })),
  caser: alle.map(slank),
};

const json = JSON.stringify(data);
if (TORR) {
  fs.mkdirSync("scripts/data", { recursive: true });
  fs.writeFileSync("scripts/data/referanser.json", JSON.stringify(data, null, 1));
  console.log("Tørrkjøring: skrev scripts/data/referanser.json");
} else {
  const innhold = (d) => JSON.stringify({ k: d.kategorier, c: d.caser });
  if (!full && forrige.caser && innhold(forrige) === innhold(data)) {
    console.log("Ingen endringer, lastet ikke opp.");
  } else {
    await lastOpp(JSON_STI, json, "application/json", "300");
    console.log(`Lastet opp ${PUBLIC}/${JSON_STI}`);
  }
}

const nyeCaser = alle.filter((c) => !gamle.has(c.sti));
console.log(`${alle.length} caser, ${kategorier.length} kategorier, ${Math.round(json.length / 1024)} kB JSON, ${Math.round((Date.now() - start) / 1000)} s.`);
if (gamle.size && nyeCaser.length) console.log("Nye siden sist:\n  " + nyeCaser.map((c) => c.sti).join("\n  "));
const borte = [...gamle.keys()].filter((s) => !caser.some((c) => c.sti === s));
if (borte.length) console.log("Fjernet (ikke lenger i sitemapen):\n  " + borte.join("\n  "));
if (feil.length) console.log(`Advarsler (${feil.length}):\n  ` + feil.join("\n  "));
