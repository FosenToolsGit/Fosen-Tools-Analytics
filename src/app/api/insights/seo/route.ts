import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

type Category = "quick_win" | "almost_page_one" | "low_ctr" | "declining" | "rising";

interface Opportunity {
  query: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
  expected_ctr: number;
  ctr_gap: number;
  position_change: number;
  category: Category;
  priority: "high" | "medium" | "low";
  suggestion: string;
}

export interface SEOResponse {
  summary: {
    total_keywords: number;
    quick_wins: number;
    almost_page_one: number;
    low_ctr: number;
    declining: number;
    rising: number;
    avg_position: number;
    total_clicks: number;
    total_impressions: number;
  };
  opportunities: Opportunity[];
  position_distribution: Array<{ group: string; count: number }>;
}

function expectedCTR(pos: number): number {
  if (pos <= 1) return 0.3;
  if (pos <= 2) return 0.15;
  if (pos <= 3) return 0.1;
  if (pos <= 4) return 0.07;
  if (pos <= 5) return 0.05;
  if (pos <= 7) return 0.03;
  if (pos <= 10) return 0.02;
  return 0.01;
}

interface KWAgg {
  clicks: number;
  impressions: number;
  positionSum: number;
  count: number;
}

async function fetchKeywords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  to: string
): Promise<Map<string, KWAgg>> {
  const map = new Map<string, KWAgg>();
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("search_keywords")
      .select("query, clicks, impressions, position")
      .gte("metric_date", from)
      .lte("metric_date", to)
      .range(offset, offset + pageSize - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data) {
      const q = (row.query || "").trim().toLowerCase();
      if (!q) continue;
      const ex = map.get(q) ?? { clicks: 0, impressions: 0, positionSum: 0, count: 0 };
      ex.clicks += Number(row.clicks) || 0;
      ex.impressions += Number(row.impressions) || 0;
      ex.positionSum += (Number(row.position) || 50) * (Number(row.impressions) || 1);
      ex.count += Number(row.impressions) || 1;
      map.set(q, ex);
    }
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return map;
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
    const days = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
    const prevTo = new Date(new Date(from).getTime() - 86400000).toISOString().slice(0, 10);
    const prevFrom = new Date(new Date(from).getTime() - days * 86400000).toISOString().slice(0, 10);

    const [current, previous] = await Promise.all([
      fetchKeywords(supabase, from, to),
      fetchKeywords(supabase, prevFrom, prevTo),
    ]);

    const opportunities: Opportunity[] = [];
    let totalClicks = 0;
    let totalImpressions = 0;
    let positionWeightedSum = 0;
    let positionWeightCount = 0;

    const posGroups = { "1-3": 0, "4-10": 0, "11-20": 0, "21-50": 0, "50+": 0 };

    for (const [query, cur] of current) {
      const pos = cur.count > 0 ? cur.positionSum / cur.count : 50;
      const ctr = cur.impressions > 0 ? cur.clicks / cur.impressions : 0;
      const expCtr = expectedCTR(pos);
      const prev = previous.get(query);
      const prevPos = prev && prev.count > 0 ? prev.positionSum / prev.count : null;
      const posChange = prevPos !== null ? pos - prevPos : 0;

      totalClicks += cur.clicks;
      totalImpressions += cur.impressions;
      positionWeightedSum += pos * cur.impressions;
      positionWeightCount += cur.impressions;

      if (pos <= 3) posGroups["1-3"]++;
      else if (pos <= 10) posGroups["4-10"]++;
      else if (pos <= 20) posGroups["11-20"]++;
      else if (pos <= 50) posGroups["21-50"]++;
      else posGroups["50+"]++;

      let category: Category | null = null;
      let priority: "high" | "medium" | "low" = "low";
      let suggestion = "";

      if (pos >= 8 && pos <= 20 && cur.impressions >= 100 && cur.clicks > 0) {
        category = "quick_win";
        priority = "high";
        suggestion = `Posisjon ${pos.toFixed(1)} med ${cur.impressions} visninger — optimaliser innhold for å nå topp 5`;
      } else if (pos >= 5 && pos <= 15 && cur.impressions >= 50) {
        category = "almost_page_one";
        priority = pos <= 10 ? "high" : "medium";
        suggestion = `Nesten side 1 (pos ${pos.toFixed(1)}) — forbedre title tag og meta description`;
      } else if (pos <= 5 && ctr < expCtr * 0.7 && cur.impressions >= 30) {
        category = "low_ctr";
        priority = "high";
        suggestion = `CTR ${(ctr * 100).toFixed(1)}% vs forventet ${(expCtr * 100).toFixed(0)}% — skriv bedre title/description`;
      } else if (posChange > 2 && prevPos !== null && cur.impressions >= 20) {
        category = "declining";
        priority = posChange > 5 ? "high" : "medium";
        suggestion = `Falt ${posChange.toFixed(1)} plasser — sjekk om innholdet trenger oppdatering`;
      } else if (posChange < -2 && prevPos !== null && cur.impressions >= 20) {
        category = "rising";
        priority = "low";
        suggestion = `Steget ${Math.abs(posChange).toFixed(1)} plasser — bygg videre med relatert innhold`;
      }

      if (category) {
        opportunities.push({
          query,
          position: Math.round(pos * 10) / 10,
          clicks: cur.clicks,
          impressions: cur.impressions,
          ctr: Math.round(ctr * 10000) / 100,
          expected_ctr: Math.round(expCtr * 10000) / 100,
          ctr_gap: Math.round((ctr - expCtr) * 10000) / 100,
          position_change: Math.round(posChange * 10) / 10,
          category,
          priority,
          suggestion,
        });
      }
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    opportunities.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || b.impressions - a.impressions);

    const summary = {
      total_keywords: current.size,
      quick_wins: opportunities.filter((o) => o.category === "quick_win").length,
      almost_page_one: opportunities.filter((o) => o.category === "almost_page_one").length,
      low_ctr: opportunities.filter((o) => o.category === "low_ctr").length,
      declining: opportunities.filter((o) => o.category === "declining").length,
      rising: opportunities.filter((o) => o.category === "rising").length,
      avg_position: positionWeightCount > 0 ? Math.round((positionWeightedSum / positionWeightCount) * 10) / 10 : 0,
      total_clicks: totalClicks,
      total_impressions: totalImpressions,
    };

    const position_distribution = Object.entries(posGroups).map(([group, count]) => ({ group, count }));

    const response: SEOResponse = { summary, opportunities, position_distribution };
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
