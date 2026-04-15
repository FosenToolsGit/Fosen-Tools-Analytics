"use client";

import { Fragment, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { formatCompact, formatPercent } from "@/lib/utils/format";
import { formatDateNorwegian } from "@/lib/utils/date";
import { ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import type { SearchKeywordRow } from "@/lib/services/types";
import { TagCell } from "@/components/tags/tag-cell";
import { TagFilter } from "@/components/tags/tag-filter";
import { BulkTagToolbar } from "@/components/tags/bulk-tag-toolbar";
import { useTaggingsForEntityType } from "@/hooks/use-tags";
import { keywordEntityKey, type Tag } from "@/lib/types/tags";

interface KeywordTableProps {
  data: SearchKeywordRow[];
  loading?: boolean;
}

type SortColumn = "query" | "position" | "clicks" | "impressions" | "ctr";
type SortDirection = "asc" | "desc";

export function KeywordTable({ data, loading }: KeywordTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("clicks");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: taggings } = useTaggingsForEntityType("keyword");

  const tagsByKey = useMemo(() => {
    const map = new Map<string, Tag[]>();
    taggings?.forEach((t) => {
      const list = map.get(t.entity_key) ?? [];
      list.push(t.tag);
      map.set(t.entity_key, list);
    });
    return map;
  }, [taggings]);

  const filtered = useMemo(() => {
    if (!data?.length) return [];
    if (!tagFilter) return data;
    return data.filter((row) => {
      const tags = tagsByKey.get(keywordEntityKey(row.query));
      return tags?.some((t) => t.id === tagFilter);
    });
  }, [data, tagFilter, tagsByKey]);

  const sorted = useMemo(() => {
    if (!filtered.length) return [];
    return [...filtered].sort((a, b) => {
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
  }, [filtered, sortColumn, sortDirection]);

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  }

  function toggleSelected(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === sorted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((r) => keywordEntityKey(r.query))));
    }
  }

  function toggleExpanded(query: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(query)) {
        next.delete(query);
      } else {
        next.add(query);
      }
      return next;
    });
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

  const allSelected = sorted.length > 0 && selected.size === sorted.length;

  return (
    <div className="space-y-3">
      <BulkTagToolbar
        entityType="keyword"
        selectedKeys={Array.from(selected)}
        onClear={() => setSelected(new Set())}
      />
      <div className="flex items-center justify-end">
        <TagFilter value={tagFilter} onChange={setTagFilter} />
      </div>
      <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="w-8 px-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-900"
                  aria-label="Velg alle"
                />
              </th>
              <th className="w-8" />
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
              <th className="px-4 py-3 text-left text-gray-400 font-medium">Tags</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const isExpanded = expanded.has(row.query);
              const hasDaily = row.daily && row.daily.length > 1;
              const entityKey = keywordEntityKey(row.query);
              const isSelected = selected.has(entityKey);

              return (
                <Fragment key={row.query}>
                  <tr
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${
                      hasDaily ? "cursor-pointer" : ""
                    } ${isSelected ? "bg-blue-950/30" : ""}`}
                    onClick={() => hasDaily && toggleExpanded(row.query)}
                  >
                    <td
                      className="px-2 py-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelected(entityKey);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelected(entityKey)}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-900"
                        aria-label="Velg rad"
                      />
                    </td>
                    <td className="px-2 py-3 text-gray-500">
                      {hasDaily ? (
                        isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {row.query}
                      {hasDaily && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({row.daily!.length} dager)
                        </span>
                      )}
                    </td>
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
                    <td className="px-4 py-3">
                      <TagCell
                        tags={tagsByKey.get(keywordEntityKey(row.query)) ?? []}
                        entityType="keyword"
                        entityKey={keywordEntityKey(row.query)}
                      />
                    </td>
                  </tr>
                  {isExpanded && row.daily && (
                    <tr className="bg-gray-900/50">
                      <td colSpan={8} className="px-12 py-3">
                        <div className="text-xs text-gray-500 mb-2">
                          Daglig fordeling:
                        </div>
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left py-1">Dato</th>
                              <th className="text-right py-1">Posisjon</th>
                              <th className="text-right py-1">Klikk</th>
                              <th className="text-right py-1">Visninger</th>
                              <th className="text-right py-1">CTR</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.daily.map((d) => (
                              <tr
                                key={d.metric_date}
                                className="text-gray-400"
                              >
                                <td className="py-1">
                                  {formatDateNorwegian(new Date(d.metric_date))}
                                </td>
                                <td className="text-right py-1">
                                  {d.position.toFixed(1)}
                                </td>
                                <td className="text-right py-1">
                                  {d.clicks}
                                </td>
                                <td className="text-right py-1">
                                  {d.impressions}
                                </td>
                                <td className="text-right py-1">
                                  {formatPercent(d.ctr)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      </Card>
    </div>
  );
}
