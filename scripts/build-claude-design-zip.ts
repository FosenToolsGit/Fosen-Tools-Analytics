/**
 * Bygg ZIP-pakke for Claude Design — Innleggsbygger-malsystemet.
 *
 * Pakker render-kildekoden, FT-merkevare-SCSS, brand-assets, ferdig-rendrede
 * eksempel-PNG-er og en design-brief. Claude Design bruker dette til å
 * perfeksjonere designet på alle 12 malene ut fra FT sin egen SCSS.
 *
 * Kjør: npx tsx scripts/build-claude-design-zip.ts
 * Resultat: ~/Desktop/fosen-innleggsbygger-claude-design.zip
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { renderMalPng, type MalInput } from "../src/lib/services/mal-render";
import { renderFeaturePng } from "../src/lib/services/feature-render";
import { renderOfferPng } from "../src/lib/services/produkt-tilbud-render";
import { renderProduktVariantPng } from "../src/lib/services/produkt-variant-render";
import { closeRenderBrowser } from "../src/lib/services/render-common";

const HOME = process.env.HOME ?? "";
const ROOT = process.cwd();
const STAGE = path.join("/tmp", "ft-claude-design-pkg");
const ZIP_OUT = path.join(HOME, "Desktop", "fosen-innleggsbygger-claude-design.zip");
const SCSS_SRC = path.join(
  ROOT,
  "../../../Fosen Tools Nettside Utsende/FosenTools.scss"
);

function rmrf(p: string) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}
function ensure(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}
function copy(src: string, destRel: string) {
  const dest = path.join(STAGE, destRel);
  ensure(path.dirname(dest));
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  + ${destRel}`);
  } else {
    console.warn(`  ! mangler: ${src}`);
  }
}
function writeFile(destRel: string, content: string) {
  const dest = path.join(STAGE, destRel);
  ensure(path.dirname(dest));
  fs.writeFileSync(dest, content);
  console.log(`  + ${destRel}`);
}

// ── Eksempel-render: 8 tilstedeværelse-maler ──
const MAL_CASES: { name: string; build: (w: number, h: number) => MalInput }[] = [
  {
    name: "prosess",
    build: (w, h) => ({
      mal: "prosess",
      eyebrow: "Slik jobber vi",
      headline: "Fra idé til ferdig HDFI",
      redWord: "HDFI",
      steps: [
        { title: "CAD-tegning", text: "Hver posisjon tegnes i CADLAB etter dine verktøy." },
        { title: "CNC-maskinering", text: "Eksakt passform freses ut i Brekstad." },
        { title: "Kvalitetskontroll", text: "Hver leveranse sjekkes mot spesifikasjon." },
        { title: "Levering", text: "Ferdig løsning, klar til bruk — typisk 2-4 uker." },
      ],
      cta: "fosen-tools.no/hdfi",
      background: "ink",
      width: w,
      height: h,
    }),
  },
  {
    name: "leveranse",
    build: (w, h) => ({
      mal: "leveranse",
      eyebrow: "Levert",
      customer: "TESS VEST",
      headline: "Skreddersydd OPTI-koffert med HDFI",
      redWord: "HDFI",
      segment: "Industri",
      description:
        "Kraftpipe-sett 22-38 mm i koffert med CNC-maskinert HDFI — hver pipe har sin plass.",
      cta: "fosen-tools.no",
      background: "ink",
      width: w,
      height: h,
    }),
  },
  {
    name: "besok",
    build: (w, h) => ({
      mal: "besok",
      eyebrow: "På besøk hos",
      company: "Andøya Space",
      location: "Andøya",
      description:
        "Vi tok turen til Andøya Space for å se hvordan verktøyløsningene våre brukes i praksis.",
      cta: "fosen-tools.no",
      background: "ink",
      width: w,
      height: h,
    }),
  },
  {
    name: "stand",
    build: (w, h) => ({
      mal: "stand",
      eyebrow: "Møt oss",
      eventName: "Verktøymessen 2026",
      redWord: "2026",
      location: "Trondheim Spektrum",
      date: "14.-16. mars",
      standNr: "B-24",
      description: "Kom innom for en prat om HDFI, verktøykontroll og skreddersøm.",
      cta: "kom innom standen",
      background: "red",
      width: w,
      height: h,
    }),
  },
  {
    name: "ansatt",
    build: (w, h) => ({
      mal: "ansatt",
      eyebrow: "Møt teamet",
      name: "Ola Nordmann",
      role: "CADLAB-tegner",
      years: "8 år i FT",
      quote: "Den beste følelsen er når verktøyet klikker på plass — eksakt der det skal.",
      funFact: "Har tegnet over 2 000 HDFI-innlegg siden 2018.",
      background: "ink",
      width: w,
      height: h,
    }),
  },
  {
    name: "sitat",
    build: (w, h) => ({
      mal: "sitat",
      quote:
        "Fosen Tools leverer en standard vi ikke finner andre steder. HDFI-løsningene deres har endret hvordan vi jobber.",
      attributionName: "Kari Hansen",
      attributionRole: "Verkstedsleder",
      attributionCompany: "Lufttransport AS",
      background: "red",
      width: w,
      height: h,
    }),
  },
  {
    name: "milepael",
    build: (w, h) => ({
      mal: "milepael",
      eyebrow: "Fosen Tools",
      number: "25",
      unit: "år",
      headline: "Et kvart århundre med verktøyløsninger",
      body: "Siden 2001 — del av et familiekonsern med 100 år bak seg.",
      background: "ink",
      width: w,
      height: h,
    }),
  },
  {
    name: "partner",
    build: (w, h) => ({
      mal: "partner",
      eyebrow: "Samarbeidspartner",
      partnerName: "Wera",
      headline: "Tysk presisjon i sortimentet",
      description:
        "Vi fører hele Wera-sortimentet — kvalitetsverktøy for fagfolk, på lager i Brekstad.",
      cta: "fosen-tools.no/wera",
      background: "ink",
      width: w,
      height: h,
    }),
  },
];

const ASPECTS = [
  { slug: "fb", w: 1080, h: 1080 },
  { slug: "li", w: 1200, h: 675 },
];

// Stabilt demo-foto fra fosen-tools.no for foto-varianter
const DEMO_PHOTO =
  "https://fosen-tools.no/userfiles/image/HDFI/HDFI%20-%20Info-6.jpg";

async function renderSamples() {
  console.log("\nRendrer eksempel-PNG-er …");
  const dir = path.join(STAGE, "eksempler");
  ensure(dir);

  // 8 tilstedeværelse-maler — tekst-variant (fb+li) + foto-variant (fb+li)
  for (const c of MAL_CASES) {
    for (const a of ASPECTS) {
      const textPng = await renderMalPng(c.build(a.w, a.h));
      fs.writeFileSync(
        path.join(dir, `mal-${c.name}-${a.slug}-tekst.png`),
        Buffer.from(textPng.base64, "base64")
      );
      const fotoPng = await renderMalPng({
        ...c.build(a.w, a.h),
        imageUrl: DEMO_PHOTO,
      });
      fs.writeFileSync(
        path.join(dir, `mal-${c.name}-${a.slug}-foto.png`),
        Buffer.from(fotoPng.base64, "base64")
      );
      console.log(`  ✓ mal-${c.name}-${a.slug} (tekst + foto)`);
    }
  }

  // feature/tjeneste-mal — tekst + foto-variant
  for (const a of ASPECTS) {
    const base = {
      eyebrow: "Egen produksjon",
      headline: "HDFI — verktøykontroll med presisjon",
      redWord: "HDFI",
      intro: "Skreddersydde skuminnlegg som gir hvert verktøy sin faste plass.",
      benefits: [
        "CAD-tegnet og CNC-maskinert i Brekstad",
        "Synlig kontroll — du ser umiddelbart hva som mangler",
        "FOD-sikring for luftfart og forsvar",
        "Tåler olje, løsemidler og hard bruk",
      ],
      cta: "fosen-tools.no/hdfi",
      background: "ink" as const,
      width: a.w,
      height: a.h,
    };
    const textPng = await renderFeaturePng(base);
    fs.writeFileSync(
      path.join(dir, `feature-${a.slug}-tekst.png`),
      Buffer.from(textPng.base64, "base64")
    );
    const fotoPng = await renderFeaturePng({ ...base, imageUrl: DEMO_PHOTO });
    fs.writeFileSync(
      path.join(dir, `feature-${a.slug}-foto.png`),
      Buffer.from(fotoPng.base64, "base64")
    );
    console.log(`  ✓ feature-${a.slug} (tekst + foto)`);
  }

  // produkt-tilbud — 3 layouts
  const demoProducts = [
    {
      name: "Facom verktøyvogn JET+",
      priceNow: 16990,
      priceBefore: 28990,
      imageUrl: null,
      manufacturer: "Facom",
      manufacturerLogoUrl: null,
    },
    {
      name: "Knipex avbitertang 250 mm",
      priceNow: 690,
      priceBefore: 990,
      imageUrl: null,
      manufacturer: "Knipex",
      manufacturerLogoUrl: null,
    },
    {
      name: "Wera Kraftform skrutrekkersett",
      priceNow: 1290,
      priceBefore: 1790,
      imageUrl: null,
      manufacturer: "Wera",
      manufacturerLogoUrl: null,
    },
    {
      name: "Milwaukee M18 slagtrekker",
      priceNow: 3490,
      priceBefore: 4490,
      imageUrl: null,
      manufacturer: "Milwaukee",
      manufacturerLogoUrl: null,
    },
  ];
  for (const layout of ["single", "grid", "manufacturer"] as const) {
    const png = await renderOfferPng({
      layout,
      products: layout === "single" ? demoProducts.slice(0, 1) : demoProducts,
      eyebrow: "Ukens tilbud",
      headline: layout === "single" ? "Spar 12 000" : null,
      manufacturer: layout === "manufacturer" ? "Facom" : null,
      manufacturerLogoUrl: null,
      cta: "fosen-tools.no",
      background: "ink",
      width: 1080,
      height: 1080,
    });
    fs.writeFileSync(
      path.join(dir, `offer-${layout}-fb.png`),
      Buffer.from(png.base64, "base64")
    );
    console.log(`  ✓ offer-${layout}-fb.png`);
  }

  // produkt-variant — HDFI fargevisning
  for (const a of ASPECTS) {
    const png = await renderProduktVariantPng({
      headline: "HDFI i seks standardfarger",
      redWord: "HDFI",
      body: "Velg fargen som passer ditt kvalitetssystem.",
      width: a.w,
      height: a.h,
    });
    fs.writeFileSync(
      path.join(dir, `produkt-variant-${a.slug}.png`),
      Buffer.from(png.base64, "base64")
    );
    console.log(`  ✓ produkt-variant-${a.slug}.png`);
  }

  await closeRenderBrowser();
}

const DESIGN_BRIEF = `# Fosen Tools — Innleggsbygger: Design-brief til Claude Design

## Hva dette er

Fosen Tools har en **mal-basert innleggsbygger** for sosiale medier
(Facebook, Instagram, LinkedIn). I stedet for AI-genererte bilder — som
gjentatte ganger feilstavet norske ord og plasserte elementer feil —
rendrer vi postene **deterministisk via HTML→PNG** (headless Chromium /
Playwright). Pixel-perfekt, on-brand, gratis, alltid korrekt norsk.

Denne pakken inneholder hele render-kildekoden, FT sin merkevare-SCSS,
brand-assets og ferdig-rendrede eksempler. **Oppgaven din: perfeksjoner
det visuelle designet på alle 12 malene** slik at de matcher Fosen Tools
sitt grafiske uttrykk (se \`FosenTools.scss\`).

## Mappestruktur

\`\`\`
render-kode/        TypeScript-kildekoden som bygger HTML-en
  render-common.ts        Felles infrastruktur (tokens, font, decor, render)
  mal-render.ts           8 tilstedeværelse-maler
  feature-render.ts       Tjeneste/feature-mal (HDFI, CADLAB)
  produkt-tilbud-render.ts Produkt-tilbud (single/grid/manufacturer)
  produkt-variant-render.ts HDFI fargevisning
  route.ts                API-rute som dispatcher malene
  poster-page.tsx         Innleggsbygger-UI (React)
brand/              FT brand-assets
  FosenTools.scss         FT sin offisielle nettside-SCSS (kilde for stil)
  fonts/                  Manrope woff2 (400/700/800)
  ft-wordmark-*.png       Wordmark hvit + ink
  Jubileumslogo-*.svg     25-år + 100-år offisielle logoer
eksempler/          Ferdig-rendrede PNG-er — slik ser malene ut nå
DESIGN-BRIEF.md     Dette dokumentet
\`\`\`

## FT design-tokens (fra render-common.ts)

| Token | Verdi | Bruk |
|---|---|---|
| FT-rød | \`#ED1C24\` | Aksent, rødt nøkkelord, accent-linje |
| FT-ink | \`#0F1115\` | Mørk bakgrunn, tekst på lys bg |
| Hvit | \`#FFFFFF\` | Tekst på mørk/rød bg |
| Burst-gul | \`#F4D43A\` | Pris-burst, kampanje-stempel |
| Gull-gradient | \`#85704D → #DBB78B\` | Jubileumstall (25/100) |
| Krem | \`#F5F1E8\` | Lys bakgrunn (kun tilstedeværelse-maler) |

Font: **Manrope** (400/700/800) — embeddet som base64. FT sin egen
nettside bruker Korolev (condensed), men Manrope er den nærmeste
fritt tilgjengelige erstatningen og brukes konsekvent i alle FT-verktøy.

## De 12 malene

### Produkt-maler (4)
1. **single** — ett produkt stort, pris-blokk + burst
2. **grid** — 3-6 produkter i rutenett
3. **manufacturer** — «Mest kjøpt fra {Merke}»
4. **feature** — tjeneste-post (HDFI, CADLAB): fordeler + CTA

### Tilstedeværelse-maler (8) — \`mal-render.ts\`
5. **prosess** — «Slik jobber vi» — nummererte steg
6. **leveranse** — «Levert til {kunde}» — vis frem en jobb
7. **besok** — «På besøk hos {bedrift}»
8. **stand** — «Møt oss på {messe}» — dato/sted/stand-nr
9. **ansatt** — «Møt teamet» — portrett + sitat
10. **sitat** — stort kundesitat med attribusjon
11. **milepael** — stort tall (25 år, 100 år)
12. **produkt-variant** — HDFI i seks standardfarger

## Format / dimensjoner

| Slug | Px | Plattform |
|---|---|---|
| fb | 1080×1080 | Facebook (1:1) |
| ig | 1080×1350 | Instagram (4:5) |
| li | 1200×675 | LinkedIn (16:9) |

Hver mal må fungere i **alle tre** format. Koden velger landscape-
vs portrait-layout via \`land = W > H * 1.2\`.

## Felles FT-signatur (allerede implementert)

- **Blueprint-decor** i alle fire hjørner (teknisk tegning-estetikk)
- **Wordmark-pille** sentrert nederst (rounded frame rundt FT-logo)
- Rødt nøkkelord i headline (ett ord får FT-rød farge)
- Accent-strek (3px FT-rød) under eyebrow/headline

## Foto-variant — hver mal har to layouts

Hver av de 8 tilstedeværelse-malene + feature-malen har et valgfritt
\`imageUrl\`-felt. Dette gir **to varianter per mal**:

- **Tekst-variant** (uten bilde) — tekstinnholdet fyller hele flaten.
- **Foto-variant** (med bilde) — \`frameMal()\` (i mal-render.ts) legger
  bildet som kolonne i landscape (44%) eller toppband i portrett (46%),
  og tekstinnholdet flyttes ved siden av / under. Hovedtekst skaleres ned
  ~18% (\`textScale()\`) siden spalten blir smalere.

I \`eksempler/\` ligger begge variantene side om side
(\`mal-{navn}-{format}-tekst.png\` og \`...-foto.png\`). Designet ditt må
fungere i begge — det er egentlig 9 maler × 2 varianter × 3 format.

## Hva vi ønsker fra deg (Claude Design)

1. **Løft det visuelle** — typografi-hierarki, spacing, rytme. Malene
   fungerer, men kan bli skarpere og mer «designet».
2. **Vær tro mot FosenTools.scss** — bruk samme estetikk som nettsiden:
   se på \`.ftseo\`, \`.ft-hero-scaled\`, \`.ft-catgrid\`, knapp-stiler,
   farger, letter-spacing-konvensjoner.
3. **Behold determinismen** — alt må kunne rendres som ren HTML/CSS i
   Chromium. Ingen JS-avhengig layout, ingen eksterne fonter (Manrope
   er embeddet), ingen ting som krever AI.
4. **Behold strukturen** — datamodellen (felter per mal) er fast. Du
   designer hvordan feltene presenteres, ikke hvilke felter som finnes.
5. Lever gjerne tilbake **oppdaterte template-funksjoner** eller en
   CSS-spesifikasjon vi kan flette inn i \`*-render.ts\`.

## Kjente svakheter å fikse

- Foto-plassholdere er enkle stiplede bokser — kan bli mer elegante.
- Tilstedeværelse-malene deler mye CSS men kunne hatt mer distinkt
  karakter per mal-type.
- Krem-bakgrunn (\`cream\`) er lite testet — kontroller kontrast.
- LinkedIn 16:9 er trangt for tekst-tunge maler (prosess, feature) —
  vurder tettere layout eller mindre type.

## Teknisk kontekst

- Render: \`renderHtmlToPng(html, w, h)\` i render-common.ts —
  2x device-scale, venter på \`document.fonts.ready\`.
- Alle maler bygger én stor HTML-streng med inline \`<style>\`.
- \`escapeHtml\` brukes på all brukerinput.
- Norske tegn (æøå) rendres korrekt fordi alt er ekte HTML-tekst.

Takk! — Fosen Tools AS, Brekstad
`;

async function main() {
  console.log("Bygger Claude Design-pakke …\n");
  rmrf(STAGE);
  ensure(STAGE);

  // ── Render-kildekode ──
  console.log("Kopierer render-kildekode …");
  const svc = "src/lib/services";
  copy(path.join(ROOT, svc, "render-common.ts"), "render-kode/render-common.ts");
  copy(path.join(ROOT, svc, "mal-render.ts"), "render-kode/mal-render.ts");
  copy(path.join(ROOT, svc, "feature-render.ts"), "render-kode/feature-render.ts");
  copy(
    path.join(ROOT, svc, "produkt-tilbud-render.ts"),
    "render-kode/produkt-tilbud-render.ts"
  );
  copy(
    path.join(ROOT, svc, "produkt-variant-render.ts"),
    "render-kode/produkt-variant-render.ts"
  );
  copy(
    path.join(ROOT, "src/app/api/innleggsbygger/render-mal/route.ts"),
    "render-kode/route.ts"
  );
  copy(
    path.join(ROOT, "src/app/(dashboard)/innleggsbygger/poster/page.tsx"),
    "render-kode/poster-page.tsx"
  );

  // ── Brand-assets ──
  console.log("Kopierer brand-assets …");
  copy(SCSS_SRC, "brand/FosenTools.scss");
  for (const f of [
    "manrope-latin-400-normal.woff2",
    "manrope-latin-700-normal.woff2",
    "manrope-latin-800-normal.woff2",
  ]) {
    copy(path.join(ROOT, "public/social/fonts", f), `brand/fonts/${f}`);
  }
  for (const f of ["ft-wordmark-white.png", "ft-wordmark-ink.png"]) {
    copy(path.join(ROOT, "public/social/brand-assets", f), `brand/${f}`);
  }
  for (const y of [25, 100]) {
    copy(
      path.join(ROOT, `public/brosjyre/Jubileumslogo-${y}aar.svg`),
      `brand/Jubileumslogo-${y}aar.svg`
    );
  }

  // ── Design-brief ──
  writeFile("DESIGN-BRIEF.md", DESIGN_BRIEF);

  // ── Eksempel-render ──
  await renderSamples();

  // ── Zip ──
  console.log("\nPakker ZIP …");
  rmrf(ZIP_OUT);
  execSync(`cd "${STAGE}" && zip -r -q "${ZIP_OUT}" .`, { stdio: "inherit" });
  const sizeMb = (fs.statSync(ZIP_OUT).size / 1024 / 1024).toFixed(2);
  console.log(`\n✓ Ferdig — ${ZIP_OUT} (${sizeMb} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
