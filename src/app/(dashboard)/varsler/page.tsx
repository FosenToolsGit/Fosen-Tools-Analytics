"use client";

import { Suspense, useState } from "react";
import {
  Bell,
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle2,
  Archive,
  Play,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { useAnomalies } from "@/hooks/use-anomalies";
import type { AnomalyRow } from "@/app/api/anomalies/route";

function severityStyle(s: AnomalyRow["severity"]) {
  switch (s) {
    case "critical":
      return {
        border: "border-red-800",
        bg: "bg-red-950/20",
        text: "text-red-400",
        icon: XCircle,
      };
    case "warning":
      return {
        border: "border-yellow-800",
        bg: "bg-yellow-950/20",
        text: "text-yellow-400",
        icon: AlertTriangle,
      };
    case "info":
      return {
        border: "border-blue-800",
        bg: "bg-blue-950/20",
        text: "text-blue-400",
        icon: Info,
      };
  }
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    platform_clicks: "Plattform: Klikk",
    platform_engagement: "Plattform: Engasjement",
    platform_reach: "Plattform: Rekkevidde",
    platform_sessions: "Plattform: Sesjoner",
    google_ads_cost_spike: "Google Ads: Kostnad-spike",
    google_ads_roas_drop: "Google Ads: ROAS-fall",
    conversion_stop: "Konverterings-stopp",
    new_competitor_brand: "Nytt konkurrent-søk",
  };
  return map[cat] ?? cat;
}

function AnomalyCard({
  anomaly,
  onAcknowledge,
  onResolve,
}: {
  anomaly: AnomalyRow;
  onAcknowledge: (id: number) => void;
  onResolve: (id: number) => void;
}) {
  const style = severityStyle(anomaly.severity);
  const Icon = style.icon;

  return (
    <Card className={`p-4 border ${style.border} ${style.bg}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${style.text}`} />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${style.border} ${style.bg} ${style.text} uppercase font-semibold`}
                >
                  {anomaly.severity}
                </span>
                <span className="text-xs text-gray-500">
                  {categoryLabel(anomaly.category)}
                </span>
                <span className="text-xs text-gray-600">
                  {new Date(anomaly.detected_at).toLocaleString("nb-NO")}
                </span>
              </div>
              <h3 className="text-white font-semibold">{anomaly.title}</h3>
            </div>
            {anomaly.status === "active" && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => onAcknowledge(anomaly.id)}
                  className="text-xs px-2 py-1 rounded border border-gray-700 bg-gray-900/50 text-gray-400 hover:text-white"
                  title="Marker som sett"
                >
                  Sett
                </button>
                <button
                  onClick={() => onResolve(anomaly.id)}
                  className="text-xs px-2 py-1 rounded border border-green-800 bg-green-950/30 text-green-400 hover:text-green-300"
                  title="Løst"
                >
                  Løst
                </button>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-300">{anomaly.description}</p>
          {anomaly.suggested_action && (
            <p className="text-xs text-gray-500 italic">
              💡 {anomaly.suggested_action}
            </p>
          )}
          {anomaly.status !== "active" && (
            <p className="text-xs text-gray-600">
              {anomaly.status === "acknowledged"
                ? `Sett av ${anomaly.acknowledged_by} den ${anomaly.acknowledged_at ? new Date(anomaly.acknowledged_at).toLocaleDateString("nb-NO") : ""}`
                : anomaly.status === "resolved"
                  ? "Markert som løst"
                  : "Utløpt"}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function Content() {
  const [filter, setFilter] = useState<"active" | "all">("active");
  const [running, setRunning] = useState(false);
  const { data, isLoading, mutate } = useAnomalies(
    filter === "active" ? "active" : undefined
  );

  async function updateStatus(id: number, action: "acknowledge" | "resolve") {
    try {
      await fetch("/api/anomalies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      mutate();
    } catch (err) {
      console.error("Failed to update anomaly status:", err);
    }
  }

  async function runDetection() {
    setRunning(true);
    try {
      await fetch("/api/anomalies/detect", { method: "POST" });
      await mutate();
    } finally {
      setRunning(false);
    }
  }

  const counts = {
    critical: (data ?? []).filter((a) => a.severity === "critical").length,
    warning: (data ?? []).filter((a) => a.severity === "warning").length,
    info: (data ?? []).filter((a) => a.severity === "info").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-900/30 flex items-center justify-center">
            <Bell className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Varsler</h1>
            <p className="text-xs text-gray-500">
              Uvanlige endringer i dataene dine — oppdaget automatisk
            </p>
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={runDetection} disabled={running}>
          {running ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Sjekker...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-1.5" />
              Kjør sjekk nå
            </>
          )}
        </Button>
      </div>

      {/* Filter + totaler */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border border-red-900/40">
          <div className="flex items-center gap-2 text-xs text-red-400">
            <XCircle className="w-3 h-3" /> Kritiske
          </div>
          <div className="text-2xl font-bold text-red-400 mt-1">{counts.critical}</div>
        </Card>
        <Card className="p-4 border border-yellow-900/40">
          <div className="flex items-center gap-2 text-xs text-yellow-400">
            <AlertTriangle className="w-3 h-3" /> Advarsler
          </div>
          <div className="text-2xl font-bold text-yellow-400 mt-1">{counts.warning}</div>
        </Card>
        <Card className="p-4 border border-blue-900/40">
          <div className="flex items-center gap-2 text-xs text-blue-400">
            <Info className="w-3 h-3" /> Info
          </div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{counts.info}</div>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter("active")}
          className={`px-3 py-1.5 text-sm rounded-md border ${
            filter === "active"
              ? "border-orange-700 bg-orange-950/30 text-orange-300"
              : "border-gray-800 bg-gray-900/50 text-gray-400"
          }`}
        >
          Aktive
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 text-sm rounded-md border ${
            filter === "all"
              ? "border-orange-700 bg-orange-950/30 text-orange-300"
              : "border-gray-800 bg-gray-900/50 text-gray-400"
          }`}
        >
          Alle (inkl. håndterte)
        </button>
      </div>

      {isLoading ? (
        <MetricGrid loading />
      ) : !data || data.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <h3 className="text-white font-semibold">Alt rolig</h3>
          <p className="text-sm text-gray-500 mt-1">
            Ingen {filter === "active" ? "aktive " : ""}varsler. Hvis noe uvanlig
            skjer med kampanjer, konverteringer eller trafikk, dukker det opp her.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((a) => (
            <AnomalyCard
              key={a.id}
              anomaly={a}
              onAcknowledge={(id) => updateStatus(id, "acknowledge")}
              onResolve={(id) => updateStatus(id, "resolve")}
            />
          ))}
        </div>
      )}

      <Card className="p-4 border border-gray-800 bg-gray-900/30 text-xs text-gray-500">
        <div className="flex items-start gap-2">
          <Archive className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-gray-400 mb-1">Om varslene</p>
            <p>
              Systemet sjekker automatisk etter hver sync. Varsler lagres i 30 dager,
              deretter markeres de som utløpt. Samme type anomali på samme mål
              innenfor 24 timer blir bare én rad — unngår spam.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function VarslerPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
