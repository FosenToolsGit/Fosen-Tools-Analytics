"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { formatCompact, formatPercent, formatNumber } from "@/lib/utils/format";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { AdCampaignRow } from "@/lib/services/types";

interface CampaignTableProps {
  data: AdCampaignRow[];
  loading?: boolean;
}

type SortColumn =
  | "campaign_name"
  | "ad_group"
  | "keyword"
  | "sessions"
  | "total_users"
  | "conversions"
  | "engagement_rate";
type SortDirection = "asc" | "desc";

export function CampaignTable({ data, loading }: CampaignTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("sessions");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sorted = useMemo(() => {
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
      return <ChevronDown className="w-3.5 h-3.5 text-gray-600" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-400" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
    );
  }

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-800 rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card className="p-6 text-center text-gray-500">
        Ingen kampanjedata funnet. Koble Google Ads til GA4 for å se
        kampanjedata.
      </Card>
    );
  }

  const columns: {
    key: SortColumn;
    label: string;
    align: "left" | "right";
  }[] = [
    { key: "campaign_name", label: "Kampanje", align: "left" },
    { key: "ad_group", label: "Annonsegruppe", align: "left" },
    { key: "keyword", label: "Søkeord", align: "left" },
    { key: "sessions", label: "Sesjoner", align: "right" },
    { key: "total_users", label: "Brukere", align: "right" },
    { key: "conversions", label: "Konverteringer", align: "right" },
    { key: "engagement_rate", label: "Engasjement", align: "right" },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-gray-400 font-medium cursor-pointer select-none hover:text-gray-200 ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon column={col.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr
                key={`${row.campaign_name}-${row.ad_group}-${i}`}
                className="border-b border-gray-800/50 hover:bg-gray-800/30"
              >
                <td className="px-4 py-3 text-white">{row.campaign_name}</td>
                <td className="px-4 py-3 text-gray-300">
                  {row.ad_group || "—"}
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {row.keyword || "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatCompact(row.sessions)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatCompact(row.total_users)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatNumber(row.conversions)}
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
