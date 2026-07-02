import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { GoogleAdsService } from "@/lib/services/google-ads";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const service = new GoogleAdsService();
    const info = await service.health();
    return NextResponse.json({ ok: true, ...info });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
