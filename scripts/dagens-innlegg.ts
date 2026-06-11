/**
 * dagens-innlegg.ts — generér dagens FT-innlegg i ett kall.
 *
 * Tar en komposisjons-type (ft-referanse / ft-hdfi / ft-definisjon /
 * ft-milepael / ft-sitat) + JSON-data, rendrer 3 aspekter (1:1, 4:5, 16:9)
 * i samme kall, og genererer FB/IG/LinkedIn-captions med UTM.
 *
 * Output havner i `out/dagens/YYYY-MM-DD/<type>/`:
 *   - reel.mp4 (1080×1920)
 *   - square.mp4 (1080×1080)
 *   - wide.mp4 (1920×1080)
 *   - captions.md
 *   - alt-tekst.md
 *
 * Bruk:
 *   npm run dagens -- --type ft-hdfi \
 *     [--data scripts/data/hdfi-tess-vest.json] \
 *     [--formats reel,square,wide] \
 *     [--date 2026-06-02] \
 *     [--utm-campaign hdfi-tess-vest-2026-06]
 *
 * Hvis --data utelates, brukes SAMPLE_* fra remotion/types.ts.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { renderVideo } from "../src/lib/services/video-render";
import {
  SAMPLE_FT_REFERANSE,
  SAMPLE_FT_HDFI,
  SAMPLE_FT_DEFINISJON,
  SAMPLE_FT_MILEPAEL,
  SAMPLE_FT_SITAT,
  type VideoType,
} from "../remotion/types";
import { SAMPLE_FT_JUBILEUM } from "../remotion/compositions/FTJubileum26Juni";
import { validateCaption, logValidation } from "./caption-rules";

// ── arg-parsing ─────────────────────────────────────────────────────

type FTType =
  | "ft-referanse"
  | "ft-hdfi"
  | "ft-definisjon"
  | "ft-milepael"
  | "ft-sitat"
  | "ft-jubileum-26juni";

const VALID_TYPES: FTType[] = [
  "ft-referanse",
  "ft-hdfi",
  "ft-definisjon",
  "ft-milepael",
  "ft-sitat",
  "ft-jubileum-26juni",
];

const args = process.argv.slice(2);
function arg(name: string, def?: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  return args[i + 1] ?? def;
}

const typeArg = arg("type");
if (!typeArg || !VALID_TYPES.includes(typeArg as FTType)) {
  console.error(`❌ --type mangler eller ugyldig. Velg en av: ${VALID_TYPES.join(", ")}`);
  process.exit(1);
}
const type = typeArg as FTType;

const dataPath = arg("data");
const date = arg("date", new Date().toISOString().slice(0, 10))!;
// Default: kun reel-format (Instagram + Facebook). LinkedIn = ikke for FT-reels.
// Tidligere default var "reel,square,wide" — overkill. Beslutning 9. juni 2026:
// reels kun på IG + FB, ikke LinkedIn (se memory feedback_reels_kun_ig_fb.md).
const formats = (arg("formats", "reel") || "reel").split(",").map((s) => s.trim()).filter(Boolean);
const utmCampaign = arg("utm-campaign", `${type}-${date}`)!;

// ── data-resolution ────────────────────────────────────────────────

const SAMPLES: Record<FTType, Record<string, unknown>> = {
  "ft-referanse": SAMPLE_FT_REFERANSE,
  "ft-hdfi": SAMPLE_FT_HDFI,
  "ft-definisjon": SAMPLE_FT_DEFINISJON,
  "ft-milepael": SAMPLE_FT_MILEPAEL,
  "ft-sitat": SAMPLE_FT_SITAT,
  "ft-jubileum-26juni": SAMPLE_FT_JUBILEUM,
};

let data: Record<string, unknown>;
if (dataPath) {
  if (!existsSync(dataPath)) {
    console.error(`❌ Data-fil finnes ikke: ${dataPath}`);
    process.exit(1);
  }
  data = JSON.parse(readFileSync(dataPath, "utf8"));
} else {
  console.log(`ℹ️  Ingen --data oppgitt, bruker SAMPLE_${type.toUpperCase()}`);
  data = { ...SAMPLES[type] };
}

// ── main (wrapped i async — tsx kjører CJS som ikke støtter top-level await) ──

async function main() {
  const outDir = join("out", "dagens", date, type);
  mkdirSync(outDir, { recursive: true });
  console.log(`\n📁 ${outDir}`);

  const renderedFormats: { format: string; outPath: string; mb: string }[] = [];
  const t0 = performance.now();

  for (const format of formats) {
    if (!format || format === "noop") continue;
    process.stdout.write(`  ▸ ${format}: rendrer ... `);
    const tStart = performance.now();
    try {
      const result = await renderVideo(
        { type: type as VideoType, data: { ...data, format } },
        () => {},
      );
      const outPath = join(outDir, `${format}.mp4`);
      writeFileSync(outPath, result.buffer);
      const mb = (result.buffer.byteLength / 1024 / 1024).toFixed(1);
      const dur = ((performance.now() - tStart) / 1000).toFixed(1);
      console.log(`✓ ${mb} MB (${dur}s)`);
      renderedFormats.push({ format, outPath, mb });
    } catch (e) {
      console.log(`❌ ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Bygger captions ut fra data + +144%-mønsteret (skreddersydd/HDFI,
  // emoji-start, stolthet, CTA med UTM, < 300 tegn hovedtekst).
  const captions = buildCaptions({ type, data, utmCampaign });
  writeFileSync(join(outDir, "captions.md"), captions);
  console.log(`  ✓ captions.md`);

  // Validér mot brand-vokabular — stopper "i Brekstad", "CNC-frest",
  // "plastplate", "tom skuff" etc. før vi bringer det videre.
  console.log(`\n  Validerer captions mot brand-regler:`);
  logValidation("captions", validateCaption(captions));

  const altText = buildAltText({ type, data });
  writeFileSync(join(outDir, "alt-tekst.md"), altText);
  console.log(`  ✓ alt-tekst.md`);

  const totalSec = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(
    `\n✅ Ferdig på ${totalSec}s. ${renderedFormats.length}/${formats.filter((f) => f && f !== "noop").length} formater rendret.`,
  );
  console.log(`\nÅpne i Finder:`);
  console.log(`  open "${outDir}"`);
  console.log(``);
}

main().catch((err) => {
  console.error("\n❌ Feilet:", err);
  process.exit(1);
});

// ───────────────────────────────────────────────────────────────────
// HJELPERE
// ───────────────────────────────────────────────────────────────────

type DataLike = Record<string, unknown>;

function buildCaptions({
  type,
  data,
  utmCampaign,
}: {
  type: FTType;
  data: DataLike;
  utmCampaign: string;
}): string {
  const emoji = pickEmoji(type);
  const utm = (source: string) =>
    `?utm_source=${source}&utm_medium=social&utm_campaign=${encodeURIComponent(utmCampaign)}`;

  const hook = buildHook(type, data, emoji);
  const body = buildBody(type, data);
  const ctaUrl = String(data.ctaUrl || "fosen-tools.no").replace(/^https?:\/\//, "");
  const linkInBio = `\n\nLink i bio · #FosenTools #HDFI #Skreddersøm`;

  const fbCaption = [
    hook,
    "",
    body,
    "",
    `→ https://${ctaUrl}${utm("facebook")}`,
  ].join("\n");

  const igCaption = [
    hook,
    "",
    body,
    linkInBio,
    "",
    pickHashtags(type),
  ].join("\n");

  const liCaption = [
    `${hook} Stolt over leveransen.`,
    "",
    body,
    "",
    `→ https://${ctaUrl}${utm("linkedin")}`,
  ].join("\n");

  return `# Captions — ${type} · ${utmCampaign}

## Facebook (~250 tegn, klikkbar URL med UTM)

\`\`\`
${fbCaption}
\`\`\`

## Instagram (hashtags på slutten, "link i bio")

\`\`\`
${igCaption}
\`\`\`

## LinkedIn (fagspråk, fagstolthet, klikkbar URL med UTM)

\`\`\`
${liCaption}
\`\`\`

---

**UTM-kampanje:** \`${utmCampaign}\`

**Postingstid:** torsdag eller fredag kl 12:00 (snitt 162 engasjement vs 19 onsdag).

**Etter publisering:** legg til alt-tekst via Instagram-mobilapp (Meta Business Suite støtter ikke alt-tekst for IG).
`;
}

function pickEmoji(type: FTType): string {
  const map: Record<FTType, string> = {
    "ft-referanse": "🛠️",
    "ft-hdfi": "⚙️",
    "ft-definisjon": "📐",
    "ft-milepael": "🎉",
    "ft-sitat": "💬",
    "ft-jubileum-26juni": "🎉",
  };
  return map[type] || "🛠️";
}

function s(v: unknown, fallback = ""): string {
  return v == null ? fallback : String(v);
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function buildHook(type: FTType, data: DataLike, emoji: string): string {
  switch (type) {
    case "ft-referanse":
      return `${emoji} ${s(data.eyebrow, "Levert")}, ${s(data.headline)}.`;
    case "ft-hdfi":
      return `${emoji} ${s(data.headline)}: ${s(data.tagline)}.`;
    case "ft-definisjon":
      return `${emoji} ${s(data.term)} (${s(data.partOfSpeech)}): ${s(data.definition)}`;
    case "ft-milepael":
      return `${emoji} ${s(data.value)} ${s(data.unit)}, ${s(data.headline)}.`;
    case "ft-sitat":
      return `${emoji} «${s(data.quote)}»`;
    case "ft-jubileum-26juni":
      return `🎉 ${s(data.date)} — Leverandør-stander · Hold av dagen.`;
  }
}

function buildBody(type: FTType, data: DataLike): string {
  switch (type) {
    case "ft-referanse": {
      const tags = arr(data.tags) as string[];
      return [
        `Skreddersydd løsning, CAD-tegnet i CADLABen vår og CNC-maskinert på Brekstad.`,
        tags.length ? `Stikkord: ${tags.join(" · ")}.` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "ft-hdfi":
      return (arr(data.bullets) as string[])
        .slice(0, 3)
        .map((b) => `· ${b}`)
        .join("\n");
    case "ft-definisjon":
      return [s(data.etymology), s(data.example)].filter(Boolean).join("\n\n");
    case "ft-milepael":
      return (arr(data.body) as string[]).join(" ");
    case "ft-sitat":
      return `— ${s(data.attributedTo)}, ${s(data.role)}\n${s(data.company)}`;
    case "ft-jubileum-26juni": {
      const partners = arr(data.partners) as { name?: string }[];
      const names = partners.map((p) => p?.name).filter(Boolean).join(" · ");
      return [
        `Vi feirer 25 år & åpner ombygget butikk på Brekstad.`,
        `Åpent: ${s(data.openingHours)}. Grilling: ${s(data.grillingHours)}.`,
        `Møt ekspertene fra: ${names}.`,
      ].join("\n");
    }
  }
}

function pickHashtags(type: FTType): string {
  const base = ["#FosenTools", "#Skreddersøm", "#HDFI", "#Brekstad"];
  const typeTags: Record<FTType, string[]> = {
    "ft-referanse": ["#Leveranse", "#Verktøykontroll", "#CADLAB"],
    "ft-hdfi": ["#HDFI", "#FOD", "#CNCmaskinert", "#Verktøykontroll"],
    "ft-definisjon": ["#Fagord", "#Industri"],
    "ft-milepael": ["#25år", "#Jubileum", "#Fagfolk"],
    "ft-sitat": ["#Kundehistorie", "#Stolt"],
    "ft-jubileum-26juni": ["#25år", "#Jubileum", "#Butikkåpning", "#Brekstad"],
  };
  return [...base, ...typeTags[type]].slice(0, 10).join(" ");
}

function buildAltText({ type, data }: { type: FTType; data: DataLike }): string {
  let alt: string;
  switch (type) {
    case "ft-referanse":
      alt = `Fosen Tools-leveranse til ${s(data.eyebrow).replace(/^Levert til\s*/i, "") || "kunde"}: ${s(data.headline)}. CAD-tegnet, CNC-maskinert HDFI. ${(arr(data.tags) as string[]).join(", ")}.`;
      break;
    case "ft-hdfi":
      alt = `HDFI ${s(data.headline)} fra Fosen Tools. ${s(data.tagline)}. ${(arr(data.bullets) as string[]).slice(0, 2).join(". ")}.`;
      break;
    case "ft-definisjon":
      alt = `Fagord-definisjon: ${s(data.term)} (${s(data.partOfSpeech)}). ${s(data.definition)}.`;
      break;
    case "ft-milepael":
      alt = `${s(data.value)} ${s(data.unit)}, ${s(data.headline)}. ${(arr(data.body) as string[])[0] || ""}`;
      break;
    case "ft-sitat":
      alt = `Sitat fra ${s(data.attributedTo)}, ${s(data.role)} hos ${s(data.company)}: «${s(data.quote)}»`;
      break;
    case "ft-jubileum-26juni":
      alt = `Fosen Tools 25-årsjubileum og butikkåpning ${s(data.date)} på Brekstad. Åpent ${s(data.openingHours)}, grilling ${s(data.grillingHours)}.`;
      break;
  }

  return `# Alt-tekst for sosiale medier

Standard alt-tekst (Facebook + LinkedIn — settes når du publiserer):

\`\`\`
${alt}
\`\`\`

**Instagram:** alt-tekst legges manuelt via mobilappen ETTER publisering — Meta Business Suite støtter det ikke. Bytt til IG-app → Edit → Advanced → Alt text.
`;
}
