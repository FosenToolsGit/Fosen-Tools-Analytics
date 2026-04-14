import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { subDays, formatISO } from "date-fns";

interface MetricRow {
  platform: string;
  metric_date: string;
  sessions: number;
  impressions: number;
  reach: number;
  engagement: number;
  clicks: number;
}

export interface Outlier {
  platform: string;
  metric: "sessions" | "impressions" | "reach" | "engagement" | "clicks";
  current: number;
  previous: number;
  delta_pct: number;
  direction: "up" | "down";
  severity: "info" | "warning" | "alert";
}

const METRICS: Outlier["metric"][] = [
  "sessions",
  "impressions",
  "reach",
  "engagement",
  "clicks",
];

// Terskler: prosent endring som kvalifiserer som outlier
const WARNING_THRESHOLD = 0.3; // 30%
const ALERT_THRESHOLD = 0.6; // 60%

// Minimum absoluttverdi f\u00f8r vi flagger (unng\u00e5r 0 \u2192 1 = 100% spam)
const MIN_ABSOLUTE = 10;

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

  const { data: currentRows, error: err1 } = await supabase
    .from("analytics_metrics")
    .select("*")
    .gte("metric_date", currentFromStr)
    .lte("metric_date", todayStr);
  if (err1) {
    return NextResponse.json({ error: err1.message }, { status: 500 });
  }

  const { data: previousRows, error: err2 } = await supabase
    .from("analytics_metrics")
    .select("*")
    .gte("metric_date", previousFromStr)
    .lte("metric_date", previousToStr);
  if (err2) {
    return NextResponse.json({ error: err2.message }, { status: 500 });
  }

  function aggregate(rows: MetricRow[]): Map<string, Record<string, number>> {
    const map = new Map<string, Record<string, number>>();
    for (const row of rows) {
      const existing = map.get(row.platform) ?? {
        sessions: 0,
        impressions: 0,
        reach: 0,
        engagement: 0,
        clicks: 0,
      };
      for (const m of METRICS) {
        existing[m] += (row[m] as number) || 0;
      }
      map.set(row.platform, existing);
    }
    return map;
  }

  const current = aggregate((currentRows ?? []) as MetricRow[]);
  const previous = aggregate((previousRows ?? []) as MetricRow[]);

  const outliers: Outlier[] = [];
  for (const [platform, currentTotals] of current.entries()) {
    const previousTotals = previous.get(platform) ?? {};
    for (const metric of METRICS) {
      const cur = currentTotals[metric] || 0;
      const prev = previousTotals[metric] || 0;
      if (cur < MIN_ABSOLUTE && prev < MIN_ABSOLUTE) continue;
      if (prev === 0) continue;
      const delta = (cur - prev) / prev;
      const abs = Math.abs(delta);
      if (abs < WARNING_THRESHOLD) continue;

      outliers.push({
        platform,
        metric,
        current: cur,
        previous: prev,
        delta_pct: delta,
        direction: delta > 0 ? "up" : "down",
        severity: abs >= ALERT_THRESHOLD ? "alert" : "warning",
      });
    }
  }

  // Sorter: alerts f\u00f8rst, s\u00e5 etter st\u00f8rste prosent-endring
  outliers.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === "alert" ? -1 : 1;
    }
    return Math.abs(b.delta_pct) - Math.abs(a.delta_pct);
  });

  return NextResponse.json(outliers);
}
