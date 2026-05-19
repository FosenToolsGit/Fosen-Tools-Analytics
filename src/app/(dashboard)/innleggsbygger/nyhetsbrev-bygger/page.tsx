"use client";

import { useEffect, useState } from "react";
import {
  Mail,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  ImageIcon,
  Lightbulb,
  ChevronDown,
  Plus,
  TrendingUp,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface SuggestedProduct {
  url: string;
  name: string;
  ga4_views: number;
  mailchimp_clicks: number;
  score: number;
  last_used_at: string | null;
}

interface NewsletterProduct {
  url: string;
  name: string;
  brandSku: string;
  priceText: string;
  imageUrl: string;
}

interface GeneratedContent {
  themeSlug: string;
  topBadge: string;
  subjectLine: string;
  previewText: string;
  headingMain: string;
  headingSub: string;
  ingress: string;
  midtTitle: string;
  midtBody: string;
  midtCtaText: string;
  midtCtaUrl: string;
}

interface SuggestedFooterImage {
  url: string;
  post_url: string;
  posted_at: string;
}

interface GenerateResponse {
  content: GeneratedContent;
  products: NewsletterProduct[];
  suggestedFooterImage: SuggestedFooterImage | null;
}

const THEME_IDEAS = [
  { themeInput: "momentnøkkel", label: "Momentnøkler", reason: "Brukes til hjulskifte og motorvedlikehold" },
  { themeInput: "hjulskift", label: "Hjulskift / vårbil", reason: "Mai/juni er hjulskift-sesong" },
  { themeInput: "milwaukee", label: "Milwaukee-spotlight", reason: "Største merke i katalogen" },
  { themeInput: "wera", label: "Wera-spotlight", reason: "Tysk premium-skrueverktøy" },
  { themeInput: "skreddersøm", label: "Skreddersøm / HDFI", reason: "FT-spesialitet, Forsvaret-standard" },
];

export default function NyhetsbrevByggerPage() {
  const [themeInput, setThemeInput] = useState("");
  const [focus, setFocus] = useState<"rabatt" | "kvalitet" | "nyhet" | "sesong" | "annet">("kvalitet");
  const [discountPct, setDiscountPct] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [productCount, setProductCount] = useState(3);
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [manualProductUrls, setManualProductUrls] = useState("");

  const [generating, setGenerating] = useState(false);
  const [variant, setVariant] = useState(0);
  const [preview, setPreview] = useState<GenerateResponse | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [midtImageInput, setMidtImageInput] = useState("");
  const [midtImageUrl, setMidtImageUrl] = useState("");
  const [midtImageLoading, setMidtImageLoading] = useState(false);

  const [footerImageInput, setFooterImageInput] = useState("");
  const [footerImageUrl, setFooterImageUrl] = useState("");
  const [footerImageLoading, setFooterImageLoading] = useState(false);

  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");

  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ campaign_id: string; edit_url: string } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [manualAddUrl, setManualAddUrl] = useState("");

  const [suggestData, setSuggestData] = useState<{
    products: SuggestedProduct[];
    theme?: { theme: string; category_slug?: string; category_url?: string } | null;
  } | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setSuggestLoading(true);
      try {
        const themeParam = themeInput.trim()
          ? `&theme=${encodeURIComponent(themeInput.trim())}`
          : "";
        const res = await fetch(
          `/api/mailchimp/newsletter/suggest-products?count=20&days=60${themeParam}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSuggestData(data);
      } catch {} finally {
        if (!cancelled) setSuggestLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [themeInput]);

  function addSuggestionToManual(url: string) {
    const existing = manualProductUrls.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (existing.includes(url)) return;
    setManualProductUrls(existing.length > 0 ? `${manualProductUrls.trimEnd()}\n${url}` : url);
  }

  function removeProduct(index: number) {
    if (!preview) return;
    setPreview({ ...preview, products: preview.products.filter((_, i) => i !== index) });
  }

  async function addProductFromSuggestion(url: string) {
    if (!preview) return;
    if (preview.products.length >= 5) {
      alert("Maks 5 produkter — fjern et først.");
      return;
    }
    if (preview.products.some((p) => p.url === url)) return;
    setAddingProduct(true);
    try {
      const res = await fetch(`/api/brosjyre/scrape-product?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? `scrape ${res.status}`);
      }
      const responseData = await res.json();
      const scraped = responseData.product ?? responseData;
      const fmt = (n: number) =>
        new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 })
          .format(n)
          .replace(/,/g, " ");
      const priceText = scraped.price_now
        ? `${fmt(scraped.price_now)},- eks. mva.${
            scraped.price_before && scraped.price_before > scraped.price_now
              ? ` (før ${fmt(scraped.price_before)},-)`
              : ""
          }`
        : "Pris ikke tilgjengelig";
      const newProduct: NewsletterProduct = {
        url,
        name: (scraped.name ?? "PRODUKT").toUpperCase(),
        brandSku: scraped.manufacturer
          ? scraped.manufacturer.charAt(0).toUpperCase() + scraped.manufacturer.slice(1)
          : "",
        priceText,
        imageUrl: scraped.image_url ?? "",
      };
      setPreview({ ...preview, products: [...preview.products, newProduct] });
    } catch (err) {
      alert(`Kunne ikke hente produkt: ${err instanceof Error ? err.message : "feil"}`);
    } finally {
      setAddingProduct(false);
    }
  }

  async function handleGenerate(theme?: string, newVariant?: number) {
    setGenerating(true);
    setGenerateError(null);
    try {
      const useTheme = theme ?? themeInput;
      const useVariant = newVariant ?? variant;
      const manualUrls = manualProductUrls
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/mailchimp/newsletter/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeInput: useTheme,
          variant: useVariant,
          productCount,
          onlyInStock,
          focus,
          discountPct: discountPct.trim() ? parseInt(discountPct, 10) : undefined,
          extraContext: extraContext.trim() || undefined,
          manualProductUrls: manualUrls.length > 0 ? manualUrls : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ukjent feil");
      setPreview(data);
      setThemeInput(useTheme);
      setVariant(useVariant);
      if (data.suggestedFooterImage && !footerImageUrl) {
        setFooterImageUrl(data.suggestedFooterImage.url);
        setFooterImageInput(data.suggestedFooterImage.post_url);
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setGenerating(false);
    }
  }

  function handleRegenerate() {
    handleGenerate(themeInput, variant + 1);
  }

  function pickTheme(t: string) {
    setThemeInput(t);
    handleGenerate(t, 0);
  }

  async function uploadImage(postUrl: string, target: "midt" | "footer") {
    const setLoading = target === "midt" ? setMidtImageLoading : setFooterImageLoading;
    const setUrl = target === "midt" ? setMidtImageUrl : setFooterImageUrl;
    setLoading(true);
    try {
      const res = await fetch("/api/mailchimp/newsletter/scrape-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: postUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Feil");
      setUrl(data.mailchimp_url);
    } catch (err) {
      alert(`Bilde-feil: ${err instanceof Error ? err.message : "ukjent"}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!preview) return;
    setCreating(true);
    setCreateError(null);
    try {
      const body = {
        ...preview.content,
        products: preview.products,
        midtImageUrl,
        footerImageUrl,
        socialInstagramPostUrl: socialInstagram,
        socialLinkedinPostUrl: socialLinkedin,
      };

      const res = await fetch("/api/mailchimp/newsletter/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Feil");
      setCreateResult({ campaign_id: data.campaign_id, edit_url: data.edit_url });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Ukjent feil");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6 p-6 pb-12 max-w-5xl">
      <header className="flex items-start gap-3">
        <Mail className="h-7 w-7 text-orange-400 mt-0.5" />
        <div>
          <h1 className="text-2xl font-semibold text-white">Nyhetsbrev-bygger</h1>
          <p className="text-sm text-gray-400 mt-1">
            Skriv inn ett tema (eller la stå blank for ideer). Alt annet — emnelinje, ingress, produkter, midtseksjon — genereres automatisk. Du godkjenner før det publiseres som draft i Mailchimp.
          </p>
        </div>
      </header>

      {createResult && (
        <Card className="border-green-700 bg-green-950/40">
          <div className="flex items-start gap-3">
            <Check className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white">Draft opprettet i Mailchimp!</h2>
              <p className="text-sm text-gray-300 mt-1">
                Campaign ID: <code className="text-orange-300">{createResult.campaign_id}</code>
              </p>
              <div className="flex gap-2 mt-3">
                <a
                  href={createResult.edit_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm font-medium"
                >
                  Åpne i Mailchimp <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => {
                    setCreateResult(null);
                    setCreateError(null);
                    setPreview(null);
                    setThemeInput("");
                    setManualProductUrls("");
                    setMidtImageUrl("");
                    setFooterImageUrl("");
                    setSocialInstagram("");
                    setSocialLinkedin("");
                  }}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm"
                >
                  Lag ny
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* STEG 1 */}
      {!preview && !createResult && (
        <Card>
          <h2 className="text-lg font-semibold text-white mb-2">Steg 1 — velg tema</h2>
          <p className="text-sm text-gray-400 mb-4">
            Skriv inn det helhetlige temaet for nyhetsbrevet. Vi tilpasser emnelinje, ingress, produkt-utvalg og midtseksjon basert på temaet.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300">Tema</label>
              <input
                type="text"
                value={themeInput}
                onChange={(e) => setThemeInput(e.target.value)}
                placeholder='F.eks. "momentnøkkel", "milwaukee", "wera" — eller la stå blank for ideer'
                className="mt-1 w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleGenerate();
                }}
              />
            </div>

            {/* === Fokus-velger === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Fokus for nyhetsbrevet
                </label>
                <select
                  value={focus}
                  onChange={(e) => setFocus(e.target.value as typeof focus)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm"
                >
                  <option value="kvalitet">Kvalitet / gode produkter</option>
                  <option value="rabatt">Rabatt / kampanje</option>
                  <option value="nyhet">Nyheter i sortimentet</option>
                  <option value="sesong">Sesong / aktualitet</option>
                  <option value="annet">Annet (bruk fri kontekst)</option>
                </select>
              </div>
              {focus === "rabatt" && (
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Rabatt-prosent (valgfri)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="80"
                      value={discountPct}
                      onChange={(e) => setDiscountPct(e.target.value)}
                      placeholder="20"
                      className="w-20 px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm"
                    />
                    <span className="text-xs text-gray-500">% — brukes i emnelinje/ingress</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Ekstra kontekst (valgfri)
              </label>
              <p className="text-xs text-gray-500 mb-1">
                Detaljer som påvirker ingress/midtseksjon. F.eks. «Vårbil-kampanje», «Snickers ny vårkolleksjon», «Forsvars-sertifisert utvalg».
              </p>
              <textarea
                value={extraContext}
                onChange={(e) => setExtraContext(e.target.value)}
                rows={2}
                placeholder="F.eks. Vårbil-kampanje med fokus på hjulskifte..."
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm"
              />
            </div>

            {!themeInput.trim() && (
              <div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                  <Lightbulb className="h-4 w-4" /> Eller plukk fra forslagene:
                </div>
                <div className="flex flex-wrap gap-2">
                  {THEME_IDEAS.map((idea) => (
                    <button
                      key={idea.themeInput}
                      onClick={() => pickTheme(idea.themeInput)}
                      className="text-left p-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded text-xs transition-colors"
                    >
                      <div className="font-medium text-gray-200">{idea.label}</div>
                      <div className="text-gray-500 mt-0.5">{idea.reason}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <details className="text-xs" suppressHydrationWarning>
              <summary className="cursor-pointer text-gray-400 hover:text-white">
                <ChevronDown className="inline h-3 w-3 mr-1" />
                Avanserte opsjoner
              </summary>
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-xs text-gray-300">Antall produkter:</label>
                  <select
                    value={productCount}
                    onChange={(e) => setProductCount(parseInt(e.target.value, 10))}
                    className="px-2 py-1 bg-gray-900 border border-gray-700 text-white rounded text-xs"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer ml-4">
                    <span>Kun lagerførte produkter:</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={onlyInStock}
                      onClick={() => setOnlyInStock(!onlyInStock)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        onlyInStock ? "bg-orange-500" : "bg-gray-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          onlyInStock ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                    <span className={onlyInStock ? "text-green-400" : "text-gray-500"}>
                      {onlyInStock ? "På" : "Av"}
                    </span>
                  </label>
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Spesifikke produkter (URLer, en per linje — overstyrer auto-utvelg)
                  </label>
                  <textarea
                    value={manualProductUrls}
                    onChange={(e) => setManualProductUrls(e.target.value)}
                    rows={4}
                    placeholder="https://fosen-tools.no/milwaukee/125584&#10;https://fosen-tools.no/milwaukee/125591"
                    className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 text-white rounded text-xs font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-300 mb-2 flex-wrap">
                    <TrendingUp className="h-3.5 w-3.5 text-orange-400" />
                    <span className="font-medium">Anbefalte produkter</span>
                    {suggestData?.theme?.category_slug ? (
                      <span className="text-orange-400 bg-orange-950/40 px-2 py-0.5 rounded">
                        Filtrert på /produkter/{suggestData.theme.category_slug}
                      </span>
                    ) : suggestData?.theme?.theme ? (
                      <span className="text-orange-400 bg-orange-950/40 px-2 py-0.5 rounded">
                        Filtrert på «{suggestData.theme.theme}»
                      </span>
                    ) : (
                      <span className="text-gray-500">(topp-trafikk siste 60d)</span>
                    )}
                    {suggestLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-500" />}
                  </div>
                  {!suggestData ? (
                    <p className="text-xs text-gray-500">Laster forslag...</p>
                  ) : suggestData.products.length === 0 ? (
                    <p className="text-xs text-gray-500">Ingen forslag funnet for dette temaet.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                      {suggestData.products.map((s) => {
                        const path = (() => {
                          try {
                            return new URL(s.url).pathname;
                          } catch {
                            return s.url;
                          }
                        })();
                        const isAdded = manualProductUrls.includes(s.url);
                        return (
                          <button
                            key={s.url}
                            onClick={() => addSuggestionToManual(s.url)}
                            disabled={isAdded}
                            className={`text-left p-2 rounded text-xs transition-colors border ${
                              isAdded
                                ? "bg-green-950/40 border-green-700 cursor-default"
                                : "bg-gray-900 hover:bg-gray-800 border-gray-800"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-200 truncate">{path}</div>
                                <div className="flex justify-between text-gray-500 mt-0.5">
                                  <span>
                                    {s.ga4_views}v · {s.mailchimp_clicks}k
                                  </span>
                                  <span className="text-orange-400">{s.score}</span>
                                </div>
                                {s.last_used_at ? (
                                  <div className="text-gray-600 mt-0.5">
                                    Sist: {new Date(s.last_used_at).toLocaleDateString("nb-NO")}
                                  </div>
                                ) : (
                                  <div className="text-green-500/80 mt-0.5">Aldri brukt</div>
                                )}
                              </div>
                              {isAdded ? (
                                <Check className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                              ) : (
                                <Plus className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </details>

            <button
              onClick={() => handleGenerate()}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded font-medium"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Genererer..." : "Generer innhold"}
            </button>

            {generateError && (
              <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-800 rounded text-sm text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {generateError}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* STEG 2 — Preview */}
      {preview && !createResult && (
        <div className="space-y-6">
          <Card>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Steg 2 — forhåndsvis</h2>
                <p className="text-sm text-gray-400 mt-1">
                  Generert basert på tema: <span className="text-orange-400">{themeInput || "general"}</span> (variant {variant})
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRegenerate}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm"
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Regenerer
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm"
                >
                  Endre tema
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <Field label="Tema-slug (UTM)" value={preview.content.themeSlug} />
              <Field label="Topp-badge" value={preview.content.topBadge} />
              <Field label="Emnelinje" value={preview.content.subjectLine} highlight />
              <Field label="Preheader" value={preview.content.previewText} />
              <Field label="Hovedtittel" value={preview.content.headingMain} />
              <Field label="Undertittel" value={preview.content.headingSub} />
            </div>
            <div className="mt-3">
              <Field label="Ingress" value={preview.content.ingress} multiline />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white">
                Produkter ({preview.products.length}/5)
              </h3>
              <p className="text-xs text-gray-500">Klikk × for å fjerne · legg til fra anbefalt under</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {preview.products.map((p, i) => (
                <div key={i} className="relative border border-gray-800 rounded p-3 bg-gray-900/50">
                  <button
                    onClick={() => removeProduct(i)}
                    title="Fjern produkt"
                    className="absolute top-1 right-1 p-1 bg-gray-800 hover:bg-red-700 text-gray-400 hover:text-white rounded transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  {p.imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={p.imageUrl} alt={p.name} className="w-full h-32 object-contain mb-2" />
                  )}
                  <div className="text-xs font-medium text-white pr-5">{p.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{p.brandSku}</div>
                  <div className="text-xs text-orange-400 mt-1">{p.priceText}</div>
                </div>
              ))}
            </div>

            {preview.products.length < 5 && (
              <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                {/* === URL-input === */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Plus className="h-3.5 w-3.5 text-orange-400" />
                    <span className="text-xs font-medium text-gray-300">
                      Legg til via URL
                    </span>
                    <span className="text-xs text-gray-500">
                      (paste fosen-tools.no-produkt-lenke)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualAddUrl}
                      onChange={(e) => setManualAddUrl(e.target.value)}
                      placeholder="https://fosen-tools.no/milwaukee/125584/..."
                      className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-xs font-mono"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && manualAddUrl.trim() && !addingProduct) {
                          addProductFromSuggestion(manualAddUrl.trim());
                          setManualAddUrl("");
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (manualAddUrl.trim()) {
                          addProductFromSuggestion(manualAddUrl.trim());
                          setManualAddUrl("");
                        }
                      }}
                      disabled={addingProduct || !manualAddUrl.trim()}
                      className="flex items-center gap-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded text-xs"
                    >
                      {addingProduct ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      Legg til
                    </button>
                  </div>
                </div>

                {/* === Eller fra anbefalt-listen === */}
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-xs font-medium text-gray-300">Eller plukk fra anbefalt liste</span>
                </div>
                {!suggestData ? (
                  <p className="text-xs text-gray-500">Laster forslag...</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                    {suggestData.products
                      .filter((s) => !preview.products.some((p) => p.url === s.url))
                      .slice(0, 12)
                      .map((s) => {
                        const path = (() => {
                          try {
                            return new URL(s.url).pathname;
                          } catch {
                            return s.url;
                          }
                        })();
                        return (
                          <button
                            key={s.url}
                            onClick={() => addProductFromSuggestion(s.url)}
                            disabled={addingProduct}
                            className="text-left p-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded text-xs transition-colors disabled:opacity-50"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-200 truncate">{path}</div>
                                <div className="flex justify-between text-gray-500 mt-0.5">
                                  <span>{s.ga4_views}v · {s.mailchimp_clicks}k</span>
                                  <span className="text-orange-400">{s.score}</span>
                                </div>
                              </div>
                              <Plus className="h-3 w-3 text-gray-500 flex-shrink-0" />
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
                {addingProduct && (
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Henter produktdata...
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-white mb-3">Midtseksjon</h3>
            <div className="space-y-2 text-sm">
              <Field label="Tittel" value={preview.content.midtTitle} />
              <Field label="Tekst" value={preview.content.midtBody} multiline />
              <div className="grid grid-cols-2 gap-3">
                <Field label="CTA-tekst" value={preview.content.midtCtaText} />
                <Field label="CTA-URL" value={preview.content.midtCtaUrl} />
              </div>
            </div>
          </Card>

          <Card className="border-orange-700/40">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-white">
                Midtseksjon-bilde{" "}
                <span className="text-xs font-normal text-orange-400 ml-1">Påkrevd</span>
              </h3>
              {midtImageUrl && (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Lagt til
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Bildet som vises i midten av nyhetsbrevet. Lim inn enten en{" "}
              <span className="text-gray-300">IG/FB/LinkedIn-post-lenke</span> eller en{" "}
              <span className="text-gray-300">direkte bilde-URL</span>{" "}
              (slutter på .jpg/.png/.webp/.gif/.avif).
            </p>
            <ImageInput
              label="Bilde-URL eller IG/FB/LinkedIn-lenke"
              postUrl={midtImageInput}
              setPostUrl={setMidtImageInput}
              mcUrl={midtImageUrl}
              loading={midtImageLoading}
              onUpload={() => uploadImage(midtImageInput, "midt")}
            />
          </Card>

          <Card>
            <h3 className="text-base font-semibold text-white mb-3">Fredagsbilde & sosiale lenker</h3>
            <div className="space-y-3">
              <ImageInput
                label={
                  preview.suggestedFooterImage
                    ? `Fredagsbilde (forslag: post fra ${new Date(preview.suggestedFooterImage.posted_at).toLocaleDateString("nb-NO")})`
                    : "Fredagsbilde — bilde-URL eller post-lenke"
                }
                postUrl={footerImageInput}
                setPostUrl={setFooterImageInput}
                mcUrl={footerImageUrl}
                loading={footerImageLoading}
                onUpload={() => uploadImage(footerImageInput, "footer")}
              />
              <div className="grid grid-cols-2 gap-3">
                <SimpleInput
                  label="Instagram-post (lenke)"
                  value={socialInstagram}
                  onChange={setSocialInstagram}
                  placeholder="https://www.instagram.com/p/..."
                />
                <SimpleInput
                  label="LinkedIn-post (lenke)"
                  value={socialLinkedin}
                  onChange={setSocialLinkedin}
                  placeholder="https://www.linkedin.com/feed/update/..."
                />
              </div>
              <p className="text-xs text-gray-500">Facebook er alltid /fosentools-siden (auto-satt).</p>
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPreview(null)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm"
            >
              Avbryt
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-6 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded font-medium"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {creating ? "Oppretter draft..." : "Godkjenn & opprett draft"}
            </button>
          </div>

          {createError && (
            <Card className="border-red-700 bg-red-950/40">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-white">Kunne ikke opprette</p>
                  <p className="text-xs text-red-300 mt-1">{createError}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  highlight = false,
  multiline = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div
        className={`px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm ${
          highlight ? "text-orange-300 font-medium" : "text-gray-200"
        } ${multiline ? "whitespace-pre-wrap" : "truncate"}`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function SimpleInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-300">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm"
      />
    </label>
  );
}

function ImageInput({
  label,
  postUrl,
  setPostUrl,
  mcUrl,
  loading,
  onUpload,
}: {
  label: string;
  postUrl: string;
  setPostUrl: (v: string) => void;
  mcUrl: string;
  loading: boolean;
  onUpload: () => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-xs text-gray-300">{label}</span>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm"
          />
          <button
            onClick={onUpload}
            disabled={loading || !postUrl.trim()}
            className="flex items-center gap-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded text-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            Hent
          </button>
        </div>
      </label>
      {mcUrl && (
        <div className="flex items-start gap-2 p-2 bg-gray-900 border border-gray-800 rounded">
          <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-xs">
            <p className="text-green-400">Lastet opp til Mailchimp</p>
            <p className="text-gray-500 truncate">{mcUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
}
