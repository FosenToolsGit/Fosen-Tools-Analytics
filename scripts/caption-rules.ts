/**
 * caption-rules.ts — caption-validator + caption-helpers.
 *
 * Brukes av dagens-innlegg.ts og uke-batch.ts før vi skriver
 * captions.md, slik at brand-regelbrudd alltid stoppes på lokal-maskinen
 * og aldri når Adrian sin Meta Business Suite.
 *
 * Det er én ting å huske: en regelbrudd er en BUG, ikke en stil-feil.
 * Hvis du blir fristet til å whitelistinge en frase fordi "det er
 * dramatisk", endre regelen — ikke captionen.
 */

import { FORBIDDEN_PHRASES } from "../remotion/ft-vocab";

export type ValidationResult = {
  ok: boolean;
  errors: { phrase: string; reason: string; match: string }[];
  warnings: { phrase: string; reason: string }[];
};

/** Ekstraher en caption-blokk per plattform fra captions.md-formatet
 *  (kodeblokker mellom ``` ``` etter "## Facebook" / "## Instagram" /
 *  "## LinkedIn"). Returnerer { facebook, instagram, linkedin }. */
function extractPlatformCaptions(md: string): {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
} {
  const result: { facebook?: string; instagram?: string; linkedin?: string } = {};
  const platforms: { key: keyof typeof result; header: RegExp }[] = [
    { key: "facebook", header: /^##\s+Facebook\b/im },
    { key: "instagram", header: /^##\s+Instagram\b/im },
    { key: "linkedin", header: /^##\s+LinkedIn\b/im },
  ];
  for (const { key, header } of platforms) {
    const m = md.match(header);
    if (!m) continue;
    const start = m.index! + m[0].length;
    const rest = md.slice(start);
    const block = rest.match(/```[\s\S]*?```/);
    if (block) {
      result[key] = block[0].replace(/^```|```$/g, "").trim();
    }
  }
  return result;
}

/** Sjekk caption-tekst mot brand-vokabular. Returner detaljerte
 *  feilmeldinger. ok=false → ikke skriv captionen, fiks først.
 *  Hvis input er captions.md (med "## Facebook"-headers), valideres
 *  hver plattform-blokk separat. */
export function validateCaption(text: string): ValidationResult {
  const errors: ValidationResult["errors"] = [];
  for (const { pattern, reason } of FORBIDDEN_PHRASES) {
    const m = text.match(pattern);
    if (m) {
      errors.push({ phrase: pattern.toString(), reason, match: m[0] });
    }
  }

  const warnings: ValidationResult["warnings"] = [];

  // Ekstraher per-plattform blokker hvis dette er captions.md
  const platforms = extractPlatformCaptions(text);
  const hasPlatformBlocks = Object.keys(platforms).length > 0;

  // ⚠️ Em-dash i prosa er overbruk (memory-regel norsk tegnsetting).
  // OK i klokkeslett (10:00–16:00 med en-dash). Mer enn 1 em-dash
  // omgitt av mellomrom per plattform-blokk = warning.
  for (const [platform, body] of Object.entries(platforms)) {
    if (!body) continue;
    const emDashInProse = body.match(/\s—\s/g);
    if (emDashInProse && emDashInProse.length > 1) {
      warnings.push({
        phrase: "em-dash overbruk",
        reason: `${platform}: ${emDashInProse.length}× " — " — vurder komma.`,
      });
    }
  }

  // ⚠️ For lang hovedtekst per plattform (300+ tegn gir -44%).
  for (const [platform, body] of Object.entries(platforms)) {
    if (!body) continue;
    const mainText = body
      .replace(/#\S+/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\n+/g, " ")
      .trim();
    if (mainText.length > 320) {
      warnings.push({
        phrase: "for lang",
        reason: `${platform}: ${mainText.length} tegn hovedtekst, over 300 gir -44%.`,
      });
    }
  }

  // ⚠️ Direkte spørsmål-åpning på første linje i hver caption-blokk.
  for (const [platform, body] of Object.entries(platforms)) {
    if (!body) continue;
    const firstLine = body.split("\n")[0] ?? "";
    if (/\?$/.test(firstLine.trim())) {
      warnings.push({
        phrase: "direkte spørsmål åpning",
        reason: `${platform}: åpner med spørsmål (-33% engasjement).`,
      });
    }
  }

  // Hvis vi ikke har plattform-blokker (kallet med ren tekst, ikke
  // hele captions.md), gjør én generisk lengde-sjekk så validator
  // funker for begge use-cases.
  if (!hasPlatformBlocks) {
    const mainText = text.replace(/#\S+/g, "").replace(/https?:\/\/\S+/g, "");
    if (mainText.length > 320) {
      warnings.push({
        phrase: "for lang",
        reason: `${mainText.length} tegn — over 300 gir -44%.`,
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/** Skriv validerings-resultatet til console (lar dagens-innlegg.ts
 *  bare logge det og fortsette eller stoppe etter behov). */
export function logValidation(label: string, result: ValidationResult): void {
  if (result.errors.length > 0) {
    console.log(`\n  ❌ ${label}: ${result.errors.length} regelbrudd`);
    for (const e of result.errors) {
      console.log(`     ${e.reason} (fant: "${e.match}")`);
    }
  }
  if (result.warnings.length > 0) {
    console.log(`\n  ⚠️  ${label}: ${result.warnings.length} advarsler`);
    for (const w of result.warnings) {
      console.log(`     ${w.reason}`);
    }
  }
  if (result.ok && result.warnings.length === 0) {
    console.log(`  ✓ ${label}: ren`);
  }
}

/** Rens em-dash til komma der det er prosa-overbruk (men beholder
 *  en-dash i klokkeslett som "10:00–16:00"). Brukes av caption-gen
 *  for automatisk å produsere ren prosa. */
export function normalizeEmDashToComma(text: string): string {
  // Bytt " — " (mellomrom + em-dash + mellomrom) til ", ".
  return text.replace(/\s—\s/g, ", ");
}
