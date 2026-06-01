/**
 * regenerate-uke-1-juni.mjs — oppdaterer hele out/innlegg-uke-1-juni-2026/
 * med ny FT-stil per juni 2026:
 *
 *   - REELS (10):
 *       Oppdaterer render-config.json til ReferanseSpotlight
 *       (gammel composition lagres som "_previous_composition" for sporing).
 *       Behold render.sh som er nå generisk via TYPE_MAP.
 *
 *   - BILDE / KARUSELL / STORY (20):
 *       Renderer ReferansePoster via Playwright HTML→PNG.
 *       Original bilde.jpg flyttes til bilde-original.jpg, ny PNG legges
 *       som bilde.jpg (samme filnavn — så feeden ikke trenger endring).
 *       Logger feil i out/regenerasjon-2026-06-01.log.
 *
 * Etter dette: kjør `node --env-file=.env.local scripts/render-all-uke-1-juni.mjs`
 * for å rendre reel-videoene (FORCE_RERENDER triggrer ReferanseSpotlight).
 */

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  statSync,
  renameSync,
  appendFileSync,
} from "node:fs";
import { join } from "node:path";

import {
  renderReferansePoster,
  renderReferansePosterToFile,
} from "../src/lib/services/ft-poster-render.ts";
import { closeRenderBrowser } from "../src/lib/services/render-common.ts";

const ROOT = "out/innlegg-uke-1-juni-2026";
const LOG = join(ROOT, "regenerasjon-2026-06-01.log");

function log(line) {
  const stamp = new Date().toISOString();
  const text = `[${stamp}] ${line}\n`;
  appendFileSync(LOG, text);
  process.stdout.write(text);
}

// ── derivasjons-helpers ─────────────────────────────────────────────

function deriveEyebrow(meta, captions) {
  const t = `${meta.title || ""} ${meta.tema || ""} ${captions.linkedin || ""}`;

  if (/andøya space/i.test(t)) return "LEVERT TIL ANDØYA SPACE";
  if (/norwegian aero/i.test(t)) return "LEVERT TIL NORWEGIAN AERO";
  if (/tess vest/i.test(t)) return "LEVERT TIL TESS VEST";
  if (/lista ag/i.test(t)) return "REFERANSE / LISTA AG";

  if (/aviation|f-16|sikorsky|helikopter|flightline/i.test(t))
    return "REFERANSE / AVIATION";
  if (/forsvar|våpen|ammo|rifle/i.test(t)) return "REFERANSE / FORSVARET";
  if (/offshore|havbruk|fiskefarm/i.test(t)) return "REFERANSE / OFFSHORE";
  if (/akutt|beredskap|helse/i.test(t)) return "REFERANSE / BEREDSKAP";
  if (/innredning|systemvegg|verksted|fabrikk|garasje|hyllesystem/i.test(t))
    return "REFERANSE / VERKSTED";

  return "SKREDDERSYDD / HDFI";
}

function deriveHeadline(meta) {
  const raw = (meta.title || "").replace(/[“”"]/g, "").trim();
  // Splitt KUN på em-dash «—» eller en-dash «–» (ikke vanlig bindestrek «-»,
  // siden den brukes i sammensatte ord som F-16, EOR-Kit, HDFI-skreddersøm).
  const parts = raw.split(/[—–]/);
  let h = parts[0].trim();
  h = h.replace(/\s*\([^)]*\)\s*$/, "").trim();
  // Maks 6 ord, fortsett ellers
  const words = h.split(/\s+/);
  if (words.length > 6) h = words.slice(0, 6).join(" ");
  return h.toUpperCase();
}

function deriveBodyLines(meta) {
  const lines = ["CAD-tegnet, CNC-maskinert."];
  const t = `${meta.tema || ""} ${meta.title || ""}`;
  if (/aviation|f-16|sikorsky|helikopter|flightline/i.test(t)) {
    lines.push("Designet for flightline.");
  } else if (/forsvar|våpen|rifle|ammo/i.test(t)) {
    lines.push("Bygget for Forsvaret.");
  } else if (/offshore|havbruk/i.test(t)) {
    lines.push("Designet for tøffe miljøer.");
  } else if (/akutt|beredskap|helse/i.test(t)) {
    lines.push("Klar på minuttet.");
  } else if (/innredning|systemvegg|fabrikk|verksted|garasje/i.test(t)) {
    lines.push("Skreddersydd til verkstedet.");
  } else {
    lines.push("Designet for arbeidsflyten.");
  }
  lines.push("Juni 2026.");
  return lines;
}

function deriveCtaUrl(meta) {
  const url = meta.kilde_url || "";
  if (!url) return "fosen-tools.no";
  return url.replace(/^https?:\/\//, "").split("?")[0];
}

function getImageUrl(meta, oldConfig) {
  return (
    (oldConfig?.data?.imageUrls && oldConfig.data.imageUrls[0]) ||
    oldConfig?.data?.imageUrl ||
    oldConfig?.data?.finishedImageUrl ||
    meta.bilde_kilde ||
    null
  );
}

function readCaptions(folderPath) {
  return {
    facebook: existsSync(join(folderPath, "caption-facebook.txt"))
      ? readFileSync(join(folderPath, "caption-facebook.txt"), "utf8")
      : "",
    instagram: existsSync(join(folderPath, "caption-instagram.txt"))
      ? readFileSync(join(folderPath, "caption-instagram.txt"), "utf8")
      : "",
    linkedin: existsSync(join(folderPath, "caption-linkedin.txt"))
      ? readFileSync(join(folderPath, "caption-linkedin.txt"), "utf8")
      : "",
  };
}

// ── main ────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(ROOT)) {
    console.error("OUT_DIR finnes ikke:", ROOT);
    process.exit(1);
  }

  writeFileSync(LOG, `# Regenerasjon uke-1-juni-2026 — ${new Date().toISOString()}\n\n`);

  const folders = readdirSync(ROOT)
    .filter((name) => /^\d{2}-/.test(name))
    .filter((name) => statSync(join(ROOT, name)).isDirectory())
    .sort();

  log(`Fant ${folders.length} innlegg-mapper`);

  const stats = {
    reels_updated: 0,
    posters_rendered: 0,
    posters_failed: 0,
    skipped: 0,
  };

  // Fase 1 — oppdater reel-configs
  for (const folder of folders) {
    const folderPath = join(ROOT, folder);
    const metaPath = join(folderPath, "metadata.json");
    if (!existsSync(metaPath)) {
      stats.skipped++;
      log(`[SKIP] ${folder} — mangler metadata.json`);
      continue;
    }
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    if ((meta.format || "").toLowerCase() !== "reel") continue;

    const captions = readCaptions(folderPath);
    const configPath = join(folderPath, "render-config.json");
    let oldConfig = null;
    if (existsSync(configPath)) {
      try {
        oldConfig = JSON.parse(readFileSync(configPath, "utf8"));
      } catch (e) {
        log(`[WARN] ${folder} — kunne ikke parse render-config.json: ${e.message}`);
      }
    }
    const newConfig = {
      composition: "ReferanseSpotlight",
      composition_key: "referanse-spotlight",
      _previous_composition: oldConfig?.composition || null,
      data: {
        format: "reel",
        eyebrow: deriveEyebrow(meta, captions),
        headline: deriveHeadline(meta),
        imageUrl: getImageUrl(meta, oldConfig),
        bodyLines: deriveBodyLines(meta),
        ctaUrl: deriveCtaUrl(meta),
      },
    };
    writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf8");
    stats.reels_updated++;
    log(`[REEL] ${folder} → ReferanseSpotlight`);
  }

  // Fase 2 — render posters for bilde/karusell/story
  for (const folder of folders) {
    const folderPath = join(ROOT, folder);
    const metaPath = join(folderPath, "metadata.json");
    if (!existsSync(metaPath)) continue;
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    const fmt = (meta.format || "").toLowerCase();
    if (fmt === "reel") continue;

    const captions = readCaptions(folderPath);
    const input = {
      aspect: "4:5", // IG/FB portrett, fungerer både for bilde/karusell/story
      eyebrow: deriveEyebrow(meta, captions),
      headline: deriveHeadline(meta),
      imageUrl: meta.bilde_kilde || null,
      bodyLines: deriveBodyLines(meta),
      ctaUrl: deriveCtaUrl(meta),
    };

    const newImgPath = join(folderPath, "bilde.jpg");
    const origPath = join(folderPath, "bilde-original.jpg");

    try {
      // Flytt original bilde.jpg → bilde-original.jpg (engang)
      if (existsSync(newImgPath) && !existsSync(origPath)) {
        renameSync(newImgPath, origPath);
        log(`[POSTER] ${folder} — backed up bilde.jpg → bilde-original.jpg`);
      }
      // Render PNG som JPEG (renderHtmlToPng returnerer PNG-base64 — skriv som .png også
      // for å være eksplisitt, og lag .jpg som kopi av samme bytes for kompatibilitet)
      const { base64 } = await renderReferansePoster(input);
      // Skriv som .jpg-filnavn for å matche eksisterende filstruktur (innholdet er PNG-bytes)
      // — feedene leser bilde.jpg uavhengig av faktisk format-magic
      writeFileSync(newImgPath, Buffer.from(base64, "base64"));
      stats.posters_rendered++;
      log(`[POSTER ✓] ${folder} — ny bilde.jpg`);
    } catch (e) {
      stats.posters_failed++;
      log(`[POSTER ✗] ${folder} — ${e.message}`);
    }
  }

  // Cleanup Playwright
  await closeRenderBrowser().catch(() => undefined);

  log(`\nResultat:`);
  log(`  Reels oppdatert:      ${stats.reels_updated}`);
  log(`  Posters rendret:      ${stats.posters_rendered}`);
  log(`  Posters feilet:       ${stats.posters_failed}`);
  log(`  Hoppet over:          ${stats.skipped}`);

  console.log("\nNeste steg: render reel-videoene:");
  console.log("  node --env-file=.env.local scripts/render-all-uke-1-juni.mjs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
