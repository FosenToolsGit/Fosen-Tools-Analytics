// Standalone-script som:
// 1. Henter Husqvarna-brosjyren fra Supabase
// 2. Re-scraper hvert produkt mot fosen-tools.no for å hente FT-artikkelnummer
// 3. Legger på FT-stripe + footer + stempel på alle sider
// 4. Bytter ut bakside med full-bleed FT-bakside
// 5. Lagrer tilbake til Supabase

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = "/Users/adrianhpettersen/Downloads/Fosen Tools Apper/Fosen Tools Analytics/.claude/worktrees/stupefied-khayyam-62d6fd/.env.local";
const envText = readFileSync(envPath, "utf8");
for (const line of envText.split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const BROCHURE_ID = "04e778e8-5a05-42fd-b6bd-87da8e039bb5";
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const FT_RED = "#ed1c24";
const FT_INK = "#0f1115";

const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const decodeEntities = (t) =>
  t.replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c, 10)))
   .replace(/&#x([0-9a-f]+);/gi, (_, c) => String.fromCharCode(parseInt(c, 16)))
   .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, " ")
   .replace(/&aring;/g, "å").replace(/&Aring;/g, "Å")
   .replace(/&aelig;/g, "æ").replace(/&AElig;/g, "Æ")
   .replace(/&oslash;/g, "ø").replace(/&Oslash;/g, "Ø")
   .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–");

function extractSku(html, sourceUrl) {
  const a = /<span[^>]*class=["'][^"']*prd-num-label[^"']*["'][^>]*>\s*([^<\s]+)\s*<\/span>/i.exec(html);
  if (a?.[1]) return decodeEntities(a[1]).trim();
  try {
    const segs = new URL(sourceUrl).pathname.split("/").filter(Boolean);
    for (const s of segs) if (/^\d{4,7}$/.test(s)) return s;
  } catch {}
  return null;
}

async function fetchSku(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" } });
    if (!r.ok) return null;
    const html = await r.text();
    return extractSku(html, url);
  } catch (e) {
    console.warn(`  ⚠ fetch failed: ${url} — ${e.message}`);
    return null;
  }
}

// --- Factory-funksjoner (port fra ft-decorations.ts) ---
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

function makeFosenStripe(y = 0, W = 210) {
  return [
    rect(0, y, W, 8, FT_INK),
    img(6, y + 1.5, 38, 5, "/brosjyre/Fosen-Tools_white.svg", { fit: "contain", label: "Fosen Tools" }),
    rect(W - 65, y + 3, 12, 0.8, FT_RED),
    txt(W - 50, y + 1.7, 48, 5, "25 ÅR · 2001 — 2026 · BREKSTAD", "h5", {
      align: "right", color: "#ffffff", weight: 700,
    }),
  ];
}

function makeFosenFooter(pageNo, totalPages, W = 210, yBase = 285) {
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

function makeFosenStamp(x, y, size = 40, topLine = "EKSKLUSIVT HOS", bottomLine = "FOSEN TOOLS") {
  return {
    id: uid("obj"), type: "badge",
    x, y, w: size, h: size, rot: -8, locked: false,
    props: {
      text: `${topLine}\n${bottomLine}`,
      style: "stamp",
      color: FT_RED,
      textColor: FT_RED,
      fontSize: Math.round(size / 4.5),
    },
  };
}

function makeFosenBackCover(index = 0, W = 210, H = 297) {
  return {
    id: uid("page"),
    paper: "A4P",
    w: W, h: H,
    bg: "#ffffff",
    objects: [
      rect(0, 0, W, H, FT_RED),
      rect(0, 0, W, 150, "rgba(0,0,0,0.18)"),
      img((W - 130) / 2, 35, 130, 18, "/brosjyre/Fosen-Tools_white.svg", { fit: "contain", label: "Fosen Tools" }),
      rect((W - 80) / 2, 70, 80, 0.8, "#ffffff"),
      txt(0, 78, W, 8, "25 ÅR · 2001 — 2026", "h5", { align: "center", color: "rgba(255,255,255,0.85)", weight: 700 }),
      txt(0, 90, W, 28, "NORGES STØRSTE\nPÅ PROFF-VERKTØY", "h1", { align: "center", color: "#ffffff" }),
      txt(0, 152, W, 8, "Del av 100-årig industrikonsern  ·  Sertifisert leverandør til Forsvaret", "h5", {
        align: "center", color: "rgba(255,255,255,0.7)", weight: 400,
      }),
      rect((W - 60) / 2, 178, 60, 0.6, "#ffffff"),
      txt(0, 188, W, 8, "TLF", "h5", { align: "center", color: "rgba(255,255,255,0.65)", weight: 600 }),
      txt(0, 196, W, 16, "72 51 51 20", "h1", { align: "center", color: "#ffffff" }),
      txt(0, 222, W, 6, "fosen-tools.no   ·   post@fosen-tools.no", "h4", { align: "center", color: "#ffffff", weight: 400 }),
      txt(0, 248, W, 6, "BESØK OSS", "h5", { align: "center", color: "rgba(255,255,255,0.65)", weight: 600 }),
      txt(0, 256, W, 8, "Industrigata 1  ·  7130 Brekstad", "h3", { align: "center", color: "#ffffff" }),
      txt(0, 268, W, 6, "Man – fre  07:30 – 16:00", "h5", { align: "center", color: "rgba(255,255,255,0.65)", weight: 400 }),
      txt(0, 285, W, 5, "♻ MILJØFYRTÅRN-SERTIFISERT  ·  100 % FORNYBAR ENERGI", "h5", {
        align: "center", color: "rgba(255,255,255,0.55)", weight: 400,
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
  console.log(`  Tittel: ${row.title}`);
  console.log(`  Sider: ${doc.pages.length}`);

  // 1. Samle unike URLer
  const urls = new Set();
  for (const page of doc.pages) {
    for (const o of page.objects) {
      if (o.props?.product?.source_url) urls.add(o.props.product.source_url);
      if (o.props?.productA?.source_url) urls.add(o.props.productA.source_url);
      if (o.props?.productB?.source_url) urls.add(o.props.productB.source_url);
      if (Array.isArray(o.props?.products)) {
        for (const p of o.props.products) if (p?.source_url) urls.add(p.source_url);
      }
    }
  }
  console.log(`\nRe-scraper SKU for ${urls.size} unike produkter...`);

  // 2. Fetch SKU for hver URL
  const skuMap = new Map();
  let i = 0;
  for (const url of urls) {
    i++;
    process.stdout.write(`  [${i}/${urls.size}] ${url.split("/").pop().slice(0, 50)}... `);
    const sku = await fetchSku(url);
    skuMap.set(url, sku);
    console.log(sku || "(ingen)");
  }

  // 3. Injiser sku i alle produkter
  let updated = 0;
  for (const page of doc.pages) {
    for (const o of page.objects) {
      if (o.props?.product?.source_url) {
        const s = skuMap.get(o.props.product.source_url);
        if (s) { o.props.product.sku = s; updated++; }
      }
      if (o.props?.productA?.source_url) {
        const s = skuMap.get(o.props.productA.source_url);
        if (s) { o.props.productA.sku = s; updated++; }
      }
      if (o.props?.productB?.source_url) {
        const s = skuMap.get(o.props.productB.source_url);
        if (s) { o.props.productB.sku = s; updated++; }
      }
      if (Array.isArray(o.props?.products)) {
        for (const p of o.props.products) {
          if (p?.source_url) {
            const s = skuMap.get(p.source_url);
            if (s) { p.sku = s; updated++; }
          }
        }
      }
    }
  }
  console.log(`\n✓ Oppdaterte ${updated} produkter med SKU`);

  // 4. Legg på FT-stripe + footer på alle sider og fjern eksisterende footer-objekter
  // - Side 1 (forside): legg på FT-stempel
  // - Side 2-N-1 (innholdssider): FT-stripe på topp + FT-footer
  // - Side N (bakside): bytt helt ut med makeFosenBackCover

  const totalPages = doc.pages.length;
  for (let p = 0; p < totalPages - 1; p++) {
    const page = doc.pages[p];
    // Fjern eksisterende footer/contact-objekter (de erstattes av FT-footer)
    page.objects = page.objects.filter(o => o.type !== "footer");

    if (p === 0) {
      // Forside: legg på stempel oppe til høyre
      page.objects.push(makeFosenStamp(160, 15, 38, "EKSKLUSIVT HOS", "FOSEN TOOLS"));
      // Footer-stripe over bakke-stripen
      page.objects.push(...makeFosenFooter(p + 1, totalPages));
    } else {
      // Innholdssider: FT-stripe på Y=0 (skyver eksisterende top-banner ned mentalt — vi legger den bare på toppen)
      // For å unngå overlapping med eksisterende headere, plasserer vi stripen øverst
      page.objects.unshift(...makeFosenStripe(0));
      page.objects.push(...makeFosenFooter(p + 1, totalPages));
    }
  }

  // 5. Bytt ut siste side (bakside)
  doc.pages[totalPages - 1] = makeFosenBackCover(totalPages - 1);

  console.log("\nLagrer oppdatert brosjyre...");
  const { error: updErr } = await supa
    .from("brochures")
    .update({ doc, updated_at: new Date().toISOString() })
    .eq("id", BROCHURE_ID);
  if (updErr) throw updErr;
  console.log("✓ Lagret!");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
