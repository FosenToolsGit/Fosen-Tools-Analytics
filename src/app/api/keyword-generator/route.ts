import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { ruleMatches, keywordEntityKey, type TagRule } from "@/lib/types/tags";

interface AdsKeyword {
  type: string;
  campaign: string;
  ad_group: string;
  keyword: string;
  clicks: number;
  cost: number;
  cpc: number;
}

interface OrganicKeyword {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

const KONKURRENT_FALLBACK = [
  "luna",
  "flex tools",
  "bosch",
  "kz tools",
  "idg",
  "lntool",
  "milwaukee",
  "dewalt",
  "makita",
  "hilti",
  "festool",
];

async function getCompetitorRules(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<TagRule[] | null> {
  // Finn "Konkurrent"-tag (case-insensitive)
  const { data: tags } = await supabase
    .from("tags")
    .select("id, name")
    .ilike("name", "konkurrent");
  if (!tags || tags.length === 0) return null;
  const tagIds = tags.map((t) => t.id);
  const { data: rules } = await supabase
    .from("tag_rules")
    .select("*")
    .in("tag_id", tagIds)
    .eq("entity_type", "keyword")
    .eq("enabled", true);
  return (rules as TagRule[] | null) ?? null;
}

function makeCompetitorMatcher(rules: TagRule[] | null): (kw: string) => boolean {
  if (rules && rules.length > 0) {
    return (kw: string) => rules.some((r) => ruleMatches(r, kw));
  }
  // Fallback til hardkodet liste hvis tag ikke finnes
  return (kw: string) => {
    const lower = kw.toLowerCase();
    return KONKURRENT_FALLBACK.some((m) => lower.includes(m));
  };
}

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

    // Try to detect header row (look for "Søkeord" or "Keyword")
    const rawData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
    }) as unknown[][];

    // Robust header detection — convert all cells to strings
    const keywordVariants = ["søkeord", "sokeord", "keyword", "search term", "query"];
    const clickVariants = ["klikk", "clicks"];

    let headerRowIdx = -1;
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row) continue;
      const rowStrings = row.map((c) => String(c ?? "").toLowerCase().trim());
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
      // Try to give a helpful error showing what was in the file
      const sampleRows = rawData.slice(0, 10).map((r) =>
        (r || []).map((c) => String(c ?? "").trim())
      );
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

    // Map column indices
    const colIdx = {
      type: headers.findIndex((h) => h === "type"),
      campaign: headers.findIndex((h) => h.includes("kampanje") || h.includes("campaign")),
      adGroup: headers.findIndex((h) => h.includes("annonsegruppe") || h.includes("ad group")),
      keyword: headers.findIndex((h) =>
        keywordVariants.some((v) => h.includes(v))
      ),
      clicks: headers.findIndex((h) =>
        clickVariants.some((v) => h.includes(v))
      ),
      cost: headers.findIndex((h) => h.includes("kostnad") || h.includes("cost") || h.includes("spend")),
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

    const adsKeywords: AdsKeyword[] = rows
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

    // Get organic keywords from Search Console (latest 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromStr = thirtyDaysAgo.toISOString().split("T")[0];
    const toStr = today.toISOString().split("T")[0];

    const { data: organicRows } = await supabase
      .from("search_keywords")
      .select("*")
      .gte("metric_date", fromStr)
      .lte("metric_date", toStr);

    // Aggregate organic keywords
    const organicMap = new Map<string, OrganicKeyword>();
    for (const row of organicRows ?? []) {
      const key = (row.query as string).trim().toLowerCase();
      const existing = organicMap.get(key);
      if (existing) {
        existing.clicks += row.clicks;
        existing.impressions += row.impressions;
      } else {
        organicMap.set(key, {
          query: row.query,
          clicks: row.clicks,
          impressions: row.impressions,
          position: row.position,
          ctr: row.ctr,
        });
      }
    }

    // Analysis
    const totalClicks = adsKeywords.reduce((s, k) => s + k.clicks, 0);
    const totalCost = adsKeywords.reduce((s, k) => s + k.cost, 0);
    const avgCpc = totalClicks > 0 ? totalCost / totalClicks : 0;

    // Hent konkurrent-regler fra tag-systemet
    const competitorRules = await getCompetitorRules(supabase);
    const isCompetitor = makeCompetitorMatcher(competitorRules);

    // Categorize
    const cuts: Array<AdsKeyword & { reason: string }> = [];
    const keeps: AdsKeyword[] = [];
    const reviews: AdsKeyword[] = [];

    for (const k of adsKeywords) {
      if (isCompetitor(k.keyword)) {
        cuts.push({
          ...k,
          reason: "Konkurrent-merke (folk vil ikke kjøpe Fosen Tools)",
        });
      } else if (k.cpc > 25 && k.clicks <= 2) {
        cuts.push({
          ...k,
          reason: `Svært dyr (${k.cpc.toFixed(0)} NOK/klikk) med veldig lite volum`,
        });
      } else if (k.clicks === 0) {
        cuts.push({
          ...k,
          reason: "Ingen klikk — ingen søker etter dette",
        });
      } else if (k.clicks >= 5 && k.cpc < 12) {
        keeps.push(k);
      } else {
        reviews.push(k);
      }
    }

    // Find new keyword opportunities from organic data
    const adsKeywordSet = new Set(
      adsKeywords.map((k) => k.keyword.toLowerCase().trim())
    );
    const opportunities = Array.from(organicMap.values())
      .filter((o) => {
        const lower = o.query.toLowerCase().trim();
        // Not already in ads, has volume, and position can be improved
        return (
          !adsKeywordSet.has(lower) &&
          o.impressions >= 50 &&
          o.position >= 4
        );
      })
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 30);

    // Build Excel response
    const wb = XLSX.utils.book_new();

    // Sheet 1: Sammendrag
    const summaryData: (string | number)[][] = [
      ["FOSEN TOOLS — OPTIMALISERT SØKEORDS-RAPPORT"],
      [`Generert: ${new Date().toLocaleDateString("nb-NO")}`],
      [],
      ["TOTALER"],
      ["Totalt klikk:", totalClicks],
      ["Total kostnad:", totalCost.toFixed(2) + " NOK"],
      ["Snitt CPC:", avgCpc.toFixed(2) + " NOK"],
      ["Antall søkeord:", adsKeywords.length],
      [],
      ["ANBEFALINGER"],
      ["Søkeord å kutte:", cuts.length],
      ["Søkeord å beholde:", keeps.length],
      ["Søkeord å vurdere:", reviews.length],
      ["Nye muligheter:", opportunities.length],
      [],
      ["MULIG BESPARELSE PER MÅNED:"],
      [
        "",
        (cuts.reduce((s, k) => s + k.cost, 0) / 6).toFixed(2) + " NOK",
      ],
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs["!cols"] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, "Sammendrag");

    // Sheet 2: Kutt disse
    const cutsData: (string | number)[][] = [
      ["Søkeord", "Annonsegruppe", "Klikk", "Kostnad", "CPC", "Hvorfor kutte"],
      ...cuts
        .sort((a, b) => b.cost - a.cost)
        .map((k) => [
          k.keyword,
          k.ad_group,
          k.clicks,
          parseFloat(k.cost.toFixed(2)),
          parseFloat(k.cpc.toFixed(2)),
          k.reason,
        ]),
    ];
    const cutsWs = XLSX.utils.aoa_to_sheet(cutsData);
    cutsWs["!cols"] = [
      { wch: 35 },
      { wch: 25 },
      { wch: 8 },
      { wch: 12 },
      { wch: 10 },
      { wch: 60 },
    ];
    XLSX.utils.book_append_sheet(wb, cutsWs, "Kutt disse");

    // Sheet 3: Behold disse
    const keepsData: (string | number)[][] = [
      ["Søkeord", "Annonsegruppe", "Klikk", "Kostnad", "CPC", "Status"],
      ...keeps
        .sort((a, b) => b.clicks - a.clicks)
        .map((k) => {
          let status = "✅ Bra — behold";
          if (k.cpc < 5) status = "⭐ Topp — øk budsjett";
          return [
            k.keyword,
            k.ad_group,
            k.clicks,
            parseFloat(k.cost.toFixed(2)),
            parseFloat(k.cpc.toFixed(2)),
            status,
          ];
        }),
    ];
    const keepsWs = XLSX.utils.aoa_to_sheet(keepsData);
    keepsWs["!cols"] = [
      { wch: 35 },
      { wch: 25 },
      { wch: 8 },
      { wch: 12 },
      { wch: 10 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, keepsWs, "Behold disse");

    // Sheet 4: Nye muligheter (fra organisk)
    const oppsData: (string | number)[][] = [
      [
        "Søkeord",
        "Visninger (org)",
        "Klikk (org)",
        "Posisjon",
        "Strategi",
      ],
      ...opportunities.map((o) => {
        let strategy = "Test med Phrase match";
        if (o.position > 10) {
          strategy = `Org. posisjon ${o.position.toFixed(0)} — kjør Ads for å fange disse`;
        } else if (o.position > 5) {
          strategy = `Bra org. posisjon (${o.position.toFixed(0)}) — øk synlighet med Ads`;
        }
        return [
          o.query,
          o.impressions,
          o.clicks,
          parseFloat(o.position.toFixed(1)),
          strategy,
        ];
      }),
    ];
    const oppsWs = XLSX.utils.aoa_to_sheet(oppsData);
    oppsWs["!cols"] = [
      { wch: 35 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 60 },
    ];
    XLSX.utils.book_append_sheet(wb, oppsWs, "Nye muligheter");

    // Sheet 5: Vurder disse
    const reviewData: (string | number)[][] = [
      ["Søkeord", "Annonsegruppe", "Klikk", "Kostnad", "CPC", "Notat"],
      ...reviews
        .sort((a, b) => b.cpc - a.cpc)
        .map((k) => {
          let note = "";
          if (k.cpc > 12 && k.clicks > 0) {
            note = "Dyr men leverer — vurder lavere bud";
          } else if (k.clicks > 0 && k.clicks < 5) {
            note = "Lavt volum — gi det mer tid eller test phrase match";
          } else {
            note = "Vurder relevans";
          }
          return [
            k.keyword,
            k.ad_group,
            k.clicks,
            parseFloat(k.cost.toFixed(2)),
            parseFloat(k.cpc.toFixed(2)),
            note,
          ];
        }),
    ];
    const reviewWs = XLSX.utils.aoa_to_sheet(reviewData);
    reviewWs["!cols"] = [
      { wch: 35 },
      { wch: 25 },
      { wch: 8 },
      { wch: 12 },
      { wch: 10 },
      { wch: 50 },
    ];
    XLSX.utils.book_append_sheet(wb, reviewWs, "Vurder disse");

    // Sheet 6: Tag-breakdown — grupper ads-søkeord per tag
    const { data: keywordTaggings } = await supabase
      .from("tag_assignments")
      .select("entity_key, tag:tags(id, name)")
      .eq("entity_type", "keyword");

    interface TagTotals {
      name: string;
      count: number;
      clicks: number;
      cost: number;
      keywords: string[];
    }
    const tagTotals = new Map<string, TagTotals>();
    if (keywordTaggings) {
      // Map entity_key → tag name(s)
      const keyToTags = new Map<string, string[]>();
      for (const t of keywordTaggings as unknown as Array<{
        entity_key: string;
        tag: { id: string; name: string } | null;
      }>) {
        if (!t.tag) continue;
        const list = keyToTags.get(t.entity_key) ?? [];
        list.push(t.tag.name);
        keyToTags.set(t.entity_key, list);
      }

      for (const k of adsKeywords) {
        const key = keywordEntityKey(k.keyword);
        const tags = keyToTags.get(key) ?? [];
        if (tags.length === 0) continue;
        for (const tagName of tags) {
          const existing = tagTotals.get(tagName) ?? {
            name: tagName,
            count: 0,
            clicks: 0,
            cost: 0,
            keywords: [],
          };
          existing.count += 1;
          existing.clicks += k.clicks;
          existing.cost += k.cost;
          existing.keywords.push(k.keyword);
          tagTotals.set(tagName, existing);
        }
      }
    }

    if (tagTotals.size > 0) {
      const tagRows = Array.from(tagTotals.values()).sort(
        (a, b) => b.cost - a.cost
      );
      const tagData: (string | number)[][] = [
        ["Tag", "Antall søkeord", "Totalt klikk", "Total kostnad", "Snitt CPC", "Eksempel-søkeord"],
        ...tagRows.map((t) => [
          t.name,
          t.count,
          t.clicks,
          parseFloat(t.cost.toFixed(2)),
          t.clicks > 0 ? parseFloat((t.cost / t.clicks).toFixed(2)) : 0,
          t.keywords.slice(0, 5).join(", ") + (t.keywords.length > 5 ? "..." : ""),
        ]),
      ];
      const tagWs = XLSX.utils.aoa_to_sheet(tagData);
      tagWs["!cols"] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 12 },
        { wch: 14 },
        { wch: 10 },
        { wch: 60 },
      ];
      XLSX.utils.book_append_sheet(wb, tagWs, "Tag-oversikt");
    }

    const outputBuffer = XLSX.write(wb, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;

    return new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Sokeord-Anbefalinger-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (err) {
    console.error("Generator error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
