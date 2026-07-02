import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { runIntelligence } from "@/lib/services/keyword-intelligence";
import { getKeywordPlannerStatus } from "@/lib/services/keyword-planner";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const daysParam = request.nextUrl.searchParams.get("days");
  const days = Math.max(1, Math.min(parseInt(daysParam || "90", 10) || 90, 365));

  try {
    const [report, plannerStatus] = await Promise.all([
      runIntelligence(supabase, days),
      getKeywordPlannerStatus(),
    ]);

    return NextResponse.json({
      ...report,
      keyword_planner_status: plannerStatus,
    });
  } catch (err) {
    console.error("Intelligence error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
