import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Analyse-endpoint: samler kampanje-kostnad, ekte konverteringsverdier
 * (fra all_conversions_value), brand-andel fra søketermer, og genererer
 * enkle anbefalinger. Brukes av /ga4/google-ads/analyse.
 */

// Normalisert brand-detektor for Fosen Tools
const BRAND_PATTERNS = [
  /fosen[\s-]?tools?/i,
  /^fosen$/i,
  /fosentools/i,
];

function isBrandTerm(term: string): boolean {
  const t = term.toLowerCase().trim();
  return BRAND_PATTERNS.some((p) => p.test(t));
}

export type BusinessModel = "purchase" | "leads" | "mixed";

export interface CampaignAnalysis {
  campaign_id: string;
  campaign_name: string;
  channel_type: string | null;
  status: string | null;
  cost_nok: number;
  clicks: number;
  impressions: number;
  // Business model for denne kampanjen (fra settings, default inferred)
  business_model: BusinessModel;
  estimated_lead_value_nok: number;
  // Primary conversions (det Google Ads ser og optimerer mot)
  primary_conversions: number;
  primary_value: number;
  // Reelle kjøp (fra all_conversions_value på purchase-eventet)
  real_purchases: number;
  real_purchase_value: number;
  // Leads (form_submit, begin_checkout, kontakt)
  real_leads: number;
  estimated_lead_total_value: number; // real_leads * estimated_lead_value_nok
  // Beregninger
  real_roas: number; // ekte kjøp-verdi / kostnad
  lead_roas: number; // estimert lead-verdi / kostnad
  effective_roas: number; // summert (kjøp + leads) / kostnad — relevant for valgt modell
  cost_per_lead: number | null; // kostnad / real_leads
  primary_roas: number; // primary verdi / kostnad
  cpc: number;
  cpa_real: number | null; // kostnad / ekte kjøp
  // Brand-analyse
  brand_clicks: number;
  brand_share_pct: number;
  estimated_brand_cost_nok: number;
  // Anbefaling
  verdict: "scale_up" | "keep" | "optimize" | "investigate" | "insufficient_data";
  verdict_label: string;
  verdict_reason: string;
}

export interface AnalysisResponse {
  period: { from: string; to: string; days: number };
  campaigns: CampaignAnalysis[];
  totals: {
    cost_nok: number;
    primary_value: number;
    real_purchase_value: number;
    real_roas: number;
  };
  insights: {
    total_brand_cost_estimate: number;
    tracking_health: "ok" | "warning" | "broken";
    tracking_issues: string[];
  };
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
      { error: "Missing from/to parameters" },
      { status: 400 }
    );
  }

  // 1. Hent kampanje-data aggregert per kampanje
  const { data: campRows, error: campErr } = await supabase
    .from("google_ads_campaigns")
    .select("*")
    .gte("metric_date", from)
    .lte("metric_date", to);

  if (campErr) {
    if (/relation .* does not exist/i.test(campErr.message)) {
      return NextResponse.json({
        period: { from, to, days: 0 },
        campaigns: [],
        totals: {
          cost_nok: 0,
          primary_value: 0,
          real_purchase_value: 0,
          real_roas: 0,
        },
        insights: {
          total_brand_cost_estimate: 0,
          tracking_health: "broken",
          tracking_issues: ["Tabell google_ads_campaigns finnes ikke"],
        },
      } satisfies AnalysisResponse);
    }
    return NextResponse.json({ error: campErr.message }, { status: 500 });
  }

  interface CampAgg {
    id: string;
    name: string;
    status: string | null;
    channel_type: string | null;
    cost: number;
    clicks: number;
    impressions: number;
    primaryConv: number;
    primaryValue: number;
  }
  const campMap = new Map<string, CampAgg>();
  for (const row of campRows ?? []) {
    const existing = campMap.get(row.campaign_id);
    if (existing) {
      existing.cost += Number(row.cost_nok) || 0;
      existing.clicks += row.clicks || 0;
      existing.impressions += row.impressions || 0;
      existing.primaryConv += Number(row.conversions) || 0;
      existing.primaryValue += Number(row.conversion_value) || 0;
    } else {
      campMap.set(row.campaign_id, {
        id: row.campaign_id,
        name: row.campaign_name,
        status: row.status,
        channel_type: row.channel_type,
        cost: Number(row.cost_nok) || 0,
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        primaryConv: Number(row.conversions) || 0,
        primaryValue: Number(row.conversion_value) || 0,
      });
    }
  }

  // 1b. Hent kampanje-innstillinger (business_model + estimated_lead_value_nok)
  const { data: settingsRows } = await supabase
    .from("google_ads_campaign_settings")
    .select("*");
  const settingsByCamp = new Map<
    string,
    { business_model: BusinessModel; estimated_lead_value_nok: number }
  >();
  for (const s of settingsRows ?? []) {
    settingsByCamp.set(s.campaign_id, {
      business_model: s.business_model as BusinessModel,
      estimated_lead_value_nok: Number(s.estimated_lead_value_nok) || 0,
    });
  }

  // 2. Hent konverteringer (all_conversions_value som faktisk verdi)
  const { data: convRows } = await supabase
    .from("google_ads_conversions")
    .select("*")
    .gte("metric_date", from)
    .lte("metric_date", to);

  interface ConvAgg {
    realPurchases: number;
    realPurchaseValue: number;
    realLeads: number;
  }
  const convByCamp = new Map<string, ConvAgg>();

  for (const row of convRows ?? []) {
    const name = (row.conversion_action_name as string).toLowerCase();
    const isPurchase = name.includes("purchase");
    const isLead =
      name.includes("form_submit") ||
      name.includes("begin_checkout") ||
      name.includes("kontakt");

    const existing = convByCamp.get(row.campaign_id) ?? {
      realPurchases: 0,
      realPurchaseValue: 0,
      realLeads: 0,
    };

    if (isPurchase) {
      existing.realPurchases += Number(row.all_conversions) || 0;
      existing.realPurchaseValue += Number(row.all_conversions_value) || 0;
    } else if (isLead) {
      existing.realLeads += Number(row.all_conversions) || 0;
    }

    convByCamp.set(row.campaign_id, existing);
  }

  // 3. Hent søketermer for brand-analyse
  const { data: termRows } = await supabase
    .from("google_ads_search_terms")
    .select("campaign_id, search_term, clicks, cost_nok, source")
    .gte("metric_date", from)
    .lte("metric_date", to);

  interface BrandAgg {
    brandClicks: number;
    totalClicks: number;
    brandCostEstimate: number;
  }
  const brandByCamp = new Map<string, BrandAgg>();

  for (const row of termRows ?? []) {
    const term = row.search_term as string;
    const clicks = row.clicks || 0;
    const cost = Number(row.cost_nok) || 0;

    const existing = brandByCamp.get(row.campaign_id) ?? {
      brandClicks: 0,
      totalClicks: 0,
      brandCostEstimate: 0,
    };

    existing.totalClicks += clicks;
    if (isBrandTerm(term)) {
      existing.brandClicks += clicks;
      // Pmax har ikke cost per term, så vi estimerer proporsjonalt
      existing.brandCostEstimate += cost;
    }

    brandByCamp.set(row.campaign_id, existing);
  }

  // 4. Beregn dager i perioden
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const days = Math.max(
    1,
    Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000))
  );

  // 5. Bygg analyser per kampanje
  const campaigns: CampaignAnalysis[] = [];
  let totalBrandCost = 0;

  for (const camp of campMap.values()) {
    const conv = convByCamp.get(camp.id) ?? {
      realPurchases: 0,
      realPurchaseValue: 0,
      realLeads: 0,
    };
    const brand = brandByCamp.get(camp.id) ?? {
      brandClicks: 0,
      totalClicks: 0,
      brandCostEstimate: 0,
    };

    // Brand-share: for Search-kampanjer har vi cost per term (via search_term_view),
    // for Pmax har vi bare klikk (ingen kostnadsdata per kategori). Beregning er derfor
    // approximativ — vi bruker klikkfordelingen som proxy for kostnadsfordelingen.
    const brandSharePct =
      brand.totalClicks > 0
        ? (brand.brandClicks / brand.totalClicks) * 100
        : 0;
    const brandCostEstimate =
      brand.brandCostEstimate > 0
        ? brand.brandCostEstimate
        : (camp.cost * brandSharePct) / 100;

    totalBrandCost += brandCostEstimate;

    // Hent settings — default inferred hvis ingen finnes
    const saved = settingsByCamp.get(camp.id);
    let businessModel: BusinessModel;
    let estLeadValue: number;
    if (saved) {
      businessModel = saved.business_model;
      estLeadValue = saved.estimated_lead_value_nok;
    } else {
      // Default inference: hvis kampanjen har ekte kjøp → purchase, ellers leads
      businessModel = conv.realPurchases > 0 ? "purchase" : "leads";
      estLeadValue = 500; // konservativ default
    }

    const realRoas = camp.cost > 0 ? conv.realPurchaseValue / camp.cost : 0;
    const primaryRoas = camp.cost > 0 ? camp.primaryValue / camp.cost : 0;
    const cpc = camp.clicks > 0 ? camp.cost / camp.clicks : 0;
    const cpaReal =
      conv.realPurchases > 0 ? camp.cost / conv.realPurchases : null;

    const estimatedLeadTotalValue = conv.realLeads * estLeadValue;
    const leadRoas =
      camp.cost > 0 ? estimatedLeadTotalValue / camp.cost : 0;
    const costPerLead =
      conv.realLeads > 0 ? camp.cost / conv.realLeads : null;

    // Effective ROAS avhenger av business model
    let effectiveRoas: number;
    if (businessModel === "purchase") {
      effectiveRoas = realRoas;
    } else if (businessModel === "leads") {
      effectiveRoas = leadRoas;
    } else {
      // mixed: sum av begge verdier
      effectiveRoas =
        camp.cost > 0
          ? (conv.realPurchaseValue + estimatedLeadTotalValue) / camp.cost
          : 0;
    }

    // Verdikt-logikk — basert på effective_roas og business_model
    let verdict: CampaignAnalysis["verdict"];
    let verdictLabel: string;
    let verdictReason: string;

    if (camp.cost < 500) {
      verdict = "insufficient_data";
      verdictLabel = "For lite data";
      verdictReason = `Bare ${camp.cost.toFixed(0)} NOK brukt i perioden — for lite til å vurdere.`;
    } else if (conv.realPurchases === 0 && conv.realLeads === 0) {
      verdict = "investigate";
      verdictLabel = "Undersøk";
      verdictReason = `${camp.cost.toFixed(0)} NOK brukt, men ingen sporede kjøp eller leads. Enten sporing er brutt for denne kampanjen, eller landingssidene konverterer ikke.`;
    } else if (effectiveRoas >= 4) {
      verdict = "scale_up";
      verdictLabel = "Skaler opp";
      verdictReason =
        businessModel === "leads"
          ? `Lead-ROAS ${effectiveRoas.toFixed(1)}x basert på antatt verdi ${estLeadValue} NOK/lead. ${conv.realLeads} leads for ${camp.cost.toFixed(0)} NOK. Vurder å øke budsjettet.`
          : `ROAS ${effectiveRoas.toFixed(1)}x er godt over break-even. Vurder å øke budsjettet.`;
    } else if (effectiveRoas >= 1.5) {
      verdict = "keep";
      verdictLabel = "Behold";
      verdictReason =
        businessModel === "leads"
          ? `Lead-ROAS ${effectiveRoas.toFixed(1)}x — lønnsomt hvis lead-verdien på ${estLeadValue} NOK stemmer. ${conv.realLeads} leads, ${costPerLead !== null ? costPerLead.toFixed(0) + " NOK/lead" : ""}.`
          : `ROAS ${effectiveRoas.toFixed(1)}x er lønnsomt. Kjør videre og overvåk.`;
    } else if (effectiveRoas >= 0.5) {
      verdict = "optimize";
      verdictLabel = "Optimaliser";
      verdictReason =
        businessModel === "leads"
          ? `Lead-ROAS ${effectiveRoas.toFixed(1)}x er under mål. ${costPerLead !== null ? "Kost per lead: " + costPerLead.toFixed(0) + " NOK. " : ""}Vurder om antatt lead-verdi er realistisk eller juster kampanjen.`
          : `ROAS ${effectiveRoas.toFixed(1)}x er under mål. Vurder negative keywords eller bedre landingssider.`;
    } else if (conv.realPurchases > 0) {
      verdict = "optimize";
      verdictLabel = "Optimaliser";
      verdictReason = `${conv.realPurchases} kjøp men lav ROAS (${effectiveRoas.toFixed(2)}x). Analyser hvilke søkeord som faktisk konverterer.`;
    } else if (conv.realLeads > 0) {
      verdict = "optimize";
      verdictLabel = "Optimaliser";
      verdictReason =
        businessModel === "leads"
          ? `${conv.realLeads} leads, men antatt verdi (${estLeadValue} NOK/lead) gir ikke lønnsomhet. Juster antatt verdi eller landingsside.`
          : `Leads kommer inn (${conv.realLeads}), men ingen kjøp. Sjekk om leads faktisk konverterer til salg.`;
    } else {
      verdict = "investigate";
      verdictLabel = "Undersøk";
      verdictReason = `Ingen kjøp eller leads sporet — undersøk hva som skjer med trafikken.`;
    }

    campaigns.push({
      campaign_id: camp.id,
      campaign_name: camp.name,
      channel_type: camp.channel_type,
      status: camp.status,
      cost_nok: camp.cost,
      clicks: camp.clicks,
      impressions: camp.impressions,
      business_model: businessModel,
      estimated_lead_value_nok: estLeadValue,
      primary_conversions: camp.primaryConv,
      primary_value: camp.primaryValue,
      real_purchases: conv.realPurchases,
      real_purchase_value: conv.realPurchaseValue,
      real_leads: conv.realLeads,
      estimated_lead_total_value: estimatedLeadTotalValue,
      real_roas: realRoas,
      lead_roas: leadRoas,
      effective_roas: effectiveRoas,
      cost_per_lead: costPerLead,
      primary_roas: primaryRoas,
      cpc,
      cpa_real: cpaReal,
      brand_clicks: brand.brandClicks,
      brand_share_pct: brandSharePct,
      estimated_brand_cost_nok: brandCostEstimate,
      verdict,
      verdict_label: verdictLabel,
      verdict_reason: verdictReason,
    });
  }

  campaigns.sort((a, b) => b.cost_nok - a.cost_nok);

  // 6. Tracking health: sjekk bare siste 7 dager for primary-match
  // Google Ads fryser primary-status på historiske konverteringer til den som
  // var aktiv da eventet skjedde, så eldre data kan aldri fikses. Vi sjekker
  // derfor bare nye data for å avgjøre om sporingen er brutt eller ikke.
  const trackingIssues: string[] = [];
  const totalRealPurchaseValue = campaigns.reduce(
    (s, c) => s + c.real_purchase_value,
    0
  );
  const totalPrimaryValue = campaigns.reduce((s, c) => s + c.primary_value, 0);

  // Hent siste 7 dager separat for primary-sjekk
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

  const { data: recentCamps } = await supabase
    .from("google_ads_campaigns")
    .select("cost_nok, conversions, conversion_value")
    .gte("metric_date", sevenDaysAgoStr)
    .lte("metric_date", to);

  const { data: recentConv } = await supabase
    .from("google_ads_conversions")
    .select("conversion_action_name, all_conversions, all_conversions_value")
    .gte("metric_date", sevenDaysAgoStr)
    .lte("metric_date", to);

  let recentPrimaryValue = 0;
  let recentCost = 0;
  for (const r of recentCamps ?? []) {
    recentPrimaryValue += Number(r.conversion_value) || 0;
    recentCost += Number(r.cost_nok) || 0;
  }

  let recentRealPurchaseValue = 0;
  for (const r of recentConv ?? []) {
    const name = (r.conversion_action_name as string).toLowerCase();
    if (name.includes("purchase")) {
      recentRealPurchaseValue += Number(r.all_conversions_value) || 0;
    }
  }

  // Bare advar hvis SISTE 7 DAGER viser misforhold — historiske er frosne av Google
  if (
    recentRealPurchaseValue > 500 &&
    recentPrimaryValue < recentRealPurchaseValue * 0.3
  ) {
    trackingIssues.push(
      `Siste 7 dager: ekte kjøpsverdi ${recentRealPurchaseValue.toFixed(0)} NOK, men primary teller bare ${recentPrimaryValue.toFixed(0)} NOK. Sjekk at 'purchase' er merket som primær handling med "Bruk verdien fra GA4".`
    );
  }

  // Informativ advarsel for historisk mismatch (som ikke kan fikses)
  const historicalMismatch =
    totalRealPurchaseValue > 1000 &&
    totalPrimaryValue < totalRealPurchaseValue * 0.3;
  const recentOk = recentRealPurchaseValue === 0 || recentPrimaryValue >= recentRealPurchaseValue * 0.3;
  if (historicalMismatch && recentOk && recentRealPurchaseValue === 0) {
    // Ingen nye data ennå — bare informer om historisk tilstand uten å lyse rødt
    trackingIssues.push(
      `INFO: Historiske primary-verdier (${totalPrimaryValue.toFixed(0)} NOK) er lavere enn ekte kjøpsverdi (${totalRealPurchaseValue.toFixed(0)} NOK) fordi Google låser primary-status på tidspunktet konverteringen skjedde. Nye kjøp vil telles korrekt.`
    );
  }

  const campaignsWithPurchases = campaigns.filter((c) => c.real_purchases > 0);
  if (
    campaignsWithPurchases.length === 0 &&
    campaigns.some((c) => c.cost_nok > 1000)
  ) {
    trackingIssues.push(
      "Ingen kampanjer har sporede kjøp. Enten er sporing ikke satt opp, eller ingen kjøp har skjedd via annonser i perioden."
    );
  }

  // Health: "ok" hvis bare historisk mismatch (INFO-tekst teller ikke som problem)
  const hasRealIssue = trackingIssues.some(
    (i) => !i.startsWith("INFO:")
  );
  const trackingHealth: AnalysisResponse["insights"]["tracking_health"] =
    !hasRealIssue ? "ok" : trackingIssues.length === 1 ? "warning" : "broken";

  const totalCost = campaigns.reduce((s, c) => s + c.cost_nok, 0);
  const totalRealRoas =
    totalCost > 0 ? totalRealPurchaseValue / totalCost : 0;

  const response: AnalysisResponse = {
    period: { from, to, days },
    campaigns,
    totals: {
      cost_nok: totalCost,
      primary_value: totalPrimaryValue,
      real_purchase_value: totalRealPurchaseValue,
      real_roas: totalRealRoas,
    },
    insights: {
      total_brand_cost_estimate: totalBrandCost,
      tracking_health: trackingHealth,
      tracking_issues: trackingIssues,
    },
  };

  return NextResponse.json(response);
}
