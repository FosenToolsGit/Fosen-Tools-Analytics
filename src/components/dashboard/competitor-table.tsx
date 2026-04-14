"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { formatCompact } from "@/lib/utils/format";
import { Trash2, Plus, ChevronUp, ChevronDown } from "lucide-react";

export interface Competitor {
  id: string;
  domain: string;
  name: string;
  estimated_traffic: number | null;
  ranking: number | null;
  notes: string | null;
}

interface CompetitorTableProps {
  competitors: Competitor[];
  onAdd: (domain: string, name: string) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

type SortColumn = "domain" | "name" | "estimated_traffic" | "ranking";
type SortDirection = "asc" | "desc";

export function CompetitorTable({
  competitors,
  onAdd,
  onDelete,
  loading,
}: CompetitorTableProps) {
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sorted = useMemo(() => {
    if (!competitors?.length) return [];
    return [...competitors].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal, "nb")
          : bVal.localeCompare(aVal, "nb");
      }
      return sortDirection === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [competitors, sortColumn, sortDirection]);

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedDomain = domain.trim();
    const trimmedName = name.trim();
    if (!trimmedDomain || !trimmedName) return;
    onAdd(trimmedDomain, trimmedName);
    setDomain("");
    setName("");
  }

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse space-y-4 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-800 rounded" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-white mb-4">Konkurrenter</h3>

      {/* Add form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Domene"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="text"
          placeholder="Navn"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Legg til
        </button>
      </form>

      {/* Table */}
      {!competitors?.length ? (
        <p className="text-center text-gray-500 py-4">
          Ingen konkurrenter lagt til ennå
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th
                  className="text-left px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-gray-200 select-none"
                  onClick={() => handleSort("domain")}
                >
                  Nettside
                  <SortIcon column="domain" />
                </th>
                <th
                  className="text-left px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-gray-200 select-none"
                  onClick={() => handleSort("name")}
                >
                  Navn
                  <SortIcon column="name" />
                </th>
                <th
                  className="text-right px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-gray-200 select-none"
                  onClick={() => handleSort("estimated_traffic")}
                >
                  Estimert trafikk
                  <SortIcon column="estimated_traffic" />
                </th>
                <th
                  className="text-right px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-gray-200 select-none"
                  onClick={() => handleSort("ranking")}
                >
                  Rangering
                  <SortIcon column="ranking" />
                </th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">
                  Notater
                </th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((comp) => (
                <tr
                  key={comp.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 text-white">{comp.domain}</td>
                  <td className="px-4 py-3 text-gray-300">{comp.name}</td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {comp.estimated_traffic != null
                      ? formatCompact(comp.estimated_traffic)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    {comp.ranking != null ? comp.ranking : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 truncate max-w-[200px]">
                    {comp.notes || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onDelete(comp.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                      aria-label={`Slett ${comp.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
