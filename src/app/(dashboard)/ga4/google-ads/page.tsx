"use client";

import { Suspense } from "react";
import {
  Megaphone,
  MousePointerClick,
  Coins,
  TrendingUp,
  Target,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { GoogleAdsCampaignTable } from "@/components/dashboard/google-ads-campaign-table";
import { GoogleAdsKeywordTable } from "@/components/dashboard/google-ads-keyword-table";
import { GoogleAdsSearchTermsTable } from "@/components/dashboard/google-ads-search-terms-table";
import { GoogleAdsConversionsTable } from "@/components/dashboard/google-ads-conversions-table";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import {
  useGoogleAdsCampaigns,
  useGoogleAdsKeywords,
  useGoogleAdsSearchTerms,
  useGoogleAdsConversions,
} from "@/hooks/use-google-ads";

function Content() {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data: campaigns, isLoading: loadingCampaigns } =
    useGoogleAdsCampaigns(dateRange);
  const { data: keywords, isLoading: loadingKeywords } =
    useGoogleAdsKeywords(dateRange);
  const { data: searchTerms, isLoading: loadingSearchTerms } =
    useGoogleAdsSearchTerms(dateRange);
  const { data: conversions, isLoading: loadingConversions } =
    useGoogleAdsConversions(dateRange);

  const campaignRows = Array.isArray(campaigns) ? campaigns : [];
  const keywordRows = Array.isArray(keywords) ? keywords : [];

  const totalCost = campaignRows.reduce((s, r) => s + (r.cost_nok || 0), 0);
  const totalClicks = campaignRows.reduce((s, r) => s + (r.clicks || 0), 0);
  const totalImpressions = campaignRows.reduce(
    (s, r) => s + (r.impressions || 0),
    0
  );
  const totalConversions = campaignRows.reduce(
    (s, r) => s + (r.conversions || 0),
    0
  );
  const avgCpc = totalClicks > 0 ? totalCost / totalClicks : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Google Ads (direkte)</h1>
            <p className="text-xs text-gray-500">
              Ekte kostnad, CPC og kvalitetsscore fra Google Ads API. Supplerer{" "}
              <span className="text-gray-400">Google Ads (via GA4)</span> som
              viser attribuert trafikk.
            </p>
          </div>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          activePreset={preset}
          onPresetChange={setPreset}
          onCustomRange={setCustomRange}
        />
      </div>

      <MetricGrid loading={loadingCampaigns}>
        <MetricCard
          title="Kostnad"
          value={totalCost}
          format="currency"
          icon={Coins}
          tooltip="Total annonsekostnad i perioden (fra Google Ads API)"
        />
        <MetricCard
          title="Klikk"
          value={totalClicks}
          icon={MousePointerClick}
          tooltip="Totalt antall klikk på annonser"
        />
        <MetricCard
          title="Visninger"
          value={totalImpressions}
          icon={TrendingUp}
          tooltip="Antall ganger annonsene ble vist"
        />
        <MetricCard
          title="Snitt CPC"
          value={avgCpc}
          format="currency-precise"
          icon={Coins}
          tooltip="Vektet snittkostnad per klikk"
        />
        <MetricCard
          title="Konverteringer"
          value={totalConversions}
          icon={Target}
          tooltip="Antall konverteringer rapportert av Google Ads"
        />
      </MetricGrid>

      <div>
        <h2 className="text-lg font-semibold mb-3">Kampanjer</h2>
        <GoogleAdsCampaignTable
          data={campaignRows}
          loading={loadingCampaigns}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">
          Topp søkeord (etter kostnad)
        </h2>
        <GoogleAdsKeywordTable data={keywordRows} loading={loadingKeywords} />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-1">
          Konverteringer og funnel-aktivitet
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Alle trackede handlinger per kampanje — inkludert de som ikke er
          markert som "primary conversion" i Google Ads. Viktig for å se ekte
          aktivitet når sporingen er konfigurert feil.
        </p>
        <GoogleAdsConversionsTable
          data={Array.isArray(conversions) ? conversions : []}
          loading={loadingConversions}
          groupByCampaign
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-1">
          Faktiske søketermer (fra brukere)
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Dette er hva folk faktisk har skrevet i Google — inkluderer
          Performance Max-kategorier som ellers er skjult.
        </p>
        <GoogleAdsSearchTermsTable
          data={Array.isArray(searchTerms) ? searchTerms : []}
          loading={loadingSearchTerms}
        />
      </div>
    </div>
  );
}

export default function GoogleAdsDirectPage() {
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content />
    </Suspense>
  );
}
