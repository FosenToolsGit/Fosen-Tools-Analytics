"use client";

import { Suspense, use } from "react";
import { Eye, MousePointerClick, Users, Monitor } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { ChannelChart } from "@/components/dashboard/channel-chart";
import { TopPostsTable } from "@/components/dashboard/top-posts-table";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useMetrics, aggregateMetrics } from "@/hooks/use-metrics";
import { usePosts } from "@/hooks/use-posts";
import { PLATFORMS, type PlatformKey } from "@/lib/utils/platforms";

function PlatformContent({ slug }: { slug: PlatformKey }) {
  const platform = PLATFORMS[slug];
  const { dateRange, preset, setPreset } = useDateRange();
  const { data: metricsData, isLoading } = useMetrics(dateRange, slug);
  const { data: postsData, isLoading: postsLoading } = usePosts(slug, 10);

  const aggregated = metricsData ? aggregateMetrics(metricsData) : null;

  if (!platform) {
    return <p className="text-gray-400">Ukjent plattform: {slug}</p>;
  }

  const isGA4 = slug === "ga4";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${platform.color}20` }}
          >
            <platform.icon
              className="w-5 h-5"
              style={{ color: platform.color }}
            />
          </div>
          <h1 className="text-2xl font-bold">{platform.label}</h1>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          activePreset={preset}
          onPresetChange={setPreset}
        />
      </div>

      <MetricGrid loading={isLoading}>
        {aggregated && (
          <>
            {isGA4 ? (
              <>
                <MetricCard
                  title="Sesjoner"
                  value={aggregated.sessions}
                  icon={Monitor}
                />
                <MetricCard
                  title="Sidevisninger"
                  value={aggregated.pageviews}
                  icon={Eye}
                />
                <MetricCard
                  title="Brukere"
                  value={aggregated.users_total}
                  icon={Users}
                />
                <MetricCard
                  title="Engasjement"
                  value={aggregated.engagement}
                  icon={MousePointerClick}
                />
              </>
            ) : (
              <>
                <MetricCard
                  title="Rekkevidde"
                  value={aggregated.reach}
                  icon={Eye}
                />
                <MetricCard
                  title="Visninger"
                  value={aggregated.impressions}
                  icon={Eye}
                />
                <MetricCard
                  title="Engasjement"
                  value={aggregated.engagement}
                  icon={MousePointerClick}
                />
                <MetricCard
                  title="Klikk"
                  value={aggregated.clicks}
                  icon={MousePointerClick}
                />
              </>
            )}
          </>
        )}
      </MetricGrid>

      {metricsData && metricsData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChannelChart
            data={metricsData}
            platform={slug}
            metric={isGA4 ? "sessions" : "reach"}
            title={isGA4 ? "Sesjoner over tid" : "Rekkevidde over tid"}
          />
          <ChannelChart
            data={metricsData}
            platform={slug}
            metric="engagement"
            title="Engasjement over tid"
          />
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">
          {isGA4 ? "Topp sider" : "Topp innlegg"}
        </h2>
        <TopPostsTable posts={postsData || []} loading={postsLoading} />
      </div>
    </div>
  );
}

export default function PlatformPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return (
    <Suspense fallback={<MetricGrid loading />}>
      <PlatformContent slug={slug as PlatformKey} />
    </Suspense>
  );
}
