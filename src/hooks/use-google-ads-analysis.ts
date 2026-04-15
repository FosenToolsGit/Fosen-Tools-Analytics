"use client";

import useSWR from "swr";
import { formatDateISO } from "@/lib/utils/date";
import type { DateRange } from "@/lib/utils/date";
import type { AnalysisResponse } from "@/app/api/google-ads/analysis/route";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useGoogleAdsAnalysis(dateRange: DateRange) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const { data, error, isLoading, mutate } = useSWR<AnalysisResponse>(
    `/api/google-ads/analysis?from=${from}&to=${to}`,
    fetcher
  );
  return { data, error, isLoading, mutate };
}
