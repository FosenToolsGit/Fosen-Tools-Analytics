"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Render et nyhetsbrev-utkast som en skalert iframe-thumbnail.
 *
 * Bruker /api/mailchimp/newsletter/preview-by-id?id=... for å hente
 * ferdig Mailchimp-HTML, fyller det inn i iframe via srcdoc, og
 * skalerer ned via CSS transform.
 *
 * Lazy-loading: HTML hentes først når thumbnailen kommer i viewport
 * (via IntersectionObserver). Reduserer initial load på liste-sider
 * med mange utkast.
 *
 * Visuell oppførsel:
 *   - Faktisk iframe-vindu er 660px bred (Mailchimp-bredde)
 *   - Skaleres ned til `width` × auto via CSS transform: scale()
 *   - Statisk høyde-cap via `maxHeight` så lange brev ikke spiser side
 */

interface NewsletterPreviewThumbProps {
  draftId: string;
  width?: number; // visuell bredde i px (default 280)
  maxHeight?: number; // visuell høyde-cap (default 360)
  scaleFromWidth?: number; // intern email-bredde (default 660)
}

export function NewsletterPreviewThumb({
  draftId,
  width = 280,
  maxHeight = 360,
  scaleFromWidth = 660,
}: NewsletterPreviewThumbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // IntersectionObserver: bare last når synlig
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" } // start lasting før thumbnail er helt synlig
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Hent HTML når synlig
  useEffect(() => {
    if (!inView || html || error) return;
    let cancelled = false;
    fetch(`/api/mailchimp/newsletter/preview-by-id?id=${encodeURIComponent(draftId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setHtml(text);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Feil");
      });
    return () => {
      cancelled = true;
    };
  }, [inView, draftId, html, error]);

  const scale = width / scaleFromWidth;
  const innerHeight = maxHeight / scale; // scaler høyden tilsvarende

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded border border-gray-700 bg-white"
      style={{ width, height: maxHeight }}
    >
      {error ? (
        <div className="flex h-full items-center justify-center text-[10px] text-red-400 p-2 text-center">
          Kunne ikke laste forhåndsvisning
        </div>
      ) : !html ? (
        <div className="flex h-full items-center justify-center text-[10px] text-gray-400">
          Laster forhåndsvisning…
        </div>
      ) : (
        <iframe
          srcDoc={html}
          title="Nyhetsbrev-forhåndsvisning"
          sandbox="allow-same-origin"
          loading="lazy"
          style={{
            border: "none",
            width: `${scaleFromWidth}px`,
            height: `${innerHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        />
      )}
      {/* Klikk-overlay som peker til byggeren */}
    </div>
  );
}
