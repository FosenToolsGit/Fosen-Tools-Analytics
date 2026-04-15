import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { runIntelligence } from "@/lib/services/keyword-intelligence";
import { getKeywordPlannerStatus } from "@/lib/services/keyword-planner";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
