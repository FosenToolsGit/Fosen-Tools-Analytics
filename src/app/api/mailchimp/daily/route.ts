import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

export interface MailchimpDailyRow {
  metric_date: string;
  emails_sent: number;
  unique_opens: number;
  recipient_clicks: number;
  hard_bounce: number;
  soft_bounce: number;
  unsubs: number;
  subs: number;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const days = Math.min(
    parseInt(request.nextUrl.searchParams.get("days") || "90", 10) || 90,
    365
  );
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("mailchimp_list_daily")
    .select("*")
    .gte("metric_date", since.toISOString().split("T")[0])
    .order("metric_date", { ascending: true });

  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
