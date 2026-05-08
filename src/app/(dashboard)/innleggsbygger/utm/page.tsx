"use client";

import { useState, useMemo } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import {
  Link2,
  Copy,
  Check,
  Trash2,
  Search,
  Plus,
  X,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { UtmLinkRow } from "@/app/api/utm-links/route";
import type { UtmStatsRow } from "@/app/api/utm-links/stats/route";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

interface Template {
  label: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign_placeholder: string;
  base_url_default?: string;
}

const TEMPLATES: Template[] = [
  {
    label: "Facebook organic",
    utm_source: "facebook",
    utm_medium: "organic",
    utm_campaign_placeholder: "f.eks. hdfi-vs-generisk",
  },
  {
    label: "Instagram organic",
    utm_source: "instagram",
    utm_medium: "organic",
    utm_campaign_placeholder: "f.eks. produsent-spotlight",
  },
  {
    label: "Instagram bio",
    utm_source: "instagram",
    utm_medium: "bio",
    utm_campaign_placeholder: "ig-bio",
    base_url_default: "https://fosen-tools.no/kundesenter/kontakt-oss",
  },
  {
    label: "Instagram story",
    utm_source: "instagram",
    utm_medium: "story",
    utm_campaign_placeholder: "f.eks. ukens-tilbud",
  },
  {
    label: "LinkedIn organic",
    utm_source: "linkedin",
    utm_medium: "organic",
    utm_campaign_placeholder: "f.eks. forsvar-case",
  },
  {
    label: "Mailchimp nyhetsbrev",
    utm_source: "FTNett",
    utm_medium: "email",
    utm_campaign_placeholder: "f.eks. glemte-klassikere-mai",
  },
  {
    label: "Google Ads",
    utm_source: "google",
    utm_medium: "cpc",
    utm_campaign_placeholder: "f.eks. brand-search",
  },
];

function buildPreview(input: {
  base_url: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  utm_term?: string;
}): string {
  if (!input.base_url) return "";
  try {
    const url = new URL(input.base_url);
    if (input.utm_source) url.searchParams.set("utm_source", input.utm_source);
    if (input.utm_medium) url.searchParams.set("utm_medium", input.utm_medium);
    if (input.utm_campaign) url.searchParams.set("utm_campaign", input.utm_campaign);
    if (input.utm_content) url.searchParams.set("utm_content", input.utm_content);
    if (input.utm_term) url.searchParams.set("utm_term", input.utm_term);
    return url.toString();
  } catch {
    return "(ugyldig URL)";
  }
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
      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Kopiert" : "Kopier"}
    </button>
  );
}

export default function UtmLinksPage() {
  const { data: linksData, mutate } = useSWR<{ links: UtmLinkRow[] }>(
    "/api/utm-links",
    fetcher,
    { revalidateOnFocus: false }
  );
  const { data: statsData } = useSWR<{ stats: UtmStatsRow[]; days: number }>(
    "/api/utm-links/stats?days=30",
    fetcher
  );

  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    label: "",
    base_url: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
    utm_term: "",
    notes: "",
  });

  const preview = useMemo(() => buildPreview(form), [form]);

  function applyTemplate(t: Template) {
    setForm({
      ...form,
      utm_source: t.utm_source,
      utm_medium: t.utm_medium,
      base_url: t.base_url_default ?? form.base_url,
    });
    setShowForm(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const res = await fetch("/api/utm-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await res.json();
    if (!res.ok) {
      setErrorMsg(body.error ?? "Ukjent feil");
      return;
    }
    setForm({
      label: "",
      base_url: "",
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      utm_content: "",
      utm_term: "",
      notes: "",
    });
    setShowForm(false);
    mutate();
    globalMutate("/api/utm-links/stats?days=30");
  }

  async function deleteLink(id: string) {
    if (!confirm("Slette denne UTM-linken?")) return;
    const res = await fetch(`/api/utm-links/${id}`, { method: "DELETE" });
    if (res.ok) mutate();
  }

  const links = linksData?.links ?? [];
  const filtered = links.filter((l) => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return (
      l.label.toLowerCase().includes(f) ||
      l.utm_campaign.toLowerCase().includes(f) ||
      l.utm_source.toLowerCase().includes(f) ||
      l.full_url.toLowerCase().includes(f)
    );
  });

  // Grupper på campaign for oversikt
  const byCampaign = new Map<string, UtmLinkRow[]>();
  for (const l of filtered) {
    const ex = byCampaign.get(l.utm_campaign) ?? [];
    ex.push(l);
    byCampaign.set(l.utm_campaign, ex);
  }
  const campaignList = [...byCampaign.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-900/30 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">UTM-linker</h1>
            <p className="text-xs text-gray-500">
              Sentralt register for sporings-URLer · {links.length} lagret · {campaignList.length}{" "}
              kampanjer
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 px-3 py-2 text-xs bg-violet-700 hover:bg-violet-600 text-white rounded-lg"
        >
          {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showForm ? "Avbryt" : "Ny UTM-link"}
        </button>
      </div>

      {/* Stats per source/medium */}
      {statsData && statsData.stats.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Trafikk per kanal (siste {statsData.days}d)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase">
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2">source</th>
                  <th className="text-left py-2">medium</th>
                  <th className="text-right py-2">Sesjoner</th>
                  <th className="text-right py-2">Konv.</th>
                  <th className="text-right py-2">Linker lagret</th>
                </tr>
              </thead>
              <tbody>
                {statsData.stats.slice(0, 15).map((s, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="py-2 text-gray-200">{s.utm_source || "(blank)"}</td>
                    <td className="py-2 text-gray-400">{s.utm_medium || "(blank)"}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{s.sessions}</td>
                    <td className="py-2 text-right font-medium tabular-nums text-emerald-400">
                      {s.conversions || "—"}
                    </td>
                    <td className="py-2 text-right text-gray-500 tabular-nums">{s.link_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Hurtigmaler */}
      {!showForm && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Hurtigmaler
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => applyTemplate(t)}
                className="text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs"
              >
                <div className="font-medium text-gray-200">{t.label}</div>
                <div className="text-gray-500 mt-0.5 truncate">
                  {t.utm_source} / {t.utm_medium}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Skjema */}
      {showForm && (
        <Card>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-3">
            Ny UTM-link
          </h2>
          <form onSubmit={submitForm} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Etikett *</label>
                <input
                  required
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="f.eks. HDFI vs generisk - Facebook"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Base URL *</label>
                <input
                  required
                  value={form.base_url}
                  onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                  placeholder="https://fosen-tools.no/..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">utm_source *</label>
                <input
                  required
                  value={form.utm_source}
                  onChange={(e) => setForm({ ...form, utm_source: e.target.value })}
                  placeholder="facebook / instagram / FTNett"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">utm_medium *</label>
                <input
                  required
                  value={form.utm_medium}
                  onChange={(e) => setForm({ ...form, utm_medium: e.target.value })}
                  placeholder="organic / email / bio / story / cpc"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">utm_campaign *</label>
                <input
                  required
                  value={form.utm_campaign}
                  onChange={(e) => setForm({ ...form, utm_campaign: e.target.value })}
                  placeholder="hdfi-vs-generisk"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">utm_content (valgfri)</label>
                <input
                  value={form.utm_content}
                  onChange={(e) => setForm({ ...form, utm_content: e.target.value })}
                  placeholder="A/B-variant eller posisjon"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Notater (valgfri)</label>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Hva brukes denne linken til?"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
              />
            </div>
            {preview && (
              <div className="p-3 bg-gray-950/50 border border-gray-800 rounded">
                <div className="text-xs text-gray-500 mb-1">Forhåndsvisning:</div>
                <div className="text-xs font-mono text-violet-300 break-all">{preview}</div>
              </div>
            )}
            {errorMsg && (
              <div className="p-2 bg-red-950/30 border border-red-800 rounded text-xs text-red-400">
                {errorMsg}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-violet-700 hover:bg-violet-600 text-white text-sm rounded"
              >
                Lagre
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded"
              >
                Avbryt
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Søk etter etikett, kampanje, source eller URL…"
          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm"
        />
      </div>

      {/* Liste — gruppert på kampanje */}
      {campaignList.length === 0 ? (
        <Card>
          <p className="text-sm text-gray-500 text-center py-8">
            {links.length === 0
              ? "Ingen UTM-linker lagret ennå. Klikk «Ny UTM-link» eller en av hurtigmalene for å starte."
              : "Ingen treff på filteret."}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaignList.map(([campaign, links]) => (
            <Card key={campaign}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-200">
                  Kampanje:{" "}
                  <span className="font-mono text-violet-300">{campaign}</span>
                </h3>
                <span className="text-xs text-gray-500">
                  {links.length} link{links.length === 1 ? "" : "er"}
                </span>
              </div>
              <div className="space-y-2">
                {links.map((l) => (
                  <div
                    key={l.id}
                    className="p-3 bg-gray-950/40 border border-gray-800 rounded space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-200">{l.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          <span className="font-mono">{l.utm_source}</span> /{" "}
                          <span className="font-mono">{l.utm_medium}</span>
                          {l.utm_content && (
                            <>
                              {" "}
                              · <span className="font-mono">{l.utm_content}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <CopyButton text={l.full_url} />
                        <button
                          onClick={() => deleteLink(l.id)}
                          className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                          title="Slett"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-violet-300/80 break-all">
                      {l.full_url}
                    </div>
                    {l.notes && (
                      <div className="text-xs text-gray-500 italic">{l.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
