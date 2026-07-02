// Overvåking av eksterne sosiale kontoer via Instagram Graph API
// «Business Discovery» + push-varsling (ntfy.sh). Kjøres av /api/social-watch
// (trigges av GitHub Actions hvert ~30. min siden Vercel Hobby-cron ikke kan
// polle ofte). Wera cross-poster nesten alltid samme innhold på IG og FB, så
// IG-varselet fanger i praksis begge.

import type { SupabaseClient } from "@supabase/supabase-js";

const GRAPH = "https://graph.facebook.com/v22.0";

interface DiscoveredMedia {
  id: string;
  caption?: string;
  timestamp: string; // ISO
  permalink: string;
  media_type?: string;
}

interface WatchRow {
  id: string;
  platform: string;
  username: string;
  label: string | null;
  last_post_id: string | null;
  last_timestamp: string | null;
}

function token(): string {
  const t = process.env.META_ACCESS_TOKEN;
  if (!t) throw new Error("META_ACCESS_TOKEN mangler");
  return t;
}

// FT sin egen IG-bruker-ID — kreves som «avsender» i Business Discovery.
// Hentes fra env, ellers oppdages via FB-siden.
let cachedIgId: string | null = process.env.META_INSTAGRAM_ACCOUNT_ID || null;
async function getOwnIgId(): Promise<string> {
  if (cachedIgId) return cachedIgId;
  const page = process.env.META_PAGE_ID;
  const r = await fetch(
    `${GRAPH}/${page}?fields=instagram_business_account,connected_instagram_account&access_token=${token()}`
  );
  const j = await r.json();
  const id =
    j?.instagram_business_account?.id || j?.connected_instagram_account?.id;
  if (!id) throw new Error("Fant ikke FT sin IG-konto (sjekk kobling/token)");
  cachedIgId = id;
  return id;
}

// Henter siste N innlegg for en offentlig IG Business/Creator-konto.
export async function discoverLatestMedia(
  username: string,
  limit = 5
): Promise<DiscoveredMedia[]> {
  const igId = await getOwnIgId();
  const fields = `business_discovery.username(${username}){media.limit(${limit}){id,caption,timestamp,permalink,media_type}}`;
  const r = await fetch(
    `${GRAPH}/${igId}?fields=${encodeURIComponent(fields)}&access_token=${token()}`
  );
  const j = await r.json();
  if (!r.ok || !j.business_discovery) {
    throw new Error(
      `Business Discovery feilet for @${username}: ${JSON.stringify(j.error || j)}`
    );
  }
  return (j.business_discovery.media?.data || []) as DiscoveredMedia[];
}

// ── ntfy push ────────────────────────────────────────────────────────────
// HTTP-headere må være ASCII (latin-1), så Title/Tags holdes ASCII-trygge.
// Selve meldingen (body) er UTF-8 og tåler emoji/æøå.
function asciiSafe(s: string): string {
  return s.replace(/[^\x20-\x7E]/g, "").trim();
}

export async function pushNtfy(opts: {
  title: string;
  message: string;
  click?: string;
  tags?: string;
  priority?: string;
}): Promise<boolean> {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) {
    console.error("[social-watch] NTFY_TOPIC mangler — hopper over push");
    return false;
  }
  const headers: Record<string, string> = {
    Title: asciiSafe(opts.title) || "Varsel",
  };
  if (opts.click) headers.Click = opts.click;
  if (opts.tags) headers.Tags = asciiSafe(opts.tags);
  if (opts.priority) headers.Priority = opts.priority;
  try {
    const r = await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers,
      body: opts.message,
    });
    if (!r.ok) console.error("[social-watch] ntfy-feil:", r.status, await r.text());
    return r.ok;
  } catch (e) {
    console.error("[social-watch] ntfy-unntak:", e);
    return false;
  }
}

// ── Hovedjobb ────────────────────────────────────────────────────────────
export async function runSocialWatch(
  admin: SupabaseClient
): Promise<{ checked: number; new_posts: number; details: string[] }> {
  const { data: rows, error } = await admin
    .from("social_watch")
    .select("id, platform, username, label, last_post_id, last_timestamp")
    .eq("platform", "instagram");
  if (error) throw new Error(`Kunne ikke lese social_watch: ${error.message}`);

  const details: string[] = [];
  let newCount = 0;

  for (const row of (rows || []) as WatchRow[]) {
    let media: DiscoveredMedia[];
    try {
      media = await discoverLatestMedia(row.username);
    } catch (e) {
      details.push(`@${row.username}: FEIL ${e instanceof Error ? e.message : e}`);
      continue;
    }
    if (media.length === 0) {
      details.push(`@${row.username}: ingen innlegg`);
      continue;
    }

    // Nyeste først (API leverer allerede synkende, men vi sorterer for sikkerhets skyld)
    media.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    const newest = media[0];

    // Førstegangskjøring: sett baseline uten å spamme historikk.
    if (!row.last_post_id) {
      await admin
        .from("social_watch")
        .update({
          last_post_id: newest.id,
          last_timestamp: newest.timestamp,
          last_checked_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      details.push(`@${row.username}: baseline satt (${newest.id})`);
      continue;
    }

    // Finn alle innlegg nyere enn sist sette (etter timestamp), eldste først
    const lastTs = row.last_timestamp ? new Date(row.last_timestamp).getTime() : 0;
    const fresh = media
      .filter((m) => new Date(m.timestamp).getTime() > lastTs && m.id !== row.last_post_id)
      .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

    if (fresh.length === 0) {
      await admin
        .from("social_watch")
        .update({ last_checked_at: new Date().toISOString() })
        .eq("id", row.id);
      details.push(`@${row.username}: ingen nye`);
      continue;
    }

    const name = row.label || `@${row.username}`;
    for (const m of fresh) {
      const cap = (m.caption || "").replace(/\s+/g, " ").trim();
      const typeLabel =
        m.media_type === "VIDEO"
          ? "🎬 Reel/video"
          : m.media_type === "CAROUSEL_ALBUM"
            ? "🖼️ Karusell"
            : "🖼️ Bilde";
      await pushNtfy({
        title: `Nytt innlegg fra ${asciiSafe(name) || row.username}`,
        message: `${typeLabel}\n${cap.slice(0, 260)}${cap.length > 260 ? "…" : ""}`,
        click: m.permalink,
        tags: "camera_flash",
        priority: "default",
      });
      newCount++;
    }

    // Oppdater state til nyeste
    await admin
      .from("social_watch")
      .update({
        last_post_id: newest.id,
        last_timestamp: newest.timestamp,
        last_checked_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    details.push(`@${row.username}: ${fresh.length} nye → pushet`);
  }

  return { checked: (rows || []).length, new_posts: newCount, details };
}

// ── Token-utløp-varsel ───────────────────────────────────────────────────
// Pusher en advarsel når META_ACCESS_TOKEN utløper om <= 7 dager, så du får
// byttet til et permanent System User-token i tide.
export async function warnIfTokenExpiringSoon(): Promise<void> {
  try {
    const t = token();
    const r = await fetch(`${GRAPH}/debug_token?input_token=${t}&access_token=${t}`);
    const j = await r.json();
    const expiresAt: number = j?.data?.expires_at ?? 0;
    if (!expiresAt) return; // 0 = utløper aldri
    const daysLeft = Math.floor((expiresAt * 1000 - Date.now()) / 86_400_000);
    if (daysLeft <= 7 && daysLeft >= 0) {
      await pushNtfy({
        title: "Meta-token utloper snart",
        message: `META_ACCESS_TOKEN utloper om ${daysLeft} dag(er). Bytt til et permanent System User-token, ellers stopper Meta-sync + Wera-varslingen.`,
        tags: "warning",
        priority: "high",
      });
    }
  } catch {
    /* stille — ikke la token-sjekk stoppe hovedjobben */
  }
}
