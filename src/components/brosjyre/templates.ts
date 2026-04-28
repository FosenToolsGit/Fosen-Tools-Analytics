// Maler — forhåndskonfigurerte sammensetninger.

import type { Template, Page, PageObject, TextPreset } from "./types";
import {
  makeBlankPage,
  makeProductCardObj,
  makeBanner,
  makeImage,
  makeContact,
  makeFooter,
  uid,
  DUMMY_PRODUCTS,
} from "./store";

const txt = (
  x: number,
  y: number,
  w: number,
  h: number,
  content: string,
  preset: TextPreset,
  opts: { align?: "left" | "center" | "right"; color?: string; weight?: number } = {}
): PageObject => ({
  id: uid("obj"),
  type: "text",
  x, y, w, h, rot: 0, locked: false,
  props: {
    content,
    preset,
    align: opts.align || "left",
    color: opts.color || "#111827",
    weight: opts.weight ?? (preset?.startsWith("h") ? 900 : 400),
    italic: false,
    isHeading: preset?.startsWith("h"),
  },
});

const rect = (x: number, y: number, w: number, h: number, fill: string, opts: { radius?: number } = {}): PageObject => ({
  id: uid("obj"),
  type: "shape",
  x, y, w, h, rot: 0, locked: false,
  props: { shape: "rect", fill, stroke: "none", strokeW: 0, radius: opts.radius || 0 },
});

export const TEMPLATES: Template[] = [
  // ------------------------------- FORSIDER -------------------------------
  {
    id: "cover-classic",
    label: "Forside — klassisk",
    category: "Forside",
    build: (idx: number): Page => {
      const p = makeBlankPage("A4P", idx);
      p.objects = [
        makeBanner(0, 0, 210, 28),
        rect(15, 38, 14, 0.8, "#ed1c24"),
        txt(32, 33, 100, 8, "VÅR 2026 · UTGAVE 1", "h5", { color: "#6b7280" }),
        txt(15, 48, 180, 60, "VÅR-\nKAMPANJE\n2026", "h1", { color: "#111" }),
        txt(15, 115, 180, 12, "Inntil 30 % rabatt på utvalgte verktøy fra 40+ premium-merker.", "h4", { color: "#4b5563", weight: 400 }),
        makeImage(15, 135, 180, 115, "[ Hovedbilde — verktøy / verkstedmiljø ]"),
        // Burst inline (makeBadge skaper x,y=30,30 så vi lager direkte her)
        {
          id: uid("obj"),
          type: "badge",
          x: 155, y: 20, w: 35, h: 35, rot: -8, locked: false,
          props: { text: "INNTIL\n−30%", style: "star", color: "#ed1c24", textColor: "#ffffff", fontSize: 12 },
        },
        rect(15, 257, 180, 8, "#0f1115"),
        txt(20, 258.5, 170, 5, "01.04 — 30.04.2026   ·   MENS LAGERET REKKER", "h5", { color: "#fff" }),
        makeContact(15, 270),
        makeFooter(0, 287, idx + 1),
      ];
      return p;
    },
  },
  {
    id: "cover-bold",
    label: "Forside — bold rød",
    category: "Forside",
    build: (idx: number): Page => {
      const p = makeBlankPage("A4P", idx);
      p.objects = [
        rect(0, 0, 210, 297, "#ed1c24"),
        rect(0, 165, 210, 132, "#0f1115"),
        rect(15, 25, 8, 0.6, "#fff"),
        txt(26, 22, 100, 6, "FOSEN TOOLS · KAMPANJE", "h5", { color: "#fff" }),
        txt(15, 38, 180, 90, "VÅR-\nKAMPANJE\n2026.", "h1", { color: "#fff" }),
        txt(15, 130, 100, 10, "INNTIL", "h3", { color: "rgba(255,255,255,0.7)" }),
        txt(15, 138, 180, 25, "−30 %", "h1", { color: "#fff" }),
        txt(15, 180, 180, 12, "PREMIUM-VERKTØY.\nPROFESJONELLE PRISER.", "h2", { color: "#fff" }),
        txt(15, 215, 180, 12, "Sertifisert leverandør til Forsvaret. Del av 100-årig industrikonsern. 25 år i 2026.", "h4", { color: "rgba(255,255,255,0.75)", weight: 400 }),
        rect(15, 245, 14, 0.8, "#ed1c24"),
        txt(15, 250, 180, 6, "01.04 — 30.04.2026", "h5", { color: "#ed1c24" }),
        txt(15, 270, 180, 6, "fosen-tools.no  ·  72 51 51 20  ·  Brekstad", "h5", { color: "#fff" }),
      ];
      return p;
    },
  },
  {
    id: "cover-photo",
    label: "Forside — fullbleed foto",
    category: "Forside",
    build: (idx: number): Page => {
      const p = makeBlankPage("A4P", idx);
      p.objects = [
        makeImage(0, 0, 210, 200, "[ Hovedfoto — full bleed ]"),
        rect(0, 130, 210, 70, "rgba(0,0,0,0)"),
        rect(15, 145, 14, 0.8, "#ed1c24"),
        txt(32, 140, 100, 7, "VÅR 2026", "h5", { color: "#fff" }),
        txt(15, 155, 180, 35, "KAMPANJE\nFOR\nFAGFOLK.", "h1", { color: "#fff" }),
        rect(0, 200, 210, 97, "#fff"),
        txt(15, 215, 180, 18, "Inntil 30 % rabatt på Milwaukee, Wera, Knipex, Snap-on og Stahlwille.", "h3", { color: "#111" }),
        rect(15, 245, 60, 0.8, "#ed1c24"),
        txt(15, 250, 180, 6, "01.04 — 30.04.2026", "h5", { color: "#ed1c24" }),
        makeContact(15, 270),
      ];
      return p;
    },
  },

  // ------------------------------- 6-GRID -------------------------------
  {
    id: "grid-6",
    label: "6-grid produktside",
    category: "Produkter",
    build: (idx: number): Page => {
      const p = makeBlankPage("A4P", idx);
      const colW = 58, rowH = 110, gap = 4, mx = 12;
      p.objects = [
        rect(0, 0, 210, 24, "#0f1115"),
        rect(mx, 8, 14, 0.8, "#ed1c24"),
        txt(mx + 18, 4, 100, 8, "EL-VERKTØY", "h3", { color: "#fff" }),
        txt(mx + 18, 12, 100, 6, "Profesjonelle drillerlinjer · 6 utvalgte", "h5", { color: "rgba(255,255,255,0.6)", weight: 400 }),
        makeProductCardObj(DUMMY_PRODUCTS[0], mx, 32, "compact"),
        makeProductCardObj(DUMMY_PRODUCTS[1], mx + colW + gap, 32, "compact"),
        makeProductCardObj(DUMMY_PRODUCTS[2], mx + 2 * (colW + gap), 32, "compact"),
        makeProductCardObj(DUMMY_PRODUCTS[3], mx, 32 + rowH + gap, "compact"),
        makeProductCardObj(DUMMY_PRODUCTS[4], mx + colW + gap, 32 + rowH + gap, "compact"),
        makeProductCardObj(DUMMY_PRODUCTS[5], mx + 2 * (colW + gap), 32 + rowH + gap, "compact"),
        rect(mx, 265, 60, 0.5, "#e5e7eb"),
        txt(mx, 270, 180, 6, "Alle priser eks. mva. Forbehold om utsolgte varer og trykkfeil.", "h5", { color: "#9ca3af", weight: 400 }),
        makeFooter(0, 287, idx + 1),
      ];
      p.objects.forEach(o => {
        if (o.type === "productCard" && o.props.variant === "compact") {
          o.w = colW; o.h = rowH;
        }
      });
      return p;
    },
  },

  // ------------------------------- 4-GRID -------------------------------
  {
    id: "grid-4",
    label: "4-grid produktside",
    category: "Produkter",
    build: (idx: number): Page => {
      const p = makeBlankPage("A4P", idx);
      const colW = 88, rowH = 116, gap = 4, mx = 13;
      p.objects = [
        rect(0, 0, 210, 24, "#0f1115"),
        rect(mx, 8, 14, 0.8, "#ed1c24"),
        txt(mx + 18, 4, 100, 8, "HÅNDVERKTØY", "h3", { color: "#fff" }),
        txt(mx + 18, 12, 100, 6, "Wera, Knipex, Stahlwille · presisjon for fagfolk", "h5", { color: "rgba(255,255,255,0.6)", weight: 400 }),
        makeProductCardObj(DUMMY_PRODUCTS[1], mx, 32, "standard"),
        makeProductCardObj(DUMMY_PRODUCTS[2], mx + colW + gap, 32, "standard"),
        makeProductCardObj(DUMMY_PRODUCTS[3], mx, 32 + rowH + gap, "standard"),
        makeProductCardObj(DUMMY_PRODUCTS[4], mx + colW + gap, 32 + rowH + gap, "standard"),
        rect(mx, 273, 60, 0.5, "#e5e7eb"),
        txt(mx, 278, 180, 6, "Alle priser eks. mva. Mens lageret rekker.", "h5", { color: "#9ca3af", weight: 400 }),
        makeFooter(0, 287, idx + 1),
      ];
      p.objects.forEach(o => {
        if (o.type === "productCard" && o.props.variant === "standard") {
          o.w = colW; o.h = rowH;
        }
      });
      return p;
    },
  },

  // ------------------------------- COMPARE -------------------------------
  {
    id: "compare-2",
    label: "2-grid sammenligning",
    category: "Bundle",
    build: (idx: number): Page => {
      const p = makeBlankPage("A4P", idx);
      p.objects = [
        rect(15, 18, 14, 0.8, "#ed1c24"),
        txt(15, 24, 180, 14, "SAMMENLIGN", "h2", { color: "#111" }),
        txt(15, 38, 180, 8, "To gode valg, samme kvalitet. Velg rett verktøy for ditt bruk.", "h4", { color: "#4b5563", weight: 400 }),
        makeProductCardObj(DUMMY_PRODUCTS[3], 15, 60, "compare"),
        makeProductCardObj(DUMMY_PRODUCTS[0], 15, 165, "compare"),
        rect(15, 258, 60, 0.5, "#e5e7eb"),
        txt(15, 263, 180, 8, "Begge produkter har full produsent-garanti og leveres lagerført fra Brekstad.", "h5", { color: "#6b7280", weight: 400 }),
        makeFooter(0, 287, idx + 1),
      ];
      p.objects.filter(o => o.type === "productCard").forEach(o => { o.w = 180; o.h = 90; });
      return p;
    },
  },

  // ------------------------------- HERO -------------------------------
  {
    id: "hero-1",
    label: "1-produkt hero",
    category: "Bundle",
    build: (idx: number): Page => {
      const p = makeBlankPage("A4P", idx);
      p.objects = [
        rect(15, 18, 14, 0.8, "#ed1c24"),
        txt(15, 24, 180, 14, "MÅNEDENS DEAL", "h2", { color: "#111" }),
        txt(15, 38, 180, 8, "Beste pris i kampanjeperioden. Lagerført fra Brekstad.", "h4", { color: "#4b5563", weight: 400 }),
        makeProductCardObj(DUMMY_PRODUCTS[3], 15, 56, "hero"),
        rect(15, 215, 180, 0.5, "#e5e7eb"),
        rect(15, 225, 14, 0.8, "#ed1c24"),
        txt(15, 230, 80, 8, "GARANTI", "h4", { color: "#111" }),
        txt(15, 240, 80, 8, "Livstidsgaranti fra produsent.", "h5", { color: "#4b5563", weight: 400 }),
        rect(108, 225, 14, 0.8, "#ed1c24"),
        txt(108, 230, 80, 8, "LEVERING", "h4", { color: "#111" }),
        txt(108, 240, 80, 8, "1–3 arbeidsdager fra Brekstad.", "h5", { color: "#4b5563", weight: 400 }),
        makeContact(15, 256),
        makeFooter(0, 287, idx + 1),
      ];
      p.objects.filter(o => o.type === "productCard").forEach(o => { o.w = 180; o.h = 156; });
      return p;
    },
  },

  // ------------------------------- BRANSJE -------------------------------
  {
    id: "industry-defence",
    label: "Bransje-spread (Forsvar)",
    category: "Bransje",
    build: (idx: number): Page => {
      const p = makeBlankPage("A4P", idx);
      p.objects = [
        rect(0, 0, 210, 95, "#0f1726"),
        rect(15, 22, 14, 0.8, "#ed1c24"),
        txt(31, 18, 100, 7, "BRANSJE · FORSVAR", "h5", { color: "rgba(255,255,255,0.65)" }),
        txt(15, 32, 110, 25, "FORSVARET\nKREVER MEST.", "h2", { color: "#fff" }),
        txt(15, 70, 110, 18, "Sertifisert leverandør siden 2008. Pelicase, Snap-on og Stahlwille for forsvarsindustrien.", "h5", { color: "rgba(255,255,255,0.7)", weight: 400 }),
        makeImage(125, 12, 70, 71, "[ Forsvars-foto ]"),
        makeProductCardObj(DUMMY_PRODUCTS[5], 15, 105, "standard"),
        makeProductCardObj(DUMMY_PRODUCTS[3], 110, 105, "standard"),
        makeProductCardObj(DUMMY_PRODUCTS[4], 15, 175, "standard"),
        makeProductCardObj(DUMMY_PRODUCTS[1], 110, 175, "standard"),
        makeFooter(0, 287, idx + 1),
      ];
      p.objects.filter(o => o.type === "productCard").forEach(o => { o.w = 85; o.h = 65; });
      return p;
    },
  },
  {
    id: "industry-aviation",
    label: "Bransje-spread (Aviation)",
    category: "Bransje",
    build: (idx: number): Page => {
      const p = makeBlankPage("A4P", idx);
      p.objects = [
        rect(15, 18, 14, 0.8, "#ed1c24"),
        txt(15, 24, 180, 8, "BRANSJE · AVIATION", "h5", { color: "#6b7280" }),
        txt(15, 35, 180, 22, "MILLIMETERPRESISJON\nI HVERT VERKTØY.", "h2", { color: "#111" }),
        makeImage(15, 75, 180, 80, "[ Aviation maintenance — workshop scene ]"),
        txt(15, 162, 180, 6, "UTVALGTE PRODUKTER", "h5", { color: "#6b7280" }),
        rect(15, 170, 60, 0.8, "#ed1c24"),
        makeProductCardObj(DUMMY_PRODUCTS[1], 15, 178, "compact"),
        makeProductCardObj(DUMMY_PRODUCTS[4], 76, 178, "compact"),
        makeProductCardObj(DUMMY_PRODUCTS[2], 137, 178, "compact"),
        makeFooter(0, 287, idx + 1),
      ];
      p.objects.filter(o => o.type === "productCard").forEach(o => { o.w = 58; o.h = 90; });
      return p;
    },
  },

  // ------------------------------- BAKSIDE -------------------------------
  {
    id: "back-cover",
    label: "Bakside — kontakt CTA",
    category: "Bakside",
    build: (idx: number): Page => {
      const p = makeBlankPage("A4P", idx);
      p.objects = [
        rect(0, 0, 210, 297, "#ed1c24"),
        rect(0, 0, 105, 165, "rgba(0,0,0,0.08)"),
        txt(15, 40, 180, 8, "BESØK OSS", "h5", { color: "rgba(255,255,255,0.7)" }),
        rect(15, 50, 14, 0.8, "#fff"),
        txt(15, 58, 180, 70, "INDUSTRI-\nGATA 1\nBREKSTAD.", "h1", { color: "#fff" }),
        rect(15, 175, 60, 0.5, "rgba(255,255,255,0.4)"),
        txt(15, 182, 180, 8, "ÅPNINGSTIDER", "h5", { color: "rgba(255,255,255,0.7)" }),
        txt(15, 192, 180, 8, "Man – fre   07:30 – 16:00", "h3", { color: "#fff" }),
        txt(15, 215, 180, 8, "KONTAKT", "h5", { color: "rgba(255,255,255,0.7)" }),
        txt(15, 225, 180, 8, "72 51 51 20", "h2", { color: "#fff" }),
        txt(15, 245, 180, 8, "post@fosen-tools.no  ·  fosen-tools.no", "h4", { color: "#fff", weight: 400 }),
        rect(15, 270, 14, 0.5, "rgba(255,255,255,0.4)"),
        txt(15, 275, 180, 8, "Fosen Tools AS — del av 100-årig industrikonsern · 25 år i 2026", "h5", { color: "rgba(255,255,255,0.65)", weight: 400 }),
      ];
      return p;
    },
  },
];
