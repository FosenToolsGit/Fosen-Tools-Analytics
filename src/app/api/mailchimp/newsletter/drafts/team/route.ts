import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/mailchimp/newsletter/drafts/team — team-bred oversikt over alle
 * nyhetsbrev-utkast. Bruker service role for å hoppe over per-bruker RLS,
 * siden FT-teamet vil se hva alle har laget. Krever fortsatt innlogging.
 *
 * Returnerer metadata + utvalgte felter fra wizard_state slik at oversikten
 * kan vise emnelinje, mal-variant, leverandører/produkter uten å laste hele
 * jsonb-payloaden i klienten.
 *
 * Respons:
 *   { drafts: [{ id, title, status, updated_at, created_at, owner_email,
 *               subject_line, heading_main, template_variant, supplier_count,
 *               product_count, theme_input }] }
 */

export interface NewsletterDraftTeamItem {
  id: string;
  title: string;
  status: "draft" | "pushed" | "archived";
  updated_at: string;
  created_at: string;
  owner_email: string | null;
  owner_user_id: string;
  subject_line: string | null;
  heading_main: string | null;
  template_variant: "standard" | "jubileum" | "jubileum-leverandor" | null;
  supplier_count: number;
  product_count: number;
  theme_input: string | null;
  scheduled_send_date: string | null;
}

interface DraftRow {
  id: string;
  user_id: string;
  title: string;
  status: "draft" | "pushed" | "archived";
  updated_at: string;
  created_at: string;
  wizard_state: Record<string, unknown> | null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const showAll = request.nextUrl.searchParams.get("all") === "1";
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminUrl || !adminKey) {
    return NextResponse.json({ error: "Server misconfig" }, { status: 500 });
  }
  const admin = createSupabaseAdmin(adminUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let q = admin
    .from("newsletter_wizard_drafts")
    .select("id, user_id, title, status, updated_at, created_at, wizard_state")
    .order("updated_at", { ascending: false });

  if (!showAll) q = q.in("status", ["draft", "pushed"]);

  const { data: drafts, error } = await q.returns<DraftRow[]>();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mapper user_id → e-post for å vise eier i UI.
  const userIds = Array.from(new Set((drafts ?? []).map((d) => d.user_id)));
  const emails: Record<string, string | null> = {};
  for (const uid of userIds) {
    try {
      const { data } = await admin.auth.admin.getUserById(uid);
      emails[uid] = data?.user?.email ?? null;
    } catch {
      emails[uid] = null;
    }
  }

  const items: NewsletterDraftTeamItem[] = (drafts ?? []).map((d) => {
    const ws = (d.wizard_state ?? {}) as Record<string, unknown>;
    const content = (ws.editContent ?? {}) as Record<string, unknown>;
    const suppliers = Array.isArray(ws.editSuppliers) ? ws.editSuppliers : [];
    const products = Array.isArray(ws.editProducts) ? ws.editProducts : [];
    return {
      id: d.id,
      title: d.title,
      status: d.status,
      updated_at: d.updated_at,
      created_at: d.created_at,
      owner_email: emails[d.user_id] ?? null,
      owner_user_id: d.user_id,
      subject_line: typeof content.subjectLine === "string" ? content.subjectLine : null,
      heading_main: typeof content.headingMain === "string" ? content.headingMain : null,
      template_variant:
        ws.templateVariant === "jubileum" ||
        ws.templateVariant === "jubileum-leverandor" ||
        ws.templateVariant === "standard"
          ? ws.templateVariant
          : null,
      supplier_count: suppliers.length,
      product_count: products.length,
      theme_input: typeof ws.themeInput === "string" ? ws.themeInput : null,
      scheduled_send_date:
        typeof ws.scheduledSendDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ws.scheduledSendDate)
          ? ws.scheduledSendDate
          : null,
    };
  });

  return NextResponse.json({
    drafts: items,
    current_user_id: user.id,
    current_user_email: user.email ?? null,
  });
}
