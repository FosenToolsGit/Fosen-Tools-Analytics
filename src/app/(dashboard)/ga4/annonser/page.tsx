"use client";

import { Suspense } from "react";
import { Megaphone, Users, MousePointerClick, Target } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { CampaignTable } from "@/components/dashboard/campaign-table";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import { useCampaigns } from "@/hooks/use-campaigns";

function AnnonserContent() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading } = useCampaigns(dateRange);

  const uniqueCampaigns = data
    ? new Set(data.map((r) => r.campaign_name)).size
    : 0;
  const totalSessions = data?.reduce((sum, r) => sum + r.sessions, 0) || 0;
  const totalConversions =
    data?.reduce((sum, r) => sum + r.conversions, 0) || 0;
  const totalUsers = data?.reduce((sum, r) => sum + r.total_users, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold">Google Ads</h1>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          activePreset={preset}
          onPresetChange={setPreset}
          onCustomRange={setCustomRange}
        />
      </div>

      <MetricGrid loading={isLoading}>
        <MetricCard title="Kampanjer" value={uniqueCampaigns} icon={Megaphone} tooltip="Antall aktive Google Ads-kampanjer i perioden" />
        <MetricCard title="Sesjoner" value={totalSessions} icon={MousePointerClick} tooltip="Totalt antall besøk generert fra Google Ads" />
        <MetricCard title="Brukere" value={totalUsers} icon={Users} tooltip="Antall unike brukere fra Google Ads" />
        <MetricCard title="Konverteringer" value={totalConversions} icon={Target} tooltip="Antall måloppnåelser fra annonseklikk (f.eks. kjøp, skjema utfylt)" />
      </MetricGrid>

      <CampaignTable data={data || []} loading={isLoading} />
    </div>
  );
}

export default function AnnonserPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <AnnonserContent />
    </Suspense>
  );
}
