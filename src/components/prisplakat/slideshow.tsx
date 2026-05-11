"use client";

// Slideshow-renderer for butikk-skjermer.
// Bruker container queries (cqh) så ALLE størrelser skalerer proporsjonalt
// med container-høyden — fungerer like bra på 1920×1080 som i embedded preview.

import { useState, useEffect, useRef, useCallback } from "react";
import type { PricetagProduct, PricetagSettings } from "./types";
import { effective } from "./types";
import { PriceBurst } from "@/components/brosjyre/ft-svg";
import { formatNOK } from "@/components/brosjyre/store";

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

// ─── Spesielle "atmosfæriske" slides — intro/credentials/avslutning ────

type SpecialSlideType = "intro" | "credentials" | "certified" | "outro";

interface Slide {
  kind: "product" | "special";
  product?: PricetagProduct;
  specialType?: SpecialSlideType;
}

function IntroSlide() {
  return (
    <div style={{
      width: "100%", height: "100%", background: FT_RED, color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "8cqh",
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brosjyre/Fosen-Tools_white.svg" alt="Fosen Tools" style={{ width: "40%", maxHeight: "12cqh", marginBottom: "4cqh" }} />
      <div style={{
        fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.3em",
        fontSize: "2.4cqh", textTransform: "uppercase", opacity: 0.92,
      }}>KAMPANJE VÅR 2026</div>
      <div style={{ width: "8cqh", height: "0.3cqh", background: "#fff", margin: "3cqh 0" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brosjyre/Jubileumslogo-25aar.svg" alt="25 år" style={{ width: "32%", maxHeight: "16cqh", marginTop: "3cqh" }} />
    </div>
  );
}

function CredentialsSlide() {
  return (
    <div style={{
      width: "100%", height: "100%", background: FT_INK, color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "8cqh", textAlign: "center",
    }}>
      <div style={{
        fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.3em",
        fontSize: "1.8cqh", textTransform: "uppercase", color: "rgba(255,255,255,0.55)",
      }}>FOSEN TOOLS-STANDARDEN</div>
      <div style={{ width: "8cqh", height: "0.4cqh", background: FT_RED, margin: "4cqh 0" }} />
      <div style={{
        fontFamily: HEAD, fontWeight: 900,
        fontSize: "9cqh", lineHeight: 0.95, textTransform: "uppercase",
      }}>
        SERTIFISERT<br/>LEVERANDØR<br/>TIL FORSVARET
      </div>
      <div style={{
        marginTop: "5cqh", fontFamily: HEAD, fontWeight: 500,
        fontSize: "1.8cqh", letterSpacing: "0.16em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase",
      }}>
        HDFI  ·  CADLAB  ·  BREKSTAD
      </div>
    </div>
  );
}

function CertifiedSlide() {
  const certs = ["MILJØFYRTÅRN", "GASELLE 2023", "25 ÅR", "4. GENERASJON", "GRØNT PUNKT"];
  return (
    <div style={{
      width: "100%", height: "100%", background: "#fff", color: FT_INK,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "8cqh", textAlign: "center",
    }}>
      <div style={{
        fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.3em",
        fontSize: "1.6cqh", textTransform: "uppercase", color: "#6b7280",
      }}>SERTIFISERT</div>
      <div style={{ width: "8cqh", height: "0.4cqh", background: FT_RED, margin: "4cqh 0" }} />
      <div style={{
        fontFamily: HEAD, fontWeight: 900,
        fontSize: "7cqh", lineHeight: 0.95, textTransform: "uppercase",
      }}>
        100 %<br/>FORNYBAR ENERGI
      </div>
      <div style={{
        display: "flex", flexWrap: "wrap", justifyContent: "center",
        gap: "3cqh", marginTop: "5cqh",
      }}>
        {certs.map((c) => (
          <div key={c} style={{
            fontFamily: HEAD, fontWeight: 700,
            fontSize: "1.4cqh", letterSpacing: "0.16em", color: "#111",
            padding: "1.2cqh 2.4cqh", border: "1px solid rgba(148,163,184,0.4)", borderRadius: 999,
          }}>{c}</div>
        ))}
      </div>
    </div>
  );
}

function OutroSlide() {
  return (
    <div style={{
      width: "100%", height: "100%", background: FT_INK, color: "#fff",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "8cqh", textAlign: "center", position: "relative",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "0.8cqh", background: FT_RED }} />
      <div style={{
        fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.3em",
        fontSize: "1.6cqh", textTransform: "uppercase", color: "rgba(255,255,255,0.55)",
      }}>VELKOMMEN INN</div>
      <div style={{ width: "8cqh", height: "0.4cqh", background: FT_RED, margin: "4cqh 0" }} />
      <div style={{
        fontFamily: HEAD, fontWeight: 900,
        fontSize: "8cqh", lineHeight: 0.95, textTransform: "uppercase",
      }}>
        INDUSTRIGATA 1<br/>BREKSTAD
      </div>
      <div style={{
        marginTop: "4cqh", fontFamily: HEAD, fontWeight: 500,
        fontSize: "2.2cqh", letterSpacing: "0.16em", color: "rgba(255,255,255,0.55)", textTransform: "uppercase",
      }}>
        MAN — FRE  07:00 — 15:00
      </div>
      <div style={{
        marginTop: "5cqh", fontFamily: HEAD, fontWeight: 900,
        fontSize: "10cqh", color: "#fff",
      }}>
        72 51 51 20
      </div>
      <div style={{
        marginTop: "2cqh", fontSize: "1.8cqh", fontFamily: MONO,
        color: "rgba(255,255,255,0.55)", letterSpacing: "0.08em",
      }}>
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
  const eff = effective(product);
  const burstText = settings.show_burst && !eff.hideBurst ? eff.burstText : null;
  const imgSrc = proxyImage(product.image_url);
  const productName = eff.name;
  const priceNow = eff.priceNow;
  const priceBefore = eff.priceBefore;
  const showSavings = eff.showSavings;
  const savings = eff.savings;

  // Burst-size — fixed px så PriceBurst SVG ikke trenger å re-rendre
  const burstSize = landscape ? 180 : 140;
  const burstPrimary = landscape ? 48 : 36;

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
              <PriceBurst variant="bullseye" size={burstSize} primary={burstText} secondary="SPAR" primarySize={burstPrimary} />
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
            <img src="/brosjyre/Fosen-Tools_white.svg" alt="FT" style={{ height: "3.2cqh", width: "auto", flexShrink: 0 }} />
            <div style={{
              fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.28em",
              fontSize: "1.4cqh", color: "rgba(255,255,255,0.6)", textTransform: "uppercase",
            }}>BREKSTAD · 25 ÅR</div>
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
          </div>

          {/* Pris */}
          <div style={{ display: "flex", alignItems: "stretch", gap: "2.5cqh", minWidth: 0 }}>
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
                <span style={{ opacity: 0.6 }}>· Mens lageret rekker</span>
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
            <PriceBurst variant="bullseye" size={burstSize} primary={burstText} secondary="SPAR" primarySize={burstPrimary} />
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
          <img src="/brosjyre/Fosen-Tools_white.svg" alt="FT" style={{ height: "2.4cqh", width: "auto", flexShrink: 0 }} />
          <div style={{
            fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.28em",
            fontSize: "1.1cqh", color: "rgba(255,255,255,0.6)", textTransform: "uppercase",
          }}>BREKSTAD · 25 ÅR</div>
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

        <div style={{ display: "flex", alignItems: "stretch", gap: "2cqh", minWidth: 0 }}>
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

  // Fullscreen helper — bruk documentElement som primær target, fallback til container
  const enterFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        // Prøv documentElement først (mer pålitelig), fallback til container
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

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") advance();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " ") { e.preventDefault(); setPaused(p => !p); }
      else if (e.key === "Escape" && document.fullscreenElement) document.exitFullscreen();
      else if (e.key === "f" || e.key === "F") enterFullscreen();
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

  const renderSlide = (slide: Slide, isActive: boolean) => {
    if (slide.kind === "special") {
      if (slide.specialType === "intro") return <IntroSlide />;
      if (slide.specialType === "credentials") return <CredentialsSlide />;
      if (slide.specialType === "certified") return <CertifiedSlide />;
      if (slide.specialType === "outro") return <OutroSlide />;
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
        // KRITISK: container-type så cqh-units inni virker
        containerType: "size",
      } as React.CSSProperties}>
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
      </div>

      {/* Controls overlay (vises kun når ikke i fullscreen, og ikke embedded) */}
      {!isFullscreen && !embedded && (
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

      {/* Auto-fullscreen prompt ved autoplay — Fullscreen API krever user-gesture */}
      {autoplay && !isFullscreen && !embedded && (
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

