"use client";

import useSWR from "swr";
import { formatDateISO } from "@/lib/utils/date";
import type { DateRange } from "@/lib/utils/date";
import type { AttributionResponse } from "@/app/api/attribution/route";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAttribution(dateRange: DateRange) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const { data, error, isLoading } = useSWR<AttributionResponse>(
    `/api/attribution?from=${from}&to=${to}`,
    fetcher
  );
  return { data, error, isLoading };
}
