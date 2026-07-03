import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";

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
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

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
