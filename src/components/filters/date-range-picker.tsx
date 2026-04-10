"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatDateNorwegian } from "@/lib/utils/date";
import type { DatePreset, DateRange } from "@/lib/utils/date";

const presets: { label: string; value: DatePreset }[] = [
  { label: "7 dager", value: "7d" },
  { label: "30 dager", value: "30d" },
  { label: "90 dager", value: "90d" },
];

interface DateRangePickerProps {
  dateRange: DateRange;
  activePreset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  onCustomRange?: (from: string, to: string) => void;
}

export function DateRangePicker({
  dateRange,
  activePreset,
  onPresetChange,
}: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-400 mr-1">Periode:</span>
      {presets.map((preset) => (
        <Button
          key={preset.value}
          variant={activePreset === preset.value ? "primary" : "ghost"}
          size="sm"
          onClick={() => onPresetChange(preset.value)}
        >
          {preset.label}
        </Button>
      ))}
      <span className="text-sm text-gray-500 ml-2">
        {formatDateNorwegian(dateRange.from)} &ndash;{" "}
        {formatDateNorwegian(dateRange.to)}
      </span>
    </div>
  );
}
