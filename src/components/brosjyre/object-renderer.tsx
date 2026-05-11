"use client";

// Render-funksjoner for hver objekt-type på canvas. Alle størrelser er i mm.

import { useEffect, useState } from "react";
import type {
  PageObject,
  Product,
  BurstStyle,
  PriceBlockProps,
  BadgeProps,
  BannerProps,
  TextProps,
  ImageProps,
  ShapeProps,
  ContactProps,
  FooterProps,
  GalleryProps,
  ProductCardProps,
  ComboCardProps,
  SigillProps,
  BrandTokens,
} from "./types";
import { MM_TO_PX, formatNOK, DEFAULT_TOKENS } from "./store";
import { NeonCard, Eyebrow, RedDivider, PriceBurst, FTStripe, Sigill25Aar, SertifikatBaand, LogoTicker } from "./ft-svg";

interface RendererCtx {
  tokens: BrandTokens;
}

// SVG-cache så vi ikke fetcher samme fil flere ganger
const svgCache = new Map<string, string>();

/**
 * Inline-SVG-renderer. Henter SVG-tekst, fjerner explicit width/height så
 * elementet skalerer naturlig, og rendrer som inline DOM. Dette løser
 * html2canvas' upålitelige støtte for ekstern SVG via <img>.
 */
function InlineSvg({ src, label }: { src: string; label?: string }) {
  const [svgText, setSvgText] = useState<string | null>(svgCache.get(src) ?? null);

  useEffect(() => {
    if (svgCache.has(src)) {
      setSvgText(svgCache.get(src)!);
      return;
    }
    let cancelled = false;
    fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((text) => {
        // Fjern explicit width/height så SVG kan skalere etter container
        const cleaned = text
          .replace(/(<svg[^>]*?)\swidth="[^"]*"/i, "$1")
          .replace(/(<svg[^>]*?)\sheight="[^"]*"/i, "$1");
        svgCache.set(src, cleaned);
        if (!cancelled) setSvgText(cleaned);
      })
      .catch(() => {
        if (!cancelled) setSvgText(null);
      });
    return () => { cancelled = true; };
  }, [src]);

  if (!svgText) {
    // Loading state — markert som pending for export-pdf-flyten
    return (
      <div
        data-inline-svg="pending"
        style={{ width: "100%", height: "100%" }}
        aria-label={label || ""}
      />
    );
  }

  return (
    <div
      data-inline-svg="ready"
      aria-label={label || ""}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      // SVG-strenger fra public/-mappen er klarert (vi serverer dem selv)
      dangerouslySetInnerHTML={{
        __html: svgText.replace(
          /<svg/i,
          '<svg style="width:100%;height:100%;display:block" preserveAspectRatio="xMidYMid meet"',
        ),
      }}
    />
  );
}

// ---------------- Produktbilde — bruk image_url hvis satt, ellers monogram ----------------
function ProductImage({ src, label, mono, fit = "contain" }: { src?: string | null; label?: string; mono?: string; fit?: "cover" | "contain" }) {
  const isSvg = !!src && /\.svg($|\?)/i.test(src);

  if (src && isSvg) {
    // Inline SVG for skarp PDF-eksport (html2canvas-vennlig)
    return <InlineSvg src={src} label={label} />;
  }

  if (src) {
    // For "contain": flex-senter med max-w/max-h. html2canvas respekterer ikke object-fit
    // pålitelig, så vi unngår det. For "cover" bruker vi background-image som er CSS-only og
    // også canvas-trygt.
    if (fit === "cover") {
      return (
        <div style={{
          width: "100%", height: "100%", position: "relative", overflow: "hidden",
          backgroundImage: `url("${src.replace(/"/g, '\\"')}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          // Ingen backgroundColor — la parent bestemme. Logo med tint trenger transparent bg.
        }} aria-label={label || ""} />
      );
    }
    return (
      <div style={{
        width: "100%", height: "100%", position: "relative", overflow: "hidden",
        // Ingen background — la parent (produktkort, side, etc.) bestemme.
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label || ""}
          style={{
            display: "block",
            maxWidth: "100%",
            maxHeight: "100%",
            width: "auto",
            height: "auto",
          }}
        />
      </div>
    );
  }
  return (
    <div style={{
      width: "100%", height: "100%", position: "relative", overflow: "hidden",
      background: "linear-gradient(135deg, #f1f3f7 0%, #e6eaf0 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "repeating-linear-gradient(45deg, transparent 0 14px, rgba(15,23,42,0.04) 14px 15px)",
      }} />
      {mono ? (
        <div className="ft-heading" style={{
          fontSize: "3.6em", color: "rgba(15,23,42,0.18)",
          letterSpacing: "0.02em", textAlign: "center", lineHeight: 1, padding: "8%",
        }}>{mono}</div>
      ) : (
        <div style={{
          fontFamily: "Roboto Mono, monospace", fontSize: "0.9em",
          color: "rgba(15,23,42,0.5)", letterSpacing: 0.5, textAlign: "center", padding: "8%",
        }}>{label || "[ produktbilde ]"}</div>
      )}
    </div>
  );
}

// Bakoverkompatibel alias for kart utenfor product card (image-blokken bruker den fortsatt for label/mono)
const ImgPlaceholder = ({ label, mono }: { label?: string; mono?: string }) => <ProductImage label={label} mono={mono} />;

// ---------------- Burst / Badge ----------------
// Star + ribbon bruker SVG-polygoner i stedet for CSS clip-path fordi
// html2canvas ikke støtter komplekse clip-paths (rendres som firkanter i PDF).

function BurstShape({ style, color = "#ed1c24", textColor = "#fff", text, fontSize = 14 }: {
  style: BurstStyle;
  color?: string;
  textColor?: string;
  text?: string | null;
  fontSize?: number;
}) {
  const txtStyle: React.CSSProperties = {
    color: textColor,
    fontFamily: "var(--heading-stack)",
    fontWeight: 900,
    textTransform: "uppercase",
    fontSize: `${(fontSize || 14) / 14}em`,
    lineHeight: 0.95,
    textAlign: "center",
    whiteSpace: "pre-line",
    letterSpacing: "-0.01em",
  };
  const txt = <span style={txtStyle}>{text || "-30%"}</span>;

  if (style === "circle") {
    return (
      <div style={{
        width: "100%", height: "100%", borderRadius: "50%", background: color,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "10%",
        boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
      }}>{txt}</div>
    );
  }

  if (style === "ribbon") {
    // SVG polygon — kanvas-vennlig
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
        >
          <polygon points="0,0 100,0 90,50 100,100 0,100 10,50" fill={color} />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "6%",
        }}>{txt}</div>
      </div>
    );
  }

  if (style === "diagonal") {
    return (
      <div style={{
        width: "100%", height: "100%", background: color, transform: "skewX(-12deg)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "6%",
      }}>
        <div style={{ transform: "skewX(12deg)" }}>{txt}</div>
      </div>
    );
  }

  if (style === "stamp") {
    return (
      <div style={{
        width: "100%", height: "100%", border: `2px solid ${color}`, borderRadius: 2,
        color, transform: "rotate(-6deg)",
        display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--heading-stack)",
        fontWeight: 900, textTransform: "uppercase", padding: "6%", textAlign: "center", lineHeight: 0.95,
        background: "rgba(255,255,255,0.85)", letterSpacing: "0.02em",
      }}>
        <div style={{ fontSize: `${(fontSize || 14) / 14}em` }}>{text || "KAMPANJE"}</div>
      </div>
    );
  }

  // star (default) — 14-punkts SVG-polygon
  const points = 14;
  const inner = 0.74;
  const coords: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? 50 : 50 * inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    coords.push(`${(50 + Math.cos(a) * r).toFixed(2)},${(50 + Math.sin(a) * r).toFixed(2)}`);
  }
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      >
        <polygon points={coords.join(" ")} fill={color} />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16%",
      }}>{txt}</div>
    </div>
  );
}

// ---------------- Pris-blokk — single-span lines, html2canvas-trygt ----------------
function PriceBlock({ priceBefore, priceNow, vatMode = "ex", color = "#ed1c24", size = 1, ctx }: PriceBlockProps & { ctx: RendererCtx }) {
  const showBefore = priceBefore && priceBefore !== priceNow;
  const savings = showBefore ? priceBefore - priceNow : 0;
  return (
    <div className="ft-heading" style={{
      display: "block",
      color: "#111",
      fontSize: `${size}em`,
      borderLeft: `4px solid ${color}`,
      paddingLeft: "0.4em",
      lineHeight: 1,
      // Ingen letter-spacing — gir overlap-issues i kanvas
    }}>
      {showBefore && (
        <div style={{
          fontSize: "0.55em",
          color: "#9ca3af",
          fontWeight: 600,
          textDecoration: "line-through",
          textDecorationColor: color,
          textDecorationThickness: "1.5px",
          lineHeight: 1.3,
          marginBottom: "0.3em",
        }}>
          Før {formatNOK(priceBefore)}
        </div>
      )}
      {/* Hovedpris — én span, samme størrelse på alt inkl. ",-" suffiks.
          Forhindrer baseline-shift mellom mixed-size spans i html2canvas. */}
      <div style={{
        color,
        lineHeight: 1,
        marginBottom: "0.5em",
        fontSize: "2.0em",
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}>
        {formatNOK(priceNow)}
      </div>
      <div style={{ lineHeight: 1.4, fontSize: "0.55em" }}>
        <span style={{
          color: "#6b7280",
          fontWeight: 500,
          marginRight: "0.6em",
        }}>
          {vatMode === "ex" ? "Eks. mva" : `Inkl. ${ctx.tokens.vatRate || 25}% mva`}
        </span>
        {savings > 0 && (
          <span style={{
            fontWeight: 800,
            color: "#fff",
            background: color,
            padding: "2px 7px",
            borderRadius: 3,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            display: "inline-block",
            lineHeight: 1.4,
          }}>
            Spar {formatNOK(savings)}
          </span>
        )}
      </div>
    </div>
  );
}

const monoFor = (p: Product | undefined): string => {
  if (!p) return "•";
  const m = (p.manufacturer || "").trim();
  if (m) return m.split(/\s+/).map(s => s[0]).join("").slice(0, 2).toUpperCase();
  return (p.name || "?").slice(0, 1).toUpperCase();
};

/**
 * Liten "Art.nr"-label. Bruker Fosen Tools-artikkelnummer (Multicase prd-num-label).
 * Vises konsekvent som monospace for at "123766" skal være lett å lese opp i butikk.
 */
function SkuLabel({ sku, sizeEm = 0.62 }: { sku?: string | null; sizeEm?: number }) {
  if (!sku) return null;
  return (
    <div style={{
      fontFamily: "Roboto Mono, monospace",
      fontSize: `${sizeEm}em`,
      color: "#6b7280",
      letterSpacing: "0.02em",
      lineHeight: 1.2,
    }}>
      Art.nr: <span style={{ color: "#111", fontWeight: 600 }}>{sku}</span>
    </div>
  );
}

/**
 * Vis produsent-logo hvis tilgjengelig, ellers tekst-label. Brukes i alle
 * produktkort-varianter. heightEm angir høyden i em (relativ til kortets fontSize).
 */
function ManufacturerBadge({ product, accent, heightEm = 0.7 }: { product: Product | undefined; accent: string; heightEm?: number }) {
  if (product?.manufacturer_logo_url) {
    return (
      <div style={{ height: `${heightEm}em`, display: "flex", alignItems: "center", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.manufacturer_logo_url}
          alt={product.manufacturer}
          style={{ display: "block", maxHeight: "100%", maxWidth: "100%", width: "auto", height: "auto" }}
        />
      </div>
    );
  }
  // Fallback: tekst-label i original stil
  return (
    <span className="ft-heading" style={{ fontSize: `${heightEm * 0.75}em`, color: accent, letterSpacing: "0.08em", textTransform: "uppercase" }}>
      {product?.manufacturer}
    </span>
  );
}

// Map gammel BurstStyle → PriceBurst-variant (FT-designsystemet).
// "star" var default — vi bytter til "bullseye" som er FT-signaturen.
function burstVariantFor(style: BurstStyle): "bullseye" | "star14" | "ribbon" | "badge" | "square" {
  if (style === "circle") return "bullseye";
  if (style === "ribbon") return "ribbon";
  if (style === "stamp") return "badge";
  if (style === "diagonal") return "badge";
  return "bullseye"; // "star" → bullseye (FT default)
}

// ---------------- Produktkort ----------------
function ProductCard({ props, ctx }: { props: ProductCardProps; ctx: RendererCtx }) {
  const { product, variant, showBurst, burstStyle, burstText, showStock, vatMode, bulletCount, bgColor, accentColor } = props;
  const accent = accentColor || ctx.tokens.red;
  const burstCopy = burstText || (product?.discount_pct ? `−${product.discount_pct}%` : null);
  const burstVariant = burstVariantFor(burstStyle);

  const heroLayout = variant === "hero";
  const compactLayout = variant === "compact";
  const compareLayout = variant === "compare";

  // FT neon-rails — 3px røde vertikale stenger på begge sider.
  // Erstatter borderSoft 1px frame med signaturmønsteret fra fosen-tools.no.
  const ftFrame: React.CSSProperties = {
    borderRadius: 0,
    borderLeft: `3px solid ${accent}`,
    borderRight: `3px solid ${accent}`,
    borderTop: `1px solid ${ctx.tokens.borderSoft}`,
    borderBottom: `1px solid ${ctx.tokens.borderSoft}`,
  };

  const bullets = (product?.bullets || []).slice(0, bulletCount || 3);
  const monogram = monoFor(product);

  if (compareLayout) {
    return (
      <div className="ft-body" style={{
        width: "100%", height: "100%", background: bgColor || "#fff",
        display: "grid", gridTemplateColumns: "0.85fr 1.5fr 1fr",
        ...ftFrame, overflow: "hidden", position: "relative",
      }}>
        <div style={{ position: "relative", borderRight: `1px solid ${ctx.tokens.borderSoft}` }}>
          <ProductImage src={product?.image_url} mono={monogram} label={product?.image_placeholder} fit="contain" />
          {showBurst && burstCopy && (
            <div style={{ position: "absolute", top: "8%", left: "8%", width: "30%", aspectRatio: "1/1" }}>
              <PriceBurst variant={burstVariant} color={accent} primary={burstCopy} secondary={null} size={80} primarySize={20} />
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "4% 5%", gap: "2%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 2, background: accent }} />
            <ManufacturerBadge product={product} accent={accent} heightEm={1.0} />
          </div>
          <div className="ft-heading" style={{ fontSize: "1.43em", color: "#111", marginTop: 4, lineHeight: 1.05 }}>{product?.name}</div>
          <SkuLabel sku={product?.sku} sizeEm={0.7} />
          {bullets.length > 0 && (
            <ul className="ft-body" style={{ fontSize: "0.75em", color: "#4b5563", marginTop: "4%", paddingLeft: "1em", lineHeight: 1.45, listStyle: "none" }}>
              {bullets.map((b, i) => (
                <li key={i} style={{ position: "relative", paddingLeft: "0.7em", marginBottom: "0.3em" }}>
                  <span style={{ position: "absolute", left: 0, top: "0.55em", width: 4, height: 1.5, background: accent }} />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center",
          padding: "4% 5%", borderLeft: `1px solid ${ctx.tokens.borderSoft}`, background: "#fafbfc",
        }}>
          <PriceBlock priceBefore={product?.price_before} priceNow={product?.price_now} vatMode={vatMode} strikeStyle="diagonal" suffixSize={0.5} color={accent} size={1.1} ctx={ctx} />
          {showStock && (
            <div style={{ marginTop: "8%", display: "flex", alignItems: "center", gap: 5, fontSize: "0.75em", color: "#4b5563", lineHeight: 1 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: product?.in_stock ? "#16a34a" : "#dc2626", flexShrink: 0, display: "inline-block" }} />
              <span style={{ lineHeight: 1 }}>{product?.in_stock ? "På lager" : "På bestilling"}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (heroLayout) {
    return (
      <div className="ft-body" style={{
        width: "100%", height: "100%", background: bgColor || "#fff",
        display: "grid", gridTemplateColumns: "1.1fr 1fr",
        ...ftFrame, overflow: "hidden", position: "relative",
      }}>
        <div style={{ position: "relative", borderRight: `1px solid ${ctx.tokens.borderSoft}`, background: "#f5f7fa" }}>
          <ProductImage src={product?.image_url} mono={monogram} label={product?.image_placeholder} fit="contain" />
          {showBurst && burstCopy && (
            <div style={{ position: "absolute", top: "5%", right: "5%", width: "26%", aspectRatio: "1/1" }}>
              <PriceBurst variant={burstVariant} color={accent} primary={burstCopy} size={140} primarySize={32} />
            </div>
          )}
          {showStock && (
            <div style={{
              position: "absolute", bottom: "4%", left: "4%", display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.96)", padding: "4px 10px", borderRadius: 999, fontSize: "0.82em",
              fontWeight: 500, color: "#111", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", lineHeight: 1,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: product?.in_stock ? "#16a34a" : "#dc2626", flexShrink: 0, display: "inline-block" }} />
              <span style={{ lineHeight: 1 }}>{product?.in_stock ? "På lager" : "Bestilling"}</span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", padding: "6% 6%", gap: "3%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 20, height: 2, background: accent }} />
            <ManufacturerBadge product={product} accent={accent} heightEm={1.3} />
          </div>
          <div className="ft-heading" style={{ fontSize: "2.1em", color: "#111", lineHeight: 1.05, marginTop: "2%" }}>
            {product?.name}
          </div>
          <SkuLabel sku={product?.sku} sizeEm={0.85} />
          {bullets.length > 0 && (
            <ul className="ft-body" style={{ fontSize: "0.82em", color: "#4b5563", marginTop: "4%", paddingLeft: 0, lineHeight: 1.5, listStyle: "none", flexGrow: 1 }}>
              {bullets.map((b, i) => (
                <li key={i} style={{ position: "relative", paddingLeft: "0.9em", marginBottom: "0.4em" }}>
                  <span style={{ position: "absolute", left: 0, top: "0.65em", width: 5, height: 1.5, background: accent }} />
                  {b}
                </li>
              ))}
            </ul>
          )}
          <div style={{ marginTop: "auto", paddingTop: "5%", borderTop: `1px solid ${ctx.tokens.borderSoft}` }}>
            <PriceBlock priceBefore={product?.price_before} priceNow={product?.price_now} vatMode={vatMode} strikeStyle="diagonal" suffixSize={0.5} color={accent} size={1.3} ctx={ctx} />
          </div>
        </div>
      </div>
    );
  }

  if (compactLayout) {
    return (
      <div className="ft-body" style={{
        width: "100%", height: "100%", background: bgColor || "#fff",
        display: "flex", flexDirection: "column",
        ...ftFrame, overflow: "hidden", position: "relative",
      }}>
        <div style={{ position: "relative", height: "52%", background: "#f5f7fa", borderBottom: `1px solid ${ctx.tokens.borderSoft}` }}>
          <ProductImage src={product?.image_url} mono={monogram} fit="contain" />
          {showBurst && burstCopy && (
            <div style={{ position: "absolute", top: "6%", right: "6%", width: "32%", aspectRatio: "1/1" }}>
              <PriceBurst variant={burstVariant} color={accent} primary={burstCopy} secondary={null} size={60} primarySize={14} />
            </div>
          )}
        </div>
        <div style={{ padding: "6% 7% 5%", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", gap: "3%" }}>
          <div>
            <div style={{ marginBottom: "3%" }}>
              <ManufacturerBadge product={product} accent={accent} heightEm={0.85} />
            </div>
            <div className="ft-heading" style={{ fontSize: "0.9em", color: "#111", lineHeight: 1.1 }}>{product?.name}</div>
            <div style={{ marginTop: "2%" }}>
              <SkuLabel sku={product?.sku} sizeEm={0.55} />
            </div>
          </div>
          <PriceBlock priceBefore={product?.price_before} priceNow={product?.price_now} vatMode={vatMode} strikeStyle="diagonal" suffixSize={0.5} color={accent} size={0.65} ctx={ctx} />
        </div>
      </div>
    );
  }

  // Standard
  return (
    <div className="ft-body" style={{
      width: "100%", height: "100%", background: bgColor || "#fff",
      display: "flex", flexDirection: "column",
      ...ftFrame, overflow: "hidden", position: "relative",
    }}>
      <div style={{ position: "relative", height: "52%", background: "#f5f7fa", borderBottom: `1px solid ${ctx.tokens.borderSoft}` }}>
        <ProductImage src={product?.image_url} mono={monogram} label={product?.image_placeholder} fit="contain" />
        {showBurst && burstCopy && (
          <div style={{ position: "absolute", top: "-8%", right: "5%", width: "26%", aspectRatio: "1/1" }}>
            <PriceBurst variant={burstVariant} color={accent} primary={burstCopy} size={88} primarySize={20} />
          </div>
        )}
        {showStock && (
          <div style={{
            position: "absolute", bottom: "5%", left: "5%", display: "flex", alignItems: "center", gap: 5,
            background: "rgba(255,255,255,0.96)", padding: "3px 8px", borderRadius: 999, fontSize: "0.75em",
            fontWeight: 500, color: "#111", lineHeight: 1,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: product?.in_stock ? "#16a34a" : "#dc2626", flexShrink: 0, display: "inline-block" }} />
            <span style={{ lineHeight: 1 }}>{product?.in_stock ? "På lager" : "Bestilling"}</span>
          </div>
        )}
      </div>
      <div style={{ padding: "5% 6%", display: "flex", flexDirection: "column", flex: 1, gap: "3%", minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <span style={{ width: 10, height: 1.5, background: accent }} />
          <ManufacturerBadge product={product} accent={accent} heightEm={0.95} />
        </div>
        <div className="ft-heading" style={{
          fontSize: "1.17em", color: "#111", lineHeight: 1.1, flexShrink: 0,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {product?.name}
        </div>
        <div style={{ flexShrink: 0 }}>
          <SkuLabel sku={product?.sku} sizeEm={0.6} />
        </div>
        {bullets.length > 0 && (
          <ul className="ft-body" style={{
            fontSize: "0.68em", color: "#4b5563", marginTop: "1%", paddingLeft: 0,
            lineHeight: 1.4, listStyle: "none",
            flex: "1 1 0", minHeight: 0, overflow: "hidden",
            display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
          }}>
            {bullets.slice(0, 2).map((b, i) => (
              <li key={i} style={{ position: "relative", paddingLeft: "0.8em", marginBottom: "0.25em" }}>
                <span style={{ position: "absolute", left: 0, top: "0.55em", width: 4, height: 1.2, background: accent }} />
                {b}
              </li>
            ))}
          </ul>
        )}
        <div style={{
          marginTop: "auto", paddingTop: "3%",
          borderTop: `1px solid ${ctx.tokens.borderSoft}`,
          flexShrink: 0,
        }}>
          <PriceBlock priceBefore={product?.price_before} priceNow={product?.price_now} vatMode={vatMode} strikeStyle="diagonal" suffixSize={0.5} color={accent} size={0.85} ctx={ctx} />
        </div>
      </div>
    </div>
  );
}

// ---------------- Banner ----------------
function Banner({ props }: { props: BannerProps }) {
  const { title, subtitle, style, bg, color } = props;
  if (style === "diagonal") {
    return (
      <div style={{
        width: "100%", height: "100%", background: bg, color, position: "relative", overflow: "hidden",
        clipPath: "polygon(0 0, 100% 0, 100% 78%, 0 100%)",
        padding: "4% 6%", display: "flex", flexDirection: "column", justifyContent: "center", gap: "2%",
      }}>
        <div className="ft-heading" style={{ fontSize: "2.45em", lineHeight: 0.95, letterSpacing: "-0.01em" }}>{title}</div>
        {subtitle && <div className="ft-body" style={{ fontSize: "0.82em", marginTop: 4, opacity: 0.9, letterSpacing: "0.02em" }}>{subtitle}</div>}
      </div>
    );
  }
  if (style === "double") {
    return (
      <div style={{
        width: "100%", height: "100%", background: bg, color, padding: "3% 6%",
        display: "flex", flexDirection: "column", justifyContent: "center",
        borderTop: `2.5mm solid #111`, borderBottom: `2.5mm solid #111`, position: "relative",
      }}>
        <div className="ft-heading" style={{ fontSize: "2.25em", lineHeight: 1, letterSpacing: "-0.01em" }}>{title}</div>
        {subtitle && <div className="ft-body" style={{ fontSize: "0.82em", marginTop: "2%", letterSpacing: "0.02em" }}>{subtitle}</div>}
      </div>
    );
  }
  return (
    <div style={{
      width: "100%", height: "100%", background: bg, color, padding: "3% 6%",
      display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "3%" }}>
        <div style={{ width: "1mm", height: "60%", background: "rgba(255,255,255,0.4)" }} />
        <div className="ft-heading" style={{ fontSize: "2.1em", lineHeight: 1, letterSpacing: "-0.01em" }}>{title}</div>
      </div>
      {subtitle && (
        <div className="ft-body" style={{ fontSize: "0.82em", opacity: 0.92, fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ---------------- Tekst ----------------
function TextObj({ props }: { props: TextProps }) {
  const { content, preset, align, color, weight, italic } = props;
  const sizes: Record<string, string> = { h1: "3.9em", h2: "2.75em", h3: "2.0em", h4: "1.5em", h5: "1.18em", body: "1.3em" };
  const isHeading = preset?.startsWith("h");
  return (
    <div className={isHeading ? "ft-heading" : "ft-body"} style={{
      width: "100%", height: "100%", color,
      fontSize: sizes[preset] || sizes.body,
      fontWeight: isHeading ? 900 : weight,
      fontStyle: italic ? "italic" : "normal",
      textAlign: align,
      whiteSpace: "pre-wrap",
      lineHeight: isHeading ? 1.02 : 1.5,
      letterSpacing: isHeading ? "-0.015em" : 0,
      display: "flex", flexDirection: "column", justifyContent: "flex-start",
    }}>{content}</div>
  );
}

// ---------------- Bilde ----------------
function ImageObj({ props }: { props: ImageProps }) {
  const { src, label, mask, fit, tint } = props;
  const maskCss = mask === "circle" ? "circle(50%)"
    : mask === "hex" ? "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)"
    : "none";
  const filter =
    tint === "white" ? "brightness(0) invert(1)" :
    tint === "dark" ? "brightness(0)" :
    undefined;
  return (
    <div style={{ width: "100%", height: "100%", clipPath: maskCss === "none" ? undefined : maskCss, filter }}>
      {src ? (
        <ProductImage src={src} label={label} fit={(fit as "cover" | "contain") || "cover"} />
      ) : (
        <ImgPlaceholder label={label} />
      )}
    </div>
  );
}

// ---------------- Form ----------------
function ShapeObj({ props }: { props: ShapeProps }) {
  const { shape, fill, stroke, strokeW, radius } = props;
  const common: React.CSSProperties = {
    width: "100%",
    height: "100%",
    background: fill,
    border: stroke && stroke !== "none" ? `${strokeW}px solid ${stroke}` : "none",
  };
  if (shape === "circle") return <div style={{ ...common, borderRadius: "50%" }} />;
  if (shape === "diamond") return <div style={{ ...common, transform: "rotate(45deg)" }} />;
  return <div style={{ ...common, borderRadius: radius || 0 }} />;
}

// ---------------- Footer ----------------
function FooterObj({ props, ctx }: { props: FooterProps; ctx: RendererCtx }) {
  const { left, right, color } = props;
  return (
    <div className="ft-body" style={{
      width: "100%", height: "100%", padding: "0 6%",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      color, fontSize: "0.75em", letterSpacing: "0.04em",
      borderTop: `0.5px solid ${ctx.tokens.borderSoft}`,
    }}>
      <span>{left}</span>
      <span style={{ fontFamily: "Roboto Mono, monospace", fontWeight: 600 }}>{right}</span>
    </div>
  );
}

// ---------------- Kontakt-blokk ----------------
function ContactObj({ props, ctx }: { props: ContactProps; ctx: RendererCtx }) {
  const { phone, email, address, web, showMiljofyrtarn } = props;
  return (
    <div className="ft-body" style={{
      width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: "5%", padding: "3% 4%",
      borderTop: `2px solid ${ctx.tokens.red}`, color: "#111", background: "#fafbfc",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4em" }}>
        <div className="ft-heading" style={{ fontSize: "0.97em", color: ctx.tokens.red, letterSpacing: "0.04em" }}>FOSEN TOOLS AS</div>
        <div style={{ fontSize: "0.75em", lineHeight: 1.55, color: "#374151" }}>
          {phone} · {email}<br />{address} · <span style={{ fontWeight: 600 }}>{web}</span>
        </div>
      </div>
      {showMiljofyrtarn && (
        <div style={{
          fontFamily: "Roboto Mono, monospace", fontSize: "0.65em", color: "#16a34a",
          padding: "5px 8px", border: "1px solid #16a34a", borderRadius: 3, whiteSpace: "nowrap", letterSpacing: "0.04em",
        }}>♻ MILJØFYRTÅRN</div>
      )}
    </div>
  );
}

// ---------------- Galleri ----------------
function GalleryObj({ props, ctx }: { props: GalleryProps; ctx: RendererCtx }) {
  const { cols, products, gap } = props;
  return (
    <div style={{
      width: "100%", height: "100%",
      display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: (gap || 4) * MM_TO_PX,
    }}>
      {(products || []).map((p, i) => (
        <ProductCard
          key={i}
          ctx={ctx}
          props={{
            variant: "compact",
            product: p,
            showBurst: true,
            burstStyle: "star",
            burstText: null,
            showQR: false,
            showStock: false,
            showWarranty: false,
            vatMode: "ex",
            bulletCount: 0,
            bgColor: "#fff",
            accentColor: null,
          }}
        />
      ))}
    </div>
  );
}

// ---------------- Kombi-kort (2 produkter, kombinert pris) ----------------
function ComboCard({ props, ctx }: { props: ComboCardProps; ctx: RendererCtx }) {
  const { productA, productB, comboPrice, comboLabel, vatMode, bgColor, accentColor, showSavings } = props;
  const accent = accentColor || ctx.tokens.red;
  const sumNow = (productA?.price_now || 0) + (productB?.price_now || 0);
  const savings = Math.max(0, sumNow - (comboPrice || 0));
  const monoA = monoFor(productA);
  const monoB = monoFor(productB);

  const Plus = () => (
    <div style={{
      width: 24, height: 24, borderRadius: "50%", background: accent,
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16, fontWeight: 700, flexShrink: 0,
    }}>+</div>
  );

  return (
    <div className="ft-body" style={{
      width: "100%", height: "100%", background: bgColor || "#fff",
      borderRadius: 0,
      borderLeft: `3px solid ${accent}`,
      borderRight: `3px solid ${accent}`,
      borderTop: `1px solid ${ctx.tokens.borderSoft}`,
      borderBottom: `1px solid ${ctx.tokens.borderSoft}`,
      display: "grid", gridTemplateRows: "auto 1fr auto", overflow: "hidden", position: "relative",
    }}>
      <div style={{
        padding: "2.5% 4%", background: accent, color: "#fff",
        fontSize: "0.78em", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
      }}>{comboLabel || "KOMBI-PRIS"}</div>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr",
        gap: "2%", padding: "3.5% 4%", alignItems: "center",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ aspectRatio: "1.5 / 1", background: "#f5f7fa", borderRadius: 3, overflow: "hidden" }}>
            <ProductImage src={productA?.image_url} mono={monoA} label={productA?.image_placeholder} fit="contain" />
          </div>
          <ManufacturerBadge product={productA} accent={accent} heightEm={0.7} />
          <div className="ft-heading" style={{
            fontSize: "0.85em", color: "#111", lineHeight: 1.15,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>{productA?.name}</div>
          <SkuLabel sku={productA?.sku} sizeEm={0.6} />
          <div style={{ fontSize: "0.75em", color: "#6b7280" }}>{formatNOK(productA?.price_now)}</div>
        </div>

        <Plus />

        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <div style={{ aspectRatio: "1.5 / 1", background: "#f5f7fa", borderRadius: 3, overflow: "hidden" }}>
            <ProductImage src={productB?.image_url} mono={monoB} label={productB?.image_placeholder} fit="contain" />
          </div>
          <ManufacturerBadge product={productB} accent={accent} heightEm={0.7} />
          <div className="ft-heading" style={{
            fontSize: "0.85em", color: "#111", lineHeight: 1.15,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>{productB?.name}</div>
          <SkuLabel sku={productB?.sku} sizeEm={0.6} />
          <div style={{ fontSize: "0.75em", color: "#6b7280" }}>{formatNOK(productB?.price_now)}</div>
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        padding: "3% 4%", borderTop: `1px solid ${ctx.tokens.borderSoft}`, background: "#fafbfc",
        gap: 8,
      }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: "0.65em", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>Samlet</div>
          <div className="ft-heading" style={{ fontSize: "1.6em", color: accent, lineHeight: 1.05, marginTop: 2 }}>
            {formatNOK(comboPrice)}
          </div>
          <div style={{ fontSize: "0.6em", color: "#9ca3af", marginTop: 1 }}>
            {vatMode === "inc" ? "Inkl. mva" : "Eks. mva"}
          </div>
        </div>
        {showSavings && savings > 0 && (
          <div style={{
            display: "inline-flex", flexDirection: "column", alignItems: "center",
            background: accent, color: "#fff", padding: "5px 10px", borderRadius: 3,
            transform: "rotate(-3deg)", flexShrink: 0,
          }}>
            <div style={{ fontSize: "0.55em", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1 }}>SPAR</div>
            <div className="ft-heading" style={{ fontSize: "1.05em", lineHeight: 1.1, marginTop: 1 }}>{formatNOK(savings)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- Sigill (FT 25-årsstempel) ----------------
function SigillObj({ props, ctx }: { props: SigillProps; ctx: RendererCtx }) {
  // Bruk container-størrelse — Sigill25Aar tar pikselstørrelse. Vi rendrer
  // i en 100%-bredde wrapper og setter SVG-size til container-bredden.
  // Plassert via CSS-vars så html2canvas/modern-screenshot kan lese.
  const color = props.color || ctx.tokens.red;
  // Vi rendrer alltid i 200px viewBox-skala — SVG skalerer naturlig
  const containerStyle: React.CSSProperties = {
    width: "100%", height: "100%",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  return (
    <div style={containerStyle}>
      <Sigill25Aar
        variant={props.variant}
        size={200}
        rotate={props.rotate ?? -12}
        color={color}
        label={props.label}
        inner={props.inner}
        innerSub={props.innerSub}
      />
    </div>
  );
}

// ---------------- Master switch ----------------
export function ObjectRenderer({ obj, tokens }: { obj: PageObject; tokens?: BrandTokens }) {
  const ctx: RendererCtx = { tokens: tokens ?? DEFAULT_TOKENS };
  switch (obj.type) {
    case "productCard": return <ProductCard props={obj.props} ctx={ctx} />;
    case "priceBlock":  return <PriceBlock {...obj.props} ctx={ctx} />;
    case "badge":       return <BurstShape style={obj.props.style} color={obj.props.color} textColor={obj.props.textColor} text={obj.props.text} fontSize={obj.props.fontSize} />;
    case "banner":      return <Banner props={obj.props} />;
    case "text":        return <TextObj props={obj.props} />;
    case "image":       return <ImageObj props={obj.props} />;
    case "shape":       return <ShapeObj props={obj.props} />;
    case "footer":      return <FooterObj props={obj.props} ctx={ctx} />;
    case "contact":     return <ContactObj props={obj.props} ctx={ctx} />;
    case "gallery":     return <GalleryObj props={obj.props} ctx={ctx} />;
    case "comboCard":   return <ComboCard props={obj.props} ctx={ctx} />;
    case "sigill":      return <SigillObj props={obj.props} ctx={ctx} />;
  }
  return <div style={{ width: "100%", height: "100%", background: "#fee", color: "#900", padding: 6, fontSize: "0.9em" }}>Ukjent objekt</div>;
}

// Re-eksporter for bruk i panels (badge-preview)
export { BurstShape };
