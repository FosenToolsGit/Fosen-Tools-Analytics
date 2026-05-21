// Quality check for wera_product_cache
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

const FIELDS = [
  "name",
  "drive_type",
  "profile",
  "size_mm",
  "length_mm",
  "image_url",
  "application_notes",
  "suggested_g1",
  "suggested_g2",
  "suggested_g3",
  "produktinformasjon_html",
  "feature_bullets",
  "description_sections",
];

async function fetchAll() {
  const all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("wera_product_cache")
      .select(
        "code, name, drive_type, profile, size_mm, length_mm, image_url, is_vde, application_notes, suggested_g1, suggested_g2, suggested_g3, produktinformasjon_html, feature_bullets, description_sections, scraped_at, expires_at"
      )
      .order("scraped_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function pct(n, total) {
  return total === 0 ? "0.0%" : ((n / total) * 100).toFixed(1) + "%";
}

function lenOk(v, min = 1) {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length >= min;
  if (Array.isArray(v)) return v.length >= min;
  if (typeof v === "object") return Object.keys(v).length >= min;
  return true;
}

(async () => {
  console.log("Henter alle rader…");
  const rows = await fetchAll();
  console.log(`Total: ${rows.length} rader\n`);

  // 1. Field coverage (non-null / non-empty)
  console.log("===== FIELD COVERAGE (ikke-tom) =====");
  for (const f of FIELDS) {
    const have = rows.filter((r) => lenOk(r[f])).length;
    console.log(`  ${f.padEnd(28)} ${have}/${rows.length}  (${pct(have, rows.length)})`);
  }

  // 2. HTML length distribution
  const htmlLens = rows.map((r) => (r.produktinformasjon_html?.length ?? 0));
  htmlLens.sort((a, b) => a - b);
  const median = htmlLens[Math.floor(htmlLens.length / 2)];
  const p10 = htmlLens[Math.floor(htmlLens.length * 0.1)];
  const p90 = htmlLens[Math.floor(htmlLens.length * 0.9)];
  const zero = htmlLens.filter((l) => l === 0).length;
  console.log(`\n===== HTML-LENGDE =====`);
  console.log(`  Med 0 tegn (mangler):  ${zero}  (${pct(zero, rows.length)})`);
  console.log(`  p10 / median / p90:    ${p10} / ${median} / ${p90}`);
  console.log(`  Min / max:             ${htmlLens[0]} / ${htmlLens[htmlLens.length - 1]}`);

  // 3. Feature bullets distribution
  const bulletCounts = rows.map((r) => (Array.isArray(r.feature_bullets) ? r.feature_bullets.length : 0));
  const noBullets = bulletCounts.filter((c) => c === 0).length;
  const avgBullets = bulletCounts.reduce((s, c) => s + c, 0) / bulletCounts.length;
  console.log(`\n===== FEATURE BULLETS =====`);
  console.log(`  Uten bullets:          ${noBullets}  (${pct(noBullets, rows.length)})`);
  console.log(`  Snitt antall:          ${avgBullets.toFixed(1)}`);

  // 4. Classification quality
  console.log(`\n===== KLASSIFISERING =====`);
  const g1Top = {};
  const g1NullCount = rows.filter((r) => !r.suggested_g1).length;
  for (const r of rows) {
    const k = r.suggested_g1 ?? "(NULL)";
    g1Top[k] = (g1Top[k] ?? 0) + 1;
  }
  console.log(`  Uten g1-klassifisering: ${g1NullCount}  (${pct(g1NullCount, rows.length)})`);
  console.log(`  Top g1 (Produktgruppe 1):`);
  Object.entries(g1Top)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([k, v]) => console.log(`    ${k.padEnd(40)} ${v}  (${pct(v, rows.length)})`));

  // 5. VDE products
  const vdeCount = rows.filter((r) => r.is_vde === true).length;
  console.log(`\n===== VDE (isolert) =====`);
  console.log(`  Antall:                ${vdeCount}  (${pct(vdeCount, rows.length)})`);

  // 6. Bilde-URL gyldighet
  const noImg = rows.filter((r) => !r.image_url).length;
  const wraltImg = rows.filter((r) => r.image_url && !r.image_url.startsWith("https://")).length;
  console.log(`\n===== BILDE-URL =====`);
  console.log(`  Uten bilde:            ${noImg}  (${pct(noImg, rows.length)})`);
  console.log(`  Ikke https://:         ${wraltImg}  (${pct(wraltImg, rows.length)})`);

  // 7. Tid: når ble de scraped?
  const dates = rows.map((r) => r.scraped_at).filter(Boolean).sort();
  console.log(`\n===== SCRAPED_AT =====`);
  console.log(`  Første:                ${dates[0]}`);
  console.log(`  Siste:                 ${dates[dates.length - 1]}`);

  // 8. Sample worst-quality rows
  console.log(`\n===== KVALITETS-FLAGGS =====`);
  const noName = rows.filter((r) => !lenOk(r.name)).length;
  const noG1 = rows.filter((r) => !lenOk(r.suggested_g1)).length;
  const noHtml = rows.filter((r) => !lenOk(r.produktinformasjon_html, 100)).length;
  const noBulletsAndNoHtml = rows.filter(
    (r) => !lenOk(r.produktinformasjon_html, 100) && (!Array.isArray(r.feature_bullets) || r.feature_bullets.length === 0)
  ).length;
  console.log(`  Uten navn:                       ${noName}`);
  console.log(`  Uten g1:                         ${noG1}`);
  console.log(`  HTML < 100 tegn:                 ${noHtml}`);
  console.log(`  Verken HTML eller bullets:       ${noBulletsAndNoHtml}`);
})();
