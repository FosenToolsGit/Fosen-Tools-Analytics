import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlatformKey } from "@/lib/utils/platforms";
import type { PlatformService } from "@/lib/services/types";
import { GA4Service } from "@/lib/services/ga4";
import { MetaService } from "@/lib/services/meta";
import { LinkedInService } from "@/lib/services/linkedin";
import { MailchimpService } from "@/lib/services/mailchimp";
import { applyTagRules } from "@/lib/services/tag-rules-engine";
import { detectAnomalies } from "@/lib/services/anomaly-detection";
import { subDays } from "date-fns";

function getService(platform: PlatformKey): PlatformService {
  switch (platform) {
    case "ga4":
      return new GA4Service();
    case "meta":
      return new MetaService();
    case "linkedin":
      return new LinkedInService();
    case "mailchimp":
      return new MailchimpService();
    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

// Default sync window. Kan overstyres per kall via syncPlatform(..., { days }) eller
// ved å sette SYNC_DAYS env-variabel. Search Console har maks ~16 måneder historikk,
// GA4 er ubegrenset. Fornuftig default for daglig drift er 90 dager.
const DEFAULT_SYNC_DAYS = parseInt(process.env.SYNC_DAYS || "90", 10);

export async function syncPlatform(
  admin: SupabaseClient,
  platform: PlatformKey,
  triggeredBy: string,
  options: { days?: number } = {}
) {
  const days = options.days ?? DEFAULT_SYNC_DAYS;

  // Insert sync log
  const { data: syncLog } = await admin
    .from("sync_logs")
    .insert({
      platform,
      status: "running",
      triggered_by: triggeredBy,
    })
    .select()
    .single();

  try {
    const service = getService(platform);
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    // Fetch and upsert metrics
    const rawMetrics = await service.fetchDailyMetrics(startDate, endDate);
    let recordsSynced = 0;

    // Strip any extra fields not in the DB schema
    const metrics = rawMetrics.map(({ platform: p, metric_date, impressions, reach, engagement, clicks, followers, sessions, pageviews, users_total, bounce_rate }) => ({
      platform: p, metric_date, impressions, reach, engagement, clicks, followers, sessions, pageviews, users_total, bounce_rate,
    }));

    if (metrics.length > 0) {
      const { error: metricsError } = await admin
        .from("analytics_metrics")
        .upsert(metrics, {
          onConflict: "platform,metric_date",
        });

      if (metricsError) {
        console.error("Metrics upsert error:", JSON.stringify(metricsError));
        throw metricsError;
      }
      recordsSynced += metrics.length;
    }

    // Fetch and upsert posts
    const posts = await service.fetchTopPosts(50);

    if (posts.length > 0) {
      const { error: postsError } = await admin
        .from("platform_posts")
        .upsert(posts, {
          onConflict: "platform,platform_post_id",
        });

      if (postsError) throw postsError;
      recordsSynced += posts.length;
    }

    // GA4-specific: sync keywords, geo, sources, campaigns
    if (platform === "ga4") {
      const ga4 = service as GA4Service;

      const keywords = await ga4.fetchSearchKeywords(startDate, endDate);
      if (keywords.length > 0) {
        await admin
          .from("search_keywords")
          .upsert(keywords, { onConflict: "query,metric_date" });
        recordsSynced += keywords.length;
      }

      const geo = await ga4.fetchGeoData(startDate, endDate);
      if (geo.length > 0) {
        const geoRows = geo.map((g) => ({
          ...g,
          city: g.city || "",
        }));
        await admin
          .from("geo_data")
          .upsert(geoRows, { onConflict: "country,city,metric_date" });
        recordsSynced += geo.length;
      }

      const sources = await ga4.fetchTrafficSources(startDate, endDate);
      if (sources.length > 0) {
        const sourceRows = sources.map((s) => ({
          ...s,
          source: s.source || "",
          medium: s.medium || "",
        }));
        await admin
          .from("traffic_sources")
          .upsert(sourceRows, {
            onConflict: "channel,source,medium,metric_date",
          });
        recordsSynced += sources.length;
      }

      const campaigns = await ga4.fetchAdCampaigns(startDate, endDate);
      if (campaigns.length > 0) {
        const campaignRows = campaigns.map((c) => ({
          ...c,
          ad_group: c.ad_group || "",
          keyword: c.keyword || "",
        }));
        await admin
          .from("ad_campaigns")
          .upsert(campaignRows, {
            onConflict: "campaign_name,ad_group,keyword,metric_date",
          });
        recordsSynced += campaigns.length;
      }
    }

    // Mailchimp-specific: sync links, locations, growth, daily list activity
    if (platform === "mailchimp") {
      const mc = service as MailchimpService;
      try {
        // Hent siste 30 dagers kampanjer for click-details (tyngste kall)
        const recentSince = subDays(endDate, 30);
        const recentIds = await mc.fetchRecentCampaignIds(recentSince);

        for (const campaignId of recentIds) {
          const links = await mc.fetchCampaignClickDetails(campaignId);
          if (links.length > 0) {
            const linkRows = links.map((l) => ({
              campaign_id: campaignId,
              url: l.url,
              total_clicks: l.total_clicks,
              unique_clicks: l.unique_clicks,
              click_percentage: l.click_percentage,
              last_click_at: l.last_click,
            }));
            await admin
              .from("mailchimp_campaign_links")
              .upsert(linkRows, { onConflict: "campaign_id,url" });
            recordsSynced += links.length;
          }

          const locs = await mc.fetchCampaignLocations(campaignId);
          if (locs.length > 0) {
            const locRows = locs.map((l) => ({
              campaign_id: campaignId,
              country_code: l.country_code,
              region: l.region,
              opens: l.opens,
            }));
            await admin
              .from("mailchimp_campaign_locations")
              .upsert(locRows, {
                onConflict: "campaign_id,country_code,region",
              });
            recordsSynced += locs.length;
          }
        }

        // List growth (månedlig historikk)
        const growth = await mc.fetchListGrowth();
        if (growth.length > 0) {
          const growthRows = growth.map((g) => ({
            list_id: mc.effectiveListId,
            ...g,
          }));
          await admin
            .from("mailchimp_list_growth")
            .upsert(growthRows, { onConflict: "list_id,metric_date" });
          recordsSynced += growth.length;
        }

        // Daglig list-aktivitet
        const activity = await mc.fetchListActivity();
        if (activity.length > 0) {
          const activityRows = activity.map((a) => ({
            list_id: mc.effectiveListId,
            ...a,
          }));
          await admin
            .from("mailchimp_list_daily")
            .upsert(activityRows, { onConflict: "list_id,metric_date" });
          recordsSynced += activity.length;
        }
      } catch (mcErr) {
        console.error("Mailchimp extended sync failed:", mcErr);
      }
    }

    // Anvend tag-regler mot ny data (stille — feiler vi her skal sync fortsatt v\u00e6re suksess)
    try {
      await applyTagRules(admin);
    } catch (tagErr) {
      console.error("applyTagRules after sync failed:", tagErr);
    }

    // Kjør anomali-deteksjon mot ny data (også stille ved feil)
    try {
      await detectAnomalies(admin);
    } catch (anomalyErr) {
      console.error("detectAnomalies after sync failed:", anomalyErr);
    }

    // Update sync log
    await admin
      .from("sync_logs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        records_synced: recordsSynced,
      })
      .eq("id", syncLog?.id);

    return {
      platform,
      status: "success" as const,
      records_synced: recordsSynced,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    await admin
      .from("sync_logs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq("id", syncLog?.id);

    return {
      platform,
      status: "error" as const,
      error: errorMessage,
    };
  }
}
