import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";

export interface MailchimpGrowthRow {
  metric_date: string;
  existing: number;
  imports: number;
  optins: number;
  unsubs: number;
  cleaned: number;
  net_growth: number;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("mailchimp_list_growth")
    .select("*")
    .order("metric_date", { ascending: true })
    .limit(60);

  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result: MailchimpGrowthRow[] = (data ?? []).map((r) => ({
    metric_date: r.metric_date,
    existing: r.existing,
    imports: r.imports,
    optins: r.optins,
    unsubs: r.unsubs,
    cleaned: r.cleaned,
    net_growth: (r.imports ?? 0) + (r.optins ?? 0) - (r.unsubs ?? 0) - (r.cleaned ?? 0),
  }));

  return NextResponse.json(result);
}
