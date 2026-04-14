import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import type { RuleMatchMode, TaggableEntity } from "@/lib/types/tags";

const VALID_TYPES: TaggableEntity[] = ["keyword", "post", "campaign", "source"];
const VALID_MODES: RuleMatchMode[] = ["contains", "equals", "starts_with", "regex"];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tagId = request.nextUrl.searchParams.get("tag_id");
  let query = supabase.from("tag_rules").select("*").order("created_at", { ascending: true });
  if (tagId) query = query.eq("tag_id", tagId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { tag_id, entity_type, pattern, mode, case_sensitive } = body;

  if (!tag_id || !entity_type || !pattern) {
    return NextResponse.json(
      { error: "Missing tag_id, entity_type or pattern" },
      { status: 400 }
    );
  }
  if (!VALID_TYPES.includes(entity_type)) {
    return NextResponse.json({ error: "Invalid entity_type" }, { status: 400 });
  }
  if (mode && !VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("tag_rules")
    .insert({
      tag_id,
      entity_type,
      pattern: pattern.trim(),
      mode: mode || "contains",
      case_sensitive: !!case_sensitive,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const adminClient = createAdminClient();
  // Slett auto-assignments som denne regelen opprettet
  await adminClient.from("tag_assignments").delete().eq("rule_id", id).eq("auto", true);
  const { error } = await adminClient.from("tag_rules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
