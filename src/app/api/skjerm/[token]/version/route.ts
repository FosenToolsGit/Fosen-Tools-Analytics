import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

// Lett versjons-endepunkt for kiosk-skjermer. Returnerer KUN hvilken spilleliste
// skjermen viser + dens updated_at — uten å berike produkter. Skjermen poller
// dette hvert 30. sek og reloader seg selv når innholdet endres (bytte av
// spilleliste eller redigering), så man slipper å refreshe på enheten.

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

  const { data: screen } = await supabase
    .from("pricetag_screens")
    .select("playlist_id")
    .eq("screen_token", token)
    .maybeSingle();

  const noStore = { "Cache-Control": "no-store" };

  if (!screen || !screen.playlist_id) {
    return NextResponse.json({ playlist_id: null, updated_at: null }, { headers: noStore });
  }

  const { data: pl } = await supabase
    .from("pricetag_playlists")
    .select("updated_at")
    .eq("id", screen.playlist_id)
    .maybeSingle();

  return NextResponse.json(
    { playlist_id: screen.playlist_id, updated_at: pl?.updated_at ?? null },
    { headers: noStore },
  );
}
