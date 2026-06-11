"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

interface NewsletterSupplier {
  name: string;
  tagline: string;
  logoUrl: string;
  ctaText: string;
  ctaUrl: string;
  description?: string;
  logoWidth?: number;
}

/** Default logo-URL-mønster — bruk slug fra Supabase Storage. */
const SUPABASE_LOGO_BASE =
  "https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/social_assets/brand-assets/leverandor-logoer";

/** Slugs som er forhåndslastet til Supabase. Last opp flere via
 *  scripts/upload-leverandor-logoer.mjs. */
const KNOWN_SUPPLIER_SLUGS = [
  "milwaukee", "wera", "zweibruder", "facom", "husqvarna", "knipex", "snap-on",
  "stahlwille", "hellberg", "bahco", "leatherman", "morakniv",
  "pelicase", "hultafors", "fluke", "gedore", "zarges", "rennsteig", "gigant",
  "bondhus", "viking-arm", "lista", "mitutoyo", "pb-swiss-tools", "solid-gear",
  "snickers-workwear", "kc-tools", "brockhaus-heuer", "fosen-tools-custom",
];

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
  customerStoryText?: string;
  utmTerm?: string;
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

/* List-item shape returned by GET /api/mailchimp/newsletter/drafts */
interface NewsletterDraftListItem {
  id: string;
  title: string;
  status: "draft" | "pushed" | "archived";
  updated_at: string;
  created_at: string;
}

/* Full payload stored in newsletter_wizard_drafts.wizard_state */
interface WizardStatePayload {
  themeInput: string;
  focus: "rabatt" | "kvalitet" | "nyhet" | "sesong" | "annet";
  discountPct: string;
  extraContext: string;
  productCount: number;
  onlyInStock: boolean;
  manualProductUrls: string;
  variant: number;
  preview: GenerateResponse | null;
  editContent: GeneratedContent | null;
  editProducts: NewsletterProduct[];
  editSuppliers?: NewsletterSupplier[];
  midtImageInput: string;
  midtImageUrl: string;
  footerImageInput: string;
  footerImageUrl: string;
  socialInstagram: string;
  socialLinkedin: string;
  templateVariant?: "standard" | "jubileum" | "jubileum-leverandor";
  showFridayPost?: boolean;
  showMidtCta?: boolean;
  hideJubileumBanner?: boolean;
  jubileumFooterText?: string;
  hideBrandLogo?: boolean;
  /** Planlagt sendedato (YYYY-MM-DD). Brukes på innhold-kalender for å
   *  plassere utkastet på riktig dag, og vises i oversikten som badge. */
  scheduledSendDate?: string;
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
  /* Leverandør-kort — kun brukt når templateVariant === "jubileum-leverandor". */
  const [editSuppliers, setEditSuppliers] = useState<NewsletterSupplier[]>([]);
  const [editingSupplierIdx, setEditingSupplierIdx] = useState<number | null>(null);

  /* ── Images & social ── */
  const [midtImageInput, setMidtImageInput] = useState("");
  const [midtImageUrl, setMidtImageUrl] = useState("");
  const [midtImageLoading, setMidtImageLoading] = useState(false);
  const [footerImageInput, setFooterImageInput] = useState("");
  const [footerImageUrl, setFooterImageUrl] = useState("");
  const [footerImageLoading, setFooterImageLoading] = useState(false);
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");

  /* ── Mal-variant — «standard» (svart header/footer) eller «jubileum»
       (FT-rød header + 25-årslogo + rød footer). Brukes i juni 2026. ── */
  const [templateVariant, setTemplateVariant] =
    useState<"standard" | "jubileum" | "jubileum-leverandor">("standard");
  /* «Fredagsinnlegg»-seksjon nederst (footer-bilde + sosiale CTA + kundehistorie).
     Default på — skru av for jubileum/event-utgaver uten ekte kundehistorie. */
  const [showFridayPost, setShowFridayPost] = useState<boolean>(true);
  /* «Les mer»-CTA-knapp under midtseksjonen. Default på — skru av for ren info-midt. */
  const [showMidtCta, setShowMidtCta] = useState<boolean>(true);
  /* Skjul jubileumsbanner i toppen (selv om jubileum-leverandor-mal er valgt). */
  const [hideJubileumBanner, setHideJubileumBanner] = useState<boolean>(false);
  /* Én-linjes jubileumsfooter-rad rett over svart footer. Tom = skjult. */
  const [jubileumFooterText, setJubileumFooterText] = useState<string>("");
  /* Skjul brand-logo etter ingressen (vises som default når 1. produkt har manufacturer-logo).
   *  Skru av for utgaver som ikke skal fremheve én enkelt leverandør (f.eks. topp-N-lister). */
  const [hideBrandLogo, setHideBrandLogo] = useState<boolean>(false);
  /* Planlagt sendedato — YYYY-MM-DD, tom hvis ikke satt. */
  const [scheduledSendDate, setScheduledSendDate] = useState<string>("");

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

  /* ── Live HTML preview (from buildNewsletterHtml via API) ── */
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewHtmlLoading, setPreviewHtmlLoading] = useState(false);

  /* ── Draft-storage (lagring av wizard-state mellom sesjoner) ── */
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<NewsletterDraftListItem[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  /** Sammenlignings-grunnlag for auto-save — hopper over save når state
   *  ikke har endret seg siden siste server-sync. Forhindrer at vi
   *  overskriver server-state ved mount (auto-save-bug-mønster fra brosjyre). */
  const lastSyncedStateRef = useRef<string>("");
  /** Sett etter første render — første useEffect-run skal IKKE trigge save. */
  const skipFirstAutoSaveRef = useRef(true);
  /** Når true: en preview-sync er forårsaket av loadDraft, ikke en ny AI-generering.
   *  loadDraft setter dette før setPreview(...), og denne effecten respekterer flagget. */
  const skipNextPreviewSyncRef = useRef(false);

  /* Sync editContent from preview.content when generated */
  useEffect(() => {
    if (preview) {
      if (skipNextPreviewSyncRef.current) {
        // Loadet draft satte preview — editContent/editProducts er allerede satt fra draft
        skipNextPreviewSyncRef.current = false;
        return;
      }
      setEditContent({ ...preview.content });
      setEditProducts([...preview.products]);
    }
  }, [preview]);

  /* Debounced live preview-HTML fetch */
  useEffect(() => {
    if (!editContent || !showPreview) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      setPreviewHtmlLoading(true);
      try {
        const res = await fetch("/api/mailchimp/newsletter/preview-html", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editContent,
            products: editProducts,
            suppliers: editSuppliers,
            midtImageUrl,
            footerImageUrl,
            socialInstagramPostUrl: socialInstagram,
            socialLinkedinPostUrl: socialLinkedin,
            templateVariant,
            showFridayPost,
            showMidtCta,
            hideJubileumBanner,
            jubileumFooterText,
            hideBrandLogo,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { html: string };
        if (!cancelled) setPreviewHtml(data.html);
      } catch {
        // silent — keep last good HTML
      } finally {
        if (!cancelled) setPreviewHtmlLoading(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [editContent, editProducts, editSuppliers, midtImageUrl, footerImageUrl, socialInstagram, socialLinkedin, showPreview, templateVariant, showFridayPost, showMidtCta, hideJubileumBanner, jubileumFooterText, hideBrandLogo]);

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

  /* ── Supplier helpers (leverandør-kort for jubileum-leverandor-malen) ── */
  function updateSupplier(index: number, updates: Partial<NewsletterSupplier>) {
    setEditSuppliers((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  }

  function moveSupplier(index: number, direction: -1 | 1) {
    setEditSuppliers((prev) => {
      const next = [...prev];
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
      return next;
    });
  }

  function removeSupplier(index: number) {
    setEditSuppliers((prev) => prev.filter((_, i) => i !== index));
  }

  function addSupplier() {
    if (editSuppliers.length >= 8) {
      alert("Maks 8 leverandører per utgave.");
      return;
    }
    setEditSuppliers((prev) => [
      ...prev,
      {
        name: "Ny leverandør",
        tagline: "Spesialitet · kort beskrivelse",
        logoUrl: "",
        ctaText: "Se sortimentet →",
        ctaUrl: "https://fosen-tools.no/",
        description: "",
        logoWidth: 140,
      },
    ]);
    // Åpne det nye kortet for redigering
    setTimeout(() => setEditingSupplierIdx(editSuppliers.length), 0);
  }

  /** Når brukeren skriver en slug, oppdater logoUrl automatisk. */
  function setSupplierSlug(index: number, slug: string) {
    const trimmed = slug.trim().toLowerCase();
    const logoUrl = trimmed ? `${SUPABASE_LOGO_BASE}/${trimmed}.png` : "";
    updateSupplier(index, { logoUrl });
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
        suppliers: editSuppliers,
        midtImageUrl,
        footerImageUrl,
        socialInstagramPostUrl: socialInstagram,
        socialLinkedinPostUrl: socialLinkedin,
        templateVariant,
        showFridayPost,
        showMidtCta,
        hideJubileumBanner,
        jubileumFooterText,
        hideBrandLogo,
      };
      const res = await fetch("/api/mailchimp/newsletter/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Feil");
      setCreateResult({ campaign_id: data.campaign_id, edit_url: data.edit_url });
      // Markér utkastet som pushed så det ikke dukker opp i default-listen
      // sammen med work-in-progress-utkast (fortsatt synlig under "Vis alle").
      if (currentDraftId) {
        await fetch(`/api/mailchimp/newsletter/drafts/${currentDraftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "pushed" }),
        }).catch(() => {});
        void loadDraftsList();
      }
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
    setEditSuppliers([]);
    setShowFridayPost(true);
    setShowMidtCta(true);
    setHideJubileumBanner(false);
    setHideBrandLogo(false);
    setJubileumFooterText("");
    setScheduledSendDate("");
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

  /* ═══════════════════════════════════════════ */
  /*  DRAFT-STORAGE                              */
  /* ═══════════════════════════════════════════ */

  /** Saml hele wizard-tilstanden i ett objekt for lagring. */
  function buildWizardState(): WizardStatePayload {
    return {
      themeInput,
      focus,
      discountPct,
      extraContext,
      productCount,
      onlyInStock,
      manualProductUrls,
      variant,
      preview,
      editContent,
      editProducts,
      editSuppliers,
      midtImageInput,
      midtImageUrl,
      footerImageInput,
      footerImageUrl,
      socialInstagram,
      socialLinkedin,
      templateVariant,
      showFridayPost,
      showMidtCta,
      hideJubileumBanner,
      jubileumFooterText,
      scheduledSendDate,
      hideBrandLogo,
    };
  }

  /** Avled bruker-vennlig tittel fra tilstanden. */
  function deriveDraftTitle(s: WizardStatePayload): string {
    const candidate =
      s.editContent?.subjectLine?.trim() || s.themeInput.trim() || "";
    return candidate.slice(0, 100) || "Utkast";
  }

  /** Hent listen over brukerens utkast. */
  const loadDraftsList = useCallback(async () => {
    setDraftsLoading(true);
    try {
      const res = await fetch("/api/mailchimp/newsletter/drafts");
      if (res.ok) {
        const json = await res.json();
        setDrafts(Array.isArray(json.drafts) ? json.drafts : []);
      }
    } catch {
      /* stille — listen er ikke kritisk */
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  /** Last et eksisterende utkast inn i wizard-en. */
  async function loadDraft(id: string) {
    try {
      const res = await fetch(`/api/mailchimp/newsletter/drafts/${id}`);
      if (!res.ok) return;
      const json = await res.json();
      const s = (json.wizard_state ?? {}) as Partial<WizardStatePayload>;
      // Reset først så vi ikke arver fra forrige utkast
      resetAll();
      // Bruk setTimeout 0 så reset-en lander før vi setter ny state
      // (React batcher state-oppdateringer; uten dette risikerer vi at
      // sett-kallene blandes med reset-kallene i samme batch)
      setTimeout(() => {
        if (typeof s.themeInput === "string") setThemeInput(s.themeInput);
        if (s.focus) setFocus(s.focus);
        if (typeof s.discountPct === "string") setDiscountPct(s.discountPct);
        if (typeof s.extraContext === "string") setExtraContext(s.extraContext);
        if (typeof s.productCount === "number") setProductCount(s.productCount);
        if (typeof s.onlyInStock === "boolean") setOnlyInStock(s.onlyInStock);
        if (typeof s.manualProductUrls === "string")
          setManualProductUrls(s.manualProductUrls);
        if (typeof s.variant === "number") setVariant(s.variant);
        // Sett flagget FØR setPreview slik at preview-sync-effecten respekterer det
        if (s.preview !== undefined) {
          skipNextPreviewSyncRef.current = true;
          setPreview(s.preview);
        }
        if (s.editContent !== undefined) setEditContent(s.editContent);
        if (Array.isArray(s.editProducts)) setEditProducts(s.editProducts);
        if (Array.isArray(s.editSuppliers)) setEditSuppliers(s.editSuppliers);
        if (typeof s.midtImageInput === "string")
          setMidtImageInput(s.midtImageInput);
        if (typeof s.midtImageUrl === "string") setMidtImageUrl(s.midtImageUrl);
        if (typeof s.footerImageInput === "string")
          setFooterImageInput(s.footerImageInput);
        if (typeof s.footerImageUrl === "string")
          setFooterImageUrl(s.footerImageUrl);
        if (typeof s.socialInstagram === "string")
          setSocialInstagram(s.socialInstagram);
        if (typeof s.socialLinkedin === "string")
          setSocialLinkedin(s.socialLinkedin);
        if (
          s.templateVariant === "jubileum" ||
          s.templateVariant === "jubileum-leverandor" ||
          s.templateVariant === "standard"
        )
          setTemplateVariant(s.templateVariant);
        else
          setTemplateVariant("standard");
        if (typeof s.showFridayPost === "boolean") setShowFridayPost(s.showFridayPost);
        else setShowFridayPost(true);
        if (typeof s.showMidtCta === "boolean") setShowMidtCta(s.showMidtCta);
        else setShowMidtCta(true);
        if (typeof s.hideJubileumBanner === "boolean") setHideJubileumBanner(s.hideJubileumBanner);
        else setHideJubileumBanner(false);
        if (typeof s.hideBrandLogo === "boolean") setHideBrandLogo(s.hideBrandLogo);
        else setHideBrandLogo(false);
        if (typeof s.jubileumFooterText === "string") setJubileumFooterText(s.jubileumFooterText);
        else setJubileumFooterText("");
        if (typeof s.scheduledSendDate === "string") setScheduledSendDate(s.scheduledSendDate);
        else setScheduledSendDate("");

        setCurrentDraftId(id);
        // Hopp over neste auto-save tick (utløses av state-kaskaden over),
        // ellers vil server-state bli overskrevet av forrige browser-state.
        skipFirstAutoSaveRef.current = true;
        // Etter at React har flushet alle setState-kall over, snapshot
        // det BUILDED state-objektet — saveCurrentDraft sammenligner mot
        // buildWizardState() så vi MÅ matche samme struktur, ikke rå server-payload.
        setLastSavedAt(json.updated_at ? new Date(json.updated_at) : null);
        setSaveStatus("saved");
        setShowDrafts(false);
        setTimeout(() => {
          lastSyncedStateRef.current = JSON.stringify(buildWizardState());
        }, 100);
      }, 0);
    } catch {
      /* stille */
    }
  }

  /** Lagre nåværende state — auto-kalt av useEffect, men også manuelt. */
  async function saveCurrentDraft() {
    const state = buildWizardState();
    const stateStr = JSON.stringify(state);
    // Hopp over hvis ingenting har endret seg siden siste server-sync
    if (stateStr === lastSyncedStateRef.current) return;
    // Hopp over hvis bruker ikke har begynt på noe
    if (!state.themeInput.trim() && !state.preview && !state.editContent) return;

    setSaveStatus("saving");
    try {
      const res = await fetch("/api/mailchimp/newsletter/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentDraftId ?? undefined,
          title: deriveDraftTitle(state),
          wizard_state: state,
        }),
      });
      if (!res.ok) {
        setSaveStatus("error");
        return;
      }
      const json = await res.json();
      if (!currentDraftId && json.id) setCurrentDraftId(json.id);
      lastSyncedStateRef.current = stateStr;
      setLastSavedAt(json.updated_at ? new Date(json.updated_at) : new Date());
      setSaveStatus("saved");
      // Oppdater liste i bakgrunnen så nyeste utkast vises øverst
      void loadDraftsList();
    } catch {
      setSaveStatus("error");
    }
  }

  /** Slett et utkast. Hvis det er det aktive — resett wizard. */
  async function deleteDraftFn(id: string) {
    if (!confirm("Slett dette utkastet permanent?")) return;
    try {
      await fetch(`/api/mailchimp/newsletter/drafts/${id}`, {
        method: "DELETE",
      });
      if (id === currentDraftId) {
        resetAll();
        setCurrentDraftId(null);
        lastSyncedStateRef.current = "";
        setLastSavedAt(null);
        setSaveStatus("idle");
      }
      void loadDraftsList();
    } catch {
      /* stille */
    }
  }

  /** Start på et helt nytt utkast — resett wizard og glem currentDraftId. */
  function newDraft() {
    resetAll();
    setCurrentDraftId(null);
    lastSyncedStateRef.current = "";
    setLastSavedAt(null);
    setSaveStatus("idle");
    setShowDrafts(false);
  }

  /** Endre tittel på et utkast (inline rename). */
  async function renameDraftFn(id: string, newTitle: string) {
    try {
      await fetch(`/api/mailchimp/newsletter/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      void loadDraftsList();
    } catch {
      /* stille */
    }
  }

  /* Last listen ved mount */
  useEffect(() => {
    void loadDraftsList();
  }, [loadDraftsList]);

  /* Hvis URL har ?draft=<id> ved mount, last det utkastet automatisk.
     Brukes når man kommer fra /innleggsbygger/nyhetsbrev-oversikt. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const draftId = params.get("draft");
    if (draftId) {
      void loadDraft(draftId);
      // Rydd URL-en så reload ikke laster på nytt
      const url = new URL(window.location.href);
      url.searchParams.delete("draft");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Auto-save (debounced 4s) — ALLE relevante state-felter i deps */
  useEffect(() => {
    if (skipFirstAutoSaveRef.current) {
      skipFirstAutoSaveRef.current = false;
      return;
    }
    const handle = setTimeout(() => {
      void saveCurrentDraft();
    }, 4000);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    themeInput,
    focus,
    discountPct,
    extraContext,
    productCount,
    onlyInStock,
    manualProductUrls,
    variant,
    preview,
    editContent,
    editProducts,
    editSuppliers,
    midtImageInput,
    midtImageUrl,
    footerImageInput,
    footerImageUrl,
    socialInstagram,
    socialLinkedin,
    templateVariant,
    showFridayPost,
    showMidtCta,
    hideJubileumBanner,
    jubileumFooterText,
    scheduledSendDate,
    hideBrandLogo,
  ]);

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
        <div className="ml-auto flex items-center gap-2">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Lagrer …
            </span>
          )}
          {saveStatus === "saved" && lastSavedAt && (
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <Check className="w-3 h-3 text-green-400" /> Lagret{" "}
              {lastSavedAt.toLocaleTimeString("nb-NO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="w-3 h-3" /> Lagring feilet
            </span>
          )}
        </div>
      </header>

      {/* ═══ MINE UTKAST ═══ */}
      <Card className="border-gray-800">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setShowDrafts((v) => !v);
              if (!showDrafts) void loadDraftsList();
            }}
            className="flex items-center gap-2 text-sm font-semibold text-white hover:text-orange-300"
          >
            {showDrafts ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Mine utkast{" "}
            <span className="text-xs text-gray-500 font-normal">
              ({drafts.length})
            </span>
            {currentDraftId && (
              <span className="ml-2 text-xs font-normal text-orange-300">
                · arbeider på{" "}
                {drafts.find((d) => d.id === currentDraftId)?.title ?? "utkast"}
              </span>
            )}
          </button>
          <button
            onClick={newDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 border border-orange-500/30 rounded text-xs font-medium"
          >
            <Plus className="w-3 h-3" /> Nytt utkast
          </button>
        </div>
        {showDrafts && (
          <div className="mt-4 space-y-2">
            {draftsLoading && (
              <p className="text-xs text-gray-500">Laster …</p>
            )}
            {!draftsLoading && drafts.length === 0 && (
              <p className="text-xs text-gray-500">
                Du har ingen utkast enda. Begynn å skrive et tema nedenfor —
                vi lagrer automatisk hvert ~4 sekund.
              </p>
            )}
            {drafts.map((d) => {
              const isActive = d.id === currentDraftId;
              const when = new Date(d.updated_at).toLocaleString("nb-NO", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div
                  key={d.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded border ${
                    isActive
                      ? "border-orange-500/50 bg-orange-500/5"
                      : "border-gray-800 bg-gray-900/40 hover:border-gray-700"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white truncate">
                        {d.title}
                      </span>
                      {d.status === "pushed" && (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 bg-green-900/40 text-green-400 rounded">
                          Pushet
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[10px] uppercase tracking-wide text-orange-300">
                          aktiv
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Sist endret {when}
                    </div>
                  </div>
                  {!isActive && (
                    <button
                      onClick={() => loadDraft(d.id)}
                      className="text-xs text-orange-300 hover:text-orange-200"
                    >
                      Åpne
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const newName = window.prompt(
                        "Nytt navn på utkastet:",
                        d.title,
                      );
                      if (newName && newName.trim() && newName !== d.title) {
                        void renameDraftFn(d.id, newName.trim());
                      }
                    }}
                    className="text-gray-500 hover:text-white"
                    title="Endre navn"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteDraftFn(d.id)}
                    className="text-gray-500 hover:text-red-400"
                    title="Slett"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

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
            {/* Mal-velger — standard, jubileum (produkt-grid) eller jubileum-leverandor */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">Mal</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateVariant("standard")}
                  className={`text-left p-3 rounded border transition ${
                    templateVariant === "standard"
                      ? "border-orange-500 bg-orange-950/40"
                      : "border-gray-700 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-sm bg-black border border-gray-600"></div>
                    <div className="font-semibold text-sm text-white">Standard</div>
                  </div>
                  <div className="text-[11px] text-gray-400">Svart header + produktgrid</div>
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateVariant("jubileum")}
                  className={`text-left p-3 rounded border transition ${
                    templateVariant === "jubileum"
                      ? "border-orange-500 bg-orange-950/40"
                      : "border-gray-700 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-sm bg-red-600"></div>
                    <div className="font-semibold text-sm text-white">🎉 Jubileum</div>
                  </div>
                  <div className="text-[11px] text-gray-400">Jubileumsbanner + produktgrid</div>
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateVariant("jubileum-leverandor")}
                  className={`text-left p-3 rounded border transition ${
                    templateVariant === "jubileum-leverandor"
                      ? "border-orange-500 bg-orange-950/40"
                      : "border-gray-700 bg-gray-900 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded-sm bg-red-600 border border-red-800"></div>
                    <div className="font-semibold text-sm text-white">🤝 Leverandører</div>
                  </div>
                  <div className="text-[11px] text-gray-400">Jubileumsbanner + leverandør-kort</div>
                </button>
              </div>
            </div>

            {/* Planlagt sendedato — vises på oversikten og innhold-kalenderen */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                📅 Planlagt sendedato
              </label>
              <input
                type="date"
                value={scheduledSendDate}
                onChange={(e) => setScheduledSendDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Brukes på innhold-kalenderen og i nyhetsbrev-oversikten. La være tom hvis du ikke har bestemt enda.
              </p>
            </div>

            {/* Fredagsinnlegg-toggle — skjul nederste seksjon (footer-bilde + sosiale CTA + kundehistorie) */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFridayPost}
                  onChange={(e) => setShowFridayPost(e.target.checked)}
                  className="rounded border-gray-700"
                />
                <span className="text-xs font-medium text-gray-300">
                  Vis fredagsinnlegg-seksjon nederst
                </span>
              </label>
              <p className="ml-6 mt-1 text-[11px] text-gray-500">
                Footer-bilde + sosiale CTA + kundehistorie. Skru av for jubileum/event-utgaver uten ekte ukentlig kundehistorie.
              </p>
            </div>

            {/* Midt-CTA-toggle — skjul «Les mer»-knapp under midtseksjonen */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showMidtCta}
                  onChange={(e) => setShowMidtCta(e.target.checked)}
                  className="rounded border-gray-700"
                />
                <span className="text-xs font-medium text-gray-300">
                  Vis «Les mer»-knapp under midtseksjonen
                </span>
              </label>
              <p className="ml-6 mt-1 text-[11px] text-gray-500">
                Skru av når midtseksjonen er ren info uten ekstern destinasjon (typisk program-/event-info).
              </p>
            </div>

            {/* Brand-logo-toggle — skjul auto-generert leverandørlogo (typisk når innlegget ikke fremhever én enkelt leverandør) */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideBrandLogo}
                  onChange={(e) => setHideBrandLogo(e.target.checked)}
                  className="rounded border-gray-700"
                />
                <span className="text-xs font-medium text-gray-300">
                  Skjul brand-logo etter ingressen
                </span>
              </label>
              <p className="ml-6 mt-1 text-[11px] text-gray-500">
                Default vises logo for første produktets leverandør. Skru på for topp-N-lister eller utgaver som ikke skal fremheve én leverandør.
              </p>
            </div>

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
                  <div>
                    <EditableField label="Preheader" value={editContent.previewText} onChange={(v) => updateField("previewText", v)} />
                    <div className={`text-xs mt-1 ${
                      editContent.previewText.length < 50 ? "text-amber-400" :
                      editContent.previewText.length > 130 ? "text-amber-400" :
                      editContent.previewText.length >= 80 && editContent.previewText.length <= 110 ? "text-green-500" :
                      "text-gray-500"
                    }`}>
                      {editContent.previewText.length} tegn {editContent.previewText.length < 80 ? "(anbefalt 80–110)" : editContent.previewText.length > 110 ? "(anbefalt 80–110, blir kuttet i innboks)" : "✓ optimal lengde"}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <EditableField label="Tema-slug (UTM)" value={editContent.themeSlug} onChange={(v) => updateField("themeSlug", v)} mono />
                    <EditableField label="UTM term (A/B)" value={editContent.utmTerm ?? ""} onChange={(v) => updateField("utmTerm", v)} mono />
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

              {/* Suppliers — only shown for jubileum-leverandor variant */}
              {templateVariant === "jubileum-leverandor" && (
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                      Leverandører ({editSuppliers.length}/8)
                    </h3>
                    <button
                      onClick={addSupplier}
                      disabled={editSuppliers.length >= 8}
                      className="text-xs px-2 py-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded"
                    >
                      + Legg til
                    </button>
                  </div>

                  <datalist id="supplier-slugs">
                    {KNOWN_SUPPLIER_SLUGS.map((slug) => (
                      <option key={slug} value={slug} />
                    ))}
                  </datalist>

                  <div className="space-y-2">
                    {editSuppliers.map((s, i) => {
                      const isEditing = editingSupplierIdx === i;
                      // Avled slug fra logo-URL hvis den følger Supabase-mønsteret
                      const slug = (() => {
                        const m = s.logoUrl?.match(/\/leverandor-logoer\/([^/.]+)\.png$/);
                        return m ? m[1] : "";
                      })();
                      const currentWidth = s.logoWidth ?? 140;
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-2 p-2.5 border rounded transition-colors ${
                            isEditing ? "border-orange-500 bg-gray-900" : "border-gray-800 bg-gray-900/50"
                          }`}
                        >
                          {/* Reorder */}
                          <div className="flex flex-col items-center gap-0.5 pt-1">
                            <button
                              onClick={() => moveSupplier(i, -1)}
                              disabled={i === 0}
                              className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-default"
                              title="Flytt opp"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <GripVertical className="h-3 w-3 text-gray-700" />
                            <button
                              onClick={() => moveSupplier(i, 1)}
                              disabled={i === editSuppliers.length - 1}
                              className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 disabled:cursor-default"
                              title="Flytt ned"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Logo thumbnail (alltid synlig — på hvit bakgrunn for kontrast) */}
                          {s.logoUrl && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={s.logoUrl}
                              alt={s.name}
                              className="object-contain rounded flex-shrink-0 bg-white p-1"
                              style={{ width: `${Math.max(48, currentWidth * 0.4)}px`, height: "56px" }}
                            />
                          )}

                          {/* Info or edit form */}
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="space-y-1.5">
                                <input
                                  value={s.name}
                                  onChange={(e) => updateSupplier(i, { name: e.target.value })}
                                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs font-medium"
                                  placeholder="Leverandør-navn"
                                />
                                <input
                                  value={s.tagline}
                                  onChange={(e) => updateSupplier(i, { tagline: e.target.value })}
                                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 text-orange-300 rounded text-xs"
                                  placeholder="Tagline (én linje)"
                                />
                                <textarea
                                  value={s.description ?? ""}
                                  onChange={(e) => updateSupplier(i, { description: e.target.value })}
                                  className="w-full px-2 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded text-xs"
                                  placeholder="Beskrivelse (valgfritt, 1–3 setninger)"
                                  rows={2}
                                />
                                <div className="flex gap-2">
                                  <input
                                    value={slug}
                                    onChange={(e) => setSupplierSlug(i, e.target.value)}
                                    list="supplier-slugs"
                                    className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded text-xs font-mono"
                                    placeholder="Slug (f.eks. milwaukee)"
                                  />
                                  <input
                                    value={s.logoUrl}
                                    onChange={(e) => updateSupplier(i, { logoUrl: e.target.value })}
                                    className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 text-gray-400 rounded text-xs font-mono"
                                    placeholder="Eller full logo-URL"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-[11px] text-gray-400 whitespace-nowrap">
                                    Logo-bredde: <span className="text-orange-400 font-mono">{currentWidth}px</span>
                                  </label>
                                  <input
                                    type="range"
                                    min={80}
                                    max={180}
                                    step={5}
                                    value={currentWidth}
                                    onChange={(e) => updateSupplier(i, { logoWidth: parseInt(e.target.value, 10) })}
                                    className="flex-1 accent-orange-500"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    value={s.ctaText}
                                    onChange={(e) => updateSupplier(i, { ctaText: e.target.value })}
                                    className="w-1/3 px-2 py-1 bg-gray-800 border border-gray-700 text-white rounded text-xs"
                                    placeholder="CTA-tekst"
                                  />
                                  <input
                                    value={s.ctaUrl}
                                    onChange={(e) => updateSupplier(i, { ctaUrl: e.target.value })}
                                    className="flex-1 px-2 py-1 bg-gray-800 border border-gray-700 text-gray-400 rounded text-xs font-mono"
                                    placeholder="CTA-URL"
                                  />
                                </div>
                                <button
                                  onClick={() => setEditingSupplierIdx(null)}
                                  className="text-xs text-orange-400 hover:underline"
                                >
                                  Ferdig
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div className="text-xs font-medium text-white truncate">{s.name}</div>
                                <div className="text-xs text-orange-400 truncate">{s.tagline}</div>
                                {s.description && (
                                  <div className="text-[11px] text-gray-500 truncate mt-0.5">{s.description}</div>
                                )}
                                <div className="text-[10px] text-gray-600 mt-0.5 font-mono">{slug || "(ingen slug)"} · {currentWidth}px</div>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => setEditingSupplierIdx(isEditing ? null : i)}
                              title="Rediger"
                              className="p-1 text-gray-500 hover:text-orange-400 transition-colors"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => removeSupplier(i)}
                              title="Fjern"
                              className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {editSuppliers.length === 0 && (
                      <div className="text-center py-6 text-xs text-gray-500">
                        Ingen leverandører lagt til. Trykk «+ Legg til» for å starte.
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Products — skjult i leverandør-modus siden produktgriden ikke rendres da */}
              {templateVariant !== "jubileum-leverandor" && (
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
              )}

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

              {/* Kundehistorie / «Levert til X» — vises under fredags-bildet nederst */}
              <Card>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Kundehistorie (under fredags-bilde)</h3>
                <p className="text-xs text-gray-500 mb-3">Speiler «Levert til X»-mønsteret fra sosiale medier (+144% lift). La stå tom for default-tekst.</p>
                <EditableField
                  label="Tekst"
                  value={editContent.customerStoryText ?? ""}
                  onChange={(v) => updateField("customerStoryText", v)}
                  multiline
                  rows={4}
                />
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

            {/* ── RIGHT: Live HTML Preview (real Mailchimp output) ── */}
            {showPreview && (
              <div className="sticky top-4 self-start">
                <div className="rounded-lg overflow-hidden border border-gray-700 bg-white shadow-2xl">
                  <div className="bg-gray-800 px-4 py-2.5 border-b border-gray-700 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-400 mb-1">Fra: <span className="text-gray-300">Fosen Tools — Nyhetsbrev</span></div>
                      <div className="text-sm text-white font-medium truncate">{editContent.subjectLine || "Emnelinje..."}</div>
                      <div className="text-xs text-gray-500 mt-0.5 truncate">{editContent.previewText || "Preheader..."}</div>
                    </div>
                    {previewHtmlLoading && (
                      <Loader2 className="h-4 w-4 text-gray-400 animate-spin flex-shrink-0 ml-2" />
                    )}
                  </div>
                  {previewHtml ? (
                    <iframe
                      title="Nyhetsbrev-forhåndsvisning"
                      srcDoc={previewHtml}
                      sandbox="allow-same-origin"
                      style={{ width: "100%", height: "75vh", border: 0, display: "block", background: "#e8e8e8" }}
                    />
                  ) : (
                    <div className="flex items-center justify-center" style={{ height: "75vh", background: "#e8e8e8" }}>
                      <Loader2 className="h-6 w-6 text-gray-500 animate-spin" />
                    </div>
                  )}
                </div>
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
