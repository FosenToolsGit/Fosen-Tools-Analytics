// Bygger Husqvarna-vårkampanjen FRA GRUNNEN ved å bruke dynamic-templates.
// 1. Henter eksisterende produkter fra brosjyren (alle 36 scrapede)
// 2. Klassifiserer dem etter produktnavn
// 3. Bygger ny 8-siders brosjyre med:
//    - Side 1: Mørk premium-forside med offisielle jubileumslogoer
//    - Side 2: Combo + 2 (K1 PACE pakke + 2 produkter)
//    - Side 3: Grid 3×3 diamantblad S-serie
//    - Side 4: Grid 2×3 stor ringsagblad + W1610
//    - Side 5: Grid 3×3 kjernebor CR128
//    - Side 6: Grid 2×2 stor store kjernebor
//    - Side 7: Grid 2×3 stor maskiner
//    - Side 8: FT-bakside med 25- og 100-årslogo

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const BROCHURE_ID = "04e778e8-5a05-42fd-b6bd-87da8e039bb5";
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FT_RED = "#ed1c24";
const FT_INK = "#0f1115";
const W = 210, H = 297; // A4P

const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

// ──────────────────────────────────────────────────────────────────────
// Bygge-helpers (porter fra ft-decorations.ts og dynamic-templates.ts)
// ──────────────────────────────────────────────────────────────────────

const rect = (x, y, w, h, fill, radius = 0) => ({
  id: uid("obj"), type: "shape", x, y, w, h, rot: 0, locked: false,
  props: { shape: "rect", fill, stroke: "none", strokeW: 0, radius },
});

const txt = (x, y, w, h, content, preset, opts = {}) => ({
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

const img = (x, y, w, h, src, opts = {}) => ({
  id: uid("obj"), type: "image", x, y, w, h, rot: 0, locked: false,
  props: {
    src, label: opts.label || "Bilde",
    mask: "none", fit: opts.fit || "cover",
    focusX: 0.5, focusY: 0.5,
    tint: opts.tint ?? null,
  },
});

const badge = (x, y, w, h, text, opts = {}) => ({
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

const productCard = (product, x, y, w, h, variant = "standard", opts = {}) => ({
  id: uid("obj"),
  type: "productCard",
  x, y, w, h, rot: 0, locked: false,
  props: {
    variant,
    product,
    showBurst: opts.showBurst ?? true,
    burstStyle: opts.burstStyle ?? "star",
    burstText: opts.burstText ?? null,
    showQR: false,
    showStock: opts.showStock ?? true,
    showWarranty: false,
    vatMode: "ex",
    bulletCount: variant === "hero" ? 4 : variant === "compact" ? 0 : 3,
    bgColor: "#ffffff",
    accentColor: null,
  },
});

const comboCard = (productA, productB, comboPrice, x, y, w, h, opts = {}) => ({
  id: uid("obj"), type: "comboCard",
  x, y, w, h, rot: 0, locked: false,
  props: {
    productA, productB, comboPrice,
    comboLabel: opts.comboLabel || "KOMBI-PRIS",
    vatMode: "ex",
    bgColor: "#ffffff",
    accentColor: null,
    showSavings: true,
  },
});

// FT-stripe (10mm) — gjenbrukbar header
const fosenStripe = (y = 0) => [
  rect(0, y, W, 10, FT_INK),
  rect(0, y, 1.5, 10, FT_RED),
  img(6, y + 2, 38, 6, "/brosjyre/Fosen-Tools_white.svg", { fit: "contain", label: "Fosen Tools" }),
  txt(60, y + 3, 60, 4, "BREKSTAD · 25 ÅR", "h5", {
    align: "left", color: "rgba(255,255,255,0.85)", weight: 800,
  }),
  txt(W - 60, y + 3.2, 55, 4, "2001 — 2026", "h5", {
    align: "right", color: "rgba(255,255,255,0.55)", weight: 500,
  }),
];

// FT-footer — kontakt + sidetall
const fosenFooter = (pageNo, totalPages, yBase = 285) => [
  rect(0, yBase, W, 0.6, FT_RED),
  txt(8, yBase + 2, W - 70, 5, "fosen-tools.no  ·  72 51 51 20  ·  Industrigata 1, 7130 Brekstad", "h5", {
    color: "#374151", weight: 500,
  }),
  txt(W - 55, yBase + 2, 48, 5, `${pageNo} / ${totalPages}`, "h5", {
    align: "right", color: FT_RED, weight: 700,
  }),
];

// Tittel-band like under FT-stripe
const titleBand = (eyebrow, title, subtitle = null) => {
  const objs = [
    rect(13, 16, 4, 14, FT_RED),
    txt(20, 14, W - 40, 5, eyebrow, "h5", { color: "#6b7280", weight: 700 }),
    txt(20, 20, W - 40, 12, title, "h2", { color: "#111", weight: 900 }),
  ];
  if (subtitle) {
    objs.push(txt(20, 32, W - 40, 5, subtitle, "h5", { color: "#6b7280", weight: 500 }));
  }
  return objs;
};

// ──────────────────────────────────────────────────────────────────────
// Side-byggere
// ──────────────────────────────────────────────────────────────────────

function buildCoverDarkPremium(title, subtitle) {
  const logo25W = 110, logo25H = logo25W / 1.78;
  return {
    id: uid("page"), paper: "A4P", w: W, h: H, bg: "#ffffff",
    objects: [
      // Full-bleed mørk bg
      rect(0, 0, W, H, FT_INK),
      // Rød accent på topp
      rect(0, 0, W, 4, FT_RED),
      // Hvit FT-logo
      img((W - 90) / 2, 16, 90, 12, "/brosjyre/Fosen-Tools_white.svg", { fit: "contain", label: "Fosen Tools" }),
      // Eyebrow
      txt(0, 36, W, 4, "BREKSTAD · NORGE · 25 ÅR I BRANSJEN", "h5", {
        align: "center", color: "rgba(255,255,255,0.5)", weight: 700,
      }),
      // 25-årslogo
      img((W - logo25W) / 2, 48, logo25W, logo25H, "/brosjyre/Jubileumslogo-25aar.svg", {
        fit: "contain", label: "25 år",
      }),
      // Tittel — stor og dramatisk
      txt(10, 130, W - 20, 36, title, "h1", { color: "#ffffff", align: "center" }),
      // Rød accent-divider
      rect((W - 30) / 2, 178, 30, 2, FT_RED),
      // Subtitle
      txt(15, 188, W - 30, 8, subtitle, "h4", {
        color: "rgba(255,255,255,0.75)", align: "center", weight: 500,
      }),
      // KAMPANJE-burst rotert i hjørne
      badge(W - 50, 14, 38, 38, "OPPTIL\n−20%", { style: "star", rot: -10, fontSize: 11 }),
      // "DEL AV" + 100-årslogo
      txt(0, 212, W, 4, "DEL AV", "h5", { align: "center", color: "rgba(255,255,255,0.35)", weight: 700 }),
      img((W - 50) / 2, 218, 50, 13, "/brosjyre/Jubileumslogo-100aar.svg", { fit: "contain", label: "100 år" }),
      // CTA-band: rød accent-stripe
      rect((W - 60) / 2, 240, 60, 0.6, FT_RED),
      // RING OSS
      txt(0, 246, W, 4, "RING OSS", "h5", { align: "center", color: "rgba(255,255,255,0.5)", weight: 700 }),
      // Stor telefon
      txt(15, 252, W - 30, 14, "72 51 51 20", "h1", { align: "center", color: "#ffffff" }),
      // Kontakt-rad
      txt(15, 272, W - 30, 5, "fosen-tools.no  ·  Industrigata 1, 7130 Brekstad", "h5", {
        align: "center", color: "rgba(255,255,255,0.55)", weight: 500,
      }),
      txt(15, 280, W - 30, 4, "Man — fre  07:30 — 16:00  ·  Gyldig ut mai 2026", "h5", {
        align: "center", color: "rgba(255,255,255,0.35)", weight: 500,
      }),
    ],
  };
}

function buildBackCover() {
  const logo25W = 110, logo25H = logo25W / 1.78;
  return {
    id: uid("page"), paper: "A4P", w: W, h: H, bg: "#ffffff",
    objects: [
      rect(0, 0, W, H, FT_INK),
      rect(0, 0, W, 4, FT_RED),
      img((W - 100) / 2, 22, 100, 14, "/brosjyre/Fosen-Tools_white.svg", { fit: "contain", label: "Fosen Tools" }),
      txt(0, 44, W, 4, "BREKSTAD · NORGE", "h5", { align: "center", color: "rgba(255,255,255,0.5)", weight: 700 }),
      img((W - logo25W) / 2, 56, logo25W, logo25H, "/brosjyre/Jubileumslogo-25aar.svg", { fit: "contain", label: "25 år" }),
      txt(0, 132, W, 14, "PROFF-VERKTØY\nFOR FAGFOLK", "h1", { align: "center", color: "#ffffff" }),
      rect((W - 22) / 2, 162, 22, 2, FT_RED),
      txt(0, 170, W, 6, "Sertifisert leverandør til Forsvaret", "h5", {
        align: "center", color: "rgba(255,255,255,0.55)", weight: 400,
      }),
      txt(0, 184, W, 4, "DEL AV", "h5", { align: "center", color: "rgba(255,255,255,0.35)", weight: 700 }),
      img((W - 56) / 2, 190, 56, 14, "/brosjyre/Jubileumslogo-100aar.svg", { fit: "contain", label: "100 år" }),
      txt(0, 220, W, 4, "RING OSS", "h5", { align: "center", color: "rgba(255,255,255,0.4)", weight: 700 }),
      txt(0, 226, W, 12, "72 51 51 20", "h1", { align: "center", color: "#ffffff" }),
      txt(0, 250, W, 5, "Industrigata 1  ·  7130 Brekstad  ·  Man — fre  07:30 — 16:00", "h5", {
        align: "center", color: "rgba(255,255,255,0.5)", weight: 500,
      }),
      txt(0, 258, W, 5, "fosen-tools.no  ·  post@fosen-tools.no", "h5", {
        align: "center", color: "rgba(255,255,255,0.7)", weight: 500,
      }),
      rect(20, 273, W - 40, 0.3, "rgba(255,255,255,0.15)"),
      txt(0, 278, W, 4, "MILJØFYRTÅRN  ·  GASELLE 2023  ·  GRØNT PUNKT  ·  100 % FORNYBAR ENERGI", "h5", {
        align: "center", color: "rgba(255,255,255,0.55)", weight: 700,
      }),
    ],
  };
}

// Combo hero — 1 STOR combo + USP-blokk under
function buildComboHero(comboObj, eyebrow, title, uspTitle, uspBullets, pageNo, totalPages) {
  const objs = [
    ...fosenStripe(0),
    ...titleBand(eyebrow, title, "−10 % på pakkepris · gjelder ut mai"),
    // Stor combo midt på siden
    comboObj && { ...comboObj, x: 13, y: 50, w: 184, h: 130 },
    // USP-blokk under combo
    rect(13, 190, 4, 12, FT_RED),
    txt(22, 188, W - 40, 5, "HVORFOR PAKKE?", "h5", { color: "#6b7280", weight: 700 }),
    txt(22, 194, W - 40, 8, uspTitle, "h3", { color: "#111" }),
  ];
  // USP bullets
  for (let i = 0; i < uspBullets.length && i < 5; i++) {
    objs.push(rect(13, 210 + i * 11, 2, 8, FT_RED));
    objs.push(txt(20, 210 + i * 11, W - 40, 10, uspBullets[i], "body", { color: "#374151" }));
  }
  objs.push(...fosenFooter(pageNo, totalPages));
  return { id: uid("page"), paper: "A4P", w: W, h: H, bg: "#ffffff", objects: objs.filter(Boolean) };
}

// Grid 3×3 — 9 compact produkter
function buildGrid3x3(products, eyebrow, title, pageNo, totalPages) {
  const objs = [...fosenStripe(0), ...titleBand(eyebrow, title)];
  const startY = 44, colW = 60, rowH = 76, gap = 4, mx = 13;
  for (let i = 0; i < Math.min(products.length, 9); i++) {
    const r = Math.floor(i / 3), c = i % 3;
    objs.push(productCard(products[i], mx + c * (colW + gap), startY + r * (rowH + gap), colW, rowH, "compact"));
  }
  objs.push(...fosenFooter(pageNo, totalPages));
  return { id: uid("page"), paper: "A4P", w: W, h: H, bg: "#ffffff", objects: objs };
}

// Grid 2×3 stor — 6 produkter standard
function buildGrid2x3(products, eyebrow, title, pageNo, totalPages) {
  const objs = [...fosenStripe(0), ...titleBand(eyebrow, title)];
  const startY = 44, colW = 92, rowH = 76, gap = 4, mx = 13;
  for (let i = 0; i < Math.min(products.length, 6); i++) {
    const r = Math.floor(i / 2), c = i % 2;
    objs.push(productCard(products[i], mx + c * (colW + gap), startY + r * (rowH + gap), colW, rowH, "standard"));
  }
  objs.push(...fosenFooter(pageNo, totalPages));
  return { id: uid("page"), paper: "A4P", w: W, h: H, bg: "#ffffff", objects: objs };
}

// Grid 2×2 stor — 4 store produkter
function buildGrid2x2(products, eyebrow, title, pageNo, totalPages) {
  const objs = [...fosenStripe(0), ...titleBand(eyebrow, title)];
  const startY = 44, colW = 92, rowH = 116, gap = 4, mx = 13;
  for (let i = 0; i < Math.min(products.length, 4); i++) {
    const r = Math.floor(i / 2), c = i % 2;
    objs.push(productCard(products[i], mx + c * (colW + gap), startY + r * (rowH + gap), colW, rowH, "standard"));
  }
  objs.push(...fosenFooter(pageNo, totalPages));
  return { id: uid("page"), paper: "A4P", w: W, h: H, bg: "#ffffff", objects: objs };
}

// ──────────────────────────────────────────────────────────────────────
// Klassifisering av produkter
// ──────────────────────────────────────────────────────────────────────

function classifyProducts(allProducts) {
  const norm = (s) => (s || "").toUpperCase();
  const groups = {
    k1pace: [],
    batteripakke: [],
    diamantblad_S: [], // S35/S45/S85
    ringsag: [],       // R10/R20/W
    kjernebor: [],     // CR128, Ø082-Ø250
    maskin: [],        // FS-400, K-770/970/4000, DM-230, LF-80, PP-7
    annet: [],
  };
  for (const p of allProducts) {
    const n = norm(p.name);
    if (n.includes("K 1 PACE") || n.includes("K1 PACE")) groups.k1pace.push(p);
    else if (n.includes("BATTERIPAKKE") || n.includes("B750X") || n.includes("C1800X")) groups.batteripakke.push(p);
    else if (n.match(/DIAMANTSAGBLAD S(35|45|85)/)) groups.diamantblad_S.push(p);
    else if (n.includes("RINGSAGBLAD") || n.includes("W1610") || n.includes("DIAMANTBLAD W")) groups.ringsag.push(p);
    // VIKTIG: maskiner FØR kjernebor — KJERNEBORMASKIN er en maskin, ikke et kjernebor
    else if (n.match(/(FS-?400|K-?770|K-?970|K-?4000|DM-?230|LF-?80|PP-?7|KAPPSAG|MOTORKAPPESAG|KRAFTAGGREGAT|PLATEVIBRATOR|KJERNEBORMASKIN)/)) {
      if (!n.includes("K 1 PACE") && !n.includes("K1 PACE")) groups.maskin.push(p);
    }
    else if (n.includes("KJERNEBOR") || n.includes("CR128")) groups.kjernebor.push(p);
    else {
      groups.annet.push(p);
    }
  }
  return groups;
}

// Sortér slik at størrelsen er logisk: S35 først, så S45, så S85
function sortDiamantblad(products) {
  return products.slice().sort((a, b) => {
    const ax = (a.name.match(/S(\d+)\s+(\d+)/) || []).slice(1).map(Number);
    const bx = (b.name.match(/S(\d+)\s+(\d+)/) || []).slice(1).map(Number);
    if (ax[0] !== bx[0]) return ax[0] - bx[0];
    return ax[1] - bx[1];
  });
}

// Sortér kjernebor etter Ø-størrelse
function sortKjernebor(products) {
  return products.slice().sort((a, b) => {
    const aØ = parseInt((a.name.match(/Ø(\d+)/) || [])[1] || "0", 10);
    const bØ = parseInt((b.name.match(/Ø(\d+)/) || [])[1] || "0", 10);
    // ELITE DRILL (uten Ø) først
    if (a.name.includes("ELITE DRILL") || a.name.includes("Elite Drill")) return -1;
    if (b.name.includes("ELITE DRILL") || b.name.includes("Elite Drill")) return 1;
    return aØ - bØ;
  });
}

// ──────────────────────────────────────────────────────────────────────
// Hovedflyt
// ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Henter eksisterende brosjyre for å plukke produkter...");
  const { data: row, error } = await supa
    .from("brochures")
    .select("doc, title")
    .eq("id", BROCHURE_ID)
    .single();
  if (error) throw error;

  // Plukk ut alle unike produkter (matche på source_url)
  const productsByUrl = new Map();
  let existingCombo = null;
  for (const page of row.doc.pages) {
    for (const o of page.objects) {
      if (o.type === "productCard" && o.props.product?.source_url) {
        productsByUrl.set(o.props.product.source_url, o.props.product);
      }
      if (o.type === "comboCard" && o.props.productA && o.props.productB) {
        // Lagre eksisterende combo (K1 PACE + batteripakke)
        if (!existingCombo) existingCombo = { ...o.props };
        productsByUrl.set(o.props.productA.source_url, o.props.productA);
        productsByUrl.set(o.props.productB.source_url, o.props.productB);
      }
    }
  }
  const allProducts = [...productsByUrl.values()];
  console.log(`  Plukket ${allProducts.length} unike produkter`);

  const groups = classifyProducts(allProducts);
  console.log(`  K1 PACE: ${groups.k1pace.length}  ·  batteri: ${groups.batteripakke.length}`);
  console.log(`  Diamantblad S: ${groups.diamantblad_S.length}`);
  console.log(`  Ringsag/W: ${groups.ringsag.length}`);
  console.log(`  Kjernebor: ${groups.kjernebor.length}`);
  console.log(`  Maskiner: ${groups.maskin.length}`);
  console.log(`  Annet: ${groups.annet.length}`);

  // Sorter
  const diamantblad = sortDiamantblad(groups.diamantblad_S);
  const kjernebor = sortKjernebor(groups.kjernebor);
  const ringsag = groups.ringsag;
  const maskiner = groups.maskin;

  // Bygg combo-kortet
  const k1 = groups.k1pace[0];
  const batteri = groups.batteripakke[0];
  let combo = null;
  if (k1 && batteri) {
    // Bruk eksisterende comboPrice hvis tilgjengelig, ellers regn 10% rabatt
    const comboPrice = existingCombo?.comboPrice ?? Math.round(((k1.price_now || 0) + (batteri.price_now || 0)) * 0.9);
    combo = comboCard(k1, batteri, comboPrice, 30, 38, 150, 100, { comboLabel: existingCombo?.comboLabel || "KOMBI-PRIS · −10%" });
  }

  // ── Bygg sider ──────────────────────────────────────────────────────
  const pages = [];
  const TOTAL_PAGES_PLACEHOLDER = 8;

  // Side 1: Forside
  pages.push(buildCoverDarkPremium("HUSQVARNA\nVÅRKAMPANJE\n2026", "Diamantblader · maskiner · kjernebor — opptil 20 % rabatt"));

  // Side 2: Combo hero (K1 PACE + B750X med USP-blokk)
  pages.push(buildComboHero(
    combo,
    "HUSQVARNA · BATTERIPAKKE",
    "K1 PACE — KOMPLETT KAPPE-LØSNING",
    "Pakken inkluderer alt du trenger",
    [
      "Batteridrevet kraft uten utslipp — egnet for innendørs og urbane jobber",
      "Ekstra batteri = sammenhengende drift uten ladestopp",
      "PACE-systemet er kompatibelt med flere Husqvarna-verktøy",
      "Leveres komplett — klar til bruk dag én",
    ],
    2, TOTAL_PAGES_PLACEHOLDER
  ));

  // Side 3: Grid 3×3 diamantblad (9 produkter)
  pages.push(buildGrid3x3(
    diamantblad.slice(0, 9),
    "HUSQVARNA · DIAMANTBLAD",
    "ELITE CUT — S-SERIEN",
    3, TOTAL_PAGES_PLACEHOLDER
  ));

  // Side 4: Grid 2×2 — alle 4 ringsagblad (R10, R20×2, W1610)
  pages.push(buildGrid2x2(
    ringsag.slice(0, 4),
    "HUSQVARNA · RINGSAGBLAD",
    "PRESISJONSSAGER FOR BETONG",
    4, TOTAL_PAGES_PLACEHOLDER
  ));

  // Split kjernebor på Ø150 — små vs store diametre
  const kjerneborSmå = kjernebor.filter(k => {
    const m = (k.name || "").match(/Ø(\d+)/);
    return !m || parseInt(m[1], 10) <= 150;
  });
  const kjerneborStore = kjernebor.filter(k => {
    const m = (k.name || "").match(/Ø(\d+)/);
    return m && parseInt(m[1], 10) > 150;
  });

  // Side 5: Grid 3×3 kjernebor små (Ø082-152 + evt Elite Drill)
  pages.push(buildGrid3x3(
    kjerneborSmå.slice(0, 9),
    "HUSQVARNA · KJERNEBOR",
    "CR128 ELITE DRILL — Ø82-152 MM",
    5, TOTAL_PAGES_PLACEHOLDER
  ));

  // Side 6: Grid 2×2 stor — store kjernebor (Ø150+) — 4 slots, perfekt
  pages.push(buildGrid2x2(
    kjerneborStore.slice(0, 4),
    "HUSQVARNA · KJERNEBOR",
    "STORE DIAMETRE — Ø150 MM OG OPP",
    6, TOTAL_PAGES_PLACEHOLDER
  ));

  // Side 7: Grid 3×3 — maskiner (opptil 9, vi har ~7)
  pages.push(buildGrid3x3(
    maskiner.slice(0, 9),
    "HUSQVARNA · MASKINER",
    "MOTORKAPPESAGER · BORMASKINER · KRAFTAGGREGAT",
    7, TOTAL_PAGES_PLACEHOLDER
  ));

  // Side 8: Bakside
  pages.push(buildBackCover());

  console.log(`\nByget ${pages.length} sider`);

  // Lagre
  const newDoc = {
    ...row.doc,
    pages,
  };

  console.log("Lagrer ny brosjyre...");
  const { error: updErr } = await supa
    .from("brochures")
    .update({ doc: newDoc, updated_at: new Date().toISOString() })
    .eq("id", BROCHURE_ID);
  if (updErr) throw updErr;
  console.log("✓ Husqvarna-brosjyren bygget fra grunnen med dynamiske maler");
}

main().catch(e => { console.error(e); process.exit(1); });
