// Etikett-systemet — for hyllekant-etiketter på Brother QL-580N
// Dimensjoner: 62×29mm (matcher DK-11209 pre-cut etikett eksakt).
// Innhold per etikett: produktnavn + artikkelnummer + QR-kode (UTM-tagget).

export interface EtikettProduct {
  source_url: string;
  /** Override-produktnavn (settes av bruker) */
  name_override?: string;
  // Resten cached fra scraping
  name?: string;
  manufacturer?: string;
  manufacturer_logo_url?: string | null;
  image_url?: string | null;
  sku?: string | null;
}

/** Hent effektive verdier (override hvis satt, ellers default fra scraping) */
export function effective(p: EtikettProduct) {
  return {
    name: p.name_override ?? p.name ?? "",
    sku: p.sku ?? "",
  };
}

/** Faste dimensjoner for etikett (mm) — eksakt DK-11209 (29×62mm) */
export const LABEL_W_MM = 62;
export const LABEL_H_MM = 29;
