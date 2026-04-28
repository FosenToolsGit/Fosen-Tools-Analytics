import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; title?: string; doc?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!body.doc || typeof body.doc !== "object") {
    return NextResponse.json({ error: "doc is required" }, { status: 400 });
  }

  if (body.id) {
    const { data, error } = await supabase
      .from("brochures")
      .update({ title, doc: body.doc })
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select("id, updated_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message, details: error.details, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }
    return NextResponse.json({ id: data.id, updated_at: data.updated_at });
  }

  const { data, error } = await supabase
    .from("brochures")
    .insert({ user_id: user.id, title, doc: body.doc })
    .select("id, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message, details: error.details, hint: error.hint, code: error.code },
      { status: 500 }
    );
  }
  return NextResponse.json({ id: data.id, updated_at: data.updated_at });
}
