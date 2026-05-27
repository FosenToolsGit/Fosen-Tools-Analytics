// Bygger Vårkampanje Trykkluft-brosjyren PÅ NYTT (v2) basert på
// offisiell FT-profil fra DM_FosenTools_2024.pdf:
//
//   Farger:       Primær-rød #E52E39 (PMS 185 C), ink #2A2B2F (PMS 426 C)
//                 Gråtoner   #999999 / #CCCCCC / #E5E5E5
//   Typografi:    Cairo (overskrifter, UPPERCASE) + Inter (Calibre-substitutt)
//   Logo-pattern: Hvit FOSEN TOOLS-logo i RØD BOKS — konsistent gjennom hele
//                 brosjyren (header, forside, bakside, dividers)
//
// Nytt konsept:
//   - Forside: Mørk bg + rød logo-boks topp-venstre + sentrert 25-årslogo
//              + stor Cairo-tittel "VÅRKAMPANJE TRYKKLUFT" + -40% burst-pille
//              + tagline "Gyldig ut 4. juli 2026" + disclaimer
//   - Brand-dividers: Mørk bg, stor produsent-logo, kategori-liste i Cairo
//   - Innholdssider: Hvit bg + profil-header (rød logo-boks på mørk stripe)
//                    + eyebrow + Cairo-tittel + 3×3-grid + footer
//   - FT-spesial: Hero med kun F6860 + bullets + pris-blokk
//   - Bakside: Stort 25-årslogo + "INDUSTRI VERKTØY FOR FAGFOLK"
//              + "DEL AV"-100-årslogo + kontakt + disclaimer + sertifikater

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

// ───── PROFIL-TOKENS (DM_FosenTools_2024.pdf) ─────────────────────────
const RED       = "#E52E39"; // PMS 185 C
const INK       = "#2A2B2F"; // PMS 426 C
const GRAY_40   = "#999999"; // Cool Gray 5 C
const GRAY_20   = "#CCCCCC"; // Cool Gray 1 C
const GRAY_10   = "#E5E5E5"; // Cool Gray 1 C 50%
const WHITE     = "#ffffff";

const HEAD_FONT = '"Cairo", "Manrope", "Korolev", "Roboto", Arial, sans-serif';
const BODY_FONT = '"Inter", "Manrope", "Roboto", Arial, sans-serif';

const W = 210, H = 297; // A4P mm

const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;

const EXISTING_BROCHURE_ID = "810a8e87-9330-42a0-9055-c1485a16b025";

const KC_TOOLS_LOGO   = "/brosjyre/manufacturer-logos/kc-tools.svg";
const SUMAKE_LOGO     = "/brosjyre/manufacturer-logos/sumake.svg";
const FT_CUSTOM_LOGO  = "/brosjyre/manufacturer-logos/fosen-tools-custom.svg";
const FT_WHITE_LOGO   = "/brosjyre/Fosen-Tools_white.svg";
const JUB_25_LOGO     = "/brosjyre/Jubileumslogo-25aar.svg";
const JUB_100_LOGO    = "/brosjyre/Jubileumslogo-100aar.svg";

// Kampanje-konfig
const CAMPAIGN_VALID_UNTIL = "Gyldig ut 4. juli 2026";
const DISCLAIMER_SHORT     = "Prisene gjelder kun lagerførte produkter, så lenge lageret rekker.";

// ──────────────────────────────────────────────────────────────────────
// Produkt-URL-er (alle 71 live etter REV1 — F2349 + F4910 fjernet, F6261 også)
// ──────────────────────────────────────────────────────────────────────

const PRODUCT_URLS = [
  // KC Tools
  "https://fosen-tools.no/kc-tools/f2186/slipemaskin-mini-sm200-kc-suntech-75mm-15-000-rpm-kc-tools",
  "https://fosen-tools.no/kc-tools/f2187/luftskralle-1-2-dr-dot--sm-31-kc-suntech-kc-tools",
  "https://fosen-tools.no/kc-tools/f2190/muttertrekker-1-2-dr-dot--sg-0716-7-dot-000-rpm-380-nm-kc-tools",
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
  "https://fosen-tools.no/kc-tools/f6262/muttertrekker-1-2-1-27kg-kort-122mm-10-dot-000rpm-1400-nm-twin-hammer-kc-tools",
  "https://fosen-tools.no/kc-tools/f6263/muttertrekker-1-2-1-16kg-vinkel-kort-88mm-8500rpm-312nm-jumbo-hammer-kc-tools",
  // Sumake
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
  // FT Custom — F6261 fjernet, kun F6860 beholdt
  "https://fosen-tools.no/fosen-tools-custom/f6860/muttertrekker-1-2-1400nm-i-koffert-17-19-21-22mm-lang-pipe-150mm-ftc",
];

// ──────────────────────────────────────────────────────────────────────
// Scrape (Googlebot UA p.g.a. Multicase content-cloaking)
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

    let offer = null;
    if (product.offers) offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
    else if (product.hasVariant?.[0]?.offers) {
      const v = product.hasVariant[0].offers;
      offer = Array.isArray(v) ? v[0] : v;
    }
    const priceNow = offer ? parseFloat(offer.price ?? offer.lowPrice ?? 0) : 0;

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

    const rawImg = Array.isArray(product.image) ? product.image[0] : product.image;
    const imageUrl = rawImg || null;

    let manufacturer = "";
    if (product.brand) {
      manufacturer = typeof product.brand === "string"
        ? product.brand
        : (product.brand.name || "");
    }

    const logoM = html.match(/<img[^>]+class="ProducerLogoImage"[^>]+src="([^"]+)"/);
    const manufacturer_logo_url = logoM ? logoM[1] : null;

    const skuM = html.match(/<span class="prd-num-label">([^<]+)<\/span>/);
    const sku = skuM ? skuM[1].trim() : null;

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

    const availability =
      offer?.availability || product?.offers?.availability || null;
    const in_stock = typeof availability === "string"
      ? availability.toLowerCase().includes("instock")
      : true;

    return {
      source_url: url,
      name: decodeEntities(product.name || "").replace(/\s+/g, " ").trim(),
      manufacturer,
      manufacturer_logo_url,
      image_url: imageUrl,
      image_placeholder: null,
      price_before: priceBefore,
      price_now: priceNow,
      discount_pct: discountPct,
      in_stock,
      category: "",
      bullets,
      sku,
    };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Primitives
// ──────────────────────────────────────────────────────────────────────

const shape = (x, y, w, h, fill) => ({
  id: uid("obj"), type: "shape", x, y, w, h, rot: 0, locked: false,
  props: { shape: "rect", fill, radius: 0, stroke: null, strokeWidth: 0 },
});

const rect = (x, y, w, h, fill) => shape(x, y, w, h, fill);

const txt = (x, y, w, h, content, preset = "h4", opts = {}) => ({
  id: uid("obj"), type: "text", x, y, w, h, rot: 0, locked: false,
  props: {
    content, preset,
    align: opts.align ?? "left",
    color: opts.color ?? INK,
    weight: opts.weight ?? 500,
    italic: opts.italic ?? false,
    letterSpacing: opts.letterSpacing,
    lineHeight: opts.lineHeight,
    fontSize: opts.fontSize,
    fontFamily: opts.font ?? "head", // "head" or "body" — resolved client-side
  },
});

const img = (x, y, w, h, src, opts = {}) => ({
  id: uid("obj"), type: "image", x, y, w, h, rot: 0, locked: false,
  props: {
    src, alt: opts.label || "", fit: opts.fit || "contain",
    focusX: 0.5, focusY: 0.5, tint: opts.tint ?? null,
  },
});

const badge = (x, y, w, h, text, opts = {}) => ({
  id: uid("obj"), type: "badge", x, y, w, h,
  rot: opts.rot ?? -8, locked: false,
  props: {
    text, style: opts.style || "star",
    color: opts.color || RED, textColor: WHITE,
    fontSize: opts.fontSize ?? 14,
  },
});

const productCard = (product, x, y, w, h, variant = "standard", opts = {}) => ({
  id: uid("obj"), type: "productCard", x, y, w, h, rot: 0, locked: false,
  props: {
    variant, product,
    showBurst: opts.showBurst ?? true,
    burstStyle: opts.burstStyle ?? "star",
    burstText: opts.burstText ?? null,
    showQR: false, showStock: opts.showStock ?? true,
    showWarranty: false, vatMode: "ex",
    bulletCount: variant === "hero" ? 4 : variant === "compact" ? 0 : 3,
    bgColor: WHITE, accentColor: null,
  },
});

// ──────────────────────────────────────────────────────────────────────
// Felles header/footer per FT-profil
// ──────────────────────────────────────────────────────────────────────

/**
 * Profil-header (16mm høyde) — FULL BREDDE RØD per FT-profil:
 *   - Hele header-stripen er rød (#E52E39) i full A4-bredde
 *   - Hvit FOSEN TOOLS-logo plassert venstre (Fosen-Tools_white.svg)
 *   - Sentrert tagline "25 ÅR MED KVALITET" (lys hvit Cairo letter-spaced)
 *   - Årstall "2001 — 2026" høyre side (dempet hvit)
 *   - Tynn mørk linje under (1mm INK) som overgang til side-innhold
 *
 * Ingen konstruert "logo-boks" — hele headeren ER den røde flaten,
 * så hvit FT-logo flyter naturlig oppi som om den var integrert.
 */
function profileHeader(tagline = "25 ÅR MED KVALITET") {
  const stripeH = 16;
  return [
    rect(0, 0, W, stripeH, RED),
    // Hvit FT-logo venstre — bred nok til god lesbarhet, sentrert vertikalt
    img(10, 4, 64, 8, FT_WHITE_LOGO, { fit: "contain", label: "Fosen Tools" }),
    // Tagline sentrert (litt høyre for logo-en)
    txt(80, 5.5, 80, 5, tagline, "h5",
        { align: "left", color: "rgba(255,255,255,0.92)",
          weight: 700, letterSpacing: 0.18 }),
    // Årstall høyre
    txt(W - 60, 5.5, 50, 5, "2001 — 2026", "h5",
        { align: "right", color: "rgba(255,255,255,0.7)",
          weight: 500, letterSpacing: 0.08 }),
  ];
}

/**
 * Profil-footer (lavt på siden, y = H - 14):
 *   - Tynn rød 0.4mm linje
 *   - Sentral kontakt-tekst i gråtone
 *   - Sidetall høyre i rødt
 */
function profileFooter(pageNo, totalPages) {
  const yBase = H - 14;
  return [
    rect(0, yBase, W, 0.4, RED),
    txt(10, yBase + 3, W - 70, 5,
        "fosen-tools.no  ·  72 51 51 20  ·  Industrigata 1, 7130 Brekstad", "h5",
        { color: GRAY_40, weight: 500 }),
    txt(W - 55, yBase + 3, 48, 5, `${pageNo} / ${totalPages}`, "h5",
        { align: "right", color: RED, weight: 800 }),
    // Disclaimer-tekst HELT nederst
    txt(10, yBase + 8.5, W - 20, 3, DISCLAIMER_SHORT, "h5",
        { align: "center", color: GRAY_20, weight: 400, fontSize: 6 }),
  ];
}

/**
 * Tittel-band under header (~y 18-40):
 *   - Rød 4mm vertikal accent venstre
 *   - Eyebrow (gråtone, UPPERCASE, Cairo letter-spaced)
 *   - Hovedtittel (Cairo bold, UPPERCASE, ink)
 *   - Subtitle (gråtone, opcional)
 */
function titleBand(eyebrow, title, subtitle = null) {
  // Innhold starter ved y=16 (etter 16mm rød header).
  // Tittel-band tar y=25-46 (~21mm). Tittel rendres som H3 (mindre enn H2)
  // for at innholdssider ikke skal konkurrere med brand-divider-titlene.
  const objs = [
    rect(13, 25.5, 4, 13, RED),
    txt(20, 25, W - 40, 4, eyebrow.toUpperCase(), "h5",
        { color: GRAY_40, weight: 700, letterSpacing: 0.10 }),
    txt(20, 31, W - 40, 9, title.toUpperCase(), "h3",
        { color: INK, weight: 900, letterSpacing: 0.02 }),
  ];
  if (subtitle) {
    objs.push(txt(20, 41, W - 40, 4.5, subtitle, "h5",
                  { color: GRAY_40, weight: 500, italic: true }));
  }
  return objs;
}

// ──────────────────────────────────────────────────────────────────────
// Side-byggere
// ──────────────────────────────────────────────────────────────────────

/** Forside — full rød header, mørk grå body, sentrert 25-årslogo, stor Cairo-tittel */
function buildCover() {
  const burstSize = 60;
  return {
    id: uid("page"), paper: "A4P", w: W, h: H, bg: WHITE,
    objects: [
      // Hele siden mørk grå under header
      rect(0, 16, W, H - 16, INK),

      // Profil-header (full rød, 16mm) — øverst på alle sider
      ...profileHeader("Vårkampanje · Trykkluft 2026"),

      // ── BÅND 1: Jubileum (y 36-110) ────────────────────────────────
      txt(0, 38, W, 5, "25 ÅR MED KVALITET!", "h5",
          { align: "center", color: "rgba(255,255,255,0.55)",
            weight: 700, letterSpacing: 0.20 }),
      img((W - 110) / 2, 48, 110, 62, JUB_25_LOGO,
          { fit: "contain", label: "25 år" }),

      // ── BÅND 2: Kampanje-tittel (y 134-206) ────────────────────────
      txt(0, 134, W, 5, "VÅRKAMPANJE", "h5",
          { align: "center", color: "rgba(255,255,255,0.6)",
            weight: 700, letterSpacing: 0.32 }),
      txt(10, 146, W - 20, 36, "TRYKKLUFT", "h1",
          { align: "center", color: WHITE, weight: 900, letterSpacing: 0.02,
            fontSize: 64 }),
      rect((W - 40) / 2, 190, 40, 2, RED),
      txt(15, 200, W - 30, 8,
          "40 % rabatt på alle trykkluft-maskiner fra KC Tools og Sumake", "h4",
          { color: "rgba(255,255,255,0.78)", align: "center", weight: 500 }),

      // ── -40% burst — øverste høyre hjørne (under header) ───────────
      badge(W - burstSize - 10, 22, burstSize, burstSize, "−40%",
            { style: "star", rot: -10, fontSize: 60 }),

      // ── BÅND 3: Kampanje-vinduet ───────────────────────────────────
      rect((W - 80) / 2, 230, 80, 0.4, "rgba(255,255,255,0.2)"),
      txt(0, 234, W, 5, CAMPAIGN_VALID_UNTIL, "h4",
          { align: "center", color: WHITE, weight: 700, letterSpacing: 0.06 }),

      // ── BÅND 4: Kontakt-CTA ────────────────────────────────────────
      txt(0, 252, W, 4, "RING OSS", "h5",
          { align: "center", color: "rgba(255,255,255,0.5)",
            weight: 700, letterSpacing: 0.20 }),
      txt(15, 258, W - 30, 14, "72 51 51 20", "h1",
          { align: "center", color: WHITE, weight: 800, letterSpacing: 0.04 }),

      // ── Bunn: Adresse + disclaimer ─────────────────────────────────
      txt(15, 280, W - 30, 4,
          "fosen-tools.no  ·  Industrigata 1, 7130 Brekstad", "h5",
          { align: "center", color: "rgba(255,255,255,0.7)", weight: 500 }),
      txt(15, 287, W - 30, 4, DISCLAIMER_SHORT, "h5",
          { align: "center", color: "rgba(255,255,255,0.45)",
            weight: 400, fontSize: 7 }),
    ],
  };
}

/** Brand-divider — full-side mørk under header, med produsent-logo + kategori-liste */
function buildBrandDivider(brandLogoUrl, brandName, tagline, categories, pageNo, totalPages) {
  const objs = [
    // Mørk grå bg under header
    rect(0, 16, W, H - 16, INK),
    // Profil-header
    ...profileHeader(`${brandName.toUpperCase()} · Vårkampanje`),

    // Stor produsent-logo sentrert (sentral identitet på siden)
    img((W - 160) / 2, 22, 160, 100, brandLogoUrl,
        { fit: "contain", label: brandName }),

    // Rød accent-strek
    rect((W - 30) / 2, 128, 30, 2, RED),

    // Tagline (brand-navn-tekst utelatt — logoen + header taler for seg)
    txt(20, 136, W - 40, 14, tagline, "h4",
        { align: "center", color: "rgba(255,255,255,0.72)", weight: 500 }),

    // Kategori-overskrift
    txt(0, 160, W, 4, "I DENNE KAMPANJEN", "h5",
        { align: "center", color: GRAY_40,
          weight: 700, letterSpacing: 0.20 }),
  ];

  // Kategori-liste
  const filtered = categories.filter(c => c.count > 0);
  const startY = 176;
  const rowH = 9;
  for (let i = 0; i < filtered.length; i++) {
    const y = startY + i * rowH;
    objs.push(rect(55, y + 2.5, 3, 3, RED));
    objs.push(txt(62, y + 1.5, 80, 5, filtered[i].name, "h4",
                  { color: WHITE, weight: 700 }));
    objs.push(txt(135, y + 1.5, 35, 5, `${filtered[i].count} STK`, "h4",
                  { align: "right", color: "rgba(255,255,255,0.55)",
                    weight: 500, letterSpacing: 0.04 }));
  }

  // Bunn-CTA + sidetall + disclaimer (på mørk bg, så hvit tekst)
  objs.push(rect((W - 60) / 2, H - 28, 60, 0.4, "rgba(255,255,255,0.2)"));
  objs.push(txt(0, H - 22, W, 5, "Se priser på neste side  →", "h5",
                { align: "center", color: "rgba(255,255,255,0.6)",
                  weight: 500, letterSpacing: 0.04 }));
  objs.push(txt(0, H - 14, W, 3, DISCLAIMER_SHORT, "h5",
                { align: "center", color: "rgba(255,255,255,0.4)",
                  weight: 400, fontSize: 6 }));
  objs.push(txt(W - 28, H - 22, 20, 4, `${pageNo} / ${totalPages}`, "h5",
                { align: "right", color: RED, weight: 800 }));

  return { id: uid("page"), paper: "A4P", w: W, h: H, bg: WHITE, objects: objs };
}

/** Grid 3×3 — 9 compact-produkter under profil-header + tittel-band */
function buildGrid3x3(products, eyebrow, title, pageNo, totalPages, subtitle = null) {
  const objs = [
    ...profileHeader(`${eyebrow.split("·")[0].trim()} · Vårkampanje`),
    ...titleBand(eyebrow, title, subtitle),
  ];
  const startY = subtitle ? 52 : 50;
  const colW = 60, rowH = 70, gap = 4, mx = 13;
  const count = Math.min(products.length, 9);
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / 3), c = i % 3;
    objs.push(productCard(products[i],
      mx + c * (colW + gap), startY + r * (rowH + gap),
      colW, rowH, "compact"));
  }
  objs.push(...profileFooter(pageNo, totalPages));
  return { id: uid("page"), paper: "A4P", w: W, h: H, bg: WHITE, objects: objs };
}

/** FT-spesial hero-side — kun F6860, sentrert + bullets + pris */
function buildFtSpesialHero(product, pageNo, totalPages) {
  const objs = [
    ...profileHeader("Fosen Tools Custom · Egenprodusert"),
    ...titleBand(
      "Fosen Tools · Spesial",
      "Egenprodusert",
      "Kompletterer kampanjen — designet og montert i Brekstad",
    ),
  ];
  const cardW = 130, cardH = 180;
  const cardX = (W - cardW) / 2, cardY = 56;
  objs.push(productCard(product, cardX, cardY, cardW, cardH, "hero"));
  objs.push(...profileFooter(pageNo, totalPages));
  return { id: uid("page"), paper: "A4P", w: W, h: H, bg: WHITE, objects: objs };
}

/** Bakside — full rød header + dark grå body + 25-årslogo + "INDUSTRI VERKTØY FOR FAGFOLK" */
function buildBackCover() {
  return {
    id: uid("page"), paper: "A4P", w: W, h: H, bg: WHITE,
    objects: [
      // Mørk grå bg under header
      rect(0, 16, W, H - 16, INK),
      // Profil-header øverst
      ...profileHeader("25 år · Industri verktøy for fagfolk"),

      // 25-årslogo stort
      img((W - 130) / 2, 42, 130, 72, JUB_25_LOGO,
          { fit: "contain", label: "25 år" }),

      // Hovedtittel
      txt(0, 132, W, 16, "INDUSTRI VERKTØY\nFOR FAGFOLK", "h1",
          { align: "center", color: WHITE, weight: 900, letterSpacing: 0.02,
            lineHeight: 1.05 }),
      rect((W - 36) / 2, 168, 36, 2, RED),

      // Tagline (FT offisiell positioning-setning per profilen)
      txt(0, 178, W, 10,
          "Din komplette leverandør av driftseffektive og bruker-tilrettelagte løsninger!", "h5",
          { align: "center", color: "rgba(255,255,255,0.65)",
            weight: 500, italic: true }),

      // DEL AV + 100-årslogo
      txt(0, 196, W, 4, "DEL AV", "h5",
          { align: "center", color: "rgba(255,255,255,0.4)",
            weight: 700, letterSpacing: 0.20 }),
      img((W - 64) / 2, 202, 64, 16, JUB_100_LOGO,
          { fit: "contain", label: "100 år" }),

      // Kontaktblokk
      txt(0, 228, W, 4, "RING OSS", "h5",
          { align: "center", color: "rgba(255,255,255,0.45)",
            weight: 700, letterSpacing: 0.20 }),
      txt(15, 234, W - 30, 12, "72 51 51 20", "h1",
          { align: "center", color: WHITE, weight: 800, letterSpacing: 0.04 }),
      txt(0, 254, W, 5,
          "Industrigata 1  ·  7130 Brekstad  ·  Man — fre  07:00 — 15:00", "h5",
          { align: "center", color: "rgba(255,255,255,0.6)", weight: 500 }),
      txt(0, 261, W, 5, "fosen-tools.no  ·  post@fosen-tools.no", "h5",
          { align: "center", color: "rgba(255,255,255,0.78)", weight: 600 }),

      // Disclaimer + gyldighet
      rect(20, 272, W - 40, 0.3, "rgba(255,255,255,0.15)"),
      txt(0, 276, W, 4, CAMPAIGN_VALID_UNTIL, "h5",
          { align: "center", color: WHITE, weight: 700, letterSpacing: 0.06 }),
      txt(0, 282, W, 4, DISCLAIMER_SHORT, "h5",
          { align: "center", color: "rgba(255,255,255,0.5)",
            weight: 400, fontSize: 7 }),

      // Sertifikater
      txt(0, 289, W, 4,
          "MILJØFYRTÅRN  ·  GASELLE 2023  ·  GRØNT PUNKT  ·  100 % SELVFORSYNT FORNYBAR ENERGI", "h5",
          { align: "center", color: "rgba(255,255,255,0.5)",
            weight: 700, letterSpacing: 0.10, fontSize: 6.5 }),
    ],
  };
}

// ──────────────────────────────────────────────────────────────────────
// Klassifisering
// ──────────────────────────────────────────────────────────────────────

function classify(products) {
  const groups = {
    kc_muttertrekker: [], kc_luftskralle: [], kc_sliper: [],
    kc_polering: [], kc_bormaskin: [], kc_blasepistol: [],
    kc_moment: [], kc_spesial: [],
    sumake_lakkspr: [], sumake_blasepistol: [], sumake_airbrush: [],
    sumake_kompressor: [], sumake_sandblaser: [], sumake_skrutrekker: [],
    sumake_polering: [],
    ft_spesial: [],
  };
  for (const p of products) {
    const n = (p.name || "").toUpperCase();
    const url = p.source_url || "";
    if (url.includes("/fosen-tools-custom/") || url.includes("/fosen-tools/")) {
      groups.ft_spesial.push(p); continue;
    }
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
    if (n.includes("MUTTERTREKKER")) groups.kc_muttertrekker.push(p);
    else if (n.includes("LUFTSKRALLE")) groups.kc_luftskralle.push(p);
    else if (n.includes("BORMASKIN")) groups.kc_bormaskin.push(p);
    else if (n.includes("BLÅSEPISTOL")) groups.kc_blasepistol.push(p);
    else if (n.includes("MOMENTSKRUTREKKER")) groups.kc_moment.push(p);
    else if (n.includes("POLERINGS") || n.includes("POLERMASKIN") || n.includes("BØRSTE SLIPER"))
      groups.kc_polering.push(p);
    else if (n.includes("SLIPEMASKIN") || n.includes("VINKELSLIPER") ||
             n.includes("BÅNDSLIPEMASKIN") || n.includes("RONDELLKAPPEMASKIN"))
      groups.kc_sliper.push(p);
    else groups.kc_spesial.push(p);
  }
  return groups;
}

const sortByMoment = (arr) => arr.slice().sort((a, b) => {
  const an = parseFloat((a.name?.match(/(\d+(?:,\d+)?)\s*NM/i) || [])[1]?.replace(",", ".") ?? "0");
  const bn = parseFloat((b.name?.match(/(\d+(?:,\d+)?)\s*NM/i) || [])[1]?.replace(",", ".") ?? "0");
  return an - bn;
});

const sortByLength = (arr) => arr.slice().sort((a, b) => {
  const an = parseInt((a.name?.match(/(\d+)\s*MM/i) || [])[1] ?? "0", 10);
  const bn = parseInt((b.name?.match(/(\d+)\s*MM/i) || [])[1] ?? "0", 10);
  return an - bn;
});

// ──────────────────────────────────────────────────────────────────────
// Main
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
  console.log(`  ${results.length}/${PRODUCT_URLS.length} produkter skrapet\n`);

  // Override produsent-logoer til offisielle SVG-er
  for (const p of results) {
    if (p.source_url.includes("/kc-tools/")) p.manufacturer_logo_url = KC_TOOLS_LOGO;
    else if (p.source_url.includes("/sumake/")) p.manufacturer_logo_url = SUMAKE_LOGO;
    else if (p.source_url.includes("/fosen-tools-custom/")) p.manufacturer_logo_url = FT_CUSTOM_LOGO;
  }

  const groups = classify(results);

  // F4064 ligger under /sumake/ men er KC Tools-merket — flytt manuelt
  const i4064 = groups.sumake_polering.findIndex(p => (p.sku || "").toUpperCase() === "F4064");
  if (i4064 >= 0) {
    groups.sumake_polering[i4064].manufacturer_logo_url = KC_TOOLS_LOGO;
    groups.kc_polering.push(groups.sumake_polering[i4064]);
    groups.sumake_polering.splice(i4064, 1);
  }

  console.log("Klassifisering:");
  for (const [k, v] of Object.entries(groups))
    console.log(`  ${k.padEnd(28)} ${v.length}`);

  // Sortering
  groups.kc_muttertrekker = sortByMoment(groups.kc_muttertrekker);
  groups.sumake_blasepistol = sortByLength(groups.sumake_blasepistol);

  // ── Bygg sider ────────────────────────────────────────────────────
  const pages = [];
  const TP = 14;
  let pn = 1;
  const pp = () => pn++;

  // S1: Forside
  pages.push(buildCover()); pp();

  // S2: KC Tools-divider
  pages.push(buildBrandDivider(
    KC_TOOLS_LOGO, "KC Tools",
    "Robust trykkluft for verksted og industri",
    [
      { name: "Muttertrekkere",      count: groups.kc_muttertrekker.length },
      { name: "Luftskraller",        count: groups.kc_luftskralle.length },
      { name: "Sliper · båndsliper", count: groups.kc_sliper.length },
      { name: "Polering",            count: groups.kc_polering.length },
      { name: "Bormaskiner",         count: groups.kc_bormaskin.length },
      { name: "Blåsepistoler",       count: groups.kc_blasepistol.length },
      { name: "Momentskrutrekkere",  count: groups.kc_moment.length },
      { name: "Spesial",             count: groups.kc_spesial.length },
    ],
    pp(), TP,
  ));

  // S3: KC Tools muttertrekkere (sortert svakest→kraftigst)
  if (groups.kc_muttertrekker.length > 0) {
    pages.push(buildGrid3x3(
      groups.kc_muttertrekker.slice(0, 9),
      "KC Tools · Muttertrekkere",
      "Fra 325 til 1898 Nm",
      pp(), TP,
      "Sortert fra svakest til kraftigst",
    ));
  }
  const kcMutOverflow = groups.kc_muttertrekker.slice(9);

  // S4: KC Tools luftskraller + overflow
  if (groups.kc_luftskralle.length > 0 || kcMutOverflow.length > 0) {
    pages.push(buildGrid3x3(
      [...groups.kc_luftskralle, ...kcMutOverflow].slice(0, 9),
      "KC Tools · Luftskraller",
      "Presisjon for trange punkter",
      pp(), TP,
    ));
  }

  // S5: KC Tools bormaskiner
  if (groups.kc_bormaskin.length > 0) {
    pages.push(buildGrid3x3(
      groups.kc_bormaskin.slice(0, 9),
      "KC Tools · Bormaskiner",
      "Fra 1/4\" til 3/8\" reversibel",
      pp(), TP,
    ));
  }

  // S6: KC Tools sliper
  if (groups.kc_sliper.length > 0) {
    pages.push(buildGrid3x3(
      groups.kc_sliper.slice(0, 9),
      "KC Tools · Sliper",
      "Mini · vinkel · bånd · kappe",
      pp(), TP,
    ));
  }
  const kcSliperOverflow = groups.kc_sliper.slice(9);

  // S7: KC Tools polering + blåsepistol + moment + sliper-overflow
  const kcMisc = [
    ...groups.kc_polering, ...groups.kc_blasepistol,
    ...groups.kc_moment, ...kcSliperOverflow,
  ];
  if (kcMisc.length > 0) {
    pages.push(buildGrid3x3(
      kcMisc.slice(0, 9),
      "KC Tools · Polering · Blåseluft · Moment",
      "Presisjon og overflatebehandling",
      pp(), TP,
    ));
  }

  // S8: KC Tools spesial
  if (groups.kc_spesial.length > 0) {
    pages.push(buildGrid3x3(
      groups.kc_spesial.slice(0, 9),
      "KC Tools · Spesial",
      "Hjørnekutter · nålebanker · poptang og mer",
      pp(), TP,
    ));
  }

  // S9: Sumake-divider
  pages.push(buildBrandDivider(
    SUMAKE_LOGO, "Sumake",
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

  // S10: Sumake lakksprøyter + kompressor + sandblåser + polering
  const sumakeProduksjon = [
    ...groups.sumake_lakkspr, ...groups.sumake_kompressor,
    ...groups.sumake_sandblaser, ...groups.sumake_polering,
  ];
  if (sumakeProduksjon.length > 0) {
    pages.push(buildGrid3x3(
      sumakeProduksjon.slice(0, 9),
      "Sumake · Lakk · Kompressor · Sandblåsing",
      "Overflatebehandling og trykkluft-forsyning",
      pp(), TP,
    ));
  }

  // S11: Sumake blåsepistoler (sortert blåserør-lengde)
  if (groups.sumake_blasepistol.length > 0) {
    pages.push(buildGrid3x3(
      groups.sumake_blasepistol.slice(0, 9),
      "Sumake · Blåsepistoler",
      "Messinggjenger fra 100 til 500 mm",
      pp(), TP,
      "Sortert etter blåserør-lengde",
    ));
  }

  // S12: Sumake airbrush + skrutrekkere
  const sumakeFinarbeid = [
    ...groups.sumake_airbrush, ...groups.sumake_skrutrekker,
  ];
  if (sumakeFinarbeid.length > 0) {
    pages.push(buildGrid3x3(
      sumakeFinarbeid.slice(0, 9),
      "Sumake · Airbrush · Montasje",
      "Presisjons-verktøy for detaljarbeid",
      pp(), TP,
    ));
  }

  // S13: FT spesial — hero med F6860
  if (groups.ft_spesial.length > 0) {
    pages.push(buildFtSpesialHero(groups.ft_spesial[0], pp(), TP));
  }

  // S14: Bakside
  pages.push(buildBackCover());

  // Oppdater sidetall (TP-placeholder → reell total)
  const realTotal = pages.length;
  for (const page of pages) {
    for (const obj of page.objects) {
      if (obj.type === "text" && typeof obj.props?.content === "string" &&
          obj.props.content.endsWith(` / ${TP}`)) {
        const [n] = obj.props.content.split(" / ");
        obj.props.content = `${n} / ${realTotal}`;
      }
    }
  }

  console.log(`\nBygget ${pages.length} sider (helt nytt design, profil-basert)`);

  // ── BrochureDoc ─────────────────────────────────────────────────────
  const doc = {
    id: uid("doc"),
    title: "Vårkampanje Trykkluft",
    paper: "A4P",
    tokens: {
      red: RED,
      redCmyk: "C:1 M:92 Y:74 K:0",
      ink: INK,
      textMain: INK,
      textBody: "#374151",
      textMuted: GRAY_40,
      link: RED,
      bgPage: "#ffffff",
      cardBg: "#ffffff",
      borderSoft: GRAY_20,
      shadowSoft: "0 1px 3px rgba(0,0,0,0.08)",
      headingFont: HEAD_FONT,
      bodyFont: BODY_FONT,
      showVat: true,
      vatRate: 25,
    },
    pages,
    assets: [],
  };

  // ── Skriv til Supabase ──────────────────────────────────────────────
  const { error: updErr } = await supa
    .from("brochures")
    .update({
      doc,
      title: "Vårkampanje Trykkluft",
      updated_at: new Date().toISOString(),
    })
    .eq("id", EXISTING_BROCHURE_ID);
  if (updErr) throw updErr;
  console.log(`\n✓ Brosjyre regenerert fra null: ${EXISTING_BROCHURE_ID}`);
  console.log(`  Åpne i editor: /brosjyre?id=${EXISTING_BROCHURE_ID}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
