import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  // Alle innloggede team-medlemmer kan lese hvilken som helst playlist
  // (RLS i migrasjon 013 håndhever dette). Ingen user_id-filter her,
  // ellers feiler delelink-flyten for Erik/Torstein/Brit.
  const { data, error } = await supabase
    .from("pricetag_playlists")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Prisplakat ikke funnet" }, { status: 404 });
  return NextResponse.json({ playlist: data });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const { error } = await supabase
    .from("pricetag_playlists")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
