"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  getPresetRange,
  type DatePreset,
  type DateRange,
} from "@/lib/utils/date";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export function useDateRange() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive all state from URL params (single source of truth)
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const presetParam = (searchParams.get("preset") as DatePreset) || "30d";
  const compare = searchParams.get("compare") === "true";

  const preset: DatePreset =
    fromParam && toParam ? "custom" : presetParam;

  const dateRange: DateRange = useMemo(() => {
    if (preset === "custom" && fromParam && toParam) {
      return {
        from: startOfDay(parseISO(fromParam)),
        to: endOfDay(parseISO(toParam)),
      };
    }
    return getPresetRange(preset);
  }, [preset, fromParam, toParam]);

  const setPreset = useCallback(
    (p: DatePreset) => {
      const params = new URLSearchParams();
      params.set("preset", p);
      if (compare) params.set("compare", "true");
      router.replace(`${pathname}?${params.toString()}`);
    },
    [compare, router, pathname]
  );

  const setCustomRange = useCallback(
    (from: Date, to: Date) => {
      const params = new URLSearchParams();
      params.set("from", from.toISOString().split("T")[0]);
      params.set("to", to.toISOString().split("T")[0]);
      if (compare) params.set("compare", "true");
      router.replace(`${pathname}?${params.toString()}`);
    },
    [compare, router, pathname]
  );

  const setCompare = useCallback(
    (c: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (c) {
        params.set("compare", "true");
      } else {
        params.delete("compare");
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  return {
    dateRange,
    preset,
    compare,
    setPreset,
    setCompare,
    setCustomRange,
  };
}
