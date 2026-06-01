# SoMe-designforslag — bygd på nettsidens DNA

Basert på `analyse-2026-06.md`. Formålet er å lage Remotion-/HTML-komposisjoner som kjennes igjen som «FT på nett» når en bruker scroller fra fosen-tools.no til Instagram/LinkedIn/Facebook.

Felles regler (gjelder alle sjangrene):
- **Palett:** FT-ink `#0F1115`, FT-rød `#ED1C24`, hvit `#FFFFFF`. HDFI-sekundærpalett kun ved produkt-relevans (`#1b4c85` blå, `#f2e546` gul, `#d9d9d9` lys grå, `#b21f24` mørk rød).
- **Typografi:** Korolev-imitasjon → Heebo Bold eller Manrope ExtraBold (siden Korolev ikke finnes som webfont). UPPERCASE for H1/H2, weight 700, letter-spacing 0.04–0.08em.
- **Rød 70px-underline-signatur:** Hver hovedoverskrift har en rød horisontal strek under, høyde 4–6px, bredde 70–120px. Dette er FT-aller-mest-gjenkjennelige element.
- **«Eyebrow»-tekst:** En liten rød-tagget overstreks-tekst over H1 (10–14px, UPPERCASE, letter-spacing 0.18em, FT-rød). F.eks. «HDFI», «AVIATION», «FORSVARET», «SKREDDERSØM».
- **Pil-ikon:** Den karakteristiske SVG-pilen brukes i alle CTA — `M16.4133 6L15.5553 6.923L19.6739 11.347H2V12.653H19.6739…`. Embedd som Remotion-komponent.
- **Norsk tegnsetting:** Komma, ikke em-dash. En-dash «–» i tids-ranges («07:00–15:00»). Em-dash «—» kun i sjeldne dramatiske brytninger.
- **Komma-på-toppen-regel:** Ikke bruk semikolon eller utropstegn i image-text. Hold setninger korte (3–7 ord per linje).

---

## 1. «Hero-video-poster» — frame frosset fra nettsidens hero

**Hva:** Etterligner forsidens video-hero som et stillbilde eller 4-sekunders Remotion-loop. Ultrabred ratio (men beskåret til 1:1 / 4:5 / 16:9 per plattform).

**Når:** Daglig brand-presence, abstrakt FT-stemning, merkevarestyrking — IKKE for spesifikk produktinfo.

**Remotion-komposisjon:** `HeroPoster`
- **Bakgrunn:** En av tre FT-video-MP4-er (eller subset-frame) med 0.35 mørk gradient-overlay nederst (`linear-gradient(180deg, transparent 40%, rgba(15,17,21,0.9) 100%)`)
- **Pulsfølelse:** Rolig 4s linear motion (slow pan eller subtle zoom 1.0 → 1.02 over 4s). Ingen kutt.
- **Tekst (bunn-venstre eller bunn-senter, padding 80px):**
  - `<span class="ft-brand">FOSEN TOOLS</span>` — UPPERCASE Manrope 800, 56px (mobile-safe), letter-spacing 0.04em
  - `<span class="ft-tagline">Profesjonelle verktøyløsninger</span>` — Manrope 500 mellomgrå-hvit, 28px, mellomrom 18px under brand
  - Rød 4px-stripe over brand-tekst, bredde 60px (variant av rød underline)
- **CTA-pil-knapp nederst-høyre:** «Kontakt oss» + pil i hvit pill med 1px hvit border. Kan animeres til å komme inn fra høyre med spring.
- **Wordmark:** Det er ingen ekstra wordmark i hero — `FOSEN TOOLS` IS wordmarket. Skip composite-overlay.

**Tekst-eksempler (rotér):**
- «Profesjonelle verktøyløsninger»
- «Skreddersøm. Egen produksjon. Brekstad.»
- «Verktøy som tåler hverdagen.»

---

## 2. «Referanse-spotlight» — kundeleveranse på +144%-mønsteret

**Hva:** Etterligner `.ft-grid` + `.ft-eyebrow` + `.ft-ba` (før/etter) — vår sterkeste engasjements-driver historisk («skreddersydd» + «HDFI» + «levert» = +144% lift).

**Når:** Hver gang vi har leveranse-bilder (TESS VEST, Lufttransport, Forsvaret, helseregion). Beste lift på fredager kl 12.

**Remotion-komposisjon:** `ReferanseSpotlight`
- **Bakgrunn:** FT-ink mørkegrå med subtil støy-noise (5% opacity). Ingen video — produkt-foto er stjernen.
- **Layout (1:1 og 4:5):**
  - Toppen-30%: rød eyebrow-tekst «LEVERT TIL ALIER TRONDHEIM» (UPPERCASE, 14px, letter-spacing 0.18em)
  - H1: «Skreddersydd HDFI» (2–3 ord, Manrope 800, 64px UPPERCASE, hvit, med 90px rød underline 6px under)
  - Midt-50%: produktfoto i `r169` (16:9) eller `r43` (4:3) ratio-boks med tynn 2px-hvit border-radius 4px
  - Bunn-20%: kort body 2 linjer maks: «CAD-tegnet, CNC-maskinert, klar for daglig drift.» + liten pil + «Levert mai 2026»
- **Pulsfølelse:** Bilde-Ken-Burns (zoom 1.0 → 1.05 over 5s) + rolig fade-in på eyebrow → H1 → body i sekvens.
- **For karusell:** Slide 2 kan være `.ft-ba`-stil før/etter (gammel skuff vs HDFI-skuff side om side).

**Tekst-formel (lærte vi 30. april):**
- «Levert til [KUNDE]» (eyebrow)
- «[ARKETYPE]» (H1 — Skreddersydd HDFI / FT Custom / OPTI-koffert)
- «[KORT-VALUE]. [LEVERINGSTID].» (body 2 linjer)
- CTA: «Se referanser → fosen-tools.no/aktuelt/referanseprosjekter» (URL i komentar, ikke på bilde)

**Konkret eksempel:**
- Eyebrow: «LEVERT TIL ANDØYA SPACE»
- H1: «SKREDDERSYDD VERKTØYVOGN»
- Body: «CAD-tegnet, CNC-maskinert. Levert mai 2026.»

---

## 3. «Definisjons-poster» — etter HDFI-faktablokk-stil

**Hva:** Etterligner `<p class="ft-eyebrow">HDFI</p>` + H1 + en kort definisjons-paragraf. Vår «statement»-archetype, men nå tematisert som mini-ordbok.

**Når:** Når vi forklarer et FT-konsept (HDFI, CADLAB, FOD, 5S, Lean, Mobilhotell, FT Custom, Aviation/GSE).

**Remotion-komposisjon:** `Definisjon`
- **Bakgrunn:** Krem-hvit `#F5F7FA` (kald blå-grå, matcher FosenTools.scss `bg-page`)
- **Layout (1:1 anbefalt):**
  - Senter-justert kolonne, max-width 800px:
  - `.ft-eyebrow` rød 14px «HDFI» (UPPERCASE letter-spacing 0.18em)
  - 60px gap
  - H1 i 3 linjer maks: «Verktøykontroll med gravert silhuett» (Manrope 800, 48px, mørk ink, line-height 1.1) + 110px-rød-underline 6px
  - 50px gap
  - Body: 3–4 linjer i ord-grupper, hver linje en konsept-byggeklosse:
    - «substantiv,»
    - «CAD-tegnet, CNC-maskinert,»
    - «segmentert etter brukerens arbeidsflyt.»
  - Linjespace: 1.6, font Manrope 500, 22px, color #222
- **Pulsfølelse:** Statisk eller veldig myk 4s fade-in linje-for-linje (animert opacity 0 → 1, 0.4s per linje).
- **Konkret eksempel:**
  - Eyebrow: «CADLAB»
  - H1: «Tegning- og utviklingsavdelingen.»
  - Body 3 linjer: «3D-modellerer hver løsning. / Tester før vi produserer. / Egen avdeling, ikke underleverandør.»

---

## 4. «Snarvei-kort-stack» (3-stegs-prosess eller produktområde-grid)

**Hva:** Etterligner forsidens `.ft-home-cards`-grid. Brukes for to bruksområder: (A) 3-stegs prosess (CADLAB-flow), eller (B) 3 kategori-snarveier i ett bilde.

**Når:** Onboarding-poster — «Slik bestiller du en custom-løsning», «Tre tjenester fra Brekstad», «3 grunner kunder velger HDFI».

**Remotion-komposisjon:** `Kortstack`
- **Bakgrunn:** FT-ink mørk eller FT-rød (rotér mellom poster for kontrast)
- **Layout (4:5 eller 1:1):**
  - Topp 18%: kort eyebrow + H2 «SLIK BLIR HDFI» med rød 90px-underline
  - Midt 65%: 3 stablete kort vertikalt (i 4:5), eller side-om-side (i 1:1):
    - Hvert kort: tall 01–02–03 i FT-rød 64px Manrope 800 + linje under, kort-tittel UPPERCASE 24px hvit, 2-linje-body 16px mellomgrå
  - Bunn 17%: CTA-rad «Les mer → fosen-tools.no/hdfi» + pil
- **Pulsfølelse:** Hvert kort fader inn 0.3s forsinket (sequential).
- **Konkret eksempel — CADLAB-prosess:**
  - 01 — «Konsultasjon» / «Vi kartlegger verktøy og arbeidsflyt.»
  - 02 — «CAD-tegning» / «3D-visualisering av løsningen før produksjon.»
  - 03 — «Produksjon» / «CNC-maskinert HDFI, klart på 4–8 uker.»

---

## 5. «Fargeprøve-poster» — direkte port av `.ft-swatches`

**Hva:** Etterligner HDFI-sidens fargeprøve-rute. Kun for variant-poster (HDFI-farger, koffert-størrelser, FT Custom-konfigurasjoner).

**Når:** Når vi presenterer produktvarianter (HDFI-fargeutvalg, OPTI-koffert-størrelser, verktøyvogn-konfigurasjoner).

**Remotion-komposisjon:** `Swatches`
- **Bakgrunn:** Hvit `#FFFFFF`
- **Layout (1:1 anbefalt):**
  - Topp 22%: eyebrow «HDFI FARGEUTVALG» + H2 «Seks farger, én standard.» (mørk ink, 40px, UPPERCASE, med rød underline)
  - Midt 60%: 6 firkanter i 2×3 eller 3×2 grid med 16px gap. Hver firkant:
    - Top-half: `--c1` farge (HDFI-farge — rød/svart/hvit/blå/gul/grå)
    - Bottom-half: hvit med tynn shadow + label «**Rød** / Hvit» (Manrope 700 strong + Manrope 400 mellomfag på second)
    - 0.5px ink-border, border-radius 2px (FT-stilistisk square, ikke rounded)
  - Bunn 18%: body «ESD-kompatible og brannhemmende på forespørsel.» + pil-CTA «Les mer»
- **Pulsfølelse:** Statisk eller veldig svak ripple-effekt (hver firkant skalerer 0.95 → 1.0 i sekvens).
- **Server-side rendering:** Bruk eksisterende `produkt-variant-render.ts`-pipeline (HTML→PNG via Playwright) — ingen AI involvert, deterministisk.

---

## 6. «Sertifikat-/badge-stack» (Gaselle, Miljøfyrtårn, Forsvaret-leverandør, 25 år)

**Hva:** Etterligner footer-`.ft-footer-badges` + Forsvaret-tone-blokk. Brukes for tillit-signaler.

**Når:** Hver kvartal som «brand-trust»-stempel. Også ved milepæler (25 år, 100 år).

**Remotion-komposisjon:** `Sertifikat`
- **Bakgrunn:** FT-ink-mørk eller FT-rød (rotér)
- **Layout (1:1 anbefalt):**
  - Topp 25%: eyebrow «SIDEN 2001» + H1 «25 ÅR PÅ BREKSTAD» (Manrope 800, hvit, 56px, UPPERCASE med rød underline). Eventuelt 25-årslogo (gull) til høyre.
  - Midt 50%: 3–4 sertifikat-badges i horisontal rad: Gaselle · Miljøfyrtårn · Sertifisert leverandør (Forsvaret) · Lærebedrift. Bruk eksisterende SVG-er fra `/userfiles/image/social/`.
  - Bunn 25%: body 2 linjer: «Familieselskap siden 1926. / 100 år med verdiskaping.» + pil-CTA
- **Pulsfølelse:** Badges fader inn sekvensielt (0.2s per badge), 25-årslogo har myk pulse-skalering (1.0 → 1.03 → 1.0 over 3s).

---

## 7. «Sitat-blokk» — kundesitat eller anbefaling

**Hva:** Ny sjanger inspirert av FAQ-tonen og Forsvarets-sidens troverdighet. Bruker `<blockquote>`-stil med rød indent-strek.

**Når:** Når en kunde gir konkret tilbakemelding (Andøya Space, Alier Trondheim, Forsvaret, Norwegian Aero).

**Remotion-komposisjon:** `Sitat`
- **Bakgrunn:** FT-ink-mørk
- **Layout (4:5 anbefalt):**
  - Topp 18%: eyebrow «KUNDESITAT — ANDØYA SPACE»
  - Midt 55%: stort sitat med 6px FT-rød venstre-strek (`border-left: 6px solid #ED1C24; padding-left: 36px`). Sitat-tekst: «Skreddersydde HDFI gir oss kontroll på hvert eneste verktøy — også når vi flytter rakettmotor-utstyr på tvers av landet.» (Manrope 400, 32px, hvit, italic, line-height 1.45)
  - Bunn 27%: attribution «— Andøya Space, vedlikeholdsleder» (Manrope 500, 18px, mellomgrå) + pil-CTA «Se referansen → fosen-tools.no/aktuelt/referanseprosjekter»
- **Pulsfølelse:** Sitat fader inn ord-for-ord (typewriter-light, 80ms per ord).

---

## Hvilke Remotion-komposisjoner bør vi bygge først?

Prioritert rekkefølge basert på (a) hvor ofte vi vil bruke malen, (b) hvor stor lift FT-stemnen gir, og (c) hvor lett det er å automatisere fra eksisterende data:

| # | Komposisjon | Bruksfrekvens | Lift-potensial | Datakilde |
|---|---|---|---|---|
| 1 | `ReferanseSpotlight` | Ukentlig | Høyest (+144%-mønster) | Manuell: leveranse-foto + kunde-navn |
| 2 | `Definisjon` | Ukentlig | Høy (FT-DNA) | Korpus i `social_corpus`-tabellen |
| 3 | `HeroPoster` | 2 × mnd | Middels (brand) | Bruker eksisterende `/userfiles/file/Header-*.mp4` |
| 4 | `Kortstack` | 1 × mnd | Middels (onboarding) | Hardkodet eller fra korpus |
| 5 | `Swatches` | Kampanjedrevet | Høy (produkt-spesifikt) | `produkt-variant-render.ts` finnes allerede |
| 6 | `Sertifikat` | Kvartalsvis | Lav-middels | Statisk innhold |
| 7 | `Sitat` | Ad-hoc | Høy ved ekte sitater | Manuell innsamling |

**Tekniske notater for builderen:**

- Alle komposisjoner SKAL inkludere FT-pil-SVG-en som delt primitiv (`<FtArrow size={20} />`). Det er den mest gjenkjennelige formen ved siden av rød-underline.
- Alle bakgrunner SKAL ha tilgang til både FT-ink og FT-rød (toggle-prop `bg: "ink" | "red" | "white" | "cream"`).
- Alle headinger SKAL ha den røde 70–120px-underline (komponent `<FtUnderline width={90} />`).
- Wordmark-overlayen vi bruker i Innholdsmotor (`compositeFosenToolsWordmark()`) skal IKKE legges på Hero/Definisjons-posters — FT-stemmen leveres av andre signaturelementer (eyebrow + H1 + underline), wordmark blir overflødig og kveler designet. Legg wordmark kun på poster som har «tom plass» nederst (Referanse, Sertifikat, Sitat).
- Alle tekst-felter SKAL komponeres av caption-LLM (kjent fra Innholdsmotor) for å unngå Nano Banana-typos — bygg posterne deterministisk via HTML→PNG.

---

## Hvordan FT-stemmen ser ut på Instagram vs LinkedIn vs Facebook

- **Instagram 4:5:** Stort grafisk element + minimal tekst. Eyebrow + H1 + underline + lite produktfoto. Tekst i caption.
- **LinkedIn 16:9:** Mer tekst-tett. Definisjons-poster eller Referanse-spotlight med body 3–4 linjer. Profesjonell tone.
- **Facebook 1:1:** Hybrid. Hero-poster, Sertifikat, eller Kortstack med 3 punkter.

Bruk samme komposisjon på tvers av plattformer — bare bytt `format`-prop i Remotion (1:1 / 4:5 / 16:9). Komposisjonen tilpasser layout via `calculateMetadata` (samme mønster som dagens `ProduktSpotlight`/`LeveranseReel`/`MilepaelClip`).
