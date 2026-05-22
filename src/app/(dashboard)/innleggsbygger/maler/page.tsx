"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";

import VideoBuilder from "./video-builder";

/**
 * Innleggsmaler — 108-layout design-galleri.
 *
 * 12 arketyper × 3 retninger (A/B/C) × 3 format (fb/ig/li) = 108 layouts.
 * Skjema-drevet skjema fyller `data`-objektet per arketype, POSTes til
 * `/api/innleggsbygger/render-innlegg` → pixel-perfekt PNG.
 *
 * Hvert skjema er forhåndsutfylt med design-handoffens demo-verdier,
 * så «Generér» fungerer umiddelbart — deretter kan brukeren justere.
 *
 * TODO (innleggsbygger):
 *  1. Multi-bilde-LAYOUTS. Bilde-pool er bygget (last opp flere bilder, bli
 *     valgbare i alle bilde-felt) — men hver av de 108 layoutene viser fortsatt
 *     bare ETT bilde. Designe nye layouts som faktisk viser flere bilder:
 *     kollasje, før/etter, 2-/3-/4-bilde-grid.
 *  2. Slå sammen /innleggsbygger/maler og /innleggsbygger/poster. `maler` er
 *     reelt en superset av `poster` (samme tilstedeværelse-maler + produkt-
 *     maler + A/B/C + 3 format). Vurder å fjerne `poster` eller la den bli
 *     en «enkel modus» av samme system, så vi slipper å vedlikeholde to.
 */

type Mal =
  | "produkt-single"
  | "produkt-grid"
  | "produkt-mfr"
  | "produkt-variant"
  | "feature"
  | "prosess"
  | "leveranse"
  | "besok"
  | "stand"
  | "ansatt"
  | "sitat"
  | "milepael"
  | "galleri";
type Variant = "A" | "B" | "C";
type Aspect = "fb" | "ig" | "li";

// ── Felt-typer i skjema-driver ──────────────────────────────────────────────
type FieldType = "text" | "textarea" | "number";

interface ScalarField {
  kind: "scalar";
  key: string;
  label: string;
  type: FieldType;
  optional?: boolean;
}

/** Et felt som er en liste av rader — hver rad har sine egne underfelt. */
interface ArrayField {
  kind: "array";
  key: string;
  label: string;
  /** Underfelt per rad. */
  cols: { key: string; label: string; type: FieldType }[];
  /** Tom rad-fabrikk. */
  empty: () => Record<string, string>;
  min: number;
  max: number;
}

type Field = ScalarField | ArrayField;

interface MalDef {
  label: string;
  desc: string;
  fields: Field[];
}

const t = (
  key: string,
  label: string,
  type: FieldType = "text",
  optional = true
): ScalarField => ({ kind: "scalar", key, label, type, optional });

// ── 12 arketype-definisjoner med demo-default-verdier ───────────────────────
const MALER: Record<Mal, MalDef> = {
  "produkt-single": {
    label: "Produkt — enkelt",
    desc: "Ett produkt stort med pris",
    fields: [
      t("eyebrow", "Eyebrow"),
      t("manufacturer", "Produsent"),
      t("name", "Produktnavn"),
      t("priceBefore", "Før-pris", "number"),
      t("priceNow", "Nå-pris", "number"),
      t("discount", "Rabatt-burst"),
      t("sku", "Artikkelnr."),
      t("url", "CTA / URL"),
      t("photo", "Bilde-URL"),
    ],
  },
  "produkt-grid": {
    label: "Produkt — grid",
    desc: "3–4 produkter i rutenett",
    fields: [
      {
        kind: "array",
        key: "items",
        label: "Produkter",
        cols: [
          { key: "name", label: "Navn", type: "text" },
          { key: "priceBefore", label: "Før", type: "number" },
          { key: "priceNow", label: "Nå", type: "number" },
          { key: "discount", label: "Burst", type: "text" },
          { key: "photo", label: "Bilde-URL", type: "text" },
        ],
        empty: () => ({
          name: "",
          priceBefore: "",
          priceNow: "",
          discount: "",
          photo: "",
        }),
        min: 1,
        max: 4,
      },
    ],
  },
  "produkt-mfr": {
    label: "Produkt — produsent",
    desc: "«Mest kjøpt fra {Merke}»",
    fields: [
      t("manufacturer", "Produsent"),
      t("tagline", "Tagline"),
      {
        kind: "array",
        key: "items",
        label: "Produkter",
        cols: [
          { key: "name", label: "Navn", type: "text" },
          { key: "priceBefore", label: "Før", type: "number" },
          { key: "priceNow", label: "Nå", type: "number" },
          { key: "discount", label: "Burst", type: "text" },
          { key: "photo", label: "Bilde-URL", type: "text" },
        ],
        empty: () => ({
          name: "",
          priceBefore: "",
          priceNow: "",
          discount: "",
          photo: "",
        }),
        min: 1,
        max: 4,
      },
    ],
  },
  "produkt-variant": {
    label: "Produkt — varianter",
    desc: "HDFI fargevisning",
    fields: [
      {
        kind: "array",
        key: "colors",
        label: "Farger",
        cols: [
          { key: "label", label: "Etikett", type: "text" },
          { key: "code", label: "Kode", type: "text" },
          { key: "top", label: "Topp (#hex)", type: "text" },
          { key: "bottom", label: "Bunn (#hex)", type: "text" },
        ],
        empty: () => ({ label: "", code: "", top: "#D8121B", bottom: "#FFFFFF" }),
        min: 2,
        max: 8,
      },
    ],
  },
  feature: {
    label: "Feature / tjeneste",
    desc: "HDFI, CADLAB — fordeler + CTA",
    fields: [
      t("eyebrow", "Eyebrow"),
      t("kicker", "Kicker (stort ord — B/C)"),
      t("headline", "Overskrift"),
      t("accent", "Rødt nøkkelord"),
      t("subhead", "Underoverskrift"),
      t("description", "Beskrivelse (C)"),
      t("chapter", "Kapittel (C)"),
      t("cta", "CTA / URL"),
      t("photo", "Bilde-URL"),
      {
        kind: "array",
        key: "bullets",
        label: "Punktliste (A)",
        cols: [{ key: "v", label: "Punkt", type: "text" }],
        empty: () => ({ v: "" }),
        min: 0,
        max: 6,
      },
      {
        kind: "array",
        key: "bulletsNum",
        label: "Nummererte punkter (B)",
        cols: [
          { key: "num", label: "Nr.", type: "text" },
          { key: "txt", label: "Tekst", type: "text" },
        ],
        empty: () => ({ num: "", txt: "" }),
        min: 0,
        max: 6,
      },
    ],
  },
  prosess: {
    label: "Prosess",
    desc: "Slik jobber vi — steg for steg",
    fields: [
      t("eyebrow", "Eyebrow"),
      t("headline", "Overskrift"),
      t("accent", "Rødt nøkkelord"),
      t("cta", "CTA / URL"),
      t("photo", "Bilde-URL"),
      {
        kind: "array",
        key: "steps",
        label: "Steg",
        cols: [
          { key: "num", label: "Nr.", type: "text" },
          { key: "title", label: "Tittel", type: "text" },
          { key: "desc", label: "Beskrivelse", type: "text" },
        ],
        empty: () => ({ num: "", title: "", desc: "" }),
        min: 2,
        max: 6,
      },
    ],
  },
  leveranse: {
    label: "Leveranse",
    desc: "«Levert til …» — vis en jobb",
    fields: [
      t("eyebrow", "Eyebrow"),
      t("customer", "Kunde"),
      t("industry", "Bransje / segment"),
      t("headline", "Overskrift"),
      t("accent", "Rødt nøkkelord"),
      t("description", "Beskrivelse", "textarea"),
      t("deliveryDate", "Leveringsdato (C)"),
      t("orderNo", "Ordrenr. (C)"),
      t("url", "CTA / URL"),
      t("photo", "Bilde-URL"),
      {
        kind: "array",
        key: "facts",
        label: "Fakta (B)",
        cols: [
          { key: "label", label: "Etikett", type: "text" },
          { key: "value", label: "Verdi", type: "text" },
        ],
        empty: () => ({ label: "", value: "" }),
        min: 0,
        max: 4,
      },
    ],
  },
  besok: {
    label: "Besøk",
    desc: "«På besøk hos …»",
    fields: [
      t("company", "Bedrift"),
      t("location", "Sted"),
      t("description", "Beskrivelse", "textarea"),
      t("quote", "Sitat (B)"),
      t("coords", "Koordinater (C)"),
      t("date", "Dato (C)"),
      t("url", "CTA / URL"),
      t("photo", "Bilde-URL"),
    ],
  },
  stand: {
    label: "Stand / messe",
    desc: "«Møt oss på …»",
    fields: [
      t("eyebrow", "Eyebrow"),
      t("event", "Arrangement"),
      t("year", "År"),
      t("pitch", "Pitch", "textarea"),
      t("date", "Dato"),
      t("place", "Sted"),
      t("stand", "Stand-nr."),
      t("cta", "CTA"),
      t("photo", "Bilde-URL"),
    ],
  },
  ansatt: {
    label: "Ansatt",
    desc: "«Møt teamet»",
    fields: [
      t("eyebrow", "Eyebrow"),
      t("name", "Navn"),
      t("role", "Rolle"),
      t("yearsLabel", "Ansiennitet"),
      t("quote", "Sitat", "textarea"),
      t("fact", "Fun fact", "textarea"),
      t("employeeId", "Ansatt-ID (C)"),
      t("joined", "Startet (C)"),
      t("photo", "Portrettfoto-URL"),
      {
        kind: "array",
        key: "stats",
        label: "Statistikk (B)",
        cols: [
          { key: "label", label: "Etikett", type: "text" },
          { key: "value", label: "Verdi", type: "text" },
        ],
        empty: () => ({ label: "", value: "" }),
        min: 0,
        max: 4,
      },
    ],
  },
  sitat: {
    label: "Kundesitat",
    desc: "Stort sitat med attribusjon",
    fields: [
      t("quote", "Sitat", "textarea"),
      t("name", "Navn"),
      t("role", "Rolle"),
      t("company", "Bedrift"),
      t("photo", "Bilde-URL (B)"),
    ],
  },
  milepael: {
    label: "Milepæl / jubileum",
    desc: "Stort tall — 25 år, 100 år …",
    fields: [
      t("brand", "Merkenavn"),
      t("number", "Tall"),
      t("unit", "Enhet"),
      t("headline", "Overskrift"),
      t("subhead", "Underoverskrift"),
      t("certNo", "Sertifikatnr. (C)"),
      {
        kind: "array",
        key: "timeline",
        label: "Tidslinje (B)",
        cols: [
          { key: "year", label: "År", type: "text" },
          { key: "label", label: "Hendelse", type: "text" },
        ],
        empty: () => ({ year: "", label: "" }),
        min: 0,
        max: 6,
      },
    ],
  },
  galleri: {
    label: "Bildevegg",
    desc: "Flere bilder i kollasje / grid",
    fields: [
      t("eyebrow", "Eyebrow"),
      t("headline", "Overskrift"),
      t("accent", "Aksent-ord (rødt)"),
      t("caption", "Bildetekst", "textarea"),
      t("url", "CTA / URL"),
      {
        kind: "array",
        key: "images",
        label: "Bilder (2–6)",
        cols: [{ key: "photo", label: "Bilde", type: "text" }],
        empty: () => ({ photo: "" }),
        min: 2,
        max: 6,
      },
    ],
  },
};

const MAL_ORDER: Mal[] = [
  "produkt-single",
  "produkt-grid",
  "produkt-mfr",
  "produkt-variant",
  "feature",
  "prosess",
  "leveranse",
  "besok",
  "stand",
  "ansatt",
  "sitat",
  "milepael",
  "galleri",
];

const VARIANTS: { value: Variant; label: string; desc: string }[] = [
  { value: "A", label: "A — FT-klassisk", desc: "Mørk, foto-forward, rød detalj" },
  { value: "B", label: "B — Editorial", desc: "Krem, stor typografi, magasin" },
  { value: "C", label: "C — Industriell", desc: "Poster, spec-sheet, kapittel" },
];

const ASPECTS: { value: Aspect; label: string }[] = [
  { value: "fb", label: "Facebook 1:1" },
  { value: "ig", label: "Instagram 4:5" },
  { value: "li", label: "LinkedIn 16:9" },
];

// ── Demo-default-verdier per arketype (fra design-handoffen) ────────────────
type Scalars = Record<string, string>;
type Arrays = Record<string, Record<string, string>[]>;
interface FormState {
  scalars: Scalars;
  arrays: Arrays;
}

const DEMO: Record<Mal, FormState> = {
  "produkt-single": {
    scalars: {
      eyebrow: "UKENS TILBUD",
      manufacturer: "FACOM",
      name: "Verktøyvogn JET+",
      priceBefore: "28990",
      priceNow: "16990",
      discount: "-41%",
      sku: "",
      url: "",
      photo: "",
    },
    arrays: {},
  },
  "produkt-grid": {
    scalars: {},
    arrays: {
      items: [
        { name: "Facom Verktøyvogn JET+", priceBefore: "28990", priceNow: "16990", discount: "-41%", photo: "" },
        { name: "Knipex Avbitertang 250 mm", priceBefore: "990", priceNow: "690", discount: "-30%", photo: "" },
        { name: "Wera Kraftform Skrutrekkersett", priceBefore: "1790", priceNow: "1290", discount: "-28%", photo: "" },
        { name: "Milwaukee M18 Slagtrekker", priceBefore: "4490", priceNow: "3490", discount: "-22%", photo: "" },
      ],
    },
  },
  "produkt-mfr": {
    scalars: { manufacturer: "FACOM", tagline: "Mest kjøpt fra Facom" },
    arrays: {
      items: [
        { name: "Facom Verktøyvogn JET+", priceBefore: "28990", priceNow: "16990", discount: "-41%", photo: "" },
        { name: "Knipex Avbitertang 250 mm", priceBefore: "990", priceNow: "690", discount: "-30%", photo: "" },
        { name: "Wera Kraftform Skrutrekkersett", priceBefore: "1790", priceNow: "1290", discount: "-28%", photo: "" },
        { name: "Milwaukee M18 Slagtrekker", priceBefore: "4490", priceNow: "3490", discount: "-22%", photo: "" },
      ],
    },
  },
  "produkt-variant": {
    scalars: {},
    arrays: {
      colors: [
        { label: "Rød/Hvit", code: "R-01", top: "#D8121B", bottom: "#FFFFFF" },
        { label: "Svart/Hvit", code: "S-02", top: "#1A1A1A", bottom: "#FFFFFF" },
        { label: "Hvit/Svart", code: "H-03", top: "#FFFFFF", bottom: "#1A1A1A" },
        { label: "Blå/Hvit", code: "B-04", top: "#1F4F8C", bottom: "#FFFFFF" },
        { label: "Gul/Svart", code: "G-05", top: "#F4C20D", bottom: "#1A1A1A" },
        { label: "Lys grå/Svart", code: "L-06", top: "#D8D8D8", bottom: "#1A1A1A" },
      ],
    },
  },
  feature: {
    scalars: {
      eyebrow: "EGEN PRODUKSJON",
      kicker: "HDFI",
      headline: "HDFI — Verktøykontroll med presisjon",
      accent: "HDFI",
      subhead:
        "Skreddersydde skuminnlegg som gir hvert verktøy sin faste plass.",
      description:
        "Skreddersydde skuminnlegg som gir hvert verktøy sin faste plass. CAD-tegnet, CNC-maskinert, kvalitetssikret.",
      chapter: "CH. 04",
      cta: "fosen-tools.no/hdfi",
      photo: "",
    },
    arrays: {
      bullets: [
        { v: "CAD-tegnet og CNC-maskinert i Brekstad" },
        { v: "Synlig kontroll — du ser umiddelbart hva som mangler" },
        { v: "FOD-sikring for luftfart og forsvar" },
        { v: "Tåler olje, løsemidler og hard bruk" },
      ],
      bulletsNum: [
        { num: "01", txt: "CAD + CNC i Brekstad" },
        { num: "02", txt: "Synlig kontroll" },
        { num: "03", txt: "FOD-sikkert" },
        { num: "04", txt: "Tåler hard bruk" },
      ],
    },
  },
  prosess: {
    scalars: {
      eyebrow: "SLIK JOBBER VI",
      headline: "Fra idé til ferdig HDFI",
      accent: "HDFI",
      cta: "fosen-tools.no/hdfi",
      photo: "",
    },
    arrays: {
      steps: [
        { num: "01", title: "CAD-tegning", desc: "Hver posisjon tegnes i CADLAB etter dine verktøy." },
        { num: "02", title: "CNC-maskinering", desc: "Eksakt passform maskineres ut i Brekstad." },
        { num: "03", title: "Kvalitetskontroll", desc: "Hver leveranse sjekkes mot spesifikasjon." },
        { num: "04", title: "Levering", desc: "Ferdig løsning, klar til bruk — typisk 2-4 uker." },
      ],
    },
  },
  leveranse: {
    scalars: {
      eyebrow: "LEVERT",
      customer: "TESS Vest",
      industry: "Industri",
      headline: "Skreddersydd Opti-koffert med HDFI",
      accent: "HDFI",
      description:
        "Kraftpipe-sett 22-38 mm i koffert med CNC-maskinert HDFI — hver pipe har sin plass.",
      deliveryDate: "15.03.2026",
      orderNo: "FT-2026-0421",
      url: "fosen-tools.no",
      photo: "",
    },
    arrays: {
      facts: [
        { label: "Leveringstid", value: "3 uker" },
        { label: "Antall posisjoner", value: "14" },
        { label: "Materiale", value: "HDFI 30 mm" },
      ],
    },
  },
  besok: {
    scalars: {
      company: "Andøya Space",
      location: "Andøya",
      description:
        "Vi tok turen til Andøya Space for å se hvordan verktøyløsningene våre brukes i praksis.",
      quote: "«De har et helt eget økosystem rundt verktøyene sine.»",
      coords: "69.2941°N · 16.0309°E",
      date: "12.05.2026",
      url: "fosen-tools.no",
      photo: "",
    },
    arrays: {},
  },
  stand: {
    scalars: {
      eyebrow: "MØT OSS",
      event: "Verktøymessen",
      year: "2026",
      pitch: "Kom innom for en prat om HDFI, verktøykontroll og skreddersøm.",
      date: "14.–16. mars",
      place: "Trondheim Spektrum",
      stand: "B-24",
      cta: "kom innom standen",
      photo: "",
    },
    arrays: {},
  },
  ansatt: {
    scalars: {
      eyebrow: "MØT TEAMET",
      name: "Ola Nordmann",
      role: "CADLAB-tegner",
      yearsLabel: "8 år i FT",
      quote:
        "«Den beste følelsen er når verktøyet klikker på plass — eksakt der det skal.»",
      fact: "Har tegnet over 2 000 HDFI-innlegg siden 2018.",
      employeeId: "FT-N-014",
      joined: "2018",
      photo: "",
    },
    arrays: {
      stats: [
        { label: "HDFI-innlegg", value: "2 000+" },
        { label: "År i FT", value: "8" },
        { label: "Kaffe/dag", value: "4" },
      ],
    },
  },
  sitat: {
    scalars: {
      quote:
        "Fosen Tools leverer en standard vi ikke finner andre steder. HDFI-løsningene deres har endret hvordan vi jobber.",
      name: "Kari Hansen",
      role: "Verkstedsleder",
      company: "Lufttransport AS",
      photo: "",
    },
    arrays: {},
  },
  milepael: {
    scalars: {
      brand: "FOSEN TOOLS",
      number: "25",
      unit: "år",
      headline: "Et kvart århundre med verktøyløsninger",
      subhead: "Siden 2001 — del av et familiekonsern med 100 år bak seg.",
      certNo: "FT-25-2026",
    },
    arrays: {
      timeline: [
        { year: "2001", label: "Etablert i Brekstad" },
        { year: "2008", label: "Første HDFI-leveranse til Forsvaret" },
        { year: "2018", label: "CADLAB åpner — eget designteam" },
        { year: "2026", label: "25 år — fortsatt familieeid" },
      ],
    },
  },
  galleri: {
    scalars: {
      eyebrow: "FRA DAGEN",
      headline: "Bilder fra besøket",
      accent: "besøket",
      caption: "Et knippe bilder fra dagen.",
      url: "fosen-tools.no",
    },
    arrays: {
      images: [{ photo: "" }, { photo: "" }, { photo: "" }, { photo: "" }],
    },
  },
};

/** Dyp-klon av en FormState så DEMO ikke muteres. */
function cloneState(s: FormState): FormState {
  return {
    scalars: { ...s.scalars },
    arrays: Object.fromEntries(
      Object.entries(s.arrays).map(([k, rows]) => [k, rows.map((r) => ({ ...r }))])
    ),
  };
}

/**
 * Bygg `data`-objektet for API-et.
 *
 * Tomme felter dropper vi så render-funksjonenes egne demo-defaults slår inn.
 * Tall-felter castes til number. Array-rader filtreres for tomme rader.
 * `prosess` får alle tre steg-formene (steps / stepsNum / stepsC) bygget fra
 * den delte steg-editoren slik at hvilken som helst A/B/C-retning rendrer.
 */
function buildData(mal: Mal, state: FormState): Record<string, unknown> {
  const def = MALER[mal];
  const data: Record<string, unknown> = {};

  for (const f of def.fields) {
    if (f.kind === "scalar") {
      const raw = (state.scalars[f.key] ?? "").trim();
      if (!raw) continue;
      data[f.key] = f.type === "number" ? Number(raw) : raw;
      continue;
    }
    // array-felt
    const rows = (state.arrays[f.key] ?? [])
      .map((row) => {
        const out: Record<string, unknown> = {};
        let hasValue = false;
        for (const c of f.cols) {
          const raw = (row[c.key] ?? "").trim();
          if (raw) hasValue = true;
          out[c.key] = c.type === "number" ? Number(raw || "0") : raw;
        }
        return hasValue ? out : null;
      })
      .filter((r): r is Record<string, unknown> => r !== null);
    if (rows.length > 0) data[f.key] = rows;
  }

  // produkt-single/grid/mfr/variant + feature/prosess: spesial-mapping.
  if (mal === "feature") {
    // bullets: string[] ; bulletsNum: [num, txt][]
    const b = data.bullets as { v: string }[] | undefined;
    if (b) data.bullets = b.map((r) => r.v);
    const bn = data.bulletsNum as { num: string; txt: string }[] | undefined;
    if (bn) data.bulletsNum = bn.map((r) => [r.num, r.txt]);
  }

  if (mal === "prosess") {
    // Én delt steg-editor → de tre formene A/B/C destrukturerer ulikt.
    const steps = (state.arrays.steps ?? [])
      .map((r) => ({
        num: (r.num ?? "").trim(),
        title: (r.title ?? "").trim(),
        desc: (r.desc ?? "").trim(),
      }))
      .filter((r) => r.title || r.desc);
    if (steps.length > 0) {
      data.steps = steps.map((r) => [r.title, r.desc]); // ProsessStep
      data.stepsNum = steps.map((r, i) => [
        r.num || String(i + 1).padStart(2, "0"),
        r.title,
        r.desc,
      ]); // ProsessStepNum
      data.stepsC = steps.map((r, i) => [
        r.title,
        r.desc,
        r.num || String(i + 1).padStart(2, "0"),
      ]); // ProsessStepC
    } else {
      delete data.steps;
    }
  }

  if (mal === "leveranse") {
    const facts = data.facts as { label: string; value: string }[] | undefined;
    if (facts) data.facts = facts.map((r) => [r.label, r.value]);
  }

  if (mal === "ansatt") {
    const stats = data.stats as { label: string; value: string }[] | undefined;
    if (stats) data.stats = stats.map((r) => [r.label, r.value]);
  }

  if (mal === "milepael") {
    // timeline forblir { year, label }[] — matcher MilepaelData.
  }

  if (mal === "galleri") {
    // images: [{ photo }] → string[] (kun ikke-tomme)
    const imgs = data.images as { photo?: string }[] | undefined;
    if (imgs) {
      data.images = imgs.map((r) => (r.photo ?? "").trim()).filter(Boolean);
    }
  }

  return data;
}

/** Les en bildefil → nedskalert JPEG data-URL (maks 1600px) — klar for render. */
function fileToDataUrl(file: File, maxDim = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Kunne ikke lese filen"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Ugyldig bildefil"));
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (Math.max(w, h) > maxDim) {
          const s = maxDim / Math.max(w, h);
          w = Math.round(w * s);
          h = Math.round(h * s);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas ikke tilgjengelig"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Bildevelger — manuell URL, opplasting (nedskalert data-URL) og klikkbart
 * galleri fra bildene som ble hentet fra siden i idémyldringen.
 */
function ImagePicker({
  value,
  onPick,
  sourceImages,
}: {
  value: string;
  onPick: (v: string) => void;
  sourceImages: string[];
}) {
  const [busy, setBusy] = useState(false);
  async function upload(file: File | null | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onPick(await fileToDataUrl(file));
    } catch {
      /* ignorer — bruker kan prøve igjen */
    } finally {
      setBusy(false);
    }
  }
  const inputCls =
    "w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm";
  return (
    <div className="space-y-2">
      {value && (
        <div className="flex items-center gap-2">
          <img
            src={value}
            alt=""
            className="h-14 w-14 object-cover rounded border border-gray-700"
          />
          <span className="text-xs text-gray-400 flex-1 truncate">
            {value.startsWith("data:") ? "Opplastet bilde" : value}
          </span>
          <button
            onClick={() => onPick("")}
            className="text-xs text-red-400 hover:text-red-300"
          >
            Fjern
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={value.startsWith("data:") ? "" : value}
          onChange={(e) => onPick(e.target.value)}
          placeholder="Lim inn bilde-URL…"
          className={inputCls}
        />
        <label className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm whitespace-nowrap cursor-pointer">
          {busy ? "Laster…" : "📁 Last opp"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
      </div>
      {sourceImages.length > 0 && (
        <div>
          <div className="text-[11px] text-gray-500 mb-1">
            Fra siden — klikk for å bruke:
          </div>
          <div className="flex gap-2 flex-wrap">
            {sourceImages.map((u, idx) => (
              <button
                key={idx}
                onClick={() => onPick(u)}
                className={`h-14 w-14 rounded overflow-hidden border ${
                  value === u
                    ? "border-red-500"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <img src={u} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Et AI-foreslått post-utkast fra idémyldringen. */
interface Idea {
  mal: Mal;
  variant: Variant;
  label: string;
  summary: string;
  data?: Record<string, unknown>;
}

/** Ferdig innholdspakke — captions + UTM + alt-tekst per plattform. */
interface InnholdPakke {
  campaign: string;
  facebook: { caption: string; altText: string; utm: string };
  instagram: { caption: string; hashtags: string; altText: string };
  linkedin: { caption: string; hashtags: string; altText: string; utm: string };
}

/** Liten kopier-knapp med kort «✓ Kopiert»-bekreftelse. */
function CopyButton({ text, label = "Kopier" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  if (!text) return null;
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard utilgjengelig */
        }
      }}
      className="text-[11px] px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 whitespace-nowrap"
    >
      {done ? "✓ Kopiert" : label}
    </button>
  );
}

/** Caption-kort for én plattform i innholdspakken. */
function PlatformCard({
  title,
  accent,
  caption,
  hashtags,
  altText,
  utm,
}: {
  title: string;
  accent: string;
  caption: string;
  hashtags?: string;
  altText?: string;
  utm?: string;
}) {
  const rows = Math.min(12, Math.max(3, caption.split("\n").length + 1));
  return (
    <div className="border border-gray-700 rounded-lg bg-gray-900/60 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${accent}`}>{title}</span>
        <CopyButton text={caption} label="Kopier caption" />
      </div>
      <textarea
        readOnly
        value={caption}
        rows={rows}
        className="w-full px-2 py-1.5 bg-gray-950 border border-gray-800 rounded text-gray-200 text-xs"
      />
      {hashtags ? (
        <div className="mt-2 flex items-start gap-2">
          <span className="text-[11px] text-gray-500 mt-1 whitespace-nowrap">
            Hashtags{title === "Instagram" ? " (1. kommentar)" : ""}:
          </span>
          <span className="text-[11px] text-gray-300 flex-1">{hashtags}</span>
          <CopyButton text={hashtags} />
        </div>
      ) : null}
      {altText ? (
        <div className="mt-2 flex items-start gap-2">
          <span className="text-[11px] text-gray-500 mt-1 whitespace-nowrap">
            Alt-tekst:
          </span>
          <span className="text-[11px] text-gray-300 flex-1">{altText}</span>
          <CopyButton text={altText} />
        </div>
      ) : null}
      {utm ? (
        <div className="mt-2 flex items-start gap-2">
          <span className="text-[11px] text-gray-500 mt-1 whitespace-nowrap">
            UTM-lenke:
          </span>
          <span className="text-[11px] text-blue-300 flex-1 break-all">{utm}</span>
          <CopyButton text={utm} />
        </div>
      ) : null}
    </div>
  );
}

export default function InnleggsmalerPage() {
  const [mode, setMode] = useState<"bilde" | "video">("bilde");
  const [mal, setMal] = useState<Mal>("produkt-single");
  const [variant, setVariant] = useState<Variant>("A");
  const [aspect, setAspect] = useState<Aspect>("fb");
  const [forms, setForms] = useState<Record<Mal, FormState>>(() =>
    Object.fromEntries(
      MAL_ORDER.map((m) => [m, cloneState(DEMO[m])])
    ) as Record<Mal, FormState>
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // idémyldring
  const [ideUrl, setIdeUrl] = useState("");
  const [ideBrief, setIdeBrief] = useState("");
  const [ideLoading, setIdeLoading] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  // bilde-pool — bilder lastet opp som blir tilgjengelig i alle bilde-velgere
  const [pool, setPool] = useState<string[]>([]);
  const [poolBusy, setPoolBusy] = useState(false);
  // innholdspakke (captions + UTM + alt-tekst)
  const [destUrl, setDestUrl] = useState("");
  const [innhold, setInnhold] = useState<InnholdPakke | null>(null);
  const [innholdLoading, setInnholdLoading] = useState(false);
  // produkt-URL-import
  const [prodUrl, setProdUrl] = useState("");
  const [prodLoading, setProdLoading] = useState(false);

  // Alle bilder tilgjengelig i bilde-velgerne: side-bilder + opplastet pool
  const pickerImages = useMemo(() => [...sourceImages, ...pool], [sourceImages, pool]);

  const def = MALER[mal];
  const state = forms[mal];

  /** Skjul prosess-felter som overstyres av den delte steg-editoren. */
  const visibleFields = useMemo(() => def.fields, [def]);

  function patchScalar(key: string, value: string) {
    setForms((prev) => ({
      ...prev,
      [mal]: { ...prev[mal], scalars: { ...prev[mal].scalars, [key]: value } },
    }));
  }

  function patchArrayCell(
    fieldKey: string,
    rowIdx: number,
    colKey: string,
    value: string
  ) {
    setForms((prev) => {
      const rows = (prev[mal].arrays[fieldKey] ?? []).map((r, i) =>
        i === rowIdx ? { ...r, [colKey]: value } : r
      );
      return {
        ...prev,
        [mal]: {
          ...prev[mal],
          arrays: { ...prev[mal].arrays, [fieldKey]: rows },
        },
      };
    });
  }

  function addRow(field: ArrayField) {
    setForms((prev) => {
      const rows = prev[mal].arrays[field.key] ?? [];
      if (rows.length >= field.max) return prev;
      return {
        ...prev,
        [mal]: {
          ...prev[mal],
          arrays: {
            ...prev[mal].arrays,
            [field.key]: [...rows, field.empty()],
          },
        },
      };
    });
  }

  function removeRow(field: ArrayField, rowIdx: number) {
    setForms((prev) => {
      const rows = prev[mal].arrays[field.key] ?? [];
      if (rows.length <= field.min) return prev;
      return {
        ...prev,
        [mal]: {
          ...prev[mal],
          arrays: {
            ...prev[mal].arrays,
            [field.key]: rows.filter((_, i) => i !== rowIdx),
          },
        },
      };
    });
  }

  function resetToDemo() {
    setForms((prev) => ({ ...prev, [mal]: cloneState(DEMO[mal]) }));
    setPreview(null);
    setError(null);
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setPreview(null);
    try {
      const data = buildData(mal, state);
      const res = await fetch("/api/innleggsbygger/render-innlegg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mal, variant, aspect, data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Render feilet");
      setPreview(`data:${json.mime};base64,${json.image_base64}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noe gikk galt");
    } finally {
      setGenerating(false);
    }
  }

  function download() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = `ft-innlegg-${mal}-${variant}-${aspect}-${Date.now()}.png`;
    a.click();
  }

  /**
   * Hent produktdata (navn/pris/rabatt/bilde) fra en fosen-tools.no
   * produkt-URL. produkt-single → fyller feltene; grid/mfr → legger til rad.
   * Det er slik produktbilder hentes inn i produkt-malene.
   */
  async function importProduct() {
    const url = prodUrl.trim();
    if (!url) return;
    setProdLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/brosjyre/scrape-product?url=${encodeURIComponent(url)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Kunne ikke hente produkt");
      const p = (json.product ?? {}) as Record<string, unknown>;
      const num = (v: unknown) =>
        typeof v === "number" && v > 0 ? String(v) : "";
      const fields: Record<string, string> = {
        manufacturer: typeof p.manufacturer === "string" ? p.manufacturer : "",
        name: typeof p.name === "string" ? p.name : "",
        priceBefore: num(p.price_before),
        priceNow: num(p.price_now),
        discount:
          typeof p.discount_pct === "number" && p.discount_pct > 0
            ? `-${Math.round(p.discount_pct)}%`
            : "",
        sku: typeof p.sku === "string" ? p.sku : "",
        photo: typeof p.image_url === "string" ? p.image_url : "",
      };
      setForms((prev) => {
        const base = cloneState(prev[mal]);
        if (mal === "produkt-single") {
          for (const [k, v] of Object.entries(fields)) {
            if (v) base.scalars[k] = v;
          }
        } else {
          // produkt-grid / produkt-mfr — legg produktet som ny rad
          const itemsField = MALER[mal].fields.find(
            (f) => f.kind === "array" && f.key === "items"
          );
          if (itemsField && itemsField.kind === "array") {
            const row = itemsField.empty();
            for (const c of itemsField.cols) {
              if (fields[c.key]) row[c.key] = fields[c.key];
            }
            const cur = base.arrays.items ?? [];
            base.arrays.items = [...cur, row].slice(0, itemsField.max);
          }
        }
        return { ...prev, [mal]: base };
      });
      setProdUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke hente produkt");
    } finally {
      setProdLoading(false);
    }
  }

  /**
   * Auto-forhåndsvisning — rendrer malen automatisk når arketype, retning,
   * format eller innhold endres (debounced), så du alltid ser hvilken mal du
   * bruker før du laster ned.
   */
  useEffect(() => {
    if (mode !== "bilde") return;
    const id = setTimeout(() => {
      void generate();
    }, 650);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, mal, variant, aspect, forms]);

  /** Idémyldring — brief og/eller scrape side, la Gemini foreslå post-ideer. */
  async function myldre() {
    const url = ideUrl.trim();
    const brief = ideBrief.trim();
    if (!url && !brief) return;
    setIdeLoading(true);
    setError(null);
    setIdeas([]);
    try {
      const res = await fetch("/api/innleggsbygger/maler-ideer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url || undefined, brief: brief || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Idémyldring feilet");
      const got = Array.isArray(json.ideas) ? (json.ideas as Idea[]) : [];
      if (got.length === 0)
        throw new Error("Ingen ideer kom tilbake — prøv en annen brief/URL");
      setIdeas(got.filter((i) => i && MALER[i.mal]));
      setSourceImages(
        Array.isArray(json.source?.images)
          ? (json.source.images as string[])
          : []
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Idémyldring feilet");
    } finally {
      setIdeLoading(false);
    }
  }

  /** Velg en idé — sett arketype + retning og fyll skjemaet. */
  function applyIdea(idea: Idea, ideaIdx = 0) {
    const m = idea.mal;
    const malDef = MALER[m];
    if (!malDef) return;
    const d = idea.data ?? {};
    setForms((prev) => {
      const base = cloneState(DEMO[m]);
      for (const f of malDef.fields) {
        if (f.kind === "scalar") {
          if (f.key === "photo") {
            // Auto-tildel et bilde fra pool-en (round-robin per idé)
            if (pool.length > 0) base.scalars.photo = pool[ideaIdx % pool.length];
            continue;
          }
          const v = d[f.key];
          if (typeof v === "string" && v.trim()) base.scalars[f.key] = v;
        } else {
          const rows = d[f.key];
          if (Array.isArray(rows) && rows.length > 0) {
            base.arrays[f.key] = rows.slice(0, f.max).map((r) => {
              const e = f.empty();
              if (typeof r === "string" || typeof r === "number") {
                // Enkel verdi (f.eks. bullets: ["punkt"]) → første kolonne
                if (f.cols.length === 1) e[f.cols[0].key] = String(r);
              } else if (r && typeof r === "object") {
                for (const c of f.cols) {
                  const cv = (r as Record<string, unknown>)[c.key];
                  if (typeof cv === "string") e[c.key] = cv;
                  else if (typeof cv === "number") e[c.key] = String(cv);
                }
              }
              return e;
            });
          }
        }
      }
      // Bildevegg: fyll bilde-radene fra pool-en hvis den har bilder
      if (m === "galleri" && pool.length > 0) {
        base.arrays.images = pool.slice(0, 6).map((u) => ({ photo: u }));
      }
      return { ...prev, [m]: base };
    });
    setMal(m);
    if (["A", "B", "C"].includes(idea.variant)) setVariant(idea.variant);
    setPreview(null);
    setError(null);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  /** Last opp flere bilder til bilde-poolen. */
  async function addToPool(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPoolBusy(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        try {
          urls.push(await fileToDataUrl(f));
        } catch {
          /* hopp over ugyldig bildefil */
        }
      }
      if (urls.length > 0) setPool((prev) => [...prev, ...urls]);
    } finally {
      setPoolBusy(false);
    }
  }

  /** Generer innholdspakke — captions, UTM-lenker og alt-tekst. */
  async function genererInnhold() {
    setInnholdLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/innleggsbygger/maler-innhold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: ideBrief.trim() || undefined,
          mal,
          data: buildData(mal, state),
          destinationUrl: destUrl.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Innholdsgenerering feilet");
      setInnhold(json as InnholdPakke);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Innholdsgenerering feilet");
    } finally {
      setInnholdLoading(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm";
  const labelCls = "text-xs text-gray-400 block mb-1";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Innleggsmaler</h1>
      <p className="text-sm text-gray-400 mb-4">
        108 ferdige design-layouts — 12 arketyper × 3 retninger × 3 format.
        Velg en mal, juster feltene (alt er forhåndsutfylt), generér.
      </p>

      {/* Modus — stillbilde eller video */}
      <div className="flex gap-2 mb-6">
        {(
          [
            { v: "bilde", label: "🖼️ Bilde" },
            { v: "video", label: "🎬 Video" },
          ] as const
        ).map((m) => (
          <button
            key={m.v}
            onClick={() => setMode(m.v)}
            className={`px-4 py-2 rounded border text-sm font-semibold transition-colors ${
              mode === m.v
                ? "border-red-500 bg-red-500/10 text-white"
                : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "video" ? (
        <VideoBuilder />
      ) : (
       <>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        {/* ── Venstre: konfig ── */}
        <div className="space-y-5">
          {/* Idémyldring */}
          <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-4">
            <label className={labelCls}>
              💡 Idémyldring — beskriv hva innlegget skal handle om, og/eller lim inn en side
            </label>
            <textarea
              value={ideBrief}
              onChange={(e) => setIdeBrief(e.target.value)}
              rows={2}
              placeholder="Brief: f.eks. «Vi har levert skreddersydd HDFI-koffert til Lufttransport — vis fram jobben med stolthet»"
              className={inputCls + " mb-2"}
            />
            <div className="flex gap-2">
              <input
                value={ideUrl}
                onChange={(e) => setIdeUrl(e.target.value)}
                placeholder="(valgfritt) https://fosen-tools.no/hdfi"
                className={inputCls}
                onKeyDown={(e) => {
                  if (e.key === "Enter") myldre();
                }}
              />
              <button
                onClick={myldre}
                disabled={ideLoading || (!ideUrl.trim() && !ideBrief.trim())}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 rounded text-white text-sm font-semibold whitespace-nowrap"
              >
                {ideLoading ? "Myldrer…" : "Myldre ideer"}
              </button>
            </div>
            {ideLoading && (
              <p className="text-xs text-gray-400 mt-2">
                Henter siden og brainstormer post-ideer …
              </p>
            )}
            {ideas.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ideas.map((idea, i) => (
                  <button
                    key={i}
                    onClick={() => applyIdea(idea, i)}
                    className="text-left border border-gray-700 bg-gray-900 hover:border-red-500 rounded p-3 transition-colors"
                  >
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-red-400 bg-red-500/10 rounded px-1.5 py-0.5 mb-1">
                      {MALER[idea.mal]?.label ?? idea.mal} · {idea.variant}
                    </span>
                    <div className="text-sm font-semibold text-white">
                      {idea.label}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {idea.summary}
                    </div>
                    <div className="text-[11px] text-red-400 mt-1.5 font-medium">
                      Bruk denne →
                    </div>
                  </button>
                ))}
              </div>
            )}
            {sourceImages.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] text-gray-500 mb-1">
                  🖼️ {sourceImages.length} bilder hentet fra siden — velg dem i
                  Bilde-feltene nedenfor
                </div>
                <div className="flex gap-2 flex-wrap">
                  {sourceImages.map((u, i) => (
                    <img
                      key={i}
                      src={u}
                      alt=""
                      className="h-12 w-12 object-cover rounded border border-gray-700"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Bilde-pool — opplastede bilder tilgjengelig i alle bilde-velgere */}
            <div className="mt-3 border-t border-red-500/20 pt-3">
              <label className="text-[11px] text-gray-500 block mb-1">
                🖼️ Bilde-pool — last opp bilder du vil bruke. De blir valgbare i
                alle Bilde-felt, og fordeles automatisk når du tar i bruk idéer.
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  addToPool(e.target.files);
                  e.target.value = "";
                }}
                className="text-xs text-gray-400"
              />
              {poolBusy && (
                <span className="text-xs text-gray-400 ml-2">Laster opp …</span>
              )}
              {pool.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {pool.map((u, i) => (
                    <div key={i} className="relative">
                      <img
                        src={u}
                        alt=""
                        className="h-12 w-12 object-cover rounded border border-gray-700"
                      />
                      <button
                        onClick={() =>
                          setPool((p) => p.filter((_, j) => j !== i))
                        }
                        className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full w-4 h-4 text-[10px] leading-none flex items-center justify-center"
                        aria-label="Fjern bilde"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Arketype-velger */}
          <div>
            <label className={labelCls}>Arketype</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MAL_ORDER.map((m) => {
                const d = MALER[m];
                return (
                  <button
                    key={m}
                    onClick={() => {
                      setMal(m);
                      setPreview(null);
                      setError(null);
                    }}
                    className={`px-3 py-3 rounded border text-left transition-colors ${
                      mal === m
                        ? "border-red-500 bg-red-500/10"
                        : "border-gray-700 bg-gray-900 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-sm font-semibold text-white">
                      {d.label}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {d.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Retning A/B/C */}
          <div>
            <label className={labelCls}>Retning</label>
            <div className="grid grid-cols-3 gap-2">
              {VARIANTS.map((v) => (
                <button
                  key={v.value}
                  onClick={() => {
                    setVariant(v.value);
                    setPreview(null);
                  }}
                  className={`px-3 py-2.5 rounded border text-left transition-colors ${
                    variant === v.value
                      ? "border-red-500 bg-red-500/10"
                      : "border-gray-700 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <div className="text-sm font-semibold text-white">
                    {v.label}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {v.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Format fb/ig/li */}
          <div>
            <label className={labelCls}>Format</label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECTS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => {
                    setAspect(a.value);
                    setPreview(null);
                  }}
                  className={`px-3 py-2.5 rounded border text-sm font-medium transition-colors ${
                    aspect === a.value
                      ? "border-red-500 bg-red-500/10 text-white"
                      : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Skjema-drevet form */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className={labelCls + " mb-0"}>
                Innhold — {def.label}
              </label>
              <button
                onClick={resetToDemo}
                className="text-xs text-gray-400 hover:text-white"
              >
                ↺ Tilbakestill til demo
              </button>
            </div>

            {/* Produkt-URL-import (produkt-malene) */}
            {(mal === "produkt-single" ||
              mal === "produkt-grid" ||
              mal === "produkt-mfr") && (
              <div className="border border-blue-500/30 bg-blue-500/5 rounded p-3">
                <label className={labelCls}>
                  🔗 Hent produkt fra fosen-tools.no —{" "}
                  {mal === "produkt-single"
                    ? "fyller feltene under inkl. bilde"
                    : "legger til en ny rad inkl. bilde"}
                </label>
                <div className="flex gap-2">
                  <input
                    value={prodUrl}
                    onChange={(e) => setProdUrl(e.target.value)}
                    placeholder="https://fosen-tools.no/produkt/…"
                    className={inputCls}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") importProduct();
                    }}
                  />
                  <button
                    onClick={importProduct}
                    disabled={prodLoading || !prodUrl.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded text-white text-sm font-semibold whitespace-nowrap"
                  >
                    {prodLoading ? "Henter…" : "Hent"}
                  </button>
                </div>
              </div>
            )}

            {visibleFields.map((f) => {
              if (f.kind === "scalar") {
                const val = state.scalars[f.key] ?? "";
                return (
                  <div key={f.key}>
                    <label className={labelCls}>{f.label}</label>
                    {f.key === "photo" ? (
                      <ImagePicker
                        value={val}
                        onPick={(v) => patchScalar(f.key, v)}
                        sourceImages={pickerImages}
                      />
                    ) : f.type === "textarea" ? (
                      <textarea
                        value={val}
                        rows={2}
                        onChange={(e) => patchScalar(f.key, e.target.value)}
                        className={inputCls}
                      />
                    ) : (
                      <input
                        value={val}
                        inputMode={f.type === "number" ? "numeric" : undefined}
                        onChange={(e) => patchScalar(f.key, e.target.value)}
                        className={inputCls}
                      />
                    )}
                  </div>
                );
              }

              // array-felt — repeterbar rad-editor
              const rows = state.arrays[f.key] ?? [];
              return (
                <div key={f.key}>
                  <label className={labelCls}>
                    {f.label} ({rows.length}/{f.max})
                  </label>
                  <div className="space-y-2">
                    {rows.map((row, ri) => (
                      <div
                        key={ri}
                        className="border border-gray-800 rounded p-2 bg-gray-900/50 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-gray-500">
                            #{ri + 1}
                          </span>
                          {rows.length > f.min && (
                            <button
                              onClick={() => removeRow(f, ri)}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              ✕ Fjern
                            </button>
                          )}
                        </div>
                        {f.cols.map((c) => (
                          <div key={c.key}>
                            <label className="text-[10px] text-gray-500 block mb-0.5">
                              {c.label}
                            </label>
                            {c.key === "photo" ? (
                              <ImagePicker
                                value={row[c.key] ?? ""}
                                onPick={(v) =>
                                  patchArrayCell(f.key, ri, c.key, v)
                                }
                                sourceImages={pickerImages}
                              />
                            ) : (
                              <input
                                value={row[c.key] ?? ""}
                                inputMode={
                                  c.type === "number" ? "numeric" : undefined
                                }
                                onChange={(e) =>
                                  patchArrayCell(
                                    f.key,
                                    ri,
                                    c.key,
                                    e.target.value
                                  )
                                }
                                className={inputCls}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  {rows.length < f.max && (
                    <button
                      onClick={() => addRow(f)}
                      className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                    >
                      + Legg til rad
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Generér på nytt (forhåndsvisningen oppdateres ellers automatisk) */}
          <button
            onClick={generate}
            disabled={generating}
            className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded text-white font-semibold"
          >
            {generating ? "Oppdaterer forhåndsvisning…" : "✨ Oppdater forhåndsvisning"}
          </button>
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* ── Høyre: preview ── */}
        <div className="lg:sticky lg:top-6 self-start">
          <label className={labelCls}>
            Forhåndsvisning{" "}
            <span className="text-gray-600">
              — {def.label} · retning {variant} ·{" "}
              {ASPECTS.find((a) => a.value === aspect)?.label}
            </span>
          </label>
          <div className="border border-gray-800 rounded bg-gray-900/50 p-3 flex items-center justify-center min-h-[300px] relative">
            {preview ? (
              <img
                src={preview}
                alt="Innlegg-preview"
                className={`max-w-full rounded transition-opacity ${
                  generating ? "opacity-50" : ""
                }`}
              />
            ) : (
              <span className="text-sm text-gray-500 text-center">
                {generating
                  ? "Rendrer forhåndsvisning …"
                  : "Velg en mal — forhåndsvisningen lastes automatisk"}
              </span>
            )}
            {generating && preview && (
              <span className="absolute top-2 right-2 text-[11px] text-gray-300 bg-black/60 rounded px-2 py-0.5">
                oppdaterer …
              </span>
            )}
          </div>
          {preview && (
            <button
              onClick={download}
              className="mt-3 w-full py-2 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm"
            >
              ⬇ Last ned PNG
            </button>
          )}
        </div>
      </div>

      {/* ── Innholdspakke — captions + UTM + alt-tekst ── */}
      <div className="mt-6 border border-red-500/30 bg-red-500/5 rounded-lg p-4">
        <label className={labelCls}>
          📝 Generer innhold — ferdige captions for Facebook, LinkedIn og
          Instagram med UTM-lenker og alt-tekst
        </label>
        <div className="flex gap-2 mb-1">
          <input
            value={destUrl}
            onChange={(e) => setDestUrl(e.target.value)}
            placeholder="Lenke-mål for FB/LinkedIn (https://fosen-tools.no/…) — valgfritt"
            className={inputCls}
          />
          <button
            onClick={genererInnhold}
            disabled={innholdLoading}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 rounded text-white text-sm font-semibold whitespace-nowrap"
          >
            {innholdLoading ? "Genererer…" : "Generer innhold"}
          </button>
        </div>
        <p className="text-[11px] text-gray-500">
          Bruker briefen + det genererte innlegget. UTM-lenker lages for Facebook
          og LinkedIn — Instagram får ingen (lenker er ikke klikkbare der).
        </p>
        {innhold && (
          <div className="mt-3 space-y-3">
            {innhold.campaign && (
              <div className="text-[11px] text-gray-500">
                UTM-kampanje:{" "}
                <span className="text-gray-300 font-mono">
                  {innhold.campaign}
                </span>
              </div>
            )}
            <PlatformCard
              title="Facebook"
              accent="text-blue-400"
              caption={innhold.facebook.caption}
              utm={innhold.facebook.utm}
            />
            <PlatformCard
              title="LinkedIn"
              accent="text-sky-400"
              caption={innhold.linkedin.caption}
              hashtags={innhold.linkedin.hashtags}
              altText={innhold.linkedin.altText}
              utm={innhold.linkedin.utm}
            />
            <PlatformCard
              title="Instagram"
              accent="text-pink-400"
              caption={innhold.instagram.caption}
              hashtags={innhold.instagram.hashtags}
              altText={innhold.instagram.altText}
            />
          </div>
        )}
      </div>
       </>
      )}
    </div>
  );
}
