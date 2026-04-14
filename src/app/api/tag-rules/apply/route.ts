import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  ruleMatches,
  keywordEntityKey,
  postEntityKey,
  campaignEntityKey,
  sourceEntityKey,
  type TagRule,
  type TaggableEntity,
} from "@/lib/types/tags";

interface RulesByType {
  keyword: TagRule[];
  post: TagRule[];
  campaign: TagRule[];
  source: TagRule[];
}

interface NewAssignment {
  tag_id: string;
  entity_type: TaggableEntity;
  entity_key: string;
  rule_id: string;
  auto: boolean;
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Hent alle aktive regler
  const { data: rules, error: rulesErr } = await admin
    .from("tag_rules")
    .select("*")
    .eq("enabled", true);
  if (rulesErr) {
    return NextResponse.json({ error: rulesErr.message }, { status: 500 });
  }

  const byType: RulesByType = { keyword: [], post: [], campaign: [], source: [] };
  for (const r of (rules ?? []) as TagRule[]) {
    byType[r.entity_type].push(r);
  }

  const toUpsert: NewAssignment[] = [];
  function emit(rule: TagRule, key: string) {
    toUpsert.push({
      tag_id: rule.tag_id,
      entity_type: rule.entity_type,
      entity_key: key,
      rule_id: rule.id,
      auto: true,
    });
  }

  // Helper for paginert select
  async function paginate<T>(
    table: string,
    columns: string,
    handler: (rows: T[]) => void
  ) {
    let offset = 0;
    while (true) {
      const { data, error } = await admin
        .from(table)
        .select(columns)
        .range(offset, offset + 999);
      if (error) break;
      if (!data || data.length === 0) break;
      handler(data as unknown as T[]);
      if (data.length < 1000) break;
      offset += 1000;
    }
  }

  // KEYWORDS
  if (byType.keyword.length > 0) {
    const seen = new Set<string>();
    await paginate<{ query: string }>(
      "search_keywords",
      "query",
      (rows) => {
        for (const row of rows) {
          const key = keywordEntityKey(row.query);
          if (seen.has(key)) continue;
          seen.add(key);
          for (const rule of byType.keyword) {
            if (ruleMatches(rule, key)) emit(rule, key);
          }
        }
      }
    );
  }

  // POSTS
  if (byType.post.length > 0) {
    await paginate<{
      platform: string;
      platform_post_id: string;
      title: string | null;
      content_snippet: string | null;
    }>(
      "platform_posts",
      "platform, platform_post_id, title, content_snippet",
      (rows) => {
        for (const row of rows) {
          const key = postEntityKey(row.platform, row.platform_post_id);
          const text = `${row.title ?? ""} ${row.content_snippet ?? ""}`.trim();
          for (const rule of byType.post) {
            if (ruleMatches(rule, text)) emit(rule, key);
          }
        }
      }
    );
  }

  // CAMPAIGNS
  if (byType.campaign.length > 0) {
    const seen = new Set<string>();
    await paginate<{
      campaign_name: string;
      ad_group: string | null;
      keyword: string | null;
    }>(
      "ad_campaigns",
      "campaign_name, ad_group, keyword",
      (rows) => {
        for (const row of rows) {
          const key = campaignEntityKey(row.campaign_name, row.ad_group, row.keyword);
          if (seen.has(key)) continue;
          seen.add(key);
          const matchTarget = `${row.campaign_name} ${row.ad_group ?? ""} ${row.keyword ?? ""}`;
          for (const rule of byType.campaign) {
            if (ruleMatches(rule, matchTarget)) emit(rule, key);
          }
        }
      }
    );
  }

  // SOURCES
  if (byType.source.length > 0) {
    const seen = new Set<string>();
    await paginate<{
      channel: string;
      source: string | null;
      medium: string | null;
    }>(
      "traffic_sources",
      "channel, source, medium",
      (rows) => {
        for (const row of rows) {
          const key = sourceEntityKey(row.channel, row.source, row.medium);
          if (seen.has(key)) continue;
          seen.add(key);
          const matchTarget = `${row.channel} ${row.source ?? ""} ${row.medium ?? ""}`;
          for (const rule of byType.source) {
            if (ruleMatches(rule, matchTarget)) emit(rule, key);
          }
        }
      }
    );
  }

  if (toUpsert.length === 0) {
    return NextResponse.json({ applied: 0 });
  }

  // Upsert i batcher \u00e1 500
  let inserted = 0;
  for (let i = 0; i < toUpsert.length; i += 500) {
    const batch = toUpsert.slice(i, i + 500);
    const { error } = await admin
      .from("tag_assignments")
      .upsert(batch, { onConflict: "tag_id,entity_type,entity_key" });
    if (!error) inserted += batch.length;
  }

  return NextResponse.json({
    applied: inserted,
    rules_evaluated: rules?.length ?? 0,
  });
}
