"use client";

import useSWR from "swr";
import { formatDateISO } from "@/lib/utils/date";
import type { DateRange } from "@/lib/utils/date";
import type { PlatformKey } from "@/lib/utils/platforms";

export interface MetricRow {
  platform: PlatformKey;
  metric_date: string;
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  followers: number;
  sessions: number;
  pageviews: number;
  users_total: number;
  bounce_rate: number;
}

export interface AggregatedMetrics {
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  followers: number;
  sessions: number;
  pageviews: number;
  users_total: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useMetrics(dateRange: DateRange, platform?: PlatformKey) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const platformParam = platform ? `&platform=${platform}` : "";

  const { data, error, isLoading, mutate } = useSWR<MetricRow[]>(
    `/api/metrics?from=${from}&to=${to}${platformParam}`,
    fetcher
  );

  return { data, error, isLoading, mutate };
}

export function aggregateMetrics(rows: MetricRow[]): AggregatedMetrics {
  return rows.reduce(
    (acc, row) => ({
      impressions: acc.impressions + row.impressions,
      reach: acc.reach + row.reach,
      engagement: acc.engagement + row.engagement,
      clicks: acc.clicks + row.clicks,
      followers: Math.max(acc.followers, row.followers),
      sessions: acc.sessions + row.sessions,
      pageviews: acc.pageviews + row.pageviews,
      users_total: acc.users_total + row.users_total,
    }),
    {
      impressions: 0,
      reach: 0,
      engagement: 0,
      clicks: 0,
      followers: 0,
      sessions: 0,
      pageviews: 0,
      users_total: 0,
    }
  );
}
