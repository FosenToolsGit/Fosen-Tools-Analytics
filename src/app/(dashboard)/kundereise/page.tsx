"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import {
  Route,
  Layers,
  ShoppingCart,
  GitMerge,
  Percent,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useCustomerJourney } from "@/hooks/use-customer-journey";
import { JourneySankey } from "@/components/dashboard/journey-sankey";
import { formatCompact, formatNumber } from "@/lib/utils/format";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  Line,
} from "recharts";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";

const CHANNEL_COLORS: Record<string, string> = {
  "Organic Search": "#34d399",
  Direct: "#60a5fa",
  "Paid Search": "#f97316",
  "Cross-network": "#f97316",
  Email: "#a78bfa",
  "Organic Social": "#ec4899",
  "Paid Social": "#f59e0b",
  Referral: "#14b8a6",
  Unassigned: "#6b7280",
};

const nok = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});

const FUNNEL_COLORS = [
  "#34d399",
  "#22d3ee",
  "#60a5fa",
  "#a78bfa",
  "#f59e0b",
  "#f97316",
];

function assistColor(pct: number): string {
  if (pct >= 80) return "text-green-400";
  if (pct >= 50) return "text-blue-400";
  if (pct >= 30) return "text-yellow-400";
  return "text-gray-400";
}

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading } = useCustomerJourney(dateRange);
  const sankeyContainerRef = useRef<HTMLDivElement>(null);
  const [sankeyWidth, setSankeyWidth] = useState(700);

  useEffect(() => {
    if (!sankeyContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSankeyWidth(entry.contentRect.width);
      }
    });
    observer.observe(sankeyContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const timelineData =
    data?.daily_timeline.dates.map((d) => {
      const flat: Record<string, number | string> = {
        date: format(parseISO(d.date), "d. MMM", { locale: nb }),
        conversions: d.conversions,
      };
      for (const [ch, val] of Object.entries(d.channels)) {
        flat[ch] = val;
      }
      return flat;
    }) ?? [];

  const timelineChannels = data
    ? Array.from(
        new Set(data.daily_timeline.dates.flatMap((d) => Object.keys(d.channels)))
      ).sort()
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
            <Route className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kundereise</h1>
            <p className="text-xs text-gray-500">
              Hvordan beveger kundene seg mellom kanaler og konverteringer?
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
              title="Flerkanalsdager"
              value={data.kpi.multi_channel_days}
              icon={Layers}
              tooltip="Dager der 3+ kanaler hadde sesjoner"
            />
            <MetricCard
              title="Kjøpsdager"
              value={data.kpi.total_conversion_days}
              icon={ShoppingCart}
              tooltip="Dager der minst ett kjøp ble registrert"
            />
            <MetricCard
              title="Snitt kanaler / kjøpsdag"
              value={data.kpi.avg_channels_per_conversion_day}
              icon={GitMerge}
              tooltip="Gjennomsnittlig antall aktive kanaler på dager med kjøp"
            />
            <MetricCard
              title="Flerkanalsandel"
              value={data.kpi.multi_channel_days_pct}
              format="percent"
              icon={Percent}
              tooltip="Andel av dager der 3+ kanaler var aktive"
            />
          </MetricGrid>

          {/* Sankey */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4">
              Kanal → Konvertering (Sankey)
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Proporsjonell fordeling av trafikk fra kanaler til konverteringssteg
            </p>
            <div ref={sankeyContainerRef} className="w-full overflow-hidden">
              <JourneySankey
                data={data.sankey}
                width={Math.max(400, sankeyWidth)}
                height={420}
              />
            </div>
          </Card>

          {/* Funnel */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4">
              Konverteringstrakt
            </h3>
            <div className="space-y-1">
              {data.funnel.stages.map((stage, i) => {
                const maxVal = data.funnel.stages[0]?.value || 1;
                const widthPct = Math.max(
                  8,
                  (stage.value / maxVal) * 100
                );
                return (
                  <div key={stage.name}>
                    {stage.dropoff_pct !== null && (
                      <div className="flex items-center gap-2 py-1 pl-4">
                        <ChevronDown className="w-3 h-3 text-gray-600" />
                        <span className="text-xs text-gray-500">
                          {stage.dropoff_pct}% falt av
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="w-28 sm:w-32 text-right text-sm text-gray-400 flex-shrink-0">
                        {stage.name}
                      </div>
                      <div className="flex-1 relative">
                        <div
                          className="h-10 rounded-lg flex items-center px-3 transition-all"
                          style={{
                            width: `${widthPct}%`,
                            backgroundColor:
                              FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                            opacity: 0.85,
                          }}
                        >
                          <span className="text-sm font-semibold text-white whitespace-nowrap">
                            {formatCompact(stage.value)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Two-column: Assist + Conversion rate */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Channel Assist */}
            <Card className="p-4 overflow-hidden">
              <h3 className="text-sm font-medium text-gray-400 mb-1">
                Kanal-assistanse
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                {data.channel_assist.no_purchase_days
                  ? "Ingen kjøpsdager i perioden"
                  : `Basert på ${data.channel_assist.purchase_day_count} kjøpsdager — hvor ofte var kanalen aktiv?`}
              </p>
              {!data.channel_assist.no_purchase_days && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-left">
                        <th className="pb-2 text-gray-400 font-medium">
                          Kanal
                        </th>
                        <th className="pb-2 text-right text-gray-400 font-medium">
                          Tilstede
                        </th>
                        <th className="pb-2 text-right text-gray-400 font-medium">
                          Snitt sesj.
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.channel_assist.matrix.map((row) => (
                        <tr
                          key={row.channel}
                          className="border-b border-gray-800/50"
                        >
                          <td className="py-2">
                            <span
                              className="inline-block w-2 h-2 rounded-full mr-2"
                              style={{
                                backgroundColor:
                                  CHANNEL_COLORS[row.channel] || "#6b7280",
                              }}
                            />
                            <span className="text-white">{row.channel}</span>
                          </td>
                          <td
                            className={`py-2 text-right font-medium ${assistColor(row.purchase_days_present_pct)}`}
                          >
                            {row.purchase_days_present_pct}%
                          </td>
                          <td className="py-2 text-right text-gray-300">
                            {row.avg_sessions_on_purchase_days}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Conversion Rate per Channel */}
            <Card className="p-4 overflow-hidden">
              <h3 className="text-sm font-medium text-gray-400 mb-1">
                Konverteringsrate per kanal
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Andel sesjoner som fører til konvertering (GA4)
              </p>
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
                        Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.kpi.conversion_rate_by_channel.map((row) => (
                      <tr
                        key={row.channel}
                        className="border-b border-gray-800/50"
                      >
                        <td className="py-2">
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-2"
                            style={{
                              backgroundColor:
                                CHANNEL_COLORS[row.channel] || "#6b7280",
                            }}
                          />
                          <span className="text-white">{row.channel}</span>
                        </td>
                        <td className="py-2 text-right text-gray-300">
                          {formatCompact(row.sessions)}
                        </td>
                        <td className="py-2 text-right text-gray-300">
                          {formatNumber(row.conversions)}
                        </td>
                        <td
                          className={`py-2 text-right font-medium ${
                            row.rate >= 5
                              ? "text-green-400"
                              : row.rate >= 2
                                ? "text-blue-400"
                                : row.rate >= 0.5
                                  ? "text-yellow-400"
                                  : "text-gray-400"
                          }`}
                        >
                          {row.rate.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Daily Timeline */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-1">
              Daglig tidslinje
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Sesjoner per kanal (stacked) + kjøp (linje)
            </p>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1f2937"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#374151" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <RTooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  {timelineChannels.map((ch) => (
                    <Area
                      key={ch}
                      type="monotone"
                      dataKey={ch}
                      stackId="1"
                      fill={CHANNEL_COLORS[ch] || "#6b7280"}
                      stroke={CHANNEL_COLORS[ch] || "#6b7280"}
                      fillOpacity={0.6}
                      strokeWidth={0}
                    />
                  ))}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="conversions"
                    name="Kjøp"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "#f43f5e" }}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Info */}
          <Card className="p-4 border border-blue-900/40 bg-blue-950/10 text-xs text-blue-300/80">
            <p className="font-semibold mb-1">Om datagrunnlaget</p>
            <p>
              Denne siden bruker aggregerte data fra GA4, Google Ads og
              Mailchimp. Sankey-diagrammet viser proporsjonell fordeling —
              ikke individuelle brukerreiser. Kanal-assistanse viser
              korrelasjon (hvilke kanaler var aktive på kjøpsdager), ikke
              direkte årsakssammenheng. For ekte multi-touch-attribusjon
              kreves BigQuery-eksport av GA4-data.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

export default function KundereisePage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
