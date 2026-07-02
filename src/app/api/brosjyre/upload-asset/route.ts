import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";

const BUCKET = "brochure_assets";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function sanitizeFilename(name: string): string {
  // Behold extension, fjern path-tegn og rare karakterer
  const base = name.split(/[\\/]/).pop() || "asset";
  return base.replace(/[^a-zA-Z0-9._\-]/g, "_").slice(0, 80);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: `Filtype ikke støttet: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Filen er for stor (${Math.round(file.size / 1024 / 1024)} MB, maks 10 MB)` },
      { status: 413 }
    );
  }

  const id = crypto.randomUUID();
  const safeName = sanitizeFilename(file.name);
  const storagePath = `${user.id}/${id}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publicUrl = `${supaUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`;

  return NextResponse.json({
    id,
    name: file.name,
    storage_path: storagePath,
    public_url: publicUrl,
    size: file.size,
  });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const path = request.nextUrl.searchParams.get("path");
  if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 });

  // Verifisér at pathen ligger under brukerens egen mappe
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error } = await admin.storage.from(BUCKET).remove([path]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
