"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatDateNorwegian, formatDateISO } from "@/lib/utils/date";
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
  onCustomRange?: (from: Date, to: Date) => void;
}

export function DateRangePicker({
  dateRange,
  activePreset,
  onPresetChange,
  onCustomRange,
}: DateRangePickerProps) {
  const handleFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value && onCustomRange) {
        onCustomRange(new Date(e.target.value), dateRange.to);
      }
    },
    [dateRange.to, onCustomRange]
  );

  const handleToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value && onCustomRange) {
        onCustomRange(dateRange.from, new Date(e.target.value));
      }
    },
    [dateRange.from, onCustomRange]
  );

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

      {/* Custom date inputs */}
      <div className="flex items-center gap-1 ml-2">
        <input
          type="date"
          value={formatDateISO(dateRange.from)}
          onChange={handleFromChange}
          max={formatDateISO(dateRange.to)}
          className={cn(
            "bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300",
            "focus:border-blue-500 focus:outline-none",
            activePreset === "custom" && "border-blue-500"
          )}
        />
        <span className="text-gray-500 text-xs">–</span>
        <input
          type="date"
          value={formatDateISO(dateRange.to)}
          onChange={handleToChange}
          min={formatDateISO(dateRange.from)}
          max={formatDateISO(new Date())}
          className={cn(
            "bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300",
            "focus:border-blue-500 focus:outline-none",
            activePreset === "custom" && "border-blue-500"
          )}
        />
      </div>
    </div>
  );
}
