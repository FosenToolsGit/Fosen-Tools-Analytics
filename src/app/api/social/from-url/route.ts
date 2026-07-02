import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import {
  generateDraft,
  buildDraftInputFromUrl,
  type TopicKind,
  type Archetype,
} from "@/lib/services/social-engine";

/**
 * POST /api/social/from-url
 * Body: { url, topic_kind?, archetype?, brief? }
 *
 * Scraper fosen-tools.no-URL, henter produktdata, generér caption + bilde.
 * Lagrer som draft.
 */

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const body = (await request.json()) as {
    url: string;
    topic_kind?: TopicKind;
    archetype?: Archetype;
    brief?: string;
    style?: string | null;
  };

  if (!body.url) {
    return NextResponse.json({ error: "url påkrevd" }, { status: 400 });
  }

  try {
    const draftInput = await buildDraftInputFromUrl(body.url, {
      topic_kind: body.topic_kind,
      archetype: body.archetype,
      brief: body.brief,
      user_id: user.id,
      style: body.style ?? null,
    });

    const result = await generateDraft(supabase, draftInput);

    const { data: inserted, error: insErr } = await supabase
      .from("social_drafts")
      .insert({
        topic_kind: draftInput.topic_kind,
        archetype: draftInput.archetype,
        title: draftInput.title,
        brief: draftInput.brief ?? null,
        source_url: draftInput.source_url,
        source_data: {
          ...(draftInput.source_data ?? {}),
          ...(body.style ? { _style: body.style } : {}),
        },
        user_photos: draftInput.user_photos ?? [],
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
