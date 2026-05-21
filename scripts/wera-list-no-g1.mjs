/**
 * Lister alle Wera-produkter uten g1-klassifisering — arbeidsliste for manuell bulk-edit.
 * Outputter både til konsoll og til /tmp/wera-uten-g1.html som klikkbar arbeidsliste.
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fetchAll() {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("wera_product_cache")
      .select("code, name, suggested_g1, image_url, produktinformasjon_html")
      .is("suggested_g1", null)
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

function classifyGuess(name) {
  const n = (name ?? "").toLowerCase();
  if (/\bbelt\b|tekstilbelte/.test(n)) return "Oppbevaring / Belte";
  if (/\bbag\b|\bpack\b/.test(n)) return "Oppbevaring / Bag";
  if (/holster|case|holder/.test(n)) return "Oppbevaring";
  if (/magnetlist/.test(n)) return "Tilbehør / Magnetlist";
  if (/bicycle|sykkel/.test(n)) return "Skrutrekkere / Sett";
  if (/\bSB\b/i.test(name ?? "")) return "Skrutrekkere / Display-pakke";
  if (/skrutrekker|skrumeisel|kraftform/i.test(n)) return "Skrutrekkere";
  if (/pipe|zyklop|sokkel/i.test(n)) return "Piper og skraller";
  if (/nøkkel|joker|wrench/i.test(n)) return "Nøkler";
  if (/torque|moment/i.test(n)) return "Momentverktøy";
  if (/bits|bit-?box/i.test(n)) return "Skrutrekkere / Bits";
  return "??";
}

(async () => {
  const rows = await fetchAll();
  console.log(`Fant ${rows.length} produkter uten suggested_g1.\n`);

  // Grupper på navne-mønster
  const groups = new Map();
  for (const r of rows) {
    const guess = classifyGuess(r.name);
    if (!groups.has(guess)) groups.set(guess, []);
    groups.get(guess).push(r);
  }

  // Sortert utskrift
  console.log("===== GRUPPERT PÅ NAVN-MØNSTER =====\n");
  const sortedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [guess, list] of sortedGroups) {
    console.log(`${guess.padEnd(35)} ${list.length} stk`);
    for (const r of list.slice(0, 5)) {
      console.log(`  ${r.code}  ${r.name?.slice(0, 60)}`);
    }
    if (list.length > 5) console.log(`  … +${list.length - 5} til`);
    console.log();
  }

  // Skriv klikkbar arbeidsliste
  const htmlRows = rows.map((r) => {
    const guess = classifyGuess(r.name);
    return `
      <tr data-code="${r.code}">
        <td><input type="checkbox" class="done-check"></td>
        <td><code>${r.code}</code></td>
        <td>${(r.name ?? "").replace(/</g, "&lt;")}</td>
        <td><em>${guess}</em></td>
        <td><a href="https://www.wera.de/no/${r.code}" target="_blank">Åpne Wera-side ↗</a></td>
      </tr>`;
  }).join("");

  const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>Wera — ${rows.length} produkter uten G1-klassifisering</title>
<style>
  body { font-family: -apple-system, sans-serif; margin: 0; padding: 24px; background: #f5f7fa; color: #222; }
  h1 { margin: 0 0 8px; font-size: 24px; }
  .meta { color: #666; margin-bottom: 24px; font-size: 14px; }
  table { width: 100%; background: white; border-collapse: collapse; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  th, td { padding: 10px 14px; border-bottom: 1px solid #eaeaea; text-align: left; font-size: 14px; }
  th { background: #f0f2f5; font-weight: 600; position: sticky; top: 0; }
  tr:hover { background: #fafbfc; }
  tr.done { opacity: 0.4; background: #f0f7f0; }
  code { background: #f0f2f5; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
  em { color: #c43; font-style: normal; font-size: 13px; }
  a { color: #06c; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .progress { font-size: 14px; color: #393; font-weight: 600; }
</style>
</head><body>
<h1>${rows.length} Wera-produkter uten G1-klassifisering</h1>
<div class="meta">Auto-generert ${new Date().toISOString().slice(0, 16)} · Sjekk av-boksen når du har klassifisert en rad i Multicase. Progress lagres i browseren.</div>
<div class="meta">Progress: <span class="progress" id="progress">0 / ${rows.length}</span></div>
<table>
<thead><tr><th></th><th>Kode</th><th>Navn</th><th>Foreslått g1</th><th>Wera-side</th></tr></thead>
<tbody>${htmlRows}</tbody>
</table>
<script>
const KEY = "wera-no-g1-progress";
const saved = new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
const rows = document.querySelectorAll("tr[data-code]");
function updateProgress() {
  const done = document.querySelectorAll("tr.done").length;
  document.getElementById("progress").textContent = done + " / ${rows.length}".replace("\${rows.length}", "${rows.length}");
}
rows.forEach((tr) => {
  const code = tr.dataset.code;
  const cb = tr.querySelector(".done-check");
  if (saved.has(code)) { cb.checked = true; tr.classList.add("done"); }
  cb.addEventListener("change", () => {
    if (cb.checked) { saved.add(code); tr.classList.add("done"); }
    else { saved.delete(code); tr.classList.remove("done"); }
    localStorage.setItem(KEY, JSON.stringify([...saved]));
    updateProgress();
  });
});
updateProgress();
</script>
</body></html>`;

  writeFileSync("/tmp/wera-uten-g1.html", html, "utf-8");
  console.log(`\n✅ Klikkbar arbeidsliste lagret til /tmp/wera-uten-g1.html`);
  console.log(`   Åpne med:  open /tmp/wera-uten-g1.html`);
})();
