import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll() {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("wera_product_cache")
      .select("code, name, suggested_g1, suggested_g3")
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
  const rows = await fetchAll();

  // Pluk fra ulike G1/G3-kombinasjoner — sikrer dekning på tvers av produkttyper
  const buckets = new Map();
  for (const r of rows) {
    const key = `${r.suggested_g1 ?? "?"}/${r.suggested_g3 ?? "?"}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(r);
  }

  const picked = [];
  for (const [key, list] of buckets) {
    if (picked.length >= 30) break;
    if (list.length === 0) continue;
    // Plukk én tilfeldig fra hver bucket
    const r = list[Math.floor(Math.random() * list.length)];
    picked.push({ key, code: r.code, name: r.name });
  }

  console.log("Plukk fra ulike G1/G3-buckets:");
  for (const p of picked) {
    console.log(`  ${p.key.padEnd(40)}  ${p.code}  ${p.name?.slice(0, 50)}`);
  }
  console.log(`\nCodes (comma-separert):`);
  console.log(picked.map((p) => p.code).join(","));
})();
