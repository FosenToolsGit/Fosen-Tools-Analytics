/**
 * Spot-sjekker description_sections + produktinformasjon_html for noise:
 *   - Nyhetsbrev-promo
 *   - App-promo (tysk tekst)
 *   - "Tool Rebels"-jargon
 *   - Footer / kontakt-tekst
 *   - Engelsk/tysk fragmenter som ikke skulle vært der
 */

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const NOISE_PATTERNS = [
  { name: "Nyhetsbrev-promo (norsk)", re: /nyhetsbrev|abonnere|påmelding/i },
  { name: "App-promo (tysk)", re: /\bist die app\b|\bWera Tools ist\b|werkzeuge.+blog/i },
  { name: "App-promo (norsk)", re: /\bWera-appen|last ned appen|tilgjengelig i App Store/i },
  { name: "Tool Rebels jargon", re: /tool rebels?/i },
  { name: "Engelsk fragment", re: /\b(?:click here|find out|learn more|read more|discover)\b/i },
  { name: "Tysk fragment", re: /\b(?:erfahren sie|finden sie|der nutzer|aktuelles in unserem|umfangreiche)\b/i },
  { name: "Footer-tekst", re: /personvern|cookies?|copyright|©|kontakt oss|finn oss/i },
  { name: "Skumstoff-innlegg-section", re: /skumstoff\w*innlegg/i },
];

async function fetchAll() {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("wera_product_cache")
      .select("code, name, produktinformasjon_html, description_sections")
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
  console.log(`Sjekker ${rows.length} rader for noise…\n`);

  // 1. Sjekk noise i FINAL HTML (det som faktisk lagres i Multicase)
  console.log("===== NOISE i produktinformasjon_html (det som går til Multicase) =====");
  for (const { name, re } of NOISE_PATTERNS) {
    const hits = rows.filter((r) => re.test(r.produktinformasjon_html ?? ""));
    if (hits.length > 0) {
      console.log(`\n  🟡  ${name}: ${hits.length} rader`);
      for (const h of hits.slice(0, 3)) {
        const m = (h.produktinformasjon_html ?? "").match(re);
        const idx = m?.index ?? 0;
        const snippet = (h.produktinformasjon_html ?? "")
          .slice(Math.max(0, idx - 40), idx + 100)
          .replace(/\s+/g, " ");
        console.log(`     ${h.code}: …${snippet}…`);
      }
      if (hits.length > 3) console.log(`     … +${hits.length - 3} til`);
    } else {
      console.log(`  ✅  ${name}: 0 rader`);
    }
  }

  // 2. Sjekk RAW description_sections (kan inneholde noise som filtreres bort av pickBestSections)
  console.log(`\n\n===== NOISE i description_sections (RAW — før HTML-generator-filter) =====`);
  for (const { name, re } of NOISE_PATTERNS) {
    const hits = rows.filter((r) => {
      const sections = r.description_sections ?? [];
      return sections.some((s) => re.test(s.heading ?? "") || re.test(s.text ?? ""));
    });
    if (hits.length > 0) {
      console.log(`  🟡  ${name}: ${hits.length} rader (filtreres bort av pickBestSections — ikke synlig i Multicase)`);
    } else {
      console.log(`  ✅  ${name}: 0 rader`);
    }
  }

  // 3. Plukk 10 tilfeldige produkter og sjekk HTML manuelt
  console.log(`\n\n===== 10 TILFELDIGE HTML-EKSEMPLER (300 første tegn) =====`);
  const shuffled = [...rows].sort(() => Math.random() - 0.5).slice(0, 10);
  for (const r of shuffled) {
    console.log(`\n--- ${r.code}  ${r.name?.slice(0, 50)} ---`);
    const txt = (r.produktinformasjon_html ?? "").replace(/\n/g, " ").replace(/\s+/g, " ");
    console.log(`  Lengde: ${txt.length} tegn`);
    console.log(`  Start:  ${txt.slice(0, 250)}…`);
  }
})();
