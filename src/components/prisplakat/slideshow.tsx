"use client";

// Slideshow-renderer for butikk-skjermer.
// Bruker container queries (cqh) så ALLE størrelser skalerer proporsjonalt
// med container-høyden — fungerer like bra på 1920×1080 som i embedded preview.
//
// Spesial-slides (intro/credentials/certified/outro/brand_spotlight/multi_product/combo/blank)
// rendres data-drevet fra `settings.custom_slides` via CustomSlideRenderer.
// Brukeren kan redigere alle felter (tekst, farger, logoer, bakgrunn) fra editoren.

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { PricetagProduct, PricetagSettings, SlideListItem } from "./types";
import { buildSlideList, defaultCustomSlides, effective } from "./types";
import { PriceBurst } from "@/components/brosjyre/ft-svg";
import { formatNOK } from "@/components/brosjyre/store";
import { CustomSlideRenderer } from "./custom-slide-renderer";
import { QrCode } from "./qr-code";

const FT_RED = "#ed1c24";
const FT_INK = "#0f1115";

const HEAD = 'var(--ft-head-font, "Manrope", "Inter", system-ui, sans-serif)';
const MONO = '"Roboto Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

// Proxy bilde-URL for CORS (Azure blob trenger proxy)
function proxyImage(src: string | null | undefined): string | null {
  if (!src) return null;
  try {
    const u = new URL(src);
    if (u.hostname === "mc10256fosentools.blob.core.windows.net" || u.hostname.endsWith("fosen-tools.no")) {
      return `/api/brosjyre/image-proxy?url=${encodeURIComponent(src)}`;
    }
  } catch { /* ignore */ }
  return src;
}

// ─── Klokke-overlay ─────────────────────────────────────────────────────

function ClockOverlay() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const dateStr = now.toLocaleDateString("no-NO", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div style={{
      position: "absolute", top: "2cqh", right: "2.5cqh", zIndex: 5,
      fontFamily: HEAD, color: "rgba(255,255,255,0.7)",
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4cqh",
      pointerEvents: "none",
    }}>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: "2cqh", letterSpacing: "0.04em" }}>{hh}:{mm}</div>
      <div style={{ fontSize: "1.1cqh", letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.7 }}>{dateStr}</div>
    </div>
  );
}

// ─── Konkurranse-varsel (nederst venstre, pil ned mot person under skjermen) ──

function KonkurranseOverlay() {
  return (
    <div style={{ position: "absolute", bottom: "4cqh", left: "4cqh", zIndex: 6, textAlign: "center", pointerEvents: "none" }}>
      <style>{`@keyframes ftKonkBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(2.4cqh)}}`}</style>
      <div style={{ background: "#FFD400", color: FT_INK, borderRadius: "2.2cqh", padding: "2.2cqh 3.4cqh", boxShadow: "0 1.6cqh 4cqh rgba(0,0,0,0.45)", display: "inline-block" }}>
        <div style={{ fontFamily: HEAD, fontWeight: 800, fontSize: "3.6cqh", textTransform: "uppercase", lineHeight: 0.95, letterSpacing: "0.01em" }}>Her er det<br />konkurranse!</div>
        <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: "2cqh", marginTop: "1cqh" }}>Bli med rett her nede</div>
      </div>
      <div style={{ width: 0, height: 0, margin: "1.2cqh auto 0", borderLeft: "5cqh solid transparent", borderRight: "5cqh solid transparent", borderTop: "6.5cqh solid #FFD400", filter: "drop-shadow(0 1cqh 1.2cqh rgba(0,0,0,0.4))", animation: "ftKonkBounce 1s ease-in-out infinite" }} />
    </div>
  );
}

// ─── Produkt-slide ──────────────────────────────────────────────────────

function ProductSlideContent({
  product, settings, landscape, active, durationMs, animatePrice,
}: { product: PricetagProduct; settings: PricetagSettings; landscape: boolean; active: boolean; durationMs: number; animatePrice: boolean }) {
  const accent = settings.accent_color || FT_RED;
  const eff = effective(product);
  const burstText = settings.show_burst && !eff.hideBurst ? eff.burstText : null;
  const imgSrc = proxyImage(product.image_url);
  const productName = eff.name;
  const priceNow = eff.priceNow;
  const priceBefore = eff.priceBefore;
  const showSavings = eff.showSavings;
  const savings = eff.savings;
  const showQr = settings.show_product_qr && !eff.hideQr;
  const showStock = settings.show_stock_status && product.in_stock != null;
  const stockOnStock = product.in_stock === true;
  const bullets = (product.bullets || []).slice(0, 3);

  // Burst-size — fixed px så PriceBurst SVG ikke trenger å re-rendre
  const burstSize = landscape ? 180 : 140;
  const burstPrimary = landscape ? 48 : 36;

  // Pris-reveal-animasjon: scale + fade når aktiv
  const priceAnim: React.CSSProperties = animatePrice ? {
    opacity: active ? 1 : 0,
    transform: active ? "scale(1)" : "scale(0.85)",
    transition: "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) 250ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 250ms",
  } : {};

  const StockPill = showStock ? (
    <span style={{
      fontFamily: HEAD, fontWeight: 800,
      fontSize: landscape ? "1.4cqh" : "1.1cqh",
      color: "#fff",
      background: stockOnStock ? "#16a34a" : "#a3a3a3",
      padding: "0.6cqh 1.4cqh", borderRadius: 999,
      letterSpacing: "0.08em", textTransform: "uppercase",
    }}>{stockOnStock ? "På lager" : "Bestilling"}</span>
  ) : null;

  if (landscape) {
    return (
      <div style={{
        width: "100%", height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr",
        background: FT_INK, position: "relative", overflow: "hidden",
      }}>
        {/* Venstre — bilde med Ken Burns */}
        <div style={{ position: "relative", overflow: "hidden", background: "#f5f7fa" }}>
          {imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc} alt={product.name || "Produkt"} style={{
              position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain",
              transform: active ? "scale(1.06)" : "scale(1.0)",
              transition: `transform ${durationMs}ms ease-out`,
            }} />
          ) : (
            <div style={{
              width: "100%", height: "100%", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#9ca3af", fontFamily: MONO, fontSize: "1.8cqh",
              letterSpacing: "0.18em",
            }}>[ PRODUKTBILDE ]</div>
          )}
          {burstText && (
            <div style={{ position: "absolute", top: "5cqh", left: "5cqh" }}>
              <PriceBurst variant="bullseye" size={burstSize} primary={burstText} secondary={eff.burstSubLabel || ""} primarySize={burstPrimary} />
            </div>
          )}
          {showQr && (
            <div style={{ position: "absolute", bottom: "3cqh", right: "3cqh", background: "#fff", padding: "1cqh", borderRadius: "0.6cqh", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6cqh" }}>
              <QrCode url={product.source_url} size={120} utmSource="prisplakat" utmMedium="slideshow" />
              <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: "1.1cqh", color: "#0f1115", letterSpacing: "0.12em", textTransform: "uppercase" }}>Skann →</div>
            </div>
          )}
        </div>

        {/* Høyre — info */}
        <div style={{
          background: FT_INK, color: "#fff", padding: "8cqh",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          minWidth: 0, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "2cqh" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brosjyre/factory-store-stacked-white.png" alt="Factory Store by Fosen Tools" style={{ height: "7cqh", width: "auto", flexShrink: 0 }} />
            <div style={{
              fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.28em",
              fontSize: "1.4cqh", color: "rgba(255,255,255,0.6)", textTransform: "uppercase",
            }}>BREKSTAD</div>
            {StockPill && <div style={{ marginLeft: "auto" }}>{StockPill}</div>}
          </div>

          {/* Produkt-info */}
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.18em",
              fontSize: "1.6cqh", textTransform: "uppercase", color: accent,
              marginBottom: "1.5cqh",
            }}>{product.manufacturer || "PRODUKT"}</div>
            <div style={{
              fontFamily: HEAD, fontWeight: 900,
              fontSize: "5.5cqh", lineHeight: 0.98, textTransform: "uppercase",
              display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>{productName}</div>
            <div style={{
              fontFamily: MONO, fontSize: "1.6cqh",
              color: "rgba(255,255,255,0.55)", marginTop: "2cqh", letterSpacing: "0.04em",
            }}>Art.nr {product.sku || "—"}</div>
            {bullets.length > 0 && (
              <div style={{ marginTop: "3cqh", display: "flex", flexDirection: "column", gap: "1.4cqh" }}>
                {bullets.map((b, i) => (
                  <div key={i} style={{ display: "flex", gap: "1.6cqh", alignItems: "flex-start" }}>
                    <div style={{ width: "1cqh", height: "1cqh", borderRadius: "50%", background: accent, marginTop: "1cqh", flexShrink: 0 }} />
                    <div style={{
                      fontFamily: HEAD, fontWeight: 600, fontSize: "2.2cqh", lineHeight: 1.25,
                      color: "rgba(255,255,255,0.82)",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>{b}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pris */}
          <div style={{ display: "flex", alignItems: "stretch", gap: "2.5cqh", minWidth: 0, ...priceAnim }}>
            <div style={{ width: "1cqh", background: accent, alignSelf: "stretch", flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              {showSavings && (
                <div style={{
                  fontFamily: MONO, fontSize: "2.2cqh",
                  color: "rgba(255,255,255,0.45)",
                  textDecorationLine: "line-through", textDecorationColor: accent, textDecorationThickness: 2,
                  lineHeight: 1,
                }}>FØR {formatNOK(priceBefore)}</div>
              )}
              <div style={{
                fontFamily: HEAD, fontWeight: 900,
                fontSize: "16cqh", color: accent, lineHeight: 0.92,
                marginTop: "0.5cqh", whiteSpace: "nowrap",
                letterSpacing: "-0.02em",
              }}>{formatNOK(priceNow)}</div>
              <div style={{
                fontFamily: MONO, fontSize: "1.6cqh",
                color: "rgba(255,255,255,0.55)", marginTop: "1cqh",
                display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1.5cqh",
              }}>
                <span>Eks. mva</span>
                {savings > 0 && (
                  <span style={{
                    fontFamily: HEAD, fontWeight: 800, fontSize: "1.4cqh",
                    color: "#fff", background: accent,
                    padding: "0.6cqh 1.4cqh", borderRadius: 999,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                  }}>SPAR {formatNOK(savings)}</span>
                )}
                {settings.show_burst && <span style={{ opacity: 0.6 }}>· Mens lageret rekker</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Progress-bar */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          height: "0.6cqh", background: "rgba(255,255,255,0.12)",
        }}>
          <div style={{
            height: "100%", background: accent,
            width: active ? "100%" : "0%",
            transition: active ? `width ${durationMs}ms linear` : "none",
          }} />
        </div>
      </div>
    );
  }

  // PORTRETT — bilde over, info under
  return (
    <div style={{
      width: "100%", height: "100%", display: "grid", gridTemplateRows: "55% 45%",
      background: FT_INK, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "relative", overflow: "hidden", background: "#f5f7fa" }}>
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={product.name || "Produkt"} style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain",
            transform: active ? "scale(1.06)" : "scale(1.0)",
            transition: `transform ${durationMs}ms ease-out`,
          }} />
        ) : (
          <div style={{
            width: "100%", height: "100%", display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "#9ca3af", fontFamily: MONO,
          }}>[ BILDE ]</div>
        )}
        {burstText && (
          <div style={{ position: "absolute", top: "3cqh", right: "3cqh" }}>
            <PriceBurst variant="bullseye" size={burstSize} primary={burstText} secondary={eff.burstSubLabel || ""} primarySize={burstPrimary} />
          </div>
        )}
        {showQr && (
          <div style={{ position: "absolute", bottom: "2cqh", right: "2cqh", background: "#fff", padding: "0.8cqh", borderRadius: "0.6cqh" }}>
            <QrCode url={product.source_url} size={80} utmSource="prisplakat" utmMedium="slideshow" />
          </div>
        )}
      </div>
      <div style={{
        background: FT_INK, color: "#fff", padding: "5cqh",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        minWidth: 0,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5cqh" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brosjyre/factory-store-stacked-white.png" alt="Factory Store by Fosen Tools" style={{ height: "5.4cqh", width: "auto", flexShrink: 0 }} />
          <div style={{
            fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.28em",
            fontSize: "1.1cqh", color: "rgba(255,255,255,0.6)", textTransform: "uppercase",
          }}>BREKSTAD</div>
          {StockPill && <div style={{ marginLeft: "auto" }}>{StockPill}</div>}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{
            fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.18em",
            fontSize: "1.3cqh", textTransform: "uppercase", color: accent,
            marginBottom: "1cqh",
          }}>{product.manufacturer || ""}</div>
          <div style={{
            fontFamily: HEAD, fontWeight: 900,
            fontSize: "4cqh", lineHeight: 0.98, textTransform: "uppercase",
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>{productName}</div>
          <div style={{
            fontFamily: MONO, fontSize: "1.2cqh",
            color: "rgba(255,255,255,0.55)", marginTop: "1.2cqh",
          }}>Art.nr {product.sku || "—"}</div>
        </div>

        <div style={{ display: "flex", alignItems: "stretch", gap: "2cqh", minWidth: 0, ...priceAnim }}>
          <div style={{ width: "0.8cqh", background: accent, alignSelf: "stretch", flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            {showSavings && (
              <div style={{
                fontFamily: MONO, fontSize: "1.6cqh",
                color: "rgba(255,255,255,0.45)",
                textDecorationLine: "line-through", textDecorationColor: accent, lineHeight: 1,
              }}>FØR {formatNOK(priceBefore)}</div>
            )}
            <div style={{
              fontFamily: HEAD, fontWeight: 900,
              fontSize: "11cqh", color: accent, lineHeight: 0.92,
              marginTop: "0.4cqh", whiteSpace: "nowrap",
              letterSpacing: "-0.02em",
            }}>{formatNOK(priceNow)}</div>
            <div style={{
              fontFamily: MONO, fontSize: "1.2cqh",
              color: "rgba(255,255,255,0.55)", marginTop: "1cqh",
              display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1cqh",
            }}>
              <span>Eks. mva</span>
              {savings > 0 && (
                <span style={{
                  fontFamily: HEAD, fontWeight: 800, fontSize: "1.1cqh",
                  color: "#fff", background: accent,
                  padding: "0.4cqh 1cqh", borderRadius: 999,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>SPAR {formatNOK(savings)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0,
        height: "0.6cqh", background: "rgba(255,255,255,0.12)",
      }}>
        <div style={{
          height: "100%", background: accent,
          width: active ? "100%" : "0%",
          transition: active ? `width ${durationMs}ms linear` : "none",
        }} />
      </div>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────

export function Slideshow({
  products, settings, landscape, autoplay, embedded, kioskMode,
  pinIdx, pausedOverride, onIdxChange,
}: {
  products: PricetagProduct[];
  settings: PricetagSettings;
  landscape: boolean;
  autoplay?: boolean;
  embedded?: boolean;
  /** Kiosk-spiller (UniFi US Cast Pro, Chromecast, etc) er allerede i
   * fullskjerm via OS — hopp over "KLIKK FOR FULLSKJERM"-overlayen
   * og start avspilling direkte. Skjuler også control-overlay. */
  kioskMode?: boolean;
  /** Pinner preview til denne idx — auto-advance slås av. Brukes fra editor for å fokusere på redigert slide. */
  pinIdx?: number | null;
  /** Eksternt pause-toggle — overrider internt state. */
  pausedOverride?: boolean;
  /** Rapporterer idx tilbake til parent ved manuell navigasjon. */
  onIdxChange?: (idx: number) => void;
}) {
  // Bygg slide-liste — bruker custom_slides hvis satt, ellers default (intro/credentials/certified/outro)
  const slides: SlideListItem[] = useMemo(() => {
    const customSlides = settings.custom_slides ?? defaultCustomSlides();
    return buildSlideList(products, customSlides);
  }, [products, settings.custom_slides]);

  const [rawIdx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const durationMs = (settings.seconds_per_slide ?? 12) * 1000;
  const animatePrice = settings.animate_price_reveal ?? true;
  const showClock = settings.show_clock ?? false;

  // Hvis pinIdx er satt: bruk den i stedet for internt state.
  // Klem inn i [0, slides.length) i begge tilfeller.
  const pinned = pinIdx != null;
  const idx = slides.length === 0
    ? 0
    : pinned
      ? Math.max(0, Math.min(pinIdx, slides.length - 1))
      : rawIdx % slides.length;

  // Effektiv pause-state: enten internt eller eksternt.
  const effectivePaused = paused || (pausedOverride ?? false) || pinned;

  const advance = useCallback(() => {
    setIdx((i) => {
      const next = slides.length === 0 ? 0 : (i + 1) % slides.length;
      onIdxChange?.(next);
      return next;
    });
  }, [slides.length, onIdxChange]);

  const prev = useCallback(() => {
    setIdx((i) => {
      const next = slides.length === 0 ? 0 : (i - 1 + slides.length) % slides.length;
      onIdxChange?.(next);
      return next;
    });
  }, [slides.length, onIdxChange]);

  // Auto-advance — for YouTube-slides bruker vi enten youtube_max_seconds
  // eller fallback 5 min (overstyrt av 'ended'-event under). For andre slides
  // bruker vi vanlig durationMs.
  const currentSlide = slides[idx];
  const isYouTubeSlide = currentSlide?.custom?.template === "youtube";
  // Per-slide duration override (f.eks. partner-rundell trenger lengre tid)
  const slideOverrideSec = currentSlide?.custom?.duration_seconds;
  const slideDurationMs = isYouTubeSlide
    ? (currentSlide?.custom?.youtube_max_seconds ?? 300) * 1000
    : slideOverrideSec
    ? slideOverrideSec * 1000
    : durationMs;

  useEffect(() => {
    if (effectivePaused || slides.length === 0) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(advance, slideDurationMs);
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [idx, effectivePaused, advance, slideDurationMs, slides.length]);

  // YouTube 'ended'-listener: postMessage fra iframe API. Når aktiv YT-slide
  // sender ENDED (playerState=0), advance umiddelbart.
  useEffect(() => {
    if (!isYouTubeSlide) return;
    const onMsg = (e: MessageEvent) => {
      if (typeof e.data !== "string") return;
      try {
        const data = JSON.parse(e.data);
        // YouTube IFrame API events
        if (data.event === "onStateChange" && data.info === 0) {
          // ENDED (playerState 0)
          advance();
        }
      } catch { /* ikke en YT-melding */ }
    };
    window.addEventListener("message", onMsg);

    // Request listener-mode på iframen så vi får state-events.
    // Vi sender til alle iframes innenfor siden (vanligvis 1 YT om gangen).
    const t = setTimeout(() => {
      const iframes = document.querySelectorAll("iframe");
      iframes.forEach((f) => {
        f.contentWindow?.postMessage(
          JSON.stringify({ event: "listening", id: "ytplayer" }),
          "*"
        );
      });
    }, 500);

    return () => {
      window.removeEventListener("message", onMsg);
      clearTimeout(t);
    };
  }, [isYouTubeSlide, idx, advance]);

  // Fullscreen helper — bruk documentElement som primær target, fallback til container
  const enterFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        const target = document.documentElement || containerRef.current;
        if (target?.requestFullscreen) {
          await target.requestFullscreen({ navigationUI: "hide" } as FullscreenOptions);
        }
      }
    } catch (err) {
      console.warn("Fullscreen feilet:", err);
      alert("Fullskjerm ikke tilgjengelig. Trykk F11 i nettleseren i stedet.");
    }
  }, []);

  // Keyboard. Hopper over alle shortcuts hvis brukeren skriver i et input/textarea
  // (ellers ville f/space/piler trigge mens man redigerer tekst).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;

      if (e.key === "ArrowRight") advance();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " ") { e.preventDefault(); setPaused(p => !p); }
      else if (e.key === "Escape" && document.fullscreenElement) document.exitFullscreen();
      else if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        enterFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, prev, enterFullscreen]);

  // Fullscreen change
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const renderSlide = (slide: SlideListItem, isActive: boolean) => {
    if (slide.kind === "custom" && slide.custom) {
      return <CustomSlideRenderer slide={slide.custom} allProducts={products} settings={settings} landscape={landscape} active={isActive} />;
    }
    if (slide.kind === "product" && slide.product) {
      return <ProductSlideContent product={slide.product} settings={settings} landscape={landscape} active={isActive} durationMs={durationMs} animatePrice={animatePrice} />;
    }
    return null;
  };

  const aspect = landscape ? "16 / 9" : "9 / 16";

  return (
    <div ref={containerRef} style={{
      width: embedded ? "100%" : "100vw",
      height: embedded ? "100%" : "100vh",
      background: "#000",
      position: "relative", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        aspectRatio: aspect,
        width: "100%", height: "100%",
        maxWidth: "100%", maxHeight: "100%",
        position: "relative", overflow: "hidden",
        // KRITISK: container-type så cqh-units inni virker
        containerType: "size",
      } as React.CSSProperties}>
        {slides.length === 0 && (
          <div style={{
            width: "100%", height: "100%", display: "flex",
            alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.5)", fontFamily: HEAD, fontSize: 18, letterSpacing: "0.16em", textTransform: "uppercase",
          }}>Ingen slides</div>
        )}
        {slides.map((s, i) => (
          <div key={i} style={{
            position: "absolute", inset: 0,
            opacity: i === idx ? 1 : 0,
            transition: "opacity 1.2s ease-in-out",
            pointerEvents: i === idx ? "auto" : "none",
            containerType: "size",
          } as React.CSSProperties}>
            {renderSlide(s, i === idx)}
          </div>
        ))}

        {/* Klokke-overlay (vises på alle slides) */}
        {showClock && <ClockOverlay />}

        {/* Konkurranse-varsel nederst venstre (kun når slått på for denne spillelisten) */}
        {settings.konkurranse_overlay && <KonkurranseOverlay />}

        {/* Vedvarende video-overlay — ligger UTENFOR slide-rotasjonen, så den
            spiller kontinuerlig i loop mens slidene bytter under/rundt den.
            Skjules på fullskjerm-video-sliden (ellers overlapper de). */}
        {settings.overlay_video_url && currentSlide?.custom?.template !== "video_full" && (() => {
          const h = settings.overlay_video_height ?? 34;
          const pos = settings.overlay_video_pos ?? "bottom-right";
          const isBottom = pos.startsWith("bottom");
          const isRight = pos.endsWith("right");
          // bottom-right plasseres OVER QR-call-out-en (som er ~33cqh høy nede).
          // Boksen er like brei som QR-call-out-en (33cqh) og sentrerer videoen,
          // så den ligger midtstilt over QR-teksten.
          const vert = isBottom
            ? (isRight ? { bottom: "39cqh" } : { bottom: "4cqh" })
            : { top: "4cqh" };
          const horiz = isRight ? { right: "4cqh" } : { left: "4cqh" };
          return (
            <div style={{
              position: "absolute", ...vert, ...horiz, zIndex: 4,
              width: "33cqh", display: "flex", justifyContent: "center", pointerEvents: "none",
            }}>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                src={settings.overlay_video_url}
                autoPlay loop muted playsInline
                // Fallback for kiosk-spillere som ikke alltid respekterer loop-attributtet
                onEnded={(e) => { const v = e.currentTarget; v.currentTime = 0; v.play().catch(() => {}); }}
                style={{
                  height: `${h}cqh`, width: "auto", maxWidth: "100%",
                  borderRadius: "1.6cqh", background: "#000",
                  boxShadow: "0 1cqh 3cqh rgba(0,0,0,0.4)",
                  objectFit: "contain",
                }}
              />
            </div>
          );
        })()}
      </div>

      {/* Controls overlay (vises kun når ikke i fullscreen, ikke embedded, ikke kiosk) */}
      {!isFullscreen && !embedded && !kioskMode && (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 12, background: "rgba(0,0,0,0.75)", padding: "10px 18px",
          borderRadius: 999, alignItems: "center", color: "#fff", fontSize: 13,
          zIndex: 100,
        }}>
          <button onClick={prev} style={{ background: "transparent", color: "#fff", border: "none", cursor: "pointer", fontSize: 18 }}>◀</button>
          <button onClick={() => setPaused(p => !p)} style={{ background: "transparent", color: "#fff", border: "none", cursor: "pointer", fontSize: 16 }}>
            {paused ? "▶" : "❚❚"}
          </button>
          <button onClick={advance} style={{ background: "transparent", color: "#fff", border: "none", cursor: "pointer", fontSize: 18 }}>▶</button>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)", margin: "0 6px" }} />
          <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
            {idx + 1} / {slides.length}
          </span>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)", margin: "0 6px" }} />
          <button onClick={enterFullscreen} style={{
            background: FT_RED, color: "#fff", border: "none", cursor: "pointer",
            padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>Fullskjerm</button>
        </div>
      )}

      {/* Auto-advance pause-indikator (synlig når pause) */}
      {paused && !embedded && (
        <div style={{
          position: "fixed", top: 30, right: 30,
          background: "rgba(0,0,0,0.8)", color: "#fff",
          padding: "8px 14px", borderRadius: 999,
          fontFamily: HEAD, fontSize: 12, fontWeight: 700,
          letterSpacing: "0.16em", textTransform: "uppercase", zIndex: 100,
        }}>❚❚ Pause — trykk space</div>
      )}

      {/* Auto-fullscreen prompt ved autoplay — Fullscreen API krever user-gesture.
          Skjules i kioskMode siden TV-spilleren allerede er i fullskjerm via OS. */}
      {autoplay && !isFullscreen && !embedded && !kioskMode && (
        <button
          onClick={enterFullscreen}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.85)", color: "#fff",
            border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            fontFamily: HEAD, gap: 24,
          }}
        >
          <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            KLIKK FOR FULLSKJERM
          </div>
          <div style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            Slideshow er klar — trykk hvor som helst
          </div>
          <div style={{
            marginTop: 24, padding: "12px 28px",
            background: FT_RED, color: "#fff",
            fontFamily: HEAD, fontSize: 14, fontWeight: 800,
            letterSpacing: "0.12em", textTransform: "uppercase", borderRadius: 999,
          }}>▶ Start fullskjerm</div>
        </button>
      )}
    </div>
  );
}
