import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import {
  MailchimpBuilderService,
  type NewsletterInput,
} from "@/lib/services/mailchimp-builder";
import { scrapeProductByUrl } from "@/lib/services/scrape-product";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<NewsletterInput> & {
    products?: Array<{ url: string; name?: string; brandSku?: string; priceText?: string; imageUrl?: string }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.themeSlug?.trim()) return NextResponse.json({ error: "themeSlug påkrevd" }, { status: 400 });
  if (!body.subjectLine?.trim() || !body.previewText?.trim())
    return NextResponse.json({ error: "subjectLine og previewText påkrevd" }, { status: 400 });
  if (!body.products || body.products.length === 0)
    return NextResponse.json({ error: "Minst 1 produkt påkrevd" }, { status: 400 });

  const products = await Promise.all(
    body.products.slice(0, 5).map(async (p) => {
      if (p.name && p.priceText && p.imageUrl) {
        return {
          url: p.url,
          name: p.name,
          brandSku: p.brandSku ?? "",
          priceText: p.priceText,
          imageUrl: p.imageUrl,
        };
      }
      try {
        const scraped = await scrapeProductByUrl(p.url);
        return {
          url: p.url,
          name: p.name ?? scraped.name.toUpperCase(),
          brandSku: p.brandSku ?? (scraped.manufacturer ? capitalizeFirst(scraped.manufacturer) : ""),
          priceText: p.priceText ?? formatPriceText(scraped.price_now, scraped.price_before),
          imageUrl: p.imageUrl ?? scraped.image_url ?? "",
        };
      } catch {
        return {
          url: p.url,
          name: p.name ?? "PRODUKT",
          brandSku: p.brandSku ?? "",
          priceText: p.priceText ?? "Pris ikke tilgjengelig",
          imageUrl: p.imageUrl ?? "",
        };
      }
    })
  );

  const input: NewsletterInput = {
    themeSlug: body.themeSlug,
    subjectLine: body.subjectLine,
    previewText: body.previewText,
    title: body.title,
    headingMain: body.headingMain ?? "Verkstedets klikk-klassiker",
    headingSub: body.headingSub ?? "hele spekteret 20% av",
    ingress: body.ingress ?? "",
    products,
    midtTitle: body.midtTitle ?? 'HDFI — "Fosen Tools-standard"',
    midtBody: body.midtBody ?? "",
    midtCtaText: body.midtCtaText ?? "LES MER",
    midtCtaUrl: body.midtCtaUrl ?? "https://fosen-tools.no/hdfi",
    midtImageUrl: body.midtImageUrl ?? "",
    brandLogoUrl: body.brandLogoUrl,
    brandLogoLink: body.brandLogoLink,
    topBadge: body.topBadge,
    footerImageUrl: body.footerImageUrl ?? "",
    socialInstagramPostUrl: body.socialInstagramPostUrl ?? "",
    socialFacebookPostUrl: body.socialFacebookPostUrl ?? "https://www.facebook.com/fosentools",
    socialLinkedinPostUrl: body.socialLinkedinPostUrl ?? "",
  };

  const builder = new MailchimpBuilderService();
  let draft;
  try {
    draft = await builder.createNewsletter(input);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Mailchimp-feil" }, { status: 500 });
  }

  const { data: savedDraft } = await supabase
    .from("mailchimp_drafts")
    .insert({
      user_id: user.id,
      campaign_id: draft.campaignId,
      edit_url: draft.editUrl,
      theme: input.themeSlug,
      theme_title: input.headingMain,
      subject_line: input.subjectLine,
      preview_text: input.previewText,
      product_urls: input.products.map((p) => p.url),
      midt_image_url: input.midtImageUrl,
      footer_image_url: input.footerImageUrl,
      payload: input,
    })
    .select("id")
    .single();

  // === Auto-lagring av UTM-linker i sentralt register ===
  const utmRows = buildUtmRowsFromInput(input, user.id);
  let utmInserted = 0;
  if (utmRows.length > 0) {
    const { count } = await supabase
      .from("utm_links")
      .upsert(utmRows, { onConflict: "full_url", count: "exact", ignoreDuplicates: true });
    utmInserted = count ?? 0;
  }

  return NextResponse.json({
    campaign_id: draft.campaignId,
    edit_url: draft.editUrl,
    draft_id: savedDraft?.id ?? null,
    utm_links_added: utmInserted,
  });
}

function buildUtmRowsFromInput(
  input: NewsletterInput,
  userId: string
): Array<Record<string, unknown>> {
  const utmSource = "FTNett";
  const utmMedium = "email";
  const utmCampaign = input.themeSlug;
  const rows: Array<Record<string, unknown>> = [];

  // Bygg UTM-rad for hvert produkt
  for (const p of input.products) {
    const baseUrl = p.url.split("?")[0];
    const utmContent = slugFromPath(baseUrl);
    const fullUrl = `${baseUrl}?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${encodeURIComponent(utmCampaign)}&utm_content=${encodeURIComponent(utmContent)}`;
    rows.push({
      user_id: userId,
      label: `Nyhetsbrev «${input.headingMain}» — ${truncate(p.name, 60)}`,
      base_url: baseUrl,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      full_url: fullUrl,
      notes: `Auto-lagret fra nyhetsbrev-bygger (${new Date().toISOString().slice(0, 10)})`,
    });
  }

  // Midt-CTA-URL
  if (input.midtCtaUrl && input.midtCtaUrl.includes("fosen-tools.no")) {
    const baseUrl = input.midtCtaUrl.split("?")[0];
    const utmContent = "midt-cta";
    const fullUrl = `${baseUrl}?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${encodeURIComponent(utmCampaign)}&utm_content=${utmContent}`;
    rows.push({
      user_id: userId,
      label: `Nyhetsbrev «${input.headingMain}» — midtseksjon-CTA`,
      base_url: baseUrl,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_content: utmContent,
      full_url: fullUrl,
      notes: `Auto-lagret fra nyhetsbrev-bygger (${new Date().toISOString().slice(0, 10)})`,
    });
  }

  return rows;
}

function slugFromPath(url: string): string {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length >= 2) {
      return `${segments[0]}-${segments[1]}`;
    }
    return segments[0] ?? "produkt";
  } catch {
    return "produkt";
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatPriceText(priceNow: number | null, priceBefore: number | null): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 }).format(n).replace(/,/g, " ");
  if (!priceNow) return "Pris ikke tilgjengelig";
  const parts = [`${fmt(priceNow)},- eks. mva.`];
  if (priceBefore && priceBefore > priceNow) parts.push(`(før ${fmt(priceBefore)},-)`);
  return parts.join(" ");
}
