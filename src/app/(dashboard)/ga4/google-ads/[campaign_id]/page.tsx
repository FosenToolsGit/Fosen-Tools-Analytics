"use client";

import { Suspense, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Megaphone,
  Coins,
  MousePointerClick,
  TrendingUp,
  Target,
  Percent,
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { DateRangePicker } from "@/components/filters/date-range-picker";
import { useDateRange } from "@/hooks/use-date-range";
import {
  useGoogleAdsCampaignDetail,
  useGoogleAdsCampaignKeywords,
} from "@/hooks/use-google-ads-campaign-detail";
import { CampaignDailyChart } from "@/components/dashboard/campaign-daily-chart";
import { GoogleAdsKeywordTable } from "@/components/dashboard/google-ads-keyword-table";
import { GoogleAdsSearchTermsTable } from "@/components/dashboard/google-ads-search-terms-table";
import { GoogleAdsConversionsTable } from "@/components/dashboard/google-ads-conversions-table";
import {
  useGoogleAdsSearchTerms,
  useGoogleAdsConversions,
} from "@/hooks/use-google-ads";

function Content({ campaignId }: { campaignId: string }) {
  const { dateRange, preset, setPreset, setCustomRange } = useDateRange();
  const { data: detail, isLoading: loadingDetail } =
    useGoogleAdsCampaignDetail(campaignId, dateRange);
  const { data: keywords, isLoading: loadingKeywords } =
    useGoogleAdsCampaignKeywords(campaignId, dateRange);
  const { data: searchTerms, isLoading: loadingSearchTerms } =
    useGoogleAdsSearchTerms(dateRange, { campaignId });
  const { data: conversions, isLoading: loadingConversions } =
    useGoogleAdsConversions(dateRange, { campaignId });

  const campaignName = detail?.campaign?.campaign_name ?? "Ukjent kampanje";
  const status = detail?.campaign?.status;
  const channelType = detail?.campaign?.channel_type;
  const totals = detail?.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/ga4/google-ads"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Tilbake til Google Ads
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{campaignName}</h1>
              <div className="flex items-center gap-2 text-xs mt-0.5">
                {status && (
                  <span
                    className={`px-2 py-0.5 rounded-full border ${
                      status === "ENABLED"
                        ? "border-green-800 bg-green-900/30 text-green-400"
                        : "border-gray-800 bg-gray-900/50 text-gray-500"
                    }`}
                  >
                    {status}
                  </span>
                )}
                {channelType && (
                  <span className="text-gray-500 uppercase">
                    {channelType}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <DateRangePicker
          dateRange={dateRange}
          activePreset={preset}
          onPresetChange={setPreset}
          onCustomRange={setCustomRange}
        />
      </div>

      <MetricGrid loading={loadingDetail}>
        <MetricCard
          title="Kostnad"
          value={totals?.cost_nok ?? 0}
          format="currency"
          icon={Coins}
          tooltip="Total annonsekostnad for kampanjen i perioden"
        />
        <MetricCard
          title="Klikk"
          value={totals?.clicks ?? 0}
          icon={MousePointerClick}
          tooltip="Antall klikk på annonsene"
        />
        <MetricCard
          title="Visninger"
          value={totals?.impressions ?? 0}
          icon={TrendingUp}
          tooltip="Antall ganger annonsene ble vist"
        />
        <MetricCard
          title="Snitt CPC"
          value={totals?.average_cpc_nok ?? 0}
          format="currency-precise"
          icon={Coins}
          tooltip="Vektet snitt-kostnad per klikk"
        />
        <MetricCard
          title="CTR"
          value={(totals?.ctr ?? 0) * 100}
          format="percent"
          icon={Percent}
          tooltip="Click-through rate (klikk / visninger)"
        />
        <MetricCard
          title="Konverteringer"
          value={totals?.conversions ?? 0}
          icon={Target}
          tooltip="Antall konverteringer rapportert av Google Ads"
        />
      </MetricGrid>

      <CampaignDailyChart data={detail?.daily ?? []} />

      <div>
        <h2 className="text-lg font-semibold mb-3">Søkeord under kampanjen</h2>
        <GoogleAdsKeywordTable
          data={Array.isArray(keywords) ? keywords : []}
          loading={loadingKeywords}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-1">Konverterings-breakdown</h2>
        <p className="text-xs text-gray-500 mb-3">
          Alle handlinger for denne kampanjen. Viser både Googles "primary"
          telling og alle sporede handlinger.
        </p>
        <GoogleAdsConversionsTable
          data={Array.isArray(conversions) ? conversions : []}
          loading={loadingConversions}
          groupByCampaign={false}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-1">Faktiske søketermer</h2>
        <p className="text-xs text-gray-500 mb-3">
          Hva brukerne faktisk skrev i Google for å trigge denne kampanjen.
        </p>
        <GoogleAdsSearchTermsTable
          data={Array.isArray(searchTerms) ? searchTerms : []}
          loading={loadingSearchTerms}
        />
      </div>
    </div>
  );
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaign_id: string }>;
}) {
  const { campaign_id } = use(params);
  return (
    <Suspense fallback={<MetricGrid loading />}>
      <Content campaignId={campaign_id} />
    </Suspense>
  );
}
