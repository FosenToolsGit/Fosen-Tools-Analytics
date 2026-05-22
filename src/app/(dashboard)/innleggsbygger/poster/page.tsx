"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

/**
 * Innleggsbygger — mal-basert sosiale-medier-post-generator.
 *
 * Deterministisk HTML→PNG-render (ingen AI). To familier av maler:
 *   • Produkt    — enkelt-produkt, kampanje-grid, produsent-kampanje, feature
 *   • Tilstedeværelse — prosess, leveranse, besøk, stand, ansatt, sitat,
 *                       milepæl, partner
 * Velg mal, fyll inn felter (manuelt eller via URL-import), generér
 * pixel-perfekt post for FB/IG/LinkedIn.
 */

type ProduktLayout = "single" | "grid" | "manufacturer" | "feature";
type MalKind =
  | "prosess"
  | "leveranse"
  | "besok"
  | "stand"
  | "ansatt"
  | "sitat"
  | "milepael"
  | "partner";
type Selected = ProduktLayout | MalKind;
type Aspect = "fb" | "ig" | "li";
type Bg = "ink" | "red" | "cream";

interface ProductRow {
  url: string;
  name: string;
  priceNow: string;
  priceBefore: string;
  imageUrl: string;
  manufacturer: string;
  manufacturerLogoUrl: string;
  loading: boolean;
}

const emptyRow = (): ProductRow => ({
  url: "",
  name: "",
  priceNow: "",
  priceBefore: "",
  imageUrl: "",
  manufacturer: "",
  manufacturerLogoUrl: "",
  loading: false,
});

const PRODUKT_LAYOUTS: { value: ProduktLayout; label: string; desc: string }[] = [
  { value: "single", label: "Enkelt-produkt", desc: "Ett produkt på tilbud — stort" },
  { value: "grid", label: "Kampanje-grid", desc: "3-6 produkter i rutenett" },
  { value: "manufacturer", label: "Produsent-kampanje", desc: "«Mest kjøpt fra {Merke}»" },
  { value: "feature", label: "Tjeneste / feature", desc: "HDFI, CADLAB — fordeler + CTA" },
];

const ASPECTS: { value: Aspect; label: string }[] = [
  { value: "fb", label: "Facebook 1:1" },
  { value: "ig", label: "Instagram 4:5" },
  { value: "li", label: "LinkedIn 16:9" },
];

// ── Mal-skjema: feltdefinisjoner per tilstedeværelse-mal ──
interface MalField {
  key: string;
  label: string;
  type: "text" | "textarea";
  placeholder?: string;
  optional?: boolean;
}
interface MalSchema {
  label: string;
  desc: string;
  defaultBg: Bg;
  fields: MalField[];
  hasSteps?: boolean;
}

const MAL_SCHEMA: Record<MalKind, MalSchema> = {
  prosess: {
    label: "Prosess / produksjon",
    desc: "Slik jobber vi — steg for steg",
    defaultBg: "ink",
    hasSteps: true,
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Slik jobber vi", optional: true },
      { key: "headline", label: "Overskrift", type: "text", placeholder: "Fra idé til ferdig HDFI" },
      { key: "redWord", label: "Rødt nøkkelord", type: "text", placeholder: "HDFI", optional: true },
      { key: "cta", label: "CTA (nederst)", type: "text", placeholder: "fosen-tools.no/hdfi", optional: true },
      { key: "imageUrl", label: "Bilde", type: "text", placeholder: "Foto bytter til foto-layout", optional: true },
    ],
  },
  leveranse: {
    label: "Leveranse til kunde",
    desc: "«Levert til …» — vis frem en jobb",
    defaultBg: "ink",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Levert", optional: true },
      { key: "customer", label: "Kunde", type: "text", placeholder: "TESS VEST" },
      { key: "headline", label: "Overskrift", type: "text", placeholder: "Skreddersydd OPTI-koffert med HDFI" },
      { key: "redWord", label: "Rødt nøkkelord", type: "text", placeholder: "HDFI", optional: true },
      { key: "segment", label: "Segment", type: "text", placeholder: "Industri", optional: true },
      { key: "description", label: "Beskrivelse", type: "textarea", placeholder: "Kraftpipe-sett 22-38 mm i koffert …", optional: true },
      { key: "imageUrl", label: "Bilde-URL", type: "text", placeholder: "https://…/foto.jpg", optional: true },
      { key: "cta", label: "CTA", type: "text", placeholder: "fosen-tools.no", optional: true },
    ],
  },
  besok: {
    label: "Besøk hos bedrift",
    desc: "«På besøk hos …» — kunde/partner",
    defaultBg: "ink",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "På besøk hos", optional: true },
      { key: "company", label: "Bedrift", type: "text", placeholder: "Andøya Space" },
      { key: "location", label: "Sted", type: "text", placeholder: "Andøya", optional: true },
      { key: "description", label: "Beskrivelse", type: "textarea", placeholder: "Vi tok turen til …", optional: true },
      { key: "imageUrl", label: "Bilde-URL", type: "text", placeholder: "https://…/foto.jpg", optional: true },
      { key: "cta", label: "CTA", type: "text", placeholder: "fosen-tools.no", optional: true },
    ],
  },
  stand: {
    label: "Stand / messe",
    desc: "«Møt oss på …» — arrangement",
    defaultBg: "red",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Møt oss", optional: true },
      { key: "eventName", label: "Arrangement", type: "text", placeholder: "Verktøymessen 2026" },
      { key: "redWord", label: "Rødt nøkkelord", type: "text", placeholder: "2026", optional: true },
      { key: "location", label: "Sted", type: "text", placeholder: "Trondheim Spektrum" },
      { key: "date", label: "Dato", type: "text", placeholder: "14.-16. mars" },
      { key: "standNr", label: "Stand-nr", type: "text", placeholder: "B-24", optional: true },
      { key: "description", label: "Beskrivelse", type: "textarea", placeholder: "Kom innom for en prat …", optional: true },
      { key: "cta", label: "CTA", type: "text", placeholder: "kom innom standen", optional: true },
      { key: "imageUrl", label: "Bilde", type: "text", placeholder: "Foto bytter til foto-layout", optional: true },
    ],
  },
  ansatt: {
    label: "Ansatt-presentasjon",
    desc: "«Møt teamet» — bli kjent med oss",
    defaultBg: "ink",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Møt teamet", optional: true },
      { key: "name", label: "Navn", type: "text", placeholder: "Ola Nordmann" },
      { key: "role", label: "Rolle", type: "text", placeholder: "CADLAB-tegner" },
      { key: "years", label: "Ansiennitet", type: "text", placeholder: "8 år i FT", optional: true },
      { key: "quote", label: "Sitat", type: "textarea", placeholder: "Den beste følelsen er …", optional: true },
      { key: "funFact", label: "Fun fact", type: "textarea", placeholder: "Har tegnet over 2 000 HDFI-innlegg …", optional: true },
      { key: "imageUrl", label: "Portrettfoto-URL", type: "text", placeholder: "https://…/portrett.jpg", optional: true },
    ],
  },
  sitat: {
    label: "Kundesitat",
    desc: "Stort sitat med attribusjon",
    defaultBg: "red",
    fields: [
      { key: "quote", label: "Sitat", type: "textarea", placeholder: "Fosen Tools leverer en standard …" },
      { key: "attributionName", label: "Navn", type: "text", placeholder: "Kari Hansen" },
      { key: "attributionRole", label: "Rolle", type: "text", placeholder: "Verkstedsleder", optional: true },
      { key: "attributionCompany", label: "Bedrift", type: "text", placeholder: "Lufttransport AS", optional: true },
      { key: "imageUrl", label: "Bilde", type: "text", placeholder: "Foto bytter til foto-layout", optional: true },
    ],
  },
  milepael: {
    label: "Milepæl / jubileum",
    desc: "Stort tall — 25 år, 100 år …",
    defaultBg: "ink",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Fosen Tools", optional: true },
      { key: "number", label: "Tall", type: "text", placeholder: "25" },
      { key: "unit", label: "Enhet", type: "text", placeholder: "år", optional: true },
      { key: "headline", label: "Overskrift", type: "text", placeholder: "Et kvart århundre med verktøyløsninger", optional: true },
      { key: "body", label: "Brødtekst", type: "textarea", placeholder: "Siden 2001 — del av et familiekonsern …", optional: true },
      { key: "imageUrl", label: "Bilde", type: "text", placeholder: "Foto bytter til foto-layout", optional: true },
    ],
  },
  partner: {
    label: "Partner / samarbeid",
    desc: "Fremhev en samarbeidspartner",
    defaultBg: "ink",
    fields: [
      { key: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Samarbeidspartner", optional: true },
      { key: "partnerName", label: "Partnernavn", type: "text", placeholder: "Wera" },
      { key: "partnerLogoUrl", label: "Logo-URL", type: "text", placeholder: "https://…/logo.png", optional: true },
      { key: "headline", label: "Overskrift", type: "text", placeholder: "Tysk presisjon i sortimentet", optional: true },
      { key: "description", label: "Beskrivelse", type: "textarea", placeholder: "Vi fører hele Wera-sortimentet …", optional: true },
      { key: "cta", label: "CTA", type: "text", placeholder: "fosen-tools.no/wera", optional: true },
      { key: "imageUrl", label: "Bilde", type: "text", placeholder: "Foto bytter til foto-layout", optional: true },
    ],
  },
};

const MAL_ORDER: MalKind[] = [
  "prosess",
  "leveranse",
  "besok",
  "stand",
  "ansatt",
  "sitat",
  "milepael",
  "partner",
];

const PRODUKT_KINDS = new Set<Selected>(["single", "grid", "manufacturer", "feature"]);
function isMalKind(s: Selected): s is MalKind {
  return !PRODUKT_KINDS.has(s);
}

/** Foto-feltet til en mal — «imageUrl» foretrekkes (styrer foto-layouten). */
function imageFieldKeyFor(s: Selected): string | null {
  if (!isMalKind(s)) return null;
  const keys = MAL_SCHEMA[s].fields.map((f) => f.key);
  if (keys.includes("imageUrl")) return "imageUrl";
  if (keys.includes("partnerLogoUrl")) return "partnerLogoUrl";
  return null;
}

/** Bildefelt-nøkler som skal ha opplasting + galleri-velger. */
const IMAGE_FIELD_KEYS = new Set(["imageUrl", "partnerLogoUrl"]);

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
 * Bildevelger — manuell URL, opplasting (nedskalert data-URL) og galleri
 * fra side-bildene. Brukes av både mal-feltene og feature-malen.
 */
function ImagePicker({
  value,
  onPick,
  sourceImages,
  placeholder,
}: {
  value: string;
  onPick: (v: string) => void;
  sourceImages: string[];
  placeholder?: string;
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
          placeholder={placeholder ?? "Lim inn bilde-URL…"}
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

// ── Idémyldring: forslag fra Gemini ──
interface Idea {
  template: "mal" | "feature";
  mal?: MalKind;
  background?: Bg;
  label: string;
  summary: string;
  benefits?: string[];
  steps?: { title?: string; text?: string }[];
  [key: string]: unknown;
}

export default function PosterBuilderPage() {
  const [selected, setSelected] = useState<Selected>("single");
  const [aspect, setAspect] = useState<Aspect>("fb");
  const [background, setBackground] = useState<Bg>("ink");
  const [eyebrow, setEyebrow] = useState("Ukens tilbud");
  const [headline, setHeadline] = useState("");
  const [cta, setCta] = useState("fosen-tools.no");
  const [manufacturer, setManufacturer] = useState("");
  const [manufacturerLogoUrl, setManufacturerLogoUrl] = useState("");
  const [rows, setRows] = useState<ProductRow[]>([emptyRow()]);
  // feature-mal-state
  const [redWord, setRedWord] = useState("");
  const [intro, setIntro] = useState("");
  const [benefits, setBenefits] = useState<string[]>(["", "", ""]);
  const [featureUrl, setFeatureUrl] = useState("");
  const [featureImporting, setFeatureImporting] = useState(false);
  // tilstedeværelse-mal-state
  const [malData, setMalData] = useState<Record<string, string>>({});
  const [malSteps, setMalSteps] = useState<{ title: string; text: string }[]>([
    { title: "", text: "" },
    { title: "", text: "" },
    { title: "", text: "" },
  ]);
  const [preview, setPreview] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // idémyldring-state
  const [ideUrl, setIdeUrl] = useState("");
  const [ideLoading, setIdeLoading] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  const [pickedImage, setPickedImage] = useState("");
  const [featureImage, setFeatureImage] = useState("");

  const layout = selected as ProduktLayout;
  const isProdukt = PRODUKT_KINDS.has(selected);
  const isFeature = selected === "feature";
  const isOffer = isProdukt && !isFeature;
  const isMal = isMalKind(selected);
  const malKind = isMal ? (selected as MalKind) : null;
  const maxProducts = selected === "single" ? 1 : 6;
  const visibleRows = rows.slice(0, maxProducts);

  /** Bytt mal — sett fornuftig default-bakgrunn for tilstedeværelse-maler. */
  function pickMal(s: Selected) {
    setSelected(s);
    setPreview(null);
    setError(null);
    if (isMalKind(s)) {
      setBackground(MAL_SCHEMA[s as MalKind].defaultBg);
      const imgKey = imageFieldKeyFor(s);
      setMalData(imgKey && pickedImage ? { [imgKey]: pickedImage } : {});
      if ((s as MalKind) === "prosess") {
        setMalSteps([
          { title: "", text: "" },
          { title: "", text: "" },
          { title: "", text: "" },
        ]);
      }
    }
  }

  function updateRow(i: number, patch: Partial<ProductRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function importFromUrl(i: number) {
    const url = rows[i].url.trim();
    if (!url) return;
    updateRow(i, { loading: true });
    setError(null);
    try {
      const res = await fetch(
        `/api/brosjyre/scrape-product?url=${encodeURIComponent(url)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scraping feilet");
      const p = data.product;
      updateRow(i, {
        name: p.name ?? "",
        priceNow: p.price_now ? String(p.price_now) : "",
        priceBefore: p.price_before ? String(p.price_before) : "",
        imageUrl: p.image_url ?? "",
        manufacturer: p.manufacturer ?? "",
        manufacturerLogoUrl: p.manufacturer_logo_url ?? "",
        loading: false,
      });
      if (selected === "manufacturer" && p.manufacturer && !manufacturer) {
        setManufacturer(p.manufacturer);
        if (p.manufacturer_logo_url) setManufacturerLogoUrl(p.manufacturer_logo_url);
      }
    } catch (e) {
      updateRow(i, { loading: false });
      setError(e instanceof Error ? e.message : "Scraping feilet");
    }
  }

  /** Import fra tjeneste-side (HDFI, CADLAB osv.) — auto-fyll headline + intro + fordeler. */
  async function importFeatureFromUrl() {
    const url = featureUrl.trim();
    if (!url) return;
    setFeatureImporting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/innleggsbygger/scrape-side?url=${encodeURIComponent(url)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scraping feilet");
      if (data.headline) setHeadline(data.headline);
      if (data.intro) setIntro(data.intro);
      if (Array.isArray(data.benefits) && data.benefits.length > 0) {
        setBenefits(data.benefits.slice(0, 5));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scraping feilet");
    } finally {
      setFeatureImporting(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    setPreview(null);
    try {
      let payload: Record<string, unknown>;

      if (isMal && malKind) {
        const schema = MAL_SCHEMA[malKind];
        const malInput: Record<string, unknown> = {};
        for (const f of schema.fields) {
          const v = (malData[f.key] ?? "").trim();
          if (v) malInput[f.key] = v;
          else if (!f.optional) {
            throw new Error(`Fyll inn «${f.label}»`);
          }
        }
        if (schema.hasSteps) {
          const steps = malSteps
            .map((s) => ({ title: s.title.trim(), text: s.text.trim() }))
            .filter((s) => s.title || s.text);
          if (steps.length < 2) throw new Error("Fyll inn minst 2 prosess-steg");
          malInput.steps = steps;
        }
        payload = {
          template: "mal",
          mal: malKind,
          aspect,
          background,
          malInput,
        };
      } else if (isFeature) {
        const cleanBenefits = benefits.map((b) => b.trim()).filter(Boolean);
        if (!headline.trim()) throw new Error("Fyll inn headline");
        if (cleanBenefits.length === 0)
          throw new Error("Fyll inn minst ett fordel-punkt");
        payload = {
          template: "feature",
          aspect,
          background,
          eyebrow: eyebrow.trim() || null,
          headline: headline.trim(),
          redWord: redWord.trim() || null,
          intro: intro.trim() || null,
          benefits: cleanBenefits,
          cta: cta.trim() || null,
          imageUrl: featureImage.trim() || null,
        };
      } else {
        const products = visibleRows
          .filter((r) => r.name.trim() && r.priceNow.trim())
          .map((r) => ({
            name: r.name.trim(),
            priceNow: Number(r.priceNow),
            priceBefore: r.priceBefore ? Number(r.priceBefore) : null,
            imageUrl: r.imageUrl.trim() || null,
            manufacturer: r.manufacturer.trim() || null,
            manufacturerLogoUrl: r.manufacturerLogoUrl.trim() || null,
          }));
        if (products.length === 0) {
          throw new Error("Fyll inn minst ett produkt med navn og pris");
        }
        payload = {
          template: "offer",
          layout,
          aspect,
          background,
          eyebrow: eyebrow.trim() || null,
          headline: headline.trim() || null,
          manufacturer: manufacturer.trim() || null,
          manufacturerLogoUrl: manufacturerLogoUrl.trim() || null,
          cta: cta.trim() || null,
          products,
        };
      }

      const res = await fetch("/api/innleggsbygger/render-mal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Render feilet");
      setPreview(`data:${data.mime};base64,${data.image_base64}`);
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
    a.download = `ft-post-${selected}-${aspect}-${Date.now()}.png`;
    a.click();
  }

  /** Idémyldring — scrape side + la Gemini foreslå ferdige post-ideer. */
  async function myldre() {
    const url = ideUrl.trim();
    if (!url) return;
    setIdeLoading(true);
    setError(null);
    setIdeas([]);
    try {
      const res = await fetch("/api/innleggsbygger/ideer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Idémyldring feilet");
      const got = Array.isArray(data.ideas) ? (data.ideas as Idea[]) : [];
      if (got.length === 0) throw new Error("Ingen ideer kom tilbake — prøv en annen URL");
      setIdeas(got);
      setSourceImages(
        Array.isArray(data.source?.images) ? (data.source.images as string[]) : []
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Idémyldring feilet");
    } finally {
      setIdeLoading(false);
    }
  }

  /** Velg et bilde fra side-galleriet — brukes i den aktive malens bildefelt. */
  function chooseSourceImage(u: string) {
    const next = pickedImage === u ? "" : u;
    setPickedImage(next);
    if (selected === "feature") {
      setFeatureImage(next);
      return;
    }
    const key = imageFieldKeyFor(selected);
    if (key) setMalData((p) => ({ ...p, [key]: next }));
  }

  /** Kort-etikett for en idé (mal-type). */
  function ideaTypeLabel(idea: Idea): string {
    if (idea.template === "feature") return "Tjeneste";
    return idea.mal && MAL_SCHEMA[idea.mal] ? MAL_SCHEMA[idea.mal].label : "Mal";
  }

  /** Fyll skjemaet fra en valgt idé. */
  function applyIdea(idea: Idea) {
    const bg: Bg = idea.background ?? "ink";
    setError(null);
    setPreview(null);
    const s = (v: unknown) => (typeof v === "string" ? v : "");

    if (idea.template === "feature") {
      setSelected("feature");
      setBackground(bg);
      setEyebrow(s(idea.eyebrow) || "Egen produksjon");
      setHeadline(s(idea.headline));
      setRedWord(s(idea.redWord));
      setIntro(s(idea.intro));
      setCta(s(idea.cta) || "fosen-tools.no");
      setFeatureImage(s(idea.imageUrl) || pickedImage);
      const b = Array.isArray(idea.benefits)
        ? idea.benefits.filter((x) => typeof x === "string")
        : [];
      setBenefits(b.length > 0 ? b : ["", "", ""]);
    } else if (idea.mal && MAL_SCHEMA[idea.mal]) {
      const mal = idea.mal;
      setSelected(mal);
      setBackground(bg);
      const data: Record<string, string> = {};
      for (const f of MAL_SCHEMA[mal].fields) {
        const v = idea[f.key];
        if (typeof v === "string" && v.trim()) data[f.key] = v;
      }
      // Fall tilbake til manuelt valgt side-bilde hvis idéen ikke ga et
      const imgKey = imageFieldKeyFor(mal);
      if (imgKey && !data[imgKey] && pickedImage) data[imgKey] = pickedImage;
      setMalData(data);
      if (MAL_SCHEMA[mal].hasSteps) {
        const steps = Array.isArray(idea.steps)
          ? idea.steps
              .map((st) => ({ title: s(st?.title), text: s(st?.text) }))
              .filter((st) => st.title || st.text)
          : [];
        setMalSteps(
          steps.length >= 2
            ? steps
            : [
                { title: "", text: "" },
                { title: "", text: "" },
                { title: "", text: "" },
              ]
        );
      }
    }
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const inputCls =
    "w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm";
  const labelCls = "text-xs text-gray-400 block mb-1";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Innleggsbygger</h1>
      <p className="text-sm text-gray-400 mb-6">
        Mal-baserte sosiale-medier-poster — pixel-perfekt, on-brand, ingen AI.
        Velg mal, fyll inn felter, generér.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        {/* ── Venstre: konfig ── */}
        <div className="space-y-5">
          {/* Idémyldring */}
          <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-4">
            <label className={labelCls}>
              💡 Idémyldring — lim inn en side, få ferdige post-forslag
            </label>
            <div className="flex gap-2">
              <input
                value={ideUrl}
                onChange={(e) => setIdeUrl(e.target.value)}
                placeholder="https://fosen-tools.no/hdfi"
                className={inputCls}
                onKeyDown={(e) => {
                  if (e.key === "Enter") myldre();
                }}
              />
              <button
                onClick={myldre}
                disabled={ideLoading || !ideUrl.trim()}
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
                    onClick={() => applyIdea(idea)}
                    className="text-left border border-gray-700 bg-gray-900 hover:border-red-500 rounded p-3 transition-colors"
                  >
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-red-400 bg-red-500/10 rounded px-1.5 py-0.5 mb-1">
                      {ideaTypeLabel(idea)}
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
                  🖼️ {sourceImages.length} bilder hentet fra siden — klikk for å
                  velge
                  {imageFieldKeyFor(selected) || selected === "feature"
                    ? " (legges rett i bildefeltet — bytter til foto-layout)"
                    : " — velg en mal med bildefelt for å bruke det"}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {sourceImages.map((u, i) => (
                    <button
                      key={i}
                      onClick={() => chooseSourceImage(u)}
                      title="Velg dette bildet"
                      className={`h-14 w-14 rounded overflow-hidden border-2 transition-colors ${
                        pickedImage === u
                          ? "border-red-500"
                          : "border-gray-700 hover:border-gray-400"
                      }`}
                    >
                      <img
                        src={u}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mal-type — Produkt */}
          <div>
            <label className={labelCls}>Produkt-maler</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRODUKT_LAYOUTS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => pickMal(l.value)}
                  className={`px-3 py-3 rounded border text-left ${
                    selected === l.value
                      ? "border-red-500 bg-red-500/10"
                      : "border-gray-700 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <div className="text-sm font-semibold text-white">{l.label}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{l.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mal-type — Tilstedeværelse */}
          <div>
            <label className={labelCls}>Tilstedeværelse-maler</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MAL_ORDER.map((k) => {
                const s = MAL_SCHEMA[k];
                return (
                  <button
                    key={k}
                    onClick={() => pickMal(k)}
                    className={`px-3 py-3 rounded border text-left ${
                      selected === k
                        ? "border-red-500 bg-red-500/10"
                        : "border-gray-700 bg-gray-900 hover:border-gray-600"
                    }`}
                  >
                    <div className="text-sm font-semibold text-white">{s.label}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{s.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspekt + bakgrunn */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Format</label>
              <select
                value={aspect}
                onChange={(e) => setAspect(e.target.value as Aspect)}
                className={inputCls}
              >
                {ASPECTS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Bakgrunn</label>
              <select
                value={background}
                onChange={(e) => setBackground(e.target.value as Bg)}
                className={inputCls}
              >
                <option value="ink">Mørk (FT-ink)</option>
                <option value="red">Rød (FT-rød)</option>
                {isMal && <option value="cream">Lys (krem)</option>}
              </select>
            </div>
          </div>

          {/* ── PRODUKT-MALER: felles tekst-konfig ── */}
          {isProdukt && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Eyebrow (liten overskrift)</label>
                  <input
                    value={eyebrow}
                    onChange={(e) => setEyebrow(e.target.value)}
                    placeholder="Ukens tilbud"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>CTA (nederst)</label>
                  <input
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="fosen-tools.no"
                    className={inputCls}
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>
                  Headline{" "}
                  {selected === "manufacturer" && "(auto «Mest kjøpt fra …» hvis tom)"}
                </label>
                <input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder={
                    selected === "manufacturer" ? "Mest kjøpt fra Wera" : "Spar 12 000"
                  }
                  className={inputCls}
                />
              </div>
            </>
          )}

          {/* Produsent-felt (kun manufacturer) */}
          {selected === "manufacturer" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Produsent-navn</label>
                <input
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="Wera"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Produsent-logo URL (valgfri)</label>
                <input
                  value={manufacturerLogoUrl}
                  onChange={(e) => setManufacturerLogoUrl(e.target.value)}
                  placeholder="https://…/logo.png"
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {/* ── FEATURE-MAL: tjeneste-felter ── */}
          {isFeature && (
            <>
              <div>
                <label className={labelCls}>
                  Hent fra tjeneste-side (HDFI, CADLAB osv.)
                </label>
                <div className="flex gap-2">
                  <input
                    value={featureUrl}
                    onChange={(e) => setFeatureUrl(e.target.value)}
                    placeholder="https://fosen-tools.no/hdfi"
                    className={inputCls}
                  />
                  <button
                    onClick={importFeatureFromUrl}
                    disabled={featureImporting || !featureUrl.trim()}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded text-white text-sm whitespace-nowrap"
                  >
                    {featureImporting ? "Henter…" : "Hent"}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Rødt nøkkelord (ett ord fra headline)</label>
                <input
                  value={redWord}
                  onChange={(e) => setRedWord(e.target.value)}
                  placeholder="HDFI"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Intro (valgfri setning under headline)</label>
                <textarea
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  rows={2}
                  placeholder="Skreddersydde skuminnlegg for visuell verktøykontroll."
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Fordeler ({benefits.length}/5)</label>
                <div className="space-y-2">
                  {benefits.map((b, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={b}
                        onChange={(e) =>
                          setBenefits((p) =>
                            p.map((x, idx) => (idx === i ? e.target.value : x))
                          )
                        }
                        placeholder={`Fordel ${i + 1}`}
                        className={inputCls}
                      />
                      {benefits.length > 1 && (
                        <button
                          onClick={() =>
                            setBenefits((p) => p.filter((_, idx) => idx !== i))
                          }
                          className="px-3 text-red-400 hover:text-red-300 text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {benefits.length < 5 && (
                  <button
                    onClick={() => setBenefits((p) => [...p, ""])}
                    className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                  >
                    + Legg til fordel
                  </button>
                )}
              </div>
              <div>
                <label className={labelCls}>
                  Bilde <span className="text-gray-600">(valgfri — bytter til foto-layout)</span>
                </label>
                <ImagePicker
                  value={featureImage}
                  onPick={(v) => {
                    setPickedImage(v);
                    setFeatureImage(v);
                  }}
                  sourceImages={sourceImages}
                  placeholder="Foto bytter til foto-layout"
                />
              </div>
            </>
          )}

          {/* ── PRODUKT-TILBUD: produkt-rader ── */}
          {isOffer && (
            <div>
              <label className={labelCls}>
                Produkter ({visibleRows.length}/{maxProducts})
              </label>
              <div className="space-y-3">
                {visibleRows.map((row, i) => (
                  <div
                    key={i}
                    className="border border-gray-800 rounded p-3 bg-gray-900/50 space-y-2"
                  >
                    <div className="flex gap-2">
                      <input
                        value={row.url}
                        onChange={(e) => updateRow(i, { url: e.target.value })}
                        placeholder="Lim inn fosen-tools.no produkt-URL…"
                        className={inputCls}
                      />
                      <button
                        onClick={() => importFromUrl(i)}
                        disabled={row.loading || !row.url.trim()}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded text-white text-sm whitespace-nowrap"
                      >
                        {row.loading ? "Henter…" : "Hent"}
                      </button>
                    </div>
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(i, { name: e.target.value })}
                      placeholder="Produktnavn"
                      className={inputCls}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        value={row.priceNow}
                        onChange={(e) => updateRow(i, { priceNow: e.target.value })}
                        placeholder="Nå-pris"
                        inputMode="numeric"
                        className={inputCls}
                      />
                      <input
                        value={row.priceBefore}
                        onChange={(e) => updateRow(i, { priceBefore: e.target.value })}
                        placeholder="Før-pris"
                        inputMode="numeric"
                        className={inputCls}
                      />
                      <input
                        value={row.manufacturer}
                        onChange={(e) => updateRow(i, { manufacturer: e.target.value })}
                        placeholder="Produsent"
                        className={inputCls}
                      />
                    </div>
                    <input
                      value={row.imageUrl}
                      onChange={(e) => updateRow(i, { imageUrl: e.target.value })}
                      placeholder="Bilde-URL (valgfri — plassholder hvis tom)"
                      className={inputCls}
                    />
                    {visibleRows.length > 1 && (
                      <button
                        onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Fjern produkt
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {selected !== "single" && visibleRows.length < maxProducts && (
                <button
                  onClick={() => setRows((p) => [...p, emptyRow()])}
                  className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  + Legg til produkt
                </button>
              )}
            </div>
          )}

          {/* ── TILSTEDEVÆRELSE-MALER: skjema-drevne felter ── */}
          {isMal && malKind && (
            <div className="space-y-3">
              {MAL_SCHEMA[malKind].fields.map((f) => {
                const val = malData[f.key] ?? "";
                const isImage = IMAGE_FIELD_KEYS.has(f.key);
                return (
                  <div key={f.key}>
                    <label className={labelCls}>
                      {f.label}
                      {f.optional && (
                        <span className="text-gray-600"> (valgfri)</span>
                      )}
                    </label>

                    {isImage ? (
                      <ImagePicker
                        value={val}
                        onPick={(v) => {
                          setPickedImage(v);
                          setMalData((p) => ({ ...p, [f.key]: v }));
                        }}
                        sourceImages={sourceImages}
                        placeholder={f.placeholder}
                      />
                    ) : f.type === "textarea" ? (
                      <textarea
                        value={val}
                        onChange={(e) =>
                          setMalData((p) => ({ ...p, [f.key]: e.target.value }))
                        }
                        rows={2}
                        placeholder={f.placeholder}
                        className={inputCls}
                      />
                    ) : (
                      <input
                        value={val}
                        onChange={(e) =>
                          setMalData((p) => ({ ...p, [f.key]: e.target.value }))
                        }
                        placeholder={f.placeholder}
                        className={inputCls}
                      />
                    )}
                  </div>
                );
              })}

              {/* Prosess-steg-editor */}
              {MAL_SCHEMA[malKind].hasSteps && (
                <div>
                  <label className={labelCls}>Steg ({malSteps.length}/5)</label>
                  <div className="space-y-2">
                    {malSteps.map((s, i) => (
                      <div
                        key={i}
                        className="border border-gray-800 rounded p-2 bg-gray-900/50 space-y-2"
                      >
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-gray-500 w-5 text-center">
                            {i + 1}
                          </span>
                          <input
                            value={s.title}
                            onChange={(e) =>
                              setMalSteps((p) =>
                                p.map((x, idx) =>
                                  idx === i ? { ...x, title: e.target.value } : x
                                )
                              )
                            }
                            placeholder="Steg-tittel"
                            className={inputCls}
                          />
                          {malSteps.length > 2 && (
                            <button
                              onClick={() =>
                                setMalSteps((p) => p.filter((_, idx) => idx !== i))
                              }
                              className="px-2 text-red-400 hover:text-red-300 text-sm"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <input
                          value={s.text}
                          onChange={(e) =>
                            setMalSteps((p) =>
                              p.map((x, idx) =>
                                idx === i ? { ...x, text: e.target.value } : x
                              )
                            )
                          }
                          placeholder="Beskrivelse"
                          className={inputCls}
                        />
                      </div>
                    ))}
                  </div>
                  {malSteps.length < 5 && (
                    <button
                      onClick={() =>
                        setMalSteps((p) => [...p, { title: "", text: "" }])
                      }
                      className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                    >
                      + Legg til steg
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Generer */}
          <button
            onClick={generate}
            disabled={generating}
            className="w-full py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded text-white font-semibold"
          >
            {generating ? "Genererer…" : "✨ Generér post"}
          </button>
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* ── Høyre: preview ── */}
        <div className="lg:sticky lg:top-6 self-start">
          <label className={labelCls}>Forhåndsvisning</label>
          <div className="border border-gray-800 rounded bg-gray-900/50 p-3 flex items-center justify-center min-h-[300px]">
            {preview ? (
              <img src={preview} alt="Post-preview" className="max-w-full rounded" />
            ) : (
              <span className="text-sm text-gray-500">
                Generér en post for å se forhåndsvisning
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
    </div>
  );
}
