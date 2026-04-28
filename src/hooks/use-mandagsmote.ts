"use client";

import useSWR from "swr";
import { formatDateISO } from "@/lib/utils/date";
import type { ScoreboardResponse } from "@/app/api/insights/scoreboard/route";
import type { SEOResponse } from "@/app/api/insights/seo/route";
import type { GrowthResponse } from "@/app/api/insights/growth/route";
import type { ContentROIResponse } from "@/app/api/insights/content-roi/route";
import type { WeeklyValidationResponse } from "@/app/api/insights/weekly-validation/route";
import type { ConversionsWeekResponse } from "@/app/api/insights/conversions-week/route";
import type { MailchimpLatestResponse } from "@/app/api/insights/mailchimp-latest/route";

/**
 * Aggregert hook for mandagsmøte-siden. Henter alle relevante datasett i
 * parallell så møtet kan forberedes med ett blikk på siden.
 */
export interface MandagsmoteData {
  sb7: ScoreboardResponse;
  sb14: ScoreboardResponse;
  anomalies: Array<Record<string, unknown>>;
  seo: SEOResponse;
  growth: GrowthResponse;
  content: ContentROIResponse;
  attribution: Record<string, unknown>;
  gads: Record<string, unknown>;
  validation: WeeklyValidationResponse | null;
  conversions: ConversionsWeekResponse | null;
  mailchimp_latest: MailchimpLatestResponse | null;
  generated_at: string;
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) return null;
  return res.json();
}

export function useMandagsmote() {
  const { data, error, isLoading, mutate } = useSWR<MandagsmoteData>(
    "mandagsmote",
    async () => {
      const now = new Date();
      const today = formatDateISO(now);
      const sevenAgo = formatDateISO(new Date(now.getTime() - 6 * 86400000));
      const fourteenAgo = formatDateISO(
        new Date(now.getTime() - 13 * 86400000)
      );
      const ninetyAgo = formatDateISO(
        new Date(now.getTime() - 89 * 86400000)
      );

      const [
        sb7,
        sb14,
        anomalies,
        seo,
        growth,
        content,
        attribution,
        gads,
        validation,
        conversions,
        mailchimpLatest,
      ] = await Promise.all([
        fetchJson(`/api/insights/scoreboard?from=${sevenAgo}&to=${today}`),
        fetchJson(`/api/insights/scoreboard?from=${fourteenAgo}&to=${today}`),
        fetchJson(`/api/anomalies?status=active`),
        fetchJson(`/api/insights/seo?from=${ninetyAgo}&to=${today}`),
        fetchJson(`/api/insights/growth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: ninetyAgo, to: today }),
        }),
        fetchJson(`/api/insights/content-roi?from=${ninetyAgo}&to=${today}`),
        fetchJson(`/api/attribution?from=${sevenAgo}&to=${today}`),
        fetchJson(`/api/google-ads/analysis?from=${sevenAgo}&to=${today}`),
        fetchJson(`/api/insights/weekly-validation?from=${sevenAgo}&to=${today}`),
        fetchJson(`/api/insights/conversions-week?from=${sevenAgo}&to=${today}`),
        fetchJson(`/api/insights/mailchimp-latest`),
      ]);

      return {
        sb7,
        sb14,
        anomalies: anomalies ?? [],
        seo,
        growth,
        content,
        attribution,
        gads,
        validation,
        conversions,
        mailchimp_latest: mailchimpLatest,
        generated_at: new Date().toISOString(),
      } as MandagsmoteData;
    },
    { revalidateOnFocus: false }
  );

  return { data, error, isLoading, mutate };
}
