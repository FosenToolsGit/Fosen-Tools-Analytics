import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("pricetag_playlists")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
