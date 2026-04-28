"use client";

import useSWR from "swr";
import { formatDateISO, type DateRange } from "@/lib/utils/date";
import type { SocialBuilderResponse } from "@/app/api/innleggsbygger/sosiale/route";
import type { NewsletterBuilderResponse } from "@/app/api/innleggsbygger/nyhetsbrev/route";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSocialBuilder(themes: string[], dateRange: DateRange) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const themesParam = themes.length > 0 ? `&themes=${encodeURIComponent(themes.join(","))}` : "";
  const { data, error, isLoading, mutate } = useSWR<SocialBuilderResponse>(
    `/api/innleggsbygger/sosiale?from=${from}&to=${to}${themesParam}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  return { data, error, isLoading, mutate };
}

export function useNewsletterBuilder(dateRange: DateRange) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const { data, error, isLoading, mutate } = useSWR<NewsletterBuilderResponse>(
    `/api/innleggsbygger/nyhetsbrev?from=${from}&to=${to}`,
    fetcher,
    { revalidateOnFocus: false }
  );
  return { data, error, isLoading, mutate };
}
