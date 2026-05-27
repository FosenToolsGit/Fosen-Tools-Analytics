// Patcher Vårkampanje Trykkluft-brosjyren til offisiell FT-profil
// (DM_FosenTools_2024.pdf). Henter dagens versjon fra Supabase så
// brukerens manuelle endringer beholdes — patcher KUN det som må endres:
//
//   1. Tokens: rød #ed1c24 → #E52E39 (PMS 185 C),
//              ink #0f1115 → #2A2B2F (PMS 426 C),
//              headingFont Manrope → Cairo,
//              bodyFont Manrope → Inter (Calibre-substitutt)
//   2. Globale farger: alle rect/text/badge-fargereferanser oppdatert
//   3. Header (fosenStripe på side 2+): hvit FT-logo plassert i RØD BOKS
//      på mørk grå bakgrunn — matcher profil-eksemplet eksakt
//   4. Forside: "25 ÅR I BRANSJEN" → "25 ÅR MED KVALITET!"
//   5. Bakside: fjern "BREKSTAD · NORGE"-eyebrow
//   6. Egenprodusert-side (s.13): fjern F6261, behold kun F6860

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const BROCHURE_ID = "810a8e87-9330-42a0-9055-c1485a16b025";

// Offisiell FT-profil
const OLD_RED = "#ed1c24";
const NEW_RED = "#E52E39";
const OLD_INK_LOWER = "#0f1115";
const OLD_INK_UPPER = "#0F1115";
const NEW_INK = "#2A2B2F";

const HEAD_STACK = '"Cairo", "Manrope", "Korolev", "Roboto", Arial, Helvetica, sans-serif';
const BODY_STACK = '"Inter", "Manrope", "Roboto", Arial, Helvetica, sans-serif';

// Hjelper for å bytte farger i hex-strenger (case-insensitive)
function swapColor(value) {
  if (typeof value !== "string") return value;
  // Bytt rød
  let next = value
    .replaceAll(OLD_RED, NEW_RED)
    .replaceAll(OLD_RED.toUpperCase(), NEW_RED)
    .replaceAll("#ED1C24", NEW_RED);
  // Bytt ink (mørk grå)
  next = next
    .replaceAll(OLD_INK_LOWER, NEW_INK)
    .replaceAll(OLD_INK_UPPER, NEW_INK);
  return next;
}

// Rekursivt: kjør swapColor på alle string-props i objektet
function deepSwapColors(node) {
  if (Array.isArray(node)) {
    return node.map(deepSwapColors);
  }
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = deepSwapColors(v);
    }
    return out;
  }
  if (typeof node === "string") {
    return swapColor(node);
  }
  return node;
}

// ─────────────────────────────────────────────────────────────────────
// Hovedpatch
// ─────────────────────────────────────────────────────────────────────

async function main() {
  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Henter brosjyre ${BROCHURE_ID} …`);
  const { data: row, error } = await supa
    .from("brochures")
    .select("id, title, doc")
    .eq("id", BROCHURE_ID)
    .single();

  if (error || !row) {
    console.error("Kunne ikke hente brosjyre:", error?.message);
    process.exit(1);
  }

  const doc = row.doc;
  if (!doc?.pages || !Array.isArray(doc.pages)) {
    console.error("doc.pages mangler eller er ikke array");
    process.exit(1);
  }

  console.log(`Funnet brosjyre: "${row.title}" med ${doc.pages.length} sider\n`);

  // ── 1. Tokens (farger + fonter) ────────────────────────────────────
  if (doc.tokens) {
    doc.tokens.red = NEW_RED;
    doc.tokens.redCmyk = "C:1 M:92 Y:74 K:0";
    doc.tokens.ink = NEW_INK;
    doc.tokens.headingFont = HEAD_STACK;
    doc.tokens.bodyFont = BODY_STACK;
    console.log("✓ Tokens oppdatert (farger + fonter per FT-profil)");
  }

  // ── 2. Global farge-swap i alle sider/objekter ─────────────────────
  doc.pages = doc.pages.map((page) => deepSwapColors(page));
  console.log("✓ Globale farger erstattet (#ed1c24 → #E52E39, #0f1115 → #2A2B2F)");

  // ── 3. Patch forside (side 1): "25 ÅR I BRANSJEN" → "25 ÅR MED KVALITET!"
  const cover = doc.pages[0];
  let coverPatches = 0;
  for (const obj of cover.objects) {
    if (obj.type === "text" && typeof obj.props?.content === "string") {
      if (obj.props.content === "25 ÅR I BRANSJEN") {
        obj.props.content = "25 ÅR MED KVALITET!";
        coverPatches++;
      }
    }
  }
  console.log(`✓ Forside: "25 ÅR MED KVALITET!" satt (${coverPatches} treff)`);

  // ── 4. Patch bakside (siste side): fjern "BREKSTAD · NORGE"-eyebrow
  const backCover = doc.pages[doc.pages.length - 1];
  const beforeCount = backCover.objects.length;
  backCover.objects = backCover.objects.filter((obj) => {
    if (obj.type === "text" && typeof obj.props?.content === "string") {
      const c = obj.props.content.toUpperCase().trim();
      if (c === "BREKSTAD · NORGE" || c === "BREKSTAD · NORGE" || c.startsWith("BREKSTAD")) {
        return false;
      }
    }
    return true;
  });
  console.log(`✓ Bakside: fjernet ${beforeCount - backCover.objects.length} BREKSTAD-elementer`);

  // ── 5. Header per profil — hvit FT-logo i RØD BOKS på mørk grå bg ──
  // Dette er fosenStripe på side 2 og utover. Vi finner stripene via
  // ink-bakgrunns-rect på y=0 + W bredde + 12mm høyde, og injiserer
  // en rød boks rundt logoen.
  //
  // Profil-layout:
  //   - Full-bredde rect (0, 0, W, 12) i #2A2B2F (dark gray)
  //   - Rød boks rect (4, 0, 56, 12) i #E52E39
  //   - FOSEN TOOLS-logo (hvit SVG) plassert IPÅI rød boks (6, 2, 52, 8)
  //   - "25 ÅR"-tekst på høyresiden uendret
  //   - "2001 — 2026" på ytterst høyre uendret
  let stripePatches = 0;
  const isRectLike = (o) => o.type === "rect" || o.type === "shape";
  const fillOf = (o) => o.props?.fill;
  const isInk = (f) => f === NEW_INK || f === OLD_INK_LOWER || f === OLD_INK_UPPER;
  const isRed = (f) => f === NEW_RED || f === OLD_RED || f === OLD_RED.toUpperCase();

  for (let i = 0; i < doc.pages.length; i++) {
    const page = doc.pages[i];
    const W = page.w || 210;
    let stripeBgIdx = -1;
    let stripeRailIdx = -1;
    let stripeLogoIdx = -1;
    let redBoxAlready = false;

    for (let j = 0; j < page.objects.length; j++) {
      const o = page.objects[j];
      if (!o) continue;
      // Bakgrunns-stripe — full bredde × 12mm høyde, ink-farge
      if (
        isRectLike(o) &&
        o.x === 0 && o.y === 0 &&
        Math.abs(o.w - W) < 1 && Math.abs(o.h - 12) < 0.5 &&
        isInk(fillOf(o))
      ) {
        stripeBgIdx = j;
      }
      // Rød rail venstre — x=0, w=1.5
      else if (
        isRectLike(o) &&
        o.x === 0 && o.y === 0 &&
        Math.abs(o.w - 1.5) < 0.5 && Math.abs(o.h - 12) < 0.5 &&
        isRed(fillOf(o))
      ) {
        stripeRailIdx = j;
      }
      // Rød boks (idempotency-sjekk) — x=4, w≈56-60
      else if (
        isRectLike(o) &&
        Math.abs(o.x - 4) < 0.5 && o.y === 0 &&
        o.w >= 50 && o.w <= 65 && Math.abs(o.h - 12) < 0.5 &&
        isRed(fillOf(o))
      ) {
        redBoxAlready = true;
      }
      // Logo i topp
      else if (
        o.type === "image" &&
        o.y >= 1 && o.y <= 3 &&
        typeof o.props?.src === "string" &&
        o.props.src.includes("Fosen-Tools_white")
      ) {
        stripeLogoIdx = j;
      }
    }

    if (stripeBgIdx === -1 || stripeLogoIdx === -1) continue;
    if (redBoxAlready) {
      // Allerede patchet — bare verifiser at logo er sentrert i den
      page.objects[stripeLogoIdx].x = 8;
      page.objects[stripeLogoIdx].y = 2;
      page.objects[stripeLogoIdx].w = 52;
      page.objects[stripeLogoIdx].h = 8;
      stripePatches++;
      continue;
    }

    // Vi har en stripe på denne siden. Patch:
    //  1. Fjern rød rail (tynn 1.5mm-stripe venstre)
    //  2. Endre logo-bredde til å passe inn i en rød boks 4-60mm (56 bred)
    //  3. Sett inn ny rød boks RETT FØR logoen
    const stripeBg = page.objects[stripeBgIdx];
    const stripeLogo = page.objects[stripeLogoIdx];

    // Ny rød boks: x=4, y=0, w=60, h=12
    const redBoxX = 4;
    const redBoxY = 0;
    const redBoxW = 60;
    const redBoxH = 12;

    const redBox = {
      id: `obj_${Math.random().toString(36).slice(2, 9)}_redbox`,
      type: "shape",
      x: redBoxX,
      y: redBoxY,
      w: redBoxW,
      h: redBoxH,
      rot: 0,
      locked: false,
      props: { shape: "rect", fill: NEW_RED, radius: 0, stroke: null, strokeWidth: 0 },
    };

    // Posisjoner logo-en sentrert i den røde boksen
    // Logo-aspect ~11:1, så med h=8 trenger vi w=~52
    stripeLogo.x = redBoxX + 4;
    stripeLogo.y = 2;
    stripeLogo.w = 52;
    stripeLogo.h = 8;

    // Fjern den gamle røde rail-stripen hvis den finnes
    if (stripeRailIdx !== -1) {
      page.objects[stripeRailIdx] = null;
    }

    // Sett inn rød boks etter bakgrunn, før logo
    page.objects.splice(stripeBgIdx + 1, 0, redBox);

    // Rens null-verdier
    page.objects = page.objects.filter((o) => o !== null);
    stripePatches++;
  }
  console.log(`✓ Header oppdatert til profil-stil på ${stripePatches} sider (rød logo-boks)`);

  // ── 6. Egenprodusert-side (s.13): fjern F6261, behold kun F6860 ────
  let ftSpesialPagePatch = 0;
  for (const page of doc.pages) {
    let hasF6261 = false;
    let hasF6860 = false;
    for (const obj of page.objects) {
      if (obj.type === "productCard" && obj.props?.product) {
        const sku = (obj.props.product.sku || "").toUpperCase();
        const url = (obj.props.product.source_url || "").toUpperCase();
        if (sku === "F6261" || url.includes("F6261")) hasF6261 = true;
        if (sku === "F6860" || url.includes("F6860")) hasF6860 = true;
      }
    }
    if (hasF6261 && hasF6860) {
      // Dette er egenprodusert-siden. Fjern F6261.
      const before = page.objects.length;
      page.objects = page.objects.filter((obj) => {
        if (obj.type === "productCard" && obj.props?.product) {
          const sku = (obj.props.product.sku || "").toUpperCase();
          const url = (obj.props.product.source_url || "").toUpperCase();
          if (sku === "F6261" || url.includes("F6261")) return false;
        }
        return true;
      });

      // Sentrer F6860 hvis det er det eneste produktet igjen
      const remainingCards = page.objects.filter((o) => o.type === "productCard");
      if (remainingCards.length === 1) {
        const card = remainingCards[0];
        const W = page.w || 210;
        const newW = Math.min(card.w * 1.4, 140);
        card.x = (W - newW) / 2;
        card.w = newW;
        // Gjør litt høyere også
        card.h = Math.min(card.h * 1.1, 130);
      }

      ftSpesialPagePatch++;
      console.log(`  → Fjernet ${before - page.objects.length} objekt (F6261), sentrerte F6860`);
    }
  }
  console.log(`✓ Egenprodusert-side patchet (${ftSpesialPagePatch} treff)`);

  // ── Skriv tilbake ───────────────────────────────────────────────────
  doc.updatedAt = new Date().toISOString();

  console.log("\nSkriver patchet brosjyre tilbake til Supabase …");
  const { error: updateErr } = await supa
    .from("brochures")
    .update({ doc, updated_at: doc.updatedAt })
    .eq("id", BROCHURE_ID);

  if (updateErr) {
    console.error("Update-feil:", updateErr.message);
    process.exit(1);
  }

  console.log("✓ Ferdig — brosjyren er oppdatert til offisiell FT-profil");
  console.log(`\n  Åpne i editor: /brosjyre?id=${BROCHURE_ID}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
