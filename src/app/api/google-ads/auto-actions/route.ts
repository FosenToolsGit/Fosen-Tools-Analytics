import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export interface AutoActionRow {
  id: number;
  action_type: string;
  target_resource: string | null;
  payload: Record<string, unknown>;
  status: "pending" | "applied" | "failed" | "reverted";
  applied_by: string | null;
  applied_at: string | null;
  reverted_at: string | null;
  error_message: string | null;
  created_at: string;
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
    .from("google_ads_auto_actions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
