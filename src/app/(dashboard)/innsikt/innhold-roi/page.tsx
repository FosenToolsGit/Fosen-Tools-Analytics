"use client";

import { Suspense } from "react";
import { BarChart3, FileText, Calendar, Award, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useContentROI } from "@/hooks/use-insights";
import { formatNumber } from "@/lib/utils/format";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Cell,
} from "recharts";

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#1877F2",
  mailchimp: "#FFE01B",
  ga4: "#F9AB00",
  linkedin: "#0A66C2",
};

const ROI_COLORS: Record<string, string> = {
  high: "#34d399",
  medium: "#60a5fa",
  low: "#f59e0b",
  none: "#6b7280",
};

const ROI_LABELS: Record<string, string> = {
  high: "Høy",
  medium: "Middels",
  low: "Lav",
  none: "Ingen",
};

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading } = useContentROI(dateRange);

  const scatterData =
    data?.posts.map((p) => ({
      x: p.engagement.likes + p.engagement.comments + p.engagement.shares + p.engagement.clicks,
      y: p.traffic_lift_pct,
      name: p.title.length > 40 ? p.title.slice(0, 40) + "…" : p.title,
      platform: p.platform,
      roi: p.roi_score,
    })) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Innholds-ROI</h1>
            <p className="text-xs text-gray-500">
              Hvilke poster og kampanjer driver trafikk?
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
              title="Totalt innhold"
              value={data.summary.total_posts}
              icon={FileText}
              tooltip="Antall poster/kampanjer i perioden"
            />
            <MetricCard
              title="Høy ROI"
              value={data.summary.high_roi_count}
              icon={Award}
              tooltip="Poster med 20%+ trafikkløft"
            />
            <MetricCard
              title="Beste plattform"
              value={0}
              icon={Zap}
              tooltip={`${data.summary.best_platform} gir best snitt-løft`}
            />
            <MetricCard
              title="Beste dag"
              value={0}
              icon={Calendar}
              tooltip={`${data.summary.best_day_of_week} gir best snitt-løft`}
            />
          </MetricGrid>

          {/* Override the 0-value cards with custom display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 -mt-6">
            <div />
            <div />
            <Card className="p-4">
              <p className="text-xs text-gray-400 mb-1">Beste plattform</p>
              <p className="text-2xl font-bold text-white">{data.summary.best_platform}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-gray-400 mb-1">Beste dag</p>
              <p className="text-2xl font-bold text-white">{data.summary.best_day_of_week}</p>
            </Card>
          </div>

          {/* Scatter Plot */}
          {scatterData.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-1">
                Engasjement vs trafikkløft
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Poster med høy engasjement OG høy trafikkløft er mest verdifulle
              </p>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1f2937"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="x"
                      name="Engasjement"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      axisLine={{ stroke: "#374151" }}
                      label={{ value: "Engasjement", position: "bottom", fill: "#6b7280", fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="y"
                      name="Trafikkløft %"
                      tick={{ fill: "#9ca3af", fontSize: 11 }}
                      axisLine={false}
                      label={{ value: "Trafikkløft %", angle: -90, position: "insideLeft", fill: "#6b7280", fontSize: 11 }}
                    />
                    <RTooltip
                      contentStyle={{
                        backgroundColor: "#111827",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#f3f4f6",
                      }}
                      formatter={(value, name) => {
                        if (name === "Engasjement") return [formatNumber(Number(value)), String(name)];
                        return [`${value}%`, String(name)];
                      }}
                      labelFormatter={(_, payload) => {
                        const item = payload?.[0]?.payload;
                        return item?.name || "";
                      }}
                    />
                    <Scatter data={scatterData}>
                      {scatterData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={PLATFORM_COLORS[entry.platform] || "#6b7280"}
                          fillOpacity={0.8}
                          r={6}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-2 justify-center">
                {Object.entries(PLATFORM_COLORS).map(([key, color]) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    {key === "meta" ? "Meta" : key === "mailchimp" ? "Mailchimp" : key === "ga4" ? "GA4" : key}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ROI Table */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold">Alle poster — sortert etter trafikkeffekt</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left">
                    <th className="px-4 py-3 text-gray-400 font-medium">Post</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Plattform</th>
                    <th className="px-4 py-3 text-gray-400 font-medium">Dato</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Engasj.</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Før</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Etter</th>
                    <th className="px-4 py-3 text-right text-gray-400 font-medium">Løft</th>
                    <th className="px-4 py-3 text-center text-gray-400 font-medium">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {data.posts.slice(0, 30).map((post) => {
                    const totalEng =
                      post.engagement.likes +
                      post.engagement.comments +
                      post.engagement.shares +
                      post.engagement.clicks;
                    return (
                      <tr key={post.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-3 text-white max-w-[250px] truncate">
                          {post.title}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${PLATFORM_COLORS[post.platform] || "#6b7280"}20`,
                              color: PLATFORM_COLORS[post.platform] || "#6b7280",
                            }}
                          >
                            {post.platform}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{post.published_at}</td>
                        <td className="px-4 py-3 text-right text-gray-300">{formatNumber(totalEng)}</td>
                        <td className="px-4 py-3 text-right text-gray-400">{post.traffic_before}</td>
                        <td className="px-4 py-3 text-right text-gray-300">{post.traffic_after}</td>
                        <td
                          className={`px-4 py-3 text-right font-medium ${
                            post.traffic_lift_pct > 10
                              ? "text-green-400"
                              : post.traffic_lift_pct > 0
                                ? "text-blue-400"
                                : post.traffic_lift_pct < -10
                                  ? "text-red-400"
                                  : "text-gray-400"
                          }`}
                        >
                          {post.traffic_lift_pct > 0 ? "+" : ""}
                          {post.traffic_lift_pct}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: `${ROI_COLORS[post.roi_score]}20`,
                              color: ROI_COLORS[post.roi_score],
                            }}
                          >
                            {ROI_LABELS[post.roi_score]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 border border-blue-900/40 bg-blue-950/10 text-xs text-blue-300/80">
            <p className="font-semibold mb-1">Om beregningene</p>
            <p>
              Trafikkløft beregnes som endring i snitt daglige sesjoner (GA4) 3
              dager etter publisering vs 3 dager før. Dette er korrelasjon, ikke
              direkte kausalitet — andre faktorer kan påvirke trafikken.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

export default function InnholdROIPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
