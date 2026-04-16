import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

interface SEOElement {
  title: string | null;
  meta_description: string | null;
  h1: string[];
  h2: string[];
  h3: string[];
  canonical: string | null;
  og_title: string | null;
  og_description: string | null;
  word_count: number;
  image_count: number;
  images_without_alt: number;
  internal_links: number;
  external_links: number;
}

interface SEOIssue {
  type: "error" | "warning" | "info";
  element: string;
  message: string;
  current: string | null;
  suggestion: string;
}

export interface PageAnalysisResponse {
  url: string;
  query: string;
  position: number;
  elements: SEOElement;
  issues: SEOIssue[];
  score: number;
}

function extractText(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "gis");
  const matches: string[] = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    if (text) matches.push(text);
  }
  return matches;
}

function extractMeta(html: string, name: string): string | null {
  const regex = new RegExp(
    `<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`,
    "i"
  );
  const m = regex.exec(html);
  return m ? (m[1] || m[2] || null) : null;
}

function extractTitle(html: string): string | null {
  const m = new RegExp("<title[^>]*>(.*?)</title>", "is").exec(html);
  return m ? m[1].trim() : null;
}

function extractCanonical(html: string): string | null {
  const m = /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i.exec(html);
  return m ? m[1] : null;
}

function countImages(html: string): { total: number; withoutAlt: number } {
  const imgs = html.match(/<img[^>]*>/gi) || [];
  let withoutAlt = 0;
  for (const img of imgs) {
    if (!/alt=["'][^"']+["']/i.test(img)) withoutAlt++;
  }
  return { total: imgs.length, withoutAlt };
}

function countLinks(html: string, baseUrl: string): { internal: number; external: number } {
  const linkRegex = /href=["'](https?:\/\/[^"']+)["']/gi;
  let internal = 0;
  let external = 0;
  let m;
  const base = new URL(baseUrl).hostname;
  while ((m = linkRegex.exec(html)) !== null) {
    try {
      const linkHost = new URL(m[1]).hostname;
      if (linkHost === base || linkHost.endsWith("." + base)) internal++;
      else external++;
    } catch { /* skip invalid */ }
  }
  return { internal, external };
}

function analyze(
  elements: SEOElement,
  query: string,
  position: number
): SEOIssue[] {
  const issues: SEOIssue[] = [];
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  // Title
  if (!elements.title) {
    issues.push({
      type: "error",
      element: "title",
      message: "Mangler title tag",
      current: null,
      suggestion: `Legg til en title tag som inneholder "${query}"`,
    });
  } else {
    const titleLower = elements.title.toLowerCase();
    if (elements.title.length > 60) {
      issues.push({
        type: "warning",
        element: "title",
        message: `Title er for lang (${elements.title.length} tegn, maks 60)`,
        current: elements.title,
        suggestion: `Forkort til under 60 tegn, behold "${query}" tidlig i tittelen`,
      });
    }
    if (elements.title.length < 30) {
      issues.push({
        type: "warning",
        element: "title",
        message: `Title er for kort (${elements.title.length} tegn)`,
        current: elements.title,
        suggestion: `Utvid tittelen med beskrivende ord relatert til "${query}"`,
      });
    }
    const hasQuery = queryWords.some((w) => titleLower.includes(w));
    if (!hasQuery) {
      issues.push({
        type: "error",
        element: "title",
        message: `Title inneholder ikke søkeordet "${query}"`,
        current: elements.title,
        suggestion: `Inkluder "${query}" (eller varianter) tidlig i title tag`,
      });
    }
  }

  // Meta description
  if (!elements.meta_description) {
    issues.push({
      type: "error",
      element: "meta_description",
      message: "Mangler meta description",
      current: null,
      suggestion: `Legg til meta description (120-155 tegn) som inneholder "${query}" og en call-to-action`,
    });
  } else {
    if (elements.meta_description.length > 155) {
      issues.push({
        type: "warning",
        element: "meta_description",
        message: `Meta description er for lang (${elements.meta_description.length} tegn, maks 155)`,
        current: elements.meta_description,
        suggestion: "Forkort til 120-155 tegn for å unngå avkorting i søkeresultater",
      });
    }
    if (elements.meta_description.length < 70) {
      issues.push({
        type: "warning",
        element: "meta_description",
        message: `Meta description er for kort (${elements.meta_description.length} tegn)`,
        current: elements.meta_description,
        suggestion: `Utvid med mer beskrivende tekst om "${query}" — 120-155 tegn er ideelt`,
      });
    }
    const hasQuery = queryWords.some((w) =>
      elements.meta_description!.toLowerCase().includes(w)
    );
    if (!hasQuery) {
      issues.push({
        type: "warning",
        element: "meta_description",
        message: `Meta description nevner ikke "${query}"`,
        current: elements.meta_description,
        suggestion: `Inkluder "${query}" naturlig i beskrivelsen for å matche søkerens intensjon`,
      });
    }
  }

  // H1
  if (elements.h1.length === 0) {
    issues.push({
      type: "error",
      element: "h1",
      message: "Mangler H1-overskrift",
      current: null,
      suggestion: `Legg til én H1 som inkluderer "${query}"`,
    });
  } else if (elements.h1.length > 1) {
    issues.push({
      type: "warning",
      element: "h1",
      message: `${elements.h1.length} H1-overskrifter (bør være 1)`,
      current: elements.h1.join(" | "),
      suggestion: "Bruk kun én H1 per side — flytt resten til H2",
    });
  } else {
    const h1HasQuery = queryWords.some((w) =>
      elements.h1[0].toLowerCase().includes(w)
    );
    if (!h1HasQuery) {
      issues.push({
        type: "warning",
        element: "h1",
        message: `H1 inneholder ikke "${query}"`,
        current: elements.h1[0],
        suggestion: `Inkluder "${query}" i H1-overskriften`,
      });
    }
  }

  // Content length
  if (elements.word_count < 300) {
    issues.push({
      type: "warning",
      element: "innhold",
      message: `Lite innhold (${elements.word_count} ord)`,
      current: `${elements.word_count} ord`,
      suggestion: `Utvid med minst 300-500 ord relevant innhold om "${query}" for bedre ranking`,
    });
  }

  // Images without alt
  if (elements.images_without_alt > 0) {
    issues.push({
      type: "info",
      element: "bilder",
      message: `${elements.images_without_alt} av ${elements.image_count} bilder mangler alt-tekst`,
      current: null,
      suggestion: `Legg til beskrivende alt-tekst med "${query}" der relevant`,
    });
  }

  // Internal links
  if (elements.internal_links < 3) {
    issues.push({
      type: "info",
      element: "lenker",
      message: `Få interne lenker (${elements.internal_links})`,
      current: null,
      suggestion: "Legg til flere interne lenker til relevante sider for bedre crawlability",
    });
  }

  // Position-specific advice
  if (position >= 4 && position <= 10) {
    issues.push({
      type: "info",
      element: "posisjon",
      message: `Posisjon ${position} — nær topp 3`,
      current: null,
      suggestion: "Fokuser på bedre CTR (title/description) og interne lenker for å klatre til topp 3",
    });
  }

  return issues;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const url = sp.get("url");
  const query = sp.get("query") || "";
  const position = Number(sp.get("position")) || 0;
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "FosenToolsAnalytics/1.0 SEO-Analyzer" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: `Kunne ikke hente ${url}: ${response.status}` }, { status: 502 });
    }
    const html = await response.text();

    const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
    const bodyHtml = bodyMatch ? bodyMatch[1] : html;
    const bodyText = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const wordCount = bodyText.split(/\s+/).filter((w) => w.length > 1).length;

    const imgs = countImages(html);
    const links = countLinks(html, url);

    const elements: SEOElement = {
      title: extractTitle(html),
      meta_description: extractMeta(html, "description"),
      h1: extractText(bodyHtml, "h1"),
      h2: extractText(bodyHtml, "h2"),
      h3: extractText(bodyHtml, "h3").slice(0, 10),
      canonical: extractCanonical(html),
      og_title: extractMeta(html, "og:title"),
      og_description: extractMeta(html, "og:description"),
      word_count: wordCount,
      image_count: imgs.total,
      images_without_alt: imgs.withoutAlt,
      internal_links: links.internal,
      external_links: links.external,
    };

    const issues = analyze(elements, query, position);
    const errorCount = issues.filter((i) => i.type === "error").length;
    const warningCount = issues.filter((i) => i.type === "warning").length;
    const score = Math.max(0, Math.min(100,
      100 - errorCount * 20 - warningCount * 10
    ));

    const result: PageAnalysisResponse = {
      url,
      query,
      position,
      elements,
      issues,
      score,
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
