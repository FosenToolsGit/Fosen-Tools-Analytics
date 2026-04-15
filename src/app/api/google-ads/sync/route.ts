import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { syncGoogleAds } from "@/app/api/sync/google-ads-sync";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const syncSecret = process.env.SYNC_SECRET_KEY;
  const isCron = authHeader === `Bearer ${syncSecret}`;

  if (!isCron) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const daysParam = request.nextUrl.searchParams.get("days");
  const days = daysParam ? parseInt(daysParam, 10) : undefined;

  const admin = createAdminClient();
  const result = await syncGoogleAds(
    admin,
    isCron ? "cron" : "manual",
    days ? { days } : {}
  );

  const httpStatus = result.status === "error" ? 500 : 200;
  return NextResponse.json(result, { status: httpStatus });
}
