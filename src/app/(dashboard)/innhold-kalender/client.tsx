"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { NewsletterPreviewThumb } from "@/components/newsletter/NewsletterPreviewThumb";
import type {
  PlannedPost,
  PlannedNewsletter,
  PublishedPost,
  PublishedNewsletter,
} from "./page";

type Tab = "planlagte" | "publiserte";

interface Props {
  planned_posts: PlannedPost[];
  planned_newsletters: PlannedNewsletter[];
  published_posts: PublishedPost[];
  published_newsletters: PublishedNewsletter[];
}

const PLATFORM_ICON: Record<string, string> = {
  facebook: "📘",
  instagram: "📸",
  linkedin: "💼",
  meta: "📘",
  mailchimp: "📧",
};

const POST_TYPE_LABEL: Record<string, string> = {
  facebook_post: "Facebook-post",
  facebook_video: "Facebook-video",
  facebook_reel: "Facebook-reel",
  instagram_image: "Instagram-bilde",
  instagram_video: "Instagram-video",
  instagram_carousel: "Instagram-karusell",
  instagram_reel: "Instagram-reel",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("nb-NO", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatRelativeOrDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (Math.abs(diffDays) < 7) {
    if (diffDays === 0) return "I dag";
    if (diffDays === 1) return "I morgen";
    if (diffDays === -1) return "I går";
    if (diffDays > 0) return `Om ${diffDays} dager`;
    return `${Math.abs(diffDays)} dager siden`;
  }
  return d.toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  });
}

export default function InnholdKalenderClient({
  planned_posts,
  planned_newsletters,
  published_posts,
  published_newsletters,
}: Props) {
  const [tab, setTab] = useState<Tab>("planlagte");

  // Gruppér publiserte innlegg etter dato for ryddigere visning
  const publishedByDate = useMemo(() => {
    const map = new Map<string, PublishedPost[]>();
    for (const p of published_posts) {
      const day = p.published_at.slice(0, 10);
      const arr = map.get(day) ?? [];
      arr.push(p);
      map.set(day, arr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [published_posts]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-slate-400">
            Innhold-kalender
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Team-oversikt: planlagt + publisert
          </h1>
          <p className="mt-2 max-w-3xl text-slate-300">
            Alle planlagte innlegg og nyhetsbrev fremover, og en bank over det
            som har blitt publisert siste 60–90 dager. Bruk den for å holde
            oversikt på tvers av Brit, Erik og Adrian.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 inline-flex rounded-lg border border-slate-800 bg-slate-900/50 p-1">
          <TabButton
            active={tab === "planlagte"}
            onClick={() => setTab("planlagte")}
            count={planned_posts.length + planned_newsletters.length}
          >
            📅 Planlagte
          </TabButton>
          <TabButton
            active={tab === "publiserte"}
            onClick={() => setTab("publiserte")}
            count={published_posts.length + published_newsletters.length}
          >
            ✅ Publiserte
          </TabButton>
        </div>

        {/* Innhold */}
        {tab === "planlagte" ? (
          <PlanlagteSection
            posts={planned_posts}
            newsletters={planned_newsletters}
          />
        ) : (
          <PubliserteSection
            postsByDate={publishedByDate}
            newsletters={published_newsletters}
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Tab-button
// =============================================================================

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-slate-700 text-white shadow"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
      {typeof count === "number" && (
        <span
          className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
            active ? "bg-slate-900/60 text-slate-300" : "bg-slate-800 text-slate-400"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// =============================================================================
// Planlagte-seksjon
// =============================================================================

function PlanlagteSection({
  posts,
  newsletters,
}: {
  posts: PlannedPost[];
  newsletters: PlannedNewsletter[];
}) {
  return (
    <div className="space-y-8">
      {/* Innlegg som skal ut */}
      <Section
        title="📅 Innlegg som skal ut"
        subtitle={`${posts.length} planlagte innlegg på Facebook + Instagram + LinkedIn (fra jubileum-kampanjen)`}
        empty={posts.length === 0 ? "Ingen planlagte innlegg for øyeblikket." : null}
        action={
          posts.length > 0 ? (
            <a
              href="/innleggsbygger/jubileum"
              className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-700"
            >
              Åpne kalender →
            </a>
          ) : null
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {posts.map((p) => (
            <PlannedPostCard key={p.id} post={p} />
          ))}
        </div>
      </Section>

      {/* Nyhetsbrev som skal ut */}
      <Section
        title="📧 Nyhetsbrev som skal ut"
        subtitle={`${newsletters.length} utkast i nyhetsbrev-byggeren`}
        empty={newsletters.length === 0 ? "Ingen utkast — alle nyhetsbrev er sendt." : null}
        action={
          <a
            href="/innleggsbygger/nyhetsbrev-bygger"
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-700"
          >
            Lag nytt →
          </a>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {newsletters.map((n) => (
            <NewsletterDraftCard key={n.id} newsletter={n} />
          ))}
        </div>
      </Section>
    </div>
  );
}

// =============================================================================
// Publiserte-seksjon
// =============================================================================

function PubliserteSection({
  postsByDate,
  newsletters,
}: {
  postsByDate: [string, PublishedPost[]][];
  newsletters: PublishedNewsletter[];
}) {
  return (
    <div className="space-y-8">
      {/* Publiserte innlegg */}
      <Section
        title="📱 Publiserte innlegg"
        subtitle={`Facebook + Instagram, siste 60 dager (${postsByDate.reduce(
          (n, [, p]) => n + p.length,
          0,
        )} innlegg)`}
        empty={postsByDate.length === 0 ? "Ingen publiserte innlegg siste 60 dager." : null}
      >
        <div className="space-y-6">
          {postsByDate.map(([date, posts]) => (
            <div key={date}>
              <div className="mb-2 flex items-baseline gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  {formatDate(date)}
                </h3>
                <span className="text-xs text-slate-500">{posts.length} innlegg</span>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {posts.map((p) => (
                  <PublishedPostCard key={p.id} post={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Publiserte nyhetsbrev */}
      <Section
        title="📧 Publiserte nyhetsbrev"
        subtitle={`Mailchimp, siste 90 dager (${newsletters.length} kampanjer)`}
        empty={newsletters.length === 0 ? "Ingen publiserte nyhetsbrev siste 90 dager." : null}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {newsletters.map((n) => (
            <PublishedNewsletterCard key={n.id} newsletter={n} />
          ))}
        </div>
      </Section>
    </div>
  );
}

// =============================================================================
// Section wrapper
// =============================================================================

function Section({
  title,
  subtitle,
  children,
  empty,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  empty?: string | null;
  action?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">{title}</h2>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      {empty ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
          {empty}
        </div>
      ) : (
        children
      )}
    </section>
  );
}

// =============================================================================
// Cards
// =============================================================================

function PlannedPostCard({ post }: { post: PlannedPost }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 transition hover:border-slate-700">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {post.badge && (
            <span className="rounded-md bg-red-700 px-2 py-0.5 text-xs font-bold text-white">
              {post.badge}
            </span>
          )}
          <span className="text-xs font-semibold text-slate-300">
            {formatRelativeOrDate(post.scheduled_date)}
          </span>
          {post.scheduled_time && (
            <span className="text-xs text-slate-500">· {post.scheduled_time}</span>
          )}
        </div>
        <div className="flex gap-1 text-xs">
          {post.platforms.map((p) => (
            <span key={p} title={p}>
              {PLATFORM_ICON[p] ?? "·"}
            </span>
          ))}
        </div>
      </div>
      <div className="mb-2 font-semibold text-slate-100">{post.theme}</div>
      {post.internal_note && (
        <div className="mb-2 text-xs text-slate-500">{post.internal_note}</div>
      )}
      <div className="line-clamp-3 text-xs text-slate-400">
        {post.caption_preview}…
      </div>
      {post.edit_url && (
        <a
          href={post.edit_url}
          className="mt-3 inline-block text-xs font-semibold text-red-400 hover:text-red-300"
        >
          Åpne i bygger →
        </a>
      )}
    </div>
  );
}

function NewsletterDraftCard({ newsletter }: { newsletter: PlannedNewsletter }) {
  const owner = newsletter.owner_email
    ? newsletter.owner_email.split("@")[0]
    : null;
  const ownerName = owner
    ? owner.charAt(0).toUpperCase() + owner.slice(1)
    : null;
  const scheduledLabel = newsletter.scheduled_date
    ? new Date(newsletter.scheduled_date).toLocaleDateString("nb-NO", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 transition hover:border-slate-700">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-amber-900/40 px-2 py-0.5 text-xs font-bold text-amber-300">
          📧 NYHETSBREV
        </span>
        {scheduledLabel && (
          <span className="rounded-md bg-blue-900/40 px-2 py-0.5 text-xs font-bold text-blue-300">
            🕒 {scheduledLabel}
          </span>
        )}
        <span className="text-xs text-slate-500">
          Sist endret {formatRelativeOrDate(newsletter.updated_at)}
        </span>
      </div>

      <div className="flex gap-3">
        {/* Preview-thumbnail */}
        <a
          href={newsletter.edit_url}
          className="flex-shrink-0 block hover:opacity-90 transition"
          title="Åpne i byggeren"
        >
          <NewsletterPreviewThumb draftId={newsletter.id} width={140} maxHeight={180} />
        </a>

        {/* Info */}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="font-semibold text-slate-100 line-clamp-2">
            {newsletter.title}
          </div>
          {newsletter.subject_line && (
            <div className="text-xs text-amber-300 line-clamp-2 mt-0.5">
              📨 {newsletter.subject_line}
            </div>
          )}
          {ownerName && (
            <div className="text-[11px] text-slate-500">👤 {ownerName}</div>
          )}
          <a
            href={newsletter.edit_url}
            className="mt-2 inline-block text-xs font-semibold text-red-400 hover:text-red-300"
          >
            Åpne i bygger →
          </a>
        </div>
      </div>
    </div>
  );
}

function PublishedPostCard({ post }: { post: PublishedPost }) {
  const totalEngagement =
    (post.likes ?? 0) + (post.comments ?? 0) + (post.shares ?? 0);
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 transition hover:border-slate-700">
      <div className="flex gap-3">
        {post.thumbnail_url ? (
          <img
            src={post.thumbnail_url}
            alt=""
            className="h-20 w-20 flex-shrink-0 rounded object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded bg-slate-800 text-2xl">
            {PLATFORM_ICON[post.platform] ?? "📱"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-xs text-slate-400">
            <span>{POST_TYPE_LABEL[post.post_type] ?? post.post_type}</span>
            <span>·</span>
            <span>
              {new Date(post.published_at).toLocaleTimeString("nb-NO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="line-clamp-2 text-sm text-slate-200">
            {post.snippet || <em className="text-slate-500">(ingen tekst)</em>}
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
            {(post.likes ?? 0) > 0 && <span>❤️ {post.likes}</span>}
            {(post.comments ?? 0) > 0 && <span>💬 {post.comments}</span>}
            {(post.shares ?? 0) > 0 && <span>↗️ {post.shares}</span>}
            {totalEngagement === 0 && (
              <span className="text-slate-600">Ingen engasjement enda</span>
            )}
            {post.post_url && (
              <a
                href={post.post_url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-red-400 hover:text-red-300"
              >
                Åpne ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PublishedNewsletterCard({
  newsletter,
}: {
  newsletter: PublishedNewsletter;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 transition hover:border-slate-700">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-green-900/40 px-2 py-0.5 text-xs font-bold text-green-300">
          SENDT
        </span>
        <span className="text-xs text-slate-400">
          {formatDate(newsletter.published_at)}
        </span>
        {newsletter.open_rate != null && (
          <span className="ml-auto text-xs text-slate-300">
            {Math.round(newsletter.open_rate * 100)}% åpningsrate
          </span>
        )}
      </div>
      <div className="mb-1 font-semibold text-slate-100">{newsletter.title}</div>
      {newsletter.snippet && (
        <div className="line-clamp-2 text-xs text-slate-400">{newsletter.snippet}</div>
      )}
      {newsletter.post_url && (
        <a
          href={newsletter.post_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs font-semibold text-red-400 hover:text-red-300"
        >
          Se kampanje-rapport ↗
        </a>
      )}
    </div>
  );
}
