import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET  /api/mailchimp/newsletter/drafts        — list brukerens utkast
 * POST /api/mailchimp/newsletter/drafts        — upsert (lagre nytt eller oppdater)
 *
 * Lagrer wizard-state for /innleggsbygger/nyhetsbrev-bygger. Wizard
 * auto-lagrer hvert ~4 sek (debounced). Bruker kan også laste/slette
 * fra "Mine utkast"-listen.
 *
 * Body for POST:
 *   - id?            — uuid hvis vi oppdaterer eksisterende
 *   - title          — bruker-vennlig navn
 *   - wizard_state   — JSON-objekt med hele wizard-tilstanden
 *   - status?        — "draft" | "pushed" | "archived" (default "draft")
 *
 * Respons (POST): { id, updated_at }
 * Respons (GET):  { drafts: [{id, title, status, updated_at, created_at}] }
 */

export interface NewsletterDraftListItem {
  id: string;
  title: string;
  status: "draft" | "pushed" | "archived";
  updated_at: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Default filter: skjul arkiverte. Klient kan be om å se alle via ?all=1.
  const showAll = request.nextUrl.searchParams.get("all") === "1";

  let q = supabase
    .from("newsletter_wizard_drafts")
    .select("id, title, status, updated_at, created_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (!showAll) q = q.in("status", ["draft", "pushed"]);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ drafts: (data ?? []) as NewsletterDraftListItem[] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    id?: string;
    title?: string;
    wizard_state?: Record<string, unknown>;
    status?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = (body.title ?? "").trim() || "Utkast";
  const wizardState = body.wizard_state ?? {};
  const status =
    body.status && ["draft", "pushed", "archived"].includes(body.status)
      ? body.status
      : "draft";

  if (body.id) {
    // Oppdater eksisterende — RLS sikrer at brukeren kun kan endre sine egne
    const { data, error } = await supabase
      .from("newsletter_wizard_drafts")
      .update({ title, wizard_state: wizardState, status })
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select("id, updated_at")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // Opprett nytt
  const { data, error } = await supabase
    .from("newsletter_wizard_drafts")
    .insert({
      user_id: user.id,
      title,
      wizard_state: wizardState,
      status,
    })
    .select("id, updated_at")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
