/**
 * Genererer SEO-optimalisert HTML for «Produktinformasjon»-feltet i Multicase,
 * basert på Wera deep-scrape-data + prislisten-data + klassifisering.
 *
 * Struktur:
 *   <h2>{Produsent} {Modell} {Type} {Profil} {Størrelse}</h2>
 *   <p>Innledning med søkeord + bruksområde</p>
 *   <h3>Egenskaper</h3>
 *     <ul><li><strong>{feature}</strong> — {forklaring}</li>...</ul>
 *   <h3>Detaljert beskrivelse</h3>
 *     ...sections fra scrape (h4 + p)
 *   <h3>Tekniske spesifikasjoner</h3>
 *     <table>...</table>
 *   <h3>Bruksområder</h3>
 *     <p>Målgruppe-vinkling</p>
 *   <h3>Hvorfor Wera?</h3>
 *     <p>Selger-vinkling + Fosen Tools-relevans</p>
 */

import type { WeraScrapeResult } from "./wera-deep-scrape";

export interface SeoHtmlInput {
  /** Wera-scraped data (kan være null hvis scrape ikke kjørt — da bruker vi bare prislisten-data) */
  scraped: WeraScrapeResult | null;
  /** Produktnavn fra prislisten (kort, allerede UPPERCASED) */
  name: string;
  /** Leverandør-produktnummer (Wera-kode) */
  code: string;
  /** EAN-13 */
  ean: string;
  /** Produsent (typisk «Wera») */
  produsent: string;
  /** Klassifisering — for målgruppe-vinkling */
  g1: string | null;
  g2: string | null;
  g3: string | null;
  /** Tekniske data fra prislisten */
  nettovekt?: number | null;
  /** Variant-info / størrelse-streng fra prislisten («0.6x3.5x100») */
  sizeContent?: string;
  /** Pris i NOK (om tilgjengelig) — droppes hvis ikke satt */
  listePrisNok?: number | null;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generer målgruppe-vinkling basert på FT-klassifisering.
 * Returnerer en kort tekst om typiske bruksområder.
 */
function applicationParagraph(g1: string | null, g2: string | null, g3: string | null, produsent: string): string {
  const cat = `${g1 ?? ""}/${g2 ?? ""}/${g3 ?? ""}`.toLowerCase();
  if (/skrutrekkere/.test(cat)) {
    return "Brukes typisk innen verksted, industri, elektriker-arbeid, finmekanikk og service. Sertifisert kvalitet for daglig profesjonell bruk.";
  }
  if (/n[øo]kler/.test(cat)) {
    return "Brukes typisk innen verksted, mekanisk arbeid, mobil service og industriell vedlikehold.";
  }
  if (/tenger/.test(cat)) {
    return "Brukes typisk innen elektriker-arbeid, mekanisk verksted, rørlegger-arbeid og service.";
  }
  if (/piper/.test(cat)) {
    return "Brukes typisk innen mekanisk verksted, bilreparasjon, montering og service-arbeid.";
  }
  if (/momentverkt/.test(cat)) {
    return "Brukes der presis momentkontroll er kritisk — motor- og monteringsarbeid, sikkerhetskomponenter, sertifisert vedlikehold.";
  }
  if (/maskintilbeh/.test(cat)) {
    return "Brukes med boremaskiner, slagskruere og momentnøkler innen verksted og bygg-anlegg.";
  }
  return `${produsent}-verktøy for profesjonell bruk innen verksted, industri og service.`;
}

/**
 * Velger de mest verdifulle sections fra scrape-resultatet og dropper duplikater /
 * generiske avsnitt.
 */
function pickBestSections(sections: Array<{ heading: string; text: string }>): Array<{ heading: string; text: string }> {
  // Drop generiske / footer-aktige
  const filtered = sections.filter((s) => {
    const h = s.heading.toLowerCase();
    if (/^(produktbeskrivelse|sett med dette|wera nyhetsbrev|wera app|relaterte|nyhetsbrev|app|service|finn ut)/.test(h)) return false;
    if (/^(våre produkter|company|firma|tjenester|nedlastinger)/.test(h)) return false;
    return true;
  });
  // Dedup på heading
  const seen = new Set<string>();
  const out: Array<{ heading: string; text: string }> = [];
  for (const s of filtered) {
    const key = s.heading.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  // Max 6 sections så HTML ikke blir for langt
  return out.slice(0, 6);
}

export function generateSeoHtml(input: SeoHtmlInput): string {
  const parts: string[] = [];

  // H2 – hovedoverskrift
  const heading = [input.produsent, input.name].filter(Boolean).join(" ");
  parts.push(`<h2>${esc(heading)}</h2>`);

  // Innledning
  const intro = input.scraped?.descriptionSections.find((s) => /produktbeskrivelse/i.test(s.heading));
  if (intro) {
    parts.push(`<p>${esc(intro.text)}</p>`);
  } else {
    const sizeStr = input.sizeContent ? ` (${esc(input.sizeContent)})` : "";
    parts.push(`<p>${esc(input.produsent)} ${esc(input.name)}${sizeStr} er et profesjonelt verktøy fra ${esc(input.produsent)} — anerkjent for høy kvalitet, presisjon og lang levetid.</p>`);
  }

  // Egenskaper-bullets fra scrape
  if (input.scraped?.featureBullets && input.scraped.featureBullets.length > 0) {
    parts.push(`<h3>Egenskaper</h3>`);
    parts.push(`<ul>`);
    for (const b of input.scraped.featureBullets) {
      parts.push(`<li>${esc(b)}</li>`);
    }
    parts.push(`</ul>`);
  }

  // Detaljerte beskrivelse-sections (rik SEO-content fra Wera-siden)
  if (input.scraped?.descriptionSections && input.scraped.descriptionSections.length > 0) {
    const best = pickBestSections(input.scraped.descriptionSections);
    if (best.length > 0) {
      parts.push(`<h3>Detaljert beskrivelse</h3>`);
      for (const s of best) {
        parts.push(`<h4>${esc(s.heading)}</h4>`);
        parts.push(`<p>${esc(s.text)}</p>`);
      }
    }
  }

  // Tekniske spesifikasjoner-tabell
  const specs: Array<[string, string]> = [];
  if (input.sizeContent) specs.push(["Dimensjoner", input.sizeContent]);
  if (input.scraped?.driveType) specs.push(["Drev / feste", input.scraped.driveType]);
  if (input.scraped?.profile) specs.push(["Profil", input.scraped.profile]);
  if (input.scraped?.lengthMm != null) specs.push(["Lengde", `${input.scraped.lengthMm} mm`]);
  if (input.nettovekt != null) specs.push(["Vekt", `${input.nettovekt} g`]);
  if (input.scraped?.isVde) specs.push(["VDE-isolert", "Ja (1000V, IEC 60900)"]);

  // Inkluder rik spec-tabell fra scrollsnaptable (klingetykkelse, klingelengde osv.)
  // Dropp rader vi allerede har vist over (label-match, case-insensitive).
  const existingLabels = new Set(specs.map(([label]) => label.toLowerCase()));
  const scrapedSpecs = input.scraped?.specs ?? [];
  for (const { label, value } of scrapedSpecs) {
    if (!label || !value) continue;
    const labelKey = label.toLowerCase();
    if (existingLabels.has(labelKey)) continue;
    // Hopp over Delenummer (vi viser produkt-artikkelnummer eksplisitt nedenfor)
    if (/^delenummer$|^merk$/i.test(label)) continue;
    specs.push([label, value]);
    existingLabels.add(labelKey);
  }

  specs.push(["Produsent", input.produsent]);
  specs.push([`${input.produsent}-artikkelnummer`, input.code]);
  if (input.ean) specs.push(["EAN", input.ean]);

  if (specs.length > 0) {
    parts.push(`<h3>Tekniske spesifikasjoner</h3>`);
    parts.push(`<table>`);
    parts.push(`<tbody>`);
    for (const [label, value] of specs) {
      parts.push(`<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`);
    }
    parts.push(`</tbody>`);
    parts.push(`</table>`);
  }

  // Bruksområde
  parts.push(`<h3>Bruksområder</h3>`);
  parts.push(`<p>${esc(applicationParagraph(input.g1, input.g2, input.g3, input.produsent))}</p>`);

  // Hvorfor [produsent] / Fosen Tools-vinkling
  parts.push(`<h3>Hvorfor ${esc(input.produsent)}?</h3>`);
  if (input.produsent.toLowerCase() === "wera") {
    parts.push(`<p>Wera (Wuppertal, Tyskland) har produsert profesjonelle verktøy for skrueforbindelser siden 1936. Wera-verktøy er anerkjent som premium-kvalitet blant fagfolk i hele Europa. Fosen Tools fører hele Wera-sortimentet på lager med rask levering — typisk 1-3 virkedager til hele Norge.</p>`);
  } else {
    parts.push(`<p>${esc(input.produsent)}-verktøy er valgt for sin kvalitet og pålitelighet i daglig profesjonell bruk. Fosen Tools fører ${esc(input.produsent)}-sortimentet på lager med rask levering — typisk 1-3 virkedager til hele Norge.</p>`);
  }

  return parts.join("\n");
}
