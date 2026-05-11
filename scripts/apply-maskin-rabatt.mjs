// Legger på -5% kampanjerabatt på alle maskiner i Husqvarna-brosjyren.
// Maskiner hadde -0% i scraping (ingen data-oldprice på fosen-tools.no),
// så vi setter en konstruert price_before = price_now / 0.95 = +5,26%.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const BROCHURE_ID = "04e778e8-5a05-42fd-b6bd-87da8e039bb5";
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const RABATT_PCT = 5; // -5% på maskiner

async function main() {
  const { data } = await supa.from("brochures").select("doc").eq("id", BROCHURE_ID).single();
  let updated = 0;

  for (const page of data.doc.pages) {
    for (const o of page.objects) {
      if (o.type !== "productCard") continue;
      const p = o.props.product;
      if (!p) continue;

      // Identifiser maskiner ved navn-matching
      const n = (p.name || "").toUpperCase();
      const erMaskin = /FS-?400|K-?770|K-?970|K-?4000|DM-?230|LF-?80|PP-?7|KAPPSAG|MOTORKAPPESAG|KRAFTAGGREGAT|PLATEVIBRATOR|KJERNEBORMASKIN/.test(n);
      if (!erMaskin) continue;
      if (n.includes("K 1 PACE") || n.includes("K1 PACE")) continue; // K1 PACE har egen combo-rabatt
      if (p.discount_pct && p.discount_pct > 0) continue; // Allerede rabatt

      // Sett kampanje-pris: nåværende pris er nå-pris, opprinnelig pris er rekonstruert
      // For å lage visuelle SPAR-effekt: nå = price_now, før = price_now / (1 - rabatt%/100)
      const before = Math.round(p.price_now / (1 - RABATT_PCT / 100));
      p.price_before = before;
      p.discount_pct = RABATT_PCT;
      updated++;
      console.log(`  ${p.name?.slice(0, 40)}: ${p.price_now} → før ${before} (-${RABATT_PCT}%)`);
    }
  }

  if (updated === 0) {
    console.log("Ingen maskiner trengte oppdatering.");
    return;
  }

  console.log(`\nOppdatert ${updated} maskiner med -${RABATT_PCT}% kampanjerabatt`);
  const { error } = await supa
    .from("brochures")
    .update({ doc: data.doc, updated_at: new Date().toISOString() })
    .eq("id", BROCHURE_ID);
  if (error) throw error;
  console.log("✓ Lagret");
}

main().catch(e => { console.error(e); process.exit(1); });
