"use client";

import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAnomalies } from "@/hooks/use-anomalies";

export function AnomaliesWidget() {
  const { data, isLoading } = useAnomalies("active");

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 bg-gray-800 rounded" />
          <div className="h-6 w-16 bg-gray-800 rounded" />
          <div className="h-3 w-32 bg-gray-800 rounded" />
        </div>
      </Card>
    );
  }

  const anomalies = Array.isArray(data) ? data : [];
  const critical = anomalies.filter((a) => a.severity === "critical").length;
  const warning = anomalies.filter((a) => a.severity === "warning").length;
  const info = anomalies.filter((a) => a.severity === "info").length;
  const top3 = anomalies.slice(0, 3);

  if (anomalies.length === 0) {
    return (
      <Card className="p-4 border border-green-900/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400 flex items-center gap-1.5">
            <Bell className="w-4 h-4" /> Varsler
          </span>
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        </div>
        <div className="text-lg font-bold text-green-400">Alt rolig</div>
        <p className="text-xs text-gray-600 mt-1">Ingen aktive varsler akkurat nå</p>
      </Card>
    );
  }

  const hasCritical = critical > 0;
  const borderColor = hasCritical
    ? "border-red-800"
    : warning > 0
      ? "border-yellow-800"
      : "border-blue-800";

  return (
    <Card className={`p-4 border ${borderColor}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400 flex items-center gap-1.5">
          <Bell className="w-4 h-4" /> Varsler
          {hasCritical && (
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </span>
        <Link
          href="/varsler"
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          Se alle
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-3 text-xs">
        {critical > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <XCircle className="w-3 h-3" />
            {critical} kritisk
          </span>
        )}
        {warning > 0 && (
          <span className="flex items-center gap-1 text-yellow-400">
            <AlertTriangle className="w-3 h-3" />
            {warning} advarsel
          </span>
        )}
        {info > 0 && (
          <span className="flex items-center gap-1 text-blue-400">
            <Info className="w-3 h-3" />
            {info} info
          </span>
        )}
      </div>

      <div className="space-y-2">
        {top3.map((a) => {
          const color =
            a.severity === "critical"
              ? "text-red-400"
              : a.severity === "warning"
                ? "text-yellow-400"
                : "text-blue-400";
          return (
            <Link
              key={a.id}
              href="/varsler"
              className="block text-xs pb-2 border-b border-gray-800/50 last:border-b-0 hover:bg-gray-800/20 -mx-2 px-2 py-1 rounded transition-colors"
            >
              <div className={`font-medium truncate ${color}`}>{a.title}</div>
              <div className="text-gray-600 text-[10px] mt-0.5">
                {new Date(a.detected_at).toLocaleDateString("nb-NO")}
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
