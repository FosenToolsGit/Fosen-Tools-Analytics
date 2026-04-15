/**
 * Shared keyword-rapport-generator brukt av både Excel-opplasting og live DB-modus
 * i /api/keyword-generator. Tar ferdig-parsede ads-søkeord og organiske søkeord,
 * klassifiserer dem og bygger Excel-arbeidsboken som lastes ned.
 */
import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";
import { keywordEntityKey, ruleMatches, type TagRule } from "@/lib/types/tags";
import type {
  IntelligenceReport,
  KeywordSignal,
} from "@/lib/services/keyword-intelligence";
import type { KeywordPlannerResult } from "@/lib/services/keyword-planner";

export interface AdsKeywordInput {
  type?: string;
  campaign?: string;
  ad_group?: string;
  keyword: string;
  clicks: number;
  cost: number;
  cpc: number;
}

export interface OrganicKeywordInput {
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

export async function getCompetitorRules(
  supabase: SupabaseClient
): Promise<TagRule[] | null> {
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

export function makeCompetitorMatcher(
  rules: TagRule[] | null
): (kw: string) => boolean {
  if (rules && rules.length > 0) {
    return (kw: string) => rules.some((r) => ruleMatches(r, kw));
  }
  return (kw: string) => {
    const lower = kw.toLowerCase();
    return KONKURRENT_FALLBACK.some((m) => lower.includes(m));
  };
}

export async function buildKeywordReport(
  supabase: SupabaseClient,
  adsKeywords: AdsKeywordInput[],
  organicMap: Map<string, OrganicKeywordInput>
): Promise<Buffer> {
  const totalClicks = adsKeywords.reduce((s, k) => s + k.clicks, 0);
  const totalCost = adsKeywords.reduce((s, k) => s + k.cost, 0);
  const avgCpc = totalClicks > 0 ? totalCost / totalClicks : 0;

  const competitorRules = await getCompetitorRules(supabase);
  const isCompetitor = makeCompetitorMatcher(competitorRules);

  const cuts: Array<AdsKeywordInput & { reason: string }> = [];
  const keeps: AdsKeywordInput[] = [];
  const reviews: AdsKeywordInput[] = [];

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
      cuts.push({ ...k, reason: "Ingen klikk — ingen søker etter dette" });
    } else if (k.clicks >= 5 && k.cpc < 12) {
      keeps.push(k);
    } else {
      reviews.push(k);
    }
  }

  const adsKeywordSet = new Set(
    adsKeywords.map((k) => k.keyword.toLowerCase().trim())
  );
  const opportunities = Array.from(organicMap.values())
    .filter((o) => {
      const lower = o.query.toLowerCase().trim();
      return !adsKeywordSet.has(lower) && o.impressions >= 50 && o.position >= 4;
    })
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 30);

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
    ["", (cuts.reduce((s, k) => s + k.cost, 0) / 6).toFixed(2) + " NOK"],
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
        k.ad_group ?? "",
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
          k.ad_group ?? "",
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

  // Sheet 4: Nye muligheter
  const oppsData: (string | number)[][] = [
    ["Søkeord", "Visninger (org)", "Klikk (org)", "Posisjon", "Strategi"],
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
          k.ad_group ?? "",
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

  // Sheet 6: Tag-oversikt
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
      [
        "Tag",
        "Antall søkeord",
        "Totalt klikk",
        "Total kostnad",
        "Snitt CPC",
        "Eksempel-søkeord",
      ],
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

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/**
 * Utvidet Excel-rapport som inkluderer intelligens-data fra keyword-intelligence.
 * Dette er den nye "optimaliserte" rapporten — bruker konverteringsdata og
 * flere kilder for smartere anbefalinger. Backward-compatible: tar samme
 * input som buildKeywordReport pluss en valgfri IntelligenceReport.
 */
export async function buildIntelligentKeywordReport(
  supabase: SupabaseClient,
  adsKeywords: AdsKeywordInput[],
  organicMap: Map<string, OrganicKeywordInput>,
  intelligence: IntelligenceReport | null,
  plannerIdeas: KeywordPlannerResult[] | null
): Promise<Buffer> {
  // Start med basis-rapporten (6 sheets)
  const baseBuffer = await buildKeywordReport(supabase, adsKeywords, organicMap);
  const wb = XLSX.read(baseBuffer, { type: "buffer" });

  if (intelligence) {
    // Ark 7: Skaler opp
    const scaleData: (string | number)[][] = [
      [
        "Søkeord",
        "Kilder",
        "Klikk",
        "Kostnad",
        "Est. verdi",
        "ROAS",
        "Konfidens",
        "Anbefaling",
      ],
      ...intelligence.top_scale_up.map((s) => [
        s.keyword,
        s.sources.join(", "),
        s.total_clicks,
        parseFloat(s.total_cost.toFixed(2)),
        parseFloat(s.est_conversion_value.toFixed(2)),
        parseFloat(s.est_roas.toFixed(2)),
        s.confidence,
        s.verdict_reason,
      ]),
    ];
    const scaleWs = XLSX.utils.aoa_to_sheet(scaleData);
    scaleWs["!cols"] = [
      { wch: 35 },
      { wch: 30 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 8 },
      { wch: 10 },
      { wch: 60 },
    ];
    XLSX.utils.book_append_sheet(wb, scaleWs, "Skaler opp");

    // Ark 8: Negativ-kandidater
    const negData: (string | number)[][] = [
      [
        "Søkeord",
        "Grunn",
        "Klikk",
        "Kostnad",
        "Kilder",
      ],
      ...intelligence.negative_suggestions.map((s) => [
        s.keyword,
        s.verdict_reason,
        s.total_clicks,
        parseFloat(s.total_cost.toFixed(2)),
        s.sources.join(", "),
      ]),
    ];
    const negWs = XLSX.utils.aoa_to_sheet(negData);
    negWs["!cols"] = [
      { wch: 35 },
      { wch: 60 },
      { wch: 8 },
      { wch: 12 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, negWs, "Negativ-kandidater");

    // Ark 9: Nye muligheter (GSC + Pmax)
    const newOppData: (string | number)[][] = [
      [
        "Søkeord",
        "Kilder",
        "Org. visninger",
        "Org. posisjon",
        "Anbefaling",
      ],
      ...intelligence.new_opportunities.map((s) => [
        s.keyword,
        s.sources.join(", "),
        s.organic_impressions ?? 0,
        s.organic_position ? parseFloat(s.organic_position.toFixed(1)) : 0,
        s.verdict_reason,
      ]),
    ];
    const newOppWs = XLSX.utils.aoa_to_sheet(newOppData);
    newOppWs["!cols"] = [
      { wch: 35 },
      { wch: 25 },
      { wch: 14 },
      { wch: 12 },
      { wch: 60 },
    ];
    XLSX.utils.book_append_sheet(wb, newOppWs, "Nye muligheter (DB)");
  }

  // Ark 10: Keyword Planner (bare hvis tilgjengelig)
  if (plannerIdeas && plannerIdeas.length > 0) {
    const plannerData: (string | number)[][] = [
      [
        "Søkeord",
        "Søk/mnd",
        "Konkurranse",
        "Min CPC (NOK)",
        "Max CPC (NOK)",
      ],
      ...plannerIdeas.map((k) => [
        k.text,
        k.avg_monthly_searches,
        k.competition,
        parseFloat(k.low_top_bid_nok.toFixed(2)),
        parseFloat(k.high_top_bid_nok.toFixed(2)),
      ]),
    ];
    const plannerWs = XLSX.utils.aoa_to_sheet(plannerData);
    plannerWs["!cols"] = [
      { wch: 35 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, plannerWs, "Keyword Planner");
  } else {
    // Tom plassholder med forklaring
    const plannerEmpty: (string | number)[][] = [
      ["Keyword Planner krever Basic Access på developer token."],
      [
        "Google godkjenner dette 1–2 virkedager etter søknad. Dette arket fylles automatisk når tilgang er klar.",
      ],
    ];
    const plannerEmptyWs = XLSX.utils.aoa_to_sheet(plannerEmpty);
    plannerEmptyWs["!cols"] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, plannerEmptyWs, "Keyword Planner");
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// Re-eksporter KeywordSignal-typen for enklere bruk i andre moduler
export type { KeywordSignal };

/**
 * Henter organiske søkeord fra Search Console (siste 30 dager) og bygger
 * en Map som buildKeywordReport kan konsumere.
 */
export async function fetchOrganicMap(
  supabase: SupabaseClient
): Promise<Map<string, OrganicKeywordInput>> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const fromStr = thirtyDaysAgo.toISOString().split("T")[0];
  const toStr = today.toISOString().split("T")[0];

  const { data: organicRows } = await supabase
    .from("search_keywords")
    .select("*")
    .gte("metric_date", fromStr)
    .lte("metric_date", toStr);

  const organicMap = new Map<string, OrganicKeywordInput>();
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
  return organicMap;
}
