import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

// Liste + opprett navngitte skjermer (auth). Team-wide via RLS.

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("pricetag_screens")
    .select("id, name, screen_token, playlist_id, updated_at")
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ screens: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Navn mangler" }, { status: 400 });

  const { data, error } = await supabase
    .from("pricetag_screens")
    .insert({ name, user_id: user.id, playlist_id: body.playlist_id ?? null })
    .select("id, name, screen_token, playlist_id, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ screen: data });
}
