"use client";

import useSWR from "swr";
import { formatDateISO } from "@/lib/utils/date";
import type { DateRange } from "@/lib/utils/date";
import type { ScoreboardResponse } from "@/app/api/insights/scoreboard/route";
import type { ContentROIResponse } from "@/app/api/insights/content-roi/route";
import type { GeoInsightResponse } from "@/app/api/insights/geo/route";
import type { SEOResponse } from "@/app/api/insights/seo/route";
import type { CalendarResponse } from "@/app/api/insights/calendar/route";
import type { GrowthResponse } from "@/app/api/insights/growth/route";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useScoreboard(dateRange: DateRange) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const { data, error, isLoading } = useSWR<ScoreboardResponse>(
    `/api/insights/scoreboard?from=${from}&to=${to}`,
    fetcher
  );
  return { data, error, isLoading };
}

export function useContentROI(dateRange: DateRange) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const { data, error, isLoading } = useSWR<ContentROIResponse>(
    `/api/insights/content-roi?from=${from}&to=${to}`,
    fetcher
  );
  return { data, error, isLoading };
}

export function useGeoInsight(dateRange: DateRange) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const { data, error, isLoading } = useSWR<GeoInsightResponse>(
    `/api/insights/geo?from=${from}&to=${to}`,
    fetcher
  );
  return { data, error, isLoading };
}

export function useSEO(dateRange: DateRange) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const { data, error, isLoading } = useSWR<SEOResponse>(
    `/api/insights/seo?from=${from}&to=${to}`,
    fetcher
  );
  return { data, error, isLoading };
}

export function useCalendar(dateRange: DateRange) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const { data, error, isLoading } = useSWR<CalendarResponse>(
    `/api/insights/calendar?from=${from}&to=${to}`,
    fetcher
  );
  return { data, error, isLoading };
}

const postFetcher = (url: string, body: unknown) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

export function useGrowth(seeds: string[] | null, dateRange: DateRange) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const key = seeds === null ? null : ["/api/insights/growth", seeds, from, to];
  const { data, error, isLoading, mutate } = useSWR<GrowthResponse>(
    key,
    () => postFetcher("/api/insights/growth", { seeds: seeds ?? [], from, to }),
    { revalidateOnFocus: false }
  );
  return { data, error, isLoading, mutate };
}
