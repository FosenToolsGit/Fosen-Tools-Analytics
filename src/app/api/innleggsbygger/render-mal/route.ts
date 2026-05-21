import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import {
  renderOfferPng,
  closeOfferBrowser,
  type OfferLayout,
  type OfferProduct,
} from "@/lib/services/produkt-tilbud-render";
import {
  renderFeaturePng,
  closeFeatureBrowser,
} from "@/lib/services/feature-render";

/**
 * POST /api/innleggsbygger/render-mal
 *
 * Rendrer en mal-basert sosiale-medier-post til PNG. Deterministisk
 * HTML→PNG via Playwright — ingen AI.
 *
 * Mal-typer (template):
 *   - "offer"   : produkt-tilbud (layout single/grid/manufacturer)
 *   - "feature" : tjeneste/feature-post (HDFI, CADLAB osv.)
 *
 * Felles: aspect ("fb"|"ig"|"li"), background ("ink"|"red").
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
  template?: "offer" | "feature";
  aspect?: string;
  background?: "ink" | "red";
  // offer-felter
  layout?: OfferLayout;
  products?: OfferProduct[];
  manufacturer?: string | null;
  manufacturerLogoUrl?: string | null;
  // felles tekst
  eyebrow?: string | null;
  headline?: string | null;
  cta?: string | null;
  // feature-felter
  redWord?: string | null;
  intro?: string | null;
  benefits?: string[];
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

  const template = body.template ?? "offer";
  const dim = ASPECT_DIMS[body.aspect ?? "fb"] ?? ASPECT_DIMS.fb;
  const background = body.background ?? "ink";

  try {
    let pngBase64: string;
    let mime: string;

    if (template === "feature") {
      // ── Feature/tjeneste-post ──
      const headline = (body.headline ?? "").trim();
      if (!headline) {
        return NextResponse.json(
          { error: "Headline kreves for feature-mal" },
          { status: 400 }
        );
      }
      const benefits = (body.benefits ?? [])
        .map((b) => String(b).trim())
        .filter(Boolean);
      if (benefits.length === 0) {
        return NextResponse.json(
          { error: "Minst ett fordel-punkt kreves" },
          { status: 400 }
        );
      }
      const png = await renderFeaturePng({
        eyebrow: body.eyebrow ?? null,
        headline,
        redWord: body.redWord ?? null,
        intro: body.intro ?? null,
        benefits,
        cta: body.cta ?? null,
        background,
        width: dim.w,
        height: dim.h,
      });
      pngBase64 = png.base64;
      mime = png.mimeType;
    } else {
      // ── Produkt-tilbud ──
      const layout = body.layout ?? "single";
      if (!["single", "grid", "manufacturer"].includes(layout)) {
        return NextResponse.json(
          { error: `Ugyldig layout: ${layout}` },
          { status: 400 }
        );
      }
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
      const png = await renderOfferPng({
        layout,
        products,
        eyebrow: body.eyebrow ?? null,
        headline: body.headline ?? null,
        manufacturer: body.manufacturer ?? null,
        manufacturerLogoUrl: body.manufacturerLogoUrl ?? null,
        cta: body.cta ?? null,
        background,
        width: dim.w,
        height: dim.h,
      });
      pngBase64 = png.base64;
      mime = png.mimeType;
    }

    return NextResponse.json({
      image_base64: pngBase64,
      mime,
      width: dim.w,
      height: dim.h,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("render-mal feilet:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    // Lukk delte browsere så vi ikke lekker mellom serverless-invokasjoner
    await closeOfferBrowser().catch(() => undefined);
    await closeFeatureBrowser().catch(() => undefined);
  }
}
