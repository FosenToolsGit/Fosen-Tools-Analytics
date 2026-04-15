import { format, eachDayOfInterval } from "date-fns";
import type { PlatformService, DailyMetric, PlatformPost } from "./types";

const GRAPH_API_BASE = "https://graph.facebook.com/v22.0";

export interface MetaPostExtras {
  post_source: "facebook" | "instagram";
  media_type?: string; // IMAGE, VIDEO, CAROUSEL_ALBUM, REEL (IG) or status/photo/video (FB)
}

export class MetaService implements PlatformService {
  private accessToken: string;
  private pageId: string;
  private igAccountIdEnv: string;
  private cachedIgAccountId: string | null = null;

  constructor() {
    this.accessToken = process.env.META_ACCESS_TOKEN!;
    this.pageId = process.env.META_PAGE_ID!;
    this.igAccountIdEnv = process.env.META_INSTAGRAM_ACCOUNT_ID || "";
  }

  /**
   * Henter tilkoblet Instagram Business Account. Hvis env-variabel er satt,
   * bruk den. Ellers forsøk å finne den via Facebook Page.
   */
  private async getInstagramAccountId(): Promise<string | null> {
    if (this.igAccountIdEnv) return this.igAccountIdEnv;
    if (this.cachedIgAccountId !== null) return this.cachedIgAccountId;
    try {
      const res = await this.graphGet(`/${this.pageId}`, {
        fields: "instagram_business_account",
      });
      const igId = res?.instagram_business_account?.id || null;
      this.cachedIgAccountId = igId;
      return igId;
    } catch {
      this.cachedIgAccountId = "";
      return null;
    }
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

    // Get page followers
    const pageInfo = await this.graphGet(`/${this.pageId}`, {
      fields: "fan_count,followers_count",
    });
    const followers = pageInfo.followers_count || pageInfo.fan_count || 0;

    // Initialize all days
    const dateMap = new Map<string, DailyMetric>();
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    for (const day of days) {
      const date = format(day, "yyyy-MM-dd");
      dateMap.set(date, this.emptyMetric(date, followers));
    }

    // Fetch Page Insights (real data)
    try {
      const insights = await this.graphGet(`/${this.pageId}/insights`, {
        metric:
          "page_post_engagements,page_views_total,page_impressions_unique",
        period: "day",
        since,
        until,
      });

      for (const metric of insights.data || []) {
        for (const val of metric.values || []) {
          const date = format(new Date(val.end_time), "yyyy-MM-dd");
          const existing = dateMap.get(date);
          if (existing && val.value) {
            switch (metric.name) {
              case "page_post_engagements":
                existing.engagement = val.value;
                break;
              case "page_views_total":
                existing.pageviews = val.value;
                existing.clicks = val.value;
                break;
              case "page_impressions_unique":
                existing.reach = val.value;
                existing.impressions = val.value;
                break;
            }
          }
        }
      }
    } catch (err) {
      console.error("Page insights error:", err);
    }

    // Enrich with post-level engagement data
    try {
      const postsResponse = await this.graphGet(`/${this.pageId}/posts`, {
        fields:
          "id,created_time,likes.summary(true),comments.summary(true),shares",
        since,
        until,
        limit: "100",
      });

      for (const post of postsResponse.data || []) {
        const date = format(new Date(post.created_time), "yyyy-MM-dd");
        const existing = dateMap.get(date);
        if (existing) {
          const likes = post.likes?.summary?.total_count || 0;
          const comments = post.comments?.summary?.total_count || 0;
          const shares = post.shares?.count || 0;
          // Use post data as fallback if insights are empty
          if (existing.engagement === 0) {
            existing.engagement = likes + comments + shares;
          }
        }
      }
    } catch {
      // Posts endpoint may fail without proper permissions
    }

    return Array.from(dateMap.values());
  }

  async fetchTopPosts(limit: number): Promise<PlatformPost[]> {
    const [fbPosts, igPosts] = await Promise.all([
      this.fetchFacebookPosts(limit),
      this.fetchInstagramPosts(limit),
    ]);
    return [...fbPosts, ...igPosts];
  }

  private async fetchFacebookPosts(limit: number): Promise<PlatformPost[]> {
    const response = await this.graphGet(`/${this.pageId}/posts`, {
      fields:
        "id,message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares",
      limit: limit.toString(),
    });

    const posts = response.data || [];

    const postsWithClicks = await Promise.all(
      posts.map(async (post: Record<string, unknown>) => {
        let clicks = 0;
        try {
          const insightsRes = await this.graphGet(
            `/${post.id}/insights/post_clicks`
          );
          clicks =
            insightsRes.data?.[0]?.values?.[0]?.value || 0;
        } catch {
          // post_clicks may fail for some posts
        }

        const likesData = post.likes as
          | { summary?: { total_count?: number } }
          | undefined;
        const commentsData = post.comments as
          | { summary?: { total_count?: number } }
          | undefined;
        const sharesData = post.shares as { count?: number } | undefined;

        const likes = likesData?.summary?.total_count || 0;
        const comments = commentsData?.summary?.total_count || 0;
        const shares = sharesData?.count || 0;

        return {
          platform: "meta" as const,
          platform_post_id: post.id as string,
          published_at: post.created_time as string,
          title: null,
          content_snippet: ((post.message as string) || "").slice(0, 200),
          post_url: post.permalink_url as string,
          thumbnail_url: (post.full_picture as string) || null,
          post_type: "facebook_post",
          impressions: clicks,
          reach: likes + comments + shares + clicks,
          likes,
          comments,
          shares,
          clicks,
          video_views: 0,
        };
      })
    );

    return postsWithClicks;
  }

  /**
   * Henter Instagram-media (posts, reels, carousels) med insights.
   * Instagram-API-et er separat fra Facebook Page API selv om de deler token.
   */
  private async fetchInstagramPosts(limit: number): Promise<PlatformPost[]> {
    const igId = await this.getInstagramAccountId();
    if (!igId) return [];

    let mediaResponse;
    try {
      mediaResponse = await this.graphGet(`/${igId}/media`, {
        fields:
          "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
        limit: limit.toString(),
      });
    } catch (err) {
      console.error("Instagram media fetch failed:", err);
      return [];
    }

    const media = (mediaResponse.data || []) as Array<Record<string, unknown>>;

    // Hent insights per media i parallel — reach, impressions, saved
    const postsWithInsights = await Promise.all(
      media.map(async (m) => {
        const mediaType = String(m.media_type || "IMAGE");
        const isVideo = mediaType === "VIDEO" || mediaType === "REELS";

        // Instagram Insights-metrics varierer per media-type
        let reach = 0;
        let impressions = 0;
        let saves = 0;
        let videoViews = 0;
        try {
          const metricList = isVideo
            ? "reach,plays,saved"
            : "reach,impressions,saved";
          const insightsRes = await this.graphGet(
            `/${m.id}/insights`,
            { metric: metricList }
          );
          const insights = (insightsRes.data || []) as Array<{
            name: string;
            values?: Array<{ value?: number }>;
          }>;
          for (const ins of insights) {
            const val = ins.values?.[0]?.value ?? 0;
            if (ins.name === "reach") reach = val;
            else if (ins.name === "impressions") impressions = val;
            else if (ins.name === "plays") videoViews = val;
            else if (ins.name === "saved") saves = val;
          }
        } catch {
          // Noen insights kan feile for eldre content
        }

        const likes = Number(m.like_count ?? 0);
        const comments = Number(m.comments_count ?? 0);

        return {
          platform: "meta" as const,
          platform_post_id: `ig_${m.id as string}`,
          published_at: String(m.timestamp || ""),
          title: null,
          content_snippet: String(m.caption || "").slice(0, 200),
          post_url: String(m.permalink || ""),
          thumbnail_url:
            (m.thumbnail_url as string) || (m.media_url as string) || null,
          post_type: `instagram_${mediaType.toLowerCase()}`,
          impressions: impressions || reach,
          reach,
          likes,
          comments,
          shares: saves, // Bruker "saves" som nærmeste Instagram-ekvivalent til shares
          clicks: 0, // Instagram eksponerer ikke klikk på samme måte
          video_views: videoViews,
        };
      })
    );

    return postsWithInsights;
  }

  private emptyMetric(date: string, followers: number = 0): DailyMetric {
    return {
      platform: "meta",
      metric_date: date,
      impressions: 0,
      reach: 0,
      engagement: 0,
      clicks: 0,
      followers,
      sessions: 0,
      pageviews: 0,
      users_total: 0,
      bounce_rate: 0,
    };
  }
}
