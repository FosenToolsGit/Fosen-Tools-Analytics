import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

/**
 * Aggregert konverterings-snapshot siste 7d vs forrige 7d.
 * Skiller purchase fra leads og rapporterer ekte verdi (all_conversions_value)
 * istedenfor primary value som kan være frosset av Google på historisk data.
 */

interface ConversionWindow {
  purchases: number;
  purchase_value: number;
  /** begin_checkout — folk som har startet på kassen men ikke fullført.
   *  Vises ved siden av purchases for å fange opp lekkasje i checkout-flyten. */
  intent_count: number;
  intent_value: number;
  leads: number;
  cost: number;
  roas: number;
  cpa: number | null;
  cost_per_lead: number | null;
}

export interface ConversionsWeekResponse {
  period: { current: { from: string; to: string }; previous: { from: string; to: string } };
  current: ConversionWindow;
  previous: ConversionWindow;
  delta_pct: {
    purchases: number;
    purchase_value: number;
    intent_value: number;
    leads: number;
    cost: number;
    roas: number;
  };
  generated_at: string;
}

function deltaPct(c: number, p: number): number {
  if (p === 0) return c > 0 ? 100 : 0;
  return Math.round(((c - p) / p) * 1000) / 10;
}

async function aggregateWindow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  to: string
): Promise<ConversionWindow> {
  const [{ data: camps }, { data: convs }] = await Promise.all([
    supabase
      .from("google_ads_campaigns")
      .select("cost_nok")
      .gte("metric_date", from)
      .lte("metric_date", to),
    supabase
      .from("google_ads_conversions")
      .select("conversion_action_name, all_conversions, all_conversions_value")
      .gte("metric_date", from)
      .lte("metric_date", to),
  ]);

  const cost = (camps ?? []).reduce((s, r) => s + (Number(r.cost_nok) || 0), 0);
  let purchases = 0;
  let purchaseValue = 0;
  let intentCount = 0;
  let intentValue = 0;
  let leads = 0;

  for (const r of convs ?? []) {
    const name = (r.conversion_action_name as string).toLowerCase();
    if (name.includes("purchase")) {
      purchases += Number(r.all_conversions) || 0;
      purchaseValue += Number(r.all_conversions_value) || 0;
    } else if (name.includes("begin_checkout")) {
      // begin_checkout = kjøps-intent. Skiller fra leads så vi fanger
      // checkout-lekkasje (mange begin_checkout, få purchase = noe brister
      // i kassen eller GA4 purchase-event fyrer ikke).
      intentCount += Number(r.all_conversions) || 0;
      intentValue += Number(r.all_conversions_value) || 0;
    } else if (name.includes("form_submit") || name.includes("kontakt")) {
      leads += Number(r.all_conversions) || 0;
    }
  }

  const roas = cost > 0 ? Math.round((purchaseValue / cost) * 100) / 100 : 0;
  const cpa = purchases > 0 ? Math.round(cost / purchases) : null;
  const costPerLead = leads > 0 ? Math.round(cost / leads) : null;

  return {
    purchases: Math.round(purchases * 10) / 10,
    purchase_value: Math.round(purchaseValue),
    intent_count: Math.round(intentCount * 10) / 10,
    intent_value: Math.round(intentValue),
    leads: Math.round(leads * 10) / 10,
    cost: Math.round(cost),
    roas,
    cpa,
    cost_per_lead: costPerLead,
  };
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
    const [current, previous] = await Promise.all([
      aggregateWindow(supabase, from, to),
      aggregateWindow(supabase, prevFrom, prevTo),
    ]);

    const res: ConversionsWeekResponse = {
      period: { current: { from, to }, previous: { from: prevFrom, to: prevTo } },
      current,
      previous,
      delta_pct: {
        purchases: deltaPct(current.purchases, previous.purchases),
        purchase_value: deltaPct(current.purchase_value, previous.purchase_value),
        intent_value: deltaPct(current.intent_value, previous.intent_value),
        leads: deltaPct(current.leads, previous.leads),
        cost: deltaPct(current.cost, previous.cost),
        roas: deltaPct(current.roas, previous.roas),
      },
      generated_at: new Date().toISOString(),
    };
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
