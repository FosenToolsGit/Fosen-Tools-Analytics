"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import {
  JUBILEUM_KAMPANJE,
  type JubileumCaption,
  type JubileumPost,
  type JubileumVideo,
} from "@/lib/services/jubileum-kampanje";

/**
 * Jubileum-kampanjen — ferdig 14-dagers innleggsplan for 25-årsjubileet og
 * butikkåpningen 26. juni 2026.
 *
 * Modus:
 *   - 🖼️ Bilde — render PNG via /api/innleggsbygger/render-innlegg
 *   - 🎬 Video — render MP4 via /api/innleggsbygger/video (Remotion lokalt)
 *
 * Hver dag er redigerbar:
 *   - Tema · anbefalt tid · captions (FB/IG/LI)
 *   - Overrides lagres til localStorage så de overlever side-reload
 *   - "Tilbakestill" på hver dag fjerner overrides
 */

type Aspect = "fb" | "ig" | "li";
type VideoFormat = "reel" | "square" | "wide";
type Mode = "bilde" | "video";
type Platform = "facebook" | "instagram" | "linkedin";

interface RenderedImage {
  data_url: string;
  width: number;
  height: number;
}

interface RenderedVideo {
  url: string;
  width: number;
  height: number;
  durationSec: number;
}

interface PostOverride {
  theme?: string;
  recommended_time?: string;
  facebook?: Partial<JubileumCaption>;
  instagram?: Partial<JubileumCaption>;
  linkedin?: Partial<JubileumCaption>;
}

type OverrideMap = Record<string, PostOverride>;

const STORAGE_KEY = "ft-jubileum-edits-v1";

const ASPECT_LABEL: Record<Aspect, string> = {
  fb: "Facebook 1:1",
  ig: "Instagram 4:5",
  li: "LinkedIn 16:9",
};

const VIDEO_FORMAT_LABEL: Record<VideoFormat, string> = {
  reel: "Reel/Story 9:16",
  square: "Kvadrat 1:1",
  wide: "Bred 16:9",
};

const PLATFORM_LABEL: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

const PLATFORM_ICON: Record<Platform, string> = {
  facebook: "📘",
  instagram: "📸",
  linkedin: "💼",
};

const COUNTDOWN_TONE: Record<string, string> = {
  "T-14": "bg-slate-700 text-slate-100",
  "T-13": "bg-slate-700 text-slate-100",
  "T-12": "bg-slate-700 text-slate-100",
  "T-11": "bg-slate-600 text-slate-100",
  "T-10": "bg-slate-600 text-slate-100",
  "T-9": "bg-slate-600 text-slate-100",
  "T-8": "bg-slate-600 text-slate-100",
  "T-7": "bg-amber-600 text-white",
  "T-6": "bg-amber-600 text-white",
  "T-5": "bg-amber-600 text-white",
  "T-4": "bg-orange-600 text-white",
  "T-3": "bg-orange-600 text-white",
  "T-2": "bg-orange-700 text-white",
  "T-1": "bg-red-700 text-white",
  DAGEN: "bg-red-600 text-white animate-pulse",
};

// =============================================================================
// Helpers
// =============================================================================

function downloadUrl(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  if (url.startsWith("http")) a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function loadOverrides(): OverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OverrideMap) : {};
  } catch {
    return {};
  }
}

function saveOverrides(map: OverrideMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota — ignorer */
  }
}

function applyOverride(base: JubileumPost, ov: PostOverride | undefined): JubileumPost {
  if (!ov) return base;
  return {
    ...base,
    theme: ov.theme ?? base.theme,
    recommended_time: ov.recommended_time ?? base.recommended_time,
    facebook: { ...base.facebook, ...(ov.facebook ?? {}) },
    instagram: { ...base.instagram, ...(ov.instagram ?? {}) },
    linkedin: { ...base.linkedin, ...(ov.linkedin ?? {}) },
  };
}

async function renderImage(post: JubileumPost, aspect: Aspect): Promise<RenderedImage> {
  const res = await fetch("/api/innleggsbygger/render-innlegg", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mal: post.mal,
      variant: post.variant,
      aspect,
      data: post.image_data,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Bilde-render feilet: ${res.status}`);
  }
  const json = (await res.json()) as {
    image_base64?: string;
    mime?: string;
    width?: number;
    height?: number;
  };
  if (!json.image_base64) throw new Error("Tomt svar fra bilde-render");
  return {
    data_url: `data:${json.mime ?? "image/png"};base64,${json.image_base64}`,
    width: json.width ?? 0,
    height: json.height ?? 0,
  };
}

/**
 * Mapper en dag-spesifikk video-config til API-payload-en
 * (`{type, format, data}`) som `/api/innleggsbygger/video` forventer.
 * `kind`-feltet matcher en av de 15 jubileum-VideoType-ene i
 * `remotion/types.ts`.
 */
function videoPayload(
  video: JubileumVideo,
  format: VideoFormat,
): { type: string; data: Record<string, unknown> } {
  // Discriminated union — TS sjekker at vi behandler hvert kind.
  // Vi spreder dataen tilbake til API-en sammen med format.
  const { kind, ...rest } = video;
  return {
    type: kind,
    data: { ...rest, format },
  };
}

async function renderVideoFor(post: JubileumPost, format: VideoFormat): Promise<RenderedVideo> {
  const payload = videoPayload(post.video, format);
  const res = await fetch("/api/innleggsbygger/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: payload.type, format, data: payload.data }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Video-render feilet: ${res.status}`);
  }
  const json = (await res.json()) as {
    url?: string;
    width?: number;
    height?: number;
    durationSec?: number;
  };
  if (!json.url) throw new Error("Tomt svar fra video-render");
  return {
    url: json.url,
    width: json.width ?? 0,
    height: json.height ?? 0,
    durationSec: json.durationSec ?? 0,
  };
}

// =============================================================================
// Page
// =============================================================================

export default function JubileumKampanjePage() {
  const [mode, setMode] = useState<Mode>("bilde");
  const [aspect, setAspect] = useState<Aspect>("fb");
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("reel");

  const [overrides, setOverrides] = useState<OverrideMap>({});
  const [editing, setEditing] = useState<string | null>(null);

  const [images, setImages] = useState<Record<string, RenderedImage | null>>({});
  const [videos, setVideos] = useState<Record<string, RenderedVideo | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Last overrides ved mount
  useEffect(() => {
    setOverrides(loadOverrides());
  }, []);

  // Persist når noe endres
  useEffect(() => {
    saveOverrides(overrides);
  }, [overrides]);

  const posts: JubileumPost[] = useMemo(
    () => JUBILEUM_KAMPANJE.map((p) => applyOverride(p, overrides[p.id])),
    [overrides],
  );

  function updateOverride(id: string, patch: PostOverride): void {
    setOverrides((m) => {
      const current = m[id] ?? {};
      const merged: PostOverride = {
        ...current,
        ...patch,
        facebook: { ...(current.facebook ?? {}), ...(patch.facebook ?? {}) },
        instagram: { ...(current.instagram ?? {}), ...(patch.instagram ?? {}) },
        linkedin: { ...(current.linkedin ?? {}), ...(patch.linkedin ?? {}) },
      };
      return { ...m, [id]: merged };
    });
  }

  function resetOverride(id: string): void {
    setOverrides((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
  }

  async function handleRender(post: JubileumPost): Promise<void> {
    const key = mode === "bilde" ? `${post.id}:img:${aspect}` : `${post.id}:vid:${videoFormat}`;
    setError(null);
    setLoading((m) => ({ ...m, [key]: true }));
    try {
      if (mode === "bilde") {
        const img = await renderImage(post, aspect);
        setImages((m) => ({ ...m, [key]: img }));
      } else {
        const vid = await renderVideoFor(post, videoFormat);
        setVideos((m) => ({ ...m, [key]: vid }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Render feilet");
    } finally {
      setLoading((m) => ({ ...m, [key]: false }));
    }
  }

  async function handleRenderAll(): Promise<void> {
    setError(null);
    setBulkProgress({ done: 0, total: posts.length });
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const key = mode === "bilde" ? `${post.id}:img:${aspect}` : `${post.id}:vid:${videoFormat}`;
      try {
        if (mode === "bilde") {
          const img = await renderImage(post, aspect);
          setImages((m) => ({ ...m, [key]: img }));
        } else {
          const vid = await renderVideoFor(post, videoFormat);
          setVideos((m) => ({ ...m, [key]: vid }));
        }
      } catch (err) {
        console.error(`Render feilet på ${post.id}:`, err);
      }
      setBulkProgress({ done: i + 1, total: posts.length });
    }
    setBulkProgress(null);
  }

  function buildFullCaption(post: JubileumPost, platform: Platform): string {
    const cap = post[platform];
    const parts: string[] = [cap.caption];
    if (cap.cta_link) parts.push(`\n→ ${cap.cta_link}`);
    if (platform === "instagram" && cap.hashtags) {
      parts.push(`\n.\n.\n.\n${cap.hashtags}`);
    }
    return parts.join("");
  }

  async function copyCaption(post: JubileumPost, platform: Platform): Promise<void> {
    const text = buildFullCaption(post, platform);
    const key = `${post.id}:${platform}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setError("Kunne ikke kopiere — clipboard utilgjengelig");
    }
  }

  const editedCount = Object.keys(overrides).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-red-400">
            🎉 Jubileum-kampanje
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            25 år + butikkåpning · 26. juni 2026
          </h1>
          <p className="mt-2 max-w-3xl text-slate-300">
            14 dager med ferdig planlagt innhold — bilde eller video, captions per plattform.
            Rediger fritt — endringer lagres lokalt per nettleser.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-200">
              {posts.length} innlegg
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-200">
              {posts.length * 3} captions
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-200">
              12.–26. juni 2026
            </span>
            <span className="rounded-full bg-red-900/40 px-3 py-1 text-red-300">
              UTM: jubileum-2026-06-26
            </span>
            {editedCount > 0 && (
              <span className="rounded-full bg-amber-900/40 px-3 py-1 text-amber-300">
                ✏️ {editedCount} redigert
              </span>
            )}
          </div>
        </div>

        {/* Modus-veksler */}
        <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex rounded-md border border-slate-700 bg-slate-800 p-1">
            <button
              onClick={() => setMode("bilde")}
              className={`rounded px-4 py-1.5 text-sm font-semibold transition ${
                mode === "bilde"
                  ? "bg-slate-700 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🖼️ Bilde
            </button>
            <button
              onClick={() => setMode("video")}
              className={`rounded px-4 py-1.5 text-sm font-semibold transition ${
                mode === "video"
                  ? "bg-slate-700 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🎬 Video
            </button>
          </div>

          {mode === "bilde" ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Bilde-format
              </label>
              <select
                value={aspect}
                onChange={(e) => setAspect(e.target.value as Aspect)}
                className="mt-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                {(["fb", "ig", "li"] as Aspect[]).map((a) => (
                  <option key={a} value={a}>
                    {ASPECT_LABEL[a]}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Video-format
              </label>
              <select
                value={videoFormat}
                onChange={(e) => setVideoFormat(e.target.value as VideoFormat)}
                className="mt-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                {(["reel", "square", "wide"] as VideoFormat[]).map((f) => (
                  <option key={f} value={f}>
                    {VIDEO_FORMAT_LABEL[f]}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleRenderAll}
            disabled={bulkProgress !== null}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {bulkProgress
              ? `Rendrer ${bulkProgress.done}/${bulkProgress.total}…`
              : mode === "bilde"
              ? "🖼️ Render alle bilder"
              : "🎬 Render alle videoer"}
          </button>

          {mode === "video" && (
            <span className="rounded-full bg-amber-900/40 px-3 py-1 text-xs text-amber-300">
              Video kjører kun lokalt (Remotion)
            </span>
          )}

          <div className="ml-auto text-xs text-slate-400">
            Tips:{" "}
            <a href="/innleggsbygger/utm" className="text-red-400 underline hover:text-red-300">
              UTM-registeret
            </a>{" "}
            for å spore effekt.
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-700 bg-red-950/50 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Brit's plakat — egen seksjon over kalender */}
        <BritPosterSection onError={setError} />

        {/* Kalender */}
        <div className="space-y-6">
          {posts.map((post) => {
            const imgKey = `${post.id}:img:${aspect}`;
            const vidKey = `${post.id}:vid:${videoFormat}`;
            const isLoading =
              loading[mode === "bilde" ? imgKey : vidKey] === true;
            const img = images[imgKey];
            const vid = videos[vidKey];
            const isEditing = editing === post.id;
            const isEdited = Boolean(overrides[post.id]);
            return (
              <div
                key={post.id}
                className={`rounded-xl border ${
                  isEdited ? "border-amber-700/60" : "border-slate-800"
                } bg-slate-900/40 p-5 shadow-lg`}
              >
                {/* Card header */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                        COUNTDOWN_TONE[post.countdown_label] ?? "bg-slate-700 text-slate-100"
                      }`}
                    >
                      {post.countdown_label}
                    </span>
                    <div>
                      <div className="text-sm text-slate-400">
                        {post.weekday} {formatNoDate(post.date)} · {post.recommended_time}
                        {isEdited && <span className="ml-2 text-amber-400">· redigert</span>}
                      </div>
                      <div className="text-lg font-semibold text-slate-100">{post.theme}</div>
                      <div className="text-xs text-slate-500">{post.internal_note}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditing(isEditing ? null : post.id)}
                      className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-700"
                    >
                      {isEditing ? "Lukk" : "✏️ Rediger"}
                    </button>
                    {isEdited && (
                      <button
                        onClick={() => resetOverride(post.id)}
                        className="rounded-md border border-amber-700/60 bg-amber-900/30 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-900/50"
                        title="Fjern dine endringer"
                      >
                        Tilbakestill
                      </button>
                    )}
                    <div className="rounded-md bg-slate-800 px-2 py-1 text-xs font-mono text-slate-300">
                      {mode === "bilde"
                        ? `${post.mal} · ${post.variant}`
                        : `🎬 ${post.video.kind}`}
                    </div>
                  </div>
                </div>

                {/* Edit-panel */}
                {isEditing && (
                  <EditPanel
                    post={post}
                    onChange={(patch) => updateOverride(post.id, patch)}
                  />
                )}

                {/* Innhold-grid */}
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
                  {/* Bilde- eller video-preview */}
                  <div>
                    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                      {mode === "bilde" ? (
                        img ? (
                          <img
                            src={img.data_url}
                            alt={`${post.theme} (${ASPECT_LABEL[aspect]})`}
                            className="w-full"
                          />
                        ) : (
                          <div className="flex aspect-square items-center justify-center text-xs text-slate-600">
                            Trykk Render
                          </div>
                        )
                      ) : vid ? (
                        <video
                          src={vid.url}
                          controls
                          className="w-full"
                          playsInline
                        />
                      ) : (
                        <div className="flex aspect-[9/16] items-center justify-center text-xs text-slate-600">
                          Trykk Render (tar 30–90 sek)
                        </div>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleRender(post)}
                        disabled={isLoading || bulkProgress !== null}
                        className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-700 disabled:opacity-50"
                      >
                        {isLoading
                          ? "Rendrer…"
                          : (mode === "bilde" ? img : vid)
                          ? "🔁 Render på nytt"
                          : mode === "bilde"
                          ? "🖼️ Render bilde"
                          : "🎬 Render video"}
                      </button>
                      {mode === "bilde" && img && (
                        <button
                          onClick={() =>
                            downloadUrl(
                              img.data_url,
                              `jubileum-${post.id}-${aspect}.png`,
                            )
                          }
                          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-700"
                          title="Last ned bilde"
                        >
                          ⬇️
                        </button>
                      )}
                      {mode === "video" && vid && (
                        <button
                          onClick={() =>
                            downloadUrl(vid.url, `jubileum-${post.id}-${videoFormat}.mp4`)
                          }
                          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-700"
                          title="Last ned video"
                        >
                          ⬇️
                        </button>
                      )}
                    </div>
                    {mode === "video" && vid && (
                      <div className="mt-2 text-xs text-slate-500">
                        {vid.width}×{vid.height} · {vid.durationSec.toFixed(1)} sek
                      </div>
                    )}
                  </div>

                  {/* Captions per plattform */}
                  <div className="space-y-3">
                    {(["facebook", "instagram", "linkedin"] as Platform[]).map((platform) => {
                      const cap = post[platform];
                      const copyKey = `${post.id}:${platform}`;
                      const isCopied = copied === copyKey;
                      return (
                        <div
                          key={platform}
                          className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                              <span>{PLATFORM_ICON[platform]}</span>
                              {PLATFORM_LABEL[platform]}
                              <span className="text-xs font-normal text-slate-500">
                                ({cap.caption.length} tegn)
                              </span>
                            </div>
                            <button
                              onClick={() => copyCaption(post, platform)}
                              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                                isCopied
                                  ? "bg-green-600 text-white"
                                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                              }`}
                            >
                              {isCopied ? "✓ Kopiert" : "📋 Kopier"}
                            </button>
                          </div>
                          {isEditing ? (
                            <textarea
                              value={cap.caption}
                              onChange={(e) =>
                                updateOverride(post.id, {
                                  [platform]: { caption: e.target.value },
                                })
                              }
                              rows={Math.min(12, Math.max(4, cap.caption.split("\n").length + 1))}
                              className="w-full rounded-md border border-slate-700 bg-slate-900 p-2 font-sans text-sm text-slate-100"
                            />
                          ) : (
                            <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-200">
                              {cap.caption}
                            </pre>
                          )}
                          {cap.cta_link && (
                            <div className="mt-2 truncate text-xs text-red-400">
                              → {cap.cta_link}
                            </div>
                          )}
                          {platform === "instagram" && cap.hashtags && (
                            <div className="mt-2 text-xs text-slate-400">
                              <span className="font-semibold text-slate-300">Hashtags:</span>{" "}
                              {cap.hashtags}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-10 rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400">
          <div className="font-semibold text-slate-300">Sjekkliste før publisering</div>
          <ul className="mt-2 space-y-1">
            <li>· Bilde: FB 1:1 · IG 4:5 · LI 16:9 · Video: Reel 9:16 · Square 1:1 · Wide 16:9</li>
            <li>· Kopier caption — lim inn i Meta Business Suite / LinkedIn</li>
            <li>· På Instagram: plassér hashtags i første kommentar</li>
            <li>· Husk alt-tekst (settes via mobilappen etter publisering)</li>
            <li>· Anbefalt tid: kl 12:00 tor/fre (datadrevet: +93% engasjement)</li>
            <li>· Endringer lagres lokalt per nettleser — del jobben med kollega via samme bruker</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// EditPanel — kompakt felt-rad for tema, tid og link-overstyringer
// =============================================================================

function EditPanel({
  post,
  onChange,
}: {
  post: JubileumPost;
  onChange: (patch: PostOverride) => void;
}): React.JSX.Element {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-amber-900/40 bg-amber-950/10 p-4 md:grid-cols-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300">
          Tema
        </label>
        <input
          value={post.theme}
          onChange={(e) => onChange({ theme: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300">
          Anbefalt tid
        </label>
        <input
          value={post.recommended_time}
          onChange={(e) => onChange({ recommended_time: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300">
          FB-CTA-link (override)
        </label>
        <input
          value={post.facebook.cta_link ?? ""}
          onChange={(e) =>
            onChange({ facebook: { cta_link: e.target.value || undefined } })
          }
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100"
        />
      </div>
    </div>
  );
}

// =============================================================================
// BritPosterSection — egen jubileums-plakat med 8 partner-logoer
// =============================================================================

type PosterFormat = "square" | "feed" | "reel" | "wide" | "a4";

const POSTER_FORMAT_LABEL: Record<PosterFormat, string> = {
  square: "Kvadrat 1:1",
  feed: "Portrett 4:5",
  reel: "Story/Reel 9:16",
  wide: "Bred 16:9",
  a4: "A4 print (210×297 mm)",
};

interface PosterRendered {
  data_url: string;
  width: number;
  height: number;
}

function BritPosterSection({
  onError,
}: {
  onError: (msg: string | null) => void;
}): React.JSX.Element {
  const [format, setFormat] = useState<PosterFormat>("square");
  const [eyebrow, setEyebrow] = useState("25-ÅRSJUBILEUM · BUTIKKÅPNING");
  const [dateLine, setDateLine] = useState("26. JUNI 2026");
  const [headlineA, setHeadlineA] = useState("LEVERANDØR STANDER");
  const [headlineB, setHeadlineB] = useState("HOLD AV DAGEN");
  const [subtitle, setSubtitle] = useState(
    "Vi feirer 25 år & åpner ombygget butikk · Brekstad",
  );
  const [partnersTagline, setPartnersTagline] = useState(
    "MØT EKSPERTENE · FÅ FAGLIG PÅFYLL · STILL SPØRSMÅL",
  );

  const [rendered, setRendered] = useState<Record<PosterFormat, PosterRendered | null>>({
    square: null,
    feed: null,
    reel: null,
    wide: null,
    a4: null,
  });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  async function render(): Promise<void> {
    onError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/innleggsbygger/jubileum-poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          eyebrow,
          dateLine,
          headlines: [headlineA, headlineB],
          subtitle,
          partnersTagline,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Plakat-render feilet: ${res.status}`);
      }
      const json = (await res.json()) as {
        image_base64?: string;
        mime?: string;
        width?: number;
        height?: number;
      };
      if (!json.image_base64) throw new Error("Tomt svar fra plakat-render");
      setRendered((m) => ({
        ...m,
        [format]: {
          data_url: `data:${json.mime ?? "image/png"};base64,${json.image_base64}`,
          width: json.width ?? 0,
          height: json.height ?? 0,
        },
      }));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Plakat-render feilet");
    } finally {
      setLoading(false);
    }
  }

  const img = rendered[format];

  return (
    <div className="mb-6 rounded-xl border border-red-800/50 bg-gradient-to-br from-red-950/30 to-slate-900/40 p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-red-700 px-2.5 py-1 text-xs font-bold text-white">
            🎉 BRIT&apos;S PLAKAT
          </span>
          <div>
            <div className="text-lg font-semibold text-slate-100">
              Jubileums-plakat med leverandører
            </div>
            <div className="text-xs text-slate-400">
              FT-rød bakgrunn · 8 partner-logoer · jubileumslogo · klar for SoMe, e-post og print
            </div>
          </div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold hover:bg-slate-700"
        >
          {open ? "Skjul" : "Vis"}
        </button>
      </div>

      {open && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Eyebrow" value={eyebrow} onChange={setEyebrow} />
            <Field label="Dato-linje" value={dateLine} onChange={setDateLine} />
            <Field label="Format" value={format} onChange={(v) => setFormat(v as PosterFormat)} kind="select" />
            <Field label="Hovedlinje 1" value={headlineA} onChange={setHeadlineA} />
            <Field label="Hovedlinje 2" value={headlineB} onChange={setHeadlineB} />
            <Field label="Undertekst" value={subtitle} onChange={setSubtitle} />
            <Field
              label="Tagline over logoer"
              value={partnersTagline}
              onChange={setPartnersTagline}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[400px_1fr]">
            <div>
              <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.data_url} alt="Jubileums-plakat" className="w-full" />
                ) : (
                  <div className="flex aspect-square items-center justify-center text-xs text-slate-600">
                    Trykk Render
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={render}
                  disabled={loading}
                  className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {loading ? "Rendrer…" : img ? "🔁 Render på nytt" : "🎉 Render plakat"}
                </button>
                {img && (
                  <>
                    <button
                      onClick={() =>
                        downloadUrl(img.data_url, `jubileum-plakat-${format}.png`)
                      }
                      className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold hover:bg-slate-700"
                      title="Last ned som PNG-bilde"
                    >
                      🖼️ PNG
                    </button>
                    <button
                      onClick={() => downloadAsPdf(img, format)}
                      className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold hover:bg-slate-700"
                      title="Last ned som PDF (print-klar)"
                    >
                      📄 PDF
                    </button>
                  </>
                )}
              </div>
              {img && (
                <div className="mt-2 text-xs text-slate-500">
                  {img.width}×{img.height} px
                </div>
              )}
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                <div className="font-semibold text-slate-200">Partnere på plakaten</div>
                <ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-400">
                  <li>· Milwaukee</li>
                  <li>· Wera</li>
                  <li>· Soudal</li>
                  <li>· Picard</li>
                  <li>· Halder</li>
                  <li>· Zweibrüder</li>
                  <li>· Red Bull</li>
                  <li>· Tesla Mobile Service</li>
                </ul>
                <div className="mt-3 text-xs text-slate-500">
                  Hver logo får sin egen hvite tile så originalfargene kommer fram mot rød
                  bakgrunn. Zweibrüder (hvit-på-transparent) inverteres til svart så den
                  blir synlig.
                </div>
              </div>
              <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
                <div className="font-semibold text-slate-300">Format-tips</div>
                <ul className="mt-2 space-y-1">
                  <li>· Kvadrat 1:1 — FB-feed, IG-feed (klassisk)</li>
                  <li>· Portrett 4:5 — IG-feed (tar mer plass)</li>
                  <li>· Story/Reel 9:16 — IG/FB Stories</li>
                  <li>· Bred 16:9 — LinkedIn-feed, butikk-skjerm, e-post-header</li>
                  <li>· A4 print — 300 dpi (2480×3508 px), klar for utskrift på butikkdøren</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Last ned plakaten som PDF. For A4 bruker vi eksakte A4-mål
 * (210×297 mm) så den blir print-klar direkte. For andre format
 * bruker vi data-URL-en sin egen dimensjon i mm (96 dpi).
 */
async function downloadAsPdf(
  img: PosterRendered,
  format: PosterFormat,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  // px → mm: vi normaliserer ut fra en 96 dpi-antagelse for ikke-A4-format
  let widthMm: number;
  let heightMm: number;
  if (format === "a4") {
    widthMm = 210;
    heightMm = 297;
  } else {
    // Andre format — behold piksel-aspect, skaler til maks 297 mm i lengste retning
    const px2mm = 297 / Math.max(img.width, img.height);
    widthMm = img.width * px2mm;
    heightMm = img.height * px2mm;
  }
  const isLandscape = widthMm > heightMm;
  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: format === "a4" ? "a4" : [widthMm, heightMm],
    compress: true,
  });
  pdf.addImage(img.data_url, "PNG", 0, 0, widthMm, heightMm, undefined, "FAST");
  pdf.save(`jubileum-plakat-${format}.pdf`);
}

function Field({
  label,
  value,
  onChange,
  kind,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  kind?: "text" | "select";
}): React.JSX.Element {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      {kind === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        >
          {(["square", "feed", "reel", "wide", "a4"] as PosterFormat[]).map((f) => (
            <option key={f} value={f}>
              {POSTER_FORMAT_LABEL[f]}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      )}
    </div>
  );
}

function formatNoDate(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "mai",
    "jun",
    "jul",
    "aug",
    "sep",
    "okt",
    "nov",
    "des",
  ];
  return `${parseInt(d, 10)}. ${months[parseInt(m, 10) - 1] ?? m}`;
}
