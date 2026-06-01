/**
 * Renderer alle 10 reels for uke 1.-7. juni 2026 sekvensielt.
 *
 * Hver reel tar 2-5 min via headless Chromium. Sekvensielt for å
 * unngå å overwhelme CPU/minne. Re-rendrer hvis composition er
 * ReferanseSpotlight (ny FT-stil), ellers skipper hvis video.mp4
 * allerede finnes.
 *
 *   node --env-file=.env.local scripts/render-all-uke-1-juni.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderVideo } from "../src/lib/services/video-render.ts";

const ROOT = "out/innlegg-uke-1-juni-2026";

const TYPE_MAP = {
  ProduktSpotlight: "produkt-spotlight",
  LeveranseReel: "leveranse-reel",
  MilepaelClip: "milepael",
  KampanjeTeaser: "kampanje-teaser",
  SitatClip: "sitat",
  HdfiHero: "hdfi-hero",
  KundeLeveranseV2: "kunde-leveranse-v2",
  HdfiBeforeAfter: "hdfi-before-after",
  TeamPortrett: "team-portrett",
  CADLABProsess: "cadlab-prosess",
  ReferanseSpotlight: "referanse-spotlight",
  Definisjon: "definisjon",
  HeroPoster: "hero-poster",
};

// Komposisjoner vi alltid re-rendrer (ny FT-stil per 2026-06-01)
const FORCE_RERENDER = new Set([
  "ReferanseSpotlight",
  "Definisjon",
  "HeroPoster",
]);

const folders = readdirSync(ROOT)
  .filter((name) => statSync(join(ROOT, name)).isDirectory())
  .filter((name) => existsSync(join(ROOT, name, "render-config.json")))
  .sort();

console.log(`📹 ${folders.length} reels å rendre`);

let done = 0;
let skipped = 0;
let failed = 0;

const t0 = performance.now();

for (const folder of folders) {
  const folderPath = join(ROOT, folder);
  const videoPath = join(folderPath, "video.mp4");
  const configPath = join(folderPath, "render-config.json");

  const cfg = JSON.parse(readFileSync(configPath, "utf8"));
  const type = TYPE_MAP[cfg.composition];
  if (!type) {
    console.error(`  ❌ ${folder}: ukjent composition ${cfg.composition}`);
    failed++;
    continue;
  }

  if (existsSync(videoPath) && !FORCE_RERENDER.has(cfg.composition)) {
    console.log(`  ⏭️  ${folder} (allerede rendret)`);
    skipped++;
    continue;
  }

  process.stdout.write(`  ▸ ${folder} ... `);
  const t = performance.now();
  try {
    const result = await renderVideo({ type, data: cfg.data }, () => {
      // ingen per-frame-progress for å holde output ren
    });
    writeFileSync(videoPath, result.buffer);
    const dur = ((performance.now() - t) / 1000).toFixed(1);
    const mb = (result.buffer.byteLength / 1024 / 1024).toFixed(1);
    console.log(`✓ ${mb} MB (${dur}s)`);
    done++;
  } catch (e) {
    console.log(`❌ ${e.message}`);
    failed++;
  }
}

const totalMin = ((performance.now() - t0) / 1000 / 60).toFixed(1);
console.log(`\n✅ Ferdig: ${done} rendret, ${skipped} skipped, ${failed} feilet. Tid: ${totalMin} min.`);
