import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { subDays, formatISO } from "date-fns";
import { keywordEntityKey } from "@/lib/types/tags";

interface MetricRow {
  platform: string;
  metric_date: string;
  sessions: number;
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
}

interface KeywordRow {
  query: string;
  clicks: number;
  impressions: number;
  metric_date: string;
}

export interface PlatformOutlier {
  kind: "platform";
  platform: string;
  metric: "sessions" | "impressions" | "reach" | "engagement" | "clicks";
  current: number;
  previous: number;
  delta_pct: number;
  direction: "up" | "down";
  severity: "info" | "warning" | "alert";
}

export interface TagOutlier {
  kind: "tag";
  tag_id: string;
  tag_name: string;
  tag_color: string;
  metric: "clicks" | "impressions";
  current: number;
  previous: number;
  delta_pct: number;
  direction: "up" | "down";
  severity: "info" | "warning" | "alert";
}

export type OutlierAny = PlatformOutlier | TagOutlier;

const PLATFORM_METRICS: PlatformOutlier["metric"][] = [
  "sessions",
  "impressions",
  "reach",
  "engagement",
  "clicks",
];

const WARNING_THRESHOLD = 0.3;
const ALERT_THRESHOLD = 0.6;
const MIN_ABSOLUTE = 10;

function severityFor(abs: number): "warning" | "alert" | null {
  if (abs >= ALERT_THRESHOLD) return "alert";
  if (abs >= WARNING_THRESHOLD) return "warning";
  return null;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const currentFrom = subDays(today, 7);
  const previousFrom = subDays(today, 14);
  const previousTo = subDays(today, 8);

  const currentFromStr = formatISO(currentFrom, { representation: "date" });
  const todayStr = formatISO(today, { representation: "date" });
  const previousFromStr = formatISO(previousFrom, { representation: "date" });
  const previousToStr = formatISO(previousTo, { representation: "date" });

  // --- PLATFORM OUTLIERS ---
  const { data: currentRows } = await supabase
    .from("analytics_metrics")
    .select("*")
    .gte("metric_date", currentFromStr)
    .lte("metric_date", todayStr);

  const { data: previousRows } = await supabase
    .from("analytics_metrics")
    .select("*")
    .gte("metric_date", previousFromStr)
    .lte("metric_date", previousToStr);

  function aggregatePlatform(
    rows: MetricRow[]
  ): Map<string, Record<string, number>> {
    const map = new Map<string, Record<string, number>>();
    for (const row of rows) {
      const existing = map.get(row.platform) ?? {
        sessions: 0,
        impressions: 0,
        reach: 0,
        engagement: 0,
        clicks: 0,
      };
      for (const m of PLATFORM_METRICS) {
        existing[m] += (row[m] as number) || 0;
      }
      map.set(row.platform, existing);
    }
    return map;
  }

  const platformCurrent = aggregatePlatform((currentRows ?? []) as MetricRow[]);
  const platformPrevious = aggregatePlatform(
    (previousRows ?? []) as MetricRow[]
  );

  const platformOutliers: PlatformOutlier[] = [];
  for (const [platform, cur] of platformCurrent.entries()) {
    const prev = platformPrevious.get(platform) ?? {};
    for (const metric of PLATFORM_METRICS) {
      const c = cur[metric] || 0;
      const p = prev[metric] || 0;
      if (c < MIN_ABSOLUTE && p < MIN_ABSOLUTE) continue;
      if (p === 0) continue;
      const delta = (c - p) / p;
      const sev = severityFor(Math.abs(delta));
      if (!sev) continue;
      platformOutliers.push({
        kind: "platform",
        platform,
        metric,
        current: c,
        previous: p,
        delta_pct: delta,
        direction: delta > 0 ? "up" : "down",
        severity: sev,
      });
    }
  }

  // --- TAG OUTLIERS ---
  // Fokusert p\u00e5 keyword-tags siden vi har d\u00f8gn-data per s\u00f8keord
  const { data: tags } = await supabase.from("tags").select("*");
  const { data: taggings } = await supabase
    .from("tag_assignments")
    .select("tag_id, entity_key")
    .eq("entity_type", "keyword");

  const tagById = new Map<string, { id: string; name: string; color: string }>();
  for (const t of tags ?? []) {
    tagById.set(t.id, { id: t.id, name: t.name, color: t.color });
  }

  // Bygg lookup: entity_key -> tag_ids
  const keyToTagIds = new Map<string, string[]>();
  for (const a of taggings ?? []) {
    const list = keyToTagIds.get(a.entity_key) ?? [];
    list.push(a.tag_id);
    keyToTagIds.set(a.entity_key, list);
  }

  // Hent s\u00f8keord-data for hele 14-dagers vinduet
  const { data: keywordRows } = await supabase
    .from("search_keywords")
    .select("query, clicks, impressions, metric_date")
    .gte("metric_date", previousFromStr)
    .lte("metric_date", todayStr);

  // Aggreger per tag per vindu
  interface TagTotals {
    current: { clicks: number; impressions: number };
    previous: { clicks: number; impressions: number };
  }
  const tagTotals = new Map<string, TagTotals>();
  for (const row of (keywordRows ?? []) as KeywordRow[]) {
    const key = keywordEntityKey(row.query);
    const tagIds = keyToTagIds.get(key);
    if (!tagIds || tagIds.length === 0) continue;
    const inCurrent = row.metric_date >= currentFromStr;
    for (const tagId of tagIds) {
      const existing = tagTotals.get(tagId) ?? {
        current: { clicks: 0, impressions: 0 },
        previous: { clicks: 0, impressions: 0 },
      };
      if (inCurrent) {
        existing.current.clicks += row.clicks || 0;
        existing.current.impressions += row.impressions || 0;
      } else {
        existing.previous.clicks += row.clicks || 0;
        existing.previous.impressions += row.impressions || 0;
      }
      tagTotals.set(tagId, existing);
    }
  }

  const tagOutliers: TagOutlier[] = [];
  for (const [tagId, totals] of tagTotals.entries()) {
    const tag = tagById.get(tagId);
    if (!tag) continue;
    for (const metric of ["clicks", "impressions"] as const) {
      const c = totals.current[metric];
      const p = totals.previous[metric];
      if (c < MIN_ABSOLUTE && p < MIN_ABSOLUTE) continue;
      if (p === 0) continue;
      const delta = (c - p) / p;
      const sev = severityFor(Math.abs(delta));
      if (!sev) continue;
      tagOutliers.push({
        kind: "tag",
        tag_id: tagId,
        tag_name: tag.name,
        tag_color: tag.color,
        metric,
        current: c,
        previous: p,
        delta_pct: delta,
        direction: delta > 0 ? "up" : "down",
        severity: sev,
      });
    }
  }

  const all: OutlierAny[] = [...platformOutliers, ...tagOutliers];
  all.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "alert" ? -1 : 1;
    return Math.abs(b.delta_pct) - Math.abs(a.delta_pct);
  });

  return NextResponse.json(all);
}
