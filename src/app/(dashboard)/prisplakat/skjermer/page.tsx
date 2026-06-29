"use client";

import { useEffect, useState, useCallback } from "react";

// Administrasjon av navngitte butikk-skjermer. Hver skjerm har en FAST kiosk-URL
// som legges inn på enheten én gang. Hvilken spilleliste skjermen viser styres
// herfra — bytte spilleliste rører aldri enheten.

interface Screen {
  id: string;
  name: string;
  screen_token: string;
  playlist_id: string | null;
  updated_at: string;
}
interface Playlist {
  id: string;
  title: string;
  format: string;
}

export default function SkjermerPage() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [refreshed, setRefreshed] = useState<string | null>(null);

  useEffect(() => setOrigin(window.location.origin), []);

  const load = useCallback(async () => {
    setLoading(true);
    const [sr, pr] = await Promise.all([
      fetch("/api/prisplakat/screens").then((r) => r.json()).catch(() => ({ screens: [] })),
      fetch("/api/prisplakat/list").then((r) => r.json()).catch(() => ({ playlists: [] })),
    ]);
    setScreens(sr.screens ?? []);
    setPlaylists((pr.playlists ?? []).map((p: Playlist) => ({ id: p.id, title: p.title, format: p.format })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createScreen() {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const r = await fetch("/api/prisplakat/screens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const d = await r.json();
    setBusy(false);
    if (r.ok && d.screen) {
      setScreens((s) => [...s, d.screen].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    } else {
      alert(d.error || "Kunne ikke opprette skjerm");
    }
  }

  async function patchScreen(id: string, patch: Partial<Pick<Screen, "name" | "playlist_id">>) {
    setScreens((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    await fetch(`/api/prisplakat/screens/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function deleteScreen(id: string, name: string) {
    if (!confirm(`Slette skjermen «${name}»? Kiosk-URL-en slutter å fungere.`)) return;
    await fetch(`/api/prisplakat/screens/${id}`, { method: "DELETE" });
    setScreens((s) => s.filter((x) => x.id !== id));
  }

  function copyUrl(token: string) {
    const url = `${origin}/skjerm/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  // Force-refresh: bumper spillelista → live-skjermer reloader seg selv innen 30s.
  async function refreshScreen(id: string) {
    setRefreshing(id);
    const r = await fetch(`/api/prisplakat/screens/${id}`, { method: "POST" });
    setRefreshing(null);
    if (r.ok) {
      setRefreshed(id);
      setTimeout(() => setRefreshed((x) => (x === id ? null : x)), 4000);
    } else {
      const d = await r.json().catch(() => ({}));
      alert(d.error || "Kunne ikke refreshe skjermen");
    }
  }

  async function refreshAll() {
    setRefreshing("ALL");
    for (const s of screens) {
      if (s.playlist_id) await fetch(`/api/prisplakat/screens/${s.id}`, { method: "POST" });
    }
    setRefreshing(null);
    setRefreshed("ALL");
    setTimeout(() => setRefreshed((x) => (x === "ALL" ? null : x)), 4000);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 text-zinc-100">
      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-2xl font-bold">Skjermer</h1>
        <a href="/prisplakat" className="text-sm text-zinc-400 hover:text-zinc-200">← Prisplakat</a>
        <button
          onClick={refreshAll}
          disabled={refreshing === "ALL" || screens.length === 0}
          title="Tving alle skjermer til å laste på nytt"
          className="ml-auto rounded-lg bg-zinc-700 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-600 disabled:opacity-40"
        >
          {refreshed === "ALL" ? "✓ Alle oppdateres" : refreshing === "ALL" ? "Oppdaterer…" : "↻ Refresh alle"}
        </button>
      </div>
      <p className="mb-6 text-sm text-zinc-400">
        Hver skjerm har én fast URL du legger inn på enheten én gang. Bytt hvilken
        spilleliste den viser her — enheten oppdaterer seg selv.
      </p>

      {/* Ny skjerm */}
      <div className="mb-8 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createScreen()}
          placeholder="Navn på skjerm (f.eks. Wera-veggen)"
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <button
          onClick={createScreen}
          disabled={busy || !newName.trim()}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-red-500"
        >
          + Ny skjerm
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Laster…</div>
      ) : screens.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">
          Ingen skjermer ennå. Opprett din første over (f.eks. «Milwaukee-rommet»).
        </div>
      ) : (
        <div className="space-y-3">
          {screens.map((s) => (
            <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Navn */}
                <input
                  defaultValue={s.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== s.name) patchScreen(s.id, { name: v });
                  }}
                  className="min-w-[180px] flex-1 rounded-md bg-transparent px-1 py-1 text-lg font-bold outline-none hover:bg-zinc-800/60 focus:bg-zinc-800"
                />
                {/* Spilleliste-velger */}
                <select
                  value={s.playlist_id ?? ""}
                  onChange={(e) => patchScreen(s.id, { playlist_id: e.target.value || null })}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm outline-none focus:border-zinc-500"
                >
                  <option value="">— Ingen spilleliste —</option>
                  {playlists.map((p) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <button
                  onClick={() => deleteScreen(s.id, s.name)}
                  className="rounded-md px-2 py-1.5 text-sm text-zinc-500 hover:text-red-400"
                  title="Slett skjerm"
                >
                  Slett
                </button>
              </div>

              {/* Fast kiosk-URL */}
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 overflow-x-auto whitespace-nowrap rounded-md bg-black/40 px-3 py-2 text-xs text-zinc-300">
                  {origin}/skjerm/{s.screen_token}
                </code>
                <button
                  onClick={() => copyUrl(s.screen_token)}
                  className="rounded-md bg-zinc-700 px-3 py-2 text-xs font-semibold hover:bg-zinc-600"
                >
                  {copied === s.screen_token ? "✓ Kopiert" : "Kopier URL"}
                </button>
                <a
                  href={`/skjerm/${s.screen_token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-zinc-700 px-3 py-2 text-xs font-semibold hover:bg-zinc-600"
                >
                  Åpne
                </a>
                <button
                  onClick={() => refreshScreen(s.id)}
                  disabled={!s.playlist_id || refreshing === s.id}
                  title="Tving skjermen til å laste på nytt (innen 30 sek)"
                  className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold hover:bg-red-500 disabled:opacity-40"
                >
                  {refreshed === s.id ? "✓ Oppdateres" : refreshing === s.id ? "…" : "↻ Refresh"}
                </button>
              </div>
              {refreshed === s.id && (
                <div className="mt-2 text-xs text-green-400/80">
                  Sendt — skjermen laster seg selv på nytt innen 30 sekunder (hvis den er på og kjører).
                </div>
              )}
              {!s.playlist_id && (
                <div className="mt-2 text-xs text-amber-400/80">
                  Velg en spilleliste over for at skjermen skal vise noe.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
