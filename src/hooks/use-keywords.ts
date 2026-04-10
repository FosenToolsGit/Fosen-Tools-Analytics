"use client";

import useSWR from "swr";
import { formatDateISO } from "@/lib/utils/date";
import type { DateRange } from "@/lib/utils/date";
import type { SearchKeywordRow } from "@/lib/services/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useKeywords(dateRange: DateRange) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);

  const { data, error, isLoading, mutate } = useSWR<SearchKeywordRow[]>(
    `/api/keywords?from=${from}&to=${to}`,
    fetcher
  );

  return { data, error, isLoading, mutate };
}
