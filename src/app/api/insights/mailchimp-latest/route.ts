import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Siste Mailchimp-kampanje med nøkkeltall + topp-klikkede lenke.
 * Sammenligner åpningsrate mot snittet for de siste 10 kampanjene før denne.
 */

export interface MailchimpLatestResponse {
  latest: {
    campaign_id: string;
    title: string;
    subject: string | null;
    sent_at: string;
    sent_count: number;
    unique_opens: number;
    open_rate: number;
    clicks: number;
    click_rate: number;
    unsubscribed: number;
    post_url: string | null;
  } | null;
  baseline: {
    avg_open_rate: number;
    avg_click_rate: number;
    n_campaigns: number;
  };
  open_rate_lift_pct: number;
  top_link: { url: string; clicks: number } | null;
  generated_at: string;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data: posts } = await supabase
      .from("platform_posts")
      .select("platform_post_id, title, content_snippet, published_at, post_url, reach, likes, clicks, comments")
      .eq("platform", "mailchimp")
      .order("published_at", { ascending: false })
      .limit(11);

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        latest: null,
        baseline: { avg_open_rate: 0, avg_click_rate: 0, n_campaigns: 0 },
        open_rate_lift_pct: 0,
        top_link: null,
        generated_at: new Date().toISOString(),
      } satisfies MailchimpLatestResponse);
    }

    const latest = posts[0];
    const baselinePosts = posts.slice(1);

    const sent = Number(latest.reach) || 0;
    const opens = Number(latest.likes) || 0;
    const clicks = Number(latest.clicks) || 0;
    const openRate = sent > 0 ? (opens / sent) * 100 : 0;
    const clickRate = sent > 0 ? (clicks / sent) * 100 : 0;

    const baselineRates = baselinePosts
      .map((p) => {
        const s = Number(p.reach) || 0;
        return s > 0 ? { open: (Number(p.likes) || 0) / s, click: (Number(p.clicks) || 0) / s } : null;
      })
      .filter((x): x is { open: number; click: number } => x !== null);

    const avgOpen = baselineRates.length > 0
      ? (baselineRates.reduce((s, r) => s + r.open, 0) / baselineRates.length) * 100
      : 0;
    const avgClick = baselineRates.length > 0
      ? (baselineRates.reduce((s, r) => s + r.click, 0) / baselineRates.length) * 100
      : 0;

    const liftPct = avgOpen > 0 ? Math.round(((openRate - avgOpen) / avgOpen) * 1000) / 10 : 0;

    const { data: links } = await supabase
      .from("mailchimp_campaign_links")
      .select("url, total_clicks")
      .eq("campaign_id", latest.platform_post_id)
      .order("total_clicks", { ascending: false })
      .limit(1);

    const topLink = links && links.length > 0
      ? { url: links[0].url as string, clicks: Number(links[0].total_clicks) || 0 }
      : null;

    const res: MailchimpLatestResponse = {
      latest: {
        campaign_id: latest.platform_post_id,
        title: latest.title || "(uten tittel)",
        subject: latest.content_snippet,
        sent_at: latest.published_at,
        sent_count: sent,
        unique_opens: opens,
        open_rate: Math.round(openRate * 10) / 10,
        clicks,
        click_rate: Math.round(clickRate * 100) / 100,
        unsubscribed: Number(latest.comments) || 0,
        post_url: latest.post_url,
      },
      baseline: {
        avg_open_rate: Math.round(avgOpen * 10) / 10,
        avg_click_rate: Math.round(avgClick * 100) / 100,
        n_campaigns: baselineRates.length,
      },
      open_rate_lift_pct: liftPct,
      top_link: topLink,
      generated_at: new Date().toISOString(),
    };
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
