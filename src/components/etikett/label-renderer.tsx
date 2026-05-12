"use client";

// On-screen preview av en 60×28mm etikett.
// PDF-eksporten bruker jsPDF direkte (export-pdf.ts), ikke denne komponenten —
// dette er kun for visning i editoren.

import { QrCode } from "@/components/prisplakat/qr-code";
import type { EtikettProduct } from "./types";
import { LABEL_W_MM, LABEL_H_MM, effective } from "./types";

export function LabelPreview({ product, zoom = 4 }: { product: EtikettProduct; zoom?: number }) {
  const eff = effective(product);
  const pxPerMm = zoom;
  const w = LABEL_W_MM * pxPerMm;
  const h = LABEL_H_MM * pxPerMm;
  const pad = 2 * pxPerMm;
  const qrSize = 22 * pxPerMm;
  const gap = 2 * pxPerMm;

  return (
    <div style={{
      width: w, height: h,
      background: "#fff", color: "#000",
      boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
      border: "1px solid #d1d5db",
      borderRadius: 1,
      display: "flex",
      padding: pad,
      boxSizing: "border-box",
      fontFamily: "system-ui, -apple-system, sans-serif",
      gap,
    }}>
      {/* Tekst-del (venstre) */}
      <div style={{
        flex: 1, minWidth: 0,
        display: "flex", flexDirection: "column",
        justifyContent: "space-between",
      }}>
        <div style={{
          fontWeight: 700,
          fontSize: 3.6 * pxPerMm,
          lineHeight: 1.1,
          textTransform: "uppercase",
          letterSpacing: "-0.01em",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
        }}>
          {eff.name || "(produktnavn)"}
        </div>
        <div style={{
          fontSize: 2.8 * pxPerMm,
          fontFamily: '"Roboto Mono", ui-monospace, monospace',
          color: "#4b5563",
          letterSpacing: "0.02em",
        }}>
          Art.nr {eff.sku || "—"}
        </div>
      </div>

      {/* QR-kode (høyre) */}
      <div style={{ flexShrink: 0, alignSelf: "center" }}>
        <QrCode
          url={product.source_url}
          size={qrSize}
          utmSource="etikett"
          utmMedium="hyllekant"
        />
      </div>
    </div>
  );
}
