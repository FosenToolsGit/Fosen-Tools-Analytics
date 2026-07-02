import { GoogleAuth } from "google-auth-library";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

const SITE_ORIGIN = "https://fosen-tools.no";
const SITEMAP_URL = `${SITE_ORIGIN}/sitemap.xml`;
const ROBOTS_URL = `${SITE_ORIGIN}/robots.txt`;
const GSC_SITE = "sc-domain:fosen-tools.no";

interface GSCPageRow {
  url: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

interface GSCQueryPageRow {
  query: string;
  url: string;
  clicks: number;
  impressions: number;
  position: number;
}

export interface IndexingOrphan {
  url: string;
}

export interface IndexingZombie {
  url: string;
  impressions: number;
  clicks: number;
  position: number;
}

export interface IndexingBuried {
  url: string;
  impressions: number;
  clicks: number;
  position: number;
  top_query: string | null;
  top_query_position: number | null;
}

export interface IndexingCannibalized {
  query: string;
  total_impressions: number;
  total_clicks: number;
  urls: Array<{
    url: string;
    impressions: number;
    clicks: number;
    position: number;
  }>;
}

export interface IndexingLegacy {
  url: string;
  impressions: number;
  clicks: number;
  position: number;
  alternative: string;
  alternative_impressions: number;
  alternative_position: number;
}

export interface IndexingParam {
  url: string;
  impressions: number;
  clicks: number;
  position: number;
  blocked_by_robots: boolean;
}

export interface IndexingResponse {
  summary: {
    sitemap_total: number;
    sitemap_with_impressions: number;
    orphans: number;
    zombies: number;
    buried: number;
    cannibalized: number;
    legacy_urls: number;
    param_urls: number;
    robots_ok: boolean;
    sitemap_ok: boolean;
  };
  issues: {
    orphans: IndexingOrphan[];
    zombies: IndexingZombie[];
    buried: IndexingBuried[];
    cannibalized: IndexingCannibalized[];
    legacy_urls: IndexingLegacy[];
    param_urls: IndexingParam[];
  };
  robots_txt: string | null;
  sitemap_url: string;
}

async function fetchGSCToken(): Promise<string> {
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GA4_CLIENT_EMAIL!,
      private_key: process.env.GA4_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const client = await auth.getClient();
  const tok = await client.getAccessToken();
  return tok.token || "";
}

async function fetchGSCPages(
  token: string,
  from: string,
  to: string
): Promise<GSCPageRow[]> {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      GSC_SITE
    )}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: from,
        endDate: to,
        dimensions: ["page"],
        rowLimit: 5000,
        type: "web",
      }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.rows ?? []).map((r: { keys: string[]; clicks: number; impressions: number; position: number; ctr: number }) => ({
    url: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    position: r.position,
    ctr: r.ctr,
  }));
}

async function fetchGSCQueryPages(
  token: string,
  from: string,
  to: string
): Promise<GSCQueryPageRow[]> {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      GSC_SITE
    )}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: from,
        endDate: to,
        dimensions: ["query", "page"],
        rowLimit: 25000,
        type: "web",
      }),
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.rows ?? []).map((r: { keys: string[]; clicks: number; impressions: number; position: number }) => ({
    query: r.keys[0],
    url: r.keys[1],
    clicks: r.clicks,
    impressions: r.impressions,
    position: r.position,
  }));
}

async function fetchSitemapUrls(): Promise<{ urls: string[]; ok: boolean }> {
  try {
    const res = await fetch(SITEMAP_URL);
    if (!res.ok) return { urls: [], ok: false };
    const xml = await res.text();
    // Handle both flat sitemaps and sitemap indexes
    const sitemapMatches = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/g)];
    if (sitemapMatches.length > 0) {
      // This is a sitemap index — follow nested sitemaps
      const urls: string[] = [];
      for (const m of sitemapMatches) {
        try {
          const nested = await fetch(m[1]).then((r) => (r.ok ? r.text() : ""));
          const nestedUrls = [...nested.matchAll(/<loc>(.*?)<\/loc>/g)].map((x) => x[1]);
          urls.push(...nestedUrls);
        } catch {
          // skip broken nested sitemap
        }
      }
      return { urls, ok: true };
    }
    const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    return { urls, ok: true };
  } catch {
    return { urls: [], ok: false };
  }
}

async function fetchRobotsTxt(): Promise<{ text: string | null; ok: boolean }> {
  try {
    const res = await fetch(ROBOTS_URL);
    if (!res.ok) return { text: null, ok: false };
    const text = await res.text();
    return { text, ok: true };
  } catch {
    return { text: null, ok: false };
  }
}

function normalize(url: string): string {
  // Strip trailing slash, lowercase host, remove default ports, keep path case
  try {
    const u = new URL(url);
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return `${u.protocol}//${u.host.toLowerCase()}${path}${u.search}`;
  } catch {
    return url;
  }
}

function isParamUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.search.length > 0;
  } catch {
    return false;
  }
}

function isLegacyCategoriesUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.pathname.startsWith("/categories/");
  } catch {
    return false;
  }
}

function legacyAlternativePath(categoriesUrl: string): string | null {
  try {
    const u = new URL(categoriesUrl);
    const m = u.pathname.match(/^\/categories\/(.+)$/);
    if (!m) return null;
    return `${u.protocol}//${u.host}/${m[1]}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const sp = request.nextUrl.searchParams;
  const from = sp.get("from");
  const to = sp.get("to");
  if (!from || !to)
    return NextResponse.json({ error: "Missing from/to" }, { status: 400 });

  try {
    const token = await fetchGSCToken();
    const [{ urls: sitemapUrls, ok: sitemapOk }, { text: robotsTxt, ok: robotsOk }, pages, queryPages] =
      await Promise.all([
        fetchSitemapUrls(),
        fetchRobotsTxt(),
        fetchGSCPages(token, from, to),
        fetchGSCQueryPages(token, from, to),
      ]);

    const sitemapSet = new Set(sitemapUrls.map(normalize));
    const pagesMap = new Map<string, GSCPageRow>();
    for (const p of pages) pagesMap.set(normalize(p.url), p);

    // ─── Orphans: in sitemap, 0 impressions in GSC ───
    const orphans: IndexingOrphan[] = [];
    for (const u of sitemapUrls) {
      const n = normalize(u);
      if (!pagesMap.has(n)) orphans.push({ url: u });
    }

    // ─── Zombies: ranking but not in sitemap (ignore param URLs + legacy) ───
    const zombies: IndexingZombie[] = [];
    for (const p of pages) {
      const n = normalize(p.url);
      if (sitemapSet.has(n)) continue;
      if (isParamUrl(p.url)) continue;
      if (isLegacyCategoriesUrl(p.url)) continue;
      if (p.impressions < 10) continue;
      zombies.push({
        url: p.url,
        impressions: p.impressions,
        clicks: p.clicks,
        position: p.position,
      });
    }
    zombies.sort((a, b) => b.impressions - a.impressions);

    // ─── Buried: high impressions, position > 30 ───
    const topQueryByPage = new Map<string, { query: string; position: number; impressions: number }>();
    for (const qp of queryPages) {
      const n = normalize(qp.url);
      const existing = topQueryByPage.get(n);
      if (!existing || qp.impressions > existing.impressions) {
        topQueryByPage.set(n, {
          query: qp.query,
          position: qp.position,
          impressions: qp.impressions,
        });
      }
    }

    const buried: IndexingBuried[] = [];
    for (const p of pages) {
      if (p.position < 30) continue;
      if (p.impressions < 30) continue;
      const top = topQueryByPage.get(normalize(p.url));
      buried.push({
        url: p.url,
        impressions: p.impressions,
        clicks: p.clicks,
        position: p.position,
        top_query: top?.query ?? null,
        top_query_position: top?.position ?? null,
      });
    }
    buried.sort((a, b) => b.impressions - a.impressions);

    // ─── Cannibalized: same query ranking multiple URLs ───
    const queryUrlMap = new Map<
      string,
      Array<{ url: string; impressions: number; clicks: number; position: number }>
    >();
    for (const qp of queryPages) {
      if (qp.impressions < 5) continue;
      const ex = queryUrlMap.get(qp.query) ?? [];
      ex.push({ url: qp.url, impressions: qp.impressions, clicks: qp.clicks, position: qp.position });
      queryUrlMap.set(qp.query, ex);
    }
    const cannibalized: IndexingCannibalized[] = [];
    for (const [query, urls] of queryUrlMap) {
      if (urls.length < 2) continue;
      const totalImpr = urls.reduce((a, b) => a + b.impressions, 0);
      if (totalImpr < 30) continue;
      urls.sort((a, b) => b.impressions - a.impressions);
      cannibalized.push({
        query,
        total_impressions: totalImpr,
        total_clicks: urls.reduce((a, b) => a + b.clicks, 0),
        urls: urls.slice(0, 5),
      });
    }
    cannibalized.sort((a, b) => b.total_impressions - a.total_impressions);

    // ─── Legacy /categories/ URLs with better direct alternatives ───
    const legacy_urls: IndexingLegacy[] = [];
    for (const p of pages) {
      if (!isLegacyCategoriesUrl(p.url)) continue;
      const altPath = legacyAlternativePath(p.url);
      if (!altPath) continue;
      const alt = pagesMap.get(normalize(altPath));
      legacy_urls.push({
        url: p.url,
        impressions: p.impressions,
        clicks: p.clicks,
        position: p.position,
        alternative: altPath,
        alternative_impressions: alt?.impressions ?? 0,
        alternative_position: alt?.position ?? 0,
      });
    }
    legacy_urls.sort((a, b) => b.impressions - a.impressions);

    // ─── Parameter URLs getting impressions (should usually be blocked) ───
    const param_urls: IndexingParam[] = [];
    const robotsLower = (robotsTxt || "").toLowerCase();
    for (const p of pages) {
      if (!isParamUrl(p.url)) continue;
      if (p.impressions < 5) continue;
      const u = new URL(p.url);
      const hasFilter = u.search.toLowerCase().includes("filter=");
      const hasDeviceSize = u.search.toLowerCase().includes("devicesize=");
      const blocked =
        (hasFilter && robotsLower.includes("filter=")) ||
        (hasDeviceSize && robotsLower.includes("devicesize="));
      param_urls.push({
        url: p.url,
        impressions: p.impressions,
        clicks: p.clicks,
        position: p.position,
        blocked_by_robots: blocked,
      });
    }
    param_urls.sort((a, b) => b.impressions - a.impressions);

    const withImpressions = sitemapUrls.filter((u) => pagesMap.has(normalize(u))).length;

    const response: IndexingResponse = {
      summary: {
        sitemap_total: sitemapUrls.length,
        sitemap_with_impressions: withImpressions,
        orphans: orphans.length,
        zombies: zombies.length,
        buried: buried.length,
        cannibalized: cannibalized.length,
        legacy_urls: legacy_urls.length,
        param_urls: param_urls.length,
        robots_ok: robotsOk,
        sitemap_ok: sitemapOk,
      },
      issues: {
        orphans: orphans.slice(0, 500),
        zombies: zombies.slice(0, 100),
        buried: buried.slice(0, 100),
        cannibalized: cannibalized.slice(0, 100),
        legacy_urls,
        param_urls: param_urls.slice(0, 100),
      },
      robots_txt: robotsTxt,
      sitemap_url: SITEMAP_URL,
    };

    return NextResponse.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
