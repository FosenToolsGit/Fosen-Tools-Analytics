import { createClient } from "@/lib/supabase/server";
import { GoogleAdsService } from "@/lib/services/google-ads";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

/**
 * Validering av forrige uke: sammenligner Pmax brand_share, Brand Search-status
 * og Bransjer-kampanjen siste 7 dager vs forrige 7 dager. Brukes på /mandagsmote
 * for å svare på "fungerer endringene vi gjorde sist møte?".
 *
 * VIKTIG (lærepenger 3. mai 2026): Pmax-rader i `google_ads_search_terms` er
 * snapshots av Googles aggregerte 90-dagers `campaign_search_term_insight`,
 * stemplet med sync-dagen som `metric_date`. Når sync kjører hver dag får
 * vi N nesten-identiske kopier av samme aggregerte data. Et 7d-vindu på den
 * tabellen overestimerer Pmax-klikk dramatisk og gir falske brand-share-tall.
 *
 * Fiksen: for Pmax-kampanjer kaller vi Google Ads API live med BETWEEN på
 * det eksakte vinduet. For Search/Bransjer bruker vi Supabase med
 * `source=search_term` (ekte daglige rader, en per dag).
 */

const PMAX_CHANNEL_TYPE = "10";

const BRAND_PATTERNS = [/fosen[\s-]?tools?/i, /^fosen$/i, /fosentools/i];
const isBrandTerm = (t: string) => BRAND_PATTERNS.some((p) => p.test(t.toLowerCase().trim()));

interface CampaignWindow {
  cost: number;
  clicks: number;
  impressions: number;
  real_purchases: number;
  real_purchase_value: number;
  real_leads: number;
  brand_clicks: number;
  total_term_clicks: number;
}

interface CampaignValidation {
  campaign_id: string;
  campaign_name: string;
  channel_type: string | null;
  status: string | null;
  role: "pmax" | "brand_search" | "bransjer" | "other";
  current: CampaignWindow & { brand_share_pct: number; roas: number };
  previous: CampaignWindow & { brand_share_pct: number; roas: number };
  delta_pct: { cost: number; brand_share_pct: number; real_purchase_value: number; roas: number };
  story: string;
}

export interface WeeklyValidationResponse {
  period: { current: { from: string; to: string }; previous: { from: string; to: string } };
  campaigns: CampaignValidation[];
  generated_at: string;
}

function classifyRole(name: string): CampaignValidation["role"] {
  const n = name.toLowerCase();
  if (n.includes("brand") && n.includes("fosen")) return "brand_search";
  if (n.includes("performance max") || n.includes("general") || n.startsWith("fosen tools -")) return "pmax";
  if (n.includes("bransje")) return "bransjer";
  return "other";
}

function deltaPct(c: number, p: number): number {
  if (p === 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 1000) / 10;
}

async function aggregateWindow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  to: string
): Promise<Map<string, CampaignWindow & { name: string; channel_type: string | null; status: string | null }>> {
  const map = new Map<string, CampaignWindow & { name: string; channel_type: string | null; status: string | null }>();

  const { data: camps } = await supabase
    .from("google_ads_campaigns")
    .select("campaign_id, campaign_name, channel_type, status, cost_nok, clicks, impressions")
    .gte("metric_date", from)
    .lte("metric_date", to);

  for (const r of camps ?? []) {
    const ex = map.get(r.campaign_id) ?? {
      name: r.campaign_name,
      channel_type: r.channel_type,
      status: r.status,
      cost: 0,
      clicks: 0,
      impressions: 0,
      real_purchases: 0,
      real_purchase_value: 0,
      real_leads: 0,
      brand_clicks: 0,
      total_term_clicks: 0,
    };
    ex.cost += Number(r.cost_nok) || 0;
    ex.clicks += Number(r.clicks) || 0;
    ex.impressions += Number(r.impressions) || 0;
    ex.status = r.status; // siste status
    map.set(r.campaign_id, ex);
  }

  const { data: convs } = await supabase
    .from("google_ads_conversions")
    .select("campaign_id, conversion_action_name, all_conversions, all_conversions_value")
    .gte("metric_date", from)
    .lte("metric_date", to);

  for (const r of convs ?? []) {
    const ex = map.get(r.campaign_id);
    if (!ex) continue;
    const name = (r.conversion_action_name as string).toLowerCase();
    if (name.includes("purchase")) {
      ex.real_purchases += Number(r.all_conversions) || 0;
      ex.real_purchase_value += Number(r.all_conversions_value) || 0;
    } else if (name.includes("form_submit") || name.includes("kontakt")) {
      // begin_checkout = kjøpsintensjon (påbegynt kasse), ikke en ekte lead
      ex.real_leads += Number(r.all_conversions) || 0;
    }
  }

  // VIKTIG: bare hent SEARCH-terms (ikke Pmax-snapshots — se kommentar øverst).
  // For Pmax aggregerer vi via Google Ads API live i fetchPmaxBrandShare().
  const { data: terms } = await supabase
    .from("google_ads_search_terms")
    .select("campaign_id, search_term, clicks")
    .eq("source", "search_term")
    .gte("metric_date", from)
    .lte("metric_date", to);

  for (const r of terms ?? []) {
    const ex = map.get(r.campaign_id);
    if (!ex) continue;
    const clicks = Number(r.clicks) || 0;
    ex.total_term_clicks += clicks;
    if (isBrandTerm(r.search_term as string)) ex.brand_clicks += clicks;
  }

  return map;
}

/**
 * Henter Pmax brand-share live fra Google Ads API for et eksakt vindu.
 * Pmax-snapshots i `google_ads_search_terms` lagres med snapshot-dato som
 * metric_date og inneholder akkumulerte 90d-tall — derfor ubrukelige for
 * uke-over-uke-sammenligning. Live-call gir oss det reelle 7d-bildet.
 *
 * Returnerer null hvis API-en feiler (graceful degradation — UI viser bare
 * kostnad-deltaen, ikke brand-share).
 */
async function fetchPmaxBrandShare(
  pmaxCampaignIds: string[],
  from: string,
  to: string
): Promise<Map<string, { brand_clicks: number; total_term_clicks: number }> | null> {
  if (pmaxCampaignIds.length === 0) return new Map();
  try {
    const ads = new GoogleAdsService();
    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);
    const rows = await ads.fetchPmaxSearchTerms(pmaxCampaignIds, fromDate, toDate);
    const out = new Map<string, { brand_clicks: number; total_term_clicks: number }>();
    for (const r of rows) {
      const ex = out.get(r.campaign_id) ?? { brand_clicks: 0, total_term_clicks: 0 };
      ex.total_term_clicks += r.clicks;
      if (isBrandTerm(r.search_term)) ex.brand_clicks += r.clicks;
      out.set(r.campaign_id, ex);
    }
    return out;
  } catch (err) {
    console.error("fetchPmaxBrandShare failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

function buildStory(role: CampaignValidation["role"], curr: CampaignValidation["current"], prev: CampaignValidation["previous"], status: string | null): string {
  if (role === "brand_search") {
    if (curr.cost === 0 && curr.clicks === 0) {
      return status === "ENABLED"
        ? "Aktiv, men ingen klikk siste uke. Sjekk om Google har godkjent annonsen."
        : "Ikke aktiv ennå — venter på godkjenning eller pauset.";
    }
    return `Første tall er inne: ${curr.clicks} klikk, ${curr.cost.toFixed(0)} NOK brukt. CPC ${curr.clicks > 0 ? (curr.cost / curr.clicks).toFixed(1) : "—"} NOK.`;
  }
  if (role === "pmax") {
    const bsDelta = curr.brand_share_pct - prev.brand_share_pct;
    if (Math.abs(bsDelta) < 1) return `Brand-andel uendret på ${curr.brand_share_pct.toFixed(1)}%.`;
    if (bsDelta < -3) return `Brand-andel falt fra ${prev.brand_share_pct.toFixed(1)}% til ${curr.brand_share_pct.toFixed(1)}% — brand exclusions virker.`;
    if (bsDelta < 0) return `Brand-andel litt ned (${prev.brand_share_pct.toFixed(1)}% → ${curr.brand_share_pct.toFixed(1)}%) — på vei i riktig retning.`;
    return `Brand-andel ØKTE fra ${prev.brand_share_pct.toFixed(1)}% til ${curr.brand_share_pct.toFixed(1)}% — undersøk om brand exclusions er aktiv.`;
  }
  if (role === "bransjer") {
    const costDelta = deltaPct(curr.cost, prev.cost);
    if (curr.real_purchases === 0 && curr.real_leads === 0) {
      return `${curr.cost.toFixed(0)} NOK brukt, fortsatt 0 leads/kjøp. Kostnad ${costDelta > 0 ? "+" : ""}${costDelta}% vs forrige uke.`;
    }
    return `${curr.cost.toFixed(0)} NOK brukt, ${curr.real_leads} leads, ${curr.real_purchases} kjøp. Kostnad ${costDelta > 0 ? "+" : ""}${costDelta}% vs forrige uke.`;
  }
  return "";
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const sp = request.nextUrl.searchParams;
  const to = sp.get("to") ?? new Date().toISOString().slice(0, 10);
  const from = sp.get("from") ?? new Date(new Date(to).getTime() - 6 * 86400000).toISOString().slice(0, 10);
  const prevTo = new Date(new Date(from).getTime() - 86400000).toISOString().slice(0, 10);
  const prevFrom = new Date(new Date(prevTo).getTime() - 6 * 86400000).toISOString().slice(0, 10);

  try {
    const [curr, prev] = await Promise.all([
      aggregateWindow(supabase, from, to),
      aggregateWindow(supabase, prevFrom, prevTo),
    ]);

    // Identifiser Pmax-kampanjer som finnes i ett av vinduene, og hent
    // ekte brand-share fra Google Ads live API. Erstatter de feilaktige
    // total_term_clicks/brand_clicks som ble lest fra Supabase-snapshots.
    const pmaxIds = new Set<string>();
    for (const [id, meta] of curr) if (meta.channel_type === PMAX_CHANNEL_TYPE) pmaxIds.add(id);
    for (const [id, meta] of prev) if (meta.channel_type === PMAX_CHANNEL_TYPE) pmaxIds.add(id);

    const pmaxIdList = [...pmaxIds];
    const [pmaxCurr, pmaxPrev] = await Promise.all([
      fetchPmaxBrandShare(pmaxIdList, from, to),
      fetchPmaxBrandShare(pmaxIdList, prevFrom, prevTo),
    ]);

    for (const id of pmaxIds) {
      const c = curr.get(id);
      const p = prev.get(id);
      const pcLive = pmaxCurr?.get(id);
      const ppLive = pmaxPrev?.get(id);
      if (c) {
        c.brand_clicks = pcLive?.brand_clicks ?? 0;
        c.total_term_clicks = pcLive?.total_term_clicks ?? 0;
      }
      if (p) {
        p.brand_clicks = ppLive?.brand_clicks ?? 0;
        p.total_term_clicks = ppLive?.total_term_clicks ?? 0;
      }
    }

    const allIds = new Set([...curr.keys(), ...prev.keys()]);
    const empty: CampaignWindow = {
      cost: 0,
      clicks: 0,
      impressions: 0,
      real_purchases: 0,
      real_purchase_value: 0,
      real_leads: 0,
      brand_clicks: 0,
      total_term_clicks: 0,
    };

    const all: CampaignValidation[] = [];
    for (const id of allIds) {
      const c = curr.get(id);
      const p = prev.get(id);
      const meta = c ?? p!;
      const role = classifyRole(meta.name);
      if (role === "other") continue;

      const cw = c ?? { ...empty };
      const pw = p ?? { ...empty };

      const cBrandShare = cw.total_term_clicks > 0 ? (cw.brand_clicks / cw.total_term_clicks) * 100 : 0;
      const pBrandShare = pw.total_term_clicks > 0 ? (pw.brand_clicks / pw.total_term_clicks) * 100 : 0;
      const cRoas = cw.cost > 0 ? cw.real_purchase_value / cw.cost : 0;
      const pRoas = pw.cost > 0 ? pw.real_purchase_value / pw.cost : 0;

      const current = { ...cw, brand_share_pct: Math.round(cBrandShare * 10) / 10, roas: Math.round(cRoas * 100) / 100 };
      const previous = { ...pw, brand_share_pct: Math.round(pBrandShare * 10) / 10, roas: Math.round(pRoas * 100) / 100 };

      all.push({
        campaign_id: id,
        campaign_name: meta.name,
        channel_type: meta.channel_type,
        status: meta.status,
        role,
        current,
        previous,
        delta_pct: {
          cost: deltaPct(cw.cost, pw.cost),
          brand_share_pct: Math.round((cBrandShare - pBrandShare) * 10) / 10,
          real_purchase_value: deltaPct(cw.real_purchase_value, pw.real_purchase_value),
          roas: deltaPct(cRoas, pRoas),
        },
        story: buildStory(role, current, previous, meta.status),
      });
    }

    const order: CampaignValidation["role"][] = ["pmax", "brand_search", "bransjer"];
    all.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));

    const res: WeeklyValidationResponse = {
      period: { current: { from, to }, previous: { from: prevFrom, to: prevTo } },
      campaigns: all,
      generated_at: new Date().toISOString(),
    };
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
