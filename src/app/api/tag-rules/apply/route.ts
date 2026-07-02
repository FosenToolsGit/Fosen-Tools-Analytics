import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { applyTagRules } from "@/lib/services/tag-rules-engine";

export async function POST() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await applyTagRules(createAdminClient());
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
