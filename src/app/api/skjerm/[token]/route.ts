import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { scrapeProductByUrl } from "@/lib/services/scrape-product";

// Offentlig kiosk-endepunkt for navngitte skjermer. Skjerm-token (fast) slår
// opp hvilken spilleliste skjermen er tilordnet akkurat nå, og returnerer den
// (med server-side berikede produkter, så kiosk-siden slipper auth-kall).

interface RouteContext {
  params: Promise<{ token: string }>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params;

  if (!UUID_REGEX.test(token)) {
    return NextResponse.json({ error: "Ugyldig token-format" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: screen, error: screenErr } = await supabase
    .from("pricetag_screens")
    .select("id, name, playlist_id")
    .eq("screen_token", token)
    .maybeSingle();

  if (screenErr) {
    return NextResponse.json({ error: screenErr.message }, { status: 500 });
  }
  if (!screen) {
    return NextResponse.json(
      { error: "Skjerm ikke funnet (sjekk URL/token)" },
      { status: 404 },
    );
  }

  const noStore = { "Cache-Control": "no-store" };

  // Ingen spilleliste tilordnet ennå — kiosk viser en venlig placeholder.
  if (!screen.playlist_id) {
    return NextResponse.json(
      { screen: { name: screen.name }, playlist: null },
      { headers: noStore },
    );
  }

  const { data: pl, error: plErr } = await supabase
    .from("pricetag_playlists")
    .select("id, title, format, products, settings, updated_at")
    .eq("id", screen.playlist_id)
    .maybeSingle();

  if (plErr) {
    return NextResponse.json({ error: plErr.message }, { status: 500 });
  }
  if (!pl) {
    return NextResponse.json(
      { screen: { name: screen.name }, playlist: null },
      { headers: noStore },
    );
  }

  // Berik produkter server-side (samme som share-ruten)
  const products = Array.isArray(pl.products) ? pl.products : [];
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
    { screen: { name: screen.name }, playlist: { ...pl, products: enriched } },
    {
      // Kort cache så bytte av spilleliste plukkes opp raskt (≤ 60s + auto-reload)
      headers: { "Cache-Control": "public, max-age=30, s-maxage=30" },
    },
  );
}
