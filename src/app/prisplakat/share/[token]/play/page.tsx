"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { PricetagPlaylist } from "@/components/prisplakat/types";
import { DEFAULT_SETTINGS } from "@/components/prisplakat/types";
import "@/components/brosjyre/editor.css";

// Public, token-basert slideshow-visning for skjermavspillere (UniFi US Cast
// Pro, Chromecast, kiosk-PC osv). Krever IKKE innlogging — token i URL er
// eneste tilgangs-kontroll. Ingen header, ingen sidebar, ingen cursor.

const Slideshow = dynamic(
  () => import("@/components/prisplakat/slideshow").then((m) => m.Slideshow),
  { ssr: false }
);

export default function PrisplakatSharePlayPage() {
  const params = useParams();
  const token = params?.token as string;
  const [playlist, setPlaylist] = useState<PricetagPlaylist | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Kiosk-mode body-styling: skjul cursor, prevent scroll, fyll viewport
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

  // Auto-refresh hvert 5. minutt så endringer i playlist plukkes opp uten
  // manuell rebooting av skjermen.
  useEffect(() => {
    const id = setInterval(() => {
      window.location.reload();
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/prisplakat/share/${token}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load");
        const pl = d.playlist as PricetagPlaylist;

        // Scrape manglende produkt-data (samme mønster som inn-logget play)
        const needScrape = pl.products.filter(
          (p) => !p.name || !p.price_now
        );
        if (needScrape.length > 0) {
          const enriched = await Promise.all(
            pl.products.map(async (p) => {
              if (p.name && p.price_now) return p;
              try {
                const r2 = await fetch(
                  `/api/brosjyre/scrape-product?url=${encodeURIComponent(p.source_url)}`
                );
                const d2 = await r2.json();
                if (r2.ok) return { ...d2.product, ...p };
              } catch {
                /* ignore */
              }
              return p;
            })
          );
          pl.products = enriched;
        }
        if (!cancelled) setPlaylist(pl);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Feil");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white text-sm">
        {error}
      </div>
    );
  }
  if (!playlist) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white text-sm">
        Laster slideshow…
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
