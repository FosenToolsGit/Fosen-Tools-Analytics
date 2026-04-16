"use client";

import { Suspense } from "react";
import { Globe2, MapPin, Mail, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useGeoInsight } from "@/hooks/use-insights";
import { formatCompact, formatNumber } from "@/lib/utils/format";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
} from "recharts";
import dynamic from "next/dynamic";

const WorldMap = dynamic(() => import("react-svg-worldmap").then((m) => m.default), {
  ssr: false,
  loading: () => <div className="h-[300px] animate-pulse bg-gray-800 rounded-lg" />,
});

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading } = useGeoInsight(dateRange);

  const mapData =
    data?.countries
      .filter((c) => c.country_code && c.value_score > 0)
      .map((c) => ({
        country: c.country_code.toLowerCase() as never,
        value: c.value_score,
      })) ?? [];

  const barData =
    data?.countries.slice(0, 10).map((c) => ({
      name: c.country.length > 12 ? c.country.slice(0, 12) + "…" : c.country,
      "GA4 sesjoner": c.ga4_sessions,
      "MC åpninger": c.mailchimp_opens,
    })) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-900/30 flex items-center justify-center">
            <Globe2 className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Geo-intelligens</h1>
            <p className="text-xs text-gray-500">
              Kombinert geografisk innsikt fra GA4 og Mailchimp
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
              title="Land (GA4)"
              value={data.coverage.ga4_countries}
              icon={MapPin}
              tooltip="Antall unike land med trafikk i perioden"
            />
            <MetricCard
              title="Land (Mailchimp)"
              value={data.coverage.mailchimp_countries}
              icon={Mail}
              tooltip="Antall land med Mailchimp-åpninger"
            />
            <MetricCard
              title="Overlapp"
              value={data.coverage.overlap_countries}
              icon={Layers}
              tooltip="Land som finnes i begge datakildene"
            />
            <MetricCard
              title="Totalt land"
              value={data.countries.length}
              icon={Globe2}
              tooltip="Totalt antall unike land på tvers av kilder"
            />
          </MetricGrid>

          {/* World Map */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-4">
              Verdikart — vektet score per land
            </h3>
            <div className="flex justify-center">
              <WorldMap
                color="#22d3ee"
                size="responsive"
                data={mapData}
                backgroundColor="transparent"
                borderColor="#374151"
                tooltipBgColor="#111827"
                tooltipTextColor="#f3f4f6"
                valueSuffix=" poeng"
              />
            </div>
          </Card>

          {/* Two column: Bar chart + Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar chart comparison */}
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-4">
                GA4 vs Mailchimp — topp 10 land
              </h3>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1f2937"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      axisLine={{ stroke: "#374151" }}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      axisLine={false}
                      width={90}
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
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="GA4 sesjoner" fill="#F9AB00" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="MC åpninger" fill="#a78bfa" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Top regions table */}
            <Card className="p-4 overflow-hidden">
              <h3 className="text-sm font-medium text-gray-400 mb-4">
                Topp regioner etter verdi-score
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="pb-2 text-gray-400 font-medium">Land</th>
                      <th className="pb-2 text-right text-gray-400 font-medium">GA4</th>
                      <th className="pb-2 text-right text-gray-400 font-medium">MC</th>
                      <th className="pb-2 text-right text-gray-400 font-medium">Konv.</th>
                      <th className="pb-2 text-right text-gray-400 font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.countries.slice(0, 15).map((c) => (
                      <tr key={c.country_code} className="border-b border-gray-800/50">
                        <td className="py-2 text-white">{c.country}</td>
                        <td className="py-2 text-right text-gray-300">
                          {formatCompact(c.ga4_sessions)}
                        </td>
                        <td className="py-2 text-right text-gray-300">
                          {c.mailchimp_opens > 0 ? formatNumber(c.mailchimp_opens) : "—"}
                        </td>
                        <td className="py-2 text-right text-gray-300">
                          {c.estimated_conversions > 0 ? c.estimated_conversions.toFixed(1) : "—"}
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={`font-medium ${
                              c.value_score >= 7
                                ? "text-green-400"
                                : c.value_score >= 4
                                  ? "text-blue-400"
                                  : c.value_score >= 2
                                    ? "text-yellow-400"
                                    : "text-gray-400"
                            }`}
                          >
                            {c.value_score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card className="p-4 border border-blue-900/40 bg-blue-950/10 text-xs text-blue-300/80">
            <p className="font-semibold mb-1">Om verdi-score</p>
            <p>
              Score beregnes som vektet sum: GA4 sesjoner (40%), Mailchimp
              åpninger (30%) og estimerte konverteringer (30%). Konverteringer
              estimeres proporsjonalt etter sessjonsandel. Nyttig for å
              identifisere regioner med både trafikk og engasjement.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

export default function GeoInnsiktPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
