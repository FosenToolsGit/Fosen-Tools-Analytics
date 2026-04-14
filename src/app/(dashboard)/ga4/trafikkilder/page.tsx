"use client";

import { ArrowUpRight, Users, MousePointerClick } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { SourceChart } from "@/components/dashboard/source-chart";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useSources } from "@/hooks/use-sources";

export default function TrafikkilderPage() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading } = useSources(dateRange);

  const totalSessions = data?.reduce((sum, r) => sum + r.sessions, 0) || 0;
  const totalUsers = data?.reduce((sum, r) => sum + r.total_users, 0) || 0;

  // Find top channel
  const channelMap = new Map<string, number>();
  data?.forEach((r) => {
    channelMap.set(r.channel, (channelMap.get(r.channel) || 0) + r.sessions);
  });
  const topChannel =
    channelMap.size > 0
      ? [...channelMap.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold">Trafikkilder</h1>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          activePreset={preset}
          onPresetChange={setPreset}
          onCustomRange={setCustomRange}
        />
      </div>

      <MetricGrid loading={isLoading}>
        <MetricCard title="Sesjoner" value={totalSessions} icon={MousePointerClick} tooltip="Totalt antall økter fra alle trafikkilder i perioden" />
        <MetricCard title="Brukere" value={totalUsers} icon={Users} tooltip="Antall unike brukere fra alle trafikkilder" />
      </MetricGrid>

      {!isLoading && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-sm text-gray-400">
            Topp kanal:{" "}
            <span className="text-white font-medium">{topChannel}</span>
          </p>
        </div>
      )}

      <SourceChart data={data || []} loading={isLoading} />
    </div>
  );
}
