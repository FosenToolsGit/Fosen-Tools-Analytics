"use client";

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
}

export function MetricCard({
  title,
  value,
  previousValue,
  format = "number",
  icon: Icon,
}: MetricCardProps) {
  const formatted = format === "percent" ? formatPercent(value) : formatCompact(value);

  let trend: "up" | "down" | "flat" = "flat";
  let deltaText = "";
  if (previousValue !== undefined) {
    if (value > previousValue) trend = "up";
    else if (value < previousValue) trend = "down";
    deltaText = formatDelta(value, previousValue);
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">{title}</span>
        <Icon className="w-5 h-5 text-gray-500" />
      </div>

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
