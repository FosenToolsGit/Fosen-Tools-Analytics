import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import {
  COMPOSITION_ID,
  DIMENSIONS,
  renderVideo,
  type VideoFormat,
  type VideoType,
} from "@/lib/services/video-render";

/**
 * POST /api/innleggsbygger/video
 *
 * Rendrer en sosiale-medier-video med Remotion og laster den opp til
 * Storage-bucket `social_assets`.
 *
 * Body: { type: VideoType, format?: VideoFormat, data: object }
 * Response: { url, storage_path, width, height, durationSec }
 *
 * VIKTIG: Remotion kjører en headless Chrome server-side. Ruten fungerer
 * lokalt (`npm run dev`), men ikke i en vanlig Vercel serverless-funksjon.
 * Video-byggeren er derfor en «Lokal»-funksjon.
 */

export const runtime = "nodejs";
export const maxDuration = 300;

const BUCKET = "social_assets";

const VIDEO_TYPES = Object.keys(COMPOSITION_ID) as VideoType[];
const VIDEO_FORMATS = Object.keys(DIMENSIONS) as VideoFormat[];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { type?: string; format?: string; data?: Record<string, unknown> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type as VideoType;
  if (!VIDEO_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Ukjent video-type. Gyldige: ${VIDEO_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const format = (body.format ?? "reel") as VideoFormat;
  if (!VIDEO_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: `Ukjent format. Gyldige: ${VIDEO_FORMATS.join(", ")}` },
      { status: 400 },
    );
  }

  const data =
    body.data && typeof body.data === "object" ? body.data : {};

  try {
    const result = await renderVideo({
      type,
      data: { ...data, format },
    });

    const uuid = crypto.randomUUID();
    const storagePath = `${user.id}/video-${type}-${uuid}.mp4`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, result.buffer, {
        contentType: "video/mp4",
        cacheControl: "31536000",
        upsert: false,
      });
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { data: pub } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    return NextResponse.json({
      url: pub.publicUrl,
      storage_path: storagePath,
      width: result.width,
      height: result.height,
      durationSec: Math.round((result.durationInFrames / result.fps) * 10) / 10,
      sizeBytes: result.buffer.byteLength,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("video-render feilet:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
