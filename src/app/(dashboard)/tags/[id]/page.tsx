"use client";

import { use } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowLeft, Tag as TagIcon, MousePointerClick, Eye, Activity, Users } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { TagBadge } from "@/components/tags/tag-badge";
import { TagRulesPanel } from "@/components/tags/tag-rules-panel";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import type { Tag } from "@/lib/types/tags";

interface EntitySummary {
  entity_key: string;
  label: string;
  clicks: number;
  impressions: number;
  sessions: number;
  engagement: number;
}

interface TagMetricsResponse {
  tag: Tag;
  totals: { clicks: number; impressions: number; sessions: number; engagement: number };
  daily: { date: string; clicks: number; impressions: number; sessions: number; engagement: number }[];
  entities: {
    keywords: EntitySummary[];
    posts: EntitySummary[];
    campaigns: EntitySummary[];
    sources: EntitySummary[];
  };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TagDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const fromStr = dateRange.from.toISOString().split("T")[0];
  const toStr = dateRange.to.toISOString().split("T")[0];
  const url = `/api/tags/${id}/metrics?from=${fromStr}&to=${toStr}`;
  const { data, isLoading, error } = useSWR<TagMetricsResponse>(url, fetcher);

  if (error) {
    return <div className="text-red-400">Kunne ikke laste tag-data</div>;
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-12 bg-gray-800 rounded" />
        <MetricGrid loading />
      </div>
    );
  }

  const tag = data.tag;
  const totalEntities =
    data.entities.keywords.length +
    data.entities.posts.length +
    data.entities.campaigns.length +
    data.entities.sources.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/tags"
            className="text-gray-500 hover:text-white"
            aria-label="Tilbake"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
            <TagIcon className="w-5 h-5 text-purple-400" />
          </div>
          <div className="flex items-center gap-3">
            <TagBadge tag={tag} size="md" />
            <span className="text-sm text-gray-400">
              {totalEntities} taggede entiteter
            </span>
          </div>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          activePreset={preset}
          onPresetChange={setPreset}
          onCustomRange={setCustomRange}
        />
      </div>

      {tag.description && (
        <p className="text-sm text-gray-400">{tag.description}</p>
      )}

      <MetricGrid>
        <MetricCard
          title="Klikk"
          value={data.totals.clicks}
          icon={MousePointerClick}
          tooltip="Totalt antall klikk på tvers av alle taggede entiteter i perioden"
        />
        <MetricCard
          title="Visninger"
          value={data.totals.impressions}
          icon={Eye}
          tooltip="Totalt antall visninger på tvers av alle taggede entiteter"
        />
        <MetricCard
          title="Sesjoner"
          value={data.totals.sessions}
          icon={Users}
          tooltip="Totalt antall sesjoner fra taggede trafikkilder og kampanjer"
        />
        <MetricCard
          title="Engasjement"
          value={data.totals.engagement}
          icon={Activity}
          tooltip="Likes + kommentarer + delinger på taggede innlegg"
        />
      </MetricGrid>

      <TagRulesPanel tagId={id} />

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Trend over tid</h3>
        {data.daily.length === 0 ? (
          <div className="text-center text-gray-500 py-8">Ingen data i perioden</div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "0.5rem",
                  }}
                  itemStyle={{ color: "#d1d5db" }}
                />
                <Line
                  type="monotone"
                  dataKey="clicks"
                  stroke={tag.color}
                  strokeWidth={2}
                  name="Klikk"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="impressions"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  name="Visninger"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="sessions"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Sesjoner"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EntityList title="Søkeord" entities={data.entities.keywords} metric="impressions" />
        <EntityList title="Innlegg" entities={data.entities.posts} metric="clicks" />
        <EntityList title="Kampanjer" entities={data.entities.campaigns} metric="sessions" />
        <EntityList title="Trafikkilder" entities={data.entities.sources} metric="sessions" />
      </div>
    </div>
  );
}

function EntityList({
  title,
  entities,
  metric,
}: {
  title: string;
  entities: EntitySummary[];
  metric: keyof EntitySummary;
}) {
  if (entities.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">{title}</h3>
        <p className="text-xs text-gray-500">Ingen taggede entiteter</p>
      </Card>
    );
  }
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">
        {title} ({entities.length})
      </h3>
      <ul className="space-y-2 text-sm">
        {entities.slice(0, 10).map((e) => (
          <li
            key={e.entity_key}
            className="flex items-center justify-between gap-2 border-b border-gray-800/50 pb-2 last:border-0"
          >
            <span className="text-gray-200 truncate">{e.label}</span>
            <span className="text-gray-400 whitespace-nowrap">
              {(e[metric] as number).toLocaleString("nb")}
            </span>
          </li>
        ))}
        {entities.length > 10 && (
          <li className="text-xs text-gray-500 pt-1">
            + {entities.length - 10} flere
          </li>
        )}
      </ul>
    </Card>
  );
}
