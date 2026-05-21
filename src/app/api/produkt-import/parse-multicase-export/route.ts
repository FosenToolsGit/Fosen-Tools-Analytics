import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import * as XLSX from "xlsx";

/**
 * Parser en Multicase produkteksport-XLSX (samme format som import-malen,
 * 54 kolonner) og returnerer rader som JSON for bulk-redigering i UI.
 */

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Mangler fil" }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer", raw: true });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return NextResponse.json({ error: "Ingen ark i XLSX" }, { status: 400 });

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: true,
    });

    return NextResponse.json({ count: rows.length, rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Parsing feilet" },
      { status: 500 }
    );
  }
}
