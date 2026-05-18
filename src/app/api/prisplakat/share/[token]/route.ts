import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Public read-only endpoint for share-token.
 *
 * Bruker service-role internt for å slå opp playlist via share_token.
 * Tokenet (UUID, ~122-bit entropy) er den eneste tilgangs-kontrollen.
 * Hvis tokenet lekker kan brukeren regenerere det fra editor-en.
 *
 * INGEN auth-sjekk — UniFi US Cast Pro og lignende skjermavspillere kan
 * ikke logge inn, så denne ruten må være offentlig på URL-en.
 */

interface RouteContext {
  params: Promise<{ token: string }>;
}

// UUID-validation: regex-sjekk så vi ikke gjør database-query på rar input
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
      { status: 404 }
    );
  }

  // Cache i 60 sekunder edge-side så samme skjerm-player ikke spør DB ved
  // hver refresh — slideshow-data endrer seg sjelden.
  return NextResponse.json(
    { playlist: data },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    }
  );
}
