import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

/**
 * POST /api/social/upload   — FormData multipart-upload for bruker-foto
 * DELETE /api/social/upload?path=...
 *
 * Lagrer i Storage-bucket `social_assets` med path `{user_id}/{uuid}-{filename}`.
 */

const BUCKET = "social_assets";
const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Mangler 'file'" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Kun image/* godtas" },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Filen er for stor (>10 MB): ${file.size}` },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uuid = crypto.randomUUID();
  const path = `${user.id}/${uuid}-${safe}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buf, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (upErr)
    return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    storage_path: path,
    public_url: pub.publicUrl,
    name: file.name,
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const path = request.nextUrl.searchParams.get("path");
  if (!path)
    return NextResponse.json({ error: "path påkrevd" }, { status: 400 });
  if (!path.startsWith(`${user.id}/`))
    return NextResponse.json(
      { error: "Kan ikke slette andres filer" },
      { status: 403 }
    );

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
