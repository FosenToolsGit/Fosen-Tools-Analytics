import { createAdminClient } from "@/lib/supabase/admin";
import { runSocialWatch, warnIfTokenExpiringSoon } from "@/lib/services/social-watch";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

// Overvåker eksterne sosiale kontoer (IG Business Discovery) og pusher varsel
// (ntfy) ved nytt innlegg. Trigges av GitHub Actions hvert ~30. min med
// Bearer SYNC_SECRET_KEY (Vercel Hobby-cron kan ikke polle så ofte).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  // Auth: session, SYNC_SECRET_KEY (curl/GitHub Actions) eller CRON_SECRET (Vercel)
  const authHeader = request.headers.get("authorization");
  const syncSecret = process.env.SYNC_SECRET_KEY;
  const cronSecret = process.env.CRON_SECRET;
  const isSecret =
    (syncSecret && authHeader === `Bearer ${syncSecret}`) ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`);

  if (!isSecret) {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
  }

  try {
    const admin = createAdminClient();
    const result = await runSocialWatch(admin);
    await warnIfTokenExpiringSoon();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
