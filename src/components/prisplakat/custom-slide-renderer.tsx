"use client";

// Data-drevet rendering av custom slides (intro/credentials/certified/outro/brand_spotlight/
// multi_product/combo/blank).
//
// Alle CSS-størrelser bruker `cqh`-units, så slide-en skalerer proporsjonalt med container-høyden.
// Container må ha `containerType: "size"` for at dette skal virke (settes i parent).

import type { CustomSlide, LogoKey, PricetagProduct, PricetagSettings } from "./types";
import { LOGO_URLS, effective } from "./types";
import { PriceBurst } from "@/components/brosjyre/ft-svg";
import { formatNOK } from "@/components/brosjyre/store";

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

function logoUrl(key: LogoKey | undefined, customUrl?: string): string | null {
  if (!key) return null;
  if (key === "custom") return customUrl || null;
  return LOGO_URLS[key] || null;
}

interface CustomSlideProps {
  slide: CustomSlide;
  /** Hele product-listen i playlist — combo/multi_product peker hit via indekser */
  allProducts: PricetagProduct[];
  /** Slideshow-innstillinger (for accent_color etc.) */
  settings: PricetagSettings;
  landscape: boolean;
  active: boolean;
}

export function CustomSlideRenderer({ slide, allProducts, settings, landscape, active }: CustomSlideProps) {
  const align = slide.align ?? "center";
  const titleScale = slide.title_scale ?? 1;

  const bgStyle: React.CSSProperties = slide.bg_image_url
    ? {
        background: `url(${proxyImage(slide.bg_image_url)}) center/cover no-repeat, ${slide.bg_color}`,
      }
    : { background: slide.bg_color };

  const baseStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    color: slide.text_color,
    display: "flex",
    flexDirection: "column",
    alignItems: align === "center" ? "center" : "flex-start",
    justifyContent: "center",
    padding: landscape ? "8cqh" : "6cqh",
    textAlign: align === "center" ? "center" : "left",
    position: "relative",
    ...bgStyle,
  };

  const topLogo = logoUrl(slide.top_logo, slide.custom_logo_url);
  const bottomLogo = logoUrl(slide.bottom_logo, slide.custom_logo_url);

  // ─── Spesial-templates ────────────────────────────────────────────────
  if (slide.template === "multi_product") {
    return <MultiProductSlide slide={slide} allProducts={allProducts} settings={settings} landscape={landscape} active={active} />;
  }
  if (slide.template === "combo") {
    return <ComboSlide slide={slide} allProducts={allProducts} settings={settings} landscape={landscape} />;
  }
  if (slide.template === "brand_spotlight") {
    return <BrandSpotlightSlide slide={slide} baseStyle={baseStyle} active={active} landscape={landscape} />;
  }

  // ─── Standard fri-form layout (intro / credentials / certified / outro / blank) ──
  return (
    <div style={baseStyle}>
      {/* Image-dim-overlay */}
      {slide.bg_image_url && slide.bg_dim && slide.bg_dim > 0 && (
        <div style={{
          position: "absolute", inset: 0,
          background: `rgba(0,0,0,${slide.bg_dim})`,
          pointerEvents: "none",
        }} />
      )}

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", gap: "0cqh", width: "100%" }}>
        {/* Topp-logo */}
        {topLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={topLogo}
            alt="Logo"
            style={{
              width: slide.template === "intro" ? "40%" : "auto",
              height: slide.template === "intro" ? "auto" : "5cqh",
              maxHeight: slide.template === "intro" ? "12cqh" : "5cqh",
              marginBottom: "4cqh",
              opacity: active ? 1 : 0,
              transform: active ? "translateY(0)" : "translateY(-1cqh)",
              transition: "opacity 800ms ease-out, transform 800ms ease-out",
            }}
          />
        )}

        {/* Eyebrow */}
        {slide.eyebrow && (
          <div style={{
            fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.3em",
            fontSize: `${2 * titleScale}cqh`, textTransform: "uppercase",
            opacity: 0.85, marginBottom: slide.divider ? "0" : "3cqh",
          }}>{slide.eyebrow}</div>
        )}

        {/* Divider */}
        {slide.divider && (
          <div style={{
            width: "8cqh", height: "0.4cqh",
            background: slide.accent_color, margin: "3cqh 0",
          }} />
        )}

        {/* Title */}
        {slide.title && (
          <div style={{
            fontFamily: HEAD, fontWeight: 900,
            fontSize: `${9 * titleScale}cqh`, lineHeight: 0.96,
            textTransform: "uppercase",
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(2cqh)",
            transition: "opacity 800ms ease-out 200ms, transform 800ms ease-out 200ms",
            whiteSpace: "pre-line",
          }}>{slide.title}</div>
        )}

        {/* Subtitle */}
        {slide.subtitle && (
          <div style={{
            fontFamily: HEAD, fontWeight: 500,
            fontSize: `${2 * titleScale}cqh`, letterSpacing: "0.16em",
            opacity: 0.7, textTransform: "uppercase",
            marginTop: "3cqh",
          }}>{slide.subtitle}</div>
        )}

        {/* Pills */}
        {slide.pills && slide.pills.length > 0 && (
          <div style={{
            display: "flex", flexWrap: "wrap",
            justifyContent: align === "center" ? "center" : "flex-start",
            gap: "2cqh", marginTop: "5cqh",
          }}>
            {slide.pills.map((p, idx) => (
              <div key={idx} style={{
                fontFamily: HEAD, fontWeight: 700,
                fontSize: "1.5cqh", letterSpacing: "0.16em",
                color: slide.text_color,
                padding: "1.2cqh 2.4cqh",
                border: `1px solid ${slide.text_color}66`, borderRadius: 999,
              }}>{p}</div>
            ))}
          </div>
        )}

        {/* Hours */}
        {slide.hours && (
          <div style={{
            marginTop: "4cqh", fontFamily: HEAD, fontWeight: 500,
            fontSize: "2cqh", letterSpacing: "0.16em",
            opacity: 0.6, textTransform: "uppercase",
          }}>{slide.hours}</div>
        )}

        {/* Phone (stort) */}
        {slide.phone && (
          <div style={{
            marginTop: "5cqh", fontFamily: HEAD, fontWeight: 900,
            fontSize: "10cqh", color: slide.text_color, lineHeight: 1,
          }}>{slide.phone}</div>
        )}

        {/* URL */}
        {slide.url && (
          <div style={{
            marginTop: "2cqh", fontFamily: MONO,
            fontSize: "1.8cqh", letterSpacing: "0.08em",
            opacity: 0.55,
          }}>{slide.url}</div>
        )}

        {/* Address (under hours/phone) */}
        {slide.address && (
          <div style={{
            marginTop: "2cqh", fontFamily: HEAD, fontWeight: 500,
            fontSize: "2cqh", opacity: 0.7,
          }}>{slide.address}</div>
        )}

        {/* Bunn-logo */}
        {bottomLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bottomLogo}
            alt="Logo"
            style={{
              width: "32%", maxHeight: "16cqh",
              marginTop: "5cqh",
            }}
          />
        )}
      </div>

      {/* Topp-stripe (intro-stil) */}
      {slide.template === "outro" && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "0.8cqh", background: slide.accent_color, zIndex: 0 }} />
      )}
    </div>
  );
}

// ─── Brand-spotlight ────────────────────────────────────────────────────

function BrandSpotlightSlide({ slide, baseStyle, active, landscape }: { slide: CustomSlide; baseStyle: React.CSSProperties; active: boolean; landscape: boolean }) {
  void landscape;
  const align = slide.align ?? "center";
  return (
    <div style={baseStyle}>
      {/* Image-dim */}
      {slide.bg_image_url && slide.bg_dim && slide.bg_dim > 0 && (
        <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${slide.bg_dim})` }} />
      )}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", gap: "3cqh" }}>
        {slide.eyebrow && (
          <div style={{
            fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.3em",
            fontSize: "2.4cqh", textTransform: "uppercase", opacity: 0.6,
          }}>{slide.eyebrow}</div>
        )}
        {slide.brand_logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proxyImage(slide.brand_logo_url) || slide.brand_logo_url} alt={slide.brand_name || "Merke"} style={{
            maxWidth: "60%", maxHeight: "24cqh", objectFit: "contain",
            background: "#fff", padding: "3cqh 4cqh", borderRadius: "1cqh",
            opacity: active ? 1 : 0, transition: "opacity 800ms ease-out",
          }} />
        )}
        {!slide.brand_logo_url && slide.brand_name && (
          <div style={{
            fontFamily: HEAD, fontWeight: 900,
            fontSize: "12cqh", textTransform: "uppercase",
            color: slide.accent_color, lineHeight: 0.95,
          }}>{slide.brand_name}</div>
        )}
        {slide.divider && (
          <div style={{ width: "8cqh", height: "0.4cqh", background: slide.accent_color }} />
        )}
        {slide.subtitle && (
          <div style={{
            fontFamily: HEAD, fontWeight: 500,
            fontSize: "2.4cqh", letterSpacing: "0.12em",
            opacity: 0.8, textTransform: "uppercase", maxWidth: "70%",
          }}>{slide.subtitle}</div>
        )}
        {slide.title && (
          <div style={{
            fontFamily: HEAD, fontWeight: 900,
            fontSize: "6cqh", textTransform: "uppercase", lineHeight: 0.98,
            whiteSpace: "pre-line",
          }}>{slide.title}</div>
        )}
      </div>
    </div>
  );
}

// ─── Multi-produkt slide ─────────────────────────────────────────────────

function MultiProductSlide({ slide, allProducts, settings, landscape, active }: CustomSlideProps) {
  void active;
  const indexes = slide.product_indexes ?? [];
  const products = indexes
    .map((i) => allProducts[i])
    .filter((p): p is PricetagProduct => !!p);

  const count = products.length;
  if (count === 0) {
    return (
      <div style={{
        width: "100%", height: "100%", background: slide.bg_color, color: slide.text_color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: HEAD, fontSize: "2.4cqh", opacity: 0.5,
      }}>
        [ Velg produkter til denne multi-slide ]
      </div>
    );
  }

  // 2 produkter = 1×2, 3-4 = 2×2, mer = også 2×2 men cappet
  const isPair = count <= 2;
  const cols = isPair ? (landscape ? 2 : 1) : 2;
  const rows = isPair ? (landscape ? 1 : 2) : 2;
  const accent = slide.accent_color;

  return (
    <div style={{
      width: "100%", height: "100%", background: slide.bg_color, color: slide.text_color,
      padding: "4cqh", boxSizing: "border-box", position: "relative",
    }}>
      {/* Header */}
      {(slide.eyebrow || slide.title) && (
        <div style={{ textAlign: "center", marginBottom: "3cqh" }}>
          {slide.eyebrow && (
            <div style={{
              fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.3em",
              fontSize: "1.6cqh", textTransform: "uppercase", opacity: 0.6,
            }}>{slide.eyebrow}</div>
          )}
          {slide.title && (
            <div style={{
              fontFamily: HEAD, fontWeight: 900,
              fontSize: "4cqh", textTransform: "uppercase", marginTop: "1cqh",
            }}>{slide.title}</div>
          )}
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: "2cqh",
        height: "calc(100% - 8cqh)",
      }}>
        {products.slice(0, cols * rows).map((p, i) => {
          const eff = effective(p);
          const img = proxyImage(p.image_url);
          return (
            <div key={i} style={{
              background: "#fff",
              color: "#0f1115",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
              borderRadius: "0.6cqh",
            }}>
              {/* Bilde-felt */}
              <div style={{ flex: 1, position: "relative", background: "#f5f7fa", overflow: "hidden" }}>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={p.name || ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "1.4cqh" }}>[ BILDE ]</div>
                )}
                {settings.show_burst && eff.burstText && !eff.hideBurst && (
                  <div style={{ position: "absolute", top: "1cqh", right: "1cqh" }}>
                    <PriceBurst variant="bullseye" size={isPair ? 100 : 70} primary={eff.burstText} secondary={eff.burstSubLabel} primarySize={isPair ? 30 : 22} />
                  </div>
                )}
              </div>
              {/* Info-felt */}
              <div style={{
                padding: "1.2cqh 1.6cqh", background: "#0f1115", color: "#fff",
                display: "flex", flexDirection: "column", gap: "0.4cqh",
              }}>
                <div style={{
                  fontFamily: HEAD, fontWeight: 700, fontSize: "1.4cqh", lineHeight: 1.1,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{eff.name}</div>
                <div style={{
                  fontFamily: HEAD, fontWeight: 900,
                  fontSize: isPair ? "5cqh" : "3.4cqh",
                  color: accent, lineHeight: 0.95,
                }}>{formatNOK(eff.priceNow)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Combo-slide ────────────────────────────────────────────────────────

function ComboSlide({ slide, allProducts, settings, landscape }: { slide: CustomSlide; allProducts: PricetagProduct[]; settings: PricetagSettings; landscape: boolean }) {
  const a = slide.combo_a_idx != null ? allProducts[slide.combo_a_idx] : undefined;
  const b = slide.combo_b_idx != null ? allProducts[slide.combo_b_idx] : undefined;

  if (!a || !b) {
    return (
      <div style={{
        width: "100%", height: "100%", background: slide.bg_color, color: slide.text_color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: HEAD, fontSize: "2.4cqh", opacity: 0.5,
      }}>
        [ Velg to produkter til kombi-slide ]
      </div>
    );
  }

  const effA = effective(a);
  const effB = effective(b);
  const imgA = proxyImage(a.image_url);
  const imgB = proxyImage(b.image_url);
  const sumOriginal = effA.priceNow + effB.priceNow;
  const comboPrice = slide.combo_price ?? Math.round(sumOriginal * 0.9);
  const savings = sumOriginal - comboPrice;
  const accent = slide.accent_color;
  const badge = slide.combo_badge || "KOMBI-PRIS";

  return (
    <div style={{
      width: "100%", height: "100%", background: slide.bg_color, color: slide.text_color,
      padding: "4cqh", boxSizing: "border-box", display: "flex", flexDirection: "column",
    }}>
      {/* Badge på toppen */}
      <div style={{
        alignSelf: "center", background: accent, color: "#fff",
        padding: "1.4cqh 3cqh", borderRadius: 999,
        fontFamily: HEAD, fontWeight: 900,
        fontSize: "2cqh", letterSpacing: "0.16em", textTransform: "uppercase",
        marginBottom: "3cqh",
      }}>{badge}</div>

      {/* Produkter side-om-side */}
      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: landscape ? "1fr auto 1fr" : "1fr",
        gridTemplateRows: landscape ? "1fr" : "1fr auto 1fr",
        gap: "2cqh", alignItems: "center", minHeight: 0,
      }}>
        {/* Produkt A */}
        <ComboProductTile product={a} eff={effA} img={imgA} accent={accent} settings={settings} />
        {/* Plus-tegn */}
        <div style={{
          fontFamily: HEAD, fontWeight: 900,
          fontSize: "8cqh", color: accent, textAlign: "center",
        }}>+</div>
        {/* Produkt B */}
        <ComboProductTile product={b} eff={effB} img={imgB} accent={accent} settings={settings} />
      </div>

      {/* Combo-pris nederst */}
      <div style={{
        marginTop: "3cqh", textAlign: "center",
        background: accent, color: "#fff",
        padding: "3cqh", borderRadius: "1cqh",
      }}>
        <div style={{
          fontFamily: HEAD, fontWeight: 700, fontSize: "1.6cqh",
          letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.85,
        }}>SAMLET PRIS</div>
        <div style={{
          fontFamily: HEAD, fontWeight: 900, fontSize: "10cqh", lineHeight: 1,
        }}>{formatNOK(comboPrice)}</div>
        {savings > 0 && (
          <div style={{
            fontFamily: HEAD, fontWeight: 800, fontSize: "1.8cqh",
            letterSpacing: "0.1em", textTransform: "uppercase",
            marginTop: "1cqh", opacity: 0.92,
          }}>SPAR {formatNOK(savings)}</div>
        )}
      </div>
    </div>
  );
}

function ComboProductTile({ product, eff, img, accent, settings }: {
  product: PricetagProduct;
  eff: ReturnType<typeof effective>;
  img: string | null;
  accent: string;
  settings: PricetagSettings;
}) {
  void settings;
  return (
    <div style={{
      background: "#fff", color: "#0f1115",
      borderRadius: "0.6cqh", overflow: "hidden",
      display: "flex", flexDirection: "column", height: "100%",
    }}>
      <div style={{ flex: 1, position: "relative", background: "#f5f7fa", overflow: "hidden", minHeight: "10cqh" }}>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={product.name || ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
        )}
      </div>
      <div style={{ padding: "1.2cqh 1.6cqh", background: "#0f1115", color: "#fff" }}>
        <div style={{
          fontFamily: HEAD, fontWeight: 700, fontSize: "1.4cqh",
          textTransform: "uppercase",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{eff.name}</div>
        <div style={{
          fontFamily: HEAD, fontWeight: 800, fontSize: "2.4cqh", color: accent, marginTop: "0.4cqh",
        }}>{formatNOK(eff.priceNow)}</div>
      </div>
    </div>
  );
}
