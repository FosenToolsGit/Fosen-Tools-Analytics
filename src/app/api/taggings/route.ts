import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import type { TaggableEntity } from "@/lib/types/tags";

const VALID_TYPES: TaggableEntity[] = ["keyword", "post", "campaign", "source"];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const entityType = params.get("entity_type") as TaggableEntity | null;
  const tagId = params.get("tag_id");

  let query = supabase.from("tag_assignments").select("*, tag:tags(*)");
  if (entityType) {
    if (!VALID_TYPES.includes(entityType)) {
      return NextResponse.json({ error: "Invalid entity_type" }, { status: 400 });
    }
    query = query.eq("entity_type", entityType);
  }
  if (tagId) query = query.eq("tag_id", tagId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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
  const { tag_id, entity_type } = body;
  // St\u00f8tte b\u00e5de enkel (entity_key) og batch (entity_keys: string[])
  const keys: string[] = Array.isArray(body.entity_keys)
    ? body.entity_keys
    : body.entity_key
      ? [body.entity_key]
      : [];

  if (!tag_id || !entity_type || keys.length === 0) {
    return NextResponse.json(
      { error: "Missing tag_id, entity_type or entity_key(s)" },
      { status: 400 }
    );
  }
  if (!VALID_TYPES.includes(entity_type)) {
    return NextResponse.json({ error: "Invalid entity_type" }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const rows = keys.map((entity_key) => ({ tag_id, entity_type, entity_key }));
  const { data, error } = await adminClient
    .from("tag_assignments")
    .upsert(rows, { onConflict: "tag_id,entity_type,entity_key" })
    .select("*, tag:tags(*)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Behold bakoverkompatibilitet: enkelt-kall returnerer ett objekt
  if (keys.length === 1 && data) {
    return NextResponse.json(data[0] ?? null);
  }
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

  const params = request.nextUrl.searchParams;
  const id = params.get("id");
  const tagId = params.get("tag_id");
  const entityType = params.get("entity_type");
  const entityKey = params.get("entity_key");

  const adminClient = createAdminClient();
  let query = adminClient.from("tag_assignments").delete();

  if (id) {
    query = query.eq("id", id);
  } else if (tagId && entityType && entityKey) {
    query = query
      .eq("tag_id", tagId)
      .eq("entity_type", entityType)
      .eq("entity_key", entityKey);
  } else {
    return NextResponse.json(
      { error: "Provide id or (tag_id, entity_type, entity_key)" },
      { status: 400 }
    );
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
