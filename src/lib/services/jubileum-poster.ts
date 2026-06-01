// Jubileum-plakat — full-bleed rød FT-plakat med:
//   • FT-wordmark øverst
//   • "25-ÅRSJUBILEUM BUTIKKÅPNING"-eyebrow
//   • "26. JUNI 2026"-hero
//   • Hovedlinjer: LEVERANDØR STANDS · HOLD AV DAGEN
//   • Undertekst: "Vi feirer 25 år & åpner ombygget butikk"
//   • 4×2-grid med 8 partner-logoer (Milwaukee, Wera, Soudal, Picard,
//     Halder, Zweibrüder, Red Bull, Tesla)
//   • Jubileumslogo (offisiell 25-års-SVG) nederst
//
// Renderes deterministisk via Playwright (samme infrastruktur som
// produkt-variant-render / mal-render).

import { fontFaceCss, renderHtmlToPng } from "./render-common";

export const JUBILEUM_FT_RED = "#ED1C24";
/** FT-slate-grå (samme som remotion/theme.ts og brosjyre-paletten). */
export const JUBILEUM_FT_GREY = "#1B1E23";

export type JubPosterFormat = "square" | "feed" | "reel" | "wide" | "a4";

/**
 * A4-print bruker 300 dpi (2480×3508 px) for skarpt print-resultat på
 * vanlig A4-ark (210×297 mm). Hvis Playwright/Chromium henter tregt på
 * så stor canvas kan vi senke til 200 dpi (1654×2339).
 */
export const JUB_POSTER_DIMS: Record<JubPosterFormat, { w: number; h: number; label: string }> = {
  square: { w: 1080, h: 1080, label: "Kvadrat 1:1 (feed/IG)" },
  feed: { w: 1080, h: 1350, label: "Portrett 4:5 (IG-feed)" },
  reel: { w: 1080, h: 1920, label: "Story/Reel 9:16" },
  wide: { w: 1920, h: 1080, label: "Bred 16:9 (LI/skjerm)" },
  a4: { w: 2480, h: 3508, label: "A4 print 300dpi (210×297 mm)" },
};

export interface JubPosterPartner {
  /** Vises som tooltip / for tilgjengelighet. */
  name: string;
  /** Public Supabase URL eller annen tilgjengelig URL. */
  logo_url: string;
  /** Vis logoen invertert til svart-på-rød (Zweibrüder-tilfellet). */
  filter_black?: boolean;
  /** Manuell skala 1.0–4.0 — Wera-logoen er liten i original. */
  scale?: number;
}

export interface JubPosterInput {
  /** Plakat-format. */
  format: JubPosterFormat;
  /** "25-ÅRSJUBILEUM · BUTIKKÅPNING" */
  eyebrow: string;
  /** "26. JUNI 2026" */
  dateLine: string;
  /** To linjer i hero — "LEVERANDØR STANDS" + "HOLD AV DAGEN". */
  headlines: [string, string];
  /** Linje under hero. */
  subtitle: string;
  /** Liten tekst-linje rett over partner-grid'en. */
  partnersTagline: string;
  /** Partner-logoer som vises i grid. */
  partners: JubPosterPartner[];
}

// =============================================================================
// Standard input — alle 8 partnere fra slideshowet, korrekt skalering
// =============================================================================

const SUPABASE_PUBLIC_BASE =
  "https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/social_assets/jubileum-2026/logoer";

export const DEFAULT_JUB_PARTNERS: JubPosterPartner[] = [
  { name: "Milwaukee", logo_url: `${SUPABASE_PUBLIC_BASE}/Milwaukee_Logo.svg` },
  // Wera-logoen har MYE negative space i originalen — skaleres kraftig opp
  { name: "Wera", logo_url: `${SUPABASE_PUBLIC_BASE}/Wera_Tools_logo.svg`, scale: 10 },
  { name: "Soudal", logo_url: `${SUPABASE_PUBLIC_BASE}/Soudal.svg` },
  { name: "Picard", logo_url: `${SUPABASE_PUBLIC_BASE}/RGB_Picard_Logo_2024.svg` },
  // Halder har stor negative space rundt logoen — skaleres opp
  { name: "Halder", logo_url: `${SUPABASE_PUBLIC_BASE}/erwin-halder-kg-vector-logo.svg`, scale: 3 },
  {
    name: "Zweibrüder",
    logo_url: `${SUPABASE_PUBLIC_BASE}/Zweibrueder_Logo_K0.png`,
    filter_black: true,
  },
  { name: "Red Bull", logo_url: `${SUPABASE_PUBLIC_BASE}/redbull-logo-svgrepo-com.svg` },
  { name: "Tesla Mobile Service", logo_url: `${SUPABASE_PUBLIC_BASE}/Tesla_Motors.svg` },
];

export const DEFAULT_JUB_POSTER: Omit<JubPosterInput, "format"> = {
  eyebrow: "25-ÅRSJUBILEUM · GJENÅPNING AV PROFF-BUTIKK",
  dateLine: "26. JUNI 2026",
  headlines: ["LEVERANDØR STANDER", "HOLD AV DAGEN"],
  subtitle: "Vi feirer 25 år & gjenåpner PROFF-butikk · Brekstad",
  partnersTagline: "MØT EKSPERTENE · FÅ FAGLIG PÅFYLL · STILL SPØRSMÅL",
  partners: DEFAULT_JUB_PARTNERS,
};

// =============================================================================
// HTML-bygger
// =============================================================================

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}

/**
 * Lokal kopi av FT-wordmark + 25-årslogo, lagt på public/ slik at Playwright
 * kan loade dem via http://localhost:3000/social/...-stier ved render.
 * Vi serverer dem som absolutte URL-er for å unngå avhengighet til
 * server-base-URL.
 */
const FT_WORDMARK_WHITE = "/social/brand-assets/ft-wordmark-white.png";
const JUBILEUM_LOGO_25 = "/social/brand-assets/jubileum-25aar.png";
const JUBILEUM_LOGO_100 = "/social/brand-assets/jubileum-100aar.png";

export function buildJubPosterHtml(input: JubPosterInput, baseUrl: string): string {
  const dims = JUB_POSTER_DIMS[input.format];
  const W = dims.w;
  const H = dims.h;
  const isLandscape = W > H * 1.2;
  const pad = isLandscape ? W * 0.04 : W * 0.06;

  // Relative font-størrelser justert per format. Headlines må holde seg
  // på én linje selv når logoene tar plass — sjekker text-lengde i
  // tillegg så lengre tekster ikke bryter.
  const scale = Math.min(W, H) / 1080;
  const wordmarkW = isLandscape ? 380 * scale : 460 * scale;
  // Litt mindre enn før så alt sikkert holder seg på én linje med god
  // margin til kantene (gjelder spesielt headlines som "LEVERANDØR STANDER")
  const dateSize = isLandscape ? 76 * scale : 88 * scale;
  const headlineSize = isLandscape ? 72 * scale : 84 * scale;
  const eyebrowSize = isLandscape ? 22 * scale : 28 * scale;
  const subtitleSize = isLandscape ? 24 * scale : 28 * scale;
  const logoCell = isLandscape ? 130 * scale : 150 * scale;
  const jubLogoW = isLandscape ? 220 * scale : 260 * scale;
  // Felles gap mellom alle tekst-elementer i hero — gjør at avstanden
  // mellom dato/leverandør/hold-av-dagen/subtitle blir lik.
  const textGap = isLandscape ? 36 * scale : 44 * scale;

  // Partner-grid — 4 kolonner × 2 rader hvis nok plass, ellers 2×4
  const gridCols = isLandscape ? 8 : 4;
  const gridRows = isLandscape ? 1 : 2;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fontFaceCss()}
*{margin:0;padding:0;box-sizing:border-box;}
html,body{width:${W}px;height:${H}px;}
body{
  font-family:'Manrope',-apple-system,sans-serif;
  color:#fff;
  display:flex;
  flex-direction:column;
  position:relative;
  overflow:hidden;
}
/* Side delt i to: rød topp-halvdel (wordmark, dato, headlines, subtitle)
   og grå bunn-halvdel (tagline, partner-logoer, jubileumslogoer). */
.red-section{
  background: ${JUBILEUM_FT_RED};
  flex:1;
  display:flex;
  flex-direction:column;
  align-items:center;
  padding:${pad}px ${pad}px ${pad * 0.5}px;
  position:relative;
}
.grey-section{
  background: ${JUBILEUM_FT_GREY};
  display:flex;
  flex-direction:column;
  align-items:center;
  padding:${pad * 0.8}px ${pad}px ${pad * 0.6}px;
  gap:${textGap * 0.8}px;
  position:relative;
}
.bg-pattern-red, .bg-pattern-grey{
  position:absolute; inset:0;
  pointer-events:none;
}
.bg-pattern-red{
  background-image:
    radial-gradient(ellipse 60% 40% at 20% 8%, rgba(255,255,255,0.06), transparent 70%),
    radial-gradient(ellipse 50% 40% at 90% 95%, rgba(0,0,0,0.18), transparent 70%);
}
.bg-pattern-grey{
  background-image:
    radial-gradient(ellipse 60% 50% at 50% 0%, rgba(237,28,36,0.10), transparent 70%);
}
.corner-top{
  position:absolute; top:0; left:0; right:0;
  height:${Math.max(6, 10 * scale)}px;
  background:#fff;
  opacity:0.18;
  z-index:2;
}
.corner-bot{
  position:absolute; bottom:0; left:0; right:0;
  height:${Math.max(6, 10 * scale)}px;
  background:#fff;
  opacity:0.18;
  z-index:2;
}
/* Topp-gruppe — wordmark + eyebrow tett sammen, som i Brit's mal. */
.top-group{
  display:flex; flex-direction:column; align-items:center;
  gap:${20 * scale}px;
  margin-top:${pad * 0.2}px;
}
.wordmark{ width:${wordmarkW}px; height:auto; display:block; }
.eyebrow{
  display:flex; flex-direction:column; align-items:center; gap:${12 * scale}px;
  font-size:${eyebrowSize}px; font-weight:700;
  letter-spacing:${4 * scale}px; text-transform:uppercase;
  color:#fff; opacity:0.95;
}
.eyebrow::after{
  content:""; display:block;
  width:${50 * scale}px; height:${3 * scale}px;
  background:#fff;
}
/* Hero — dato + headlines + subtitle. Felles gap så avstanden mellom
   alle tekst-linjene blir helt lik. Midtstilt vertikalt. */
.hero{
  display:flex; flex-direction:column; align-items:center;
  gap:${textGap}px;
  flex:1; justify-content:center;
  text-align:center;
}
.date{
  font-size:${dateSize}px; font-weight:800;
  letter-spacing:${-2 * scale}px; line-height:1;
  text-shadow: 0 0 ${40 * scale}px rgba(0,0,0,0.18);
  white-space:nowrap;
}
.headline{
  font-size:${headlineSize}px; font-weight:800;
  letter-spacing:${-2 * scale}px; line-height:0.98;
  text-align:center;
  text-shadow: 0 0 ${40 * scale}px rgba(0,0,0,0.18);
  white-space:nowrap;
}
.subtitle{
  font-size:${subtitleSize}px; font-weight:600;
  letter-spacing:${1 * scale}px; text-transform:uppercase;
  text-align:center; opacity:0.92;
  max-width:${W * 0.78}px;
  line-height:1.3;
}
/* Tagline-linjen sitter øverst i den grå seksjonen — hvit tekst med
   rød markør-streker (samme stil som "25-ÅRSJUBILEUM"-eyebrow). */
.partners-tagline{
  display:flex; align-items:center; gap:${20 * scale}px;
  font-size:${eyebrowSize}px; font-weight:700;
  letter-spacing:${4 * scale}px; text-transform:uppercase;
  color:#fff;
  text-align:center;
  white-space:nowrap;
}
/* Gull-streker som matcher 25-årslogoen — samme palett som
   FT.goldTop/goldBottom-gradienten. */
.partners-tagline::before, .partners-tagline::after{
  content:""; display:block;
  width:${40 * scale}px; height:${3 * scale}px;
  background: linear-gradient(90deg, #85704D, #DBB78B);
}
.partners{
  display:grid;
  grid-template-columns: repeat(${gridCols}, 1fr);
  grid-template-rows: repeat(${gridRows}, ${logoCell}px);
  gap:${14 * scale}px ${14 * scale}px;
  width:100%;
  max-width:${W * 0.92}px;
}
/* Hver logo får sin egen hvite tile — beholder original farge, kommer fram
   på rød bakgrunn. Logoene som er hvite-på-transparent (Zweibrüder)
   markeres med .invert-til-svart for å vise konturen. */
.partner-cell{
  display:flex; align-items:center; justify-content:center;
  height:${logoCell}px;
  padding:${14 * scale}px;
  background:#fff;
  border-radius:${10 * scale}px;
  box-shadow: 0 ${4 * scale}px ${10 * scale}px rgba(0,0,0,0.18);
  overflow:hidden;
}
.partner-cell img{
  max-width:100%; max-height:100%;
  object-fit:contain;
}
.partner-cell.to-black img{
  filter: brightness(0);
  -webkit-filter: brightness(0);
}
/* Jubileumslogoene — 25-år + 100-år side om side nederst i grå seksjon. */
.jub-logos{
  display:flex; align-items:center; justify-content:center;
  gap:${48 * scale}px;
}
.jub-logo{
  height:auto;
}
.jub-logo-25{ width:${jubLogoW}px; }
.jub-logo-100{ width:${jubLogoW * 1.1}px; }
</style></head><body>
  <div class="corner-top"></div>

  <section class="red-section">
    <div class="bg-pattern-red"></div>
    <div class="top-group">
      <img class="wordmark" src="${baseUrl}${FT_WORDMARK_WHITE}" alt="Fosen Tools" />
      <div class="eyebrow">${escapeHtml(input.eyebrow)}</div>
    </div>
    <div class="hero">
      <div class="date">${escapeHtml(input.dateLine)}</div>
      <div class="headline">${escapeHtml(input.headlines[0])}</div>
      <div class="headline">${escapeHtml(input.headlines[1])}</div>
      <div class="subtitle">${escapeHtml(input.subtitle)}</div>
    </div>
  </section>

  <section class="grey-section">
    <div class="bg-pattern-grey"></div>
    <div class="partners-tagline">${escapeHtml(input.partnersTagline)}</div>
    <div class="partners">
      ${input.partners
        .map((p) => {
          const cellClass = p.filter_black ? "partner-cell to-black" : "partner-cell";
          const imgStyle = p.scale && p.scale > 1 ? ` style="transform:scale(${p.scale * 0.3 + 0.7})"` : "";
          return `<div class="${cellClass}" title="${escapeHtml(p.name)}"><img src="${escapeHtml(p.logo_url)}" alt="${escapeHtml(p.name)}"${imgStyle} /></div>`;
        })
        .join("\n")}
    </div>
    <div class="jub-logos">
      <img class="jub-logo jub-logo-25" src="${baseUrl}${JUBILEUM_LOGO_25}" alt="25-årsjubileum" />
      <img class="jub-logo jub-logo-100" src="${baseUrl}${JUBILEUM_LOGO_100}" alt="100 år i konsernet" />
    </div>
  </section>

  <div class="corner-bot"></div>
</body></html>`;
}

// =============================================================================
// Render
// =============================================================================

export async function renderJubPosterPng(
  input: JubPosterInput,
  baseUrl: string,
): Promise<{ base64: string; mimeType: string; width: number; height: number }> {
  const dims = JUB_POSTER_DIMS[input.format];
  const html = buildJubPosterHtml(input, baseUrl);
  const png = await renderHtmlToPng(html, dims.w, dims.h);
  return { ...png, width: dims.w, height: dims.h };
}
