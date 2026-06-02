/**
 * uke-batch.ts — generér en uke FT-innlegg på én gang.
 *
 * Roterer mellom 5 komposisjons-typer slik at uken ikke kjennes lik:
 *   man → ft-referanse  (kunde-storytelling, mild uke-start)
 *   tir → ft-hdfi       (produkt-spotlight, sterk kontrast)
 *   ons → ft-definisjon (fagord, mer rolig — onsdag har lavest snitt)
 *   tor → ft-referanse  (best engasjement-dag, sterkeste leveranse)
 *   fre → ft-milepael   (uke-closer, jubileum/tall som varer i feeden)
 *   lør → ft-sitat      (kundesitat, mer atmosfærisk)
 *   søn → (hopp over — vi poster ikke søndag)
 *
 * Bruk:
 *   node --env-file=.env.local scripts/uke-batch.mjs --start 2026-06-02
 *
 * Med --data-dir <path>: leter etter `<type>-<YYYY-MM-DD>.json` filer
 * der; uten oppgitt fil bruker SAMPLE_*. Med --skip-render bygger den
 * bare caption + alt-tekst-mappene uten å rendre MP4.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
function arg(name: string, def?: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  return args[i + 1] ?? def;
}
function flag(name: string): boolean {
  return args.includes(`--${name}`);
}

const start = arg("start", new Date().toISOString().slice(0, 10));
const dataDir = arg("data-dir");
const formats = arg("formats", "reel,square,wide");
const skipRender = flag("skip-render");

type DayPlan = { dow: number; type: string; label: string };

// Uke-plan: mandag-til-lørdag (søndag hoppes over).
const PLAN: DayPlan[] = [
  { dow: 1, type: "ft-referanse", label: "Mandag — kunde-storytelling" },
  { dow: 2, type: "ft-hdfi", label: "Tirsdag — HDFI-spotlight" },
  { dow: 3, type: "ft-definisjon", label: "Onsdag — fagord (rolig dag)" },
  { dow: 4, type: "ft-referanse", label: "Torsdag — leveranse (peak)" },
  { dow: 5, type: "ft-milepael", label: "Fredag — milepæl (uke-closer)" },
  { dow: 6, type: "ft-sitat", label: "Lørdag — kundesitat" },
];

const startDate = new Date(start + "T00:00:00Z");
// Beregn mandag-i-uken fra start.
const startDow = startDate.getUTCDay(); // 0=søn, 1=man, ...
const offsetToMonday = startDow === 0 ? -6 : 1 - startDow;
const monday = new Date(startDate);
monday.setUTCDate(monday.getUTCDate() + offsetToMonday);

console.log(`\n📅 Uke-batch fra mandag ${monday.toISOString().slice(0, 10)}`);
console.log(`   ${formats} ${skipRender ? "(skip-render)" : ""}`);

for (const day of PLAN) {
  const d = new Date(monday);
  d.setUTCDate(monday.getUTCDate() + (day.dow - 1));
  const dateStr = d.toISOString().slice(0, 10);

  console.log(`\n── ${day.label} (${dateStr}) — ${day.type} ──`);

  const cmd: string[] = [
    "tsx",
    "scripts/dagens-innlegg.ts",
    "--type",
    day.type,
    "--date",
    dateStr,
  ];

  if (skipRender) {
    cmd.push("--formats", "noop");
  } else {
    cmd.push("--formats", formats || "reel");
  }

  // Plukk opp data-fil hvis den finnes
  if (dataDir) {
    const dataFile = join(dataDir, `${day.type}-${dateStr}.json`);
    if (existsSync(dataFile)) {
      cmd.push("--data", dataFile);
      console.log(`   data: ${dataFile}`);
    } else {
      console.log(`   data: (ingen — bruker SAMPLE_${day.type.toUpperCase().replace("-", "_")})`);
    }
  }

  const result = spawnSync("npx", cmd, {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.error(`   ⚠️  ${day.type} feilet, fortsetter med neste dag`);
  }
}

console.log(`\n✅ Uke-batch ferdig.`);
console.log(`\nÅpne i Finder:`);
console.log(`  open "out/dagens/${monday.toISOString().slice(0, 10).slice(0, 7)}-*"`);
