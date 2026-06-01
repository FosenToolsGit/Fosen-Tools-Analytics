/**
 * build-hero-poster-bank.mjs — bygger 8 HeroPoster videoer (reel 9:16).
 *
 * Bruker Remotion-komposisjonen `HeroPoster` med video-bakgrunn fra
 * fosen-tools.no/userfiles/file/Header-*.mp4. Lagrer i:
 *   out/innlegg-bank-juni/hero-poster/{nr}-{slug}/
 *
 *   - video.mp4 (1080×1920, reel)
 *   - metadata.json
 *   - caption-facebook.txt / caption-instagram.txt / caption-linkedin.txt
 *
 *   npx tsx --env-file=.env.local scripts/build-hero-poster-bank.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { renderVideo } from "../src/lib/services/video-render.ts";

const ROOT = "out/innlegg-bank-juni/hero-poster";

const VIDEO_1 = "https://fosen-tools.no/userfiles/file/Header-700kb-1.mp4";
const VIDEO_2 = "https://fosen-tools.no/userfiles/file/Header-1,5mb-2.mp4";
const VIDEO_3 = "https://fosen-tools.no/userfiles/file/Header-1,5mb-3.mp4";

// ── Tema-spec (8 stk) ─────────────────────────────────────────────────

const TEMAER = [
  {
    nr: 1,
    slug: "profesjonelle-verktoylosninger",
    brand: "FOSEN TOOLS",
    tagline: "Profesjonelle verktøyløsninger",
    ctaText: "Kontakt oss",
    videoUrl: VIDEO_1,
    captions: {
      facebook:
        "🔴 Profesjonelle verktøyløsninger fra Brekstad. 25 år i bransjen, egen CADLAB og CNC-produksjon. Ta kontakt for skreddersydd løsning. https://fosen-tools.no/?utm_source=facebook&utm_medium=social&utm_campaign=hero-juni",
      instagram:
        "🔴 Profesjonelle verktøyløsninger. 25 år, Brekstad, skreddersøm. Lenke i bio. #fosentools #verktoy #skreddersom",
      linkedin:
        "Profesjonelle verktøyløsninger til industri, forsvar og aviation. 25 år i bransjen, egen CADLAB og CNC-produksjon i Brekstad. Ett kontaktpunkt fra tegning til levert. https://fosen-tools.no/?utm_source=linkedin&utm_medium=social&utm_campaign=hero-juni",
    },
  },
  {
    nr: 2,
    slug: "skreddersom-egen-produksjon-brekstad",
    brand: "FOSEN TOOLS",
    tagline: "Skreddersøm. Egen produksjon. Brekstad.",
    ctaText: "Kontakt oss",
    videoUrl: VIDEO_2,
    captions: {
      facebook:
        "🔴 Skreddersøm, egen produksjon, Brekstad. Tre ord som forteller hva vi gjør. CADLAB tegner, CNC-maskinen kutter, vi leverer. https://fosen-tools.no/?utm_source=facebook&utm_medium=social&utm_campaign=hero-juni",
      instagram:
        "🔴 Skreddersøm. Egen produksjon. Brekstad. #fosentools #skreddersom #brekstad",
      linkedin:
        "Skreddersøm. Egen produksjon. Brekstad. Vi designer i CADLAB og produserer på CNC-maskinen vår — alt under samme tak. Ingen mellomledd, ingen overraskelser. https://fosen-tools.no/?utm_source=linkedin&utm_medium=social&utm_campaign=hero-juni",
    },
  },
  {
    nr: 3,
    slug: "tomorrows-solutions-today",
    brand: "FT AVIATION",
    tagline: "Tomorrow's solutions, today.",
    ctaText: "Aviation",
    videoUrl: VIDEO_3,
    captions: {
      facebook:
        "✈️ Tomorrow's solutions, today. FT Aviation leverer custom tool cabinets og custom tool kits for flightline. https://fosen-tools.no/aviation?utm_source=facebook&utm_medium=social&utm_campaign=hero-juni",
      instagram:
        "✈️ Tomorrow's solutions, today. FT Aviation. #fosentools #aviation #flightline",
      linkedin:
        "Tomorrow's solutions, today. FT Aviation er vår dedikerte avdeling for Ground Support Equipment — custom tool cabinets, custom tool kits og skreddersydde HDFI-løsninger til flightline. https://fosen-tools.no/aviation?utm_source=linkedin&utm_medium=social&utm_campaign=hero-juni",
    },
  },
  {
    nr: 4,
    slug: "verktoy-som-taler-hverdagen",
    brand: "FOSEN TOOLS",
    tagline: "Verktøy som tåler hverdagen",
    ctaText: "Se produkter",
    videoUrl: VIDEO_1,
    captions: {
      facebook:
        "🔴 Verktøy som tåler hverdagen. Vi velger merkene som proffene velger. Wera, Knipex, Snap-on, Stahlwille, og 40 til. https://fosen-tools.no/produkter?utm_source=facebook&utm_medium=social&utm_campaign=hero-juni",
      instagram:
        "🔴 Verktøy som tåler hverdagen. #fosentools #verktoy #proff",
      linkedin:
        "Verktøy som tåler hverdagen. Vi fører over 40 av verdens fremste verktøymerker — Wera, Knipex, Snap-on, Stahlwille og mange flere — fordi proffene fortjener utstyr som holder. https://fosen-tools.no/produkter?utm_source=linkedin&utm_medium=social&utm_campaign=hero-juni",
    },
  },
  {
    nr: 5,
    slug: "driftseffektivitet-i-25-aar",
    brand: "FOSEN TOOLS",
    tagline: "Driftseffektivitet i 25 år",
    ctaText: "Vår historie",
    videoUrl: VIDEO_2,
    captions: {
      facebook:
        "🎉 25 år med driftseffektivitet. Fra Brekstad har vi levert verktøyløsninger til industri, forsvar og aviation siden 2001. https://fosen-tools.no/om-oss?utm_source=facebook&utm_medium=social&utm_campaign=hero-juni",
      instagram:
        "🎉 25 år med driftseffektivitet. #fosentools #25aar #brekstad",
      linkedin:
        "Driftseffektivitet i 25 år. Siden 2001 har vi levert skreddersydde verktøyløsninger fra Brekstad til kunder i industri, forsvar, aviation og offshore. Fortsatt familieeid, fortsatt med samme fokus. https://fosen-tools.no/om-oss?utm_source=linkedin&utm_medium=social&utm_campaign=hero-juni",
    },
  },
  {
    nr: 6,
    slug: "skreddersydde-losninger-tilpasset-bransjen",
    brand: "FOSEN TOOLS",
    tagline: "Skreddersydde løsninger tilpasset bransjen",
    ctaText: "Bransjer",
    videoUrl: VIDEO_3,
    captions: {
      facebook:
        "🛠️ Skreddersydde løsninger tilpasset bransjen. Forsvar, aviation, offshore, mekanisk, bygg & anlegg, beredskap. https://fosen-tools.no/bransjer?utm_source=facebook&utm_medium=social&utm_campaign=hero-juni",
      instagram:
        "🛠️ Skreddersydd per bransje. #fosentools #skreddersom #bransje",
      linkedin:
        "Skreddersydde løsninger tilpasset bransjen. Vi kjenner kravene i forsvaret, luftfarten, offshore, mekanisk industri og bygg & anlegg — og designer HDFI, koffert og vogn-løsninger som faktisk fungerer i drift. https://fosen-tools.no/bransjer?utm_source=linkedin&utm_medium=social&utm_campaign=hero-juni",
    },
  },
  {
    nr: 7,
    slug: "fra-brekstad-til-forsvaret",
    brand: "FOSEN TOOLS",
    tagline: "Fra Brekstad til Forsvaret",
    ctaText: "Referanser",
    videoUrl: VIDEO_1,
    captions: {
      facebook:
        "🛡️ Fra Brekstad til Forsvaret. \"Fosen Tools standard\" er en referert benevnelse i Forsvarets eget vokabular. https://fosen-tools.no/referanser?utm_source=facebook&utm_medium=social&utm_campaign=hero-juni",
      instagram:
        "🛡️ Fra Brekstad til Forsvaret. Skreddersydd HDFI for skarpe oppdrag. #fosentools #forsvaret #brekstad",
      linkedin:
        "Fra Brekstad til Forsvaret. \"Fosen Tools standard\" er en referert benevnelse i Forsvarets eget vokabular — et signal vi tar på alvor og leverer på, hver gang. https://fosen-tools.no/referanser?utm_source=linkedin&utm_medium=social&utm_campaign=hero-juni",
    },
  },
  {
    nr: 8,
    slug: "cad-tegnet-cnc-maskinert-levert",
    brand: "FOSEN TOOLS",
    tagline: "CAD-tegnet. CNC-maskinert. Levert.",
    ctaText: "Skreddersøm",
    videoUrl: VIDEO_2,
    captions: {
      facebook:
        "🔴 CAD-tegnet. CNC-maskinert. Levert. Tre ord, én prosess. Fra første skisse til ferdig løsning er det vi i Brekstad som har hånda på. https://fosen-tools.no/?utm_source=facebook&utm_medium=social&utm_campaign=hero-juni",
      instagram:
        "🔴 CAD-tegnet. CNC-maskinert. Levert. #fosentools #cadlab #brekstad",
      linkedin:
        "CAD-tegnet. CNC-maskinert. Levert. Hele prosessen — fra første skisse til ferdig løsning hos kunden — håndteres internt i Brekstad. Ett kontaktpunkt, full sporbarhet, ingen overraskelser. https://fosen-tools.no/?utm_source=linkedin&utm_medium=social&utm_campaign=hero-juni",
    },
  },
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

    const videoPath = join(folderPath, "video.mp4");

    // Metadata + captions først (rask, så det er der selv om render feiler)
    writeFileSync(
      join(folderPath, "metadata.json"),
      JSON.stringify(
        {
          nr: tema.nr,
          slug: tema.slug,
          kategori: "hero-poster",
          brand: tema.brand,
          tagline: tema.tagline,
          ctaText: tema.ctaText,
          videoUrl: tema.videoUrl,
          format: "reel",
          dimensions: { width: 1080, height: 1920 },
        },
        null,
        2,
      ),
      "utf8",
    );
    writeFileSync(join(folderPath, "caption-facebook.txt"), tema.captions.facebook, "utf8");
    writeFileSync(join(folderPath, "caption-instagram.txt"), tema.captions.instagram, "utf8");
    writeFileSync(join(folderPath, "caption-linkedin.txt"), tema.captions.linkedin, "utf8");

    process.stdout.write(`▸ ${folderName} … `);
    const t = performance.now();
    try {
      const result = await renderVideo({
        type: "hero-poster",
        data: {
          format: "reel",
          videoUrl: tema.videoUrl,
          brand: tema.brand,
          tagline: tema.tagline,
          ctaText: tema.ctaText,
        },
      });
      writeFileSync(videoPath, result.buffer);
      const dur = ((performance.now() - t) / 1000).toFixed(1);
      const mb = (result.buffer.byteLength / 1024 / 1024).toFixed(1);
      console.log(`✓ ${mb} MB (${dur}s)`);
      rendered++;
    } catch (e) {
      console.log(`✗ ${e.message}`);
      failed++;
    }
  }

  const totalMin = ((performance.now() - t0) / 1000 / 60).toFixed(1);
  console.log(`\n✅ Ferdig: ${rendered} videoer rendret, ${failed} feilet. Tid: ${totalMin} min.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
