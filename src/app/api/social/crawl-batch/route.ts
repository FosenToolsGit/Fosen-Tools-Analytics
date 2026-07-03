import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import {
  generateDraft,
  buildDraftInputFromUrl,
  type TopicKind,
  type Archetype,
} from "@/lib/services/social-engine";

/**
 * POST /api/social/crawl-batch
 *
 * Tar liste over URLer (typisk fra /api/social/popular-pages), scraper hver
 * parallelt, og genererer caption + bilde for hver som draft i kø.
 *
 * Body: {
 *   urls: string[],
 *   topic_kind?: TopicKind,
 *   archetype?: Archetype,
 *   skip_image?: boolean (default false — bruk true for å spare Gemini-cost)
 * }
 *
 * Returns: { drafts: [...], failed: [{url, error}] }
 */

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const body = (await request.json()) as {
    urls: string[];
    topic_kind?: TopicKind;
    archetype?: Archetype;
    skip_image?: boolean;
    style?: string | null;
  };

  if (!Array.isArray(body.urls) || body.urls.length === 0) {
    return NextResponse.json(
      { error: "urls (array) er påkrevd" },
      { status: 400 }
    );
  }

  // Maks 6 per batch — vi vil ikke vekke Vercel timeout eller treffe rate-limits
  const urls = body.urls.slice(0, 6);
  const topicKind = body.topic_kind ?? "produktlansering";
  const archetype = body.archetype ?? "foto";
  const skipImage = body.skip_image ?? false;

  const drafts: unknown[] = [];
  const failed: Array<{ url: string; error: string }> = [];

  // Kjør sekvensielt for å unngå rate-limit-spikes på Gemini
  for (const url of urls) {
    try {
      const draftInput = await buildDraftInputFromUrl(url, {
        topic_kind: topicKind,
        archetype,
        user_id: user.id,
        style: body.style ?? null,
      });
      // Tving skip_image hvis bruker valgte det (sparer kost)
      if (skipImage) draftInput.skip_image = true;

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

      if (insErr) {
        failed.push({ url, error: `DB insert: ${insErr.message}` });
        continue;
      }
      drafts.push(inserted);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failed.push({ url, error: msg });
    }
  }

  return NextResponse.json({
    drafts,
    failed,
    summary: {
      requested: urls.length,
      created: drafts.length,
      failed_count: failed.length,
    },
  });
}
