"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { formatCompact, formatPercent, formatDelta } from "@/lib/utils/format";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: "number" | "percent";
  icon: LucideIcon;
  tooltip?: string;
}

export function MetricCard({
  title,
  value,
  previousValue,
  format = "number",
  icon: Icon,
  tooltip,
}: MetricCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const formatted =
    format === "percent" ? formatPercent(value) : formatCompact(value);

  let trend: "up" | "down" | "flat" = "flat";
  let deltaText = "";
  if (previousValue !== undefined) {
    if (value > previousValue) trend = "up";
    else if (value < previousValue) trend = "down";
    deltaText = formatDelta(value, previousValue);
  }

  return (
    <Card className="flex flex-col gap-3 relative">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-sm text-gray-400",
            tooltip &&
              "border-b border-dotted border-gray-600 cursor-help"
          )}
          onMouseEnter={() => tooltip && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {title}
        </span>
        <Icon className="w-5 h-5 text-gray-500" />
      </div>

      {showTooltip && tooltip && (
        <div className="absolute top-0 left-0 right-0 -translate-y-full mb-1 z-50 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 shadow-lg">
          {tooltip}
        </div>
      )}

      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-white">{formatted}</span>

        {previousValue !== undefined && (
          <span
            className={cn(
              "flex items-center gap-1 text-sm font-medium mb-1",
              trend === "up" && "text-green-400",
              trend === "down" && "text-red-400",
              trend === "flat" && "text-gray-500"
            )}
          >
            {trend === "up" && <TrendingUp className="w-4 h-4" />}
            {trend === "down" && <TrendingDown className="w-4 h-4" />}
            {trend === "flat" && <Minus className="w-4 h-4" />}
            {deltaText}
          </span>
        )}
      </div>
    </Card>
  );
}
