import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll() {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("wera_product_cache")
      .select("code, name, produktinformasjon_html, suggested_g1, suggested_g2, suggested_g3")
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

  // Tell HTML-blokker — sjekk hvor mange har de forskjellige seksjonene
  let withEgenskaper = 0;
  let withDetaljert = 0;
  let withSpecTable = 0;
  let withBruksomrader = 0;
  let withHvorfor = 0;
  let specRowsTotal = 0;

  for (const r of rows) {
    const html = r.produktinformasjon_html ?? "";
    if (html.includes("<h3>Egenskaper</h3>")) withEgenskaper++;
    if (html.includes("<h3>Detaljert beskrivelse</h3>")) withDetaljert++;
    if (html.includes("<h3>Tekniske spesifikasjoner</h3>")) {
      withSpecTable++;
      const trMatches = html.match(/<tr>/g);
      specRowsTotal += trMatches ? trMatches.length : 0;
    }
    if (html.includes("<h3>Bruksområder</h3>")) withBruksomrader++;
    if (html.includes("<h3>Hvorfor Wera?</h3>")) withHvorfor++;
  }

  console.log(`===== HTML-SEKSJONS-COVERAGE =====`);
  console.log(`  Egenskaper-bullets:       ${withEgenskaper}/${rows.length}  (${(withEgenskaper/rows.length*100).toFixed(1)}%)`);
  console.log(`  Detaljert beskrivelse:    ${withDetaljert}/${rows.length}  (${(withDetaljert/rows.length*100).toFixed(1)}%)`);
  console.log(`  Tekniske spesifikasjoner: ${withSpecTable}/${rows.length}  (${(withSpecTable/rows.length*100).toFixed(1)}%)`);
  console.log(`  Bruksområder:             ${withBruksomrader}/${rows.length}  (${(withBruksomrader/rows.length*100).toFixed(1)}%)`);
  console.log(`  Hvorfor Wera?:            ${withHvorfor}/${rows.length}  (${(withHvorfor/rows.length*100).toFixed(1)}%)`);
  console.log(`  Snitt spec-rader:         ${(specRowsTotal/Math.max(1,withSpecTable)).toFixed(1)} per produkt`);

  // Sjekk klassifiserings-impact: hvor mange uten g1 har lite HTML?
  const noG1 = rows.filter((r) => !r.suggested_g1);
  console.log(`\n===== 98 PRODUKTER UTEN G1 — kategorier de hører til =====`);
  const lengths = noG1.map((r) => r.produktinformasjon_html?.length ?? 0);
  lengths.sort((a, b) => a - b);
  console.log(`  HTML-lengde min/median/max: ${lengths[0]} / ${lengths[Math.floor(lengths.length/2)]} / ${lengths[lengths.length-1]}`);

  // Hva er navnene de mangler g1 for? Klyng opp
  const patterns = {
    bag_bag: noG1.filter((r) => /\b(belt|bag|pack|case|holster|magnetlist)\b/i.test(r.name ?? "")).length,
    sb_sb: noG1.filter((r) => /\bSB\b/i.test(r.name ?? "")).length,
    bicycle: noG1.filter((r) => /bicycle/i.test(r.name ?? "")).length,
    other: 0,
  };
  patterns.other = noG1.length - patterns.bag_bag - patterns.sb_sb - patterns.bicycle;
  console.log(`  Bag/belt/holster:         ${patterns.bag_bag}`);
  console.log(`  «SB»-suffix:              ${patterns.sb_sb}`);
  console.log(`  Bicycle:                  ${patterns.bicycle}`);
  console.log(`  Annet:                    ${patterns.other}`);

  // Sample 5 av de uten g1 med HTML-utdrag
  console.log(`\n===== 5 SAMPLE UTEN G1 =====`);
  for (const r of noG1.slice(0, 5)) {
    console.log(`  ${r.code}  ${r.name}`);
    console.log(`     HTML (${r.produktinformasjon_html?.length ?? 0} tegn): ${r.produktinformasjon_html?.slice(0, 200).replace(/\n/g, " ")}…`);
  }
})();
