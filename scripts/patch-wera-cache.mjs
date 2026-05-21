/**
 * Patch-script for wera_product_cache.
 *
 * Henter manglende produktegenskaper-bullets (.product-features) og
 * tekniske spesifikasjoner (.scrollsnaptable) for alle cachede Wera-produkter
 * og oppdaterer DB. Etterpå må «Re-klassifiser cache»-knappen kjøres i UIet
 * (eller curl mot /api/produkt-import/wera-reclassify-cache) for å
 * regenerere produktinformasjon_html med de nye dataene.
 *
 * Kjør med:
 *   node --env-file=.env.local scripts/patch-wera-cache.mjs
 *
 * Flagg:
 *   --only=05032001001,05032002001     Kun spesifikke koder
 *   --limit=50                          Begrens antall for testing
 *   --force                             Patch også koder som allerede har bullets
 *   --concurrency=4                     Parallelle workers (default 4)
 *   --start=0                           Start-offset (for resume)
 */

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);

const ONLY = args.only ? String(args.only).split(",").map((s) => s.trim()).filter(Boolean) : null;
const LIMIT = args.limit ? parseInt(args.limit, 10) : null;
const FORCE = args.force === true || args.force === "true";
const CONCURRENCY = args.concurrency ? parseInt(args.concurrency, 10) : 4;
const START = args.start ? parseInt(args.start, 10) : 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function weraProductUrl(code) {
  return `https://www.wera.de/no/${code}`;
}

/**
 * Scraper KUN produktegenskaper-bullets og scrollsnaptable-specs.
 * Mye lettere enn full scrape — vi har allerede navn, bilder, HTML, etc.
 */
async function patchOne(context, code) {
  const page = await context.newPage();
  try {
    const response = await page.goto(weraProductUrl(code), {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    if (!response || response.status() >= 400) return null;
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);

    // Vent eksplisitt på at minst ett produkt-feature-element eller scrollsnaptable er rendret
    await page.waitForSelector(".product-features, .scrollsnaptable", { timeout: 8000 }).catch(() => undefined);

    const data = await page.evaluate((targetCode) => {
      // === BULLETS ===
      const featureBullets = [];
      const featureNodes = Array.from(
        document.querySelectorAll(".product-features .feature-icon .feature-icon-text")
      );
      for (const node of featureNodes) {
        const t = node.textContent?.trim() ?? "";
        if (t.length >= 2 && t.length <= 100) featureBullets.push(t);
      }

      // === SCROLLSNAPTABLE SPECS ===
      const specs = [];
      const snapTables = Array.from(document.querySelectorAll(".scrollsnaptable"));
      for (const table of snapTables) {
        const cells = Array.from(table.querySelectorAll(".scrollsnaptable-cell"));
        const grid = {};
        let maxRow = 0;
        let maxCol = 0;
        for (const cell of cells) {
          const cls = cell.className;
          const rowMatch = cls.match(/\brow-(\d+)\b/);
          const colMatch = cls.match(/\bcolumn-(\d+)\b/);
          if (rowMatch && colMatch) {
            const r = parseInt(rowMatch[1], 10);
            const c = parseInt(colMatch[1], 10);
            grid[`${r}_${c}`] = cell.textContent?.trim() ?? "";
            if (r > maxRow) maxRow = r;
            if (c > maxCol) maxCol = c;
          }
        }

        // Finn vår produktkode i row-0
        let myColumn = -1;
        for (let col = 1; col <= maxCol; col++) {
          const cellText = (grid[`0_${col}`] ?? "").replace(/\s+/g, "");
          if (cellText === targetCode) {
            myColumn = col;
            break;
          }
        }
        if (myColumn < 0) continue;

        const labelCells = Array.from(table.querySelectorAll(".scrollsnaptable-cell--text-start"));
        for (const lc of labelCells) {
          const cls = lc.className;
          const rowMatch = cls.match(/\brow-(\d+)\b/);
          if (!rowMatch) continue;
          const r = parseInt(rowMatch[1], 10);
          if (r === 0) continue;

          const labelEl = lc.querySelector(".label");
          const unitEl = lc.querySelector(".unit");
          const label = labelEl ? (labelEl.textContent?.trim() ?? "") : (lc.textContent?.trim() ?? "");
          const unit = unitEl ? (unitEl.textContent?.trim() ?? "") : "";
          if (!label) continue;
          if (/skriv opp|huskelisten/i.test(label)) continue;
          if (/^merk$/i.test(label)) continue;

          const value = (grid[`${r}_${myColumn}`] ?? "").trim();
          if (!value || value === " " || /^\(?-?\)?$/.test(value) || value === "&nbsp;") continue;

          const fullLabel = unit ? `${label} (${unit.replace(/^\s*/, "")})` : label;
          specs.push({ label: fullLabel, value });
        }
      }

      return { featureBullets, specs };
    }, code);

    return data;
  } catch (err) {
    console.error(`  [${code}] feil:`, err.message);
    return null;
  } finally {
    await page.close().catch(() => undefined);
  }
}

async function fetchTargets() {
  if (ONLY) {
    const { data, error } = await supabase
      .from("wera_product_cache")
      .select("code, feature_bullets, raw_data")
      .in("code", ONLY);
    if (error) throw error;
    return data ?? [];
  }
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("wera_product_cache")
      .select("code, feature_bullets, raw_data")
      .order("code")
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

(async () => {
  console.log("Patch-script for wera_product_cache");
  console.log("Flags:", { ONLY, LIMIT, FORCE, CONCURRENCY, START });

  let targets = await fetchTargets();
  console.log(`Hentet ${targets.length} cache-rader.`);

  if (!FORCE) {
    const before = targets.length;
    targets = targets.filter((r) => !Array.isArray(r.feature_bullets) || r.feature_bullets.length === 0);
    console.log(`Filtrerte til ${targets.length} uten bullets (skipper ${before - targets.length} som allerede er patched).`);
  }

  if (START > 0) targets = targets.slice(START);
  if (LIMIT) targets = targets.slice(0, LIMIT);

  if (targets.length === 0) {
    console.log("Ingenting å patche.");
    process.exit(0);
  }

  console.log(`\nPatcher ${targets.length} produkter med concurrency=${CONCURRENCY}…\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "nb-NO",
    viewport: { width: 1280, height: 800 },
  });

  let done = 0;
  let okCount = 0;
  let bulletsFound = 0;
  let specsFound = 0;
  let failedCodes = [];
  const startMs = Date.now();
  const updates = [];

  const worker = async () => {
    while (true) {
      const idx = done++;
      if (idx >= targets.length) return;
      const code = targets[idx].code;
      const existingRawData = targets[idx].raw_data ?? {};

      const result = await patchOne(context, code);
      const i = idx + 1;
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(0);
      const rate = (i / Math.max(1, (Date.now() - startMs) / 1000)).toFixed(2);

      if (!result) {
        failedCodes.push(code);
        process.stdout.write(`  [${i}/${targets.length}]  ${code}  ❌ failed  (${elapsed}s, ${rate}/s)\n`);
        continue;
      }
      const fb = result.featureBullets.length;
      const sc = result.specs.length;
      if (fb > 0) bulletsFound++;
      if (sc > 0) specsFound++;
      okCount++;

      // Behold eksisterende title men oppdater specs i raw_data
      const newRawData = { ...existingRawData, specs: result.specs };

      updates.push({
        code,
        feature_bullets: result.featureBullets,
        raw_data: newRawData,
      });
      process.stdout.write(`  [${i}/${targets.length}]  ${code}  bullets=${fb}  specs=${sc}  (${elapsed}s, ${rate}/s)\n`);

      // Flush DB i batches av 50
      if (updates.length >= 50) {
        const batch = updates.splice(0, updates.length);
        const { error } = await supabase.from("wera_product_cache").upsert(batch, { onConflict: "code" });
        if (error) console.error("  DB upsert-feil:", error.message);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Flush gjenværende
  if (updates.length > 0) {
    const { error } = await supabase.from("wera_product_cache").upsert(updates, { onConflict: "code" });
    if (error) console.error("  Final DB upsert-feil:", error.message);
  }

  await context.close();
  await browser.close();

  const totalSec = ((Date.now() - startMs) / 1000).toFixed(0);
  console.log(`\n===== FERDIG =====`);
  console.log(`  Total tid:        ${totalSec}s`);
  console.log(`  OK:               ${okCount}/${targets.length}`);
  console.log(`  Med bullets:      ${bulletsFound}`);
  console.log(`  Med specs:        ${specsFound}`);
  console.log(`  Failed:           ${failedCodes.length}`);
  if (failedCodes.length > 0 && failedCodes.length < 50) {
    console.log(`  Failed codes:`);
    failedCodes.forEach((c) => console.log(`    ${c}`));
  }
  console.log(`\nNeste steg:`);
  console.log(`  1. Verifiser i DB at feature_bullets + raw_data.specs er fylt`);
  console.log(`  2. Kjør «Re-klassifiser cache»-knappen i UIet (eller curl POST mot /api/produkt-import/wera-reclassify-cache)`);
  console.log(`     for å regenerere produktinformasjon_html med bullets + specs.`);
})();
