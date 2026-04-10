"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { formatCompact, formatPercent, formatNumber } from "@/lib/utils/format";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { SearchKeywordRow } from "@/lib/services/types";

interface KeywordTableProps {
  data: SearchKeywordRow[];
  loading?: boolean;
}

type SortColumn = "query" | "position" | "clicks" | "impressions" | "ctr";
type SortDirection = "asc" | "desc";

export function KeywordTable({ data, loading }: KeywordTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("clicks");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sorted = useMemo(() => {
    if (!data?.length) return [];
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
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
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-800 rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card className="p-6 text-center text-gray-500">
        Ingen søkeorddata. Koble Google Search Console til GA4 for å se søkeord.
      </Card>
    );
  }

  const columns: { key: SortColumn; label: string; align: "left" | "right" }[] = [
    { key: "query", label: "Søkeord", align: "left" },
    { key: "position", label: "Posisjon", align: "right" },
    { key: "clicks", label: "Klikk", align: "right" },
    { key: "impressions", label: "Visninger", align: "right" },
    { key: "ctr", label: "CTR", align: "right" },
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
                key={`${row.query}-${i}`}
                className="border-b border-gray-800/50 hover:bg-gray-800/30"
              >
                <td className="px-4 py-3 text-white">{row.query}</td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {row.position.toFixed(1)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatCompact(row.clicks)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatCompact(row.impressions)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {formatPercent(row.ctr)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
