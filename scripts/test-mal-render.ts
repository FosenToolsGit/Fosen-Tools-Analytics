/**
 * Test alle 8 maler — render til Desktop for visuell sjekk.
 * Kjør: npx tsx scripts/test-mal-render.ts
 */

import { writeFileSync } from "fs";
import { renderMalPng, type MalInput } from "../src/lib/services/mal-render";
import { closeRenderBrowser } from "../src/lib/services/render-common";

const HOME = process.env.HOME;
const ASPECTS = [
  { slug: "fb", w: 1080, h: 1080 },
  { slug: "li", w: 1200, h: 675 },
];

// Realistiske FT-eksempler per mal
const CASES: { name: string; build: (w: number, h: number) => MalInput }[] = [
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
        { title: "Kvalitetskontroll", text: "Hver leveranse sjekkes mot kundens spesifikasjon." },
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

async function main() {
  for (const c of CASES) {
    for (const a of ASPECTS) {
      const png = await renderMalPng(c.build(a.w, a.h));
      const out = `${HOME}/Desktop/mal-${c.name}-${a.slug}.png`;
      writeFileSync(out, Buffer.from(png.base64, "base64"));
      console.log(`✓ mal-${c.name}-${a.slug}.png (${a.w}×${a.h})`);
    }
  }
  await closeRenderBrowser();
  console.log("Ferdig — 16 bilder på Desktop.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
