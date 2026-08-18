/**
 * Anomali-deteksjon — kjøres etter hver sync og oppdager:
 * 1. Plattform-nivå spikes/drops (7d vs forrige 7d)
 * 2. Google Ads kostnad-spikes per kampanje
 * 3. Google Ads ROAS-fall per kampanje
 * 4. Konverterings-stopp (48t uten tracket purchase/lead)
 * 5. Nye konkurrent-brands dukker opp i Pmax/search terms
 * 6. SEO-posisjonsfall (GSC: 7d vs forrige 7d, med 3 dagers datalag)
 *
 * Resultater lagres i analytics_anomalies med dedup-logikk (samme kategori
 * + target innen 24 timer oppdaterer eksisterende aktive rad i stedet for
 * å lage ny).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { subDays } from "date-fns";
import {
  getCompetitorRules,
  makeCompetitorMatcher,
} from "@/lib/services/keyword-report";

export type AnomalySeverity = "info" | "warning" | "critical";

export interface AnomalyCandidate {
  category: string;
  severity: AnomalySeverity;
  title: string;
  description: string;
  metric_context: Record<string, unknown>;
  suggested_action?: string;
  target_type: "platform" | "campaign" | "search_term" | "global";
  target_id: string;
}

const MIN_COST_NOK = 500; // Ignorer kampanjer som bruker mindre enn dette
const COST_SPIKE_THRESHOLD = 1.8; // 80% økning regnes som spike
const ROAS_DROP_THRESHOLD = 0.5; // ROAS ned til 50% av forrige
const ROAS_HEALTHY_MIN = 2.0; // Før-perioden må ha vært minst 2x for å regnes som fall
const CONVERSION_STOP_HOURS = 48;
// Minst så mange konverteringer i forrige 5-dagers periode før 0 på 48t regnes
// som stopp. Ved 8 på 5 dager er forventet ~3,2 på 48t og P(0) < 5 % — under
// det er null konverteringer ren tilfeldighet, ikke et signal. Den gamle
// terskelen på 3 ga daglige falske «ingen leads»-varsler for småkampanjer.
const CONVERSION_STOP_MIN_PREV = 8;

// Sjekk 6 — SEO-posisjonsfall. GSC-data har ~3 dagers etterslep, så vinduene
// forskyves. Terskler kalibrert mot Gedore-fallet 17. aug (pos 5,5 → 11,8 på
// 21 visninger/uke): minst 20 visninger i før-perioden, fall på minst 3
// plasser. Repeterte varsler for samme søkeord dempes i 7 dager.
const SEO_DROP_MIN_IMPRESSIONS = 20;
const SEO_DROP_MIN_POSITIONS = 3;
const SEO_DROP_LAG_DAYS = 3;
const SEO_DROP_MAX_ALERTS = 5;
const SEO_DROP_MUTE_DAYS = 7;

/**
 * Supabase REST returnerer maks 1000 rader per kall. Sjekkene som leser
 * search terms trenger langt flere — uten paginering blir «tidligere
 * sett»-mengden stille avkortet, og gamle termer feilklassifiseres som nye
 * (det ga daglige gjentaks-varsler for samme konkurrent-term).
 */
async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  applyFilters: (q: ReturnType<SupabaseClient["from"]>["select"] extends never ? never : any) => any
): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await applyFilters(
      supabase.from(table).select(select)
    ).range(from, from + PAGE - 1);
    if (error || !data?.length) break;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return out;
}

function dateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/**
 * Sjekk 1: Plattform-nivå spikes/drops. Bruker samme 7d-vs-7d som outliers-card,
 * men genererer anomali-kandidater i stedet for å returnere rå outlier-rader.
 */
async function detectPlatformAnomalies(
  supabase: SupabaseClient
): Promise<AnomalyCandidate[]> {
  const today = new Date();
  const last7Start = subDays(today, 7);
  const prev7Start = subDays(today, 14);
  const prev7End = subDays(today, 7);

  const { data: recent } = await supabase
    .from("analytics_metrics")
    .select("platform, metric_date, impressions, reach, engagement, clicks, sessions")
    .gte("metric_date", dateStr(last7Start))
    .lte("metric_date", dateStr(today));

  const { data: previous } = await supabase
    .from("analytics_metrics")
    .select("platform, metric_date, impressions, reach, engagement, clicks, sessions")
    .gte("metric_date", dateStr(prev7Start))
    .lt("metric_date", dateStr(prev7End));

  interface Totals {
    clicks: number;
    engagement: number;
    reach: number;
    sessions: number;
  }

  const recentTotals = new Map<string, Totals>();
  const previousTotals = new Map<string, Totals>();

  const accumulate = (
    target: Map<string, Totals>,
    rows: typeof recent
  ) => {
    for (const r of rows ?? []) {
      const ex = target.get(r.platform) ?? {
        clicks: 0,
        engagement: 0,
        reach: 0,
        sessions: 0,
      };
      ex.clicks += r.clicks ?? 0;
      ex.engagement += r.engagement ?? 0;
      ex.reach += r.reach ?? 0;
      ex.sessions += r.sessions ?? 0;
      target.set(r.platform, ex);
    }
  };
  accumulate(recentTotals, recent);
  accumulate(previousTotals, previous);

  const anomalies: AnomalyCandidate[] = [];
  const metrics: (keyof Totals)[] = ["clicks", "engagement", "reach", "sessions"];
  const labels: Record<string, string> = {
    clicks: "klikk",
    engagement: "engasjement",
    reach: "rekkevidde",
    sessions: "sesjoner",
  };

  for (const [platform, curr] of recentTotals) {
    const prev = previousTotals.get(platform);
    if (!prev) continue;
    for (const metric of metrics) {
      const currVal = curr[metric];
      const prevVal = prev[metric];
      // Trenger minimum volum for å unngå støy fra små svingninger
      if (prevVal < 100 && currVal < 100) continue;
      if (prevVal === 0) continue;
      const delta = (currVal - prevVal) / prevVal;
      if (Math.abs(delta) < 0.5) continue; // Under 50% er ikke interessant

      // Nedganger er warnings/critical, oppganger er info (mulighet, ikke alarm)
      let severity: AnomalySeverity;
      if (delta < 0) {
        severity = Math.abs(delta) >= 1.0 ? "critical" : "warning";
      } else {
        severity = "info";
      }
      const direction = delta > 0 ? "økt" : "falt";
      const pct = Math.abs(delta * 100).toFixed(0);

      anomalies.push({
        category: `platform_${metric}`,
        severity,
        title: `${platform.toUpperCase()}: ${labels[metric]} ${direction} ${pct}%`,
        description: `${labels[metric]} på ${platform} har ${direction} fra ${prevVal.toLocaleString("nb-NO")} til ${currVal.toLocaleString("nb-NO")} sammenlignet med forrige 7-dagers periode.`,
        metric_context: {
          platform,
          metric,
          current: currVal,
          previous: prevVal,
          delta_pct: delta * 100,
        },
        suggested_action:
          delta < 0
            ? "Sjekk om sporing virker, eller om kampanje-innhold er endret."
            : "Hva har forandret seg? Ny kampanje, post eller sesong-effekt?",
        target_type: "platform",
        target_id: `${platform}:${metric}`,
      });
    }
  }

  return anomalies;
}

/**
 * Sjekk 2: Google Ads kostnad-spikes per kampanje.
 * Sammenligner siste 3 dager vs. 11 dagene før (helg-nøytralt).
 */
async function detectCostSpikes(
  supabase: SupabaseClient
): Promise<AnomalyCandidate[]> {
  const today = new Date();
  const last3Start = subDays(today, 3);
  const prev11Start = subDays(today, 14);
  const prev11End = subDays(today, 3);

  const { data } = await supabase
    .from("google_ads_campaigns")
    .select("campaign_id, campaign_name, metric_date, cost_nok")
    .gte("metric_date", dateStr(prev11Start))
    .lte("metric_date", dateStr(today));

  interface CampTotal {
    name: string;
    recent: number;
    prev: number;
  }
  const totals = new Map<string, CampTotal>();
  for (const r of data ?? []) {
    const ex = totals.get(r.campaign_id) ?? {
      name: r.campaign_name,
      recent: 0,
      prev: 0,
    };
    const cost = Number(r.cost_nok) || 0;
    if (r.metric_date >= dateStr(last3Start)) {
      ex.recent += cost;
    } else {
      ex.prev += cost;
    }
    totals.set(r.campaign_id, ex);
  }

  const anomalies: AnomalyCandidate[] = [];
  for (const [id, t] of totals) {
    // Normaliser til dags-rate (3 dager vs 11 dager)
    const recentDaily = t.recent / 3;
    const prevDaily = t.prev / 11;
    if (prevDaily < MIN_COST_NOK / 11) continue;
    if (recentDaily < MIN_COST_NOK / 11) continue;
    const ratio = recentDaily / prevDaily;
    if (ratio >= COST_SPIKE_THRESHOLD) {
      const severity: AnomalySeverity = ratio >= 3 ? "critical" : "warning";
      anomalies.push({
        category: "google_ads_cost_spike",
        severity,
        title: `${t.name}: kostnad ${((ratio - 1) * 100).toFixed(0)}% høyere enn normalt`,
        description: `Daglig kostnad har gått fra ${prevDaily.toFixed(0)} NOK/dag til ${recentDaily.toFixed(0)} NOK/dag de siste 3 dagene.`,
        metric_context: {
          campaign_id: id,
          campaign_name: t.name,
          recent_daily: recentDaily,
          previous_daily: prevDaily,
          ratio,
        },
        suggested_action:
          "Sjekk om bud, budsjett eller målretting er endret. Se om trafikken gir konverteringer eller er spill.",
        target_type: "campaign",
        target_id: id,
      });
    }
  }

  return anomalies;
}

/**
 * Sjekk 3: ROAS-fall per kampanje (basert på all_conversions_value / kostnad).
 */
async function detectRoasDrops(
  supabase: SupabaseClient
): Promise<AnomalyCandidate[]> {
  const today = new Date();
  const last7Start = subDays(today, 7);
  const prev7Start = subDays(today, 14);
  const prev7End = subDays(today, 7);

  // Hent kostnad per kampanje for begge perioder
  const { data: costs } = await supabase
    .from("google_ads_campaigns")
    .select("campaign_id, campaign_name, metric_date, cost_nok")
    .gte("metric_date", dateStr(prev7Start))
    .lte("metric_date", dateStr(today));

  // Hent purchase-verdier per kampanje for begge perioder
  const { data: convs } = await supabase
    .from("google_ads_conversions")
    .select("campaign_id, conversion_action_name, metric_date, all_conversions_value")
    .gte("metric_date", dateStr(prev7Start))
    .lte("metric_date", dateStr(today));

  interface CampPeriod {
    name: string;
    recentCost: number;
    prevCost: number;
    recentValue: number;
    prevValue: number;
  }
  const camps = new Map<string, CampPeriod>();
  for (const r of costs ?? []) {
    const ex = camps.get(r.campaign_id) ?? {
      name: r.campaign_name,
      recentCost: 0,
      prevCost: 0,
      recentValue: 0,
      prevValue: 0,
    };
    const cost = Number(r.cost_nok) || 0;
    if (r.metric_date >= dateStr(last7Start)) ex.recentCost += cost;
    else ex.prevCost += cost;
    camps.set(r.campaign_id, ex);
  }
  for (const r of convs ?? []) {
    const name = (r.conversion_action_name as string).toLowerCase();
    if (!name.includes("purchase")) continue;
    const ex = camps.get(r.campaign_id);
    if (!ex) continue;
    const value = Number(r.all_conversions_value) || 0;
    if (r.metric_date >= dateStr(last7Start)) ex.recentValue += value;
    else ex.prevValue += value;
  }

  const anomalies: AnomalyCandidate[] = [];
  for (const [id, c] of camps) {
    if (c.prevCost < MIN_COST_NOK || c.recentCost < MIN_COST_NOK) continue;
    const prevRoas = c.prevValue / c.prevCost;
    const recentRoas = c.recentValue / c.recentCost;
    // Bare varsle om fall fra sunt til usunt
    if (prevRoas < ROAS_HEALTHY_MIN) continue;
    if (recentRoas >= ROAS_HEALTHY_MIN * ROAS_DROP_THRESHOLD) continue;
    const severity: AnomalySeverity = recentRoas < 0.5 ? "critical" : "warning";
    anomalies.push({
      category: "google_ads_roas_drop",
      severity,
      title: `${c.name}: ROAS har falt fra ${prevRoas.toFixed(1)}x til ${recentRoas.toFixed(1)}x`,
      description: `Kampanjen har brukt ${c.recentCost.toFixed(0)} NOK og generert ${c.recentValue.toFixed(0)} NOK i kjøp siste 7 dager — en markant nedgang fra 7 dager før.`,
      metric_context: {
        campaign_id: id,
        campaign_name: c.name,
        previous_roas: prevRoas,
        recent_roas: recentRoas,
        previous_value: c.prevValue,
        recent_value: c.recentValue,
      },
      suggested_action:
        "Sjekk om landingssider er endret, om nye konkurrenter har dukket opp, eller om markedet er inne i en lavperiode.",
      target_type: "campaign",
      target_id: id,
    });
  }

  return anomalies;
}

/**
 * Sjekk 4: Konverterings-stopp — purchase eller form_submit teller 0 i
 * siste 48 timer men hadde aktivitet dagen før.
 */
async function detectConversionStops(
  supabase: SupabaseClient
): Promise<AnomalyCandidate[]> {
  const today = new Date();
  const last2Start = subDays(today, 2);
  const prev5Start = subDays(today, 7);
  const prev5End = subDays(today, 2);

  const { data } = await supabase
    .from("google_ads_conversions")
    .select("campaign_id, campaign_name, conversion_action_name, metric_date, all_conversions")
    .gte("metric_date", dateStr(prev5Start))
    .lte("metric_date", dateStr(today));

  interface ActionPeriod {
    campName: string;
    actionName: string;
    recent: number;
    prev: number;
  }
  const map = new Map<string, ActionPeriod>();
  for (const r of data ?? []) {
    const name = (r.conversion_action_name as string).toLowerCase();
    const isImportant =
      name.includes("purchase") ||
      name.includes("form_submit") ||
      name.includes("kontaktoss");
    if (!isImportant) continue;

    const key = `${r.campaign_id}|${r.conversion_action_name}`;
    const ex = map.get(key) ?? {
      campName: r.campaign_name as string,
      actionName: r.conversion_action_name as string,
      recent: 0,
      prev: 0,
    };
    const count = Number(r.all_conversions) || 0;
    if (r.metric_date >= dateStr(last2Start)) ex.recent += count;
    else ex.prev += count;
    map.set(key, ex);
  }

  const anomalies: AnomalyCandidate[] = [];
  for (const [key, p] of map) {
    // Se CONVERSION_STOP_MIN_PREV — under denne er 0 på 48t statistisk ventet
    if (p.prev < CONVERSION_STOP_MIN_PREV) continue;
    if (p.recent > 0) continue;

    const isPurchase = p.actionName.toLowerCase().includes("purchase");
    anomalies.push({
      category: "conversion_stop",
      severity: isPurchase ? "critical" : "warning",
      title: `${p.campName}: ingen ${isPurchase ? "kjøp" : "leads"} siste 48 timer`,
      description: `${p.actionName} har ikke registrert noen konverteringer siste 2 dager. Forrige 5-dagers periode hadde ${p.prev} konverteringer.`,
      metric_context: {
        campaign_name: p.campName,
        action_name: p.actionName,
        recent: p.recent,
        previous: p.prev,
      },
      suggested_action:
        "Sjekk at konverteringssporing virker (GTM live, gtag event fyrer, GA4 → Google Ads-link). Kan også være reell nedgang.",
      target_type: "campaign",
      target_id: key,
    });
  }

  return anomalies;
}

/**
 * Sjekk 5: Nye konkurrent-brands dukker opp i Pmax/search terms.
 * Vi ser etter terms som matcher konkurrent-regel og som ikke har vært der
 * før (sammenlign siste 7 dager vs. 30 dager før).
 */
async function detectNewCompetitorBrands(
  supabase: SupabaseClient
): Promise<AnomalyCandidate[]> {
  const today = new Date();
  const last7Start = subDays(today, 7);
  const prev30Start = subDays(today, 37);
  const prev30End = subDays(today, 7);

  type TermRow = {
    search_term: string;
    campaign_id: string;
    clicks: number;
    cost_nok: number | string;
    source: string | null;
    metric_date: string;
  };
  const recent = await fetchAllRows<TermRow>(
    supabase,
    "google_ads_search_terms",
    "search_term, campaign_id, clicks, cost_nok, source, metric_date",
    (q) =>
      q
        .gte("metric_date", dateStr(last7Start))
        .lte("metric_date", dateStr(today))
  );

  const earlier = await fetchAllRows<{ search_term: string }>(
    supabase,
    "google_ads_search_terms",
    "search_term",
    (q) =>
      q
        .gte("metric_date", dateStr(prev30Start))
        .lt("metric_date", dateStr(prev30End))
  );

  const earlierTerms = new Set(
    (earlier ?? []).map((r) => (r.search_term as string).trim().toLowerCase())
  );

  const rules = await getCompetitorRules(supabase);
  const isCompetitor = makeCompetitorMatcher(rules);

  interface NewTerm {
    term: string;
    searchClicks: number;
    searchCost: number;
    pmaxClicks: number;
    pmaxCost: number;
    campaign_id: string;
    lastSnapshot: string;
  }
  const newTerms = new Map<string, NewTerm>();
  for (const r of recent ?? []) {
    const term = r.search_term as string;
    if (!term || term === "(other)") continue;
    const norm = term.trim().toLowerCase();
    if (earlierTerms.has(norm)) continue;
    if (!isCompetitor(term)) continue;

    const ex = newTerms.get(norm) ?? {
      term,
      searchClicks: 0,
      searchCost: 0,
      pmaxClicks: 0,
      pmaxCost: 0,
      campaign_id: r.campaign_id as string,
      lastSnapshot: "",
    };
    if (r.source === "pmax_insight") {
      // pmax_insight er et rullende 90-dagers aggregat lagret per snapshot-dato.
      // Å summere snapshots teller samme klikk mange ganger (1 klikk × 7 dager
      // = «7 klikk») — bruk kun nyeste snapshot per term.
      if (r.metric_date > ex.lastSnapshot) {
        ex.lastSnapshot = r.metric_date;
        ex.pmaxClicks = r.clicks || 0;
        ex.pmaxCost = Number(r.cost_nok) || 0;
      }
    } else {
      ex.searchClicks += r.clicks || 0;
      ex.searchCost += Number(r.cost_nok) || 0;
    }
    newTerms.set(norm, ex);
  }

  const anomalies: AnomalyCandidate[] = [];
  for (const [norm, t] of newTerms) {
    const clicks = t.searchClicks + t.pmaxClicks;
    const cost = t.searchCost + t.pmaxCost;
    // Bare varsle om terms med reell aktivitet
    if (clicks < 2 && cost < 20) continue;
    anomalies.push({
      category: "new_competitor_brand",
      severity: "warning",
      title: `Nytt konkurrent-søk: "${t.term}"`,
      description: `Søketermen "${t.term}" har dukket opp for første gang på 37 dager og matcher en konkurrent-regel. ${clicks} klikk, ${cost.toFixed(0)} NOK kostnad hittil.`,
      metric_context: {
        search_term: t.term,
        normalized: norm,
        clicks,
        cost,
        campaign_id: t.campaign_id,
      },
      suggested_action:
        "Legg til som negativ keyword via Søkeord: Intelligens-siden, eller ignorer hvis det er relevant (f.eks. rimelig alternativ søkt av folk).",
      target_type: "search_term",
      target_id: norm,
    });
  }

  return anomalies;
}

/**
 * Sjekk 6: SEO-posisjonsfall. Sammenligner impresjons-vektet posisjon per
 * søkeord siste 7 dager mot de 7 før, direkte fra Search Console (tabellen
 * search_keywords lagrer bare topp ~25/dag — for tynt til å fange fall som
 * Gedore). Fanget manuelt 17. aug; dette er automatiseringen.
 */
async function detectSeoPositionDrops(
  supabase: SupabaseClient
): Promise<AnomalyCandidate[]> {
  const { GA4Service } = await import("@/lib/services/ga4");
  const ga4 = new GA4Service();

  const today = new Date();
  const lastEnd = subDays(today, SEO_DROP_LAG_DAYS);
  const lastStart = subDays(lastEnd, 6);
  const prevEnd = subDays(lastStart, 1);
  const prevStart = subDays(prevEnd, 6);

  const rows = await ga4.fetchSearchKeywords(prevStart, lastEnd, 25000);
  if (!rows.length) return [];

  const grenseDato = dateStr(lastStart);
  interface Agg { imp: number; clicks: number; posVekt: number; }
  const last = new Map<string, Agg>();
  const prev = new Map<string, Agg>();
  for (const r of rows) {
    const bucket = r.metric_date >= grenseDato ? last : prev;
    const ex = bucket.get(r.query) ?? { imp: 0, clicks: 0, posVekt: 0 };
    ex.imp += r.impressions || 0;
    ex.clicks += r.clicks || 0;
    ex.posVekt += (r.position || 0) * (r.impressions || 0);
    bucket.set(r.query, ex);
  }

  // Demp gjentak: søkeord som alt har fått dette varselet siste 7 dager
  const muteFra = subDays(today, SEO_DROP_MUTE_DAYS).toISOString();
  const { data: nylige } = await supabase
    .from("analytics_anomalies")
    .select("target_id")
    .eq("category", "seo_position_drop")
    .gte("detected_at", muteFra);
  const dempet = new Set((nylige ?? []).map((r) => r.target_id as string));

  interface Fall { query: string; fra: number; til: number; imp: number; clicks: number; }
  const fall: Fall[] = [];
  for (const [query, p] of prev) {
    if (p.imp < SEO_DROP_MIN_IMPRESSIONS) continue;
    const l = last.get(query);
    if (!l || l.imp === 0) continue; // borte fra SERP håndteres ikke her — for støyete
    const prevPos = p.posVekt / p.imp;
    const lastPos = l.posVekt / l.imp;
    if (lastPos - prevPos < SEO_DROP_MIN_POSITIONS) continue;
    if (dempet.has(query)) continue;
    fall.push({ query, fra: prevPos, til: lastPos, imp: p.imp, clicks: p.clicks });
  }

  fall.sort((a, b) => b.imp - a.imp);
  const fmt = (n: number) => (Math.round(n * 10) / 10).toFixed(1).replace(".", ",");

  return fall.slice(0, SEO_DROP_MAX_ALERTS).map((f) => {
    const mistetSide1 = f.fra <= 10 && f.til > 10;
    return {
      category: "seo_position_drop",
      severity: (mistetSide1 && f.clicks >= 5 ? "critical" : "warning") as AnomalySeverity,
      title: `SEO-fall: «${f.query}» ${fmt(f.fra)} → ${fmt(f.til)}`,
      description: `Søkeordet «${f.query}» falt fra posisjon ${fmt(f.fra)} til ${fmt(f.til)} (7d vs forrige 7d, ${f.imp} visninger i før-perioden${mistetSide1 ? " — ute av side 1" : ""}).`,
      metric_context: {
        query: f.query,
        position_before: Math.round(f.fra * 10) / 10,
        position_after: Math.round(f.til * 10) / 10,
        impressions_before: f.imp,
        clicks_before: f.clicks,
      },
      suggested_action:
        "Sjekk siden i /innsikt/seo (kategori «declining») og verifiser at den fortsatt er indeksert med riktig innhold. Fall på 3+ plasser skyldes oftest innholds-/struktur-endring, kannibalisering eller en sterkere konkurrent.",
      target_type: "search_term" as const,
      target_id: f.query,
    };
  });
}

/**
 * Hoved-orkestrator. Kjører alle sjekkene, dedupliserer og persisterer.
 */
export async function detectAnomalies(
  supabase: SupabaseClient
): Promise<{ detected: number; inserted: number; skipped_duplicates: number }> {
  const all: AnomalyCandidate[] = [];
  try {
    all.push(...(await detectPlatformAnomalies(supabase)));
  } catch (e) {
    console.error("detectPlatformAnomalies failed:", e);
  }
  try {
    all.push(...(await detectCostSpikes(supabase)));
  } catch (e) {
    console.error("detectCostSpikes failed:", e);
  }
  try {
    all.push(...(await detectRoasDrops(supabase)));
  } catch (e) {
    console.error("detectRoasDrops failed:", e);
  }
  try {
    all.push(...(await detectConversionStops(supabase)));
  } catch (e) {
    console.error("detectConversionStops failed:", e);
  }
  try {
    all.push(...(await detectNewCompetitorBrands(supabase)));
  } catch (e) {
    console.error("detectNewCompetitorBrands failed:", e);
  }
  try {
    all.push(...(await detectSeoPositionDrops(supabase)));
  } catch (e) {
    console.error("detectSeoPositionDrops failed:", e);
  }

  // Dedup: sjekk om samme kategori+target finnes som "active" innenfor siste 24t
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("analytics_anomalies")
    .select("id, dedup_key, status")
    .gte("detected_at", oneDayAgo)
    .eq("status", "active");

  const existingKeys = new Set(
    (existing ?? []).map((r) => r.dedup_key as string)
  );

  let inserted = 0;
  let skipped = 0;
  const toInsert: Array<Record<string, unknown>> = [];

  for (const a of all) {
    const key = `${a.category}|${a.target_type}|${a.target_id}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    existingKeys.add(key);
    toInsert.push({
      category: a.category,
      severity: a.severity,
      title: a.title,
      description: a.description,
      metric_context: a.metric_context,
      suggested_action: a.suggested_action ?? null,
      target_type: a.target_type,
      target_id: a.target_id,
      status: "active",
    });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase
      .from("analytics_anomalies")
      .insert(toInsert);
    if (!error) inserted = toInsert.length;
    else console.error("analytics_anomalies insert error:", error);
  }

  // Auto-ekspirer gamle active anomalier (30+ dager)
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  await supabase
    .from("analytics_anomalies")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("detected_at", thirtyDaysAgo);

  return {
    detected: all.length,
    inserted,
    skipped_duplicates: skipped,
  };
}
