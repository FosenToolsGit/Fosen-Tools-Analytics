import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { parseHultaforsBasket } from "@/lib/services/hultafors-basket";

/**
 * Parser en Hultafors/Snickers basket-XLSX (eksportert fra B2B-portalen).
 * Filen har 2 kolonner: StockCode + Quantity. Hver StockCode er en 11-sifret
 * variant-kode (modell + farge + størrelse) som vi dekoder.
 *
 * Returns { variants: HultaforsVariant[] }.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid FormData" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Mangler fil (XLSX)" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "XLSX for stor (maks 5 MB)" }, { status: 413 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const variants = parseHultaforsBasket(buf);
    return NextResponse.json({
      filename: file.name,
      variants,
      count: variants.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Basket-parsing feilet" },
      { status: 422 },
    );
  }
}

export const runtime = "nodejs";
