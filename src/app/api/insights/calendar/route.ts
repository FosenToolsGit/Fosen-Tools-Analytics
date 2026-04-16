import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface CalendarEvent {
  id: string;
  type: "post" | "anomaly" | "auto_action" | "sync";
  platform: string | null;
  title: string;
  description: string | null;
  timestamp: string;
  severity: "info" | "warning" | "critical" | null;
  metadata: Record<string, unknown>;
}

export interface CalendarResponse {
  events: CalendarEvent[];
  daily_sessions: Array<{ date: string; sessions: number }>;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (!from || !to) return NextResponse.json({ error: "Missing from/to" }, { status: 400 });

  try {
    const events: CalendarEvent[] = [];

    // 1. Posts
    const { data: posts } = await supabase
      .from("platform_posts")
      .select("id, platform, title, published_at, post_type, impressions, clicks")
      .gte("published_at", from)
      .lte("published_at", to + "T23:59:59")
      .order("published_at", { ascending: false })
      .limit(200);

    for (const p of posts ?? []) {
      events.push({
        id: `post-${p.id}`,
        type: "post",
        platform: p.platform,
        title: p.title || `${p.platform} ${p.post_type || "post"}`,
        description: p.impressions ? `${p.impressions} visninger, ${p.clicks || 0} klikk` : null,
        timestamp: p.published_at,
        severity: null,
        metadata: { impressions: p.impressions, clicks: p.clicks, post_type: p.post_type },
      });
    }

    // 2. Anomalies
    const { data: anomalies } = await supabase
      .from("analytics_anomalies")
      .select("id, title, description, severity, category, status, detected_at")
      .gte("detected_at", from)
      .lte("detected_at", to + "T23:59:59")
      .order("detected_at", { ascending: false })
      .limit(100);

    for (const a of anomalies ?? []) {
      events.push({
        id: `anomaly-${a.id}`,
        type: "anomaly",
        platform: null,
        title: a.title,
        description: a.description,
        timestamp: a.detected_at,
        severity: a.severity,
        metadata: { category: a.category, status: a.status },
      });
    }

    // 3. Auto actions
    const { data: actions } = await supabase
      .from("google_ads_auto_actions")
      .select("id, action_type, target_resource, status, applied_at, payload")
      .gte("applied_at", from)
      .lte("applied_at", to + "T23:59:59")
      .order("applied_at", { ascending: false })
      .limit(50);

    for (const a of actions ?? []) {
      const payload = (a.payload || {}) as Record<string, unknown>;
      events.push({
        id: `action-${a.id}`,
        type: "auto_action",
        platform: "google_ads",
        title: `Auto: ${a.action_type}`,
        description: a.target_resource,
        timestamp: a.applied_at,
        severity: null,
        metadata: { status: a.status, ...payload },
      });
    }

    // 4. Syncs
    const { data: syncs } = await supabase
      .from("sync_logs")
      .select("id, platform, status, records_synced, started_at, finished_at, error_message")
      .gte("started_at", from)
      .lte("started_at", to + "T23:59:59")
      .eq("status", "success")
      .order("started_at", { ascending: false })
      .limit(100);

    for (const s of syncs ?? []) {
      events.push({
        id: `sync-${s.id}`,
        type: "sync",
        platform: s.platform,
        title: `Sync: ${s.platform}`,
        description: s.records_synced ? `${s.records_synced} rader synkronisert` : null,
        timestamp: s.started_at,
        severity: null,
        metadata: { records: s.records_synced, duration_ms: s.finished_at && s.started_at
          ? new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()
          : null },
      });
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // 5. Daily sessions for background
    const dailySessions = new Map<string, number>();
    const pageSize = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("analytics_metrics")
        .select("metric_date, sessions")
        .eq("platform", "ga4")
        .gte("metric_date", from)
        .lte("metric_date", to)
        .range(offset, offset + pageSize - 1);
      if (error || !data || data.length === 0) break;
      for (const row of data) {
        dailySessions.set(
          row.metric_date,
          (dailySessions.get(row.metric_date) || 0) + (Number(row.sessions) || 0)
        );
      }
      if (data.length < pageSize) break;
      offset += pageSize;
    }

    const daily_sessions = Array.from(dailySessions.entries())
      .map(([date, sessions]) => ({ date, sessions }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const response: CalendarResponse = { events, daily_sessions };
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
