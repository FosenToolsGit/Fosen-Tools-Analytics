import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { runIntelligence } from "@/lib/services/keyword-intelligence";
import {
  KeywordPlannerService,
  getKeywordPlannerStatus,
} from "@/lib/services/keyword-planner";
import {
  buildIntelligentKeywordReport,
  fetchOrganicMap,
  type AdsKeywordInput,
} from "@/lib/services/keyword-report";

/**
 * Genererer ukentlig søkeords-rapport og lagrer i Supabase storage.
 * Kjøres enten:
 *  - Manuelt via UI (session auth)
 *  - Via cron med SYNC_SECRET_KEY bearer token
 *
 * Rapporten har 30 dagers periode, bruker full intelligens-pipeline,
 * og resultatet lastes opp til bucket 'weekly-reports'.
 */
const BUCKET = "weekly-reports";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const syncSecret = process.env.SYNC_SECRET_KEY;
  const isCron = authHeader === `Bearer ${syncSecret}`;

  if (!isCron) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();

  try {
    const days = 30;
    const report = await runIntelligence(admin, days);

    // Hent keyword planner-ideer basert på eksisterende seed-ord (top 10 brand-keywords)
    const plannerStatus = await getKeywordPlannerStatus();
    const plannerIdeas = plannerStatus.available
      ? await (async () => {
          const topSeeds = report.signals
            .filter((s) => s.total_clicks > 5 && !s.competitor_match)
            .sort((a, b) => b.total_clicks - a.total_clicks)
            .slice(0, 10)
            .map((s) => s.keyword);
          if (topSeeds.length === 0) return [];
          try {
            const svc = new KeywordPlannerService();
            return await svc.getIdeas(topSeeds, { pageSize: 100 });
          } catch {
            return [];
          }
        })()
      : [];

    // Bygg også AdsKeywordInput[] fra signalene for bakover-kompatible sheets
    const adsKeywords: AdsKeywordInput[] = report.signals
      .filter((s) => s.total_clicks > 0 || s.total_cost > 0)
      .map((s) => ({
        keyword: s.keyword,
        campaign: s.primary_campaign_name || "",
        ad_group: "",
        clicks: s.total_clicks,
        cost: s.total_cost,
        cpc: s.avg_cpc,
      }));

    const organicMap = await fetchOrganicMap(admin);
    const excel = await buildIntelligentKeywordReport(
      admin,
      adsKeywords,
      organicMap,
      report,
      plannerIdeas
    );

    // Last opp til storage
    const reportDate = new Date().toISOString().split("T")[0];
    const storagePath = `keyword-report-${reportDate}.xlsx`;

    const uploadRes = await admin.storage
      .from(BUCKET)
      .upload(storagePath, excel, {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });

    if (uploadRes.error) {
      return NextResponse.json(
        {
          error: `Storage upload failed: ${uploadRes.error.message}. Sjekk at bucket '${BUCKET}' eksisterer i Supabase.`,
        },
        { status: 500 }
      );
    }

    // Logg til keyword_reports
    const { data: reportRow } = await admin
      .from("keyword_reports")
      .insert({
        report_date: reportDate,
        period_from: report.period_from,
        period_to: report.period_to,
        storage_path: storagePath,
        file_size_bytes: excel.length,
        signals_total: report.totals.total_signals,
        signals_scale_up: report.totals.scale_up,
        signals_cut: report.totals.cut,
        signals_negative: report.totals.negative,
        signals_new: report.totals.new_opportunity,
        total_cost_nok: report.totals.total_cost,
        total_value_nok: report.totals.total_est_value,
        triggered_by: isCron ? "cron" : "manual",
      })
      .select("id")
      .single();

    return NextResponse.json({
      status: "success",
      report_id: reportRow?.id,
      storage_path: storagePath,
      totals: report.totals,
      planner_available: plannerStatus.available,
    });
  } catch (err) {
    console.error("Weekly report error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
