/**
 * torsdag-tipset.ts — torsdagens FT-innlegg i ett kall.
 *
 * Tre modi (alle uten Gemini, 100% deterministisk):
 *
 *   --mode for-og-etter    HDFI før/etter-leveranse (komposisjon: hdfi-before-after)
 *   --mode leverandor-tips Tips/produkt-spotlight fra leverandør (ft-leverandor)
 *   --mode produkt-tips    1 verktøy, 1 tips fra eget sortiment (ft-referanse)
 *
 * Hver modus genererer 3 aspekter (reel/square/wide) + captions + alt-tekst
 * i `out/dagens/YYYY-MM-DD/torsdag-<mode>/`.
 *
 * Bruk:
 *   npm run torsdag -- --mode for-og-etter --data scripts/data/torsdag-for-etter-eksempel.json
 *   npm run torsdag -- --mode leverandor-tips --data scripts/data/torsdag-leverandor-tips-eksempel.json
 *   npm run torsdag -- --mode produkt-tips --data scripts/data/torsdag-produkt-tips-eksempel.json
 *
 * Hvis --data utelates, brukes en standard sample for å vise format.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { renderVideo } from "../src/lib/services/video-render";
import type { VideoType, VideoFormat } from "../remotion/types";
import {
  SAMPLE_HDFI_BA,
  SAMPLE_FT_LEVERANDOR,
} from "../remotion/types";
import { validateCaption, logValidation } from "./caption-rules";
import { pickMusicBed } from "../remotion/audio-registry";

// ── arg-parsing ─────────────────────────────────────────────────────

type TorsdagMode = "for-og-etter" | "leverandor-tips" | "produkt-tips";

const VALID_MODES: TorsdagMode[] = [
  "for-og-etter",
  "leverandor-tips",
  "produkt-tips",
];

const args = process.argv.slice(2);
function arg(name: string, def?: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  return args[i + 1] ?? def;
}

const modeArg = arg("mode");
if (!modeArg || !VALID_MODES.includes(modeArg as TorsdagMode)) {
  console.error(
    `❌ --mode mangler eller ugyldig.\n   Velg: ${VALID_MODES.join(", ")}`,
  );
  process.exit(1);
}
const mode = modeArg as TorsdagMode;

const dataPath = arg("data");
const date = arg("date", new Date().toISOString().slice(0, 10))!;
const formats = (arg("formats", "reel,square,wide") || "reel")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const utmCampaign = arg("utm-campaign", `torsdag-${mode}-${date}`)!;

// ── mode → komposisjons-type + sample ───────────────────────────────

type ModeConfig = {
  type: VideoType;
  sample: Record<string, unknown>;
  emoji: string;
  modeLabel: string;
};

const MODE_CONFIG: Record<TorsdagMode, ModeConfig> = {
  "for-og-etter": {
    type: "hdfi-before-after",
    sample: SAMPLE_HDFI_BA as unknown as Record<string, unknown>,
    emoji: "🔄",
    modeLabel: "Før og etter HDFI",
  },
  "leverandor-tips": {
    type: "ft-leverandor",
    sample: SAMPLE_FT_LEVERANDOR as unknown as Record<string, unknown>,
    emoji: "🛠️",
    modeLabel: "Leverandør-spotlight",
  },
  "produkt-tips": {
    // Bruker ft-leverandor (FTLeverandorNyhet) — innebygget logo-hook
    // sentralt + tydelig eyebrow ("UKENS TIPS") + scene 2 med USP-bullets.
    // Gir den "gladere" og mer sentrerte følelsen Adrian vil ha.
    type: "ft-leverandor",
    sample: {
      ...(SAMPLE_FT_LEVERANDOR as unknown as Record<string, unknown>),
      supplierSlug: "wera",
      supplierName: "WERA",
      supplierLogoUrl:
        "https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/social_assets/brand-assets/leverandor-logoer/wera.png",
      productName: "KRAFTFORM",
      productTagline: "Riktig grep sparer håndleddet",
      bullets: [
        "Kraftform-skaftet fordeler trykk over hele hånden",
        "Mindre belastning på fingrene under repetitive jobber",
        "Tysk presisjon, hver dag på Brekstad",
      ],
      eyebrowOverride: "Ukens tips",
      badgeLabel: "TIPS",
      ctaUrl: "fosen-tools.no/wera",
    },
    emoji: "💡",
    modeLabel: "Ukens tips",
  },
};

const config = MODE_CONFIG[mode];

// ── data-resolution ─────────────────────────────────────────────────

let data: Record<string, unknown>;
if (dataPath) {
  if (!existsSync(dataPath)) {
    console.error(`❌ Data-fil finnes ikke: ${dataPath}`);
    process.exit(1);
  }
  data = JSON.parse(readFileSync(dataPath, "utf8"));
} else {
  console.log(`ℹ️  Ingen --data, bruker sample for ${mode}`);
  data = { ...config.sample };
}

// ── main ────────────────────────────────────────────────────────────

async function main() {
  const outDir = join("out", "dagens", date, `torsdag-${mode}`);
  mkdirSync(outDir, { recursive: true });
  console.log(
    `\n📁 ${outDir}\n   ${config.emoji} ${config.modeLabel} · ${utmCampaign}`,
  );

  const renderedFormats: { format: string; outPath: string; mb: string }[] = [];
  const t0 = performance.now();

  // Roter musikk per mode+dato så ikke 2 reels på rad får samme bed
  const musicVariant = pickMusicBed(`torsdag-${mode}-${date}`);
  console.log(`  🎵 Musikk: ${musicVariant}`);

  for (const format of formats) {
    if (!format || format === "noop") continue;
    process.stdout.write(`  ▸ ${format}: rendrer ... `);
    const tStart = performance.now();
    try {
      const result = await renderVideo(
        {
          type: config.type,
          data: { ...data, format: format as VideoFormat, musicVariant },
        },
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

  // Captions — narrativ tilpasset hver modus, 100% deterministisk (ingen AI).
  const blocks = buildTorsdagBlocks({ mode, data, utmCampaign, config });
  const html = buildTorsdagHtml({ mode, blocks, utmCampaign, config, date });
  writeFileSync(join(outDir, "captions.html"), html);
  console.log(`  ✓ captions.html`);

  // Plain-text-versjon kun for validering
  const flat = `${blocks.fb}\n\n${blocks.ig}\n\n${blocks.li}`;
  console.log(`\n  Validerer captions mot brand-regler:`);
  logValidation("captions", validateCaption(flat));

  const altText = buildTorsdagAltText({ mode, data, config });
  writeFileSync(join(outDir, "alt-tekst.md"), altText);
  console.log(`  ✓ alt-tekst.md`);

  const totalSec = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(
    `\n✅ Ferdig på ${totalSec}s. ${renderedFormats.length}/${formats.filter((f) => f && f !== "noop").length} formater rendret.`,
  );
  console.log(`\nÅpne i Finder:`);
  console.log(`  open "${outDir}"`);
}

// ───────────────────────────────────────────────────────────────────
// CAPTION-BYGGER (deterministisk, ingen AI)
// ───────────────────────────────────────────────────────────────────

type DataLike = Record<string, unknown>;

function s(v: unknown, fallback = ""): string {
  return v == null ? fallback : String(v);
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

type TorsdagBlocks = { fb: string; ig: string; li: string; hashtags: string };

function buildTorsdagBlocks({
  mode,
  data,
  utmCampaign,
  config,
}: {
  mode: TorsdagMode;
  data: DataLike;
  utmCampaign: string;
  config: ModeConfig;
}): TorsdagBlocks {
  const utm = (source: string) =>
    `?utm_source=${source}&utm_medium=social&utm_campaign=${encodeURIComponent(utmCampaign)}`;
  const ctaUrl = s(data.ctaUrl, "fosen-tools.no").replace(/^https?:\/\//, "");
  const emoji = config.emoji;

  let fb = "";
  let ig = "";
  let li = "";
  let hashtags = "";

  if (mode === "for-og-etter") {
    const customerName = s(data.customerName, "Tidligere leveranse");
    const description = s(
      data.description,
      "Fra rotete hyllevare til skreddersydd HDFI med gravert silhuett, hver pipe på rett plass.",
    );

    fb = [
      `${emoji} Før og etter HDFI · ${customerName}`,
      "",
      description,
      "",
      "Tegnet i CADLABen på Brekstad, CNC-maskinert hos oss på verkstedet. Samme verktøy, helt annen kontroll.",
      "",
      `→ https://${ctaUrl}${utm("facebook")}`,
    ].join("\n");

    ig = [
      `${emoji} Før HDFI vs etter`,
      "",
      description,
      "",
      "Skreddersydd i CADLABen, CNC-maskinert hos Fosen Tools på Brekstad.",
      "",
      "Link i bio.",
    ].join("\n");

    li = [
      `${emoji} Før og etter HDFI · ${customerName}`,
      "",
      description,
      "",
      "Hver pipe har sin egen posisjon. Tegnet i CADLABen, CNC-maskinert hos Fosen Tools på Brekstad. Skreddersøm er det vi gjør best.",
      "",
      `→ https://${ctaUrl}${utm("linkedin")}`,
    ].join("\n");

    hashtags =
      "#FosenTools #HDFI #Skreddersøm #CNCmaskinert #CADLABen #Brekstad #VerktoyKontroll #FørOgEtter";
  } else if (mode === "leverandor-tips") {
    const supplier = s(data.supplierName, "Leverandør");
    const product = s(data.productName, "");
    const tagline = s(data.productTagline, "");
    const bullets = arr(data.bullets)
      .map((b) => `· ${String(b)}`)
      .join("\n");

    fb = [
      `${emoji} Ukens spotlight · ${supplier}`,
      "",
      product ? `${product}: ${tagline}` : tagline,
      "",
      "Førsteklasses kvalitet, levert fra Brekstad.",
      "",
      `→ https://${ctaUrl}${utm("facebook")}`,
    ]
      .filter(Boolean)
      .join("\n");

    ig = [
      `${emoji} ${supplier}`,
      "",
      product,
      tagline,
      "",
      "Link i bio.",
    ]
      .filter(Boolean)
      .join("\n");

    li = [
      `${emoji} ${supplier} · ${product}`,
      "",
      tagline,
      bullets ? "\n" + bullets : "",
      "",
      "Førsteklasses verktøy, tilgjengelig fra Fosen Tools på Brekstad.",
      "",
      `→ https://${ctaUrl}${utm("linkedin")}`,
    ]
      .filter(Boolean)
      .join("\n");

    const supplierSlug = s(data.supplierSlug, "").toLowerCase().replace(/\s+/g, "");
    hashtags = [
      "#FosenTools",
      supplierSlug ? `#${supplierSlug}` : "",
      "#Verktøy",
      "#Brekstad",
      "#Pro",
    ]
      .filter(Boolean)
      .join(" ");
  } else if (mode === "produkt-tips") {
    const supplier = s(data.supplierName, "Leverandør");
    const product = s(data.productName, "");
    const tagline = s(data.productTagline, "");
    const bullets = arr(data.bullets)
      .map((b) => `· ${String(b)}`)
      .join("\n");
    const supplierSlug = s(data.supplierSlug, "").toLowerCase().replace(/\s+/g, "");

    fb = [
      `${emoji} Ukens tips · ${supplier}`,
      "",
      product ? `${product}: ${tagline}` : tagline,
      "",
      "Lite grep som sparer tid hver dag. Smarte verktøy, brukt smart.",
      "",
      `→ https://${ctaUrl}${utm("facebook")}`,
    ]
      .filter(Boolean)
      .join("\n");

    ig = [
      `${emoji} Ukens tips`,
      "",
      `${supplier} ${product}`,
      tagline,
      "",
      "Link i bio.",
    ]
      .filter(Boolean)
      .join("\n");

    li = [
      `${emoji} Ukens tips · ${supplier} ${product}`,
      "",
      tagline,
      bullets ? "\n" + bullets : "",
      "",
      "Når riktig verktøy spares minutter, blir det timer over en uke.",
      "",
      `→ https://${ctaUrl}${utm("linkedin")}`,
    ]
      .filter(Boolean)
      .join("\n");

    hashtags = [
      "#FosenTools",
      "#Ukenstips",
      supplierSlug ? `#${supplierSlug}` : "",
      "#Verktøy",
      "#Brekstad",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return { fb, ig, li, hashtags };
}

function escHtmlT(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildTorsdagHtml({
  mode,
  blocks,
  utmCampaign,
  config,
  date,
}: {
  mode: TorsdagMode;
  blocks: TorsdagBlocks;
  utmCampaign: string;
  config: ModeConfig;
  date: string;
}): string {
  const { fb, ig, li, hashtags } = blocks;
  const igFull = `${ig}\n\n${hashtags}`;
  return `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8">
<title>Captions — torsdag-${mode} · ${date}</title>
<style>
  :root { --red:#ED1C24; --ink:#0F1115; --ink2:#1c1f26; --line:#2a2f38; --text:#e9edf3; --muted:#9aa3b2; }
  *{box-sizing:border-box}
  body{background:var(--ink);color:var(--text);font-family:-apple-system,"Helvetica Neue",Arial,sans-serif;margin:0;padding:40px 24px 80px;line-height:1.5}
  .wrap{max-width:760px;margin:0 auto}
  h1{margin:0 0 4px;font-size:28px;letter-spacing:-.5px}
  .sub{color:var(--muted);font-size:14px;margin-bottom:32px}
  .card{background:var(--ink2);border:1px solid var(--line);border-radius:12px;padding:20px 22px;margin-bottom:18px}
  .card h2{margin:0 0 12px;font-size:17px;color:var(--red);text-transform:uppercase;letter-spacing:1.5px}
  .card .meta{color:var(--muted);font-size:13px;margin-bottom:14px}
  pre{background:#0a0c10;border:1px solid var(--line);border-radius:8px;padding:16px;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,"SF Mono",monospace;font-size:13.5px;margin:0 0 12px;color:#d7dde6}
  button{background:var(--red);color:#fff;border:0;padding:10px 18px;font-size:14px;font-weight:600;border-radius:6px;cursor:pointer;letter-spacing:.3px}
  button:hover{background:#d8181f}
  button.ok{background:#1c8a3a}
  .footer{margin-top:28px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:13.5px}
  .footer b{color:var(--text)}
</style>
</head>
<body>
<div class="wrap">

<h1>${config.emoji} Torsdag · ${config.modeLabel}</h1>
<div class="sub">${date} · UTM-kampanje <code>${escHtmlT(utmCampaign)}</code></div>

<div class="card">
  <h2>Facebook</h2>
  <div class="meta">~250 tegn, klikkbar URL med UTM</div>
  <pre id="fb">${escHtmlT(fb)}</pre>
  <button data-target="fb">Kopier Facebook</button>
</div>

<div class="card">
  <h2>Instagram</h2>
  <div class="meta">Hashtags på slutten · link i bio</div>
  <pre id="ig">${escHtmlT(igFull)}</pre>
  <button data-target="ig">Kopier Instagram</button>
</div>

<div class="card">
  <h2>LinkedIn</h2>
  <div class="meta">Fagspråk, fagstolthet, klikkbar URL med UTM</div>
  <pre id="li">${escHtmlT(li)}</pre>
  <button data-target="li">Kopier LinkedIn</button>
</div>

<div class="footer">
  <b>Postingstid:</b> torsdag kl 12:00 (snitt 162 eng. vs 19 onsdag)<br>
  <b>Alt-tekst:</b> legg til via Instagram-mobilapp etter publisering<br>
</div>

</div>
<script>
document.querySelectorAll("button[data-target]").forEach(btn=>{
  btn.addEventListener("click",async()=>{
    const el=document.getElementById(btn.getAttribute("data-target"));
    if(!el)return;
    const text=el.textContent;
    try{await navigator.clipboard.writeText(text);}
    catch{const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();}
    const orig=btn.textContent;
    btn.textContent="✓ Kopiert";
    btn.classList.add("ok");
    setTimeout(()=>{btn.textContent=orig;btn.classList.remove("ok");},1400);
  });
});
</script>
</body>
</html>
`;
}

function buildTorsdagAltText({
  mode,
  data,
  config,
}: {
  mode: TorsdagMode;
  data: DataLike;
  config: ModeConfig;
}): string {
  let alt = "";
  if (mode === "for-og-etter") {
    const customerName = s(data.customerName, "kunde");
    alt = `Før og etter HDFI-leveranse til ${customerName}. Venstre: rotete hyllevare-skuff. Høyre: skreddersydd HDFI med gravert silhuett, hver pipe på rett plass. Tegnet i CADLABen og CNC-maskinert hos Fosen Tools på Brekstad.`;
  } else if (mode === "leverandor-tips") {
    const supplier = s(data.supplierName, "leverandør");
    const product = s(data.productName, "produkt");
    const tagline = s(data.productTagline, "");
    alt = `${supplier} ${product}. ${tagline} Tilgjengelig fra Fosen Tools på Brekstad.`;
  } else if (mode === "produkt-tips") {
    const supplier = s(data.supplierName, "leverandør");
    const product = s(data.productName, "produkt");
    const tagline = s(data.productTagline, "");
    alt = `Ukens tips: ${supplier} ${product}. ${tagline} Fra Fosen Tools på Brekstad.`;
  }
  return `# Alt-tekst — torsdag-${mode}

\`\`\`
${alt}
\`\`\`

**Bruk:** Legg inn via Instagram-mobilappen etter publisering (Meta Business Suite støtter ikke IG-alt-tekst).
`;
}

main().catch((err) => {
  console.error("\n❌", err);
  process.exit(1);
});
