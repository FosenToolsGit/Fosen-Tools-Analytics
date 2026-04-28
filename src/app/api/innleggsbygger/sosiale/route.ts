import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import {
  scorePosts,
  findCaptionPatterns,
  findBestPosts,
  bestDayOfWeek,
  generateCaptionSuggestions,
  generateNativePrompts,
  generateOrganicIdeas,
  type CaptionPattern,
  type ScoredPost,
  type CaptionSuggestion,
  type NativePromptSuggestion,
  type OrganicIdea,
  type RawPost,
} from "@/lib/services/post-builder";

const DEFAULT_THEMES = [
  "Verktøyvogn",
  "Pelicase",
  "Momentnøkkel",
  "Verktøysett",
  "Industriverktøy",
  "Bits",
];

export interface SocialBuilderResponse {
  summary: {
    posts_analyzed: number;
    avg_engagement_rate: number;
    best_day: string | null;
    best_post_url: string | null;
  };
  patterns: CaptionPattern[];
  top_posts: ScoredPost[];
  themes_used: string[];
  caption_suggestions: CaptionSuggestion[];
  native_prompts: NativePromptSuggestion[];
  organic_ideas: OrganicIdea[];
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
  }

  const themesParam = sp.get("themes");
  const themes =
    themesParam && themesParam.trim().length > 0
      ? themesParam
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : DEFAULT_THEMES;

  try {
    const { data: postsRaw, error } = await supabase
      .from("platform_posts")
      .select(
        "id, platform, platform_post_id, published_at, title, content_snippet, post_url, thumbnail_url, post_type, impressions, reach, likes, comments, shares, clicks"
      )
      .eq("platform", "meta")
      .gte("published_at", from)
      .lte("published_at", to)
      .order("published_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const posts = (postsRaw ?? []) as RawPost[];
    const scored = scorePosts(posts);
    const patterns = findCaptionPatterns(scored);
    const topPosts = findBestPosts(scored, 5);
    const bestDay = bestDayOfWeek(scored);
    const captionSuggestions = generateCaptionSuggestions(
      scored,
      patterns,
      themes
    );
    const nativePrompts = generateNativePrompts(themes);
    const organicIdeas = generateOrganicIdeas(themes);

    const avgRate =
      scored.length > 0
        ? scored.reduce((s, p) => s + p.engagement_rate, 0) / scored.length
        : 0;

    const response: SocialBuilderResponse = {
      summary: {
        posts_analyzed: scored.length,
        avg_engagement_rate: Math.round(avgRate * 10000) / 100, // som %
        best_day: bestDay?.day ?? null,
        best_post_url: topPosts[0]?.post_url ?? null,
      },
      patterns,
      top_posts: topPosts,
      themes_used: themes,
      caption_suggestions: captionSuggestions,
      native_prompts: nativePrompts,
      organic_ideas: organicIdeas,
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
