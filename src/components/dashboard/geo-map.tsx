"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { formatCompact, formatNumber } from "@/lib/utils/format";
import type { GeoDataRow } from "@/lib/services/types";

// Dynamically import WorldMap to avoid SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WorldMap = dynamic(
  () => import("react-svg-worldmap").then((mod) => mod.WorldMap) as any,
  { ssr: false, loading: () => <div className="h-[300px] bg-gray-800 rounded animate-pulse" /> }
) as any;

interface GeoMapProps {
  data: GeoDataRow[];
  loading?: boolean;
}

interface CountryAggregate {
  country: string;
  country_code: string;
  sessions: number;
  total_users: number;
}

// Map GA4 country names to ISO alpha-2 codes
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  "Norway": "no", "Sweden": "se", "Finland": "fi", "Denmark": "dk",
  "Germany": "de", "United Kingdom": "gb", "France": "fr", "Spain": "es",
  "Portugal": "pt", "Italy": "it", "Poland": "pl", "Ukraine": "ua",
  "Russia": "ru", "Turkey": "tr", "Türkiye": "tr",
  "United States": "us", "Canada": "ca", "Mexico": "mx",
  "Brazil": "br", "Argentina": "ar",
  "China": "cn", "Japan": "jp", "South Korea": "kr", "India": "in",
  "Australia": "au", "New Zealand": "nz",
  "South Africa": "za", "Nigeria": "ng", "Egypt": "eg",
  "Saudi Arabia": "sa", "United Arab Emirates": "ae",
  "Singapore": "sg", "Thailand": "th", "Indonesia": "id",
  "Netherlands": "nl", "Belgium": "be", "Switzerland": "ch",
  "Austria": "at", "Czechia": "cz", "Czech Republic": "cz",
  "Ireland": "ie", "Hong Kong": "hk", "Taiwan": "tw",
  "Philippines": "ph", "Vietnam": "vn", "Malaysia": "my",
  "Romania": "ro", "Hungary": "hu", "Bulgaria": "bg",
  "Croatia": "hr", "Serbia": "rs", "Slovakia": "sk",
  "Slovenia": "si", "Lithuania": "lt", "Latvia": "lv",
  "Estonia": "ee", "Iceland": "is", "Luxembourg": "lu",
  "Greece": "gr", "Colombia": "co", "Chile": "cl",
  "Peru": "pe", "Israel": "il", "Pakistan": "pk",
  "Bangladesh": "bd", "Sri Lanka": "lk", "Nepal": "np",
  "Kenya": "ke", "Morocco": "ma", "Tunisia": "tn",
  "Ghana": "gh", "Ethiopia": "et", "Tanzania": "tz",
  "Qatar": "qa", "Kuwait": "kw", "Oman": "om", "Bahrain": "bh",
  "Cyprus": "cy", "Malta": "mt", "Albania": "al",
  "North Macedonia": "mk", "Montenegro": "me", "Moldova": "md",
  "Belarus": "by", "Georgia": "ge", "Armenia": "am",
  "Azerbaijan": "az", "Kazakhstan": "kz", "Uzbekistan": "uz",
};

export function GeoMap({ data, loading }: GeoMapProps) {
  const { countryData, mapData } = useMemo(() => {
    if (!data?.length)
      return { countryData: [], mapData: [] };

    const map = new Map<string, CountryAggregate>();
    for (const row of data) {
      const existing = map.get(row.country);
      if (existing) {
        existing.sessions += row.sessions;
        existing.total_users += row.total_users;
      } else {
        map.set(row.country, {
          country: row.country,
          country_code: row.country_code,
          sessions: row.sessions,
          total_users: row.total_users,
        });
      }
    }
    const sorted = Array.from(map.values()).sort(
      (a, b) => b.sessions - a.sessions
    );

    // Build map data for react-svg-worldmap
    const worldMapData = sorted
      .map((item) => {
        const code =
          COUNTRY_NAME_TO_CODE[item.country] ||
          item.country_code?.toLowerCase() ||
          "";
        return code ? { country: code, value: item.sessions } : null;
      })
      .filter(Boolean) as { country: string; value: number }[];

    return {
      countryData: sorted,
      mapData: worldMapData,
    };
  }, [data]);

  const maxSessions = countryData.length > 0 ? countryData[0].sessions : 0;

  if (loading) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">Geografi</h3>
        <div className="animate-pulse h-[300px] bg-gray-800 rounded" />
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
    <div className="space-y-4">
      {/* World Map */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Verdenskart</h3>
        <div className="flex justify-center">
          <WorldMap
            color="#3b82f6"
            valueSuffix="sesjoner"
            size="responsive"
            data={mapData}
            backgroundColor="#111827"
            borderColor="#374151"
            tooltipBgColor="#1f2937"
            tooltipTextColor="#f9fafb"
            richInteraction
          />
        </div>
      </Card>

      {/* Top countries bar chart */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Topp land etter sesjoner
        </h3>
        <div className="space-y-2">
          {countryData.slice(0, 15).map((item) => {
            const widthPercent =
              maxSessions > 0 ? (item.sessions / maxSessions) * 100 : 0;

            return (
              <div key={item.country} className="flex items-center gap-3">
                <span className="text-gray-300 text-sm w-32 truncate flex-shrink-0">
                  {item.country}
                </span>
                <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full rounded bg-blue-500 transition-all"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                <span className="text-gray-400 text-sm w-16 text-right flex-shrink-0">
                  {formatCompact(item.sessions)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Full table */}
      <Card className="overflow-hidden">
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
              {data.slice(0, 50).map((row, i) => (
                <tr
                  key={`${row.country}-${row.city}-${i}`}
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
    </div>
  );
}
