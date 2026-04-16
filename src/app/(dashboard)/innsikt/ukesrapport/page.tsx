"use client";

import { Suspense } from "react";
import {
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertOctagon,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useScoreboard } from "@/hooks/use-insights";
import { formatCompact, formatNumber } from "@/lib/utils/format";

const nok = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});

const PLATFORM_COLORS: Record<string, string> = {
  "Google Analytics": "#F9AB00",
  Meta: "#1877F2",
  Mailchimp: "#FFE01B",
  "Google Ads": "#f97316",
};

function statusBorder(status: "up" | "down" | "flat"): string {
  if (status === "up") return "border-green-500/50";
  if (status === "down") return "border-red-500/50";
  return "border-gray-700";
}

function statusBg(status: "up" | "down" | "flat"): string {
  if (status === "up") return "bg-green-950/20";
  if (status === "down") return "bg-red-950/20";
  return "bg-gray-900";
}

function DeltaBadge({ value }: { value: number }) {
  const color =
    value > 10 ? "text-green-400" : value < -10 ? "text-red-400" : "text-gray-400";
  const Icon = value > 5 ? TrendingUp : value < -5 ? TrendingDown : Minus;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {value > 0 ? "+" : ""}
      {value}%
    </span>
  );
}

function MetricRow({ label, value, delta }: { label: string; value: number; delta: number }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-white font-medium">{formatCompact(value)}</span>
        <DeltaBadge value={delta} />
      </div>
    </div>
  );
}

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading } = useScoreboard(dateRange);

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Ukesrapport</h1>
              <p className="text-xs text-gray-500">Sammenligning med forrige periode</p>
            </div>
          </div>
          <DateRangePicker
            dateRange={dateRange}
            activePreset={preset}
            onPresetChange={setPreset}
            onCustomRange={setCustomRange}
          />
        </div>
        <MetricGrid loading />
      </div>
    );
  }

  const upCount = data.platforms.filter((p) => p.status === "up").length;
  const downCount = data.platforms.filter((p) => p.status === "down").length;
  const overallStatus = upCount > downCount ? "up" : downCount > upCount ? "down" : "flat";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ukesrapport</h1>
            <p className="text-xs text-gray-500">
              {data.period.current.from} → {data.period.current.to} vs forrige {data.period.days}d
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

      {/* Status banner */}
      <Card
        className={`p-4 border ${
          overallStatus === "up"
            ? "border-green-500/40 bg-green-950/10"
            : overallStatus === "down"
              ? "border-red-500/40 bg-red-950/10"
              : "border-gray-700 bg-gray-900"
        }`}
      >
        <div className="flex items-center gap-3">
          {overallStatus === "up" ? (
            <TrendingUp className="w-6 h-6 text-green-400" />
          ) : overallStatus === "down" ? (
            <TrendingDown className="w-6 h-6 text-red-400" />
          ) : (
            <Minus className="w-6 h-6 text-gray-400" />
          )}
          <div>
            <p className="text-white font-semibold">
              {overallStatus === "up"
                ? "Positiv utvikling"
                : overallStatus === "down"
                  ? "Nedgang registrert"
                  : "Stabil periode"}
            </p>
            <p className="text-xs text-gray-400">
              {upCount} plattformer opp, {downCount} ned, {data.platforms.length - upCount - downCount} flat
            </p>
          </div>
        </div>
      </Card>

      {/* Platform cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.platforms.map((p) => (
          <Card
            key={p.platform}
            className={`p-4 border ${statusBorder(p.status)} ${statusBg(p.status)}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: PLATFORM_COLORS[p.platform] || "#6b7280" }}
                />
                <span className="text-white font-semibold text-sm">{p.platform}</span>
              </div>
              {p.status === "up" ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : p.status === "down" ? (
                <TrendingDown className="w-4 h-4 text-red-400" />
              ) : (
                <Minus className="w-4 h-4 text-gray-500" />
              )}
            </div>
            <div className="space-y-0.5">
              {p.current.sessions > 0 && (
                <MetricRow label="Sesjoner" value={p.current.sessions} delta={p.delta_pct.sessions} />
              )}
              {p.current.reach > 0 && (
                <MetricRow label="Rekkevidde" value={p.current.reach} delta={p.delta_pct.reach} />
              )}
              {p.current.engagement > 0 && (
                <MetricRow label="Engasjement" value={p.current.engagement} delta={p.delta_pct.engagement} />
              )}
              {p.current.clicks > 0 && (
                <MetricRow label="Klikk" value={p.current.clicks} delta={p.delta_pct.clicks} />
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Google Ads */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Google Ads — periodesammenligning</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Kostnad</p>
            <p className="text-lg font-bold text-white">{nok.format(data.google_ads.current.cost)}</p>
            <DeltaBadge value={data.google_ads.delta_pct.cost} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Klikk</p>
            <p className="text-lg font-bold text-white">{formatNumber(data.google_ads.current.clicks)}</p>
            <DeltaBadge value={data.google_ads.delta_pct.clicks} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Konverteringer</p>
            <p className="text-lg font-bold text-white">{formatNumber(data.google_ads.current.conversions)}</p>
            <DeltaBadge value={data.google_ads.delta_pct.conversions} />
          </div>
          <div>
            <p className="text-xs text-gray-500">ROAS</p>
            <p className={`text-lg font-bold ${data.google_ads.current.roas >= 2 ? "text-green-400" : data.google_ads.current.roas >= 1 ? "text-blue-400" : "text-red-400"}`}>
              {data.google_ads.current.roas}x
            </p>
            <DeltaBadge value={data.google_ads.delta_pct.roas} />
          </div>
        </div>
      </Card>

      {/* Anomalies + Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Aktive varsler</h3>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-red-400" />
              <span className="text-red-400 font-bold text-lg">{data.anomalies.critical}</span>
              <span className="text-xs text-gray-500">kritisk</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400 font-bold text-lg">{data.anomalies.warning}</span>
              <span className="text-xs text-gray-500">advarsel</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 font-bold text-lg">{data.anomalies.info}</span>
              <span className="text-xs text-gray-500">info</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Viktigste endringer</h3>
          <ul className="space-y-2">
            {data.highlights.map((h, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">•</span>
                {h}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export default function UkesrapportPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
