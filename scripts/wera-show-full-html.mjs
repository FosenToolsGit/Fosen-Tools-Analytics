import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data } = await supabase
    .from("wera_product_cache")
    .select("code, name, produktinformasjon_html")
    .eq("code", "05032001001")
    .single();

  console.log(`=== Produktkode: ${data.code} ===`);
  console.log(`=== Navn: ${data.name} ===`);
  console.log(`=== HTML-lengde: ${data.produktinformasjon_html?.length} tegn ===\n`);
  console.log(data.produktinformasjon_html);
})();
