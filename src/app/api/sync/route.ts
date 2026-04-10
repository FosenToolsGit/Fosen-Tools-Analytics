import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { PLATFORM_KEYS, type PlatformKey } from "@/lib/utils/platforms";
import { syncPlatform } from "./sync-utils";

export async function POST(request: NextRequest) {
  // Check auth: either session or SYNC_SECRET_KEY
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
  const results = [];

  for (const platform of PLATFORM_KEYS) {
    const result = await syncPlatform(admin, platform, "manual");
    results.push(result);
  }

  return NextResponse.json({ results });
}
