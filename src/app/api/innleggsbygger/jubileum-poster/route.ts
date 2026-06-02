import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_JUB_POSTER,
  JUB_POSTER_DIMS,
  renderJubPosterPng,
  type JubPosterFormat,
  type JubPosterInput,
} from "@/lib/services/jubileum-poster";

/**
 * POST /api/innleggsbygger/jubileum-poster
 *
 * Rendrer Brit's jubileums-plakat med 8 partner-logoer.
 * Body: { format?, eyebrow?, dateLine?, headlines?, subtitle?, partners? }
 *       — alle felter er valgfrie og faller tilbake til DEFAULT.
 * Response: { image_base64, mime, width, height }
 */

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body extends Partial<Omit<JubPosterInput, "format">> {
  format?: string;
}

const FORMATS = Object.keys(JUB_POSTER_DIMS) as JubPosterFormat[];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    // OK — bruk defaults
  }

  const format = (body.format ?? "square") as JubPosterFormat;
  if (!FORMATS.includes(format)) {
    return NextResponse.json(
      { error: `Ukjent format. Gyldige: ${FORMATS.join(", ")}` },
      { status: 400 },
    );
  }

  // base-URL for absolute img-stier (Playwright trenger absolutt)
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  const host = request.headers.get("host") ?? "localhost:3000";
  const baseUrl = `${proto}://${host}`;

  const input: JubPosterInput = {
    format,
    eyebrow: body.eyebrow ?? DEFAULT_JUB_POSTER.eyebrow,
    dateLine: body.dateLine ?? DEFAULT_JUB_POSTER.dateLine,
    headlines: body.headlines ?? DEFAULT_JUB_POSTER.headlines,
    subtitle: body.subtitle ?? DEFAULT_JUB_POSTER.subtitle,
    partnersTagline: body.partnersTagline ?? DEFAULT_JUB_POSTER.partnersTagline,
    partners: body.partners ?? DEFAULT_JUB_POSTER.partners,
    openingHours: body.openingHours ?? DEFAULT_JUB_POSTER.openingHours,
    grillingHours: body.grillingHours ?? DEFAULT_JUB_POSTER.grillingHours,
  };

  try {
    const result = await renderJubPosterPng(input, baseUrl);
    return NextResponse.json({
      image_base64: result.base64,
      mime: result.mimeType,
      width: result.width,
      height: result.height,
    });
  } catch (err) {
    console.error("[jubileum-poster] render feilet:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Render feilet" },
      { status: 500 },
    );
  }
}
