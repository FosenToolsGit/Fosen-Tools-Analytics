import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { PLATFORM_KEYS, type PlatformKey } from "@/lib/utils/platforms";
import { syncPlatform } from "../sync-utils";
import { syncGoogleAds } from "../google-ads-sync";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;

  const isGoogleAds = platform === "google_ads";
  if (!isGoogleAds && !PLATFORM_KEYS.includes(platform as PlatformKey)) {
    return NextResponse.json(
      { error: `Invalid platform: ${platform}` },
      { status: 400 }
    );
  }

  // Check auth
  const authHeader = request.headers.get("authorization");
  const syncSecret = process.env.SYNC_SECRET_KEY;

  if (authHeader === `Bearer ${syncSecret}`) {
    // Cron-triggered sync
  } else {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
  }

  const admin = createAdminClient();
  const daysParam = request.nextUrl.searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : undefined;

  const result = isGoogleAds
    ? await syncGoogleAds(admin, "manual", days ? { days } : {})
    : await syncPlatform(
        admin,
        platform as PlatformKey,
        "manual",
        days ? { days } : {}
      );

  return NextResponse.json(result);
}
