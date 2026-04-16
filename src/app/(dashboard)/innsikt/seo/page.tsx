"use client";

import React, { Suspense, useState } from "react";
import {
  Search,
  Zap,
  Target,
  MousePointerClick,
  TrendingDown,
  TrendingUp,
  ScanSearch,
  Loader2,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle,
} from "lucide-react";
import type { PageAnalysisResponse } from "@/app/api/insights/seo/analyze/route";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useSEO } from "@/hooks/use-insights";
import { formatNumber, formatCompact } from "@/lib/utils/format";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";

type CategoryFilter = "all" | "quick_win" | "almost_page_one" | "low_ctr" | "declining" | "rising";

const CATEGORY_LABELS: Record<string, string> = {
  quick_win: "Quick win",
  almost_page_one: "Nesten side 1",
  low_ctr: "Lav CTR",
  declining: "Fallende",
  rising: "Stigende",
};

const CATEGORY_COLORS: Record<string, string> = {
  quick_win: "#34d399",
  almost_page_one: "#60a5fa",
  low_ctr: "#f59e0b",
  declining: "#ef4444",
  rising: "#22d3ee",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#6b7280",
};

const TABS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "quick_win", label: "Quick wins" },
  { key: "almost_page_one", label: "Nesten side 1" },
  { key: "low_ctr", label: "Lav CTR" },
  { key: "declining", label: "Fallende" },
  { key: "rising", label: "Stigende" },
];

const ISSUE_ICONS = {
  error: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
};
const ISSUE_COLORS = {
  error: "text-red-400",
  warning: "text-yellow-400",
  info: "text-blue-400",
};

function AnalysisPanel({ data, onClose }: { data: PageAnalysisResponse; onClose: () => void }) {
  return (
    <div className="py-3 pb-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
              data.score >= 70
                ? "bg-green-900/30 text-green-400"
                : data.score >= 40
                  ? "bg-yellow-900/30 text-yellow-400"
                  : "bg-red-900/30 text-red-400"
            }`}
          >
            {data.score}
          </div>
          <div>
            <p className="text-sm text-white font-medium">SEO-analyse for &quot;{data.query}&quot;</p>
            <p className="text-xs text-gray-500">{data.url}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-white">Lukk</button>
      </div>

      {/* Current elements summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-gray-800/50 rounded-lg p-2">
          <p className="text-gray-500">Title</p>
          <p className="text-gray-300 truncate">{data.elements.title || "Mangler"}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <p className="text-gray-500">H1</p>
          <p className="text-gray-300 truncate">{data.elements.h1[0] || "Mangler"}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <p className="text-gray-500">Ord</p>
          <p className="text-gray-300">{data.elements.word_count}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <p className="text-gray-500">Bilder</p>
          <p className="text-gray-300">{data.elements.image_count} ({data.elements.images_without_alt} uten alt)</p>
        </div>
      </div>

      {data.elements.meta_description && (
        <div className="bg-gray-800/50 rounded-lg p-2 text-xs">
          <p className="text-gray-500">Meta description ({data.elements.meta_description.length} tegn)</p>
          <p className="text-gray-300">{data.elements.meta_description}</p>
        </div>
      )}

      {/* Issues list */}
      <div className="space-y-2">
        {data.issues.map((issue, idx) => {
          const Icon = ISSUE_ICONS[issue.type];
          const color = ISSUE_COLORS[issue.type];
          return (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${color}`} />
              <div className="flex-1">
                <p className="text-gray-300">
                  <span className="font-medium text-white">{issue.element}:</span> {issue.message}
                </p>
                {issue.current && (
                  <p className="text-gray-500 mt-0.5">Nåværende: {issue.current}</p>
                )}
                <p className="text-green-400/80 mt-0.5 flex items-start gap-1">
                  <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {issue.suggestion}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {data.issues.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-green-400">
          <CheckCircle className="w-4 h-4" />
          Ingen vesentlige SEO-problemer funnet for dette søkeordet
        </div>
      )}
    </div>
  );
}

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading } = useSEO(dateRange);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, PageAnalysisResponse>>({});
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  const filtered =
    data?.opportunities.filter((o) => filter === "all" || o.category === filter) ?? [];

  async function analyzeRow(query: string, pageUrl: string, position: number) {
    if (analysis[query]) {
      setExpandedQuery(expandedQuery === query ? null : query);
      return;
    }
    setExpandedQuery(query);
    setAnalyzing(query);
    try {
      const res = await fetch(
        `/api/insights/seo/analyze?url=${encodeURIComponent(pageUrl)}&query=${encodeURIComponent(query)}&position=${position}`
      );
      const result = await res.json();
      if (!result.error) {
        setAnalysis((prev) => ({ ...prev, [query]: result }));
      }
    } finally {
      setAnalyzing(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center">
            <Search className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">SEO-muligheter</h1>
            <p className="text-xs text-gray-500">
              Søkeord der små forbedringer gir stor effekt
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
          {/* KPI Cards */}
          <MetricGrid>
            <MetricCard
              title="Quick wins"
              value={data.summary.quick_wins}
              icon={Zap}
              tooltip="Posisjon 8-20 med >100 visninger og klikk"
            />
            <MetricCard
              title="Nesten side 1"
              value={data.summary.almost_page_one}
              icon={Target}
              tooltip="Posisjon 5-15 med >50 visninger"
            />
            <MetricCard
              title="Lav CTR"
              value={data.summary.low_ctr}
              icon={MousePointerClick}
              tooltip="Topp 5-posisjon men CTR under forventet"
            />
            <MetricCard
              title="Fallende"
              value={data.summary.declining}
              icon={TrendingDown}
              tooltip="Posisjon forverret >2 plasser vs forrige periode"
            />
          </MetricGrid>

          {/* Position Distribution */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4">
              Posisjonsfordeling — {formatNumber(data.summary.total_keywords)} søkeord
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.position_distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis
                    dataKey="group"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={{ stroke: "#374151" }}
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={false}
                    width={40}
                  />
                  <RTooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#f3f4f6",
                    }}
                  />
                  <Bar dataKey="count" fill="#34d399" radius={[4, 4, 0, 0]} name="Søkeord" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const count =
                tab.key === "all"
                  ? data.opportunities.length
                  : data.opportunities.filter((o) => o.category === tab.key).length;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filter === tab.key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                  }`}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Opportunities Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="px-4 py-3 text-gray-400 font-medium">Søkeord</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Side</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Pos.</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Trend</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Klikk</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Visn.</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">CTR</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">Kategori</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Anbefaling</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 50).map((opp, i) => (
                    <React.Fragment key={`${opp.query}-${i}`}>
                    <tr className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">
                        {opp.query}
                      </td>
                      <td className="px-4 py-3 max-w-[180px] truncate">
                        {opp.page_url ? (
                          <a
                            href={opp.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                            title={opp.page_url}
                          >
                            {opp.page_url.replace(/^https?:\/\/(www\.)?fosen-tools\.no/, "")}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">{opp.position}</td>
                      <td className="px-4 py-3 text-right">
                        {opp.position_change !== 0 && (
                          <span
                            className={`flex items-center justify-end gap-1 text-xs font-medium ${
                              opp.position_change < 0 ? "text-green-400" : opp.position_change > 0 ? "text-red-400" : "text-gray-500"
                            }`}
                          >
                            {opp.position_change < 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {opp.position_change > 0 ? "+" : ""}
                            {opp.position_change}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">{formatCompact(opp.clicks)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{formatCompact(opp.impressions)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={opp.ctr_gap < 0 ? "text-yellow-400" : "text-gray-300"}>
                          {opp.ctr}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[opp.category]}20`,
                            color: CATEGORY_COLORS[opp.category],
                          }}
                        >
                          {CATEGORY_LABELS[opp.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[250px]">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: PRIORITY_COLORS[opp.priority] }}
                          />
                          {opp.suggestion}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {opp.page_url && (
                          <button
                            onClick={() => analyzeRow(opp.query, opp.page_url!, opp.position)}
                            disabled={analyzing === opp.query}
                            className="px-2 py-1 rounded text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-colors disabled:opacity-50"
                          >
                            {analyzing === opp.query ? (
                              <Loader2 className="w-3 h-3 animate-spin inline" />
                            ) : (
                              <ScanSearch className="w-3 h-3 inline" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedQuery === opp.query && analysis[opp.query] && (
                      <tr>
                        <td colSpan={10} className="px-4 py-0">
                          <AnalysisPanel data={analysis[opp.query]} onClose={() => setExpandedQuery(null)} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 border border-blue-900/40 bg-blue-950/10 text-xs text-blue-300/80">
            <p className="font-semibold mb-1">Om beregningene</p>
            <p>
              Posisjonsdata er fra Google Search Console. Trend sammenligner
              snittposisjon i valgt periode vs like lang forrige periode.
              Forventet CTR er basert på bransjegjennomsnitt per posisjon.
              Quick wins er søkeord der du allerede har synlighet men kan
              forbedre med relativt lite innsats.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

export default function SEOPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
