/**
 * MailchimpBuilderService — programmatisk bygging av FTNett-nyhetsbrev.
 *
 * Workflow:
 *  1. replicateCampaign(masterId) → ny campaign-ID med samme HTML-template
 *  2. updateSettings(id, {...}) → ny subject/preview/title
 *  3. uploadImage(buffer, name) → URL til Mailchimp Content Studio
 *  4. buildNewsletterHtml(template, input) → ferdig HTML
 *  5. putContent(id, html, plainText) → erstatt HTML i campaign
 *
 * Master-template: kampanje `b700e0c598` (5. mai 2026 - Custom-vogn nyhetsbrev).
 */

// Master-template: Milwaukee momentnøkler-nyhetsbrev (sendt 13. mai 2026).
// Den har den optimale strukturen ferdig: 3+2 produkt-grid, full-bredde midt-bilde,
// brand-logo over produktene (b300), Roboto-fonter, FT-rød (#f12634) CTA-knapper.
const MASTER_CAMPAIGN_ID = "6d6f8b6bdb";

export interface NewsletterInput {
  themeSlug: string;
  subjectLine: string;
  previewText: string;
  title?: string;
  headingMain: string;
  headingSub: string;
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
}

export interface NewsletterProduct {
  url: string;
  name: string;
  brandSku: string;
  priceText: string;
  imageUrl: string;
  ctaText?: string;
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
   * Bygg ferdig HTML fra master-template + input.
   * Replicater b700e0c598-master og gjør strukturerte erstatninger.
   */
  buildNewsletterHtml(masterHtml: string, input: NewsletterInput): string {
    let html = masterHtml;

    // 1) Bytt ALLE utm_campaign-strenger til ny themeSlug
    html = html.replace(
      /utm_campaign=[a-zA-Z0-9_\-]+/g,
      `utm_campaign=${encodeURIComponent(input.themeSlug)}`
    );

    // 2) Hovedtittel + undertittel (b5)
    // Master: <h1>...font-size: 16px>Milwaukee momentnøkler er her</span></h1>
    //         <h2 class="mcePastedContent..."><strong>  20% på hele spekteret</strong></h2>
    html = html.replace(
      /(<span style="font-size: 16px">)[^<]+(<\/span>)/,
      `$1${escapeHtml(input.headingMain)}$2`
    );
    // Bytt undertittel (alt mellom <strong> og </strong> i h2-blokken etter hovedtittel)
    html = html.replace(
      /<strong>(\s*)20% på hele spekteret<\/strong>/,
      `<strong>$1${escapeHtml(input.headingSub)}</strong>`
    );

    // 3) Ingress (b6) — første lange tekstblokk
    const ingressPattern = /(<span style="font-size: 14px">)([^<]{30,500})(<\/span>)/;
    const m = html.match(ingressPattern);
    if (m) {
      html = html.replace(m[0], `${m[1]}${escapeHtml(input.ingress)}${m[3]}`);
    }

    // 4) Topp badge (b4) — master: "MILWAUKEE TILBUD"
    if (input.topBadge) {
      html = html.replace(/>MILWAUKEE TILBUD</, `>${escapeHtml(input.topBadge)}<`);
    }

    // 4b) Brand-logo (b300) — bytte src + a-tag href hvis manufacturer er ikke Milwaukee
    if (input.brandLogoUrl && input.brandLogoLink) {
      html = replaceBrandLogoBlock(
        html,
        input.brandLogoUrl,
        withUtm(input.brandLogoLink, input.themeSlug),
        input.brandLogoLink
      );
    }

    // 5) Midtseksjon
    html = html.replace(/HDFI — [^<]+/g, escapeHtml(input.midtTitle));
    html = html.replace(
      /Hver Custom-verktøyvogn[^<]+«Fosen Tools-standarden»\./g,
      escapeHtml(input.midtBody)
    );
    html = html.replace(/LES MER OM HDFI/g, escapeHtml(input.midtCtaText));
    html = html.replace(
      /href="https:\/\/fosen-tools\.no\/hdfi[^"]*"/g,
      `href="${withUtm(input.midtCtaUrl, input.themeSlug)}"`
    );

    // 6) Bytt produkter — master har 5: 125584/125591/125586 (rad 1) + 125590/125585 (rad 2)
    const masterProductSlugs = [
      "/milwaukee/125584",
      "/milwaukee/125591",
      "/milwaukee/125586",
      "/milwaukee/125590",
      "/milwaukee/125585",
    ];
    const masterImages = extractMasterImageMap(masterHtml);

    for (let i = 0; i < Math.min(5, input.products.length); i++) {
      const p = input.products[i];
      const oldSlug = masterProductSlugs[i];
      const productPath = extractPath(p.url);
      html = html.replace(new RegExp(escapeRegex(oldSlug), "g"), productPath);

      const masterImg = masterImages[oldSlug];
      if (masterImg && p.imageUrl) {
        html = html.replace(new RegExp(escapeRegex(masterImg), "g"), p.imageUrl);
      }
    }

    // 7) Produkt-tekster (Milwaukee-master har 5 produkt-tekster)
    const masterProductTexts = [
      "MOMENTNØKKEL 1/2&quot; DR. KLIKK 40–200 NM<br>Milwaukee 4932500851<br>3 736,- eks. mva. (før 4 670,-)",
      "MOMENTNØKKEL 3/8&quot; DR. KLIKK 25–140 NM<br>Milwaukee 4932500824<br>3 288,- eks. mva. (før 4 110,-)",
      "MOMENTNØKKEL 1/4&quot; DR. KLIKK 5–25 NM<br>Milwaukee 4932500823<br>3 136,- eks. mva. (før 3 920,-)",
      "MOMENTNØKKEL 3/8&quot; DR. KLIKK 10–50 NM<br>Milwaukee 4932500850<br>3 288,- eks. mva. (før 4 110,-)",
      "MOMENTNØKKEL 1/2&quot; DR. KLIKK 60–340 NM<br>Milwaukee 4932500825<br>3 960,- eks. mva. (før 4 950,-)<br>(bestillingsvare)",
    ];
    for (let i = 0; i < Math.min(5, input.products.length); i++) {
      html = replaceProductHeading(
        html,
        masterProductTexts[i],
        buildProductHeadingText(input.products[i])
      );
    }

    // 7b) Hvis < 5 produkter, fjern overskytende produkt-blokker
    if (input.products.length < 5) {
      html = trimProductGrid(html, input.products.length);
    }

    // 8) Midtseksjon-bilde (b81 + b127)
    const midtMasterUrl = masterImages["__midt__"];
    if (midtMasterUrl && input.midtImageUrl) {
      html = html.replace(
        new RegExp(escapeRegex(midtMasterUrl), "g"),
        input.midtImageUrl
      );
    }

    // 9) Footer-bilde
    const footerMasterUrl = masterImages["__footer__"];
    if (footerMasterUrl && input.footerImageUrl) {
      html = html.replace(
        new RegExp(escapeRegex(footerMasterUrl), "g"),
        input.footerImageUrl
      );
    }

    // 10) Sosiale lenker
    if (input.socialInstagramPostUrl) {
      html = html.replace(
        /https:\/\/www\.instagram\.com\/p\/[^"\/]+\/[^"]*/g,
        input.socialInstagramPostUrl
      );
    }
    if (input.socialLinkedinPostUrl) {
      html = html.replace(
        /https:\/\/www\.linkedin\.com\/feed\/update\/[^"]+/g,
        input.socialLinkedinPostUrl
      );
    }

    // 11) STRUKTURELLE FIX-ER:
    // (Milwaukee-master har allerede full-bredde midt-bilde og brand-logo over produkter,
    //  så vi trenger kun bilde-sentrering og produkt-høyde-justering.)
    html = addMarginAutoToAllImages(html);
    html = alignProductHeights(html);

    return html;
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

  /**
   * Henter brand-logo-URL fra fosen-tools.no/{manufacturer} (ProducerLogoImage).
   * Returnerer Azure Blob-URL (offentlig, permanent), uten å laste opp til Mailchimp.
   */
  async fetchBrandLogoUrl(manufacturer: string): Promise<string | null> {
    try {
      const url = `https://fosen-tools.no/${manufacturer}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      const html = await res.text();
      // 1. ProducerLogoImage
      const producer = html.match(/<img class="ProducerLogoImage"[^>]+src="([^"]+)"/);
      if (producer) {
        let u = producer[1];
        if (u.startsWith("/")) u = `https://fosen-tools.no${u}`;
        return u;
      }
      // 2. Generic blob-mønster med merke i URL
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

    // Auto-fetch brand-logo fra manufacturer-URL hvis ikke gitt eksplisitt.
    // Pluck manufacturer fra første produkt-URL (mest pålitelige kilde).
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

    const masterContent = await this.mcRequest<{ html: string }>(
      "GET",
      `/campaigns/${MASTER_CAMPAIGN_ID}/content`
    );

    const newHtml = this.buildNewsletterHtml(masterContent.html, input);
    const plainText = this.buildPlainText(input);

    await this.putContent(campaignId, newHtml, plainText);

    const editUrl = `https://${this.serverPrefix}.admin.mailchimp.com/campaigns/edit?id=${campaignId}`;
    return { campaignId, editUrl };
  }
}

// ============ Helpers ============

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractPath(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname;
  } catch {
    return url;
  }
}

function withUtm(url: string, themeSlug: string): string {
  if (!url) return url;
  if (url.includes("utm_source=")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=FTNett&utm_medium=email&utm_campaign=${encodeURIComponent(themeSlug)}`;
}

function buildProductHeadingText(p: NewsletterProduct): string {
  const safe = (s: string) => s.replace(/"/g, "&quot;");
  return `${safe(p.name)}<br/>${safe(p.brandSku)}<br/>${safe(p.priceText)}`;
}

function replaceProductHeading(html: string, oldText: string, newText: string): string {
  if (html.includes(oldText)) return html.replace(oldText, newText);
  const oldWithQuot = oldText.replace(/"/g, "&quot;");
  if (html.includes(oldWithQuot)) return html.replace(oldWithQuot, newText);
  return html;
}

/**
 * Plukk ut bilde-URLer fra master-HTML basert på nærmeste anchor.
 */
function extractMasterImageMap(html: string): Record<string, string> {
  const map: Record<string, string> = {};
  const imgRegex = /<img[^>]+src="(https:\/\/mcusercontent\.com\/[^"]+)"/g;
  const found: Array<{ pos: number; src: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html))) {
    found.push({ pos: match.index, src: match[1] });
  }

  for (const f of found) {
    const before = html.slice(Math.max(0, f.pos - 3000), f.pos);
    const anchors = [
      ...before.matchAll(
        /href="https:\/\/fosen-tools\.no(\/[a-zA-Z0-9\/_\-?=&.%]+)"/g
      ),
    ];
    if (anchors.length === 0) continue;
    const lastAnchor = anchors[anchors.length - 1][1];
    const cleanPath = lastAnchor.split("?")[0];

    if (
      cleanPath.match(
        /^\/(fosen-tools-custom|milwaukee|rennsteig|fosen-tools|wera|knipex|stahlwille|snap-on|facom|ledlenser|pelicase|hellberg|husqvarna|bahco|leatherman|halder)\/\d+/
      )
    ) {
      if (!map[cleanPath]) map[cleanPath] = f.src;
    } else if (cleanPath === "/hdfi" || cleanPath.includes("/produkter/")) {
      if (!map["__midt__"]) map["__midt__"] = f.src;
    } else if (cleanPath === "/") {
      if (!map["__footer__"]) map["__footer__"] = f.src;
    }
  }

  return map;
}

/**
 * Master har 2 midt-bilder side om side (50/50). Reduserer til 1 i full bredde
 * — samme tilnærming som ble brukt manuelt i Wera-momentnøkkel-draften.
 */
function collapseMidtImageToFullWidth(html: string): string {
  const col128Marker =
    '<td style="padding-top:0;padding-bottom:0" valign="top" class="mceColumn" id="mceColumnId-128"';
  const pos = html.indexOf(col128Marker);
  if (pos === -1) return html;

  let depth = 1;
  let i = pos + col128Marker.length;
  let endPos = -1;
  while (i < html.length) {
    const openMatch = html.indexOf("<td", i);
    const closeMatch = html.indexOf("</td>", i);
    if (closeMatch === -1) break;
    if (openMatch !== -1 && openMatch < closeMatch) {
      depth++;
      i = openMatch + 3;
    } else {
      depth--;
      i = closeMatch + 5;
      if (depth === 0) {
        endPos = i;
        break;
      }
    }
  }
  if (endPos === -1) return html;

  let result = html.slice(0, pos) + html.slice(endPos);

  // Endre kolonne 95 fra 50% → 100%
  const oldCol95 =
    '<td style="padding-top:0;padding-bottom:0" valign="top" class="mceColumn" id="mceColumnId-95" data-block-id="95" colspan="6" width="50%">';
  const newCol95 =
    '<td style="padding-top:0;padding-bottom:0" valign="top" class="mceColumn" id="mceColumnId-95" data-block-id="95" colspan="12" width="100%">';
  result = result.replace(oldCol95, newCol95);

  // Doble midt-bildet 282 → 564
  const b81Start = result.indexOf('id="b81"');
  if (b81Start !== -1) {
    const b81End = result.indexOf("</td>", b81Start);
    if (b81End !== -1) {
      const before = result.slice(0, b81Start);
      const inside = result.slice(b81Start, b81End);
      const after = result.slice(b81End);
      const updated = inside
        .replace(/width="282"/g, 'width="564"')
        .replace(/max-width:282px;width:282px/g, "max-width:564px;width:564px");
      result = before + updated + after;
    }
  }

  return result;
}

function addMarginAutoToAllImages(html: string): string {
  return html.replace(
    /style="display:block;max-width:/g,
    'style="display:block;margin:0 auto;max-width:'
  );
}

/**
 * Bytt brand-logo i b300 (Milwaukee-master har Milwaukee-logo + link til /milwaukee).
 * Når vi bygger et nyhetsbrev for et annet merke, må vi bytte både src og href.
 */
function replaceBrandLogoBlock(
  html: string,
  newLogoUrl: string,
  newLogoHref: string,
  brandPath: string
): string {
  // Bytt img-src i b300-blokken
  let result = html.replace(
    /(<td[^>]+id="b300"[^>]*>[\s\S]*?<img alt=")Milwaukee(" src=")[^"]+(")/,
    `$1${escapeHtml(brandPath.split("/").filter(Boolean).pop() ?? "brand")}$2${newLogoUrl}$3`
  );
  // Bytt href på samme a-tag (link til /milwaukee)
  result = result.replace(
    /(<a href=")https:\/\/fosen-tools\.no\/milwaukee\?utm_source=FTNett[^"]*(" target="_blank" style="display:block"><img alt=")/,
    `$1${newLogoHref}$2`
  );
  // Bytt MSO-fallback href hvis den finnes
  result = result.replace(
    /<a href="https:\/\/fosen-tools\.no\/milwaukee"><span class="mceImageBorder/g,
    `<a href="${newLogoHref}"><span class="mceImageBorder`
  );
  return result;
}

/**
 * Fjern overskytende produkt-blokker hvis bruker har færre enn 5 produkter.
 * Master-template har 3 produkter i rad 1 (b9/b12/b15) og 2 i rad 2 (b209/b212).
 * Hvis count <= 3: fjern hele rad 2 (mceKeepColumns-rad med b209+b212).
 * Hvis count == 4: fjern bare b212.
 */
function trimProductGrid(html: string, count: number): string {
  if (count >= 5) return html;

  // Hvis count < 5, fjern b212 (femte produkt-kolonne)
  if (count <= 4) {
    html = removeColumnByMarker(html, 'id="mceColumnId-212"');
  }
  // Hvis count < 4, fjern også b209 (fjerde produkt-kolonne, etterlater tom rad 2)
  if (count <= 3) {
    html = removeColumnByMarker(html, 'id="mceColumnId-209"');
  }
  // Hvis count < 3, fjern b15 (tredje produkt i rad 1)
  if (count <= 2) {
    html = removeColumnByMarker(html, 'id="mceColumnId-15"');
  }
  // Hvis count < 2, fjern b12 (andre produkt)
  if (count <= 1) {
    html = removeColumnByMarker(html, 'id="mceColumnId-12"');
  }
  return html;
}

/**
 * Fjern en hel <td> (kolonne) basert på en id-marker via stack-balansert match.
 */
function removeColumnByMarker(html: string, marker: string): string {
  const idx = html.indexOf(marker);
  if (idx === -1) return html;
  // Finn start av <td som inneholder marker
  const tdStart = html.lastIndexOf("<td", idx);
  if (tdStart === -1) return html;

  // Stack-balansert match av </td>
  let depth = 1;
  let i = idx;
  while (i < html.length) {
    const openMatch = html.indexOf("<td", i + 3);
    const closeMatch = html.indexOf("</td>", i);
    if (closeMatch === -1) break;
    if (openMatch !== -1 && openMatch < closeMatch) {
      depth++;
      i = openMatch + 3;
    } else {
      depth--;
      i = closeMatch + 5;
      if (depth === 0) return html.slice(0, tdStart) + html.slice(i);
    }
  }
  return html;
}

/**
 * Setter inn en sentered klikkbar brand-logo over produkt-raden.
 * Logoen linker til /{merke} med UTM. Plassering: rett før første produkt-kolonne.
 */
function injectBrandLogoAboveProducts(
  html: string,
  logoUrl: string,
  logoLink: string,
  themeSlug: string
): string {
  // Marker: første <tr> som inneholder mceColumnId-9 (produkt 1)
  const marker = 'id="mceColumnId-9"';
  const pos = html.indexOf(marker);
  if (pos === -1) return html;

  // Søk bakover til nærmeste <tr>
  const trStart = html.lastIndexOf("<tr", pos);
  if (trStart === -1) return html;

  const utm =
    logoLink && !logoLink.includes("utm_source=")
      ? `${logoLink}${logoLink.includes("?") ? "&" : "?"}utm_source=FTNett&utm_medium=email&utm_campaign=${encodeURIComponent(themeSlug)}&utm_content=brand-logo`
      : logoLink;

  const logoBlock = `<tr><td style="padding:8px 24px 16px;text-align:center;" valign="middle"><a href="${utm}" target="_blank" style="display:inline-block;"><img alt="Brand-logo" src="${logoUrl}" style="display:block;margin:0 auto;max-width:200px;height:auto;border:0;" width="200" /></a></td></tr>`;

  return html.slice(0, trStart) + logoBlock + html.slice(trStart);
}

/**
 * Tvinger samme høyde på produkt-tekst-blokker så «Gå til produkt»-CTA-er
 * står linet opp uavhengig av hvor langt produkt-navnet er.
 *
 * Strategi: inject en <style>-blokk i <head> som gir min-height på `.mceText`-
 * h4-blokker innenfor produkt-kolonner. Verdien (~108px) er ca. 3 linjer + pris
 * i Mailchimp-default-typografi.
 */
function alignProductHeights(html: string): string {
  const styleBlock = `<style type="text/css">
/* Produkt-tekst-justering så CTA-knapper er linet opp */
.mceColumn .mceTextBlockContainer h4:first-of-type { min-height: 108px; }
@media only screen and (max-width: 600px) {
  .mceColumn .mceTextBlockContainer h4:first-of-type { min-height: 0; }
}
</style>`;

  // Sett inn etter <head> hvis mulig, ellers etter eksisterende <style>-blokk
  if (html.includes("</head>")) {
    return html.replace("</head>", `${styleBlock}\n</head>`);
  }
  if (html.includes("<style ")) {
    return html.replace(/<\/style>/, `</style>\n${styleBlock}`);
  }
  return styleBlock + html;
}
