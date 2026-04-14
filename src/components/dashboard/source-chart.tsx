"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { formatCompact, formatPercent, formatNumber } from "@/lib/utils/format";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { TrafficSourceRow } from "@/lib/services/types";

type SortColumn =
  | "channel"
  | "source"
  | "medium"
  | "sessions"
  | "total_users"
  | "engagement_rate";
type SortDirection = "asc" | "desc";

interface SourceChartProps {
  data: TrafficSourceRow[];
  loading?: boolean;
}

const CHANNEL_COLORS: Record<string, string> = {
  "Organic Search": "#22c55e",
  Direct: "#3b82f6",
  Referral: "#f59e0b",
  Social: "#ec4899",
  Email: "#8b5cf6",
  "Paid Search": "#ef4444",
  Display: "#14b8a6",
};

const DEFAULT_COLOR = "#6b7280";

interface ChannelAggregate {
  channel: string;
  sessions: number;
  color: string;
}

export function SourceChart({ data, loading }: SourceChartProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("sessions");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedData = useMemo(() => {
    if (!data?.length) return [];
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn] ?? "";
      const bVal = b[sortColumn] ?? "";
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal, "nb")
          : bVal.localeCompare(aVal, "nb");
      }
      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [data, sortColumn, sortDirection]);

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  }

  function SortIcon({ column }: { column: SortColumn }) {
    if (sortColumn !== column) {
      return <ChevronDown className="w-3 h-3 text-gray-600 inline ml-1" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3 h-3 text-blue-400 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 text-blue-400 inline ml-1" />
    );
  }

  const channelData = useMemo(() => {
    if (!data?.length) return [];
    const map = new Map<string, number>();
    for (const row of data) {
      map.set(row.channel, (map.get(row.channel) || 0) + row.sessions);
    }
    return Array.from(map.entries())
      .map(
        ([channel, sessions]): ChannelAggregate => ({
          channel,
          sessions,
          color: CHANNEL_COLORS[channel] || DEFAULT_COLOR,
        })
      )
      .sort((a, b) => b.sessions - a.sessions);
  }, [data]);

  if (loading) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">
          Trafikkkilder
        </h3>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-800 rounded-full w-48 mx-auto" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-800 rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card className="p-6 text-center text-gray-500">
        Ingen trafikkdata tilgjengelig
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-white mb-4">Trafikkkilder</h3>

      {/* Donut chart */}
      <div className="h-64 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={channelData}
              dataKey="sessions"
              nameKey="channel"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
            >
              {channelData.map((entry) => (
                <Cell key={entry.channel} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "0.5rem",
                color: "#f9fafb",
              }}
              itemStyle={{ color: "#d1d5db" }}
              formatter={(value) => [
                formatNumber(value as number),
                "Sesjoner",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-6 px-2">
        {channelData.map((entry) => (
          <div key={entry.channel} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-400">{entry.channel}</span>
          </div>
        ))}
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th
                className="text-left px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-gray-200 select-none"
                onClick={() => handleSort("channel")}
              >
                Kanal
                <SortIcon column="channel" />
              </th>
              <th
                className="text-left px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-gray-200 select-none"
                onClick={() => handleSort("source")}
              >
                Kilde
                <SortIcon column="source" />
              </th>
              <th
                className="text-left px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-gray-200 select-none"
                onClick={() => handleSort("medium")}
              >
                Medium
                <SortIcon column="medium" />
              </th>
              <th
                className="text-right px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-gray-200 select-none"
                onClick={() => handleSort("sessions")}
              >
                Sesjoner
                <SortIcon column="sessions" />
              </th>
              <th
                className="text-right px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-gray-200 select-none"
                onClick={() => handleSort("total_users")}
              >
                Brukere
                <SortIcon column="total_users" />
              </th>
              <th
                className="text-right px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-gray-200 select-none"
                onClick={() => handleSort("engagement_rate")}
              >
                Engasjement
                <SortIcon column="engagement_rate" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, i) => (
              <tr
                key={`${row.channel}-${row.source}-${row.medium}-${i}`}
                className="border-b border-gray-800/50 hover:bg-gray-800/30"
              >
                <td className="px-4 py-3 text-white">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor:
                          CHANNEL_COLORS[row.channel] || DEFAULT_COLOR,
                      }}
                    />
                    {row.channel}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {row.source || "—"}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {row.medium || "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatNumber(row.sessions)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatNumber(row.total_users)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatPercent(row.engagement_rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
