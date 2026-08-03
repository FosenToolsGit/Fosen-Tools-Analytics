/**
 * mandag-kategori.ts — mandagens produktshowcase fra en FT-kategori.
 *
 * Henter topp 3 produkter på lager fra en kategori på fosen-tools.no,
 * rendrer multi-produkt-karusell + bygger captions med UTM.
 *
 * Bruk:
 *   npm run mandag -- --uke 23                # bruker rotasjon-konfig
 *   npm run mandag -- --kategori skrutrekkere # overstyr kategori
 *   npm run mandag -- --date 2026-06-09       # spesifikk dato
 *
 * Output: out/dagens/YYYY-MM-DD/mandag-<kategori>/
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderVideo } from "../src/lib/services/video-render";
import type { VideoFormat, KampanjeProdukt } from "../remotion/types";
import { scrapeProductByUrl } from "../src/lib/services/scrape-product";
import { validateCaption, logValidation } from "./caption-rules";
import { pickMusicBed } from "../remotion/audio-registry";

const args = process.argv.slice(2);
function arg(name: string, def?: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  return args[i + 1] ?? def;
}

const date = arg("date", new Date().toISOString().slice(0, 10))!;
const ukeOverride = arg("uke");
const kategoriOverride = arg("kategori");
const formats = (arg("formats", "reel") || "reel").split(",").map((s) => s.trim()).filter(Boolean);

// ── les rotasjons-konfig ────────────────────────────────────────────

const rotasjon = JSON.parse(
  readFileSync("scripts/data/mandag-rotasjon.json", "utf8"),
).rotasjon as Array<{
  uke_offset: number;
  kategori: string;
  label: string;
  hook: string;
  eyebrow: string;
}>;

// Bestem uke + kategori
function ukeNummer(d: string): number {
  const dt = new Date(d);
  const start = new Date(dt.getFullYear(), 0, 1);
  const diff = (dt.getTime() - start.getTime()) / (24 * 3600 * 1000);
  return Math.ceil((diff + start.getDay() + 1) / 7);
}
const uke = ukeOverride ? parseInt(ukeOverride) : ukeNummer(date);
// Uke 23 = offset 0, uke 24 = offset 1 osv. (vi starter rotasjonen på uke 23 2026)
const slot = rotasjon[(uke - 23 + rotasjon.length * 10) % rotasjon.length];
const kategoriSlug = kategoriOverride ?? slot.kategori;
const aktiv = rotasjon.find((r) => r.kategori === kategoriSlug) ?? slot;

const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  return res.text();
}

async function main() {
console.log(`\n📅 Uke ${uke} · ${date}`);
console.log(`📦 Kategori: ${aktiv.label} (/produkter/${aktiv.kategori})`);
console.log(`🎬 Hook: ${aktiv.hook}\n`);

const katHtml = await fetchHtml(`https://fosen-tools.no/produkter/${aktiv.kategori}`);
// Match /produsent-slug/produkt-id direkte (Multicase bruker ulike attributter)
const productLinks = new Set<string>();
const NON_PRODUKT_SLUGS = new Set([
  "company", "file", "js", "produkter", "kundesenter",
]);
// Mønster: /<slug>/<numerisk-id> hvor slug ikke er en kjent ikke-produkt-path
const re = /\/([a-zæøåA-ZÆØÅ0-9-]+)\/(\d+)\b/g;
let m: RegExpExecArray | null;
while ((m = re.exec(katHtml))) {
  const slug = m[1];
  const id = m[2];
  // Skip kjente støy-slugs
  if (NON_PRODUKT_SLUGS.has(slug)) continue;
  // Skip Multicase image storage prefiks
  if (slug.startsWith("mc10256")) continue;
  // Skip GUID-lignende paths
  if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(slug)) continue;
  productLinks.add(`https://fosen-tools.no/${slug}/${id}`);
}
const allLinks = [...productLinks];
console.log(`🔍 Fant ${allLinks.length} produkt-lenker i kategorien`);

if (allLinks.length === 0) {
  console.error(`❌ Ingen produkter funnet i /produkter/${aktiv.kategori}. Sjekk slug.`);
  process.exit(1);
}

// ── scrape topp produkter, filtrer på lager ─────────────────────────

console.log(`🛒 Henter produkter (filtrerer på lager)...`);
const produkter: Array<{
  navn: string;
  produsent: string;
  pris: number;
  prisFør: number | null;
  bilde: string | null;
  url: string;
  lager: boolean;
  sku: string | null;
}> = [];

const BATCH = 6;
for (let i = 0; i < allLinks.length; i += BATCH) {
  const batch = allLinks.slice(i, i + BATCH);
  const results = await Promise.all(batch.map(async (url) => {
    try {
      const p = await scrapeProductByUrl(url);
      if (!p) return null;
      return {
        navn: p.name,
        produsent: p.manufacturer ?? "",
        pris: p.price_now ?? 0,
        prisFør: p.price_before ?? null,
        bilde: p.image_url ?? null,
        url,
        lager: p.in_stock === true,
        sku: p.sku ?? null,
      };
    } catch {
      return null;
    }
  }));
  produkter.push(...results.filter((p): p is NonNullable<typeof p> => !!p));
  process.stdout.write(`\r  ${produkter.length}/${allLinks.length}`);
}
console.log();

// Filter: på lager + har pris + har bilde + pris >= 200 (kvalitets-cutoff)
const valgbare = produkter
  .filter((p) => p.lager && p.pris >= 200 && p.bilde)
  .sort((a, b) => b.pris - a.pris);

console.log(`✅ ${valgbare.length} produkter på lager med pris + bilde\n`);

if (valgbare.length < 3) {
  console.error(`❌ Trenger minst 3 produkter, fant bare ${valgbare.length}.`);
  process.exit(1);
}

// ── Rangér på faktisk interesse (GA4-sidevisninger siste 60d) ───────
// Tidligere plukket vi dyreste/median/billigste, som ga rare miks
// (16 000 kr blindmuttertang + 224 kr adapter i «topp 3 batteriverktøy»).
// Sidevisninger er en langt bedre proxy for relevans: tilbehør som
// adaptere har ~0 visninger, mens ekte verktøy i kategorien har mange.
const visningerPerUrl = new Map<string, number>();
try {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const since = new Date(Date.now() - 60 * 864e5).toISOString();
  let from = 0;
  for (;;) {
    const { data } = await sb
      .from("platform_posts")
      .select("post_url,impressions")
      .eq("platform", "ga4")
      .gte("published_at", since)
      .range(from, from + 999);
    if (!data?.length) break;
    for (const row of data) {
      const path = (row.post_url || "").split("?")[0];
      const id = path.match(/\/(\d{5,6})(?:\/|$)/)?.[1];
      if (!id) continue;
      visningerPerUrl.set(id, (visningerPerUrl.get(id) ?? 0) + (row.impressions || 0));
    }
    if (data.length < 1000) break;
    from += 1000;
  }
} catch (e) {
  console.warn("⚠️  Kunne ikke hente GA4-visninger, faller tilbake til pris-rangering.");
}

const visningerFor = (url: string) => {
  const id = url.match(/\/(\d{5,6})(?:\/|$)/)?.[1];
  return id ? (visningerPerUrl.get(id) ?? 0) : 0;
};

const rangert = [...valgbare].sort((a, b) => {
  const dv = visningerFor(b.url) - visningerFor(a.url);
  if (dv !== 0) return dv;
  return b.pris - a.pris; // uavgjort → dyrest først
});

const medVisninger = rangert.filter((p) => visningerFor(p.url) > 0).length;
console.log(
  medVisninger > 0
    ? `📊 ${medVisninger} av dem har GA4-trafikk siste 60d — rangerer på faktisk interesse`
    : `📊 Ingen GA4-trafikk i kategorien — rangerer på pris`,
);

const topp3 = rangert.slice(0, 3);

console.log("Valgte produkter:");
for (const [i, p] of topp3.entries()) {
  const v = visningerFor(p.url);
  console.log(`  ${i + 1}. ${p.navn} (${p.produsent}) – ${p.pris.toFixed(0)} kr${v ? `  · ${v} sidevisninger 60d` : ""}`);
  console.log(`     ${p.url}`);
}

// ── render Kampanje Teaser ──────────────────────────────────────────

// Rens produktnavn fra Multicase-rariteter:
//   - Fjern dobbeltkolon (":: → " ")
//   - Fjern enkelt-kolon brukt som separator i CAPS-headere
//   - Trim overflødige mellomrom
//   - Trim ledende/etterfølgende mellomrom + tegn
function renseNavn(s: string): string {
  return s
    .replace(/:+/g, " ")        // alle kolon til mellomrom
    .replace(/\s+/g, " ")        // flere mellomrom → ett
    .replace(/[-–—\s]+$/g, "")   // trim slutt-bindestrek/mellomrom
    .replace(/^[-–—\s]+/g, "")   // trim start
    .trim();
}

const kampanjeProdukter: KampanjeProdukt[] = topp3.map((p) => ({
  name: renseNavn(p.navn),
  manufacturer: p.produsent,
  imageUrl: p.bilde,
  // Kun reell rabatt teller som førpris (scraperen setter prisFør === pris når varen ikke er nedsatt)
  priceBefore: p.prisFør && p.prisFør > p.pris ? p.prisFør : null,
  priceNow: p.pris,
  discountPct: p.prisFør && p.prisFør > p.pris ? Math.round(((p.prisFør - p.pris) / p.prisFør) * 100) : null,
}));

const outDir = join("out", "dagens", date, `mandag-${aktiv.kategori}`);
mkdirSync(outDir, { recursive: true });
console.log(`\n📁 ${outDir}`);

const utmCampaign = `mandag-${aktiv.kategori}-${date}`;
const videoCta = `fosen-tools.no/produkter/${aktiv.kategori}`;
const fullCategoryUrl = `https://fosen-tools.no/produkter/${aktiv.kategori}`;
// Roter musikk per uke+kategori så ikke 2 reels på rad får samme bed
const musicVariant = pickMusicBed(`mandag-${aktiv.kategori}-${date}`);
console.log(`🎵 Musikk: ${musicVariant}`);

for (const format of formats) {
  process.stdout.write(`  ▸ ${format}: rendrer ... `);
  const t0 = performance.now();
  try {
    const result = await renderVideo({
      type: "kampanje-teaser",
      data: {
        format: format as VideoFormat,
        eyebrow: aktiv.eyebrow,
        headline: `Topp 3 ${aktiv.label.toLowerCase()}`,
        subhead: "Mest populært akkurat nå – på lager",
        products: kampanjeProdukter,
        ctaUrl: videoCta,
        musicVariant,
      },
    });
    const outPath = join(outDir, `${format}.mp4`);
    writeFileSync(outPath, result.buffer);
    const sec = ((performance.now() - t0) / 1000).toFixed(1);
    console.log(`✓ ${(result.buffer.byteLength / 1024 / 1024).toFixed(1)} MB (${sec}s)`);
  } catch (e) {
    console.log(`❌ ${e instanceof Error ? e.message : e}`);
  }
}

// ── captions ────────────────────────────────────────────────────────

// Forkort lange navn til 50 tegn (også fjern Multicase :: og kolon)
function shortNavn(s: string): string {
  const cleaned = s.replace(/:+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length > 50 ? cleaned.slice(0, 48) + "…" : cleaned;
}

// Slug for utm_content per produkt
function utmContent(navn: string): string {
  return navn.toLowerCase()
    .replace(/[æå]/g, "a").replace(/ø/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

const fbBlock = [
  `📦 Ukens topp 3 · ${aktiv.label}`,
  "",
  "Tre på lager nå:",
  "",
  ...topp3.flatMap((p, i) => {
    const navn = shortNavn(p.navn);
    const produsent = p.produsent ? p.produsent + " " : "";
    const pris = `${p.pris.toFixed(0)} kr`;
    const url = `${p.url}?utm_source=facebook&utm_medium=social&utm_campaign=${utmCampaign}&utm_content=${utmContent(navn)}`;
    return [
      `${i + 1}. ${produsent}${navn} — ${pris}`,
      `→ ${url}`,
      "",
    ];
  }),
].join("\n").trimEnd();

const igBlock = [
  `📦 Ukens topp 3 · ${aktiv.label}`,
  "",
  "Tre på lager nå:",
  "",
  ...topp3.flatMap((p, i) => {
    const navn = shortNavn(p.navn);
    const produsent = p.produsent ? p.produsent + " " : "";
    const sku = p.sku ?? "";
    const pris = `${p.pris.toFixed(0)} kr`;
    return [
      `${i + 1}. ${produsent}${navn}`,
      `   Varenr. ${sku} · ${pris}`,
      "",
    ];
  }),
  "Link i bio 🔗",
  "",
  [
    "#FosenTools",
    `#${aktiv.label.replace(/[\s&]+/g, "")}`,
    "#Brekstad",
    "#FosenTools25år",
  ].join(" "),
].join("\n");

// FT-mørk HTML med kopi-knapper per seksjon
function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const html = `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8">
<title>Captions — mandag-${aktiv.kategori} · ${date}</title>
<style>
  :root { --red:#ED1C24; --ink:#0F1115; --ink2:#1c1f26; --line:#2a2f38; --text:#e9edf3; --muted:#9aa3b2; }
  *{box-sizing:border-box}
  body{background:var(--ink);color:var(--text);font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;margin:0;padding:40px 24px 80px;line-height:1.5}
  .wrap{max-width:760px;margin:0 auto}
  h1{margin:0 0 4px;font-size:28px;letter-spacing:-.5px}
  .sub{color:var(--muted);font-size:14px;margin-bottom:32px}
  .card{background:var(--ink2);border:1px solid var(--line);border-radius:12px;padding:20px 22px;margin-bottom:18px}
  .card h2{margin:0 0 12px;font-size:17px;color:var(--red);text-transform:uppercase;letter-spacing:1.5px}
  .card .meta{color:var(--muted);font-size:13px;margin-bottom:14px}
  pre{background:#0a0c10;border:1px solid var(--line);border-radius:8px;padding:16px;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,"SF Mono",monospace;font-size:13.5px;margin:0 0 12px;color:#d7dde6}
  button{background:var(--red);color:#fff;border:0;padding:10px 18px;font-size:14px;font-weight:600;border-radius:6px;cursor:pointer;letter-spacing:.3px}
  button:hover{background:#d8181f}
  button.ok{background:#1c8a3a}
  .footer{margin-top:28px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:13.5px}
  .footer b{color:var(--text)}
  .footer ul{margin:8px 0 0;padding-left:18px}
  .footer li{margin:4px 0}
  .footer a{color:#7cb3ff;text-decoration:none}
  .footer a:hover{text-decoration:underline}
</style>
</head>
<body>
<div class="wrap">

<h1>📦 Mandag · ${escHtml(aktiv.label)}</h1>
<div class="sub">${date} · UTM-kampanje <code>${escHtml(utmCampaign)}</code></div>

<div class="card">
  <h2>Facebook</h2>
  <div class="meta">Klikkbar URL med egen UTM per produkt</div>
  <pre id="fb">${escHtml(fbBlock)}</pre>
  <button data-target="fb">Kopier Facebook</button>
</div>

<div class="card">
  <h2>Instagram</h2>
  <div class="meta">Varenummer, ingen lenker · link i bio</div>
  <pre id="ig">${escHtml(igBlock)}</pre>
  <button data-target="ig">Kopier Instagram</button>
</div>

<div class="footer">
  <b>Postingstid:</b> mandag kl 12:00<br>
  <b>LinkedIn:</b> ikke brukt for mandag-poster (passer ikke følgerne)<br>
  <b>Alt-tekst:</b> legg til via Instagram-mobilapp etter publisering<br>

  <b style="display:block;margin-top:14px">Klikkbare UTM-lenker:</b>
  <ul>
    ${topp3.map((p) => {
      const navn = shortNavn(p.navn);
      const url = `${p.url}?utm_source=facebook&utm_medium=social&utm_campaign=${utmCampaign}&utm_content=${utmContent(navn)}`;
      return `<li><a target="_blank" href="${url}">${escHtml(navn)}</a></li>`;
    }).join("\n    ")}
  </ul>
</div>

</div>

<script>
document.querySelectorAll("button[data-target]").forEach(btn=>{
  btn.addEventListener("click",async()=>{
    const el=document.getElementById(btn.getAttribute("data-target"));
    if(!el)return;
    const text=el.textContent;
    try{await navigator.clipboard.writeText(text);}
    catch{const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();}
    const orig=btn.textContent;
    btn.textContent="✓ Kopiert";
    btn.classList.add("ok");
    setTimeout(()=>{btn.textContent=orig;btn.classList.remove("ok");},1400);
  });
});
</script>
</body>
</html>
`;

writeFileSync(join(outDir, "captions.html"), html);
console.log(`  ✓ captions.html`);

// Plain-text-versjon for validering (caption-rules ser bare tekstinnhold)
const validateText = `${fbBlock}\n\n${igBlock}`;
console.log(`\n  Validerer captions:`);
logValidation("captions", validateCaption(validateText));

console.log(`\n✅ Ferdig\n   open "${outDir}"`);
}

main().catch((e) => {
  console.error("\n❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
