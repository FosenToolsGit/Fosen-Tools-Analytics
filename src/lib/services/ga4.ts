import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { format } from "date-fns";
import type {
  PlatformService,
  DailyMetric,
  PlatformPost,
  SearchKeywordRow,
  GeoDataRow,
  TrafficSourceRow,
  AdCampaignRow,
} from "./types";

export class GA4Service implements PlatformService {
  private client: BetaAnalyticsDataClient;
  private propertyId: string;

  constructor() {
    this.propertyId = process.env.GA4_PROPERTY_ID!;
    this.client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: process.env.GA4_CLIENT_EMAIL!,
        private_key: process.env.GA4_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      },
    });
  }

  async fetchDailyMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<DailyMetric[]> {
    const [response] = await this.client.runReport({
      property: this.propertyId,
      dateRanges: [
        {
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
        },
      ],
      dimensions: [{ name: "date" }],
      metrics: [
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "totalUsers" },
        { name: "engagementRate" },
        { name: "bounceRate" },
        { name: "activeUsers" },
      ],
    });

    if (!response.rows) return [];

    return response.rows.map((row) => {
      const dateStr = row.dimensionValues?.[0]?.value || "";
      const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      const sessions = parseInt(row.metricValues?.[0]?.value || "0");
      const engagementRate = parseFloat(
        row.metricValues?.[3]?.value || "0"
      );

      return {
        platform: "ga4" as const,
        metric_date: formattedDate,
        impressions: parseInt(row.metricValues?.[2]?.value || "0"),
        reach: parseInt(row.metricValues?.[5]?.value || "0"),
        engagement: Math.round(engagementRate * sessions),
        clicks: 0,
        followers: 0,
        sessions,
        pageviews: parseInt(row.metricValues?.[1]?.value || "0"),
        users_total: parseInt(row.metricValues?.[2]?.value || "0"),
        bounce_rate: parseFloat(row.metricValues?.[4]?.value || "0") * 100,
      };
    });
  }

  async fetchTopPosts(limit: number): Promise<PlatformPost[]> {
    const [response] = await this.client.runReport({
      property: this.propertyId,
      dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
      dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "activeUsers" },
        { name: "engagementRate" },
      ],
      orderBys: [
        { metric: { metricName: "screenPageViews" }, desc: true },
      ],
      limit,
    });

    if (!response.rows) return [];

    return response.rows.map((row) => ({
      platform: "ga4" as const,
      platform_post_id: row.dimensionValues?.[0]?.value || "",
      published_at: new Date().toISOString(),
      title: row.dimensionValues?.[1]?.value || null,
      content_snippet: row.dimensionValues?.[0]?.value || null,
      post_url: row.dimensionValues?.[0]?.value || null,
      thumbnail_url: null,
      post_type: "page",
      impressions: parseInt(row.metricValues?.[0]?.value || "0"),
      reach: parseInt(row.metricValues?.[1]?.value || "0"),
      likes: 0,
      comments: 0,
      shares: 0,
      clicks: 0,
      video_views: 0,
    }));
  }

  async fetchSearchKeywords(
    startDate: Date,
    endDate: Date
  ): Promise<SearchKeywordRow[]> {
    try {
      // Use Google Search Console API directly
      const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL || "sc-domain:fosen-tools.no";
      const accessToken = await this.getAccessToken();

      const response = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate: format(startDate, "yyyy-MM-dd"),
            endDate: format(endDate, "yyyy-MM-dd"),
            dimensions: ["query"],
            rowLimit: 500,
            type: "web",
          }),
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.error("Search Console API error:", response.status, err);
        return [];
      }

      const data = await response.json();

      if (!data.rows) return [];

      return data.rows.map(
        (row: {
          keys: string[];
          clicks: number;
          impressions: number;
          ctr: number;
          position: number;
        }) => ({
          query: row.keys[0],
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: Math.round(row.position * 10) / 10,
          metric_date: format(endDate, "yyyy-MM-dd"),
        })
      );
    } catch (err) {
      console.error("Search Console fetch failed:", err);
      return [];
    }
  }

  private async getAccessToken(): Promise<string> {
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GA4_CLIENT_EMAIL!,
        private_key: process.env.GA4_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      },
      scopes: [
        "https://www.googleapis.com/auth/webmasters.readonly",
      ],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    return tokenResponse.token || "";
  }

  async fetchGeoData(
    startDate: Date,
    endDate: Date
  ): Promise<GeoDataRow[]> {
    const [response] = await this.client.runReport({
      property: this.propertyId,
      dateRanges: [
        {
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
        },
      ],
      dimensions: [{ name: "country" }, { name: "city" }, { name: "countryId" }],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "activeUsers" },
      ],
      orderBys: [
        { metric: { metricName: "sessions" }, desc: true },
      ],
      limit: 500,
    });

    if (!response.rows) return [];

    return response.rows.map((row) => ({
      country: row.dimensionValues?.[0]?.value || "",
      city: row.dimensionValues?.[1]?.value || null,
      country_code: row.dimensionValues?.[2]?.value || "",
      sessions: parseInt(row.metricValues?.[0]?.value || "0"),
      total_users: parseInt(row.metricValues?.[1]?.value || "0"),
      active_users: parseInt(row.metricValues?.[2]?.value || "0"),
      metric_date: format(endDate, "yyyy-MM-dd"),
    }));
  }

  async fetchTrafficSources(
    startDate: Date,
    endDate: Date
  ): Promise<TrafficSourceRow[]> {
    const [response] = await this.client.runReport({
      property: this.propertyId,
      dateRanges: [
        {
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
        },
      ],
      dimensions: [
        { name: "sessionDefaultChannelGroup" },
        { name: "sessionSource" },
        { name: "sessionMedium" },
      ],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "engagementRate" },
        { name: "conversions" },
      ],
      orderBys: [
        { metric: { metricName: "sessions" }, desc: true },
      ],
      limit: 200,
    });

    if (!response.rows) return [];

    return response.rows.map((row) => ({
      channel: row.dimensionValues?.[0]?.value || "",
      source: row.dimensionValues?.[1]?.value || null,
      medium: row.dimensionValues?.[2]?.value || null,
      sessions: parseInt(row.metricValues?.[0]?.value || "0"),
      total_users: parseInt(row.metricValues?.[1]?.value || "0"),
      engagement_rate: parseFloat(row.metricValues?.[2]?.value || "0"),
      conversions: parseInt(row.metricValues?.[3]?.value || "0"),
      metric_date: format(endDate, "yyyy-MM-dd"),
    }));
  }

  async fetchAdCampaigns(
    startDate: Date,
    endDate: Date
  ): Promise<AdCampaignRow[]> {
    const [response] = await this.client.runReport({
      property: this.propertyId,
      dateRanges: [
        {
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
        },
      ],
      dimensions: [
        { name: "sessionCampaignName" },
        { name: "sessionGoogleAdsAdGroupName" },
        { name: "sessionGoogleAdsKeyword" },
      ],
      metrics: [
        { name: "sessions" },
        { name: "totalUsers" },
        { name: "conversions" },
        { name: "engagementRate" },
      ],
      orderBys: [
        { metric: { metricName: "sessions" }, desc: true },
      ],
      limit: 200,
    });

    if (!response.rows) return [];

    return response.rows
      .filter((row) => row.dimensionValues?.[0]?.value !== "(not set)")
      .map((row) => ({
        campaign_name: row.dimensionValues?.[0]?.value || "",
        ad_group: row.dimensionValues?.[1]?.value || null,
        keyword: row.dimensionValues?.[2]?.value || null,
        sessions: parseInt(row.metricValues?.[0]?.value || "0"),
        total_users: parseInt(row.metricValues?.[1]?.value || "0"),
        conversions: parseInt(row.metricValues?.[2]?.value || "0"),
        engagement_rate: parseFloat(row.metricValues?.[3]?.value || "0"),
        metric_date: format(endDate, "yyyy-MM-dd"),
      }));
  }
}
