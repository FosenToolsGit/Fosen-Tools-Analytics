"use client";

import { Suspense } from "react";
import { Swords } from "lucide-react";
import { CompetitorTable } from "@/components/dashboard/competitor-table";
import { useCompetitors, useAddCompetitor, useDeleteCompetitor } from "@/hooks/use-competitors";
import { Skeleton } from "@/components/ui/skeleton";

function KonkurrenterContent() {
  const { data: competitors, isLoading, mutate } = useCompetitors();
  const { addCompetitor } = useAddCompetitor();
  const { deleteCompetitor } = useDeleteCompetitor();

  async function handleAdd(domain: string, name: string) {
    await addCompetitor({ domain, name });
    mutate();
  }

  async function handleDelete(id: string) {
    await deleteCompetitor(id);
    mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-orange-900/30 flex items-center justify-center">
          <Swords className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Konkurrenter</h1>
          <p className="text-sm text-gray-400">
            Sammenlign fosen-tools.no med konkurrentene
          </p>
        </div>
      </div>

      <CompetitorTable
        competitors={competitors || []}
        onAdd={handleAdd}
        onDelete={handleDelete}
        loading={isLoading}
      />
    </div>
  );
}

export default function KonkurrenterPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[400px]" />}>
      <KonkurrenterContent />
    </Suspense>
  );
}
