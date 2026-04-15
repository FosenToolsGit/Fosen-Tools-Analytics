import type { SupabaseClient } from "@supabase/supabase-js";
import { subDays } from "date-fns";
import { GoogleAdsService } from "@/lib/services/google-ads";

export type GoogleAdsSyncResult =
  | {
      platform: "google_ads";
      status: "success";
      records_synced: number;
      campaigns: number;
      keywords: number;
    }
  | {
      platform: "google_ads";
      status: "skipped";
      reason: string;
    }
  | {
      platform: "google_ads";
      status: "error";
      error: string;
    };

function credentialsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN &&
    process.env.GOOGLE_ADS_CUSTOMER_ID
  );
}

export async function syncGoogleAds(
  admin: SupabaseClient,
  triggeredBy: string,
  options: { days?: number } = {}
): Promise<GoogleAdsSyncResult> {
  if (!credentialsConfigured()) {
    return {
      platform: "google_ads",
      status: "skipped",
      reason: "credentials missing",
    };
  }

  const days = options.days ?? parseInt(process.env.SYNC_DAYS || "90", 10);

  const { data: syncLog } = await admin
    .from("sync_logs")
    .insert({
      platform: "google_ads",
      status: "running",
      triggered_by: triggeredBy,
    })
    .select()
    .single();

  try {
    const service = new GoogleAdsService();
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    const campaigns = await service.fetchCampaignMetrics(startDate, endDate);
    const keywords = await service.fetchKeywordMetrics(startDate, endDate);

    let campaignsSynced = 0;
    if (campaigns.length > 0) {
      const { error } = await admin
        .from("google_ads_campaigns")
        .upsert(campaigns, { onConflict: "campaign_id,metric_date" });
      if (error) throw error;
      campaignsSynced = campaigns.length;
    }

    let keywordsSynced = 0;
    if (keywords.length > 0) {
      const { error } = await admin
        .from("google_ads_keywords")
        .upsert(keywords, {
          onConflict:
            "campaign_id,ad_group_id,keyword_text,match_type,metric_date",
        });
      if (error) throw error;
      keywordsSynced = keywords.length;
    }

    const totalSynced = campaignsSynced + keywordsSynced;

    await admin
      .from("sync_logs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        records_synced: totalSynced,
      })
      .eq("id", syncLog?.id);

    return {
      platform: "google_ads",
      status: "success",
      records_synced: totalSynced,
      campaigns: campaignsSynced,
      keywords: keywordsSynced,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await admin
      .from("sync_logs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("id", syncLog?.id);

    return {
      platform: "google_ads",
      status: "error",
      error: errorMessage,
    };
  }
}
