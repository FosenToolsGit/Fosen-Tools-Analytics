// Etikett-systemet — for hyllekant-etiketter på Brother QL-580N
// Dimensjoner: 60×28mm (passer DK-11209 29×62mm pre-cut etikett).
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

/** Faste dimensjoner for etikett (mm) — matcher DK-11209 brutto (29×62mm) med 1mm margin per side */
export const LABEL_W_MM = 60;
export const LABEL_H_MM = 28;
