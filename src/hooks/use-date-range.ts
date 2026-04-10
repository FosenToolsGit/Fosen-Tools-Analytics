"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  getPresetRange,
  type DatePreset,
  type DateRange,
} from "@/lib/utils/date";
import { format } from "date-fns";

export function useDateRange() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const presetParam = (searchParams.get("preset") as DatePreset) || "30d";
  const compareParam = searchParams.get("compare") === "true";

  const [preset, setPresetState] = useState<DatePreset>(presetParam);
  const [compare, setCompareState] = useState(compareParam);

  const dateRange: DateRange = getPresetRange(preset);

  const updateParams = useCallback(
    (newPreset: DatePreset, newCompare: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("preset", newPreset);
      if (newCompare) {
        params.set("compare", "true");
      } else {
        params.delete("compare");
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const setPreset = useCallback(
    (p: DatePreset) => {
      setPresetState(p);
      updateParams(p, compare);
    },
    [compare, updateParams]
  );

  const setCompare = useCallback(
    (c: boolean) => {
      setCompareState(c);
      updateParams(preset, c);
    },
    [preset, updateParams]
  );

  return {
    dateRange,
    preset,
    compare,
    setPreset,
    setCompare,
  };
}
