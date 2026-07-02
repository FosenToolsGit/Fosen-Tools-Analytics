import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("pricetag_playlists")
    .select("id, title, format, products, settings, share_token, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlists: data ?? [] });
}
