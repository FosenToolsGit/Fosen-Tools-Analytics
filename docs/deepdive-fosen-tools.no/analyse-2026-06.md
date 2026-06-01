# Visuell og innholdsmessig deepdive — fosen-tools.no

Dato: 1. juni 2026
Metode: Scrape med `curl -A "Googlebot/2.1"` (quirk #14 — Multicase serverer JSON-LD og strukturert HTML kun til crawlers). Parser med node/python, klasseinventar + tekstutdrag per side.
Omfang: 20 sider (alle relevante ikke-produktsider). 4 ettersøkte sider ga 404/søk-fallback og er ekskludert (se «Ikke funnet» i bunn).

---

## Per side

### `/` — Forsiden

- **Title:** «Fosen Tools | Skreddersydde verktøy og industriløsninger»
- **H1 (inni hero):** «Fosen Tools — Profesjonelle verktøyløsninger» (slide 1)
  - Vises som `<h1 class="title"><span class="ft-brand">Fosen Tools</span><span class="ft-tagline">Profesjonelle verktøyløsninger</span></h1>`
- **Hero:** 3-slides karusell med fullskjerm bakgrunnsvideo. `<video autoplay loop muted playsinline>` på alle tre slides.
  - Slide 1: `/userfiles/file/Header-700kb-1.mp4` — H1 «Profesjonelle verktøyløsninger»
  - Slide 2: `Header-1,5mb-2.mp4` — H2 «Produksjon»
  - Slide 3: `Header-1,5mb-3.mp4` — H2 «Lasermerking»
  - Bruker `ratio-227` (≈ 2.27:1, ultrabred kinoformat) og lazy-loader slide 2–3
  - **CTA i hver slide:** Hvit «Kontakt oss»-knapp med pil-ikon, lenket til `/kundesenter/kontakt-oss`
- **Andre H2-er:** «SKREDDERSYDD DRIFTSEFFEKTIVITET», «SKREDDERSØM — VÅR PRODUKSJON», «INGEN PROSJEKT ER FOR STORE — ELLER FOR SMÅ!», «Ofte stilte spørsmål om Fosen Tools og våre systemløsninger»
- **Skreddersøm-blokk (`#ft-skreddersom` / `.ft-skr-wrapper`):** Egen seksjon under hero. H2 «SKREDDERSØM — VÅR PRODUKSJON», en stor full-bredde-illustrasjon (1500×360 prosess-flyt på svart), én kort paragraf, og «Ta kontakt … post@fosen-tools.no»-linje.
- **Home cards (`.ft-home-cards .ft-hc-grid`):** 6 store kort med 1920×1080-bilder + kort tittel (UPPERCASE) + én linje brødtekst + «Les mer»-lenke.
  - PRODUKTER · VERKTØYKONTROLL · AVIATION / DEPLOYMENT · KAMPANJE · GAVEARTIKLER (+ 1 til). AVIATION-kortet er det eneste på engelsk: «Fosen Tools develops, produces and offer custom solutions for GSE, GUC, and deployment systems.»
- **FAQ (`.ftseo` med `.ftseo-faq-item`):** «Ofte stilte spørsmål om Fosen Tools og våre systemløsninger», 5 spørsmål, hvert med `▶`-arrow i `<h3 class="ftseo-faq-question">`.
- **Hero-bilder lagret under:** `/userfiles/image/Fosen Tools Hovedside/FT-kategorier/*` og `/userfiles/file/Header-*.mp4`.

### `/aviation`

- **Title (engelsk):** «The future in aviation»
- **H1:** «Aviation»
- **Slogan:** «Tomorrow's solutions — Today!»
- Hele seksjonen er på engelsk og er en hybrid mellom landingsside og produktliste (snarvei-fane: Deployment / Custom Tool Cabinets / Custom Tool Kits / Line Maintenance Docking / Accessories, og aircraft-tabs F-35 / F-16 / F-18 / F-22 / Bell 412 / S-70 / S-92 / AW139 / AW169 / AW189 / UH-60M / MH-60R / H135 / H145 / H175).
- **Visuelt:** Svarte silhuetter av fly-/helikopter-modeller (`/userfiles/image/Inspirasjon/Nyhetsbrev/F-35_svart_siluett.png` osv.) brukes som ikon-bilder i model-grid.
- **Tone:** «Fosen Tools focuses on direct customer involvement to create the most operationally efficient and user friendly GSE and support equipment …»
- **CTA:** «Are you interested in customized aircraft maintenance solutions? — post@fosen-tools.no» (gjentas øverst og nederst).

### `/aviation/aircrafts` + `/f35` + `/f16` + `/helicopters` + `/accessories` + `/custom-tool-cabinets` + `/custom-tool-kits` + `/line-maintenance-docking`

- Alle deler **samme hybrid-template** som `/aviation`: H2 i hero, model-fane-meny, deretter produkter listet med engelsk artikkel-tekst.
- Title-mønster: «F-35 - Fosen Tools AS», «Custom Tool Cabinets - Fosen Tools AS» osv.
- **Visuelt signaturelement:** Hver side har egen H2 i hero (eksempel: «F-35», «Accessories», «Custom Tool Cabinets»), og under det «Are you interested in customized aircraft maintenance solutions? / post@fosen-tools.no» — den samme CTA-blokken gjentas konsekvent.
- /helicopters er 301-redirect til /aviation/aircrafts/helicopters.

### `/bransjer`

- **Title:** «Oppbevaring- og logistikkløsninger for bransjer | Fosen Tools»
- **H1 (i `<h1 class="ftseo-heading">`):** «SKREDDERSYDDE LØSNINGER TILPASSET DERES BRANSJE»
- **Visuelt:** Bruker `<section class="ftseo">` × 4 blokker + `<section class="ft-catgrid ft-catgrid--text">` med to klikkbare chips: Aviation · Helse. Ingen video-hero, ingen banner.
- **3 typiske setninger:**
  - «Hos Fosen Tools utvikler vi skreddersydde oppbevarings- og logistikkløsninger for en rekke ulike bransjer.»
  - «Vi tar alltid utgangspunkt i deres utfordringer og tilpasser løsningene slik at de passer sømløst inn i hverdagen deres.»
  - «Har dere en utfordring som krever en smart og robust løsning? Ta kontakt med oss …»
- **5-punkts list (`.ftseo-bullets`):** Tilpassede innlegg og kofferter · Skuminnlegg med tydelig merking · Utstyrs- og verktøyskap · Integrerte løsninger i kjøretøy, rom eller containere · Mobilhotell og logistikkpunkter
- **FAQ:** 5 spørsmål i en `.ftseo-faq` med `▶`-arrow.
- **CTA:** Standard `.ft-contact-cta`-blokk (Kontakt oss-knapp + tlf + e-post).
- **H3-overskrift i bunn:** «KONTAKT OSS FOR EN LØSNING TILPASSET DIN BRANSJE»

### `/bransjer/forsvaret`

- **Title:** «Oppbevarings- og logistikkløsninger for Forsvaret | Fosen Tools»
- **H1:** «Skreddersydde oppbevarings- og logistikkløsninger for Forsvaret»
- **Visuelt:** Ingen video-hero, ren `.ftseo`-stack. To `.ftseo`-blokker + standard `.ft-contact-cta`.
- **Tone:** Mer formell og operasjonell enn `/bransjer`.
  - «Forsvaret stiller høye krav til mobilitet, driftssikkerhet og effektivitet i felt.»
  - «Vi utvikler løsninger for både stasjonær og mobil bruk — tilpasset våpen, utstyr, kjøretøy og feltoperasjoner.»
  - H3-stack inni samme seksjon: «Tilpasset militære operasjoner» · «Effektivitet i operativ hverdag» · «Kvalitet som varer»
- **Bullet-liste:** Rask tilgang til riktig utstyr under press · Robust og sikker oppbevaring i krevende miljøer · Mindre svinn og bortkommet materiell · Systematisk organisering gir bedre beredskap

### `/bransjer/industri`

- **Title:** «Industri» (kortfattet, ingen «| Fosen Tools»-suffiks — sannsynligvis ufullført side)
- Ingen H1/H2 fanget — siden bruker antagelig en helt annen template (Custom-page) og innholdet er ikke i klassiske semantiske tagger. Standard `.ft-contact-cta` lengst ned.

### `/hdfi`

- **Title:** «HDFI — FOD-sikring for luftfart og forsvar | Fosen Tools»
- **H1:** «HDFI — verktøykontroll med gravert silhuett»
- **Visuelt — egen design-stack (ikke `.ftseo`):**
  - `<section class="ft-section">` med svart bakgrunn-variant `bg-soft`
  - `.ft-grid` (2-kolonners tekst+bilde), `.ft-media-ratio r169` / `r43` for ratio-bokser
  - `.ft-eyebrow` (rød/aksentert småtekst over H1/H3 — «HDFI», «Egen produksjon», «Fargeutvalg», «Markedsledende løsninger»)
  - `.ft-bullets` (alternativ til `.ftseo-bullets`)
  - `.ft-ba` (før/etter-komparator med to bilder side om side og «Før» / «Etter» caps under)
  - `.ft-swatches` med 6 fargeprøver i `.ft-swatch` (rød/hvit, svart/hvit, hvit/svart, blå/hvit, gul/svart, lys grå/svart — definert med `--c1` / `--c2` CSS-variabler)
  - `.ft-cta-row` med stor accent-knapp
- **3 typiske setninger:**
  - «Skreddersydde HDFI (High Density Foam Insert) løsninger som gir effektiv organisering og tydelig visuell kontroll av verktøy og utstyr — tilpasset Lean-vedlikehold og 5S-prinsippene.»
  - «I vår CADLAB (tegning- og utviklingsavdeling) tilbyr vi spisskompetanse på optimal tilrettelegging av verktøy, maskiner og utstyr.»
  - «HDFI-løsningene er også utviklet for å forebygge FOD (Foreign Object Damage) ved å redusere risiko og styrke sikkerheten, samtidig som effektivitet forbedres og kostnader reduseres.»
- **H2:** «Skreddersydde løsninger for verktøykontroll» · «Fordeler med HDFI» · «EGEN PRODUKSJON SIDEN 2004» · «Ofte stilte spørsmål»
- **Bullet-liste (CADLAB-delen):** «CAD-designet og CNC-frest for perfekt passform» · «To-farget plastplate i topp for ekstra holdbarhet» · «Null-absorberende, løsemiddelbestandig skum» · «Mulighet for lasermerking av verktøy/produkter»
  - **OBS:** «CNC-frest» brukes her — i konflikt med vår nye språkregel om «CNC-maskinert». Ikke ennå rettet på nettsiden.
- **FAQ:** 5 spørsmål i `<details>/<summary>`-format med `▶`-arrow.
- **Sentrale bilder:** `/userfiles/image/HDFI/HDFI-svart-bedre.jpg` (hero), `/userfiles/image/HDFI/HDFI - Info-6.jpg` (CADLAB), `Bilde-før.png` / antatt `Bilde-etter.png` (før/etter).

### `/fosen-tools-custom`

- **Title:** «Fosen Tools Custom - Fosen Tools AS» (mangler unik tagline-tittel)
- **H1:** mangler i raw HTML — siden er en Multicase Custom-side hvor innholdet sannsynligvis injiseres etter sidelast.
- **Visuelt:** Standard `.ft-contact-cta`-blokk + ren `.ftseo`-FAQ med 5 `<details>`-spørsmål.
  - Mest detaljert FAQ vi har sett: «Hvordan bestiller jeg en skreddersydd løsning?» (svar nevner CADLAB + 3D-visualisering), «Hva er leveringstiden?» (4–8 uker, 2–4 uker for enklere HDFI-innlegg til Pelicase).
- **FAQ-tone:** Konkret og operativ — nevner art.nr / leveringsuker / e-post / telefon.

### `/aktuelt`

- **Title:** «Aktuelt»
- Listevisning av artikler — tittel + 1-linjes ingress per artikkel. 12+ artikler synlige.
- **Eksempler på artikkeltitler (med ingress):**
  - «Hvilken tang skal du velge? — Les vår guide»
  - «Optimaliser med skreddersøm — Optimaliser og reduser kostnader med skreddersydde verktøyløsninger»
  - «BOLT™ Optimal kombinasjon av sikkerhet og fleksibilitet — Fleksibel og sikker hjelmsystem fra Milwaukee»
  - «Nye selvjusterende hodelykter fra Led Lenser — Ny lyktteknologi med håndfrie hodelykter som tilpasser lysstyrken automatisk»
  - «Billig verktøy er dyrt! — Er du fristet til å velge rimeligste verktøy? Vi ser litt på hvorfor det er fornuftig å kjøpe kvalitetsverktøy.»
  - «Utvikler mobile og bærekraftige bygg — Fosen Tools utvikler i samarbeid med Forsvarsbygg og Luftforsvaret, mobile og bærekraftige bygg»
  - «Verktøyinnlegg til Brann og redning — Kvalitet kreves når de alltid skal være forberedt på å møte enhver utfordring»
  - «Bedre arbeidsdag med Milwaukee Packout»
  - «Velg riktig verktøy til hjulskift»
  - «Hvorfor bruke personlig verneutstyr?»
- Listen er to-spaltet på desktop med stort bilde + tittel + kort ingress per kort.

### `/aktuelt/baerekraft`

- **Title:** «Bærekraft og sammfunsansvar» (typo i nettsiden: «sammfunsansvar» — skal være «samfunnsansvar»)
- Innholdet lastes via JS — ikke synlig i raw HTML uten browser-rendering. Standard sidebadges (Gaselle, Miljøfyrtårn) er vist i footer-strip.

### `/aktuelt/referanseprosjekter`

- **Title:** «Referanseprosjekter - Fosen Tools AS»
- Innhold lastes via JS. Siden lenker minst til:
  - `/aktuelt/referanseprosjekter/akuttskrin-dms`
  - `/aktuelt/referanseprosjekter/container`
  - `/aktuelt/referanseprosjekter/mobile-og-bærekraftige-bygg`
  - `/aktuelt/referanseprosjekter/store-mobile-transportløsninger`
  - `/aktuelt/referanseprosjekter/verkstedinnredning`
  - `/aktuelt/referanseprosjekter/verktøy-under-utrykning`

### `/aktuelt/referanseprosjekter/akuttskrin-dms` + `/verktøy-under-utrykning` + `/verkstedinnredning`

- Hver har bare `<title>` og JS-lastet innhold. Title-mønster: «Akuttskrin», «Verktøy under utrykning», «Verkstedinnredning» — uten Fosen Tools-suffiks.

### `/kundesenter`

- **Title:** «Kundesenter - Fosen Tools AS» (303-redirect-respons men resolver til selve siden)
- Innhold lastes via JS. Inneholder snarveier: Startside · Kontakt Oss · Ordrehistorikk · Min Side · Vilkår.

### `/kundesenter/kontakt-oss`

- **Title:** «Kontakt Oss - Fosen Tools AS»
- **H1:** «Kundesenter»
- **H2:** «Kontakt oss»
- **H3-er som driver innhold:** «Send oss en henvendelse», «Takk for henvendelsen», «Noe gikk galt»
- **3 typiske setninger:**
  - «Har du spørsmål om produkter, levering eller samarbeid, send oss gjerne en henvendelse. Vi svarer så snart som mulig.»
  - «Skjemaet under oppretter en sak i vårt kundesystem.»
  - «Vi har mottatt skjemaet ditt og tar kontakt så snart som mulig.»

---

## Visuelle signaturer (gjentakende elementer)

1. **Video-hero med 3-slide karusell** (`#ft-hero-wrap` / `.ft-frame.ratio-227`). 2.27:1 ultrabred ratio, lett-vekt MP4-er (700 kb–1.5 MB), `autoplay loop muted playsinline`. CTA-knapp i hver slide med tekst + pil-ikon.

2. **`.ft-skr-wrapper` SKREDDERSØM-prosess-blokk på forsiden.** Stor prosess-illustrasjon (1500×360, svart-på-svart), én avtalt brødtekst-paragraf og et lite «Ta kontakt for mer informasjon …»-spor.

3. **`.ft-home-cards` 3×2 kort-grid med bilder.** Hvert kort har 16:9 bilde, UPPERCASE H4-tittel, en kort brødtekst (1-2 setninger) og en «Les mer»-lenke.

4. **`.ftseo` tekst-seksjoner med `<h2 class="ftseo-heading">` UPPERCASE.** Hovedstil for landingssider (bransjer, produsenter, kategorier). Skjult og synlig rød underline (`::after`) under headinger via FosenTools.scss.

5. **`.ftseo-faq` med `<h3 class="ftseo-faq-question">…<span class="arrow">▶</span></h3>` + `<div class="ftseo-faq-answer">`.** Brukes på alle landingssider — bransjer, forsvaret, forsiden, hdfi.

6. **`.ft-contact-cta` kontakt-bånd.** Identisk i alle bransje-, custom- og kategori-sider: hvit/aksent-knapp «Kontakt oss» + pil-ikon + telefon `+47 72 51 51 20` + e-post `post@fosen-tools.no`, separert med vertikal strek (`<span class="ft-contact-cta__sep">|</span>`).

7. **HDFI har sin egen designstack** som skiller seg fra `.ftseo`:
   - `.ft-section` (rolige seksjoner med `bg-soft`)
   - `.ft-grid` (asymmetriske 2-kolonners blokker)
   - `.ft-eyebrow` (liten rød tag-tekst over H2/H3)
   - `.ft-ba` før/etter-komparator
   - `.ft-swatches` med `--c1`/`--c2` CSS-variabler for fargeprøver

8. **Jubileums-bånd (`.ft-jubileum-bar`)** ligger på toppen av alle sider i juni — «25-ÅRSJUBILEUM · REÅPNING PROFF-BUTIKK · BREKSTAD 26. JUNI 2026».

9. **Footer-badges** (`.ft-footer-badges`): Gaselle · Miljøfyrtårn · partner-logoer.

10. **Bilde-veikart:**
    - Hero-bilder i `/userfiles/image/Bannere/`, `/userfiles/image/Bannere - Merkevarer/`, `/userfiles/file/` (videoer)
    - Forsiden-kort: `/userfiles/image/Fosen Tools Hovedside/FT-kategorier/`
    - Produkt- og inspirasjon: `/userfiles/image/Inspirasjon/Kasseløsninger/Verktøyvogner/*.jpeg`
    - HDFI-spesifikke: `/userfiles/image/HDFI/`
    - Aviation-silhuetter: `/userfiles/image/Inspirasjon/Nyhetsbrev/*Silhuett*.PNG`

11. **Konsistent typografi-vinkler:**
    - H1-er er **UPPERCASE** i `.ftseo-heading`-bruk (bransjer, forsvaret) eller blandet case for hero-titler (HDFI, forsiden).
    - H2-er er stort sett UPPERCASE i bransje- og kategori-sider.
    - Den signatur-røde 70px-underline rett under H1 (via FT-CSS `::after`).

12. **Aksentfarger:** FT-rød `#ED1C24` (call-to-action, eyebrows, underlines), FT-ink-mørk `#0F1115`, hvit. HDFI-fargeprøver introduserer kontrollert palett: `#b21f24` rød, `#1b4c85` blå, `#f2e546` gul, `#d9d9d9` lys grå.

---

## Toneanalyse — hva er FT-stemmen?

**Kjernebudskap (gjentas overalt):**
- «Skreddersydd» / «skreddersøm» (på minst 8 av 20 sider)
- «HDFI» som forkortelse, oftest alene uten «-skuminnlegg»-suffiks
- «CADLAB» som internt produksjonsapparat
- «5S» og «Lean-prinsippene» — operasjonell rammeverk
- «FOD (Foreign Object Damage)» som risikobegrep
- «Driftseffektiv» / «driftssikkerhet» / «effektivitet i operativ hverdag»
- «Egen produksjon» (siden 2004)
- «Robust» / «tåler hverdagen»
- «Skreddersydde løsninger tilpasset …» som mal for H1/intro

**Setningsmønster:**
- **Korte, tydelige verb-setninger:** «Vi utvikler …», «Vi leverer …», «Vi skreddersyr …»
- **Helhets-uttrykk:** «for hele arbeidsdagen», «for hverdagen», «i krevende miljøer», «i felt og i deployering»
- **Verdi-koblinger:** «Det gir … og lønnsomt for kunden», «som gir lengre levetid og mer driftseffektiv arbeidsprosess»
- **Konkrete tall der det finnes:** «4–8 uker leveringstid», «to-farget plastplate», «6 standardfarger», «25 år», «100 år»

**Hva FT IKKE gjør i tekst:**
- Bruker sjelden utropstegn (kun «INGEN PROSJEKT ER FOR STORE — ELLER FOR SMÅ!» og «Billig verktøy er dyrt!»)
- Bruker ikke spørsmåls-åpninger som hovedstrategi (kun i FAQ)
- Bruker ikke superlativer som «best i Norge», «markedsleder» (en gang per side, sjelden)
- Bruker ikke følelses-språk eller «kjenne deg igjen»-pitch

**Stilistiske ujevnheter:**
- Aviation-seksjonen er konsekvent engelsk («Tomorrow's solutions — Today!», «GSE and support equipment») — kontrast til resten som er norsk.
- En typo i menyen: «Bærekraft og sammfunsansvar» (skal være «samfunnsansvar»).
- HDFI-siden bruker «CNC-frest» i bullets — i konflikt med vår nye språkregel om «CNC-maskinert».
- Forsvarets-siden bruker «mva» / «sertifisert» / «leveranse» konsekvent.

---

## Innholds-templates (visuelle byggeklosser nettsiden består av)

1. **Video-hero med karusell** (kun forsiden) — `<section id="ft-hero-wrap"><div class="ft-frame ratio-227">…<video>…<h1 class="title"><span class="ft-brand">…<span class="ft-tagline">…</h1>…<a class="cta">…`

2. **`.ft-skr-wrapper` prosess-illustrasjon-blokk** (kun forsiden) — stor full-bredde-illustrasjon, en avtalt paragraf, kontakt-spor.

3. **`.ft-home-cards .ft-hc-grid` snarvei-grid** (kun forsiden) — 6 store kort med bilde + UPPERCASE-tittel + 1-linje + «Les mer».

4. **`<section class="ftseo">` med `.ftseo-inner`** (alle landingssider) — H1/H2-stack med UPPERCASE-overskrifter, korte paragrafer, valgfri `.ftseo-bullets`.

5. **`.ftseo-faq` akkordion** (alle landingssider) — `<h3 class="ftseo-faq-question">…<span class="arrow">▶</span>` med 5 spørsmål per side. Alternativ syntax: `<details><summary>…<span class="arrow">▶</span>` (HDFI, Fosen Tools Custom).

6. **`.ft-section`-stack på HDFI** — `.ft-grid` 2-kolonners blokker, `.ft-eyebrow` (rød tagging) over H2/H3, `.ft-bullets` bullet-stack, `.ft-cta-row` med stor knapp.

7. **`.ft-ba` før/etter-komparator** (HDFI-eksklusiv) — to bilder side om side med «Før» / «Etter» caps under, samme `.ft-media-ratio r43`-ratio.

8. **`.ft-swatches` fargeprøve-rute** (HDFI-eksklusiv) — 6 firkanter med `--c1` / `--c2` CSS-vars + label «Rød / Hvit», «Svart / Hvit» osv.

9. **`.ft-contact-cta` kontakt-bånd** (universell footer-CTA) — knapp + pil + tlf + sep + e-post.

10. **`.ft-catgrid.ft-catgrid--text` chip-meny** (bransjer, produktkategorier) — klikkbare tekst-chips uten bilder.

11. **`.ft-jubileum-bar` topp-banner** (alle sider, juni 2026) — sticky 48px banner med marquee-effekt, gull-25 emblem og rød kontakt-CTA.

12. **`.ft-footer-*` footer-stack** — `.ft-footer-main`, `.ft-footer-badges` (Gaselle/Miljøfyrtårn/partner), `.ft-footer-social` med ikoner, `.ft-footer-bottom` med copyright.

---

## Ikke funnet / 404

- `/bransjer/politi` — 404 (returnerer søkeside-fallback med title «Søk - Fosen Tools AS»)
- `/bransjer/offshore` — 404, samme
- `/aktuelt/nyheter` — 404, samme
- `/kundesenter/om-oss` — 404, samme

Disse er sannsynligvis aldri opprettet i Multicase (eller har annen URL-struktur). `/bransjer/forsvaret` og `/bransjer/industri` finnes — forsvaret er fullt utbygd, industri er stub.

---

## Råfiler

- Scrapet HTML: `/tmp/ft-scan/*.html` (23 filer, kan slettes etter analysen)
- Strukturert JSON: `/tmp/ft-scan/parsed.json`
