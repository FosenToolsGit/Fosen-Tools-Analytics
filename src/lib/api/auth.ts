import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Standard innloggingssjekk for API-ruter. Erstatter det gjentatte mønsteret
 *
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *
 * Bruk:
 *
 *   const auth = await requireAuth();
 *   if (auth instanceof NextResponse) return auth;   // 401
 *   const { user, supabase } = auth;
 *
 * `instanceof NextResponse`-guarden lar TypeScript smalne `auth` til det
 * innloggede objektet etterpå, så både `user` og `supabase` er non-null.
 */
export async function requireAuth(): Promise<
  { user: User; supabase: SupabaseClient } | NextResponse
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { user, supabase };
}
