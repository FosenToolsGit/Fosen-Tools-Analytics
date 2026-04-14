import type { PlatformKey } from "@/lib/utils/platforms";

export interface DailyMetric {
  platform: PlatformKey;
  metric_date: string; // YYYY-MM-DD
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
  followers: number;
  sessions: number;
  pageviews: number;
  users_total: number;
  bounce_rate: number;
  extra_data?: Record<string, unknown>;
}

export interface PlatformPost {
  platform: PlatformKey;
  platform_post_id: string;
  published_at: string;
  title: string | null;
  content_snippet: string | null;
  post_url: string | null;
  thumbnail_url: string | null;
  post_type: string | null;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  video_views: number;
  raw_data?: Record<string, unknown>;
}

export interface PlatformService {
  fetchDailyMetrics(startDate: Date, endDate: Date): Promise<DailyMetric[]>;
  fetchTopPosts(limit: number): Promise<PlatformPost[]>;
}

// GA4-specific types for new analytics sections

export interface SearchKeywordRow {
  query: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
  metric_date: string;
  daily?: SearchKeywordRow[];
}

export interface GeoDataRow {
  country: string;
  country_code: string;
  city: string | null;
  sessions: number;
  total_users: number;
  active_users: number;
  metric_date: string;
}

export interface TrafficSourceRow {
  channel: string;
  source: string | null;
  medium: string | null;
  sessions: number;
  total_users: number;
  engagement_rate: number;
  conversions: number;
  metric_date: string;
}

export interface AdCampaignRow {
  campaign_name: string;
  ad_group: string | null;
  keyword: string | null;
  sessions: number;
  total_users: number;
  conversions: number;
  engagement_rate: number;
  metric_date: string;
}
