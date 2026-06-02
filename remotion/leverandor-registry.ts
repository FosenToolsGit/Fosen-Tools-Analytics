// Leverandør-registry — slug → display-navn + logo-URL.
//
// Per memory (feedback_leverandor_logoer_lokal.md): master-SVG-ene
// ligger i `Logoer/Logoer Wheel/SVG/` og er upload-et til Supabase som
// 400×400 PNG via `scripts/upload-leverandor-logoer.mjs`. URL-mønster:
//   https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/
//     social_assets/brand-assets/leverandor-logoer/{slug}.png
//
// Bruk i Remotion: Hook F (leverandor-tagin) + FTLeverandorNyhet
// leser herfra. For å legge til ny leverandør: drop SVG i
// Logoer/Logoer Wheel/SVG/{slug}.svg, kjør upload-script, legg til
// entry her.

const SUPABASE_BASE =
  "https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/social_assets/brand-assets/leverandor-logoer";

export type LeverandorMeta = {
  slug: string;
  displayName: string; // hvordan vi sier merket på SoMe (Zweibrüder ikke Ledlenser)
  logoUrl: string;
  /** Default tagline for "nyhet fra X" — kan overstyres per post. */
  defaultTagline?: string;
  /** Hvilken vinkel selger best? (memory: HDFI > generelt) */
  hookAngle?: "premium" | "innovasjon" | "robust" | "skreddersom-kompatibel";
};

export const LEVERANDORER: Record<string, LeverandorMeta> = {
  milwaukee: {
    slug: "milwaukee",
    displayName: "MILWAUKEE",
    logoUrl: `${SUPABASE_BASE}/milwaukee.png`,
    defaultTagline: "Mer moment. Lengre kjøretid.",
    hookAngle: "robust",
  },
  wera: {
    slug: "wera",
    displayName: "WERA",
    logoUrl: `${SUPABASE_BASE}/wera.png`,
    defaultTagline: "Tysk presisjon siden 1936",
    hookAngle: "premium",
  },
  zweibruder: {
    slug: "zweibruder",
    displayName: "ZWEIBRÜDER",
    logoUrl: `${SUPABASE_BASE}/zweibruder.png`,
    defaultTagline: "Tysk LED-teknologi",
    hookAngle: "innovasjon",
  },
  husqvarna: {
    slug: "husqvarna",
    displayName: "HUSQVARNA",
    logoUrl: `${SUPABASE_BASE}/husqvarna.png`,
    defaultTagline: "Profesjonell kraft",
    hookAngle: "robust",
  },
  stahlwille: {
    slug: "stahlwille",
    displayName: "STAHLWILLE",
    logoUrl: `${SUPABASE_BASE}/stahlwille.png`,
    defaultTagline: "Tysk verktøy-tradisjon",
    hookAngle: "premium",
  },
  facom: {
    slug: "facom",
    displayName: "FACOM",
    logoUrl: `${SUPABASE_BASE}/facom.png`,
    defaultTagline: "The Art of Precision",
    hookAngle: "premium",
  },
  pelicase: {
    slug: "pelicase",
    displayName: "PELICASE",
    logoUrl: `${SUPABASE_BASE}/pelicase.png`,
    defaultTagline: "Vanntett. Støtsikker. Skreddersom-klar.",
    hookAngle: "skreddersom-kompatibel",
  },
  knipex: {
    slug: "knipex",
    displayName: "KNIPEX",
    logoUrl: `${SUPABASE_BASE}/knipex.png`,
    defaultTagline: "Tysk tang-tradisjon",
    hookAngle: "premium",
  },
};

/** Slå opp leverandør, returner undefined hvis ukjent. */
export function getLeverandor(slug: string): LeverandorMeta | undefined {
  return LEVERANDORER[slug.toLowerCase()];
}

/** Returnerer en liste over alle registrerte leverandører. */
export function listLeverandorer(): LeverandorMeta[] {
  return Object.values(LEVERANDORER);
}
