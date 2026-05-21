import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll() {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("wera_product_cache")
      .select("code, name, image_url, raw_data")
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
  const rows = await fetchAll();

  // Distinct image_urls
  const urlCounts = {};
  for (const r of rows) {
    const u = r.image_url ?? "(NULL)";
    urlCounts[u] = (urlCounts[u] ?? 0) + 1;
  }

  const entries = Object.entries(urlCounts).sort((a, b) => b[1] - a[1]);
  console.log(`===== UNIKE BILDE-URLer =====`);
  console.log(`  Totale rader:       ${rows.length}`);
  console.log(`  Unike URL-er:       ${entries.length}`);
  console.log(`\n===== TOPP 10 MEST BRUKTE URL-ER =====`);
  for (const [url, count] of entries.slice(0, 10)) {
    console.log(`  ${count.toString().padStart(5)}  ${url.slice(0, 120)}`);
  }

  // % som peker til samme topp-URL
  const top = entries[0];
  const pctTop = ((top[1] / rows.length) * 100).toFixed(1);
  console.log(`\n  Topp-URL dekker:    ${pctTop}% av rader`);

  // Random sample of distinct URLs
  console.log(`\n===== 5 SAMPLES MED DISTINKTE NAVN =====`);
  const seenName = new Set();
  let shown = 0;
  for (const r of rows) {
    if (shown >= 5) break;
    if (!r.image_url) continue;
    const nameKey = r.name?.slice(0, 30);
    if (seenName.has(nameKey)) continue;
    seenName.add(nameKey);
    console.log(`  ${r.code}  ${r.name?.slice(0, 60).padEnd(60)}  →  ${r.image_url.slice(0, 90)}`);
    shown++;
  }

  // Check raw_data — see if it has product images we ignored
  console.log(`\n===== RAW_DATA KEYS (per rad) =====`);
  const keyCounts = {};
  for (const r of rows.slice(0, 100)) {
    if (r.raw_data && typeof r.raw_data === "object") {
      for (const k of Object.keys(r.raw_data)) {
        keyCounts[k] = (keyCounts[k] ?? 0) + 1;
      }
    }
  }
  console.log(`  Keys i raw_data (første 100 rader):`);
  for (const [k, v] of Object.entries(keyCounts)) {
    console.log(`    ${k.padEnd(25)} ${v}/100`);
  }

  // Look for image_url in raw_data
  console.log(`\n===== RAW_DATA SAMPLE (full) =====`);
  const sample = rows.find((r) => r.raw_data && Object.keys(r.raw_data).length > 1);
  if (sample) {
    console.log(`  Code: ${sample.code}, Name: ${sample.name}`);
    console.log(JSON.stringify(sample.raw_data, null, 2).slice(0, 2000));
  } else {
    console.log(`  Ingen rader med >1 keys i raw_data — bekrefter at scraperen lagrer kun title-feltet`);
  }
})();
