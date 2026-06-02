/**
 * MailchimpBuilderService — programmatisk bygging av FTNett-nyhetsbrev.
 *
 * Workflow:
 *  1. replicateCampaign(masterId) → ny campaign-ID (kopierer liste + settings)
 *  2. updateSettings(id, {...}) → ny subject/preview/title
 *  3. buildNewsletterHtml(input) → ferdig HTML bygd fra scratch
 *  4. putContent(id, html, plainText) → erstatt HTML i campaign
 *
 * HTML-en genereres 100% programmatisk med Mailchimp-kompatibel struktur.
 * Matcher master-template layout (mce*-klasser, MSO conditionals, VML buttons).
 */

const MASTER_CAMPAIGN_ID = "6d6f8b6bdb";

const FT_RED = "#f12634";
const FT_INK = "#000000";
const FT_WHITE = "#ffffff";
const OUTER_BG = "#e8e8e8";
const CONTENT_BG = "#ffffff";
const TEXT_COLOR = "rgb(34, 34, 34)";
const FONT_STACK = "'Helvetica Neue', Helvetica, Arial, Verdana, sans-serif";
const ROBOTO_STACK = "'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MAX_WIDTH = 660;
// FT-logo med RØD BAKGRUNN — alltid denne i nyhetsbrev og marketing-flater.
// Bevisst valg etter brukerens beslutning 1. juni 2026: rødbakgrunns-logoen
// er FTs definitive brand-mark og skal brukes konsekvent på tvers av kanaler.
const FT_LOGO_URL = "https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/social_assets/brand-assets/ft-logo-rod-bakgrunn.png";
const FT_SITE = "https://fosen-tools.no";
const FT_LOGO_BASE = `${FT_SITE}/userfiles/image/Logo`;

// 25-årsjubileum-tema (juni 2026): rød header/footer + jubileumslogo som
// sentralt hovedlogo. Bruker offisiell SVG fra Supabase Storage (uploaded
// via upload-jubileum-logoer.mjs / brosjyre-editor-assets).
const FT_JUBILEUM_LOGO_URL =
  "https://fosen-tools-analytics.vercel.app/brosjyre/Jubileumslogo-25aar.svg";

/** Mal-varianter.
 *  `standard` = svart header + svart footer (default).
 *  `jubileum` = jubileums-banner + produkt-grid (kun for utgaver med produkt-fokus).
 *  `jubileum-leverandor` = jubileums-banner + full-bredde leverandør-kort under hverandre. */
export type TemplateVariant = "standard" | "jubileum" | "jubileum-leverandor";

/**
 * Complete brand list from fosen-tools.no logo ticker.
 * Used for: (1) header ticker strip in newsletter, (2) brand logo lookup by slug.
 */
const ALL_BRANDS: Array<{ name: string; slug: string; file: string }> = [
  // Globalt kjente merker
  { name: "Bosch", slug: "bosch-tilbehør", file: "Bosch.svg" },
  { name: "Stanley", slug: "stanley-pmi", file: "Stanley.svg" },
  { name: "Milwaukee", slug: "milwaukee", file: "Milwaukee.svg" },
  { name: "Husqvarna", slug: "husqvarna", file: "Husqvarna.svg" },
  { name: "Knipex", slug: "knipex", file: "Knipex.svg" },
  { name: "Wera", slug: "wera", file: "Wera.svg" },
  { name: "Bahco", slug: "bahco", file: "Bahco.svg" },
  { name: "Facom", slug: "facom", file: "Facom.svg" },
  { name: "Fluke", slug: "fluke", file: "Fluke.svg" },
  { name: "Leatherman", slug: "leatherman", file: "Leatherman.svg" },
  { name: "Hultafors", slug: "hultafors", file: "Hultafors.svg" },
  { name: "Snickers Workwear", slug: "snickers", file: "Snickers-Workwear.svg" },
  { name: "PB Swiss Tools", slug: "pb-swiss-tools", file: "PB-Swiss-Tools.svg" },
  { name: "Gedore", slug: "gedore", file: "Gedore.svg" },
  { name: "KC Tools", slug: "kc-tools", file: "KC-Tools.svg" },
  { name: "Red Rooster", slug: "red-rooster", file: "Red-Rooster.svg" },
  // Europeiske premiummerker
  { name: "Gühring", slug: "gühring", file: "Guehring.svg" },
  { name: "Stahlwille", slug: "stahlwille", file: "Stahlwille.svg" },
  { name: "Völkel", slug: "völkel", file: "Voelkel.svg" },
  { name: "Brockhaus Heuer", slug: "brockhaus-heuer", file: "Brockhaus-Heuer.svg" },
  { name: "Rennsteig", slug: "rennsteig", file: "Rennsteig.svg" },
  { name: "Apex Tools", slug: "apex-tools", file: "Apex-Tools.svg" },
  { name: "Vogel Germany", slug: "vogel-germany", file: "Vogel-Germany.svg" },
  { name: "Mitutoyo", slug: "mitutoyo", file: "Mitutoyo.svg" },
  { name: "Meclube", slug: "meclube", file: "Meclube.svg" },
  { name: "Opticase", slug: "opticase", file: "Opticase.svg" },
  { name: "Zarges", slug: "zarges", file: "Zarges.svg" },
  { name: "Handi", slug: "handi", file: "Handi.svg" },
  // Nordiske og profesjonelle
  { name: "Brusletto", slug: "brusletto", file: "Brusletto.svg" },
  { name: "Viking Arm", slug: "viking-arm", file: "Viking-Arm.svg" },
  { name: "Karlstad Redskap", slug: "karlstad-redskap", file: "Karlstad-Redskap.svg" },
  { name: "Fosen Tools Custom", slug: "fosen-tools-custom", file: "Fosen-Tools-Custom.svg" },
  // Mindre og spesialiserte
  { name: "Scell-it", slug: "scell-it", file: "Scell-it.svg" },
  { name: "Solid Gear", slug: "solid-gear", file: "Solid-Gear.svg" },
  { name: "The Bone", slug: "the-bone", file: "The-Bone.svg" },
  { name: "Ullman", slug: "ullman-devices", file: "Ullman.svg" },
  { name: "ScrewGrab", slug: "produsent/screw-grab", file: "ScrewGrab.svg" },
  { name: "OSCA", slug: "osca", file: "OSCA.svg" },
  { name: "AOK", slug: "aok-by-kc-tools", file: "AOK.svg" },
  { name: "Boehm", slug: "boehm", file: "Boehm.svg" },
  { name: "Irega", slug: "irega", file: "Irega.svg" },
  { name: "Sumake", slug: "sumake", file: "Sumake.svg" },
  { name: "Emhart", slug: "emhart-teknologies", file: "Emhart.svg" },
  { name: "Lista", slug: "lista-ag", file: "Lista.svg" },
  { name: "Gigant", slug: "gigant", file: "Gigant.svg" },
  { name: "Zweibrüder", slug: "zweibruder", file: "Led-Lenser.svg" },
  { name: "Hellberg", slug: "hellberg", file: "Hellberg.svg" },
  { name: "Morakniv", slug: "mora-of-sweden", file: "Morakniv.svg" },
  { name: "Bondhus", slug: "bondhus", file: "Bondhus.svg" },
  { name: "Snap-on", slug: "snapon", file: "Snap-on.svg" },
  { name: "Pelicase", slug: "pelicase", file: "Pelicase.svg" },
];

/** Top 12 brands shown in the email header ticker strip. */
const TICKER_BRANDS = ALL_BRANDS.slice(0, 12);

/** Lookup brand logo URL by slug. Returns ticker URL or null. */
function brandLogoUrlFromTicker(slug: string): string | null {
  const s = slug.toLowerCase();
  const brand = ALL_BRANDS.find(
    (b) => b.slug === s || b.slug.endsWith(`/${s}`) || b.name.toLowerCase() === s
  );
  return brand ? `${FT_LOGO_BASE}/${brand.file}` : null;
}

export interface NewsletterInput {
  themeSlug: string;
  subjectLine: string;
  previewText: string;
  title?: string;
  headingMain: string;
  headingSub: string;
  /** Ingress-tekst. Bruk «*|FNAME|*» for personalisering — Mailchimp bytter ved utsendelse. */
  ingress: string;
  products: NewsletterProduct[];
  midtTitle: string;
  midtBody: string;
  midtCtaText: string;
  midtCtaUrl: string;
  midtImageUrl: string;
  brandLogoUrl?: string;
  brandLogoLink?: string;
  topBadge?: string;
  footerImageUrl: string;
  socialInstagramPostUrl: string;
  socialFacebookPostUrl: string;
  socialLinkedinPostUrl: string;
  /** Kundehistorie-tekst under fredags-bilde nederst — speiler «levert til X»-mønster fra sosiale medier. */
  customerStoryText?: string;
  /** A/B-variant for emnelinje. Brukes som utm_term så vi kan måle hvilken konverterte best. */
  utmTerm?: string;
  /** Mal-variant: «standard», «jubileum», eller «jubileum-leverandor».
   *  Default = «standard». Settes til «jubileum» for produkt-fokuserte juni-utsendelser,
   *  eller «jubileum-leverandor» for leverandør-presentasjons-utsendelser. */
  templateVariant?: TemplateVariant;
  /** Leverandør-kort. Kun brukt når templateVariant=«jubileum-leverandor».
   *  Hver entry rendres som en full-bredde rad. Hvis satt + variant matcher,
   *  rendres disse i stedet for produkt-griden. */
  suppliers?: NewsletterSupplier[];
  /** Vis «fredagsinnlegg»-seksjonen nederst (divider + footer-bilde + sosiale CTA-lenker
   *  + kundehistorie-tekst). Default true. Sett false når nyhetsbrevet ikke har en
   *  ekte ukentlig kundehistorie (typisk jubileum-utgaver). */
  showFridayPost?: boolean;
  /** Vis «Les mer»-CTA-knappen under midtseksjonen. Default true. Sett false
   *  når midtseksjonen er ren info uten en ekstern destinasjon (typisk
   *  program-/event-info-seksjoner). */
  showMidtCta?: boolean;
  /** Skjul jubileums-banneret selv om templateVariant er «jubileum» eller
   *  «jubileum-leverandor». Brukes når vi vil ha leverandør-kort-malen
   *  uten å koble innlegget eksplisitt til 26. juni-eventet. */
  hideJubileumBanner?: boolean;
  /** Én-linjes jubileums-tekst som rendres rett over svart bunn-footer
   *  (typisk «Fosen Tools fyller 25 år i 2026»). Skjules hvis tom. */
  jubileumFooterText?: string;
}

export interface NewsletterProduct {
  url: string;
  name: string;
  brandSku: string;
  priceText: string;
  imageUrl: string;
  ctaText?: string;
}

/** Leverandør-kort for jubileum-leverandor-malen. Rendres som full-bredde rad
 *  med logo til venstre + navn/tagline/beskrivelse/CTA-knapp til høyre. */
export interface NewsletterSupplier {
  /** Display-navn, f.eks. «Milwaukee» eller «Zweibrüder». */
  name: string;
  /** Kort tagline (én linje), f.eks. «Batteriverktøy · M18 og M12». */
  tagline: string;
  /** Logo-URL (PNG anbefales — Outlook støtter ikke SVG). */
  logoUrl: string;
  /** Knapp-tekst, f.eks. «Se sortimentet →». */
  ctaText: string;
  /** Knapp-URL (typisk leverandør-siden på fosen-tools.no). */
  ctaUrl: string;
  /** Lengre beskrivelse (1–3 setninger). Valgfritt. */
  description?: string;
  /** Logo-bredde i pixler. Default 140. Range 80–180. Logo-kolonnen er fast 180px,
   *  så større bilde fyller mer av kolonnen — bra for kvadratiske/horisontale logoer. */
  logoWidth?: number;
}

export interface CreatedDraft {
  campaignId: string;
  editUrl: string;
  previewUrl?: string;
}

export class MailchimpBuilderService {
  private apiKey: string;
  private serverPrefix: string;

  constructor() {
    this.apiKey = process.env.MAILCHIMP_API_KEY ?? "";
    this.serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX ?? "";
    if (!this.apiKey || !this.serverPrefix) {
      throw new Error("MAILCHIMP_API_KEY og MAILCHIMP_SERVER_PREFIX må være satt");
    }
  }

  private get baseUrl() {
    return `https://${this.serverPrefix}.api.mailchimp.com/3.0`;
  }

  private get authHeader() {
    return `Basic ${Buffer.from(`anystring:${this.apiKey}`).toString("base64")}`;
  }

  private async mcRequest<T = unknown>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: unknown
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Mailchimp ${method} ${path} → ${res.status}: ${errText.slice(0, 500)}`);
    }
    return res.json() as Promise<T>;
  }

  async replicateCampaign(sourceId: string = MASTER_CAMPAIGN_ID): Promise<{ id: string }> {
    return this.mcRequest<{ id: string }>(
      "POST",
      `/campaigns/${sourceId}/actions/replicate`
    );
  }

  async updateSettings(
    campaignId: string,
    settings: {
      subject_line?: string;
      preview_text?: string;
      title?: string;
      from_name?: string;
      reply_to?: string;
    }
  ): Promise<void> {
    await this.mcRequest("PATCH", `/campaigns/${campaignId}`, { settings });
  }

  async uploadImage(buffer: Buffer, name: string): Promise<string> {
    const result = await this.mcRequest<{ full_size_url: string }>(
      "POST",
      `/file-manager/files`,
      { name, file_data: buffer.toString("base64") }
    );
    return result.full_size_url;
  }

  async getContent(campaignId: string): Promise<{ html: string; plain_text: string }> {
    return this.mcRequest<{ html: string; plain_text: string }>(
      "GET",
      `/campaigns/${campaignId}/content`
    );
  }

  async putContent(
    campaignId: string,
    html: string,
    plainText: string
  ): Promise<void> {
    await this.mcRequest("PUT", `/campaigns/${campaignId}/content`, {
      html,
      plain_text: plainText,
    });
  }

  /**
   * Planlegg utsendelse av en kampanje. `scheduleTime` er ISO-streng (UTC).
   * Mailchimp krever at sendetidspunkt er minst 15 min frem i tid.
   */
  async scheduleCampaign(campaignId: string, scheduleTime: string): Promise<void> {
    await this.mcRequest("POST", `/campaigns/${campaignId}/actions/schedule`, {
      schedule_time: scheduleTime,
    });
  }

  /**
   * Bygg ferdig nyhetsbrev-HTML som matcher Mailchimp master-template struktur.
   * Genererer komplett mce*-kompatibel HTML med MSO conditionals og VML buttons.
   */
  buildNewsletterHtml(input: NewsletterInput): string {
    const utm = (url: string, content?: string) => withUtm(url, input.themeSlug, content, input.utmTerm);
    const products = input.products.slice(0, 5);

    const rootSections: string[] = [];

    // Section 0: «Vis i nettleser»-lenke — for mottakere med bildeblokkering eller
    //   ødelagt e-post-rendering. Liten grå tekst over header.
    rootSections.push(renderBrowserViewSection());

    const variant: TemplateVariant = input.templateVariant ?? "standard";

    // Section 1: Header — svart med FT-wordmark (standard) eller 25-årslogo (jubileum)
    rootSections.push(renderHeaderSection(
      utm("https://fosen-tools.no/", "header-logo"),
      input.topBadge,
      variant,
    ));

    // Section 1b: Jubileums-banner — for begge jubileum-variantene,
    //   med mindre hideJubileumBanner er satt (for ordinære nyhetsbrev
    //   som bruker leverandør-mal-strukturen uten å eksplisitt promotere
    //   26. juni-eventet).
    if (
      (variant === "jubileum" || variant === "jubileum-leverandor") &&
      input.hideJubileumBanner !== true
    ) {
      rootSections.push(renderJubileumBanner());
    }

    // Section 2: Content (white bg) — heading, ingress, brand logo, product grid,
    //   button, divider, midt image, midt title, midt body, midt CTA,
    //   divider, footer image, social buttons, descriptive text
    rootSections.push(renderContentSection(
      input,
      products,
      utm
    ));

    // Section 2b: Én-linjes jubileums-tekst rett over svart footer.
    //   Skjules hvis jubileumFooterText er tom. Brukes for å holde
    //   25-årsjubileet diskret tilstede i ordinære nyhetsbrev.
    if (input.jubileumFooterText && input.jubileumFooterText.trim()) {
      rootSections.push(renderJubileumFooterRow(input.jubileumFooterText));
    }

    // Section 3: Footer — svart med firma-info + sosiale ikoner
    rootSections.push(renderFooterSection(variant));

    return wrapInDocument(rootSections.join("\n"), input.previewText, input.subjectLine);
  }

  buildPlainText(input: NewsletterInput): string {
    const utm = `?utm_source=FTNett&utm_medium=email&utm_campaign=${input.themeSlug}`;
    const lines: string[] = [];
    lines.push("*|MC_PREVIEW_TEXT|*", "");
    lines.push(`${input.headingMain} — ${input.headingSub}`, "");
    lines.push(input.ingress, "");
    for (const p of input.products) {
      lines.push(p.name);
      lines.push(p.brandSku);
      lines.push(p.priceText);
      lines.push(`${p.url}${utm}`, "");
    }
    lines.push("— — —", "");
    lines.push(input.midtTitle);
    lines.push(input.midtBody, "");
    lines.push(`${input.midtCtaText}:`);
    lines.push(`${input.midtCtaUrl}${utm}`, "");
    lines.push("— — —");
    lines.push("Fosen Tools, Industrigata 1, N-7130 Brekstad");
    lines.push("+47 72 51 51 20 · post@fosen-tools.no");
    return lines.join("\n");
  }

  async fetchBrandLogoUrl(manufacturer: string): Promise<string | null> {
    const tickerUrl = brandLogoUrlFromTicker(manufacturer);
    if (tickerUrl) return tickerUrl;

    try {
      const url = `https://fosen-tools.no/${manufacturer}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      const html = await res.text();
      const producer = html.match(/<img class="ProducerLogoImage"[^>]+src="([^"]+)"/);
      if (producer) {
        let u = producer[1];
        if (u.startsWith("/")) u = `https://fosen-tools.no${u}`;
        return u;
      }
      const generic = html.match(
        new RegExp(
          `(https://mc10256fosentools\\.blob[^"'\\s]+${manufacturer}[^"'\\s]*\\.(?:png|jpg|svg))`,
          "i"
        )
      );
      if (generic) return generic[1];
      return null;
    } catch {
      return null;
    }
  }

  async createNewsletter(input: NewsletterInput): Promise<CreatedDraft> {
    const { id: campaignId } = await this.replicateCampaign(MASTER_CAMPAIGN_ID);

    if (!input.brandLogoUrl && input.products.length > 0) {
      const firstProductUrl = input.products[0].url;
      try {
        const u = new URL(firstProductUrl);
        const segments = u.pathname.split("/").filter(Boolean);
        const firstSeg = segments[0];
        if (firstSeg && firstSeg !== "produkter") {
          const logoUrl = await this.fetchBrandLogoUrl(firstSeg);
          if (logoUrl) {
            input.brandLogoUrl = logoUrl;
            input.brandLogoLink = `https://fosen-tools.no/${firstSeg}`;
          }
        }
      } catch {
        /* Hvis logo-henting feiler, fortsett uten */
      }
    }

    const today = new Date();
    const dateLabel = `${pad(today.getDate())}.${pad(today.getMonth() + 1)}.${today.getFullYear().toString().slice(2)}`;
    await this.updateSettings(campaignId, {
      subject_line: input.subjectLine,
      preview_text: input.previewText,
      title: input.title ?? `${dateLabel} — ${input.themeSlug}`,
      from_name: "Fosen Tools - Nyhetsbrev",
      reply_to: "post@fosen-tools.no",
    });

    const newHtml = this.buildNewsletterHtml(input);
    const plainText = this.buildPlainText(input);

    await this.putContent(campaignId, newHtml, plainText);

    const editUrl = `https://${this.serverPrefix}.admin.mailchimp.com/campaigns/edit?id=${campaignId}`;
    return { campaignId, editUrl };
  }
}

// ============ Utilities ============

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function withUtm(url: string, themeSlug: string, content?: string, term?: string): string {
  if (!url) return url;
  if (url.includes("utm_source=")) return url;
  const sep = url.includes("?") ? "&" : "?";
  let utm = `${sep}utm_source=FTNett&utm_medium=email&utm_campaign=${encodeURIComponent(themeSlug)}`;
  if (content) utm += `&utm_content=${encodeURIComponent(content)}`;
  if (term) utm += `&utm_term=${encodeURIComponent(term)}`;
  return `${url}${utm}`;
}

function slugFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length >= 2) return `${segments[0]}-${segments[1]}`;
    return segments[0] ?? "produkt";
  } catch {
    return "produkt";
  }
}

// ============ Structural Helpers ============

/**
 * Wrap a section in the Mailchimp mceWrapper pattern with MSO conditional table.
 */
function wrapSection(blockId: string, bgColor: string, innerBgColor: string, content: string): string {
  return `<tbody data-block-id="${blockId}" class="mceWrapper"><tr><td style="background-color:${OUTER_BG}" valign="top" align="center" class="mceSection${blockId}"><!--[if (gte mso 9)|(IE)]><table align="center" border="0" cellspacing="0" cellpadding="0" width="${MAX_WIDTH}" style="width:${MAX_WIDTH}px;"><tr><td><![endif]--><table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:${MAX_WIDTH}px" role="presentation"><tbody><tr><td style="background-color:${innerBgColor}" valign="top" class="mceWrapperInner">${content}</td></tr></tbody></table><!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]--></td></tr></tbody>`;
}

/**
 * Image with MSO fallback (non-mso uses table, mso uses direct img in span).
 */
function renderImage(
  id: string,
  src: string,
  href: string | null,
  width: string | number,
  alt: string,
  cssClass: string,
  widthStyle?: string,
  heightStyle?: string
): string {
  const w = typeof width === "number" ? width : width;
  const wStr = String(w);
  const imgStyle = `display:block;margin:0 auto;${widthStyle ? `max-width:${widthStyle};` : "max-width:100%;"}height:${heightStyle ?? "auto"};border-radius:0`;
  const msoMaxW = widthStyle ?? `${wStr}px`;

  const imgTag = `<img alt="${esc(alt)}" src="${esc(src)}" width="${wStr}" height="auto" style="${imgStyle}" class="imageDropZone ${cssClass}">`;

  const nonMsoInner = href
    ? `<a href="${esc(href)}" style="display:block" target="_blank"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;margin:0;vertical-align:top;max-width:100%;width:100%;height:auto" role="presentation"><tbody><tr><td style="border:0;border-radius:0;margin:0" valign="top">${imgTag}</td></tr></tbody></table></a>`
    : `<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;margin:0;vertical-align:top;max-width:100%;width:100%;height:auto" role="presentation"><tbody><tr><td style="border:0;border-radius:0;margin:0" valign="top">${imgTag}</td></tr></tbody></table>`;

  const msoImg = `<img role="presentation" class="imageDropZone ${cssClass}" src="${esc(src)}" alt="${esc(alt)}" width="${wStr}" height="auto" style="display:block;max-width:${msoMaxW};width:${msoMaxW};height:auto"/>`;
  const msoInner = href
    ? `<a href="${esc(href)}"><span class="mceImageBorder" style="border:0;border-width:2px;vertical-align:top;margin:0">${msoImg}</span></a>`
    : `<span class="mceImageBorder" style="border:0;border-width:2px;vertical-align:top;margin:0">${msoImg}</span>`;

  return `<div><!--[if !mso]><!--></div>${nonMsoInner}<div><!--<![endif]--></div><div>\n<!--[if mso]>\n${msoInner}\n<![endif]-->\n</div>`;
}

/**
 * CTA button with VML fallback for Outlook.
 */
function renderButton(
  id: string,
  text: string,
  href: string,
  maxWidth: number = 282,
  align: string = "center"
): string {
  const btnStyle = `background-color:${FT_RED};border-radius:0;border:1px none #222222;color:${FT_WHITE};display:block;font-family:${FONT_STACK};font-size:11px;font-weight:normal;font-style:normal;padding:16px 28px;text-decoration:none;text-align:center;direction:ltr;letter-spacing:3px`;

  return `<div><!--[if !mso]><!--></div><table align="${align}" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:${maxWidth}px" role="presentation" data-block-id="${id}" class="mceButtonContainer"><tbody><tr class="mceStandardButton"><td style="background-color:${FT_RED};border-radius:0;text-align:center" valign="top" class="mceButton"><a href="${esc(href)}" target="_blank" class="mceButtonLink" style="${btnStyle}" rel="noreferrer">${esc(text)}</a></td></tr></tbody></table><div><!--<![endif]--></div><table align="${align}" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:${maxWidth}px" role="presentation" data-block-id="${id}" class="mceButtonContainer"><tbody><tr>\n<!--[if mso]>\n<td align="${align}">\n<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"\nxmlns:w="urn:schemas-microsoft-com:office:word"\nhref="${esc(href)}"\nstyle="v-text-anchor:middle; width:${maxWidth}px; height:44px;"\narcsize="0%"\nstrokecolor="${FT_RED}"\nstrokeweight="1px"\nfillcolor="${FT_RED}">\n<v:stroke dashstyle="solid"/>\n<w:anchorlock />\n<center style="\ncolor: ${FT_WHITE};\ndisplay: block;\nfont-family: ${FONT_STACK};\nfont-size: 11;\nfont-style: normal;\nfont-weight: normal;\nletter-spacing: 3px;\ntext-decoration: none;\ntext-align: center;\ndirection: ltr;"\n>\n${esc(text)}\n</center>\n</v:roundrect>\n</td>\n<![endif]-->\n</tr></tbody></table>`;
}

/**
 * Divider line (1px solid #222222).
 */
function renderDivider(id: string): string {
  return `<td style="background-color:transparent;padding-top:12px;padding-bottom:12px;padding-right:38px;padding-left:38px;border:0;border-radius:0" valign="top" class="mceDividerBlockContainer" id="${id}"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:transparent;width:100%" role="presentation" class="mceDividerContainer"><tbody><tr><td style="min-width:100%;border-top-width:1px;border-top-style:solid;border-top-color:#222222;line-height:0;font-size:0" valign="top" class="mceDividerBlock"> </td></tr></tbody></table></td>`;
}

/**
 * Text block wrapped in gutter + mceText pattern.
 */
function renderTextBlock(
  gutterId: string,
  blockId: string,
  divId: string,
  padding: string,
  bgColor: string,
  html: string
): string {
  return `<td style="padding-top:0;padding-bottom:0;padding-right:0;padding-left:0" valign="top" class="mceGutterContainer" id="${gutterId}"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0;padding-right:0;padding-left:0;border:0;border-radius:0" valign="top" id="${blockId}"><table width="100%" style="border:0;background-color:${bgColor};border-radius:0;border-collapse:separate"><tbody><tr><td style="${padding}" class="mceTextBlockContainer"><div data-block-id="${blockId.replace("b", "")}" class="mceText" id="${divId}" style="width:100%">${html}</div></td></tr></tbody></table></td></tr></tbody></table></td>`;
}

// ============ Document Wrapper ============

function wrapInDocument(body: string, previewText: string, subjectLine: string): string {
  // Generate zero-width-space filler for preview text padding
  const zwsFiller = Array(240).fill("͏ ‌").join(" ");
  const shyFiller = Array(240).fill("­").join(" ");

  return `<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head>
<!--[if gte mso 15]>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
<![endif]-->
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(subjectLine)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
<!--[if !mso]><!--><link rel="stylesheet" type="text/css" id="newGoogleFontsStatic" href="https://fonts.googleapis.com/css?family=Roboto:400,400i,700,700i,900,900i"><!--<![endif]-->${renderCssBlock()}
</head>
<body>
<!---->
<!--[if !gte mso 9]><!----><span class="mcnPreviewText" style="display:none; font-size:0px; line-height:0px; max-height:0px; max-width:0px; opacity:0; overflow:hidden; visibility:hidden; mso-hide:all;">${esc(previewText)}</span><!--<![endif]-->
<!---->
<div style="display: none; max-height: 0px; overflow: hidden;">${zwsFiller}${shyFiller}</div><!--MCE_TRACKING_PIXEL-->
<center>
<table border="0" cellpadding="0" cellspacing="0" height="100%" width="100%" id="bodyTable" role="presentation" style="background-color: ${OUTER_BG};">
<tbody><tr>
<td class="bodyCell" align="center" valign="top">
<table id="root" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">${body}</table>
</td></tr></tbody></table>
</center>
</body></html>`;
}

function renderCssBlock(): string {
  return `<style type="text/css">img{-ms-interpolation-mode:bicubic;}
table, td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
.mceStandardButton, .mceStandardButton td, .mceStandardButton td a{mso-hide:all!important;}
p, a, li, td, blockquote{mso-line-height-rule:exactly;}
p, a, li, td, body, table, blockquote{-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;}
.mcnPreviewText{display:none!important;}
.bodyCell{margin:0 auto;padding:0;width:100%;}
.ExternalClass, .ExternalClass p, .ExternalClass td, .ExternalClass div, .ExternalClass span, .ExternalClass font{line-height:100%;}
.ReadMsgBody, .ExternalClass{width:100%;}
a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;font-size:inherit!important;font-family:inherit!important;font-weight:inherit!important;line-height:inherit!important;}
body{height:100%;margin:0;padding:0;width:100%;background:${OUTER_BG};}
p{margin:0;padding:0;}
table{border-collapse:collapse;}
td, p, a{word-break:break-word;}
h1, h2, h3, h4, h5, h6{display:block;margin:0;padding:0;}
img, a img{border:0;height:auto;outline:none;text-decoration:none;}
a[href^="tel"], a[href^="sms"]{color:inherit;cursor:default;text-decoration:none;}
.mceColumn .mceButtonLink,
            .mceColumn-1 .mceButtonLink,
            .mceColumn-2 .mceButtonLink,
            .mceColumn-3 .mceButtonLink,
            .mceColumn-4 .mceButtonLink{min-width:30px;}
div[contenteditable="true"]{outline:0;}
.mceImageBorder{display:inline-block;}
.mceImageBorder img{border:0!important;}
body, #bodyTable{background-color:${OUTER_BG};}
.mceText, .mcnTextContent, .mceLabel{font-family:${FONT_STACK};}
.mceText, .mcnTextContent, .mceLabel{color:${TEXT_COLOR};}
.mceText h1, .mceText h2, .mceText h4, .mceText p, .mceText label, .mceText input{margin-bottom:0;}
.mceSpacing-24 .mceInput + .mceErrorMessage{margin-top:-12px;}
.mceSpacing-12 .mceInput + .mceErrorMessage{margin-top:-6px;}
.mceInput{background-color:transparent;border:2px solid rgb(208, 208, 208);width:60%;color:rgb(77, 77, 77);display:block;}
.mceInput[type="radio"], .mceInput[type="checkbox"]{float:left;margin-right:12px;display:inline;width:auto!important;}
.mceLabel > .mceInput{margin-bottom:0;margin-top:2px;}
.mceLabel{display:block;}
.mceText p, .mcnTextContent p{color:${TEXT_COLOR};font-family:${FONT_STACK};font-size:16px;font-weight:normal;line-height:1.5;mso-line-height-alt:150%;text-align:center;letter-spacing:0;direction:ltr;margin:0;}
.mceText h1, .mcnTextContent h1{color:${TEXT_COLOR};font-family:${FONT_STACK};font-size:64px;font-weight:bold;line-height:1.25;mso-line-height-alt:125%;text-align:center;letter-spacing:0;direction:ltr;}
.mceText h2, .mcnTextContent h2{color:${TEXT_COLOR};font-family:${FONT_STACK};font-size:14px;font-weight:normal;line-height:1.25;mso-line-height-alt:125%;text-align:center;letter-spacing:5px;direction:ltr;}
.mceText h4, .mcnTextContent h4{color:${TEXT_COLOR};font-family:${FONT_STACK};font-size:12px;font-weight:normal;line-height:1.5;mso-line-height-alt:150%;text-align:left;letter-spacing:0;direction:ltr;}
.mceText a, .mcnTextContent a{color:${TEXT_COLOR};font-style:normal;font-weight:normal;text-decoration:none;direction:ltr;}
.mceText h1 a, .mceText h2 a, .mceText h3 a, .mceText h4 a, .mceText h5 a, .mceText h6 a, .mcnTextContent h1 a, .mcnTextContent h2 a, .mcnTextContent h3 a, .mcnTextContent h4 a, .mcnTextContent h5 a, .mcnTextContent h6 a{color:inherit;font-weight:inherit;}
p.mcePastedContent, h1.mcePastedContent, h2.mcePastedContent, h3.mcePastedContent, h4.mcePastedContent{text-align:left;}
.mceSection58 .mceText a, .mceSection58 .mcnTextContent a{color:rgb(255, 255, 255);font-weight:normal;text-decoration:none;}
#d54 p, #d54 h1, #d54 h2, #d54 h3, #d54 h4, #d54 ul{text-align:center;}
@media only screen and (max-width: 480px) {
body, table, td, p, a, li, blockquote{-webkit-text-size-adjust:none!important;}
body{width:100%!important;min-width:100%!important;}
body.mobile-native{-webkit-user-select:none;user-select:none;transition:transform 0.2s ease-in;transform-origin:top center;}
colgroup{display:none;}
.mceLogo img, .mceImage img, .mceSocialFollowIcon img{height:auto!important;}
.mceWidthContainer{max-width:${MAX_WIDTH}px!important;}
.mceColumn, .mceColumn-2{display:block!important;width:100%!important;}
.mceColumn-forceSpan{display:table-cell!important;width:auto!important;}
.mceColumn-forceSpan .mceButton a{min-width:0!important;}
.mceReverseStack{display:table;width:100%;}
.mceColumn-1{display:table-footer-group;width:100%!important;}
.mceColumn-3{display:table-header-group;width:100%!important;}
.mceColumn-4{display:table-caption;width:100%!important;}
.mceKeepColumns .mceButtonLink{min-width:0;}
.mceBlockContainer, .mceSpacing-24{padding-right:16px!important;padding-left:16px!important;}
.mceBlockContainerE2E{padding-right:0;padding-left:0;}
.mceImage, .mceLogo{width:100%!important;height:auto!important;}
.mceText img{max-width:100%!important;}
.mceFooterSection .mceText, .mceFooterSection .mceText p{font-size:16px!important;line-height:140%!important;}
.mceText p{margin:0;font-size:16px!important;line-height:1.5!important;mso-line-height-alt:150%;}
.mceText h1{font-size:64px!important;line-height:1.25!important;mso-line-height-alt:125%;}
.mceText h2{font-size:14px!important;line-height:1.25!important;mso-line-height-alt:125%;}
.mceText h4{font-size:12px!important;line-height:1.5!important;mso-line-height-alt:150%;}
.bodyCell{padding-left:4px!important;padding-right:4px!important;}
.mceButtonContainer, #b40 .mceButtonContainer, #b72 .mceButtonContainer, #b73 .mceButtonContainer, #b93 .mceButtonContainer, #b124 .mceButtonContainer{width:100%!important;max-width:100%!important;}
.mceButtonLink{padding:18px 28px!important;font-size:16px!important;}
.mceDividerContainer{width:100%!important;}
#b1{padding:30px 24px 10px!important;}
#b1 table, #b7 table, #b10 table, #b13 table, #b65 table, #b81 table, #b127 table{margin-left:auto!important;margin-right:auto!important;float:none!important;}
#b4 .mceTextBlockContainer{padding:12px 28px 20px 30px!important;}
#gutterContainerId-4, #gutterContainerId-5, #gutterContainerId-6, #gutterContainerId-8, #gutterContainerId-11, #gutterContainerId-14, #b54 .mceTextBlockContainer, #gutterContainerId-74, #gutterContainerId-91, #gutterContainerId-92, #gutterContainerId-113{padding:0!important;}
#b5 .mceTextBlockContainer, #b6 .mceTextBlockContainer{padding:0 30px!important;}
#b7, #b10, #b13{padding:0 6px!important;}
#b8 .mceTextBlockContainer{padding:12px 0!important;}
#b11 .mceTextBlockContainer, #b14 .mceTextBlockContainer{padding:12px 8px!important;}
#gutterContainerId-17{padding:0 14px!important;}
#b17{padding:20px 0 12px!important;}
#b40 table, #b72 table, #b73 table, #b93 table, #b124 table{float:none!important;margin:0 auto!important;}
#b40{padding:10px 30px!important;}
#b40 .mceButtonLink, #b72 .mceButtonLink, #b73 .mceButtonLink, #b93 .mceButtonLink, #b124 .mceButtonLink{padding-top:18px!important;padding-bottom:18px!important;font-size:11px!important;}
#gutterContainerId-54{padding:10px!important;}
#b65{padding:12px 16px!important;}
#b72, #b73, #b93, #b124{padding:12px 24px!important;}
#b74 .mceTextBlockContainer{padding:12px 50px!important;}
#b81, #b127{padding:12px 24px 0!important;}
#b89 .mceDividerBlock, #b100 .mceDividerBlock{border-top-width:1px!important;}
#b89, #b100{padding:12px 20px!important;}
#b91 .mceTextBlockContainer{padding:0 20px!important;}
#b92 .mceTextBlockContainer, #b113 .mceTextBlockContainer{padding:0 24px 12px!important;}
}
@media only screen and (max-width: 640px) {
.mceClusterLayout td{padding:4px!important;}
}</style>`;
}

// ============ Section Renderers ============

/**
 * Pre-header «Vis i nettleser»-lenke — liten tekst på grå outer-bakgrunn over selve nyhetsbrevet.
 * Hjelper mottakere med bildeblokkering eller dårlig rendering å åpne arkivversjonen i nettleser.
 */
function renderBrowserViewSection(): string {
  const linkStyle = "color:#666666;font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;font-size:11px;text-decoration:underline";
  const innerContent = `<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="padding-top:12px;padding-bottom:8px;padding-left:24px;padding-right:24px;text-align:center" valign="top" align="center"><a href="*|ARCHIVE|*" target="_blank" style="${linkStyle}">Vis i nettleser</a></td></tr></tbody></table>`;
  return wrapSection("browser-view", OUTER_BG, OUTER_BG, innerContent);
}

/**
 * Jubileums-banner — rød strip som speiler topp-banneret på fosen-tools.no.
 * Tre seksjoner, midtstilt:
 *   [25-årslogo (bilde)]   ·   ÅPNING PROFF-BUTIKK   ·   [26. JUNI 2026 · 10:00–16:00]
 *
 * Bruker en center-table med fixed width per celle slik at innholdet
 * blir visuelt sentrert i banneret. Hairline-separatorer mellom hver
 * seksjon (samme stil som nettside-banneret).
 */
function renderJubileumBanner(): string {
  const bg = "#E11A22";           // FT-rød (matcher fosen-tools.no-banneret)
  const ftPrimary = FT_WHITE;
  const fontFamily = FONT_STACK;

  // 3 kolonner side-om-side, hver tar 1/3 bredde med innhold sentrert
  // i sin egen kolonne. Hairline-separatorer som tynne kolonner mellom.
  const logoHeight = 40;
  const colCell = `padding:18px 16px;text-align:center;vertical-align:middle;font-family:${fontFamily}`;
  // Skillelinje — kortere (ikke full høyde) og mer dempet (lavere opacity)
  const sepCell = `padding:0;width:1px;vertical-align:middle;text-align:center`;
  const sepLine = `<div style="width:1px;height:36px;background-color:rgba(255,255,255,0.22);margin:0 auto"></div>`;

  const col1 = `<img src="${esc(FT_JUBILEUM_LOGO_URL)}" alt="25-årsjubileum" height="${logoHeight}" style="height:${logoHeight}px;width:auto;border:0;display:inline-block;vertical-align:middle" />`;

  const col2 = `<span style="color:${ftPrimary};font-family:${fontFamily};font-weight:800;font-size:14px;letter-spacing:1.2px;line-height:1">ÅPNING PROFF-BUTIKK</span>`;

  const col3 = `<div style="line-height:1.3"><div style="color:${ftPrimary};font-family:${fontFamily};font-weight:800;font-size:14px;letter-spacing:1.2px">26. JUNI 2026</div><div style="color:${ftPrimary};font-family:${fontFamily};font-weight:600;font-size:12px;letter-spacing:1px;opacity:0.9;margin-top:2px">10:00 – 16:00</div></div>`;

  const innerContent = `<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="table-layout:fixed"><tbody><tr>
    <td width="33%" align="center" style="${colCell}">${col1}</td>
    <td style="${sepCell}">${sepLine}</td>
    <td width="33%" align="center" style="${colCell}">${col2}</td>
    <td style="${sepCell}">${sepLine}</td>
    <td width="33%" align="center" style="${colCell}">${col3}</td>
  </tr></tbody></table>`;

  return wrapSection("jubileum-banner", OUTER_BG, bg, innerContent);
}

/**
 * Subtil jubileums-footer-rad rett over svart bunn-footer. Én linje
 * sentrert tekst med 25-årslogoen til venstre. Brukes på ordinære
 * nyhetsbrev for å minne om jubileet uten å dominere innholdet.
 */
function renderJubileumFooterRow(text: string): string {
  const bg = "#E11A22"; // FT-rød (samme som banneret)
  const ftPrimary = FT_WHITE;
  const fontFamily = FONT_STACK;
  const logoHeight = 32;

  const inner = `<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr>
    <td align="center" style="padding:14px 16px;vertical-align:middle;font-family:${fontFamily}">
      <img src="${esc(FT_JUBILEUM_LOGO_URL)}" alt="25-årsjubileum" height="${logoHeight}" style="height:${logoHeight}px;width:auto;border:0;display:inline-block;vertical-align:middle;margin-right:14px" />
      <span style="color:${ftPrimary};font-family:${fontFamily};font-weight:700;font-size:13px;letter-spacing:0.6px;line-height:1.3;vertical-align:middle">${esc(text)}</span>
    </td>
  </tr></tbody></table>`;

  return wrapSection("jubileum-footer-row", OUTER_BG, bg, inner);
}

/**
 * Header section: black bg with FT logo + top badge + brand logo ticker strip.
 */
function renderHeaderSection(
  logoHref: string,
  topBadge?: string,
  variant: TemplateVariant = "standard",
): string {
  // Marker variant-flagget for fremtidige differensieringer (vi bruker det
  // ikke akkurat nå — header er identisk for standard og jubileum slik at
  // jubileum-banneret under er det som skiller variantene).
  void variant;

  // Header er IDENTISK for standard og jubileum: svart bakgrunn med
  // FT-logo (rød bakgrunn — 5:1 aspect). Det jubileumsspesifikke ligger i
  // jubileum-banneret som rendres rett under header.
  const headerBg = FT_INK;
  const logoUrl = FT_LOGO_URL;
  const logoWidth = 180;          // 5:1 logo, 180×36 — moderat tilstedeværelse
  const logoHeight = 36;
  const logoAlt = "Fosen Tools";

  const logoImgTag = `<a href="${esc(logoHref)}" target="_blank" style="display:inline-block;text-decoration:none"><img src="${esc(logoUrl)}" alt="${logoAlt}" width="${logoWidth}" height="${logoHeight}" style="display:block;margin:0 auto;width:${logoWidth}px;height:${logoHeight}px;max-width:100%;border:0" class="mceLogo" /></a>`;

  const badgeLabel = topBadge || "NYHETSBREV";
  const badgeText = `<h2 style="line-height: 1; mso-line-height-alt: 100%; text-align: center;" class="last-child"><span style="color:#ffffff;"><span style="font-size: 12px">${esc(badgeLabel)}</span></span></h2>`;

  const innerContent = `<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="2"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover" valign="top"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0" valign="top" class="mceColumn" data-block-id="-17" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="background-color:transparent;padding-top:30px;padding-bottom:6px;padding-right:24px;padding-left:24px;border:0;border-radius:0" valign="top" class="mceImageBlockContainer" align="center" id="b1"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;margin:0;vertical-align:top;max-width:100%;width:100%;height:auto" role="presentation"><tbody><tr><td style="border:0;border-radius:0;margin:0" valign="top" align="center">${logoImgTag}</td></tr></tbody></table></td></tr><tr>${renderTextBlock(
    "gutterContainerId-4",
    "b4",
    "d4",
    "padding-left:30px;padding-right:28px;padding-top:8px;padding-bottom:20px",
    "transparent",
    badgeText
  )}</tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table>`;

  return wrapSection("3", OUTER_BG, headerBg, innerContent);
}

/**
 * Brand logo ticker row: horizontal strip of partner brand logos on dark bg.
 * Uses a single-row table with inline images. SVGs from fosen-tools.no/userfiles/image/Logo/.
 * Email clients that don't support SVG will show alt-text.
 */
function renderBrandTickerRow(): string {
  const logoCells = TICKER_BRANDS.map((b) => {
    const logoSrc = `${FT_SITE}/userfiles/image/Logo/${b.file}`;
    const href = `${FT_SITE}/${b.slug}`;
    return `<!--[if mso]><td align="center" valign="middle" style="padding:0 4px"><![endif]--><table align="left" border="0" cellpadding="0" cellspacing="0" style="display:inline-block" role="presentation"><tbody><tr><td style="padding:2px 6px" valign="middle" align="center"><a href="${esc(href)}" target="_blank" rel="noreferrer" style="display:block;text-decoration:none"><img src="${esc(logoSrc)}" alt="${esc(b.name)}" width="44" height="22" style="display:block;max-width:44px;height:auto;max-height:22px;object-fit:contain;filter:brightness(0) invert(1);-webkit-filter:brightness(0) invert(1)" /></a></td></tr></tbody></table><!--[if mso]></td><![endif]-->`;
  }).join("");

  return `<tr><td style="background-color:${FT_INK};padding-top:8px;padding-bottom:14px;padding-left:16px;padding-right:16px;border-top:1px solid #333333;border-bottom:0;border-left:0;border-right:0;border-radius:0" valign="top" align="center" id="b_ticker"><table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto"><tbody><tr><td valign="middle" align="center" style="font-size:0;line-height:0"><!--[if mso]><table align="center" border="0" cellspacing="0" cellpadding="0"><tr><![endif]-->${logoCells}<!--[if mso]></tr></table><![endif]--></td></tr></tbody></table></td></tr>`;
}

/**
 * Content section: white bg with all newsletter content.
 */
function renderContentSection(
  input: NewsletterInput,
  products: NewsletterProduct[],
  utm: (url: string, content?: string) => string
): string {
  const rows: string[] = [];

  // --- Heading (h1 + h2 subtitle) ---
  rows.push(`<tr>${renderTextBlock(
    "gutterContainerId-5",
    "b5",
    "d5",
    "padding-left:30px;padding-right:30px;padding-top:0;padding-bottom:0",
    CONTENT_BG,
    `<h1 style="line-height: 1; mso-line-height-alt: 100%;"><span style="font-size: 16px">${esc(input.headingMain)}</span></h1><h2 class="mcePastedContent last-child" style="line-height: 1; mso-line-height-alt: 100%; text-align: center;"><strong>${esc(input.headingSub)}</strong></h2>`
  )}</tr>`);

  // --- Ingress + brand logo ---
  {
    // Ingressen rendres som den er, uten auto-prepend av «Hei *|FNAME|*,»-hilsen.
    // Brukeren legger inn egen åpning i ingress-teksten hvis ønskelig.
    // *|FNAME|* og andre Mailchimp merge-tags fungerer fortsatt — esc() bevarer
    // * og | så abonnent-feltene plukkes opp ved utsendelse.
    const ingressHtml = esc(input.ingress).replace(/\n+/g, "<br><br>");
    let ingressInner = `<p style="line-height: 1.5; mso-line-height-alt: 150%; text-align: center;" class="${input.brandLogoUrl ? "" : "last-child"}"><span style="font-size: 14px">${ingressHtml}</span></p>`;

    // Brand logo as inline image after ingress text
    let brandLogoRow = "";
    if (input.brandLogoUrl) {
      const brandHref = input.brandLogoLink ? utm(input.brandLogoLink, "brand-logo") : null;
      const brandImgStyle = "display:block;margin:0 auto;width:180px;max-width:180px;height:70px;max-height:70px;object-fit:contain;border:0";
      const brandImgTag = brandHref
        ? `<a href="${esc(brandHref)}" target="_blank" style="display:block;text-align:center"><img alt="" src="${esc(input.brandLogoUrl)}" width="180" height="70" style="${brandImgStyle}" class="mceImage"></a>`
        : `<img alt="" src="${esc(input.brandLogoUrl)}" width="180" height="70" style="${brandImgStyle}" class="mceImage">`;
      brandLogoRow = `<tr><td style="padding-top:0;padding-bottom:0;padding-right:0;padding-left:0" valign="top"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate" role="presentation"><tbody><tr><td style="background-color:transparent;padding-top:12px;padding-bottom:0;padding-right:24px;padding-left:24px;border:0;border-radius:0" valign="top" class="mceImageBlockContainer" align="center" id="b300"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;margin:0;vertical-align:top;max-width:100%;width:100%;height:auto" role="presentation"><tbody><tr><td style="border:0;border-radius:0;margin:0" valign="top" align="center">${brandImgTag}</td></tr></tbody></table></td></tr></tbody></table></td></tr>`;
    }

    rows.push(`<tr><td style="padding-top:0;padding-bottom:0;padding-right:0;padding-left:0" valign="top" class="mceGutterContainer" id="gutterContainerId-6"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0;padding-right:0;padding-left:0;border:0;border-radius:0" valign="top" id="b6"><table width="100%" style="border:0;background-color:transparent;border-radius:0;border-collapse:separate"><tbody><tr><td style="padding-left:60px;padding-right:60px;padding-top:12px;padding-bottom:25px" class="mceTextBlockContainer"><div data-block-id="6" class="mceText" id="d6" style="width:100%">${ingressInner}</div></td></tr>${brandLogoRow}</tbody></table></td></tr></tbody></table></td></tr>`);
  }

  // --- Leverandør-kort (jubileum-leverandor) ELLER produkt-grid (default) ---
  const useSupplierLayout =
    input.templateVariant === "jubileum-leverandor" &&
    Array.isArray(input.suppliers) &&
    input.suppliers.length > 0;

  if (useSupplierLayout && input.suppliers) {
    // renderSupplierRows returnerer komplette <tr>…</tr>-fragmenter, ett per leverandør.
    rows.push(renderSupplierRows(input.suppliers, utm));
  } else if (products.length > 0) {
    rows.push(`<tr><td style="padding-top:0;padding-bottom:0;padding-right:32px;padding-left:32px" valign="top" class="mceGutterContainer" id="gutterContainerId-17"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:24px;padding-right:0;padding-left:0;border:0;border-radius:0" valign="top" class="mceLayoutContainer" id="b17">${renderProductGrid(products, input.themeSlug)}</td></tr></tbody></table></td></tr>`);
  }

  // --- "SE ALLE PRODUKTENE VÅRE" button (skjules i leverandør-utgaver) ---
  if (!useSupplierLayout) {
    rows.push(`<tr><td style="background-color:transparent;padding-top:10px;padding-bottom:20px;padding-right:24px;padding-left:24px;border:0;border-radius:0" valign="top" class="mceButtonBlockContainer" align="center" id="b40">${renderButton("40", "SE ALLE PRODUKTENE VÅRE", utm("https://fosen-tools.no/produkter", "alle-produkter"))}</td></tr>`);
  }

  // --- Divider ---
  rows.push(`<tr>${renderDivider("b100")}</tr>`);

  // --- Midt image ---
  if (input.midtImageUrl) {
    rows.push(renderMidtImageBlock(input.midtImageUrl, utm(input.midtCtaUrl, "midt-bilde")));
  }

  // --- Midt title ---
  rows.push(`<tr>${renderTextBlock(
    "gutterContainerId-91",
    "b91",
    "d91",
    "padding-left:24px;padding-right:24px;padding-top:0;padding-bottom:12px",
    "transparent",
    `<h1 style="line-height: 1; mso-line-height-alt: 100%;" class="last-child"><span style="font-size: 17px">${esc(input.midtTitle)}</span></h1>`
  )}</tr>`);

  // --- Midt body ---
  //   Konverter nylinjer til <br>: dobbelt-nylinje (\n\n) = avsnitt (<br><br>),
  //   enkel-nylinje (\n) = linjebrudd (<br>). Uten dette ramler alle linjer
  //   sammen i en lang setning siden HTML kollapser whitespace.
  const midtBodyHtml = esc(input.midtBody)
    .replace(/\n{2,}/g, "<br><br>")
    .replace(/\n/g, "<br>");
  rows.push(`<tr>${renderTextBlock(
    "gutterContainerId-92",
    "b92",
    "d92",
    "padding-left:24px;padding-right:24px;padding-top:0;padding-bottom:12px",
    "transparent",
    `<p class="last-child" style="line-height:1.5;mso-line-height-alt:150%;text-align:center"><span style="font-size: 14px">${midtBodyHtml}</span></p>`
  )}</tr>`);

  // --- Midt CTA button (kan skrus av med showMidtCta: false) ---
  if (input.showMidtCta !== false) {
    rows.push(`<tr><td style="background-color:transparent;padding-top:12px;padding-bottom:12px;padding-right:24px;padding-left:24px;border:0;border-radius:0" valign="top" class="mceButtonBlockContainer" align="center" id="b93">${renderButton("93", esc(input.midtCtaText), utm(input.midtCtaUrl, "midt-cta"))}</td></tr>`);
  }

  // --- «Fredagsinnlegg»-seksjon: divider + footer-bilde + sosiale CTA + kundehistorie.
  //     Kan skrus av (showFridayPost: false) for jubileum/event-utgaver der
  //     vi ikke har en ekte ukentlig kundehistorie. Default = true (vis). ---
  if (input.showFridayPost !== false) {
    rows.push(renderSocialArea(input, utm));
  }

  // Assemble the content section inner HTML
  const innerContent = `<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="41"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover" valign="top"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0" valign="top" class="mceColumn" data-block-id="-19" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody>${rows.join("\n")}</tbody></table></td></tr></tbody></table></td></tr></tbody></table>`;

  return wrapSection("42", OUTER_BG, CONTENT_BG, innerContent);
}

/**
 * Midt-section image wrapped in deeply nested layout blocks matching the master template.
 */
function renderMidtImageBlock(imageUrl: string, href: string): string {
  const imgHtml = renderImage("b81", imageUrl, href, 564, "", "mceImage");

  return `<tr><td valign="top" class="mceGutterContainer" id="gutterContainerId-97"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate" role="presentation"><tbody><tr><td style="padding-top:8px;padding-bottom:8px;padding-right:0;padding-left:0;border:0;border-radius:0" valign="top" class="mceLayoutContainer" id="b97"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="97" class="mceLayout"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover" valign="top"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td valign="top" class="mceColumn" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="border:0;border-radius:0" valign="top" align="center"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover" valign="top"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td valign="top" class="mceColumn" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="border:0;border-radius:0" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover;padding-top:0px;padding-bottom:0px" valign="top"><table border="0" cellpadding="0" cellspacing="24" width="100%" style="table-layout:fixed" role="presentation"><colgroup>${renderColgroup()}</colgroup><tbody><tr><td style="padding-top:0;padding-bottom:0" valign="top" class="mceColumn" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="background-color:transparent;padding-top:12px;padding-bottom:0;padding-right:24px;padding-left:24px;border:0;border-radius:0" valign="top" class="mceImageBlockContainer" align="center" id="b81">${imgHtml}</td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr>`;
}

/**
 * 12-column colgroup used in grid layouts.
 */
function renderColgroup(): string {
  return Array(12).fill('<col span="1" width="8.333333333333332%">').join("");
}

/**
 * Product grid: 12-column system. Row 1 = up to 3 products (colspan 4 each),
 * Row 2 = up to 2 products (colspan 6 each).
 */
function renderProductGrid(products: NewsletterProduct[], themeSlug: string): string {
  const row1 = products.slice(0, 3);
  const row2 = products.slice(3, 5);

  // Block IDs for product images/text
  const imgIds1 = ["b7", "b10", "b13"];
  const txtIds1 = ["b8", "b11", "b14"];
  const gutterIds1 = ["gutterContainerId-8", "gutterContainerId-11", "gutterContainerId-14"];
  const imgIds2 = ["b207", "b210"];
  const txtIds2 = ["b208", "b211"];

  // Build row 1 columns
  const row1Cols = row1.map((p, i) => {
    const productUtm = withUtm(p.url, themeSlug, slugFromUrl(p.url));
    return renderProductColumn(
      p,
      productUtm,
      4,
      "33.33333333333333%",
      imgIds1[i],
      txtIds1[i],
      gutterIds1[i],
      i === 0 ? "padding-left:0;padding-right:0;padding-top:12px;padding-bottom:12px" : "padding-left:8px;padding-right:8px;padding-top:12px;padding-bottom:12px"
    );
  }).join("");

  // Build row 2 columns
  const row2Cols = row2.map((p, i) => {
    const productUtm = withUtm(p.url, themeSlug, slugFromUrl(p.url));
    return renderProductColumn(
      p,
      productUtm,
      6,
      "50%",
      imgIds2[i],
      txtIds2[i],
      i === 0 ? "gutterContainerId-8" : "gutterContainerId-11",
      "padding-left:8px;padding-right:8px;padding-top:12px;padding-bottom:12px"
    );
  }).join("");

  const row1Html = row1Cols ? `<tr class="mceKeepColumns">${row1Cols}</tr>` : "";
  const row2Html = row2Cols ? `<tr class="mceKeepColumns">${row2Cols}</tr>` : "";

  return `<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="17" class="mceLayout"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover" valign="top"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td valign="top" class="mceColumn" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="border:0;border-radius:0" valign="top" align="center"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover" valign="top"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td valign="top" class="mceColumn" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="border:0;border-radius:0" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="16"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover;padding-top:0px;padding-bottom:0px" valign="top"><table border="0" cellpadding="0" cellspacing="24" width="100%" style="table-layout:fixed" role="presentation"><colgroup>${renderColgroup()}</colgroup><tbody>${row1Html}${row2Html}</tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table>`;
}

/**
 * Leverandør-kort som full-bredde rader under hverandre. Brukes når
 * templateVariant = "jubileum-leverandor" og input.suppliers er satt.
 *
 * Hver leverandør rendres som ett kort:
 *   ┌──────────────┬──────────────────────────────────┐
 *   │              │ NAVN                             │
 *   │   [LOGO]     │ Tagline (rød)                    │
 *   │              │ Eventuell beskrivelse            │
 *   │              │ [Se sortimentet →]               │
 *   └──────────────┴──────────────────────────────────┘
 *
 * 660px bred (matcher hovedinnholdet). Logo-kolonne 180px med lys grå bakgrunn.
 * Knappen følger samme FT-røde stil som resten av nyhetsbrevet.
 */
function renderSupplierRows(
  suppliers: NewsletterSupplier[],
  utm: (url: string, content: string) => string
): string {
  return suppliers
    .map((s, i) => renderSupplierCard(s, i, utm))
    .join("\n");
}

function renderSupplierCard(
  s: NewsletterSupplier,
  index: number,
  utm: (url: string, content: string) => string
): string {
  const slug = s.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const ctaHref = utm(s.ctaUrl, `leverandor-${slug || "x"}`);
  const blockId = `bSup${index}`;

  const cardBg = "#ffffff";
  const logoColBg = "#fafafa";
  const borderColor = "#e5e7eb";
  const textColor = "#0f1115";
  const accentColor = FT_RED;
  const descColor = "#555555";

  const descHtml = s.description
    ? `<p style="margin:0;padding:4px 0 10px 0;line-height:1.4;color:${descColor};font-family:${FONT_STACK};font-size:13px">${esc(s.description)}</p>`
    : `<div style="height:6px;line-height:6px;font-size:0">&nbsp;</div>`;

  // Logo-bredde: konfigurerbar per leverandør (default 140, klemt 80–180).
  // Kolonnen er fast 180px så alle kort har lik bredde uansett logo.
  const logoWidth = Math.max(80, Math.min(180, Math.round(s.logoWidth ?? 140)));
  const logoMaxHeight = Math.round(logoWidth * 0.7); // bevarer aspekt-grense
  // Hvis logo-URL mangler: vis stor uppercase merkenavn i logo-cellen så vi
  // ikke får et broken-image-ikon. Brukbart inntil logoen er lastet opp.
  const logoInner = s.logoUrl
    ? `<img src="${esc(s.logoUrl)}" alt="${esc(s.name)}" width="${logoWidth}" style="display:block;margin:0 auto;max-width:${logoWidth}px;max-height:${logoMaxHeight}px;width:auto;height:auto;border:0" />`
    : `<div style="font-family:${FONT_STACK};font-size:18px;font-weight:800;letter-spacing:1px;color:${textColor};text-transform:uppercase;line-height:1.2;text-align:center">${esc(s.name)}</div>`;
  const logoCell = `<td width="180" valign="middle" align="center" style="width:180px;padding:14px 12px;background-color:${logoColBg};border-right:1px solid ${borderColor};border-radius:8px 0 0 8px;text-align:center;vertical-align:middle">${logoInner}</td>`;

  // Tekst-kolonnen: navn, tagline, beskrivelse, knapp — komprimert padding
  const textCell = `<td valign="middle" style="padding:16px 20px;vertical-align:middle"><h3 style="margin:0 0 2px 0;padding:0;font-family:${FONT_STACK};font-size:18px;font-weight:800;letter-spacing:0.5px;color:${textColor};text-transform:uppercase;line-height:1.15">${esc(s.name)}</h3><p style="margin:0;padding:0;font-family:${FONT_STACK};font-size:12px;color:${accentColor};font-weight:700;letter-spacing:0.4px;line-height:1.3">${esc(s.tagline)}</p>${descHtml}${renderButton(blockId, s.ctaText, ctaHref, 200, "left")}</td>`;

  // Kortet
  const card = `<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="border-collapse:separate;background-color:${cardBg};border:1px solid ${borderColor};border-radius:8px"><tbody><tr>${logoCell}${textCell}</tr></tbody></table>`;

  // Wrappet i row med padding under (mindre mellomrom mellom kort)
  return `<tr><td style="padding:0 24px 12px 24px" valign="top" class="mceLayoutContainer" id="${blockId}-wrap">${card}</td></tr>`;
}

/**
 * Single product column: image + text (name, sku, price, "Gå til produkt" link).
 */
function renderProductColumn(
  product: NewsletterProduct,
  href: string,
  colspan: number,
  widthPct: string,
  imgBlockId: string,
  txtBlockId: string,
  gutterContainerId: string,
  textPadding: string
): string {
  // Fast bilde-boks-størrelse per kolonne — alle produktbilder rendres på
  // identisk plass uavhengig av aspect ratio. `object-fit:contain` bevarer
  // proporsjonene; hvit bg gir konsistent ramme.
  const imgWidth = colspan === 4 ? 186 : 282;
  const imgBoxHeight = colspan === 4 ? 160 : 220;

  const productImgStyle = `display:block;margin:0 auto;width:100%;max-width:${imgWidth}px;height:${imgBoxHeight}px;object-fit:contain;background:#ffffff;border:0`;
  // #8 Alt-tekst: bruker produktnavn så Outlook + skjermlesere har fallback når bilde ikke laster
  const imgInner = `<img src="${esc(product.imageUrl)}" alt="${esc(product.name)}" width="${imgWidth}" height="${imgBoxHeight}" style="${productImgStyle}" class="imageDropZone mceImage" />`;
  const imgHtml = href
    ? `<a href="${esc(href)}" target="_blank" style="display:block">${imgInner}</a>`
    : imgInner;

  // Product text: name (uppercase), sku, price, "Gå til produkt" underlined
  // Min-høyder sikrer at SKU, pris og CTA starter på samme linje på tvers av
  // alle tre kort uansett om navnet er 1, 2 eller 3 linjer.
  const nameUpper = product.name.toUpperCase();
  const ctaText = product.ctaText ?? "Gå til produkt";
  const productTextHtml = `<h4 style="line-height: 1.25; mso-line-height-alt: 125%; text-align: center; min-height: 54px;"><a href="${esc(href)}" target="_blank">${esc(nameUpper)}</a></h4><p style="line-height: 1.25; mso-line-height-alt: 125%; text-align: center; min-height: 16px; margin: 4px 0 0 0;"><a href="${esc(href)}" target="_blank" style="color:#666"><span style="font-size:11px">${esc(product.brandSku)}</span></a></p><p style="line-height: 1.25; mso-line-height-alt: 125%; text-align: center; min-height: 36px; margin: 4px 0 0 0;"><a href="${esc(href)}" target="_blank"><strong><span style="font-size:13px">${esc(product.priceText)}</span></strong></a></p><h4 style="line-height: 1.25; mso-line-height-alt: 125%; text-align: center; margin-top: 8px;" class="last-child"><a href="${esc(href)}" target="_blank"><strong><span style="text-decoration:underline;">${esc(ctaText)}</span></strong></a></h4>`;

  return `<td style="padding-top:0;padding-bottom:0" valign="top" colspan="${colspan}" width="${widthPct}"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="background-color:transparent;padding-top:0;padding-bottom:0;padding-right:6px;padding-left:6px;border:0;border-radius:0" valign="top" class="mceImageBlockContainer" align="center" id="${imgBlockId}">${imgHtml}</td></tr><tr><td style="padding-top:0;padding-bottom:0;padding-right:0;padding-left:0" valign="top" class="mceGutterContainer" id="${gutterContainerId}"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0;padding-right:0;padding-left:0;border:0;border-radius:0" valign="top" id="${txtBlockId}"><table width="100%" style="border:0;background-color:transparent;border-radius:0;border-collapse:separate"><tbody><tr><td style="${textPadding}" class="mceTextBlockContainer"><div data-block-id="${txtBlockId.replace("b", "")}" class="mceText" id="d${txtBlockId.replace("b", "")}" style="width:100%">${productTextHtml}</div></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td>`;
}

/**
 * Social area: divider, footer image, 3 social CTA buttons, descriptive text.
 */
function renderSocialArea(
  input: NewsletterInput,
  utm: (url: string, content?: string) => string
): string {
  const parts: string[] = [];

  // Divider
  parts.push(`<tr>${renderDivider("b89")}</tr>`);

  // Footer image (linked to latest social post, typically Instagram)
  if (input.footerImageUrl) {
    const rawFooterHref = input.socialInstagramPostUrl || input.socialFacebookPostUrl || "https://fosen-tools.no/";
    const footerImgHref = utm(rawFooterHref, "footer-bilde");
    const footerImgHtml = renderImage("b65", input.footerImageUrl, footerImgHref, 590, "", "mceImage");

    parts.push(`<tr><td style="background-color:transparent;padding-top:12px;padding-bottom:12px;padding-right:16px;padding-left:16px;border:0;border-radius:0" valign="top" class="mceImageBlockContainer" align="center" id="b65">${footerImgHtml}</td></tr>`);
  }

  // #2 Sosiale CTA: kompakte tekst-lenker i stedet for store røde knapper, så midt-CTA
  //   og produktgrid forblir de visuelt dominerende handlingene.
  const hasSocial = input.socialInstagramPostUrl || input.socialFacebookPostUrl || input.socialLinkedinPostUrl;
  if (hasSocial) {
    const igUrl = utm(input.socialInstagramPostUrl || "https://instagram.com/fosentools", "social-instagram");
    const fbUrl = utm(input.socialFacebookPostUrl || "https://www.facebook.com/fosentools", "social-facebook");
    const liUrl = utm(input.socialLinkedinPostUrl || "https://www.linkedin.com/company/fosen-tools/", "social-linkedin");

    const linkStyle = `color:${FT_RED};font-family:${FONT_STACK};font-size:12px;font-weight:bold;letter-spacing:2px;text-decoration:none;padding:0 14px`;
    const socialLinksHtml = `<p style="line-height:1.5;mso-line-height-alt:150%;text-align:center;margin:0" class="last-child"><a href="${esc(igUrl)}" target="_blank" style="${linkStyle}"><span style="color:${FT_RED}">INSTAGRAM</span></a><span style="color:#cccccc">·</span><a href="${esc(fbUrl)}" target="_blank" style="${linkStyle}"><span style="color:${FT_RED}">FACEBOOK</span></a><span style="color:#cccccc">·</span><a href="${esc(liUrl)}" target="_blank" style="${linkStyle}"><span style="color:${FT_RED}">LINKEDIN</span></a></p>`;

    parts.push(`<tr>${renderTextBlock(
      "gutterContainerId-118",
      "b118",
      "d118",
      "padding-left:24px;padding-right:24px;padding-top:8px;padding-bottom:16px",
      "transparent",
      socialLinksHtml
    )}</tr>`);
  }
  // #3 Kundehistorie / «Levert til X» — speiler +144%-mønsteret fra sosiale medier.
  // Bruker input.customerStoryText hvis satt, ellers default generisk tekst.
  const storyHtml = (input.customerStoryText && input.customerStoryText.trim())
    ? esc(input.customerStoryText).replace(/\n+/g, "<br><br>")
    : "Vi utvikler og leverer komplette verktøyløsninger tilpasset kundens faktiske behov. Her er noen eksempler på ferdige prosjekter vi har levert den siste tiden.";
  parts.push(`<tr>${renderTextBlock(
    "gutterContainerId-74",
    "b74",
    "d74",
    "padding-left:50px;padding-right:50px;padding-top:12px;padding-bottom:12px",
    "transparent",
    `<p style="line-height: 1.5; mso-line-height-alt: 150%; text-align: center;"><span style="font-size: 14px">${storyHtml}</span></p><p style="text-align: center;" class="last-child"><br></p>`
  )}</tr>`);

  return parts.join("\n");
}

/**
 * Single social CTA button (INSTAGRAM / FACEBOOK / LINKEDIN) in a 4-column cell.
 */
function renderSocialButton(
  id: string,
  label: string,
  href: string,
  align: string,
  extraPadding: string
): string {
  const btnStyle = `background-color:${FT_RED};border-radius:0;border:1px none #222222;color:${FT_WHITE};display:block;font-family:${FONT_STACK};font-size:11px;font-weight:normal;font-style:normal;padding:16px 28px;text-decoration:none;text-align:center;direction:ltr;letter-spacing:3px`;

  return `<td style="padding-top:0;padding-bottom:0" valign="top" class="mceColumn" colspan="4" width="33.33333333333333%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="background-color:transparent;padding-top:12px;padding-bottom:12px;${extraPadding};border:0;border-radius:0" valign="top" class="mceButtonBlockContainer" align="${align}" id="${id}"><div><!--[if !mso]><!--></div><table align="${align}" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:150px" role="presentation" data-block-id="${id.replace("b", "")}" class="mceButtonContainer"><tbody><tr class="mceStandardButton"><td style="background-color:${FT_RED};border-radius:0;text-align:center" valign="top" class="mceButton"><a href="${esc(href)}" target="_blank" class="mceButtonLink" style="${btnStyle}" rel="noreferrer">${esc(label)}</a></td></tr></tbody></table><div><!--<![endif]--></div><table align="${align}" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:150px" role="presentation" data-block-id="${id.replace("b", "")}" class="mceButtonContainer"><tbody><tr>\n<!--[if mso]>\n<td align="${align}">\n<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"\nxmlns:w="urn:schemas-microsoft-com:office:word"\nhref="${esc(href)}"\nstyle="v-text-anchor:middle; width:150px; height:44px;"\narcsize="0%"\nstrokecolor="${FT_RED}"\nstrokeweight="1px"\nfillcolor="${FT_RED}">\n<v:stroke dashstyle="solid"/>\n<w:anchorlock />\n<center style="\ncolor: ${FT_WHITE};\ndisplay: block;\nfont-family: ${FONT_STACK};\nfont-size: 11;\nfont-style: normal;\nfont-weight: normal;\nletter-spacing: 3px;\ntext-decoration: none;\ntext-align: center;\ndirection: ltr;"\n>\n${esc(label)}\n</center>\n</v:roundrect>\n</td>\n<![endif]-->\n</tr></tbody></table></td></tr></tbody></table></td>`;
}

/**
 * Footer section: black bg with social follow icons, company info, Mailchimp links.
 */
function renderFooterSection(variant: TemplateVariant = "standard"): string {
  // Jubileum: rød footer-bg. Standard: svart.
  const isJubileum = variant === "jubileum" || variant === "jubileum-leverandor";
  // Begge varianter bruker FT-ink (svart) footer for konsistens.
  const bg = FT_INK;

  // Social follow icons fra Mailchimp CDN.
  // - Standard-tema: fargete ikoner (Facebook-blå, Instagram-gradient osv.)
  //   Disse fungerer fint mot svart footer-bg.
  // - Jubileum-tema: «dark» SVG-silhuett-variant + CSS-filter for å
  //   invertere til ren hvit på rød bg. Outlook desktop (Word-renderer)
  //   støtter ikke CSS-filter — der fallback'er ikonene til svart
  //   silhuett som fortsatt er lesbar mot rød.
  const iconVariant = isJubileum ? "dark" : "color";
  const filterStyle = isJubileum
    ? "filter:brightness(0) invert(1);-webkit-filter:brightness(0) invert(1);"
    : "";
  const socialIcons = [
    { href: "https://facebook.com/fosentools", src: `https://cdn-images.mailchimp.com/icons/social-block-v3/block-icons-v3/facebook-icon-${iconVariant}-40.png`, alt: "Facebook icon" },
    { href: "https://instagram.com/fosentools", src: `https://cdn-images.mailchimp.com/icons/social-block-v3/block-icons-v3/instagram-icon-${iconVariant}-40.png`, alt: "Instagram icon" },
    { href: "https://fosen-tools.no/", src: `https://cdn-images.mailchimp.com/icons/social-block-v3/block-icons-v3/website-icon-${iconVariant}-40.png`, alt: "Website icon" },
    { href: "https://www.linkedin.com/company/fosen-tools/", src: `https://cdn-images.mailchimp.com/icons/social-block-v3/block-icons-v3/linkedin-icon-${iconVariant}-40.png`, alt: "LinkedIn icon" },
  ];

  const iconCells = socialIcons.map(icon => {
    return `<!--[if mso]><td align="center" valign="top"><![endif]--><table align="left" border="0" cellpadding="0" cellspacing="0" style="display:inline;float:left" role="presentation"><tbody><tr><td style="padding-top:3px;padding-bottom:3px;padding-left:30px;padding-right:30px" valign="top" class="mceSocialFollowIcon" align="center" width="24"><a href="${esc(icon.href)}" target="_blank" rel="noreferrer"><img class="mceSocialFollowImage" width="24" height="24" alt="${esc(icon.alt)}" src="${esc(icon.src)}" style="${filterStyle}display:block"></a></td></tr></tbody></table><!--[if mso]></td><![endif]-->`;
  }).join("");

  const socialFollowBlock = `<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" class="mceSocialFollowBlock"><tbody><tr><td valign="middle" align="center"><!--[if mso]><table align="left" border="0" cellspacing="0" cellpadding="0"><tr><![endif]-->${iconCells}<!--[if mso]></tr></table><![endif]--></td></tr></tbody></table>`;

  // Company info text
  const companyInfoHtml = `<p style="line-height: 0; mso-line-height-alt: 0%;"><br></p><p style="line-height: 1.25; mso-line-height-alt: 125%; text-align: center;"><span style="color:rgb(255, 255, 255);"><span style="font-size: 20px"><span style="font-family: ${ROBOTO_STACK}">Fosen Tools</span></span></span></p><p style="line-height: 1; mso-line-height-alt: 100%;"><span style="color:rgb(255, 255, 255);"><span style="font-size: 11px">Industrigata 1</span></span></p><p style="line-height: 1; mso-line-height-alt: 100%;"><span style="color:rgb(255, 255, 255);"><span style="font-size: 11px">N-7130 Brekstad, NORWAY</span></span></p><p style="line-height: 1; mso-line-height-alt: 100%;"><span style="color:rgb(255, 255, 255);"><span style="font-size: 11px">Telefon: </span></span><a href="tel:+4772515120" style="color:#ffffff;text-decoration:none"><span style="color:rgb(255, 255, 255);"><span style="font-size: 11px">+47 72 51 51 20</span></span></a></p><p style="line-height: 1; mso-line-height-alt: 100%;"><span style="color:rgb(255, 255, 255);"><span style="font-size: 11px">E-post: </span></span><a href="mailto:post@fosen-tools.no" target="_blank" style="color:#ffffff;text-decoration:none"><span style="color:rgb(255, 255, 255);"><span style="font-size: 11px">post@fosen-tools.no</span></span></a></p><p style="line-height: 1; mso-line-height-alt: 100%;"><span style="color:rgb(255, 255, 255);"><span style="font-size: 11px">NO 991976191 MVA</span></span></p><p style="line-height: 1; mso-line-height-alt: 100%;" class="last-child"><span style="color:rgb(255, 255, 255);"><span style="font-size: 11px">NCAGE: N6114</span></span></p>`;

  // Mailchimp footer links
  const footerLinksHtml = `<p style="line-height: 1; mso-line-height-alt: 100%;" class="last-child"><span style="color:rgb(255, 255, 255);"><span style="font-size: 11px"><br>    </span></span><a href="*|ARCHIVE|*" style="color: #cccccc;"><span style="color:rgb(204, 204, 204);"><span style="font-size: 11px">Vis e-posten i nettleser</span></span></a><span style="font-size: 11px"><br>    </span><a href="*|UPDATE_PROFILE|*" style="color: #cccccc;"><span style="color:rgb(204, 204, 204);"><span style="font-size: 11px">Oppdater dine preferanser</span></span></a><span style="font-size: 11px">•    </span><a href="*|UNSUB|*" style="color: #cccccc;"><span style="color:rgb(204, 204, 204);"><span style="font-size: 11px">Meld deg av</span></span></a></p>`;

  // Build inner content — social icons + company info + footer links
  const innerContent = `<table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="57"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover" valign="top"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0" valign="top" class="mceColumn" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="background-color:${bg};padding-top:17px;padding-bottom:0;padding-right:10px;padding-left:10px;border:0;border-radius:0" valign="top" class="mceLayoutContainer" id="b52"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="52"><tbody><tr class="mceRow"><td style="background-color:${bg};background-position:center;background-repeat:no-repeat;background-size:cover;padding-top:0px;padding-bottom:0px" valign="top"><table border="0" cellpadding="0" cellspacing="24" width="100%" role="presentation"><tbody><tr><td valign="top" class="mceColumn" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="border:0;border-radius:0" valign="top" class="mceSocialFollowBlockContainer">${socialFollowBlock}</td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td valign="top" class="mceGutterContainer" id="gutterContainerId-101"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate" role="presentation"><tbody><tr><td style="background-color:${bg};padding-top:12px;padding-bottom:0;padding-right:0;padding-left:0;border:0;border-radius:0" valign="top" class="mceLayoutContainer" id="b101"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="101" class="mceLayout"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover" valign="top"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td valign="top" class="mceColumn" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="border:0;border-radius:0" valign="top" align="center"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover" valign="top"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td valign="top" class="mceColumn" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="border:0;border-radius:0" valign="top"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="108"><tbody><tr class="mceRow"><td style="background-position:center;background-repeat:no-repeat;background-size:cover" valign="top"><table border="0" cellpadding="0" cellspacing="24" width="100%" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0" valign="center" class="mceColumn" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0;padding-right:0;padding-left:0" valign="top" class="mceGutterContainer" id="gutterContainerId-113"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0;padding-right:0;padding-left:0;border:0;border-radius:0" valign="top" id="b113"><table width="100%" style="border:0;background-color:transparent;border-radius:0;border-collapse:separate"><tbody><tr><td style="padding-left:24px;padding-right:24px;padding-top:0;padding-bottom:12px" class="mceTextBlockContainer"><div data-block-id="113" class="mceText" id="d113" style="width:100%">${companyInfoHtml}</div></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr><tr><td style="background-color:${bg};padding-top:0;padding-bottom:0;padding-right:0;padding-left:0;border:0;border-radius:0" valign="top" class="mceLayoutContainer" id="b56"><table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" data-block-id="56" class="mceFooterSection"><tbody><tr class="mceRow"><td style="background-color:${bg};background-position:center;background-repeat:no-repeat;background-size:cover;padding-top:0px;padding-bottom:0px" valign="top"><table border="0" cellpadding="0" cellspacing="12" width="100%" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0" valign="top" class="mceColumn" colspan="12" width="100%"><table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation"><tbody><tr><td style="padding-top:10px;padding-bottom:10px;padding-right:10px;padding-left:10px" valign="top" class="mceGutterContainer" id="gutterContainerId-54"><table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate" role="presentation"><tbody><tr><td style="padding-top:0;padding-bottom:0;padding-right:0;padding-left:0;border:0;border-radius:0" valign="top" align="center" id="b54"><table width="100%" style="border:0;background-color:transparent;border-radius:0;border-collapse:separate"><tbody><tr><td style="padding-left:0;padding-right:0;padding-top:0;padding-bottom:0" class="mceTextBlockContainer"><div data-block-id="54" class="mceText" id="d54" style="display:inline-block;width:100%">${footerLinksHtml}</div></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table>`;

  return wrapSection("58", OUTER_BG, bg, innerContent);
}
