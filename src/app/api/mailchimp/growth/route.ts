import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
