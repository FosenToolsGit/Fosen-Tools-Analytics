"use client";

import { Suspense, useState, useEffect } from "react";
import { Calculator, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useGoogleAdsAnalysis } from "@/hooks/use-google-ads-analysis";
import { formatNumber } from "@/lib/utils/format";

const nok = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});

interface SimRow {
  campaign_id: string;
  campaign_name: string;
  current_cost: number;
  current_roas: number;
  current_value: number;
  current_purchases: number;
  pct: number;
  new_cost: number;
  projected_value: number;
  projected_purchases: number;
}

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading } = useGoogleAdsAnalysis(dateRange);

  const campaigns = (data?.campaigns ?? []).filter((c) => c.cost_nok > 0);
  const currentTotal = campaigns.reduce((s, c) => s + c.cost_nok, 0);

  const [totalBudget, setTotalBudget] = useState(0);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  useEffect(() => {
    if (currentTotal > 0 && totalBudget === 0) {
      setTotalBudget(Math.round(currentTotal));
      const allocs: Record<string, number> = {};
      for (const c of campaigns) {
        allocs[c.campaign_id] = Math.round((c.cost_nok / currentTotal) * 100);
      }
      setAllocations(allocs);
    }
  }, [currentTotal, campaigns, totalBudget]);

  const totalPct = Object.values(allocations).reduce((s, v) => s + v, 0);

  const simRows: SimRow[] = campaigns.map((c) => {
    const pct = allocations[c.campaign_id] || 0;
    const newCost = (totalBudget * pct) / 100;
    const roas = c.cost_nok > 0 ? c.real_purchase_value / c.cost_nok : 0;
    const projectedValue = newCost * roas;
    const projectedPurchases =
      c.cost_nok > 0 ? (newCost / c.cost_nok) * c.real_purchases : 0;

    return {
      campaign_id: c.campaign_id,
      campaign_name: c.campaign_name,
      current_cost: c.cost_nok,
      current_roas: roas,
      current_value: c.real_purchase_value,
      current_purchases: c.real_purchases,
      pct,
      new_cost: newCost,
      projected_value: projectedValue,
      projected_purchases: projectedPurchases,
    };
  });

  const currentTotalValue = simRows.reduce((s, r) => s + r.current_value, 0);
  const projectedTotalValue = simRows.reduce((s, r) => s + r.projected_value, 0);
  const valueDelta = projectedTotalValue - currentTotalValue;

  function autoOptimize() {
    const totalRoas = campaigns.reduce((s, c) => {
      const roas = c.cost_nok > 0 ? c.real_purchase_value / c.cost_nok : 0;
      return s + roas;
    }, 0);
    if (totalRoas === 0) return;

    const allocs: Record<string, number> = {};
    let remaining = 100;
    const sorted = [...campaigns].sort((a, b) => {
      const roasA = a.cost_nok > 0 ? a.real_purchase_value / a.cost_nok : 0;
      const roasB = b.cost_nok > 0 ? b.real_purchase_value / b.cost_nok : 0;
      return roasB - roasA;
    });

    for (let i = 0; i < sorted.length; i++) {
      const c = sorted[i];
      const roas = c.cost_nok > 0 ? c.real_purchase_value / c.cost_nok : 0;
      const share = Math.round((roas / totalRoas) * 100);
      const alloc = i === sorted.length - 1 ? remaining : Math.min(share, remaining);
      allocs[c.campaign_id] = alloc;
      remaining -= alloc;
    }
    setAllocations(allocs);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-900/30 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Budsjett-simulator</h1>
            <p className="text-xs text-gray-500">
              Simuler omfordeling av Google Ads-budsjettet basert på historisk ROAS
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
      ) : campaigns.length === 0 ? (
        <Card className="p-6 text-center text-gray-400">
          Ingen kampanjer med kostnad i perioden
        </Card>
      ) : (
        <>
          {/* Comparison cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-xs text-gray-400 mb-1">Nåværende verdi</p>
              <p className="text-xl font-bold text-white">{nok.format(currentTotalValue)}</p>
              <p className="text-xs text-gray-500">Basert på {nok.format(currentTotal)} spend</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-gray-400 mb-1">Simulert verdi</p>
              <p className="text-xl font-bold text-cyan-400">{nok.format(projectedTotalValue)}</p>
              <p className="text-xs text-gray-500">Basert på {nok.format(totalBudget)} spend</p>
            </Card>
            <Card
              className={`p-4 border ${
                valueDelta > 0
                  ? "border-green-500/40 bg-green-950/10"
                  : valueDelta < 0
                    ? "border-red-500/40 bg-red-950/10"
                    : "border-gray-700"
              }`}
            >
              <p className="text-xs text-gray-400 mb-1">Endring</p>
              <div className="flex items-center gap-2">
                {valueDelta > 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-400" />
                ) : valueDelta < 0 ? (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                ) : null}
                <p
                  className={`text-xl font-bold ${
                    valueDelta > 0 ? "text-green-400" : valueDelta < 0 ? "text-red-400" : "text-gray-400"
                  }`}
                >
                  {valueDelta > 0 ? "+" : ""}
                  {nok.format(valueDelta)}
                </p>
              </div>
            </Card>
          </div>

          {/* Budget input + auto-optimize */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Totalt budsjett</h3>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(Number(e.target.value) || 0)}
                    className="w-40 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-sm text-gray-400">NOK</span>
                </div>
              </div>
              <button
                onClick={autoOptimize}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Optimaliser automatisk
              </button>
            </div>

            {totalPct !== 100 && (
              <p className="text-xs text-yellow-400 mb-3">
                Total fordeling: {totalPct}% (bør være 100%)
              </p>
            )}

            {/* Sliders per campaign */}
            <div className="space-y-4">
              {simRows.map((row) => (
                <div key={row.campaign_id} className="border border-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-white text-sm font-medium">{row.campaign_name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ROAS: {row.current_roas.toFixed(1)}x
                      </span>
                    </div>
                    <span className="text-sm text-cyan-400 font-medium">
                      {nok.format(row.new_cost)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={row.pct}
                      onChange={(e) =>
                        setAllocations((prev) => ({
                          ...prev,
                          [row.campaign_id]: Number(e.target.value),
                        }))
                      }
                      className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <span className="text-sm text-gray-300 w-12 text-right">{row.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Projection table */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold">Projeksjon per kampanje</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="px-4 py-3 text-gray-400 font-medium">Kampanje</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Nå spend</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Ny spend</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">ROAS</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Nå verdi</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Proj. verdi</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Proj. kjøp</th>
                  </tr>
                </thead>
                <tbody>
                  {simRows.map((row) => (
                    <tr key={row.campaign_id} className="border-b border-gray-800/50">
                      <td className="px-4 py-3 text-white">{row.campaign_name}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{nok.format(row.current_cost)}</td>
                      <td className="px-4 py-3 text-right text-cyan-400">{nok.format(row.new_cost)}</td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          row.current_roas >= 4
                            ? "text-green-400"
                            : row.current_roas >= 1.5
                              ? "text-blue-400"
                              : "text-yellow-400"
                        }`}
                      >
                        {row.current_roas.toFixed(1)}x
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">{nok.format(row.current_value)}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {nok.format(row.projected_value)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {row.projected_purchases.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 border border-blue-900/40 bg-blue-950/10 text-xs text-blue-300/80">
            <p className="font-semibold mb-1">Om simuleringen</p>
            <p>
              Projeksjoner bruker historisk ROAS per kampanje og antar lineær
              skalering. I virkeligheten kan økt spend gi lavere marginal-ROAS
              (diminishing returns). Bruk som retningsgivende, ikke som fasit.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

export default function BudsjettPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
