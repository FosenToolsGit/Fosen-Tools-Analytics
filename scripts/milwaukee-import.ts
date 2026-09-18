/**
 * Bygger en Multicase-leveranse av produkter kopiert fra Milwaukee/TTI-portalen.
 *
 *   npm run milwaukee-import -- <ut.html> <norsk.json> <portal-html-mappe>
 *
 * Portalen er INNKJØPSSIDEN og på engelsk. Scriptet:
 *  - leser hver .html (limt inn fra portalen) med enkelprodukt-scraperen,
 *  - destillerer Multicase-feltene (gruppe, navn, EAN, priser, opprinnelsesland),
 *  - bytter tittel og punkter mot norsk tekst fra norsk.json,
 *  - skriver én HTML med kopi-knapp på hvert felt.
 *
 * norsk.json: { "<varenummer>": { tittel, navn, punkter: [] } }
 * Mangler et varenummer der, brukes portalens engelske tekst og det auto-genererte navnet.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { scrapeFromHtml } from "../src/lib/services/enkelprodukt-scraper";
import { destillProduct } from "../src/lib/services/enkelprodukt-destillery";
import { buildEnkelproduktSeoHtml } from "../src/lib/services/enkelprodukt-seo-html";

const esc = (t: string) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (t: string) => esc(t).replace(/"/g, "&quot;");

interface NorskTekst { tittel: string; navn: string; punkter: string[] }

async function main() {
  const [ut, norskFil, ...kilder] = process.argv.slice(2);
  if (!ut || !norskFil || kilder.length === 0) {
    console.error("Bruk: npm run milwaukee-import -- <ut.html> <norsk.json> <html-fil|mappe ...>");
    process.exit(1);
  }
  const NORSK: Record<string, NorskTekst> = JSON.parse(readFileSync(norskFil, "utf8"));

  const filer: string[] = [];
  for (const k of kilder) {
    if (statSync(k).isDirectory()) {
      for (const f of readdirSync(k).sort()) if (f.endsWith(".html")) filer.push(join(k, f));
    } else filer.push(k);
  }

  const blokker: string[] = [];
  const mangler: string[] = [];
  for (const f of filer) {
    const raw = await scrapeFromHtml(readFileSync(f, "utf8"), undefined, { scrape_b2b_prices: true });
    const d = await destillProduct(raw);
    const no = d.mpn ? NORSK[d.mpn] : undefined;
    if (!no) mangler.push(`${d.mpn ?? f} (${raw.title})`);

    const info = buildEnkelproduktSeoHtml({
      raw: { ...raw, title: no?.tittel ?? raw.title, bullets: no?.punkter ?? raw.bullets },
      produsent: d.produsent,
      g1: d.gruppenivaa_1, g2: d.gruppenivaa_2, g3: d.gruppenivaa_3,
      ean: d.ean, mpn: d.mpn,
    });

    const felt: Array<[string, string]> = [
      ["Beskrivelse 1", no?.navn ?? d.produktbeskrivelse_1],
      ["Beskrivelse 2", d.produktbeskrivelse_2],
      ["Produsent", d.produsent],
      ["Enhet", d.enhet],
      ["Gruppenivå 1", d.gruppenivaa_1],
      ["Gruppenivå 2", d.gruppenivaa_2],
      ["Gruppenivå 3", d.gruppenivaa_3],
      ["Leverandør produktnummer", d.mpn ?? ""],
      ["GTIN (EAN)", d.ean ?? ""],
      ["Hovedleverandør kostpris", d.kostpris != null ? String(d.kostpris).replace(".", ",") : ""],
      ["ListePris1", d.listepris != null ? String(d.listepris).replace(".", ",") : ""],
      ["Opprinnelsesland", d.opprinnelsesland],
      ["BildeFilnavn", `\\\\tsclient\\Multicase\\${d.mpn}.jpg`],
    ];

    blokker.push(`<section${no ? "" : ' class="ufullstendig"'}><h2>${esc(no?.tittel ?? raw.title)}</h2>
<p class="sub">Art. ${esc(d.mpn ?? "")} · ${esc(d.produsent)}${no ? "" : " · ⚠️ mangler norsk tekst i norsk.json"}</p>
<table>${felt.map(([k, v]) => `<tr><th>${esc(k)}</th><td><code>${esc(v)}</code></td><td><button class="k" data-v="${attr(v)}">Kopier</button></td></tr>`).join("")}</table>
<h3>Produktinformasjon <button class="k" data-v="${attr(info)}">Kopier HTML</button> <span class="sub">${info.length} tegn</span></h3>
<div class="prev">${info}</div>
<h3>Bilder</h3><ul class="bilder">${raw.images.map((u) => `<li><a href="${attr(u)}" target="_blank">${esc(u.split("/").pop() || u)}</a> <button class="k" data-v="${attr(u)}">Kopier URL</button></li>`).join("")}</ul></section>`);
  }

  writeFileSync(ut, `<!doctype html><html lang="no"><head><meta charset="utf-8"><title>Milwaukee til Multicase</title>
<style>:root{--r:#ED1C24;--bg:#0F1115;--k:#171A21;--l:#2A2F3A;--t:#E8EAED;--m:#9AA1AC}
body{margin:0;padding:28px 20px 80px;background:var(--bg);color:var(--t);font:15px/1.6 Manrope,-apple-system,"Segoe UI",sans-serif}
.w{max-width:940px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}.sub{color:var(--m);font-size:13px;margin:0 0 6px}
section{background:var(--k);border:1px solid var(--l);padding:16px 18px;margin:0 0 20px}
section.ufullstendig{border-color:var(--r)}
h2{font-size:17px;margin:0 0 2px}h3{font-size:13px;text-transform:uppercase;letter-spacing:.07em;color:var(--r);margin:18px 0 8px}
table{width:100%;border-collapse:collapse;font-size:14px}th{text-align:left;color:var(--m);font-weight:500;width:210px;padding:5px 8px 5px 0;vertical-align:top}
td{padding:5px 8px 5px 0;vertical-align:top}code{background:#0B0D11;padding:2px 7px;display:inline-block}
button.k{background:var(--r);color:#fff;border:0;padding:3px 10px;font:600 11px Manrope,sans-serif;cursor:pointer}button.k.ok{background:#1e9e52}
.prev{background:#fff;color:#111;padding:14px 16px;max-height:340px;overflow:auto;font:14px/1.55 -apple-system,sans-serif}
.prev h2{color:#111;font-size:16px}.prev h3{color:#111;font-size:14px;text-transform:none;letter-spacing:0}
.prev table{font-size:13px}.prev th{color:#444;width:auto}.bilder{margin:0;padding-left:18px}.bilder li{margin:4px 0}
.merk{border-left:3px solid var(--r);background:#1C1F27;padding:10px 14px;margin:0 0 18px;font-size:13.5px}</style></head><body><div class="w">
<h1>Milwaukee til Multicase</h1><p class="sub">${filer.length} produkter · bygget ${new Date().toISOString().slice(0, 10)}</p>
<div class="merk">Alt er på norsk. Innkjøpsdata er holdt utenfor produktteksten: ingen HS-kode, kolliantall, tilgjengelighet eller innkjøpspris.
Kostpris og listepris står bare i feltlista, til Multicase-feltene.<br>
Faste felt settes i Multicase: avsender Fosen Tools AS, hovedansvarlig AHP, aktiv på web.</div>
${blokker.join("")}</div>
<script>document.querySelectorAll("button.k").forEach(function(b){var o=b.textContent;b.addEventListener("click",function(){var t=b.dataset.v;var f=function(){b.textContent="Kopiert";b.classList.add("ok");setTimeout(function(){b.textContent=o;b.classList.remove("ok")},1400)};if(navigator.clipboard){navigator.clipboard.writeText(t).then(f)}else{f()}})});</script></body></html>`);

  console.log(`SKREVET ${ut} — ${filer.length} produkter`);
  if (mangler.length) console.log("Mangler norsk tekst:\n  " + mangler.join("\n  "));
}

main();
