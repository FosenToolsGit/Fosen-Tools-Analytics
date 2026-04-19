import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import {
  KeywordPlannerService,
  getKeywordPlannerStatus,
  type KeywordPlannerResult,
} from "@/lib/services/keyword-planner";

/**
 * Vekstmuligheter: krysskobler Keyword Planner-forslag med Fosen Tools sin
 * nåværende Search Console-rangering. Identifiserer søkeord med høyt
 * søkevolum der vi ennå ikke rangerer godt — eller ikke rangerer i det
 * hele tatt.
 */

export interface GrowthOpportunity {
  keyword: string;
  monthly_searches: number;
  competition: "LOW" | "MEDIUM" | "HIGH" | "UNSPECIFIED";
  low_bid_nok: number;
  high_bid_nok: number;
  current_position: number | null;
  current_clicks: number;
  current_impressions: number;
  current_page_url: string | null;
  relevance_score: number;
  potential_score: number;
  category:
    | "not_ranking"
    | "low_rank"
    | "almost_page_one"
    | "ranking_well"
    | "brand_term";
  priority: "high" | "medium" | "low";
  matched_seed: string;
}

export interface GrowthResponse {
  status: { available: boolean; message?: string };
  summary: {
    total_ideas: number;
    not_ranking: number;
    low_rank: number;
    almost_page_one: number;
    ranking_well: number;
    brand_terms: number;
    total_potential_searches: number;
  };
  opportunities: GrowthOpportunity[];
  seeds_used: string[];
}

// Default seeds basert på Fosen Tools sitt produktsortiment
const DEFAULT_SEEDS = [
  "verktøy",
  "verktøyvogn",
  "verktøykoffert",
  "pelicase",
  "industriverktøy",
  "snap-on",
  "milwaukee verktøy",
  "facom verktøy",
  "batteriverktøy",
  "momentnøkkel",
  "verktøysett",
  "verktøyskap",
];

// Termer som indikerer høy relevans for Fosen Tools
const RELEVANCE_KEYWORDS = [
  "verktøy",
  "tools",
  "pelicase",
  "peli case",
  "verkstedbord",
  "verkstedinnredning",
  "verktøyvogn",
  "verktøykoffert",
  "verktøyskap",
  "industriverktøy",
  "offshore",
  "bilverksted",
  "elbil",
  "pipenøkkel",
  "momentnøkkel",
  "luft",
  "trykkluft",
  "bits",
  "boremaskin",
  "muttertrekker",
];

// Brand-termer for merker Fosen Tools fører
const BRANDS = [
  "snap-on",
  "snapon",
  "milwaukee",
  "facom",
  "leatherman",
  "peli",
  "kincrome",
  "ledlenser",
  "bahco",
  "knipex",
  "wera",
  "draper",
  "ingersoll",
];

// Kommersielle intent-signaler (indikerer kjøpsvilje)
const COMMERCIAL_INTENT = ["kjøpe", "pris", "tilbud", "butikk", "nettbutikk", "billig"];

// Fosen egne brand-termer (ekskluder — vi ranker allerede på dem)
const OWN_BRAND = ["fosen tools", "fosentools", "fosen-tools"];

function calculateRelevance(keyword: string): number {
  const lower = keyword.toLowerCase();
  let score = 0;

  for (const term of RELEVANCE_KEYWORDS) {
    if (lower.includes(term)) score += 3;
  }
  for (const brand of BRANDS) {
    if (lower.includes(brand)) score += 2;
  }
  for (const intent of COMMERCIAL_INTENT) {
    if (lower.includes(intent)) score += 1;
  }
  // Lange spesifikke søk er ofte mindre relevant (f.eks. "snap-on motorcycle tools")
  const words = lower.split(/\s+/).length;
  if (words > 5) score -= 1;

  return Math.max(0, score);
}

function classifyOpportunity(
  position: number | null,
  isOwnBrand: boolean,
  monthlySearches: number
): GrowthOpportunity["category"] {
  if (isOwnBrand) return "brand_term";
  if (position === null) return "not_ranking";
  if (position <= 3) return "ranking_well";
  if (position <= 10) return "almost_page_one";
  if (position <= 30) return "low_rank";
  return "not_ranking";
}

function calculatePotential(
  monthlySearches: number,
  position: number | null,
  relevance: number
): number {
  // Potensial = forventede ekstra klikk hvis vi klatrer til topp 3
  // Topp 3 har typisk CTR ~20%, avhengig av posisjon
  let currentCtr = 0;
  if (position === null) currentCtr = 0;
  else if (position <= 1) currentCtr = 0.3;
  else if (position <= 3) currentCtr = 0.15;
  else if (position <= 5) currentCtr = 0.05;
  else if (position <= 10) currentCtr = 0.02;
  else currentCtr = 0.005;

  const targetCtr = 0.2; // Topp 3-snitt
  const potentialExtraClicks = Math.max(0, monthlySearches * (targetCtr - currentCtr));

  // Multiply by relevance factor (0-1 skala)
  const relevanceFactor = Math.min(1, relevance / 5);
  return Math.round(potentialExtraClicks * relevanceFactor);
}

function getPriority(
  potential: number,
  relevance: number
): "high" | "medium" | "low" {
  if (potential >= 100 && relevance >= 3) return "high";
  if (potential >= 30 && relevance >= 2) return "medium";
  return "low";
}

interface SearchKeywordAgg {
  position: number;
  clicks: number;
  impressions: number;
  count: number;
}

async function fetchCurrentRankings(
  supabase: Awaited<ReturnType<typeof createClient>>,
  from: string,
  to: string
): Promise<Map<string, SearchKeywordAgg>> {
  const map = new Map<string, SearchKeywordAgg>();
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("search_keywords")
      .select("query, clicks, impressions, position")
      .gte("metric_date", from)
      .lte("metric_date", to)
      .range(offset, offset + pageSize - 1);
    if (error || !data || data.length === 0) break;
    for (const row of data) {
      const q = (row.query || "").trim().toLowerCase();
      if (!q) continue;
      const ex = map.get(q) ?? { position: 0, clicks: 0, impressions: 0, count: 0 };
      const impr = Number(row.impressions) || 0;
      ex.clicks += Number(row.clicks) || 0;
      ex.impressions += impr;
      ex.position += (Number(row.position) || 50) * impr;
      ex.count += impr;
      map.set(q, ex);
    }
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  // Normalize weighted position
  for (const v of map.values()) {
    v.position = v.count > 0 ? v.position / v.count : 0;
  }
  return map;
}

async function fetchPageUrls(from: string, to: string): Promise<Map<string, string>> {
  const { GoogleAuth } = await import("google-auth-library");
  const map = new Map<string, string>();
  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GA4_CLIENT_EMAIL!,
        private_key: process.env.GA4_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    const client = await auth.getClient();
    const token = (await client.getAccessToken()).token || "";
    const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL || "sc-domain:fosen-tools.no";
    const response = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: from,
          endDate: to,
          dimensions: ["query", "page"],
          rowLimit: 5000,
        }),
      }
    );
    if (!response.ok) return map;
    const data = await response.json();
    for (const row of data.rows ?? []) {
      const query = (row.keys[0] || "").trim().toLowerCase();
      const page = row.keys[1] || "";
      if (!map.has(query) || row.clicks > 0) {
        map.set(query, page);
      }
    }
  } catch {
    // Graceful degradation
  }
  return map;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    seeds?: string[];
    from?: string;
    to?: string;
  };
  const seeds = body.seeds && body.seeds.length > 0 ? body.seeds : DEFAULT_SEEDS;

  // Default datorange: siste 90 dager
  const toDate = body.to || new Date().toISOString().slice(0, 10);
  const fromDate =
    body.from ||
    new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);

  try {
    // 1. Sjekk Keyword Planner-tilgang
    const status = await getKeywordPlannerStatus();
    if (!status.available) {
      return NextResponse.json({
        status,
        summary: {
          total_ideas: 0,
          not_ranking: 0,
          low_rank: 0,
          almost_page_one: 0,
          ranking_well: 0,
          brand_terms: 0,
          total_potential_searches: 0,
        },
        opportunities: [],
        seeds_used: seeds,
      } as GrowthResponse);
    }

    // 2. Hent Keyword Planner-ideer + nåværende rangeringer parallelt
    const service = new KeywordPlannerService();
    const [ideasRaw, currentRankings, pageUrls] = await Promise.all([
      service.getIdeas(seeds, { pageSize: 200 }),
      fetchCurrentRankings(supabase, fromDate, toDate),
      fetchPageUrls(fromDate, toDate),
    ]);

    // 3. Dedupliser ideer (noen kan komme tilbake fra flere seeds)
    const ideaMap = new Map<string, KeywordPlannerResult & { seed: string }>();
    for (const idea of ideasRaw) {
      const key = idea.text.toLowerCase().trim();
      if (!ideaMap.has(key) || (ideaMap.get(key)!.avg_monthly_searches || 0) < idea.avg_monthly_searches) {
        // Finn hvilket seed som matcher best
        const matchedSeed = seeds.find((s) => key.includes(s.toLowerCase())) || seeds[0];
        ideaMap.set(key, { ...idea, seed: matchedSeed });
      }
    }

    // 4. Bygg opportunities med krysskobling
    const opportunities: GrowthOpportunity[] = [];
    for (const [key, idea] of ideaMap) {
      // Skip hvis søket har 0 volum
      if (!idea.avg_monthly_searches || idea.avg_monthly_searches < 10) continue;

      // Skip egne brand-termer (vi ranker allerede på dem)
      const isOwnBrand = OWN_BRAND.some((b) => key.includes(b));
      if (isOwnBrand) continue;

      const ranking = currentRankings.get(key);
      const position = ranking ? Math.round(ranking.position * 10) / 10 : null;
      const relevance = calculateRelevance(key);

      // Filtrer bort svært lav relevans (gir støy)
      if (relevance === 0 && !ranking) continue;

      const category = classifyOpportunity(position, false, idea.avg_monthly_searches);
      const potential = calculatePotential(idea.avg_monthly_searches, position, relevance);
      const priority = getPriority(potential, relevance);

      opportunities.push({
        keyword: idea.text,
        monthly_searches: idea.avg_monthly_searches,
        competition: idea.competition,
        low_bid_nok: Math.round(idea.low_top_bid_nok * 100) / 100,
        high_bid_nok: Math.round(idea.high_top_bid_nok * 100) / 100,
        current_position: position,
        current_clicks: ranking?.clicks || 0,
        current_impressions: ranking?.impressions || 0,
        current_page_url: pageUrls.get(key) || null,
        relevance_score: relevance,
        potential_score: potential,
        category,
        priority,
        matched_seed: idea.seed,
      });
    }

    // 5. Sorter etter potensial
    opportunities.sort((a, b) => b.potential_score - a.potential_score);

    const summary = {
      total_ideas: opportunities.length,
      not_ranking: opportunities.filter((o) => o.category === "not_ranking").length,
      low_rank: opportunities.filter((o) => o.category === "low_rank").length,
      almost_page_one: opportunities.filter((o) => o.category === "almost_page_one").length,
      ranking_well: opportunities.filter((o) => o.category === "ranking_well").length,
      brand_terms: 0,
      total_potential_searches: opportunities.reduce(
        (s, o) => s + o.monthly_searches,
        0
      ),
    };

    const response: GrowthResponse = {
      status,
      summary,
      opportunities,
      seeds_used: seeds,
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
