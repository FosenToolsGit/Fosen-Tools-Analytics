// Oppgraderer Husqvarna-brosjyren med ny FT-design fra Claude Design:
// - Ny FT-stripe (mørkere, rød venstre-stang, Brekstad · 25 ÅR-tekst)
// - Ny FT-stempel på forside (sigill med 25 ÅR ringtekst, ikke gammel stamp-style)
// - Ny FT-bakside (Sigill25Aar sentralt + sertifikat-bånd + dyp mørk bakgrunn)

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

const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

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
    src, label: opts.label || "Logo",
    mask: "none", fit: opts.fit || "contain",
    focusX: 0.5, focusY: 0.5,
    tint: opts.tint ?? null,
  },
});

const sigill = (x, y, size, variant = "ring", opts = {}) => ({
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
});

// ---- Nye dekorasjons-funksjoner (matcher ft-decorations.ts) ----

function newFtStripe(y = 0, W = 210) {
  return [
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
}

function newFtFooter(pageNo, totalPages, W = 210, yBase = 285) {
  return [
    rect(0, yBase, W, 0.6, FT_RED),
    txt(8, yBase + 2, W - 70, 5, "fosen-tools.no  ·  72 51 51 20  ·  Industrigata 1, 7130 Brekstad", "h5", {
      color: "#374151", weight: 500,
    }),
    txt(W - 55, yBase + 2, 48, 5, `${pageNo} / ${totalPages}`, "h5", {
      align: "right", color: FT_RED, weight: 700,
    }),
  ];
}

function newFtStamp(x, y, size = 40) {
  // Sigill25Aar med ring-variant
  return sigill(x, y, size, "ring", {
    rotate: -8,
    inner: "EKSKLUSIVT HOS",
    innerSub: "FOSEN TOOLS",
  });
}

function newFtBackCover(index = 0, W = 210, H = 297) {
  // 25år-logo: viewBox 201.56×113.39 → aspect ~1.78
  const logo25W = 110, logo25H = logo25W / 1.78;
  return {
    id: uid("page"),
    paper: "A4P",
    w: W, h: H,
    bg: "#ffffff",
    objects: [
      rect(0, 0, W, H, FT_INK),
      rect(0, 0, W, 4, FT_RED),

      img((W - 100) / 2, 22, 100, 14, "/brosjyre/Fosen-Tools_white.svg", { fit: "contain", label: "Fosen Tools" }),

      txt(0, 44, W, 4, "BREKSTAD · NORGE", "h5", {
        align: "center", color: "rgba(255,255,255,0.5)", weight: 700,
      }),

      // OFFISIELT 25-årslogo — gullfarget — signatur-element
      img((W - logo25W) / 2, 56, logo25W, logo25H, "/brosjyre/Jubileumslogo-25aar.svg", {
        fit: "contain", label: "25 år jubileum",
      }),

      txt(0, 132, W, 14, "PROFF-VERKTØY\nFOR FAGFOLK", "h1", {
        align: "center", color: "#ffffff",
      }),

      rect((W - 22) / 2, 162, 22, 2, FT_RED),

      txt(0, 170, W, 6, "Sertifisert leverandør til Forsvaret", "h5", {
        align: "center", color: "rgba(255,255,255,0.55)", weight: 400,
      }),

      txt(0, 184, W, 4, "DEL AV", "h5", { align: "center", color: "rgba(255,255,255,0.35)", weight: 700 }),

      // OFFISIELT 100-årslogo — hint til konsernet (4. generasjon, 100 år)
      img((W - 56) / 2, 190, 56, 14, "/brosjyre/Jubileumslogo-100aar.svg", {
        fit: "contain", label: "100 år i konsernet",
      }),

      txt(0, 220, W, 4, "RING OSS", "h5", { align: "center", color: "rgba(255,255,255,0.4)", weight: 700 }),
      txt(0, 226, W, 12, "72 51 51 20", "h1", { align: "center", color: "#ffffff" }),

      txt(0, 250, W, 5, "Industrigata 1  ·  7130 Brekstad  ·  Man — fre  07:00 — 15:00", "h5", {
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

// --- Hovedflyt ---
async function main() {
  console.log("Henter brosjyre...");
  const { data: row, error } = await supa
    .from("brochures")
    .select("doc, title")
    .eq("id", BROCHURE_ID)
    .single();
  if (error) throw error;
  const doc = row.doc;
  console.log(`  Tittel: ${row.title}  ·  ${doc.pages.length} sider`);

  const totalPages = doc.pages.length;

  // Fjern eksisterende FT-stripe, FT-footer og FT-stempel fra alle sider.
  // Vi gjenkjenner dem ved spesifikk content/src/tekst som matcher gamle dekorasjoner.
  const isOldStripeOrFooter = (o) => {
    if (o.type === "image" && o.props?.src === "/brosjyre/Fosen-Tools_white.svg") return true;
    if (o.type === "shape" && o.props?.fill === FT_INK && (o.h <= 10)) return true; // stripe-bg
    if (o.type === "shape" && o.props?.fill === FT_RED && (o.h <= 1.5)) return true; // footer red stripe
    if (o.type === "text") {
      const c = o.props?.content || "";
      if (c.includes("25 ÅR · 2001 — 2026 · BREKSTAD")) return true;
      if (c.includes("fosen-tools.no  ·  72 51 51 20  ·  Industrigata 1")) return true;
      if (c.match(/^\d+ \/ \d+$/)) return true; // sidetall
      if (c === "BREKSTAD · 25 ÅR") return true;
      if (c === "2001 — 2026") return true;
    }
    // Gammel FT-stempel (badge med "EKSKLUSIVT HOS\nFOSEN TOOLS")
    if (o.type === "badge" && o.props?.text?.includes("EKSKLUSIVT HOS")) return true;
    return false;
  };

  let cleaned = 0;
  for (let p = 0; p < totalPages - 1; p++) {
    const before = doc.pages[p].objects.length;
    doc.pages[p].objects = doc.pages[p].objects.filter(o => !isOldStripeOrFooter(o));
    cleaned += before - doc.pages[p].objects.length;
  }
  console.log(`  Fjernet ${cleaned} gamle dekorasjons-objekter`);

  // Legg på nye dekorasjoner
  for (let p = 0; p < totalPages - 1; p++) {
    const page = doc.pages[p];
    if (p === 0) {
      // Forside: legg på Sigill25Aar oppe-høyre (erstatter gammel FT-stempel)
      page.objects.push(newFtStamp(160, 15, 38));
      page.objects.push(...newFtFooter(p + 1, totalPages));
    } else {
      page.objects.unshift(...newFtStripe(0));
      page.objects.push(...newFtFooter(p + 1, totalPages));
    }
  }

  // Bytt ut bakside helt
  doc.pages[totalPages - 1] = newFtBackCover(totalPages - 1);

  console.log("Lagrer oppdatert brosjyre...");
  const { error: updErr } = await supa
    .from("brochures")
    .update({ doc, updated_at: new Date().toISOString() })
    .eq("id", BROCHURE_ID);
  if (updErr) throw updErr;
  console.log("✓ Husqvarna-brosjyren oppdatert med ny FT-design");
}

main().catch(e => { console.error(e); process.exit(1); });
