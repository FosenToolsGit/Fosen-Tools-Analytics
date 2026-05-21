# Wera patch-mode

Dokumentasjon for patch-arbeidet 21. mai 2026 som la til produktegenskaper-bullets
og rik tekniske spesifikasjoner i `wera_product_cache`.

## Bakgrunn

Etter at full Wera-katalog (3611 produkter) var deep-scrapet, viste kvalitetskontrollen
at to felt aldri ble populated:

| Felt | Coverage før | Årsak |
|---|---|---|
| `feature_bullets` | 0.0% | Scraperen letet etter standard `<ul>` mellom `<h1>` og første `<h2>/<h3>`. Wera bruker IKKE `<ul>` — de viser produktegenskaper som icon-grid (`.product-features .feature-icon`). |
| `raw_data.specs` | ~0% | Scraperen letet etter `<table>`. Wera bruker IKKE `<table>` — de bruker `<div class="scrollsnaptable">` med CSS-grid (`row-X column-Y` klasser). Hver produktside dekker flere varianter (kolonner), så vi må finne kolonnen for vår spesifikke produktkode. |

## Endringer

### 1. `src/lib/services/wera-deep-scrape.ts`

Ny parsing-logikk i `page.evaluate(...)`:

- **Bullets:** `document.querySelectorAll(".product-features .feature-icon .feature-icon-text")` → array av strings (korte tags 2-100 tegn)
- **Specs:** Itererer `.scrollsnaptable`-elementer
  1. Bygg `row_col → text`-map fra alle `.scrollsnaptable-cell`
  2. Finn vår produktkode i row-0 (sammenligner mot `targetCode` som er passed inn via `page.evaluate(fn, code)`)
  3. For hver rad (`r >= 1`): hent label fra `col-0` + verdi fra vår kolonne
  4. Label kan ha to spans: `<span class="label">` + `<span class="unit"> mm</span>` — kombinerer til `"Klingelengde (mm)"`
  5. Filtrerer bort "Merk"-rader (med (1)/(2)-referanser) og huskeliste-rader
- `rawData` lagrer nå også `specs` — `{ title: data.title, specs: data.specs ?? [] }`

### 2. `src/lib/services/wera-seo-html.ts`

Tekniske spesifikasjoner-tabellen bruker nå `scraped.specs` i tillegg til de hardkodede radene (Produsent, artikkelnummer, EAN):

```typescript
const existingLabels = new Set(specs.map(([label]) => label.toLowerCase()));
const scrapedSpecs = input.scraped?.specs ?? [];
for (const { label, value } of scrapedSpecs) {
  if (!label || !value) continue;
  const labelKey = label.toLowerCase();
  if (existingLabels.has(labelKey)) continue;
  if (/^delenummer$|^merk$/i.test(label)) continue;
  specs.push([label, value]);
  existingLabels.add(labelKey);
}
```

Dedup mot eksisterende labels (case-insensitive) hindrer dobbel-rader hvis scraperen
returnerer noe vi allerede har eksplisitt.

### 3. `src/app/api/produkt-import/wera-reclassify-cache/route.ts`

- `select(...)` inkluderer nå `raw_data`
- `WeraScrapeResult.specs` populated fra `row.raw_data?.specs ?? []`
- `WeraScrapeResult.rawData` populated fra `row.raw_data ?? {}`

Når brukeren trykker «Re-klassifiser cache»-knappen, leses nå specs fra DB og sendes til
HTML-generatoren — så `<h3>Tekniske spesifikasjoner</h3>`-tabellen blir rik.

## Patch-script: `scripts/patch-wera-cache.mjs`

Standalone Playwright-script som henter KUN bullets + scrollsnaptable for hver kode
i cachen, oppdaterer `feature_bullets` + `raw_data.specs` i DB. Mye lettere enn full
deep-scrape (vi har allerede navn, bilder, beskrivelse-sections, klassifisering).

### Kjøring

```bash
cd "/Users/adrianhpettersen/Downloads/Fosen Tools Apper/Fosen Tools Analytics/.claude/worktrees/stoic-ellis-c9130f"

# Full patch (~35 min for 3611 produkter)
node --env-file=.env.local scripts/patch-wera-cache.mjs

# Etter at den er ferdig: regenerér HTML
# Enten via UI-knappen «Re-klassifiser cache» i /innleggsbygger/produkt-import
# Eller via curl mens dev-server kjører + bruker er logget inn (cookie-auth)
```

### Flagg

| Flagg | Beskrivelse |
|---|---|
| `--only=05032001001,05032002001` | Kun spesifikke koder (komma-separert) |
| `--limit=50` | Begrens antall (for testing) |
| `--force` | Patch også koder som allerede har bullets |
| `--concurrency=4` | Parallelle workers (default 4) |
| `--start=0` | Start-offset (for resume hvis kræsj) |

### Resume / robusthet

- Re-startbar: hvis scriptet kræsjer halvveis, kjør på nytt — den hopper over koder som
  allerede har `feature_bullets` (med mindre `--force`).
- Hver `done` flagget når lagt til DB med `upsert`-batches på 50.
- Failed-codes listet til konsoll på slutten.

### Forventet ytelse

Basert på 30-produkt-test 21. mai 2026:

- **18 sek for 30 produkter**, ~1.7 prod/sek med concurrency=4
- **~35 min for hele katalogen** (3611 produkter)
- **0 failures** på testen
- **23/30 (77%) fikk bullets**, **24/30 (80%) fikk specs** — resten har sannsynligvis ikke
  disse seksjonene på Wera-siden (bags, forlengere, DIY-display-pakker)

## Verifikasjon

### `scripts/verify-one-product.mjs <code>`

Viser én rad: navn, bullets, raw_data.specs, første 500 tegn av HTML.

### `scripts/wera-quality-check.mjs`

Full audit på field coverage, klassifisering, HTML-seksjoner.

### `scripts/wera-noise-check.mjs`

Skanner alle 3611 HTML-er for noise (nyhetsbrev-promo, app-tekst, footer, tysk
fragmenter). Resultat per 21. mai: **0 rader med noise i final HTML** — `pickBestSections`-
filteret fungerer som forventet.

## Eksempel-output

**Produktkode `05032001001` (3335 Sporskrutrekker, rustfritt stål):**

```
feature_bullets (5):
  - Rustfritt
  - Take it easy
  - Laserspiss
  - Kraftform håndtak
  - Rullestopp

raw_data.specs (7):
  Klingetykkelse (mm)        = 0,5
  Klingebredde (mm)          = 3,0
  Klingediameter (mm)        = 3,0
  Klingelengde (mm)          = 80
  Lengde på håndtak (mm)     = 81
  Klingebredde (tommer)      = 1/8"
  Klingelengde (tommer)      = 3 1/8"
```

Disse rendres som `<h3>Egenskaper</h3><ul><li>...</li></ul>` og som ekstra rader i
`<h3>Tekniske spesifikasjoner</h3><table>...</table>` i Multicase-eksport-HTML.

## DOM-strukturer på wera.de

For senere referanse — hvordan Wera-sidene er bygget per 21. mai 2026:

### Produktegenskaper (bullets)

```html
<div class="product-features">
  <h2 class="heading-m mb-24px">Produktegenskaper</h2>
  <div class="product-feature-icons">
    <div class="feature-icon">
      <div class="feature-icon-content">
        <div class="feature-icon-image"><svg>…</svg></div>
        <div class="feature-icon-text">Rustfritt</div>
      </div>
    </div>
    <div class="feature-icon">…<div class="feature-icon-text">Take it easy</div>…</div>
    <!-- … flere icon-cards … -->
  </div>
</div>
```

**Plukk:** `document.querySelectorAll(".product-features .feature-icon .feature-icon-text")`

### Tekniske spesifikasjoner (scrollsnaptable)

```html
<div class="product-table-properties">
  <h3 class="heading-l">Produktopplysninger</h3>
  <h4 class="heading-m">Data og fakta</h4>
  <div class="scrollsnaptable" style="--columns: 4; --rows: 8;">
    <!-- header-rad med produktkoder -->
    <div class="scrollsnaptable-cell scrollsnaptable-cell--text-start row-0 column-0">
      <span class="label">Delenummer</span>
    </div>
    <div class="scrollsnaptable-cell row-0 column-1">05032001001</div>
    <div class="scrollsnaptable-cell row-0 column-2">05032002001</div>
    <!-- … -->

    <!-- data-rad -->
    <div class="scrollsnaptable-cell scrollsnaptable-cell--text-start row-1 column-0">
      <span class="image"><svg>…</svg></span>
      <span class="text-content combined-unit">
        <span class="label">Klingetykkelse</span>
        <span class="unit"> mm</span>
      </span>
    </div>
    <div class="scrollsnaptable-cell row-1 column-1">0,5</div>
    <div class="scrollsnaptable-cell row-1 column-2">0,6</div>
    <!-- … -->
  </div>
</div>
```

**Strategi:** Bygg `row_col → text`-map. Finn vår kode i row-0. Iterer rad 1+ — label fra
col-0 (label + unit), verdi fra vår kolonne. Hopp over Merk-rad og huskeliste-rader.

## Edge cases observert i 30-produkt-testen

- **Bag/holster-produkter** (`9446 Textilboks Click-Torque`): Ofte 0 bullets, få specs.
  Wera viser ikke icon-grid for disse.
- **Display-pakker (SB-suffix)** (`Bit-Box 20 V Innenfirkant`): Sometimes 0 bullets + 0 specs.
  Wera har minimal data for B-rad-display-produkter.
- **Bits-sett** (`851/1 BDC bits`): Bullets ok, specs ofte mangler (ingen variant-tabell).
- **Forlengere** (`8797 C Zyklop Hybrid-forlenger`): 0 bullets, få specs.

Dette er IKKE scrape-feil — Wera-sidene mangler genuinely informasjonen for disse
produkttypene.
