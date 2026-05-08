"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft,
  Printer,
  RefreshCw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  CalendarRange,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Megaphone,
  Shield,
  Telescope,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { WeeklyBriefResponse, WeeklyBriefMetric, WeeklyBriefChange } from "@/app/api/insights/weekly-brief/route";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

function DeltaPill({ delta, good }: { delta: number | null; good: boolean }) {
  if (delta === null) {
    return <span className="text-xs text-gray-500">—</span>;
  }
  const Icon = delta > 1 ? TrendingUp : delta < -1 ? TrendingDown : Minus;
  const color = good ? "text-emerald-400" : "text-red-400";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {delta > 0 ? "+" : ""}
      {delta}%
    </span>
  );
}

function MetricRow({ m }: { m: WeeklyBriefMetric }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-2 ${
        m.emphasis ? "border-b border-gray-800" : ""
      }`}
    >
      <div className="text-sm text-gray-300">{m.label}</div>
      <div className="flex items-baseline gap-3">
        <div className="text-xs text-gray-500">{m.previous}</div>
        <div className="text-gray-600 text-sm">→</div>
        <div className={`font-semibold tabular-nums ${m.emphasis ? "text-lg text-white" : "text-base text-gray-200"}`}>
          {m.current}
        </div>
        <div className="w-20 text-right">
          <DeltaPill delta={m.delta_pct} good={m.good} />
        </div>
      </div>
    </div>
  );
}

const changeIcon = (type: WeeklyBriefChange["type"]) => {
  switch (type) {
    case "negatives_applied":
      return Shield;
    case "anomaly_resolved":
      return CheckCircle2;
    case "new_mailchimp":
      return Mail;
    case "new_meta_post":
      return Megaphone;
    default:
      return AlertTriangle;
  }
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "short",
  });
}

export default function MandagsmoteBriefPage() {
  const { data, error, isLoading, mutate } = useSWR<WeeklyBriefResponse>(
    "/api/insights/weekly-brief",
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="p-6 text-gray-400">
        <RefreshCw className="w-5 h-5 inline animate-spin mr-2" /> Bygger møtebrief…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <p className="text-red-400">Kunne ikke laste møtebriefen.</p>
        <button
          onClick={() => mutate()}
          className="mt-3 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg"
        >
          Prøv igjen
        </button>
      </div>
    );
  }

  const generatedAt = new Date(data.generated_at).toLocaleString("nb-NO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-6 print:space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/mandagsmote"
            className="text-gray-400 hover:text-white inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Tilbake til mandagsmøte
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="px-3 py-2 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Oppdater
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 text-xs bg-amber-700 hover:bg-amber-600 text-white rounded-lg inline-flex items-center gap-1"
          >
            <Printer className="w-3 h-3" /> Skriv ut
          </button>
        </div>
      </div>

      {/* Title bar */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-amber-900/30 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Mandagsbrief</h1>
          <p className="text-xs text-gray-500">
            {fmtDate(data.period.from)} – {fmtDate(data.period.to)} · vs forrige uke (
            {fmtDate(data.period.prev_from)} – {fmtDate(data.period.prev_to)}) · generert {generatedAt}
          </p>
        </div>
      </div>

      {/* Headline */}
      <Card className="border-amber-700/50 bg-amber-950/20">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 mt-1 shrink-0" />
          <div>
            <h2 className="text-xs uppercase tracking-wide text-amber-400 font-semibold mb-1">
              Hovedbudskap
            </h2>
            <p className="text-lg leading-relaxed text-white">{data.headline}</p>
          </div>
        </div>
      </Card>

      {/* Tre kolonner: Endringer, Forvent, Tall */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Endringer denne uken */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Endringer siste 7 dager
            </h2>
          </div>
          {data.auto_changes.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Ingen automatisk detekterte endringer i systemet. Husk å nevne SEO/GTM/strategi-arbeid manuelt i
              møtet.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.auto_changes.map((c, i) => {
                const Icon = changeIcon(c.type);
                return (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-200">{c.text}</p>
                      {c.detail && <p className="text-xs text-gray-500 mt-0.5">{c.detail}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4 pt-3 border-t border-gray-800 text-xs text-gray-500">
            Auto-detekterte hendelser. Manuelle SEO/GTM/strategi-endringer må presenteres separat.
          </div>
        </Card>

        {/* Forvent framover */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Telescope className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Forvent framover
            </h2>
          </div>
          {data.forecast.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Ingen aktive forventninger denne uken.</p>
          ) : (
            <ul className="space-y-4">
              {data.forecast.map((f, i) => (
                <li key={i} className="border-l-2 border-sky-700/50 pl-3">
                  <div className="text-xs uppercase tracking-wide text-sky-400 font-semibold mb-1">
                    {f.horizon}
                  </div>
                  <p className="text-sm text-gray-200 leading-snug">{f.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Nøkkeltall — uke */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Ukenøkkeltall
          </h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          {fmtDate(data.period.from)}–{fmtDate(data.period.to)} vs {fmtDate(data.period.prev_from)}–
          {fmtDate(data.period.prev_to)}
        </p>
        <div className="space-y-1">
          {data.key_metrics.map((m, i) => (
            <MetricRow key={i} m={m} />
          ))}
        </div>
      </Card>

      {/* Nøkkeltall — 30d */}
      {data.monthly_metrics && data.monthly_period && (
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <CalendarRange className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              Månedstall (siste 30d vs forrige 30d)
            </h2>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            {fmtDate(data.monthly_period.from)}–{fmtDate(data.monthly_period.to)} vs{" "}
            {fmtDate(data.monthly_period.prev_from)}–{fmtDate(data.monthly_period.prev_to)} · gir trender
            forbi enkeltkjøp som hopper inn/ut av ukesvinduet
          </p>
          <div className="space-y-1">
            {data.monthly_metrics.map((m, i) => (
              <MetricRow key={i} m={m} />
            ))}
          </div>
        </Card>
      )}

      {/* Print-footer */}
      <div className="hidden print:block text-xs text-gray-500 mt-8">
        Generert {generatedAt} · Fosen Tools Analytics
      </div>
    </div>
  );
}
