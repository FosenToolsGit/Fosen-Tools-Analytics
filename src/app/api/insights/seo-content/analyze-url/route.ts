import { createClient } from "@/lib/supabase/server";
import { GoogleAuth } from "google-auth-library";
import { KeywordPlannerService } from "@/lib/services/keyword-planner";
import { NextResponse, type NextRequest } from "next/server";

interface KeywordCandidate {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  search_volume: number | null;
  competition: string | null;
  score: number;
  category: "low_hanging" | "growth" | "long_tail" | "underperforming";
  reasoning: string;
}

interface PageContext {
  title: string | null;
  meta_description: string | null;
  h1: string[];
  h2: string[];
  word_count: number;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&aring;/g, "å")
    .replace(/&oslash;/g, "ø")
    .replace(/&aelig;/g, "æ")
    .replace(/&AElig;/g, "Æ")
    .replace(/&Oslash;/g, "Ø")
    .replace(/&Aring;/g, "Å")
    .replace(/&nbsp;/g, " ");
}

function extractTextList(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "gis");
  const out: string[] = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const text = decodeEntities(m[1].replace(/<[^>]+>/g, "")).trim();
    if (text) out.push(text);
  }
  return out;
}

function extractMeta(html: string, name: string): string | null {
  const regex = new RegExp(
    `<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`,
    "i"
  );
  const m = regex.exec(html);
  return m ? decodeEntities(m[1]) : null;
}

function extractTitle(html: string): string | null {
  const m = new RegExp("<title[^>]*>(.*?)</title>", "is").exec(html);
  return m ? decodeEntities(m[1]).trim() : null;
}

async function scrapePage(url: string): Promise<PageContext> {
  const ctx: PageContext = {
    title: null,
    meta_description: null,
    h1: [],
    h2: [],
    word_count: 0,
  };
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return ctx;
    const html = await res.text();
    ctx.title = extractTitle(html);
    ctx.meta_description = extractMeta(html, "description");
    ctx.h1 = extractTextList(html, "h1").slice(0, 5);
    ctx.h2 = extractTextList(html, "h2").slice(0, 15);
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
    ctx.word_count = text.split(/\s+/).filter(Boolean).length;
  } catch {
    // graceful
  }
  return ctx;
}

interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

async function fetchKeywordsForUrl(url: string, from: string, to: string): Promise<GscRow[]> {
  if (!process.env.GA4_CLIENT_EMAIL || !process.env.GA4_PRIVATE_KEY) return [];
  try {
    const auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GA4_CLIENT_EMAIL,
        private_key: process.env.GA4_PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token || "";

    const siteUrl = process.env.SEARCH_CONSOLE_SITE_URL || "sc-domain:fosen-tools.no";
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: from,
          endDate: to,
          dimensions: ["query"],
          dimensionFilterGroups: [
            { filters: [{ dimension: "page", operator: "equals", expression: url }] },
          ],
          rowLimit: 200,
          type: "web",
        }),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.rows ?? []) as GscRow[];
  } catch {
    return [];
  }
}

async function fetchKeywordVolumes(keywords: string[]): Promise<Map<string, { volume: number; competition: string }>> {
  const out = new Map<string, { volume: number; competition: string }>();
  if (keywords.length === 0) return out;
  try {
    const planner = new KeywordPlannerService();
    const status = await planner.checkAccess();
    if (!status.available) return out;
    const ideas = await planner.getIdeas(keywords.slice(0, 20));
    for (const idea of ideas) {
      out.set(idea.text.toLowerCase(), {
        volume: idea.avg_monthly_searches,
        competition: idea.competition,
      });
    }
  } catch {
    // graceful — KP not available
  }
  return out;
}

function classifyCandidate(row: GscRow, volume: number | null): { category: KeywordCandidate["category"]; score: number; reasoning: string } {
  const pos = row.position;
  const impressions = row.impressions;
  const clicks = row.clicks;
  const v = volume ?? Math.max(impressions * 4, 50);

  // Score = volum × possibility (basert på posisjon — jo bedre posisjon, høyere possibility)
  // possibility(pos) = 1 / (1 + (pos / 10)^1.5) — gir 1.0 på pos 0, 0.5 på pos 10, 0.2 på pos 30
  const possibility = 1 / (1 + Math.pow(pos / 10, 1.5));
  const score = Math.round(v * possibility);

  let category: KeywordCandidate["category"];
  let reasoning: string;

  if (pos >= 4 && pos <= 15 && v >= 100) {
    category = "low_hanging";
    reasoning = `Pos ${pos.toFixed(1)} med ${v}+ volum/mnd — liten dytt kan gi side 1`;
  } else if (pos <= 3 && clicks < impressions * 0.05) {
    category = "underperforming";
    reasoning = `Topp 3 men lav CTR (${(row.ctr * 100).toFixed(1)}%) — title/meta trenger optimalisering`;
  } else if (pos >= 16 && v >= 500) {
    category = "growth";
    reasoning = `Pos ${pos.toFixed(0)} men ${v}/mnd volum — krever større innholdsløft`;
  } else {
    category = "long_tail";
    reasoning = `Long-tail: pos ${pos.toFixed(1)}, ${v}/mnd volum`;
  }
  return { category, score, reasoning };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { url?: string; days?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.url) {
    return NextResponse.json({ error: "url er påkrevd" }, { status: 400 });
  }
  const url = body.url.trim();
  if (!url.startsWith("http")) {
    return NextResponse.json({ error: "URL må starte med http:// eller https://" }, { status: 400 });
  }

  const days = Math.max(7, Math.min(90, body.days ?? 90));
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const [pageContext, gscRows] = await Promise.all([
    scrapePage(url),
    fetchKeywordsForUrl(url, from, to),
  ]);

  const topKeywords = gscRows.slice(0, 30).map((r) => r.keys[0]);
  const volumes = await fetchKeywordVolumes(topKeywords);

  const candidates: KeywordCandidate[] = gscRows.slice(0, 30).map((row) => {
    const query = row.keys[0];
    const v = volumes.get(query.toLowerCase());
    const { category, score, reasoning } = classifyCandidate(row, v?.volume ?? null);
    return {
      query,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      search_volume: v?.volume ?? null,
      competition: v?.competition ?? null,
      score,
      category,
      reasoning,
    };
  });

  candidates.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    url,
    days_analyzed: days,
    page_context: pageContext,
    candidates: candidates.slice(0, 12),
    keyword_planner_available: volumes.size > 0,
    total_keywords_found: gscRows.length,
  });
}
