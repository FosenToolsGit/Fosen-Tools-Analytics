/**
 * Innleggsmaler — dispatcher.
 *
 * 12 mal-arketyper × 3 retninger (A/B/C) × 3 format (fb/ig/li) = 108 layouts.
 * Portert fra Claude Design-handoff. Hver layout er en deterministisk
 * HTML→PNG-render.
 */

import { ASPECT_DIMS, type AspectKey, renderInnleggPng } from "./core";
import * as P from "./produkt";
import * as G2 from "./gruppe2";
import * as G3 from "./gruppe3";
import * as G4 from "./gruppe4";

export type InnleggMal =
  | "produkt-single"
  | "produkt-grid"
  | "produkt-mfr"
  | "produkt-variant"
  | "feature"
  | "prosess"
  | "leveranse"
  | "besok"
  | "stand"
  | "ansatt"
  | "sitat"
  | "milepael";

export type InnleggVariant = "A" | "B" | "C";
export type { AspectKey };

// Hver mal-funksjon: (W, H, data) → full HTML-streng.
type RenderFn = (W: number, H: number, data: unknown) => string;
const fn = (f: unknown): RenderFn => f as RenderFn;

const REGISTRY: Record<InnleggMal, Record<InnleggVariant, RenderFn>> = {
  "produkt-single": {
    A: fn(P.produktSingleA),
    B: fn(P.produktSingleB),
    C: fn(P.produktSingleC),
  },
  "produkt-grid": {
    A: fn(P.produktGridA),
    B: fn(P.produktGridB),
    C: fn(P.produktGridC),
  },
  "produkt-mfr": {
    A: fn(P.produktMfrA),
    B: fn(P.produktMfrB),
    C: fn(P.produktMfrC),
  },
  "produkt-variant": {
    A: fn(P.produktVariantA),
    B: fn(P.produktVariantB),
    C: fn(P.produktVariantC),
  },
  feature: { A: fn(G2.featureA), B: fn(G2.featureB), C: fn(G2.featureC) },
  prosess: { A: fn(G2.prosessA), B: fn(G2.prosessB), C: fn(G2.prosessC) },
  leveranse: {
    A: fn(G2.leveranseA),
    B: fn(G2.leveranseB),
    C: fn(G2.leveranseC),
  },
  besok: { A: fn(G3.besokA), B: fn(G3.besokB), C: fn(G3.besokC) },
  stand: { A: fn(G3.standA), B: fn(G3.standB), C: fn(G3.standC) },
  ansatt: { A: fn(G3.ansattA), B: fn(G3.ansattB), C: fn(G3.ansattC) },
  sitat: { A: fn(G4.sitatA), B: fn(G4.sitatB), C: fn(G4.sitatC) },
  milepael: {
    A: fn(G4.milepaelA),
    B: fn(G4.milepaelB),
    C: fn(G4.milepaelC),
  },
};

export const INNLEGG_MALER: InnleggMal[] = Object.keys(
  REGISTRY
) as InnleggMal[];

export function isInnleggMal(s: string): s is InnleggMal {
  return s in REGISTRY;
}

/** Bygg HTML for én layout. */
export function buildInnleggHtml(
  mal: InnleggMal,
  variant: InnleggVariant,
  aspect: AspectKey,
  data: unknown
): string {
  const dim = ASPECT_DIMS[aspect] ?? ASPECT_DIMS.fb;
  const variants = REGISTRY[mal];
  if (!variants) throw new Error(`Ukjent mal: ${mal}`);
  const render = variants[variant] ?? variants.A;
  return render(dim.w, dim.h, data ?? {});
}

/** Render én layout til PNG. */
export async function renderInnlegg(
  mal: InnleggMal,
  variant: InnleggVariant,
  aspect: AspectKey,
  data: unknown
): Promise<{ base64: string; mimeType: string; width: number; height: number }> {
  const dim = ASPECT_DIMS[aspect] ?? ASPECT_DIMS.fb;
  const html = buildInnleggHtml(mal, variant, aspect, data);
  const png = await renderInnleggPng(html, dim.w, dim.h);
  return { ...png, width: dim.w, height: dim.h };
}

// Re-eksporter data-typene så API/UI kan importere dem ett sted.
export type {
  ProduktItem,
  ProduktSingleData,
  ProduktGridData,
  ProduktMfrData,
  ProduktVariantData,
  ProduktVariantColor,
} from "./produkt";
export type { FeatureData, ProsessData, LeveranseData } from "./gruppe2";
export type { BesokData, StandData, AnsattData } from "./gruppe3";
export type { SitatData, MilepaelData } from "./gruppe4";
