// Minimal type-deklarasjon for pdf-parse v1.1.1 — pakken har ingen
// offisielle types, og Vercel build feiler på TS7016 ved dynamisk import.
declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
  }
  function pdfParse(
    buffer: Buffer | Uint8Array,
    options?: Record<string, unknown>,
  ): Promise<PdfParseResult>;
  export = pdfParse;
}
