/**
 * Keyword Intelligence — samler signaler fra alle kilder og klassifiserer
 * hvert søkeord som "skaler opp", "behold", "kutt", "negativ" osv.
 *
 * Brukes av:
 *   - Web-siden /sokeord-generator/intelligens
 *   - Den utvidede Excel-rapporten (via buildKeywordReport)
 *   - Ukentlig cron-rapport
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  makeCompetitorMatcher,
  getCompetitorRules,
} from "@/lib/services/keyword-report";

export type KeywordSource =
  | "google_ads_keyword"
  | "search_term_view"
  | "pmax_insight"
  | "gsc_organic"
  | "excel_upload"
  | "keyword_planner";

export type KeywordVerdict =
  | "scale_up"
  | "keep"
  | "optimize"
  | "cut"
  | "negative_keyword"
  | "new_opportunity"
  | "monitor";

export interface KeywordSignal {
  keyword: string;
  normalized: string;
  sources: KeywordSource[];
  total_clicks: number;
  total_impressions: number;
  total_cost: number;
  avg_cpc: number;
  est_conversions: number;
  est_conversion_value: number;
  est_roas: number;
  quality_score: number | null;
  brand_match: boolean;
  competitor_match: boolean;
  // Organisk data (fra GSC)
  organic_impressions?: number;
  organic_clicks?: number;
  organic_position?: number;
  // Kobling til kampanje (hvis entydig)
  primary_campaign_id?: string;
  primary_campaign_name?: string;
  // Klassifisering
  verdict: KeywordVerdict;
  verdict_reason: string;
  confidence: "high" | "medium" | "low";
}

export interface IntelligenceReport {
  period_from: string;
  period_to: string;
  days: number;
  signals: KeywordSignal[];
  totals: {
    total_signals: number;
    scale_up: number;
    keep: number;
    optimize: number;
    cut: number;
    negative: number;
    new_opportunity: number;
    monitor: number;
    total_cost: number;
    total_est_value: number;
    combined_roas: number;
  };
  negative_suggestions: KeywordSignal[];
  new_opportunities: KeywordSignal[];
  top_scale_up: KeywordSignal[];
  top_cut: KeywordSignal[];
}

const BRAND_PATTERNS = [/fosen[\s-]?tools?/i, /^fosen$/i, /fosentools/i];

function normalize(s: string): string {
  return (s || "").trim().toLowerCase();
}

function isBrandMatch(keyword: string): boolean {
  return BRAND_PATTERNS.some((p) => p.test(keyword));
}

/**
 * Henter alle signaler fra alle kilder og aggregerer per normalisert søkeord.
 */
export async function gatherSignals(
  supabase: SupabaseClient,
  days: number
): Promise<{
  signals: Map<string, KeywordSignal>;
  period_from: string;
  period_to: string;
}> {
  const today = new Date();
  const start = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
  const period_from = start.toISOString().split("T")[0];
  const period_to = today.toISOString().split("T")[0];

  const signals = new Map<string, KeywordSignal>();

  const touch = (keyword: string, source: KeywordSource): KeywordSignal => {
    const norm = normalize(keyword);
    let sig = signals.get(norm);
    if (!sig) {
      sig = {
        keyword,
        normalized: norm,
        sources: [],
        total_clicks: 0,
        total_impressions: 0,
        total_cost: 0,
        avg_cpc: 0,
        est_conversions: 0,
        est_conversion_value: 0,
        est_roas: 0,
        quality_score: null,
        brand_match: isBrandMatch(keyword),
        competitor_match: false,
        verdict: "monitor",
        verdict_reason: "",
        confidence: "low",
      };
      signals.set(norm, sig);
    }
    if (!sig.sources.includes(source)) sig.sources.push(source);
    return sig;
  };

  // 1. google_ads_keywords (Search-kampanjer)
  const { data: kwRows } = await supabase
    .from("google_ads_keywords")
    .select(
      "keyword_text, match_type, impressions, clicks, cost_nok, average_cpc_nok, quality_score, campaign_id"
    )
    .gte("metric_date", period_from)
    .lte("metric_date", period_to);

  for (const r of kwRows ?? []) {
    const sig = touch(r.keyword_text as string, "google_ads_keyword");
    sig.total_impressions += r.impressions || 0;
    sig.total_clicks += r.clicks || 0;
    sig.total_cost += Number(r.cost_nok) || 0;
    if (r.quality_score != null && sig.quality_score == null) {
      sig.quality_score = Number(r.quality_score);
    }
    if (!sig.primary_campaign_id) {
      sig.primary_campaign_id = r.campaign_id as string;
    }
  }

  // 2. google_ads_search_terms (ekte søk fra Search + Pmax-kategorier)
  const { data: stRows } = await supabase
    .from("google_ads_search_terms")
    .select(
      "source, search_term, impressions, clicks, cost_nok, campaign_id, campaign_name"
    )
    .gte("metric_date", period_from)
    .lte("metric_date", period_to);

  for (const r of stRows ?? []) {
    const term = r.search_term as string;
    if (!term || term === "(other)") continue;
    const source: KeywordSource =
      r.source === "pmax_insight" ? "pmax_insight" : "search_term_view";
    const sig = touch(term, source);
    sig.total_impressions += r.impressions || 0;
    sig.total_clicks += r.clicks || 0;
    sig.total_cost += Number(r.cost_nok) || 0;
    if (!sig.primary_campaign_id) {
      sig.primary_campaign_id = r.campaign_id as string;
      sig.primary_campaign_name = (r.campaign_name as string) || undefined;
    }
  }

  // 3. search_keywords (GSC organisk)
  const { data: gscRows } = await supabase
    .from("search_keywords")
    .select("query, clicks, impressions, position")
    .gte("metric_date", period_from)
    .lte("metric_date", period_to);

  // Aggreger GSC per query
  const gscAgg = new Map<
    string,
    { clicks: number; impressions: number; weightedPos: number }
  >();
  for (const r of gscRows ?? []) {
    const norm = normalize(r.query as string);
    if (!norm) continue;
    const ex = gscAgg.get(norm) ?? {
      clicks: 0,
      impressions: 0,
      weightedPos: 0,
    };
    ex.clicks += r.clicks || 0;
    ex.impressions += r.impressions || 0;
    ex.weightedPos += (Number(r.position) || 0) * (r.impressions || 0);
    gscAgg.set(norm, ex);
  }

  for (const [norm, gsc] of gscAgg) {
    const sig = touch(norm, "gsc_organic");
    sig.organic_clicks = gsc.clicks;
    sig.organic_impressions = gsc.impressions;
    sig.organic_position =
      gsc.impressions > 0 ? gsc.weightedPos / gsc.impressions : 0;
  }

  // Beregn avg_cpc per signal
  for (const sig of signals.values()) {
    sig.avg_cpc = sig.total_clicks > 0 ? sig.total_cost / sig.total_clicks : 0;
  }

  return { signals, period_from, period_to };
}

/**
 * Beriker signaler med konverteringsdata fra google_ads_conversions.
 * Siden purchase-eventet er på kampanje-nivå (ikke keyword-nivå), fordeler
 * vi kampanje-konverteringer proporsjonalt ut på søkeordene basert på
 * klikk-andel.
 */
export async function enrichWithConversions(
  supabase: SupabaseClient,
  signals: Map<string, KeywordSignal>,
  days: number
): Promise<void> {
  const today = new Date();
  const start = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
  const from = start.toISOString().split("T")[0];
  const to = today.toISOString().split("T")[0];

  // Hent kampanje-totaler (klikk + purchase value)
  const { data: convRows } = await supabase
    .from("google_ads_conversions")
    .select("campaign_id, conversion_action_name, all_conversions, all_conversions_value")
    .gte("metric_date", from)
    .lte("metric_date", to);

  interface CampConv {
    purchases: number;
    purchaseValue: number;
    leads: number;
  }
  const campConv = new Map<string, CampConv>();
  for (const r of convRows ?? []) {
    const name = (r.conversion_action_name as string).toLowerCase();
    const isPurchase = name.includes("purchase");
    const isLead =
      name.includes("form_submit") ||
      name.includes("begin_checkout") ||
      name.includes("kontaktoss") ||
      name.includes("kontakt");
    const ex = campConv.get(r.campaign_id as string) ?? {
      purchases: 0,
      purchaseValue: 0,
      leads: 0,
    };
    if (isPurchase) {
      ex.purchases += Number(r.all_conversions) || 0;
      ex.purchaseValue += Number(r.all_conversions_value) || 0;
    } else if (isLead) {
      ex.leads += Number(r.all_conversions) || 0;
    }
    campConv.set(r.campaign_id as string, ex);
  }

  // Hent kampanje-innstillinger for lead-verdi
  const { data: settingsRows } = await supabase
    .from("google_ads_campaign_settings")
    .select("*");
  const settings = new Map<
    string,
    { business_model: string; estimated_lead_value_nok: number }
  >();
  for (const s of settingsRows ?? []) {
    settings.set(s.campaign_id, {
      business_model: s.business_model,
      estimated_lead_value_nok: Number(s.estimated_lead_value_nok) || 0,
    });
  }

  // Totaler per kampanje (for proporsjonal fordeling)
  interface CampTotal {
    totalClicks: number;
    estValue: number;
  }
  const campTotals = new Map<string, CampTotal>();
  for (const sig of signals.values()) {
    if (!sig.primary_campaign_id) continue;
    const ex = campTotals.get(sig.primary_campaign_id) ?? {
      totalClicks: 0,
      estValue: 0,
    };
    ex.totalClicks += sig.total_clicks;
    campTotals.set(sig.primary_campaign_id, ex);
  }

  // Beregn est value per kampanje basert på business model
  for (const [campId, conv] of campConv) {
    const ct = campTotals.get(campId);
    if (!ct) continue;
    const s = settings.get(campId);
    const leadValue = s?.estimated_lead_value_nok ?? 500;
    const model = s?.business_model ?? (conv.purchases > 0 ? "purchase" : "leads");
    let campValue = 0;
    if (model === "purchase") campValue = conv.purchaseValue;
    else if (model === "leads") campValue = conv.leads * leadValue;
    else campValue = conv.purchaseValue + conv.leads * leadValue;
    ct.estValue = campValue;
    campTotals.set(campId, ct);
  }

  // Fordel kampanje-verdier proporsjonalt ut på søkeordene
  for (const sig of signals.values()) {
    if (!sig.primary_campaign_id) continue;
    const ct = campTotals.get(sig.primary_campaign_id);
    if (!ct || ct.totalClicks === 0) continue;
    const share = sig.total_clicks / ct.totalClicks;
    sig.est_conversion_value = ct.estValue * share;
    sig.est_roas = sig.total_cost > 0 ? sig.est_conversion_value / sig.total_cost : 0;
    // Estimert antall konverteringer via kampanjens totaler
    const conv = campConv.get(sig.primary_campaign_id);
    if (conv) {
      sig.est_conversions = (conv.purchases + conv.leads) * share;
    }
  }
}

/**
 * Klassifiserer hvert signal som skaler_opp / behold / kutt / negativ osv.
 */
export async function classifySignals(
  supabase: SupabaseClient,
  signals: Map<string, KeywordSignal>
): Promise<void> {
  const competitorRules = await getCompetitorRules(supabase);
  const isCompetitor = makeCompetitorMatcher(competitorRules);

  for (const sig of signals.values()) {
    sig.competitor_match = isCompetitor(sig.keyword);

    // Regel 1: konkurrent-match → negativ kandidat
    if (sig.competitor_match) {
      sig.verdict = "negative_keyword";
      sig.verdict_reason = `Konkurrent-merke — brukere som søker dette vil ha den merkevaren, ikke Fosen Tools`;
      sig.confidence = "high";
      continue;
    }

    // Regel 2: GSC-only (ikke kjørt som ad) → ny mulighet hvis volum
    const isGscOnly =
      sig.sources.length === 1 &&
      sig.sources[0] === "gsc_organic" &&
      sig.total_cost === 0;
    if (isGscOnly) {
      if ((sig.organic_impressions ?? 0) >= 50 && (sig.organic_position ?? 100) >= 4) {
        sig.verdict = "new_opportunity";
        sig.verdict_reason = `Organisk volum ${sig.organic_impressions} visninger, posisjon ${sig.organic_position?.toFixed(1)} — kjør Ads for å fange trafikken`;
        sig.confidence = "medium";
      } else {
        sig.verdict = "monitor";
        sig.verdict_reason = "For lite organisk volum til å teste som betalt søkeord";
        sig.confidence = "low";
      }
      continue;
    }

    // Regel 3: veldig lav aktivitet → overvåk
    if (sig.total_clicks < 3 && sig.total_cost < 50) {
      sig.verdict = "monitor";
      sig.verdict_reason = "For lite aktivitet til å vurdere — følg med noen uker til";
      sig.confidence = "low";
      continue;
    }

    // Regel 4: konvertering → verdikt basert på ROAS
    if (sig.est_roas >= 4) {
      sig.verdict = "scale_up";
      sig.verdict_reason = `Estimert ROAS ${sig.est_roas.toFixed(1)}x (${sig.total_cost.toFixed(0)} NOK, ${sig.total_clicks} klikk). Vurder å øke bud eller bredde match-type.`;
      sig.confidence = sig.total_clicks > 10 ? "high" : "medium";
    } else if (sig.est_roas >= 1.5) {
      sig.verdict = "keep";
      sig.verdict_reason = `Lønnsomt (ROAS ${sig.est_roas.toFixed(1)}x). Behold og overvåk.`;
      sig.confidence = sig.total_clicks > 10 ? "high" : "medium";
    } else if (sig.est_roas >= 0.3) {
      sig.verdict = "optimize";
      sig.verdict_reason = `Marginelt (ROAS ${sig.est_roas.toFixed(1)}x). Vurder lavere bud eller bedre landingsside.`;
      sig.confidence = "medium";
    } else if (sig.est_roas > 0) {
      sig.verdict = "cut";
      sig.verdict_reason = `Taper penger (ROAS ${sig.est_roas.toFixed(2)}x). Kutt eller gjør til phrase/exact med strengere bud.`;
      sig.confidence = sig.total_clicks > 5 ? "high" : "medium";
    } else if (sig.total_cost > 100 && sig.est_conversions === 0) {
      // Mange klikk, ingen konverteringer → kutt
      sig.verdict = "cut";
      sig.verdict_reason = `${sig.total_cost.toFixed(0)} NOK brukt, ingen sporede konverteringer`;
      sig.confidence = sig.total_clicks > 10 ? "high" : "medium";
    } else {
      sig.verdict = "monitor";
      sig.verdict_reason = "Litt aktivitet, men ikke nok konverteringsdata enda";
      sig.confidence = "low";
    }
  }
}

/**
 * Full analyse-pipeline: signaler → berikelse → klassifisering → rapport-shape.
 */
export async function runIntelligence(
  supabase: SupabaseClient,
  days: number
): Promise<IntelligenceReport> {
  const { signals, period_from, period_to } = await gatherSignals(supabase, days);
  await enrichWithConversions(supabase, signals, days);
  await classifySignals(supabase, signals);

  const all = Array.from(signals.values());

  const counts = {
    total_signals: all.length,
    scale_up: 0,
    keep: 0,
    optimize: 0,
    cut: 0,
    negative: 0,
    new_opportunity: 0,
    monitor: 0,
  };

  let totalCost = 0;
  let totalEstValue = 0;

  for (const s of all) {
    totalCost += s.total_cost;
    totalEstValue += s.est_conversion_value;
    switch (s.verdict) {
      case "scale_up":
        counts.scale_up++;
        break;
      case "keep":
        counts.keep++;
        break;
      case "optimize":
        counts.optimize++;
        break;
      case "cut":
        counts.cut++;
        break;
      case "negative_keyword":
        counts.negative++;
        break;
      case "new_opportunity":
        counts.new_opportunity++;
        break;
      case "monitor":
        counts.monitor++;
        break;
    }
  }

  const negative_suggestions = all
    .filter((s) => s.verdict === "negative_keyword" && s.total_clicks > 0)
    .sort((a, b) => b.total_cost - a.total_cost);

  const new_opportunities = all
    .filter((s) => s.verdict === "new_opportunity")
    .sort((a, b) => (b.organic_impressions ?? 0) - (a.organic_impressions ?? 0))
    .slice(0, 30);

  const top_scale_up = all
    .filter((s) => s.verdict === "scale_up")
    .sort((a, b) => b.est_roas - a.est_roas)
    .slice(0, 20);

  const top_cut = all
    .filter((s) => s.verdict === "cut")
    .sort((a, b) => b.total_cost - a.total_cost)
    .slice(0, 20);

  return {
    period_from,
    period_to,
    days,
    signals: all,
    totals: {
      ...counts,
      total_cost: totalCost,
      total_est_value: totalEstValue,
      combined_roas: totalCost > 0 ? totalEstValue / totalCost : 0,
    },
    negative_suggestions,
    new_opportunities,
    top_scale_up,
    top_cut,
  };
}
