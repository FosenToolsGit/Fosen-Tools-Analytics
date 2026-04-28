"use client";

import { Suspense, useState } from "react";
import {
  Mail,
  Sparkles,
  Lightbulb,
  TrendingUp,
  MousePointerClick,
  Calendar as CalendarIcon,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useNewsletterBuilder } from "@/hooks/use-innleggsbygger";
import { formatNumber } from "@/lib/utils/format";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 rounded transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-green-400" /> Kopiert
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" /> Kopier
        </>
      )}
    </button>
  );
}

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading } = useNewsletterBuilder(dateRange);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-900/30 flex items-center justify-center">
            <Mail className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Innleggsbygger — Nyhetsbrev</h1>
            <p className="text-xs text-gray-500">
              Emne-forslag og temaer basert på hvilke Mailchimp-kampanjer som har fungert best
            </p>
          </div>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          activePreset={preset}
          onPresetChange={setPreset}
          onCustomRange={setCustomRange}
        />
      </div>

      {isLoading || !data ? (
        <MetricGrid loading />
      ) : (
        <>
          {/* KPI */}
          <MetricGrid>
            <MetricCard
              title="Kampanjer analysert"
              value={data.summary.campaigns_analyzed}
              icon={FileText}
            />
            <MetricCard
              title="Snitt åpningsrate"
              value={data.summary.avg_open_rate}
              format="percent"
              icon={Eye}
            />
            <MetricCard
              title="Snitt klikkrate"
              value={data.summary.avg_click_rate}
              format="percent"
              icon={MousePointerClick}
            />
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-400">Beste sendedag</span>
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </div>
              <span className="text-2xl sm:text-3xl font-bold text-white">
                {data.summary.best_day ?? "—"}
              </span>
            </Card>
          </MetricGrid>

          {/* Subject-mønstre */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold">Hva fungerer i emne-linja</h2>
            </div>
            {data.patterns.length === 0 ? (
              <p className="text-sm text-gray-500">
                Ikke nok data ennå. Trenger flere Mailchimp-kampanjer i perioden.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-2 py-2 text-gray-400 font-medium">Mønster</th>
                      <th className="px-2 py-2 text-right text-gray-400 font-medium">
                        Åpningsrate
                      </th>
                      <th className="px-2 py-2 text-right text-gray-400 font-medium">
                        Lift
                      </th>
                      <th className="px-2 py-2 text-right text-gray-400 font-medium">
                        Treff
                      </th>
                      <th className="px-2 py-2 text-gray-400 font-medium">Eksempel</th>
                      <th className="px-2 py-2 text-gray-400 font-medium">Anbefaling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.patterns.map((p) => (
                      <tr key={p.label} className="border-b border-gray-800/50">
                        <td className="px-2 py-2 text-white font-medium">{p.label}</td>
                        <td className="px-2 py-2 text-right text-white">
                          {p.avg_open_rate}%
                        </td>
                        <td className="px-2 py-2 text-right">
                          <span
                            className={
                              p.lift_pct > 0
                                ? "text-green-400 font-semibold"
                                : "text-red-400"
                            }
                          >
                            {p.lift_pct > 0 ? "+" : ""}
                            {p.lift_pct}%
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right text-gray-400">
                          {p.matches}
                        </td>
                        <td className="px-2 py-2 text-gray-500 max-w-[240px] truncate text-xs italic">
                          {p.example ?? "—"}
                        </td>
                        <td className="px-2 py-2 text-gray-300 text-xs">
                          {p.recommendation}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Topp-emner */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold">Dine topp 5 emne-linjer</h2>
            </div>
            {data.top_subjects.length === 0 ? (
              <p className="text-sm text-gray-500">Ingen kampanjer i perioden.</p>
            ) : (
              <div className="space-y-2">
                {data.top_subjects.map((s, i) => (
                  <div
                    key={i}
                    className="p-3 bg-gray-800/40 rounded-lg border border-gray-800"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-xs text-gray-500">
                        #{i + 1} · {s.sent_at}
                      </span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-yellow-400">
                          {s.open_rate}% åpnet
                        </span>
                        <span className="text-gray-600">·</span>
                        <span className="text-blue-400">{s.click_rate}% klikk</span>
                        <span className="text-gray-600">·</span>
                        <span className="text-gray-400">
                          {formatNumber(s.sent_to)} sendt
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-white font-medium">{s.subject}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Topp-lenker */}
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <MousePointerClick className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold">Hva abonnentene klikker mest på</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Bruk dette som input til nye nyhetsbrev — abonnentene har allerede
              vist interesse.
            </p>
            {data.top_links.length === 0 ? (
              <p className="text-sm text-gray-500">Ingen klikk-data i perioden.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-2 py-2 text-gray-400 font-medium">Tema</th>
                      <th className="px-2 py-2 text-gray-400 font-medium">URL</th>
                      <th className="px-2 py-2 text-right text-gray-400 font-medium">
                        Klikk
                      </th>
                      <th className="px-2 py-2 text-right text-gray-400 font-medium">
                        Unike
                      </th>
                      <th className="px-2 py-2 text-right text-gray-400 font-medium">
                        Kampanjer
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_links.map((l, i) => (
                      <tr key={i} className="border-b border-gray-800/50">
                        <td className="px-2 py-2 text-white font-medium capitalize">
                          {l.derived_topic}
                        </td>
                        <td className="px-2 py-2 max-w-[300px]">
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 truncate"
                          >
                            {l.url}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </td>
                        <td className="px-2 py-2 text-right text-white">
                          {formatNumber(l.total_clicks)}
                        </td>
                        <td className="px-2 py-2 text-right text-gray-400">
                          {formatNumber(l.unique_clicks)}
                        </td>
                        <td className="px-2 py-2 text-right text-gray-400">
                          {l.campaigns_count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Nyhetsbrev-temaer */}
          <Card>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold">Foreslåtte nyhetsbrev</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Temaer valgt ut fra hva abonnentene faktisk har klikket på tidligere.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.topics.map((t, i) => (
                <div
                  key={i}
                  className="p-4 bg-gray-800/40 rounded-lg border border-gray-800 space-y-3"
                >
                  <h3 className="text-base font-semibold text-white capitalize">
                    {t.topic}
                  </h3>

                  <div>
                    <p className="text-xs text-yellow-400 font-medium mb-1">
                      Emne-varianter:
                    </p>
                    <div className="space-y-1.5">
                      {t.subject_line_options.map((opt, oi) => (
                        <div
                          key={oi}
                          className="flex items-start justify-between gap-2 p-2 bg-gray-900/50 rounded text-xs"
                        >
                          <span className="text-gray-200 flex-1">{opt}</span>
                          <CopyButton text={opt} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-yellow-400 font-medium mb-1">
                      Preheader:
                    </p>
                    <div className="flex items-start justify-between gap-2 p-2 bg-gray-900/50 rounded text-xs">
                      <span className="text-gray-300 flex-1">{t.preview_text}</span>
                      <CopyButton text={t.preview_text} />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-yellow-400 font-medium mb-1">
                      Innholdsskisse:
                    </p>
                    <ul className="text-xs text-gray-400 space-y-0.5 list-decimal list-inside">
                      {t.outline.map((o, oi) => (
                        <li key={oi}>{o}</li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-xs text-gray-600 italic border-t border-gray-800 pt-2">
                    {t.rationale}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 border border-yellow-900/40 bg-yellow-950/10 text-xs text-yellow-300/80">
            <Lightbulb className="w-4 h-4 inline mr-1" />
            <span className="font-semibold">Hvordan dette fungerer:</span> Vi
            analyserer emne-linjer fra Mailchimp-kampanjer og finner mønstre som
            korrelerer med høyere åpningsrate. Nyhetsbrev-temaene bygges fra de
            mest klikkede lenkene i eksisterende kampanjer — det er produktene
            abonnentene allerede viser interesse for.
          </Card>
        </>
      )}
    </div>
  );
}

export default function InnleggsbyggerNyhetsbrevPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
