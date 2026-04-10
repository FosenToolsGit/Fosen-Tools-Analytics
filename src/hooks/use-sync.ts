"use client";

import { useState } from "react";
import type { PlatformKey } from "@/lib/utils/platforms";

interface SyncResult {
  platform: string;
  status: "success" | "error";
  records_synced?: number;
  error?: string;
}

export function useSync() {
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<SyncResult[]>([]);

  async function syncAll() {
    setSyncing(true);
    setResults([]);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([{ platform: "all", status: "error", error: "Network error" }]);
    } finally {
      setSyncing(false);
    }
  }

  async function syncPlatform(platform: PlatformKey) {
    setSyncing(true);
    try {
      const res = await fetch(`/api/sync/${platform}`, { method: "POST" });
      const data = await res.json();
      setResults((prev) => [...prev, data]);
    } catch {
      setResults((prev) => [
        ...prev,
        { platform, status: "error", error: "Network error" },
      ]);
    } finally {
      setSyncing(false);
    }
  }

  return { syncing, results, syncAll, syncPlatform };
}
