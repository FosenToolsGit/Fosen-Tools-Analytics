"use client";

// Test-mode slideshow: leser playlist fra sessionStorage så brukeren kan
// teste i fullskjerm uten å lagre playlist først.

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { PricetagPlaylist } from "@/components/prisplakat/types";
import { DEFAULT_SETTINGS } from "@/components/prisplakat/types";
import "@/components/brosjyre/editor.css";

const Slideshow = dynamic(
  () => import("@/components/prisplakat/slideshow").then((m) => m.Slideshow),
  { ssr: false }
);

export default function PrisplakatTmpPlayPage() {
  const params = useParams();
  const search = useSearchParams();
  const id = params?.id as string;
  const autoplay = search?.get("autoplay") === "1";
  const [playlist, setPlaylist] = useState<Partial<PricetagPlaylist> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`prisplakat-tmp-${id}`);
      if (!raw) {
        setError("Test-data ikke funnet. Lukk dette vinduet og prøv igjen fra editoren.");
        return;
      }
      const data = JSON.parse(raw);
      setPlaylist(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Feil");
    }
  }, [id]);

  if (error) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white text-sm">{error}</div>;
  }
  if (!playlist) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white text-sm">Laster…</div>;
  }

  const settings = { ...DEFAULT_SETTINGS, ...(playlist.settings || {}) };
  const landscape = playlist.format !== "slideshow_portrait";

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <Slideshow products={playlist.products || []} settings={settings} landscape={landscape} autoplay={autoplay} />
    </div>
  );
}
