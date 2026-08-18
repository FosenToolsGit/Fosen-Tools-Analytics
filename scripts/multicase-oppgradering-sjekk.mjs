#!/usr/bin/env node
/**
 * Automatisert verifisering av FTs egentilpasninger på fosen-tools.no.
 *
 * Laget for Multicase-oppgraderingen (varsel mottatt 18. aug 2026): kjøres
 * FØR oppgradering (baseline), mot TESTMILJØET når vi får URL, og ETTER
 * oppgradering i prod. Resultatene lagres som JSON så kjøringer kan diffes.
 *
 *   node scripts/multicase-oppgradering-sjekk.mjs                    # prod
 *   node scripts/multicase-oppgradering-sjekk.mjs --base https://test.fosen-tools.no
 *   node scripts/multicase-oppgradering-sjekk.mjs --ut baseline.json
 *
 * Sjekker er rene lesinger — ingen bestillinger, ingen innsendinger.
 * Handleprosess/kunderegistrering (Multicases egne scenarier) må testes
 * manuelt; se FT-testplanen på skrivebordet.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const argv = process.argv.slice(2);
const arg = (n, f) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : f; };
const BASE = (arg("base", "https://fosen-tools.no")).replace(/\/$/, "");
const UT = arg("ut", `docs/multicase-sjekk-${new Date().toISOString().slice(0, 10)}.json`);
const GBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const res = [];
const meld = (navn, ok, detalj) => {
  res.push({ navn, ok, detalj });
  console.log(`${ok ? "✅" : "❌"} ${navn}${detalj ? " — " + detalj : ""}`);
};

const enc = (p) => p.split("/").filter(Boolean).map(encodeURIComponent).map((s) => "/" + s).join("");

// ───────────────────────── statiske sjekker (curl-nivå) ─────────────────────
async function hent(path, ua = GBOT) {
  const r = await fetch(BASE + path, { headers: { "User-Agent": ua } });
  return { status: r.status, tekst: await r.text() };
}

async function statiske() {
  // robots.txt: Googlebot-hullet skal IKKE gjenoppstå
  const rob = await hent("/robots.txt");
  const harTomGooglebot = /User-agent:\s*Googlebot\s*\r?\n\s*Disallow:\s*\r?\n/i.test(rob.tekst + "\n");
  meld("robots.txt uten tomt Googlebot-hull", rob.status === 200 && !harTomGooglebot,
    harTomGooglebot ? "TOMT Googlebot-blokk er tilbake!" : `${rob.tekst.length} tegn`);
  meld("robots.txt blokkerer /Search.aspx", /Search\.aspx/i.test(rob.tekst));

  // sitemap-størrelse. 4.26.05 kan splitte sitemap i en sitemapindex per
  // språk/størrelse — da må vi summere barne-sitemapene, ikke telle <loc> i indexen.
  const sm = await hent("/sitemap.xml");
  let antall = 0;
  let smDetalj = "";
  if (/<sitemapindex/i.test(sm.tekst)) {
    const barn = [...sm.tekst.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1]);
    for (const url of barn) {
      const b = await fetch(url, { headers: { "User-Agent": GBOT } });
      antall += ((await b.text()).match(/<loc>/g) || []).length;
    }
    smDetalj = `sitemapindex m/ ${barn.length} barne-sitemaps, ${antall} URL-er totalt`;
  } else {
    antall = (sm.tekst.match(/<loc>/g) || []).length;
    smDetalj = `${antall} URL-er`;
  }
  meld("sitemap.xml ~5000 URL-er", sm.status === 200 && antall > 4000, smDetalj);

  // MERK: publiserings-innhold (JSON-LD, hero, kontaktskjema-script) kan IKKE
  // sjekkes statisk — Multicase serverer en «slank» prerender-variant
  // vilkårlig, uavhengig av User-Agent (bekreftet 18. aug: samme side ga full
  // HTML i går og slank i dag). Disse sjekkene ligger i Playwright-delen.

  // produktside: prd-num-label + Product-JSON-LD + lagerbeholdning-markup
  const prod = await hent("/wera/123695/bitsskrutrekker-m-skralle-20-ra-r-wera");
  meld("produktside: FT-artikkelnr (prd-num-label)", /prd-num-label/.test(prod.tekst));
  meld("produktside: Product JSON-LD", /"@type"\s*:\s*"Product/.test(prod.tekst));
}

// ───────────────────────── rendrede sjekker (Playwright) ────────────────────
async function rendrede() {
  const b = await chromium.launch();
  const ctx = await b.newContext();

  const sjekk = async (path, navn, fn, ventPå) => {
    const p = await ctx.newPage();
    try {
      await p.goto(BASE + enc(path), { waitUntil: "networkidle", timeout: 60000 });
      if (ventPå) await p.waitForSelector(ventPå, { timeout: 10000 }).catch(() => {});
      await p.waitForTimeout(1500);
      const r = await p.evaluate(fn);
      meld(navn, r.ok, r.detalj);
    } catch (e) {
      meld(navn, false, e.message.slice(0, 70));
    }
    await p.close();
  };

  // JSON-LD i rendret DOM (inline publiserings-schemas dukker opp her)
  for (const [path, minst] of [["/", 5], ["/wera", 3], ["/pelicase", 3], ["/referanser", 3]]) {
    await sjekk(path, `JSON-LD på ${path} (rendret)`, (minstArg) => {
      const n = document.querySelectorAll('script[type="application/ld+json"]').length;
      return { ok: n >= 1, detalj: `${n} schemas` };
    });
  }

  // produsent-side: HERO + title-overstyring virker i praksis
  await sjekk("/wera", "/wera: hero + title-overstyring", () => {
    const hero = !!document.querySelector(".ft-hero-scaled, .ft-hero--husqvarna, [class*='ft-hero']");
    const tittelOk = /wera/i.test(document.title) && !/^Fosen Tools \|/.test(document.title);
    return { ok: hero && tittelOk, detalj: `hero=${hero}, title=«${document.title.slice(0, 40)}»` };
  });

  // kontaktskjema: nytt script med interaksjonskrav (publisert 17. aug)
  await sjekk("/kundesenter/kontakt-oss", "kontaktskjema: script + iframe + takke-boks", () => {
    const script = [...document.querySelectorAll("script")].some((s) => /var interacted/.test(s.textContent || ""));
    const iframe = !!document.getElementById("fd-iframe-fosentools");
    const thanks = !!document.getElementById("ft-contact-thanks");
    return { ok: script && iframe && thanks, detalj: `script=${script}, iframe=${iframe}, takk=${thanks}` };
  }, "#fd-iframe-fosentools");

  // levende catgrid (Multicase strikker <img> — bygges runtime, jf. quirk)
  await sjekk("/produkter/momentverktøy", "catgrid på /produkter/momentverktøy", () => {
    const celler = document.querySelectorAll("#ft-auto-catgrid .ft-catgrid__cell").length;
    const bilder = document.querySelectorAll("#ft-auto-catgrid img").length;
    return { ok: celler >= 3, detalj: `${celler} celler, ${bilder} bilder` };
  }, "#ft-auto-catgrid .ft-catgrid__cell");

  // merkevegg
  await sjekk("/produsent", "merkevegg på /produsent", () => {
    const kort = document.querySelectorAll("#ft-brandwall a, #ft-brandwall li").length;
    return { ok: kort >= 40, detalj: `${kort} merkekort` };
  }, "#ft-brandwall");

  // megameny-søk (script i SystemHeadContent)
  await sjekk("/", "megameny MERKER/PRODUKTER-søk initialisert", () => {
    const harMerkeSok = !!document.querySelector("[id*='merke'][id*='sok'], .ft-merker-sok, [class*='merker-sok']") ||
      typeof window.ftMerkerSok !== "undefined" ||
      [...document.querySelectorAll("script")].some((s) => /merker/i.test(s.textContent || "") && /søk|sok/i.test(s.textContent || ""));
    return { ok: harMerkeSok, detalj: harMerkeSok ? "" : "fant ikke søke-init (verifiser manuelt i megameny)" };
  });

  // referanser: landingsside + kategoriside med filter
  await sjekk("/referanser", "referanse-landingsside (177 caser)", () => {
    const n = document.querySelectorAll(".ft-refgrid__cell").length;
    return { ok: n >= 170, detalj: `${n} caser` };
  }, ".ft-refgrid__cell");

  await sjekk("/referanser/verktøykofferter", "kofferter: rutenett + årsfilter", () => {
    const n = document.querySelectorAll(".ft-refgrid__cell").length;
    const chips = [...document.querySelectorAll(".ft-refgrid__chip")].map((c) => c.textContent.trim());
    return { ok: n >= 60 && chips.length >= 3, detalj: `${n} caser, chips: ${chips.join(" · ")}` };
  }, ".ft-refgrid__chip");

  // filter-klikk virker
  await sjekk("/referanser/verktøyvogner", "vogner: filterklikk filtrerer", async () => {
    const chip = [...document.querySelectorAll(".ft-refgrid__chip")].find((c) => /20\d\d/.test(c.textContent));
    if (!chip) return { ok: false, detalj: "ingen års-chip" };
    const lovet = +(chip.textContent.match(/\((\d+)\)/) || [])[1];
    chip.click();
    await new Promise((r) => setTimeout(r, 400));
    const synlige = [...document.querySelectorAll(".ft-refgrid__cell")].filter((e) => e.style.display !== "none").length;
    return { ok: synlige === lovet, detalj: `chip lovet ${lovet}, viste ${synlige}` };
  }, ".ft-refgrid__chip");

  // caseside: faktaboks (AJAX-lastet — networkidle + selector, jf. lærdom 17. aug)
  await sjekk("/referanser/verktøyvogner/verktøyvogn-til-avincis", "caseside: faktaboks rendres", () => {
    const felt = document.querySelectorAll(".ft-case__fakta .ft-case__felt").length;
    return { ok: felt >= 3, detalj: `${felt} felt` };
  }, ".ft-case__fakta");

  // produktside: lagerbeholdning per lokasjon (JS-rendret)
  await sjekk("/wera/123695/bitsskrutrekker-m-skralle-20-ra-r-wera", "produktside: lagervisning per lokasjon", () => {
    const t = document.querySelector(".main-warehouse")?.textContent || "";
    return { ok: /på lager/.test(t), detalj: t.replace(/\s+/g, " ").trim().slice(0, 50) };
  }, ".main-warehouse");

  // søkeside: CenterContentArticleSearch skal være skjult (SCSS)
  await sjekk("/search?q=wera", "søkeside: artikkel-sonen skjult", () => {
    const el = document.querySelector("[id^='Field_CenterContentArticleSearch']");
    if (!el) return { ok: true, detalj: "sonen finnes ikke (ok)" };
    return { ok: getComputedStyle(el).display === "none", detalj: "display=" + getComputedStyle(el).display };
  });

  await b.close();
}

console.log(`Multicase-sjekk mot ${BASE}\n`);
await statiske();
await rendrede();

const okAntall = res.filter((r) => r.ok).length;
console.log(`\n${okAntall}/${res.length} sjekker OK`);
fs.writeFileSync(UT, JSON.stringify({ base: BASE, kjørt: new Date().toISOString(), resultater: res }, null, 1));
console.log("Resultat lagret: " + UT);
process.exit(okAntall === res.length ? 0 : 1);
