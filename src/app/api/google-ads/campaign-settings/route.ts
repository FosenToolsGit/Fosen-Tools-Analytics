import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

export type BusinessModel = "purchase" | "leads" | "mixed";

export interface CampaignSetting {
  campaign_id: string;
  business_model: BusinessModel;
  estimated_lead_value_nok: number;
  notes: string | null;
  updated_at: string;
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
    .from("google_ads_campaign_settings")
    .select("*");

  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

interface PostBody {
  campaign_id: string;
  business_model: BusinessModel;
  estimated_lead_value_nok: number;
  notes?: string | null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.campaign_id) {
    return NextResponse.json(
      { error: "Missing campaign_id" },
      { status: 400 }
    );
  }
  if (!["purchase", "leads", "mixed"].includes(body.business_model)) {
    return NextResponse.json(
      { error: "Invalid business_model" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("google_ads_campaign_settings")
    .upsert(
      {
        campaign_id: body.campaign_id,
        business_model: body.business_model,
        estimated_lead_value_nok: Number(body.estimated_lead_value_nok) || 0,
        notes: body.notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "campaign_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
