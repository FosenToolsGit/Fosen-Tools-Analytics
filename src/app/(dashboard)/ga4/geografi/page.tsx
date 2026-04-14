"use client";

import { useState } from "react";
import { MapPin, Globe, Users, Bot } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { GeoMap } from "@/components/dashboard/geo-map";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useGeo } from "@/hooks/use-geo";

export default function GeografiPage() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const [excludeBots, setExcludeBots] = useState(false);
  const { data, isLoading } = useGeo(dateRange, excludeBots);

  const uniqueCountries = data
    ? new Set(data.map((r) => r.country)).size
    : 0;
  const totalSessions = data?.reduce((sum, r) => sum + r.sessions, 0) || 0;
  const totalUsers = data?.reduce((sum, r) => sum + r.total_users, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold">Geografi</h1>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          activePreset={preset}
          onPresetChange={setPreset}
          onCustomRange={setCustomRange}
        />
      </div>

      <div className="flex items-center justify-end">
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-gray-300">
          <Bot className="w-4 h-4 text-orange-400" />
          <span>Ekskluder bot-trafikk (SG, CN, HK, IN, VN, PK, BD, ID, RU, BY)</span>
          <input
            type="checkbox"
            checked={excludeBots}
            onChange={(e) => setExcludeBots(e.target.checked)}
            className="sr-only peer"
          />
          <span className="relative inline-block w-10 h-5 rounded-full bg-gray-700 peer-checked:bg-blue-600 transition">
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition ${
                excludeBots ? "translate-x-5" : ""
              }`}
            />
          </span>
        </label>
      </div>

      <MetricGrid loading={isLoading}>
        <MetricCard title="Land" value={uniqueCountries} icon={Globe} tooltip="Antall unike land besøkende kommer fra" />
        <MetricCard title="Sesjoner" value={totalSessions} icon={MapPin} tooltip="Totalt antall økter fra alle land i perioden" />
        <MetricCard title="Brukere" value={totalUsers} icon={Users} tooltip="Antall unike brukere fra alle land" />
      </MetricGrid>

      <GeoMap data={data || []} loading={isLoading} />
    </div>
  );
}
