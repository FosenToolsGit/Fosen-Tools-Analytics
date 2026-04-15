"use client";

import useSWR from "swr";
import { formatDateISO } from "@/lib/utils/date";
import type { DateRange } from "@/lib/utils/date";
import type { GoogleAdsCampaignAggregate } from "@/app/api/google-ads/campaigns/route";
import type { GoogleAdsKeywordAggregate } from "@/app/api/google-ads/keywords/route";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useGoogleAdsCampaigns(dateRange: DateRange) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const { data, error, isLoading, mutate } = useSWR<GoogleAdsCampaignAggregate[]>(
    `/api/google-ads/campaigns?from=${from}&to=${to}`,
    fetcher
  );
  return { data, error, isLoading, mutate };
}

export function useGoogleAdsKeywords(dateRange: DateRange) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const { data, error, isLoading, mutate } = useSWR<GoogleAdsKeywordAggregate[]>(
    `/api/google-ads/keywords?from=${from}&to=${to}`,
    fetcher
  );
  return { data, error, isLoading, mutate };
}
