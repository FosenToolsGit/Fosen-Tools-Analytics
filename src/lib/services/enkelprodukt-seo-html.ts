/**
 * Bygger SEO-rik Produktinformasjon-HTML uten å trenge Gemini.
 * Inspirert av wera-seo-html.ts men generisk — fungerer for alle leverandører.
 *
 * Struktur:
 *   <h2>Produkttype + søkeord — Produsent</h2>
 *   <p>2-3 setningers intro med naturlig flettede søkeord</p>
 *   <h3>Egenskaper</h3><ul>...</ul>          (fra scrape bullets)
 *   <h3>Tekniske spesifikasjoner</h3><table> (fra scrape specs)
 *   <h3>Bruksområder</h3><p>...</p>          (auto-template per G1/G2/G3)
 *   <h3>Hvorfor {Produsent}?</h3><p>...</p>  (auto-template per merke)
 */

import type { ScrapedRaw } from "./enkelprodukt-scraper";

export interface SeoHtmlInput {
  raw: ScrapedRaw;
  produsent: string;
  g1: string | null;
  g2: string | null;
  g3: string | null;
  ean?: string | null;
  mpn?: string | null;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Bygger naturlig H2-overskrift med produkttype + produsent + nøkkelord
 * Eks: «Sporskrutrekker 0,6×3,5×100mm — Wera Kraftform Plus 335»
 */
function buildHeading(title: string, produsent: string): string {
  const t = title.trim();
  const p = produsent.trim();
  if (!t) return p;
  if (!p) return t;
  // Hvis produsent allerede er i title, ikke dupliser
  if (t.toLowerCase().includes(p.toLowerCase())) return t;
  return `${t} — ${p}`;
}

/**
 * Bygger intro-paragraf med naturlig flettede søkeord basert på klassifisering.
 * Hvis scrape har god description_short (50-300 tegn), bruker vi den.
 * Ellers genererer vi en template basert på G1/G2/G3.
 */
function buildIntro(raw: ScrapedRaw, produsent: string, g1: string | null, g2: string | null): string {
  const desc = raw.description_short.trim();
  if (desc.length >= 50 && desc.length <= 300 && !desc.match(/^(wera|kc tools|sumake|knipex)$/i)) {
    return desc;
  }
  // Fallback-template basert på klassifisering
  const productType = inferProductType(raw.title, g1, g2);
  const longDesc = raw.description_long.trim();
  if (longDesc.length >= 50) {
    // Bruk første setning av lang beskrivelse
    const firstSentence = longDesc.split(/(?<=[.!?])\s+/)[0];
    if (firstSentence.length >= 40 && firstSentence.length <= 300) {
      return firstSentence;
    }
  }
  // Helt generisk fallback
  return `${productType ? capitalize(productType) : raw.title} fra ${produsent} — profesjonell kvalitet for daglig bruk i verksted og industri.`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Foreslår produkttype-navn fra G1/G2 + title for bruk i intro.
 */
function inferProductType(title: string, g1: string | null, g2: string | null): string {
  // Foretrekk G3-mer-spesifikk-navn fra title
  const t = title.toLowerCase();
  if (/skrutrekker/i.test(t)) return "skrutrekker";
  if (/pipe/i.test(t)) return "pipe";
  if (/n[øo]kkel/i.test(t)) return "nøkkel";
  if (/tang/i.test(t)) return "tang";
  if (/bits/i.test(t)) return "bits";
  if (/koffert/i.test(t)) return "koffert";
  if (/maskin/i.test(t)) return "maskin";
  // Bruk G2 som fallback
  if (g2) return g2.toLowerCase();
  if (g1) return g1.toLowerCase();
  return "";
}

/**
 * Auto-fett-merker første viktige nøkkelord i hver bullet
 * Eks: «Robust kvalitet i kromvanadium» → «<strong>Robust kvalitet</strong> i kromvanadium»
 */
function emphasizeKeyword(bullet: string): string {
  const trimmed = bullet.trim();
  // Hvis bullet allerede inneholder <strong>, returner som-er
  if (/<strong>/i.test(trimmed)) return esc(trimmed);
  // Splitt på første «—», «-» eller første komma — vanlig mønster i Wera-beskrivelser
  const m = trimmed.match(/^([^—\-,:]{3,40})\s*[—\-,:]\s*(.+)$/);
  if (m) {
    return `<strong>${esc(m[1])}</strong> — ${esc(m[2])}`;
  }
  // Hvis ingen separator, fett-merk første 1-3 ord hvis de virker som nøkkelord
  const words = trimmed.split(/\s+/);
  if (words.length >= 5 && words[0].length >= 3) {
    const keywordCount = Math.min(2, words.length - 3);
    const keyword = words.slice(0, keywordCount).join(" ");
    const rest = words.slice(keywordCount).join(" ");
    return `<strong>${esc(keyword)}</strong> ${esc(rest)}`;
  }
  return esc(trimmed);
}

/**
 * Auto-bruksområde-tekst per G1/G2/G3 — søkeordrik for Google.
 */
function buildBruksomrader(g1: string | null, g2: string | null, g3: string | null, produsent: string): string {
  const cat = `${g1 ?? ""}/${g2 ?? ""}/${g3 ?? ""}`.toLowerCase();
  if (/skrutrekkere\/presisjon/.test(cat)) {
    return `Brukes typisk innen elektroniker-arbeid, finmekanikk, optikk, ur- og smykkereparasjon, samt service på elektronikk-komponenter. Egnet for ESD-følsomme miljøer.`;
  }
  if (/skrutrekkere\/bitsskrutrekkere/.test(cat)) {
    return `Brukes typisk innen elektriker-arbeid, vedlikehold, montering og verksted. ${produsent}-bitsskrutrekkere er foretrukket av profesjonelle for utskiftbarhet og fleksibilitet.`;
  }
  if (/skrutrekkere\/klinger/.test(cat)) {
    return `Utskiftbar klinge til ${produsent} Kraftform- og Vario-håndtak. Brukes innen elektriker-arbeid, finmekanikk og service der man trenger fleksibilitet i drev-type.`;
  }
  if (/skrutrekkere/.test(cat)) {
    return `Brukes innen verksted, industri, elektriker-arbeid, finmekanikk og service. Sertifisert kvalitet for daglig profesjonell bruk — inkludert vedlikehold, monteringsarbeid og presisjons-installasjoner.`;
  }
  if (/n[øo]kler/.test(cat)) {
    return `Brukes innen verksted, mekanisk arbeid, bilreparasjon, montering og industrielt vedlikehold. Ergonomisk utforming gir god grep og minsker risiko for skader på skrue og mutter.`;
  }
  if (/tenger/.test(cat)) {
    return `Brukes innen elektriker-arbeid, mekanisk verksted, rørlegger-arbeid, vedlikehold og service. Egnet for både industri og bygg/anlegg.`;
  }
  if (/piper\s*og\s*skraller/.test(cat) || /piper/.test(cat)) {
    return `Brukes innen mekanisk verksted, bilreparasjon, motorsykkel-vedlikehold, montering og service. Drev-tilpasset for ulike skrallesystemer.`;
  }
  if (/momentverkt/.test(cat)) {
    return `Brukes der presis momentkontroll er kritisk — motor- og monteringsarbeid, sikkerhetskomponenter, kvalitetskontroll og sertifisert vedlikehold i aviation, marin og industri.`;
  }
  if (/maskintilbeh/.test(cat)) {
    return `Brukes med boremaskiner, slagskruere og momentnøkler innen verksted, bygg/anlegg og industriell montering.`;
  }
  if (/arbeidskl[æa]r/.test(cat)) {
    return `Designet for fagfolk innen håndverk, industri, anlegg og service — kombinerer komfort, funksjonalitet og slitestyrke for daglig bruk i krevende miljø.`;
  }
  // Klær (synlighetsklær / hi-vis / verneutstyr-spesifikt)
  if (/synlighet|hi.?vis|verneutstyr/.test(cat)) {
    return `Brukes innen anlegg, vei-arbeid, jernbane, lager og industri der høy synlighet er påkrevd. Sertifisert etter EN ISO 20471 for arbeidsmiljø med trafikk eller maskinell aktivitet.`;
  }
  // Hansker
  if (/hansk/.test(cat)) {
    return `Brukes innen verksted, mekanisk arbeid, montering og lager — beskytter mot kutt, slitasje og kjemikalier samtidig som de gir godt grep og fingerfølelse.`;
  }
  // Sko / fottøy
  if (/sko\b|fott[øo]y|vernesko/.test(cat)) {
    return `Brukes innen bygg, anlegg, industri og service — sertifisert vernefottøy som beskytter mot fallende gjenstander, gjennomtrengning og elektriske risikoer.`;
  }
  // Klær-merker som lager arbeidsklær (Snickers, Hultafors, Solid Gear, Helly Hansen)
  const p = produsent.toLowerCase();
  if (/snickers|hultafors|solid\s*gear|helly\s*hansen|fristads|blakl[äa]der/.test(p)) {
    return `Designet for fagfolk innen håndverk, industri, anlegg og service — kombinerer komfort, funksjonalitet og slitestyrke for daglig bruk i krevende miljø.`;
  }
  // Generisk fallback
  return `${produsent}-verktøy designet for profesjonell bruk innen verksted, industri og service.`;
}

/**
 * Auto-«Hvorfor {Produsent}?»-tekst per merke (brand-positioning).
 * Returnerer tom streng hvis vi ikke har spesifikk tekst — da hopper vi over seksjonen.
 */
function buildWhyBrand(produsent: string): string {
  const p = produsent.toLowerCase().trim();
  // Tyske presisjonsmerker
  if (p === "wera") return "Wera er tysk presisjon siden 1936 — DIN-sertifiserte verktøy med Kraftform-håndtak utviklet for ergonomi og maksimal kraftoverføring. Anerkjent av profesjonelle elektrikere og mekanikere verden over.";
  if (p === "knipex") return "Knipex har laget tysk-tysk presisjonstang siden 1882 — kjent for innovativ teknologi som Cobra og Pliers Wrench. DIN-sertifisert og foretrukket av profesjonelle innen elektro og mekanikk.";
  if (p === "stahlwille") return "Stahlwille har levert tyske momentnøkler og fastnøkler siden 1862 — DIN-sertifisert kvalitet med høy presisjon. Brukes innen aviation, motorsport og industriell montering.";
  if (p === "gedore") return "Gedore er tysk verktøyproduksjon siden 1919 — DIN-sertifiserte håndverktøy med fokus på sikkerhet og slitestyrke. Foretrukket innen industri og vedlikehold.";
  if (p.includes("rennsteig")) return "Rennsteig produserer tysk presisjonsverktøy med spesialfokus på elektriker- og finmekaniske bruksområder.";
  // Sveitsiske
  if (p.includes("pb swiss") || p === "pb") return "PB Swiss Tools er sveitsisk håndverk siden 1878 — håndinspekserte verktøy produsert i Wasen i Emmental. Foretrukket i industri som krever maksimal presisjon.";
  if (p === "lista" || p.includes("lista ag")) return "Lista AG er sveitsisk verkstedsinventar siden 1945 — kjent for skuffeskap, verktøyvogner og lagring designet for industriell bruk.";
  // Amerikanske
  if (p === "snap-on" || p === "snapon") return "Snap-on har levert profesjonelt verktøy til mekanisk verksted siden 1920 — kjent for livstidsgaranti og servicenettverk. Premium-kvalitet for daglig profesjonell bruk.";
  if (p === "leatherman") return "Leatherman har laget multifunksjonsverktøy siden 1983 — kjent for livstidsgaranti og innovative design som har redefinert hva et lommeverktøy kan være.";
  if (p === "milwaukee") return "Milwaukee har levert elektroverktøy siden 1924 — M12, M18 og MX FUEL er foretrukne plattformer innen elektriker-arbeid, bygg og vedlikehold.";
  if (p === "facom") return "Facom er fransk «The Art of Precision» siden 1918 — verktøy for profesjonelle med fokus på ergonomi og slitestyrke. Brukes innen aviation, motorsport og industri.";
  // Japanske
  if (p === "mitutoyo") return "Mitutoyo er verdensledende innen presisjonsmåling siden 1934 — Kalibreringssertifikat på alle måleverktøy. Foretrukket i kvalitetssikring og produksjons-kontroll.";
  // Skandinaviske
  if (p === "bahco") return "Bahco er svensk verktøyproduksjon siden 1862 — JP Johansson oppfant den justerbare skiftenøkkelen. Kjent for innovasjon og praktiske løsninger for profesjonelle.";
  if (p === "hultafors") return "Hultafors er svensk håndverkstradisjon siden 1883 — kniver, tommestokker og målebånd produsert i Sverige med fokus på slitestyrke.";
  if (p.includes("snickers")) return "Snickers Workwear er svensk arbeidsklær siden 1975 — kjent for ergonomisk passform, hylsterlommer og slitestyrke som tåler daglig bruk i håndverk og industri.";
  if (p.includes("fristads")) return "Fristads er svensk arbeidsklær siden 1925 — bærekraftige plagg sertifisert etter Green-merket, med fokus på funksjonalitet for fagfolk innen industri og service.";
  if (p.includes("blakl") || p.includes("blåkl")) return "Blåkläder er svensk arbeidsklær siden 1959 — kjent for slitestyrke og klassisk håndverker-design som tåler tøft daglig bruk.";
  if (p === "morakniv") return "Morakniv er svensk knivproduksjon siden 1891 — produsert i Mora med tradisjonelt håndverk og moderne stål-teknologi.";
  if (p.includes("viking arm")) return "Viking Arm er svensk innovasjon — løfteverktøyet som har gjort montering enklere for snekkere, gulvleggere og håndverkere.";
  // Taiwanske
  if (p === "sumake") return "Sumake er taiwansk presisjon for trykkluft og industri — Make Jobs Better Than Ever. Brukes innen lakk, blåseluft og finarbeid.";
  if (p.includes("kc tools")) return "KC Tools (KC Suntech) leverer robust trykkluft-verktøy for verksted og industri — bredt sortiment med god verdi for fagfolk.";
  // Husqvarna
  if (p === "husqvarna") return "Husqvarna har levert utstyr siden 1689 — kraftkrevende verktøy for bygg, anlegg, skog og bærekraftig hageskjøtsel.";
  // Pelicase
  if (p === "pelicase" || p.includes("pelican")) return "Pelican Products har laget vanntette beskyttelseskasser siden 1976 — IP67-sertifiserte cases brukt av forsvar, aviation, foto og industri verden over.";
  // Fosen Tools egen
  if (p === "fosen tools" || p === "fosen tools custom") return "Fosen Tools har 25 års erfaring som leverandør til Forsvaret, aviation og norsk industri. HDFI-skreddersøm fra egen CADLAB i Brekstad gir verktøykontroll og FOD-sikring tilpasset hver bruker.";
  // Generisk fallback
  return "";
}

export function buildEnkelproduktSeoHtml(input: SeoHtmlInput): string {
  const { raw, produsent, g1, g2, g3 } = input;
  const parts: string[] = [];

  // H2 — hovedoverskrift med produkttype + produsent
  parts.push(`<h2>${esc(buildHeading(raw.title, produsent))}</h2>`);

  // Intro-paragraf
  parts.push(`<p>${esc(buildIntro(raw, produsent, g1, g2))}</p>`);

  // Egenskaper
  if (raw.bullets.length > 0) {
    parts.push(`<h3>Egenskaper</h3>`);
    parts.push(`<ul>`);
    for (const b of raw.bullets.slice(0, 8)) {
      parts.push(`  <li>${emphasizeKeyword(b)}</li>`);
    }
    parts.push(`</ul>`);
  }

  // Tekniske spesifikasjoner
  if (raw.specs.length > 0 || input.ean || input.mpn || produsent) {
    parts.push(`<h3>Tekniske spesifikasjoner</h3>`);
    parts.push(`<table>`);
    parts.push(`<tbody>`);
    const seen = new Set<string>();
    for (const s of raw.specs.slice(0, 25)) {
      const key = s.key.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      // Hopp over generic noise
      if (/^(delenummer|merk|sku|ean)$/i.test(s.key.trim())) continue;
      seen.add(key);
      parts.push(`  <tr><th>${esc(s.key)}</th><td>${esc(s.value)}</td></tr>`);
    }
    if (produsent && !seen.has("produsent")) {
      parts.push(`  <tr><th>Produsent</th><td>${esc(produsent)}</td></tr>`);
    }
    if (input.mpn && !seen.has("artikkelnummer")) {
      parts.push(`  <tr><th>${esc(produsent || "Leverandør")}-artikkelnummer</th><td>${esc(input.mpn)}</td></tr>`);
    }
    if (input.ean && !seen.has("ean")) {
      parts.push(`  <tr><th>EAN</th><td>${esc(input.ean)}</td></tr>`);
    }
    parts.push(`</tbody>`);
    parts.push(`</table>`);
  }

  // Bruksområder — auto-template basert på klassifisering
  parts.push(`<h3>Bruksområder</h3>`);
  parts.push(`<p>${esc(buildBruksomrader(g1, g2, g3, produsent))}</p>`);

  // Hvorfor {Produsent}? — brand-positioning hvis kjent merke
  const whyBrand = buildWhyBrand(produsent);
  if (whyBrand) {
    parts.push(`<h3>Hvorfor ${esc(produsent)}?</h3>`);
    parts.push(`<p>${esc(whyBrand)}</p>`);
  }

  return parts.join("\n");
}
