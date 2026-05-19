import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { scrapeProductByUrl } from "@/lib/services/scrape-product";

interface RouteContext {
  params: Promise<{ token: string }>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params;

  if (!UUID_REGEX.test(token)) {
    return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pricetag_playlists")
    .select("id, title, format, products, settings")
    .eq("share_token", token)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Slideshow ikke funnet (sjekk URL/token)" },
      { status: 404 },
    );
  }

  // Enrich products server-side so the public play page doesn't need to call
  // the auth-required /api/brosjyre/scrape-product endpoint.
  const products = Array.isArray(data.products) ? data.products : [];
  const enriched = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    products.map(async (p: any) => {
      if (p.name && p.price_now) return p;
      if (!p.source_url) return p;
      try {
        const scraped = await scrapeProductByUrl(p.source_url);
        return { ...scraped, ...p };
      } catch {
        return p;
      }
    }),
  );

  return NextResponse.json(
    { playlist: { ...data, products: enriched } },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    },
  );
}
