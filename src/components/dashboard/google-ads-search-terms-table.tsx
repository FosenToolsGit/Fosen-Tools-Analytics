"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { formatCompact, formatNumber } from "@/lib/utils/format";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { SearchTermAggregate } from "@/app/api/google-ads/search-terms/route";

interface Props {
  data: SearchTermAggregate[];
  loading?: boolean;
  showSource?: boolean;
}

type SortColumn =
  | "search_term"
  | "source"
  | "impressions"
  | "clicks"
  | "ctr"
  | "cost_nok"
  | "conversions";
type SortDirection = "asc" | "desc";

const nok = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});
const pct = new Intl.NumberFormat("nb-NO", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function GoogleAdsSearchTermsTable({
  data,
  loading,
  showSource = true,
}: Props) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("clicks");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "search_term" | "pmax_insight"
  >("all");

  const filtered = useMemo(() => {
    if (!data?.length) return [];
    if (sourceFilter === "all") return data;
    return data.filter((r) => r.source === sourceFilter);
  }, [data, sourceFilter]);

  const sorted = useMemo(() => {
    if (!filtered.length) return [];
    return [...filtered].sort((a, b) => {
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
  }, [filtered, sortColumn, sortDirection]);

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  }

  function SortIcon({ column }: { column: SortColumn }) {
    if (sortColumn !== column)
      return <ChevronDown className="w-3.5 h-3.5 text-gray-600" />;
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
        Ingen søketerm-data funnet. Kjør sync for å hente fra Google.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {showSource && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Kilde:</span>
          {[
            { key: "all", label: "Alle" },
            { key: "search_term", label: "Search-kampanjer" },
            { key: "pmax_insight", label: "Performance Max" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() =>
                setSourceFilter(f.key as "all" | "search_term" | "pmax_insight")
              }
              className={`px-3 py-1.5 rounded-md border transition-colors ${
                sourceFilter === f.key
                  ? "border-blue-700 bg-blue-900/30 text-blue-300"
                  : "border-gray-800 bg-gray-900/50 text-gray-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="text-gray-600 ml-auto">{sorted.length} termer</span>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th
                  className="px-4 py-3 text-left text-gray-400 font-medium cursor-pointer select-none hover:text-gray-200"
                  onClick={() => handleSort("search_term")}
                >
                  <span className="inline-flex items-center gap-1">
                    Søketerm
                    <SortIcon column="search_term" />
                  </span>
                </th>
                {showSource && (
                  <th
                    className="px-4 py-3 text-left text-gray-400 font-medium cursor-pointer select-none hover:text-gray-200"
                    onClick={() => handleSort("source")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Kilde
                      <SortIcon column="source" />
                    </span>
                  </th>
                )}
                {(
                  [
                    { key: "impressions", label: "Visninger" },
                    { key: "clicks", label: "Klikk" },
                    { key: "ctr", label: "CTR" },
                    { key: "cost_nok", label: "Kostnad" },
                    { key: "conversions", label: "Konv." },
                  ] as const
                ).map((c) => (
                  <th
                    key={c.key}
                    className="px-4 py-3 text-right text-gray-400 font-medium cursor-pointer select-none hover:text-gray-200"
                    onClick={() => handleSort(c.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      <SortIcon column={c.key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr
                  key={`${row.source}-${row.search_term}-${i}`}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 text-white">{row.search_term}</td>
                  {showSource && (
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          row.source === "pmax_insight"
                            ? "border-purple-800 bg-purple-900/30 text-purple-300"
                            : "border-blue-800 bg-blue-900/30 text-blue-300"
                        }`}
                      >
                        {row.source === "pmax_insight" ? "Pmax" : "Search"}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-right text-gray-300">
                    {formatCompact(row.impressions)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {formatCompact(row.clicks)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {pct.format(row.ctr)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {row.source === "pmax_insight"
                      ? "—"
                      : nok.format(row.cost_nok)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {formatNumber(row.conversions)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {showSource && (
        <p className="text-xs text-gray-600">
          Pmax-termer viser ikke kostnad — Google holder det tilbake. De viser
          hvilke søk som trigget Performance Max-annonsene, gruppert i
          kategorier.
        </p>
      )}
    </div>
  );
}
