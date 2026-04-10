"use client";

import { Menu, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
    } catch {
      // TODO: show error toast
    } finally {
      setSyncing(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-16 border-b border-gray-800 bg-gray-950 flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-400 hover:text-white"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold text-white">Analytics</h2>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSync}
          disabled={syncing}
        >
          <RefreshCw
            className={cn("w-4 h-4 mr-2", syncing && "animate-spin")}
          />
          {syncing ? "Synkroniserer..." : "Synkroniser"}
        </Button>

        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-white transition-colors"
          title="Logg ut"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
