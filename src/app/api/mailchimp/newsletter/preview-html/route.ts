import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import {
  MailchimpBuilderService,
  type NewsletterInput,
  type NewsletterProduct,
  type NewsletterSupplier,
} from "@/lib/services/mailchimp-builder";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Partial<NewsletterInput> & { products?: NewsletterProduct[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const products: NewsletterProduct[] = (body.products ?? []).slice(0, 5).map((p) => ({
    url: p.url ?? "",
    name: p.name ?? "PRODUKT",
    brandSku: p.brandSku ?? "",
    priceText: p.priceText ?? "",
    imageUrl: p.imageUrl ?? "",
    ctaText: p.ctaText,
  }));

  const suppliers: NewsletterSupplier[] = (body.suppliers ?? []).slice(0, 8).map((s) => ({
    name: s.name ?? "",
    tagline: s.tagline ?? "",
    logoUrl: s.logoUrl ?? "",
    ctaText: s.ctaText ?? "Se sortimentet →",
    ctaUrl: s.ctaUrl ?? "",
    description: s.description,
    logoWidth: typeof s.logoWidth === "number" ? s.logoWidth : undefined,
  }));

  const input: NewsletterInput = {
    themeSlug: body.themeSlug ?? "preview",
    subjectLine: body.subjectLine ?? "",
    previewText: body.previewText ?? "",
    title: body.title,
    headingMain: body.headingMain ?? "",
    headingSub: body.headingSub ?? "",
    ingress: body.ingress ?? "",
    products,
    midtTitle: body.midtTitle ?? "",
    midtBody: body.midtBody ?? "",
    midtCtaText: body.midtCtaText ?? "LES MER",
    midtCtaUrl: body.midtCtaUrl ?? "https://fosen-tools.no/",
    midtImageUrl: body.midtImageUrl ?? "",
    brandLogoUrl: body.brandLogoUrl,
    brandLogoLink: body.brandLogoLink,
    hideBrandLogo: body.hideBrandLogo,
    topBadge: body.topBadge,
    footerImageUrl: body.footerImageUrl ?? "",
    socialInstagramPostUrl: body.socialInstagramPostUrl ?? "",
    socialFacebookPostUrl: body.socialFacebookPostUrl ?? "https://www.facebook.com/fosentools",
    socialLinkedinPostUrl: body.socialLinkedinPostUrl ?? "",
    templateVariant: body.templateVariant,
    suppliers,
    showFridayPost: body.showFridayPost,
    showMidtCta: body.showMidtCta,
    hideJubileumBanner: body.hideJubileumBanner,
    jubileumFooterText: body.jubileumFooterText,
  };

  // Auto-derive brand logo from first product URL if not provided (mirrors createNewsletter logic).
  if (!input.hideBrandLogo && !input.brandLogoUrl && input.products.length > 0) {
    try {
      const firstUrl = input.products[0].url;
      if (firstUrl) {
        const u = new URL(firstUrl);
        const firstSeg = u.pathname.split("/").filter(Boolean)[0];
        if (firstSeg) {
          const builder = new MailchimpBuilderService();
          const logoUrl = await builder.fetchBrandLogoUrl(firstSeg);
          if (logoUrl) {
            input.brandLogoUrl = logoUrl;
            input.brandLogoLink = `https://fosen-tools.no/${firstSeg}`;
          }
        }
      }
    } catch {
      // ignore — preview works without brand logo
    }
  }

  const builder = new MailchimpBuilderService();
  const html = builder.buildNewsletterHtml(input);
  return NextResponse.json({ html });
}
