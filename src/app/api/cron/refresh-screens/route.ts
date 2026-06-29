import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAutoScreens } from "@/lib/services/screen-refresh";
import { NextResponse, type NextRequest } from "next/server";

// Ukentlig auto-oppdatering av butikk-skjermer (Vercel cron).
// Auth: innlogget bruker, SYNC_SECRET_KEY (manuell curl) eller CRON_SECRET (Vercel).
export const runtime = "nodejs";
export const maxDuration = 300;

async function handle(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secretOk =
    authHeader === `Bearer ${process.env.SYNC_SECRET_KEY}` ||
    (!!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`);

  let user = null;
  try {
    const supabase = await createClient();
    user = (await supabase.auth.getUser()).data.user;
  } catch { /* ingen sesjon */ }

  if (!secretOk && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const results = await refreshAutoScreens(admin);
    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Feil" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
