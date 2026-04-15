"use client";

import { useState } from "react";
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
import { format, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import type { DailyPoint } from "@/app/api/google-ads/campaigns/[campaign_id]/route";

interface Props {
  data: DailyPoint[];
}

const METRICS = [
  { key: "cost_nok", label: "Kostnad (NOK)", color: "#f97316", axis: "right" as const },
  { key: "clicks", label: "Klikk", color: "#60a5fa", axis: "left" as const },
  { key: "impressions", label: "Visninger", color: "#a78bfa", axis: "left" as const },
  { key: "conversions", label: "Konverteringer", color: "#34d399", axis: "left" as const },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

export function CampaignDailyChart({ data }: Props) {
  const [hidden, setHidden] = useState<Set<MetricKey>>(new Set());

  const chartData = data.map((d) => ({
    date: d.metric_date,
    dateLabel: format(parseISO(d.metric_date), "d. MMM", { locale: nb }),
    cost_nok: Number(d.cost_nok.toFixed(2)),
    clicks: d.clicks,
    impressions: d.impressions,
    conversions: Number(d.conversions.toFixed(2)),
  }));

  function toggle(key: MetricKey) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (!data.length) {
    return (
      <Card className="p-6 text-center text-gray-500">
        Ingen daglig data for denne kampanjen i valgt periode.
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">Daglig utvikling</h3>
        <div className="flex flex-wrap gap-2">
          {METRICS.map((m) => {
            const isHidden = hidden.has(m.key);
            return (
              <button
                key={m.key}
                onClick={() => toggle(m.key)}
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors ${
                  isHidden
                    ? "border-gray-800 text-gray-600 bg-gray-900/50"
                    : "border-gray-700 text-gray-300 bg-gray-800/50"
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: isHidden ? "#4b5563" : m.color }}
                />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="h-[340px]">
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
              yAxisId="left"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#f97316"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `kr ${v.toFixed(0)}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111827",
                border: "1px solid #374151",
                borderRadius: "8px",
                fontSize: "13px",
              }}
              labelStyle={{ color: "#9ca3af" }}
              formatter={(value, name) => {
                const num = typeof value === "number" ? value : Number(value) || 0;
                const label = String(name);
                if (label === "Kostnad (NOK)") {
                  return [
                    new Intl.NumberFormat("nb-NO", {
                      style: "currency",
                      currency: "NOK",
                      maximumFractionDigits: 2,
                    }).format(num),
                    label,
                  ];
                }
                return [new Intl.NumberFormat("nb-NO").format(num), label];
              }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            {METRICS.filter((m) => !hidden.has(m.key)).map((m) => (
              <Line
                key={m.key}
                yAxisId={m.axis}
                type="monotone"
                dataKey={m.key}
                name={m.label}
                stroke={m.color}
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
