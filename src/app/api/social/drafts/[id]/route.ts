import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
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
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

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
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

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

      // Operatør kan overstyre image-tekstene før regenerering (manual fix av
      // Nano Banana-inkonsistens). Vi flettes inn i existing.captions så
      // generateDraft bygger image-prompt med våre overrides.
      const overrides = (body as { overrides?: Record<string, string> })
        .overrides;
      const captionsWithOverrides = overrides
        ? {
            ...(existing.captions as Record<string, unknown>),
            ...Object.fromEntries(
              Object.entries(overrides).filter(([, v]) => v && v.trim())
            ),
          }
        : (existing.captions as Record<string, unknown>);

      // Bygg en GenerateDraftInput som bypasser caption-gen ved å sende
      // skip_image: false + brief-fra-overrides for å gi LLM rett kontekst.
      // Vi kan ikke bypasse caption-gen helt i generateDraft, men vi kan
      // gjøre image-only regen ved å bygge image-prompten direkte her.
      // Enklere: send overrides som brief til generateDraft og la den re-gen.
      // ENDA enklere: bypass generateDraft, kall buildImagePrompt + generateImage direkte.
      const { buildImagePrompt, saveBase64ImageToStorage } = await import(
        "@/lib/services/social-engine"
      );
      const { approvedRefsFor, fetchImageAsRef } = await import(
        "@/lib/services/brand-assets"
      );
      const { generateImage } = await import("@/lib/services/gemini");
      const { getOrCreateImageBrandCache } = await import(
        "@/lib/services/gemini-cache"
      );
      const {
        compositeFosenToolsWordmark,
        wordmarkVariantForBg,
      } = await import("@/lib/services/composite-wordmark");

      const cap = captionsWithOverrides as {
        image_headline?: string;
        image_headline_red_word?: string;
        image_subtagline?: string;
        image_body?: string;
        image_kontrast_left_label?: string;
        image_kontrast_right_label?: string;
      };

      const heroText =
        cap.image_headline?.trim() || existing.brief || existing.title;
      const { prompt: imgPrompt, aspectRatio } = buildImagePrompt(
        existing.archetype,
        {
          title: existing.title,
          statement: existing.brief,
          hero_text: heroText,
          eyebrow:
            existing.archetype === "definisjon" ? "substantiv" : undefined,
          style: persistedStyle,
          red_word: cap.image_headline_red_word?.trim() || null,
          subtagline: cap.image_subtagline?.trim() || null,
          body: cap.image_body?.trim() || null,
          kontrast_left: cap.image_kontrast_left_label?.trim() || null,
          kontrast_right: cap.image_kontrast_right_label?.trim() || null,
        }
      );

      if (!imgPrompt) {
        return NextResponse.json(
          { error: "Image-prompt tom (foto-archetype hopper over AI-gen)" },
          { status: 400 }
        );
      }

      const refs = approvedRefsFor(existing.archetype, {
        style: persistedStyle,
      });

      const scraped = existing.source_data as { image_url?: string } | null;
      if (scraped?.image_url) {
        const productRef = await fetchImageAsRef(
          scraped.image_url,
          "PRODUCT REFERENCE: scraped product photo."
        );
        if (productRef) refs.push(productRef);
      }

      let brandCacheName: string | null = null;
      try {
        brandCacheName = await getOrCreateImageBrandCache();
      } catch {
        // ignore
      }

      const imgResult = await generateImage({
        prompt: imgPrompt,
        aspectRatio,
        referenceImages: refs,
        cachedContent: brandCacheName,
      });

      const bgType: "red" | "ink" | "cream" =
        existing.archetype === "definisjon"
          ? "cream"
          : existing.archetype === "sertifikat" ||
              existing.archetype === "sitat"
            ? "ink"
            : "red";

      const aiImages = [];
      for (const img of imgResult.images) {
        let processed = { base64: img.base64, mimeType: img.mimeType };
        try {
          processed = await compositeFosenToolsWordmark(
            img.base64,
            img.mimeType,
            { variant: wordmarkVariantForBg(bgType) }
          );
        } catch {
          // ignore
        }
        const saved = await saveBase64ImageToStorage(
          supabase,
          processed.base64,
          processed.mimeType,
          user.id,
          `${existing.topic_kind}-${existing.archetype}`
        );
        aiImages.push({
          storage_path: saved.storage_path,
          public_url: saved.public_url,
          archetype: existing.archetype,
          prompt: imgPrompt,
        });
      }

      const { data: updated, error: updErr } = await supabase
        .from("social_drafts")
        .update({
          ai_images: aiImages,
          captions: captionsWithOverrides,
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
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { error } = await supabase.from("social_drafts").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
