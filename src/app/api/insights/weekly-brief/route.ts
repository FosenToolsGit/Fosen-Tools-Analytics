import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { GoogleAdsService } from "@/lib/services/google-ads";

type SupaClient = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

/**
 * Auto-generert møtebrief for /mandagsmote/brief.
 *
 * Aggregerer det som faktisk endret seg siste 7 dager pluss reglerbasert
 * "forvent framover"-tekst, og bygger en presentasjons-klar samling av:
 *  - Hovedbudskap (én setning)
 *  - Auto-detekterte endringer (det vi kan se i DB-en)
 *  - Forventninger framover (regler som matches mot tallene)
 *  - Nøkkeltall (uke-i-uke)
 *
 * Brukes som "lim opp foran møtet"-side. Manuelle SEO-/GTM-/strategi-endringer
 * må brukeren legge til selv i presentasjonen siden de skjer utenfor systemet.
 */

const PMAX_CHANNEL_TYPE = "10";
const BRAND_PATTERNS = [/fosen[\s-]?tools?/i, /^fosen$/i, /fosentools/i];
const isBrandTerm = (t: string) => BRAND_PATTERNS.some((p) => p.test(t.toLowerCase().trim()));

export interface WeeklyBriefMetric {
  label: string;
  current: string;
  previous: string;
  delta_pct: number | null;
  good: boolean;
  emphasis?: boolean;
}

export interface WeeklyBriefChange {
  type: "negatives_applied" | "anomaly_resolved" | "new_mailchimp" | "new_meta_post" | "campaign_status";
  text: string;
  detail?: string;
}

export interface WeeklyBriefForecast {
  horizon: string;
  text: string;
}

export interface WeeklyBriefResponse {
  period: { from: string; to: string; prev_from: string; prev_to: string };
  monthly_period: { from: string; to: string; prev_from: string; prev_to: string };
  headline: string;
  key_metrics: WeeklyBriefMetric[];
  monthly_metrics: WeeklyBriefMetric[];
  auto_changes: WeeklyBriefChange[];
  forecast: WeeklyBriefForecast[];
  generated_at: string;
}

function deltaPct(c: number, p: number): number | null {
  if (p === 0 && c === 0) return 0;
  if (p === 0) return null;
  return Math.round(((c - p) / p) * 1000) / 10;
}

const fmtNok = (v: number) =>
  new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)} %`;
const fmtNum = (v: number) => new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(v);

async function gatherAdsTotals(
  supabase: SupaClient,
  from: string,
  to: string
) {
  const [{ data: camps }, { data: convs }] = await Promise.all([
    supabase
      .from("google_ads_campaigns")
      .select("campaign_id, campaign_name, channel_type, status, cost_nok, clicks, impressions")
      .gte("metric_date", from)
      .lte("metric_date", to),
    supabase
      .from("google_ads_conversions")
      .select("campaign_id, conversion_action_name, all_conversions, all_conversions_value")
      .gte("metric_date", from)
      .lte("metric_date", to),
  ]);

  let cost = 0;
  let clicks = 0;
  let impressions = 0;
  const campMeta = new Map<string, { name: string; channel_type: string; status: string }>();
  for (const r of camps ?? []) {
    cost += Number(r.cost_nok) || 0;
    clicks += Number(r.clicks) || 0;
    impressions += Number(r.impressions) || 0;
    campMeta.set(r.campaign_id, {
      name: r.campaign_name,
      channel_type: r.channel_type ?? "",
      status: r.status ?? "",
    });
  }

  let purchases = 0;
  let purchaseValue = 0;
  let leads = 0;
  for (const r of convs ?? []) {
    const name = (r.conversion_action_name as string).toLowerCase();
    if (name.includes("purchase")) {
      purchases += Number(r.all_conversions) || 0;
      purchaseValue += Number(r.all_conversions_value) || 0;
    } else if (name.includes("form_submit") || name.includes("kontakt") || name.includes("begin_checkout")) {
      leads += Number(r.all_conversions) || 0;
    }
  }

  const roas = cost > 0 ? purchaseValue / cost : 0;
  return { cost, clicks, impressions, purchases, purchaseValue, leads, roas, campMeta };
}

async function gatherSessions(
  supabase: SupaClient,
  from: string,
  to: string
): Promise<number> {
  const { data } = await supabase
    .from("analytics_metrics")
    .select("sessions")
    .eq("platform", "ga4")
    .gte("metric_date", from)
    .lte("metric_date", to);
  return (data ?? []).reduce((s, r) => s + (Number(r.sessions) || 0), 0);
}

async function gatherPmaxBrandShare(pmaxIds: string[], from: string, to: string): Promise<number | null> {
  if (pmaxIds.length === 0) return null;
  try {
    const ads = new GoogleAdsService();
    const rows = await ads.fetchPmaxSearchTerms(
      pmaxIds,
      new Date(`${from}T00:00:00Z`),
      new Date(`${to}T00:00:00Z`)
    );
    let brand = 0;
    let total = 0;
    for (const r of rows) {
      total += r.clicks;
      if (isBrandTerm(r.search_term)) brand += r.clicks;
    }
    return total > 0 ? Math.round((brand / total) * 1000) / 10 : 0;
  } catch (err) {
    console.error("gatherPmaxBrandShare failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function gatherChanges(
  supabase: SupaClient,
  from: string,
  to: string
): Promise<WeeklyBriefChange[]> {
  const changes: WeeklyBriefChange[] = [];

  // Auto-applied negative keywords
  const { data: autoActions } = await supabase
    .from("google_ads_auto_actions")
    .select("action_type, status, payload, applied_at")
    .gte("applied_at", `${from}T00:00:00Z`)
    .lte("applied_at", `${to}T23:59:59Z`)
    .eq("status", "applied");

  if (autoActions && autoActions.length > 0) {
    const nKeywords = autoActions.length;
    const sample = autoActions
      .slice(0, 3)
      .map((a) => {
        const payload = (a.payload as Record<string, unknown> | null) ?? {};
        return (payload.keyword_text as string) || (payload.text as string) || "";
      })
      .filter((t) => t.length > 0);
    changes.push({
      type: "negatives_applied",
      text: `${nKeywords} negativ${nKeywords === 1 ? "t søkeord" : "e søkeord"} auto-applied`,
      detail: sample.length > 0 ? `bl.a. ${sample.map((s) => `«${s}»`).join(", ")}` : undefined,
    });
  }

  // Anomalier løst i perioden (resolve setter acknowledged_at — samme kolonne som ack)
  const { data: resolvedAnoms } = await supabase
    .from("analytics_anomalies")
    .select("category, severity, title, acknowledged_at")
    .gte("acknowledged_at", `${from}T00:00:00Z`)
    .lte("acknowledged_at", `${to}T23:59:59Z`)
    .eq("status", "resolved");

  if (resolvedAnoms && resolvedAnoms.length > 0) {
    changes.push({
      type: "anomaly_resolved",
      text: `${resolvedAnoms.length} varsel${resolvedAnoms.length === 1 ? "" : "er"} løst`,
      detail: resolvedAnoms
        .slice(0, 3)
        .map((a) => a.title as string)
        .filter(Boolean)
        .join(" · "),
    });
  }

  // Nye Mailchimp-kampanjer i perioden
  const { data: mcCamps } = await supabase
    .from("platform_posts")
    .select("title, published_at, reach, clicks, raw_data")
    .eq("platform", "mailchimp")
    .gte("published_at", `${from}T00:00:00Z`)
    .lte("published_at", `${to}T23:59:59Z`)
    .order("published_at", { ascending: false });

  for (const c of mcCamps ?? []) {
    const reach = Number(c.reach) || 0;
    const clicks = Number(c.clicks) || 0;
    changes.push({
      type: "new_mailchimp",
      text: `Mailchimp sendt: "${c.title}"`,
      detail: `${fmtNum(reach)} mottakere · ${fmtNum(clicks)} klikk`,
    });
  }

  // Nye Meta-poster med engasjement (terskel: ≥1 like eller share for å filtrere bort tomme sync-rader)
  const { data: metaPosts } = await supabase
    .from("platform_posts")
    .select("title, content_snippet, published_at, reach, likes, comments, shares")
    .eq("platform", "meta")
    .gte("published_at", `${from}T00:00:00Z`)
    .lte("published_at", `${to}T23:59:59Z`)
    .order("reach", { ascending: false });

  // Dedup by content_snippet (FB+IG samme post duplikat)
  const seenSnippets = new Set<string>();
  const dedupedPosts: typeof metaPosts = [];
  for (const p of metaPosts ?? []) {
    const key = ((p.content_snippet as string) || "").slice(0, 80);
    if (key && seenSnippets.has(key)) continue;
    if (key) seenSnippets.add(key);
    dedupedPosts.push(p);
  }
  const topPosts = dedupedPosts.filter((p) => (Number(p.reach) || 0) > 0).slice(0, 3);
  for (const p of topPosts) {
    const eng = (Number(p.likes) || 0) + (Number(p.comments) || 0) + (Number(p.shares) || 0);
    const reach = Number(p.reach) || 0;
    const engRate = reach > 0 ? (eng / reach) * 100 : 0;
    const snippet = ((p.content_snippet as string) || (p.title as string) || "").slice(0, 60);
    changes.push({
      type: "new_meta_post",
      text: `Meta-post: «${snippet}…»`,
      detail: `${fmtNum(reach)} reach · ${eng} eng. (${engRate.toFixed(1)} %)`,
    });
  }

  return changes;
}

function buildForecast(opts: {
  pmaxBrandShareCurr: number | null;
  pmaxBrandSharePrev: number | null;
  bransjerCost14d: number;
  bransjerLeads14d: number;
  bransjerStartObservation: Date;
}): WeeklyBriefForecast[] {
  const forecast: WeeklyBriefForecast[] = [];

  // Pmax re-learning
  if (
    opts.pmaxBrandShareCurr !== null &&
    opts.pmaxBrandSharePrev !== null &&
    opts.pmaxBrandSharePrev - opts.pmaxBrandShareCurr > 10
  ) {
    forecast.push({
      horizon: "2–4 uker",
      text: `Pmax går ut av re-learning og volum forventes å stige igjen. Brand-andel er nå ${opts.pmaxBrandShareCurr.toFixed(1)} %, ned fra ${opts.pmaxBrandSharePrev.toFixed(1)} %.`,
    });
  } else if (opts.pmaxBrandShareCurr !== null && opts.pmaxBrandShareCurr > 30) {
    forecast.push({
      horizon: "Neste uke",
      text: `Pmax brand-andel er fortsatt høy (${opts.pmaxBrandShareCurr.toFixed(1)} %). Verifiser at brand exclusions er aktive på kampanjen.`,
    });
  } else if (opts.pmaxBrandShareCurr !== null && opts.pmaxBrandShareCurr < 15) {
    forecast.push({
      horizon: "Løpende",
      text: `Pmax brand-andel holder seg lav (${opts.pmaxBrandShareCurr.toFixed(1)} %). Følg med at non-brand-konverteringer tar seg opp etter hvert som Google's algoritme re-lærer.`,
    });
  }

  // Bransjer-kampanjen
  const observationDays = Math.floor(
    (Date.now() - opts.bransjerStartObservation.getTime()) / 86400000
  );
  if (opts.bransjerLeads14d === 0 && opts.bransjerCost14d > 0) {
    const daysLeft = Math.max(0, 30 - observationDays);
    if (daysLeft > 0) {
      forecast.push({
        horizon: `Innen ~${daysLeft} dag${daysLeft === 1 ? "" : "er"}`,
        text: `Beslutning på Bransjer-kampanjen (dag ${observationDays} av 30 observasjon). Hvis fortsatt 0 leads/kjøp, pause Våpenskap-broad-match.`,
      });
    } else {
      forecast.push({
        horizon: "Nå",
        text: `Bransjer-kampanjen er forbi 30-dagers observasjon med ${fmtNok(opts.bransjerCost14d)} brukt og 0 leads/kjøp. Pause Våpenskap-broad-match.`,
      });
    }
  }

  // SEO/GTM langsiktig
  forecast.push({
    horizon: "4–8 uker",
    text: "Core Web Vitals i GSC oppdateres med ny feltdata. GTM-besparelsen (80→9 %) bør gi raskere LCP og bedre rangeringer.",
  });

  return forecast;
}

function buildHeadline(opts: {
  cost: number;
  costPrev: number;
  roas: number;
  roasPrev: number;
  purchaseValue: number;
  purchaseValuePrev: number;
  purchases: number;
  purchasesPrev: number;
  pmaxBrandShareCurr: number | null;
  pmaxBrandSharePrev: number | null;
  monthValue: number;
  monthValuePrev: number;
  monthCost: number;
  monthCostPrev: number;
}): string {
  const fragments: string[] = [];

  // Brand exclusions-løft (tydelig fall i brand-andel ≥10pp)
  if (
    opts.pmaxBrandShareCurr !== null &&
    opts.pmaxBrandSharePrev !== null &&
    opts.pmaxBrandSharePrev - opts.pmaxBrandShareCurr > 10
  ) {
    fragments.push(
      `Brand exclusions på Pmax har dratt brand-andelen ned fra ${opts.pmaxBrandSharePrev.toFixed(0)} % til ${opts.pmaxBrandShareCurr.toFixed(1)} %`
    );
  }

  // ROAS-snu fra dårlig til godt
  if (opts.roasPrev < 1 && opts.roas > 5) {
    fragments.push(
      `ekte konverteringsverdi på ${fmtNok(opts.purchaseValue)} (ROAS ${opts.roas.toFixed(1)}x) — opp fra ROAS ${opts.roasPrev.toFixed(1)}x forrige uke`
    );
  } else if (opts.roas > 3 && opts.purchaseValue > opts.purchaseValuePrev) {
    fragments.push(
      `${fmtNok(opts.purchaseValue)} i kjøpsverdi (ROAS ${opts.roas.toFixed(1)}x) på ${fmtNok(opts.cost)} annonsekostnad`
    );
  }

  // Lav-volum-anerkjennelse: hvis < 3 kjøp totalt i begge perioder, kontekstuali­ser med 30d-tall
  // i stedet for å alarmere. Ett kjøp som glir mellom uker er normal variasjon, ikke et issue.
  const lowVolume = opts.purchases <= 2 && opts.purchasesPrev <= 2;
  if (lowVolume && opts.purchaseValue < opts.purchaseValuePrev) {
    const monthRoas = opts.monthCost > 0 ? opts.monthValue / opts.monthCost : 0;
    fragments.push(
      `ukens kjøpsverdi (${fmtNok(opts.purchaseValue)}) er lavere enn forrige uke (${fmtNok(opts.purchaseValuePrev)}) — normal variasjon ved få kjøp; siste 30d viser ${fmtNok(opts.monthValue)} totalt (ROAS ${monthRoas.toFixed(1)}x)`
    );
  }

  // Kostnad-fall (kun hvis ikke maskerer et større fall i konverteringsverdi)
  const costDropped = opts.cost < opts.costPrev * 0.8 && opts.costPrev > 0;
  const valueDroppedMore =
    opts.purchaseValuePrev > 0 && opts.purchaseValue / opts.purchaseValuePrev < opts.cost / opts.costPrev;
  if (costDropped && !valueDroppedMore) {
    const pct = Math.round(((opts.costPrev - opts.cost) / opts.costPrev) * 100);
    fragments.push(`annonsekostnad ned ${pct} % uke-over-uke`);
  }

  if (fragments.length === 0) {
    const monthRoas = opts.monthCost > 0 ? opts.monthValue / opts.monthCost : 0;
    return `Uken oppsummert: ${fmtNok(opts.cost)} annonsekostnad, ${fmtNok(opts.purchaseValue)} kjøpsverdi (ROAS ${opts.roas.toFixed(1)}x). Siste 30d: ${fmtNok(opts.monthValue)} (ROAS ${monthRoas.toFixed(1)}x).`;
  }
  return fragments.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".";
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const cronAuth = auth === `Bearer ${process.env.SYNC_SECRET_KEY}`;

  // Bruk admin-client for cron-tilgang så RLS ikke blokkerer; ellers vanlig
  // user-context-client som RLS godkjenner via authenticated-rolle.
  let supabase: SupaClient;
  if (cronAuth) {
    supabase = createAdminClient();
  } else {
    const userClient = await createClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    supabase = userClient;
  }

  const sp = request.nextUrl.searchParams;

  // Default = forrige hele kalenderuke (mandag-søndag).
  // For mandagsmøte: man 4. mai → vis 27. apr - 3. mai. På tirs/ons/etc samme
  // uke peker vi fortsatt til samme forrige uke (man-søn) til neste mandag.
  // Glidende 7d-vindu er ubrukelig her fordi enkeltkjøp tipper ut/inn.
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = søndag, 1 = mandag, ..., 6 = lørdag
  const daysSinceLastSunday = dayOfWeek === 0 ? 0 : dayOfWeek;
  const defaultTo = new Date(now);
  defaultTo.setUTCDate(now.getUTCDate() - daysSinceLastSunday);
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setUTCDate(defaultTo.getUTCDate() - 6);

  const to = sp.get("to") ?? defaultTo.toISOString().slice(0, 10);
  const from = sp.get("from") ?? defaultFrom.toISOString().slice(0, 10);
  const prevTo = new Date(new Date(from).getTime() - 86400000).toISOString().slice(0, 10);
  const prevFrom = new Date(new Date(prevTo).getTime() - 6 * 86400000).toISOString().slice(0, 10);
  const fourteenAgo = new Date(new Date(to).getTime() - 13 * 86400000).toISOString().slice(0, 10);

  // 30d-sammenligning: siste 30 dager (basert på samme `to`) vs 30 dagene før
  const month1To = to;
  const month1From = new Date(new Date(to).getTime() - 29 * 86400000).toISOString().slice(0, 10);
  const month0To = new Date(new Date(month1From).getTime() - 86400000).toISOString().slice(0, 10);
  const month0From = new Date(new Date(month0To).getTime() - 29 * 86400000).toISOString().slice(0, 10);

  try {
    const [
      currTotals,
      prevTotals,
      currSessions,
      prevSessions,
      bransjer14dTotals,
      changes,
      month1Totals,
      month0Totals,
      month1Sessions,
      month0Sessions,
    ] = await Promise.all([
      gatherAdsTotals(supabase, from, to),
      gatherAdsTotals(supabase, prevFrom, prevTo),
      gatherSessions(supabase, from, to),
      gatherSessions(supabase, prevFrom, prevTo),
      gatherAdsTotals(supabase, fourteenAgo, to),
      gatherChanges(supabase, from, to),
      gatherAdsTotals(supabase, month1From, month1To),
      gatherAdsTotals(supabase, month0From, month0To),
      gatherSessions(supabase, month1From, month1To),
      gatherSessions(supabase, month0From, month0To),
    ]);

    const pmaxIds = [...currTotals.campMeta]
      .filter(([, m]) => m.channel_type === PMAX_CHANNEL_TYPE)
      .map(([id]) => id);
    const [pmaxBrandShareCurr, pmaxBrandSharePrev] = await Promise.all([
      gatherPmaxBrandShare(pmaxIds, from, to),
      gatherPmaxBrandShare(pmaxIds, prevFrom, prevTo),
    ]);

    // Bransjer-kampanjen 14d
    let bransjerCost14d = 0;
    let bransjerLeads14d = 0;
    {
      const { data: bcamps } = await supabase
        .from("google_ads_campaigns")
        .select("campaign_id, campaign_name, cost_nok")
        .gte("metric_date", fourteenAgo)
        .lte("metric_date", to)
        .ilike("campaign_name", "%bransje%");
      for (const r of bcamps ?? []) bransjerCost14d += Number(r.cost_nok) || 0;
      const bIds = new Set((bcamps ?? []).map((r) => r.campaign_id));
      const { data: bconvs } = await supabase
        .from("google_ads_conversions")
        .select("campaign_id, conversion_action_name, all_conversions")
        .gte("metric_date", fourteenAgo)
        .lte("metric_date", to)
        .in("campaign_id", [...bIds]);
      for (const r of bconvs ?? []) {
        const name = (r.conversion_action_name as string).toLowerCase();
        if (name.includes("purchase") || name.includes("form_submit") || name.includes("kontakt")) {
          bransjerLeads14d += Number(r.all_conversions) || 0;
        }
      }
      void bransjer14dTotals; // utility var, retained for future use
    }

    // Mailchimp siste sendt + snitt 10 forrige
    const { data: mcRows } = await supabase
      .from("platform_posts")
      .select("title, published_at, reach, clicks")
      .eq("platform", "mailchimp")
      .order("published_at", { ascending: false })
      .limit(11);
    let mcCurrentReach: number | null = null;
    let mcAvgReach: number | null = null;
    let mcCurrentClicks: number | null = null;
    let mcAvgClicks: number | null = null;
    if (mcRows && mcRows.length > 0) {
      mcCurrentReach = Number(mcRows[0].reach) || 0;
      mcCurrentClicks = Number(mcRows[0].clicks) || 0;
      const tail = mcRows.slice(1, 11);
      if (tail.length > 0) {
        mcAvgReach = Math.round(tail.reduce((s, r) => s + (Number(r.reach) || 0), 0) / tail.length);
        mcAvgClicks = Math.round(tail.reduce((s, r) => s + (Number(r.clicks) || 0), 0) / tail.length);
      }
    }

    const cost = currTotals.cost;
    const costPrev = prevTotals.cost;
    const roas = currTotals.roas;
    const roasPrev = prevTotals.roas;

    const key_metrics: WeeklyBriefMetric[] = [
      {
        label: "Annonsekostnad",
        current: fmtNok(cost),
        previous: fmtNok(costPrev),
        delta_pct: deltaPct(cost, costPrev),
        good: cost < costPrev,
        emphasis: true,
      },
      {
        label: "Ekte ROAS",
        current: `${roas.toFixed(2)}x`,
        previous: `${roasPrev.toFixed(2)}x`,
        delta_pct: roasPrev > 0 ? deltaPct(roas, roasPrev) : null,
        good: roas > roasPrev,
        emphasis: true,
      },
      {
        label: "Kjøpsverdi",
        current: fmtNok(currTotals.purchaseValue),
        previous: fmtNok(prevTotals.purchaseValue),
        delta_pct: deltaPct(currTotals.purchaseValue, prevTotals.purchaseValue),
        good: currTotals.purchaseValue > prevTotals.purchaseValue,
        emphasis: true,
      },
      ...(pmaxBrandShareCurr !== null && pmaxBrandSharePrev !== null
        ? [
            {
              label: "Pmax brand-andel",
              current: fmtPct(pmaxBrandShareCurr),
              previous: fmtPct(pmaxBrandSharePrev),
              delta_pct: Math.round((pmaxBrandShareCurr - pmaxBrandSharePrev) * 10) / 10,
              good: pmaxBrandShareCurr < pmaxBrandSharePrev,
              emphasis: true,
            } as WeeklyBriefMetric,
          ]
        : []),
      {
        label: "GA4 sesjoner",
        current: fmtNum(currSessions),
        previous: fmtNum(prevSessions),
        delta_pct: deltaPct(currSessions, prevSessions),
        good: currSessions >= prevSessions,
      },
      ...(mcCurrentReach !== null
        ? [
            {
              label: "Mailchimp siste reach",
              current: fmtNum(mcCurrentReach),
              previous: mcAvgReach !== null ? `snitt ${fmtNum(mcAvgReach)}` : "—",
              delta_pct: mcAvgReach !== null && mcAvgReach > 0 ? deltaPct(mcCurrentReach, mcAvgReach) : null,
              good: mcAvgReach !== null ? mcCurrentReach >= mcAvgReach : true,
            } as WeeklyBriefMetric,
            {
              label: "Mailchimp siste klikk",
              current: fmtNum(mcCurrentClicks ?? 0),
              previous: mcAvgClicks !== null ? `snitt ${fmtNum(mcAvgClicks)}` : "—",
              delta_pct: mcAvgClicks !== null && mcAvgClicks > 0 ? deltaPct(mcCurrentClicks ?? 0, mcAvgClicks) : null,
              good: mcAvgClicks !== null ? (mcCurrentClicks ?? 0) >= mcAvgClicks : true,
            } as WeeklyBriefMetric,
          ]
        : []),
    ];

    // Bransjer-observasjon: bruk 20. april som start (når siste brand exclusion ble slått på)
    const bransjerStartObservation = new Date("2026-04-20T00:00:00Z");

    const forecast = buildForecast({
      pmaxBrandShareCurr,
      pmaxBrandSharePrev,
      bransjerCost14d,
      bransjerLeads14d,
      bransjerStartObservation,
    });

    const headline = buildHeadline({
      cost,
      costPrev,
      roas,
      roasPrev,
      purchaseValue: currTotals.purchaseValue,
      purchaseValuePrev: prevTotals.purchaseValue,
      purchases: currTotals.purchases,
      purchasesPrev: prevTotals.purchases,
      pmaxBrandShareCurr,
      pmaxBrandSharePrev,
      monthValue: month1Totals.purchaseValue,
      monthValuePrev: month0Totals.purchaseValue,
      monthCost: month1Totals.cost,
      monthCostPrev: month0Totals.cost,
    });

    // Bygg 30d-metrics-blokk
    const monthRoas = month1Totals.cost > 0 ? month1Totals.purchaseValue / month1Totals.cost : 0;
    const monthRoasPrev = month0Totals.cost > 0 ? month0Totals.purchaseValue / month0Totals.cost : 0;
    const monthly_metrics: WeeklyBriefMetric[] = [
      {
        label: "Annonsekostnad",
        current: fmtNok(month1Totals.cost),
        previous: fmtNok(month0Totals.cost),
        delta_pct: deltaPct(month1Totals.cost, month0Totals.cost),
        good: month1Totals.cost < month0Totals.cost,
        emphasis: true,
      },
      {
        label: "Ekte ROAS",
        current: `${monthRoas.toFixed(2)}x`,
        previous: `${monthRoasPrev.toFixed(2)}x`,
        delta_pct: monthRoasPrev > 0 ? deltaPct(monthRoas, monthRoasPrev) : null,
        good: monthRoas > monthRoasPrev,
        emphasis: true,
      },
      {
        label: "Kjøpsverdi",
        current: fmtNok(month1Totals.purchaseValue),
        previous: fmtNok(month0Totals.purchaseValue),
        delta_pct: deltaPct(month1Totals.purchaseValue, month0Totals.purchaseValue),
        good: month1Totals.purchaseValue > month0Totals.purchaseValue,
        emphasis: true,
      },
      {
        label: "Antall kjøp",
        current: month1Totals.purchases.toFixed(1),
        previous: month0Totals.purchases.toFixed(1),
        delta_pct: deltaPct(month1Totals.purchases, month0Totals.purchases),
        good: month1Totals.purchases >= month0Totals.purchases,
      },
      {
        label: "Antall leads",
        current: month1Totals.leads.toFixed(1),
        previous: month0Totals.leads.toFixed(1),
        delta_pct: deltaPct(month1Totals.leads, month0Totals.leads),
        good: month1Totals.leads >= month0Totals.leads,
      },
      {
        label: "GA4 sesjoner",
        current: fmtNum(month1Sessions),
        previous: fmtNum(month0Sessions),
        delta_pct: deltaPct(month1Sessions, month0Sessions),
        good: month1Sessions >= month0Sessions,
      },
    ];

    const res: WeeklyBriefResponse = {
      period: { from, to, prev_from: prevFrom, prev_to: prevTo },
      monthly_period: { from: month1From, to: month1To, prev_from: month0From, prev_to: month0To },
      headline,
      key_metrics,
      monthly_metrics,
      auto_changes: changes,
      forecast,
      generated_at: new Date().toISOString(),
    };
    return NextResponse.json(res);
  } catch (err) {
    console.error("weekly-brief failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
