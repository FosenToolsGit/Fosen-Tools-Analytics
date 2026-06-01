/**
 * build-definisjon-bank.mjs — bygger 12 Definisjon-poster i 3 formater hver.
 *
 * Bruker `renderDefinisjonPoster` (server-side HTML→PNG via Playwright).
 * Lagrer i out/innlegg-bank-juni/definisjon/{nr}-{slug}/
 *
 *   - bilde-1x1.png   (1080×1080, FB/IG feed)
 *   - bilde-4x5.png   (1080×1350, IG portrett)
 *   - bilde-16x9.png  (1920×1080, LinkedIn / desktop)
 *   - metadata.json
 *   - caption-facebook.txt / caption-instagram.txt / caption-linkedin.txt
 *
 *   npx tsx --env-file=.env.local scripts/build-definisjon-bank.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { renderDefinisjonPoster } from "../src/lib/services/ft-poster-render.ts";
import { closeRenderBrowser } from "../src/lib/services/render-common.ts";

const ROOT = "out/innlegg-bank-juni/definisjon";

// ── Tema-spec (12 stk fra deepdive-rapporten) ────────────────────────

const TEMAER = [
  {
    nr: 1,
    slug: "hdfi-verktoykontroll",
    eyebrow: "HDFI",
    headline: "Verktøykontroll med gravert silhuett",
    bodyLines: [
      "CAD-tegnet, CNC-maskinert.",
      "Hver lomme planlagt rundt verktøyet.",
      "To-farget plastplate over null-absorberende skum.",
    ],
    captions: {
      facebook:
        "🛠️ HDFI = High Density Foam Insert. CAD-tegnet og CNC-maskinert i Brekstad — hver lomme planlagt rundt verktøyet. Skreddersydd for din arbeidsflyt. https://fosen-tools.no/hdfi?utm_source=facebook&utm_medium=social&utm_campaign=definisjon-juni",
      instagram:
        "🛠️ HDFI: Verktøykontroll med gravert silhuett. CAD-tegnet, CNC-maskinert i Brekstad. Lenke i bio. #fosentools #hdfi #verktoy",
      linkedin:
        "HDFI — High Density Foam Insert. To-farget plastplate over null-absorberende skum, CAD-tegnet og CNC-maskinert hos oss i Brekstad. Hvert verktøy får sin lomme, planlagt rundt arbeidsflyten. Resultatet: synlig kontroll, mindre svinn, raskere drift. https://fosen-tools.no/hdfi?utm_source=linkedin&utm_medium=social&utm_campaign=definisjon-juni",
    },
  },
  {
    nr: 2,
    slug: "cadlab-tegning-og-utvikling",
    eyebrow: "CADLAB",
    headline: "Tegning- og utviklingsavdelingen",
    bodyLines: [
      "3D-modellerer hver løsning.",
      "Tester før vi produserer.",
      "Egen avdeling, ikke underleverandør.",
    ],
    captions: {
      facebook:
        "✏️ CADLAB — vår egen tegning- og utviklingsavdeling. 3D-modellerer hver skreddersydde løsning før vi produserer. Egen avdeling, ikke underleverandør. https://fosen-tools.no/cadlab?utm_source=facebook&utm_medium=social&utm_campaign=definisjon-juni",
      instagram:
        "✏️ CADLAB: vår egen tegnestue. Hver løsning 3D-modelleres før produksjon. Lenke i bio. #fosentools #cadlab #skreddersom",
      linkedin:
        "CADLAB er vår egen tegning- og utviklingsavdeling — ikke en underleverandør. Hver skreddersydde løsning 3D-modelleres, gjennomgås med kunden og testes før vi setter i produksjon. Det gir kortere ledetid, færre overraskelser og én tydelig ansvarslinje. https://fosen-tools.no/cadlab?utm_source=linkedin&utm_medium=social&utm_campaign=definisjon-juni",
    },
  },
  {
    nr: 3,
    slug: "fod-foreign-object-damage",
    eyebrow: "FOD",
    headline: "Foreign Object Damage",
    bodyLines: [
      "Synlig hull der verktøyet skal ligge.",
      "Reduserer risiko og styrker sikkerheten.",
      "Standardisert for luftfart og forsvar.",
    ],
    captions: {
      facebook:
        "✈️ FOD = Foreign Object Damage. HDFI gir synlig hull der verktøyet skal ligge — du ser umiddelbart om noe mangler. Standardisert for luftfart og forsvar. https://fosen-tools.no/aviation?utm_source=facebook&utm_medium=social&utm_campaign=definisjon-juni",
      instagram:
        "✈️ FOD: Foreign Object Damage. HDFI viser hva som mangler. Sikkerhet du kan se. #fosentools #fod #aviation",
      linkedin:
        "FOD — Foreign Object Damage — er et anerkjent risikopunkt i luftfart, forsvar og industri. Skreddersydde HDFI-innlegg gir synlig hull der verktøyet skal ligge, så avvik fanges umiddelbart. Standardisert prosedyre, færre hendelser, sterkere sikkerhetskultur. https://fosen-tools.no/aviation?utm_source=linkedin&utm_medium=social&utm_campaign=definisjon-juni",
    },
  },
  {
    nr: 4,
    slug: "5s-lean-i-praksis",
    eyebrow: "5S",
    headline: "Sortér, systematisér, skinn, standardisér, sustain",
    bodyLines: [
      "Lean-rammeverket i praksis.",
      "Hvert verktøy har én plass.",
      "Tid spart, færre feil, bedre arbeidsdag.",
    ],
    captions: {
      facebook:
        "📦 5S — Lean-rammeverket i praksis. Hvert verktøy får sin plass. Resultat: tid spart, færre feil, bedre arbeidsdag. https://fosen-tools.no/hdfi?utm_source=facebook&utm_medium=social&utm_campaign=definisjon-juni",
      instagram:
        "📦 5S = orden satt i system. Sortér, systematisér, skinn, standardisér, sustain. #fosentools #5s #lean",
      linkedin:
        "5S er Lean-rammeverket for orden og standardisering: Sortér, Systematisér, Skinn, Standardisér, Sustain. Skreddersydde HDFI-innlegg gjør det enkelt å holde 5S-disiplinen — hvert verktøy har sin plass, og avvik er synlige umiddelbart. https://fosen-tools.no/hdfi?utm_source=linkedin&utm_medium=social&utm_campaign=definisjon-juni",
    },
  },
  {
    nr: 5,
    slug: "skreddersom-spesialitet-siden-2001",
    eyebrow: "SKREDDERSØM",
    headline: "Vår spesialitet siden 2001",
    bodyLines: [
      "Vi starter med deres utfordring.",
      "Tegner i CADLAB.",
      "Leverer ferdig på 4-8 uker.",
    ],
    captions: {
      facebook:
        "🛠️ Skreddersøm er vår spesialitet siden 2001. Vi starter med din utfordring, tegner i CADLAB og leverer på 4-8 uker. https://fosen-tools.no/?utm_source=facebook&utm_medium=social&utm_campaign=definisjon-juni",
      instagram:
        "🛠️ Skreddersøm = vår spesialitet siden 2001. Fra utfordring til ferdig løsning. #fosentools #skreddersom #brekstad",
      linkedin:
        "Skreddersøm har vært vår spesialitet siden 2001. Prosessen er enkel: vi starter med deres utfordring, tegner løsningen i CADLAB og leverer ferdig på 4-8 uker. Én leverandør, ett kontaktpunkt, full kontroll fra idé til driftsklar leveranse. https://fosen-tools.no/?utm_source=linkedin&utm_medium=social&utm_campaign=definisjon-juni",
    },
  },
  {
    nr: 6,
    slug: "egen-produksjon-siden-2004",
    eyebrow: "EGEN PRODUKSJON",
    headline: "Siden 2004",
    bodyLines: [
      "CNC-maskinen står i Brekstad.",
      "Vi eier prosessen.",
      "Du får ett kontaktpunkt fra tegning til ferdig.",
    ],
    captions: {
      facebook:
        "🏭 Egen produksjon siden 2004. CNC-maskinen står i Brekstad — vi eier prosessen. Ett kontaktpunkt fra tegning til ferdig. https://fosen-tools.no/?utm_source=facebook&utm_medium=social&utm_campaign=definisjon-juni",
      instagram:
        "🏭 Egen CNC-maskin i Brekstad siden 2004. Vi eier prosessen. #fosentools #egenproduksjon #brekstad",
      linkedin:
        "Egen produksjon siden 2004. CNC-maskinen står i Brekstad, og vi eier hele prosessen fra tegning til ferdig levert. For deg som kunde betyr det ett kontaktpunkt, kort ledetid, full sporbarhet og kontroll over kvalitet. https://fosen-tools.no/?utm_source=linkedin&utm_medium=social&utm_campaign=definisjon-juni",
    },
  },
  {
    nr: 7,
    slug: "ft-custom-spesialosninger",
    eyebrow: "FT CUSTOM",
    headline: "Spesialløsninger for industri og forsvar",
    bodyLines: [
      "Verktøyvogner, kofferter, kjøretøy-innredning.",
      "Designet rundt deres arbeidsflyt.",
      "Egen avdeling.",
    ],
    captions: {
      facebook:
        "🔧 FT Custom — spesialløsninger for industri og forsvar. Verktøyvogner, kofferter og kjøretøy-innredning designet rundt deres arbeidsflyt. https://fosen-tools.no/fosen-tools-custom?utm_source=facebook&utm_medium=social&utm_campaign=definisjon-juni",
      instagram:
        "🔧 FT Custom: spesialløsninger på bestilling. Lenke i bio. #fosentools #ftcustom #skreddersom",
      linkedin:
        "FT Custom er vår egen avdeling for spesialløsninger til industri og forsvar — verktøyvogner, kofferter, kjøretøy-innredning og mer. Hver leveranse designes rundt brukerens faktiske arbeidsflyt, ikke en katalog. Egen avdeling, ett ansvarspunkt. https://fosen-tools.no/fosen-tools-custom?utm_source=linkedin&utm_medium=social&utm_campaign=definisjon-juni",
    },
  },
  {
    nr: 8,
    slug: "aviation-ground-support-equipment",
    eyebrow: "AVIATION",
    headline: "Ground Support Equipment",
    bodyLines: [
      "Tools for the flightline.",
      "Custom tool cabinets, custom tool kits.",
      "Tomorrow's solutions, today.",
    ],
    captions: {
      facebook:
        "✈️ Aviation. Ground Support Equipment — tools for the flightline. Custom tool cabinets, custom tool kits. Tomorrow's solutions, today. https://fosen-tools.no/aviation?utm_source=facebook&utm_medium=social&utm_campaign=definisjon-juni",
      instagram:
        "✈️ Aviation. Tools for the flightline. #fosentools #aviation #gse",
      linkedin:
        "Aviation. Vår dedikerte avdeling for Ground Support Equipment — custom tool cabinets, custom tool kits og skreddersydde HDFI-løsninger for flightline. Tomorrow's solutions, today. https://fosen-tools.no/aviation?utm_source=linkedin&utm_medium=social&utm_campaign=definisjon-juni",
    },
  },
  {
    nr: 9,
    slug: "mobilhotell-logistikk-med-hjul",
    eyebrow: "MOBILHOTELL",
    headline: "Logistikk-punkter med hjul",
    bodyLines: [
      "Verktøy og utstyr som flytter seg med oppdraget.",
      "Skreddersydd for transport og deploy.",
      "Vi fører ikke FG-godkjente våpenskap, men mobilhotell skreddersyr vi.",
    ],
    captions: {
      facebook:
        "🚚 Mobilhotell — logistikk-punkter på hjul. Verktøy og utstyr som flytter seg med oppdraget. Skreddersydd for transport og deploy. https://fosen-tools.no/?utm_source=facebook&utm_medium=social&utm_campaign=definisjon-juni",
      instagram:
        "🚚 Mobilhotell: utstyr som flytter seg med oppdraget. #fosentools #mobilhotell #skreddersom",
      linkedin:
        "Mobilhotell — mobile logistikk-punkter på hjul. Skreddersydde løsninger for organisasjoner som må flytte verktøy, utstyr og forsyninger med oppdraget. Vi fører ikke FG-godkjente våpenskap, men mobilhotell skreddersyr vi. https://fosen-tools.no/?utm_source=linkedin&utm_medium=social&utm_campaign=definisjon-juni",
    },
  },
  {
    nr: 10,
    slug: "ft-systemvegg-modular-verkstedinnredning",
    eyebrow: "FT SYSTEMVEGG",
    headline: "Modulær verkstedsinnredning",
    bodyLines: [
      "Verkstedet ditt fortjener bedre.",
      "Hyller, kroker, kabinetter som flytter seg med deg.",
      "Skala fra én vegg til hel produksjon.",
    ],
    captions: {
      facebook:
        "🧰 FT Systemvegg — modulær verkstedsinnredning som flytter seg med deg. Hyller, kroker, kabinetter, skalerbart fra én vegg til hel produksjon. https://fosen-tools.no/ft-systemvegg?utm_source=facebook&utm_medium=social&utm_campaign=definisjon-juni",
      instagram:
        "🧰 FT Systemvegg: modulært verksted. Skalerbart, fleksibelt, ditt. #fosentools #ftsystemvegg #verksted",
      linkedin:
        "FT Systemvegg er vårt modulære system for verkstedsinnredning — hyller, kroker, kabinetter og oppheng som monteres etter behov. Du starter med én vegg og bygger ut etter hvert som behovet vokser. Verkstedet ditt fortjener bedre. https://fosen-tools.no/ft-systemvegg?utm_source=linkedin&utm_medium=social&utm_campaign=definisjon-juni",
    },
  },
  {
    nr: 11,
    slug: "leveringstid-4-til-8-uker",
    eyebrow: "LEVERINGSTID",
    headline: "Fra tegning til levert på 4-8 uker",
    bodyLines: [
      "Standard HDFI til Pelicase: 2-4 uker.",
      "Komplekse skreddersydde løsninger: 4-8 uker.",
      "Vi holder hva vi lover.",
    ],
    captions: {
      facebook:
        "⏱️ Fra tegning til levert HDFI på 4-8 uker. Standard løsninger 2-4 uker, komplekse skreddersydde 4-8 uker. Vi holder hva vi lover. https://fosen-tools.no/?utm_source=facebook&utm_medium=social&utm_campaign=definisjon-juni",
      instagram:
        "⏱️ Leveringstid: 4-8 uker fra tegning til levert. #fosentools #skreddersom #brekstad",
      linkedin:
        "Leveringstid — fra tegning til levert HDFI. Standard skuminnlegg til Pelicase: 2-4 uker. Komplekse skreddersydde løsninger: 4-8 uker. Vi setter realistiske datoer og holder dem. https://fosen-tools.no/?utm_source=linkedin&utm_medium=social&utm_campaign=definisjon-juni",
    },
  },
  {
    nr: 12,
    slug: "brekstad-hovedkontor",
    eyebrow: "BREKSTAD",
    headline: "Hovedkontoret vårt siden 2001",
    bodyLines: [
      "Industrigata 1, 7130 Brekstad.",
      "CADLAB og CNC-produksjon under samme tak.",
      "Egen helikopterlandingsplass.",
    ],
    captions: {
      facebook:
        "📍 Brekstad — hovedkontoret vårt siden 2001. Industrigata 1, 7130 Brekstad. CADLAB og CNC-produksjon under samme tak, egen helikopterlandingsplass. https://fosen-tools.no/?utm_source=facebook&utm_medium=social&utm_campaign=definisjon-juni",
      instagram:
        "📍 Brekstad: hjemmet vårt siden 2001. #fosentools #brekstad #fosen",
      linkedin:
        "Brekstad er hovedkontoret vårt siden 2001. Industrigata 1, 7130 Brekstad. CADLAB og CNC-produksjon under samme tak, kort vei fra tegning til ferdig. Egen helikopterlandingsplass for kunder som vil komme på besøk. https://fosen-tools.no/?utm_source=linkedin&utm_medium=social&utm_campaign=definisjon-juni",
    },
  },
];

const ASPECTS = [
  { key: "1:1", file: "bilde-1x1.png" },
  { key: "4:5", file: "bilde-4x5.png" },
  { key: "16:9", file: "bilde-16x9.png" },
];

// ── main ──────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(ROOT)) mkdirSync(ROOT, { recursive: true });

  let rendered = 0;
  let failed = 0;
  const t0 = performance.now();

  for (const tema of TEMAER) {
    const nr2 = String(tema.nr).padStart(2, "0");
    const folderName = `${nr2}-${tema.slug}`;
    const folderPath = join(ROOT, folderName);
    if (!existsSync(folderPath)) mkdirSync(folderPath, { recursive: true });

    process.stdout.write(`▸ ${folderName}\n`);

    for (const aspect of ASPECTS) {
      try {
        const { base64 } = await renderDefinisjonPoster({
          aspect: aspect.key,
          eyebrow: tema.eyebrow,
          headline: tema.headline,
          bodyLines: tema.bodyLines,
        });
        writeFileSync(
          join(folderPath, aspect.file),
          Buffer.from(base64, "base64"),
        );
        rendered++;
        console.log(`   ✓ ${aspect.file}`);
      } catch (e) {
        failed++;
        console.log(`   ✗ ${aspect.file}: ${e.message}`);
      }
    }

    // Metadata
    writeFileSync(
      join(folderPath, "metadata.json"),
      JSON.stringify(
        {
          nr: tema.nr,
          slug: tema.slug,
          kategori: "definisjon",
          eyebrow: tema.eyebrow,
          headline: tema.headline,
          bodyLines: tema.bodyLines,
          formater: ASPECTS.map((a) => ({ aspect: a.key, file: a.file })),
        },
        null,
        2,
      ),
      "utf8",
    );

    // Captions
    writeFileSync(join(folderPath, "caption-facebook.txt"), tema.captions.facebook, "utf8");
    writeFileSync(join(folderPath, "caption-instagram.txt"), tema.captions.instagram, "utf8");
    writeFileSync(join(folderPath, "caption-linkedin.txt"), tema.captions.linkedin, "utf8");
  }

  await closeRenderBrowser().catch(() => undefined);

  const dur = ((performance.now() - t0) / 1000).toFixed(1);
  console.log(
    `\n✅ Ferdig: ${rendered} bilder rendret, ${failed} feilet. Tid: ${dur}s.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
