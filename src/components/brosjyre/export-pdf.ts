"use client";

// Auto-PDF-eksport via modern-screenshot + jspdf.
// modern-screenshot bruker SVG foreignObject for browser-nativ tekst-rendering,
// så PDF matcher editor-preview pixel for pixel.

import { domToCanvas } from "modern-screenshot";
import jsPDF from "jspdf";
import type { BrochureDoc } from "./types";

interface ExportOptions {
  doc: BrochureDoc;
  /** Filename uten endelse — .pdf legges til. */
  filename?: string;
  /** Callback for progress: (current, total) */
  onProgress?: (current: number, total: number) => void;
}

/**
 * Konverter Azure Blob-URL til vår proxy så html2canvas kan lese pikslene.
 * Andre URLer (f.eks. data:-URL fra opplastede bilder) går rett gjennom.
 */
export function proxyImageUrl(url: string | null | undefined): string | null | undefined {
  if (!url) return url;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("blob:")) return url;
  if (url.startsWith("/")) return url;
  try {
    const u = new URL(url);
    const allowed = [
      "mc10256fosentools.blob.core.windows.net",
      "fosen-tools.no",
      "www.fosen-tools.no",
    ];
    let supabaseHost: string | null = null;
    try { supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname; } catch { /* ignore */ }
    const isAllowed = allowed.includes(u.hostname) || (supabaseHost !== null && u.hostname === supabaseHost);
    if (isAllowed) {
      return `/api/brosjyre/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  } catch {
    return url;
  }
}

/**
 * Vent til alle <img> i et element har lastet (eller feilet).
 */
async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, 8000);
        })
    )
  );
}

/**
 * Vent til alle inline-SVG-containere har gått fra "pending" til "ready".
 * SVG-er hentes via fetch i InlineSvg-komponenten — dette sikrer at de er
 * rendret før html2canvas kjører.
 */
async function waitForInlineSvgs(root: HTMLElement, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const pending = root.querySelectorAll('[data-inline-svg="pending"]');
    if (pending.length === 0) return;
    await new Promise((r) => setTimeout(r, 100));
  }
}

const MM_PER_INCH = 25.4;

export async function exportBrochureToPdf({ doc, filename, onProgress }: ExportOptions): Promise<void> {
  // Finn alle .page-paper i print-root
  const printRoot = document.querySelector(".brosjyre-editor .print-root") as HTMLElement | null;
  if (!printRoot) {
    throw new Error("Print-root ikke funnet — er editoren montert?");
  }

  // Midlertidig vis print-root så html2canvas kan rendre. Vi flytter den ut av view i stedet.
  const prevDisplay = printRoot.style.display;
  const prevPos = printRoot.style.position;
  const prevTop = printRoot.style.top;
  const prevLeft = printRoot.style.left;
  const prevZ = printRoot.style.zIndex;
  printRoot.style.display = "block";
  printRoot.style.position = "fixed";
  printRoot.style.top = "0";
  printRoot.style.left = "-100000px"; // utenfor viewport
  printRoot.style.zIndex = "-1";

  // Bytt ut Azure-URLer med proxy-URLer på live DOM så html2canvas slipper CORS
  const imgs = Array.from(printRoot.querySelectorAll("img")) as HTMLImageElement[];
  const originalSrcs: string[] = [];
  imgs.forEach((img) => {
    originalSrcs.push(img.src);
    const proxied = proxyImageUrl(img.src);
    if (proxied && proxied !== img.src) {
      img.src = proxied;
    }
  });

  // Samme behandling for background-image (når ProductImage rendrer i "cover"-modus)
  const elementsWithBg = Array.from(
    printRoot.querySelectorAll<HTMLElement>('[style*="background-image"]')
  );
  const originalBgs: Array<{ el: HTMLElement; bg: string }> = [];
  elementsWithBg.forEach((el) => {
    const bg = el.style.backgroundImage;
    originalBgs.push({ el, bg });
    const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
    if (m) {
      const proxied = proxyImageUrl(m[1]);
      if (proxied && proxied !== m[1]) {
        el.style.backgroundImage = `url("${proxied}")`;
      }
    }
  });

  try {
    // Vent på alle web-fonter — uten dette blir tekst rendret med fallback-fonter
    // selv om Roboto 900 er lastet, og PDF ser annerledes ut enn editor-preview.
    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
    } catch {
      // ignorer
    }

    await waitForImages(printRoot);
    await waitForInlineSvgs(printRoot);

    // Tving reflow så font-metrikker oppdateres og layout settles. Uten dette
    // kan html2canvas fange en layout beregnet med fallback-fonter selv om de
    // riktige fonter er lastet.
    void printRoot.offsetHeight;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const pages = Array.from(printRoot.querySelectorAll(".page-paper")) as HTMLElement[];
    if (pages.length === 0) throw new Error("Ingen sider å eksportere");

    // Bestem PDF-format ut fra første side (alle bør ha samme paper-id i normal bruk)
    const firstPage = doc.pages[0];
    const orientation: "portrait" | "landscape" = firstPage.w > firstPage.h ? "landscape" : "portrait";
    const pdf = new jsPDF({
      orientation,
      unit: "mm",
      format: orientation === "landscape" ? [firstPage.h, firstPage.w] : [firstPage.w, firstPage.h],
      compress: true,
    });

    for (let i = 0; i < pages.length; i++) {
      onProgress?.(i + 1, pages.length);
      const pageEl = pages[i];
      const pageDoc = doc.pages[i];

      // modern-screenshot rendrer DOM til canvas via SVG <foreignObject> +
      // riktig font-handling. Tekst-baseline matcher browseren eksakt.
      const canvas = await domToCanvas(pageEl, {
        scale: 3,
        backgroundColor: pageDoc?.bg ?? "#ffffff",
        // Forsøk å embed cross-origin assets så foreignObject kan lese dem
        fetch: { requestInit: { cache: "no-cache" } },
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      if (i > 0) {
        const pageOrientation: "portrait" | "landscape" = pageDoc.w > pageDoc.h ? "landscape" : "portrait";
        pdf.addPage(
          pageOrientation === "landscape" ? [pageDoc.h, pageDoc.w] : [pageDoc.w, pageDoc.h],
          pageOrientation
        );
      }

      // Plasser bildet over hele siden i mm
      pdf.addImage(imgData, "JPEG", 0, 0, pageDoc.w, pageDoc.h, undefined, "FAST");
    }

    // Filename
    const safeName = (filename ?? doc.title)
      .replace(/[^\w\sæøåÆØÅ-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80);
    pdf.save(`${safeName}.pdf`);
  } finally {
    // Restaurer print-root style
    printRoot.style.display = prevDisplay;
    printRoot.style.position = prevPos;
    printRoot.style.top = prevTop;
    printRoot.style.left = prevLeft;
    printRoot.style.zIndex = prevZ;
    // Restaurer src
    imgs.forEach((img, idx) => { img.src = originalSrcs[idx]; });
    // Restaurer background-image
    originalBgs.forEach(({ el, bg }) => { el.style.backgroundImage = bg; });
  }

  // Mute lengthy guard
  void MM_PER_INCH;
}
