"use client";

import useSWR from "swr";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PLATFORMS, type PlatformKey } from "@/lib/utils/platforms";
import { formatCompact } from "@/lib/utils/format";

interface Outlier {
  platform: PlatformKey;
  metric: "sessions" | "impressions" | "reach" | "engagement" | "clicks";
  current: number;
  previous: number;
  delta_pct: number;
  direction: "up" | "down";
  severity: "info" | "warning" | "alert";
}

const METRIC_LABELS: Record<Outlier["metric"], string> = {
  sessions: "sesjoner",
  impressions: "visninger",
  reach: "rekkevidde",
  engagement: "engasjement",
  clicks: "klikk",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function OutliersCard() {
  const { data, isLoading } = useSWR<Outlier[]>("/api/outliers", fetcher);

  if (isLoading) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          Avvik siste 7 dager
        </h3>
        <div className="animate-pulse h-20 bg-gray-800 rounded" />
      </Card>
    );
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">
          Avvik siste 7 dager
        </h3>
        <p className="text-xs text-gray-500">
          Ingen signifikante avvik — alt ser stabilt ut.
        </p>
      </Card>
    );
  }

  const top = data.slice(0, 6);

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3 inline-flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-400" />
        Avvik siste 7 dager
      </h3>
      <ul className="space-y-2">
        {top.map((o, i) => {
          const platform = PLATFORMS[o.platform];
          const pct = Math.round(o.delta_pct * 100);
          const isUp = o.direction === "up";
          const colorClass =
            o.severity === "alert"
              ? isUp
                ? "text-green-400"
                : "text-red-400"
              : isUp
                ? "text-green-300"
                : "text-yellow-300";
          return (
            <li
              key={`${o.platform}-${o.metric}-${i}`}
              className="flex items-center justify-between gap-3 rounded bg-gray-900/50 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: platform?.color ?? "#6b7280" }}
                />
                <span className="text-sm text-white truncate">
                  {platform?.label ?? o.platform}
                </span>
                <span className="text-xs text-gray-500">
                  {METRIC_LABELS[o.metric]}
                </span>
              </div>
              <div className={`inline-flex items-center gap-1 text-xs font-medium ${colorClass}`}>
                {isUp ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>{pct > 0 ? "+" : ""}{pct}%</span>
                <span className="text-gray-500">
                  ({formatCompact(o.previous)} → {formatCompact(o.current)})
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {data.length > 6 && (
        <p className="text-xs text-gray-500 mt-2">+ {data.length - 6} flere</p>
      )}
    </Card>
  );
}
