"use client";

import useSWR from "swr";
import { Suspense } from "react";
import {
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Undo2,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import type { AutoActionRow } from "@/app/api/google-ads/auto-actions/route";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function statusIcon(status: AutoActionRow["status"]) {
  switch (status) {
    case "applied":
      return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-400" />;
    case "pending":
      return <Clock className="w-4 h-4 text-yellow-400" />;
    case "reverted":
      return <Undo2 className="w-4 h-4 text-gray-400" />;
  }
}

function Content() {
  const { data, isLoading } = useSWR<AutoActionRow[]>(
    "/api/google-ads/auto-actions",
    fetcher
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
          <History className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Auto-actions logg</h1>
          <p className="text-xs text-gray-500">
            Alle endringer systemet har gjort mot Google Ads
          </p>
        </div>
      </div>

      {isLoading ? (
        <MetricGrid loading />
      ) : !data || data.length === 0 ? (
        <Card className="p-6 text-center text-gray-500">
          Ingen auto-actions registrert ennå. Når du legger til negative keywords via
          Intelligens-siden, vil de dukke opp her.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-gray-400 font-medium">Status</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Handling</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Detaljer</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Bruker</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Tid</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const payload = row.payload as Record<string, unknown>;
                  return (
                    <tr key={row.id} className="border-b border-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {statusIcon(row.status)}
                          <span
                            className={`text-xs uppercase ${
                              row.status === "applied"
                                ? "text-green-400"
                                : row.status === "failed"
                                  ? "text-red-400"
                                  : row.status === "pending"
                                    ? "text-yellow-400"
                                    : "text-gray-400"
                            }`}
                          >
                            {row.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white">
                        {row.action_type === "add_negative_keyword"
                          ? "Negativ keyword lagt til"
                          : row.action_type}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-xs">
                        <div>
                          <span className="font-medium">
                            {String(payload.keyword || "")}
                          </span>{" "}
                          <span className="text-gray-500">
                            ({String(payload.match_type || "")})
                          </span>
                        </div>
                        <div className="text-gray-600 mt-0.5">
                          Kampanje: {String(payload.campaign_id || "")}
                        </div>
                        {row.error_message && (
                          <div className="text-red-400 mt-1 flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span>{row.error_message}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {row.applied_by || "system"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(row.created_at).toLocaleString("nb-NO")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card className="p-4 border border-blue-900/40 bg-blue-950/10">
        <p className="text-xs text-blue-300/80">
          Alle auto-actions logges her med fullstendig payload. Hvis noe gikk feil,
          kan du rette det manuelt i Google Ads. Framtidig: &quot;Reverser&quot;-knapp per
          handling.
        </p>
      </Card>
    </div>
  );
}

export default function AutoActionsPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
