import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxier eksterne bilder med CORS-headers slik at brosjyre-editoren kan lese
 * dem på canvas (html2canvas under PDF-eksport). Whitelist-domener for å unngå
 * å bli en åpen image-proxy.
 */

const ALLOWED_HOSTS = [
  "mc10256fosentools.blob.core.windows.net",
  "fosen-tools.no",
  "www.fosen-tools.no",
];

// Supabase Storage-host (utledet fra NEXT_PUBLIC_SUPABASE_URL ved boot).
const SUPABASE_HOST = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname; } catch { return null; }
})();

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const allowed = ALLOWED_HOSTS.includes(parsed.hostname)
    || (SUPABASE_HOST !== null && parsed.hostname === SUPABASE_HOST);
  if (!allowed) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        // Noen blob-tjenester sjekker User-Agent
        "User-Agent": "Mozilla/5.0 Fosen-Tools-Brosjyre/1.0",
      },
      // Cache i 1 time
      next: { revalidate: 3600 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const buf = await upstream.arrayBuffer();

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buf.byteLength),
        "Cache-Control": "public, max-age=3600, immutable",
        // CORS — la editoren lese bildet på canvas
        "Access-Control-Allow-Origin": "*",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fetch failed" },
      { status: 500 }
    );
  }
}
