// Prisplakat-systemet — brukes både for A4-print og butikk-skjerm-slideshow.

export interface PricetagProduct {
  source_url: string;
  // ── Manuelle overrides (settes av bruker i editor) ──
  /** Override-pris (har prioritet over price_now hvis satt) */
  price_override?: number;
  /** Override-pris før (har prioritet over price_before hvis satt) */
  price_before_override?: number;
  /** Override-rabatt-burst tekst (f.eks. "−30%", "SPAR 500,-", "KAMPANJE", "NYHET") */
  burst_text_override?: string;
  /** Skjul burst på dette produktet */
  hide_burst?: boolean;
  /** Skjul QR-kode på dette produktet */
  hide_qr?: boolean;
  /** Override-produktnavn */
  name_override?: string;
  // Resten hentes ved scraping (cached i UI-state)
  name?: string;
  manufacturer?: string;
  manufacturer_logo_url?: string | null;
  image_url?: string | null;
  price_before?: number;
  price_now?: number;
  discount_pct?: number;
  in_stock?: boolean;
  sku?: string | null;
  bullets?: string[];
}

/** Hent effektiv verdi (override hvis satt, ellers default fra scraping) */
export function effective(p: PricetagProduct) {
  const priceNow = p.price_override ?? p.price_now ?? 0;
  const priceBefore = p.price_before_override ?? p.price_before ?? 0;
  const showSavings = priceBefore > priceNow;
  const computedDiscount = showSavings && priceBefore > 0
    ? Math.round((1 - priceNow / priceBefore) * 100)
    : 0;
  return {
    priceNow,
    priceBefore,
    showSavings,
    savings: showSavings ? priceBefore - priceNow : 0,
    discountPct: computedDiscount,
    burstText: p.burst_text_override ?? (computedDiscount > 0 ? `−${computedDiscount}%` : null),
    name: p.name_override ?? p.name ?? "",
    hideBurst: p.hide_burst ?? false,
    hideQr: p.hide_qr ?? false,
  };
}

export type PricetagFormat =
  | "a4_single"
  | "a4_2up"
  | "a4_4up"
  | "slideshow_landscape"
  | "slideshow_portrait";

export interface PricetagSettings {
  /** Sekunder per slide (kun for slideshow) — default 12 */
  seconds_per_slide?: number;
  /** Transition-type (kun for slideshow) — default "fade" */
  transition?: "fade" | "slide" | "ken_burns";
  /** Vis QR-kode med lenke til produktet */
  show_qr?: boolean;
  /** Vis rabatt-burst */
  show_burst?: boolean;
  /** Accent-farge (default FT-rød) */
  accent_color?: string;
  /** Vis "også populært"-pris-bånd nederst (slideshow) */
  show_period_band?: boolean;
}

export interface PricetagPlaylist {
  id: string;
  user_id: string;
  title: string;
  format: PricetagFormat;
  products: PricetagProduct[];
  settings: PricetagSettings;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_SETTINGS: PricetagSettings = {
  seconds_per_slide: 12,
  transition: "fade",
  show_qr: true,
  show_burst: true,
  accent_color: "#ed1c24",
  show_period_band: true,
};

export const FORMAT_LABELS: Record<PricetagFormat, string> = {
  a4_single: "A4 — 1 produkt per ark",
  a4_2up: "A4 — 2 produkter per ark",
  a4_4up: "A4 — 4 produkter per ark",
  slideshow_landscape: "Slideshow — landskap 16:9",
  slideshow_portrait: "Slideshow — portrett 9:16",
};
