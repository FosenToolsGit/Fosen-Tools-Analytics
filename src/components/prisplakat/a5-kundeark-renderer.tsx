"use client";

// A5-kundeark — print-versjon av jubileum/event-plakat (148×210 mm).
// Bruker en `jubileum_event`-CustomSlide som data-kilde slik at Brit kan
// redigere alle felter (dato, tider, partnere) i samme editor-flyt som
// slideshow-slidene. Ingen animasjon — det er print.
//
// Layouten speiler jubileum-poster-A5-PDF-en (rød topp + mørk bunn-
// seksjon med partnergrid), men er rendret som vanlig React-komponent
// så jsPDF-eksport kan rasterere via html2canvas/modern-screenshot.

import type { CustomSlide } from "./types";
import { LOGO_URLS } from "./types";

const FT_RED = "#ed1c24";
const FT_INK = "#0f1115";
const GOLD_TOP = "#85704D";
const GOLD_BOTTOM = "#DBB78B";

// A5 portrait — 148×210 mm. Vi rendrer i mm-units så jsPDF-eksport
// matcher 1:1 med PDF-output.
const A5_W_MM = 148;
const A5_H_MM = 210;

const HEAD = 'var(--ft-head-font, "Manrope", "Inter", system-ui, sans-serif)';
const MONO = '"Roboto Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

interface Props {
  /** Slide som driver innholdet. Hvis ikke jubileum_event, brukes
   *  default-tekst som placeholder. */
  slide: CustomSlide;
  pageW?: number;
  pageH?: number;
}

export function PricetagA5Kundeark({ slide, pageW = A5_W_MM, pageH = A5_H_MM }: Props) {
  const bgRed = slide.bg_color || FT_RED;
  const partners = slide.partners ?? [];
  const grillingHours = slide.grilling_hours;
  const hours = slide.hours;
  const topLogoScale = slide.top_logo_size ?? 1;
  const jubLogoScale = slide.jub_logo_size ?? 1;
  const partnerScale = slide.partner_size ?? 1;
  const extraText = slide.extra_text?.trim();
  const preTitle = slide.pre_title?.trim();
  const timeLayout = slide.time_layout ?? "row";

  // Topp-/bunn-split: topp ~58% (rød) / bunn ~42% (mørk)
  // Hvis ingen partnere — gi topp 100% av plassen
  const showBottom = partners.length > 0 || slide.bottom_logo;
  const topHeightMm = showBottom ? pageH * 0.62 : pageH;

  return (
    <div
      className="page-paper a5-pricetag"
      style={{
        width: `${pageW}mm`,
        height: `${pageH}mm`,
        position: "relative",
        overflow: "hidden",
        fontFamily: HEAD,
        color: "#fff",
        background: bgRed,
      }}
    >
      {/* ── TOPP: rød seksjon med FT-merket, dato, tider ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${topHeightMm}mm`,
          background: bgRed,
          padding: `${pageW * 0.05}mm ${pageW * 0.06}mm ${pageW * 0.03}mm`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Subtilt rød-mørk-shimmer */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 60% 50% at 30% 20%, rgba(255,255,255,0.06), transparent 60%), radial-gradient(ellipse 50% 50% at 75% 85%, rgba(0,0,0,0.18), transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* FT-wordmark + eyebrow */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: `${pageW * 0.025}mm`, zIndex: 2 }}>
          {slide.top_logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={LOGO_URLS[slide.top_logo === "custom" ? "ft-white" : slide.top_logo] ?? ""}
              alt=""
              style={{ height: `${pageW * 0.05 * topLogoScale}mm`, width: "auto", objectFit: "contain" }}
            />
          )}
          {slide.eyebrow && (
            <div
              style={{
                fontFamily: MONO,
                fontSize: `${pageW * 0.022}mm`,
                fontWeight: 700,
                letterSpacing: `${pageW * 0.004}mm`,
                textTransform: "uppercase",
                textAlign: "center",
                opacity: 0.95,
              }}
            >
              {slide.eyebrow}
            </div>
          )}
          <div
            style={{
              width: `${pageW * 0.06}mm`,
              height: `${pageW * 0.002}mm`,
              background: `linear-gradient(90deg, ${GOLD_TOP}, ${GOLD_BOTTOM})`,
            }}
          />
        </div>

        {/* Hero — dato + subtitle */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: `${pageW * 0.02}mm`,
            textAlign: "center",
            width: "100%",
            zIndex: 2,
          }}
        >
          {preTitle && (
            <div
              style={{
                fontFamily: HEAD,
                fontSize: `${pageW * 0.038}mm`,
                fontWeight: 700,
                letterSpacing: `${pageW * 0.001}mm`,
                lineHeight: 1.2,
                textAlign: "center",
                opacity: 0.95,
                whiteSpace: "pre-line",
                maxWidth: `${pageW * 0.82}mm`,
              }}
            >
              {preTitle}
            </div>
          )}
          {slide.title && (
            <div
              style={{
                fontSize: `${pageW * 0.092}mm`,
                fontWeight: 800,
                letterSpacing: `${-pageW * 0.0018}mm`,
                lineHeight: 1.0,
                whiteSpace: "nowrap",
                textShadow: `0 0 ${pageW * 0.03}mm rgba(0,0,0,0.2)`,
              }}
            >
              {slide.title}
            </div>
          )}
          {slide.subtitle && (
            <div
              style={{
                fontSize: `${pageW * 0.052}mm`,
                fontWeight: 800,
                letterSpacing: `${-pageW * 0.001}mm`,
                lineHeight: 1.08,
                textTransform: "uppercase",
                whiteSpace: "pre-line",
                textShadow: `0 0 ${pageW * 0.025}mm rgba(0,0,0,0.2)`,
              }}
            >
              {slide.subtitle}
            </div>
          )}
          {/* Liten tagline-linje under subtitle hvis satt — "Vi feirer 25 år..." */}
          {slide.url && (
            <div
              style={{
                fontFamily: MONO,
                fontSize: `${pageW * 0.018}mm`,
                fontWeight: 600,
                letterSpacing: `${pageW * 0.003}mm`,
                textTransform: "uppercase",
                opacity: 0.85,
              }}
            >
              {slide.url}
            </div>
          )}

          {/* Ekstra fri tekst — Brit kan plassere ad-hoc-meldinger her */}
          {extraText && (
            <div
              style={{
                fontFamily: HEAD,
                fontSize: `${pageW * 0.025}mm`,
                fontWeight: 600,
                lineHeight: 1.35,
                textAlign: "center",
                maxWidth: `${pageW * 0.82}mm`,
                opacity: 0.95,
                whiteSpace: "pre-line",
                marginTop: `${pageW * 0.005}mm`,
              }}
            >
              {extraText}
            </div>
          )}

          {/* Tids-kort — layout: side-om-side (row) eller stacked (vertikalt) */}
          {(hours || grillingHours) && (
            <div
              style={{
                display: "flex",
                flexDirection: timeLayout === "stacked" ? "column" : "row",
                gap: `${pageW * 0.015}mm`,
                marginTop: `${pageW * 0.015}mm`,
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {hours && <TimeCard kind="clock" label="ÅPENT" value={hours} pageW={pageW} />}
              {grillingHours && <TimeCard kind="grill" label="GRILLING" value={grillingHours} pageW={pageW} />}
            </div>
          )}
        </div>
      </div>

      {/* ── BUNN: mørk seksjon med partnere + jubileumslogoer ── */}
      {showBottom && (
        <div
          style={{
            position: "absolute",
            top: `${topHeightMm}mm`,
            left: 0,
            right: 0,
            bottom: 0,
            background: FT_INK,
            padding: `${pageW * 0.03}mm ${pageW * 0.05}mm ${pageW * 0.025}mm`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* "Møt ekspertene"-banner */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: `${pageW * 0.015}mm`,
              marginBottom: `${pageW * 0.02}mm`,
              fontFamily: MONO,
              fontSize: `${pageW * 0.019}mm`,
              fontWeight: 700,
              letterSpacing: `${pageW * 0.003}mm`,
              textTransform: "uppercase",
              color: GOLD_BOTTOM,
            }}
          >
            <span style={{ width: `${pageW * 0.04}mm`, height: `${pageW * 0.002}mm`, background: `linear-gradient(to right, transparent, ${GOLD_BOTTOM})` }} />
            <span style={{ whiteSpace: "nowrap" }}>Møt ekspertene · Få faglig påfyll · Still spørsmål</span>
            <span style={{ width: `${pageW * 0.04}mm`, height: `${pageW * 0.002}mm`, background: `linear-gradient(to left, transparent, ${GOLD_BOTTOM})` }} />
          </div>

          {/* Partner-grid 4×2 */}
          {partners.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: `${pageW * 0.012}mm`,
                width: "100%",
                maxWidth: `${pageW * 0.88}mm`,
              }}
            >
              {partners.slice(0, 8).map((p, i) => (
                <PartnerTile key={i} partner={p} pageW={pageW} sizeScale={partnerScale} />
              ))}
            </div>
          )}

          {/* Jubileumslogoer 25 + 100 */}
          {slide.bottom_logo && (
            <div
              style={{
                marginTop: `${pageW * 0.025}mm`,
                display: "flex",
                alignItems: "center",
                gap: `${pageW * 0.04}mm`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_URLS[slide.bottom_logo === "custom" ? "jub-25" : slide.bottom_logo] ?? ""}
                alt=""
                style={{ height: `${pageW * 0.06 * jubLogoScale}mm`, width: "auto", objectFit: "contain" }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={LOGO_URLS["jub-100"] ?? ""}
                alt=""
                style={{ height: `${pageW * 0.05 * jubLogoScale}mm`, width: "auto", objectFit: "contain" }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tids-kort (klokke + grilling) ─────────────────────────────────────

function TimeCard({
  kind,
  label,
  value,
  pageW,
}: {
  kind: "clock" | "grill";
  label: string;
  value: string;
  pageW: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: `${pageW * 0.015}mm`,
        padding: `${pageW * 0.018}mm ${pageW * 0.028}mm`,
        background: "rgba(0,0,0,0.28)",
        border: `${pageW * 0.0028}mm solid rgba(255,255,255,0.85)`,
        borderRadius: `${pageW * 0.008}mm`,
      }}
    >
      {kind === "clock" ? (
        <svg width={`${pageW * 0.04}mm`} height={`${pageW * 0.04}mm`} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9.5" stroke="white" strokeWidth="1.6" />
          <path d="M12 7v5l3 2" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width={`${pageW * 0.04}mm`} height={`${pageW * 0.04}mm`} viewBox="0 0 24 24" fill="none">
          <path d="M12 3 C 10 6, 7.5 8, 7 11 C 6.4 14.5, 8.5 17.5, 12 18 C 15.5 17.5, 17.6 14.5, 17 11 C 16.5 8.5, 14.5 7.5, 13.5 5 C 13 4, 12.5 3.4, 12 3 Z" fill="white" opacity="0.9" />
          <path d="M12 8 C 10.8 10, 9.8 11.5, 9.5 13 C 9.2 14.8, 10.4 16.4, 12 16.6 C 13.6 16.4, 14.8 14.8, 14.5 13 C 14.2 11.5, 13.2 10, 12 8 Z" fill="#FFD86C" />
        </svg>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: `${pageW * 0.003}mm` }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: `${pageW * 0.016}mm`,
            fontWeight: 700,
            letterSpacing: `${pageW * 0.0028}mm`,
            opacity: 0.75,
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: `${pageW * 0.034}mm`,
            fontWeight: 800,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

// ── Partner-tile (hvit card med logo eller tekst-fallback) ────────────

function PartnerTile({
  partner,
  pageW,
  sizeScale = 1,
}: {
  partner: {
    name: string;
    logo_url?: string;
    badge?: string;
    filter_black?: boolean;
    scale?: number;
  };
  pageW: number;
  sizeScale?: number;
}) {
  const hasLogo = !!partner.logo_url;
  const rawScale = partner.scale ?? 1;
  const effectiveScale = rawScale > 1 ? rawScale * 0.3 + 0.7 : 1;
  const filter = partner.filter_black ? "brightness(0)" : undefined;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: `${pageW * 0.08 * sizeScale}mm`,
        background: "#fff",
        borderRadius: `${pageW * 0.008}mm`,
        padding: `${pageW * 0.008}mm`,
        overflow: "hidden",
        boxShadow: `0 ${pageW * 0.003}mm ${pageW * 0.008}mm rgba(0,0,0,0.18)`,
      }}
    >
      {hasLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={partner.logo_url}
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
            fontWeight: 900,
            fontSize: `${pageW * 0.022}mm`,
            color: FT_INK,
            textAlign: "center",
            textTransform: "uppercase",
          }}
        >
          {partner.name}
        </div>
      )}
    </div>
  );
}
