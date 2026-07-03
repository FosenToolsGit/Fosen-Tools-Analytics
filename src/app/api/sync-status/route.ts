import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";

interface SyncLog {
  id: string;
  platform: string;
  status: "running" | "success" | "error";
  triggered_by: string | null;
  records_synced: number | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  // Hent de 50 siste sync-loggene og finn siste per plattform
  const { data, error } = await supabase
    .from("sync_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const latestByPlatform = new Map<string, SyncLog>();
  for (const row of (data ?? []) as SyncLog[]) {
    if (!latestByPlatform.has(row.platform)) {
      latestByPlatform.set(row.platform, row);
    }
  }

  return NextResponse.json(Array.from(latestByPlatform.values()));
}
