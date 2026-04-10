"use client";

import { Suspense } from "react";
import { Search, MousePointerClick, Eye, Hash } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { KeywordTable } from "@/components/dashboard/keyword-table";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useKeywords } from "@/hooks/use-keywords";

function SokeordContent() {
  const { dateRange, preset, setPreset } = useDateRange();
  const { data, isLoading } = useKeywords(dateRange);

  const totalClicks = data?.reduce((sum, r) => sum + r.clicks, 0) || 0;
  const totalImpressions = data?.reduce((sum, r) => sum + r.impressions, 0) || 0;
  const avgPosition =
    data && data.length > 0
      ? data.reduce((sum, r) => sum + r.position, 0) / data.length
      : 0;
  const avgCtr =
    data && data.length > 0
      ? data.reduce((sum, r) => sum + r.ctr, 0) / data.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center">
            <Search className="w-5 h-5 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold">Søkeord</h1>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          activePreset={preset}
          onPresetChange={setPreset}
        />
      </div>

      <MetricGrid loading={isLoading}>
        <MetricCard title="Klikk" value={totalClicks} icon={MousePointerClick} />
        <MetricCard title="Visninger" value={totalImpressions} icon={Eye} />
        <MetricCard
          title="Snittposisjon"
          value={Math.round(avgPosition * 10) / 10}
          icon={Hash}
        />
        <MetricCard
          title="Snitt CTR"
          value={Math.round(avgCtr * 10000) / 100}
          format="percent"
          icon={Search}
        />
      </MetricGrid>

      <KeywordTable data={data || []} loading={isLoading} />
    </div>
  );
}

export default function SokeordPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <SokeordContent />
    </Suspense>
  );
}
