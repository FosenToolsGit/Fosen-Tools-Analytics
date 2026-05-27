/**
 * Destillerer raw scraped data fra Enkelprodukt-scraperen til ferdig
 * Multicase-import-data via Gemini. Produserer:
 *   - Produktbeskrivelse 1 (kort, 1-2 setninger, salgs-vinkling)
 *   - Produktbeskrivelse 2 (lengre, 3-5 setninger, faglig)
 *   - Produktinformasjon (rik HTML med h3/ul/table)
 *   - Foreslått Gruppenivå 1/2/3
 *   - Foreslått produsent
 *   - Foreslått enhet (stk/sett/paret/m/kg/pakke)
 */

import { classify } from "./produktgruppe-classifier";
import { buildEnkelproduktSeoHtml } from "./enkelprodukt-seo-html";
import type { ScrapedRaw } from "./enkelprodukt-scraper";

export interface DestilledProduct {
  /** Produktnavn — interndata, settes lik Beskrivelse 1 */
  name: string;
  /** Produsent (validert mot kjente FT-merker) */
  produsent: string;
  /** Enhet: stk / sett / paret / m / kg / pakke */
  enhet: string;
  /** Multicase Gruppenivå 1/2/3 */
  gruppenivaa_1: string;
  gruppenivaa_2: string;
  gruppenivaa_3: string;
  /** Beskrivelse 1 = produktnavnet (kort, norsk, max 40 tegn — Multicase-konvensjon) */
  produktbeskrivelse_1: string;
  /** Beskrivelse 2 = «{MPN} - {Produsent}» max 40 tegn — Wera-import-mønster */
  produktbeskrivelse_2: string;
  /** Rik HTML for "Produktinformasjon"-feltet: h3/ul/table */
  produktinformasjon: string;
  /** Original-data så operatør kan se hva som kom fra scrape */
  source_url: string;
  ean: string | null;
  mpn: string | null;
  price_now: number | null;
  price_before: number | null;
  currency: string | null;
  /** B2B-priser (hentet fra HTML-paste når brukeren krysset av "Hent kostpris/listepris") */
  kostpris: number | null;
  listepris: number | null;
  /** Opprinnelsesland (fra XLSX/scrape — eks. «Tyskland» eller «Vet ikke» hvis ikke oppgitt) */
  opprinnelsesland: string;
  /** Vurderings-flagg fra AI om kvaliteten på destilleringen */
  ai_notes: string;
}

const MAX_BESKR = 40;

/**
 * Bygger Beskrivelse 2 etter Wera-import-mønsteret: «{MPN} - {Produsent}»
 * truncert til 40 tegn. Brukes både ved første destillering og når
 * MPN/produsent endres manuelt i UI.
 */
export function buildBeskrivelse2(
  mpn: string | null | undefined,
  produsent: string | null | undefined,
): string {
  const m = (mpn ?? "").trim();
  const p = (produsent ?? "").trim();
  if (m && p) return `${m} - ${p}`.slice(0, MAX_BESKR);
  if (p) return p.slice(0, MAX_BESKR);
  if (m) return m.slice(0, MAX_BESKR);
  return "";
}

/**
 * Hovedfunksjon: scrape → regel-basert klassifisering → produserer Multicase-felter.
 * INGEN Gemini-kall — deterministisk og raskt.
 *
 * - G1/G2/G3: produktgruppe-classifier (regel-basert)
 * - Beskrivelse 1: scrape title i CAPS, max 40 tegn
 * - Beskrivelse 2: «{MPN} - {Produsent}» Wera-mønster
 * - Produktinformasjon: SEO-rik HTML fra `buildEnkelproduktSeoHtml` (template-basert,
 *   etterligner Gemini-stilen med H2 + H3 + bruksområder + brand-positioning)
 */
export async function destillProduct(raw: ScrapedRaw): Promise<DestilledProduct> {
  // Regel-basert klassifisering (autoritativ — ingen Gemini-overstyring)
  const cls = classify(raw.title, raw.description_long || raw.description_short);
  const produsent = raw.manufacturer || "";
  const beskr1 = (raw.title || "").toUpperCase().slice(0, MAX_BESKR);
  const beskr2 = buildBeskrivelse2(raw.mpn, produsent);

  return {
    name: beskr1,
    produsent,
    enhet: detectEnhet(raw.title),
    gruppenivaa_1: cls.g1 || "",
    gruppenivaa_2: cls.g2 || "",
    gruppenivaa_3: cls.g3 || "",
    produktbeskrivelse_1: beskr1,
    produktbeskrivelse_2: beskr2,
    produktinformasjon: buildEnkelproduktSeoHtml({
      raw,
      produsent,
      g1: cls.g1,
      g2: cls.g2,
      g3: cls.g3,
      ean: raw.ean,
      mpn: raw.mpn,
    }),
    ai_notes: cls.g1
      ? `Klassifisert deterministisk: ${cls.g1} > ${cls.g2} > ${cls.g3}.`
      : "Ingen klassifiseringsregel matchet — velg G1/G2/G3 manuelt.",
    source_url: raw.source_url,
    ean: raw.ean,
    mpn: raw.mpn,
    price_now: raw.price_now,
    price_before: raw.price_before,
    currency: raw.currency,
    kostpris: raw.kostpris,
    listepris: raw.listepris,
    opprinnelsesland: "Vet ikke",
  };
}

/** Detekterer enhet (stk/sett/pakke) fra produkt-tittel. Default: stk. */
function detectEnhet(title: string): string {
  const t = title.toLowerCase();
  if (/\bsett\b|\bset\b|kit\b|koffert/.test(t)) return "sett";
  if (/\bpaket\b|\bpakke\b|pack\b/.test(t)) return "pakke";
  if (/\bpar\b|paret/.test(t)) return "paret";
  if (/\brull(?:er)?\b|\broll/.test(t)) return "rull";
  return "stk";
}

