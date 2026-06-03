# Ukentlige innlegg — oppskrift (mandag + torsdag)

Komplett guide for å lage de faste ukentlige sosiale medie-postene. Alt er deterministisk — ingen AI, ingen Gemini, ingen ChatGPT i pipelinen. Captions skrives lokalt i tekst-maler, videoer rendres via Remotion.

**Sist oppdatert:** 3. juni 2026 (mandag-rotasjon + HTML-captions + SFX-only audio)

---

## Hurtigreferanse — kommandoer

```bash
# MANDAG · Produktshowcase fra én kategori
npm run mandag                                          # default: dagens dato, rotasjon
npm run mandag -- --date 2026-06-09                     # spesifikk dato
npm run mandag -- --kategori skrutrekkere               # overstyr kategori
npm run mandag -- --date 2026-06-09 --kategori verktøyvogner

# TORSDAG · 3 modi (for-og-etter / leverandor-tips / produkt-tips)
npm run torsdag -- --mode produkt-tips --data scripts/data/torsdag-wera-bitsskrutrekker-uke24.json
npm run torsdag -- --mode leverandor-tips --data scripts/data/torsdag-leverandor-tips-eksempel.json
npm run torsdag -- --mode for-og-etter --data path/til/data.json

# Verifisér TypeScript
npx tsc --noEmit
```

Output havner i `out/dagens/{YYYY-MM-DD}/{post-type}/`:
- `reel.mp4` — Remotion-rendret video (1080×1920, 4:5)
- `captions.html` — captions med kopier-knapper i mørk FT-stil
- `alt-tekst.md` (torsdag) — alt-tekst for IG

---

## 1. MANDAG — Produktshowcase per kategori

**Hva det er:** Ukens topp 3 produkter fra én produktkategori, automatisk plukket fra fosen-tools.no (filtrert på lager + pris).

**Komposisjon:** `KampanjeTeaser` (intro → 3 produktslides med crossfade → outro CTA).

**Rotasjon:** Definert i [scripts/data/mandag-rotasjon.json](../../scripts/data/mandag-rotasjon.json) — 16 ukers rotasjon:

| Uke (fra uke 23 2026) | Kategori |
|---|---|
| 23 | verktøyvogner |
| 24 | skrutrekkere |
| 25 | måling-og-merking |
| 26 | arbeidsklær |
| 27 | piper-og-skraller |
| 28 | lysutstyr |
| 29 | tenger |
| 30 | verneutstyr |
| 31 | verktøykoffert |
| 32 | batteriverktøy |
| 33 | nøkler |
| 34 | hammere |
| 35 | momentverktøy |
| 36 | stiger-og-plattformer |
| 37 | oppbevaring |
| 38 | verktøysett |

Etter uke 38 starter rotasjonen på nytt.

**Slik virker scriptet:**
1. Henter HTML for `https://fosen-tools.no/produkter/{kategori-slug}` med Googlebot UA (Multicase content-cloaking, quirk #14)
2. Regex-matcher alle `/produsent-slug/produkt-id`-lenker
3. Scraper hver med `scrapeProductByUrl()` — filtrerer bort offline + < 200 kr + uten bilde
4. Sorterer på pris (premium først), plukker dyreste + medium + billigste
5. Renderer KampanjeTeaser med produktbilder + priser
6. Bygger captions.html

**Caption-format:**
- **Facebook:** UTM-lenke per produkt med unik `utm_content` per produkt
- **Instagram:** Varenummer per produkt (fra `.prd-num-label`/URL-fallback), ingen lenker → "Link i bio"
- **LinkedIn:** Brukes IKKE (følgerne der er ikke målgruppen for produktshowcase)

**UTM-kampanje-mønster:** `mandag-{kategori}-{YYYY-MM-DD}`

**Audio:** Ingen bakgrunnsmusikk. SFX-hits kun på animasjons-events:
- `whoosh-cinematic` på intro
- `soft-sweep` per produkt-crossfade
- `impact-movie` på outro

**Postingstid:** mandag kl 12:00.

---

## 2. TORSDAG — Tips/leverandør-spotlight

**Hva det er:** Ukens produkt-tips eller leverandør-spotlight med ett produkt i fokus.

**Komposisjon:** `FTLeverandorNyhet` (Hook leverandør-tagin → Scene 2 produkt + tagline + bullets → outro CTA).

**3 modi:**
- `produkt-tips` — generisk produkttips (badge: TIPS, eyebrow: Ukens tips)
- `leverandor-tips` — leverandør-spotlight (badge: NYHET, eyebrow: Nyhet fra)
- `for-og-etter` — HDFI før/etter (HDFI-narrativ, ingen leverandør-logo i hook)

**Data-input** (`scripts/data/*.json`):
```json
{
  "format": "reel",
  "supplierSlug": "wera",
  "supplierName": "WERA",
  "supplierLogoUrl": "https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/social_assets/brand-assets/leverandor-logoer/wera.png",
  "productName": "Bitsskrutrekker",
  "productTagline": "Tysk presisjon, hver dag",
  "bullets": [
    "USP 1",
    "USP 2",
    "USP 3"
  ],
  "productImageUrl": "https://...",
  "eyebrowOverride": "Ukens tips",
  "badgeLabel": "TIPS",
  "ctaUrl": "fosen-tools.no/wera/123695"
}
```

**Caption-format:**
- **Facebook:** ~250 tegn, klikkbar URL med UTM
- **Instagram:** Kort tekst + hashtags + "Link i bio"
- **LinkedIn:** Fagspråk, klikkbar URL med UTM

**UTM-kampanje-mønster:** `torsdag-{mode}-{YYYY-MM-DD}`

**Audio:** Ingen bakgrunnsmusikk. SFX-hits via:
- Hook F leverandør-tagin SFX
- 2 × FTTransition whooshes mellom scener
- FTOutroCta `impact-movie` på outro

**Postingstid:** torsdag kl 12:00 (snitt 162 eng. vs 19 onsdag).

---

## 3. Audio — ingen bakgrunnsmusikk, kun SFX

**Beslutning 3. juni 2026:** Vi bruker IKKE konstant bakgrunnsmusikk. Royalty-free med null attribution er begrenset, og Meta Sound Collection kan ikke embeddes lovlig i scheduled reels. SFX kun på animasjons-events gir mer premium B2B-stilen.

**Tilgjengelige SFX** (i `remotion/public/sfx/`, fra Four Editors-pakken):
- `whoosh-sweep` — standard scene-til-scene
- `whoosh-cinematic` — climactic intro/build-up
- `whoosh-deep` — bass-whoosh, brand reveals
- `riser-slow` / `riser-hope` — count-up climax
- `impact-close` — soft thud
- `impact-movie` — outro stinger
- `soft-sweep` — element snap-in
- `quick-sweep` — UI/button-tap

**Alle FT-komposisjoner har Audio-laget med musikk fjernet.** Bare SFX igjen.

**Hvis du vil legge musikk tilbake:** Render reel-en stille, last opp i Instagram-appen og bruk Meta Sound Collection (algoritmen elsker det).

---

## 4. Captions — HTML, ikke Markdown

**Beslutning 3. juni 2026:** Alle captions-leveranser er `captions.html` (mørk FT-stil med kopier-knapper), IKKE `captions.md`.

**Standardmal:**
- Bakgrunn `#0F1115`, accent `#ED1C24`, cards `#1c1f26`
- Manrope/system-sans for body, monospace for `<pre>`
- Hver plattform i et `.card` med `h2` + `pre` + Kopier-knapp
- Footer med postingstid + alt-tekst-påminnelse + klikkbare UTM-lenker

**Kopier-handler** bruker `navigator.clipboard` med `execCommand`-fallback. `textContent` dekoder HTML-entiteter (`&amp;` → `&`) så lenker virker korrekt når limet inn.

---

## 5. Brand-regler som er enforced

Caption-validator i [scripts/caption-rules.ts](../../scripts/caption-rules.ts) fanger:
- **«CNC-frest»** → må være «CNC-maskinert»
- **«i Brekstad»** → må være «på Brekstad»
- **Em-dash «—»** i prosa → bruk komma
- **Lange UTM-er som blæser overskuelig** advarsel
- **Tom alt-tekst** → påminnelse

Brand-regler som ikke fanges automatisk, men som vi ALLTID følger:
- HDFI alene (ikke «HDFI-skum» eller «HDFI-skuminnlegg»)
- CADLAB tegner, CNC-maskinering skjer hos FT-verkstedet (ikke «CNC-maskinert i CADLAB»)
- Aldri gjett kunde-navn — generiske fraser hvis usikkert
- Zweibrüder er default merkenavn (Ledlenser brukes på URL)
- Morakniv (ikke «Mora of Sweden»)
- FT-rød-bakgrunn-logo er default

---

## 6. Filsteder

| Fil | Hva |
|---|---|
| `scripts/mandag-kategori.ts` | Mandag-script |
| `scripts/torsdag-tipset.ts` | Torsdag-script |
| `scripts/data/mandag-rotasjon.json` | 16-ukers kategori-rotasjon |
| `scripts/data/torsdag-*.json` | Eksempel/data-filer per torsdag |
| `scripts/caption-rules.ts` | Caption-validator |
| `scripts/hent-produktbilde.ts` | Bilde-scraping fra fosen-tools.no |
| `remotion/compositions/KampanjeTeaser.tsx` | Mandag-video |
| `remotion/compositions/FTLeverandorNyhet.tsx` | Torsdag-video |
| `remotion/audio-registry.ts` | SFX-handles |
| `remotion/public/sfx/` | Alle lyd-filer |
| `out/dagens/{date}/{post}/` | Render-output |

---

## 7. Vanlige problemer + fix

**Q: Mandag-script feiler med "Trenger minst 3 produkter, fant bare X"**
A: Kategorien har for få produkter på lager. Bytt slug via `--kategori`, eller hopp over uken.

**Q: Produktbildet er null/dårlig**
A: Multicase JSON-LD har ikke alltid bilde. Test: `npm run produktbilde -- {URL}`. Bytt produkt manuelt.

**Q: SKU returnerer URL-ID (124612) istedenfor "FTINDU2"**
A: Multicase rendrer `.prd-num-label` klient-side, scraper finner den ikke i HTML. Bruk URL-ID som varenummer — fungerer for Instagram-bruk.

**Q: Caption-validator klager på "CNC-frest"**
A: Bytt til «CNC-maskinert» i kildedata.

**Q: TypeScript-feil etter endring**
A: Kjør `npx tsc --noEmit` — vis feil, fiks før render.

---

## 8. Neste post — sjekkliste

Hver mandag/torsdag morgen:

1. ☐ `npm run mandag` / `npm run torsdag -- --mode X --data Y`
2. ☐ Sjekk reel.mp4 — er produktene riktige? På lager? Bilder OK?
3. ☐ Åpne captions.html — kopier til FB + IG
4. ☐ Postingstid: kl 12:00 (mandag eller torsdag)
5. ☐ Etter publisering: alt-tekst via IG-mobilapp
6. ☐ Etter 24 timer: sjekk engagement vs forrige uke

---

## 9. Når noe må endres permanent

- **Ny rotasjons-kategori:** Endre `scripts/data/mandag-rotasjon.json`
- **Nye SFX:** Legg `.wav` i `remotion/public/sfx/`, oppdater `Sfx`-typen + `SFX_VOLUME` i `audio-registry.ts`
- **Nytt torsdag-mode:** Utvid `MODE_CONFIG` i `torsdag-tipset.ts`
- **Endre brand-regler:** `scripts/caption-rules.ts`
- **Endre video-design:** `remotion/compositions/*.tsx` — alltid kjør `npx tsc --noEmit` etter

---

## 10. Historikk

- **3. juni 2026** — HTML captions (ikke MD), SFX-only audio (ingen musikk), mandag-rotasjon ferdig (16 uker), torsdag-refaktor til blocks-pattern
- **2. juni 2026** — FT Remotion-pipeline v2: 10 komposisjoner, 6 hooks, brand-validator
- **Tidligere** — Se `CLAUDE.md` Prosjekt-tidslinje
