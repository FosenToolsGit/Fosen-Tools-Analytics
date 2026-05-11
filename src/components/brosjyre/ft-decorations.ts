// Fosen Tools-branding-elementer som kan limes inn på alle brosjyrer.
// Bygget av eksisterende object-typer så de er klikk-redigerbare i editoren.
//
// Alle funksjoner returnerer en array av PageObject — slå sammen med
// eksisterende side-objekter eller bruk i en ny side fra grunnen.

import type { PageObject, Page, PaperId, SigillVariant } from "./types";
import { uid, makeBlankPage } from "./store";

const FT_RED = "#ed1c24";
const FT_INK = "#0f1115";

/** Lager et FT 25-årssigill-objekt (rendres som Sigill25Aar SVG-komponent). */
export function makeFosenSigill(
  x: number,
  y: number,
  size = 40,
  variant: SigillVariant = "ring",
  opts: { rotate?: number; inner?: string; innerSub?: string; label?: string } = {}
): PageObject {
  return {
    id: uid("obj"),
    type: "sigill",
    x, y, w: size, h: size, rot: 0, locked: false,
    props: {
      variant,
      rotate: opts.rotate ?? -12,
      color: null,
      label: opts.label ?? "25 ÅR · 2001 — 2026 · FOSEN TOOLS · 25 ÅR · 2001 — 2026 · FOSEN TOOLS ·",
      inner: opts.inner ?? "25",
      innerSub: opts.innerSub ?? "ÅR I BRANSJEN",
    },
  };
}

const rect = (
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  opts: { radius?: number } = {}
): PageObject => ({
  id: uid("obj"),
  type: "shape",
  x, y, w, h, rot: 0, locked: false,
  props: { shape: "rect", fill, stroke: "none", strokeW: 0, radius: opts.radius || 0 },
});

const txt = (
  x: number,
  y: number,
  w: number,
  h: number,
  content: string,
  preset: "h1" | "h2" | "h3" | "h4" | "h5" | "body",
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
    weight: opts.weight ?? (preset.startsWith("h") ? 900 : 400),
    italic: false,
    isHeading: preset.startsWith("h"),
  },
});

const img = (
  x: number,
  y: number,
  w: number,
  h: number,
  src: string,
  opts: { tint?: "white" | "dark" | null; fit?: "cover" | "contain"; label?: string } = {}
): PageObject => ({
  id: uid("obj"),
  type: "image",
  x, y, w, h, rot: 0, locked: false,
  props: {
    src,
    label: opts.label || "Logo",
    mask: "none",
    fit: opts.fit || "contain",
    focusX: 0.5,
    focusY: 0.5,
    tint: opts.tint ?? null,
  },
});

/**
 * FT-stripe (10 mm høy, full-width) til toppen av innholdssider.
 * Mørk bakgrunn + tynn rød venstre-stang + "FOSEN TOOLS · BREKSTAD" venstre
 * + "25 ÅR · 2001 — 2026" høyre (matcher fosen-tools.no header-stilen).
 *
 * Bruk: legg på Y=0 over banner-blokken, eller Y=20 om siden har egen header.
 */
export function makeFosenStripe(y = 0, pageWidth = 210): PageObject[] {
  return [
    rect(0, y, pageWidth, 10, FT_INK),
    // Rød venstre-stang (FT-signaturmønster)
    rect(0, y, 1.5, 10, FT_RED),
    // Hvit logo til venstre (etter rød-stangen)
    img(6, y + 2, 38, 6, "/brosjyre/Fosen-Tools_white.svg", { fit: "contain", label: "Fosen Tools" }),
    // Bydeel-tekst sentrert
    txt(60, y + 3, 60, 4, "BREKSTAD · 25 ÅR", "h5", {
      align: "left",
      color: "rgba(255,255,255,0.85)",
      weight: 800,
    }),
    // "2001 — 2026" til høyre
    txt(pageWidth - 60, y + 3.2, 55, 4, "2001 — 2026", "h5", {
      align: "right",
      color: "rgba(255,255,255,0.55)",
      weight: 500,
    }),
  ];
}

/**
 * FT-footer for hver innholdsside. Kontakt + sidetall i rød accent.
 * Erstatter makeFooter for FT-brandede brosjyrer.
 */
export function makeFosenFooter(pageNo: number, totalPages: number, pageWidth = 210, yBase = 285): PageObject[] {
  return [
    // Tynn rød accent-stripe
    rect(0, yBase, pageWidth, 0.6, FT_RED),
    txt(8, yBase + 2, pageWidth - 70, 5, "fosen-tools.no  ·  72 51 51 20  ·  Industrigata 1, 7130 Brekstad", "h5", {
      color: "#374151",
      weight: 500,
    }),
    txt(pageWidth - 55, yBase + 2, 48, 5, `${pageNo} / ${totalPages}`, "h5", {
      align: "right",
      color: FT_RED,
      weight: 700,
    }),
  ];
}

/**
 * FT-stempel — Sigill25Aar (sirkel-segl rotert -8°) med "EKSKLUSIVT HOS FOSEN TOOLS"
 * eller rabatt-tekst. Brukes typisk i hjørne på forside eller hero-side.
 */
export function makeFosenStamp(
  x: number,
  y: number,
  size = 40,
  topLine = "EKSKLUSIVT HOS",
  bottomLine = "FOSEN TOOLS"
): PageObject {
  return makeFosenSigill(x, y, size, "ring", {
    rotate: -8,
    inner: topLine,
    innerSub: bottomLine,
    label: "25 ÅR · 2001 — 2026 · FOSEN TOOLS · 25 ÅR · 2001 — 2026 · FOSEN TOOLS ·",
  });
}

/**
 * Full-bleed FT-bakside som kan brukes som siste side på alle kampanjer.
 * Stor 25-årsmerke, telefon, web, claim. Krever ingen produktdata.
 *
 * Returnerer en komplett Page klar til å legges inn i doc.pages.
 */
export function makeFosenBackCover(paper: PaperId = "A4P", index = 0): Page {
  const p = makeBlankPage(paper, index);
  const W = p.w; // 210
  const H = p.h; // 297

  // 25år-logo: viewBox 201.56×113.39 → aspect ~1.78
  const logo25W = 110, logo25H = logo25W / 1.78; // ~62mm

  p.objects = [
    // Full-bleed dyp-mørk bakgrunn
    rect(0, 0, W, H, FT_INK),
    // Rød horisontal accent på topp (signaturmønster)
    rect(0, 0, W, 4, FT_RED),

    // Hvit FT-logo sentralt øverst
    img((W - 100) / 2, 22, 100, 14, "/brosjyre/Fosen-Tools_white.svg", { fit: "contain", label: "Fosen Tools" }),

    // Eyebrow "BREKSTAD · NORGE"
    txt(0, 44, W, 4, "BREKSTAD · NORGE", "h5", {
      align: "center", color: "rgba(255,255,255,0.5)", weight: 700,
    }),

    // OFFISIELT 25-årslogo — gullfarget, sentralt — signatur-element
    img((W - logo25W) / 2, 56, logo25W, logo25H, "/brosjyre/Jubileumslogo-25aar.svg", {
      fit: "contain", label: "25 år jubileum",
    }),

    // Tittel
    txt(0, 132, W, 14, "PROFF-VERKTØY\nFOR FAGFOLK", "h1", {
      align: "center", color: "#ffffff",
    }),

    // Rød accent-divider (FT-signaturmønster, 22×2)
    rect((W - 22) / 2, 162, 22, 2, FT_RED),

    // Tagline
    txt(0, 170, W, 6, "Sertifisert leverandør til Forsvaret", "h5", {
      align: "center", color: "rgba(255,255,255,0.55)", weight: 400,
    }),

    // "DEL AV"-eyebrow over 100-årslogo
    txt(0, 184, W, 4, "DEL AV", "h5", { align: "center", color: "rgba(255,255,255,0.35)", weight: 700 }),

    // OFFISIELT 100-årslogo — gullfarget, mindre, hint til konsernet
    // viewBox 330.63×85.14 → aspect ~3.88. Skalert til 56mm bredt → ~14mm høyt.
    img((W - 56) / 2, 190, 56, 14, "/brosjyre/Jubileumslogo-100aar.svg", {
      fit: "contain", label: "100 år i konsernet",
    }),

    // CTA — telefon med stor vekt
    txt(0, 220, W, 4, "RING OSS", "h5", { align: "center", color: "rgba(255,255,255,0.4)", weight: 700 }),
    txt(0, 226, W, 12, "72 51 51 20", "h1", { align: "center", color: "#ffffff" }),

    // Adresse-rad
    txt(0, 250, W, 5, "Industrigata 1  ·  7130 Brekstad  ·  Man — fre  07:00 — 15:00", "h5", {
      align: "center", color: "rgba(255,255,255,0.5)", weight: 500,
    }),
    txt(0, 258, W, 5, "fosen-tools.no  ·  post@fosen-tools.no", "h5", {
      align: "center", color: "rgba(255,255,255,0.7)", weight: 500,
    }),

    // Tynn divider over sertifikat-bånd
    rect(20, 273, W - 40, 0.3, "rgba(255,255,255,0.15)"),

    // Sertifikat-bånd som tekst-rad (25 ÅR / 4. GEN er i logoene over — utelat dem her)
    txt(0, 278, W, 4, "MILJØFYRTÅRN  ·  GASELLE 2023  ·  GRØNT PUNKT  ·  100 % FORNYBAR ENERGI", "h5", {
      align: "center", color: "rgba(255,255,255,0.55)", weight: 700,
    }),
  ];
  return p;
}

/**
 * Liten FT-merke-blokk for innholdssider (28 mm bred). Plasseres typisk
 * nede i venstre eller høyre hjørne — kombineres med produkt-grid.
 */
export function makeFosenSignet(x: number, y: number): PageObject[] {
  return [
    rect(x, y, 4, 12, FT_RED),
    txt(x + 7, y, 50, 5, "FOSEN TOOLS", "h5", { color: FT_INK, weight: 900 }),
    txt(x + 7, y + 5.5, 50, 4, "25 år · siden 2001", "h5", { color: "#6b7280", weight: 400 }),
  ];
}
