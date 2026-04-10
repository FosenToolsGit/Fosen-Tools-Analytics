"use client";

import { Badge } from "@/components/ui/badge";

interface SyncStatusBadgeProps {
  status: "success" | "error" | "running" | "never";
  lastSync?: string;
}

export function SyncStatusBadge({ status, lastSync }: SyncStatusBadgeProps) {
  const variants = {
    success: "success" as const,
    error: "error" as const,
    running: "warning" as const,
    never: "default" as const,
  };

  const labels = {
    success: "Synkronisert",
    error: "Feil",
    running: "Synkroniserer...",
    never: "Ikke synkronisert",
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={variants[status]}>{labels[status]}</Badge>
      {lastSync && (
        <span className="text-xs text-gray-500">{lastSync}</span>
      )}
    </div>
  );
}
