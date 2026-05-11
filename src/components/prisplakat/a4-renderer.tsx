"use client";

// A4-prisplakat-render — 3 layouts (single/2-up/4-up).
// Bruker samme FT-tokens og SVG-komponenter som brosjyre-editoren.

import type { PricetagProduct, PricetagSettings } from "./types";
import { PriceBurst, Eyebrow, RedDivider } from "@/components/brosjyre/ft-svg";
import { formatNOK } from "@/components/brosjyre/store";

const FT_RED = "#ed1c24";
const FT_INK = "#0f1115";

// Mm-til-px omregning for A4 print
const A4_W_MM = 210;
const A4_H_MM = 297;

// QR-placeholder (deterministisk mønster) — vi bytter til ekte qrcode-bibliotek senere
function MiniQR({ size = 80, dark = "#111" }: { size?: number; dark?: string }) {
  const cells = 9;
  const blocks: React.ReactNode[] = [];
  for (let i = 0; i < cells * cells; i++) {
    const fill = ((i * 13 + i % 7) % 5 === 0) || (i % 4 === 0) || (i % 6 === 0);
    blocks.push(<div key={i} style={{ background: fill ? dark : "transparent" }} />);
  }
  return (
    <div style={{
      width: size, height: size, background: "#fff", display: "grid",
      gridTemplateColumns: `repeat(${cells},1fr)`, gridTemplateRows: `repeat(${cells},1fr)`,
      padding: 4, gap: 1, border: "1px solid #111",
    }}>{blocks}</div>
  );
}

function PlaceholderImage({ label, tone = "light" }: { label: string; tone?: "light" | "dark" }) {
  const bg = tone === "dark" ? "#1c1f23" : "#f5f7fa";
  const stripe = tone === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const fg = tone === "dark" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";
  return (
    <div style={{
      width: "100%", height: "100%", background: bg,
      backgroundImage: `repeating-linear-gradient(135deg, ${stripe} 0 14px, transparent 14px 28px)`,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{
        fontFamily: "Roboto Mono, monospace", fontSize: 11,
        letterSpacing: "0.18em", color: fg, textAlign: "center", padding: 12,
      }}>{label}</span>
    </div>
  );
}

function ProductImage({ src, label }: { src?: string | null; label: string }) {
  if (src) {
    // Bruk proxy for Azure blob-URL-er (CORS-safe rendering for jsPDF)
    let proxied = src;
    try {
      const u = new URL(src);
      const allowed = ["mc10256fosentools.blob.core.windows.net", "fosen-tools.no", "www.fosen-tools.no"];
      if (allowed.includes(u.hostname)) {
        proxied = `/api/brosjyre/image-proxy?url=${encodeURIComponent(src)}`;
      }
    } catch { /* ignore */ }
    return (
      <div style={{
        width: "100%", height: "100%", position: "relative", overflow: "hidden",
        background: "#f5f7fa",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={proxied} alt={label}
          style={{ display: "block", maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto" }} />
      </div>
    );
  }
  return <PlaceholderImage label={label} tone="light" />;
}

// ──────────────────────────────────────────────────────────────────────
// SINGLE — 1 produkt per A4
// ──────────────────────────────────────────────────────────────────────
export function PricetagA4Single({
  product, settings, pageW = A4_W_MM, pageH = A4_H_MM,
}: { product: PricetagProduct; settings: PricetagSettings; pageW?: number; pageH?: number }) {
  const accent = settings.accent_color || FT_RED;
  const priceNow = product.price_override ?? product.price_now ?? 0;
  const priceBefore = product.price_before ?? 0;
  const showSavings = priceBefore > priceNow;
  const savings = showSavings ? priceBefore - priceNow : 0;
  const discountPct = showSavings && priceBefore > 0
    ? Math.round((1 - priceNow / priceBefore) * 100)
    : 0;
  const burstText = settings.show_burst && discountPct > 0 ? `−${discountPct}%` : null;

  return (
    <div className="page-paper a4-pricetag" style={{
      width: `${pageW}mm`, height: `${pageH}mm`, position: "relative",
      background: "#fff", color: "#111",
      fontFamily: 'var(--ft-body-font, "Manrope", system-ui, sans-serif)',
      overflow: "hidden",
    }}>
      {/* Topp-band — svart med rød accent */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 0, height: "40mm",
        background: FT_INK, display: "flex", alignItems: "center", padding: "0 14mm",
      }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "1.5mm", background: accent }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brosjyre/Fosen-Tools_white.svg" alt="Fosen Tools"
          style={{ height: "8mm", width: "auto" }} />
        <div style={{ marginLeft: "auto", textAlign: "right", color: "#fff" }}>
          <div style={{
            fontFamily: 'var(--ft-head-font, "Manrope", system-ui, sans-serif)',
            fontWeight: 700, letterSpacing: "0.3em", fontSize: 11,
            color: "rgba(255,255,255,0.85)", textTransform: "uppercase",
          }}>KAMPANJE · VÅR 2026</div>
          <div style={{
            fontFamily: "Roboto Mono, monospace", fontSize: 9,
            color: "rgba(255,255,255,0.5)", marginTop: 3, letterSpacing: "0.08em",
          }}>BREKSTAD · 25 ÅR</div>
        </div>
      </div>

      {/* Bilde-sone */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: "40mm", height: "140mm",
        overflow: "hidden",
      }}>
        <ProductImage src={product.image_url} label={product.name || "Produkt"} />
        {/* Gradient nederst */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: "40mm",
          background: "linear-gradient(180deg, rgba(245,247,250,0) 0%, rgba(245,247,250,1) 100%)",
        }} />
        {/* Burst */}
        {burstText && (
          <div style={{ position: "absolute", top: "8mm", right: "10mm" }}>
            <PriceBurst variant="bullseye" size={110} primary={burstText} secondary="SPAR" primarySize={28} />
          </div>
        )}
      </div>

      {/* Info-blokk */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: "180mm", height: "92mm",
        padding: "8mm 14mm 0",
      }}>
        <Eyebrow tracking={0.18} size={10}>{product.manufacturer || "PRODUKT"}</Eyebrow>
        <div style={{
          fontFamily: 'var(--ft-head-font, "Manrope", system-ui, sans-serif)',
          fontWeight: 900, fontSize: 28, lineHeight: 1.05,
          textTransform: "uppercase", marginTop: "3mm", color: "#111",
        }}>{product.name || "Produkt"}</div>
        <div style={{
          fontFamily: "Roboto Mono, monospace", fontSize: 11,
          color: "#6b7280", marginTop: "2mm",
        }}>Art.nr {product.sku || "—"}</div>

        {/* Pris-blokk */}
        <div style={{
          display: "flex", alignItems: "stretch", gap: "5mm", marginTop: "6mm",
        }}>
          <div style={{ width: "4mm", background: accent, alignSelf: "stretch" }} />
          <div style={{ flex: 1 }}>
            {showSavings && (
              <div style={{
                fontFamily: "Roboto Mono, monospace", fontSize: 13,
                color: "#9ca3af", textDecoration: `line-through ${accent}`,
                textDecorationThickness: 1.5, lineHeight: 1,
              }}>FØR {formatNOK(priceBefore)}</div>
            )}
            <div style={{
              fontFamily: 'var(--ft-head-font, "Manrope", system-ui, sans-serif)',
              fontWeight: 900, fontSize: 76, color: accent,
              lineHeight: 0.95, marginTop: "2mm",
            }}>{formatNOK(priceNow)}</div>
            <div style={{
              display: "flex", alignItems: "center", gap: "3mm", marginTop: "3mm",
            }}>
              <span style={{ fontFamily: "Roboto Mono, monospace", fontSize: 11, color: "#6b7280" }}>Eks. mva</span>
              {savings > 0 && (
                <span style={{
                  fontFamily: 'var(--ft-head-font, "Manrope", system-ui, sans-serif)',
                  fontWeight: 800, fontSize: 11, color: "#fff",
                  background: accent, padding: "2mm 4mm", borderRadius: 999,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>SPAR {formatNOK(savings)}</span>
              )}
            </div>
          </div>
          {settings.show_qr && (
            <div style={{ textAlign: "center", marginLeft: "auto", alignSelf: "flex-start" }}>
              <MiniQR size={70} />
              <div style={{
                fontFamily: "Roboto Mono, monospace", fontSize: 7,
                color: "#6b7280", marginTop: "1mm", letterSpacing: "0.04em",
              }}>SCAN FOR MER</div>
            </div>
          )}
        </div>

        {/* USP bullets */}
        {(product.bullets || []).slice(0, 3).length > 0 && (
          <ul style={{
            listStyle: "none", padding: 0, margin: "8mm 0 0",
            display: "flex", flexDirection: "column", gap: "2mm",
          }}>
            {(product.bullets || []).slice(0, 3).map((b, i) => (
              <li key={i} style={{
                display: "flex", gap: "3mm", alignItems: "flex-start",
                fontSize: 12, lineHeight: 1.45, color: "#374151",
              }}>
                <span style={{
                  width: "1mm", alignSelf: "stretch", background: accent, flex: "0 0 auto",
                  marginTop: "1mm", marginBottom: "1mm",
                }} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer-bånd */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: "17mm",
        background: FT_INK, color: "#fff", padding: "5mm 14mm",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{
          fontFamily: 'var(--ft-head-font, "Manrope", system-ui, sans-serif)',
          fontWeight: 800, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase",
        }}>FOSEN-TOOLS.NO  ·  72 51 51 20</div>
        <div style={{
          fontFamily: "Roboto Mono, monospace", fontSize: 9,
          color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em",
        }}>INDUSTRIGATA 1, 7130 BREKSTAD  ·  MILJØFYRTÅRN · 25 ÅR</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 2-UP — 2 produkter per A4 (sammenligning eller pakke)
// ──────────────────────────────────────────────────────────────────────
export function PricetagA4_2Up({
  products, settings, pageW = A4_W_MM, pageH = A4_H_MM,
}: { products: PricetagProduct[]; settings: PricetagSettings; pageW?: number; pageH?: number }) {
  const [p1, p2] = [products[0], products[1]];
  const accent = settings.accent_color || FT_RED;

  return (
    <div className="page-paper a4-pricetag" style={{
      width: `${pageW}mm`, height: `${pageH}mm`, position: "relative",
      background: "#fff", overflow: "hidden",
      fontFamily: 'var(--ft-body-font, "Manrope", system-ui, sans-serif)',
    }}>
      {/* Topp-band */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 0, height: "32mm",
        background: FT_INK, display: "flex", alignItems: "center", padding: "0 14mm",
      }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "1.5mm", background: accent }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brosjyre/Fosen-Tools_white.svg" alt="Fosen Tools"
          style={{ height: "7mm", width: "auto" }} />
        <div style={{ marginLeft: "auto", color: "#fff" }}>
          <div style={{
            fontFamily: 'var(--ft-head-font, "Manrope", system-ui, sans-serif)',
            fontWeight: 800, letterSpacing: "0.3em", fontSize: 10,
            textTransform: "uppercase",
          }}>SAMMENLIGN  ·  VÅR 2026</div>
        </div>
      </div>

      {/* 2 produkt-sone, vertikalt delt med rød divider — flexbox */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: "32mm", bottom: "17mm",
        display: "flex",
      }}>
        {p1 && <div style={{ flex: 1, minWidth: 0 }}><PricetagHalfCell product={p1} settings={settings} accent={accent} /></div>}
        <div style={{ width: "1mm", background: accent, alignSelf: "stretch" }} />
        {p2 && <div style={{ flex: 1, minWidth: 0 }}><PricetagHalfCell product={p2} settings={settings} accent={accent} /></div>}
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: "17mm",
        background: FT_INK, color: "#fff", padding: "5mm 14mm",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{
          fontFamily: 'var(--ft-head-font, "Manrope", system-ui, sans-serif)',
          fontWeight: 800, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase",
        }}>FOSEN-TOOLS.NO  ·  72 51 51 20</div>
        <div style={{
          fontFamily: "Roboto Mono, monospace", fontSize: 9,
          color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em",
        }}>INDUSTRIGATA 1, 7130 BREKSTAD</div>
      </div>
    </div>
  );
}

function PricetagHalfCell({
  product, settings, accent,
}: { product: PricetagProduct; settings: PricetagSettings; accent: string }) {
  const priceNow = product.price_override ?? product.price_now ?? 0;
  const priceBefore = product.price_before ?? 0;
  const showSavings = priceBefore > priceNow;
  const discountPct = showSavings && priceBefore > 0 ? Math.round((1 - priceNow / priceBefore) * 100) : 0;
  const burstText = settings.show_burst && discountPct > 0 ? `−${discountPct}%` : null;

  return (
    <div style={{ position: "relative", padding: "8mm 10mm", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ height: "85mm", position: "relative", marginBottom: "5mm" }}>
        <ProductImage src={product.image_url} label={product.name || "Produkt"} />
        {burstText && (
          <div style={{ position: "absolute", top: "3mm", right: "3mm" }}>
            <PriceBurst variant="bullseye" size={70} primary={burstText} secondary="SPAR" primarySize={18} />
          </div>
        )}
      </div>
      <Eyebrow tracking={0.16} size={9}>{product.manufacturer || ""}</Eyebrow>
      <div style={{
        fontFamily: 'var(--ft-head-font, "Manrope", system-ui, sans-serif)',
        fontWeight: 900, fontSize: 18, lineHeight: 1.1,
        textTransform: "uppercase", marginTop: "2mm", color: "#111",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>{product.name}</div>
      <div style={{
        fontFamily: "Roboto Mono, monospace", fontSize: 9,
        color: "#6b7280", marginTop: "1mm",
      }}>Art.nr {product.sku || "—"}</div>
      <div style={{ display: "flex", gap: "3mm", alignItems: "stretch", marginTop: "4mm" }}>
        <div style={{ width: "3mm", background: accent }} />
        <div>
          {showSavings && (
            <div style={{
              fontFamily: "Roboto Mono, monospace", fontSize: 10,
              color: "#9ca3af", textDecoration: `line-through ${accent}`, lineHeight: 1,
            }}>FØR {formatNOK(priceBefore)}</div>
          )}
          <div style={{
            fontFamily: 'var(--ft-head-font, "Manrope", system-ui, sans-serif)',
            fontWeight: 900, fontSize: 36, color: accent, lineHeight: 0.95, marginTop: "1mm",
          }}>{formatNOK(priceNow)}</div>
          <div style={{ fontFamily: "Roboto Mono, monospace", fontSize: 8, color: "#6b7280", marginTop: "1mm" }}>Eks. mva</div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 4-UP — 4 produkter per A4 (grid for hyllekant-plakater)
// ──────────────────────────────────────────────────────────────────────
export function PricetagA4_4Up({
  products, settings, pageW = A4_W_MM, pageH = A4_H_MM,
}: { products: PricetagProduct[]; settings: PricetagSettings; pageW?: number; pageH?: number }) {
  const accent = settings.accent_color || FT_RED;

  return (
    <div className="page-paper a4-pricetag" style={{
      width: `${pageW}mm`, height: `${pageH}mm`, position: "relative",
      background: "#fff", overflow: "hidden",
      fontFamily: 'var(--ft-body-font, "Manrope", system-ui, sans-serif)',
    }}>
      {/* Topp-band */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 0, height: "22mm",
        background: FT_INK, display: "flex", alignItems: "center", padding: "0 12mm",
      }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "1.5mm", background: accent }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brosjyre/Fosen-Tools_white.svg" alt="Fosen Tools" style={{ height: "6mm", width: "auto" }} />
        <div style={{ marginLeft: "auto", color: "#fff" }}>
          <div style={{
            fontFamily: 'var(--ft-head-font, "Manrope", system-ui, sans-serif)',
            fontWeight: 800, letterSpacing: "0.3em", fontSize: 9,
            textTransform: "uppercase",
          }}>HYLLEKANT-PLAKATER  ·  VÅR 2026</div>
        </div>
      </div>

      {/* 2×2 grid */}
      <div style={{
        position: "absolute", left: "10mm", right: "10mm", top: "30mm", bottom: "20mm",
        display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr",
        gap: "5mm",
      }}>
        {[0, 1, 2, 3].map(i => {
          const p = products[i];
          if (!p) return <div key={i} style={{ background: "#f5f7fa", border: "1px dashed #d1d5db" }} />;
          return <PricetagQuarterCell key={i} product={p} settings={settings} accent={accent} />;
        })}
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: "13mm",
        background: FT_INK, color: "#fff", padding: "4mm 12mm",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{
          fontFamily: 'var(--ft-head-font, "Manrope", system-ui, sans-serif)',
          fontWeight: 800, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase",
        }}>FOSEN-TOOLS.NO  ·  72 51 51 20  ·  BREKSTAD</div>
        <div style={{
          fontFamily: "Roboto Mono, monospace", fontSize: 8,
          color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em",
        }}>MILJØFYRTÅRN · 25 ÅR I BRANSJEN</div>
      </div>
    </div>
  );
}

function PricetagQuarterCell({
  product, settings, accent,
}: { product: PricetagProduct; settings: PricetagSettings; accent: string }) {
  const priceNow = product.price_override ?? product.price_now ?? 0;
  const priceBefore = product.price_before ?? 0;
  const showSavings = priceBefore > priceNow;
  const discountPct = showSavings && priceBefore > 0 ? Math.round((1 - priceNow / priceBefore) * 100) : 0;
  const burstText = settings.show_burst && discountPct > 0 ? `−${discountPct}%` : null;

  return (
    <div style={{
      background: "#fff", borderLeft: `2mm solid ${accent}`, borderRight: `2mm solid ${accent}`,
      borderTop: "0.5mm solid rgba(148,163,184,0.4)", borderBottom: "0.5mm solid rgba(148,163,184,0.4)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ height: "55%", position: "relative" }}>
        <ProductImage src={product.image_url} label={product.name || "Produkt"} />
        {burstText && (
          <div style={{ position: "absolute", top: "2mm", right: "2mm" }}>
            <PriceBurst variant="bullseye" size={42} primary={burstText} secondary={null} primarySize={11} />
          </div>
        )}
      </div>
      <div style={{ padding: "3mm 4mm", flex: 1, display: "flex", flexDirection: "column" }}>
        <Eyebrow tracking={0.16} size={7}>{product.manufacturer || ""}</Eyebrow>
        <div style={{
          fontFamily: 'var(--ft-head-font, "Manrope", system-ui, sans-serif)',
          fontWeight: 900, fontSize: 11, lineHeight: 1.1,
          textTransform: "uppercase", marginTop: "1mm", color: "#111",
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{product.name}</div>
        <div style={{
          fontFamily: "Roboto Mono, monospace", fontSize: 7,
          color: "#6b7280", marginTop: "0.5mm",
        }}>Art.nr {product.sku || "—"}</div>
        <div style={{ marginTop: "auto", display: "flex", gap: "2mm", alignItems: "stretch" }}>
          <div style={{ width: "1.5mm", background: accent }} />
          <div>
            {showSavings && (
              <div style={{
                fontFamily: "Roboto Mono, monospace", fontSize: 7,
                color: "#9ca3af", textDecoration: `line-through ${accent}`, lineHeight: 1,
              }}>FØR {formatNOK(priceBefore)}</div>
            )}
            <div style={{
              fontFamily: 'var(--ft-head-font, "Manrope", system-ui, sans-serif)',
              fontWeight: 900, fontSize: 20, color: accent, lineHeight: 0.95, marginTop: "0.5mm",
            }}>{formatNOK(priceNow)}</div>
            <div style={{ fontFamily: "Roboto Mono, monospace", fontSize: 6, color: "#6b7280" }}>Eks. mva</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Suppress unused-eyebrow / divider warnings (vi importerer for fremtidig bruk i settings-UI)
void Eyebrow; void RedDivider;
