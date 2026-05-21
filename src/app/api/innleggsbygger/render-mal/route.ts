import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import {
  renderOfferPng,
  closeOfferBrowser,
  type OfferLayout,
  type OfferProduct,
} from "@/lib/services/produkt-tilbud-render";

/**
 * POST /api/innleggsbygger/render-mal
 *
 * Rendrer en mal-basert sosiale-medier-post (produkt-tilbud) til PNG.
 * Deterministisk HTML→PNG via Playwright — ingen AI.
 *
 * Body: {
 *   layout: "single" | "grid" | "manufacturer",
 *   aspect: "fb" | "ig" | "li",   (1:1 / 4:5 / 16:9)
 *   products: OfferProduct[],
 *   eyebrow?, headline?, manufacturer?, manufacturerLogoUrl?, cta?, background?
 * }
 *
 * Response: { image_base64, mime, width, height }
 */

// Playwright-render kan ta noen sekunder
export const maxDuration = 120;

const ASPECT_DIMS: Record<string, { w: number; h: number }> = {
  fb: { w: 1080, h: 1080 },
  ig: { w: 1080, h: 1350 },
  li: { w: 1200, h: 675 },
};

interface RequestBody {
  layout?: OfferLayout;
  aspect?: string;
  products?: OfferProduct[];
  eyebrow?: string | null;
  headline?: string | null;
  manufacturer?: string | null;
  manufacturerLogoUrl?: string | null;
  cta?: string | null;
  background?: "ink" | "red";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const layout = body.layout ?? "single";
  if (!["single", "grid", "manufacturer"].includes(layout)) {
    return NextResponse.json(
      { error: `Ugyldig layout: ${layout}` },
      { status: 400 }
    );
  }

  const dim = ASPECT_DIMS[body.aspect ?? "fb"] ?? ASPECT_DIMS.fb;

  const products = (body.products ?? []).filter(
    (p): p is OfferProduct =>
      !!p && typeof p.name === "string" && typeof p.priceNow === "number"
  );
  if (products.length === 0) {
    return NextResponse.json(
      { error: "Minst ett produkt med navn + pris kreves" },
      { status: 400 }
    );
  }

  try {
    const png = await renderOfferPng({
      layout,
      products,
      eyebrow: body.eyebrow ?? null,
      headline: body.headline ?? null,
      manufacturer: body.manufacturer ?? null,
      manufacturerLogoUrl: body.manufacturerLogoUrl ?? null,
      cta: body.cta ?? null,
      background: body.background ?? "ink",
      width: dim.w,
      height: dim.h,
    });

    return NextResponse.json({
      image_base64: png.base64,
      mime: png.mimeType,
      width: dim.w,
      height: dim.h,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("render-mal feilet:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    // Lukk delt browser så vi ikke lekker mellom serverless-invokasjoner
    await closeOfferBrowser().catch(() => undefined);
  }
}
