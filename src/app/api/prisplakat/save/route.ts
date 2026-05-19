import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { id, title, format, products, settings } = body as {
    id?: string;
    title?: string;
    format?: string;
    products?: unknown;
    settings?: unknown;
  };

  if (!title || typeof title !== "string") {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }
  const validFormats = ["a4_single", "a4_2up", "a4_4up", "slideshow_landscape", "slideshow_portrait"];
  if (format && !validFormats.includes(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const payload = {
    user_id: user.id,
    title,
    format: format ?? "a4_single",
    products: Array.isArray(products) ? products : [],
    settings: settings && typeof settings === "object" ? settings : {},
  };

  if (id) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user_id: _uid, ...updatePayload } = payload;
    const { data, error } = await supabase
      .from("pricetag_playlists")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Playlist not found or not owned by you" }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ playlist: data });
  } else {
    const { data, error } = await supabase
      .from("pricetag_playlists")
      .insert(payload)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ playlist: data });
  }
}
