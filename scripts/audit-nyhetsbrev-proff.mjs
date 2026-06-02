/**
 * Lister alle nyhetsbrev-utkast og hver streng som inneholder "PROFF"
 * eller "butikk" så vi kan visuelt verifisere at språket er konsistent.
 */

import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await sb
  .from("newsletter_wizard_drafts")
  .select("*")
  .order("updated_at", { ascending: false });

if (error) { console.error(error); process.exit(1); }

console.log(`\nFant ${data.length} utkast.\n`);

function* walkStrings(obj, path = "") {
  if (typeof obj === "string") {
    yield { path, value: obj };
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) yield* walkStrings(obj[i], `${path}[${i}]`);
  } else if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) yield* walkStrings(obj[k], path ? `${path}.${k}` : k);
  }
}

const KEYWORDS = /proff|butikk|åpn|åpne|gjenåpn/i;

for (const row of data) {
  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`TITTEL: ${row.title || "(uten tittel)"}`);
  console.log(`id:     ${row.id}`);
  console.log(`status: ${row.status}`);
  console.log(`oppdatert: ${row.updated_at}`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  const hits = [];
  for (const s of walkStrings(row.wizard_state ?? {}, "wizard_state")) {
    if (KEYWORDS.test(s.value)) hits.push(s);
  }
  if (hits.length === 0) {
    console.log("  (ingen PROFF/butikk/åpne-treff)");
    continue;
  }
  for (const h of hits) {
    const trimmed = h.value.length > 200 ? h.value.substring(0, 200) + "…" : h.value;
    console.log(`  ${h.path}:`);
    console.log(`    "${trimmed}"\n`);
  }
}
