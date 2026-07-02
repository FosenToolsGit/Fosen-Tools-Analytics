import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { detectAnomalies } from "@/lib/services/anomaly-detection";

/**
 * Manuell trigger for anomali-deteksjon. Brukes av "Kjør sjekk nå"-knappen
 * på /varsler-siden. Også tilgjengelig via cron med bearer auth.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const syncSecret = process.env.SYNC_SECRET_KEY;
  const isCron = authHeader === `Bearer ${syncSecret}`;

  if (!isCron) {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
  }

  const admin = createAdminClient();
  try {
    const result = await detectAnomalies(admin);
    return NextResponse.json({ status: "success", ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
