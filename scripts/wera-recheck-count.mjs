import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { count: total } = await supabase
    .from("wera_product_cache")
    .select("*", { count: "exact", head: true });
  const { count: noG1 } = await supabase
    .from("wera_product_cache")
    .select("*", { count: "exact", head: true })
    .is("suggested_g1", null);
  const { count: noBullets } = await supabase
    .from("wera_product_cache")
    .select("*", { count: "exact", head: true })
    .or("feature_bullets.is.null,feature_bullets.eq.{}");
  console.log("Total:", total);
  console.log("Uten G1:", noG1);
  console.log("Uten feature_bullets:", noBullets);

  // Hent siste 5 oppdaterte rader for å se scraped_at
  const { data: recent } = await supabase
    .from("wera_product_cache")
    .select("code, name, scraped_at, suggested_g1, feature_bullets")
    .order("scraped_at", { ascending: false })
    .limit(5);
  console.log("\nSiste oppdaterte rader:");
  for (const r of recent ?? []) {
    console.log(`  ${r.scraped_at}  ${r.code}  g1=${r.suggested_g1 ?? "NULL"}  bullets=${r.feature_bullets?.length ?? "NULL"}  ${r.name?.slice(0, 40)}`);
  }
})();
