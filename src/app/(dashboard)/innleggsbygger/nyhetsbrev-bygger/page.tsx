"use client";

import { useEffect, useState, useCallback } from "react";
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
  ChevronUp,
  Plus,
  TrendingUp,
  X,
  GripVertical,
  Eye,
  Edit3,
  ArrowUp,
  ArrowDown,
  Pencil,
} from "lucide-react";
import { Card } from "@/components/ui/card";

/* ───────── types ───────── */

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

/* ═══════════════════════════════════════════ */
/*  Main Page Component                        */
/* ═══════════════════════════════════════════ */

export default function NyhetsbrevByggerPage() {
  /* ── Step 1 state ── */
  const [themeInput, setThemeInput] = useState("");
  const [focus, setFocus] = useState<"rabatt" | "kvalitet" | "nyhet" | "sesong" | "annet">("kvalitet");
  const [discountPct, setDiscountPct] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [productCount, setProductCount] = useState(3);
  const [onlyInStock, setOnlyInStock] = useState(true);
  const [manualProductUrls, setManualProductUrls] = useState("");

  /* ── Generate state ── */
  const [generating, setGenerating] = useState(false);
  const [variant, setVariant] = useState(0);
  const [preview, setPreview] = useState<GenerateResponse | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  /* ── Editable content (synced from preview.content but user-editable) ── */
  const [editContent, setEditContent] = useState<GeneratedContent | null>(null);
  const [editProducts, setEditProducts] = useState<NewsletterProduct[]>([]);

  /* ── Images & social ── */
  const [midtImageInput, setMidtImageInput] = useState("");
  const [midtImageUrl, setMidtImageUrl] = useState("");
  const [midtImageLoading, setMidtImageLoading] = useState(false);
  const [footerImageInput, setFooterImageInput] = useState("");
  const [footerImageUrl, setFooterImageUrl] = useState("");
  const [footerImageLoading, setFooterImageLoading] = useState(false);
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");

  /* ── Create state ── */
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ campaign_id: string; edit_url: string } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  /* ── Product add ── */
  const [addingProduct, setAddingProduct] = useState(false);
  const [manualAddUrl, setManualAddUrl] = useState("");
  const [editingProductIdx, setEditingProductIdx] = useState<number | null>(null);

  /* ── Suggestions ── */
  const [suggestData, setSuggestData] = useState<{
    products: SuggestedProduct[];
    theme?: { theme: string; category_slug?: string; category_url?: string } | null;
  } | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  /* ── View mode ── */
  const [showPreview, setShowPreview] = useState(true);

  /* Sync editContent from preview.content when generated */
  useEffect(() => {
    if (preview) {
      setEditContent({ ...preview.content });
      setEditProducts([...preview.products]);
    }
  }, [preview]);

  /* Suggestions fetch */
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
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setSuggestLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [themeInput]);

  /* ── Content field updater ── */
  const updateField = useCallback(
    (field: keyof GeneratedContent, value: string) => {
      setEditContent((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    []
  );

  /* ── Product helpers ── */
  function updateProduct(index: number, updates: Partial<NewsletterProduct>) {
    setEditProducts((prev) => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  }

  function moveProduct(index: number, direction: -1 | 1) {
    setEditProducts((prev) => {
      const next = [...prev];
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
      return next;
    });
  }

  function removeProduct(index: number) {
    setEditProducts((prev) => prev.filter((_, i) => i !== index));
  }

  async function addProductFromUrl(url: string) {
    if (editProducts.length >= 5) {
      alert("Maks 5 produkter — fjern et først.");
      return;
    }
    if (editProducts.some((p) => p.url === url)) return;
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
        new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(n).replace(/,/g, " ");
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
      setEditProducts((prev) => [...prev, newProduct]);
    } catch (err) {
      alert(`Kunne ikke hente produkt: ${err instanceof Error ? err.message : "feil"}`);
    } finally {
      setAddingProduct(false);
    }
  }

  function addSuggestionToManual(url: string) {
    const existing = manualProductUrls.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (existing.includes(url)) return;
    setManualProductUrls(existing.length > 0 ? `${manualProductUrls.trimEnd()}\n${url}` : url);
  }

  /* ── Generate / Regenerate ── */
  async function handleGenerate(theme?: string, newVariant?: number) {
    setGenerating(true);
    setGenerateError(null);
    try {
      const useTheme = theme ?? themeInput;
      const useVariant = newVariant ?? variant;
      const manualUrls = manualProductUrls.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
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

  /* ── Image upload ── */
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

  /* ── Create draft ── */
  async function handleCreate() {
    if (!editContent) return;
    setCreating(true);
    setCreateError(null);
    try {
      const body = {
        ...editContent,
        products: editProducts,
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

  /* ── Reset ── */
  function resetAll() {
    setCreateResult(null);
    setCreateError(null);
    setPreview(null);
    setEditContent(null);
    setEditProducts([]);
    setThemeInput("");
    setManualProductUrls("");
    setMidtImageUrl("");
    setMidtImageInput("");
    setFooterImageUrl("");
    setFooterImageInput("");
    setSocialInstagram("");
    setSocialLinkedin("");
    setEditingProductIdx(null);
  }

  /* ═══════════════════════════════════ */
  /*  RENDER                             */
  /* ═══════════════════════════════════ */

  return (
    <div className="space-y-6 p-6 pb-12 max-w-7xl">
      <header className="flex items-start gap-3">
        <Mail className="h-7 w-7 text-orange-400 mt-0.5" />
        <div>
          <h1 className="text-2xl font-semibold text-white">Nyhetsbrev-bygger</h1>
          <p className="text-sm text-gray-400 mt-1">
            Skriv inn ett tema — alt annet genereres automatisk. Rediger fritt i forhåndsvisning før du oppretter draft.
          </p>
        </div>
      </header>

      {/* ═══ SUCCESS ═══ */}
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
                <button onClick={resetAll} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm">
                  Lag ny
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ═══ STEP 1 — THEME ═══ */}
      {!preview && !createResult && (
        <Card>
          <h2 className="text-lg font-semibold text-white mb-2">Steg 1 — velg tema</h2>
          <p className="text-sm text-gray-400 mb-4">
            Skriv inn det helhetlige temaet. Vi tilpasser emnelinje, ingress, produkt-utvalg og midtseksjon automatisk.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300">Tema</label>
              <input
                type="text"
                value={themeInput}
                onChange={(e) => setThemeInput(e.target.value)}
                placeholder='F.eks. "momentnøkkel", "Vårkampanje Husqvarna 20%", "wera hammere"'
                className="mt-1 w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Fokus</label>
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
                  <label className="block text-xs font-medium text-gray-300 mb-1">Rabatt-%</label>
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
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Ekstra kontekst (valgfri)</label>
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
                    <span>Kun lagerførte:</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={onlyInStock}
                      onClick={() => setOnlyInStock(!onlyInStock)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        onlyInStock ? "bg-orange-500" : "bg-gray-700"
                      }`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        onlyInStock ? "translate-x-5" : "translate-x-1"
                      }`} />
                    </button>
                  </label>
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Spesifikke produkter (URLer, en per linje)
                  </label>
                  <textarea
                    value={manualProductUrls}
                    onChange={(e) => setManualProductUrls(e.target.value)}
                    rows={3}
                    placeholder="https://fosen-tools.no/milwaukee/125584"
                    className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 text-white rounded text-xs font-mono"
                  />
                </div>

                <SuggestionsGrid
                  suggestData={suggestData}
                  suggestLoading={suggestLoading}
                  manualProductUrls={manualProductUrls}
                  addSuggestionToManual={addSuggestionToManual}
                />
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

      {/* ═══ STEP 2 — EDIT + PREVIEW ═══ */}
      {editContent && !createResult && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">Steg 2 — rediger & forhåndsvis</h2>
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                {themeInput || "generell"} · variant {variant}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                  showPreview ? "bg-orange-500/20 text-orange-400 border border-orange-500/40" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
              <button
                onClick={handleRegenerate}
                disabled={generating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm"
              >
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Regenerer
              </button>
              <button
                onClick={() => { setPreview(null); setEditContent(null); setEditProducts([]); }}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm"
              >
                Endre tema
              </button>
            </div>
          </div>

          {/* Main 2-column layout */}
          <div className={`grid gap-4 ${showPreview ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 max-w-3xl"}`}>
            {/* ── LEFT: Editor fields ── */}
            <div className="space-y-4">
              {/* E-post-metadata */}
              <Card>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">E-post</h3>
                <div className="space-y-3">
                  <EditableField label="Emnelinje" value={editContent.subjectLine} onChange={(v) => updateField("subjectLine", v)} highlight />
                  <EditableField label="Preheader" value={editContent.previewText} onChange={(v) => updateField("previewText", v)} />
                  <div className="grid grid-cols-2 gap-3">
                    <EditableField label="Tema-slug (UTM)" value={editContent.themeSlug} onChange={(v) => updateField("themeSlug", v)} mono />
                    <EditableField label="Topp-badge" value={editContent.topBadge} onChange={(v) => updateField("topBadge", v)} />
                  </div>
                </div>
              </Card>

              {/* Headings + ingress */}
              <Card>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Innhold</h3>
                <div className="space-y-3">
                  <EditableField label="Hovedtittel" value={editContent.headingMain} onChange={(v) => updateField("headingMain", v)} />
                  <EditableField label="Undertittel" value={editContent.headingSub} onChange={(v) => updateField("headingSub", v)} />
                  <EditableField label="Ingress" value={editContent.ingress} onChange={(v) => updateField("ingress", v)} multiline rows={3} />
                </div>
              </Card>

              {/* Products */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                    Produkter ({editProducts.length}/5)
                  </h3>
                </div>

                <div className="space-y-2">
                  {editProducts.map((p, i) => (
                    <div
                      key={`${p.url}-${i}`}
                      className={`flex items-start gap-2 p-2.5 border rounded transition-colors ${
                        editingProductIdx === i ? "border-orange-500 bg-gray-900" : "border-gray-800 bg-gray-900/50"
                      }`}
                    >
                      {/* Reorder + grip */}
                      <div className="flex flex-col items-center gap-0.5 pt-1">
                        <button
                          onClick={() => moveProduct(i, -1)}
                          disabled={i === 0}
                          className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-default"
                          title="Flytt opp"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <GripVertical className="h-3 w-3 text-gray-700" />
                        <button
                          onClick={() => moveProduct(i, 1)}
                          disabled={i === editProducts.length - 1}
                          className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-default"
                          title="Flytt ned"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Thumbnail */}
                      {p.imageUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={p.imageUrl} alt="" className="w-14 h-14 object-contain rounded flex-shrink-0 bg-white" />
                      )}

                      {/* Info or edit */}
                      <div className="flex-1 min-w-0">
                        {editingProductIdx === i ? (
                          <div className="space-y-1.5">
                            <input
                              value={p.name}
                              onChange={(e) => updateProduct(i, { name: e.target.value })}
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs font-medium"
                              placeholder="PRODUKTNAVN"
                            />
                            <input
                              value={p.brandSku}
                              onChange={(e) => updateProduct(i, { brandSku: e.target.value })}
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded text-xs"
                              placeholder="Merke / SKU"
                            />
                            <input
                              value={p.priceText}
                              onChange={(e) => updateProduct(i, { priceText: e.target.value })}
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 text-orange-300 rounded text-xs"
                              placeholder="Pris-tekst"
                            />
                            <input
                              value={p.imageUrl}
                              onChange={(e) => updateProduct(i, { imageUrl: e.target.value })}
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 text-gray-400 rounded text-xs font-mono"
                              placeholder="Bilde-URL"
                            />
                            <button
                              onClick={() => setEditingProductIdx(null)}
                              className="text-xs text-orange-400 hover:underline"
                            >
                              Ferdig
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="text-xs font-medium text-white truncate">{p.name}</div>
                            <div className="text-xs text-gray-500 truncate">{p.brandSku}</div>
                            <div className="text-xs text-orange-400 mt-0.5">{p.priceText}</div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => setEditingProductIdx(editingProductIdx === i ? null : i)}
                          title="Rediger"
                          className="p-1 text-gray-500 hover:text-orange-400 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeProduct(i)}
                          title="Fjern"
                          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add product */}
                {editProducts.length < 5 && (
                  <div className="mt-3 pt-3 border-t border-gray-800 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualAddUrl}
                        onChange={(e) => setManualAddUrl(e.target.value)}
                        placeholder="https://fosen-tools.no/..."
                        className="flex-1 px-3 py-1.5 bg-gray-900 border border-gray-700 text-white rounded text-xs font-mono"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && manualAddUrl.trim() && !addingProduct) {
                            addProductFromUrl(manualAddUrl.trim());
                            setManualAddUrl("");
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (manualAddUrl.trim()) {
                            addProductFromUrl(manualAddUrl.trim());
                            setManualAddUrl("");
                          }
                        }}
                        disabled={addingProduct || !manualAddUrl.trim()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded text-xs"
                      >
                        {addingProduct ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        Legg til
                      </button>
                    </div>

                    {/* Mini suggestions in step 2 */}
                    <details className="text-xs" suppressHydrationWarning>
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-300 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Anbefalte produkter
                        {suggestLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                      </summary>
                      <div className="mt-2 grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                        {suggestData?.products
                          .filter((s) => !editProducts.some((p) => p.url === s.url))
                          .slice(0, 8)
                          .map((s) => (
                            <button
                              key={s.url}
                              onClick={() => addProductFromUrl(s.url)}
                              disabled={addingProduct}
                              className="text-left p-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded text-xs transition-colors disabled:opacity-50"
                            >
                              <div className="text-gray-300 truncate">
                                {(() => { try { return new URL(s.url).pathname; } catch { return s.url; } })()}
                              </div>
                              <div className="text-gray-600">{s.ga4_views}v · {s.mailchimp_clicks}k · <span className="text-orange-400">{s.score}</span></div>
                            </button>
                          ))}
                      </div>
                    </details>
                  </div>
                )}
              </Card>

              {/* Midtseksjon */}
              <Card>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Midtseksjon</h3>
                <div className="space-y-3">
                  <EditableField label="Tittel" value={editContent.midtTitle} onChange={(v) => updateField("midtTitle", v)} />
                  <EditableField label="Tekst" value={editContent.midtBody} onChange={(v) => updateField("midtBody", v)} multiline rows={3} />
                  <div className="grid grid-cols-2 gap-3">
                    <EditableField label="CTA-tekst" value={editContent.midtCtaText} onChange={(v) => updateField("midtCtaText", v)} />
                    <EditableField label="CTA-URL" value={editContent.midtCtaUrl} onChange={(v) => updateField("midtCtaUrl", v)} mono />
                  </div>
                </div>
              </Card>

              {/* Midt-bilde */}
              <Card className="border-orange-700/40">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                    Midtseksjon-bilde <span className="text-orange-400 text-xs font-normal normal-case">Påkrevd</span>
                  </h3>
                  {midtImageUrl && <span className="text-xs text-green-400 flex items-center gap-1"><Check className="h-3 w-3" /> OK</span>}
                </div>
                <ImageInput
                  postUrl={midtImageInput}
                  setPostUrl={setMidtImageInput}
                  mcUrl={midtImageUrl}
                  loading={midtImageLoading}
                  onUpload={() => uploadImage(midtImageInput, "midt")}
                />
              </Card>

              {/* Footer + social */}
              <Card>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Fredagsbilde & sosiale</h3>
                <div className="space-y-3">
                  <ImageInput
                    label={preview?.suggestedFooterImage
                      ? `Fredagsbilde (forslag: ${new Date(preview.suggestedFooterImage.posted_at).toLocaleDateString("nb-NO")})`
                      : "Fredagsbilde"}
                    postUrl={footerImageInput}
                    setPostUrl={setFooterImageInput}
                    mcUrl={footerImageUrl}
                    loading={footerImageLoading}
                    onUpload={() => uploadImage(footerImageInput, "footer")}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <SimpleInput label="Instagram" value={socialInstagram} onChange={setSocialInstagram} placeholder="https://instagram.com/p/..." />
                    <SimpleInput label="LinkedIn" value={socialLinkedin} onChange={setSocialLinkedin} placeholder="https://linkedin.com/feed/..." />
                  </div>
                </div>
              </Card>
            </div>

            {/* ── RIGHT: Visual Preview ── */}
            {showPreview && (
              <div className="sticky top-4 self-start">
                <NewsletterPreview
                  content={editContent}
                  products={editProducts}
                  midtImageUrl={midtImageUrl}
                  footerImageUrl={footerImageUrl}
                />
              </div>
            )}
          </div>

          {/* Create button */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => { setPreview(null); setEditContent(null); setEditProducts([]); }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-sm"
            >
              Avbryt
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded font-medium"
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

/* ═══════════════════════════════════════════ */
/*  Visual Newsletter Preview                  */
/* ═══════════════════════════════════════════ */

function NewsletterPreview({
  content,
  products,
  midtImageUrl,
  footerImageUrl,
}: {
  content: GeneratedContent;
  products: NewsletterProduct[];
  midtImageUrl: string;
  footerImageUrl: string;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-gray-700 bg-white shadow-2xl">
      {/* Email client chrome */}
      <div className="bg-gray-800 px-4 py-2.5 border-b border-gray-700">
        <div className="text-xs text-gray-400 mb-1">Fra: <span className="text-gray-300">Fosen Tools - Nyhetsbrev</span></div>
        <div className="text-sm text-white font-medium truncate">{content.subjectLine || "Emnelinje..."}</div>
        <div className="text-xs text-gray-500 mt-0.5 truncate">{content.previewText || "Preheader..."}</div>
      </div>

      {/* Newsletter body */}
      <div className="max-h-[75vh] overflow-y-auto">
        <div style={{ fontFamily: "'Roboto', Arial, sans-serif", maxWidth: 564, margin: "0 auto" }}>
          {/* Top badge */}
          {content.topBadge && (
            <div style={{ background: "#f12634", color: "#fff", textAlign: "center", padding: "8px 16px", fontSize: 11, letterSpacing: "0.1em", fontWeight: 700 }}>
              {content.topBadge}
            </div>
          )}

          {/* FT Logo */}
          <div style={{ background: "#0f1115", textAlign: "center", padding: "16px" }}>
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, letterSpacing: "0.15em" }}>
              FOSEN TOOLS
            </div>
          </div>

          {/* Heading */}
          <div style={{ padding: "24px 24px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 16, color: "#222", fontWeight: 500 }}>
              {content.headingMain || "Hovedtittel"}
            </div>
            <div style={{ fontSize: 22, color: "#222", fontWeight: 700, marginTop: 4 }}>
              {content.headingSub || "Undertittel"}
            </div>
          </div>

          {/* Ingress */}
          <div style={{ padding: "8px 24px 16px", fontSize: 14, color: "#555", lineHeight: 1.6, textAlign: "center" }}>
            {content.ingress || "Ingress-tekst..."}
          </div>

          {/* Products grid — 3+2 layout matching Mailchimp colspan 4/6 */}
          {products.length > 0 && (
            <div style={{ padding: "0 16px 16px" }}>
              {/* Row 1: up to 3 at 33.33% each (colspan="4" in 12-col grid) */}
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {products.slice(0, 3).map((p, i) => (
                  <ProductCard key={i} product={p} widthPct="33.33%" />
                ))}
              </div>
              {/* Row 2: products 4-5 at 50% each (colspan="6" in 12-col grid) */}
              {products.length > 3 && (
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
                  {products.slice(3, 5).map((p, i) => (
                    <ProductCard key={i + 3} product={p} widthPct="50%" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Midt-bilde */}
          {midtImageUrl ? (
            <div style={{ padding: "8px 0" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={midtImageUrl} alt="Midtseksjon" style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
          ) : (
            <div style={{ margin: "8px 24px", padding: "40px 24px", background: "#fff3e0", border: "2px dashed #f59e0b", borderRadius: 8, textAlign: "center" }}>
              <ImageIcon style={{ width: 32, height: 32, color: "#f59e0b", display: "inline-block" }} />
              <div style={{ fontSize: 13, color: "#92400e", marginTop: 8 }}>Midtseksjon-bilde mangler</div>
            </div>
          )}

          {/* Midt text */}
          <div style={{ padding: "16px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#222", marginBottom: 8 }}>
              {content.midtTitle || "Midtseksjon-tittel"}
            </div>
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 12 }}>
              {content.midtBody || "Midtseksjon-tekst..."}
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "10px 24px",
                background: "#f12634",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.05em",
                borderRadius: 4,
                textDecoration: "none",
              }}
            >
              {content.midtCtaText || "CTA-TEKST"}
            </div>
          </div>

          {/* Footer image */}
          {footerImageUrl && (
            <div style={{ padding: "8px 0" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={footerImageUrl} alt="Fredagsbilde" style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
          )}

          {/* Footer */}
          <div style={{ background: "#0f1115", padding: "20px 24px", textAlign: "center" }}>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              FOSEN TOOLS
            </div>
            <div style={{ color: "#999", fontSize: 11 }}>
              Industrigata 1, 7130 Brekstad · +47 72 51 51 20
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product: p, widthPct }: { product: NewsletterProduct; widthPct?: string }) {
  return (
    <div
      style={{
        flex: widthPct ? `0 0 calc(${widthPct} - 8px)` : "1 1 0",
        maxWidth: widthPct ? undefined : 180,
        textAlign: "center",
        padding: 8,
        border: "1px solid #eee",
        borderRadius: 4,
        background: "#fff",
      }}
    >
      {p.imageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={p.imageUrl}
          alt={p.name}
          style={{ width: "100%", height: 100, objectFit: "contain", marginBottom: 6 }}
        />
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: "#222", lineHeight: 1.3, minHeight: 40 }}>
        {p.name}
      </div>
      <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{p.brandSku}</div>
      <div style={{ fontSize: 11, color: "#f12634", fontWeight: 600, marginTop: 4 }}>{p.priceText}</div>
      <div
        style={{
          display: "inline-block",
          marginTop: 6,
          padding: "5px 12px",
          background: "#f12634",
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          borderRadius: 3,
        }}
      >
        Gå til produkt
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  Sub-components                             */
/* ═══════════════════════════════════════════ */

function EditableField({
  label,
  value,
  onChange,
  highlight = false,
  multiline = false,
  mono = false,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  highlight?: boolean;
  multiline?: boolean;
  mono?: boolean;
  rows?: number;
}) {
  const [editing, setEditing] = useState(false);

  const baseClasses = `w-full px-3 py-2 bg-gray-900 border rounded text-sm transition-colors ${
    highlight ? "text-orange-300 font-medium" : "text-gray-200"
  } ${mono ? "font-mono text-xs" : ""}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <button
          onClick={() => setEditing(!editing)}
          className="text-gray-600 hover:text-orange-400 transition-colors"
          title={editing ? "Lås" : "Rediger"}
        >
          {editing ? <Check className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
        </button>
      </div>
      {editing ? (
        multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={rows}
            className={`${baseClasses} border-orange-500/50 focus:border-orange-500 focus:outline-none`}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseClasses} border-orange-500/50 focus:border-orange-500 focus:outline-none`}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") setEditing(false); }}
          />
        )
      ) : (
        <div
          onClick={() => setEditing(true)}
          className={`${baseClasses} border-gray-800 hover:border-gray-600 cursor-text ${
            multiline ? "whitespace-pre-wrap min-h-[40px]" : "truncate"
          }`}
        >
          {value || <span className="text-gray-600 italic">Tom</span>}
        </div>
      )}
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
        className="mt-1 w-full px-3 py-1.5 bg-gray-900 border border-gray-700 text-white rounded text-sm"
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
  label?: string;
  postUrl: string;
  setPostUrl: (v: string) => void;
  mcUrl: string;
  loading: boolean;
  onUpload: () => void;
}) {
  return (
    <div className="space-y-2">
      {label && <span className="text-xs text-gray-300">{label}</span>}
      <div className="flex gap-2">
        <input
          type="text"
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
          placeholder="Bilde-URL eller post-lenke..."
          className="flex-1 px-3 py-1.5 bg-gray-900 border border-gray-700 text-white rounded text-sm"
        />
        <button
          onClick={onUpload}
          disabled={loading || !postUrl.trim()}
          className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded text-sm"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
          Hent
        </button>
      </div>
      {mcUrl && (
        <div className="flex items-center gap-2 p-2 bg-gray-900 border border-gray-800 rounded text-xs">
          <Check className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
          <span className="text-green-400">Lastet opp</span>
          <span className="text-gray-600 truncate flex-1">{mcUrl}</span>
        </div>
      )}
    </div>
  );
}

function SuggestionsGrid({
  suggestData,
  suggestLoading,
  manualProductUrls,
  addSuggestionToManual,
}: {
  suggestData: { products: SuggestedProduct[]; theme?: { theme: string; category_slug?: string } | null } | null;
  suggestLoading: boolean;
  manualProductUrls: string;
  addSuggestionToManual: (url: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-gray-300 mb-2 flex-wrap">
        <TrendingUp className="h-3.5 w-3.5 text-orange-400" />
        <span className="font-medium">Anbefalte produkter</span>
        {suggestData?.theme?.category_slug ? (
          <span className="text-orange-400 bg-orange-950/40 px-2 py-0.5 rounded">
            /produkter/{suggestData.theme.category_slug}
          </span>
        ) : suggestData?.theme?.theme ? (
          <span className="text-orange-400 bg-orange-950/40 px-2 py-0.5 rounded">
            «{suggestData.theme.theme}»
          </span>
        ) : (
          <span className="text-gray-500">(topp 60d)</span>
        )}
        {suggestLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-500" />}
      </div>
      {!suggestData ? (
        <p className="text-xs text-gray-500">Laster forslag...</p>
      ) : suggestData.products.length === 0 ? (
        <p className="text-xs text-gray-500">Ingen forslag for dette temaet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
          {suggestData.products.map((s) => {
            const path = (() => { try { return new URL(s.url).pathname; } catch { return s.url; } })();
            const isAdded = manualProductUrls.includes(s.url);
            return (
              <button
                key={s.url}
                onClick={() => addSuggestionToManual(s.url)}
                disabled={isAdded}
                className={`text-left p-2 rounded text-xs transition-colors border ${
                  isAdded ? "bg-green-950/40 border-green-700 cursor-default" : "bg-gray-900 hover:bg-gray-800 border-gray-800"
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-200 truncate">{path}</div>
                    <div className="flex justify-between text-gray-500 mt-0.5">
                      <span>{s.ga4_views}v · {s.mailchimp_clicks}k</span>
                      <span className="text-orange-400">{s.score}</span>
                    </div>
                    {s.last_used_at ? (
                      <div className="text-gray-600 mt-0.5">Sist: {new Date(s.last_used_at).toLocaleDateString("nb-NO")}</div>
                    ) : (
                      <div className="text-green-500/80 mt-0.5">Aldri brukt</div>
                    )}
                  </div>
                  {isAdded ? <Check className="h-3.5 w-3.5 text-green-400 flex-shrink-0" /> : <Plus className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
