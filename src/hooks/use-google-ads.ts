"use client";

import useSWR from "swr";
import { formatDateISO } from "@/lib/utils/date";
import type { DateRange } from "@/lib/utils/date";
import type { GoogleAdsCampaignAggregate } from "@/app/api/google-ads/campaigns/route";
import type { GoogleAdsKeywordAggregate } from "@/app/api/google-ads/keywords/route";
import type { SearchTermAggregate } from "@/app/api/google-ads/search-terms/route";
import type { ConversionAggregate } from "@/app/api/google-ads/conversions/route";

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

export function useGoogleAdsConversions(
  dateRange: DateRange,
  opts: { campaignId?: string } = {}
) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const params = new URLSearchParams({ from, to });
  if (opts.campaignId) params.set("campaign_id", opts.campaignId);
  const { data, error, isLoading, mutate } = useSWR<ConversionAggregate[]>(
    `/api/google-ads/conversions?${params.toString()}`,
    fetcher
  );
  return { data, error, isLoading, mutate };
}

export function useGoogleAdsSearchTerms(
  dateRange: DateRange,
  opts: { source?: "search_term" | "pmax_insight"; campaignId?: string } = {}
) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const params = new URLSearchParams({ from, to });
  if (opts.source) params.set("source", opts.source);
  if (opts.campaignId) params.set("campaign_id", opts.campaignId);
  const { data, error, isLoading, mutate } = useSWR<SearchTermAggregate[]>(
    `/api/google-ads/search-terms?${params.toString()}`,
    fetcher
  );
  return { data, error, isLoading, mutate };
}
