"use client";

import useSWR from "swr";
import type {
  IntelligenceReport,
  KeywordSignal,
} from "@/lib/services/keyword-intelligence";
import type { KeywordPlannerStatus } from "@/lib/services/keyword-planner";

export type { IntelligenceReport, KeywordSignal, KeywordPlannerStatus };

export interface IntelligenceResponse extends IntelligenceReport {
  keyword_planner_status: KeywordPlannerStatus;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useKeywordIntelligence(days: number) {
  const { data, error, isLoading, mutate } = useSWR<IntelligenceResponse>(
    `/api/keyword-generator/intelligence?days=${days}`,
    fetcher
  );
  return { data, error, isLoading, mutate };
}
