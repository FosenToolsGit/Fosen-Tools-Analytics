// PDF-eksport for etiketter.
//
// Genererer én PDF med én side per produkt, hver side eksakt 60×28mm.
// Tekst rendres som vektor via jsPDF.text(). QR rendres som PNG (300dpi)
// via qrcode-pakken → toDataURL → jsPDF.addImage.
//
// Workflow for bruker: åpne PDF → Cmd+P → velg Brother QL-580N + DK-11209 +
// «Skala: 100%» → Print. Brother-driver kutter automatisk mellom etiketter.

import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { EtikettProduct } from "./types";
import { LABEL_W_MM, LABEL_H_MM, effective } from "./types";

/** Påfør UTM-parametere hvis URL peker på fosen-tools.no */
function withUtm(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("fosen-tools.no") && !u.searchParams.has("utm_source")) {
      u.searchParams.set("utm_source", "etikett");
      u.searchParams.set("utm_medium", "hyllekant");
      return u.toString();
    }
  } catch { /* ignore */ }
  return url;
}

/**
 * Renderer en etikett til en eksisterende jsPDF-side.
 * Forutsetter at sidedimensjonen allerede er satt riktig (60×28mm).
 */
async function renderLabel(pdf: jsPDF, product: EtikettProduct): Promise<void> {
  const W = LABEL_W_MM;
  const H = LABEL_H_MM;
  const pad = 2; // mm
  const qrSize = 22; // mm
  const gap = 2; // mm

  const eff = effective(product);

  // ─── QR-kode (høyre side) ─────────────────────────────────
  const qrX = W - pad - qrSize;
  const qrY = (H - qrSize) / 2;
  const qrUrl = withUtm(product.source_url);
  const qrDataUrl = await QRCode.toDataURL(qrUrl, {
    width: 300, // høy oppløsning, jsPDF skalerer ned
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });
  pdf.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

  // ─── Tekstfelt (venstre) ──────────────────────────────────
  const textX = pad;
  const textW = qrX - pad - gap; // tilgjengelig bredde for tekst

  // Produktnavn — fet, 10pt (≈3.5mm høy), auto-fit på max 3 linjer
  let nameSize = 10;
  let nameLines: string[] = [];
  while (nameSize >= 6) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(nameSize);
    nameLines = pdf.splitTextToSize(eff.name || "(uten navn)", textW);
    if (nameLines.length <= 3) break;
    nameSize -= 1;
  }
  // Tegn navn — line-height = font-size i mm (1pt ≈ 0.3528mm)
  const lineH = (nameSize * 0.3528) * 1.15;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(nameSize);
  pdf.setTextColor(0, 0, 0);
  const linesToDraw = nameLines.slice(0, 3);
  linesToDraw.forEach((line, i) => {
    // jsPDF y baseline — top + lineH * (i + 1) for første tekst-baseline
    pdf.text(line, textX, pad + lineH * (i + 0.85));
  });

  // SKU — courier (monospace), 8pt, mørk grå, bunn
  pdf.setFont("courier", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(75, 85, 99);
  pdf.text(`Art.nr ${eff.sku || "—"}`, textX, H - pad - 1);
}

export async function exportEtiketterToPdf(
  products: EtikettProduct[],
  filename = "etiketter",
): Promise<void> {
  if (products.length === 0) {
    throw new Error("Ingen produkter — legg til minst ett før eksport.");
  }

  // jsPDF: format [width, height] for portrait. For en 60mm bred × 28mm høy
  // etikett (bredere enn høy) bruker vi landscape-orientering med format [28, 60]
  // — da blir sidene 60×28 etter rotasjon. (Eller portrait med [60, 28], jsPDF
  // tar største som høyde i portrait; vi velger landscape eksplisitt for klarhet.)
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [LABEL_H_MM, LABEL_W_MM],
  });

  for (let i = 0; i < products.length; i++) {
    if (i > 0) {
      pdf.addPage([LABEL_H_MM, LABEL_W_MM], "landscape");
    }
    await renderLabel(pdf, products[i]);
  }

  const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, "_") || "etiketter";
  pdf.save(`${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
