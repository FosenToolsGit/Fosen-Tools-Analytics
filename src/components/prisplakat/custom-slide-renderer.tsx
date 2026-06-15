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
  if (slide.template === "partners_rundell") {
    return <PartnersRundellSlide slide={slide} baseStyle={baseStyle} active={active} landscape={landscape} />;
  }
  if (slide.template === "jubileum_event") {
    return <JubileumEventSlide slide={slide} active={active} landscape={landscape} />;
  }
  if (slide.template === "youtube") {
    return <YouTubeSlide slide={slide} active={active} />;
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

// ─── Partner-rundell slide ───────────────────────────────────────────────
// Horisontalt rullende karusell av leverandører/gjester. Logo-kort gli
// kontinuerlig fra høyre til venstre, looper sømløst via duplisert content.

function PartnersRundellSlide({ slide, baseStyle, active, landscape }: { slide: CustomSlide; baseStyle: React.CSSProperties; active: boolean; landscape: boolean }) {
  void active;
  void landscape;
  const partners = slide.partners && slide.partners.length > 0 ? slide.partners : [];
  const duration = slide.rundell_duration ?? 30;
  // Dupliserer settet 2x for å sikre sømløs loop via translateX(-50%)
  const looped = [...partners, ...partners];

  const accent = slide.accent_color || "#ED1C24";

  return (
    <div style={{ ...baseStyle, padding: 0, overflow: "hidden" }}>
      {/* Image-dim */}
      {slide.bg_image_url && slide.bg_dim && slide.bg_dim > 0 && (
        <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${slide.bg_dim})` }} />
      )}

      {/* Header — eyebrow + tittel */}
      <div style={{
        position: "absolute", top: "8cqh", left: 0, right: 0,
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: "1.5cqh", zIndex: 2, padding: "0 6cqh",
      }}>
        {slide.eyebrow && (
          <div style={{
            fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.3em",
            fontSize: "2.4cqh", textTransform: "uppercase", color: accent,
          }}>{slide.eyebrow}</div>
        )}
        {slide.title && (
          <div style={{
            fontFamily: HEAD, fontWeight: 900,
            fontSize: "7cqh", textTransform: "uppercase", lineHeight: 1,
            whiteSpace: "pre-line", textAlign: "center",
          }}>{slide.title}</div>
        )}
        {slide.divider && (
          <div style={{ width: "12cqh", height: "0.5cqh", background: accent }} />
        )}
      </div>

      {/* Rullende karusell — sentrert vertikalt */}
      <div style={{
        position: "absolute", top: "50%", left: 0, right: 0,
        transform: "translateY(-50%)",
        display: "flex", alignItems: "center",
        overflow: "hidden",
        zIndex: 1,
      }}>
        <div
          style={{
            display: "flex", gap: "4cqh",
            alignItems: "center",
            width: "max-content",
            whiteSpace: "nowrap",
            animation: `ftPartnerRundell ${duration}s linear infinite`,
          }}
        >
          {looped.map((p, i) => (
            <PartnerCard key={i} partner={p} accent={accent} />
          ))}
        </div>
      </div>

      {/* Subtitle nederst */}
      {slide.subtitle && (
        <div style={{
          position: "absolute", bottom: "8cqh", left: 0, right: 0,
          textAlign: "center", padding: "0 6cqh",
          fontFamily: HEAD, fontWeight: 600,
          fontSize: "2.2cqh", letterSpacing: "0.12em",
          opacity: 0.7, textTransform: "uppercase", zIndex: 2,
        }}>{slide.subtitle}</div>
      )}

      {/* Inline keyframes — sømløs loop via translateX(-50%) */}
      <style>{`@keyframes ftPartnerRundell { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

function PartnerCard({ partner, accent }: { partner: { name: string; logo_url?: string; badge?: string; filter_black?: boolean; scale?: number }; accent: string }) {
  const hasLogo = !!partner.logo_url;
  const scale = partner.scale ?? 1;
  return (
    <div style={{
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1.5cqh",
      minWidth: "36cqh",
      padding: "0 3cqh",
    }}>
      {/* Logo direkte på slide-bg — ingen card-bakgrunn siden hele slide-en
          er hvit. Bare logoens egne farger vises. Ingen overflow:hidden så
          scale-felt kan vokse logoer som har mye åpen padding i SVG-en. */}
      <div style={{
        width: "36cqh",
        height: "26cqh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
      }}>
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxyImage(partner.logo_url!) || partner.logo_url!}
            alt={partner.name}
            style={{
              maxWidth: "100%", maxHeight: "100%", objectFit: "contain",
              transform: `scale(${scale})`,
              filter: partner.filter_black ? "brightness(0)" : undefined,
            }}
          />
        ) : (
          <div style={{
            fontFamily: HEAD, fontWeight: 900,
            fontSize: "3.6cqh", textTransform: "uppercase",
            color: "#0F1115", textAlign: "center", lineHeight: 1.05,
            whiteSpace: "normal", wordBreak: "break-word",
            border: `2px solid ${accent}`,
            padding: "1.5cqh 2cqh", borderRadius: "1cqh",
          }}>{partner.name}</div>
        )}
      </div>
      {/* Optional badge under */}
      {partner.badge && (
        <div style={{
          fontFamily: HEAD, fontWeight: 700, letterSpacing: "0.15em",
          fontSize: "1.6cqh", textTransform: "uppercase",
          color: accent,
          opacity: 0.85,
        }}>{partner.badge}</div>
      )}
    </div>
  );
}

// ─── Jubileum event slide ────────────────────────────────────────────────
// Brukes for 25-årsjubileum + butikkåpning 26. juni 2026. Animert med:
//  - Pulserende glow på dato + tids-kort
//  - Kontinuerlig scanline-sweep (sakte ned over hele slide-en)
//  - Partner-rundell scroller horisontalt
//  - Subtilt blueprint-grid på bg
// Designet for å kjøre i loop på kioskskjerm (UniFi US Cast Pro etc.).

function JubileumEventSlide({
  slide,
  active,
  landscape,
}: {
  slide: CustomSlide;
  active: boolean;
  landscape: boolean;
}) {
  const accent = slide.accent_color || "#FFFFFF";
  const partners = slide.partners ?? [];
  const rundellDuration = slide.rundell_duration ?? 40;
  const topLogoSize = slide.top_logo_size ?? 1;
  const jubLogoSize = slide.jub_logo_size ?? 1;
  const partnerSize = slide.partner_size ?? 1;
  const preTitle = slide.pre_title?.trim();
  const timeLayout = slide.time_layout ?? "row";
  const extraText = slide.extra_text?.trim();
  const taglineText = slide.url?.trim();

  // Tagline-banner i gull-tone for "MØT EKSPERTENE"-rad
  const goldGradient = "linear-gradient(90deg, #85704D, #DBB78B)";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: slide.bg_color || "#ED1C24",
        color: slide.text_color || "#FFFFFF",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Subtilt rød-mørk-shimmer-gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 60% 50% at 30% 20%, rgba(255,255,255,0.08), transparent 60%), radial-gradient(ellipse 50% 50% at 75% 85%, rgba(0,0,0,0.22), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Animert scanline — sakte sveiper ned. Bare aktiv når slide vises. */}
      {active && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "8cqh",
            background:
              "linear-gradient(to bottom, transparent, rgba(255,255,255,0.10), transparent)",
            pointerEvents: "none",
            animation: "ftJubScanline 8s linear infinite",
            zIndex: 2,
          }}
        />
      )}

      {/* Subtilt blueprint-grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "4cqh 4cqh",
          maskImage:
            "radial-gradient(ellipse at center, black 0%, black 50%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 0%, black 50%, transparent 100%)",
          pointerEvents: "none",
        }}
      />

      {/* TOPP: FT-merket + eyebrow */}
      <div
        style={{
          padding: landscape ? "5cqh 8cqh 0" : "6cqh 6cqh 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5cqh",
          zIndex: 3,
        }}
      >
        {slide.top_logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl(slide.top_logo, slide.custom_logo_url) ?? ""}
            alt=""
            style={{
              height: `${(landscape ? 8 : 6) * topLogoSize}cqh`,
              width: "auto",
              objectFit: "contain",
            }}
          />
        )}
        {slide.eyebrow && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: landscape ? "2.4cqh" : "2.2cqh",
              fontWeight: 700,
              letterSpacing: "0.6cqh",
              textTransform: "uppercase",
              opacity: 0.92,
              textAlign: "center",
            }}
          >
            {slide.eyebrow}
          </div>
        )}
        <div
          style={{
            width: "8cqh",
            height: "0.3cqh",
            background: goldGradient,
          }}
        />
      </div>

      {/* HERO: dato + tittel-linjer */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "2cqh 6cqh",
          textAlign: "center",
          gap: "2cqh",
          zIndex: 3,
        }}
      >
        {/* Valgfri tekst over dato */}
        {preTitle && (
          <div
            style={{
              fontFamily: HEAD,
              fontSize: landscape ? "3.6cqh" : "3.4cqh",
              fontWeight: 700,
              letterSpacing: "0.05cqh",
              textTransform: "uppercase",
              opacity: 0.95,
              whiteSpace: "pre-line",
              lineHeight: 1.15,
            }}
          >
            {preTitle}
          </div>
        )}

        {/* Stor dato med pulserende glow */}
        {slide.title && (
          <div
            style={{
              fontFamily: HEAD,
              fontSize: landscape ? "14cqh" : "13cqh",
              fontWeight: 800,
              lineHeight: 0.95,
              letterSpacing: "-0.3cqh",
              animation: active
                ? "ftJubPulse 3.5s ease-in-out infinite"
                : "none",
              whiteSpace: "nowrap",
            }}
          >
            {slide.title}
          </div>
        )}

        {/* Subtitle (LEVERANDØR STANDER / HOLD AV DAGEN) */}
        {slide.subtitle && (
          <div
            style={{
              fontFamily: HEAD,
              fontSize: landscape ? "5.4cqh" : "5.6cqh",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.1cqh",
              textTransform: "uppercase",
              whiteSpace: "pre-line",
              textShadow: "0 0 4cqh rgba(0,0,0,0.25)",
            }}
          >
            {slide.subtitle}
          </div>
        )}

        {/* Valgfri tagline-linje over tids-kort */}
        {taglineText && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: landscape ? "2cqh" : "2.2cqh",
              fontWeight: 700,
              letterSpacing: "0.4cqh",
              textTransform: "uppercase",
              opacity: 0.92,
              marginTop: "0.5cqh",
            }}
          >
            {taglineText}
          </div>
        )}

        {/* TIDS-KORT: åpent + grilling */}
        {(slide.hours || slide.grilling_hours) && (
          <div
            style={{
              display: "flex",
              flexDirection: timeLayout === "stacked" ? "column" : "row",
              gap: "2.5cqh",
              marginTop: "1.5cqh",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {slide.hours && (
              <TimeCardSlide
                kind="clock"
                label="ÅPENT"
                value={slide.hours}
                animated={active}
              />
            )}
            {slide.grilling_hours && (
              <TimeCardSlide
                kind="grill"
                label="GRILLING"
                value={slide.grilling_hours}
                animated={active}
              />
            )}
          </div>
        )}

        {/* Valgfri ekstra tekst under tids-kort */}
        {extraText && (
          <div
            style={{
              fontFamily: HEAD,
              fontSize: landscape ? "2.6cqh" : "2.8cqh",
              fontWeight: 700,
              lineHeight: 1.3,
              whiteSpace: "pre-line",
              opacity: 0.92,
              marginTop: "0.8cqh",
              maxWidth: "80%",
            }}
          >
            {extraText}
          </div>
        )}
      </div>

      {/* BUNN: partner-rundell + jubileumslogoer */}
      {partners.length > 0 && (
        <div
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(15,17,21,0.92) 14%, rgba(15,17,21,0.98))",
            padding: landscape ? "3cqh 4cqh 3cqh" : "3.5cqh 4cqh 3cqh",
            position: "relative",
            zIndex: 3,
            flexShrink: 0,
          }}
        >
          {/* "MØT EKSPERTENE"-banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2cqh",
              justifyContent: "center",
              marginBottom: "2.5cqh",
              fontFamily: MONO,
              fontSize: landscape ? "2cqh" : "2.2cqh",
              fontWeight: 700,
              letterSpacing: "0.5cqh",
              textTransform: "uppercase",
              color: "#DBB78B",
            }}
          >
            <span
              style={{
                width: "6cqh",
                height: "0.25cqh",
                background: "linear-gradient(to right, transparent, #DBB78B)",
              }}
            />
            <span style={{ whiteSpace: "nowrap" }}>
              Møt ekspertene · Få faglig påfyll · Still spørsmål
            </span>
            <span
              style={{
                width: "6cqh",
                height: "0.25cqh",
                background: "linear-gradient(to left, transparent, #DBB78B)",
              }}
            />
          </div>

          {/* Horisontalt rullende partner-bånd (gjenbruker rundell-pattern) */}
          <div
            style={{
              overflow: "hidden",
              maskImage:
                "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "max-content",
                animation: active
                  ? `ftJubRundell ${rundellDuration}s linear infinite`
                  : "none",
              }}
            >
              {/* Mellomrommet ligger som marginRight PER logo (ikke flex-gap) så
                  den dobblede listen er perfekt periodisk → translateX(-50%)
                  lander eksakt på kopi 2 og loopen blir sømløs uten hopp. */}
              {[...partners, ...partners].map((p, i) => (
                <div key={i} style={{ marginRight: "2cqh", flexShrink: 0 }}>
                  <JubileumPartnerLogo partner={p} sizeScale={partnerSize} />
                </div>
              ))}
            </div>
          </div>

          {/* Jubileumslogoer 25 + 100 — flex-item INNE i bunn-seksjonen,
              etter partner-rundellen. Plassering blir naturlig (ingen
              absolute-overlap), og vi kan gjøre dem større. */}
          {slide.bottom_logo && (
            <div
              style={{
                marginTop: landscape ? "1.5cqh" : "2cqh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: landscape ? "5cqh" : "4cqh",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl(slide.bottom_logo, slide.custom_logo_url) ?? ""}
                alt=""
                style={{
                  height: `${(landscape ? 7 : 6.5) * jubLogoSize}cqh`,
                  width: "auto",
                  objectFit: "contain",
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_URLS["jub-100"] ?? ""}
                alt=""
                style={{
                  height: `${(landscape ? 5.5 : 5) * jubLogoSize}cqh`,
                  width: "auto",
                  objectFit: "contain",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Animasjons-keyframes */}
      <style>{`
        @keyframes ftJubScanline {
          0% { transform: translateY(-5cqh); }
          100% { transform: translateY(110cqh); }
        }
        @keyframes ftJubPulse {
          0%, 100% { text-shadow: 0 0 3cqh rgba(255,255,255,0.18), 0 0 6cqh rgba(0,0,0,0.4); }
          50% { text-shadow: 0 0 5cqh rgba(255,255,255,0.45), 0 0 8cqh rgba(255,255,255,0.25); }
        }
        @keyframes ftJubRundell {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

function TimeCardSlide({
  kind,
  label,
  value,
  animated,
}: {
  kind: "clock" | "grill";
  label: string;
  value: string;
  animated: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1.6cqh",
        padding: "1.8cqh 3cqh",
        background: "rgba(0,0,0,0.32)",
        border: "0.25cqh solid rgba(255,255,255,0.85)",
        borderRadius: "0.8cqh",
        boxShadow: "0 0 2.5cqh rgba(255,255,255,0.18)",
        minWidth: "26cqh",
        animation: animated
          ? "ftJubCardPulse 3.5s ease-in-out infinite"
          : "none",
      }}
    >
      {kind === "clock" ? (
        <svg
          width="4.5cqh"
          height="4.5cqh"
          viewBox="0 0 24 24"
          fill="none"
          style={{ flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="9.5" stroke="white" strokeWidth="1.6" />
          <path
            d="M12 7v5l3 2"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg
          width="4.5cqh"
          height="4.5cqh"
          viewBox="0 0 24 24"
          fill="none"
          style={{ flexShrink: 0 }}
        >
          <path
            d="M12 3 C 10 6, 7.5 8, 7 11 C 6.4 14.5, 8.5 17.5, 12 18 C 15.5 17.5, 17.6 14.5, 17 11 C 16.5 8.5, 14.5 7.5, 13.5 5 C 13 4, 12.5 3.4, 12 3 Z"
            fill="white"
            opacity="0.9"
          />
          <path
            d="M12 8 C 10.8 10, 9.8 11.5, 9.5 13 C 9.2 14.8, 10.4 16.4, 12 16.6 C 13.6 16.4, 14.8 14.8, 14.5 13 C 14.2 11.5, 13.2 10, 12 8 Z"
            fill="#FFD86C"
          />
        </svg>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.4cqh",
          textAlign: "left",
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: "1.6cqh",
            fontWeight: 700,
            letterSpacing: "0.35cqh",
            opacity: 0.75,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: HEAD,
            fontSize: "3.4cqh",
            fontWeight: 800,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
      </div>
      <style>{`
        @keyframes ftJubCardPulse {
          0%, 100% { box-shadow: 0 0 2.5cqh rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.72); }
          50% { box-shadow: 0 0 4cqh rgba(255,255,255,0.32); border-color: rgba(255,255,255,1); }
        }
      `}</style>
    </div>
  );
}

// ─── Jubileum partner-logo (hvit kort-tile, original-farger) ────────────
// Hver logo får sin egen hvite tile (samme stil som A5-PDF-versjonen) så
// original-farger leses bra mot rød/mørk slide-bg. filter_black gir svart
// silhuett (Zweibrüder-tilfellet — logoen er svart-på-transparent og må
// holdes svart selv om tilen er hvit).
//
// Scale-demping: bruker samme formel som A5-PDF (`scale * 0.3 + 0.7`) så
// scale: 10 (Wera, mye negative space) gir faktisk transform:scale(3.7),
// ikke 10× monster.
function JubileumPartnerLogo({
  partner,
  sizeScale = 1,
}: {
  partner: {
    name: string;
    logo_url?: string;
    badge?: string;
    filter_black?: boolean;
    scale?: number;
  };
  sizeScale?: number;
}) {
  const hasLogo = !!partner.logo_url;
  const rawScale = partner.scale ?? 1;
  const effectiveScale = rawScale > 1 ? rawScale * 0.3 + 0.7 : 1;
  const filter = partner.filter_black ? "brightness(0)" : undefined;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${32 * sizeScale}cqh`,
        height: `${18 * sizeScale}cqh`,
        padding: `${1.6 * sizeScale}cqh`,
        background: "#ffffff",
        borderRadius: "1cqh",
        boxShadow: "0 0.5cqh 1.2cqh rgba(0, 0, 0, 0.25)",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {hasLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proxyImage(partner.logo_url!) || partner.logo_url!}
          alt={partner.name}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            transform: `scale(${effectiveScale})`,
            filter,
          }}
        />
      ) : (
        <div
          style={{
            fontFamily: HEAD,
            fontWeight: 800,
            fontSize: "3cqh",
            color: "#0F1115",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            textAlign: "center",
          }}
        >
          {partner.name}
        </div>
      )}
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

// ────────────────────────────────────────────────────────────────────────
// YOUTUBE-SLIDE
// Embedder YouTube via iframe med enablejsapi=1 så vi kan lytte på 'ended'.
// Når active=false, fjernes iframen helt (sparer båndbredde + stopper lyd).
// Slideshow-container reagerer på 'youtube-ended'-postMessage og går
// til neste slide.
// ────────────────────────────────────────────────────────────────────────

function YouTubeSlide({
  slide,
  active,
}: {
  slide: CustomSlide;
  active: boolean;
}) {
  const videoId = slide.youtube_id || (slide.youtube_url ? extractYouTubeIdInline(slide.youtube_url) : null);

  if (!videoId) {
    return (
      <div style={{
        position: "absolute", inset: 0, background: "#000",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#666", fontFamily: HEAD, fontSize: "2cqh",
      }}>
        YouTube-video mangler ID — lim inn URL i editor
      </div>
    );
  }

  if (!active) {
    // Ikke render iframen før slide-en er aktiv — sparer båndbredde + lyd
    return <div style={{ position: "absolute", inset: 0, background: "#000" }} />;
  }

  const muted = slide.youtube_muted ?? true;
  const start = slide.youtube_start ?? 0;

  // YouTube iframe-params:
  // - autoplay=1: start automatisk
  // - mute=1: kreves for autoplay i Chrome/Edge/Safari
  // - controls=0: skjul controls
  // - playsinline=1: ikke gå inn i native iOS-fullscreen
  // - rel=0: ikke vis relaterte videoer etterpå (kun samme kanal)
  // - modestbranding=1: minimal YouTube-branding
  // - enablejsapi=1: la oss lytte til 'ended' via postMessage
  // - iv_load_policy=3: ingen annotation-overlay
  const params = new URLSearchParams({
    autoplay: "1",
    mute: muted ? "1" : "0",
    controls: "0",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    enablejsapi: "1",
    iv_load_policy: "3",
    start: String(start),
    origin: typeof window !== "undefined" ? window.location.origin : "",
  });

  return (
    <div style={{ position: "absolute", inset: 0, background: "#000", overflow: "hidden" }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
        style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          // Skaler så videoen alltid dekker hele canvas (object-fit: cover)
          width: "max(100%, 177.78vh)",   // 16:9 i landscape
          height: "max(100%, 56.25vw)",
          border: 0,
        }}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        title="YouTube video"
      />
    </div>
  );
}

// Inline ekstraherer (unngår å importere fra types siden custom-slide-renderer
// allerede importerer CustomSlide derfra — sirkulær risiko ved import av helpers)
function extractYouTubeIdInline(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}
