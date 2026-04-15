"use client";

import useSWR from "swr";
import { Suspense, useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Clock,
  Play,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import type { ReportRow } from "@/app/api/keyword-generator/reports/route";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const nok = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Content() {
  const { data, isLoading, mutate } = useSWR<ReportRow[]>(
    "/api/keyword-generator/reports",
    fetcher
  );
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  async function generateNow() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/keyword-generator/weekly-report", {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Generering feilet");
      }
      await mutate();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Feil");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadReport(id: number) {
    setDownloading(id);
    try {
      const res = await fetch(`/api/keyword-generator/reports?download=${id}`);
      const json = await res.json();
      if (json.url) {
        window.open(json.url, "_blank");
      }
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ukentlige rapporter</h1>
            <p className="text-xs text-gray-500">
              Historikk over automatisk genererte intelligens-rapporter
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={generateNow} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Genererer...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-1.5" />
              Generer ny rapport nå
            </>
          )}
        </Button>
      </div>

      {genError && (
        <Card className="p-4 bg-red-950/20 border border-red-800/50 text-sm text-red-400">
          {genError}
        </Card>
      )}

      <Card className="p-4 border border-blue-900/40 bg-blue-950/10">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-300/80">
            <p className="font-medium text-blue-300 mb-1">Automatisk schedulering</p>
            <p>
              Rapportene kan genereres automatisk hver mandag ved å kjøre
              <code className="text-blue-400"> scripts/weekly-report.sh</code> fra
              launchd/cron med <code className="text-blue-400">SYNC_SECRET_KEY</code>.
              Filene lagres i Supabase storage bucket{" "}
              <code className="text-blue-400">weekly-reports/</code>.
            </p>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <MetricGrid loading />
      ) : !data || data.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          Ingen rapporter generert ennå. Klikk &quot;Generer ny rapport nå&quot; for å lage den
          første.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-gray-400 font-medium">Dato</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Periode</th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">
                    Signaler
                  </th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">
                    Skaler
                  </th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">
                    Kutt
                  </th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">
                    Negativer
                  </th>
                  <th className="px-4 py-3 text-right text-gray-400 font-medium">
                    Kostnad
                  </th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Kilde</th>
                  <th className="px-4 py-3 text-gray-400 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-b border-gray-800/50">
                    <td className="px-4 py-3 text-white">{r.report_date}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {r.period_from} → {r.period_to}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {r.signals_total}
                    </td>
                    <td className="px-4 py-3 text-right text-green-400">
                      {r.signals_scale_up}
                    </td>
                    <td className="px-4 py-3 text-right text-red-400">
                      {r.signals_cut}
                    </td>
                    <td className="px-4 py-3 text-right text-purple-400">
                      {r.signals_negative}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      {nok.format(r.total_cost_nok)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {r.triggered_by}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => downloadReport(r.id)}
                        disabled={downloading === r.id}
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                      >
                        {downloading === r.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        Last ned ({formatBytes(r.file_size_bytes)})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function RapporterPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
