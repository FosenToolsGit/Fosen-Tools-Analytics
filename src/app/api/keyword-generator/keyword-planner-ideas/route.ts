import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import {
  KeywordPlannerService,
  getKeywordPlannerStatus,
} from "@/lib/services/keyword-planner";

interface Body {
  seeds: string[];
  page_size?: number;
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.seeds) || body.seeds.length === 0) {
    return NextResponse.json(
      { error: "Missing or empty 'seeds' array" },
      { status: 400 }
    );
  }

  const status = await getKeywordPlannerStatus();
  if (!status.available) {
    return NextResponse.json({
      status,
      ideas: [],
    });
  }

  try {
    const service = new KeywordPlannerService();
    const ideas = await service.getIdeas(body.seeds, {
      pageSize: body.page_size ?? 100,
    });
    return NextResponse.json({
      status,
      ideas,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
