import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { MailchimpBuilderService } from "@/lib/services/mailchimp-builder";
import sharp from "sharp";

/**
 * POST /api/mailchimp/newsletter/scrape-image
 *
 * Aksepterer:
 *  - Direkte bilde-URL (alle filendelser, alle CDN-er)
 *  - IG/FB/LinkedIn-post-URLer (parser og:image)
 *  - Andre URLer (Content-Type-detektering)
 */

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  let body: { url?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.url?.trim()) return NextResponse.json({ error: "url påkrevd" }, { status: 400 });
  const url = body.url.trim();
  if (!/^https?:\/\//i.test(url))
    return NextResponse.json({ error: "URL må starte med http:// eller https://" }, { status: 400 });

  let imageUrl = url;
  let buffer: Buffer | null = null;
  let detectedContentType: string | null = null;

  try {
    const firstRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)",
        Accept: "image/*,text/html;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!firstRes.ok)
      return NextResponse.json({ error: `Kunne ikke hente URL: ${firstRes.status}` }, { status: 502 });

    const contentType = firstRes.headers.get("content-type")?.toLowerCase() ?? "";

    if (contentType.startsWith("image/")) {
      buffer = Buffer.from(await firstRes.arrayBuffer());
      detectedContentType = contentType;
    } else if (contentType.includes("html")) {
      const html = await firstRes.text();
      const ogMatch =
        html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
        html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i) ||
        html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
      if (!ogMatch)
        return NextResponse.json(
          { error: "URL-en ga HTML uten og:image-meta. Bruk en direkte bilde-URL eller en post-lenke med OG-data." },
          { status: 502 }
        );
      imageUrl = ogMatch[1].replace(/&amp;/g, "&");
      const imgRes = await fetch(imageUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(20000),
      });
      if (!imgRes.ok)
        return NextResponse.json({ error: `og:image lastet ikke: ${imgRes.status}` }, { status: 502 });
      buffer = Buffer.from(await imgRes.arrayBuffer());
      detectedContentType = imgRes.headers.get("content-type")?.toLowerCase() ?? null;
    } else {
      buffer = Buffer.from(await firstRes.arrayBuffer());
      detectedContentType = contentType || null;
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Fetch feilet: ${err instanceof Error ? err.message : "ukjent"}` },
      { status: 502 }
    );
  }

  if (!buffer || buffer.length === 0)
    return NextResponse.json({ error: "Bildet er tomt" }, { status: 502 });

  // Mailchimp file-manager aksepterer KUN jpg/png/gif — ikke webp/avif.
  // Multicase Azure Blob serverer ofte webp selv om URL-en ender på .jpg
  // (de optimaliserer formatet, ikke navnet). Konverterer til JPG via
  // sharp så vi kan laste opp uansett kilde-format.
  const ct = (detectedContentType || "").toLowerCase();
  const needsConvert =
    ct.includes("webp") || ct.includes("avif") ||
    (!ct.includes("jpeg") && !ct.includes("jpg") &&
     !ct.includes("png") && !ct.includes("gif"));
  if (needsConvert) {
    try {
      buffer = await sharp(buffer).jpeg({ quality: 88 }).toBuffer();
      detectedContentType = "image/jpeg";
    } catch (err) {
      return NextResponse.json(
        { error: `Bilde-konvertering feilet: ${err instanceof Error ? err.message : "ukjent"}` },
        { status: 502 },
      );
    }
  }

  try {
    const builder = new MailchimpBuilderService();
    const fileName = body.name?.trim() || sanitizeFileName(imageUrl, detectedContentType);
    const mcUrl = await builder.uploadImage(buffer, fileName);
    return NextResponse.json({
      mailchimp_url: mcUrl,
      original_url: imageUrl,
      size_bytes: buffer.length,
      converted: needsConvert,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Mailchimp-opplasting feilet: ${err instanceof Error ? err.message : "ukjent"}` },
      { status: 500 }
    );
  }
}

function extensionFromContentType(ct: string | null): string {
  if (!ct) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("avif")) return "avif";
  if (ct.includes("svg")) return "svg";
  return "jpg";
}

function sanitizeFileName(url: string, contentType: string | null): string {
  const ext = extensionFromContentType(contentType);
  try {
    const u = new URL(url);
    let seg = u.pathname.split("/").pop() || `image.${ext}`;
    seg = seg.replace(/[^a-zA-Z0-9._-]/g, "_");
    if (!/\.(jpg|jpeg|png|webp|gif|avif|svg|bmp)$/i.test(seg)) {
      seg = `${seg || "image"}.${ext}`;
    }
    return seg.slice(0, 80);
  } catch {
    return `image-${Date.now()}.${ext}`;
  }
}
