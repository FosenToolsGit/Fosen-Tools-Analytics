import {
  subDays,
  startOfDay,
  endOfDay,
  format,
  differenceInDays,
} from "date-fns";
import { nb } from "date-fns/locale";

export type DatePreset = "7d" | "30d" | "90d" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}

export function getPresetRange(preset: DatePreset): DateRange {
  const to = endOfDay(new Date());
  switch (preset) {
    case "7d":
      return { from: startOfDay(subDays(new Date(), 6)), to };
    case "30d":
      return { from: startOfDay(subDays(new Date(), 29)), to };
    case "90d":
      return { from: startOfDay(subDays(new Date(), 89)), to };
    default:
      return { from: startOfDay(subDays(new Date(), 29)), to };
  }
}

export function getPreviousPeriod(range: DateRange): DateRange {
  const days = differenceInDays(range.to, range.from) + 1;
  return {
    from: subDays(range.from, days),
    to: subDays(range.from, 1),
  };
}

export function formatDateNorwegian(date: Date): string {
  return format(date, "d. MMM yyyy", { locale: nb });
}

export function formatDateISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
