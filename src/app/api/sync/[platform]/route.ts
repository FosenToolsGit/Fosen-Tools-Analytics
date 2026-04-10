import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { PLATFORM_KEYS, type PlatformKey } from "@/lib/utils/platforms";
import { syncPlatform } from "../sync-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;

  if (!PLATFORM_KEYS.includes(platform as PlatformKey)) {
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const result = await syncPlatform(
    admin,
    platform as PlatformKey,
    "manual"
  );

  return NextResponse.json(result);
}
