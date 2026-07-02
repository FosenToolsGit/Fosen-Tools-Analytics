import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import {
  enrichNewsletterPosts,
  findSubjectPatterns,
  generateNewsletterTopics,
  bestDayOfWeek,
  scorePosts,
  type SubjectPattern,
  type NewsletterTopic,
  type NewsletterPost,
  type RawPost,
} from "@/lib/services/post-builder";

export interface NewsletterTopLink {
  url: string;
  total_clicks: number;
  unique_clicks: number;
  campaigns_count: number;
  derived_topic: string;
}

export interface NewsletterBuilderResponse {
  summary: {
    campaigns_analyzed: number;
    avg_open_rate: number; // %
    avg_click_rate: number; // %
    best_day: string | null;
    best_subject: string | null;
  };
  patterns: SubjectPattern[];
  top_subjects: Array<{
    subject: string;
    sent_at: string;
    open_rate: number;
    click_rate: number;
    sent_to: number;
  }>;
  top_links: NewsletterTopLink[];
  topics: NewsletterTopic[];
}

/** Forsøker å utlede et tema-navn fra en URL — bruker siste path-segment. */
function deriveTopicFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] || u.hostname;
    return decodeURIComponent(last)
      .replace(/[-_]/g, " ")
      .replace(/\.[a-z]+$/i, "")
      .trim();
  } catch {
    return url.slice(0, 60);
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const sp = request.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });
  }

  try {
    // 1. Mailchimp-kampanjer (lagret i platform_posts)
    const { data: campaignsRaw, error: postsErr } = await supabase
      .from("platform_posts")
      .select(
        "id, platform, platform_post_id, published_at, title, content_snippet, post_url, thumbnail_url, post_type, impressions, reach, likes, comments, shares, clicks"
      )
      .eq("platform", "mailchimp")
      .gte("published_at", from)
      .lte("published_at", to)
      .order("published_at", { ascending: false })
      .limit(200);

    if (postsErr) {
      return NextResponse.json({ error: postsErr.message }, { status: 500 });
    }

    const campaigns = (campaignsRaw ?? []) as RawPost[];
    const enriched: NewsletterPost[] = enrichNewsletterPosts(campaigns);
    const patterns = findSubjectPatterns(enriched);

    // 2. Best day-of-week — gjenbruker scoring-utility som bruker engagement_rate.
    //    For nyhetsbrev mapper vi open_rate inn i "engagement_rate" via scorePosts
    //    som produserer riktig dow-bucketing.
    const scoredForDay = scorePosts(campaigns);
    const bestDay = bestDayOfWeek(scoredForDay);

    // 3. Topp-emner (etter open_rate)
    const topSubjects = [...enriched]
      .filter((p) => p.reach && p.reach > 0)
      .sort((a, b) => b.open_rate - a.open_rate)
      .slice(0, 5)
      .map((p) => ({
        subject: (p.content_snippet || p.title || "(uten emne)").trim(),
        sent_at: p.published_at?.slice(0, 10) ?? "",
        open_rate: Math.round(p.open_rate * 1000) / 10,
        click_rate: Math.round(p.click_rate * 1000) / 10,
        sent_to: Number(p.reach) || 0,
      }));

    // 4. Topp-klikkede lenker — kobler til kampanjer i perioden
    const campaignIds = new Set(campaigns.map((c) => c.platform_post_id));
    let topLinks: NewsletterTopLink[] = [];
    if (campaignIds.size > 0) {
      const { data: linksRaw } = await supabase
        .from("mailchimp_campaign_links")
        .select("url, total_clicks, unique_clicks, campaign_id")
        .in("campaign_id", Array.from(campaignIds));

      const linkMap = new Map<
        string,
        { total: number; unique: number; campaigns: Set<string> }
      >();
      for (const row of linksRaw ?? []) {
        const ex = linkMap.get(row.url) ?? {
          total: 0,
          unique: 0,
          campaigns: new Set<string>(),
        };
        ex.total += row.total_clicks || 0;
        ex.unique += row.unique_clicks || 0;
        ex.campaigns.add(row.campaign_id);
        linkMap.set(row.url, ex);
      }

      topLinks = Array.from(linkMap.entries())
        .map(([url, v]) => ({
          url,
          total_clicks: v.total,
          unique_clicks: v.unique,
          campaigns_count: v.campaigns.size,
          derived_topic: deriveTopicFromUrl(url),
        }))
        .sort((a, b) => b.total_clicks - a.total_clicks)
        .slice(0, 10);
    }

    // 5. Topics — bruker topp-klikkede lenker som tema-input
    const topProducts =
      topLinks.length > 0
        ? topLinks
            .map((l) => l.derived_topic)
            .filter((t) => t.length > 2 && t.length < 40)
            .slice(0, 6)
        : ["Verktøyvogner", "Pelicase", "Momentnøkler", "Verktøysett"];
    const topics = generateNewsletterTopics(patterns, topProducts);

    // 6. Summary
    const avgOpen =
      enriched.length > 0
        ? enriched.reduce((s, p) => s + p.open_rate, 0) / enriched.length
        : 0;
    const avgClick =
      enriched.length > 0
        ? enriched.reduce((s, p) => s + p.click_rate, 0) / enriched.length
        : 0;

    const response: NewsletterBuilderResponse = {
      summary: {
        campaigns_analyzed: enriched.length,
        avg_open_rate: Math.round(avgOpen * 1000) / 10,
        avg_click_rate: Math.round(avgClick * 1000) / 10,
        best_day: bestDay?.day ?? null,
        best_subject: topSubjects[0]?.subject ?? null,
      },
      patterns,
      top_subjects: topSubjects,
      top_links: topLinks,
      topics,
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
