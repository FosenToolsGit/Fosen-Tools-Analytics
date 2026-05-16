"use client";

import { useMemo, useState, useCallback } from "react";
import useSWR from "swr";
import {
  Sparkles,
  Plus,
  Calendar as CalendarIcon,
  Library,
  Link as LinkIcon,
  Image as ImageIcon,
  Copy,
  Check,
  X,
  Edit3,
  RefreshCw,
  Loader2,
  Upload,
  ExternalLink,
  AlertTriangle,
  TrendingUp,
  Zap,
  Globe,
  Mail,
  CheckSquare,
  Square,
} from "lucide-react";
import { Card } from "@/components/ui/card";

const TOPIC_KINDS = [
  { value: "leveranse", label: "Leveranse (+144% mønster)" },
  { value: "prosess", label: "Prosess (CADLAB → CNC → ferdig)" },
  { value: "produktlansering", label: "Produktlansering (URL-pull)" },
  { value: "bransje_kontekst", label: "Bransje-kontekst" },
  { value: "milepael", label: "Milepæl (jubileum, tall)" },
  { value: "edukativ", label: "Edukativ (HDFI vs hyllevare)" },
  { value: "evergreen", label: "Evergreen" },
  { value: "kampanje", label: "Kampanje" },
] as const;

const ARCHETYPES = [
  { value: "foto", label: "Foto — ekte bilde, hopper over AI-bildegen" },
  { value: "definisjon", label: "Definisjon — ordbok-stil («Skreddersydd / adj. / CAD-tegnet...»)" },
  { value: "statement", label: "Statement — kort kraftig utsagn («Halvparten av skuffene bør stå tomme»)" },
  { value: "kontrast", label: "Kontrast — X vs Y / FØR vs ETTER" },
  { value: "milepael", label: "Milepæl — store tall (20+ år, 100 år, 1 200 timer)" },
  { value: "sitat", label: "Sitat — direkte ord («Vi trenger åtte skuffer.»)" },
  { value: "sertifikat", label: "Sertifikat — trust-anker (Forsvaret, Miljøfyrtårn, ISO)" },
] as const;

// Visuell stil — bestemmer hvilken _<style>/-mappe Gemini får refs fra.
// Drop bilder i public/social/approved-posts/_<value>/ for å påvirke output.
const STYLES = [
  { value: "auto", label: "Auto (bare archetype + _all/)" },
  { value: "profesjonell", label: "Profesjonell (jagerfly-stil)" },
  { value: "skreddersydd", label: "Skreddersydd (sketch/CAD-stil)" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  draft: "Utkast",
  approved: "Godkjent",
  scheduled: "Planlagt",
  posted: "Publisert",
  rejected: "Avvist",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  approved: "bg-green-500/20 text-green-300 border-green-500/30",
  scheduled: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  posted: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DraftRow {
  id: string;
  topic_kind: string;
  archetype: string;
  title: string;
  brief: string | null;
  source_url: string | null;
  user_photos: Array<{ public_url: string }>;
  captions: {
    facebook?: { caption: string; alt_text?: string };
    instagram?: { caption: string; first_comment_hashtags?: string; alt_text?: string };
    linkedin?: { caption: string; hashtags?: string; alt_text?: string };
    internal_notes?: string;
  };
  ai_images: Array<{ public_url: string; archetype: string }>;
  status: string;
  scheduled_at: string | null;
  posted_at: string | null;
  posted_links: Record<string, string | boolean>;
  model_used: string | null;
  created_at: string;
}

interface CorpusEntry {
  id: string;
  kind: string;
  slug: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  active: boolean;
  updated_at: string;
}

interface PopularPage {
  url: string;
  title: string | null;
  ga4_views: number;
  mailchimp_clicks: number;
  score: number;
  last_seen: string | null;
}

type TabKey = "ny" | "ko" | "kalender" | "korpus";

export default function InnholdsmotorPage() {
  const [tab, setTab] = useState<TabKey>("ny");

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-400" />
            Innholdsmotor
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            AI-genererte innlegg med live feedback-loop. Erstatter Native — bygger på fosen-tools.no-data og FT-doktrinen.
          </p>
        </div>
      </header>

      <nav className="flex gap-2 border-b border-gray-800">
        {[
          { key: "ny" as const, label: "Ny", icon: Plus },
          { key: "ko" as const, label: "Kø", icon: Library },
          { key: "kalender" as const, label: "Kalender", icon: CalendarIcon },
          { key: "korpus" as const, label: "Korpus", icon: Library },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 flex items-center gap-2 text-sm border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? "border-amber-400 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "ny" && <TabNy onCreated={() => setTab("ko")} />}
      {tab === "ko" && <TabKo />}
      {tab === "kalender" && <TabKalender />}
      {tab === "korpus" && <TabKorpus />}
    </div>
  );
}

// =============================================================================
// TAB: Ny
// =============================================================================

function TabNy({ onCreated }: { onCreated: () => void }) {
  const [mode, setMode] = useState<"url" | "manuell">("url");
  const [url, setUrl] = useState("");
  const [topicKind, setTopicKind] = useState<string>("leveranse");
  const [archetype, setArchetype] = useState<string>("foto");
  const [style, setStyle] = useState<string>("profesjonell");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [photos, setPhotos] = useState<
    Array<{ storage_path: string; public_url: string; name: string }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/social/upload", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Upload feilet");
        }
        const data = await res.json();
        setPhotos((prev) => [
          ...prev,
          { storage_path: data.storage_path, public_url: data.public_url, name: data.name },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      let res: Response;
      if (mode === "url") {
        if (!url.trim()) throw new Error("URL er påkrevd");
        res = await fetch("/api/social/from-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, topic_kind: topicKind, archetype, brief, style }),
        });
      } else {
        if (!title.trim()) throw new Error("Tittel er påkrevd");
        res = await fetch("/api/social/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic_kind: topicKind,
            archetype,
            title,
            brief,
            user_photos: photos,
            style,
          }),
        });
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generering feilet");
      }
      // Reset + bytt til kø-tab
      setUrl("");
      setTitle("");
      setBrief("");
      setPhotos([]);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 p-6 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("url")}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              mode === "url"
                ? "bg-amber-500 text-black"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <LinkIcon className="w-4 h-4 inline mr-1" />
            Fra fosen-tools.no URL
          </button>
          <button
            onClick={() => setMode("manuell")}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              mode === "manuell"
                ? "bg-amber-500 text-black"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <Edit3 className="w-4 h-4 inline mr-1" />
            Manuell topic
          </button>
        </div>

        {mode === "url" ? (
          <div>
            <label className="text-sm text-gray-400 block mb-1">
              Produktside-URL (fosen-tools.no)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://fosen-tools.no/produkter/..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Vi scraper navn, pris, bilder, USP fra siden via JSON-LD og bygger draft.
            </p>
          </div>
        ) : (
          <div>
            <label className="text-sm text-gray-400 block mb-1">Tittel (intern)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="F.eks. 'OPTI-koffert til TESS VEST'"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Topic-type</label>
            <select
              value={topicKind}
              onChange={(e) => setTopicKind(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
            >
              {TOPIC_KINDS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Archetype (innholdstype)</label>
            <select
              value={archetype}
              onChange={(e) => setArchetype(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
            >
              {ARCHETYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Visuell stil</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
            >
              {STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1">Brief (valgfri)</label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Kunde, vinkling, detaljer... f.eks. 'OPTI-koffert med skreddersydd HDFI for kraftpipe 22-38 mm. Levert til TESS VEST.'"
            rows={4}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
          />
        </div>

        {mode === "manuell" && (
          <div>
            <label className="text-sm text-gray-400 block mb-1">
              Foto (kun for archetype=foto)
            </label>
            <label className="inline-flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded cursor-pointer text-sm text-gray-300">
              <Upload className="w-4 h-4" />
              {uploading ? "Laster opp..." : "Last opp bilder"}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
            </label>
            {photos.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {photos.map((p, i) => (
                  <div
                    key={p.storage_path}
                    className="relative aspect-square bg-gray-900 rounded overflow-hidden border border-gray-700"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.public_url}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() =>
                        setPhotos((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="absolute top-1 right-1 p-1 bg-black/70 rounded hover:bg-red-900"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-900/40 border border-red-700 rounded text-sm text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating || uploading}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-semibold rounded flex items-center justify-center gap-2 transition-colors"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Genererer med Gemini... (60-120s)
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generér draft
            </>
          )}
        </button>
      </Card>

      <PopularPagesPanel
        topicKind={topicKind}
        archetype={archetype}
        style={style}
        onBatchDone={onCreated}
      />
    </div>
  );
}

// =============================================================================
// Popular Pages Panel (batch-generering)
// =============================================================================

function PopularPagesPanel({
  topicKind,
  archetype,
  style,
  onBatchDone,
}: {
  topicKind: string;
  archetype: string;
  style: string;
  onBatchDone: () => void;
}) {
  const { data, isLoading } = useSWR<{ pages: PopularPage[]; period_days: number }>(
    "/api/social/popular-pages?days=60&limit=12",
    fetcher
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    done: number;
    total: number;
    failed: string[];
  } | null>(null);

  const pages = data?.pages ?? [];

  const togglePage = (url: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === pages.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pages.map((p) => p.url)));
    }
  };

  const handleBatch = async () => {
    if (selected.size === 0) return;
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: selected.size, failed: [] });
    try {
      const res = await fetch("/api/social/crawl-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [...selected],
          topic_kind: topicKind,
          archetype,
          style,
          skip_image: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Batch feilet");
      }
      const result = await res.json();
      setBatchProgress({
        done: result.drafts?.length ?? 0,
        total: selected.size,
        failed: result.failed ?? [],
      });
      // Wait a moment then transition to queue
      setTimeout(() => {
        setSelected(new Set());
        setBatchRunning(false);
        setBatchProgress(null);
        onBatchDone();
      }, 2000);
    } catch {
      setBatchProgress((prev) =>
        prev ? { ...prev, failed: ["Nettverksfeil — prøv igjen"] } : null
      );
      setBatchRunning(false);
    }
  };

  const extractSlug = (url: string) => {
    try {
      const path = new URL(url).pathname;
      const parts = path.split("/").filter(Boolean);
      return parts[parts.length - 1] || "/";
    } catch {
      return url;
    }
  };

  return (
    <Card className="p-4 space-y-3 max-h-[calc(100vh-240px)] flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          Populære sider
        </h3>
        {pages.length > 0 && (
          <button
            onClick={toggleAll}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {selected.size === pages.length ? "Fjern alle" : "Velg alle"}
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-gray-500 text-xs py-4">
          <Loader2 className="w-3 h-3 animate-spin" />
          Henter populære sider...
        </div>
      )}

      {!isLoading && pages.length === 0 && (
        <p className="text-xs text-gray-500 py-4">
          Ingen data fra GA4/Mailchimp siste 60 dager.
        </p>
      )}

      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {pages.map((page) => {
          const isSelected = selected.has(page.url);
          return (
            <button
              key={page.url}
              onClick={() => togglePage(page.url)}
              disabled={batchRunning}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-start gap-2 ${
                isSelected
                  ? "bg-amber-500/10 border border-amber-500/30"
                  : "hover:bg-gray-800/60 border border-transparent"
              } ${batchRunning ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Square className="w-3.5 h-3.5 text-gray-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-white block truncate" title={page.url}>
                  {page.title || extractSlug(page.url)}
                </span>
                <span className="text-gray-500 flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-0.5">
                    <Globe className="w-3 h-3" />
                    {page.ga4_views}
                  </span>
                  {page.mailchimp_clicks > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Mail className="w-3 h-3" />
                      {page.mailchimp_clicks}
                    </span>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Batch progress */}
      {batchProgress && (
        <div className="p-2 bg-gray-900 rounded border border-gray-700 text-xs">
          <div className="flex items-center gap-2 text-gray-300">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            <span>
              {batchProgress.done}/{batchProgress.total} generert
            </span>
          </div>
          {batchProgress.failed.length > 0 && (
            <div className="mt-1 text-red-400">
              {batchProgress.failed.length} feilet
            </div>
          )}
        </div>
      )}

      {/* Batch-knapp */}
      {!batchRunning && pages.length > 0 && (
        <button
          onClick={handleBatch}
          disabled={selected.size === 0}
          className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-800 disabled:text-gray-600 text-black text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          Batch-generér {selected.size > 0 ? `(${selected.size})` : ""}
        </button>
      )}

      {/* Info-tekst */}
      <p className="text-[10px] text-gray-600 leading-tight">
        Score = GA4-views × 2 + Mailchimp-klikk. Batch scraper + genererer caption for alle valgte (uten AI-bilde).
      </p>
    </Card>
  );
}

// =============================================================================
// TAB: Kø
// =============================================================================

function TabKo() {
  const [statusFilter, setStatusFilter] = useState<string>("draft");
  const { data, isLoading, mutate } = useSWR<{ drafts: DraftRow[] }>(
    `/api/social/drafts?status=${statusFilter}&limit=100`,
    fetcher
  );

  const drafts = data?.drafts ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["draft", "approved", "scheduled", "posted", "rejected"] as const).map(
          (s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-xs border transition-colors ${
                statusFilter === s
                  ? STATUS_COLORS[s]
                  : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          )
        )}
      </div>

      {isLoading && <p className="text-gray-500 text-sm">Laster...</p>}

      {!isLoading && drafts.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-500 text-sm">
            Ingen drafts med status &quot;{STATUS_LABELS[statusFilter]}&quot;.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {drafts.map((d) => (
          <DraftCard key={d.id} draft={d} onChange={mutate} />
        ))}
      </div>
    </div>
  );
}

function DraftCard({ draft, onChange }: { draft: DraftRow; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [editPlatform, setEditPlatform] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const callAction = async (
    action: string,
    body: Record<string, unknown> = {}
  ) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/social/drafts/${draft.id}?action=${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Feilet");
        return;
      }
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const patchStatus = async (status: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/social/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extra }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Feilet");
        return;
      }
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const handleSchedule = async () => {
    const input = prompt(
      "Planlegg til (YYYY-MM-DD HH:MM, lokal tid):",
      new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace("T", " ")
    );
    if (!input) return;
    const dt = new Date(input.replace(" ", "T"));
    if (isNaN(dt.getTime())) {
      alert("Ugyldig dato");
      return;
    }
    await patchStatus("scheduled", { scheduled_at: dt.toISOString() });
  };

  const platformIcons: Record<string, string> = {
    facebook: "📘",
    instagram: "📸",
    linkedin: "💼",
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded text-xs border ${STATUS_COLORS[draft.status] ?? ""}`}
            >
              {STATUS_LABELS[draft.status] ?? draft.status}
            </span>
            <span className="text-xs text-gray-500">
              {draft.topic_kind} · {draft.archetype}
            </span>
            {draft.scheduled_at && (
              <span className="text-xs text-amber-300">
                📅 {new Date(draft.scheduled_at).toLocaleString("nb-NO")}
              </span>
            )}
          </div>
          <h3 className="text-white font-semibold">{draft.title}</h3>
          {draft.brief && (
            <p className="text-xs text-gray-400 mt-1">{draft.brief}</p>
          )}
          {draft.source_url && (
            <a
              href={draft.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1"
            >
              <ExternalLink className="w-3 h-3" /> kilde
            </a>
          )}
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => callAction("regenerate-captions")}
            disabled={busy}
            title="Generér nye captions"
            className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {draft.archetype !== "foto" && (
            <button
              onClick={() => callAction("regenerate-image")}
              disabled={busy}
              title="Generér nytt bilde"
              className="p-2 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bilder */}
      {(draft.user_photos.length > 0 || draft.ai_images.length > 0) && (
        <div className="flex gap-2 overflow-x-auto">
          {draft.user_photos.map((p, i) => (
            <div
              key={`user-${i}`}
              className="flex-shrink-0 w-24 aspect-square bg-gray-900 rounded overflow-hidden border border-gray-700"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.public_url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
          {draft.ai_images.map((p, i) => (
            <div
              key={`ai-${i}`}
              className="flex-shrink-0 w-24 aspect-square bg-gray-900 rounded overflow-hidden border border-amber-700/50"
              title="AI-generert"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.public_url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {/* Captions per plattform */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(["facebook", "instagram", "linkedin"] as const).map((platform) => {
          const cap = draft.captions?.[platform];
          if (!cap) return null;
          const isPosted = !!draft.posted_links?.[platform];
          return (
            <div
              key={platform}
              className="bg-gray-900/50 border border-gray-800 rounded p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-300">
                  {platformIcons[platform]} {platform}
                  {isPosted && " ✓"}
                </span>
                <div className="flex gap-1">
                  <CopyButton text={cap.caption} />
                  <button
                    onClick={() => {
                      setEditPlatform(platform);
                      setEditText(cap.caption);
                    }}
                    className="p-1 text-gray-400 hover:text-white"
                    title="Rediger"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {editPlatform === platform ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={6}
                    className="w-full px-2 py-1 bg-gray-950 border border-gray-700 rounded text-xs text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await callAction("edit", {
                          platform,
                          new_caption: editText,
                          reason: "Manuell redigering",
                        });
                        setEditPlatform(null);
                      }}
                      className="px-2 py-1 bg-amber-500 text-black text-xs rounded"
                    >
                      Lagre
                    </button>
                    <button
                      onClick={() => setEditPlatform(null)}
                      className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded"
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {cap.caption}
                </p>
              )}
              {"first_comment_hashtags" in cap && cap.first_comment_hashtags && (
                <div className="text-xs text-gray-500 border-t border-gray-800 pt-2">
                  Kommentar-hashtags: {cap.first_comment_hashtags}
                </div>
              )}
              {"hashtags" in cap && cap.hashtags && (
                <div className="text-xs text-gray-500 border-t border-gray-800 pt-2">
                  Hashtags: {cap.hashtags}
                </div>
              )}
              {!isPosted && draft.status === "approved" && (
                <button
                  onClick={() => callAction("mark-posted", { platform })}
                  className="w-full text-xs px-2 py-1 bg-green-600/30 hover:bg-green-600/50 text-green-200 rounded"
                >
                  Marker som publisert
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Action-bar */}
      {!showReject ? (
        <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-800">
          {draft.status === "draft" && (
            <>
              <button
                onClick={() => patchStatus("approved")}
                disabled={busy}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Godkjenn
              </button>
              <button
                onClick={handleSchedule}
                disabled={busy}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded flex items-center gap-1"
              >
                <CalendarIcon className="w-3 h-3" /> Planlegg
              </button>
              <button
                onClick={() => setShowReject(true)}
                disabled={busy}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Avvis
              </button>
            </>
          )}
          {draft.status === "scheduled" && (
            <button
              onClick={() => patchStatus("approved", { scheduled_at: null })}
              disabled={busy}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
            >
              Fjern planlegging
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 pt-2 border-t border-gray-800">
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Hvorfor avvist? (f.eks. 'for langt på FB', 'AI-HDFI', 'feil tone')"
            className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm text-white"
          />
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!rejectReason.trim()) return;
                await callAction("reject", { reason: rejectReason });
                setShowReject(false);
                setRejectReason("");
              }}
              disabled={!rejectReason.trim()}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded"
            >
              Lagre avvisning + feedback
            </button>
            <button
              onClick={() => {
                setShowReject(false);
                setRejectReason("");
              }}
              className="px-3 py-1.5 bg-gray-800 text-gray-300 text-xs rounded"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {draft.captions?.internal_notes && (
        <details className="text-xs text-gray-500 mt-2">
          <summary className="cursor-pointer">Interne notater</summary>
          <p className="mt-1 pl-3">{draft.captions.internal_notes}</p>
        </details>
      )}
    </Card>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 text-gray-400 hover:text-white"
      title="Kopier"
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-400" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  );
}

// =============================================================================
// TAB: Kalender
// =============================================================================

function TabKalender() {
  const { data } = useSWR<{ drafts: DraftRow[] }>(
    "/api/social/drafts?status=scheduled&limit=200",
    fetcher
  );
  const drafts = data?.drafts ?? [];

  const byDate = useMemo(() => {
    const map = new Map<string, DraftRow[]>();
    for (const d of drafts) {
      if (!d.scheduled_at) continue;
      const day = d.scheduled_at.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(d);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [drafts]);

  if (drafts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CalendarIcon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Ingen planlagte innlegg ennå.</p>
        <p className="text-xs text-gray-600 mt-1">
          Planlegg en draft fra Kø-fanen.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {byDate.map(([day, items]) => {
        const dt = new Date(day);
        const labelDate = dt.toLocaleDateString("nb-NO", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        return (
          <div key={day}>
            <h3 className="text-sm font-semibold text-white mb-2 capitalize">
              {labelDate}
            </h3>
            <div className="space-y-2">
              {items.map((d) => (
                <Card key={d.id} className="p-3 flex items-center gap-3">
                  <span className="text-xs text-amber-400 font-mono">
                    {new Date(d.scheduled_at!).toLocaleTimeString("nb-NO", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{d.title}</p>
                    <p className="text-xs text-gray-500">
                      {d.topic_kind} · {d.archetype}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs border ${STATUS_COLORS[d.status] ?? ""}`}
                  >
                    {STATUS_LABELS[d.status] ?? d.status}
                  </span>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// TAB: Korpus
// =============================================================================

function TabKorpus() {
  const { data, mutate } = useSWR<{ entries: CorpusEntry[] }>(
    "/api/social/corpus",
    fetcher
  );
  const entries = data?.entries ?? [];
  const [editing, setEditing] = useState<CorpusEntry | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, CorpusEntry[]>();
    for (const e of entries) {
      if (!map.has(e.kind)) map.set(e.kind, []);
      map.get(e.kind)!.push(e);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [entries]);

  const handleSave = useCallback(
    async (entry: CorpusEntry) => {
      const res = await fetch(`/api/social/corpus/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: entry.title,
          content: entry.content,
          active: entry.active,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Lagring feilet");
        return;
      }
      mutate();
      setEditing(null);
    },
    [mutate]
  );

  if (editing) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">
              {editing.kind} · {editing.slug}
            </p>
            <h3 className="text-white font-semibold">{editing.title}</h3>
          </div>
          <button
            onClick={() => setEditing(null)}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Tittel</label>
          <input
            type="text"
            value={editing.title}
            onChange={(e) =>
              setEditing({ ...editing, title: e.target.value })
            }
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Innhold</label>
          <textarea
            value={editing.content}
            onChange={(e) =>
              setEditing({ ...editing, content: e.target.value })
            }
            rows={20}
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm font-mono"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={editing.active}
            onChange={(e) =>
              setEditing({ ...editing, active: e.target.checked })
            }
          />
          Aktiv (inkluder i prompt-bygging)
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => handleSave(editing)}
            className="px-4 py-2 bg-amber-500 text-black font-semibold rounded text-sm"
          >
            Lagre
          </button>
          <button
            onClick={() => setEditing(null)}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded text-sm"
          >
            Avbryt
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Korpus styrer hva Gemini ser når den genererer. Endringer her påvirker neste draft umiddelbart.
      </p>
      {grouped.map(([kind, items]) => (
        <div key={kind}>
          <h3 className="text-sm font-semibold text-white mb-2 uppercase tracking-wide">
            {kind} ({items.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {items.map((e) => (
              <button
                key={e.id}
                onClick={() => setEditing(e)}
                className={`text-left p-3 bg-gray-900 hover:bg-gray-800 rounded border transition-colors ${
                  e.active ? "border-gray-800" : "border-gray-800 opacity-50"
                }`}
              >
                <p className="text-xs text-gray-500">{e.slug}</p>
                <p className="text-sm text-white font-medium truncate">
                  {e.title}
                </p>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                  {e.content.replace(/[*#`]/g, "").slice(0, 120)}...
                </p>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
