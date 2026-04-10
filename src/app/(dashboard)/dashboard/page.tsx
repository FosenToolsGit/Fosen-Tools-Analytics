"use client";

import { Suspense } from "react";
import { Eye, Users, MousePointerClick, UserPlus } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { ComparisonToggle } from "@/components/filters/comparison-toggle";
import { useDateRange } from "@/hooks/use-date-range";
import { useMetrics, aggregateMetrics } from "@/hooks/use-metrics";
import { getPreviousPeriod } from "@/lib/utils/date";

function DashboardContent() {
  const { dateRange, preset, compare, setPreset, setCompare, setCustomRange } = useDateRange();
  const { data: currentData, isLoading } = useMetrics(dateRange);

  const previousRange = getPreviousPeriod(dateRange);
  const { data: previousData } = useMetrics(previousRange);

  const current = currentData ? aggregateMetrics(currentData) : null;
  const previous =
    compare && previousData ? aggregateMetrics(previousData) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Oversikt</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <ComparisonToggle enabled={compare} onChange={setCompare} />
          <DateRangePicker
            dateRange={dateRange}
            activePreset={preset}
            onPresetChange={setPreset}
            onCustomRange={setCustomRange}
          />
        </div>
      </div>

      <MetricGrid loading={isLoading}>
        {current && (
          <>
            <MetricCard
              title="Rekkevidde"
              value={current.reach}
              previousValue={previous?.reach}
              icon={Eye}
              tooltip="Antall unike personer som har sett innholdet ditt på tvers av alle plattformer"
            />
            <MetricCard
              title="Engasjement"
              value={current.engagement}
              previousValue={previous?.engagement}
              icon={MousePointerClick}
              tooltip="Totalt antall interaksjoner (likes, kommentarer, delinger, klikk) på innholdet ditt"
            />
            <MetricCard
              title="Besøkende"
              value={current.users_total}
              previousValue={previous?.users_total}
              icon={Users}
              tooltip="Antall unike brukere som har besøkt nettsiden din via Google Analytics"
            />
            <MetricCard
              title="Følgere"
              value={current.followers}
              previousValue={previous?.followers}
              icon={UserPlus}
              tooltip="Totalt antall følgere på Facebook-siden din"
            />
          </>
        )}
      </MetricGrid>

      {currentData && currentData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <OverviewChart
            data={currentData}
            metric="reach"
            title="Rekkevidde over tid"
          />
          <OverviewChart
            data={currentData}
            metric="engagement"
            title="Engasjement over tid"
          />
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <DashboardContent />
    </Suspense>
  );
}
