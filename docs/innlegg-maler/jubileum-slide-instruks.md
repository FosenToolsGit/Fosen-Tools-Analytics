# Jubileum-event slide — slik legger Brit den til i prisplakat-slideshow

## Sammendrag

- **Ny slide-type** i prisplakat-systemet: **«🎉 Jubileum-event (26. juni)»**
- Inneholder: dato + åpningstid (10:00–16:00) + grilling (11:00–13:00) + 8 partner-logoer
- Animert: pulserende dato + tids-kort, scanline-sweep, partner-rundell ruller horisontalt
- Designet til å kjøre i loop på UniFi-kioskskjerm i butikken
- **14 sek per loop** før neste slide vises (overstyrer global `seconds_per_slide`)

## 1. Logg inn på fosen-tools-analytics.vercel.app

Bruker som er kjent: brit@fosen-tools.no.

## 2. Åpne en eksisterende prisplakat-slideshow

`/prisplakat` → velg «Mine prisplakater» → åpne den slideshow-en hun
allerede har på TV-en (med Packout-display / UniFi-skjerm).

Hvis det er en ny: lag en «Slideshow — liggende 16:9»-prisplakat for TV
eller «Slideshow — portrett 9:16» avhengig av skjerm-orientering.

## 3. Legg til ny custom slide

I editor-en, scroll til **«Special slides»**-seksjonen og klikk
**«+ Ny slide»** → velg **«🎉 Jubileum-event (26. juni)»** fra dropdown.

Sliden får default-verdiene:
- Dato: 26. JUNI 2026
- Åpent: 10:00–16:00
- Grilling: 11:00–13:00
- Subtitle: «LEVERANDØR-STANDER / HOLD AV DAGEN»
- 8 partnere uten logo-URL-er (vises som tekst)

## 4. Fyll inn partner-logoene (anbefalt)

Ekspandér sliden i editor-en, scroll til «Partnere»-listen og lim inn
logo-URL per partner. URL-mønsteret er:

```
https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/social_assets/jubileum-2026/logoer/{filnavn}
```

| Partner | Filnavn | Bemerkning |
|---|---|---|
| Milwaukee | `Milwaukee_Logo.svg` | |
| Wera | `Wera_Tools_logo.svg` | scale: 10 (mye negative space) |
| Soudal | `Soudal.svg` | |
| Picard | `RGB_Picard_Logo_2024.svg` | |
| Halder | `erwin-halder-kg-vector-logo.svg` | scale: 3 |
| Zweibrüder | `Zweibrueder_Logo_K0.png` | filter_black: true |
| Red Bull | `redbull-logo-svgrepo-com.svg` | |
| Tesla Mobile Service | `Tesla_Motors.svg` | |

Filene ligger allerede i Supabase fra forrige jubileum-arbeid (29. mai-
sesjonen) — bare lim inn URL-en.

## 5. Skjekk forhåndsvisning

Klikk Play i editor-en, eller åpne via «📺 Skjerm-URL»-knappen.

Animasjonene starter automatisk når slide-en vises:
- **Pulse på dato** — glow på/av hver 3,5 sek
- **Pulse på tids-kort** — border-glow synker/stiger
- **Scanline** — sakte lys-stripe sveiper ned
- **Partner-rundell** — logoer scroller horisontalt, 40 sek per loop
- **Subtilt blueprint-grid** på bakgrunn

## 6. Lagre

«Lagre»-knappen øverst. Brit's TV-skjerm med kiosk-URL henter automatisk
oppdatert versjon innen 5 min (auto-reload).

---

## JSON-versjon (alternativ)

Hvis hun heller vil importere sliden ferdig-fylt, kan hun bruke
`scripts/data/jubileum-event-slide.json` direkte hvis vi bygger en
«importér slide fra JSON»-knapp senere.

For nå: bruk dropdown-en i editor-en — den er raskere.

## Hvorfor dette og ikke en video?

Tidligere idé (FTJubileum26Juni Remotion-video) ble droppet fordi Brit's
TV-skjerm allerede har en kjørende slideshow. Det er bedre å legge til
én slide i den eksisterende, enn å bytte hele oppsettet.

Animasjon-spec: alle effekter er CSS-keyframes, ingen video — så Adrian
kan justere tempo (rundell_duration, pulse-hastighet) live i editor-en
uten å re-rendre noe.

## Tider når noe må oppdateres

- **Etter 26. juni 2026**: slett denne sliden fra slideshow-en (kan
  bare disable-es ved å fjerne `enabled: true` istedenfor å slette
  hvis vi vil bruke samme template senere)
- **Endring av tider**: rediger `hours` + `grilling_hours` i editor-en
- **Endring av partner-listen**: rediger `partners`-arrayet i editor-en
