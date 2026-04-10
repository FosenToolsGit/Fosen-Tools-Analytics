"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import { PLATFORMS, type PlatformKey } from "@/lib/utils/platforms";
import type { MetricRow } from "@/hooks/use-metrics";
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";

interface OverviewChartProps {
  data: MetricRow[];
  metric: keyof Pick<
    MetricRow,
    "impressions" | "reach" | "engagement" | "clicks"
  >;
  title: string;
}

export function OverviewChart({ data, metric, title }: OverviewChartProps) {
  // Group by date, with one value per platform
  const dateMap = new Map<string, Record<string, number>>();

  for (const row of data) {
    const existing = dateMap.get(row.metric_date) || {};
    existing[row.platform] = row[metric] as number;
    dateMap.set(row.metric_date, existing);
  }

  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, platforms]) => ({
      date,
      dateLabel: format(parseISO(date), "d. MMM", { locale: nb }),
      ...platforms,
    }));

  const activePlatforms = [
    ...new Set(data.map((r) => r.platform)),
  ] as PlatformKey[];

  return (
    <Card className="p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-4">{title}</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
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
            <Legend />
            {activePlatforms.map((platform) => (
              <Line
                key={platform}
                type="monotone"
                dataKey={platform}
                name={PLATFORMS[platform]?.label || platform}
                stroke={PLATFORMS[platform]?.color || "#6b7280"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
