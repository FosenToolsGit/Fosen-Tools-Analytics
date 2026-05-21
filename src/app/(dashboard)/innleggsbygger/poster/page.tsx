"use client";

import { useState } from "react";

/**
 * Innleggsbygger — mal-basert sosiale-medier-post-generator.
 *
 * Deterministisk HTML→PNG-render (ingen AI). Velg mal, fyll inn produkter
 * (manuelt eller via URL-import), generér pixel-perfekt post for FB/IG/LinkedIn.
 */

type Layout = "single" | "grid" | "manufacturer" | "feature";
type Aspect = "fb" | "ig" | "li";

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

const LAYOUTS: { value: Layout; label: string; desc: string }[] = [
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

export default function PosterBuilderPage() {
  const [layout, setLayout] = useState<Layout>("single");
  const [aspect, setAspect] = useState<Aspect>("fb");
  const [background, setBackground] = useState<"ink" | "red">("ink");
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
  const [preview, setPreview] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFeature = layout === "feature";
  const maxProducts = layout === "single" ? 1 : 6;
  const visibleRows = rows.slice(0, maxProducts);

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
      // Auto-fyll produsent-felt for manufacturer-layout
      if (layout === "manufacturer" && p.manufacturer && !manufacturer) {
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
      if (isFeature) {
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
    a.download = `ft-post-${layout}-${aspect}-${Date.now()}.png`;
    a.click();
  }

  const inputCls =
    "w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm";
  const labelCls = "text-xs text-gray-400 block mb-1";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-1">Innleggsbygger</h1>
      <p className="text-sm text-gray-400 mb-6">
        Mal-baserte sosiale-medier-poster — pixel-perfekt, on-brand, ingen AI.
        Velg mal, fyll inn produkter, generér.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        {/* ── Venstre: konfig ── */}
        <div className="space-y-5">
          {/* Mal-type */}
          <div>
            <label className={labelCls}>Mal-type</label>
            <div className="grid grid-cols-3 gap-2">
              {LAYOUTS.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLayout(l.value)}
                  className={`px-3 py-3 rounded border text-left ${
                    layout === l.value
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
                onChange={(e) => setBackground(e.target.value as "ink" | "red")}
                className={inputCls}
              >
                <option value="ink">Mørk (FT-ink)</option>
                <option value="red">Rød (FT-rød)</option>
              </select>
            </div>
          </div>

          {/* Tekst-konfig */}
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
              Headline {layout === "manufacturer" && "(auto «Mest kjøpt fra …» hvis tom)"}
            </label>
            <input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder={layout === "manufacturer" ? "Mest kjøpt fra Wera" : "Spar 12 000"}
              className={inputCls}
            />
          </div>

          {/* Produsent-felt (kun manufacturer) */}
          {layout === "manufacturer" && (
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
                <label className={labelCls}>Hent fra tjeneste-side (HDFI, CADLAB osv.)</label>
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
            </>
          )}

          {/* ── PRODUKT-TILBUD: produkt-rader ── */}
          {!isFeature && (
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
                  {/* URL-import */}
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
                  {/* Manuelle felter */}
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
            {layout !== "single" && visibleRows.length < maxProducts && (
              <button
                onClick={() => setRows((p) => [...p, emptyRow()])}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300"
              >
                + Legg til produkt
              </button>
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
              /* eslint-disable-next-line @next/next/no-img-element */
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
