"use client";

import { Suspense, useState } from "react";
import {
  Rocket,
  Search,
  TrendingUp,
  Target,
  Award,
  Plus,
  X,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useGrowth } from "@/hooks/use-insights";
import { formatCompact, formatNumber } from "@/lib/utils/format";

type CategoryFilter = "all" | "not_ranking" | "low_rank" | "almost_page_one" | "ranking_well";

const CATEGORY_LABELS: Record<string, string> = {
  not_ranking: "Ikke rangerer",
  low_rank: "Lav posisjon",
  almost_page_one: "Nesten side 1",
  ranking_well: "Rangerer bra",
  brand_term: "Brand",
};

const CATEGORY_COLORS: Record<string, string> = {
  not_ranking: "#ef4444",
  low_rank: "#f59e0b",
  almost_page_one: "#60a5fa",
  ranking_well: "#34d399",
  brand_term: "#a78bfa",
};

const COMPETITION_COLORS: Record<string, string> = {
  LOW: "#34d399",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  UNSPECIFIED: "#6b7280",
};

const PRIORITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#6b7280",
};

const DEFAULT_SEEDS = [
  "verktøy",
  "verktøyvogn",
  "verktøykoffert",
  "pelicase",
  "industriverktøy",
  "snap-on",
  "milwaukee verktøy",
  "facom verktøy",
  "batteriverktøy",
  "momentnøkkel",
  "verktøysett",
  "verktøyskap",
];

const TABS: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "Alle" },
  { key: "not_ranking", label: "Ikke rangerer" },
  { key: "low_rank", label: "Lav posisjon" },
  { key: "almost_page_one", label: "Nesten side 1" },
  { key: "ranking_well", label: "Rangerer bra" },
];

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const [seeds, setSeeds] = useState<string[]>(DEFAULT_SEEDS);
  const [newSeed, setNewSeed] = useState("");
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [activeSeeds, setActiveSeeds] = useState<string[] | null>(DEFAULT_SEEDS);

  const { data, isLoading, mutate } = useGrowth(activeSeeds, dateRange);

  function addSeed() {
    const s = newSeed.trim().toLowerCase();
    if (s && !seeds.includes(s)) {
      setSeeds([...seeds, s]);
      setNewSeed("");
    }
  }

  function removeSeed(s: string) {
    setSeeds(seeds.filter((x) => x !== s));
  }

  function runAnalysis() {
    setActiveSeeds([...seeds]);
    mutate();
  }

  const filtered = data?.opportunities.filter(
    (o) => filter === "all" || o.category === filter
  ) ?? [];

  const statusError = data && !data.status?.available;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Vekstmuligheter</h1>
            <p className="text-xs text-gray-500">
              Relevante søkeord fra Keyword Planner — hvor kan Fosen Tools vokse?
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

      {/* Seeds input */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-medium text-gray-400">
              Seed-søkeord for Keyword Planner
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Frø-ord som Google bruker for å finne relaterte søk. Rediger for å utforske andre områder.
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Oppdater analyse
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {seeds.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-800 text-gray-300 rounded-md text-xs"
            >
              {s}
              <button
                onClick={() => removeSeed(s)}
                className="hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newSeed}
            onChange={(e) => setNewSeed(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSeed())}
            placeholder="Legg til seed (f.eks. 'borehammer')"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
          />
          <button
            onClick={addSeed}
            className="flex items-center gap-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Legg til
          </button>
        </div>
      </Card>

      {/* Status / Error */}
      {statusError && (
        <Card className="p-4 border border-red-500/40 bg-red-950/10">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-400 font-medium">Keyword Planner utilgjengelig</p>
              <p className="text-xs text-gray-400">{data?.status?.message}</p>
            </div>
          </div>
        </Card>
      )}

      {isLoading || !data ? (
        <MetricGrid loading />
      ) : (
        <>
          {/* KPI Cards */}
          <MetricGrid>
            <MetricCard
              title="Totalt relevante"
              value={data.summary.total_ideas}
              icon={Target}
              tooltip="Unike søkeord fra Keyword Planner med relevans for Fosen Tools"
            />
            <MetricCard
              title="Ikke rangerer"
              value={data.summary.not_ranking}
              icon={TrendingUp}
              tooltip="Relevante søkeord der vi ikke ranker i dag — åpne muligheter"
            />
            <MetricCard
              title="Nesten side 1"
              value={data.summary.almost_page_one}
              icon={Award}
              tooltip="Søkeord der vi er på posisjon 4-10 — løft dem opp"
            />
            <MetricCard
              title="Total volum"
              value={data.summary.total_potential_searches}
              icon={Search}
              tooltip="Sum av månedlige søk for alle relevante søkeord"
            />
          </MetricGrid>

          {/* Category tabs */}
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
                      ? "bg-purple-600 text-white"
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
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Volum/mnd</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">Konk.</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Nå pos.</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Klikk</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Pot. klikk/mnd</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">CPC (kr)</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">Kategori</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((opp, i) => (
                    <tr
                      key={`${opp.keyword}-${i}`}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30"
                    >
                      <td className="px-4 py-3 max-w-[250px] truncate">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: PRIORITY_COLORS[opp.priority] }}
                            title={`Prioritet: ${opp.priority}`}
                          />
                          <span className="text-white font-medium">{opp.keyword}</span>
                          {opp.current_page_url && (
                            <a
                              href={opp.current_page_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 ml-1"
                              title={opp.current_page_url}
                            >
                              ↗
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {formatCompact(opp.monthly_searches)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: `${COMPETITION_COLORS[opp.competition]}20`,
                            color: COMPETITION_COLORS[opp.competition],
                          }}
                        >
                          {opp.competition}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {opp.current_position !== null ? (
                          <span
                            className={
                              opp.current_position <= 3
                                ? "text-green-400"
                                : opp.current_position <= 10
                                  ? "text-blue-400"
                                  : opp.current_position <= 30
                                    ? "text-yellow-400"
                                    : "text-gray-500"
                            }
                          >
                            {opp.current_position}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {opp.current_clicks > 0 ? formatNumber(opp.current_clicks) : "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          opp.potential_score >= 200
                            ? "text-green-400"
                            : opp.potential_score >= 50
                              ? "text-blue-400"
                              : opp.potential_score > 0
                                ? "text-yellow-400"
                                : "text-gray-500"
                        }`}
                      >
                        {opp.potential_score > 0 ? `+${formatNumber(opp.potential_score)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400 text-xs">
                        {opp.low_bid_nok > 0
                          ? `${opp.low_bid_nok.toFixed(0)}–${opp.high_bid_nok.toFixed(0)}`
                          : "—"}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 border border-purple-900/40 bg-purple-950/10 text-xs text-purple-300/80">
            <p className="font-semibold mb-1">Om beregningene</p>
            <p>
              Vi henter søkeord-forslag fra Google Keyword Planner basert på
              Fosen Tools-relaterte frø-ord (seeds). Hvert forslag krysskobles
              med eksisterende Search Console-data for å finne hvor dere står i
              dag. <strong>Potensiell klikk/mnd</strong> = estimert ekstra trafikk
              hvis dere klatrer til topp 3, vektet etter relevans. Søkeord med
              høy prioritet (rød markør) er de med mest volum + høyest relevans.
              Konkurranse-verdi er fra Google Ads perspektiv — LOW betyr få
              annonsører byr, ikke nødvendigvis lett SEO.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

export default function VekstPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
