"use client";

// PDF-eksport for A4-prisplakater — bruker modern-screenshot + jsPDF
// (samme pipeline som brosjyre-editoren).

import { domToCanvas } from "modern-screenshot";
import jsPDF from "jspdf";
import type { PricetagProduct, PricetagFormat, PricetagSettings } from "./types";

interface ExportOptions {
  title: string;
  format: PricetagFormat;
  products: PricetagProduct[];
  settings: PricetagSettings;
  onProgress?: (current: number, total: number) => void;
}

export async function exportPricetagToPdf(opts: ExportOptions): Promise<void> {
  const isA5 = opts.format === "a5_kundeark";
  if (!opts.format.startsWith("a4_") && !isA5) {
    throw new Error("Kun A4 og A5-format kan eksporteres til PDF");
  }

  const pageEls = Array.from(
    document.querySelectorAll(isA5 ? ".a5-pricetag" : ".a4-pricetag"),
  ) as HTMLElement[];
  if (pageEls.length === 0) throw new Error("Ingen sider å eksportere");

  // Vent på fonter og bilder
  if (document.fonts) await document.fonts.ready;
  await Promise.all(
    pageEls.flatMap(el => Array.from(el.querySelectorAll("img"))).map(
      (img: HTMLImageElement) => new Promise<void>((resolve) => {
        if (img.complete && img.naturalWidth > 0) return resolve();
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
        setTimeout(() => resolve(), 8000);
      })
    )
  );

  const pageFormat = isA5 ? "a5" : "a4";
  const pageW = isA5 ? 148 : 210;
  const pageH = isA5 ? 210 : 297;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: pageFormat, compress: true });

  for (let i = 0; i < pageEls.length; i++) {
    opts.onProgress?.(i + 1, pageEls.length);
    const el = pageEls[i];

    // Midlertidig fjern transform-scale så vi ikke får skalert kanvas
    const prevTransform = el.style.transform;
    const parent = el.parentElement;
    const prevParentTransform = parent?.style.transform;
    el.style.transform = "none";
    if (parent) parent.style.transform = "none";

    try {
      const canvas = await domToCanvas(el, {
        scale: 3,
        backgroundColor: "#ffffff",
        fetch: { requestInit: { cache: "no-cache" } },
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      if (i > 0) pdf.addPage(pageFormat, "portrait");
      pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
    } finally {
      el.style.transform = prevTransform;
      if (parent && prevParentTransform !== undefined) parent.style.transform = prevParentTransform;
    }
  }

  const safeName = opts.title.replace(/[^\w\sæøåÆØÅ-]/g, "").replace(/\s+/g, "-").slice(0, 80);
  pdf.save(`${safeName}.pdf`);
}
