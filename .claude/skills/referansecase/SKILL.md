---
name: referansecase
description: Bygg nye referansecaser til fosen-tools.no/referanser fra bildearkivet — kontaktark, bildebehandling (ref-bilder.mjs), datafil, faktaboks-HTML, meny-fasit og landingsside-rebuild. Brukes når Adrian vil legge inn nye caser eller oppdatere referansesidene.
---

# Referansecase — fra bildearkiv til publisert side

Kilde: `/Volumes/01-Fosen Tools/Bilder/{år}/{Kunde}/`. **Én mappe er ikke én
leveranse** — lag kontaktark først ([scripts/_tmp-ref-kontaktark.mjs](scripts/_tmp-ref-kontaktark.mjs))
så Adrian kan plukke hvilke bilder som hører til hvilket prosjekt.

## Arbeidsflyt

1. **Kontaktark** av mappa → Adrian plukker bilder og bekrefter hva
   leveransen faktisk var.
2. **RAW-filer:** konverter med `sips` før videre behandling.
3. **Klargjør bilder:** `node scripts/ref-bilder.mjs` — EXIF-rotasjon,
   maks 1600 px, navngir `IMG1.jpg` og oppover, utmappe = Multicase-stien
   (`/userfiles/image/Inspirasjon/…`). `--rekke` styrer slider-rekkefølge,
   `--kun` begrenser utvalg, `--blur` for kant-uskarphet.
   Rot i verkstedbilder ligger langs kantene: `scripts/ref-blur.mjs --topp 0.30`
   eller `--bunn 0.16` (reoler/tak øverst, gulv/paller nederst).
4. **Velg kategori** (9 stk): vogner, kofferter, kasser, softcase, laser,
   verkstedinnredning, containere, våpenlagring, **verktøyinnlegg** (= FT
   leverte bare innlegget, til beholder kunden eier).
5. **Datafil + generator:** legg caset inn i kategoriens datafil og kjør
   kategori-generatoren → case-HTML med faktaboks. Faktaboksen bruker
   `<div>`/`<span>`-struktur (IKKE `<div>` i `<dl>` — Multicase stripper
   ugyldig HTML4 og feltene forsvinner).
6. **Oppdater meny-fasiten** `scripts/_tmp-{kategori}-meny.json` med nye
   caser FØR landingssiden bygges — landingsscriptet forkaster stille caser
   som mangler i fasiten.
7. **Bygg landingssiden:** `node scripts/_tmp-ref-landing2.mjs` og verifiser
   at case-antallet stemmer (177 per 17. aug 2026 — skal øke).
8. **Lever** som `~/Desktop/FT-{kategori}-KOMPLETT.html` med kopi-knapper
   (dark FT-stil), og åpne i Chrome: `open -a "Google Chrome" …`

## Regler som IKKE kan brytes

- **Aldri gjett kundenavn, tall eller beholdertype.** Halvsynlig tekst i
  bildekant skal ikke kompletteres («Kongsberg Aviation», ikke gjettet
  fullnavn). Tomt kundefelt er OK og ofte med vilje. Verifiserte kunder:
  TESS VEST, Lufttransport AS, Forsvaret, Andøya Space.
- **Terminologi:** HDFI **maskineres** (ikke «graveres», ikke «skummes» —
  gravert = lasergravering på verktøyet). «HDFI» alene, «CNC-maskinert».
- **Lenker verifiseres KUN mot admin-ProductMenu** — Multicase returnerer
  aldri 404, en gal lenke lander stille på forsiden. Full lenkefasit i
  memory `project_referanser_lenkefasit`.
- **Faktaboks-skanning** krever Playwright `networkidle` + vent på
  `dl.ft-case__fakta` — den AJAX-lastes, `domcontentloaded` er for tidlig.
- **Årsfilter** på kategorisider bruker `a:fra:til`-chip-mekanismen — test
  hver chip ved å klikke og telle synlige celler (lovet antall = vist antall).
- **Fredagspost** av et case: inviter til forespørsel («vil du ha noe
  lignende, ta kontakt») med lenke til kontaktsiden — aldri bare «Lenke i bio».
- Casets egne foto ligger i royalSlider `data-orgsrc` — kategorisidene viser
  kun thumbnails.
