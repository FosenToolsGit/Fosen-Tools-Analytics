/**
 * Innhold-kalender — team-oversikt over planlagte og publiserte
 * innlegg + nyhetsbrev.
 *
 * Server component som henter:
 *   - Planlagte innlegg fra `jubileum-kampanje.ts` (14-dagers data)
 *   - Planlagte nyhetsbrev fra `newsletter_wizard_drafts` (status=draft)
 *   - Publiserte innlegg fra `platform_posts` (meta, siste 60d)
 *   - Publiserte nyhetsbrev fra `platform_posts` (mailchimp, siste 90d)
 *
 * Tabs (klient-komponent) lar bruker bytte mellom planlagte og publiserte.
 */

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import {
  JUBILEUM_KAMPANJE,
  type JubileumPost,
} from "@/lib/services/jubileum-kampanje";
import InnholdKalenderClient from "./client";

export const dynamic = "force-dynamic";

interface PlannedPost {
  id: string;
  source: "jubileum" | "manual";
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time?: string; // HH:MM
  theme: string;
  badge?: string;
  internal_note?: string;
  platforms: string[];
  caption_preview: string;
  edit_url?: string;
}

interface PlannedNewsletter {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  edit_url: string;
  /** Auto-utledet «planlagt dato» basert på tittel/themeSlug — brukes til
   *  å plassere utkast på kalenderen. Tomstring hvis ikke utledet. */
  scheduled_date?: string;
  owner_email?: string | null;
  subject_line?: string | null;
  template_variant?: string | null;
}

interface PublishedPost {
  id: string;
  platform: string;
  post_type: string;
  title: string | null;
  snippet: string;
  thumbnail_url: string | null;
  post_url: string | null;
  published_at: string;
  likes: number | null;
  comments: number | null;
  shares: number | null;
}

interface PublishedNewsletter {
  id: string;
  title: string;
  snippet: string;
  post_url: string | null;
  published_at: string;
  open_rate?: number | null;
}

export default async function InnholdKalenderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // === Planlagte innlegg (jubileum-kampanjen — 15 dager) ===========
  const today = new Date().toISOString().slice(0, 10);
  const planned_posts: PlannedPost[] = JUBILEUM_KAMPANJE
    .filter((p) => p.date >= today) // bare framtidige
    .map((p: JubileumPost): PlannedPost => ({
      id: p.id,
      source: "jubileum",
      scheduled_date: p.date,
      scheduled_time: p.recommended_time,
      theme: p.theme,
      badge: p.countdown_label,
      internal_note: p.internal_note,
      platforms: ["facebook", "instagram", "linkedin"],
      caption_preview: p.facebook.caption.slice(0, 140),
      edit_url: "/innleggsbygger/jubileum",
    }))
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  // === Planlagte nyhetsbrev (team-bred via service role) ===========
  // Bruker admin-klient siden newsletter_wizard_drafts har owner-only RLS,
  // men kalenderen skal vise hele teamets utkast.
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admin = adminUrl && adminKey
    ? createSupabaseAdmin(adminUrl, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

  const { data: nlDrafts } = admin
    ? await admin
        .from("newsletter_wizard_drafts")
        .select("id, user_id, title, status, updated_at, wizard_state")
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
    : await supabase
        .from("newsletter_wizard_drafts")
        .select("id, user_id, title, status, updated_at, wizard_state")
        .eq("status", "draft")
        .order("updated_at", { ascending: false });

  // Hent e-poster for eiere
  const ownerIds = Array.from(new Set((nlDrafts ?? []).map((d) => d.user_id)));
  const ownerEmails: Record<string, string | null> = {};
  if (admin) {
    for (const uid of ownerIds) {
      try {
        const { data } = await admin.auth.admin.getUserById(uid);
        ownerEmails[uid] = data?.user?.email ?? null;
      } catch {
        ownerEmails[uid] = null;
      }
    }
  }

  /** Utled planlagt dato fra utkast-tittel/themeSlug.
   *  Mønster: «2026-06-02», «2026-06-09», osv. eller «JUBILEUM 1/4» → mappes
   *  til faste datoer mot jubileet. Returnerer YYYY-MM-DD eller null. */
  function deriveScheduledDate(
    title: string,
    themeSlug: string | undefined
  ): string | null {
    // Direkte dato i themeSlug eller tittel (YYYY-MM-DD)
    const dateMatch = `${themeSlug ?? ""} ${title}`.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) return dateMatch[1];

    // Tirsdag-utgaver basert på «UTGAVE 1/2/3/4» eller «JUBILEUM 1/2/3/4»
    const utgaveMatch = title.match(/(?:UTGAVE|JUBILEUM)\s+(\d)\/4/i);
    if (utgaveMatch) {
      const n = parseInt(utgaveMatch[1], 10);
      const tuesdays = ["2026-06-02", "2026-06-09", "2026-06-16", "2026-06-23"];
      if (n >= 1 && n <= 4) return tuesdays[n - 1];
    }
    return null;
  }

  const planned_newsletters: PlannedNewsletter[] = (nlDrafts ?? []).map((r) => {
    const ws = (r.wizard_state ?? {}) as Record<string, unknown>;
    const content = (ws.editContent ?? {}) as Record<string, unknown>;
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      updated_at: r.updated_at,
      edit_url: `/innleggsbygger/nyhetsbrev-bygger?draft=${r.id}`,
      scheduled_date: deriveScheduledDate(
        r.title,
        typeof content.themeSlug === "string" ? content.themeSlug : undefined
      ) ?? undefined,
      owner_email: ownerEmails[r.user_id] ?? null,
      subject_line:
        typeof content.subjectLine === "string" ? content.subjectLine : null,
      template_variant:
        typeof ws.templateVariant === "string" ? ws.templateVariant : null,
    };
  });

  // === Publiserte innlegg (Meta — siste 60d) =======================
  const since60 = new Date();
  since60.setDate(since60.getDate() - 60);
  const { data: metaPosts } = await supabase
    .from("platform_posts")
    .select(
      "id, platform, post_type, title, content_snippet, thumbnail_url, post_url, published_at, likes, comments, shares",
    )
    .eq("platform", "meta")
    .gte("published_at", since60.toISOString())
    .order("published_at", { ascending: false })
    .limit(60);

  const published_posts: PublishedPost[] = (metaPosts ?? []).map((r) => ({
    id: r.id,
    platform: r.platform,
    post_type: r.post_type ?? "facebook_post",
    title: r.title,
    snippet: r.content_snippet ?? "",
    thumbnail_url: r.thumbnail_url,
    post_url: r.post_url,
    published_at: r.published_at,
    likes: r.likes,
    comments: r.comments,
    shares: r.shares,
  }));

  // === Publiserte nyhetsbrev (Mailchimp — siste 90d) ===============
  const since90 = new Date();
  since90.setDate(since90.getDate() - 90);
  const { data: mailchimpPosts } = await supabase
    .from("platform_posts")
    .select(
      "id, title, content_snippet, post_url, published_at, raw_data",
    )
    .eq("platform", "mailchimp")
    .gte("published_at", since90.toISOString())
    .order("published_at", { ascending: false })
    .limit(40);

  const published_newsletters: PublishedNewsletter[] = (mailchimpPosts ?? []).map(
    (r) => {
      const raw = (r.raw_data ?? {}) as Record<string, unknown>;
      const reportSummary = raw.report_summary as Record<string, unknown> | undefined;
      const openRate = reportSummary?.open_rate as number | undefined;
      return {
        id: r.id,
        title: r.title ?? "Nyhetsbrev",
        snippet: r.content_snippet ?? "",
        post_url: r.post_url,
        published_at: r.published_at,
        open_rate: openRate ?? null,
      };
    },
  );

  return (
    <InnholdKalenderClient
      planned_posts={planned_posts}
      planned_newsletters={planned_newsletters}
      published_posts={published_posts}
      published_newsletters={published_newsletters}
    />
  );
}

export type {
  PlannedPost,
  PlannedNewsletter,
  PublishedPost,
  PublishedNewsletter,
};
