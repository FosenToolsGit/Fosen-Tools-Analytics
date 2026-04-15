import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

export interface ReportRow {
  id: number;
  report_date: string;
  period_from: string;
  period_to: string;
  storage_path: string;
  file_size_bytes: number | null;
  signals_total: number;
  signals_scale_up: number;
  signals_cut: number;
  signals_negative: number;
  signals_new: number;
  total_cost_nok: number;
  total_value_nok: number;
  triggered_by: string;
  created_at: string;
}

const BUCKET = "weekly-reports";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const downloadId = searchParams.get("download");

  // Download-modus: returner signed URL til filen
  if (downloadId) {
    const { data: row } = await supabase
      .from("keyword_reports")
      .select("storage_path")
      .eq("id", downloadId)
      .single();

    if (!row) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const admin = createAdminClient();
    const { data: signed, error } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, 60 * 5); // 5 min TTL

    if (error || !signed) {
      return NextResponse.json(
        { error: error?.message || "Could not create signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signed.signedUrl });
  }

  // List-modus
  const { data, error } = await supabase
    .from("keyword_reports")
    .select("*")
    .order("report_date", { ascending: false })
    .limit(52); // siste året

  if (error) {
    if (/relation .* does not exist/i.test(error.message)) {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
