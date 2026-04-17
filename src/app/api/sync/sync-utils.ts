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

    // Strip any extra fields not in the DB schema + filter ugyldige datoer.
    // GA4 kan returnere "(other)" eller tomme date-dimensjoner som blir
    // malformede datoer etter slice — disse må vekk før upsert.
    const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
    const rawRows = rawMetrics
      .map(({ platform: p, metric_date, impressions, reach, engagement, clicks, followers, sessions, pageviews, users_total, bounce_rate }) => ({
        platform: p, metric_date, impressions, reach, engagement, clicks, followers, sessions, pageviews, users_total, bounce_rate,
      }))
      .filter((r) => validDate(r.metric_date));

    // Dedupliser på (platform, metric_date) — behold raden med flest sesjoner.
    // Supabase upsert feiler hvis samme conflict-key forekommer flere ganger i
    // samme batch ("ON CONFLICT DO UPDATE command cannot affect row a second time").
    const dedupMap = new Map<string, (typeof rawRows)[0]>();
    for (const row of rawRows) {
      const key = `${row.platform}|${row.metric_date}`;
      const existing = dedupMap.get(key);
      if (!existing || (row.sessions || 0) > (existing.sessions || 0)) {
        dedupMap.set(key, row);
      }
    }
    const metrics = Array.from(dedupMap.values());

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
      // Dedupliser på (platform, platform_post_id) før upsert.
      const postMap = new Map<string, (typeof posts)[0]>();
      for (const p of posts) {
        postMap.set(`${p.platform}|${p.platform_post_id}`, p);
      }
      const dedupedPosts = Array.from(postMap.values());
      const { error: postsError } = await admin
        .from("platform_posts")
        .upsert(dedupedPosts, {
          onConflict: "platform,platform_post_id",
        });

      if (postsError) {
        console.error("platform_posts upsert error:", postsError);
        throw postsError;
      }
      recordsSynced += dedupedPosts.length;
    }

    // GA4-specific: sync keywords, geo, sources, campaigns
    if (platform === "ga4") {
      const ga4 = service as GA4Service;

      // Helper: dedupliser array på sammensatt nøkkel, behold raden med
      // høyest verdi av valgfritt sort-felt (ellers siste forekomst).
      const dedupBy = <T>(
        rows: T[],
        keyFn: (r: T) => string,
        scoreFn?: (r: T) => number
      ): T[] => {
        const m = new Map<string, T>();
        for (const r of rows) {
          const k = keyFn(r);
          const existing = m.get(k);
          if (!existing) m.set(k, r);
          else if (scoreFn && scoreFn(r) > scoreFn(existing)) m.set(k, r);
          else if (!scoreFn) m.set(k, r);
        }
        return Array.from(m.values());
      };
      const validDateRow = (r: { metric_date: string }) =>
        /^\d{4}-\d{2}-\d{2}$/.test(r.metric_date);

      const rawKeywords = await ga4.fetchSearchKeywords(startDate, endDate);
      const keywords = dedupBy(
        rawKeywords.filter(validDateRow),
        (r) => `${r.query}|${r.metric_date}`,
        (r) => Number(r.impressions) || 0
      );
      if (keywords.length > 0) {
        const { error } = await admin
          .from("search_keywords")
          .upsert(keywords, { onConflict: "query,metric_date" });
        if (error) { console.error("search_keywords upsert error:", error); throw error; }
        recordsSynced += keywords.length;
      }

      const rawGeo = await ga4.fetchGeoData(startDate, endDate);
      const geoRows = dedupBy(
        rawGeo.filter(validDateRow).map((g) => ({
          ...g,
          city: g.city || "",
        })),
        (r) => `${r.country}|${r.city}|${r.metric_date}`,
        (r) => Number(r.sessions) || 0
      );
      if (geoRows.length > 0) {
        const { error } = await admin
          .from("geo_data")
          .upsert(geoRows, { onConflict: "country,city,metric_date" });
        if (error) { console.error("geo_data upsert error:", error); throw error; }
        recordsSynced += geoRows.length;
      }

      const rawSources = await ga4.fetchTrafficSources(startDate, endDate);
      const sourceRows = dedupBy(
        rawSources.filter(validDateRow).map((s) => ({
          ...s,
          source: s.source || "",
          medium: s.medium || "",
        })),
        (r) => `${r.channel}|${r.source}|${r.medium}|${r.metric_date}`,
        (r) => Number(r.sessions) || 0
      );
      if (sourceRows.length > 0) {
        const { error } = await admin
          .from("traffic_sources")
          .upsert(sourceRows, {
            onConflict: "channel,source,medium,metric_date",
          });
        if (error) { console.error("traffic_sources upsert error:", error); throw error; }
        recordsSynced += sourceRows.length;
      }

      const rawCampaigns = await ga4.fetchAdCampaigns(startDate, endDate);
      const campaignRows = dedupBy(
        rawCampaigns.filter(validDateRow).map((c) => ({
          ...c,
          ad_group: c.ad_group || "",
          keyword: c.keyword || "",
        })),
        (r) => `${r.campaign_name}|${r.ad_group}|${r.keyword}|${r.metric_date}`,
        (r) => Number(r.sessions) || 0
      );
      if (campaignRows.length > 0) {
        const { error } = await admin
          .from("ad_campaigns")
          .upsert(campaignRows, {
            onConflict: "campaign_name,ad_group,keyword,metric_date",
          });
        if (error) { console.error("ad_campaigns upsert error:", error); throw error; }
        recordsSynced += campaignRows.length;
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
            // Dedupliser per URL innen samme kampanje — Mailchimp returnerer
            // ofte samme URL flere ganger (samme lenke i flere posisjoner).
            // Behold raden med flest klikk.
            const linkMap = new Map<string, (typeof links)[0]>();
            for (const l of links) {
              const existing = linkMap.get(l.url);
              if (!existing || l.total_clicks > existing.total_clicks) {
                linkMap.set(l.url, l);
              }
            }
            const linkRows = Array.from(linkMap.values()).map((l) => ({
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
            recordsSynced += linkRows.length;
          }

          const locs = await mc.fetchCampaignLocations(campaignId);
          if (locs.length > 0) {
            // Samme dedup-pattern for locations
            const locMap = new Map<string, (typeof locs)[0]>();
            for (const l of locs) {
              const key = `${l.country_code}|${l.region}`;
              const existing = locMap.get(key);
              if (!existing || l.opens > existing.opens) {
                locMap.set(key, l);
              }
            }
            const locRows = Array.from(locMap.values()).map((l) => ({
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
            recordsSynced += locRows.length;
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
    let errorMessage = "Unknown error";
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (err && typeof err === "object") {
      // Supabase PostgrestError: { message, details, hint, code }
      const e = err as Record<string, unknown>;
      const parts = [e.message, e.details, e.hint, e.code]
        .filter((v) => typeof v === "string" && v.length > 0);
      if (parts.length > 0) {
        errorMessage = parts.join(" | ");
      } else {
        try {
          errorMessage = JSON.stringify(err).slice(0, 500);
        } catch {
          errorMessage = String(err);
        }
      }
    } else if (err !== undefined && err !== null) {
      errorMessage = String(err);
    }
    console.error(`Sync failed for ${platform}:`, err);

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
