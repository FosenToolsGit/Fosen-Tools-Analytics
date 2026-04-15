import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { PLATFORM_KEYS } from "@/lib/utils/platforms";
import { syncPlatform } from "./sync-utils";
import { syncGoogleAds } from "./google-ads-sync";

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
  const results: Array<Record<string, unknown>> = [];

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

  // Valgfritt sync-vindu via ?days=N (default 90 fra sync-utils)
  const daysParam = request.nextUrl.searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : undefined;

  for (const platform of configuredPlatforms) {
    const result = await syncPlatform(admin, platform, triggeredBy, days ? { days } : {});
    results.push(result);
  }

  // Google Ads kjøres separat — bruker ikke PlatformService-interfacet og har
  // egen tabell-struktur. syncGoogleAds returnerer "skipped" hvis env mangler.
  if (process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
    const gaResult = await syncGoogleAds(
      admin,
      triggeredBy,
      days ? { days } : {}
    );
    results.push(gaResult);
  }

  return NextResponse.json({ results });
}
