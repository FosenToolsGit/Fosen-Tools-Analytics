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

  return parts.join("\n");
}

/**
 * Normaliserer EK1-tekst som kan inneholde lett inline-HTML (`<sup>2</sup>`,
 * `<br>`) til ren tekst. Konverterer kvadrat-/kubikk-superscript, stripper
 * resten av taggene. Resultatet skal escapes med `esc()` etterpå.
 */
function cleanInline(s: string): string {
  return s
    .replace(/<sup>\s*2\s*<\/sup>/gi, "²")
    .replace(/<sup>\s*3\s*<\/sup>/gi, "³")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Input til den kombinerte produktinfo-generatoren (EK1 + valgfri deep-scrape). */
export interface ProductInfoInput {
  produsent: string;
  /** Produktnavn (Wera-navn fra EK1, f.eks. «338 Rekkeklemme-betjeningsverktøy») */
  name: string;
  code: string;
  ean: string;
  opprinnelsesland: string;
  g1: string | null;
  g2: string | null;
  g3: string | null;
  /** EK1 `catalog_text_html` — Weras offisielle HTML-beskrivelse */
  catalogTextHtml: string;
  /** EK1 `catalog_text` — ren tekst-fallback hvis HTML mangler */
  catalogText: string;
  /** EK1 `content_info` — navn + størrelse */
  contentInfo: string;
  /** EK1 `shop_bullet_points1–8` */
  bullets: string[];
  /** EK1 `tipp_1–8_text` — bruksområde-forklaringer */
  tips: string[];
  /** EK1 `number_of_parts` */
  numberOfParts: string;
  /** EK1 produkt-dimensjoner */
  dims: { width: string; length: string; height: string; unit: string; weight: string; weightUnit: string };
  /** Cachet deep-scrape-data fra wera.de (null hvis ikke deep-scrapet) */
  scraped: WeraScrapeResult | null;
}

/**
 * Bygger én super-optimalisert SEO-produktinfo-boks ved å SLÅ SAMMEN EK1-data
 * (offisiell masterdata) med valgfri deep-scrape-data (wera.de). Graceful:
 * fungerer med kun EK1, blir rikere hvis deep-scrape også finnes.
 */
export function generateProductInfoHtml(input: ProductInfoInput): string {
  const parts: string[] = [];
  const produsent = input.produsent || "Wera";
  const sc = input.scraped;

  // H2 + søkeord-rik innledning
  parts.push(`<h2>${esc(`${produsent} ${input.name}`.trim())}</h2>`);
  parts.push(
    `<p>${esc(produsent)} ${esc(input.name)} er et profesjonelt verktøy fra ${esc(produsent)} ` +
      `— anerkjent for høy kvalitet, presisjon og lang levetid i daglig profesjonell bruk.</p>`
  );

  // Weras offisielle beskrivelse (catalog_text_html er allerede HTML — ikke escape)
  if (input.catalogTextHtml.trim()) {
    parts.push(`<p>${input.catalogTextHtml.trim()}</p>`);
  } else if (input.catalogText.trim()) {
    parts.push(`<p>${esc(input.catalogText.trim())}</p>`);
  }

  // Egenskaper — EK1-bullets + deep-scrape feature-bullets, deduplisert
  const seenBullet = new Set<string>();
  const bullets: string[] = [];
  for (const b of [...input.bullets, ...(sc?.featureBullets ?? [])]) {
    const t = cleanInline(b);
    if (!t) continue;
    const key = t.toLowerCase();
    if (seenBullet.has(key)) continue;
    seenBullet.add(key);
    bullets.push(t);
  }
  if (bullets.length > 0) {
    parts.push(`<h3>Egenskaper</h3>`);
    parts.push(`<ul>`);
    for (const b of bullets) parts.push(`<li>${esc(b)}</li>`);
    parts.push(`</ul>`);
  }

  // Slik fungerer den — EK1 tipp-tekster + deep-scrape beskrivelses-seksjoner
  const tips = input.tips.map((t) => cleanInline(t)).filter(Boolean);
  const sections = pickBestSections(sc?.descriptionSections ?? []);
  if (tips.length > 0 || sections.length > 0) {
    parts.push(`<h3>Slik fungerer den</h3>`);
    for (const t of tips) parts.push(`<p>${esc(t)}</p>`);
    for (const s of sections) {
      parts.push(`<h4>${esc(s.heading)}</h4>`);
      parts.push(`<p>${esc(s.text)}</p>`);
    }
  }

  // Tekniske spesifikasjoner — EK1-dimensjoner + deep-scrape-specs (dedup)
  const specs: Array<[string, string]> = [];
  const d = input.dims;
  if (d.width && d.length && d.height) {
    specs.push(["Mål (B×L×H)", `${d.width} × ${d.length} × ${d.height} ${d.unit || "mm"}`]);
  }
  if (d.weight) specs.push(["Vekt", `${d.weight} ${d.weightUnit || "g"}`]);
  if (input.numberOfParts && input.numberOfParts !== "1") specs.push(["Antall deler", input.numberOfParts]);
  if (sc?.driveType) specs.push(["Drev / feste", sc.driveType]);
  if (sc?.profile) specs.push(["Profil", sc.profile]);
  if (sc?.lengthMm != null) specs.push(["Lengde", `${sc.lengthMm} mm`]);
  if (sc?.isVde) specs.push(["VDE-isolert", "Ja (1000V, IEC 60900)"]);
  const seenSpec = new Set(specs.map(([l]) => l.toLowerCase()));
  for (const { label, value } of sc?.specs ?? []) {
    if (!label || !value) continue;
    const k = label.toLowerCase();
    if (seenSpec.has(k)) continue;
    if (/^delenummer$|^merk$/i.test(label)) continue;
    specs.push([label, value]);
    seenSpec.add(k);
  }
  specs.push(["Produsent", produsent]);
  specs.push([`${produsent}-artikkelnummer`, input.code]);
  if (input.ean) specs.push(["EAN", input.ean]);
  if (input.opprinnelsesland) specs.push(["Opprinnelsesland", input.opprinnelsesland]);
  parts.push(`<h3>Tekniske spesifikasjoner</h3>`);
  parts.push(`<table><tbody>`);
  for (const [l, v] of specs) parts.push(`<tr><th>${esc(l)}</th><td>${esc(v)}</td></tr>`);
  parts.push(`</tbody></table>`);

  // Bruksområder
  parts.push(`<h3>Bruksområder</h3>`);
  parts.push(`<p>${esc(applicationParagraph(input.g1, input.g2, input.g3, produsent))}</p>`);

  return parts.join("\n");
}
