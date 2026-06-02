/**
 * leverandor-fra-pdf.ts — bygger FTLeverandorNyhet-data fra en PDF.
 *
 * Adrian gir produkt-PDF fra Milwaukee/Wera/Husqvarna etc.; vi
 * ekstraherer produktnavn, USP-bullets og lager `data.json` som kan
 * mates direkte til `npm run dagens -- --type ft-leverandor --data ...`.
 *
 * STUB-status (2026-06-02): PDF-tekst-ekstraksjon er minimal i denne
 * iterasjonen. Når første ekte PDF kommer, oppgrader denne med
 * `pdf-parse` eller `pdfjs-dist` for å hente tekst-blokker, og evt.
 * bruk Gemini for å klassifisere "dette er produktnavnet, dette er
 * USP-bullets".
 *
 * Bruk:
 *   npm run leverandor -- \
 *     --pdf path/to/milwaukee-katalog.pdf \
 *     --supplier milwaukee \
 *     --output scripts/data/leverandor-milwaukee-{produkt}.json
 *
 * Etter at JSON er bygget:
 *   npm run dagens -- --type ft-leverandor \
 *     --data scripts/data/leverandor-milwaukee-...json
 */

import { writeFileSync, existsSync } from "node:fs";
import { dirname, basename } from "node:path";
import { mkdirSync } from "node:fs";

import { getLeverandor, listLeverandorer } from "../remotion/leverandor-registry";

// ── arg-parsing ────────────────────────────────────────────────────

const args = process.argv.slice(2);
function arg(name: string, def?: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  return args[i + 1] ?? def;
}

const pdfPath = arg("pdf");
const supplierSlug = arg("supplier");
const productName = arg("product"); // overstyrer auto-detect
const taglineOverride = arg("tagline");
const bulletsRaw = arg("bullets"); // komma-separert
const outputPath = arg("output");

if (!supplierSlug) {
  console.error(
    "❌ --supplier mangler. Tilgjengelige slugs:\n   " +
      listLeverandorer().map((l) => l.slug).join(", "),
  );
  process.exit(1);
}

const supplier = getLeverandor(supplierSlug);
if (!supplier) {
  console.error(
    `❌ Ukjent leverandør: ${supplierSlug}. Legg til entry i remotion/leverandor-registry.ts først.`,
  );
  process.exit(1);
}

console.log(`\n📦 Leverandør: ${supplier.displayName} (${supplier.slug})`);

// ── PDF-ekstraksjon (stub — full impl venter på første ekte PDF) ──

let extractedProductName = productName ?? "[PRODUKTNAVN]";
let extractedBullets: string[] = bulletsRaw
  ? bulletsRaw.split(/\s*[,;|]\s*/).filter(Boolean).slice(0, 4)
  : [];
let extractedTagline = taglineOverride ?? supplier.defaultTagline ?? "Ny i sortimentet";

if (pdfPath) {
  if (!existsSync(pdfPath)) {
    console.error(`❌ PDF ikke funnet: ${pdfPath}`);
    process.exit(1);
  }
  console.log(`📄 PDF: ${pdfPath}`);
  console.log(
    `\n⚠️  PDF-ekstraksjon er ikke implementert ennå (stub-versjon).`,
  );
  console.log(
    `   Når første ekte leverandør-PDF kommer, oppgrader denne med`,
  );
  console.log(`   pdf-parse eller pdfjs-dist for å hente tekst-blokker.`);
  console.log(`   For nå: bruk --product, --bullets, --tagline manuelt.`);
}

if (!productName && !pdfPath) {
  console.log(
    `\nℹ️  Verken --product eller --pdf oppgitt. Lager mal-JSON som du kan fylle inn manuelt.`,
  );
}

// ── bygg FTLeverandorNyhet-data ────────────────────────────────────

const data = {
  format: "reel" as const,
  supplierSlug: supplier.slug,
  supplierName: supplier.displayName,
  supplierLogoUrl: supplier.logoUrl,
  productName: extractedProductName,
  productTagline: extractedTagline,
  bullets: extractedBullets.length > 0
    ? extractedBullets
    : ["[USP 1]", "[USP 2]", "[USP 3]"],
  productImageUrl: null,
  ctaUrl: `fosen-tools.no/${supplier.slug}`,
};

// ── skriv output ───────────────────────────────────────────────────

const outPath = outputPath ?? `scripts/data/leverandor-${supplier.slug}-${slugify(extractedProductName)}.json`;
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(data, null, 2));

console.log(`\n✅ Data skrevet: ${outPath}`);
console.log(`\nGenerér video med:`);
console.log(`  npm run dagens -- --type ft-leverandor --data ${outPath}`);
console.log(``);

// ── helpers ────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ÆØÅæøå]/g, (c) => ({ Æ: "ae", Ø: "o", Å: "a", æ: "ae", ø: "o", å: "a" })[c]!)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
