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

  // Only sync platforms that have credentials configured
  const configuredPlatforms = PLATFORM_KEYS.filter((p) => {
    switch (p) {
      case "ga4":
        return !!process.env.GA4_PROPERTY_ID;
      case "meta":
        return !!process.env.META_ACCESS_TOKEN;
      case "mailchimp":
        return !!process.env.MAILCHIMP_API_KEY;
      case "linkedin":
        return !!process.env.LINKEDIN_ACCESS_TOKEN;
      default:
        return false;
    }
  });

  const triggeredBy =
    authHeader === `Bearer ${syncSecret}` ? "cron" : "manual";

  for (const platform of configuredPlatforms) {
    const result = await syncPlatform(admin, platform, triggeredBy);
    results.push(result);
  }

  return NextResponse.json({ results });
}
