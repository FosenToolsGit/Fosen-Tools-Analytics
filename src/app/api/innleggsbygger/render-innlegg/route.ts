import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import {
  renderInnlegg,
  isInnleggMal,
  type InnleggVariant,
  type AspectKey,
} from "@/lib/services/innlegg";
import { closeRenderBrowser } from "@/lib/services/render-common";

/**
 * POST /api/innleggsbygger/render-innlegg
 *
 * Rendrer én av de 108 design-layoutene (12 arketyper × A/B/C × fb/ig/li)
 * fra Claude Design-handoffen. Deterministisk HTML→PNG via Playwright.
 *
 * Body: { mal, variant ("A"|"B"|"C"), aspect ("fb"|"ig"|"li"), data }
 * Response: { image_base64, mime, width, height }
 */

export const maxDuration = 120;

interface Body {
  mal?: string;
  variant?: string;
  aspect?: string;
  data?: unknown;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mal = body.mal ?? "";
  if (!isInnleggMal(mal)) {
    return NextResponse.json(
      { error: `Ugyldig mal: ${mal || "(mangler)"}` },
      { status: 400 }
    );
  }
  const variant: InnleggVariant = ["A", "B", "C"].includes(body.variant ?? "")
    ? (body.variant as InnleggVariant)
    : "A";
  const aspect: AspectKey = ["fb", "ig", "li"].includes(body.aspect ?? "")
    ? (body.aspect as AspectKey)
    : "fb";

  try {
    const png = await renderInnlegg(mal, variant, aspect, body.data ?? {});
    return NextResponse.json({
      image_base64: png.base64,
      mime: png.mimeType,
      width: png.width,
      height: png.height,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("render-innlegg feilet:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    await closeRenderBrowser().catch(() => undefined);
  }
}
