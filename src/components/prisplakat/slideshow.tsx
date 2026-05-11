"use client";

// Slideshow-renderer for butikk-skjermer.
// Fullscreen-modus, auto-advance, transitions, Ken Burns på bilde.

import { useState, useEffect, useRef, useCallback } from "react";
import type { PricetagProduct, PricetagSettings } from "./types";
import { PriceBurst, Eyebrow } from "@/components/brosjyre/ft-svg";
import { formatNOK } from "@/components/brosjyre/store";
import { QrCode } from "./qr-code";

const FT_RED = "#ed1c24";
const FT_INK = "#0f1115";

// ─── Spesielle "atmosfæriske" slides — intro/credentials/avslutning ────

type SpecialSlideType = "intro" | "credentials" | "certified" | "outro";

interface Slide {
  kind: "product" | "special";
  product?: PricetagProduct;
  specialType?: SpecialSlideType;
}

function IntroSlide({ landscape }: { landscape: boolean }) {
  return (
    <div style={{
      width: "100%", height: "100%", background: FT_RED, color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 80, position: "relative",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brosjyre/Fosen-Tools_white.svg" alt="Fosen Tools" style={{ height: landscape ? 100 : 80, width: "auto", marginBottom: 40 }} />
      <div style={{ fontFamily: 'var(--ft-head-font, "Manrope", system-ui)', fontWeight: 700, letterSpacing: "0.3em", fontSize: 24, textTransform: "uppercase", opacity: 0.9 }}>
        KAMPANJE VÅR 2026
      </div>
      <div style={{ width: 80, height: 3, background: "#fff", margin: "24px 0" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brosjyre/Jubileumslogo-25aar.svg" alt="25 år" style={{ height: landscape ? 140 : 110, width: "auto", marginTop: 30 }} />
    </div>
  );
}

function CredentialsSlide({ landscape }: { landscape: boolean }) {
  return (
    <div style={{
      width: "100%", height: "100%", background: FT_INK, color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 80,
    }}>
      <Eyebrow color="rgba(255,255,255,0.55)" tracking={0.3} size={landscape ? 18 : 14}>FOSEN TOOLS-STANDARDEN</Eyebrow>
      <div style={{ width: 60, height: 3, background: FT_RED, margin: "40px 0" }} />
      <div style={{
        fontFamily: 'var(--ft-head-font, "Manrope", system-ui)', fontWeight: 900,
        fontSize: landscape ? 80 : 56, lineHeight: 1.0, textAlign: "center", textTransform: "uppercase",
      }}>
        SERTIFISERT<br/>LEVERANDØR<br/>TIL FORSVARET
      </div>
      <div style={{ marginTop: 50, fontFamily: 'var(--ft-head-font, "Manrope", system-ui)', fontWeight: 500, fontSize: landscape ? 20 : 16, letterSpacing: "0.16em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>
        SIDEN 2008  ·  HDFI  ·  CADLAB
      </div>
    </div>
  );
}

function CertifiedSlide({ landscape }: { landscape: boolean }) {
  const certs = ["MILJØFYRTÅRN", "GASELLE 2023", "25 ÅR", "4. GENERASJON", "GRØNT PUNKT"];
  return (
    <div style={{
      width: "100%", height: "100%", background: "#fff", color: FT_INK,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 80,
    }}>
      <Eyebrow color="#6b7280" tracking={0.3} size={landscape ? 16 : 12}>SERTIFISERT</Eyebrow>
      <div style={{ width: 60, height: 3, background: FT_RED, margin: "32px 0" }} />
      <div style={{
        fontFamily: 'var(--ft-head-font, "Manrope", system-ui)', fontWeight: 900,
        fontSize: landscape ? 56 : 40, lineHeight: 1.0, textAlign: "center", textTransform: "uppercase",
      }}>
        100 %<br/>FORNYBAR ENERGI
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 32, marginTop: 50 }}>
        {certs.map((c) => (
          <div key={c} style={{
            fontFamily: 'var(--ft-head-font, "Manrope", system-ui)', fontWeight: 700,
            fontSize: landscape ? 14 : 11, letterSpacing: "0.16em", color: "#111",
            padding: "10px 20px", border: "1px solid rgba(148,163,184,0.4)", borderRadius: 999,
          }}>{c}</div>
        ))}
      </div>
    </div>
  );
}

function OutroSlide({ landscape }: { landscape: boolean }) {
  return (
    <div style={{
      width: "100%", height: "100%", background: FT_INK, color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 80, position: "relative",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: FT_RED }} />
      <Eyebrow color="rgba(255,255,255,0.55)" tracking={0.3} size={landscape ? 16 : 12}>VELKOMMEN INN</Eyebrow>
      <div style={{ width: 60, height: 3, background: FT_RED, margin: "32px 0" }} />
      <div style={{
        fontFamily: 'var(--ft-head-font, "Manrope", system-ui)', fontWeight: 900,
        fontSize: landscape ? 72 : 48, lineHeight: 1.0, textAlign: "center", textTransform: "uppercase",
      }}>
        INDUSTRIGATA 1<br/>BREKSTAD
      </div>
      <div style={{ marginTop: 40, fontFamily: 'var(--ft-head-font, "Manrope", system-ui)', fontWeight: 500, fontSize: landscape ? 22 : 18, letterSpacing: "0.16em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>
        MAN — FRE  07:30 — 16:00
      </div>
      <div style={{ marginTop: 50, fontFamily: 'var(--ft-head-font, "Manrope", system-ui)', fontWeight: 900, fontSize: landscape ? 84 : 56, color: "#fff" }}>
        72 51 51 20
      </div>
      <div style={{ marginTop: 16, fontSize: landscape ? 16 : 12, fontFamily: "Roboto Mono, monospace", color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em" }}>
        fosen-tools.no
      </div>
    </div>
  );
}

// ─── Produkt-slide ────────────────────────────────────────────────────

function ProductSlideContent({
  product, settings, landscape, active, durationMs,
}: { product: PricetagProduct; settings: PricetagSettings; landscape: boolean; active: boolean; durationMs: number }) {
  const accent = settings.accent_color || FT_RED;
  const priceNow = product.price_override ?? product.price_now ?? 0;
  const priceBefore = product.price_before ?? 0;
  const showSavings = priceBefore > priceNow;
  const discountPct = showSavings && priceBefore > 0 ? Math.round((1 - priceNow / priceBefore) * 100) : 0;
  const burstText = settings.show_burst && discountPct > 0 ? `−${discountPct}%` : null;

  // Proxy bilde-URL for CORS
  let imgSrc = product.image_url || null;
  if (imgSrc) {
    try {
      const u = new URL(imgSrc);
      if (u.hostname === "mc10256fosentools.blob.core.windows.net" || u.hostname.endsWith("fosen-tools.no")) {
        imgSrc = `/api/brosjyre/image-proxy?url=${encodeURIComponent(imgSrc)}`;
      }
    } catch { /* ignore */ }
  }

  if (landscape) {
    return (
      <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", background: FT_INK }}>
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
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontFamily: "Roboto Mono, monospace" }}>
              [ PRODUKTBILDE ]
            </div>
          )}
          {burstText && (
            <div style={{ position: "absolute", top: 40, left: 40 }}>
              <PriceBurst variant="bullseye" size={180} primary={burstText} secondary="SPAR" primarySize={48} />
            </div>
          )}
        </div>

        {/* Høyre — info */}
        <div style={{ background: FT_INK, color: "#fff", padding: 80, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brosjyre/Fosen-Tools_white.svg" alt="FT" style={{ height: 36, width: "auto" }} />
              <div style={{ fontFamily: 'var(--ft-head-font, "Manrope", system-ui)', fontWeight: 700, letterSpacing: "0.3em", fontSize: 14, color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
                BREKSTAD · 25 ÅR
              </div>
            </div>
          </div>

          <div>
            <Eyebrow color={accent} tracking={0.18} size={16}>{product.manufacturer || "PRODUKT"}</Eyebrow>
            <div style={{
              fontFamily: 'var(--ft-head-font, "Manrope", system-ui)', fontWeight: 900,
              fontSize: 56, lineHeight: 1.0, textTransform: "uppercase", marginTop: 16,
            }}>{product.name}</div>
            <div style={{ fontFamily: "Roboto Mono, monospace", fontSize: 18, color: "rgba(255,255,255,0.55)", marginTop: 16, letterSpacing: "0.04em" }}>
              Art.nr {product.sku || "—"}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "stretch", gap: 24 }}>
            <div style={{ width: 8, background: accent, alignSelf: "stretch" }} />
            <div>
              {showSavings && (
                <div style={{ fontFamily: "Roboto Mono, monospace", fontSize: 24, color: "rgba(255,255,255,0.45)", textDecoration: `line-through ${accent}`, lineHeight: 1 }}>
                  FØR {formatNOK(priceBefore)}
                </div>
              )}
              <div style={{ fontFamily: 'var(--ft-head-font, "Manrope", system-ui)', fontWeight: 900, fontSize: 180, color: accent, lineHeight: 0.95, marginTop: 8 }}>
                {formatNOK(priceNow)}
              </div>
              <div style={{ fontFamily: "Roboto Mono, monospace", fontSize: 18, color: "rgba(255,255,255,0.55)", marginTop: 12 }}>
                Eks. mva  ·  Mens lageret rekker
              </div>
            </div>
          </div>
        </div>

        {/* Progress-bar */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: "rgba(255,255,255,0.1)", gridColumn: "1 / -1" }}>
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
    <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateRows: "55% 45%", background: FT_INK }}>
      <div style={{ position: "relative", overflow: "hidden", background: "#f5f7fa" }}>
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={product.name || "Produkt"} style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain",
            transform: active ? "scale(1.06)" : "scale(1.0)",
            transition: `transform ${durationMs}ms ease-out`,
          }} />
        ) : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>[ BILDE ]</div>}
        {burstText && (
          <div style={{ position: "absolute", top: 30, right: 30 }}>
            <PriceBurst variant="bullseye" size={140} primary={burstText} secondary="SPAR" primarySize={36} />
          </div>
        )}
      </div>
      <div style={{ background: FT_INK, color: "#fff", padding: 50, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <Eyebrow color={accent} tracking={0.18} size={14}>{product.manufacturer || ""}</Eyebrow>
          <div style={{
            fontFamily: 'var(--ft-head-font, "Manrope", system-ui)', fontWeight: 900,
            fontSize: 44, lineHeight: 1.0, textTransform: "uppercase", marginTop: 12,
          }}>{product.name}</div>
          <div style={{ fontFamily: "Roboto Mono, monospace", fontSize: 14, color: "rgba(255,255,255,0.55)", marginTop: 12 }}>
            Art.nr {product.sku || "—"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "stretch", gap: 16 }}>
          <div style={{ width: 6, background: accent, alignSelf: "stretch" }} />
          <div>
            {showSavings && (
              <div style={{ fontFamily: "Roboto Mono, monospace", fontSize: 16, color: "rgba(255,255,255,0.45)", textDecoration: `line-through ${accent}`, lineHeight: 1 }}>
                FØR {formatNOK(priceBefore)}
              </div>
            )}
            <div style={{ fontFamily: 'var(--ft-head-font, "Manrope", system-ui)', fontWeight: 900, fontSize: 120, color: accent, lineHeight: 0.95, marginTop: 4 }}>
              {formatNOK(priceNow)}
            </div>
            <div style={{ fontFamily: "Roboto Mono, monospace", fontSize: 14, color: "rgba(255,255,255,0.55)", marginTop: 8 }}>
              Eks. mva  ·  Mens lageret rekker
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: "rgba(255,255,255,0.1)" }}>
        <div style={{ height: "100%", background: accent, width: active ? "100%" : "0%", transition: active ? `width ${durationMs}ms linear` : "none" }} />
      </div>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────

export function Slideshow({
  products, settings, landscape, autoplay, embedded,
}: { products: PricetagProduct[]; settings: PricetagSettings; landscape: boolean; autoplay?: boolean; embedded?: boolean }) {
  // Bygg slide-liste — intro + produkter + credentials + outro
  const slides: Slide[] = [
    { kind: "special", specialType: "intro" },
    ...products.map((p) => ({ kind: "product" as const, product: p })),
    { kind: "special", specialType: "credentials" as const },
    { kind: "special", specialType: "certified" as const },
    { kind: "special", specialType: "outro" as const },
  ];

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const durationMs = (settings.seconds_per_slide ?? 12) * 1000;

  const advance = useCallback(() => {
    setIdx((i) => (i + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setIdx((i) => (i - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-advance
  useEffect(() => {
    if (paused) return;
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(advance, durationMs);
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [idx, paused, advance, durationMs]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") advance();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " ") { e.preventDefault(); setPaused(p => !p); }
      else if (e.key === "Escape" && document.fullscreenElement) document.exitFullscreen();
      else if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) document.exitFullscreen();
        else containerRef.current?.requestFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, prev]);

  // Fullscreen change
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Auto-fullscreen ved autoplay
  useEffect(() => {
    if (autoplay && containerRef.current && !document.fullscreenElement) {
      // Trenger user-gesture for fullscreen — vis "klikk for fullscreen"-overlay
    }
  }, [autoplay]);

  const renderSlide = (slide: Slide, isActive: boolean) => {
    if (slide.kind === "special") {
      if (slide.specialType === "intro") return <IntroSlide landscape={landscape} />;
      if (slide.specialType === "credentials") return <CredentialsSlide landscape={landscape} />;
      if (slide.specialType === "certified") return <CertifiedSlide landscape={landscape} />;
      if (slide.specialType === "outro") return <OutroSlide landscape={landscape} />;
    }
    if (slide.product) return <ProductSlideContent product={slide.product} settings={settings} landscape={landscape} active={isActive} durationMs={durationMs} />;
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
      }}>
        {slides.map((s, i) => (
          <div key={i} style={{
            position: "absolute", inset: 0,
            opacity: i === idx ? 1 : 0,
            transition: "opacity 1.2s ease-in-out",
            pointerEvents: i === idx ? "auto" : "none",
          }}>
            {renderSlide(s, i === idx)}
          </div>
        ))}
      </div>

      {/* Controls overlay (vises kun når ikke i fullscreen, eller på hover) */}
      {!isFullscreen && !embedded && (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 12, background: "rgba(0,0,0,0.75)", padding: "10px 18px",
          borderRadius: 999, alignItems: "center", color: "#fff", fontSize: 13,
        }}>
          <button onClick={prev} style={{ background: "transparent", color: "#fff", border: "none", cursor: "pointer", fontSize: 18 }}>◀</button>
          <button onClick={() => setPaused(p => !p)} style={{ background: "transparent", color: "#fff", border: "none", cursor: "pointer", fontSize: 16 }}>
            {paused ? "▶" : "❚❚"}
          </button>
          <button onClick={advance} style={{ background: "transparent", color: "#fff", border: "none", cursor: "pointer", fontSize: 18 }}>▶</button>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)", margin: "0 6px" }} />
          <span style={{ fontFamily: "Roboto Mono, monospace", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
            {idx + 1} / {slides.length}
          </span>
          <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.2)", margin: "0 6px" }} />
          <button onClick={() => containerRef.current?.requestFullscreen()} style={{
            background: "var(--ft-red, #ed1c24)", color: "#fff", border: "none", cursor: "pointer",
            padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>Fullskjerm</button>
        </div>
      )}
    </div>
  );
}
