import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { generateIdeFeed } from "@/lib/services/ide-engine";

/**
 * GET /api/innleggsbygger/ide-feed?date=YYYY-MM-DD&count=6
 *
 * Returnerer dagens 5-7 innholdsideer basert på markedsanalysen og
 * caption-mønstre. Bruker dato som seed slik at hele teamet ser samme
 * forslag på samme dag.
 *
 * Spør evt. platform_posts for å ekskludere kategorier som ble postet
 * mye siste 30 dager (TODO — kan utvides).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const date = request.nextUrl.searchParams.get("date") ?? undefined;
  const countParam = request.nextUrl.searchParams.get("count");
  const count = countParam ? Math.max(3, Math.min(12, parseInt(countParam, 10))) : 6;

  const ideas = generateIdeFeed({ date, count });

  return NextResponse.json({
    date: date ?? new Date().toISOString().slice(0, 10),
    count: ideas.length,
    ideas,
  });
}
