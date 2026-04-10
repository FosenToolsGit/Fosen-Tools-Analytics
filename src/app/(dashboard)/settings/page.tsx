"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSync } from "@/hooks/use-sync";
import { PLATFORMS, PLATFORM_KEYS } from "@/lib/utils/platforms";
import { RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const { syncing, results, syncAll, syncPlatform } = useSync();

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Innstillinger</h1>

      <Card>
        <h2 className="text-lg font-semibold mb-4">Datasynkronisering</h2>
        <p className="text-sm text-gray-400 mb-6">
          Synkroniser data fra alle plattformer manuelt, eller velg en enkelt
          plattform.
        </p>

        <div className="space-y-4">
          <Button onClick={syncAll} disabled={syncing}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`}
            />
            Synkroniser alle
          </Button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {PLATFORM_KEYS.map((key) => {
              const platform = PLATFORMS[key];
              const result = results.find((r) => r.platform === key);

              return (
                <Card key={key} className="p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <platform.icon
                      className="w-4 h-4"
                      style={{ color: platform.color }}
                    />
                    <span className="text-sm font-medium">
                      {platform.label}
                    </span>
                  </div>

                  {result && (
                    <Badge
                      variant={
                        result.status === "success" ? "success" : "error"
                      }
                    >
                      {result.status === "success"
                        ? `${result.records_synced} poster synkronisert`
                        : result.error || "Feil"}
                    </Badge>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => syncPlatform(key)}
                    disabled={syncing}
                  >
                    Synkroniser
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold mb-4">API-konfigurasjon</h2>
        <p className="text-sm text-gray-400">
          API-nøkler og tokens konfigureres via miljøvariabler (.env.local).
          Se dokumentasjonen for oppsett av hver plattform.
        </p>

        <div className="mt-4 space-y-2">
          {PLATFORM_KEYS.map((key) => {
            const platform = PLATFORMS[key];
            return (
              <div
                key={key}
                className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <platform.icon
                    className="w-4 h-4"
                    style={{ color: platform.color }}
                  />
                  <span className="text-sm">{platform.label}</span>
                </div>
                <Badge variant="default">Konfigurert via .env</Badge>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
