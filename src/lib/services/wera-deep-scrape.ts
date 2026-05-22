/**
 * Wera deep-scrape med Playwright (headless Chromium).
 *
 * wera.de er en SPA der produkt-data hentes via klient-JS etter sidelast. Vanlig
 * HTML-scrape gir bare meta-tags (begrenset). Med Playwright kan vi rendre siden
 * fullt og trekke ut all data fra DOM-en når den er hydrert.
 *
 * Resultatet caches i Supabase (`wera_product_cache`-tabellen) så hvert produkt
 * scrapes maks én gang per ~180 dager.
 */

import { chromium, type Browser, type BrowserContext } from "playwright";
import { detectSB } from "@/lib/services/sb-detect";

export interface WeraSpecRow {
  label: string;
  value: string;
}

export interface WeraScrapeResult {
  code: string;
  name: string | null;
  driveType: string | null;
  profile: string | null;
  sizeMm: string | null;
  lengthMm: number | null;
  imageUrl: string | null;
  isVde: boolean;
  applicationNotes: string | null;
  /** Korte produktegenskaper-bullets («Stainless screwdriver for slotted screws», «Kraftform handle», osv.) */
  featureBullets: string[];
  /** Lengre beskrivelser med h3-overskrift + tekst-blokk («Vakuumherdet», «Lasertip», osv.) */
  descriptionSections: Array<{ heading: string; text: string }>;
  /** Tekniske spesifikasjoner som key→value-rader */
  specs: WeraSpecRow[];
  /** Flagget som SB-vare (selvbetjening/blister) basert på resolved URL-slug + navn + pakke-spec. */
  isSB: boolean;
  /** Pakke-spec funnet på produktsiden (f.eks. «Selbstbedienung»), eller null. */
  packagingNote: string | null;
  rawData: Record<string, unknown>;
}

/**
 * Bygg URL til Wera produkt-side. Engelsk språk gir mest komplett data og er
 * stabil på tvers av Wera-merkeland.
 */
/** Norsk produkt-URL — gir Norwegian rich content som vi kan bruke direkte i HTML */
function weraProductUrl(code: string): string {
  return `https://www.wera.de/no/${code}`;
}

let cachedBrowser: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (cachedBrowser) return cachedBrowser;
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });
  }
  cachedBrowser = await browserPromise;
  return cachedBrowser;
}

export async function closeBrowser(): Promise<void> {
  if (cachedBrowser) {
    await cachedBrowser.close();
    cachedBrowser = null;
    browserPromise = null;
  }
}

/**
 * Scrape én Wera produktside. Returnerer parsert data, eller null hvis siden er
 * 404/utilgjengelig.
 */
async function scrapeSingle(context: BrowserContext, code: string): Promise<WeraScrapeResult | null> {
  const url = weraProductUrl(code);
  const page = await context.newPage();
  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    if (!response || response.status() >= 400) return null;
    // Vent på at SPA-en har hydrert (produkt-data-elementer dukker opp i DOM)
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {
      // Ikke kritisk hvis networkidle timeout — vi prøver å lese DOM uansett
    });

    // Hent ut tekst-data fra siden via DOM-spørringer
    const data = await page.evaluate((targetCode: string) => {
      const get = (sel: string): string | null => {
        const el = document.querySelector(sel);
        return el ? el.textContent?.trim() ?? null : null;
      };
      const getAttr = (sel: string, attr: string): string | null => {
        const el = document.querySelector(sel);
        return el ? el.getAttribute(attr) : null;
      };

      const name = get("h1.heading-l") ?? get("h1") ?? document.title;
      const imageUrl = getAttr('meta[property="og:image"]', "content")
        ?? getAttr(".product-image img, .product-detail-image img", "src");
      const allText = document.body.innerText;

      // Heuristikk: tekst-blokk-parsing.
      // Wera-sidens innhold følger et mønster:
      //   H1: produktnavn
      //   ul / liste: korte egenskaps-bullets («Sporskrutrekker-elektrikerklinge», ...)
      //   H3: «Skru rustfritt stål...»  → P: lang-tekst
      //   H3: «Vakuumherdet»            → P: lang-tekst
      //   ...
      //   H2: «Produktopplysninger»     → spec-tabell
      const sections: Array<{ heading: string; text: string }> = [];
      const headings = Array.from(document.querySelectorAll("h2, h3"));
      for (const h of headings) {
        const heading = h.textContent?.trim() ?? "";
        if (!heading) continue;
        // Hopp over generiske/footer-overskrifter
        if (/^(meny|søk|wera|relaterte|nyhetsbrev|app|service|tjenester|nedlastinger|firma|sammenlign|skriv opp)$/i.test(heading)) continue;
        if (/produktegenskaper|produktopplysninger|data og fakta|kontakt|finn ut|tilbehør/i.test(heading)) continue;
        // Hent paragraf-tekst som direkte følger
        let text = "";
        let next: Element | null = h.nextElementSibling;
        let safety = 0;
        while (next && safety < 5) {
          if (next.tagName === "H2" || next.tagName === "H3") break;
          if (next.tagName === "P" || next.tagName === "DIV") {
            const t = next.textContent?.trim() ?? "";
            if (t.length > 30) {
              text = text ? text + " " + t : t;
            }
          }
          next = next.nextElementSibling;
          safety++;
        }
        if (text.length > 40) sections.push({ heading, text: text.slice(0, 600) });
      }

      // Plukk feature-bullets fra .product-features (icon-grid)
      //   Wera bruker IKKE standard <ul> — de viser produktegenskaper som ikon-cards
      //   i en grid. Hver bullet er korte tags (1-3 ord): «Rustfritt», «Take it easy»,
      //   «Laserspiss», «Kraftform håndtak», «Rullestopp».
      const featureBullets: string[] = [];
      const featureNodes = Array.from(document.querySelectorAll(
        ".product-features .feature-icon .feature-icon-text"
      ));
      for (const node of featureNodes) {
        const t = node.textContent?.trim() ?? "";
        if (t.length >= 2 && t.length <= 100) featureBullets.push(t);
      }

      // Spec-tabell — Wera bruker .scrollsnaptable med CSS-grid (row-X column-Y),
      //   IKKE standard <table>. Hver produktside dekker flere varianter (kolonner),
      //   så vi må finne kolonnen som matcher VÅR produktkode i row-0.
      const specs: Array<{ label: string; value: string }> = [];
      const snapTables = Array.from(document.querySelectorAll(".scrollsnaptable"));
      for (const table of snapTables) {
        // Bygg grid-map: row_col → tekst
        const cells = Array.from(table.querySelectorAll(".scrollsnaptable-cell"));
        const grid: Record<string, string> = {};
        // Find max row + max col
        let maxRow = 0;
        let maxCol = 0;
        for (const cell of cells) {
          const cls = cell.className;
          const rowMatch = cls.match(/\brow-(\d+)\b/);
          const colMatch = cls.match(/\bcolumn-(\d+)\b/);
          if (rowMatch && colMatch) {
            const r = parseInt(rowMatch[1], 10);
            const c = parseInt(colMatch[1], 10);
            const text = cell.textContent?.trim() ?? "";
            grid[`${r}_${c}`] = text;
            if (r > maxRow) maxRow = r;
            if (c > maxCol) maxCol = c;
          }
        }

        // Finn kolonnen der row-0 matcher vår produktkode
        let myColumn = -1;
        for (let col = 1; col <= maxCol; col++) {
          const cellText = grid[`0_${col}`] ?? "";
          if (cellText.replace(/\s+/g, "") === targetCode) {
            myColumn = col;
            break;
          }
        }
        if (myColumn < 0) continue; // Vår kode ikke i denne tabellen

        // Plukk label fra col-0 + verdi fra vår kolonne for hver rad (rad 1+).
        // Label kan ha to spans: <span class="label">…</span><span class="unit"> mm</span>
        const labelCells = Array.from(table.querySelectorAll(".scrollsnaptable-cell--text-start"));
        for (const lc of labelCells) {
          const cls = lc.className;
          const rowMatch = cls.match(/\brow-(\d+)\b/);
          if (!rowMatch) continue;
          const r = parseInt(rowMatch[1], 10);
          if (r === 0) continue; // skip header-rad

          const labelEl = lc.querySelector(".label") as HTMLElement | null;
          const unitEl = lc.querySelector(".unit") as HTMLElement | null;
          let label = labelEl ? (labelEl.textContent?.trim() ?? "") : (lc.textContent?.trim() ?? "");
          const unit = unitEl ? (unitEl.textContent?.trim() ?? "") : "";
          if (!label) continue;
          // Skip footer-rader / huskeliste-rad
          if (/skriv opp|huskelisten/i.test(label)) continue;

          const value = (grid[`${r}_${myColumn}`] ?? "").trim();
          if (!value || value === " " || /^\(?-?\)?$/.test(value)) continue;
          // Drop "Merk"-rad med (1), (2) referanser
          if (/^merk$/i.test(label)) continue;

          // Bygg label + unit som ren tekst
          const fullLabel = unit ? `${label} (${unit.replace(/^\s*/, "")})` : label;
          specs.push({ label: fullLabel, value });
        }
      }

      // Finn produktbilde. Wera bruker mange lazy-load mønstre — vi prøver i denne rekkefølgen:
      //   1. og:image meta (mest pålitelig hvis satt)
      //   2. data-src eller src på img-elementer NÆR produkt-galleri-container
      //   3. Største img som matcher produkt-mønster
      let bestImg: string | null = imageUrl;
      const looksLikeProductImage = (src: string) => {
        if (!src || src.startsWith("data:")) return false;
        if (/logo|icons|worldmap|menuhamburger|csm_tool_check/i.test(src)) return false;
        return /\/fileadmin|csm_|article|product/i.test(src);
      };
      if (!bestImg || !looksLikeProductImage(bestImg)) {
        const galleryImgs = Array.from(document.querySelectorAll(
          ".product-gallery img, .product-detail img, .product-image img, .image-gallery img, [class*='product'] img"
        ));
        for (const img of galleryImgs) {
          const src = (img as HTMLImageElement).src || img.getAttribute("data-src") || img.getAttribute("data-original") || "";
          if (looksLikeProductImage(src)) { bestImg = src; break; }
        }
      }
      if (!bestImg || !looksLikeProductImage(bestImg)) {
        const imgs = Array.from(document.querySelectorAll("img"))
          .map((i) => (i as HTMLImageElement).src || i.getAttribute("data-src") || "")
          .filter(looksLikeProductImage);
        bestImg = imgs[0] ?? null;
      }

      return {
        name,
        imageUrl: bestImg,
        allText,
        sections,
        featureBullets,
        specs,
        title: document.title,
      };
    }, code);

    // Parse drev/profil/størrelse fra hentet tekst
    const allText = data.allText ?? "";
    const isVde = /\bVDE\b/i.test(allText);

    // SB-deteksjon: resolved URL-slug (etter redirect) + navn + evt. pakke-spec.
    // page.url() gir den endelige slug-URL-en (.../take-it-easy-sb).
    const finalUrl = page.url();
    const packagingSpec = data.specs.find((s) =>
      /pakke|forpakn|emballasje|verpackung/i.test(s.label)
    );
    const packagingNote = packagingSpec ? `${packagingSpec.label}: ${packagingSpec.value}` : null;
    const sb = detectSB({ rawName: data.name, url: finalUrl, packagingNote });

    let driveType: string | null = null;
    // Sjekk profile / connection patterns
    const driveMatchers: Array<{ re: RegExp; label: string }> = [
      { re: /\b1\/4["”]?\s*(?:hex|sekskant|inch)/i, label: '1/4" hex' },
      { re: /\b3\/8["”]?\s*(?:hex|sekskant|inch)/i, label: '3/8" hex' },
      { re: /\b1\/2["”]?\s*(?:hex|sekskant|inch)/i, label: '1/2" hex' },
      { re: /\b3\/4["”]?\s*(?:hex|sekskant|inch)/i, label: '3/4" hex' },
      { re: /\bhalfmoon|wera\s+(?:tilkoblings?serie|series?)\s+9/i, label: "4 mm Halfmoon" },
      { re: /\bhios\b|wera\s+(?:tilkoblings?serie|series?)\s+21/i, label: "4 mm HIOS" },
      { re: /\b4\s*mm\s*sekskant/i, label: "4 mm hex" },
      { re: /\b6\s*mm\s*sekskant/i, label: "6 mm hex" },
      { re: /\b8\s*mm\s*sekskant/i, label: "8 mm hex" },
    ];
    for (const { re, label } of driveMatchers) {
      if (re.test(allText)) {
        driveType = label;
        break;
      }
    }

    // Profil
    const profileMatch = allText.match(/\b(PH\s?\d{1,2}|PZ\s?\d{1,2}|TX\s?\d{1,3}|HEX\s?\d{1,2}|SL\s?\d|SQ\s?\d{1,2})\b/i);
    const profile = profileMatch ? profileMatch[0].replace(/\s+/g, "") : null;

    // Størrelse + lengde
    const sizeMatch = allText.match(/\d+[.,]?\d*\s*[xX×]\s*\d+[.,]?\d*(?:\s*[xX×]\s*\d+[.,]?\d*)?\s*mm/i);
    const sizeMm = sizeMatch ? sizeMatch[0].replace(/\s+/g, "") : null;
    const lengthMatch = sizeMm ? sizeMm.match(/[xX×](\d+(?:\.\d+)?)\s*mm$/i) : null;
    const lengthMm = lengthMatch ? parseFloat(lengthMatch[1]) : null;

    return {
      code,
      name: data.name,
      driveType,
      profile,
      sizeMm,
      lengthMm,
      imageUrl: data.imageUrl,
      isVde,
      applicationNotes: null,
      featureBullets: data.featureBullets,
      descriptionSections: data.sections,
      specs: data.specs,
      isSB: sb.isSB,
      packagingNote,
      rawData: {
        title: data.title,
        specs: data.specs ?? [],
        isSB: sb.isSB,
        sbConfidence: sb.confidence,
        sbReason: sb.reason,
        packagingNote,
      },
    };
  } catch {
    return null;
  } finally {
    await page.close().catch(() => undefined);
  }
}

/**
 * Scrape en liste av Wera-koder parallelt (med kontroll over concurrency).
 * Kaller `onProgress` etter hvert resultat — UI kan vise live-tilstand.
 */
export async function scrapeWeraProducts(
  codes: string[],
  concurrency: number = 4,
  onProgress?: (done: number, total: number, code: string, ok: boolean) => void
): Promise<Array<WeraScrapeResult | null>> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "en-US",
    viewport: { width: 1280, height: 800 },
  });

  const results: Array<WeraScrapeResult | null> = new Array(codes.length).fill(null);
  let cursor = 0;
  let done = 0;

  const worker = async () => {
    while (cursor < codes.length) {
      const idx = cursor++;
      const code = codes[idx];
      const result = await scrapeSingle(context, code);
      results[idx] = result;
      done++;
      onProgress?.(done, codes.length, code, result !== null);
    }
  };

  const workerCount = Math.max(1, Math.min(concurrency, codes.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  await context.close();
  return results;
}
