"use client";

import useSWR from "swr";
import type { AnomalyRow } from "@/app/api/anomalies/route";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useAnomalies(status?: "active" | "acknowledged" | "resolved" | "expired") {
  const query = status ? `?status=${status}` : "";
  const { data, error, isLoading, mutate } = useSWR<AnomalyRow[]>(
    `/api/anomalies${query}`,
    fetcher,
    { refreshInterval: 60_000 } // refresh hver minutt
  );
  return { data, error, isLoading, mutate };
}
