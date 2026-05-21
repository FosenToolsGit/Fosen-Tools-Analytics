import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll() {
  const all = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("wera_product_cache")
      .select(
        "code, name, drive_type, profile, size_mm, length_mm, image_url, is_vde, application_notes, suggested_g1, suggested_g2, suggested_g3, produktinformasjon_html, feature_bullets, description_sections, raw_data"
      )
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

(async () => {
  const rows = await fetchAll();

  // 1. Sample 3 different classifications
  console.log("===== 3 SAMPLE-RADER =====\n");
  const skrutrekker = rows.find((r) => r.suggested_g1 === "Skrutrekkere" && r.drive_type);
  const piper = rows.find((r) => r.suggested_g1 === "Piper og skraller" && r.profile);
  const nokler = rows.find((r) => r.suggested_g1 === "Nøkler");

  for (const r of [skrutrekker, piper, nokler].filter(Boolean)) {
    console.log(`\n--- ${r.code} ---`);
    console.log(`  name:           ${r.name}`);
    console.log(`  drive_type:     ${r.drive_type}`);
    console.log(`  profile:        ${r.profile}`);
    console.log(`  size_mm:        ${r.size_mm}`);
    console.log(`  length_mm:      ${r.length_mm}`);
    console.log(`  is_vde:         ${r.is_vde}`);
    console.log(`  classification: ${r.suggested_g1} > ${r.suggested_g2} > ${r.suggested_g3}`);
    console.log(`  image_url:      ${r.image_url?.slice(0, 100)}…`);
    console.log(`  application_notes: ${r.application_notes ?? "(NULL)"}`);
    console.log(`  feature_bullets: ${JSON.stringify(r.feature_bullets)}`);
    console.log(`  description_sections (keys): ${Object.keys(r.description_sections ?? {}).join(", ")}`);
    console.log(`  produktinformasjon_html (${r.produktinformasjon_html?.length ?? 0} tegn):`);
    console.log(`    ${r.produktinformasjon_html?.slice(0, 400).replace(/\n/g, " ")}…`);
  }

  // 2. Sample rows uten g1 (de 98)
  console.log(`\n\n===== UTEN G1 (sample 10) =====`);
  const noG1 = rows.filter((r) => !r.suggested_g1).slice(0, 10);
  for (const r of noG1) {
    console.log(`  ${r.code}  |  ${r.name}`);
  }

  // 3. raw_data structure (any one)
  const sample = rows[0];
  if (sample?.raw_data) {
    console.log(`\n===== RAW_DATA STRUKTUR (første rad) =====`);
    if (typeof sample.raw_data === "object") {
      for (const [k, v] of Object.entries(sample.raw_data)) {
        const t = Array.isArray(v) ? `array[${v.length}]` : typeof v;
        const preview = typeof v === "string" ? v.slice(0, 80) : Array.isArray(v) ? `[${v.slice(0, 3).map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(", ")}]` : JSON.stringify(v).slice(0, 80);
        console.log(`  ${k.padEnd(25)} (${t.padEnd(12)}) ${preview}`);
      }
    }
  }

  // 4. Hva sier description_sections (sample)
  const dsSample = rows.find((r) => r.description_sections && Object.keys(r.description_sections).length > 0);
  if (dsSample) {
    console.log(`\n===== DESCRIPTION_SECTIONS SAMPLE (${dsSample.code}) =====`);
    for (const [k, v] of Object.entries(dsSample.description_sections)) {
      const preview = typeof v === "string" ? v.slice(0, 200).replace(/\s+/g, " ") : JSON.stringify(v).slice(0, 200);
      console.log(`  [${k}]:`);
      console.log(`    ${preview}…`);
    }
  }

  // 5. G3 fordeling for Skrutrekkere
  console.log(`\n===== G3-FORDELING for Skrutrekkere =====`);
  const skrutrekkere = rows.filter((r) => r.suggested_g1 === "Skrutrekkere");
  const g3Counts = {};
  for (const r of skrutrekkere) {
    const k = r.suggested_g3 ?? "(NULL)";
    g3Counts[k] = (g3Counts[k] ?? 0) + 1;
  }
  Object.entries(g3Counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([k, v]) => console.log(`  ${k.padEnd(40)} ${v}`));

  // 6. G3 fordeling for Piper og skraller
  console.log(`\n===== G3-FORDELING for Piper og skraller =====`);
  const piperList = rows.filter((r) => r.suggested_g1 === "Piper og skraller");
  const piperG3 = {};
  for (const r of piperList) {
    const k = r.suggested_g3 ?? "(NULL)";
    piperG3[k] = (piperG3[k] ?? 0) + 1;
  }
  Object.entries(piperG3)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k.padEnd(40)} ${v}`));
})();
