"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { formatCompact, formatNumber } from "@/lib/utils/format";
import type { GeoDataRow } from "@/lib/services/types";

interface GeoMapProps {
  data: GeoDataRow[];
  loading?: boolean;
}

interface CountryAggregate {
  country: string;
  country_code: string;
  sessions: number;
}

export function GeoMap({ data, loading }: GeoMapProps) {
  const countryData = useMemo(() => {
    if (!data?.length) return [];
    const map = new Map<string, CountryAggregate>();
    for (const row of data) {
      const existing = map.get(row.country);
      if (existing) {
        existing.sessions += row.sessions;
      } else {
        map.set(row.country, {
          country: row.country,
          country_code: row.country_code,
          sessions: row.sessions,
        });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 15);
  }, [data]);

  const maxSessions = countryData.length > 0 ? countryData[0].sessions : 0;

  if (loading) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Geografi</h3>
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-6 bg-gray-800 rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card className="p-6 text-center text-gray-500">
        Ingen geodata tilgjengelig
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-white mb-4">Geografi</h3>

      {/* Bar chart */}
      <div className="space-y-2 mb-6">
        {countryData.map((item) => {
          const widthPercent =
            maxSessions > 0 ? (item.sessions / maxSessions) * 100 : 0;
          const opacity = Math.max(
            0.3,
            maxSessions > 0 ? item.sessions / maxSessions : 0.3
          );

          return (
            <div key={item.country_code} className="flex items-center gap-3">
              <span className="text-gray-300 text-sm w-32 truncate flex-shrink-0">
                {item.country}
              </span>
              <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
                <div
                  className="h-full rounded bg-blue-500 transition-all"
                  style={{
                    width: `${widthPercent}%`,
                    opacity,
                  }}
                />
              </div>
              <span className="text-gray-400 text-sm w-16 text-right flex-shrink-0">
                {formatCompact(item.sessions)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Full table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">
                Land
              </th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">
                By
              </th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">
                Sesjoner
              </th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">
                Brukere
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={`${row.country_code}-${row.city}-${i}`}
                className="border-b border-gray-800/50 hover:bg-gray-800/30"
              >
                <td className="px-4 py-3 text-white">{row.country}</td>
                <td className="px-4 py-3 text-gray-300">
                  {row.city || "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatNumber(row.sessions)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatNumber(row.total_users)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
