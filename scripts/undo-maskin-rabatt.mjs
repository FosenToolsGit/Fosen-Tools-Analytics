// Reverserer -5% rabatten på maskiner — setter price_before = price_now og discount_pct = 0
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const BROCHURE_ID = "04e778e8-5a05-42fd-b6bd-87da8e039bb5";
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data } = await supa.from("brochures").select("doc").eq("id", BROCHURE_ID).single();
let updated = 0;

for (const page of data.doc.pages) {
  for (const o of page.objects) {
    if (o.type !== "productCard") continue;
    const p = o.props.product;
    if (!p) continue;
    const n = (p.name || "").toUpperCase();
    const erMaskin = /FS-?400|K-?770|K-?970|K-?4000|DM-?230|LF-?80|PP-?7|KAPPSAG|MOTORKAPPESAG|KRAFTAGGREGAT|PLATEVIBRATOR|KJERNEBORMASKIN/.test(n);
    if (!erMaskin || n.includes("K 1 PACE") || n.includes("K1 PACE")) continue;
    // Reverser: før-pris = nå-pris, discount_pct = 0
    if (p.discount_pct === 5) {
      p.price_before = p.price_now;
      p.discount_pct = 0;
      updated++;
    }
  }
}

console.log(`Reverserte ${updated} maskiner`);
await supa.from("brochures").update({ doc: data.doc, updated_at: new Date().toISOString() }).eq("id", BROCHURE_ID);
console.log("✓ Lagret");
