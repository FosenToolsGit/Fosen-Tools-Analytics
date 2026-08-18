import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

const FOSEN_TOOLS_CONTEXT = `
Fosen Tools AS — selskapsfakta:
- 25 år i 2026 (etablert 2001), del av familiekonsern siden 1926 (100 år)
- Adresse: Industrigata 1, 7130 Brekstad i Ørland kommune
- Telefon: +47 72 51 51 20 · E-post: post@fosen-tools.no
- "Fosen Tools standard" referert av Forsvaret (sterk B2B-signal)
- Egne produkter: HDFI (High Density Foam Inserts, egen produksjon i CADLAB), FT Systemvegg, FT Container, mobilhotell
- Vi fører IKKE FG-godkjente våpenskap (men VI fører mobilhotell)
- 53 merker totalt, inkl. Wera, Knipex, Snap-on, Stahlwille, Pelicase, Facom, Hellberg, PB Swiss Tools, Milwaukee, Bahco, Fluke, Mitutoyo, Leatherman m.fl.
- Målgrupper: Forsvar, industri, bygg/anlegg, mekanisk verksted, maritim, flyindustri (aviation), beredskap, skoler, helse, politi
- Bærekraft: 100% selvforsynt fornybar energi (solcellepark 2023), elektriske firmakjøretøy, Miljøfyrtårn-sertifisert, Grønt Punkt Norge, godkjent lærebedrift
- Helikopterlandingsplass ved anlegget (18m diameter)
- Egen CADLAB (tegnings-/utviklingsavdeling for skreddersydde løsninger)
`.trim();

const HTML_TEMPLATE_RULES = `
HTML-konvensjoner for fosen-tools.no (Multicase-CMS):

Hver blokk er en SEPARAT publisering i Multicase. Ikke slå sammen til én blokk.

=== INTRO-blokk ===
<section class="ftseo">
<div class="ftseo-inner">
<h2 class="ftseo-heading">{H2-tittel}</h2>
<p>{paragraf 1}</p>
<p>{paragraf 2}</p>
</div>
</section>

=== FAQ-blokk ===
<section class="ftseo">
<div class="ftseo-inner">
<h2 class="ftseo-heading">Ofte stilte sp&oslash;rsm&aring;l</h2>
<div class="ftseo-faq">
<details><summary>{sp&oslash;rsm&aring;l}? <span class="arrow">▶</span></summary>
<p class="faq-answer">{svar}</p>
</details>
</div>
</div>
</section>

=== KONTAKT-CTA-blokk (matcher produsent-sider eksakt) ===
<section class="ft-contact-cta">
<div class="ft-contact-cta__inner"><a aria-label="G&aring; til kontakt oss" class="nav-btn explore icon-button btn-accent btn-large has-icon ft-contact-cta__btn" href="https://fosen-tools.no/kundesenter/kontakt-oss"><span>Kontakt oss</span> <svg aria-hidden="true" class="icon light" fill="none" height="24" viewbox="0 0 24 24" width="24"> <path d="M16.4133 6L15.5553 6.92298L19.6739 11.3473H2V12.6527H19.6739L15.5541 17.077L16.4145 18L22 12L16.4145 6H16.4133Z" fill="currentColor"></path> </svg> </a>
<div class="ft-contact-cta__meta"><a href="tel:+4772515120">+47 72 51 51 20</a> <span class="ft-contact-cta__sep">|</span> <a href="mailto:post@fosen-tools.no">post@fosen-tools.no</a></div>
</div>
</section>

=== JSON-LD-script-blokk ===
<script type="application/ld+json">{...BreadcrumbList + FAQPage som matcher faq-blokken EKSAKT...}</script>

GENERELLE REGLER:
1. Bruk HTML-entiteter for norske bokstaver i SYNLIG TEKST: &oslash; (ø), &aring; (å), &aelig; (æ), &mdash; (—), &nbsp;
2. I JSON-LD-skriptet bruk vanlig UTF-8 (ø, å, æ direkte)
3. ALDRI inkluder produkt-antall eller kategori-tellinger i tekst (utdaterer)
4. INTRO skal v&aelig;re 2 paragrafer maks, IKKE "Hos Fosen Tools f&oslash;rer vi..."-avslutning
4b. F&Oslash;RSTE 100 ORD-REGELEN (AI-siteringer): Paragraf 1 i INTRO skal svare DIREKTE p&aring; hovedintensjonen bak s&oslash;keordet — hva dette er, hvem det er for, og hva Fosen Tools tilbyr — f&oslash;r historikk/bakgrunn. ~40 % av AI-siteringer hentes fra de f&oslash;rste 100 ordene, s&aring; ikke &aring;pne med "grunnlagt i 18xx" eller oppvarming. Historikk h&oslash;rer hjemme i paragraf 2.
5. Arrow-span ▶ M&Aring; v&aelig;re med i hver <summary>
6. Hver FAQ-svar bruker <p class="faq-answer">, ikke bare <p>
7. CTA-blokk er IDENTISK som p&aring; produsent-sider — kopier eksakt struktur over (kun &aelig;ndre om n&oslash;dvendig)
`.trim();

interface RequestBody {
  keyword: string;
  target_url?: string;
  page_type: "manufacturer" | "category" | "article" | "landing";
  current_position?: number;
  related_keywords?: string[];
  notes?: string;
  competitor_urls?: string[];
  auto_find_competitors?: boolean;
  num_competitors?: number;
}

const SERP_EXCLUDED_DOMAINS = [
  "fosen-tools.no",
  "wikipedia.org",
  "amazon.",
  "ebay.",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "pinterest.",
  "reddit.com",
  "tiktok.com",
];

interface SerperResult {
  organic?: Array<{ title?: string; link?: string; snippet?: string; position?: number }>;
}

async function fetchTopCompetitors(keyword: string, n: number): Promise<{ urls: string[]; error?: string }> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return {
      urls: [],
      error: "SERPER_API_KEY mangler i .env.local — gratis $50 trial på https://serper.dev (~165 000 søk gratis, deretter $0,30/1000)",
    };
  }
  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: keyword, gl: "no", hl: "no", num: 10 }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return { urls: [], error: `Serper.dev: HTTP ${res.status}${errBody ? " — " + errBody.slice(0, 200) : ""}` };
    }
    const data: SerperResult = await res.json();
    const items = data.organic ?? [];
    const urls: string[] = [];
    const seenDomains = new Set<string>();
    for (const r of items) {
      if (urls.length >= n) break;
      const url = r.link;
      if (!url) continue;
      if (SERP_EXCLUDED_DOMAINS.some((d) => url.includes(d))) continue;
      try {
        const domain = new URL(url).hostname.replace(/^www\./, "");
        if (seenDomains.has(domain)) continue;
        seenDomains.add(domain);
      } catch {
        continue;
      }
      urls.push(url);
    }
    return { urls };
  } catch (err) {
    return { urls: [], error: err instanceof Error ? err.message : "fetch failed" };
  }
}

interface CompetitorSnapshot {
  url: string;
  title: string | null;
  meta_description: string | null;
  h1: string[];
  h2: string[];
  body_excerpt: string;
  error?: string;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&aring;/g, "å")
    .replace(/&AElig;/g, "Æ")
    .replace(/&oslash;/g, "ø")
    .replace(/&Oslash;/g, "Ø");
}

function extractTextList(html: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "gis");
  const out: string[] = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const text = decodeEntities(m[1].replace(/<[^>]+>/g, "")).trim();
    if (text) out.push(text);
  }
  return out;
}

function extractMeta(html: string, name: string): string | null {
  const regex = new RegExp(
    `<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`,
    "i"
  );
  const m = regex.exec(html);
  const raw = m ? (m[1] || m[2] || null) : null;
  return raw ? decodeEntities(raw) : null;
}

function extractTitle(html: string): string | null {
  const m = new RegExp("<title[^>]*>(.*?)</title>", "is").exec(html);
  return m ? decodeEntities(m[1]).trim() : null;
}

function extractBodyText(html: string, maxWords = 400): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  text = decodeEntities(text);
  text = text.replace(/\s+/g, " ").trim();
  const words = text.split(" ");
  if (words.length > maxWords) text = words.slice(0, maxWords).join(" ") + "…";
  return text;
}

async function scrapeCompetitor(url: string): Promise<CompetitorSnapshot> {
  const base: CompetitorSnapshot = {
    url,
    title: null,
    meta_description: null,
    h1: [],
    h2: [],
    body_excerpt: "",
  };
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FosenToolsBot/1.0; +https://fosen-tools.no)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      base.error = `HTTP ${res.status}`;
      return base;
    }
    const html = await res.text();
    return {
      url,
      title: extractTitle(html),
      meta_description: extractMeta(html, "description"),
      h1: extractTextList(html, "h1").slice(0, 3),
      h2: extractTextList(html, "h2").slice(0, 12),
      body_excerpt: extractBodyText(html, 350),
    };
  } catch (err) {
    base.error = err instanceof Error ? err.message : "fetch failed";
    return base;
  }
}

function buildPrompt(body: RequestBody, competitors: CompetitorSnapshot[]): string {
  const pageTypeLabel = {
    manufacturer: "produsent-side (merke som Wera, Pelicase osv.)",
    category: "produktkategori-side (verktøyvogner, skrutrekkere osv.)",
    article: "artikkel/blogg-innlegg",
    landing: "landingsside (kampanje eller spesifikk målgruppe)",
  }[body.page_type];

  const lines: string[] = [];
  lines.push("Du er en norsk SEO-ekspert som spesialiserer seg på Multicase-CMS og B2B-verktøyhandel.");
  lines.push("");
  lines.push("=== SELSKAPSKONTEKST ===");
  lines.push(FOSEN_TOOLS_CONTEXT);
  lines.push("");
  lines.push("=== HTML-TEMPLATE-REGLER ===");
  lines.push(HTML_TEMPLATE_RULES);
  lines.push("");
  lines.push("=== OPPGAVE ===");
  lines.push(`Generer SEO-optimalisert innhold for søkeordet: "${body.keyword}"`);
  lines.push(`Sidetype: ${pageTypeLabel}`);
  if (body.target_url) lines.push(`Mål-URL: ${body.target_url}`);
  if (body.current_position) lines.push(`Nåværende Google-posisjon: ${body.current_position}`);
  if (body.related_keywords && body.related_keywords.length > 0) {
    lines.push(`Relaterte søkeord (vev inn naturlig): ${body.related_keywords.join(", ")}`);
  }
  if (body.notes) lines.push(`Ekstra kontekst: ${body.notes}`);

  if (competitors.length > 0) {
    lines.push("");
    lines.push("=== KONKURRENT-ANALYSE ===");
    lines.push("Disse rangerer for samme søkeord. Studér deres tittel, H1/H2 og innholds-vinkling. Differensiér Fosen Tools på det de IKKE dekker (HDFI-skreddersøm, CADLAB, Forsvaret-referanse, Brekstad-lager, helikopterlandingsplass, 25 års-jubileum, B2B-fokus). IKKE kopier deres formuleringer.");
    competitors.forEach((c, i) => {
      lines.push("");
      lines.push(`--- Konkurrent ${i + 1}: ${c.url} ---`);
      if (c.error) {
        lines.push(`(scraping feilet: ${c.error})`);
        return;
      }
      if (c.title) lines.push(`Tittel: ${c.title}`);
      if (c.meta_description) lines.push(`Meta: ${c.meta_description}`);
      if (c.h1.length > 0) lines.push(`H1: ${c.h1.join(" | ")}`);
      if (c.h2.length > 0) lines.push(`H2-struktur: ${c.h2.join(" • ")}`);
      if (c.body_excerpt) lines.push(`Innholds-utdrag: ${c.body_excerpt}`);
    });
  }

  lines.push("");
  lines.push("=== OUTPUT-FORMAT ===");
  lines.push("Returner KUN valid JSON i dette formatet (ingen markdown-kodeblokker, ingen forklarende tekst rundt).");
  lines.push("Hver blokk skal være en KOMPLETT, selvstendig HTML-streng som kan limes inn i hvert sitt publiserings-felt i Multicase.");
  lines.push("");
  lines.push("{");
  lines.push('  "meta_title": "Sidens <title>-verdi (45-60 tegn, søkeordet først). Brukeren limer inn i tittel-feltet i Multicase.",');
  lines.push('  "meta_description": "150-160 tegn meta-beskrivelse med klar CTA. Brukeren limer inn i meta-feltet i Multicase.",');
  lines.push('  "intro_block": "Komplett <section class=\'ftseo\'>...</section>-blokk med 2 paragrafer. Limes inn som EGEN PUBLISERING.",');
  lines.push('  "faq_block": "Komplett <section class=\'ftseo\'>...</section>-blokk med 5 FAQ-spørsmål. Limes inn som EGEN PUBLISERING. Spørsmålsmønster: (1) produktutvalg, (2) kvalitet/sertifisering, (3) bruksområde med målgruppe, (4) sammenligning/forskjeller fra konkurrenter, (5) garanti/service.",');
  lines.push('  "contact_cta_block": "Komplett <section class=\'ft-contact-cta\'>...</section>-blokk EKSAKT som mønsteret (telefon +47 72 51 51 20, e-post post@fosen-tools.no). Limes inn som EGEN PUBLISERING.",');
  lines.push('  "json_ld_script": "Komplett <script type=\'application/ld+json\'>...</script>-tag med BreadcrumbList + FAQPage. FAQPage MÅ matche faq_block eksakt. Limes inn som EGEN PUBLISERING (typisk nederst på siden)."');
  lines.push("}");
  lines.push("");
  lines.push("VIKTIG:");
  lines.push("- Skriv på norsk");
  lines.push("- Vev inn Fosen Tools-spesifikk kontekst der det er relevant (HDFI, CADLAB, Forsvaret, 25 år, Brekstad, Miljøfyrtårn)");
  lines.push("- IKKE nevn produkt-antall eller kategori-tellinger");
  lines.push("- IKKE inkluder \"Hos Fosen Tools fører vi...\"-avslutning i INTRO");
  lines.push("- FAQ-svar skal være 200-400 tegn hver, konkrete fakta + Fosen Tools-referanse");
  lines.push("- meta_title og meta_description skrives med VANLIG UTF-8 (ø, å, æ direkte) — IKKE HTML-entiteter, fordi disse limes i CMS-felt som rendrer dem som rå tekst");
  lines.push("- HTML-entiteter (&oslash;, &aring;, &aelig;, &mdash;) brukes KUN i synlig tekst i intro_block, faq_block og contact_cta_block");
  lines.push("- JSON-LD må matche FAQPage-schema EKSAKT (samme spørsmål og svar som faq_block) — bruk vanlig UTF-8 (ikke HTML-entiteter) i JSON-LD-feltet");
  lines.push("- Differensiér eksplisitt mot konkurrentene der relevant (i FAQ-spørsmål 4)");
  lines.push("- contact_cta_block skal matche eksakt produsent-side-mønsteret (full klassestakk på <a>-tag, SVG-pil, telefonnummer som <a href=\"tel:+4772515120\">, e-post som <a href=\"mailto:post@fosen-tools.no\">)");

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.keyword || !body.page_type) {
    return NextResponse.json({ error: "keyword og page_type er påkrevd" }, { status: 400 });
  }

  const manualUrls = (body.competitor_urls ?? [])
    .map((u) => u.trim())
    .filter(Boolean);

  const numCompetitors = Math.max(1, Math.min(10, body.num_competitors ?? 5));
  const autoFind = body.auto_find_competitors !== false && manualUrls.length === 0;

  let urlsToScrape = manualUrls.slice(0, 10);
  let serpError: string | undefined;
  let serpUsed = false;

  if (autoFind) {
    const result = await fetchTopCompetitors(body.keyword, numCompetitors);
    serpUsed = true;
    if (result.error) serpError = result.error;
    urlsToScrape = result.urls;
  }

  const competitors = urlsToScrape.length > 0
    ? await Promise.all(urlsToScrape.map(scrapeCompetitor))
    : [];

  const prompt = buildPrompt(body, competitors);

  return NextResponse.json({
    keyword: body.keyword,
    page_type: body.page_type,
    competitors_scraped: competitors.length,
    competitors_failed: competitors.filter((c) => c.error).length,
    competitors_used: competitors.map((c) => c.url),
    serp_used: serpUsed,
    serp_error: serpError ?? null,
    prompt,
  });
}
