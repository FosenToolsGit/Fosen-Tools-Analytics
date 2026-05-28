// Prisplakat-systemet — brukes både for A4-print og butikk-skjerm-slideshow.

export type ProductMode = "sale" | "new" | "feature" | "stock";

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
  /** Modus — "new"=NYHET-burst, "feature"=VÅRT VALG, "stock"=PÅ LAGER, ellers SPAR-burst fra discount */
  mode?: ProductMode;
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
  const mode: ProductMode = p.mode ?? "sale";

  // Burst-text følger denne prioriteringen: eksplisitt override → mode → auto
  let burstText: string | null;
  let burstSubLabel = "";
  if (p.burst_text_override !== undefined && p.burst_text_override !== "") {
    burstText = p.burst_text_override;
  } else if (mode === "new") {
    burstText = "NYHET";
  } else if (mode === "feature") {
    burstText = "VÅRT VALG";
  } else if (mode === "stock") {
    burstText = "PÅ LAGER";
  } else {
    burstText = computedDiscount > 0 ? `−${computedDiscount}%` : null;
    burstSubLabel = computedDiscount > 0 ? "SPAR" : "";
  }

  return {
    priceNow,
    priceBefore,
    showSavings,
    savings: showSavings ? priceBefore - priceNow : 0,
    discountPct: computedDiscount,
    burstText,
    burstSubLabel,
    name: p.name_override ?? p.name ?? "",
    hideBurst: p.hide_burst ?? false,
    hideQr: p.hide_qr ?? false,
    mode,
  };
}

export type PricetagFormat =
  | "a4_single"
  | "a4_2up"
  | "a4_4up"
  | "slideshow_landscape"
  | "slideshow_portrait";

/** Hvilken "mal i bunnen" en custom slide bruker. Maler kan tilpasses helt fritt etterpå. */
export type SlideTemplate =
  | "intro"            // FT-logo + jubileumslogo + eyebrow + linje
  | "credentials"      // Stor 2-3-linje statement m/ accent-divider
  | "certified"        // Stor tekst + pill-rad
  | "outro"            // Kontakt-info (telefon + adresse + åpningstider)
  | "brand_spotlight"  // Merke-logo + tagline + accent
  | "partners_rundell" // Horisontalt rullende karusell av flere brand-logoer
  | "multi_product"    // 2/4 produkter på én slide
  | "combo"            // 2 produkter med kombi-pris
  | "blank"            // Fri layout
  | "youtube";         // YouTube-video (autoplay + muted)

/** Hvilken logo som vises i topp/bunn av en custom slide */
export type LogoKey =
  | "ft-white"   // Fosen Tools wordmark hvit
  | "ft-black"   // Fosen Tools wordmark mørk
  | "jub-25"     // 25-årslogo (offisiell SVG)
  | "jub-100"    // 100-årslogo (konsernet)
  | "custom"     // Egen URL via custom_logo_url
  | null;

/** Plassering av en custom slide relativt til produktene */
export type SlidePlacement = "start" | "end" | "after_product";

export interface CustomSlide {
  id: string;
  /** Kan slå av en slide uten å slette den */
  enabled: boolean;
  /** Brukervennlig navn vist i listen */
  label?: string;
  /** Hvilken "mal i bunnen" denne slide-en starter med */
  template: SlideTemplate;
  /** Hvor i sekvensen — start/end eller etter et spesifikt produkt-index */
  placement: SlidePlacement;
  /** Hvis placement === "after_product": 0-indeksert produkt-pekepinn */
  after_product_idx?: number;
  /** Sortering innen samme placement-bucket */
  order: number;

  // ─── Bakgrunn ──────────────────────────────
  bg_color: string;
  bg_image_url?: string | null;
  /** Mørk overlay over bakgrunnsbilde (0-1) */
  bg_dim?: number;

  // ─── Tekst-styling ─────────────────────────
  text_color: string;
  accent_color: string;

  // ─── Logoer ────────────────────────────────
  top_logo?: LogoKey;
  bottom_logo?: LogoKey;
  custom_logo_url?: string;

  // ─── Tekstblokker (alle valgfrie) ──────────
  /** Liten label-tekst på toppen (allcaps, sperret) */
  eyebrow?: string;
  /** Hoved-overskrift — kan ha \n for linjeskift */
  title?: string;
  /** Liten tekst under tittel */
  subtitle?: string;
  /** Vis horisontal accent-divider */
  divider?: boolean;

  // ─── Pills ─────────────────────────────────
  pills?: string[];

  // ─── Footer-info (vises uavhengig av mal) ──
  phone?: string;
  url?: string;
  hours?: string;
  address?: string;

  // ─── Layout-knobs ──────────────────────────
  align?: "center" | "left";
  /** 0.5-2.0 multiplier på title-font-size */
  title_scale?: number;

  // ─── For brand_spotlight ───────────────────
  brand_name?: string;
  brand_logo_url?: string;

  // ─── For partners_rundell ──────────────────
  /** Liste med leverandører/gjester som scroller horisontalt på slide-en.
   *  Hvis logo_url mangler, vises navnet som styled tekst-kort i stedet.
   *  `filter_black: true` rendrer logoen som ren svart silhuett (CSS-invert)
   *  — nyttig for logoer som leveres i hvit-versjon men trenger å være
   *  svart mot en hvit bakgrunn. */
  partners?: Array<{
    name: string;
    logo_url?: string;
    badge?: string;
    /** Render logo som ren svart silhuett (CSS-invert). */
    filter_black?: boolean;
    /** Manuell scale-multiplier for logoer med mye åpen padding (default 1.0). */
    scale?: number;
  }>;
  /** Sekunder for en full loop (default 30). Lavere = raskere scroll. */
  rundell_duration?: number;

  // ─── Per-slide varighet (overstyrer global seconds_per_slide) ──────
  /** Antall sekunder denne slide-en vises før auto-advance. Hvis ikke
   *  satt, brukes settings.seconds_per_slide. Nyttig for slides som har
   *  egen animasjon (partner-rundell) som trenger lengre visningstid. */
  duration_seconds?: number;

  // ─── For multi_product ─────────────────────
  /** Indices inn i playlist.products[] — viser N produkter i grid */
  product_indexes?: number[];

  // ─── For combo ─────────────────────────────
  /** Produkt A index (combo-slide) */
  combo_a_idx?: number;
  /** Produkt B index (combo-slide) */
  combo_b_idx?: number;
  combo_price?: number;
  combo_badge?: string;

  // ─── For youtube ───────────────────────────
  /** Original YouTube-URL (lim inn — vi ekstraherer ID-en automatisk) */
  youtube_url?: string;
  /** Ekstrahert video-ID (11 tegn). Hvis satt rendres iframen direkte. */
  youtube_id?: string;
  /** Max sekunder før vi tvinger neste slide (default: la videoen avgjøre — auto-advance på 'ended') */
  youtube_max_seconds?: number;
  /** Mute video (default true — kreves for autoplay i alle browsere) */
  youtube_muted?: boolean;
  /** Start-tid i sekunder (default 0) */
  youtube_start?: number;
}

export interface PricetagSettings {
  /** Sekunder per slide (kun for slideshow) — default 12 */
  seconds_per_slide?: number;
  /** Transition-type (kun for slideshow) — default "fade" */
  transition?: "fade" | "slide" | "ken_burns";
  /** Vis QR-kode på A4-print */
  show_qr?: boolean;
  /** Vis rabatt-burst */
  show_burst?: boolean;
  /** Accent-farge (default FT-rød) */
  accent_color?: string;
  /** Vis "også populært"-pris-bånd nederst (slideshow) */
  show_period_band?: boolean;

  // ─── Nye globale slideshow-justeringer (mai 12) ──
  /** Vis klokke/dato i hjørnet på alle slides */
  show_clock?: boolean;
  /** Vis "PÅ LAGER"/"BESTILLING"-pill på produkt-slides */
  show_stock_status?: boolean;
  /** Animer pris-reveal når produkt-slide blir aktiv */
  animate_price_reveal?: boolean;
  /** Vis QR-kode i hjørnet på produkt-slide (slideshow) */
  show_product_qr?: boolean;
  /** Custom slides (intro/credentials/etc) — fullt redigerbar liste */
  custom_slides?: CustomSlide[];
}

export interface PricetagPlaylist {
  id: string;
  user_id: string;
  title: string;
  format: PricetagFormat;
  products: PricetagProduct[];
  settings: PricetagSettings;
  /**
   * Public share-token (UUID). Tillater eksterne skjermavspillere
   * (UniFi US Cast Pro, kiosk-PC osv) å hente slideshow uten innlogging.
   */
  share_token?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Default custom slides — speiler de 4 originale hardkodede slides:
 * intro / credentials / certified / outro.
 * Brukeren kan redigere alle felter fritt.
 */
export function defaultCustomSlides(): CustomSlide[] {
  return [
    {
      id: "intro",
      enabled: true,
      label: "Intro",
      template: "intro",
      placement: "start",
      order: 0,
      bg_color: "#ed1c24",
      text_color: "#ffffff",
      accent_color: "#ffffff",
      top_logo: "ft-white",
      bottom_logo: "jub-25",
      eyebrow: "KAMPANJE VÅR 2026",
      divider: true,
      align: "center",
      title_scale: 1,
    },
    {
      id: "credentials",
      enabled: true,
      label: "Sertifisert leverandør",
      template: "credentials",
      placement: "end",
      order: 0,
      bg_color: "#0f1115",
      text_color: "#ffffff",
      accent_color: "#ed1c24",
      eyebrow: "FOSEN TOOLS-STANDARDEN",
      title: "SERTIFISERT\nLEVERANDØR\nTIL FORSVARET",
      subtitle: "HDFI · CADLAB · BREKSTAD",
      divider: true,
      align: "center",
      title_scale: 1,
    },
    {
      id: "certified",
      enabled: true,
      label: "100% fornybar",
      template: "certified",
      placement: "end",
      order: 1,
      bg_color: "#ffffff",
      text_color: "#0f1115",
      accent_color: "#ed1c24",
      eyebrow: "SERTIFISERT",
      title: "100 %\nFORNYBAR ENERGI",
      pills: ["MILJØFYRTÅRN", "GASELLE 2023", "25 ÅR", "4. GENERASJON", "GRØNT PUNKT"],
      divider: true,
      align: "center",
      title_scale: 1,
    },
    {
      id: "outro",
      enabled: true,
      label: "Velkommen inn (kontakt)",
      template: "outro",
      placement: "end",
      order: 2,
      bg_color: "#0f1115",
      text_color: "#ffffff",
      accent_color: "#ed1c24",
      eyebrow: "VELKOMMEN INN",
      title: "INDUSTRIGATA 1\nBREKSTAD",
      hours: "MAN — FRE  07:00 — 15:00",
      phone: "72 51 51 20",
      url: "fosen-tools.no",
      divider: true,
      align: "center",
      title_scale: 1,
    },
  ];
}

/** Unik ID for en ny custom slide (kalles utenfor React-render) */
export function newSlideId(): string {
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Nytt-template-fabrikk — brukes når man klikker «+ Ny slide» */
export function makeNewSlide(template: SlideTemplate): CustomSlide {
  const id = newSlideId();
  const base: CustomSlide = {
    id,
    enabled: true,
    template,
    placement: "end",
    order: 100,
    bg_color: "#0f1115",
    text_color: "#ffffff",
    accent_color: "#ed1c24",
    align: "center",
    title_scale: 1,
    divider: true,
  };
  switch (template) {
    case "intro":
      return { ...base, label: "Ny intro", bg_color: "#ed1c24", accent_color: "#ffffff", top_logo: "ft-white", bottom_logo: "jub-25", eyebrow: "KAMPANJE 2026" };
    case "credentials":
      return { ...base, label: "Stor tekst", eyebrow: "FOSEN TOOLS-STANDARDEN", title: "STOR TITTEL\nPÅ FLERE LINJER" };
    case "certified":
      return { ...base, label: "Sertifikater", bg_color: "#ffffff", text_color: "#0f1115", eyebrow: "SERTIFISERT", title: "100 %\nFORNYBAR ENERGI", pills: ["MILJØFYRTÅRN", "GASELLE"] };
    case "outro":
      return { ...base, label: "Kontakt-info", eyebrow: "VELKOMMEN INN", title: "INDUSTRIGATA 1\nBREKSTAD", phone: "72 51 51 20", url: "fosen-tools.no", hours: "MAN — FRE  07:00 — 15:00" };
    case "brand_spotlight":
      return { ...base, label: "Brand-spotlight", eyebrow: "NYTT FRA", brand_name: "Husqvarna", subtitle: "Diamantblad · Kjernebor · Sagverktøy" };
    case "partners_rundell":
      return {
        ...base,
        label: "Partner-rundell",
        eyebrow: "PÅ PLASS DENNE DAGEN",
        title: "VÅRE PARTNERE",
        rundell_duration: 30,
        partners: [
          { name: "Milwaukee" },
          { name: "Wera" },
          { name: "Soudal" },
        ],
      };
    case "multi_product":
      return { ...base, label: "Multi-produkt", product_indexes: [], align: "center" };
    case "combo":
      return { ...base, label: "Kombi-pris", combo_badge: "KOMBI-PRIS", combo_a_idx: 0, combo_b_idx: 1 };
    case "blank":
      return { ...base, label: "Tom slide", eyebrow: "", title: "" };
    case "youtube":
      return {
        ...base,
        label: "Ny YouTube-video",
        bg_color: "#000000",
        youtube_url: "",
        youtube_muted: true,
        youtube_start: 0,
      };
  }
}

/**
 * Trekk ut YouTube video-ID fra ulike URL-formater:
 *   https://www.youtube.com/watch?v=ABCDEFGHIJK
 *   https://youtu.be/ABCDEFGHIJK
 *   https://www.youtube.com/embed/ABCDEFGHIJK
 *   https://www.youtube.com/shorts/ABCDEFGHIJK
 * Returnerer null hvis ingen 11-tegns-ID kan ekstraheres.
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  // Hvis brukeren limte inn ren ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}

export const DEFAULT_SETTINGS: PricetagSettings = {
  seconds_per_slide: 12,
  transition: "fade",
  show_qr: true,
  show_burst: true,
  accent_color: "#ed1c24",
  show_period_band: true,
  show_clock: false,
  show_stock_status: false,
  animate_price_reveal: true,
  show_product_qr: false,
};

export const FORMAT_LABELS: Record<PricetagFormat, string> = {
  a4_single: "A4 — 1 produkt per ark",
  a4_2up: "A4 — 2 produkter per ark",
  a4_4up: "A4 — 4 produkter per ark",
  slideshow_landscape: "Slideshow — landskap 16:9",
  slideshow_portrait: "Slideshow — portrett 9:16",
};

export const SLIDE_TEMPLATE_LABELS: Record<SlideTemplate, string> = {
  intro: "Intro (logo + jubileum)",
  credentials: "Stor tekst-blokk",
  certified: "Sertifikater (med pills)",
  outro: "Kontakt-info (telefon + adresse)",
  brand_spotlight: "Brand-spotlight",
  partners_rundell: "Partner-rundell (horisontalt rullende)",
  multi_product: "Multi-produkt (2 / 4-up)",
  combo: "Kombi-tilbud (2 produkter)",
  blank: "Tom — fri redigering",
  youtube: "📺 YouTube-video",
};

export const LOGO_LABELS: Record<NonNullable<LogoKey>, string> = {
  "ft-white": "Fosen Tools (hvit)",
  "ft-black": "Fosen Tools (mørk)",
  "jub-25": "Jubileumslogo 25 år",
  "jub-100": "Jubileumslogo 100 år (konsern)",
  "custom": "Egen logo (URL)",
};

export const PRODUCT_MODE_LABELS: Record<ProductMode, string> = {
  sale: "Salg (SPAR-burst)",
  new: "Nyhet (NYHET-burst)",
  feature: "Vårt valg",
  stock: "På lager",
};

/** URL-er til logoer brukt i custom slides */
export const LOGO_URLS: Record<NonNullable<Exclude<LogoKey, "custom">>, string> = {
  "ft-white": "/brosjyre/Fosen-Tools_white.svg",
  "ft-black": "/brosjyre/fosentools_logo_ny.png",
  "jub-25": "/brosjyre/Jubileumslogo-25aar.svg",
  "jub-100": "/brosjyre/Jubileumslogo-100aar.svg",
};

/** Type for ferdig-bygd slide-liste (intern i renderer) */
export interface SlideListItem {
  kind: "product" | "custom";
  product?: PricetagProduct;
  custom?: CustomSlide;
}

/**
 * Bygg flat slide-rekkefølge fra products + custom slides.
 * Respekterer placement + order.
 */
export function buildSlideList(
  products: PricetagProduct[],
  customSlides: CustomSlide[] | undefined
): SlideListItem[] {
  const enabled = (customSlides ?? []).filter((s) => s.enabled);
  const starts = enabled.filter((s) => s.placement === "start").sort((a, b) => a.order - b.order);
  const ends = enabled.filter((s) => s.placement === "end").sort((a, b) => a.order - b.order);
  const afters = enabled.filter((s) => s.placement === "after_product");

  const slides: SlideListItem[] = [];

  for (const s of starts) slides.push({ kind: "custom", custom: s });

  for (let i = 0; i < products.length; i++) {
    slides.push({ kind: "product", product: products[i] });
    const here = afters
      .filter((s) => s.after_product_idx === i)
      .sort((a, b) => a.order - b.order);
    for (const s of here) slides.push({ kind: "custom", custom: s });
  }

  for (const s of ends) slides.push({ kind: "custom", custom: s });

  return slides;
}
