// Dynamiske maler — bytter LAYOUT på en eksisterende side uten å miste innhold.
//
// Kjernekonsept: en mal er en samling av "slots" (positioner) + "decorations"
// (statisk header, footer, banner, FT-stripe). Når en mal anvendes på en side,
// plukker vi ut eksisterende produkter + tittel og fyller dem inn i slotene.
// Resten av layouten erstattes.

import type {
  Page, PageObject, Product, ProductCardVariant, ComboCardProps,
} from "./types";
import { uid } from "./store";
import { makeFosenStripe, makeFosenFooter, makeFosenBackCover } from "./ft-decorations";

const FT_RED = "#ed1c24";
const FT_INK = "#0f1115";

// ──────────────────────────────────────────────────────────────────────
// Innholds-ekstraksjon — hva vi tar med oss fra eksisterende side
// ──────────────────────────────────────────────────────────────────────

interface ExtractedContent {
  products: Product[];                                    // alle productCards
  combos: Array<ComboCardProps>;                          // alle comboCards
  galleryProducts: Product[];                             // produkter fra gallery
  title: string | null;                                   // første h1/h2-tekst
  subtitle: string | null;                                // andre tittel
  customTexts: Array<{ content: string; preset: string }>; // bruker-lagte tekster
  images: Array<{ src: string; label: string }>;         // image-objekter (hero, foto)
  burstText: string | null;                               // første burst-tekst (-30%, etc.)
}

export function extractContent(page: Page): ExtractedContent {
  const products: Product[] = [];
  const combos: ComboCardProps[] = [];
  const galleryProducts: Product[] = [];
  const titles: Array<{ content: string; preset: string; size: number }> = [];
  const images: Array<{ src: string; label: string; size: number }> = [];
  let burstText: string | null = null;

  for (const o of page.objects) {
    if (o.type === "productCard" && o.props.product) {
      products.push(o.props.product);
    } else if (o.type === "comboCard") {
      combos.push(o.props);
    } else if (o.type === "gallery") {
      for (const p of o.props.products || []) {
        if (p) galleryProducts.push(p);
      }
    } else if (o.type === "text" && (o.props.preset === "h1" || o.props.preset === "h2" || o.props.preset === "h3")) {
      titles.push({
        content: o.props.content,
        preset: o.props.preset,
        size: o.w * o.h,
      });
    } else if (o.type === "image" && o.props.src) {
      // Hopp over små logoer (< 30mm bred eller < 12mm høy) og vår egen FT-logo
      const isSmallLogo = o.w < 40 || o.h < 12;
      const isFtLogo = o.props.src.includes("Fosen-Tools_white") || o.props.src.includes("Jubileumslogo");
      if (!isSmallLogo && !isFtLogo) {
        images.push({ src: o.props.src, label: o.props.label || "", size: o.w * o.h });
      }
    } else if (o.type === "badge" && !burstText) {
      // Plukk første ikke-tomme burst-tekst (typisk -30%, KAMPANJE, etc.)
      const t = o.props.text?.trim();
      if (t && !t.includes("EKSKLUSIVT") && !t.includes("FOSEN TOOLS")) {
        burstText = t;
      }
    }
  }

  // Sorter titler etter preset + størrelse — h1 først, så h2, så h3
  const order: Record<string, number> = { h1: 0, h2: 1, h3: 2 };
  titles.sort((a, b) => (order[a.preset] ?? 9) - (order[b.preset] ?? 9) || b.size - a.size);

  // Sorter bilder etter størrelse — største først (= sannsynlig hero-bilde)
  images.sort((a, b) => b.size - a.size);

  return {
    products: [...products, ...galleryProducts],
    combos,
    galleryProducts,
    title: titles[0]?.content ?? null,
    subtitle: titles[1]?.content ?? null,
    customTexts: [],
    images: images.map(({ src, label }) => ({ src, label })),
    burstText,
  };
}

// ──────────────────────────────────────────────────────────────────────
// Slot-defs + helpers
// ──────────────────────────────────────────────────────────────────────

export interface ProductSlot {
  kind: "product";
  x: number;
  y: number;
  w: number;
  h: number;
  variant: ProductCardVariant;
}

export interface ComboSlot {
  kind: "combo";
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Slot = ProductSlot | ComboSlot;

export interface DynamicTemplate {
  id: string;
  label: string;
  category: "Forside" | "Produkter" | "Hero" | "Bransje" | "Bakside";
  /** Kort beskrivelse av kapasitet, vises i UI ("9 produkter") */
  capacityLabel: string;
  /** Slot-spec hvor produkter/combo plasseres */
  slots: Slot[];
  /** Bygg decorations basert på sidens størrelse + tittel/sidetall.
   *  Returnerer PageObject[] som settes FØR slots (bg, header, FT-stripe)
   *  ELLER ETTER slots (footer). build-funksjonen sender returnerer en liste
   *  hvor pre er bunn-på-Z (renderer først) og post er topp (renderer sist). */
  build: (ctx: BuildCtx) => { pre: PageObject[]; post: PageObject[] };
}

export interface BuildCtx {
  page: { w: number; h: number };
  title: string | null;
  subtitle: string | null;
  pageNo: number;
  totalPages: number;
  /** Husqvarna/Wera/etc — kan brukes til header-tag */
  brandLabel?: string;
  /** Hovedbilde fra eksisterende side (hvis tilgjengelig) — brukes på forsider */
  heroImage?: { src: string; label: string } | null;
  /** Burst-tekst som "-30%" eller "KAMPANJE" — brukes på forsider */
  burstText?: string | null;
}

// ── Bygge-helpers (duplisert fra ft-decorations for å unngå circular import) ─
const rect = (x: number, y: number, w: number, h: number, fill: string): PageObject => ({
  id: uid("obj"), type: "shape", x, y, w, h, rot: 0, locked: false,
  props: { shape: "rect", fill, stroke: "none", strokeW: 0, radius: 0 },
});

const img = (
  x: number, y: number, w: number, h: number, src: string,
  opts: { fit?: "cover" | "contain"; label?: string; tint?: "white" | "dark" | null } = {}
): PageObject => ({
  id: uid("obj"), type: "image", x, y, w, h, rot: 0, locked: false,
  props: {
    src, label: opts.label || "Bilde",
    mask: "none", fit: opts.fit || "cover",
    focusX: 0.5, focusY: 0.5,
    tint: opts.tint ?? null,
  },
});

const badge = (
  x: number, y: number, w: number, h: number,
  text: string,
  opts: { style?: "star" | "circle" | "ribbon" | "stamp" | "diagonal"; color?: string; rot?: number; fontSize?: number } = {}
): PageObject => ({
  id: uid("obj"), type: "badge",
  x, y, w, h, rot: opts.rot ?? -8, locked: false,
  props: {
    text,
    style: opts.style || "star",
    color: opts.color || FT_RED,
    textColor: "#ffffff",
    fontSize: opts.fontSize ?? 12,
  },
});

const txt = (
  x: number, y: number, w: number, h: number,
  content: string, preset: "h1" | "h2" | "h3" | "h4" | "h5" | "body",
  opts: { align?: "left" | "center" | "right"; color?: string; weight?: number } = {}
): PageObject => ({
  id: uid("obj"), type: "text", x, y, w, h, rot: 0, locked: false,
  props: {
    content, preset,
    align: opts.align || "left",
    color: opts.color || "#111827",
    weight: opts.weight ?? (preset.startsWith("h") ? 900 : 400),
    italic: false,
    isHeading: preset.startsWith("h"),
  },
});

// ──────────────────────────────────────────────────────────────────────
// Maler — alle har samme dekorasjons-DNA (FT-stripe + header + FT-footer)
// ──────────────────────────────────────────────────────────────────────

const standardDecor = (ctx: BuildCtx, headerH = 14) => {
  const W = ctx.page.w;
  const pre: PageObject[] = [
    ...makeFosenStripe(0, W),
    // Tittel-band like under stripe
    rect(12, 16, 4, headerH, FT_RED),
    txt(20, 14, W - 40, 6, (ctx.brandLabel || "FOSEN TOOLS").toUpperCase() + (ctx.title ? "" : ""), "h5", {
      color: "#6b7280", weight: 700,
    }),
    txt(20, 20, W - 40, headerH - 2, ctx.title || "PRODUKTER", "h2", {
      color: "#111", weight: 900,
    }),
  ];
  const post: PageObject[] = [...makeFosenFooter(ctx.pageNo, ctx.totalPages, W)];
  return { pre, post };
};

// Hjelpere for slot-genererte productCards
const productCardObj = (slot: ProductSlot, product: Product, accent: string | null = null): PageObject => ({
  id: uid("obj"),
  type: "productCard",
  x: slot.x, y: slot.y, w: slot.w, h: slot.h, rot: 0, locked: false,
  props: {
    variant: slot.variant,
    product,
    showBurst: true,
    burstStyle: "star",
    burstText: null,
    showQR: false,
    showStock: true,
    showWarranty: false,
    vatMode: "ex",
    bulletCount: slot.variant === "hero" ? 4 : slot.variant === "compact" ? 0 : 3,
    bgColor: "#ffffff",
    accentColor: accent,
  },
});

// ── Grid 3×3 (9 produkter, compact) ──────────────────────────────────
const grid3x3Slots = (): ProductSlot[] => {
  const slots: ProductSlot[] = [];
  const startY = 38;
  const colW = 60, rowH = 76, gap = 4, mx = 13;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      slots.push({
        kind: "product",
        x: mx + c * (colW + gap),
        y: startY + r * (rowH + gap),
        w: colW, h: rowH,
        variant: "compact",
      });
    }
  }
  return slots;
};

// ── Grid 3×2 (6 produkter, compact) ──────────────────────────────────
const grid3x2Slots = (): ProductSlot[] => {
  const slots: ProductSlot[] = [];
  const startY = 38;
  const colW = 60, rowH = 110, gap = 4, mx = 13;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      slots.push({
        kind: "product",
        x: mx + c * (colW + gap),
        y: startY + r * (rowH + gap),
        w: colW, h: rowH,
        variant: "compact",
      });
    }
  }
  return slots;
};

// ── Grid 2×3 (6 produkter, standard) ──────────────────────────────────
const grid2x3Slots = (): ProductSlot[] => {
  const slots: ProductSlot[] = [];
  const startY = 38;
  const colW = 92, rowH = 80, gap = 4, mx = 13;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 2; c++) {
      slots.push({
        kind: "product",
        x: mx + c * (colW + gap),
        y: startY + r * (rowH + gap),
        w: colW, h: rowH,
        variant: "standard",
      });
    }
  }
  return slots;
};

// ── Grid 2×2 (4 produkter, standard stor) ─────────────────────────────
const grid2x2Slots = (): ProductSlot[] => {
  const slots: ProductSlot[] = [];
  const startY = 38;
  const colW = 92, rowH = 116, gap = 4, mx = 13;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      slots.push({
        kind: "product",
        x: mx + c * (colW + gap),
        y: startY + r * (rowH + gap),
        w: colW, h: rowH,
        variant: "standard",
      });
    }
  }
  return slots;
};

// ── Hero + 4-grid (1 hero + 4 compact, total 5) ───────────────────────
const heroPlusGridSlots = (): ProductSlot[] => [
  { kind: "product", x: 13, y: 38, w: 184, h: 100, variant: "hero" },
  { kind: "product", x: 13, y: 144, w: 90, h: 74, variant: "compact" },
  { kind: "product", x: 107, y: 144, w: 90, h: 74, variant: "compact" },
  { kind: "product", x: 13, y: 222, w: 90, h: 60, variant: "compact" },
  { kind: "product", x: 107, y: 222, w: 90, h: 60, variant: "compact" },
];

// ── 1 hero (1 produkt fullside) ───────────────────────────────────────
const single1HeroSlots = (): ProductSlot[] => [
  { kind: "product", x: 13, y: 38, w: 184, h: 220, variant: "hero" },
];

// ── Compare 2 (2 produkter horisontalt) ───────────────────────────────
const compare2Slots = (): ProductSlot[] => [
  { kind: "product", x: 13, y: 38, w: 184, h: 110, variant: "compare" },
  { kind: "product", x: 13, y: 156, w: 184, h: 110, variant: "compare" },
];

// ── Combo + 2-grid (1 combo + 2 standard) ─────────────────────────────
const comboPlusGridSlots = (): Slot[] => [
  { kind: "combo", x: 30, y: 38, w: 150, h: 100 },
  { kind: "product", x: 13, y: 156, w: 90, h: 116, variant: "standard" },
  { kind: "product", x: 107, y: 156, w: 90, h: 116, variant: "standard" },
];

// ──────────────────────────────────────────────────────────────────────
// FORSIDE-MALER — bygger komplett side-layout med hero, tittel, burst
// ──────────────────────────────────────────────────────────────────────

const COVER_W = 210, COVER_H = 297;

// ── Mal 1: Klassisk — top FT-stripe, hero-bilde, tittel, sigill ────────
const buildCoverClassic = (ctx: BuildCtx): { pre: PageObject[]; post: PageObject[] } => {
  const W = ctx.page.w;
  const title = (ctx.title || "VÅR-KAMPANJE\n2026").toUpperCase();
  const subtitle = ctx.subtitle || ctx.brandLabel || "FOSEN TOOLS · BREKSTAD";
  const hero = ctx.heroImage;
  const burst = ctx.burstText || "−30%";

  const pre: PageObject[] = [
    // FT-stripe på topp
    ...makeFosenStripe(0, W),
    // Hero-område (50% høyde)
    hero
      ? img(0, 10, W, 145, hero.src, { fit: "cover", label: hero.label })
      : rect(0, 10, W, 145, "#e9eef5"),
    // Sort gradient overlay nederst på hero
    rect(0, 110, W, 45, "rgba(0,0,0,0.0)"), // placeholder
    // Eyebrow
    txt(15, 160, W - 30, 5, "VÅRKAMPANJE 2026", "h5", { color: "#6b7280", weight: 700 }),
    // Rød accent-divider
    rect(15, 170, 14, 0.8, FT_RED),
    // Stor tittel
    txt(15, 178, W - 30, 50, title, "h1", { color: "#111", weight: 900 }),
    // Underlinje-rule
    rect(15, 232, 22, 2, FT_RED),
    // Tagline
    txt(15, 240, W - 30, 8, subtitle, "h4", { color: "#4b5563", weight: 400 }),
    // Burst i hjørne
    badge(W - 50, 25, 38, 38, burst, { style: "star", rot: -10, fontSize: 11 }),
    // FT-bunntekst-bånd (kontakt)
    rect(0, 268, W, 22, FT_INK),
    txt(15, 275, W - 30, 5, "FOSEN-TOOLS.NO  ·  72 51 51 20  ·  INDUSTRIGATA 1, 7130 BREKSTAD", "h5", {
      color: "rgba(255,255,255,0.8)", weight: 600, align: "center",
    }),
    txt(15, 282, W - 30, 4, "VÅR-KAMPANJE  ·  GYLDIG UT MAI 2026", "h5", {
      color: "rgba(255,255,255,0.5)", weight: 500, align: "center",
    }),
  ];
  return { pre, post: [] };
};

// ── Mal 2: Bold Red — full-bleed rød med FT-logo og 25-årsmerke ────────
const buildCoverBoldRed = (ctx: BuildCtx): { pre: PageObject[]; post: PageObject[] } => {
  const W = ctx.page.w;
  const title = (ctx.title || "VÅR-\nKAMPANJE\n2026").toUpperCase();
  const subtitle = ctx.subtitle || "INNTIL 30% RABATT";
  const burst = ctx.burstText;
  const logo25W = 80, logo25H = logo25W / 1.78;

  const pre: PageObject[] = [
    // Full-bleed rød bg
    rect(0, 0, W, COVER_H, FT_RED),
    // Mørk bånd nederst for kontrast
    rect(0, 175, W, 122, FT_INK),
    // Hvit FT-logo øverst
    img((W - 80) / 2, 18, 80, 11, "/brosjyre/Fosen-Tools_white.svg", { fit: "contain", label: "Fosen Tools" }),
    // Eyebrow
    txt(0, 40, W, 5, "BREKSTAD · 25 ÅR I BRANSJEN", "h5", {
      align: "center", color: "rgba(255,255,255,0.85)", weight: 700,
    }),
    // STOR tittel
    txt(15, 56, W - 30, 70, title, "h1", { color: "#ffffff", align: "center" }),
    // Hvit divider
    rect((W - 60) / 2, 134, 60, 0.8, "#ffffff"),
    // Subtitle
    txt(15, 142, W - 30, 10, subtitle, "h3", { color: "rgba(255,255,255,0.95)", align: "center" }),
    // 25-årslogo (offisiell) midt på mørk del
    img((W - logo25W) / 2, 190, logo25W, logo25H, "/brosjyre/Jubileumslogo-25aar.svg", {
      fit: "contain", label: "25 år",
    }),
    // Burst hvis aktuelt
    ...(burst ? [badge(W - 52, 12, 36, 36, burst, { style: "star", rot: -8, fontSize: 10 })] : []),
    // Kontakt-rad nederst
    rect(0, 270, W, 0.6, FT_RED),
    txt(15, 274, W - 30, 5, "TLF 72 51 51 20  ·  fosen-tools.no", "h5", {
      align: "center", color: "rgba(255,255,255,0.9)", weight: 700,
    }),
    txt(15, 282, W - 30, 5, "Industrigata 1  ·  7130 Brekstad", "h5", {
      align: "center", color: "rgba(255,255,255,0.55)", weight: 500,
    }),
  ];
  return { pre, post: [] };
};

// ── Mal 3: Dark Premium — mørk bg, stor 25-årslogo som hovedelement ────
const buildCoverDarkPremium = (ctx: BuildCtx): { pre: PageObject[]; post: PageObject[] } => {
  const W = ctx.page.w;
  const title = (ctx.title || "PROFF-VERKTØY\nFOR FAGFOLK").toUpperCase();
  const subtitle = ctx.subtitle || ctx.brandLabel || "KAMPANJE VÅR 2026";
  const logo25W = 130, logo25H = logo25W / 1.78;

  const pre: PageObject[] = [
    // Full-bleed dyp-mørk bg
    rect(0, 0, W, COVER_H, FT_INK),
    // Rød accent-stripe øverst
    rect(0, 0, W, 4, FT_RED),
    // FT-logo
    img((W - 90) / 2, 18, 90, 12, "/brosjyre/Fosen-Tools_white.svg", { fit: "contain", label: "Fosen Tools" }),
    // Eyebrow
    txt(0, 40, W, 5, "BREKSTAD · NORGE", "h5", {
      align: "center", color: "rgba(255,255,255,0.5)", weight: 700,
    }),
    // STOR 25-årslogo midt på siden
    img((W - logo25W) / 2, 56, logo25W, logo25H, "/brosjyre/Jubileumslogo-25aar.svg", {
      fit: "contain", label: "25 år",
    }),
    // Tittel
    txt(15, 150, W - 30, 24, title, "h1", { color: "#ffffff", align: "center" }),
    // Rød divider
    rect((W - 22) / 2, 184, 22, 2, FT_RED),
    // Subtitle
    txt(15, 192, W - 30, 6, subtitle, "h4", { color: "rgba(255,255,255,0.7)", align: "center", weight: 500 }),
    // "DEL AV"-tekst
    txt(0, 218, W, 4, "DEL AV", "h5", { align: "center", color: "rgba(255,255,255,0.35)", weight: 700 }),
    // 100-årslogo som hint
    img((W - 50) / 2, 224, 50, 13, "/brosjyre/Jubileumslogo-100aar.svg", {
      fit: "contain", label: "100 år",
    }),
    // Kontakt
    txt(15, 256, W - 30, 12, "72 51 51 20", "h2", { align: "center", color: "#ffffff" }),
    txt(15, 274, W - 30, 5, "fosen-tools.no  ·  Industrigata 1, 7130 Brekstad", "h5", {
      align: "center", color: "rgba(255,255,255,0.55)", weight: 500,
    }),
    txt(15, 282, W - 30, 4, "Man — fre  07:00 — 15:00", "h5", {
      align: "center", color: "rgba(255,255,255,0.35)", weight: 500,
    }),
  ];
  return { pre, post: [] };
};

// ── Mal 4: Editorial — diagonal split med hero + asymmetrisk typo ──────
const buildCoverEditorial = (ctx: BuildCtx): { pre: PageObject[]; post: PageObject[] } => {
  const W = ctx.page.w;
  const title = (ctx.title || "KAMPANJE\nFOR\nFAGFOLK").toUpperCase();
  const subtitle = ctx.subtitle || "VÅR 2026";
  const hero = ctx.heroImage;
  const burst = ctx.burstText;

  const pre: PageObject[] = [
    // Bunn-bg
    rect(0, 0, W, COVER_H, "#f7f5f1"),
    // Diagonal rød stripe (rotert rect)
    {
      id: uid("obj"), type: "shape" as const,
      x: -20, y: 60, w: 280, h: 12, rot: -18, locked: false,
      props: { shape: "rect", fill: FT_RED, stroke: "none", strokeW: 0, radius: 0 },
    },
    // FT-stripe
    ...makeFosenStripe(0, W),
    // Hero-bilde øverst-høyre (asymmetrisk)
    hero
      ? img(W * 0.4, 30, W * 0.6 - 5, 110, hero.src, { fit: "cover", label: hero.label })
      : rect(W * 0.4, 30, W * 0.6 - 5, 110, "#dadde2"),
    // Stor tittel venstre side (overlapper diagonal stripe)
    txt(15, 90, W * 0.55, 70, title, "h1", { color: "#111", weight: 900 }),
    // Sub
    txt(15, 168, W - 30, 6, subtitle, "h5", { color: FT_RED, weight: 700 }),
    // Rød accent
    rect(15, 178, 56, 3, FT_RED),
    // Brødtekst
    txt(15, 188, W * 0.6, 30, "Robust verktøy fra leverandørene vi har stått sammen med i 25 år. Alt på lager på Brekstad.", "body", {
      color: "#4b5563", weight: 400,
    }),
    // Logo-rad
    txt(15, 232, W - 30, 5, "WERA  ·  KNIPEX  ·  MILWAUKEE  ·  HUSQVARNA  ·  PELICASE  ·  STAHLWILLE", "h5", {
      color: "#6b7280", weight: 800, align: "center",
    }),
    // Burst
    ...(burst ? [badge(W - 50, 30, 40, 40, burst, { style: "star", rot: -12, fontSize: 12 })] : []),
    // Kontakt-bånd
    rect(0, 268, W, 22, FT_INK),
    img(15, 274, 28, 4, "/brosjyre/Fosen-Tools_white.svg", { fit: "contain", label: "FT" }),
    txt(50, 274, 100, 4, "BREKSTAD · 25 ÅR", "h5", { color: "rgba(255,255,255,0.85)", weight: 700 }),
    txt(W - 90, 274, 75, 4, "72 51 51 20  ·  fosen-tools.no", "h5", {
      color: "rgba(255,255,255,0.65)", weight: 500, align: "right",
    }),
  ];
  return { pre, post: [] };
};

// ── Mal 5: Full-bleed foto — bilde tar 70% av siden, tittel i bunn ────
const buildCoverPhoto = (ctx: BuildCtx): { pre: PageObject[]; post: PageObject[] } => {
  const W = ctx.page.w;
  const title = (ctx.title || "KAMPANJE\nFOR FAGFOLK").toUpperCase();
  const subtitle = ctx.subtitle || "VÅR 2026";
  const hero = ctx.heroImage;
  const burst = ctx.burstText;

  const pre: PageObject[] = [
    // Hero-bilde full-bleed øvre 70%
    hero
      ? img(0, 0, W, 200, hero.src, { fit: "cover", label: hero.label })
      : rect(0, 0, W, 200, "#1c1f23"),
    // Sort gradient nederst på bilde
    rect(0, 130, W, 70, "rgba(0,0,0,0)"),
    // FT-stripe på topp
    ...makeFosenStripe(0, W),
    // Tittel-blokk nederst på bildet
    txt(15, 145, W - 30, 6, subtitle, "h5", { color: "rgba(255,255,255,0.85)", weight: 700 }),
    rect(15, 156, 22, 2, "#ffffff"),
    txt(15, 162, W - 30, 30, title, "h1", { color: "#ffffff" }),
    // Hvit bunn-blokk
    rect(0, 200, W, 97, "#ffffff"),
    rect(15, 215, 14, 0.8, FT_RED),
    txt(15, 220, W - 30, 14, "Inntil 30 % rabatt på Milwaukee, Wera, Knipex, Stahlwille og Husqvarna", "h3", { color: "#111" }),
    rect(15, 248, 60, 0.5, FT_RED),
    txt(15, 254, W - 30, 5, "GYLDIG UT MAI 2026", "h5", { color: FT_RED, weight: 800 }),
    txt(15, 268, W - 30, 5, "fosen-tools.no  ·  72 51 51 20", "h4", { color: "#4b5563", weight: 600 }),
    txt(15, 278, W - 30, 5, "Industrigata 1, 7130 Brekstad", "h5", { color: "#6b7280", weight: 500 }),
    // Burst
    ...(burst ? [badge(W - 52, 18, 38, 38, burst, { style: "star", rot: -10, fontSize: 12 })] : []),
  ];
  return { pre, post: [] };
};

// ──────────────────────────────────────────────────────────────────────
// Export — alle dynamiske maler
// ──────────────────────────────────────────────────────────────────────

export const DYNAMIC_TEMPLATES: DynamicTemplate[] = [
  // ─── FORSIDER ─────────────────────────────────────────────────────────
  {
    id: "dyn-cover-classic",
    label: "Klassisk forside",
    category: "Forside",
    capacityLabel: "Hero-bilde + tittel + sigill",
    slots: [],
    build: buildCoverClassic,
  },
  {
    id: "dyn-cover-bold-red",
    label: "Bold rød",
    category: "Forside",
    capacityLabel: "Full-bleed rød · 25-årslogo",
    slots: [],
    build: buildCoverBoldRed,
  },
  {
    id: "dyn-cover-dark-premium",
    label: "Mørk premium",
    category: "Forside",
    capacityLabel: "Mørk · stor 25-årslogo + 100-årslogo",
    slots: [],
    build: buildCoverDarkPremium,
  },
  {
    id: "dyn-cover-editorial",
    label: "Editorial",
    category: "Forside",
    capacityLabel: "Diagonal stripe · asymmetrisk",
    slots: [],
    build: buildCoverEditorial,
  },
  {
    id: "dyn-cover-photo",
    label: "Foto fullbleed",
    category: "Forside",
    capacityLabel: "Stort hero-bilde + tittel i bunn",
    slots: [],
    build: buildCoverPhoto,
  },
  // ─── PRODUKTSIDER ─────────────────────────────────────────────────────
  {
    id: "dyn-grid-3x3",
    label: "Grid 3×3",
    category: "Produkter",
    capacityLabel: "9 produkter",
    slots: grid3x3Slots(),
    build: (ctx) => standardDecor(ctx),
  },
  {
    id: "dyn-grid-3x2",
    label: "Grid 3×2 høy",
    category: "Produkter",
    capacityLabel: "6 produkter (høye kort)",
    slots: grid3x2Slots(),
    build: (ctx) => standardDecor(ctx),
  },
  {
    id: "dyn-grid-2x3",
    label: "Grid 2×3 stor",
    category: "Produkter",
    capacityLabel: "6 produkter (større)",
    slots: grid2x3Slots(),
    build: (ctx) => standardDecor(ctx),
  },
  {
    id: "dyn-grid-2x2",
    label: "Grid 2×2 stor",
    category: "Produkter",
    capacityLabel: "4 produkter (store)",
    slots: grid2x2Slots(),
    build: (ctx) => standardDecor(ctx),
  },
  {
    id: "dyn-hero-grid",
    label: "Hero + 4-grid",
    category: "Hero",
    capacityLabel: "1 hero + 4 mindre",
    slots: heroPlusGridSlots(),
    build: (ctx) => standardDecor(ctx),
  },
  {
    id: "dyn-single-hero",
    label: "1-produkt hero",
    category: "Hero",
    capacityLabel: "1 produkt (fullside)",
    slots: single1HeroSlots(),
    build: (ctx) => standardDecor(ctx),
  },
  {
    id: "dyn-compare-2",
    label: "Sammenlign 2",
    category: "Hero",
    capacityLabel: "2 produkter (sammenligning)",
    slots: compare2Slots(),
    build: (ctx) => standardDecor(ctx),
  },
  {
    id: "dyn-combo-plus-grid",
    label: "Combo + 2 sammen",
    category: "Hero",
    capacityLabel: "1 combo + 2 produkter",
    slots: comboPlusGridSlots(),
    build: (ctx) => standardDecor(ctx),
  },
];

// ──────────────────────────────────────────────────────────────────────
// applyTemplate — kjernefunksjonen
// ──────────────────────────────────────────────────────────────────────

export interface ApplyResult {
  newObjects: PageObject[];
  /** Antall produkter som ble plassert i slots */
  placedProducts: number;
  /** Antall produkter som ikke fikk plass (overflødige) */
  overflowProducts: number;
  /** Antall combos som ble plassert */
  placedCombos: number;
  /** Antall combos som ikke fikk plass */
  overflowCombos: number;
}

export function applyTemplate(
  currentPage: Page,
  template: DynamicTemplate,
  ctx: Omit<BuildCtx, "page" | "title" | "subtitle">
): ApplyResult {
  const content = extractContent(currentPage);
  const buildCtx: BuildCtx = {
    page: { w: currentPage.w, h: currentPage.h },
    title: content.title,
    subtitle: content.subtitle,
    heroImage: content.images[0] ?? null,
    burstText: content.burstText,
    ...ctx,
  };

  const { pre, post } = template.build(buildCtx);
  const productSlots = template.slots.filter((s): s is ProductSlot => s.kind === "product");
  const comboSlots = template.slots.filter((s): s is ComboSlot => s.kind === "combo");

  const placedProductObjects: PageObject[] = [];
  for (let i = 0; i < Math.min(content.products.length, productSlots.length); i++) {
    placedProductObjects.push(productCardObj(productSlots[i], content.products[i]));
  }

  const placedComboObjects: PageObject[] = [];
  for (let i = 0; i < Math.min(content.combos.length, comboSlots.length); i++) {
    const slot = comboSlots[i];
    const props = content.combos[i];
    placedComboObjects.push({
      id: uid("obj"),
      type: "comboCard",
      x: slot.x, y: slot.y, w: slot.w, h: slot.h, rot: 0, locked: false,
      props,
    });
  }

  return {
    newObjects: [...pre, ...placedProductObjects, ...placedComboObjects, ...post],
    placedProducts: placedProductObjects.length,
    overflowProducts: Math.max(0, content.products.length - productSlots.length),
    placedCombos: placedComboObjects.length,
    overflowCombos: Math.max(0, content.combos.length - comboSlots.length),
  };
}

// ──────────────────────────────────────────────────────────────────────
// Bakside-mal (bruker offisielle jubileumslogoer)
// ──────────────────────────────────────────────────────────────────────

export function applyBackCover(currentPage: Page, paper: "A4P" | "A4L" | "A5P" | "Letter" = "A4P"): Page {
  const newPage = makeFosenBackCover(paper, 0);
  // Bevarer pageId så side-rekkefølge ikke endres
  return { ...newPage, id: currentPage.id };
}
