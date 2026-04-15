import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import {
  buildKeywordReport,
  buildIntelligentKeywordReport,
  fetchOrganicMap,
  type AdsKeywordInput,
} from "@/lib/services/keyword-report";
import { runIntelligence } from "@/lib/services/keyword-intelligence";
import {
  KeywordPlannerService,
  getKeywordPlannerStatus,
} from "@/lib/services/keyword-planner";

function excelResponse(buffer: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// ============================================================
// POST — Excel-opplasting (uendret flyt fra brukerens side)
// ============================================================
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
    }) as unknown[][];

    const keywordVariants = [
      "søkeord",
      "sokeord",
      "keyword",
      "search term",
      "query",
    ];
    const clickVariants = ["klikk", "clicks"];

    let headerRowIdx = -1;
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row) continue;
      const rowStrings = row.map((c) =>
        String(c ?? "").toLowerCase().trim()
      );
      const hasKeyword = rowStrings.some((s) =>
        keywordVariants.some((v) => s.includes(v))
      );
      const hasClicks = rowStrings.some((s) =>
        clickVariants.some((v) => s.includes(v))
      );
      if (hasKeyword && hasClicks) {
        headerRowIdx = i;
        break;
      }
    }

    if (headerRowIdx === -1) {
      const sampleRows = rawData
        .slice(0, 10)
        .map((r) => (r || []).map((c) => String(c ?? "").trim()));
      return NextResponse.json(
        {
          error:
            "Kunne ikke finne header-rad med både 'Søkeord' og 'Klikk'. Sjekk at filen har disse kolonnene.",
          sample_rows: sampleRows,
        },
        { status: 400 }
      );
    }

    const headers = (rawData[headerRowIdx] || []).map((h) =>
      String(h ?? "").toLowerCase().trim()
    );
    const rows = rawData.slice(headerRowIdx + 1);

    const colIdx = {
      type: headers.findIndex((h) => h === "type"),
      campaign: headers.findIndex(
        (h) => h.includes("kampanje") || h.includes("campaign")
      ),
      adGroup: headers.findIndex(
        (h) => h.includes("annonsegruppe") || h.includes("ad group")
      ),
      keyword: headers.findIndex((h) =>
        keywordVariants.some((v) => h.includes(v))
      ),
      clicks: headers.findIndex((h) =>
        clickVariants.some((v) => h.includes(v))
      ),
      cost: headers.findIndex(
        (h) => h.includes("kostnad") || h.includes("cost") || h.includes("spend")
      ),
      cpc: headers.findIndex((h) => h.includes("cpc")),
    };

    if (colIdx.keyword === -1 || colIdx.clicks === -1) {
      return NextResponse.json(
        {
          error: `Kunne ikke finne nødvendige kolonner. Søkeord-kolonne: ${
            colIdx.keyword === -1 ? "MANGLER" : "OK"
          }, Klikk-kolonne: ${colIdx.clicks === -1 ? "MANGLER" : "OK"}`,
          found_headers: headers,
          header_row: headerRowIdx + 1,
        },
        { status: 400 }
      );
    }

    const adsKeywords: AdsKeywordInput[] = rows
      .filter((r) => r && r[colIdx.keyword])
      .map((r) => ({
        type: (colIdx.type >= 0 ? r[colIdx.type] : "") as string,
        campaign: (colIdx.campaign >= 0 ? r[colIdx.campaign] : "") as string,
        ad_group: (colIdx.adGroup >= 0 ? r[colIdx.adGroup] : "") as string,
        keyword: r[colIdx.keyword] as string,
        clicks: parseFloat(String(r[colIdx.clicks] || 0)) || 0,
        cost:
          colIdx.cost >= 0 ? parseFloat(String(r[colIdx.cost] || 0)) || 0 : 0,
        cpc: colIdx.cpc >= 0 ? parseFloat(String(r[colIdx.cpc] || 0)) || 0 : 0,
      }))
      .filter((k) => k.keyword);

    const organicMap = await fetchOrganicMap(supabase);
    const outputBuffer = await buildKeywordReport(
      supabase,
      adsKeywords,
      organicMap
    );

    return excelResponse(
      outputBuffer,
      `Sokeord-Anbefalinger-${new Date().toISOString().split("T")[0]}.xlsx`
    );
  } catch (err) {
    console.error("Generator error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ============================================================
// GET — Live DB-modus. Leser google_ads_keywords + google_ads_campaigns
// og bygger samme rapport uten at bruker må laste opp noe.
// Bruk: GET /api/keyword-generator?source=db&days=90
// ============================================================
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const source = request.nextUrl.searchParams.get("source");
  if (source !== "db") {
    return NextResponse.json(
      { error: "Missing source=db parameter" },
      { status: 400 }
    );
  }

  const daysParam = request.nextUrl.searchParams.get("days");
  const days = Math.max(1, Math.min(parseInt(daysParam || "90", 10) || 90, 365));

  try {
    const today = new Date();
    const start = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    const fromStr = start.toISOString().split("T")[0];
    const toStr = today.toISOString().split("T")[0];

    // 1. Hent kampanje-navn for klassifisering (campaign_id → navn)
    const { data: campaignRows, error: campErr } = await supabase
      .from("google_ads_campaigns")
      .select("campaign_id, campaign_name")
      .gte("metric_date", fromStr)
      .lte("metric_date", toStr);

    if (campErr) {
      return NextResponse.json(
        {
          error:
            "Kunne ikke lese google_ads_campaigns. Er Google Ads-integrasjonen koblet opp?",
          details: campErr.message,
        },
        { status: 500 }
      );
    }

    const campaignNameById = new Map<string, string>();
    for (const row of campaignRows ?? []) {
      if (row.campaign_id && !campaignNameById.has(row.campaign_id)) {
        campaignNameById.set(row.campaign_id, row.campaign_name || "");
      }
    }

    // 2. Hent alle keyword-rader i perioden (paginering)
    interface KwRow {
      campaign_id: string;
      ad_group_name: string | null;
      keyword_text: string;
      match_type: string;
      impressions: number;
      clicks: number;
      cost_nok: number;
      average_cpc_nok: number;
    }
    const allRows: KwRow[] = [];
    const pageSize = 1000;
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("google_ads_keywords")
        .select(
          "campaign_id, ad_group_name, keyword_text, match_type, impressions, clicks, cost_nok, average_cpc_nok"
        )
        .gte("metric_date", fromStr)
        .lte("metric_date", toStr)
        .range(offset, offset + pageSize - 1);
      if (error) {
        return NextResponse.json(
          {
            error:
              "Kunne ikke lese google_ads_keywords. Er Google Ads-integrasjonen koblet opp?",
            details: error.message,
          },
          { status: 500 }
        );
      }
      if (!data || data.length === 0) break;
      allRows.push(...(data as KwRow[]));
      if (data.length < pageSize) break;
      offset += pageSize;
    }

    if (allRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "Ingen Google Ads søkeord-data i DB for valgt periode. Kjør sync først eller velg lenger tidsperiode.",
        },
        { status: 404 }
      );
    }

    // 3. Aggreger per keyword_text (case/trim-insensitiv)
    interface AggKw extends AdsKeywordInput {
      _weightedCpc: number;
    }
    const map = new Map<string, AggKw>();
    for (const row of allRows) {
      const key = row.keyword_text.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.clicks += row.clicks;
        existing.cost += Number(row.cost_nok);
        existing._weightedCpc += Number(row.average_cpc_nok) * row.clicks;
      } else {
        map.set(key, {
          keyword: row.keyword_text,
          campaign: campaignNameById.get(row.campaign_id) || "",
          ad_group: row.ad_group_name || "",
          clicks: row.clicks,
          cost: Number(row.cost_nok),
          cpc: 0,
          _weightedCpc: Number(row.average_cpc_nok) * row.clicks,
        });
      }
    }

    // 4. Trekk også inn faktiske søketermer fra google_ads_search_terms.
    // Dette gjør at brand-søk (fra Search) og Pmax-kategorier kommer med i
    // rapporten selv om de ikke er targeted keywords.
    const { data: searchTermRows } = await supabase
      .from("google_ads_search_terms")
      .select(
        "source, search_term, campaign_id, ad_group_name, clicks, cost_nok"
      )
      .gte("metric_date", fromStr)
      .lte("metric_date", toStr);

    for (const row of searchTermRows ?? []) {
      const key = (row.search_term as string).trim().toLowerCase();
      if (!key || key === "(other)") continue;
      const existing = map.get(key);
      const rowCost = Number(row.cost_nok) || 0;
      const rowClicks = Number(row.clicks) || 0;
      const rowCpc = rowClicks > 0 ? rowCost / rowClicks : 0;
      if (existing) {
        existing.clicks += rowClicks;
        existing.cost += rowCost;
        existing._weightedCpc += rowCpc * rowClicks;
      } else {
        map.set(key, {
          keyword: row.search_term as string,
          campaign:
            campaignNameById.get(row.campaign_id as string) ||
            (row.source === "pmax_insight" ? "Performance Max" : ""),
          ad_group: (row.ad_group_name as string) || "",
          clicks: rowClicks,
          cost: rowCost,
          cpc: rowCpc,
          _weightedCpc: rowCpc * rowClicks,
        });
      }
    }

    const adsKeywords: AdsKeywordInput[] = Array.from(map.values()).map(
      (k) => ({
        keyword: k.keyword,
        campaign: k.campaign,
        ad_group: k.ad_group,
        clicks: k.clicks,
        cost: k.cost,
        cpc: k.clicks > 0 ? k._weightedCpc / k.clicks : 0,
      })
    );

    const organicMap = await fetchOrganicMap(supabase);

    // Kjør intelligens-pipeline + hent evt. Keyword Planner-ideer
    const intelligence = await runIntelligence(supabase, days);
    const plannerStatus = await getKeywordPlannerStatus();
    let plannerIdeas = null;
    if (plannerStatus.available) {
      try {
        const topSeeds = intelligence.signals
          .filter((s) => s.total_clicks > 5 && !s.competitor_match)
          .sort((a, b) => b.total_clicks - a.total_clicks)
          .slice(0, 10)
          .map((s) => s.keyword);
        if (topSeeds.length > 0) {
          const svc = new KeywordPlannerService();
          plannerIdeas = await svc.getIdeas(topSeeds, { pageSize: 100 });
        }
      } catch {
        plannerIdeas = null;
      }
    }

    const outputBuffer = await buildIntelligentKeywordReport(
      supabase,
      adsKeywords,
      organicMap,
      intelligence,
      plannerIdeas
    );

    return excelResponse(
      outputBuffer,
      `Sokeord-Anbefalinger-Live-${days}d-${new Date().toISOString().split("T")[0]}.xlsx`
    );
  } catch (err) {
    console.error("Generator DB error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
