// Bygger Vårkampanje Trykkluft-brosjyren fra grunnen.
//
// Følger samme mønster som rebuild-husqvarna-fresh.mjs:
//   1. Skraper 73 produkt-URL-er (alle live på fosen-tools.no, minus
//      2 bestillingsvarer)
//   2. Klassifiserer per produsent (KC Tools, Sumake, FT) og kategori
//      (muttertrekkere, sliper, lakksprøyter, blåsepistoler osv.)
//   3. Bygger ~12-14 A4P-sider:
//      - Forside med begge produsent-logoer
//      - KC Tools-seksjon med kategori-sider
//      - Sumake-seksjon med kategori-sider
//      - FT spesial-side (Jumbo Hammer + FT Custom)
//      - Bakside
//   4. Inserter som ny rad i brochures-tabellen

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Last env-vars fra .env.local
const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const FT_RED = "#ed1c24";
const FT_INK = "#0f1115";
const W = 210, H = 297; // A4P i mm
const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

// Hvis satt: oppdater eksisterende brosjyre. Hvis tom: insert ny.
// Brosjyre-ID-en ble opprettet ved første kjøring og er låst.
const EXISTING_BROCHURE_ID = "810a8e87-9330-42a0-9055-c1485a16b025";

// Offisielle produsent-logoer fra Logoer-mappen → kopiert til public/
const KC_TOOLS_LOGO = "/brosjyre/manufacturer-logos/kc-tools.svg";
const SUMAKE_LOGO = "/brosjyre/manufacturer-logos/sumake.svg";
const FT_CUSTOM_LOGO = "/brosjyre/manufacturer-logos/fosen-tools-custom.svg";

// ──────────────────────────────────────────────────────────────────────
// PRODUKT-URL-ER (alle 73 live i nettbutikken — bestillingsvarer fjernet)
// ──────────────────────────────────────────────────────────────────────

const PRODUCT_URLS = [
  // KC Tools (47 stk)
  "https://fosen-tools.no/kc-tools/f2186/slipemaskin-mini-sm200-kc-suntech-75mm-15-000-rpm-kc-tools",
  "https://fosen-tools.no/kc-tools/f2187/luftskralle-1-2-dr-dot--sm-31-kc-suntech-kc-tools",
  "https://fosen-tools.no/kc-tools/f2190/muttertrekker-1-2-dr-dot--sg-0716-7-dot-000-rpm-380-nm-kc-tools",
  // F2349 (Stempel tall- og bokstav) fjernet etter REV1 — passer ikke
  // trykkluft-kampanjen.
  // "https://fosen-tools.no/kc-tools/f2349/stempel-tall-og-bokstav-kc-tools-11mm-firkant-a-z-og-1-9-36stk-kc-tools",
  "https://fosen-tools.no/kc-tools/f2379/slipemaskin-mini-sm210-sett-kc-suntech-35-deler-i-koffert-kc-tools",
  "https://fosen-tools.no/kc-tools/f2383/luftskralle-1-4-dr-dot--sg0719-24nm-240-rpm-18-ft-dot-lbs-kc-tools",
  "https://fosen-tools.no/kc-tools/f2384/platesag-luft-sg0822-kc-suntech-9000-rpm-90psi-kc-tools",
  "https://fosen-tools.no/kc-tools/f2387/poptang-luft-sg0810-kc-suntech-opp-til-3-16-kc-tools",
  "https://fosen-tools.no/kc-tools/f2388/bormaskin-3-8-sm7955-kc-suntech-reversibel-3-8-selvsp-dot-chuck-kc-tools",
  "https://fosen-tools.no/kc-tools/f2442/luftskralle-3-8-dr-dot--sg0720-kc-suntech-240-rpm-24-ft-dot-lbs-kc-tools",
  "https://fosen-tools.no/kc-tools/f2562/slipemaskin-150mm-to-h%c3%a5nds-kc-tools-borel%c3%a5s-feste-sm-66-6132a-kc-tools",
  "https://fosen-tools.no/kc-tools/f2564/b%c3%b8rste-sliper-multi-sm-6902-multisliper-kc-tools",
  "https://fosen-tools.no/kc-tools/f2565/b%c3%b8rste-sliper-multi-sett-sm-6902k7-koffert-3-adaptere--plus--tilbeh%c3%b8r-kc-tools",
  "https://fosen-tools.no/kc-tools/f2606/muttertrekker-1-2-1-2kg-kompositt-9000-rpm-325-nm-kc-tools",
  "https://fosen-tools.no/kc-tools/f2607/muttertrekker-3-8-1-2kg-kompositt-9000-rpm-325-nm-kc-tools",
  "https://fosen-tools.no/kc-tools/f2613/luftskralle-1-4-dr-dot--comfort-7-27nm-200-rpm-0-5kg-sm-32-3012-kc-tools",
  "https://fosen-tools.no/kc-tools/f2614/luftskralle-3-8-dr-dot--comfort-7-27nm-200-rpm-0-5kg-sm-33-3014-kc-tools",
  "https://fosen-tools.no/kc-tools/f2616/b%c3%a5ndslipemaskin-10-x-330mm-comfort-18000-rpm-0-dot-9kg-comfort-grip-kc-tools",
  "https://fosen-tools.no/kc-tools/f2621/rondellkappemaskin-sett-reversibel-3-18000-rpm-koffert--plus--tilb-dot--kc-tools",
  "https://fosen-tools.no/kc-tools/f2622/vinkelsliper-125mm-ergo-5-10-dot-000-rpm-kc-tools",
  "https://fosen-tools.no/kc-tools/f2624/bormaskin-3-8-sm-75-7251-04-ergo-reversibel-3-8-selvsp-dot-chuck-kc-tools",
  "https://fosen-tools.no/kc-tools/f2680/bl%c3%a5sepistol-luft-325-mm-sg1072l-bl%c3%a5ser%c3%b8r-lengde-325mm-kc-tools",
  "https://fosen-tools.no/kc-tools/f2681/bl%c3%a5sepistol-luft-500-mm-sg1072xl-bl%c3%a5ser%c3%b8r-lengde-500mm-kc-tools",
  "https://fosen-tools.no/kc-tools/f2924/hj%c3%b8rnekutter-267mm-16-000-rpm-kc-tools",
  "https://fosen-tools.no/kc-tools/f2925/hj%c3%b8rnekutter-304mm-16-000-rpm-kc-tools",
  "https://fosen-tools.no/kc-tools/f2926/hj%c3%b8rnekutter-400mm-lang-16-000-rpm-kc-tools",
  "https://fosen-tools.no/kc-tools/f2927/slipemaskin-mini-vinkel-2-koffert-20-000-rpm-koffert--plus--tilbeh%c3%b8r-kc-tools",
  "https://fosen-tools.no/kc-tools/f2929/bormaskin-3-8-revers-sm-757253p-1800-rpm-kompositt-kc-tools",
  "https://fosen-tools.no/kc-tools/f2930/momentskrutrekker-sm-as002a-600-rpm-0-5-5-1nm-auto-kc-tools",
  "https://fosen-tools.no/kc-tools/f2931/momentskrutrekker-sm-as004-600-rpm-0-5-5-1nm-auto-kc-tools",
  "https://fosen-tools.no/kc-tools/f2932/momentskrutrekker-sm-as005-rett-600rpm-0-5-5-1nm-auto-rett-type-kc-tools",
  "https://fosen-tools.no/kc-tools/f3008/muttertrekker-1-10-2kg-heavy-duty-4000-rpm-1627-nm-kc-tools",
  "https://fosen-tools.no/kc-tools/f3009/muttertrekker-1-10-7kg-heavy-duty-4000-rpm-1627-nm-lang-type-kc-tools",
  "https://fosen-tools.no/kc-tools/f3010/polermaskin-mini-vinkel-3-koffert-m-polerings-og-p%c3%a5f%c3%b8ringsskiver-kc-tools",
  "https://fosen-tools.no/kc-tools/f3815/luftskralle-1-4-mini-comfort-40nm-350rpm-133mm-440g-kc-tools",
  "https://fosen-tools.no/kc-tools/f4013/poleringsmaksin-vertikal-6-komp-1-1kg-eksenterrot-dot--kc-tools",
  "https://fosen-tools.no/kc-tools/f4015/n%c3%a5lebanker-rett-19-n%c3%a5l-410mm-4000rpm-2-6kg-kc-tools",
  "https://fosen-tools.no/kc-tools/f4016/bormaskin-1-4-revers-2600rpm-komp-kc-tools",
  "https://fosen-tools.no/kc-tools/f4018/vinkelsliper-125mm-m14-komp-0-7hk-12000rpm-kc-tools",
  "https://fosen-tools.no/kc-tools/f4019/muttertrekker-1-2-mom-dot-begren-1-9kg-813nm-90-130nm-tiltrekking-kc-tools",
  "https://fosen-tools.no/kc-tools/f4020/b%c3%a5ndslipemaskin-6-13x135mm-m-tilb-dot--m-koffert-kc-tools",
  "https://fosen-tools.no/kc-tools/f4022/punktsveisdrill-m-mothold-800rpm-leveres-u-bor-kc-tools",
  "https://fosen-tools.no/kc-tools/f4033/muttertrekker-1-dr-3-4kg-komp-1898nm-kc-tools",
  "https://fosen-tools.no/kc-tools/f4034/bormaskin-3-8-revers-1800rpm-komp-kc-tools",
  // F4910 (Stift hardmetall graverpenn) fjernet etter REV1 — passer ikke
  // trykkluft-kampanjen.
  // "https://fosen-tools.no/kc-tools/f4910/stift-hardmetall-graverpenn-0573-passer-sg-0573-kc-tools",
  "https://fosen-tools.no/kc-tools/f6262/muttertrekker-1-2-1-27kg-kort-122mm-10-dot-000rpm-1400-nm-twin-hammer-kc-tools",
  "https://fosen-tools.no/kc-tools/f6263/muttertrekker-1-2-1-16kg-vinkel-kort-88mm-8500rpm-312nm-jumbo-hammer-kc-tools",
  // Sumake (24 stk)
  "https://fosen-tools.no/sumake/f3822/lakkspr%c3%b8yte-hvlp-0-dot-8mm-vann-olje-sumake",
  "https://fosen-tools.no/sumake/f3823/lakkspr%c3%b8yte-hvlp-1-3mm-vann-olje-sumake",
  "https://fosen-tools.no/sumake/f3824/lakkspr%c3%b8yte-hvlp-1-6mm-vann-olje-sumake",
  "https://fosen-tools.no/sumake/f4064/poleringsmaksin-vertikal-5-komp-1-1kg-eksenterrot-dot--sumake",
  "https://fosen-tools.no/sumake/f4109/trykktank-maling-2l-sumake",
  "https://fosen-tools.no/sumake/f4110/sandbl%c3%a5ser-22-5l-tank-m-pistol-5-16-dyse-portabel-sumake",
  "https://fosen-tools.no/sumake/f4113/skrutrekker-kompositt-vinkel-ca40-sumake",
  "https://fosen-tools.no/sumake/f4114/skrutrekker-kompositt-vinkel-ca55-sumake",
  "https://fosen-tools.no/sumake/f4115/skrutrekker-kompositt-pistol-cbp47-sumake",
  "https://fosen-tools.no/sumake/f4122/bl%c3%a5sepistol-100-mm-bl%c3%a5-messinggjenger-sumake",
  "https://fosen-tools.no/sumake/f4123/bl%c3%a5sepistol-250-mm-bl%c3%a5-messinggjenger-sumake",
  "https://fosen-tools.no/sumake/f4124/bl%c3%a5sepistol-300-mm-bl%c3%a5-messinggjenger-sumake",
  "https://fosen-tools.no/sumake/f4125/bl%c3%a5sepistol-500-mm-bl%c3%a5-messinggjenger-sumake",
  "https://fosen-tools.no/sumake/f4128/bl%c3%a5sepistol-3-in-1-fyller-100-mm-messinggjenger-sumake",
  "https://fosen-tools.no/sumake/f4129/bl%c3%a5sepistol-regu-plastupp-100-mm-messinggjenger-sumake",
  "https://fosen-tools.no/sumake/f4130/bl%c3%a5sepistol-roter-uttrekk-tupp-messinggjenger-sumake",
  "https://fosen-tools.no/sumake/f4131/bl%c3%a5sepistol-m-safety-tupp-100-mm-messinggjenger-sumake",
  "https://fosen-tools.no/sumake/f4136/spr%c3%b8ytepistolsett-dbl-action-0-2mm-airbrush-5cc-10cc-kopp-adaptere-sumake",
  "https://fosen-tools.no/sumake/f4162/spr%c3%b8ytepistol-dbl-dot-action-5cm3-airbrush-0-3mm-m-fallkopp-sumake",
  "https://fosen-tools.no/sumake/f4163/spr%c3%b8ytepistol-dbl-dot-action-1-5cm3-airbrush-0-3mm-m-fallkopp-sumake",
  "https://fosen-tools.no/sumake/f4164/spr%c3%b8ytepistol-dbl-dot-action-3-kopper-airbrush-0-3mm-sumake",
  "https://fosen-tools.no/sumake/f4165/spr%c3%b8ytepistol-singl-dot-action-0-35mm-mini-airbrush-m-fallkopp-sumake",
  "https://fosen-tools.no/sumake/f4166/kompressor-mini-1-10hk-membran-1-8-uttak-maks-30psi-100db-sumake",
  "https://fosen-tools.no/sumake/f4167/kompressor-mini-1-6hk-silent-memb-dot--1-8-uttak-maks-60psi-65db-sumake",
  // FT (2 stk — Jumbo Hammer + Custom)
  "https://fosen-tools.no/fosen-tools/f6261/muttertrekker-1-2-1-08kg-kort-93mm-9-dot-000rpm-1172-nm-jumbo-hammer",
  "https://fosen-tools.no/fosen-tools-custom/f6860/muttertrekker-1-2-1400nm-i-koffert-17-19-21-22mm-lang-pipe-150mm-ftc",
];

// ──────────────────────────────────────────────────────────────────────
// Scrape
// ──────────────────────────────────────────────────────────────────────

const UA = "Googlebot/2.1 (+http://www.google.com/bot.html)";

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&aelig;/g, "æ").replace(/&oslash;/g, "ø")
    .replace(/&aring;/g, "å").replace(/&AElig;/g, "Æ").replace(/&Oslash;/g, "Ø")
    .replace(/&Aring;/g, "Å").replace(/&nbsp;/g, " ");
}

async function scrapeProduct(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const html = await res.text();

    // JSON-LD Product / ProductGroup
    const ldMatches = [...html.matchAll(
      /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
    )];
    let product = null;
    for (const m of ldMatches) {
      try {
        const j = JSON.parse(m[1]);
        const items = Array.isArray(j) ? j : [j];
        for (const it of items) {
          const t = it["@type"];
          if (t === "Product" || t === "ProductGroup") { product = it; break; }
        }
        if (product) break;
      } catch {}
    }
    if (!product) return null;

    // Pris (kan ligge på .offers eller .hasVariant[].offers)
    let offer = null;
    if (product.offers) {
      offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
    } else if (product.hasVariant?.[0]?.offers) {
      const v = product.hasVariant[0].offers;
      offer = Array.isArray(v) ? v[0] : v;
    }
    const priceNow = offer ? parseFloat(offer.price ?? offer.lowPrice ?? 0) : 0;

    // Før-pris fra data-oldprice attribute
    const oldM = html.match(/data-oldprice="([^"]+)"/);
    let priceBefore = 0;
    if (oldM) {
      const v = oldM[1].replace(",", ".").replace(/\s/g, "");
      priceBefore = parseFloat(v) || 0;
    }
    const discountPct =
      priceBefore > priceNow && priceBefore > 0
        ? Math.round(((priceBefore - priceNow) / priceBefore) * 100)
        : 0;

    // Bilde
    const rawImg = Array.isArray(product.image) ? product.image[0] : product.image;
    const imageUrl = rawImg || null;

    // Produsent
    let manufacturer = "";
    if (product.brand) {
      manufacturer = typeof product.brand === "string"
        ? product.brand
        : (product.brand.name || "");
    }

    // Produsent-logo (`.ProducerLogoImage`)
    const logoM = html.match(/<img[^>]+class="ProducerLogoImage"[^>]+src="([^"]+)"/);
    const manufacturer_logo_url = logoM ? logoM[1] : null;

    // SKU (FT artikkelnr fra `.prd-num-label`)
    const skuM = html.match(/<span class="prd-num-label">([^<]+)<\/span>/);
    const sku = skuM ? skuM[1].trim() : null;

    // Bullets (fra #description)
    const bullets = [];
    const descRe = /<div[^>]*id=["']description["'][^>]*>([\s\S]*?)<\/div>/;
    const descM = html.match(descRe);
    if (descM) {
      const text = decodeEntities(descM[1].replace(/<[^>]+>/g, " "))
        .replace(/\s+/g, " ").trim();
      const sentences = text
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 10 && s.length < 90);
      const seen = new Set();
      for (const s of sentences) {
        const k = s.toLowerCase();
        if (!seen.has(k)) { seen.add(k); bullets.push(s); }
        if (bullets.length >= 4) break;
      }
    }

    return {
      source_url: url,
      name: decodeEntities(product.name || ""),
      manufacturer: decodeEntities(manufacturer),
      manufacturer_logo_url,
      image_url: imageUrl,
      image_placeholder: "",
      price_before: priceBefore,
      price_now: priceNow,
      discount_pct: discountPct,
      in_stock: true,
      category: "",
      bullets,
      sku,
    };
  } catch (e) {
    console.error(`  scrape feil ${url}: ${e.message}`);
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Bygge-helpers (porter fra rebuild-husqvarna-fresh.mjs)
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
    text, style: opts.style || "star",
    color: opts.color || FT_RED, textColor: "#ffffff",
    fontSize: opts.fontSize ?? 12,
  },
});

const productCard = (product, x, y, w, h, variant = "standard", opts = {}) => ({
  id: uid("obj"), type: "productCard",
  x, y, w, h, rot: 0, locked: false,
  props: {
    variant, product,
    showBurst: opts.showBurst ?? true,
    burstStyle: opts.burstStyle ?? "star",
    burstText: opts.burstText ?? null,
    showQR: false, showStock: opts.showStock ?? true,
    showWarranty: false, vatMode: "ex",
    bulletCount: variant === "hero" ? 4 : variant === "compact" ? 0 : 3,
    bgColor: "#ffffff", accentColor: null,
  },
});

// FT-stripe (12mm) — gjenbrukbar header med synlig FT-logo
const fosenStripe = (y = 0) => [
  rect(0, y, W, 12, FT_INK),
  rect(0, y, 1.5, 12, FT_RED),
  img(6, y + 2, 70, 8, "/brosjyre/Fosen-Tools_white.svg",
      { fit: "contain", label: "Fosen Tools" }),
  txt(82, y + 4, 50, 4, "25 ÅR", "h5",
      { align: "left", color: "rgba(255,255,255,0.85)", weight: 800 }),
  txt(W - 60, y + 4, 55, 4, "2001 — 2026", "h5",
      { align: "right", color: "rgba(255,255,255,0.55)", weight: 500 }),
];

const fosenFooter = (pageNo, totalPages, yBase = 285) => [
  rect(0, yBase, W, 0.6, FT_RED),
  txt(8, yBase + 2, W - 70, 5,
      "fosen-tools.no  ·  72 51 51 20  ·  Industrigata 1, 7130 Brekstad", "h5",
      { color: "#374151", weight: 500 }),
  txt(W - 55, yBase + 2, 48, 5, `${pageNo} / ${totalPages}`, "h5",
      { align: "right", color: FT_RED, weight: 700 }),
];

const titleBand = (eyebrow, title, subtitle = null) => {
  const objs = [
    rect(13, 18, 4, 14, FT_RED),
    txt(20, 16, W - 40, 5, eyebrow, "h5", { color: "#6b7280", weight: 700 }),
    txt(20, 22, W - 40, 12, title, "h2", { color: "#111", weight: 900 }),
  ];
  if (subtitle) {
    objs.push(txt(20, 34, W - 40, 5, subtitle, "h5",
                  { color: "#6b7280", weight: 500 }));
  }
  return objs;
};

// ──────────────────────────────────────────────────────────────────────
// Side-byggere
// ──────────────────────────────────────────────────────────────────────

function buildCoverDarkPremium() {
  // REV2: forenklet forside uten produsent-logoer (KC Tools + Sumake
  // får hver sin dedikerte skiller-side, ikke nødvendig med begge på
  // forsiden). Eyebrow forenklet til kun "25 ÅR I BRANSJEN".
  //
  //   1. Top  (y 0-110):   FT-identity (logo + eyebrow + 25-årslogo)
  //   2. Midt (y 150-240): Tittel + divider + subtitle (mer luft når
  //                        produsent-logo-blokken er borte)
  //   3. Bunn (y 252-297): Kontakt-CTA
  const logo25W = 100, logo25H = logo25W / 1.78;       // 100×56

  return {
    id: uid("page"), paper: "A4P", w: W, h: H, bg: "#ffffff",
    objects: [
      // Bakgrunn + rød topp-stripe
      rect(0, 0, W, H, FT_INK),
      rect(0, 0, W, 4, FT_RED),

      // ── BÅND 1: FT-identity (y 18-108) ────────────────────────────
      img((W - 88) / 2, 18, 88, 12, "/brosjyre/Fosen-Tools_white.svg",
          { fit: "contain", label: "Fosen Tools" }),
      txt(0, 38, W, 4, "25 ÅR I BRANSJEN", "h5",
          { align: "center", color: "rgba(255,255,255,0.5)", weight: 700 }),
      img((W - logo25W) / 2, 48, logo25W, logo25H,
          "/brosjyre/Jubileumslogo-25aar.svg",
          { fit: "contain", label: "25 år" }),

      // ── BÅND 2: Kampanje (y 150-240) — uten produsent-logoer ──────
      txt(10, 158, W - 20, 26, "VÅRKAMPANJE\nTRYKKLUFT", "h1",
          { color: "#ffffff", align: "center" }),
      rect((W - 30) / 2, 200, 30, 2, FT_RED),
      txt(15, 208, W - 30, 8,
          "40 % rabatt på alle trykkluft-maskiner fra KC Tools og Sumake", "h4",
          { color: "rgba(255,255,255,0.75)", align: "center", weight: 500 }),

      // ── BURST — øverste høyre hjørne ──────────────────────────────
      badge(W - 56, 14, 46, 46, "−40%",
            { style: "star", rot: -10, fontSize: 16 }),

      // ── BÅND 3: Kontakt-CTA (y 252-295) ───────────────────────────
      txt(0, 252, W, 4, "RING OSS", "h5",
          { align: "center", color: "rgba(255,255,255,0.5)", weight: 700 }),
      txt(15, 258, W - 30, 14, "72 51 51 20", "h1",
          { align: "center", color: "#ffffff" }),
      rect((W - 40) / 2, 280, 40, 0.4, "rgba(255,255,255,0.2)"),
      txt(15, 285, W - 30, 4,
          "fosen-tools.no  ·  Industrigata 1, 7130 Brekstad", "h5",
          { align: "center", color: "rgba(255,255,255,0.7)", weight: 500 }),
      txt(15, 291, W - 30, 4, "Gyldig ut mai 2026", "h5",
          { align: "center", color: "rgba(255,255,255,0.4)", weight: 500 }),
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
      img((W - 100) / 2, 22, 100, 14, "/brosjyre/Fosen-Tools_white.svg",
          { fit: "contain", label: "Fosen Tools" }),
      txt(0, 44, W, 4, "BREKSTAD · NORGE", "h5",
          { align: "center", color: "rgba(255,255,255,0.5)", weight: 700 }),
      img((W - logo25W) / 2, 56, logo25W, logo25H,
          "/brosjyre/Jubileumslogo-25aar.svg",
          { fit: "contain", label: "25 år" }),
      txt(0, 132, W, 14, "INDUSTRI VERKTØY\nFOR FAGFOLK", "h1",
          { align: "center", color: "#ffffff" }),
      rect((W - 22) / 2, 162, 22, 2, FT_RED),
      txt(0, 170, W, 6, "Sertifisert leverandør til Forsvaret", "h5",
          { align: "center", color: "rgba(255,255,255,0.55)", weight: 400 }),
      txt(0, 184, W, 4, "DEL AV", "h5",
          { align: "center", color: "rgba(255,255,255,0.35)", weight: 700 }),
      img((W - 56) / 2, 190, 56, 14, "/brosjyre/Jubileumslogo-100aar.svg",
          { fit: "contain", label: "100 år" }),
      txt(0, 220, W, 4, "RING OSS", "h5",
          { align: "center", color: "rgba(255,255,255,0.4)", weight: 700 }),
      txt(0, 226, W, 12, "72 51 51 20", "h1",
          { align: "center", color: "#ffffff" }),
      txt(0, 250, W, 5,
          "Industrigata 1  ·  7130 Brekstad  ·  Man — fre  07:00 — 15:00", "h5",
          { align: "center", color: "rgba(255,255,255,0.5)", weight: 500 }),
      txt(0, 258, W, 5, "fosen-tools.no  ·  post@fosen-tools.no", "h5",
          { align: "center", color: "rgba(255,255,255,0.7)", weight: 500 }),
      rect(20, 273, W - 40, 0.3, "rgba(255,255,255,0.15)"),
      txt(0, 278, W, 4,
          "MILJØFYRTÅRN  ·  GASELLE 2023  ·  GRØNT PUNKT  ·  100 % FORNYBAR ENERGI", "h5",
          { align: "center", color: "rgba(255,255,255,0.55)", weight: 700 }),
    ],
  };
}

// Brand-divider — full-page mørk side med produsent-logo og kategori-oversikt
function buildBrandDivider(brandLogoUrl, brandName, tagline, categories, pageNo, totalPages) {
  // Tre tydelige sentrerte blokker med god luft:
  //   y 20-92   : produsent-logo (130×52, høyere enn før)
  //   y 100-160 : brand-navn + tagline + accent-divider
  //   y 200+    : kategori-liste (mer luft per rad)
  //   y H-32    : bunn-CTA
  const objs = [
    rect(0, 0, W, H, FT_INK),
    ...fosenStripe(0),
    // Produsent-logo — sentrert med god luft
    img((W - 130) / 2, 30, 130, 60, brandLogoUrl,
        { fit: "contain", label: brandName }),
    // Rød accent-strek
    rect((W - 24) / 2, 110, 24, 2, FT_RED),
    // Brand-navn (større skrift)
    txt(15, 120, W - 30, 10, brandName.toUpperCase(), "h2",
        { align: "center", color: "#ffffff", weight: 900 }),
    // Tagline (mer luft etter, ikke trykket opp mot brand-navn)
    txt(20, 142, W - 40, 12, tagline, "h4",
        { align: "center", color: "rgba(255,255,255,0.7)", weight: 500 }),
    // Kategori-overskrift
    txt(0, 178, W, 4, "I DENNE KAMPANJEN", "h5",
        { align: "center", color: "rgba(255,255,255,0.4)", weight: 700 }),
  ];
  // Kategori-liste — filtrer bort tomme. Bruker stram rad-høyde og
  // dimensjonerer slik at det aldri kolliderer med bunn-CTA-en (y H-22).
  const filteredCats = categories.filter(c => c.count > 0);
  const startY = 192;
  const rowH = 9;
  // Prikk og tekst er sentrert vertikalt mot samme baseline. Tekst-
  // høyde 5mm med h4-preset ≈ visuell baseline rundt y+3.5. Prikk 4mm
  // høy med y-offset 0.5 = span y+0.5→y+4.5, sentrum y+2.5. Tekst-
  // sentrum og prikk-sentrum stemmer dermed pent overens.
  for (let i = 0; i < filteredCats.length; i++) {
    const y = startY + i * rowH;
    objs.push(rect(54, y + 1.5, 3, 4, FT_RED));
    objs.push(txt(62, y, 80, 5, filteredCats[i].name, "h4",
                  { color: "#ffffff", weight: 700 }));
    objs.push(txt(140, y, 32, 5, `${filteredCats[i].count} stk`, "h4",
                  { align: "right", color: "rgba(255,255,255,0.55)", weight: 500 }));
  }
  // Bunn-CTA — stram og lavt på siden så den ikke kolliderer med
  // kategori-listen selv ved 8 kategorier (8*9 = 72mm fra y=192 → y=264).
  objs.push(rect((W - 50) / 2, H - 18, 50, 0.4, "rgba(255,255,255,0.2)"));
  objs.push(txt(0, H - 12, W, 5, "Se priser på neste side →", "h5",
                { align: "center", color: "rgba(255,255,255,0.6)", weight: 500 }));
  return { id: uid("page"), paper: "A4P", w: W, h: H, bg: "#ffffff", objects: objs };
}

// Grid 3×3 — 9 compact produkter
function buildGrid3x3(products, eyebrow, title, pageNo, totalPages, subtitle = null) {
  const objs = [...fosenStripe(0), ...titleBand(eyebrow, title, subtitle)];
  const startY = subtitle ? 44 : 44;
  const colW = 60, rowH = 74, gap = 4, mx = 13;
  for (let i = 0; i < Math.min(products.length, 9); i++) {
    const r = Math.floor(i / 3), c = i % 3;
    objs.push(productCard(products[i],
      mx + c * (colW + gap), startY + r * (rowH + gap),
      colW, rowH, "compact"));
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
    objs.push(productCard(products[i],
      mx + c * (colW + gap), startY + r * (rowH + gap),
      colW, rowH, "standard"));
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
    objs.push(productCard(products[i],
      mx + c * (colW + gap), startY + r * (rowH + gap),
      colW, rowH, "standard"));
  }
  objs.push(...fosenFooter(pageNo, totalPages));
  return { id: uid("page"), paper: "A4P", w: W, h: H, bg: "#ffffff", objects: objs };
}

// ──────────────────────────────────────────────────────────────────────
// Klassifisering — pr produsent + kategori
// ──────────────────────────────────────────────────────────────────────

function classify(products) {
  const groups = {
    kc_muttertrekker: [],
    kc_luftskralle: [],
    kc_sliper: [],
    kc_polering: [],
    kc_bormaskin: [],
    kc_blasepistol: [],
    kc_moment: [],
    kc_spesial: [],
    sumake_lakkspr: [],
    sumake_blasepistol: [],
    sumake_airbrush: [],
    sumake_kompressor: [],
    sumake_sandblaser: [],
    sumake_skrutrekker: [],
    sumake_polering: [],
    ft_spesial: [],
  };

  for (const p of products) {
    const n = (p.name || "").toUpperCase();
    const url = p.source_url || "";

    // FT
    if (url.includes("/fosen-tools/") || url.includes("/fosen-tools-custom/")) {
      groups.ft_spesial.push(p);
      continue;
    }

    // Sumake
    if (url.includes("/sumake/")) {
      if (n.includes("LAKKSPRØYTE")) groups.sumake_lakkspr.push(p);
      else if (n.includes("BLÅSEPISTOL")) groups.sumake_blasepistol.push(p);
      else if (n.includes("AIRBRUSH") || n.includes("SPRØYTEPISTOL")) groups.sumake_airbrush.push(p);
      else if (n.includes("KOMPRESSOR")) groups.sumake_kompressor.push(p);
      else if (n.includes("SANDBLÅSER") || n.includes("TRYKKTANK")) groups.sumake_sandblaser.push(p);
      else if (n.includes("SKRUTREKKER")) groups.sumake_skrutrekker.push(p);
      else if (n.includes("POLERING")) groups.sumake_polering.push(p);
      else groups.sumake_airbrush.push(p);
      continue;
    }

    // KC Tools (default)
    if (n.includes("MUTTERTREKKER")) groups.kc_muttertrekker.push(p);
    else if (n.includes("LUFTSKRALLE")) groups.kc_luftskralle.push(p);
    else if (n.includes("BORMASKIN")) groups.kc_bormaskin.push(p);
    else if (n.includes("BLÅSEPISTOL")) groups.kc_blasepistol.push(p);
    else if (n.includes("MOMENTSKRUTREKKER")) groups.kc_moment.push(p);
    else if (
      n.includes("POLERINGS") ||
      n.includes("POLERMASKIN") ||
      n.includes("BØRSTE SLIPER")
    ) groups.kc_polering.push(p);
    else if (
      n.includes("SLIPEMASKIN") ||
      n.includes("VINKELSLIPER") ||
      n.includes("BÅNDSLIPEMASKIN") ||
      n.includes("RONDELLKAPPEMASKIN")
    ) groups.kc_sliper.push(p);
    else groups.kc_spesial.push(p);
  }
  return groups;
}

// Sortér muttertrekkere etter moment (Nm)
function sortByMoment(products) {
  return products.slice().sort((a, b) => {
    const am = parseFloat((a.name?.match(/(\d+(?:,\d+)?)\s*NM/i) || [])[1]?.replace(",", ".") ?? "0");
    const bm = parseFloat((b.name?.match(/(\d+(?:,\d+)?)\s*NM/i) || [])[1]?.replace(",", ".") ?? "0");
    return am - bm;
  });
}

// Sortér blåsepistoler etter lengde-MM
function sortByLength(products) {
  return products.slice().sort((a, b) => {
    const am = parseInt((a.name?.match(/(\d+)\s*MM/i) || [])[1] ?? "0", 10);
    const bm = parseInt((b.name?.match(/(\d+)\s*MM/i) || [])[1] ?? "0", 10);
    return am - bm;
  });
}

// ──────────────────────────────────────────────────────────────────────
// Hovedflyt
// ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Skraper ${PRODUCT_URLS.length} produkter …`);
  const results = [];
  const concurrency = 8;
  for (let i = 0; i < PRODUCT_URLS.length; i += concurrency) {
    const batch = PRODUCT_URLS.slice(i, i + concurrency);
    const r = await Promise.all(batch.map(scrapeProduct));
    results.push(...r.filter(Boolean));
    process.stderr.write(`\r  ${Math.min(i + concurrency, PRODUCT_URLS.length)}/${PRODUCT_URLS.length}`);
  }
  process.stderr.write("\n");
  console.log(`  ${results.length}/${PRODUCT_URLS.length} produkter skrapet`);

  const groups = classify(results);

  // REV2-override: F4064 ligger under /sumake/-URL i Multicase, men
  // produktet er faktisk KC Tools-merket. Flytter manuelt til
  // KC Tools polering-seksjonen.
  const moveFromSumakeToKC = (sku) => {
    const idx = groups.sumake_polering.findIndex(p => (p.sku || "").toUpperCase() === sku);
    if (idx >= 0) {
      // Override også manufacturer_logo_url så kortet rendrer KC Tools-logo
      groups.sumake_polering[idx].manufacturer_logo_url = KC_TOOLS_LOGO;
      groups.kc_polering.push(groups.sumake_polering[idx]);
      groups.sumake_polering.splice(idx, 1);
    }
  };
  moveFromSumakeToKC("F4064");

  console.log("\nKlassifisering:");
  for (const [k, v] of Object.entries(groups)) {
    console.log(`  ${k.padEnd(28)} ${v.length}`);
  }

  // Sortér muttertrekkere fra svakest til kraftigst
  groups.kc_muttertrekker = sortByMoment(groups.kc_muttertrekker);
  groups.sumake_blasepistol = sortByLength(groups.sumake_blasepistol);

  // Bruk de offisielle SVG-logoene fra Logoer-mappen (kopiert til public/)
  // i stedet for det fosen-tools.no serverer via .ProducerLogoImage —
  // de er ofte små thumbnail-PNG-er. SVG-ene er skarpe på alle størrelser.
  const kcLogo = KC_TOOLS_LOGO;
  const sumakeLogo = SUMAKE_LOGO;
  const brandLogoUrls = [kcLogo, sumakeLogo];

  // Override hvert produkts manufacturer_logo_url så productCard rendrer
  // den offisielle SVG-en på kortet, ikke Multicase-thumbnailen.
  for (const p of results) {
    if (p.source_url.includes("/kc-tools/")) p.manufacturer_logo_url = KC_TOOLS_LOGO;
    else if (p.source_url.includes("/sumake/")) p.manufacturer_logo_url = SUMAKE_LOGO;
    else if (p.source_url.includes("/fosen-tools-custom/")) p.manufacturer_logo_url = FT_CUSTOM_LOGO;
    // F6261 ("Jumbo Hammer" under /fosen-tools/) beholder default-logoen sin
  }

  // ── Bygg sider ──────────────────────────────────────────────────────
  const pages = [];
  let pn = 1;
  const TP = 14; // placeholder, oppdateres etter alt er bygget
  const pp = () => pn++;

  // Side 1: Forside med begge logoer
  pages.push(buildCoverDarkPremium());
  pp();

  // Side 2: KC Tools-divider
  const kcSum =
    groups.kc_muttertrekker.length + groups.kc_luftskralle.length +
    groups.kc_sliper.length + groups.kc_polering.length +
    groups.kc_bormaskin.length + groups.kc_blasepistol.length +
    groups.kc_moment.length + groups.kc_spesial.length;
  pages.push(buildBrandDivider(
    kcLogo, "KC Tools",
    "Robust trykkluft for verksted og industri",
    [
      { name: "Muttertrekkere",        count: groups.kc_muttertrekker.length },
      { name: "Luftskraller",          count: groups.kc_luftskralle.length },
      { name: "Sliper · båndsliper",   count: groups.kc_sliper.length },
      { name: "Polering",              count: groups.kc_polering.length },
      { name: "Bormaskiner",           count: groups.kc_bormaskin.length },
      { name: "Blåsepistoler",         count: groups.kc_blasepistol.length },
      { name: "Momentskrutrekkere",    count: groups.kc_moment.length },
      { name: "Spesial",               count: groups.kc_spesial.length },
    ],
    pp(), TP,
  ));

  // Side 3-4: KC Tools muttertrekkere (9 → 3×3-grid, evt. spillover på s.4)
  if (groups.kc_muttertrekker.length > 0) {
    pages.push(buildGrid3x3(
      groups.kc_muttertrekker.slice(0, 9),
      "KC TOOLS · MUTTERTREKKERE",
      "FRA 325 TIL 1898 NM",
      pp(), TP,
      "Sortert fra svakest til kraftigst",
    ));
  }
  const kcMutOverflow = groups.kc_muttertrekker.slice(9);

  // Side: KC Tools luftskraller + spillover muttertrekkere
  if (groups.kc_luftskralle.length > 0 || kcMutOverflow.length > 0) {
    const combined = [...groups.kc_luftskralle, ...kcMutOverflow];
    pages.push(buildGrid3x3(
      combined.slice(0, 9),
      "KC TOOLS · LUFTSKRALLER",
      "PRESISJON FOR TRANGE PUNKTER",
      pp(), TP,
    ));
  }

  // Side: KC Tools bormaskiner
  if (groups.kc_bormaskin.length > 0) {
    pages.push(buildGrid3x3(
      groups.kc_bormaskin.slice(0, 9),
      "KC TOOLS · BORMASKINER",
      "FRA 1/4\" TIL 3/8\" REVERSIBEL",
      pp(), TP,
    ));
  }

  // Side: KC Tools sliper
  if (groups.kc_sliper.length > 0) {
    pages.push(buildGrid3x3(
      groups.kc_sliper.slice(0, 9),
      "KC TOOLS · SLIPER",
      "MINI · VINKEL · BÅND · KAPPE",
      pp(), TP,
    ));
  }
  const kcSliperOverflow = groups.kc_sliper.slice(9);

  // Side: KC Tools polering + blåsepistoler + moment + sliper-overflow
  const kcMisc = [
    ...groups.kc_polering,
    ...groups.kc_blasepistol,
    ...groups.kc_moment,
    ...kcSliperOverflow,
  ];
  if (kcMisc.length > 0) {
    pages.push(buildGrid3x3(
      kcMisc.slice(0, 9),
      "KC TOOLS · POLERING · BLÅSELUFT · MOMENT",
      "PRESISJON OG OVERFLATEBEHANDLING",
      pp(), TP,
    ));
  }

  // Side: KC Tools spesial
  if (groups.kc_spesial.length > 0) {
    pages.push(buildGrid3x3(
      groups.kc_spesial.slice(0, 9),
      "KC TOOLS · SPESIAL",
      "HJØRNEKUTTER · NÅLEBANKER · POPTANG OG MER",
      pp(), TP,
    ));
  }

  // Side: Sumake-divider
  const sumakeSum =
    groups.sumake_lakkspr.length + groups.sumake_blasepistol.length +
    groups.sumake_airbrush.length + groups.sumake_kompressor.length +
    groups.sumake_sandblaser.length + groups.sumake_skrutrekker.length +
    groups.sumake_polering.length;
  pages.push(buildBrandDivider(
    sumakeLogo, "Sumake",
    "Taiwansk presisjon for lakk, blåseluft og finarbeid",
    [
      { name: "Lakksprøyter (HVLP)",   count: groups.sumake_lakkspr.length },
      { name: "Blåsepistoler",         count: groups.sumake_blasepistol.length },
      { name: "Airbrush · sprøyte",    count: groups.sumake_airbrush.length },
      { name: "Kompressorer",          count: groups.sumake_kompressor.length },
      { name: "Sandblåser · trykktank", count: groups.sumake_sandblaser.length },
      { name: "Skrutrekkere",          count: groups.sumake_skrutrekker.length },
      { name: "Polering",              count: groups.sumake_polering.length },
    ],
    pp(), TP,
  ));

  // Side: Sumake lakksprøyter + kompressorer + sandblåser
  const sumakeProduksjon = [
    ...groups.sumake_lakkspr,
    ...groups.sumake_kompressor,
    ...groups.sumake_sandblaser,
    ...groups.sumake_polering,
  ];
  if (sumakeProduksjon.length > 0) {
    pages.push(buildGrid3x3(
      sumakeProduksjon.slice(0, 9),
      "SUMAKE · LAKK · KOMPRESSOR · SANDBLÅSING",
      "OVERFLATEBEHANDLING OG TRYKKLUFT-FORSYNING",
      pp(), TP,
    ));
  }

  // Side: Sumake blåsepistoler (8 stk)
  if (groups.sumake_blasepistol.length > 0) {
    pages.push(buildGrid3x3(
      groups.sumake_blasepistol.slice(0, 9),
      "SUMAKE · BLÅSEPISTOLER",
      "MESSINGGJENGER FRA 100 TIL 500 MM",
      pp(), TP,
      "Sortert etter blåserør-lengde",
    ));
  }

  // Side: Sumake airbrush + skrutrekkere
  const sumakeFinarbeid = [
    ...groups.sumake_airbrush,
    ...groups.sumake_skrutrekker,
  ];
  if (sumakeFinarbeid.length > 0) {
    pages.push(buildGrid3x3(
      sumakeFinarbeid.slice(0, 9),
      "SUMAKE · AIRBRUSH · MONTASJE",
      "PRESISJONS-VERKTØY FOR DETALJARBEID",
      pp(), TP,
    ));
  }

  // Side: FT spesial (Jumbo Hammer + Custom)
  if (groups.ft_spesial.length > 0) {
    pages.push(buildGrid2x2(
      groups.ft_spesial.slice(0, 4),
      "FOSEN TOOLS · SPESIAL",
      "EGENPRODUSERT — KOMPLETTERER KAMPANJEN",
      pp(), TP,
    ));
  }

  // Side: Bakside
  pages.push(buildBackCover());
  const realTotalPages = pages.length;

  // Patch sidetall i alle footers (TP-placeholder → realTotalPages)
  for (const page of pages) {
    for (const obj of page.objects) {
      if (obj.type === "text" && typeof obj.props?.content === "string" &&
          obj.props.content.endsWith(` / ${TP}`)) {
        const [num] = obj.props.content.split(" / ");
        obj.props.content = `${num} / ${realTotalPages}`;
      }
    }
  }

  console.log(`\nBygget ${pages.length} sider`);

  // ── Bygg full BrochureDoc ───────────────────────────────────────────
  const doc = {
    id: uid("doc"),
    title: "Vårkampanje Trykkluft",
    paper: "A4P",
    tokens: {
      red: FT_RED,
      ink: FT_INK,
      cream: "#f5f1e8",
      bgPage: "#ffffff",
      // Standard FT-tokens (samme som brosjyre-editoren bruker)
    },
    pages,
    assets: [],
  };

  // ── Insert eller UPDATE i brochures-tabellen ────────────────────────
  if (EXISTING_BROCHURE_ID) {
    const { error: updErr } = await supa
      .from("brochures")
      .update({
        doc,
        title: "Vårkampanje Trykkluft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", EXISTING_BROCHURE_ID);
    if (updErr) throw updErr;
    console.log(`\n✓ Eksisterende brosjyre oppdatert: ${EXISTING_BROCHURE_ID}`);
  } else {
    const { data: existing } = await supa
      .from("brochures")
      .select("user_id")
      .limit(1)
      .single();
    if (!existing) throw new Error("Fant ingen eksisterende brosjyrer å hente user_id fra");
    const { data: inserted, error: insErr } = await supa
      .from("brochures")
      .insert({
        user_id: existing.user_id,
        title: "Vårkampanje Trykkluft",
        doc,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    console.log(`\n✓ Ny brosjyre opprettet: ${inserted.id}`);
  }
  console.log(`  Åpne i UI:  /brosjyre  → Mine brosjyrer → "Vårkampanje Trykkluft"`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
