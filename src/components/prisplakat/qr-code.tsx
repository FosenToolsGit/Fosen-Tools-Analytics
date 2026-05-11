"use client";

// Ekte QR-kode-komponent. Bruker `qrcode`-npm-pakke som genererer SVG-strenger
// klient-side. URL-en får automatisk UTM-parametere for sporing.

import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface Props {
  url: string;
  size?: number;
  /** UTM-source som legges på automatisk hvis URL er fosen-tools.no */
  utmSource?: string;
  utmMedium?: string;
}

export function QrCode({ url, size = 80, utmSource = "prisplakat", utmMedium = "print" }: Props) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let finalUrl = url;
    // Legg på UTM hvis fosen-tools.no
    try {
      const u = new URL(url);
      if (u.hostname.endsWith("fosen-tools.no") && !u.searchParams.has("utm_source")) {
        u.searchParams.set("utm_source", utmSource);
        u.searchParams.set("utm_medium", utmMedium);
        finalUrl = u.toString();
      }
    } catch { /* ignore */ }

    QRCode.toString(finalUrl, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      width: size,
      color: { dark: "#000", light: "#fff" },
    })
      .then((s) => { if (!cancelled) setSvg(s); })
      .catch(() => { if (!cancelled) setSvg(null); });

    return () => { cancelled = true; };
  }, [url, size, utmSource, utmMedium]);

  if (!svg) {
    return (
      <div style={{
        width: size, height: size, background: "#fff",
        border: "1px solid #d1d5db",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Roboto Mono, monospace", fontSize: 8, color: "#9ca3af",
      }}>QR</div>
    );
  }

  return (
    <div
      style={{ width: size, height: size, background: "#fff" }}
      // SVG-streng fra qrcode-pakken er sikker (genererer kun path-elementer)
      dangerouslySetInnerHTML={{ __html: svg.replace(/<svg([^>]*)>/, '<svg$1 style="width:100%;height:100%;display:block">') }}
    />
  );
}
