import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import type { TaggableEntity } from "@/lib/types/tags";
import {
  keywordEntityKey,
  postEntityKey,
  campaignEntityKey,
  sourceEntityKey,
} from "@/lib/types/tags";

interface DailyMetric {
  date: string;
  clicks: number;
  impressions: number;
  sessions: number;
  engagement: number;
}

interface EntitySummary {
  entity_key: string;
  label: string;
  clicks: number;
  impressions: number;
  sessions: number;
  engagement: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const sp = request.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");

  // Hent tag + alle assignments for denne tag-en
  const { data: tag, error: tagErr } = await supabase
    .from("tags")
    .select("*")
    .eq("id", id)
    .single();
  if (tagErr || !tag) {
    return NextResponse.json({ error: "Tag not found" }, { status: 404 });
  }

  const { data: assignments, error: assignErr } = await supabase
    .from("tag_assignments")
    .select("entity_type, entity_key")
    .eq("tag_id", id);
  if (assignErr) {
    return NextResponse.json({ error: assignErr.message }, { status: 500 });
  }

  const byType: Record<TaggableEntity, Set<string>> = {
    keyword: new Set(),
    post: new Set(),
    campaign: new Set(),
    source: new Set(),
  };
  assignments?.forEach((a) => {
    byType[a.entity_type as TaggableEntity].add(a.entity_key);
  });

  const dailyMap = new Map<string, DailyMetric>();
  function addToDay(date: string, patch: Partial<Omit<DailyMetric, "date">>) {
    const existing = dailyMap.get(date) ?? {
      date,
      clicks: 0,
      impressions: 0,
      sessions: 0,
      engagement: 0,
    };
    if (patch.clicks) existing.clicks += patch.clicks;
    if (patch.impressions) existing.impressions += patch.impressions;
    if (patch.sessions) existing.sessions += patch.sessions;
    if (patch.engagement) existing.engagement += patch.engagement;
    dailyMap.set(date, existing);
  }

  const entities = {
    keywords: [] as EntitySummary[],
    posts: [] as EntitySummary[],
    campaigns: [] as EntitySummary[],
    sources: [] as EntitySummary[],
  };

  function dateInRange(d: string): boolean {
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  // KEYWORDS — paginert fetch for å håndtere store sett
  if (byType.keyword.size > 0) {
    const totals = new Map<string, EntitySummary>();
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("search_keywords")
        .select("query, clicks, impressions, metric_date")
        .range(offset, offset + 999);
      if (error) break;
      if (!data || data.length === 0) break;
      for (const row of data) {
        const key = keywordEntityKey(row.query);
        if (!byType.keyword.has(key)) continue;
        if (!dateInRange(row.metric_date)) continue;
        addToDay(row.metric_date, {
          clicks: row.clicks,
          impressions: row.impressions,
        });
        const sum = totals.get(key) ?? {
          entity_key: key,
          label: row.query.trim(),
          clicks: 0,
          impressions: 0,
          sessions: 0,
          engagement: 0,
        };
        sum.clicks += row.clicks;
        sum.impressions += row.impressions;
        totals.set(key, sum);
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
    entities.keywords = Array.from(totals.values()).sort(
      (a, b) => b.impressions - a.impressions
    );
  }

  // POSTS
  if (byType.post.size > 0) {
    const totals = new Map<string, EntitySummary>();
    const { data } = await supabase
      .from("platform_posts")
      .select(
        "platform, platform_post_id, title, published_at, clicks, impressions, reach, likes, comments, shares"
      );
    for (const row of data ?? []) {
      const key = postEntityKey(row.platform, row.platform_post_id);
      if (!byType.post.has(key)) continue;
      const date = (row.published_at || "").slice(0, 10);
      if (date && !dateInRange(date)) continue;
      const engagement = (row.likes || 0) + (row.comments || 0) + (row.shares || 0);
      if (date) {
        addToDay(date, {
          clicks: row.clicks,
          impressions: row.impressions,
          engagement,
        });
      }
      const sum = totals.get(key) ?? {
        entity_key: key,
        label: row.title || row.platform_post_id,
        clicks: 0,
        impressions: 0,
        sessions: 0,
        engagement: 0,
      };
      sum.clicks += row.clicks || 0;
      sum.impressions += row.impressions || 0;
      sum.engagement += engagement;
      totals.set(key, sum);
    }
    entities.posts = Array.from(totals.values()).sort((a, b) => b.clicks - a.clicks);
  }

  // CAMPAIGNS — daglig per (campaign_name, ad_group, keyword)
  if (byType.campaign.size > 0) {
    const totals = new Map<string, EntitySummary>();
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("campaign_name, ad_group, keyword, sessions, total_users, metric_date")
        .range(offset, offset + 999);
      if (error) break;
      if (!data || data.length === 0) break;
      for (const row of data) {
        const key = campaignEntityKey(row.campaign_name, row.ad_group, row.keyword);
        if (!byType.campaign.has(key)) continue;
        if (!dateInRange(row.metric_date)) continue;
        addToDay(row.metric_date, { sessions: row.sessions });
        const sum = totals.get(key) ?? {
          entity_key: key,
          label: `${row.campaign_name}${row.keyword ? ` · ${row.keyword}` : ""}`,
          clicks: 0,
          impressions: 0,
          sessions: 0,
          engagement: 0,
        };
        sum.sessions += row.sessions || 0;
        totals.set(key, sum);
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
    entities.campaigns = Array.from(totals.values()).sort(
      (a, b) => b.sessions - a.sessions
    );
  }

  // SOURCES
  if (byType.source.size > 0) {
    const totals = new Map<string, EntitySummary>();
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("traffic_sources")
        .select("channel, source, medium, sessions, total_users, metric_date")
        .range(offset, offset + 999);
      if (error) break;
      if (!data || data.length === 0) break;
      for (const row of data) {
        const key = sourceEntityKey(row.channel, row.source, row.medium);
        if (!byType.source.has(key)) continue;
        if (!dateInRange(row.metric_date)) continue;
        addToDay(row.metric_date, { sessions: row.sessions });
        const sum = totals.get(key) ?? {
          entity_key: key,
          label: `${row.channel} · ${row.source ?? "—"} / ${row.medium ?? "—"}`,
          clicks: 0,
          impressions: 0,
          sessions: 0,
          engagement: 0,
        };
        sum.sessions += row.sessions || 0;
        totals.set(key, sum);
      }
      if (data.length < 1000) break;
      offset += 1000;
    }
    entities.sources = Array.from(totals.values()).sort(
      (a, b) => b.sessions - a.sessions
    );
  }

  const daily = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const totals = daily.reduce(
    (acc, d) => ({
      clicks: acc.clicks + d.clicks,
      impressions: acc.impressions + d.impressions,
      sessions: acc.sessions + d.sessions,
      engagement: acc.engagement + d.engagement,
    }),
    { clicks: 0, impressions: 0, sessions: 0, engagement: 0 }
  );

  return NextResponse.json({ tag, totals, daily, entities });
}
