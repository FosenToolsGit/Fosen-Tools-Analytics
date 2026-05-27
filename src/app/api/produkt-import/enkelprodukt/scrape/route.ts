import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { scrapeProductPage, scrapeFromHtml } from "@/lib/services/enkelprodukt-scraper";
import { destillProduct } from "@/lib/services/enkelprodukt-destillery";

/**
 * Henter produktdata enten fra URL eller fra rå HTML/body limt inn av brukeren.
 *
 * Body: {
 *   url?: string,           // hent fra URL via fetch
 *   html?: string,          // alternativt: brukeren limer inn HTML/body
 *   source_url?: string,    // valgfri URL-referanse når html er gitt
 *   scrape_b2b_prices?: boolean,  // hent kostpris + listepris fra HTML
 *   skip_ai?: boolean,      // hopp over Gemini-destillering
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let url: string | undefined;
  let html: string | undefined;
  let sourceUrl: string | undefined;
  let scrapeB2BPrices = false;
  let skipAi = false;

  try {
    const body = await request.json();
    url = body.url ? String(body.url).trim() : undefined;
    html = body.html ? String(body.html) : undefined;
    sourceUrl = body.source_url ? String(body.source_url).trim() : undefined;
    scrapeB2BPrices = body.scrape_b2b_prices === true;
    skipAi = body.skip_ai === true;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!url && !html) {
    return NextResponse.json({ error: "Må sende enten 'url' eller 'html'" }, { status: 400 });
  }

  if (url && !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "URL må starte med http:// eller https://" }, { status: 400 });
  }

  try {
    const raw = url
      ? await scrapeProductPage(url, { scrape_b2b_prices: scrapeB2BPrices })
      : await scrapeFromHtml(html!, sourceUrl, { scrape_b2b_prices: scrapeB2BPrices });

    if (!raw.title && !raw.description_short && raw.images.length === 0 && raw.bullets.length === 0) {
      return NextResponse.json(
        { error: "Klarte ikke å finne produktdata. Sjekk URL/HTML eller fyll manuelt." },
        { status: 422 },
      );
    }

    if (skipAi) {
      return NextResponse.json({ raw, product: null });
    }

    const product = await destillProduct(raw);
    return NextResponse.json({ raw, product });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scraping feilet" },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
