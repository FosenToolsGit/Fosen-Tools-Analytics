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
import {
  renderMalPng,
  type MalInput,
  type MalType,
} from "@/lib/services/mal-render";
import { closeRenderBrowser } from "@/lib/services/render-common";

/**
 * POST /api/innleggsbygger/render-mal
 *
 * Rendrer en mal-basert sosiale-medier-post til PNG. Deterministisk
 * HTML→PNG via Playwright — ingen AI.
 *
 * Mal-typer (template):
 *   - "offer"   : produkt-tilbud (layout single/grid/manufacturer)
 *   - "feature" : tjeneste/feature-post (HDFI, CADLAB osv.)
 *   - "mal"     : tilstedeværelse-maler (prosess, leveranse, besok, stand,
 *                 ansatt, sitat, milepael, partner) — body.malInput bærer
 *                 alle felter, body.mal velger malen.
 *
 * Felles: aspect ("fb"|"ig"|"li"), background ("ink"|"red"|"cream").
 * Response: { image_base64, mime, width, height }
 */

// Playwright-render kan ta noen sekunder
export const maxDuration = 120;

const ASPECT_DIMS: Record<string, { w: number; h: number }> = {
  fb: { w: 1080, h: 1080 },
  ig: { w: 1080, h: 1350 },
  li: { w: 1200, h: 675 },
};

const MAL_TYPES: MalType[] = [
  "prosess",
  "leveranse",
  "besok",
  "stand",
  "ansatt",
  "sitat",
  "milepael",
  "partner",
];

interface RequestBody {
  template?: "offer" | "feature" | "mal";
  aspect?: string;
  background?: "ink" | "red" | "cream";
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
  imageUrl?: string | null;
  // mal-felter
  mal?: MalType;
  malInput?: Record<string, unknown>;
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

    if (template === "mal") {
      // ── Tilstedeværelse-maler ──
      const mal = body.mal;
      if (!mal || !MAL_TYPES.includes(mal)) {
        return NextResponse.json(
          { error: `Ugyldig mal: ${mal ?? "(mangler)"}` },
          { status: 400 }
        );
      }
      const payload = body.malInput ?? {};
      const malInput = {
        ...payload,
        mal,
        background,
        width: dim.w,
        height: dim.h,
      } as unknown as MalInput;

      // Lett validering per mal — nok til å gi meningsfull feilmelding
      const err = validateMal(mal, payload);
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 });
      }

      const png = await renderMalPng(malInput);
      pngBase64 = png.base64;
      mime = png.mimeType;
    } else if (template === "feature") {
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
        imageUrl: body.imageUrl ?? null,
        background: background === "cream" ? "ink" : background,
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
        background: background === "cream" ? "ink" : background,
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
    await closeRenderBrowser().catch(() => undefined);
  }
}

/** Minimal per-mal feltsjekk. Returnerer feilmelding eller null. */
function validateMal(mal: MalType, p: Record<string, unknown>): string | null {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const need = (field: string, label: string) =>
    str(p[field]) ? null : `${label} kreves for ${mal}-mal`;

  switch (mal) {
    case "prosess": {
      if (!str(p.headline)) return "Overskrift kreves for prosess-mal";
      const steps = Array.isArray(p.steps) ? p.steps : [];
      if (steps.length < 2) return "Minst 2 prosess-steg kreves";
      return null;
    }
    case "leveranse":
      return need("customer", "Kunde") ?? need("headline", "Overskrift");
    case "besok":
      return need("company", "Bedriftsnavn");
    case "stand":
      return (
        need("eventName", "Arrangementnavn") ??
        need("location", "Sted") ??
        need("date", "Dato")
      );
    case "ansatt":
      return need("name", "Navn") ?? need("role", "Rolle");
    case "sitat":
      return need("quote", "Sitat") ?? need("attributionName", "Navn");
    case "milepael":
      return need("number", "Tall");
    case "partner":
      return need("partnerName", "Partnernavn");
    default:
      return null;
  }
}
