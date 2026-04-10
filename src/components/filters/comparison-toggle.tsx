"use client";

import { cn } from "@/lib/utils/cn";

interface ComparisonToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function ComparisonToggle({ enabled, onChange }: ComparisonToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors",
          enabled ? "bg-blue-600" : "bg-gray-700"
        )}
        onClick={() => onChange(!enabled)}
      >
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
            enabled ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </div>
      <span className="text-sm text-gray-400">Sammenlign med forrige periode</span>
    </label>
  );
}
