"use client";

import { Card } from "@/components/ui/card";
import { Coins, MousePointerClick, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useGoogleAdsCampaigns } from "@/hooks/use-google-ads";
import { formatCompact, formatDelta } from "@/lib/utils/format";
import type { DateRange } from "@/lib/utils/date";

interface Props {
  dateRange: DateRange;
  previousRange?: DateRange;
  compare?: boolean;
}

const nok = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});
const nokCpc = new Intl.NumberFormat("nb-NO", {
  style: "currency",
  currency: "NOK",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function totals(rows: { cost_nok: number; clicks: number }[] | undefined) {
  if (!rows)
    return { totalCost: 0, totalClicks: 0, avgCpc: 0, campaignCount: 0 };
  let totalCost = 0;
  let totalClicks = 0;
  for (const r of rows) {
    totalCost += Number(r.cost_nok) || 0;
    totalClicks += Number(r.clicks) || 0;
  }
  const avgCpc = totalClicks > 0 ? totalCost / totalClicks : 0;
  return { totalCost, totalClicks, avgCpc, campaignCount: rows.length };
}

export function GoogleAdsSpendCard({ dateRange, previousRange, compare }: Props) {
  const { data, isLoading } = useGoogleAdsCampaigns(dateRange);
  const { data: prevData } = useGoogleAdsCampaigns(
    compare && previousRange ? previousRange : dateRange
  );

  const current = totals(Array.isArray(data) ? data : undefined);
  const previous =
    compare && previousRange
      ? totals(Array.isArray(prevData) ? prevData : undefined)
      : null;

  let trend: "up" | "down" | "flat" = "flat";
  let deltaText = "";
  if (previous) {
    if (current.totalCost > previous.totalCost) trend = "up";
    else if (current.totalCost < previous.totalCost) trend = "down";
    deltaText = formatDelta(current.totalCost, previous.totalCost);
  }

  if (isLoading) {
    return (
      <Card className="flex flex-col gap-3">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-gray-800 rounded" />
          <div className="h-8 w-40 bg-gray-800 rounded" />
          <div className="h-3 w-24 bg-gray-800 rounded" />
        </div>
      </Card>
    );
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Google Ads kostnad</span>
          <Coins className="w-5 h-5 text-gray-500" />
        </div>
        <p className="text-sm text-gray-500">
          Ingen data for valgt periode. Sjekk at Google Ads-integrasjonen er
          koblet opp (
          <code className="text-gray-400">docs/google-ads-setup.md</code>).
        </p>
      </Card>
    );
  }

  // For the "trend" icon — orange/red up = bad (more spend), green down = good
  // but we'll use neutral colors since direction isn't inherently good/bad
  return (
    <Card className="flex flex-col gap-3 relative">
      <div className="flex items-center justify-between">
        <span
          className="text-sm text-gray-400 border-b border-dotted border-gray-600 cursor-help"
          title="Ekte annonsekostnad fra Google Ads API (ikke GA4 attribusjon)"
        >
          Google Ads kostnad
        </span>
        <Coins className="w-5 h-5 text-gray-500" />
      </div>

      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-white">
          {nok.format(current.totalCost)}
        </span>
        {previous && (
          <span
            className={cn(
              "flex items-center gap-1 text-sm font-medium mb-1",
              trend === "up" && "text-orange-400",
              trend === "down" && "text-green-400",
              trend === "flat" && "text-gray-500"
            )}
          >
            {trend === "up" && <TrendingUp className="w-4 h-4" />}
            {trend === "down" && <TrendingDown className="w-4 h-4" />}
            {trend === "flat" && <Minus className="w-4 h-4" />}
            {deltaText}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800 text-xs">
        <div>
          <div className="flex items-center gap-1 text-gray-500">
            <MousePointerClick className="w-3 h-3" />
            <span>Klikk</span>
          </div>
          <div className="text-white font-medium mt-0.5">
            {formatCompact(current.totalClicks)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Snitt CPC</div>
          <div className="text-white font-medium mt-0.5">
            {nokCpc.format(current.avgCpc)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Kampanjer</div>
          <div className="text-white font-medium mt-0.5">
            {current.campaignCount}
          </div>
        </div>
      </div>
    </Card>
  );
}
