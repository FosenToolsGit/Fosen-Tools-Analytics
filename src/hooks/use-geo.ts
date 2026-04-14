"use client";

import useSWR from "swr";
import { formatDateISO } from "@/lib/utils/date";
import type { DateRange } from "@/lib/utils/date";
import type { GeoDataRow } from "@/lib/services/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useGeo(dateRange: DateRange, excludeBots = false) {
  const from = formatDateISO(dateRange.from);
  const to = formatDateISO(dateRange.to);
  const botParam = excludeBots ? "&exclude_bots=true" : "";

  const { data, error, isLoading, mutate } = useSWR<GeoDataRow[]>(
    `/api/geo?from=${from}&to=${to}${botParam}`,
    fetcher
  );

  return { data, error, isLoading, mutate };
}
