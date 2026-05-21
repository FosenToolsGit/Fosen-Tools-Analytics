import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const code = process.argv[2] ?? "05032001001";

(async () => {
  const { data, error } = await supabase
    .from("wera_product_cache")
    .select("code, name, feature_bullets, raw_data, produktinformasjon_html")
    .eq("code", code)
    .single();
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`Code: ${data.code}`);
  console.log(`Name: ${data.name}`);
  console.log(`\nfeature_bullets (${data.feature_bullets?.length ?? 0}):`);
  for (const b of data.feature_bullets ?? []) console.log(`  - ${b}`);
  console.log(`\nraw_data.specs (${data.raw_data?.specs?.length ?? 0}):`);
  for (const s of data.raw_data?.specs ?? []) console.log(`  ${s.label.padEnd(35)} = ${s.value}`);
  console.log(`\nproduktinformasjon_html (${data.produktinformasjon_html?.length ?? 0} tegn):`);
  console.log(data.produktinformasjon_html?.slice(0, 500) + "…");
})();
