"use client";

import useSWR from "swr";
import { formatDateISO } from "@/lib/utils/date";
import type { DateRange } from "@/lib/utils/date";
import type { CampaignDetailResponse } from "@/app/api/google-ads/campaigns/[campaign_id]/route";
import type { GoogleAdsKeywordAggregate } from "@/app/api/google-ads/keywords/route";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useGoogleAdsCampaignDetail(
  campaignId: string,
  dateRange: DateRange
) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const { data, error, isLoading } = useSWR<CampaignDetailResponse>(
    campaignId
      ? `/api/google-ads/campaigns/${encodeURIComponent(campaignId)}?from=${from}&to=${to}`
      : null,
    fetcher
  );
  return { data, error, isLoading };
}

export function useGoogleAdsCampaignKeywords(
  campaignId: string,
  dateRange: DateRange
) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const { data, error, isLoading } = useSWR<GoogleAdsKeywordAggregate[]>(
    campaignId
      ? `/api/google-ads/campaigns/${encodeURIComponent(campaignId)}/keywords?from=${from}&to=${to}`
      : null,
    fetcher
  );
  return { data, error, isLoading };
}
