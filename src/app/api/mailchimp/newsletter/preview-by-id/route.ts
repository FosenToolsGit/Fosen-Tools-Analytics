import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import {
  MailchimpBuilderService,
  type NewsletterInput,
  type NewsletterProduct,
  type NewsletterSupplier,
} from "@/lib/services/mailchimp-builder";

/**
 * GET /api/mailchimp/newsletter/preview-by-id?id=<uuid>
 *
 * Henter et utkast (på tvers av brukere via service role) og rendrer
 * det til full Mailchimp-HTML. Brukes som kilde for iframe-thumbnails
 * i nyhetsbrev-oversikten og innhold-kalenderen.
 *
 * Respons: full HTML-streng (text/html), eller 404/500 ved feil.
 *
 * Caching: 5 min på edge — utkast endrer seg sjelden nok at det er ok.
 */

interface WizardState {
  editContent?: Partial<NewsletterInput> & {
    themeSlug?: string;
    subjectLine?: string;
    previewText?: string;
    headingMain?: string;
    headingSub?: string;
    ingress?: string;
    midtTitle?: string;
    midtBody?: string;
    midtCtaText?: string;
    midtCtaUrl?: string;
    topBadge?: string;
  };
  editProducts?: NewsletterProduct[];
  editSuppliers?: NewsletterSupplier[];
  midtImageUrl?: string;
  footerImageUrl?: string;
  socialInstagram?: string;
  socialLinkedin?: string;
  templateVariant?: "standard" | "jubileum" | "jubileum-leverandor";
  showFridayPost?: boolean;
  showMidtCta?: boolean;
  hideJubileumBanner?: boolean;
  jubileumFooterText?: string;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminUrl || !adminKey) {
    return NextResponse.json({ error: "Server misconfig" }, { status: 500 });
  }
  const admin = createSupabaseAdmin(adminUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: draft, error } = await admin
    .from("newsletter_wizard_drafts")
    .select("id, title, wizard_state")
    .eq("id", id)
    .single();

  if (error || !draft) {
    return NextResponse.json({ error: "Utkast ikke funnet" }, { status: 404 });
  }

  const ws = (draft.wizard_state ?? {}) as WizardState;
  const content = ws.editContent ?? {};
  const products = Array.isArray(ws.editProducts) ? ws.editProducts : [];
  const suppliers = Array.isArray(ws.editSuppliers) ? ws.editSuppliers : [];

  const input: NewsletterInput = {
    themeSlug: content.themeSlug ?? "preview",
    subjectLine: content.subjectLine ?? "",
    previewText: content.previewText ?? "",
    headingMain: content.headingMain ?? "",
    headingSub: content.headingSub ?? "",
    ingress: content.ingress ?? "",
    products,
    suppliers,
    midtTitle: content.midtTitle ?? "",
    midtBody: content.midtBody ?? "",
    midtCtaText: content.midtCtaText ?? "LES MER",
    midtCtaUrl: content.midtCtaUrl ?? "https://fosen-tools.no/",
    midtImageUrl: ws.midtImageUrl ?? "",
    footerImageUrl: ws.footerImageUrl ?? "",
    socialInstagramPostUrl: ws.socialInstagram ?? "",
    socialFacebookPostUrl: "https://www.facebook.com/fosentools",
    socialLinkedinPostUrl: ws.socialLinkedin ?? "",
    topBadge: content.topBadge,
    templateVariant: ws.templateVariant,
    showFridayPost: ws.showFridayPost,
    showMidtCta: ws.showMidtCta,
    hideJubileumBanner: ws.hideJubileumBanner,
    jubileumFooterText: ws.jubileumFooterText,
  };

  try {
    const builder = new MailchimpBuilderService();
    const html = builder.buildNewsletterHtml(input);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, max-age=300", // 5 min
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Build feilet" },
      { status: 500 }
    );
  }
}
