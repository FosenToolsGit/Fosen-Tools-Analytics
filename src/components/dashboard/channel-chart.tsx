"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import { PLATFORMS, type PlatformKey } from "@/lib/utils/platforms";
import type { MetricRow } from "@/hooks/use-metrics";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";

interface ChannelChartProps {
  data: MetricRow[];
  platform: PlatformKey;
  metric: keyof Pick<
    MetricRow,
    "impressions" | "reach" | "engagement" | "clicks" | "sessions" | "pageviews"
  >;
  title: string;
}

export function ChannelChart({
  data,
  platform,
  metric,
  title,
}: ChannelChartProps) {
  const chartData = data
    .filter((r) => r.platform === platform)
    .sort((a, b) => a.metric_date.localeCompare(b.metric_date))
    .map((row) => ({
      date: row.metric_date,
      dateLabel: format(parseISO(row.metric_date), "d. MMM", { locale: nb }),
      value: row[metric] as number,
    }));

  const color = PLATFORMS[platform]?.color || "#6b7280";

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-4">{title}</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="dateLabel"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111827",
                border: "1px solid #374151",
                borderRadius: "8px",
                fontSize: "13px",
              }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Bar
              dataKey="value"
              fill={color}
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
