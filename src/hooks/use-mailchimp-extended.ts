"use client";

import useSWR from "swr";
import type { MailchimpLinkAggregate } from "@/app/api/mailchimp/links/route";
import type { MailchimpGrowthRow } from "@/app/api/mailchimp/growth/route";
import type { MailchimpLocationAggregate } from "@/app/api/mailchimp/locations/route";
import type { MailchimpDailyRow } from "@/app/api/mailchimp/daily/route";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useMailchimpLinks(days: number = 90) {
  const { data, error, isLoading } = useSWR<MailchimpLinkAggregate[]>(
    `/api/mailchimp/links?days=${days}`,
    fetcher
  );
  return { data, error, isLoading };
}

export function useMailchimpGrowth() {
  const { data, error, isLoading } = useSWR<MailchimpGrowthRow[]>(
    `/api/mailchimp/growth`,
    fetcher
  );
  return { data, error, isLoading };
}

export function useMailchimpLocations(days: number = 90) {
  const { data, error, isLoading } = useSWR<MailchimpLocationAggregate[]>(
    `/api/mailchimp/locations?days=${days}`,
    fetcher
  );
  return { data, error, isLoading };
}

export function useMailchimpDaily(days: number = 90) {
  const { data, error, isLoading } = useSWR<MailchimpDailyRow[]>(
    `/api/mailchimp/daily?days=${days}`,
    fetcher
  );
  return { data, error, isLoading };
}
