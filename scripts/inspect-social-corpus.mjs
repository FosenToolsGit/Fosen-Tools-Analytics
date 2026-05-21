import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data, error } = await supabase
    .from("social_corpus")
    .select("kind, slug, title, content, metadata, active")
    .order("kind")
    .order("slug");
  if (error) { console.error(error); process.exit(1); }

  // Grupper per kind
  const byKind = {};
  for (const row of data ?? []) {
    if (!byKind[row.kind]) byKind[row.kind] = [];
    byKind[row.kind].push(row);
  }

  console.log("=== SOCIAL CORPUS OVERSIKT ===\n");
  for (const [kind, rows] of Object.entries(byKind)) {
    const active = rows.filter((r) => r.active).length;
    console.log(`${kind.padEnd(20)} ${rows.length} entries (${active} aktive)`);
    for (const r of rows) {
      const flag = r.active ? "✓" : "✗";
      console.log(`  ${flag}  ${r.slug.padEnd(25)} ${r.title?.slice(0, 60)}  (${r.content?.length} tegn)`);
    }
    console.log();
  }

  // Vis innhold av HDFI-relaterte og kompani-entries
  console.log("\n=== HDFI/KOMPANI INNHOLD (full) ===");
  for (const row of data ?? []) {
    if (/hdfi|company|fosen|cadlab|product/i.test(row.kind + " " + row.slug + " " + row.title)) {
      console.log(`\n--- ${row.kind} / ${row.slug}: ${row.title} ---`);
      console.log(row.content);
      if (row.metadata && Object.keys(row.metadata).length) {
        console.log("metadata:", JSON.stringify(row.metadata));
      }
    }
  }

  // Vis voice + visual_rules
  console.log("\n\n=== VOICE + VISUAL_RULES ===");
  for (const row of data ?? []) {
    if (["voice", "visual_rules", "palette", "typography"].includes(row.kind)) {
      console.log(`\n--- ${row.kind} / ${row.slug}: ${row.title} ---`);
      console.log(row.content?.slice(0, 800));
    }
  }

  // Topp-poster
  console.log("\n\n=== TOPP-POSTER ===");
  for (const row of data ?? []) {
    if (row.kind === "top_post") {
      console.log(`\n--- ${row.slug}: ${row.title} ---`);
      console.log(row.content?.slice(0, 500));
    }
  }

  // Rejected patterns
  console.log("\n\n=== AVVISTE MØNSTRE ===");
  for (const row of data ?? []) {
    if (row.kind === "rejected_pattern") {
      console.log(`\n--- ${row.slug}: ${row.title} ---`);
      console.log(row.content?.slice(0, 400));
    }
  }
})();
