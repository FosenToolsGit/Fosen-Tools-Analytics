"use client";

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

export default function PrisplakatPlayPage() {
  const params = useParams();
  const search = useSearchParams();
  const id = params?.id as string;
  const autoplay = search?.get("autoplay") === "1";
  const [playlist, setPlaylist] = useState<PricetagPlaylist | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/prisplakat/${id}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load");
        const pl = d.playlist as PricetagPlaylist;
        // Hvis produkter mangler scraped data (kun source_url), scrape dem
        const needScrape = pl.products.filter(p => !p.name || !p.price_now);
        if (needScrape.length > 0) {
          const enriched = await Promise.all(pl.products.map(async (p) => {
            if (p.name && p.price_now) return p;
            try {
              const r2 = await fetch(`/api/brosjyre/scrape-product?url=${encodeURIComponent(p.source_url)}`);
              const d2 = await r2.json();
              if (r2.ok) return { ...d2.product, ...p }; // merge: overrides først
            } catch { /* ignore */ }
            return p;
          }));
          pl.products = enriched;
        }
        setPlaylist(pl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Feil");
      }
    })();
  }, [id]);

  if (error) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white text-sm">{error}</div>;
  }
  if (!playlist) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white text-sm">Laster slideshow…</div>;
  }

  const settings = { ...DEFAULT_SETTINGS, ...playlist.settings };
  const landscape = playlist.format !== "slideshow_portrait";

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <Slideshow products={playlist.products} settings={settings} landscape={landscape} autoplay={autoplay} />
    </div>
  );
}
