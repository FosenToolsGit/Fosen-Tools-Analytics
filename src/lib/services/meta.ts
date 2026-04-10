import { format } from "date-fns";
import type { PlatformService, DailyMetric, PlatformPost } from "./types";

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

export class MetaService implements PlatformService {
  private accessToken: string;
  private pageId: string;
  private igAccountId: string;

  constructor() {
    this.accessToken = process.env.META_ACCESS_TOKEN!;
    this.pageId = process.env.META_PAGE_ID!;
    this.igAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID!;
  }

  private async graphGet(path: string, params: Record<string, string> = {}) {
    const url = new URL(`${GRAPH_API_BASE}${path}`);
    url.searchParams.set("access_token", this.accessToken);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Meta API error: ${res.status} ${err}`);
    }
    return res.json();
  }

  async fetchDailyMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<DailyMetric[]> {
    const since = Math.floor(startDate.getTime() / 1000).toString();
    const until = Math.floor(endDate.getTime() / 1000).toString();

    // Fetch Facebook Page insights
    const fbInsights = await this.graphGet(`/${this.pageId}/insights`, {
      metric:
        "page_impressions,page_post_engagements,page_fans,page_views_total",
      period: "day",
      since,
      until,
    });

    // Build date map from FB insights
    const dateMap = new Map<string, DailyMetric>();

    for (const metric of fbInsights.data || []) {
      for (const val of metric.values || []) {
        const date = format(new Date(val.end_time), "yyyy-MM-dd");
        const existing = dateMap.get(date) || this.emptyMetric(date);

        switch (metric.name) {
          case "page_impressions":
            existing.impressions += val.value || 0;
            existing.reach += val.value || 0;
            break;
          case "page_post_engagements":
            existing.engagement += val.value || 0;
            break;
          case "page_fans":
            existing.followers = val.value || 0;
            break;
          case "page_views_total":
            existing.clicks += val.value || 0;
            break;
        }

        dateMap.set(date, existing);
      }
    }

    // Try Instagram insights if account ID is set
    if (this.igAccountId) {
      try {
        const igInsights = await this.graphGet(
          `/${this.igAccountId}/insights`,
          {
            metric: "impressions,reach,follower_count",
            period: "day",
            since,
            until,
          }
        );

        for (const metric of igInsights.data || []) {
          for (const val of metric.values || []) {
            const date = format(new Date(val.end_time), "yyyy-MM-dd");
            const existing = dateMap.get(date) || this.emptyMetric(date);

            switch (metric.name) {
              case "impressions":
                existing.impressions += val.value || 0;
                break;
              case "reach":
                existing.reach += val.value || 0;
                break;
              case "follower_count":
                existing.followers = Math.max(
                  existing.followers,
                  val.value || 0
                );
                break;
            }

            dateMap.set(date, existing);
          }
        }
      } catch {
        // Instagram insights may fail if not connected
      }
    }

    return Array.from(dateMap.values());
  }

  async fetchTopPosts(limit: number): Promise<PlatformPost[]> {
    const response = await this.graphGet(`/${this.pageId}/posts`, {
      fields:
        "id,message,created_time,full_picture,permalink_url,insights.metric(post_impressions,post_engaged_users,post_clicks){values}",
      limit: limit.toString(),
    });

    return (response.data || []).map((post: Record<string, unknown>) => {
      const insights = (post.insights as Record<string, unknown[]>)?.data || [];
      let impressions = 0;
      let engagement = 0;
      let clicks = 0;

      for (const insight of insights as Array<Record<string, unknown>>) {
        const values = (insight.values as Array<Record<string, number>>) || [];
        const value = values[0]?.value || 0;
        switch (insight.name) {
          case "post_impressions":
            impressions = value;
            break;
          case "post_engaged_users":
            engagement = value;
            break;
          case "post_clicks":
            clicks = value;
            break;
        }
      }

      return {
        platform: "meta" as const,
        platform_post_id: post.id as string,
        published_at: post.created_time as string,
        title: null,
        content_snippet: ((post.message as string) || "").slice(0, 200),
        post_url: post.permalink_url as string,
        thumbnail_url: (post.full_picture as string) || null,
        post_type: "post",
        impressions,
        reach: impressions,
        likes: engagement,
        comments: 0,
        shares: 0,
        clicks,
        video_views: 0,
      };
    });
  }

  private emptyMetric(date: string): DailyMetric {
    return {
      platform: "meta",
      metric_date: date,
      impressions: 0,
      reach: 0,
      engagement: 0,
      clicks: 0,
      followers: 0,
      sessions: 0,
      pageviews: 0,
      users_total: 0,
      bounce_rate: 0,
    };
  }
}
