import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export interface SankeyNode {
  name: string;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

export interface FunnelStage {
  name: string;
  value: number;
  dropoff_pct: number | null;
}

export interface ChannelAssistRow {
  channel: string;
  purchase_days_present_pct: number;
  avg_sessions_on_purchase_days: number;
  total_sessions: number;
}

export interface ConversionRateRow {
  channel: string;
  sessions: number;
  conversions: number;
  rate: number;
}

export interface CustomerJourneyResponse {
  period: { from: string; to: string; days: number };
  sankey: { nodes: SankeyNode[]; links: SankeyLink[] };
  funnel: { stages: FunnelStage[] };
  channel_assist: {
    no_purchase_days: boolean;
    purchase_day_count: number;
    matrix: ChannelAssistRow[];
  };
  daily_timeline: {
    dates: Array<{
      date: string;
      channels: Record<string, number>;
      conversions: number;
      email_clicks: number;
    }>;
  };
  kpi: {
    multi_channel_days: number;
    multi_channel_days_pct: number;
    top_first_touch: string;
    avg_channels_per_conversion_day: number;
    total_conversion_days: number;
    conversion_rate_by_channel: ConversionRateRow[];
  };
}

const STAGE_MAP: Record<string, { label: string; order: number }> = {
  add_to_cart: { label: "Handlekurv", order: 1 },
  begin_checkout: { label: "Kassen", order: 2 },
  purchase: { label: "Kjøp", order: 3 },
  form_submit: { label: "Kontaktskjema", order: 4 },
  kontaktoss: { label: "Kontaktskjema", order: 4 },
};

function classifyConversionAction(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.includes("purchase")) return "purchase";
  if (lower.includes("begin_checkout") || lower.includes("checkout"))
    return "begin_checkout";
  if (lower.includes("add_to_cart") || lower.includes("cart"))
    return "add_to_cart";
  if (lower.includes("form_submit") || lower.includes("kontaktoss"))
    return "form_submit";
  return null;
}

async function fetchAllRows<T>(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string,
  columns: string,
  from: string,
  to: string
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .gte("metric_date", from)
      .lte("metric_date", to)
      .range(offset, offset + pageSize - 1);
    if (error) {
      if (/relation .* does not exist/i.test(error.message)) break;
      throw new Error(`${table}: ${error.message}`);
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return rows;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing from/to" },
      { status: 400 }
    );
  }

  try {
    interface SourceRow {
      channel: string;
      source: string;
      medium: string;
      sessions: number;
      conversions: number;
      metric_date: string;
    }
    interface ConvRow {
      campaign_id: string;
      conversion_action_name: string;
      all_conversions: number;
      all_conversions_value: number;
      metric_date: string;
    }
    interface CampRow {
      impressions: number;
      clicks: number;
      cost_nok: number;
      metric_date: string;
    }
    interface MailRow {
      metric_date: string;
      recipient_clicks: number;
    }

    const [sourceRows, convRows, campRows, mailRows] = await Promise.all([
      fetchAllRows<SourceRow>(
        supabase,
        "traffic_sources",
        "channel, source, medium, sessions, conversions, metric_date",
        from,
        to
      ),
      fetchAllRows<ConvRow>(
        supabase,
        "google_ads_conversions",
        "campaign_id, conversion_action_name, all_conversions, all_conversions_value, metric_date",
        from,
        to
      ),
      fetchAllRows<CampRow>(
        supabase,
        "google_ads_campaigns",
        "impressions, clicks, cost_nok, metric_date",
        from,
        to
      ),
      fetchAllRows<MailRow>(
        supabase,
        "mailchimp_list_daily",
        "metric_date, recipient_clicks",
        from,
        to
      ),
    ]);

    // === Aggregate channel totals ===
    const channelTotals = new Map<
      string,
      { sessions: number; conversions: number }
    >();
    const dailyChannels = new Map<string, Map<string, number>>();

    for (const row of sourceRows) {
      const ch = row.channel || "Ukjent";
      const sessions = row.sessions || 0;
      const conversions = Number(row.conversions) || 0;

      const existing = channelTotals.get(ch) ?? {
        sessions: 0,
        conversions: 0,
      };
      existing.sessions += sessions;
      existing.conversions += conversions;
      channelTotals.set(ch, existing);

      if (!dailyChannels.has(row.metric_date)) {
        dailyChannels.set(row.metric_date, new Map());
      }
      const dayMap = dailyChannels.get(row.metric_date)!;
      dayMap.set(ch, (dayMap.get(ch) || 0) + sessions);
    }

    const totalSessions = Array.from(channelTotals.values()).reduce(
      (s, c) => s + c.sessions,
      0
    );

    // === Aggregate conversion stages ===
    const stageAgg = new Map<
      string,
      { total: number; value: number }
    >();
    const dailyConversions = new Map<string, number>();

    for (const row of convRows) {
      const stageKey = classifyConversionAction(row.conversion_action_name);
      if (!stageKey) continue;
      const existing = stageAgg.get(stageKey) ?? { total: 0, value: 0 };
      existing.total += Number(row.all_conversions) || 0;
      existing.value += Number(row.all_conversions_value) || 0;
      stageAgg.set(stageKey, existing);

      if (stageKey === "purchase") {
        const convCount = Number(row.all_conversions) || 0;
        dailyConversions.set(
          row.metric_date,
          (dailyConversions.get(row.metric_date) || 0) + convCount
        );
      }
    }

    // === Campaign totals (funnel top) ===
    let totalImpressions = 0;
    let totalClicks = 0;
    for (const row of campRows) {
      totalImpressions += Number(row.impressions) || 0;
      totalClicks += Number(row.clicks) || 0;
    }

    // === Mailchimp daily ===
    const dailyEmailClicks = new Map<string, number>();
    for (const row of mailRows) {
      dailyEmailClicks.set(
        row.metric_date,
        (dailyEmailClicks.get(row.metric_date) || 0) +
          (Number(row.recipient_clicks) || 0)
      );
    }

    // =====================
    //  SANKEY
    // =====================
    const activeChannels = Array.from(channelTotals.entries())
      .filter(([, v]) => v.sessions > 0)
      .sort((a, b) => b[1].sessions - a[1].sessions);

    const activeStages = Array.from(stageAgg.entries())
      .filter(([, v]) => v.total > 0)
      .sort(
        (a, b) =>
          (STAGE_MAP[a[0]]?.order ?? 99) - (STAGE_MAP[b[0]]?.order ?? 99)
      );

    const sankeyNodes: SankeyNode[] = [
      ...activeChannels.map(([ch]) => ({ name: ch })),
      ...activeStages.map(
        ([key]) => ({ name: STAGE_MAP[key]?.label ?? key })
      ),
    ];

    const sankeyLinks: SankeyLink[] = [];
    if (totalSessions > 0 && activeStages.length > 0) {
      for (let ci = 0; ci < activeChannels.length; ci++) {
        const [, chData] = activeChannels[ci];
        const channelShare = chData.sessions / totalSessions;
        for (let si = 0; si < activeStages.length; si++) {
          const [, stageData] = activeStages[si];
          const linkValue = channelShare * stageData.total;
          if (linkValue >= 0.1) {
            sankeyLinks.push({
              source: ci,
              target: activeChannels.length + si,
              value: Math.round(linkValue * 100) / 100,
            });
          }
        }
      }
    }

    // =====================
    //  FUNNEL
    // =====================
    const funnelStages: FunnelStage[] = [];
    const stageValues: Array<{ name: string; value: number }> = [];

    stageValues.push({ name: "Sesjoner (alle kanaler)", value: totalSessions });
    if (totalImpressions > 0) {
      stageValues.push({
        name: "Google Ads visninger",
        value: totalImpressions,
      });
    }
    if (totalClicks > 0) {
      stageValues.push({ name: "Google Ads klikk", value: totalClicks });
    }

    const funnelOrder = ["add_to_cart", "begin_checkout", "purchase"];
    for (const key of funnelOrder) {
      const stage = stageAgg.get(key);
      if (stage && stage.total > 0) {
        stageValues.push({
          name: STAGE_MAP[key]?.label ?? key,
          value: stage.total,
        });
      }
    }

    for (let i = 0; i < stageValues.length; i++) {
      const prev = i > 0 ? stageValues[i - 1].value : null;
      const drop =
        prev !== null && prev > 0 && stageValues[i].value <= prev
          ? Math.round(((prev - stageValues[i].value) / prev) * 1000) / 10
          : null;
      funnelStages.push({
        name: stageValues[i].name,
        value: stageValues[i].value,
        dropoff_pct: drop,
      });
    }

    // =====================
    //  CHANNEL ASSIST
    // =====================
    const purchaseDays = new Set<string>();
    for (const [date, count] of dailyConversions) {
      if (count > 0) purchaseDays.add(date);
    }

    const purchaseDayCount = purchaseDays.size;
    const channelAssistMatrix: ChannelAssistRow[] = [];

    if (purchaseDayCount > 0) {
      for (const [ch, chData] of channelTotals) {
        let daysPresent = 0;
        let sessionsOnPurchaseDays = 0;
        for (const pDay of purchaseDays) {
          const dayMap = dailyChannels.get(pDay);
          const sessions = dayMap?.get(ch) || 0;
          if (sessions > 0) {
            daysPresent++;
            sessionsOnPurchaseDays += sessions;
          }
        }
        if (daysPresent > 0) {
          channelAssistMatrix.push({
            channel: ch,
            purchase_days_present_pct:
              Math.round((daysPresent / purchaseDayCount) * 1000) / 10,
            avg_sessions_on_purchase_days:
              Math.round((sessionsOnPurchaseDays / daysPresent) * 10) / 10,
            total_sessions: chData.sessions,
          });
        }
      }
      channelAssistMatrix.sort(
        (a, b) => b.purchase_days_present_pct - a.purchase_days_present_pct
      );
    }

    // =====================
    //  DAILY TIMELINE
    // =====================
    const allDates = new Set<string>();
    const allChannelNames = new Set<string>();
    for (const [date, dayMap] of dailyChannels) {
      allDates.add(date);
      for (const ch of dayMap.keys()) allChannelNames.add(ch);
    }
    for (const date of dailyConversions.keys()) allDates.add(date);
    for (const date of dailyEmailClicks.keys()) allDates.add(date);

    const sortedDates = Array.from(allDates).sort();
    const timelineDates = sortedDates.map((date) => {
      const dayMap = dailyChannels.get(date);
      const channels: Record<string, number> = {};
      for (const ch of allChannelNames) {
        channels[ch] = dayMap?.get(ch) || 0;
      }
      return {
        date,
        channels,
        conversions: dailyConversions.get(date) || 0,
        email_clicks: dailyEmailClicks.get(date) || 0,
      };
    });

    // =====================
    //  KPIs
    // =====================
    let multiChannelDays = 0;
    const totalDays = sortedDates.length || 1;

    const conversionDayChannelCounts: number[] = [];
    for (const date of sortedDates) {
      const dayMap = dailyChannels.get(date);
      const activeCount = dayMap
        ? Array.from(dayMap.values()).filter((s) => s > 0).length
        : 0;
      if (activeCount >= 3) multiChannelDays++;
      if (purchaseDays.has(date)) {
        conversionDayChannelCounts.push(activeCount);
      }
    }

    const avgChannelsPerConvDay =
      conversionDayChannelCounts.length > 0
        ? Math.round(
            (conversionDayChannelCounts.reduce((s, c) => s + c, 0) /
              conversionDayChannelCounts.length) *
              10
          ) / 10
        : 0;

    // Top first touch: channel with most sessions on days 1-3 before purchase days
    const channelPrePurchaseSessions = new Map<string, number>();
    for (const pDay of purchaseDays) {
      const pDate = new Date(pDay);
      for (let offset = 1; offset <= 3; offset++) {
        const checkDate = new Date(pDate);
        checkDate.setDate(checkDate.getDate() - offset);
        const checkDateStr = checkDate.toISOString().slice(0, 10);
        const dayMap = dailyChannels.get(checkDateStr);
        if (dayMap) {
          for (const [ch, sessions] of dayMap) {
            channelPrePurchaseSessions.set(
              ch,
              (channelPrePurchaseSessions.get(ch) || 0) + sessions
            );
          }
        }
      }
    }
    let topFirstTouch = "—";
    let maxPreSessions = 0;
    for (const [ch, sessions] of channelPrePurchaseSessions) {
      if (sessions > maxPreSessions) {
        maxPreSessions = sessions;
        topFirstTouch = ch;
      }
    }

    const conversionRateByChannel: ConversionRateRow[] = Array.from(
      channelTotals.entries()
    )
      .filter(([, v]) => v.sessions > 0)
      .map(([ch, v]) => ({
        channel: ch,
        sessions: v.sessions,
        conversions: v.conversions,
        rate:
          v.sessions > 0
            ? Math.round((v.conversions / v.sessions) * 10000) / 100
            : 0,
      }))
      .sort((a, b) => b.rate - a.rate);

    // === Build response ===
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const days = Math.max(
      1,
      Math.round(
        (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)
      )
    );

    const response: CustomerJourneyResponse = {
      period: { from, to, days },
      sankey: { nodes: sankeyNodes, links: sankeyLinks },
      funnel: { stages: funnelStages },
      channel_assist: {
        no_purchase_days: purchaseDayCount === 0,
        purchase_day_count: purchaseDayCount,
        matrix: channelAssistMatrix,
      },
      daily_timeline: { dates: timelineDates },
      kpi: {
        multi_channel_days: multiChannelDays,
        multi_channel_days_pct:
          Math.round((multiChannelDays / totalDays) * 1000) / 10,
        top_first_touch: topFirstTouch,
        avg_channels_per_conversion_day: avgChannelsPerConvDay,
        total_conversion_days: purchaseDayCount,
        conversion_rate_by_channel: conversionRateByChannel,
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
