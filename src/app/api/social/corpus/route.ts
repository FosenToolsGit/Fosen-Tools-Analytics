import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET  /api/social/corpus       — list alle corpus-entries (filterbart på kind)
 * POST /api/social/corpus       — upsert corpus-entry
 */

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const kind = sp.get("kind");
  const onlyActive = sp.get("active") !== "false";

  let query = supabase
    .from("social_corpus")
    .select("*")
    .order("kind", { ascending: true })
    .order("slug", { ascending: true });

  if (kind) query = query.eq("kind", kind);
  if (onlyActive) query = query.eq("active", true);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { kind, slug, title, content, metadata, active } = body;

  if (!kind || !slug || !title || !content) {
    return NextResponse.json(
      { error: "kind, slug, title, content er påkrevd" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("social_corpus")
    .upsert(
      {
        kind,
        slug,
        title,
        content,
        metadata: metadata ?? {},
        active: active ?? true,
        user_id: user.id,
      },
      { onConflict: "kind,slug" }
    )
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}
