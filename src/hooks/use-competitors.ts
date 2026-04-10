"use client";

import useSWR, { useSWRConfig } from "swr";

export interface CompetitorRow {
  id: string;
  domain: string;
  name: string;
  estimated_traffic: number | null;
  ranking: number | null;
  notes: string | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCompetitors() {
  const { data, error, isLoading, mutate } = useSWR<CompetitorRow[]>(
    "/api/competitors",
    fetcher
  );

  return { data, error, isLoading, mutate };
}

export function useAddCompetitor() {
  const { mutate } = useSWRConfig();

  const addCompetitor = async (competitor: {
    domain: string;
    name: string;
  }) => {
    const res = await fetch("/api/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(competitor),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to add competitor");
    }

    const data = await res.json();
    mutate("/api/competitors");
    return data;
  };

  return { addCompetitor };
}

export function useDeleteCompetitor() {
  const { mutate } = useSWRConfig();

  const deleteCompetitor = async (id: string) => {
    const res = await fetch(`/api/competitors?id=${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to delete competitor");
    }

    mutate("/api/competitors");
  };

  return { deleteCompetitor };
}
