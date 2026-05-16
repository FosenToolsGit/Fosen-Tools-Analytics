import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { generateDraft } from "@/lib/services/social-engine";

/**
 * GET    /api/social/drafts/[id]    — hent enkelt draft
 * PATCH  /api/social/drafts/[id]    — oppdater status/scheduled_at/captions/posted_links
 * DELETE /api/social/drafts/[id]    — slett (kun eier)
 * Spesielle actions via ?action=... :
 *   - regenerate-captions
 *   - regenerate-image
 *   - mark-posted (body: { platform, post_url? })
 *   - reject (body: { reason, platform? })
 *   - edit (body: { platform, new_caption, reason })
 */

export const maxDuration = 300;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("social_drafts")
    .select("*")
    .eq("id", id)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ draft: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const action = sp.get("action");
  const body = await request.json().catch(() => ({}));

  // Hent eksisterende draft for kontekst på actions
  const { data: existing, error: fetchErr } = await supabase
    .from("social_drafts")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !existing)
    return NextResponse.json({ error: "Draft ikke funnet" }, { status: 404 });

  // === Spesielle actions ===
  if (action === "regenerate-captions") {
    try {
      const result = await generateDraft(supabase, {
        topic_kind: existing.topic_kind,
        archetype: existing.archetype,
        title: existing.title,
        brief: existing.brief,
        source_url: existing.source_url,
        source_data: existing.source_data,
        user_photos: existing.user_photos,
        user_id: user.id,
        skip_image: true, // kun captions, behold gamle bilder
      });

      const { data: updated, error: updErr } = await supabase
        .from("social_drafts")
        .update({
          captions: result.captions,
          model_used: result.model_used,
        })
        .eq("id", id)
        .select()
        .single();
      if (updErr)
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      return NextResponse.json({ draft: updated });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  if (action === "regenerate-image") {
    try {
      const persistedStyle =
        (existing.source_data as { _style?: string } | null)?._style ?? null;
      const result = await generateDraft(supabase, {
        topic_kind: existing.topic_kind,
        archetype: existing.archetype,
        title: existing.title,
        brief: existing.brief,
        source_url: existing.source_url,
        source_data: existing.source_data,
        user_photos: existing.user_photos,
        user_id: user.id,
        style: persistedStyle,
      });
      const { data: updated, error: updErr } = await supabase
        .from("social_drafts")
        .update({
          ai_images: result.ai_images,
        })
        .eq("id", id)
        .select()
        .single();
      if (updErr)
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      return NextResponse.json({ draft: updated });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  if (action === "mark-posted") {
    const { platform, post_url } = body as {
      platform: string;
      post_url?: string;
    };
    if (!platform)
      return NextResponse.json(
        { error: "platform påkrevd" },
        { status: 400 }
      );
    const newLinks = {
      ...(existing.posted_links ?? {}),
      [platform]: post_url ?? true,
    };
    const allPlatforms = ["facebook", "instagram", "linkedin"];
    const allDone = allPlatforms.every((p) => newLinks[p]);
    const { data: updated, error: updErr } = await supabase
      .from("social_drafts")
      .update({
        posted_links: newLinks,
        posted_at: allDone ? new Date().toISOString() : existing.posted_at,
        status: allDone ? "posted" : existing.status,
      })
      .eq("id", id)
      .select()
      .single();
    if (updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ draft: updated });
  }

  if (action === "reject") {
    const { reason, platform } = body as { reason: string; platform?: string };
    if (!reason)
      return NextResponse.json(
        { error: "reason påkrevd" },
        { status: 400 }
      );

    // Capture feedback
    await supabase.from("social_feedback").insert({
      kind: platform ? "rejected_caption" : "rejected_draft",
      draft_id: id,
      platform: platform ?? null,
      before_text: platform
        ? existing.captions?.[platform]?.caption ?? null
        : null,
      reason,
      user_id: user.id,
    });

    // Hvis hele draft avvist → status=rejected. Hvis bare én plattform → behold draft.
    if (!platform) {
      const { data: updated, error: updErr } = await supabase
        .from("social_drafts")
        .update({ status: "rejected" })
        .eq("id", id)
        .select()
        .single();
      if (updErr)
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      return NextResponse.json({ draft: updated });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "edit") {
    const { platform, new_caption, reason } = body as {
      platform: string;
      new_caption: string;
      reason?: string;
    };
    if (!platform || !new_caption) {
      return NextResponse.json(
        { error: "platform + new_caption påkrevd" },
        { status: 400 }
      );
    }
    const before = existing.captions?.[platform]?.caption ?? null;
    const newCaptions = {
      ...(existing.captions ?? {}),
      [platform]: {
        ...(existing.captions?.[platform] ?? {}),
        caption: new_caption,
      },
    };

    await supabase.from("social_feedback").insert({
      kind: "edited_caption",
      draft_id: id,
      platform,
      before_text: before,
      after_text: new_caption,
      reason: reason ?? "Manuell redigering",
      user_id: user.id,
    });

    const { data: updated, error: updErr } = await supabase
      .from("social_drafts")
      .update({ captions: newCaptions })
      .eq("id", id)
      .select()
      .single();
    if (updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    return NextResponse.json({ draft: updated });
  }

  // === Generisk PATCH (status, scheduled_at, etc) ===
  const allowed: Record<string, unknown> = {};
  for (const key of [
    "status",
    "scheduled_at",
    "title",
    "brief",
    "captions",
    "user_photos",
    "ai_images",
  ]) {
    if (key in body) allowed[key] = body[key];
  }
  if (Object.keys(allowed).length === 0)
    return NextResponse.json({ error: "Ingen felter å oppdatere" }, { status: 400 });

  const { data: updated, error: updErr } = await supabase
    .from("social_drafts")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();
  if (updErr)
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  return NextResponse.json({ draft: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("social_drafts").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
