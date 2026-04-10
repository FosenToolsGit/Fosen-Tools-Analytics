"use client";

import useSWR from "swr";
import type { PlatformKey } from "@/lib/utils/platforms";

export interface PostRow {
  id: string;
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
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePosts(platform?: PlatformKey, limit: number = 20) {
  const platformParam = platform ? `&platform=${platform}` : "";

  const { data, error, isLoading } = useSWR<PostRow[]>(
    `/api/posts?limit=${limit}${platformParam}`,
    fetcher
  );

  return { data, error, isLoading };
}
