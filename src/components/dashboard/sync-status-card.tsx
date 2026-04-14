"use client";

import useSWR from "swr";
import { CheckCircle2, AlertCircle, Loader2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PLATFORMS, type PlatformKey } from "@/lib/utils/platforms";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

interface SyncLog {
  id: string;
  platform: PlatformKey;
  status: "running" | "success" | "error";
  records_synced: number | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function SyncStatusCard() {
  const { data, isLoading } = useSWR<SyncLog[]>("/api/sync-status", fetcher, {
    refreshInterval: 30_000,
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          Synkroniseringsstatus
        </h3>
        <div className="animate-pulse h-20 bg-gray-800 rounded" />
      </Card>
    );
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          Synkroniseringsstatus
        </h3>
        <p className="text-xs text-gray-500">Ingen sync-historikk ennå.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">
        Synkroniseringsstatus
      </h3>
      <ul className="space-y-2">
        {data.map((log) => {
          const platform = PLATFORMS[log.platform];
          const last = log.finished_at || log.started_at;
          const ago = last
            ? formatDistanceToNow(new Date(last), { addSuffix: true, locale: nb })
            : "—";
          return (
            <li
              key={log.id}
              className="flex items-center justify-between gap-3 rounded bg-gray-900/50 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: platform?.color ?? "#6b7280" }}
                />
                <span className="text-sm text-white truncate">
                  {platform?.label ?? log.platform}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {log.status === "success" && (
                  <span className="inline-flex items-center gap-1 text-green-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {log.records_synced ?? 0} rader
                  </span>
                )}
                {log.status === "error" && (
                  <span
                    className="inline-flex items-center gap-1 text-red-400 truncate max-w-[200px]"
                    title={log.error_message ?? ""}
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    Feilet
                  </span>
                )}
                {log.status === "running" && (
                  <span className="inline-flex items-center gap-1 text-blue-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Kjører
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-gray-500 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  {ago}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
