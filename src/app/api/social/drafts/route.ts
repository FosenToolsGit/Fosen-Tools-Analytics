import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import {
  generateDraft,
  type GenerateDraftInput,
  type TopicKind,
  type Archetype,
} from "@/lib/services/social-engine";

/**
 * GET  /api/social/drafts     — liste drafts (filterbart på status)
 * POST /api/social/drafts     — generér ny draft fra topic-input (manuell eller URL-pull)
 */

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status");
  const limit = Math.min(Number(sp.get("limit") ?? 50), 200);

  let query = supabase
    .from("social_drafts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ drafts: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as Partial<GenerateDraftInput> & {
    topic_kind: TopicKind;
    archetype: Archetype;
    title: string;
  };

  if (!body.topic_kind || !body.archetype || !body.title) {
    return NextResponse.json(
      { error: "topic_kind, archetype og title er påkrevd" },
      { status: 400 }
    );
  }

  try {
    const result = await generateDraft(supabase, {
      topic_kind: body.topic_kind,
      archetype: body.archetype,
      title: body.title,
      brief: body.brief,
      source_url: body.source_url ?? null,
      source_data: body.source_data ?? null,
      user_photos: body.user_photos ?? [],
      user_id: user.id,
      skip_image: body.skip_image,
      style: body.style ?? null,
    });

    const { data: inserted, error: insErr } = await supabase
      .from("social_drafts")
      .insert({
        topic_kind: body.topic_kind,
        archetype: body.archetype,
        title: body.title,
        brief: body.brief ?? null,
        source_url: body.source_url ?? null,
        source_data: {
          ...(body.source_data ?? {}),
          ...(body.style ? { _style: body.style } : {}),
        },
        user_photos: body.user_photos ?? [],
        captions: result.captions,
        ai_images: result.ai_images,
        status: "draft",
        model_used: result.model_used,
        generation_cost: result.generation_cost_estimate,
        user_id: user.id,
      })
      .select()
      .single();

    if (insErr)
      return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({ draft: inserted });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
