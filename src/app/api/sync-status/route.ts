import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
