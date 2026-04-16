import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface PostROI {
  id: number;
  platform: string;
  title: string;
  published_at: string;
  post_type: string | null;
  engagement: { likes: number; comments: number; shares: number; clicks: number };
  traffic_before: number;
  traffic_after: number;
  traffic_lift_pct: number;
  estimated_sessions_driven: number;
  roi_score: "high" | "medium" | "low" | "none";
}

export interface ContentROIResponse {
  posts: PostROI[];
  summary: {
    total_posts: number;
    high_roi_count: number;
    best_post: { title: string; lift_pct: number; platform: string } | null;
    best_day_of_week: string;
    best_platform: string;
  };
}

const DAY_NAMES = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (!from || !to) return NextResponse.json({ error: "Missing from/to" }, { status: 400 });

  try {
    const { data: postsRaw } = await supabase
      .from("platform_posts")
      .select("id, platform, title, published_at, post_type, likes, comments, shares, clicks, impressions, reach")
      .gte("published_at", from)
      .lte("published_at", to)
      .order("published_at", { ascending: false })
      .limit(200);

    const posts = postsRaw ?? [];

    const extFrom = new Date(new Date(from).getTime() - 4 * 86400000).toISOString().slice(0, 10);
    const extTo = new Date(new Date(to).getTime() + 4 * 86400000).toISOString().slice(0, 10);

    const dailySessions = new Map<string, number>();
    const pageSize = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("analytics_metrics")
        .select("metric_date, sessions")
        .eq("platform", "ga4")
        .gte("metric_date", extFrom)
        .lte("metric_date", extTo)
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

    const dayOfWeekLifts = new Map<number, number[]>();
    const platformLifts = new Map<string, number[]>();

    const postROIs: PostROI[] = posts.map((post) => {
      const pubDate = new Date(post.published_at);
      const pubStr = pubDate.toISOString().slice(0, 10);

      let beforeTotal = 0;
      let beforeDays = 0;
      for (let d = 1; d <= 3; d++) {
        const checkDate = new Date(pubDate.getTime() - d * 86400000).toISOString().slice(0, 10);
        const sessions = dailySessions.get(checkDate);
        if (sessions !== undefined) {
          beforeTotal += sessions;
          beforeDays++;
        }
      }

      let afterTotal = 0;
      let afterDays = 0;
      for (let d = 0; d <= 3; d++) {
        const checkDate = new Date(pubDate.getTime() + d * 86400000).toISOString().slice(0, 10);
        const sessions = dailySessions.get(checkDate);
        if (sessions !== undefined) {
          afterTotal += sessions;
          afterDays++;
        }
      }

      const avgBefore = beforeDays > 0 ? beforeTotal / beforeDays : 0;
      const avgAfter = afterDays > 0 ? afterTotal / afterDays : 0;
      const liftPct = avgBefore > 0
        ? Math.round(((avgAfter - avgBefore) / avgBefore) * 1000) / 10
        : 0;
      const sessionsDriven = Math.max(0, Math.round(avgAfter - avgBefore));

      let roiScore: PostROI["roi_score"] = "none";
      if (liftPct >= 20) roiScore = "high";
      else if (liftPct >= 5) roiScore = "medium";
      else if (liftPct > 0) roiScore = "low";

      const dow = pubDate.getDay();
      if (!dayOfWeekLifts.has(dow)) dayOfWeekLifts.set(dow, []);
      dayOfWeekLifts.get(dow)!.push(liftPct);

      const platform = post.platform || "unknown";
      if (!platformLifts.has(platform)) platformLifts.set(platform, []);
      platformLifts.get(platform)!.push(liftPct);

      return {
        id: post.id,
        platform,
        title: post.title || "(uten tittel)",
        published_at: pubStr,
        post_type: post.post_type,
        engagement: {
          likes: Number(post.likes) || 0,
          comments: Number(post.comments) || 0,
          shares: Number(post.shares) || 0,
          clicks: Number(post.clicks) || 0,
        },
        traffic_before: Math.round(avgBefore),
        traffic_after: Math.round(avgAfter),
        traffic_lift_pct: liftPct,
        estimated_sessions_driven: sessionsDriven,
        roi_score: roiScore,
      };
    });

    postROIs.sort((a, b) => b.traffic_lift_pct - a.traffic_lift_pct);

    const highROI = postROIs.filter((p) => p.roi_score === "high");
    const bestPost = postROIs.length > 0 ? postROIs[0] : null;

    let bestDOW = "—";
    let bestDOWAvg = -Infinity;
    for (const [dow, lifts] of dayOfWeekLifts) {
      const avg = lifts.reduce((s, v) => s + v, 0) / lifts.length;
      if (avg > bestDOWAvg) {
        bestDOWAvg = avg;
        bestDOW = DAY_NAMES[dow];
      }
    }

    let bestPlatform = "—";
    let bestPlatAvg = -Infinity;
    const platformLabels: Record<string, string> = { meta: "Meta", mailchimp: "Mailchimp", ga4: "GA4" };
    for (const [plat, lifts] of platformLifts) {
      const avg = lifts.reduce((s, v) => s + v, 0) / lifts.length;
      if (avg > bestPlatAvg) {
        bestPlatAvg = avg;
        bestPlatform = platformLabels[plat] || plat;
      }
    }

    const response: ContentROIResponse = {
      posts: postROIs,
      summary: {
        total_posts: postROIs.length,
        high_roi_count: highROI.length,
        best_post: bestPost
          ? { title: bestPost.title, lift_pct: bestPost.traffic_lift_pct, platform: bestPost.platform }
          : null,
        best_day_of_week: bestDOW,
        best_platform: bestPlatform,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
