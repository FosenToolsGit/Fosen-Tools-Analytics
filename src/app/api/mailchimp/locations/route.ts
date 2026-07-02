import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

export interface MailchimpLocationAggregate {
  country_code: string;
  opens: number;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const days = Math.min(
    parseInt(request.nextUrl.searchParams.get("days") || "90", 10) || 90,
    365
  );
  const since = new Date();
  since.setDate(since.getDate() - days);

  // Hent campaign-ids innenfor perioden
  const { data: posts } = await supabase
    .from("platform_posts")
    .select("platform_post_id")
    .eq("platform", "mailchimp")
    .gte("published_at", since.toISOString());

  const campaignIds = new Set((posts ?? []).map((p) => p.platform_post_id));
  if (campaignIds.size === 0) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("mailchimp_campaign_locations")
    .select("country_code, opens")
    .in("campaign_id", Array.from(campaignIds));

  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggreger per country_code
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.country_code, (map.get(row.country_code) ?? 0) + (row.opens || 0));
  }

  const result: MailchimpLocationAggregate[] = Array.from(map.entries())
    .map(([country_code, opens]) => ({ country_code, opens }))
    .sort((a, b) => b.opens - a.opens);

  return NextResponse.json(result);
}
