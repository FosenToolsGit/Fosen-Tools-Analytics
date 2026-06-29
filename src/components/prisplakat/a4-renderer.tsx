"use client";

// A4-prisplakat-render — 3 layouts (single/2-up/4-up).
// Bruker samme FT-tokens og SVG-komponenter som brosjyre-editoren.

import type { PricetagProduct, PricetagSettings } from "./types";
import { effective } from "./types";
import { PriceBurst, Eyebrow, RedDivider } from "@/components/brosjyre/ft-svg";
import { formatNOK } from "@/components/brosjyre/store";
import { QrCode } from "./qr-code";

const FT_RED = "#ed1c24";
const FT_INK = "#0f1115";

// Mm-til-px omregning for A4 print
const A4_W_MM = 210;
const A4_H_MM = 297;

// (MiniQR-placeholder fjernet — bruker nå QrCode med ekte SVG-rendering)

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

const HEAD_FONT = 'var(--ft-head-font, "Manrope", system-ui, sans-serif)';
const MONO = "Roboto Mono, monospace";

// Felles Factory Store-toppbånd: FS-logo venstre + jubileumslogoer (100/25) høyre.
function FactoryTopBand({ h = 34, accent }: { h?: number; accent: string }) {
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, top: 0, height: `${h}mm`,
      background: FT_INK, display: "flex", alignItems: "center", padding: "0 14mm",
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "1.6mm", background: accent }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brosjyre/factory-store-stacked-white.png" alt="Factory Store by Fosen Tools"
        style={{ height: `${h * 0.6}mm`, width: "auto" }} />
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6mm" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brosjyre/Jubileumslogo-100aar.svg" alt="100 år" style={{ height: `${h * 0.36}mm`, width: "auto" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brosjyre/Jubileumslogo-25aar.svg" alt="25 år" style={{ height: `${h * 0.46}mm`, width: "auto" }} />
      </div>
    </div>
  );
}

// Felles footer-bånd.
function FtFooter({ h = 17 }: { h?: number }) {
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0, height: `${h}mm`,
      background: FT_INK, color: "#fff", padding: "0 14mm",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div style={{ fontFamily: HEAD_FONT, fontWeight: 800, fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" }}>
        FOSEN-TOOLS.NO  ·  72 51 51 20
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em" }}>
        INDUSTRIGATA 1, 7130 BREKSTAD
      </div>
    </div>
  );
}

// Rund rabatt-burst (flat sirkel + myk skygge). border-radius+box-shadow rendrer
// riktig i modern-screenshot (i motsetning til Playwright print).
function DiscBurst({ text, sizeMm, accent }: { text: string; sizeMm: number; accent: string }) {
  return (
    <div style={{
      width: `${sizeMm}mm`, height: `${sizeMm}mm`, borderRadius: "50%",
      background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: HEAD_FONT, fontWeight: 900, fontSize: sizeMm * 3.0, lineHeight: 0.9,
      transform: "rotate(-8deg)", boxShadow: "0 1.5mm 4mm rgba(15,17,21,0.25)",
    }}>{text}</div>
  );
}

// Pris-blokk gjenbrukt av single + variant-kort: Veil.-strek + stor pris + Eks. mva + Spar-boks.
function PriceBlock({
  priceNow, priceBefore, showSavings, savings, accent,
  priceSize = 76, custom,
}: {
  priceNow: number; priceBefore: number; showSavings: boolean; savings: number;
  accent: string; priceSize?: number; custom?: { title: string; body: string };
}) {
  if (custom) {
    return (
      <div>
        <div style={{ fontFamily: HEAD_FONT, fontWeight: 900, fontSize: priceSize * 0.34, color: accent, lineHeight: 1.05, textTransform: "uppercase" }}>{custom.title}</div>
        {custom.body && <div style={{ fontSize: priceSize * 0.21, color: "#6b7280", marginTop: "2.5mm", lineHeight: 1.4, maxWidth: "88%" }}>{custom.body}</div>}
      </div>
    );
  }
  return (
    <div>
      {showSavings && (
        <div style={{ fontFamily: MONO, fontSize: priceSize * 0.22, color: "#9ca3af", marginBottom: "1mm" }}>
          Veil. <span style={{ textDecorationLine: "line-through", textDecorationColor: accent }}>{formatNOK(priceBefore)}</span>
        </div>
      )}
      <div style={{ fontFamily: HEAD_FONT, fontWeight: 900, fontSize: priceSize, color: accent, lineHeight: 0.9, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
        {formatNOK(priceNow)}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "4mm", marginTop: "2.5mm", flexWrap: "wrap" }}>
        <span style={{ fontFamily: MONO, fontSize: priceSize * 0.17, color: "#6b7280" }}>Eks. mva</span>
        {savings > 0 && (
          <span style={{ fontFamily: HEAD_FONT, fontWeight: 800, fontSize: priceSize * 0.22, color: "#fff", background: accent, padding: "1.5mm 4mm", borderRadius: "2mm" }}>
            Spar {formatNOK(savings)}
          </span>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// SINGLE — 1 produkt per A4
// ──────────────────────────────────────────────────────────────────────
export function PricetagA4Single({
  product, settings, pageW = A4_W_MM, pageH = A4_H_MM,
}: { product: PricetagProduct; settings: PricetagSettings; pageW?: number; pageH?: number }) {
  const accent = settings.accent_color || FT_RED;
  const eff = effective(product);
  const { priceNow, priceBefore, showSavings, savings } = eff;
  const burstText = settings.show_burst && !eff.hideBurst ? eff.burstText : null;
  const productName = eff.name || "Produkt";
  const showQr = settings.show_qr && !eff.hideQr;

  return (
    <div className="page-paper a4-pricetag" style={{
      width: `${pageW}mm`, height: `${pageH}mm`, position: "relative",
      background: "#fff", color: "#111",
      fontFamily: 'var(--ft-body-font, "Manrope", system-ui, sans-serif)',
      overflow: "hidden",
    }}>
      {/* Factory Store-toppbånd */}
      <FactoryTopBand h={34} accent={accent} />

      {/* Bilde-sone */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: "34mm", height: "116mm",
        background: "#f5f7fa", overflow: "hidden",
      }}>
        <ProductImage src={product.image_url} label={product.name || "Produkt"} />
        {/* Gradient nederst */}
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0, height: "24mm",
          background: "linear-gradient(180deg, rgba(245,247,250,0) 0%, rgba(245,247,250,1) 100%)",
        }} />
        {/* Burst */}
        {burstText && (
          <div style={{ position: "absolute", top: "9mm", right: "14mm" }}>
            <DiscBurst text={burstText} sizeMm={40} accent={accent} />
          </div>
        )}
      </div>

      {/* Info-blokk */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: "150mm", bottom: "14mm",
        padding: "10mm 14mm 0",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{ fontFamily: HEAD_FONT, fontWeight: 800, letterSpacing: "0.18em", fontSize: 13, textTransform: "uppercase", color: accent, flexShrink: 0 }}>
          {product.manufacturer || "PRODUKT"}
        </div>
        <div style={{
          fontFamily: HEAD_FONT, fontWeight: 900, fontSize: 34, lineHeight: 1.0,
          textTransform: "uppercase", marginTop: "3mm", color: "#111", flexShrink: 0,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>{productName}</div>
        <div style={{ fontFamily: MONO, fontSize: 13, color: "#6b7280", marginTop: "2mm", flexShrink: 0 }}>
          Art.nr {product.sku || "—"}
        </div>

        {/* Pris-blokk — marginTop:auto dytter den ned, flexShrink:0 så den aldri klippes */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "6mm", marginTop: "auto", paddingBottom: "4mm", flexShrink: 0 }}>
          <div style={{ width: "7mm", background: accent, alignSelf: "stretch" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <PriceBlock priceNow={priceNow} priceBefore={priceBefore} showSavings={showSavings} savings={savings} accent={accent} priceSize={92} />
          </div>
          {showQr && (
            <div style={{ flexShrink: 0, textAlign: "center" }}>
              <QrCode url={product.source_url} size={80} />
              <div style={{ fontFamily: MONO, fontSize: 8, color: "#6b7280", marginTop: "1mm", letterSpacing: "0.06em" }}>SE PRODUKTET</div>
            </div>
          )}
        </div>
      </div>

      <FtFooter h={14} />
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
      <FactoryTopBand h={32} accent={accent} />

      {/* 2 produkt-sone, vertikalt delt med rød divider — flexbox */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: "32mm", bottom: "17mm",
        display: "flex",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {p1 ? <PricetagHalfCell product={p1} settings={settings} accent={accent} />
              : <div style={{ width: "100%", height: "100%", background: "#f5f7fa" }} />}
        </div>
        <div style={{ width: "1mm", background: accent, alignSelf: "stretch" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {p2 ? <PricetagHalfCell product={p2} settings={settings} accent={accent} />
              : <div style={{ width: "100%", height: "100%", background: "#f5f7fa", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontFamily: "Roboto Mono, monospace", fontSize: 11 }}>[ legg til produkt 2 ]</div>}
        </div>
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
  const eff = effective(product);
  const { priceNow, priceBefore, showSavings } = eff;
  const burstText = settings.show_burst && !eff.hideBurst ? eff.burstText : null;
  const productName = eff.name;

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
      }}>{productName}</div>
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
              color: "#9ca3af", textDecorationLine: "line-through", textDecorationColor: accent, lineHeight: 1,
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
      <FactoryTopBand h={22} accent={accent} />

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
  const eff = effective(product);
  const { priceNow, priceBefore, showSavings, savings } = eff;
  const burstText = settings.show_burst && !eff.hideBurst ? eff.burstText : null;
  const productName = eff.name;
  const showQr = settings.show_qr && !eff.hideQr;

  return (
    <div style={{
      background: "#fff", borderLeft: `2mm solid ${accent}`, borderRight: `2mm solid ${accent}`,
      borderTop: "0.5mm solid rgba(148,163,184,0.4)", borderBottom: "0.5mm solid rgba(148,163,184,0.4)",
      display: "flex", flexDirection: "column", overflow: "hidden",
      position: "relative",
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
        }}>{productName}</div>
        <div style={{
          fontFamily: "Roboto Mono, monospace", fontSize: 7,
          color: "#6b7280", marginTop: "0.5mm",
        }}>Art.nr {product.sku || "—"}</div>
        <div style={{ marginTop: "auto", display: "flex", gap: "2mm", alignItems: "stretch" }}>
          <div style={{ width: "1.5mm", background: accent }} />
          <div style={{ flex: 1 }}>
            {showSavings && (
              <div style={{
                fontFamily: "Roboto Mono, monospace", fontSize: 7,
                color: "#9ca3af", textDecorationLine: "line-through", textDecorationColor: accent, lineHeight: 1,
              }}>FØR {formatNOK(priceBefore)}</div>
            )}
            <div style={{
              fontFamily: 'var(--ft-head-font, "Manrope", system-ui, sans-serif)',
              fontWeight: 900, fontSize: 22, color: accent, lineHeight: 0.95, marginTop: "0.5mm",
            }}>{formatNOK(priceNow)}</div>
            <div style={{ fontFamily: "Roboto Mono, monospace", fontSize: 6, color: "#6b7280", marginTop: "0.5mm" }}>
              Eks. mva{savings > 0 ? ` · Spar ${formatNOK(savings)}` : ""}
            </div>
          </div>
          {showQr && (
            <div style={{ marginLeft: "auto", alignSelf: "flex-end" }}>
              <QrCode url={product.source_url} size={32} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// VARIANTER — 1 hero-bilde + grid av "typer" (alle produkter = type-kort).
// Brukes for produkter med flere varianter (f.eks. Milwaukee Custom-vogn):
// produkt 1 gir hero-bildet, og hvert produkt blir et type-kort med pris.
// ──────────────────────────────────────────────────────────────────────
export function PricetagA4Variants({
  products, settings, heroTitle, heroSubtitle, pageW = A4_W_MM, pageH = A4_H_MM,
}: {
  products: PricetagProduct[]; settings: PricetagSettings;
  heroTitle?: string; heroSubtitle?: string; pageW?: number; pageH?: number;
}) {
  const accent = settings.accent_color || FT_RED;
  const hero = products[0];
  const cards = products.slice(0, 6);
  const manufacturer = hero?.manufacturer || "";
  const title = (heroTitle || hero?.name || "Produkt").toUpperCase();
  const showQr = settings.show_qr && hero && !effective(hero).hideQr;

  return (
    <div className="page-paper a4-pricetag" style={{
      width: `${pageW}mm`, height: `${pageH}mm`, position: "relative",
      background: "#fff", color: "#111", fontFamily: HEAD_FONT, overflow: "hidden",
    }}>
      <FactoryTopBand h={34} accent={accent} />

      {/* Hero: tekst venstre, bilde høyre */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "34mm", height: "84mm", background: "#f5f7fa", display: "flex", alignItems: "stretch" }}>
        <div style={{ width: "48%", padding: "8mm 6mm 8mm 14mm", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {manufacturer && (
            <div style={{ fontFamily: HEAD_FONT, fontWeight: 800, letterSpacing: "0.16em", fontSize: 14, textTransform: "uppercase", color: accent }}>{manufacturer}</div>
          )}
          <div style={{ fontFamily: HEAD_FONT, fontWeight: 900, fontSize: 30, lineHeight: 0.98, textTransform: "uppercase", color: "#111", marginTop: "3mm" }}>{title}</div>
          {heroSubtitle && (
            <div style={{ fontFamily: MONO, fontSize: 14, color: "#6b7280", marginTop: "4mm" }}>{heroSubtitle}</div>
          )}
          {showQr && hero && (
            <div style={{ display: "flex", alignItems: "center", gap: "4mm", marginTop: "6mm" }}>
              <QrCode url={hero.source_url} size={64} />
              <div style={{ fontFamily: MONO, fontSize: 10, color: "#6b7280", letterSpacing: "0.06em", lineHeight: 1.4 }}>Skann for<br />å se<br />produktet</div>
            </div>
          )}
        </div>
        <div style={{ width: "52%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "4mm 8mm 4mm 0" }}>
          {hero?.image_url
            ? <ProductImage src={hero.image_url} label={hero?.name || "Produkt"} />
            : <PlaceholderImage label="HERO-BILDE" />}
        </div>
      </div>

      {/* "VELG DIN TYPE" */}
      <div style={{ position: "absolute", left: "14mm", right: "14mm", top: "122mm", display: "flex", alignItems: "center", gap: "5mm" }}>
        <div style={{ fontFamily: HEAD_FONT, fontWeight: 900, fontSize: 24, textTransform: "uppercase", letterSpacing: "0.04em", color: "#111" }}>Velg din type</div>
        <div style={{ flex: 1, height: "0.7mm", background: accent }} />
      </div>

      {/* Type-grid */}
      <div style={{
        position: "absolute", left: "14mm", right: "14mm", top: "130mm", bottom: "14mm",
        display: "grid", gridTemplateColumns: "1fr 1fr", gridAutoRows: "1fr", gap: "6mm",
      }}>
        {cards.map((p, i) => {
          const eff = effective(p);
          const { priceNow, priceBefore, showSavings, savings } = eff;
          const burstText = settings.show_burst && !eff.hideBurst ? eff.burstText : null;
          const noPrice = priceNow <= 0;
          return (
            <div key={i} style={{
              background: "#fff", border: "1px solid #e5e8ec", borderRadius: "3mm",
              filter: "drop-shadow(0 1mm 2mm rgba(15,17,21,0.10))",
              position: "relative", padding: "7mm 7mm", display: "flex", flexDirection: "column",
            }}>
              {burstText && !noPrice && (
                <div style={{ position: "absolute", right: "6mm", top: "6mm" }}>
                  <DiscBurst text={burstText} sizeMm={23} accent={accent} />
                </div>
              )}
              <div style={{ fontFamily: HEAD_FONT, fontWeight: 900, fontSize: 30, textTransform: "uppercase", color: "#111", lineHeight: 0.98, maxWidth: "72%" }}>{eff.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: "#6b7280", marginTop: "2mm" }}>Art.nr {p.sku || "—"}</div>
              <div style={{ marginTop: "auto", paddingTop: "5mm" }}>
                {noPrice
                  ? <PriceBlock priceNow={0} priceBefore={0} showSavings={false} savings={0} accent={accent} priceSize={66} custom={{ title: "Pris på forespørsel", body: "Skreddersydd etter dine behov. Velg verktøy og innhold selv." }} />
                  : <PriceBlock priceNow={priceNow} priceBefore={priceBefore} showSavings={showSavings} savings={savings} accent={accent} priceSize={56} />}
              </div>
            </div>
          );
        })}
      </div>

      <FtFooter h={14} />
    </div>
  );
}

// Suppress unused-eyebrow / divider warnings (vi importerer for fremtidig bruk i settings-UI)
void Eyebrow; void RedDivider;
