"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  KATEGORI_LABEL,
  FORMAT_LABEL,
  type IdeTemplate,
  type IdeFormat,
  type IdeKategori,
  type InnleggsmalerPrefill,
} from "@/lib/services/ide-engine";

/**
 * 💡 Idéer i dag — daglig SoMe-feed basert på markedsanalysen
 *
 * Henter 5-7 forslag fra /api/innleggsbygger/ide-feed.
 * Hvert forslag har: kategori, format, caption-skisse, markedsdata-
 * kontekst og knapper som åpner riktig verktøy (Innleggsmaler /
 * Innholdsmotor / Remotion).
 *
 * Bruker dato som seed slik at hele teamet ser samme forslag samme dag.
 */

const KATEGORI_COLOR: Record<IdeKategori, string> = {
  "hdfi-skreddersom": "bg-red-700/30 text-red-200 border-red-700",
  "aviation-forsvar": "bg-blue-700/30 text-blue-200 border-blue-700",
  "ft-custom": "bg-orange-700/30 text-orange-200 border-orange-700",
  containere: "bg-yellow-700/30 text-yellow-200 border-yellow-700",
  innredning: "bg-emerald-700/30 text-emerald-200 border-emerald-700",
  "pelican-kofferter": "bg-cyan-700/30 text-cyan-200 border-cyan-700",
  "premium-merker": "bg-purple-700/30 text-purple-200 border-purple-700",
  batteriverktoy: "bg-rose-700/30 text-rose-200 border-rose-700",
  "bedrift-historie": "bg-amber-700/30 text-amber-200 border-amber-700",
  "team-portrett": "bg-sky-700/30 text-sky-200 border-sky-700",
  "produkt-spotlight": "bg-pink-700/30 text-pink-200 border-pink-700",
  "kunde-leveranse": "bg-green-700/30 text-green-200 border-green-700",
  miljofyrtarn: "bg-lime-700/30 text-lime-200 border-lime-700",
  "messe-event": "bg-fuchsia-700/30 text-fuchsia-200 border-fuchsia-700",
};

const FORMAT_COLOR: Record<IdeFormat, string> = {
  bilde: "bg-gray-700 text-gray-200",
  reel: "bg-purple-700/40 text-purple-200",
  karusell: "bg-indigo-700/40 text-indigo-200",
  story: "bg-pink-700/40 text-pink-200",
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("nb-NO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function IdeerPage() {
  const router = useRouter();
  const [ideas, setIdeas] = useState<IdeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/innleggsbygger/ide-feed?date=${date}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setIdeas(Array.isArray(json.ideas) ? json.ideas : []);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ukjent feil");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [date]);

  function copyCaption(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }

  /** Send prefill til Innleggsmaler via sessionStorage og naviger dit. */
  function genererInnleggsmaler(prefill: InnleggsmalerPrefill) {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(
        "innleggsmaler:prefill",
        JSON.stringify(prefill)
      );
    } catch {
      // ignore — fallback til vanlig navigering
    }
    router.push("/innleggsbygger/maler");
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">💡 Idéer i dag</h1>
          <p className="text-sm text-gray-400 mt-1">
            Forslag basert på markedsanalysen, caption-mønstre og dag-i-uka.
            Samme forslag for hele teamet i dag.
          </p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-700 text-white rounded text-sm"
        />
      </div>

      <div className="mb-6 text-sm text-gray-400">
        Forslag for <span className="text-white font-medium">{formatDate(date)}</span>
      </div>

      {/* Strategi-bar (alltid synlig som påminnelse) */}
      <div className="mb-6 p-3 bg-gray-900/60 border border-gray-800 rounded text-[11px] text-gray-400">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>📊 <strong className="text-white">Caption-mønstre:</strong></span>
          <span>«skreddersydd/HDFI/CADLAB» = <span className="text-red-400">+144%</span></span>
          <span>Emoji-start = <span className="text-red-400">+93%</span></span>
          <span>«Levert til X» = <span className="text-red-400">+38%</span></span>
          <span>Tor/fre kl 12:00 = beste tid</span>
          <span>Over 280 tegn = <span className="text-orange-300">−44%</span></span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/30 border border-red-800 text-red-300 rounded mb-4">
          Kunne ikke laste idéer: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Laster forslag…</div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="p-5 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition"
            >
              {/* Top row: badges + tittel */}
              <div className="flex items-start gap-3 mb-3">
                <div className="text-3xl flex-shrink-0">{idea.emoji}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white">{idea.tittel}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono border ${KATEGORI_COLOR[idea.kategori]}`}
                    >
                      {KATEGORI_LABEL[idea.kategori]}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-mono ${FORMAT_COLOR[idea.format]}`}
                    >
                      {FORMAT_LABEL[idea.format]}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vinkling */}
              <p className="text-sm text-gray-300 mb-3">{idea.vinkling}</p>

              {/* Caption-skisse */}
              <div className="mb-3 p-3 bg-gray-950 border border-gray-800 rounded">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                      📝 Caption-skisse
                    </div>
                    <div className="text-sm text-orange-200 font-medium italic">
                      {idea.caption_skisse}
                    </div>
                  </div>
                  <button
                    onClick={() => copyCaption(idea.caption_skisse)}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded transition"
                  >
                    Kopiér
                  </button>
                </div>
              </div>

              {/* Markedsdata + trenger */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                    📊 Hvorfor denne idéen
                  </div>
                  <div className="text-gray-400">{idea.markedsdata}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                    🛠️ Trenger
                  </div>
                  <div className="text-gray-400">{idea.trenger}</div>
                </div>
              </div>

              {/* Destinasjoner */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-800">
                {idea.innleggsmaler_prefill && (
                  <button
                    onClick={() => genererInnleggsmaler(idea.innleggsmaler_prefill!)}
                    className="text-xs px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium transition flex items-center gap-1.5"
                  >
                    ⚡ Generér nå →
                  </button>
                )}
                {idea.destinasjoner.map((dest, i) => (
                  <Link
                    key={`${idea.id}-dest-${i}`}
                    href={dest.href}
                    className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition"
                  >
                    {dest.label} →
                  </Link>
                ))}
                {!idea.innleggsmaler_prefill && idea.destinasjoner.length === 0 && (
                  <Link
                    href="/innleggsbygger/maler"
                    className="text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition"
                  >
                    Åpne Innleggsmaler →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-[11px] text-gray-600 text-center">
        Forslagene er deterministiske — alle på teamet ser samme 5-7 idéer
        samme dag. I morgen får du nye.
      </div>
    </div>
  );
}
