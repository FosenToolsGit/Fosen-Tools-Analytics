import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";

/**
 * Laster ned et bilde fra en URL og konverterer det til ønsket format
 * (JPG / PNG). WebP/AVIF blir alltid konvertert. JPG ut har quality 88.
 *
 * GET /api/produkt-import/enkelprodukt/download-image?url=<URL>&format=jpg
 *
 * Returnerer fil med Content-Disposition: attachment så browseren laster den ned.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = request.nextUrl.searchParams.get("url");
  const format = (request.nextUrl.searchParams.get("format") || "jpg").toLowerCase();
  const maxWidth = parseInt(request.nextUrl.searchParams.get("max_width") || "2000", 10);
  const filenameHint = request.nextUrl.searchParams.get("filename") || "";

  if (!url) return NextResponse.json({ error: "url er påkrevd" }, { status: 400 });
  if (!/^https?:\/\//i.test(url))
    return NextResponse.json({ error: "URL må være http(s)" }, { status: 400 });
  if (!["jpg", "jpeg", "png", "webp"].includes(format))
    return NextResponse.json({ error: "format må være jpg/png/webp" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "image/*",
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok)
      return NextResponse.json({ error: `Bilde-nedlasting feilet (HTTP ${res.status})` }, { status: 502 });

    const buf = Buffer.from(await res.arrayBuffer());

    if (buf.length === 0)
      return NextResponse.json({ error: "Bildet er tomt" }, { status: 502 });

    // Konverter via sharp
    let pipeline = sharp(buf, { failOn: "none" });

    // Maks-bredde for å holde fil-størrelse rimelig
    const meta = await pipeline.metadata();
    if (meta.width && meta.width > maxWidth) {
      pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
    }

    let outBuf: Buffer;
    let mimeType: string;
    let ext: string;
    if (format === "png") {
      outBuf = await pipeline.png({ compressionLevel: 8 }).toBuffer();
      mimeType = "image/png";
      ext = "png";
    } else if (format === "webp") {
      outBuf = await pipeline.webp({ quality: 88 }).toBuffer();
      mimeType = "image/webp";
      ext = "webp";
    } else {
      // Default jpg
      outBuf = await pipeline
        .flatten({ background: { r: 255, g: 255, b: 255 } }) // hvit bakgrunn for transparente PNG/WebP
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer();
      mimeType = "image/jpeg";
      ext = "jpg";
    }

    // Bygg filnavn
    let filename = filenameHint;
    if (!filename) {
      try {
        const u = new URL(url);
        const last = u.pathname.split("/").pop() || "image";
        filename = last.replace(/\.\w+$/, "");
      } catch {
        filename = "image";
      }
    }
    // Sanitize
    filename = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
    if (!filename) filename = "image";

    return new NextResponse(new Uint8Array(outBuf), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}.${ext}"`,
        "Content-Length": String(outBuf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bilde-konvertering feilet" },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;
