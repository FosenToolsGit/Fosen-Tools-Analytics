import { format } from "date-fns";
import type { PlatformService, DailyMetric, PlatformPost } from "./types";

const API_BASE = "https://api.linkedin.com/v2";

export class LinkedInService implements PlatformService {
  private accessToken: string;
  private organizationId: string;

  constructor() {
    this.accessToken = process.env.LINKEDIN_ACCESS_TOKEN!;
    this.organizationId = process.env.LINKEDIN_ORGANIZATION_ID!;
  }

  private async apiGet(path: string, params: Record<string, string> = {}) {
    const url = new URL(`${API_BASE}${path}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`LinkedIn API error: ${res.status} ${err}`);
    }
    return res.json();
  }

  async fetchDailyMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<DailyMetric[]> {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    const orgUrn = `urn:li:organization:${this.organizationId}`;

    try {
      const response = await this.apiGet(
        "/organizationalEntityShareStatistics",
        {
          q: "organizationalEntity",
          organizationalEntity: orgUrn,
          "timeIntervals.timeGranularityType": "DAY",
          "timeIntervals.timeRange.start": startMs.toString(),
          "timeIntervals.timeRange.end": endMs.toString(),
        }
      );

      const elements = response.elements || [];
      const metrics: DailyMetric[] = [];

      for (const element of elements) {
        const timeRange = element.timeRange || {};
        const date = format(new Date(timeRange.start), "yyyy-MM-dd");
        const stats = element.totalShareStatistics || {};

        metrics.push({
          platform: "linkedin",
          metric_date: date,
          impressions: stats.impressionCount || 0,
          reach: stats.uniqueImpressionsCount || 0,
          engagement: stats.engagementCount || stats.likeCount || 0,
          clicks: stats.clickCount || 0,
          followers: 0,
          sessions: 0,
          pageviews: 0,
          users_total: 0,
          bounce_rate: 0,
        });
      }

      // Try to get follower count
      try {
        const followerRes = await this.apiGet(
          "/organizationalEntityFollowerStatistics",
          {
            q: "organizationalEntity",
            organizationalEntity: orgUrn,
          }
        );
        const followerCount =
          followerRes.elements?.[0]?.followerCounts?.organicFollowerCount || 0;

        // Set followers on the latest metric
        if (metrics.length > 0) {
          metrics[metrics.length - 1].followers = followerCount;
        }
      } catch {
        // Follower stats may not be available
      }

      return metrics;
    } catch (err) {
      console.error("LinkedIn fetchDailyMetrics error:", err);
      return [];
    }
  }

  async fetchTopPosts(limit: number): Promise<PlatformPost[]> {
    try {
      const orgUrn = `urn:li:organization:${this.organizationId}`;
      const response = await this.apiGet("/ugcPosts", {
        q: "authors",
        authors: `List(${orgUrn})`,
        sortBy: "LAST_MODIFIED",
        count: limit.toString(),
      });

      return (response.elements || []).map(
        (post: Record<string, unknown>) => {
          const specificContent = post.specificContent as Record<
            string,
            Record<string, unknown>
          >;
          const shareContent =
            specificContent?.["com.linkedin.ugc.ShareContent"] || {};
          const text =
            (shareContent.shareCommentary as Record<string, string>)?.text ||
            "";

          return {
            platform: "linkedin" as const,
            platform_post_id: post.id as string,
            published_at: post.created
              ? new Date(
                  (post.created as Record<string, number>).time
                ).toISOString()
              : new Date().toISOString(),
            title: null,
            content_snippet: text.slice(0, 200),
            post_url: null,
            thumbnail_url: null,
            post_type: "post",
            impressions: 0,
            reach: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            clicks: 0,
            video_views: 0,
          };
        }
      );
    } catch (err) {
      console.error("LinkedIn fetchTopPosts error:", err);
      return [];
    }
  }
}
