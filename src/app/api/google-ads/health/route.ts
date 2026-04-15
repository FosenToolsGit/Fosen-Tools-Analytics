import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { GoogleAdsService } from "@/lib/services/google-ads";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
