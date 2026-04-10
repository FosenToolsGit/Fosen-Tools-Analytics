"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { formatCompact } from "@/lib/utils/format";
import { Trash2, Plus } from "lucide-react";

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

export function CompetitorTable({
  competitors,
  onAdd,
  onDelete,
  loading,
}: CompetitorTableProps) {
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");

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
                <th className="text-left px-4 py-3 text-gray-400 font-medium">
                  Nettside
                </th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">
                  Navn
                </th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">
                  Estimert trafikk
                </th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">
                  Rangering
                </th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">
                  Notater
                </th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {competitors.map((comp) => (
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
