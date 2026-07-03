import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

// Oppdater (navn / tilordnet spilleliste) + slett en skjerm (auth).

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const body = await req.json().catch(() => ({}));
  const patch: { name?: string; playlist_id?: string | null } = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if ("playlist_id" in body) patch.playlist_id = body.playlist_id ?? null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Ingenting å oppdatere" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("pricetag_screens")
    .update(patch)
    .eq("id", id)
    .select("id, name, screen_token, playlist_id, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ screen: data });
}

// Force-refresh: bumper updated_at på skjermens spilleliste. Live-skjermer som
// poller /version (hvert 30s) oppdager endringen og reloader seg selv — så man
// slipper å gå inn på UniFi.
export async function POST(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { data: screen, error: sErr } = await supabase
    .from("pricetag_screens")
    .select("playlist_id")
    .eq("id", id)
    .single();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!screen?.playlist_id) {
    return NextResponse.json({ error: "Skjermen har ingen spilleliste" }, { status: 400 });
  }

  const { error } = await supabase
    .from("pricetag_playlists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", screen.playlist_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { error } = await supabase.from("pricetag_screens").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
