#!/usr/bin/env node
// build-innlegg-uke.mjs — bygger out/innlegg-uke-1-juni-2026/ fra
// docs/innlegg-forslag/uke-1-juni-2026.md. Skriver metadata.json,
// captions per plattform, laster ned hero-bilder, og lager
// render-config.json + render.sh for reels.

import { readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC_MD = join(ROOT, "docs/innlegg-forslag/uke-1-juni-2026.md");
const OUT_DIR = join(ROOT, "out/innlegg-uke-1-juni-2026");

// ── slug-helper ──────────────────────────────────────────────────────
function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// ── parser ───────────────────────────────────────────────────────────
function parseForslag(md) {
  // Splitt på h2 «## N. ...» — header inneholder emoji + tittel
  const sections = md.split(/^## (\d+)\. /m);
  // sections[0] = preamble; deretter alternerende [nummer, body]
  const out = [];
  for (let i = 1; i < sections.length; i += 2) {
    const nr = parseInt(sections[i], 10);
    const body = sections[i + 1];
    if (!body || !nr) continue;
    // Stopp ved neste h2 (skulle ikke skje pga split) eller h1 «## Oppsummering»
    if (sections[i + 2] === undefined && /^Oppsummering/m.test(body)) {
      // siste seksjon = oppsummering, skipp
      continue;
    }
    const titleMatch = body.match(/^([^\n]+)/);
    if (!titleMatch) continue;
    const titleRaw = titleMatch[1].trim();

    const format = matchField(body, /\*\*Format:\*\*\s*([^\n]+)/);
    const tema = matchField(body, /\*\*Tema:\*\*\s*([^\n]+)/);
    const dag = matchField(body, /\*\*Anbefalt postingsdag:\*\*\s*([^\n]+)/);
    const plattformer = matchField(body, /\*\*Plattformer:\*\*\s*([^\n]+)/);
    const hvorfor = matchField(body, /\*\*Datadrevet hvorfor:\*\*\s*([^\n]+)/);

    const captionFb = extractCaption(body, "(FB)") || extractStoryCaption(body);
    const captionIg = extractCaption(body, "(IG)") || captionFb;
    const captionLi = extractCaption(body, "(LinkedIn)") || captionFb;

    const imageUrl = matchField(body, /- Bilde:\s*([^\s)]+)/);
    const lenke = matchField(body, /- Lenke:\s*([^\s)]+)/);
    const reelHint = matchField(body, /- Reel-komposisjon[^:]*:\s*([^\n]+)/);

    // slug fra første ord etter emoji
    const titleNoEmoji = titleRaw.replace(/^[^\w]+/, "").trim();
    const slug = slugify(titleNoEmoji);

    out.push({
      nr,
      title: titleNoEmoji,
      titleRaw,
      slug,
      format,
      tema,
      dag,
      plattformer,
      hvorfor,
      captionFb,
      captionIg,
      captionLi,
      imageUrl,
      lenke,
      reelHint,
    });
  }
  return out;
}

function matchField(body, regex) {
  const m = body.match(regex);
  return m ? m[1].trim() : null;
}

// Henter caption-blokken etter «**Caption-skisse (FB):**» frem til neste **
function extractCaption(body, marker) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\*\\*Caption-skisse ${escaped}:\\*\\*\\s*\\n([\\s\\S]*?)(?=\\n\\*\\*|\\n---|\\n## )`, "m");
  const m = body.match(re);
  if (!m) return null;
  return m[1].trim();
}

// Stories bruker «**Caption-skisse (Story tekst):**» eller «(Story):»
function extractStoryCaption(body) {
  const re = /\*\*Caption-skisse \(Story[^)]*\):\*\*\s*\n([\s\S]*?)(?=\n\*\*|\n---|\n## )/m;
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

// ── komposisjon-mapping ──────────────────────────────────────────────
function pickComposition(forslag) {
  const t = (forslag.tema || "").toLowerCase();
  const title = forslag.title.toLowerCase();
  const hint = (forslag.reelHint || "").toLowerCase();
  const text = `${title} ${hint} ${t}`;

  // Eksplisitt hint i markdown vinner
  if (hint.includes("produktspotlight")) {
    return { key: "produkt-spotlight", composition: "ProduktSpotlight" };
  }
  if (hint.includes("leveransereel")) {
    return { key: "leveranse", composition: "LeveranseReel" };
  }

  if (text.includes("før/etter") || text.includes("before after") || text.includes("split-screen")) {
    return { key: "hdfi-ba", composition: "HdfiBeforeAfter" };
  }
  if (text.includes("cadlab-prosess") || text.includes("fra tegning til ferdig")) {
    return { key: "cadlab", composition: "CADLABProsess" };
  }
  if (text.includes("team") || text.includes("ansatt") || text.includes("portrett")) {
    return { key: "team", composition: "TeamPortrett" };
  }
  if (text.includes("sitat") || text.includes("kunden sier")) {
    return { key: "sitat", composition: "SitatClip" };
  }
  if (text.includes("milepæl") || text.includes("milepael") || text.includes("25 år") || text.includes("100 år")) {
    return { key: "milepael", composition: "MilepaelClip" };
  }
  // «Levert til X» eller kunde-leveranse-tema
  if (text.includes("levert til") || text.includes("kundeleveranse")) {
    return { key: "kunde-v2", composition: "KundeLeveranseV2" };
  }
  // Produkt-spotlight signaler
  if (text.includes("toppmerker") || text.includes("produkt-spotlight")) {
    return { key: "produkt-spotlight", composition: "ProduktSpotlight" };
  }
  // HDFI som hovedtema
  if (title.includes("hdfi") && !title.includes("kit")) {
    return { key: "leveranse", composition: "LeveranseReel" };
  }
  // Default fallback
  return { key: "leveranse", composition: "LeveranseReel" };
}

// ── render-data builders ─────────────────────────────────────────────
function buildLeveranseData(f) {
  const headline = f.title;
  const tags = [];
  if (/hdfi/i.test(f.title + " " + (f.tema || ""))) tags.push("HDFI");
  if (/cadlab/i.test(f.captionLi || "")) tags.push("CADLAB");
  if (/cnc-maskinert/i.test(f.captionLi || f.captionFb || "")) tags.push("CNC-maskinert");
  if (/pelican|peli /i.test(f.title + " " + (f.captionLi || ""))) tags.push("Peli-koffert");
  if (/aviation|f-16|helikopter|sikorsky/i.test(f.title + " " + (f.tema || ""))) tags.push("Aviation");
  if (/forsvar/i.test(f.title + " " + (f.tema || ""))) tags.push("Forsvar");
  if (/offshore/i.test(f.title + " " + (f.tema || ""))) tags.push("Offshore");

  const customer = extractCustomer(f);
  const industry = extractIndustry(f);

  return {
    format: "reel",
    eyebrow: "Levert",
    customer: customer || "Bransjekunde",
    industry: industry || "Industri",
    customerLogoUrl: null,
    anonymous: !customer,
    headline,
    description: stripCtaLines(f.captionLi || f.captionFb || "").slice(0, 220),
    imageUrls: f.imageUrl ? [f.imageUrl] : [],
    tags: tags.slice(0, 4),
    ctaUrl: getCtaUrl(f),
  };
}

function buildKundeV2Data(f) {
  return {
    format: "reel",
    customer: extractCustomer(f) || "Bransjekunde",
    industry: extractIndustry(f) || "Industri",
    customerLogoUrl: null,
    heading: f.title,
    bodyText: stripCtaLines(f.captionLi || f.captionFb || "").slice(0, 260),
    images: f.imageUrl ? [f.imageUrl] : [],
    highlights: ["HDFI", "CADLAB", "CNC-maskinert", "Skreddersydd"],
    ctaUrl: getCtaUrl(f),
    anonymous: !extractCustomer(f),
  };
}

function buildProduktSpotlightData(f) {
  const manufacturer = extractManufacturer(f);
  return {
    format: "reel",
    eyebrow: "Skreddersøm",
    productName: f.title,
    manufacturer: manufacturer || "Fosen Tools",
    manufacturerLogoUrl: null,
    imageUrl: f.imageUrl || null,
    priceBefore: null,
    priceNow: 0,
    discountPct: null,
    sku: null,
    bullets: extractBullets(f),
    ctaUrl: getCtaUrl(f),
  };
}

function buildCadlabData(f) {
  return {
    format: "reel",
    productName: f.title,
    customerName: extractCustomer(f) || undefined,
    cadImageUrl: undefined,
    cncImageUrl: undefined,
    finishedImageUrl: f.imageUrl || undefined,
  };
}

function buildHdfiBaData(f) {
  return {
    format: "reel",
    beforeImageUrl: null,
    afterImageUrl: f.imageUrl || null,
    customerName: extractCustomer(f) || "Bransjekunde",
    description: stripCtaLines(f.captionLi || f.captionFb || "").slice(0, 200),
  };
}

function buildSitatData(f) {
  return {
    format: "reel",
    eyebrow: "Kunden sier",
    quote: stripCtaLines(f.captionLi || f.captionFb || "").slice(0, 200),
    attributionName: extractCustomer(f) || "Kunde",
    attributionRole: "Innkjøpsansvarlig",
    attributionCompany: extractCustomer(f) || "Bransjekunde",
    companyLogoUrl: null,
    ctaUrl: getCtaUrl(f),
  };
}

function buildMilepaelData(f) {
  return {
    format: "reel",
    eyebrow: "Milepæl 2026",
    number: 25,
    unit: "ÅR",
    headline: f.title,
    subhead: stripCtaLines(f.captionLi || f.captionFb || "").slice(0, 120),
    stats: [
      { value: "100", label: "år i konsernet" },
      { value: "40+", label: "merker på lager" },
      { value: "4.", label: "generasjon" },
    ],
    showJubileum: true,
    ctaUrl: getCtaUrl(f),
  };
}

function buildTeamData(f) {
  return {
    format: "reel",
    name: "Team Fosen Tools",
    role: "Brekstad",
    since: "2001",
    quote: stripCtaLines(f.captionLi || f.captionFb || "").slice(0, 200),
    photoUrl: f.imageUrl || null,
  };
}

// ── helpers ──────────────────────────────────────────────────────────
function extractCustomer(f) {
  const text = `${f.title} ${f.captionLi || ""} ${f.captionFb || ""}`;
  const m = text.match(/(?:levert til|til|for)\s+([A-ZÆØÅ][A-ZÆØÅa-zæøå\-\s]{2,30}?)(?:[.,—]|$)/);
  if (m) {
    const cand = m[1].trim();
    // filter ut generiske ord
    if (/^(deg|en|et|industri|felt|verksted|kassen|kunden|nye|den|store)$/i.test(cand)) return null;
    return cand;
  }
  if (/forsvaret/i.test(text)) return "Forsvaret";
  if (/lista ag/i.test(text)) return "Lista AG";
  if (/norwegian aero/i.test(text)) return "Norwegian Aero";
  if (/tess vest/i.test(text)) return "TESS VEST";
  return null;
}

function extractIndustry(f) {
  const text = (f.tema || "") + " " + f.title;
  if (/aviation|f-16|helikopter|sikorsky|line maintenance/i.test(text)) return "Aviation";
  if (/forsvar/i.test(text)) return "Forsvar";
  if (/offshore/i.test(text)) return "Offshore";
  if (/havbruk|fiskefarm/i.test(text)) return "Havbruk";
  if (/helse|akutt/i.test(text)) return "Helse";
  if (/workshop|innredning|verksted|garasje|fabrikk/i.test(text)) return "Verksted";
  if (/pelican|peli/i.test(text)) return "Industri";
  return "Industri";
}

function extractManufacturer(f) {
  const text = `${f.title} ${f.tema || ""} ${f.captionFb || ""}`;
  const brands = ["Bosch", "Fluke", "Snap-on", "Wera", "Husqvarna", "Facom", "Milwaukee", "Ledlenser", "Zweibrüder", "Lista AG", "Lista"];
  for (const b of brands) {
    if (new RegExp(`\\b${b.replace(/-/g, "\\-")}\\b`, "i").test(text)) return b;
  }
  return null;
}

function extractBullets(f) {
  // Forsøk å hente USP-bullets fra LinkedIn-caption — splittes på punktum
  const text = stripCtaLines(f.captionLi || f.captionFb || "");
  const sentences = text.split(/[.\n]+/).map((s) => s.trim()).filter(Boolean);
  return sentences.slice(0, 3).map((s) => s.slice(0, 60));
}

function stripCtaLines(text) {
  return text
    .split("\n")
    .filter((line) => !/^[\s]*(sveip|ta kontakt|sveip opp|🎯|👉)[^a-zæøå]*$/i.test(line))
    .filter((line) => !/^\s*#\w+/.test(line)) // hashtag-linjer
    .filter((line) => !/^\s*\.\s*$/.test(line)) // bare punktum
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function getCtaUrl(f) {
  if (f.lenke) {
    // strip protokoll, behold "fosen-tools.no/..."
    return f.lenke.replace(/^https?:\/\//, "").split("?")[0];
  }
  return "fosen-tools.no";
}

// ── bilde-nedlasting ─────────────────────────────────────────────────
async function downloadImage(url, targetPath) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FosenToolsBuilder/1.0)",
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const arr = await res.arrayBuffer();
    writeFileSync(targetPath, Buffer.from(arr));
    return { ok: true, bytes: arr.byteLength };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ── main ─────────────────────────────────────────────────────────────
async function main() {
  const md = readFileSync(SRC_MD, "utf8");
  const forslag = parseForslag(md);
  console.log(`Parset ${forslag.length} forslag fra ${SRC_MD}`);

  // ren OUT_DIR
  if (existsSync(OUT_DIR)) {
    rmSync(OUT_DIR, { recursive: true, force: true });
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const stats = {
    folders: 0,
    images_ok: 0,
    images_failed: 0,
    reels_built: 0,
    skipped_no_image: [],
  };

  // Parallell bilde-nedlasting per forslag for bilder/karusell/story
  const tasks = forslag.map(async (f) => {
    const folderName = `${pad2(f.nr)}-${f.slug}`;
    const folder = join(OUT_DIR, folderName);
    mkdirSync(folder, { recursive: true });
    stats.folders++;

    // metadata.json
    const meta = {
      nr: f.nr,
      title: f.title,
      slug: f.slug,
      format: f.format,
      tema: f.tema,
      anbefalt_postingsdag: f.dag,
      plattformer: f.plattformer
        ? f.plattformer.split(/[+,]/).map((s) => s.trim())
        : [],
      datadrevet_hvorfor: f.hvorfor,
      kilde_url: f.lenke,
      bilde_kilde: f.imageUrl,
    };
    writeFileSync(
      join(folder, "metadata.json"),
      JSON.stringify(meta, null, 2),
      "utf8",
    );

    // captions
    writeFileSync(
      join(folder, "caption-facebook.txt"),
      f.captionFb || "",
      "utf8",
    );
    writeFileSync(
      join(folder, "caption-instagram.txt"),
      f.captionIg || "",
      "utf8",
    );
    writeFileSync(
      join(folder, "caption-linkedin.txt"),
      f.captionLi || "",
      "utf8",
    );

    const formatLc = (f.format || "").toLowerCase();
    const isReel = formatLc === "reel";

    if (isReel) {
      // render-config.json
      const pick = pickComposition(f);
      let data;
      switch (pick.key) {
        case "produkt-spotlight":
          data = buildProduktSpotlightData(f);
          break;
        case "kunde-v2":
          data = buildKundeV2Data(f);
          break;
        case "hdfi-ba":
          data = buildHdfiBaData(f);
          break;
        case "cadlab":
          data = buildCadlabData(f);
          break;
        case "sitat":
          data = buildSitatData(f);
          break;
        case "milepael":
          data = buildMilepaelData(f);
          break;
        case "team":
          data = buildTeamData(f);
          break;
        case "leveranse":
        default:
          data = buildLeveranseData(f);
          break;
      }
      const renderConfig = {
        composition: pick.composition,
        composition_key: pick.key,
        data,
      };
      writeFileSync(
        join(folder, "render-config.json"),
        JSON.stringify(renderConfig, null, 2),
        "utf8",
      );

      // render.sh — inline node-script som leser render-config.json og kaller renderVideo
      const renderShContent = `#!/usr/bin/env bash
# Auto-generert render-script for ${f.title}
# Kjør fra denne mappa: ./render.sh
set -euo pipefail
cd "$(dirname "$0")"

PROJECT_ROOT="$(cd ../../.. && pwd)"

cd "$PROJECT_ROOT"

# Bruker tsx for å kjøre TypeScript-renderen med custom inputProps
npx tsx --tsconfig tsconfig.json -e "
import { readFileSync, writeFileSync } from 'node:fs';
import { renderVideo } from './src/lib/services/video-render';
const cfg = JSON.parse(readFileSync('out/innlegg-uke-1-juni-2026/${pad2(f.nr)}-${f.slug}/render-config.json', 'utf8'));
const TYPE_MAP = {
  ProduktSpotlight: 'produkt-spotlight',
  LeveranseReel: 'leveranse-reel',
  MilepaelClip: 'milepael',
  KampanjeTeaser: 'kampanje-teaser',
  SitatClip: 'sitat',
  HdfiHero: 'hdfi-hero',
  KundeLeveranseV2: 'kunde-leveranse-v2',
  HdfiBeforeAfter: 'hdfi-before-after',
  TeamPortrett: 'team-portrett',
  CADLABProsess: 'cadlab-prosess',
};
const type = TYPE_MAP[cfg.composition];
if (!type) throw new Error('Ukjent composition: ' + cfg.composition);
(async () => {
  const result = await renderVideo({ type, data: cfg.data }, (pct) => {
    process.stdout.write(\\\`\\r  \\\${Math.round(pct * 100)}%   \\\`);
  });
  writeFileSync('out/innlegg-uke-1-juni-2026/${pad2(f.nr)}-${f.slug}/video.mp4', result.buffer);
  console.log('\\n✓ video.mp4 (' + result.width + 'x' + result.height + ', ' + (result.buffer.byteLength / 1024 / 1024).toFixed(1) + ' MB)');
})();
"
`;
      writeFileSync(join(folder, "render.sh"), renderShContent, {
        mode: 0o755,
      });
      stats.reels_built++;
    }

    // Last ned bilde for ALLE format (også reels kan trenge stillbilde-fallback,
    // og bilde/karusell/story trenger det)
    if (f.imageUrl) {
      const result = await downloadImage(f.imageUrl, join(folder, "bilde.jpg"));
      if (result.ok) {
        stats.images_ok++;
      } else {
        stats.images_failed++;
        writeFileSync(
          join(folder, "bilde-feilet.txt"),
          `Kunne ikke laste ned hero-bilde.\nURL: ${f.imageUrl}\nFeil: ${result.error}\n\nLast manuelt og legg som bilde.jpg.\n`,
          "utf8",
        );
      }
    } else {
      stats.skipped_no_image.push(`#${f.nr} ${f.title}`);
    }
  });

  // Promise.allSettled for å håndtere parallell nedlasting uten å feile alt
  await Promise.allSettled(tasks);

  // ── INDEX.md ───────────────────────────────────────────────────────
  const indexLines = [];
  indexLines.push("# 30 publiseringsklare innlegg for uke 1.-7. juni 2026");
  indexLines.push("");
  indexLines.push(
    `Generert ${new Date().toISOString().slice(0, 10)} fra \`docs/innlegg-forslag/uke-1-juni-2026.md\`.`,
  );
  indexLines.push("");
  indexLines.push("## Full liste");
  indexLines.push("");
  indexLines.push("| # | Slug | Format | Tema | Anbefalt dag | Mappe |");
  indexLines.push("|---|------|--------|------|--------------|-------|");
  for (const f of forslag) {
    const folderName = `${pad2(f.nr)}-${f.slug}`;
    indexLines.push(
      `| ${f.nr} | ${f.title} | ${f.format || ""} | ${f.tema || ""} | ${f.dag || ""} | [${folderName}/](${folderName}/) |`,
    );
  }
  indexLines.push("");

  // Per-format-seksjoner
  const formats = ["Reel", "Bilde", "Karusell", "Story"];
  for (const fmt of formats) {
    const items = forslag.filter(
      (f) => (f.format || "").toLowerCase() === fmt.toLowerCase(),
    );
    indexLines.push(`## ${fmt} (${items.length})`);
    indexLines.push("");
    for (const f of items) {
      const folderName = `${pad2(f.nr)}-${f.slug}`;
      indexLines.push(
        `- **#${f.nr} ${f.title}** — ${f.dag || ""} → [${folderName}/](${folderName}/)`,
      );
    }
    indexLines.push("");
  }

  writeFileSync(join(OUT_DIR, "INDEX.md"), indexLines.join("\n"), "utf8");

  // ── output ─────────────────────────────────────────────────────────
  console.log("");
  console.log("Resultat:");
  console.log(`  Mapper opprettet: ${stats.folders}`);
  console.log(`  Bilder lastet OK: ${stats.images_ok}`);
  console.log(`  Bilder feilet:    ${stats.images_failed}`);
  console.log(`  Reel-configs:     ${stats.reels_built}`);
  if (stats.skipped_no_image.length) {
    console.log(`  Uten bilde-URL: ${stats.skipped_no_image.join(", ")}`);
  }
  console.log("");
  console.log(`INDEX.md: ${join(OUT_DIR, "INDEX.md")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
