// FT-vokabular — den eneste autoritative kilden for tekst som vises i
// Remotion-videoer eller i auto-genererte captions. Hvis det skal stå
// på en FT-flate, kommer det HERFRA.
//
// Regelverk (oppsummert fra CLAUDE.md + memory):
//
//   ✓ "på Brekstad" — ALDRI "i Brekstad"
//   ✓ "CNC-maskinert" — ALDRI "CNC-frest"
//   ✓ "HDFI" alene — ALDRI "HDFI-skum", "HDFI-skuminnlegg", "HDFI-innlegg"
//   ✓ Komma som default separator i prosa — em-dash kun i klokkeslett
//     (10:00–16:00) og noen få dramatiske kolon-erstatninger
//   ✓ Ingen "tom skuff"-mantra, ingen "antall-som-feature" ("6 ledige skuffer")
//   ✓ Ingen "plastplate" når vi mener HDFI
//   ✓ FG-godkjent våpenskap fører vi IKKE — neg-keyword, ikke salg
//   ✓ Mobilhotell fører vi
//   ✓ Forsvar nevnes diskré (ikke som hovedfokus) — -94% hvis det er åpningen
//   ✓ "Skreddersydd / HDFI / spesialtilpasset" gir +144% engasjement
//
// Når noe legges til her, må Adrian godkjenne det. Ingen ad-hoc fraser.

// ── Taglines (kortform under wordmark / outro) ─────────────────────

export const TAGLINES: readonly string[] = [
  "Skreddersydd på Brekstad",
  "HDFI · CADLAB · Brekstad",
  "Riktig verktøy. Riktig kontroll.",
  "Verktøykontroll for fagfolk",
  "Egen produksjon · 25 år · Brekstad",
  "Sertifisert leverandør gjennom 25 år",
  "Egen CADLAB · CNC-maskinert",
  "FOD-sikker verktøykontroll",
];

/** Pluk en tagline deterministisk fra en seed (typisk dag-i-året). */
export function pickTagline(seed: number): string {
  const idx = ((seed % TAGLINES.length) + TAGLINES.length) % TAGLINES.length;
  return TAGLINES[idx]!;
}

// ── Eyebrow-fraser (over H1 i Scene 2) ─────────────────────────────

export const EYEBROWS = {
  levert: (kunde: string) => `Levert til ${kunde}`,
  hdfi: "Egen produksjon · HDFI",
  cadlab: "CADLAB · Brekstad",
  prosess: "Slik lager vi din HDFI",
  hvorfor: "Hvorfor HDFI",
  sammenligning: "Hyllevare vs HDFI",
  resultat: "Kundens resultat",
  nyhet: (merke: string) => `Nyhet fra ${merke}`,
  milepel: "Milepæl",
  sertifisert: "Sertifisert leverandør",
  forsvar: "Levert til Forsvaret", // bruk DISKRÉT, ikke som hovedfokus
} as const;

// ── Outro-CTAer ────────────────────────────────────────────────────

export const CTA = {
  default: "fosen-tools.no",
  hdfi: "fosen-tools.no/hdfi",
  demo: "Få en demo · fosen-tools.no",
  custom: "Vi designer skreddersydd · fosen-tools.no/custom",
  aviation: "fosen-tools.no/aviation",
  referanser: "fosen-tools.no/referanser",
  kontakt: "fosen-tools.no/kontakt",
} as const;

// ── Brand-fakta som ofte må stemple seg på flater ───────────────────

export const FACTS = {
  etablert: "Etablert 2001",
  jubileum: "25 år",
  konsernAlder: "100 år (4. gen.)",
  by: "Brekstad",
  adresse: "Industrigata 1, Brekstad",
  helikopterlanding: "Helikopterlandingsplass på anlegget",
  energi: "100% fornybar (solcellepark 2023)",
  cadlab: "Egen CADLAB",
  cnc: "CNC-maskinert",
  miljøfyrtårn: "Miljøfyrtårn-sertifisert",
} as const;

// ── Forbudt-liste (caption-validator slår alarm) ────────────────────

export const FORBIDDEN_PHRASES: readonly { pattern: RegExp; reason: string }[] = [
  { pattern: /\bi\s+Brekstad\b/i, reason: 'Bruk "på Brekstad", ikke "i Brekstad"' },
  { pattern: /CNC-frest/i, reason: 'Bruk "CNC-maskinert", ikke "CNC-frest"' },
  { pattern: /HDFI-skum(innlegg)?/i, reason: 'Bruk "HDFI" alene, ikke "HDFI-skum(innlegg)"' },
  { pattern: /HDFI-innlegg/i, reason: 'Bruk "HDFI" alene, ikke "HDFI-innlegg"' },
  { pattern: /plastplate/i, reason: 'Bruk "HDFI" — ikke "plastplate" når vi mener HDFI' },
  { pattern: /tom skuff/i, reason: 'Unngå "tom skuff"-mantra (avvist 12. mai)' },
  { pattern: /seks?\s+(ledige|tomme)\s+skuffer/i, reason: 'Ikke "antall-som-feature" (avvist 12. mai)' },
  { pattern: /FG-godkjent.*våpenskap/i, reason: "Vi fører IKKE FG-godkjente våpenskap" },
];

// ── Hashtags pr emne ───────────────────────────────────────────────

export const HASHTAGS = {
  base: ["#FosenTools", "#Skreddersøm", "#HDFI", "#Brekstad"] as readonly string[],
  byTopic: {
    referanse: ["#Leveranse", "#Verktøykontroll", "#CADLAB"],
    hdfi: ["#HDFI", "#FOD", "#CNCmaskinert", "#Verktøykontroll"],
    prosess: ["#CADLAB", "#CNCmaskinert", "#Produksjon"],
    sammenligning: ["#HDFI", "#FOD", "#Verktøykontroll"],
    resultat: ["#ROI", "#Resultat", "#Kundehistorie"],
    hvorfor: ["#HDFI", "#FOD", "#Sertifisert"],
    leverandor: ["#Nyhet", "#Verktøy"],
    milepel: ["#25år", "#Jubileum", "#Fagfolk"],
    sitat: ["#Kundehistorie", "#Stolt"],
    definisjon: ["#Fagord", "#HDFI"],
  } as Record<string, string[]>,
} as const;
