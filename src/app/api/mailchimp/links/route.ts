import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export interface MailchimpLinkAggregate {
  url: string;
  total_clicks: number;
  unique_clicks: number;
  campaigns_count: number;
  campaigns: string[];
  last_click_at: string | null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const days = Math.min(
    parseInt(request.nextUrl.searchParams.get("days") || "90", 10) || 90,
    365
  );
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Hent campaign-ids innenfor perioden først
  const { data: posts } = await supabase
    .from("platform_posts")
    .select("platform_post_id, title, published_at")
    .eq("platform", "mailchimp")
    .gte("published_at", since.toISOString());

  const campaignIds = new Set((posts ?? []).map((p) => p.platform_post_id));
  if (campaignIds.size === 0) {
    return NextResponse.json([]);
  }

  const campaignTitles = new Map<string, string>();
  for (const p of posts ?? []) {
    campaignTitles.set(p.platform_post_id, p.title || "");
  }

  const { data, error } = await supabase
    .from("mailchimp_campaign_links")
    .select("*")
    .in("campaign_id", Array.from(campaignIds));

  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggreger per URL
  const map = new Map<string, MailchimpLinkAggregate>();
  for (const row of data ?? []) {
    const ex: MailchimpLinkAggregate = map.get(row.url) ?? {
      url: row.url,
      total_clicks: 0,
      unique_clicks: 0,
      campaigns_count: 0,
      campaigns: [],
      last_click_at: null,
    };
    ex.total_clicks += row.total_clicks || 0;
    ex.unique_clicks += row.unique_clicks || 0;
    const title = campaignTitles.get(row.campaign_id);
    if (title && !ex.campaigns.includes(title)) {
      ex.campaigns.push(title);
      ex.campaigns_count += 1;
    }
    if (row.last_click_at) {
      if (!ex.last_click_at || new Date(row.last_click_at) > new Date(ex.last_click_at)) {
        ex.last_click_at = row.last_click_at;
      }
    }
    map.set(row.url, ex);
  }

  const result = Array.from(map.values())
    .sort((a, b) => b.total_clicks - a.total_clicks)
    .slice(0, 100);

  return NextResponse.json(result);
}
