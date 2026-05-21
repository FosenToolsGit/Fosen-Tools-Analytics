# Innholdsmotor-oppgraderinger — 21. mai 2026

Gjennomført autonomt mens bruker var på lunsj (~30 min) etter to feilende HDFI-farger-tester (mono-rød verktøyvogn istedenfor fargevisning).

## Endringer

### 1. Multi-aspect bilde-generering per plattform

**Fil:** [src/lib/services/social-engine.ts](../src/lib/services/social-engine.ts)

Innholdsmotor genererer nå ÉT bilde per plattform i optimal aspect-ratio:

| Plattform | Aspect | Begrunnelse |
|---|---|---|
| Facebook | 1:1 | Sikker i alle feed-plasseringer |
| Instagram | 4:5 (→ SDK 3:4) | Portrait, max engasjement i feed |
| LinkedIn | 16:9 | Landscape, optimalt for desktop scroll |

Ny eksportert konstant `PLATFORM_ASPECT_RATIOS` gjør utvalget eksplisitt. `generateDraft()` looper over disse 3 og kaller `generateImage()` med riktig aspect per plattform. Referanser, brand-cache og prompt bygges ÉN gang før loopen. Hvis én plattform feiler fortsetter de andre.

Hver entry i `ai_images` har nå `platform` + `aspect_ratio` for sporbarhet.

**UI-endring** ([src/app/(dashboard)/innholdsmotor/page.tsx](../src/app/%28dashboard%29/innholdsmotor/page.tsx)): bilde-thumbnails rendres med riktig aspect-shape i preview + FB/IG/LI-badge + aspect-label.

### 2. Ny archetype: `produkt_variant`

Statement-archetypen er KUN typografi (kort kraftig påstand). Når temaet er produkt-varianter (HDFI-farger, koffert-størrelser, modeller) MÅ variantene være visuelt synlige — Statement leverer ikke på det.

**Ny archetype-prompt** rendrer en 2×3 grid med variant-swatches + headline + body. Eksplisitt instruks om at produkt-farger (blå/gul/grå) ER tillatt inni swatch-grid-en (det er produkt-fakta, ikke design-aksent).

Lagt til på:
- `src/lib/services/social-engine.ts` — type-union, aspect-map, buildImagePrompt-case
- `src/app/(dashboard)/innholdsmotor/page.tsx` — UI-dropdown
- `social_corpus` (DB) — archetype-entry + topic_template-entry

### 3. Skjerpede prompts for å fikse Gemini-quirks

**Red-word-instruks:** «render the COMPLETE word (all N letters: S-E-K-S), NOT just the first 1-2 letters». Tidligere kunne Gemini farge bare første halvdel av et nøkkelord rødt.

**Accent-line-instruks:** spesifisert som «PURELY VISUAL graphic element — a solid red rectangle, no text labels or dimension annotations». Tidligere rendret Gemini «70px» som tekst på linjen.

**Swatch-antall + labels:** eksplisitt om EXAKT 6 swatches i 2×3 grid, ingen duplikater, navngitte labels med æøå.

### 4. Korpus-oppdateringer

**Berikede entries** (alle gjort via `scripts/upgrade-social-corpus.mjs`, idempotent UPSERT):

| Kind | Slug | Endring |
|---|---|---|
| `product` | `hdfi` | Lagt til 6 standardfarger med hex-koder, ESD/brannhemmende-varianter, fargekoding for 5S-zoning, eksplisitt skille mellom skum (bunn) og plastplate (topp) |
| `product` | `cadlab` | Lagt til 4-trinns kundeprosess + 2-4 ukers ledetid |
| `company` | `fosen-tools-as` | Lagt til 6 navngitte kunde-eksempler (Andøya Space, TESS VEST, Lufttransport AS, Alier Trondheim, Odde Elektronett, Forsvaret), helikopterlandingsplass, åpningstider, geografi (Brekstad i Ørland, IKKE Rissa) |
| `visual_rules` | `forbud` | Klargjort konflikten: blå/grønn er forbudt som GRAFISK aksent, men OK som PRODUKT-fakta (HDFI-plastplate kommer i blå). Tillatt liste utvidet. |
| `archetype` | `produkt_variant` | NY — beskriver når den brukes, layout, og tone |
| `topic_template` | `produkt_variant` | NY — caption-maler for FB/IG/LinkedIn |
| `rejected_pattern` | `fargevisning-mangler-farger` | NY — dokumenterer feilen fra forrige test (Statement med fargevalg-tema men uten visning) |

## Verifisering

`npx tsc --noEmit` — rent på alle endrede filer.

3 test-bilder generert via Gemini direkte (`scripts/test-produkt-variant-prompt.mjs`):
- `~/Desktop/hdfi-variant-test-facebook-1x1.png` (1:1)
- `~/Desktop/hdfi-variant-test-instagram-3x4.png` (3:4)
- `~/Desktop/hdfi-variant-test-linkedin-16x9.png` (16:9)

**Resultatet:** alle 3 viser 6 HDFI-fargevarianter som swatches i 2×3 grid med headline «SEKS FARGER. ÉN STANDARD.» — SEKS i FT-rødt, resten hvit. Stor forbedring fra forrige forsøk som ga mono-rød verktøyvogn.

## Gjenværende Gemini-svakheter (kjente)

Ikke arkitektur-problemer, men Gemini Nano Banana-quirks vi må leve med:

1. **Norske bokstaver i små labels:** «Rød» → «Rod», «Blå» → «Bla». Gemini sletter ofte æøå i små tekst-størrelser. Mitigering: kan lege manuelt etter generering, eller bruke svatch-overlay via sharp.js (krever fremtidig kode-jobb).

2. **«70px»-tekst på accent-line:** noen ganger fortsatt rendret som tekst tross «PURELY VISUAL» i prompten. Server-side composite overskriver bare wordmark-området, ikke accent-line. Mitigering: kan dekkes med ekstra composite-rektangler hvis det blir kritisk.

3. **«MANITOPE»/«WORDMARK»-typografi i bunn:** server-side `compositeFosenToolsWordmark()` overskriver dette med ekte FT-wordmark — INGEN handling nødvendig (gjelder kun det rå AI-bildet).

## For å teste i Innholdsmotor

1. Restart dev-server (Ctrl+C → `npm run dev`) for å plukke opp nye Archetype-type-medlemmer
2. Åpne `http://localhost:3000/innholdsmotor` → Ny-tab
3. Velg:
   - **Mode:** «Fra fosen-tools.no URL» eller «Manuell»
   - **Topic-type:** «Produkt-variant (farger/størrelser/modeller)»
   - **Archetype:** «Produkt-variant — vise flere farger/størrelser/modeller»
   - **Visuell stil:** «Auto»
   - **Brief:** «HDFI 6 standardfarger: Rød/Hvit, Svart/Hvit, Hvit/Svart, Blå/Hvit, Gul/Svart, Lyse grå/Svart. Vis 6 swatches i 2×3 grid.»
4. Trykk «✨ Generér draft»

Kø-tab vil vise draften med 3 bilder (FB 1:1, IG 4:5, LI 16:9), hver med plattform-badge og aspect-label.

## Filer endret/opprettet

| Fil | Endring |
|---|---|
| `src/lib/services/social-engine.ts` | Multi-aspect-loop, `produkt_variant`-archetype, skjerpet red_word/accent-line, TopicKind utvidet |
| `src/app/(dashboard)/innholdsmotor/page.tsx` | UI-dropdown for `produkt_variant`, per-plattform-bildevisning |
| `scripts/upgrade-social-corpus.mjs` | NY — idempotent korpus-upgrade |
| `scripts/test-produkt-variant-prompt.mjs` | NY — standalone Gemini-test |
| `scripts/inspect-social-corpus.mjs` | NY — utforskning av korpus |
| `docs/innholdsmotor-upgrades-2026-05-21.md` | NY — denne dokumentasjonen |

## Filer IKKE rørt (men relatert)

- `src/lib/services/gemini.ts` — allerede støtter alle aspect-ratioer
- `src/lib/services/composite-wordmark.ts` — fungerer uavhengig av aspect
- `src/lib/services/brand-assets.ts` — fungerer uavhengig av archetype
