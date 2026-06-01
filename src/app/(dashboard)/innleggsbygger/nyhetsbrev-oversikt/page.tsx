"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/**
 * Nyhetsbrev-oversikt: alle utkast på tvers av teamet.
 *
 * Henter fra /api/mailchimp/newsletter/drafts/team som returnerer
 * metadata + utvalgte felter fra wizard_state slik at vi kan vise
 * emnelinje, mal-variant og leverandør/produkt-tall i listen.
 *
 * Klikk på et utkast åpner det i /innleggsbygger/nyhetsbrev-bygger
 * (samme side, henter draft-id fra ?draft=...-parameter).
 */

interface DraftItem {
  id: string;
  title: string;
  status: "draft" | "pushed" | "archived";
  updated_at: string;
  created_at: string;
  owner_email: string | null;
  owner_user_id: string;
  subject_line: string | null;
  heading_main: string | null;
  template_variant: "standard" | "jubileum" | "jubileum-leverandor" | null;
  supplier_count: number;
  product_count: number;
  theme_input: string | null;
}

type StatusFilter = "draft" | "pushed" | "archived" | "all";
type OwnerFilter = "all" | "mine";
type VariantFilter = "all" | "standard" | "jubileum" | "jubileum-leverandor";

const VARIANT_LABEL: Record<string, string> = {
  standard: "Standard",
  jubileum: "Jubileum",
  "jubileum-leverandor": "Jubileum + leverandører",
};

const VARIANT_COLOR: Record<string, string> = {
  standard: "bg-gray-700 text-gray-200",
  jubileum: "bg-red-700/40 text-red-200 border border-red-700",
  "jubileum-leverandor": "bg-red-600/40 text-orange-200 border border-orange-600",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-blue-700/30 text-blue-200 border border-blue-700",
  pushed: "bg-green-700/30 text-green-200 border border-green-700",
  archived: "bg-gray-700/30 text-gray-400 border border-gray-700",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Utkast",
  pushed: "Sendt",
  archived: "Arkivert",
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}.${mm} kl ${hh}:${min}`;
  } catch {
    return iso;
  }
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso).getTime();
    const now = Date.now();
    const diffSec = Math.round((now - d) / 1000);
    if (diffSec < 60) return "akkurat nå";
    if (diffSec < 3600) return `${Math.round(diffSec / 60)} min siden`;
    if (diffSec < 86400) return `${Math.round(diffSec / 3600)} t siden`;
    if (diffSec < 7 * 86400) return `${Math.round(diffSec / 86400)} dager siden`;
    return formatDate(iso);
  } catch {
    return iso;
  }
}

function emailToName(email: string | null): string {
  if (!email) return "Ukjent";
  const local = email.split("@")[0] ?? "";
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export default function NewsletterOversiktPage() {
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("draft");
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>("all");
  const [variantFilter, setVariantFilter] = useState<VariantFilter>("all");
  const [search, setSearch] = useState("");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Hent alle utkast + innlogget brukers info
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const showAll = statusFilter === "archived" || statusFilter === "all";
        const res = await fetch(
          `/api/mailchimp/newsletter/drafts/team${showAll ? "?all=1" : ""}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setDrafts(Array.isArray(json.drafts) ? json.drafts : []);
        if (typeof json.current_user_email === "string") {
          setCurrentUserEmail(json.current_user_email);
        }
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ukjent feil");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [statusFilter]);

  const filtered = useMemo(() => {
    return drafts.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (ownerFilter === "mine" && d.owner_email !== currentUserEmail) return false;
      if (variantFilter !== "all" && d.template_variant !== variantFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !d.title.toLowerCase().includes(s) &&
          !(d.subject_line ?? "").toLowerCase().includes(s) &&
          !(d.heading_main ?? "").toLowerCase().includes(s) &&
          !(d.owner_email ?? "").toLowerCase().includes(s)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [drafts, statusFilter, ownerFilter, variantFilter, search, currentUserEmail]);

  const counts = useMemo(() => {
    const c = { draft: 0, pushed: 0, archived: 0 };
    for (const d of drafts) c[d.status] += 1;
    return c;
  }, [drafts]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Slett utkast «${title}»?\n\nDette kan ikke angres.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/mailchimp/newsletter/drafts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      alert(`Sletting feilet: ${e instanceof Error ? e.message : "Ukjent feil"}`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">📧 Nyhetsbrev-oversikt</h1>
          <p className="text-sm text-gray-400 mt-1">
            Alle utkast på tvers av teamet. Klikk for å åpne i byggeren.
          </p>
        </div>
        <Link
          href="/innleggsbygger/nyhetsbrev-bygger"
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium text-sm"
        >
          + Nytt nyhetsbrev
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <button
          onClick={() => setStatusFilter("draft")}
          className={`p-3 rounded border text-left transition ${
            statusFilter === "draft"
              ? "border-orange-500 bg-orange-950/30"
              : "border-gray-800 bg-gray-900 hover:border-gray-700"
          }`}
        >
          <div className="text-xs text-gray-400 uppercase tracking-wider">Utkast</div>
          <div className="text-2xl font-bold text-white">{counts.draft}</div>
        </button>
        <button
          onClick={() => setStatusFilter("pushed")}
          className={`p-3 rounded border text-left transition ${
            statusFilter === "pushed"
              ? "border-orange-500 bg-orange-950/30"
              : "border-gray-800 bg-gray-900 hover:border-gray-700"
          }`}
        >
          <div className="text-xs text-gray-400 uppercase tracking-wider">Sendt</div>
          <div className="text-2xl font-bold text-white">{counts.pushed}</div>
        </button>
        <button
          onClick={() => setStatusFilter("archived")}
          className={`p-3 rounded border text-left transition ${
            statusFilter === "archived"
              ? "border-orange-500 bg-orange-950/30"
              : "border-gray-800 bg-gray-900 hover:border-gray-700"
          }`}
        >
          <div className="text-xs text-gray-400 uppercase tracking-wider">Arkivert</div>
          <div className="text-2xl font-bold text-white">{counts.archived}</div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Søk i tittel, emnelinje, eier…"
          className="flex-1 min-w-[200px] px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm"
        />
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value as OwnerFilter)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm"
        >
          <option value="all">Alle eiere</option>
          <option value="mine">Kun mine</option>
        </select>
        <select
          value={variantFilter}
          onChange={(e) => setVariantFilter(e.target.value as VariantFilter)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm"
        >
          <option value="all">Alle maler</option>
          <option value="standard">Standard</option>
          <option value="jubileum">Jubileum</option>
          <option value="jubileum-leverandor">Jubileum + leverandører</option>
        </select>
      </div>

      {/* Status */}
      {error && (
        <div className="p-4 bg-red-950/30 border border-red-800 text-red-300 rounded mb-4">
          Kunne ikke laste utkast: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Laster utkast…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {drafts.length === 0
            ? "Ingen utkast funnet. Klikk «+ Nytt nyhetsbrev» for å starte."
            : "Ingen utkast matcher filtrene."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => (
            <div
              key={d.id}
              className="p-4 bg-gray-900 border border-gray-800 rounded hover:border-gray-700 transition group"
            >
              <div className="flex items-start gap-3">
                {/* Badges */}
                <div className="flex flex-col gap-1 items-start min-w-[140px]">
                  {d.template_variant && (
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
                        VARIANT_COLOR[d.template_variant] ?? "bg-gray-700 text-gray-300"
                      }`}
                    >
                      {VARIANT_LABEL[d.template_variant] ?? d.template_variant}
                    </span>
                  )}
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
                      STATUS_COLOR[d.status]
                    }`}
                  >
                    {STATUS_LABEL[d.status]}
                  </span>
                </div>

                {/* Main info — clickable to open */}
                <Link
                  href={`/innleggsbygger/nyhetsbrev-bygger?draft=${d.id}`}
                  className="flex-1 min-w-0"
                >
                  <div className="text-white font-medium truncate">{d.title}</div>
                  {d.subject_line && (
                    <div className="text-sm text-orange-300 truncate mt-0.5">
                      📨 {d.subject_line}
                    </div>
                  )}
                  {d.heading_main && d.heading_main !== d.subject_line && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      H1: {d.heading_main}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-3 text-[11px] text-gray-500 mt-1.5">
                    <span>👤 {emailToName(d.owner_email)}</span>
                    <span title={formatDate(d.updated_at)}>
                      🕒 {formatRelative(d.updated_at)}
                    </span>
                    {d.supplier_count > 0 && (
                      <span>🤝 {d.supplier_count} leverandører</span>
                    )}
                    {d.product_count > 0 && (
                      <span>📦 {d.product_count} produkter</span>
                    )}
                  </div>
                </Link>

                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <Link
                    href={`/innleggsbygger/nyhetsbrev-bygger?draft=${d.id}`}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs font-medium"
                  >
                    Åpne
                  </Link>
                  {d.owner_email === currentUserEmail && (
                    <button
                      onClick={() => handleDelete(d.id, d.title)}
                      disabled={deletingId === d.id}
                      className="px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-300 rounded text-xs font-medium disabled:opacity-50"
                    >
                      {deletingId === d.id ? "Sletter…" : "Slett"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-[11px] text-gray-600 text-center">
        Viser {filtered.length} av {drafts.length} utkast.
        Auto-lagring kjører hvert 4. sekund i byggeren. Slett-knappen vises kun på dine egne utkast.
      </div>
    </div>
  );
}
