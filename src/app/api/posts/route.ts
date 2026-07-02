import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const searchParams = request.nextUrl.searchParams;
  const platform = searchParams.get("platform");
  const limit = parseInt(searchParams.get("limit") || "20");

  let query = supabase
    .from("platform_posts")
    .select("*")
    .order("impressions", { ascending: false })
    .limit(limit);

  if (platform) {
    query = query.eq("platform", platform);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
