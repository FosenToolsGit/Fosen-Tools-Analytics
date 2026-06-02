/**
 * jubileum-a5-pdf.ts — Genererer jubileums-plakat A5 PDF til Downloads.
 *
 * Kjører renderJubPosterPng-servicen lokalt (krever dev-server kjører
 * på localhost:3000 så Playwright kan hente assets), konverterer PNG
 * til A5 PDF via pdf-lib.
 *
 *   tsx scripts/jubileum-a5-pdf.ts
 *
 * Output: ~/Downloads/jubileum-plakat-a5-{date}.pdf
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { jsPDF } from "jspdf";

import {
  DEFAULT_JUB_POSTER,
  renderJubPosterPng,
} from "../src/lib/services/jubileum-poster";

async function main() {
  const BASE_URL = process.env.SERVER_URL || "http://localhost:3000";

  console.log(`📍 Genererer A5 jubileums-plakat ...`);
  console.log(`   baseUrl: ${BASE_URL} (må ha dev-server kjørende)\n`);

  const input = {
    format: "a5" as const,
    eyebrow: DEFAULT_JUB_POSTER.eyebrow,
    dateLine: DEFAULT_JUB_POSTER.dateLine,
    headlines: DEFAULT_JUB_POSTER.headlines,
    subtitle: DEFAULT_JUB_POSTER.subtitle,
    partnersTagline: DEFAULT_JUB_POSTER.partnersTagline,
    partners: DEFAULT_JUB_POSTER.partners,
    openingHours: "10:00–16:00",
    grillingHours: "11:00–13:00",
  };

  const t0 = performance.now();
  const result = await renderJubPosterPng(input, BASE_URL);
  const renderSec = ((performance.now() - t0) / 1000).toFixed(1);
  const pngBuffer = Buffer.from(result.base64, "base64");

  console.log(
    `✓ PNG rendret: ${result.width}×${result.height} ` +
      `(${(pngBuffer.byteLength / 1024 / 1024).toFixed(1)} MB, ${renderSec}s)`,
  );

  // Konverter PNG → A5 PDF via jsPDF
  // A5 = 148×210 mm (portrait)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5",
  });
  const dataUri = `data:image/png;base64,${result.base64}`;
  doc.addImage(dataUri, "PNG", 0, 0, 148, 210, undefined, "FAST");
  const pdfBytes = Buffer.from(doc.output("arraybuffer"));

  const dateStr = new Date().toISOString().slice(0, 10);
  const downloadsDir = join(homedir(), "Downloads");
  mkdirSync(downloadsDir, { recursive: true });
  const outPath = join(
    downloadsDir,
    `jubileum-plakat-a5-${dateStr}.pdf`,
  );
  writeFileSync(outPath, pdfBytes);

  console.log(`\n✅ PDF skrevet: ${outPath}`);
  console.log(`   ${(pdfBytes.byteLength / 1024 / 1024).toFixed(1)} MB`);
  console.log(`\nÅpne med:`);
  console.log(`  open "${outPath}"`);
}

main().catch((err) => {
  console.error("\n❌ Feilet:", err);
  process.exit(1);
});
