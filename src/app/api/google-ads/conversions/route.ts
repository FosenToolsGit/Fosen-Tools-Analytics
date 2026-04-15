import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface Row {
  campaign_id: string;
  campaign_name: string | null;
  conversion_action_name: string;
  metric_date: string;
  conversions: number;
  conversions_value: number;
  all_conversions: number;
  all_conversions_value: number;
}

export interface ConversionAggregate {
  campaign_id: string;
  campaign_name: string | null;
  conversion_action_name: string;
  conversions: number;
  conversions_value: number;
  all_conversions: number;
  all_conversions_value: number;
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
  const campaignId = searchParams.get("campaign_id");
  if (!from || !to) {
    return NextResponse.json(
      { error: "Missing from/to parameters" },
      { status: 400 }
    );
  }

  const allRows: Row[] = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    let q = supabase
      .from("google_ads_conversions")
      .select("*")
      .gte("metric_date", from)
      .lte("metric_date", to)
      .range(offset, offset + pageSize - 1);
    if (campaignId) q = q.eq("campaign_id", campaignId);

    const { data, error } = await q;
    if (error) {
      if (/relation .* does not exist/i.test(error.message)) {
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data || data.length === 0) break;
    allRows.push(...(data as Row[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  // Aggregere per (campaign_id, conversion_action_name)
  const map = new Map<string, ConversionAggregate>();
  for (const row of allRows) {
    const key = `${row.campaign_id}|${row.conversion_action_name}`;
    const existing = map.get(key);
    if (existing) {
      existing.conversions += Number(row.conversions);
      existing.conversions_value += Number(row.conversions_value);
      existing.all_conversions += Number(row.all_conversions);
      existing.all_conversions_value += Number(row.all_conversions_value);
    } else {
      map.set(key, {
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        conversion_action_name: row.conversion_action_name,
        conversions: Number(row.conversions),
        conversions_value: Number(row.conversions_value),
        all_conversions: Number(row.all_conversions),
        all_conversions_value: Number(row.all_conversions_value),
      });
    }
  }

  const result = Array.from(map.values()).sort(
    (a, b) => b.all_conversions - a.all_conversions
  );

  return NextResponse.json(result);
}
