"use client";

import { Suspense } from "react";
import {
  GitBranch,
  Coins,
  Users,
  Target,
  TrendingUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useAttribution } from "@/hooks/use-attribution";
import { formatCompact, formatNumber } from "@/lib/utils/format";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RTooltip,
  Legend,
} from "recharts";

const nok = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});
const pct = new Intl.NumberFormat("nb-NO", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const CHANNEL_COLORS: Record<string, string> = {
  "Organic Search": "#34d399",
  "Direct": "#60a5fa",
  "Paid Search": "#f97316",
  "Cross-network": "#f97316",
  "Email": "#a78bfa",
  "Organic Social": "#ec4899",
  "Paid Social": "#f59e0b",
  "Referral": "#14b8a6",
  "Unassigned": "#6b7280",
};

function colorFor(channel: string): string {
  return CHANNEL_COLORS[channel] || "#6b7280";
}

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading } = useAttribution(dateRange);

  const pieData = (data?.channels ?? [])
    .filter((c) => c.sessions > 0)
    .map((c) => ({
      name: c.channel,
      value: c.sessions,
      color: colorFor(c.channel),
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-900/30 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Attribusjon</h1>
            <p className="text-xs text-gray-500">
              Hvor kommer kundene fra, og hvilke kanaler er mest verdifulle?
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
          <MetricGrid>
            <MetricCard
              title="Total kostnad"
              value={data.total_cost_nok}
              format="currency"
              icon={Coins}
              tooltip="Total annonsekostnad i perioden (kun Google Ads så langt)"
            />
            <MetricCard
              title="Sesjoner"
              value={data.total_sessions}
              icon={Users}
              tooltip="Totalt antall sesjoner på tvers av alle kanaler (fra GA4)"
            />
            <MetricCard
              title="Konverteringer"
              value={data.total_conversions}
              icon={Target}
              tooltip="Totalt antall konverteringer rapportert i GA4"
            />
            <MetricCard
              title="Estimert verdi"
              value={data.total_estimated_value_nok}
              format="currency"
              icon={TrendingUp}
              tooltip="Estimert inntekt fra alle kanaler basert på purchase-events"
            />
          </MetricGrid>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie chart */}
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-4">
                Sesjons-fordeling per kanal
              </h3>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry: { percent?: number }) =>
                        entry.percent ? `${(entry.percent * 100).toFixed(0)}%` : ""
                      }
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={`cell-${i}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RTooltip
                      contentStyle={{
                        backgroundColor: "#111827",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Kanaldata */}
            <Card className="p-4 overflow-hidden">
              <h3 className="text-sm font-medium text-gray-400 mb-4">
                Per kanal — hovedtall
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="pb-2 text-gray-400 font-medium">Kanal</th>
                      <th className="pb-2 text-right text-gray-400 font-medium">
                        Sesjoner
                      </th>
                      <th className="pb-2 text-right text-gray-400 font-medium">
                        Konv.
                      </th>
                      <th className="pb-2 text-right text-gray-400 font-medium">
                        Est. verdi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.channels.map((c) => (
                      <tr key={c.channel} className="border-b border-gray-800/50">
                        <td className="py-2">
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-2"
                            style={{ backgroundColor: colorFor(c.channel) }}
                          />
                          <span className="text-white">{c.channel}</span>
                          {c.is_paid && (
                            <span className="ml-2 text-xs text-orange-400">
                              (betalt)
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right text-gray-300">
                          {formatCompact(c.sessions)}
                        </td>
                        <td className="py-2 text-right text-gray-300">
                          {formatNumber(c.conversions)}
                        </td>
                        <td className="py-2 text-right text-gray-300">
                          {c.estimated_value_nok > 0
                            ? nok.format(c.estimated_value_nok)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* ROAS per betalt kanal */}
          {data.channels.some((c) => c.is_paid && c.cost_nok > 0) && (
            <Card className="p-5">
              <h3 className="text-lg font-semibold mb-3">
                ROAS per betalt kanal
              </h3>
              <div className="space-y-3">
                {data.channels
                  .filter((c) => c.is_paid && c.cost_nok > 0)
                  .map((c) => (
                    <div
                      key={c.channel}
                      className="flex items-center justify-between p-3 border border-gray-800 rounded-lg"
                    >
                      <div>
                        <div className="text-white font-semibold">{c.channel}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {nok.format(c.cost_nok)} brukt → {nok.format(c.estimated_value_nok)}
                        </div>
                      </div>
                      <div
                        className={`text-2xl font-bold ${
                          c.roas >= 4
                            ? "text-green-400"
                            : c.roas >= 1.5
                              ? "text-blue-400"
                              : c.roas >= 0.5
                                ? "text-yellow-400"
                                : "text-red-400"
                        }`}
                      >
                        {c.roas.toFixed(2)}x
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* Topp kilder */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold">
                Topp 20 kilder (sesjoner)
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Detaljert breakdown: channel / source / medium fra Google Analytics
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="px-4 py-3 text-gray-400 font-medium">Kanal</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Kilde</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Medium</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">
                      Sesjoner
                    </th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">
                      Konv.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_sources.map((s, i) => (
                    <tr
                      key={`${s.channel}-${s.source}-${s.medium}-${i}`}
                      className="border-b border-gray-800/50"
                    >
                      <td className="px-4 py-3 text-gray-300">{s.channel}</td>
                      <td className="px-4 py-3 text-white">{s.source || "—"}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {s.medium || "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatCompact(s.sessions)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {formatNumber(s.conversions)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 border border-blue-900/40 bg-blue-950/10 text-xs text-blue-300/80">
            <p className="font-semibold mb-1">Om beregningene</p>
            <p>
              Sesjoner og konverteringer hentes fra Google Analytics sin
              traffic_sources-tabell. Verdi vises kun for kanaler med ekte
              sporingsdata: Paid Search og Cross-network bruker Google Ads
              purchase-verdier. For organiske kanaler (organic, direct, email,
              social) vises konverteringstall men ikke estimert verdi — GA4
              &quot;conversions&quot; inkluderer alle events, ikke bare kjøp.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

export default function AttributionPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
