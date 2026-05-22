"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * VideoBuilder — video-modusen i innleggsbyggeren.
 *
 * Velg video-type (produkt-spotlight / leveranse-reel / milepæl), fyll
 * feltene, velg format, render. Render skjer via /api/innleggsbygger/video
 * (Remotion + headless Chrome) — fungerer LOKALT (`npm run dev`), ikke i en
 * vanlig Vercel serverless-funksjon.
 */

import { useState } from "react";

// ── typer ────────────────────────────────────────────────────────────

type VideoType =
  | "produkt-spotlight"
  | "leveranse-reel"
  | "milepael"
  | "kampanje-teaser"
  | "sitat";
type VideoFormat = "reel" | "square" | "wide";

type Pair = { value: string; label: string };

type KampanjeProdukt = {
  name: string;
  manufacturer: string;
  imageUrl: string | null;
  priceBefore: number | null;
  priceNow: number;
  discountPct: number | null;
};

type VField =
  | { k: "text"; key: string; label: string; ph?: string }
  | { k: "textarea"; key: string; label: string; ph?: string }
  | { k: "number"; key: string; label: string; nullable?: boolean }
  | { k: "list"; key: string; label: string; max: number; ph?: string }
  | { k: "pairs"; key: string; label: string; max: number; aLabel: string; bLabel: string }
  | { k: "bool"; key: string; label: string }
  | { k: "image"; key: string; label: string }
  | { k: "images"; key: string; label: string; max: number }
  | { k: "products"; key: string; label: string; max: number };

interface VideoDef {
  label: string;
  desc: string;
  fields: VField[];
  sample: Record<string, unknown>;
}

// ── definisjoner (speiler remotion/types.ts) ─────────────────────────

const VIDEO_DEFS: Record<VideoType, VideoDef> = {
  "produkt-spotlight": {
    label: "Produkt-spotlight",
    desc: "Ett produkt: bilde, pris, rabatt-burst, USP-er, CTA",
    fields: [
      { k: "text", key: "eyebrow", label: "Etikett", ph: "Ukens tilbud" },
      { k: "text", key: "productName", label: "Produktnavn" },
      { k: "text", key: "manufacturer", label: "Produsent" },
      { k: "image", key: "imageUrl", label: "Produktbilde (URL)" },
      { k: "number", key: "priceBefore", label: "Før-pris (NOK)", nullable: true },
      { k: "number", key: "priceNow", label: "Nå-pris (NOK)" },
      { k: "number", key: "discountPct", label: "Rabatt (%)", nullable: true },
      { k: "text", key: "sku", label: "Art.nr" },
      { k: "list", key: "bullets", label: "USP-punkter", max: 4, ph: "Punkt" },
      { k: "text", key: "ctaUrl", label: "CTA-lenke" },
    ],
    sample: {
      eyebrow: "Ukens tilbud",
      productName: "Kraftform Kompakt 20 Tool Finder",
      manufacturer: "Wera",
      manufacturerLogoUrl: null,
      imageUrl: "",
      priceBefore: 1290,
      priceNow: 899,
      discountPct: 30,
      sku: "05057460001",
      bullets: [
        "20 bits + bitsholder i ett",
        "Take-it-easy fargekoding",
        "Tysk presisjon, livstidskvalitet",
      ],
      ctaUrl: "fosen-tools.no/wera",
    },
  },
  "leveranse-reel": {
    label: "Leveranse-reel",
    desc: "«Levert til [kunde]» — bilder + skreddersøm-vinkling",
    fields: [
      { k: "text", key: "eyebrow", label: "Etikett", ph: "Levert" },
      { k: "text", key: "customer", label: "Kunde" },
      { k: "text", key: "industry", label: "Bransje" },
      { k: "image", key: "customerLogoUrl", label: "Kunde-logo (valgfri)" },
      { k: "bool", key: "anonymous", label: "Hold kunden anonym (skjuler navn + logo)" },
      { k: "text", key: "headline", label: "Overskrift" },
      { k: "textarea", key: "description", label: "Beskrivelse" },
      { k: "images", key: "imageUrls", label: "Leveranse-bilder", max: 6 },
      { k: "list", key: "tags", label: "Stikkord", max: 4, ph: "HDFI" },
      { k: "text", key: "ctaUrl", label: "CTA-lenke" },
    ],
    sample: {
      eyebrow: "Levert",
      customer: "TESS VEST",
      industry: "Offshore",
      customerLogoUrl: null,
      anonymous: false,
      headline: "Skreddersydd HDFI for kraftpipe 22-38 mm",
      description:
        "OPTI-koffert med CAD-tegnet, CNC-maskinert skuminnlegg — hver pipe har sin plass.",
      imageUrls: [],
      tags: ["HDFI", "CADLAB", "CNC-maskinert"],
      ctaUrl: "fosen-tools.no",
    },
  },
  milepael: {
    label: "Milepæl",
    desc: "Stort tall som teller opp — jubileum / statistikk",
    fields: [
      { k: "text", key: "eyebrow", label: "Etikett", ph: "Fosen Tools" },
      { k: "number", key: "number", label: "Hovedtall" },
      { k: "text", key: "unit", label: "Enhet", ph: "ÅR" },
      { k: "text", key: "headline", label: "Overskrift" },
      { k: "textarea", key: "subhead", label: "Underoverskrift" },
      {
        k: "pairs",
        key: "stats",
        label: "Statistikk-kort",
        max: 3,
        aLabel: "Verdi",
        bLabel: "Tekst",
      },
      { k: "bool", key: "showJubileum", label: "Vis 25-års jubileumslogo" },
      { k: "text", key: "ctaUrl", label: "CTA-lenke" },
    ],
    sample: {
      // IntroScene viser taglinen i stedet for å gjenta brand-navnet.
      // Eyebrow er tilgjengelig for evt. caption-bruk senere.
      eyebrow: "Milepæl 2026",
      number: 25,
      unit: "ÅR",
      headline: "Verktøy for fagfolk",
      subhead: "Del av et familiekonsern med 100 år bak seg.",
      stats: [
        { value: "100", label: "år i konsernet" },
        { value: "40+", label: "merker på lager" },
        { value: "4.", label: "generasjon" },
      ],
      showJubileum: true,
      ctaUrl: "fosen-tools.no",
    },
  },
  "kampanje-teaser": {
    label: "Kampanje-teaser",
    desc: "3-6 produkter med crossfade — ukens kampanje / sesongsalg",
    fields: [
      { k: "text", key: "eyebrow", label: "Etikett", ph: "Kampanje" },
      { k: "text", key: "headline", label: "Overskrift" },
      { k: "text", key: "subhead", label: "Underoverskrift" },
      { k: "products", key: "products", label: "Produkter (3-6)", max: 6 },
      { k: "text", key: "ctaUrl", label: "CTA-lenke" },
    ],
    sample: {
      eyebrow: "Kampanje",
      headline: "Vårsalget er i gang",
      subhead: "Utvalgte produkter til kampanjepris",
      products: [
        {
          name: "Kraftform Kompakt 20",
          manufacturer: "Wera",
          imageUrl: null,
          priceBefore: 1290,
          priceNow: 899,
          discountPct: 30,
        },
        {
          name: "Cobra QuickSet vannpumpetang",
          manufacturer: "Knipex",
          imageUrl: null,
          priceBefore: 990,
          priceNow: 690,
          discountPct: 30,
        },
        {
          name: "Manoskop momentnøkkel 730N/20",
          manufacturer: "Stahlwille",
          imageUrl: null,
          priceBefore: 4900,
          priceNow: 3920,
          discountPct: 20,
        },
      ] as KampanjeProdukt[],
      ctaUrl: "fosen-tools.no/kampanje",
    },
  },
  sitat: {
    label: "Sitat",
    desc: "Kundesitat med atribuering — trust-signal / referanse",
    fields: [
      { k: "text", key: "eyebrow", label: "Etikett", ph: "Kunden sier" },
      { k: "textarea", key: "quote", label: "Sitatet (uten anførselstegn)" },
      { k: "text", key: "attributionName", label: "Navn" },
      { k: "text", key: "attributionRole", label: "Rolle" },
      { k: "text", key: "attributionCompany", label: "Selskap" },
      { k: "image", key: "companyLogoUrl", label: "Selskapslogo (valgfri)" },
      { k: "text", key: "ctaUrl", label: "CTA-lenke" },
    ],
    sample: {
      eyebrow: "Kunden sier",
      quote:
        "Fosen Tools leverte en HDFI-løsning som var skreddersydd helt ned til siste pipe — det er forskjellen mellom et verktøykap og en arbeidsstasjon.",
      attributionName: "Ola Nordmann",
      attributionRole: "Innkjøpsansvarlig",
      attributionCompany: "Eksempel AS",
      companyLogoUrl: null,
      ctaUrl: "fosen-tools.no/referanser",
    },
  },
};

const TYPE_ORDER: VideoType[] = [
  "produkt-spotlight",
  "leveranse-reel",
  "kampanje-teaser",
  "milepael",
  "sitat",
];

const FORMATS: { value: VideoFormat; label: string }[] = [
  { value: "reel", label: "Reel 9:16" },
  { value: "square", label: "Kvadrat 1:1" },
  { value: "wide", label: "Bred 16:9" },
];

// ── komponent ────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm";
const labelCls = "text-xs text-gray-400 block mb-1";

export default function VideoBuilder() {
  const [vtype, setVtype] = useState<VideoType>("produkt-spotlight");
  const [format, setFormat] = useState<VideoFormat>("reel");
  const [data, setData] = useState<Record<VideoType, Record<string, unknown>>>(
    () =>
      Object.fromEntries(
        TYPE_ORDER.map((t) => [t, structuredClone(VIDEO_DEFS[t].sample)]),
      ) as Record<VideoType, Record<string, unknown>>,
  );
  const [rendering, setRendering] = useState(false);
  const [video, setVideo] = useState<{
    url: string;
    width: number;
    height: number;
    durationSec: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prodUrl, setProdUrl] = useState("");
  const [prodLoading, setProdLoading] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const def = VIDEO_DEFS[vtype];
  const form = data[vtype];

  function setField(key: string, value: unknown) {
    setData((prev) => ({
      ...prev,
      [vtype]: { ...prev[vtype], [key]: value },
    }));
  }

  function resetToSample() {
    setData((prev) => ({
      ...prev,
      [vtype]: structuredClone(VIDEO_DEFS[vtype].sample),
    }));
    setVideo(null);
    setError(null);
  }

  /** Last opp en bildefil → /api/social/upload → offentlig URL. */
  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/social/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Opplasting feilet");
    return json.public_url as string;
  }

  /**
   * Hent produktdata fra fosen-tools.no og REPLACE produkt-spotlight-state
   * helt — så Wera-temaede demo-defaults ikke lekker når man importerer
   * en URL fra en annen produsent. CTA-URL avledes fra produsent-slug.
   */
  async function importProduct() {
    const url = prodUrl.trim();
    if (!url) return;
    setProdLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/brosjyre/scrape-product?url=${encodeURIComponent(url)}`,
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Kunne ikke hente produkt");
      const p = (json.product ?? {}) as Record<string, unknown>;
      setData((prev) => {
        // Start fra en helt blank state — IKKE arve demo-defaults eller
        // tidligere import. Eyebrow beholdes som "Ukens tilbud" (nøytral
        // kategori-label).
        const clean: Record<string, unknown> = {
          format: "reel",
          eyebrow: "Ukens tilbud",
          productName: "",
          manufacturer: "",
          manufacturerLogoUrl: null,
          imageUrl: "",
          priceBefore: null,
          priceNow: 0,
          discountPct: null,
          sku: "",
          bullets: [],
          ctaUrl: "fosen-tools.no",
        };
        if (typeof p.name === "string") clean.productName = p.name;
        if (typeof p.manufacturer === "string")
          clean.manufacturer = p.manufacturer;
        if (typeof p.image_url === "string") clean.imageUrl = p.image_url;
        if (typeof p.price_before === "number" && p.price_before > 0)
          clean.priceBefore = p.price_before;
        if (typeof p.price_now === "number" && p.price_now > 0)
          clean.priceNow = p.price_now;
        if (typeof p.discount_pct === "number" && p.discount_pct > 0)
          clean.discountPct = Math.round(p.discount_pct);
        if (typeof p.sku === "string") clean.sku = p.sku;
        // Bruk bullets fra scrapen (fosen-tools.no #description) — IKKE
        // gjenbruk Wera-demoen.
        if (Array.isArray(p.bullets)) {
          clean.bullets = (p.bullets as unknown[])
            .filter((b): b is string => typeof b === "string" && b.trim() !== "")
            .slice(0, 4);
        }
        // CTA-URL → avledet fra produsent-slug (lowercase, mellomrom → "-").
        const mfr = String(clean.manufacturer || "").trim();
        if (mfr) {
          const slug = mfr
            .toLowerCase()
            .replace(/æ/g, "ae")
            .replace(/ø/g, "o")
            .replace(/å/g, "a")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
          if (slug) clean.ctaUrl = `fosen-tools.no/${slug}`;
        }
        return { ...prev, "produkt-spotlight": clean };
      });
      setVtype("produkt-spotlight");
      setProdUrl("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke hente produkt");
    } finally {
      setProdLoading(false);
    }
  }

  async function render() {
    setRendering(true);
    setError(null);
    setVideo(null);
    try {
      const res = await fetch("/api/innleggsbygger/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: vtype, format, data: form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Render feilet");
      setVideo({
        url: json.url,
        width: json.width,
        height: json.height,
        durationSec: json.durationSec,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Render feilet");
    } finally {
      setRendering(false);
    }
  }

  // ── felt-renderer ──────────────────────────────────────────────────

  function renderField(f: VField) {
    const val = form[f.key];

    if (f.k === "text") {
      return (
        <input
          value={typeof val === "string" ? val : ""}
          placeholder={f.ph}
          onChange={(e) => setField(f.key, e.target.value)}
          className={inputCls}
        />
      );
    }
    if (f.k === "textarea") {
      return (
        <textarea
          value={typeof val === "string" ? val : ""}
          placeholder={f.ph}
          rows={2}
          onChange={(e) => setField(f.key, e.target.value)}
          className={inputCls}
        />
      );
    }
    if (f.k === "number") {
      return (
        <input
          value={typeof val === "number" ? String(val) : ""}
          inputMode="numeric"
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (raw === "") setField(f.key, f.nullable ? null : 0);
            else {
              const n = Number(raw);
              if (!Number.isNaN(n)) setField(f.key, n);
            }
          }}
          className={inputCls}
        />
      );
    }
    if (f.k === "bool") {
      return (
        <label className="flex items-center gap-2 text-sm text-white">
          <input
            type="checkbox"
            checked={val === true}
            onChange={(e) => setField(f.key, e.target.checked)}
          />
          {f.label}
        </label>
      );
    }
    if (f.k === "image") {
      const url = typeof val === "string" ? val : "";
      return (
        <div className="space-y-2">
          <input
            value={url}
            placeholder="Lim inn bilde-URL, eller last opp under"
            onChange={(e) => setField(f.key, e.target.value)}
            className={inputCls}
          />
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setUploadingKey(f.key);
                try {
                  setField(f.key, await uploadFile(file));
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Opplasting feilet",
                  );
                } finally {
                  setUploadingKey(null);
                }
              }}
              className="text-xs text-gray-400"
            />
            {uploadingKey === f.key && (
              <span className="text-xs text-gray-400">Laster opp …</span>
            )}
            {url && (
              <img
                src={url}
                alt=""
                className="h-12 w-12 object-cover rounded border border-gray-700"
              />
            )}
          </div>
        </div>
      );
    }
    if (f.k === "list") {
      const arr = Array.isArray(val) ? (val as string[]) : [];
      return (
        <div className="space-y-2">
          {arr.map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={item}
                placeholder={f.ph}
                onChange={(e) => {
                  const next = [...arr];
                  next[i] = e.target.value;
                  setField(f.key, next);
                }}
                className={inputCls}
              />
              <button
                onClick={() =>
                  setField(
                    f.key,
                    arr.filter((_, j) => j !== i),
                  )
                }
                className="px-2 text-red-400 hover:text-red-300 text-sm"
                aria-label="Fjern"
              >
                ✕
              </button>
            </div>
          ))}
          {arr.length < f.max && (
            <button
              onClick={() => setField(f.key, [...arr, ""])}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              + Legg til
            </button>
          )}
        </div>
      );
    }
    if (f.k === "images") {
      const arr = Array.isArray(val) ? (val as string[]) : [];
      return (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            {arr.map((u, i) => (
              <div key={i} className="relative">
                <img
                  src={u}
                  alt=""
                  className="h-16 w-16 object-cover rounded border border-gray-700"
                />
                <button
                  onClick={() =>
                    setField(
                      f.key,
                      arr.filter((_, j) => j !== i),
                    )
                  }
                  className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full w-4 h-4 text-[10px] leading-none flex items-center justify-center"
                  aria-label="Fjern bilde"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {arr.length < f.max && (
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  if (files.length === 0) return;
                  setUploadingKey(f.key);
                  try {
                    const urls: string[] = [];
                    for (const file of files.slice(0, f.max - arr.length)) {
                      urls.push(await uploadFile(file));
                    }
                    setField(f.key, [...arr, ...urls]);
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Opplasting feilet",
                    );
                  } finally {
                    setUploadingKey(null);
                  }
                }}
                className="text-xs text-gray-400"
              />
              {uploadingKey === f.key && (
                <span className="text-xs text-gray-400">Laster opp …</span>
              )}
            </div>
          )}
        </div>
      );
    }
    if (f.k === "products") {
      const products = Array.isArray(val) ? (val as KampanjeProdukt[]) : [];
      const blank = (): KampanjeProdukt => ({
        name: "",
        manufacturer: "",
        imageUrl: null,
        priceBefore: null,
        priceNow: 0,
        discountPct: null,
      });
      const patch = (i: number, key: keyof KampanjeProdukt, v: unknown) => {
        const next = products.map((p, j) =>
          j === i ? { ...p, [key]: v } : p,
        );
        setField(f.key, next);
      };
      return (
        <div className="space-y-3">
          {products.map((prod, i) => (
            <div
              key={i}
              className="border border-gray-800 rounded p-3 bg-gray-900/50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  Produkt #{i + 1}
                </span>
                {products.length > 1 && (
                  <button
                    onClick={() =>
                      setField(
                        f.key,
                        products.filter((_, j) => j !== i),
                      )
                    }
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    ✕ Fjern
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-500 block mb-0.5">
                    Navn
                  </label>
                  <input
                    value={prod.name}
                    onChange={(e) => patch(i, "name", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-500 block mb-0.5">
                    Produsent
                  </label>
                  <input
                    value={prod.manufacturer}
                    onChange={(e) => patch(i, "manufacturer", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">
                    Før-pris
                  </label>
                  <input
                    value={
                      typeof prod.priceBefore === "number"
                        ? String(prod.priceBefore)
                        : ""
                    }
                    inputMode="numeric"
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      patch(
                        i,
                        "priceBefore",
                        raw === "" ? null : Number(raw),
                      );
                    }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">
                    Nå-pris
                  </label>
                  <input
                    value={
                      typeof prod.priceNow === "number"
                        ? String(prod.priceNow)
                        : ""
                    }
                    inputMode="numeric"
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      patch(i, "priceNow", raw === "" ? 0 : Number(raw));
                    }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">
                    Rabatt (%)
                  </label>
                  <input
                    value={
                      typeof prod.discountPct === "number"
                        ? String(prod.discountPct)
                        : ""
                    }
                    inputMode="numeric"
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      patch(
                        i,
                        "discountPct",
                        raw === "" ? null : Number(raw),
                      );
                    }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-0.5">
                    Bilde
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      setUploadingKey(`${f.key}-${i}`);
                      try {
                        const url = await uploadFile(file);
                        patch(i, "imageUrl", url);
                      } catch (err) {
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Opplasting feilet",
                        );
                      } finally {
                        setUploadingKey(null);
                      }
                    }}
                    className="text-xs text-gray-400"
                  />
                  {uploadingKey === `${f.key}-${i}` && (
                    <span className="text-xs text-gray-400">Laster …</span>
                  )}
                </div>
                {prod.imageUrl ? (
                  <div className="col-span-2">
                    <img
                      src={prod.imageUrl}
                      alt=""
                      className="h-16 w-16 object-cover rounded border border-gray-700"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {products.length < f.max && (
            <button
              onClick={() => setField(f.key, [...products, blank()])}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              + Legg til produkt
            </button>
          )}
        </div>
      );
    }
    // pairs
    const pairs = Array.isArray(val) ? (val as Pair[]) : [];
    return (
      <div className="space-y-2">
        {pairs.map((p, i) => (
          <div
            key={i}
            className="border border-gray-800 rounded p-2 bg-gray-900/50 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">#{i + 1}</span>
              <button
                onClick={() =>
                  setField(
                    f.key,
                    pairs.filter((_, j) => j !== i),
                  )
                }
                className="text-xs text-red-400 hover:text-red-300"
              >
                ✕ Fjern
              </button>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">
                {f.aLabel}
              </label>
              <input
                value={p.value}
                onChange={(e) => {
                  const next = pairs.map((q, j) =>
                    j === i ? { ...q, value: e.target.value } : q,
                  );
                  setField(f.key, next);
                }}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-0.5">
                {f.bLabel}
              </label>
              <input
                value={p.label}
                onChange={(e) => {
                  const next = pairs.map((q, j) =>
                    j === i ? { ...q, label: e.target.value } : q,
                  );
                  setField(f.key, next);
                }}
                className={inputCls}
              />
            </div>
          </div>
        ))}
        {pairs.length < f.max && (
          <button
            onClick={() =>
              setField(f.key, [...pairs, { value: "", label: "" }])
            }
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            + Legg til kort
          </button>
        )}
      </div>
    );
  }

  // ── render ─────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
      {/* venstre — konfig */}
      <div className="space-y-5">
        <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-3 text-xs text-amber-300/90">
          🎬 Video-render kjører Remotion + en headless nettleser server-side.
          Det fungerer <strong>lokalt</strong> (`npm run dev`). En render tar
          typisk 30-90 sekunder.
        </div>

        {/* video-type */}
        <div>
          <label className={labelCls}>Video-type</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {TYPE_ORDER.map((t) => {
              const d = VIDEO_DEFS[t];
              return (
                <button
                  key={t}
                  onClick={() => {
                    setVtype(t);
                    setVideo(null);
                    setError(null);
                  }}
                  className={`px-3 py-3 rounded border text-left transition-colors ${
                    vtype === t
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

        {/* format */}
        <div>
          <label className={labelCls}>Format</label>
          <div className="grid grid-cols-3 gap-2">
            {FORMATS.map((a) => (
              <button
                key={a.value}
                onClick={() => {
                  setFormat(a.value);
                  setVideo(null);
                }}
                className={`px-3 py-2.5 rounded border text-sm font-medium transition-colors ${
                  format === a.value
                    ? "border-red-500 bg-red-500/10 text-white"
                    : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-600"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* produkt-import (kun produkt-spotlight) */}
        {vtype === "produkt-spotlight" && (
          <div className="border border-blue-500/30 bg-blue-500/5 rounded p-3">
            <label className={labelCls}>
              🔗 Hent produkt fra fosen-tools.no — fyller feltene inkl. bilde
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

        {/* felter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={labelCls + " mb-0"}>Innhold — {def.label}</label>
            <button
              onClick={resetToSample}
              className="text-xs text-gray-400 hover:text-white"
            >
              ↺ Tilbakestill til demo
            </button>
          </div>
          {def.fields.map((f) => (
            <div key={f.key}>
              {f.k !== "bool" && <label className={labelCls}>{f.label}</label>}
              {renderField(f)}
            </div>
          ))}
        </div>

        <button
          onClick={render}
          disabled={rendering}
          className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded text-white font-semibold"
        >
          {rendering ? "Rendrer video … (30-90 sek)" : "🎬 Render video"}
        </button>
        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* høyre — preview */}
      <div className="lg:sticky lg:top-6 self-start">
        <label className={labelCls}>
          Forhåndsvisning{" "}
          <span className="text-gray-600">
            — {def.label} · {FORMATS.find((a) => a.value === format)?.label}
          </span>
        </label>
        <div className="border border-gray-800 rounded bg-gray-900/50 p-3 flex items-center justify-center min-h-[300px]">
          {video ? (
            <video
              src={video.url}
              controls
              autoPlay
              loop
              muted
              playsInline
              className="max-w-full max-h-[70vh] rounded"
            />
          ) : (
            <span className="text-sm text-gray-500 text-center">
              {rendering
                ? "Rendrer video — dette tar 30-90 sekunder …"
                : "Fyll feltene og trykk «Render video»"}
            </span>
          )}
        </div>
        {video && (
          <div className="mt-3 space-y-2">
            <div className="text-[11px] text-gray-500">
              {video.width}×{video.height} · {video.durationSec}s
            </div>
            <a
              href={video.url}
              download={`ft-video-${vtype}-${format}.mp4`}
              className="block text-center w-full py-2 bg-gray-800 hover:bg-gray-700 rounded text-white text-sm"
            >
              ⬇ Last ned MP4
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
