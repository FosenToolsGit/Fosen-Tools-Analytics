"use client";

import { useEffect, useState } from "react";
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

  // Auto-refresh hvert 5. min: plukker opp bytte av spilleliste / nytt innhold
  useEffect(() => {
    const id = setInterval(() => window.location.reload(), 5 * 60 * 1000);
    return () => clearInterval(id);
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
