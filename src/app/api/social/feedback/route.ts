import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

/**
 * GET  /api/social/feedback   — list (siste 100)
 * POST /api/social/feedback   — opprett manual_rule eller annen entry
 *
 * Brukes typisk via draft-actions (reject/edit), men manuelle regler
 * (kind=manual_rule) kan også opprettes her direkte.
 */

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const sp = request.nextUrl.searchParams;
  const kind = sp.get("kind");
  const limit = Math.min(Number(sp.get("limit") ?? 100), 500);

  let query = supabase
    .from("social_feedback")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (kind) query = query.eq("kind", kind);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ feedback: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const body = await request.json();
  const { kind, draft_id, platform, before_text, after_text, reason, metadata } =
    body;

  if (!kind || !reason) {
    return NextResponse.json(
      { error: "kind og reason er påkrevd" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("social_feedback")
    .insert({
      kind,
      draft_id: draft_id ?? null,
      platform: platform ?? null,
      before_text: before_text ?? null,
      after_text: after_text ?? null,
      reason,
      metadata: metadata ?? {},
      user_id: user.id,
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}
