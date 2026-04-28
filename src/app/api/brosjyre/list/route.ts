import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface BrochureRow {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
  doc: { pages?: unknown[] } | null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("brochures")
    .select("id, title, updated_at, created_at, doc")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message, details: error.details, hint: error.hint, code: error.code },
      { status: 500 }
    );
  }

  const brochures = (data as BrochureRow[] | null ?? []).map(b => ({
    id: b.id,
    title: b.title,
    updated_at: b.updated_at,
    created_at: b.created_at,
    page_count: Array.isArray(b.doc?.pages) ? b.doc!.pages!.length : 0,
  }));

  return NextResponse.json({ brochures });
}
