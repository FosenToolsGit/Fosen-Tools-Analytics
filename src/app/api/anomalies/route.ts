import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

export type AnomalyStatus = "active" | "acknowledged" | "resolved" | "expired";

export interface AnomalyRow {
  id: number;
  category: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  metric_context: Record<string, unknown>;
  suggested_action: string | null;
  target_type: string | null;
  target_id: string | null;
  status: AnomalyStatus;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  detected_at: string;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(parseInt(limitParam || "100", 10) || 100, 500);

  let query = supabase
    .from("analytics_anomalies")
    .select("*")
    .order("severity", { ascending: true }) // critical first (CHECK constraint makes this work by string order: critical < info < warning — wrong)
    .order("detected_at", { ascending: false })
    .limit(limit);

  if (statusParam && ["active", "acknowledged", "resolved", "expired"].includes(statusParam)) {
    query = query.eq("status", statusParam);
  }

  const { data, error } = await query;
  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Manuelt sortér severity (critical > warning > info) siden DB-ordering ikke gjør det riktig
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const sorted = (data ?? []).slice().sort((a, b) => {
    const diff =
      (severityOrder[a.severity as keyof typeof severityOrder] ?? 3) -
      (severityOrder[b.severity as keyof typeof severityOrder] ?? 3);
    if (diff !== 0) return diff;
    return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
  });

  return NextResponse.json(sorted);
}

interface PostBody {
  id: number;
  action: "acknowledge" | "resolve";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id || !["acknowledge", "resolve"].includes(body.action)) {
    return NextResponse.json(
      { error: "Missing id or invalid action" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const newStatus: AnomalyStatus =
    body.action === "acknowledge" ? "acknowledged" : "resolved";

  const { data, error } = await admin
    .from("analytics_anomalies")
    .update({
      status: newStatus,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: user.email ?? user.id,
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
