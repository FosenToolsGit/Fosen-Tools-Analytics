import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";

interface BrochureRow {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
  doc: { pages?: unknown[] } | null;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

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
