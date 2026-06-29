"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { PricetagPlaylist } from "@/components/prisplakat/types";
import { DEFAULT_SETTINGS } from "@/components/prisplakat/types";
import "@/components/brosjyre/editor.css";

// Permanent, navngitt skjerm-URL for butikk-skjermer (UniFi US Cast Pro,
// Chromecast, kiosk-PC). Token i URL er fast — hvilken spilleliste som vises
// styres fra dashbordet. Krever IKKE innlogging.

const Slideshow = dynamic(
  () => import("@/components/prisplakat/slideshow").then((m) => m.Slideshow),
  { ssr: false }
);

export default function SkjermPlayPage() {
  const params = useParams();
  const token = params?.token as string;
  const [playlist, setPlaylist] = useState<PricetagPlaylist | null>(null);
  const [screenName, setScreenName] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  // Innholds-signatur (playlist-id + updated_at) ved innlasting — pollet mot
  // /version for å oppdage bytte/redigering og reloade automatisk.
  const versionRef = useRef<string | null>(null);

  // Kiosk-styling: skjul cursor, ingen scroll
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevCursor = document.body.style.cursor;
    document.body.style.overflow = "hidden";
    document.body.style.cursor = "none";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.cursor = prevCursor;
      document.documentElement.style.overflow = "";
    };
  }, []);

  // Auto-refresh hvert 5. min: sikkerhetsnett som plukker opp ny kode/deploy.
  useEffect(() => {
    const id = setInterval(() => window.location.reload(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Innholds-poll hvert 30. sek: reloader skjermen automatisk når spillelista
  // byttes eller innholdet redigeres — så man slipper å refreshe på enheten.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const r = await fetch(`/api/skjerm/${token}/version`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        const sig = d.playlist_id ? `${d.playlist_id}:${d.updated_at ?? ""}` : "none";
        if (versionRef.current !== null && sig !== versionRef.current) {
          window.location.reload();
        }
      } catch { /* nettverksglipp — prøv igjen neste runde */ }
    }, 30_000);
    return () => clearInterval(id);
  }, [token]);

  // Auto-gjenoppretting ved chunk-/lastefeil (skjer typisk etter en deploy:
  // gammel HTML peker på JS-filer som er byttet ut → hvit skjerm). Da tvinger
  // vi en reload som henter fersk HTML + nye filer, så TVen aldri blir stående.
  useEffect(() => {
    let reloading = false;
    const recover = (msg: string) => {
      if (reloading) return;
      if (/ChunkLoadError|Loading chunk|dynamically imported module|importing a module script failed/i.test(msg)) {
        reloading = true;
        setTimeout(() => window.location.reload(), 1500);
      }
    };
    const onErr = (e: ErrorEvent) => recover(e.message || "");
    const onRej = (e: PromiseRejectionEvent) => recover((e.reason && (e.reason.message || String(e.reason))) || "");
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/skjerm/${token}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Kunne ikke laste");
        if (cancelled) return;
        setScreenName(d.screen?.name ?? null);
        versionRef.current = d.playlist ? `${d.playlist.id}:${d.playlist.updated_at ?? ""}` : "none";
        if (!d.playlist) {
          setStatus("empty");
          return;
        }
        setPlaylist(d.playlist as PricetagPlaylist);
        setStatus("ready");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Feil");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "error") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white text-sm">
        {error}
      </div>
    );
  }
  if (status === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white text-sm">
        Laster skjerm…
      </div>
    );
  }
  if (status === "empty" || !playlist) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black text-white">
        <div className="text-2xl font-bold">{screenName ?? "Skjerm"}</div>
        <div className="text-sm opacity-60">Ingen spilleliste tilordnet ennå</div>
        <div className="text-xs opacity-40">Velg en spilleliste for denne skjermen i dashbordet</div>
      </div>
    );
  }

  const settings = { ...DEFAULT_SETTINGS, ...playlist.settings };
  const landscape = playlist.format !== "slideshow_portrait";

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <Slideshow
        products={playlist.products}
        settings={settings}
        landscape={landscape}
        autoplay={true}
        kioskMode={true}
      />
    </div>
  );
}
