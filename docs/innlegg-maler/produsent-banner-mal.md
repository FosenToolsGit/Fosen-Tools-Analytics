# Produsent-banner-mal (10000×2500)

Offisiell mal for produsent-banner som limes inn i `ft-hero-scaled`-blokken
øverst på produsent-sider på fosen-tools.no.

## Design (V5 — låst 10. juni 2026)

- **Bakgrunn:** FT-ink (#0F1115) med subtil rød radial-glow venstre
- **Venstre 50 %:** produsent-logo sentrert med myk hvit radial-glow bak
  + drop-shadow så den synes uavhengig av logo-farge (svart, mørk, etc.)
- **Høyre 65 %:** hero-bilde av produsentens produkt med diagonal mask
  (8 % klippet bort i venstre-topp) + linear gradient så venstre-kant
  fader mot mørk så ingenting kolliderer med logo-glowen
- **Nederst-høyre:** «Forhandlet av» + FT-merket (hvit wordmark på
  drop-shadow) som signalerer at Fosen Tools står bak
- **Ingen pille, ingen tagline, ingen accent-stripe** — ren, premium hero

## Kjør malen for en ny produsent

```bash
npm run produsent-banner -- \
  --brand "{ProdusentNavn}" \
  --tagline "{Kort beskrivelse}" \
  --year {YYYY} \
  --logo "{public PNG-URL fra Supabase Storage}" \
  --hero "{høyoppløselig produktbilde fra produsentens nettside}" \
  --out "out/banners/{slug}-banner.jpg"
```

**Note:** `--tagline` og `--year` er fortsatt obligatoriske i CLI-en for
API-kompatibilitet, men brukes ikke av V5-designet. Send hva som helst.

### Eksempler

**Picard (hammere, etablert 1857):**
```bash
npm run produsent-banner -- \
  --brand "Picard" \
  --tagline "Tyske presisjonshammere" \
  --year 1857 \
  --logo "https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/social_assets/brand-assets/leverandor-logoer/picard.png" \
  --hero "https://www.picard-hammer.de/fileadmin/_processed_/5/c/csm_01-PICARD_816e42433e.jpg" \
  --out "out/banners/picard-banner.jpg"
```

## Hero-bilde-tips

- **Helst:** detaljbilde av en håndverker som BRUKER produktet (Picard-eksempelet)
- **Alternativt:** ren produktbilde mot nøytral bakgrunn
- **Unngå:** logoer eller tekst i hero-bildet (kolliderer med Picard-logo venstre)
- **Oppløsning:** min 3000 px bred — bilder strekkes ellers ut

## Logo-format

- **Best:** PNG med transparent bakgrunn fra `social_assets/brand-assets/leverandor-logoer/{slug}.png`
- **Hvis ikke i Supabase:** kjør `node --env-file=.env.local scripts/upload-leverandor-logoer.mjs {slug}`
  (sharp resizer SVG til 400×400 transparent PNG, upserter til Supabase)
- **Forventet kilde-oppløsning:** min 1000 px høyde — V5 skalerer logoen
  til 1600 px høyde, så små PNG-er blir pikselete

## Opplasting til Multicase

1. Last opp `out/banners/{slug}-banner.jpg` til
   `/userfiles/image/Bannere - Merkevarer/{Merke}-Banner.jpg`
   (nyere konvensjon) eller `/userfiles/image/Bannere/{Merke}.jpg` (gammel)
2. Legg inn HERO-blokken på produsent-siden ifølge mønsteret i CLAUDE.md
   (seksjonen «Produsent-sider (fosen-tools.no) — SEO-template»)
3. Husk at HERO-blokken må bruke `<section class="ft-hero-scaled">` med
   `<picture>` + `<source>` + `<img>` + `<h1>`

## Endre malen

Kildekode: `remotion/compositions/FTProdusentBanner.tsx`
Render-script: `scripts/render-produsent-banner.ts`
Komposisjon registrert i: `remotion/Root.tsx`

Live-redigering med hot-reload:
```bash
npm run video:studio
# velg "FTProdusentBanner" fra listen
```

## Historikk

- **V1 (10. juni 2026):** 2-kolonne med EST 1857-pille + tagline + accent-stripe
  + svart Picard-logo direkte på mørk bg (logo usynlig)
- **V2:** ren full-bleed hero (for sparten — Adrian likte V1-fargekoding bedre)
- **V3:** logo i hvit boks med padding (for «boxy»)
- **V4:** kun logoen med radial glow, ingen tekst (riktig retning, men logo
  for liten)
- **V5 (LÅST):** `height: 1600` på logoen tvinger oppskalering siden PNG
  ikke skalerer over native med `maxWidth`. Glow utvidet til 55%×70%.
