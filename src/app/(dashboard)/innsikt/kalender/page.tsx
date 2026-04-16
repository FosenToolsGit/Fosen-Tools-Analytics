"use client";

import { Suspense, useState } from "react";
import {
  Calendar,
  FileText,
  AlertTriangle,
  Zap,
  RefreshCw,
  Share2,
  Mail,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useCalendar } from "@/hooks/use-insights";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from "recharts";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";

type EventFilter = "post" | "anomaly" | "auto_action" | "sync";

const EVENT_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof FileText }
> = {
  post: { label: "Poster", color: "#60a5fa", icon: FileText },
  anomaly: { label: "Anomalier", color: "#ef4444", icon: AlertTriangle },
  auto_action: { label: "Auto-actions", color: "#a78bfa", icon: Zap },
  sync: { label: "Syncs", color: "#6b7280", icon: RefreshCw },
};

const PLATFORM_ICONS: Record<string, typeof Share2> = {
  meta: Share2,
  mailchimp: Mail,
  ga4: FileText,
  google_ads: Zap,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  warning: "#f59e0b",
  info: "#60a5fa",
};

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading } = useCalendar(dateRange);
  const [filters, setFilters] = useState<Set<EventFilter>>(
    new Set(["post", "anomaly", "auto_action"])
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const toggleFilter = (f: EventFilter) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const filteredEvents =
    data?.events.filter((e) => filters.has(e.type as EventFilter)) ?? [];

  const eventsByDate = new Map<string, number>();
  for (const e of filteredEvents) {
    const d = e.timestamp.slice(0, 10);
    eventsByDate.set(d, (eventsByDate.get(d) || 0) + 1);
  }

  const chartData =
    data?.daily_sessions.map((d) => ({
      date: format(parseISO(d.date), "d. MMM", { locale: nb }),
      rawDate: d.date,
      sessions: d.sessions,
      hendelser: eventsByDate.get(d.date) || 0,
    })) ?? [];

  const dayEvents = selectedDate
    ? filteredEvents.filter((e) => e.timestamp.slice(0, 10) === selectedDate)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-900/30 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kampanjekalender</h1>
            <p className="text-xs text-gray-500">
              Alle hendelser på én tidslinje
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
          {/* Filter buttons */}
          <div className="flex flex-wrap gap-2">
            {(Object.entries(EVENT_CONFIG) as [EventFilter, (typeof EVENT_CONFIG)[string]][]).map(
              ([key, cfg]) => {
                const count = data.events.filter((e) => e.type === key).length;
                const active = filters.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "text-white"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                    style={{
                      backgroundColor: active ? `${cfg.color}20` : undefined,
                      borderWidth: 1,
                      borderColor: active ? `${cfg.color}60` : "#374151",
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    {cfg.label} ({count})
                  </button>
                );
              }
            )}
          </div>

          {/* Timeline Chart */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-1">
              Tidslinje — sesjoner + hendelser
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Klikk på en søyle for å se hendelser den dagen
            </p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  onClick={(e: Record<string, unknown>) => {
                    const ap = e?.activePayload as Array<{ payload?: { rawDate?: string } }> | undefined;
                    if (ap?.[0]?.payload?.rawDate) {
                      setSelectedDate(ap[0].payload.rawDate);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={{ stroke: "#374151" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={false}
                    width={50}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                    axisLine={false}
                    width={30}
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
                  <Line
                    type="monotone"
                    dataKey="sessions"
                    name="Sesjoner"
                    stroke="#4b5563"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="hendelser"
                    name="Hendelser"
                    fill="#6366f1"
                    fillOpacity={0.7}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={20}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Day detail */}
          {dayEvents && selectedDate && (
            <Card className="p-4 border border-indigo-500/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">
                  {format(parseISO(selectedDate), "EEEE d. MMMM yyyy", { locale: nb })}
                  <span className="text-gray-400 ml-2">— {dayEvents.length} hendelser</span>
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-xs text-gray-500 hover:text-white"
                >
                  Lukk
                </button>
              </div>
              <div className="space-y-2">
                {dayEvents.map((e) => {
                  const cfg = EVENT_CONFIG[e.type];
                  return (
                    <div
                      key={e.id}
                      className="flex items-start gap-3 p-2 rounded-lg bg-gray-800/50"
                    >
                      <span
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{
                          backgroundColor: e.severity
                            ? SEVERITY_COLORS[e.severity] || cfg?.color
                            : cfg?.color || "#6b7280",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium truncate">
                            {e.title}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
                            style={{
                              backgroundColor: `${cfg?.color || "#6b7280"}20`,
                              color: cfg?.color || "#6b7280",
                            }}
                          >
                            {cfg?.label || e.type}
                          </span>
                          {e.platform && (
                            <span className="text-[10px] text-gray-500">{e.platform}</span>
                          )}
                        </div>
                        {e.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{e.description}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">
                        {e.timestamp.slice(11, 16) || ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Full event list */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold">
                Alle hendelser ({filteredEvents.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-800/50 max-h-[500px] overflow-y-auto">
              {filteredEvents.slice(0, 100).map((e) => {
                const cfg = EVENT_CONFIG[e.type];
                const PlatIcon = e.platform ? PLATFORM_ICONS[e.platform] || FileText : null;
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/30"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: e.severity
                          ? SEVERITY_COLORS[e.severity] || cfg?.color
                          : cfg?.color || "#6b7280",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {PlatIcon && <PlatIcon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                        <span className="text-sm text-white truncate">{e.title}</span>
                      </div>
                      {e.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{e.description}</p>
                      )}
                    </div>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0"
                      style={{
                        backgroundColor: `${cfg?.color || "#6b7280"}20`,
                        color: cfg?.color || "#6b7280",
                      }}
                    >
                      {cfg?.label}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0 w-20 text-right">
                      {format(parseISO(e.timestamp), "d. MMM", { locale: nb })}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default function KalenderPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
