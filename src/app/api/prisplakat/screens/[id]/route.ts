import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

// Oppdater (navn / tilordnet spilleliste) + slett en skjerm (auth).

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("pricetag_screens").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
