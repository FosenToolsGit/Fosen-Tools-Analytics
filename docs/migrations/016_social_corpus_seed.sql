-- Seed for social_corpus: ALL FT-doktrine flyttes hit fra Native-kontoen.
-- Bygger på CLAUDE.md + memory + 12. mai Native-konfig.
-- Idempotent via ON CONFLICT.

-- =========================================================================
-- COMPANY-KONTEKST
-- =========================================================================
INSERT INTO public.social_corpus (kind, slug, title, content, metadata) VALUES
('company', 'fosen-tools-as', 'Fosen Tools AS',
$$Fosen Tools AS er en 25-årig (i 2026) leverandør av proff-verktøy, skreddersydde HDFI-skuminnlegg og verktøyløsninger til industri, bygg/anlegg, mekanisk verksted, Forsvaret, aviation, offshore, beredskap og politi. Del av familiekonsern siden 1926 = 100 år med verdiskaping, 4. generasjon aktiv, Gaselle-bedrift.

Adresse: Industrigata 1, 7130 Brekstad (Ørland kommune). Sekundær: Flatåsen, Trondheim. Tlf +47 72 51 51 20, post@fosen-tools.no.

**Egne merker:** Fosen Tools, Fosen Tools Custom, HDFI. Har egen CADLAB (tegnings-/utviklingsavdeling) som CAD-tegner og CNC-maskinerer skreddersydde løsninger.

**40+ merker forhandles:** Wera, Knipex, Snap-on, Stahlwille, Rennsteig, Facom, Lista, PB Swiss Tools, Husqvarna, Milwaukee, Hultafors, Mora, Leatherman, Bahco, Gedore, Brockhaus Heuer, KC Tools, Mitutoyo, Ledlenser, Hellberg, Zarges, Fluke, Solid Gear, Snickers Workwear, Pelicase m.fl.

**«Fosen Tools standard»** referert av Forsvaret = sterkt B2B-signal. Bærekraft: 100% selvforsynt fornybar energi (solcellepark 2023), elektriske firmakjøretøy, Miljøfyrtårn-sertifisert, Grønt Punkt Norge, godkjent lærebedrift.

**Vi fører IKKE FG-godkjente våpenskap**, men VI fører mobilhotell.$$,
'{}'::jsonb)
ON CONFLICT (kind, slug) DO UPDATE SET content = EXCLUDED.content, updated_at = now();


-- =========================================================================
-- VOICE-DOKTRINE
-- =========================================================================
INSERT INTO public.social_corpus (kind, slug, title, content, metadata) VALUES
('voice', 'doktrine', 'FT skrivestil-doktrine',
$$**Eriks doktrine: «riktig verktøy for hverdagen», ikke antall.**
Vi snakker om presisjon, kontroll og kvalitetssystemer — ikke om hvor mange skuffer eller hvor mange varianter. «Tom skuff»-mantraet er forbudt («6 ledige skuffer til eget behov», «antall som feature»). Verdi handler om KONTROLL og SPORBARHET, ikke kvantitet.

**CNC-maskinert, ALDRI «CNC-frest».** Gjelder alle innlegg/nyhetsbrev/landingssider når vi beskriver HDFI/CADLAB-produksjon.

**HDFI-terminologi:** referer ALLTID til vår HDFI som «HDFI» alene. Ikke «HDFI-skuminnlegg», «HDFI-skum» eller «plastplate». HDFI er produktnavnet, ikke en materialebeskrivelse.

**Skreddersydd-definisjonen:** CAD-tegnet, CNC-maskinert og segmentert etter brukerens arbeidsflyt. Hver posisjon er individuell, gravert, FOD-sikret. Ikke generisk.

**Toneregister:**
- Stolthet («levert», «ferdigstilt», «klart») — funker
- Spesifikk («til TESS VEST», «for Forsvaret», «på Andøya Space») — funker
- Direkte spørsmål — funker DÅRLIG (-33% engasjement på FB)
- Filosofisk Forsvar-snakk — funker DÅRLIG (-94%)
- Lang post (300+ tegn) på Facebook — funker DÅRLIG (-44%)

**Faktagrunnlag som ALLTID kan brukes:**
- 25 år i 2026 (etablert 2001)
- 100 år i konsern (siden 1926)
- Sertifisert leverandør til Forsvaret
- Industrigata 1, Brekstad
- CADLAB skreddersyr fra mål
- 40+ merker
- Miljøfyrtårn-sertifisert$$,
'{}'::jsonb),

('voice', 'forbudte-fraser', 'Forbudte fraser og udokumenterte påstander',
$$Disse skal ALDRI brukes i FT-innhold:

- «Norges største på proff-verktøy» (uberettiget claim)
- «siden 2008» (udokumentert — vi sier 25 år / 2001 / 100 år i konsern)
- «CNC-frest» (vi sier CNC-maskinert)
- «HDFI-skum», «HDFI-skuminnlegg», «plastplate» (vi sier HDFI alene)
- «6 ledige skuffer til eget behov» (antall-som-feature)
- «Tom skuff»-mantraet
- «Spørsmålet er ikke om...» (klisjé-åpning)
- «Full vogn er best?» (spørsmål-åpning, -33% engasjement)
- Generisk Forsvars-filosofi (-94%)

**FG-godkjente våpenskap**: vi fører IKKE dette. Søketermer som «FG-godkjent våpenskap», «godkjent våpenskap» er negative kandidater i Google Ads — de skal heller ikke nevnes som om vi selger dem. Vi selger mobilhotell og våpenskap til Politi/Forsvar (ikke FG-godkjent privatmarked).$$,
'{}'::jsonb)
ON CONFLICT (kind, slug) DO UPDATE SET content = EXCLUDED.content, updated_at = now();


-- =========================================================================
-- VISUAL RULES (lærdom fra 11 Native-avvisninger)
-- =========================================================================
INSERT INTO public.social_corpus (kind, slug, title, content, metadata) VALUES
('visual_rules', 'forbud', 'KRITISK: visuelle forbud',
$$**Forbudte AI-bilde-motiv (lærdom fra 11 Native-avvisninger):**

1. **AI-genererte HDFI** — fotorealistisk skum/innlegg er IKKE GREIT. Vi bruker ekte foto av leveranser.
2. **AI-spokesmodel** — «tenkende mann ved tre-bord», «AI-mann i hettegenser», «konsulent-setting» — ALDRI fake mennesker.
3. **Tomme skuffer** — passer ikke Eriks doktrine («tom skuff»-mantraet er forbudt).
4. **Blanke røde rektangler** — abstrakte CAD-skisser i stedet for produkt-data.
5. **Cartoon/blomster/dekorativ støy** — HDFI som blomst, cartoon-mennesker, dekorative ikoner.
6. **Blå/rød fargemix** — vi bruker KUN FT-palett (rød + ink + hvit). Ingen blå-aksent.
7. **«6 ledige skuffer»** — antall-som-feature.
8. **Plastplate-vs-HDFI-terminologi** — vi sier ALDRI plastplate om HDFI.

**Tillatt:** Typografi, store tall, definisjoner, sitater, sertifikat-merker, sammenligning som tekst-grafikk.

**Når i tvil:** Last opp ekte foto. AI-bilder skal være tekstbasert, ikke produktbasert.$$,
'{}'::jsonb)
ON CONFLICT (kind, slug) DO UPDATE SET content = EXCLUDED.content, updated_at = now();


-- =========================================================================
-- PALETT + TYPOGRAFI
-- =========================================================================
INSERT INTO public.social_corpus (kind, slug, title, content, metadata) VALUES
('palette', 'ft-tokens', 'FT-fargepalett',
$$**FT-rød (primær):** #ED1C24
**FT-ink (mørk):** #0F1115
**FT-hvit:** #FFFFFF
**FT-burst gul (highlight):** #FFC107 (kun for kampanje-burst)

**Bruksregler:**
- Forside/hovedflate: rød eller mørk full-bleed
- Tekst på rød/mørk: hvit
- Tekst på hvit: ink
- ALDRI bland med blå, grønn eller andre aksent-farger

Jubileumslogoene (25-år + 100-år) bruker gull-gradient (#85704d → #dbb78b) — kun på de offisielle SVG-ene, ikke som dekorativt aksent.$$,
'{}'::jsonb),

('typography', 'ft-fonter', 'FT-typografi',
$$**Hovedfont:** Manrope (sans, varierte vekter 400-800)
**Brosjyre/print:** Roboto + Roboto Mono for tall, Playfair for serif-stempel
**Sosiale medier-grafikk:** Manrope eksklusivt for konsistens

**Vekter for headings:** 700-800. Body: 400-500. Tall/data: 600+ med tabular-nums.

**Tracking:** tight på store overskrifter (-0.02em), normal på body.$$,
'{}'::jsonb)
ON CONFLICT (kind, slug) DO UPDATE SET content = EXCLUDED.content, updated_at = now();


-- =========================================================================
-- PLATTFORM-REGLER
-- =========================================================================
INSERT INTO public.social_corpus (kind, slug, title, content, metadata) VALUES
('platform', 'facebook', 'Facebook-regler',
$$**Char-cap:** 280 tegn (ideelt). Maks 500.
**Lengde-data:** 300+ tegn = -44% engasjement.

**Mønstre med dokumentert engasjement-lift (vs median 68):**
- «Skreddersydd»/«HDFI»/«spesialtilpasset» i caption: **+144%**
- Start med emoji: **+93%**
- 2+ emojis: **+67%**
- Stolthet-tone («levert», «ferdigstilt»): **+38%**
- CTA («ta kontakt»): **+15%**
- Direkte spørsmål: **-33%**
- Eksplisitt «Forsvar/militær»-filosofi (uten konkret leveranse): **-94%**

**Beste tid:** Torsdag/fredag kl 12:00 (snitt 162 eng vs onsdag 19).

**Struktur som funker:**
1. Emoji + handlingsverb («✅ Levert til X»)
2. Spesifikk kunde/sted
3. Hva (HDFI, skreddersydd, CADLAB)
4. Hvorfor (FOD, kontroll, sporbarhet)
5. CTA («Ta kontakt for ditt prosjekt»)

**UTM:** alle eksterne lenker MÅ ha utm_source=facebook&utm_medium=organic&utm_campaign=<navn>$$,
'{"char_cap": 280, "best_hour": 12, "best_days": ["torsdag", "fredag"]}'::jsonb),

('platform', 'instagram', 'Instagram-regler',
$$**Char-cap:** 2200 tegn maks, 125 tegn synlige før «...mer».
**Visuelt fokus:** Instagram er bilde-først. Caption støtter, leder ikke.

**Mønstre:**
- Hashtags i FØRSTE KOMMENTAR, ikke i caption (renere look)
- Bruk 5-15 relevante hashtags: #fosentools #hdfi #skreddersydd #cadlab #verktøy #brekstad #forsvaret #kvalitetsverktøy
- ALT-tekst settes via Instagram-mobilapp ETTER publisering (Meta Business Suite støtter ikke det)
- Karusell: rekkefølge teller — sterkeste bilde først som scroll-stopper
- Eks. for leveranse: 1) nærbilde av HDFI, 2) overshot av koffert, 3) vinkel, 4) lukket koffert med engravering

**Bio-lenke = utm_source=instagram&utm_medium=bio**
**Story-lenke = utm_source=instagram&utm_medium=story**$$,
'{"char_cap": 2200, "preview_char": 125}'::jsonb),

('platform', 'linkedin', 'LinkedIn-regler',
$$**Char-cap:** 3000 tegn maks. **Sweet spot:** 400-700 tegn.
**Tone:** Mer faglig enn FB/IG. Snakk om kvalitetssystemer, ISO/AS-standarder, sertifisering.

**Struktur:**
1. Hook (1 setning som stopper scroll)
2. Kontekst (2-3 setninger, hvilket prosjekt/kunde/bransje)
3. Hva ble løst (3-5 setninger med konkret FT-vinkling)
4. Take-away (1-2 setninger som leder til CTA)
5. Hashtags (3-5 stk, faglig: #aviation #aerospace #forsvaret #cadlab #kvalitetsledelse)

**Mest delt-mønster:**
- Sertifisert leverandør-vinkel
- «Fosen Tools standard» referert av kunde
- Tekniske detaljer (toleranse, FOD-håndtering, sporbarhet, kvalitetssystem)

**UTM:** utm_source=linkedin&utm_medium=organic

**Status:** Community Management API venter på godkjenning. Foreløpig: caption-gen + manuell publisering.$$,
'{"char_cap": 3000, "sweet_spot": [400, 700]}'::jsonb)
ON CONFLICT (kind, slug) DO UPDATE SET content = EXCLUDED.content, updated_at = now();


-- =========================================================================
-- ARCHETYPES (visuelle stiler)
-- =========================================================================
INSERT INTO public.social_corpus (kind, slug, title, content, metadata) VALUES
('archetype', 'foto', 'Foto (ingen AI-bilde-gen)',
$$**Ekte foto fra leveranse, prosess eller kunde-besøk.**

Brukes for: leveranse, prosess, kundehistorie, bransje-kontekst.

**Ingen AI-bildegenerering** — kun caption-gen. Bruker laster opp 1-6 bilder, AI lager bare caption.

Dette er FTs mest funket-pattern (+144%-mønsteret). Foto MÅ være ekte for å bevare troverdighet. Eksempler: Pelicase 1535 til Forsvaret, OPTI-koffert til TESS VEST, Husqvarna Automower til Andøya Space.$$,
'{"image_gen": false, "char_cap_image": null}'::jsonb),

('archetype', 'definisjon', 'Definisjon (ordbok-stil)',
$$**Visuelt:** Sentralt ord (stort, fett, Manrope 800) + ordklasse i kursiv + presis definisjon i 2-3 linjer under.

Eksempel som funket (8. mai 2026):
- Ord: «Skreddersydd»
- Klasse: «adjektiv»
- Def: «CAD-tegnet, CNC-maskinert og segmentert etter brukerens arbeidsflyt.»

**AI-prompt mal:**
```
A typography-only poster on solid background (FT-red #ED1C24 OR FT-ink #0F1115).
NO photos, NO illustrations, NO product mockups.
Center-aligned dictionary-style layout:
  - Top line: italic word-class label (e.g. "adjektiv", "substantiv")
  - Hero line: the word in massive Manrope 800, white color, tight tracking
  - Bottom: 2-line definition in Manrope 500, sentence case
Footer chip: FT-logo wordmark (white) in bottom-left, 4mm height.
Aspect ratio: 1:1 (Instagram/Facebook) or 4:5 (Instagram portrait).
Modern, editorial, swiss-design feel. NO decorative elements.
```$$,
'{"image_gen": true, "aspect_ratio": "1:1"}'::jsonb),

('archetype', 'statement', 'Statement-poster',
$$**Visuelt:** Kort kraftig setning (1-7 ord), full bleed.

Eksempler: «0 mm slark.», «25 år. 100 år i konsernet.», «Skreddersydd siden 2001.»

**AI-prompt mal:**
```
Maximalist typography poster on solid FT-red #ED1C24 background.
Single bold statement centered: <STATEMENT> in Manrope 900, white.
Tight tracking, MASSIVE size (font fills 70% of canvas width).
Period/punctuation in same size.
Footer: FT-logo (white) bottom-center, small.
No other elements. Aspect 1:1.
```$$,
'{"image_gen": true, "aspect_ratio": "1:1"}'::jsonb),

('archetype', 'kontrast', 'Kontrast (sammenligning)',
$$**Visuelt:** To-kolonne sammenligning. Tradisjonelt grått til venstre, FT-rød til høyre.

Eksempel: Hyllevare vs HDFI; Generisk skum vs CNC-maskinert HDFI; Manuell vs CADLAB.

**AI-prompt mal:**
```
Two-column comparison poster, vertical divider.
LEFT column: muted gray #6E6E6E background. Heading: "<Negativ side>".
  3 bullets in white Manrope 500.
RIGHT column: FT-red #ED1C24 background. Heading: "<FT-side>".
  3 bullets in white Manrope 600.
Top center: FT-logo wordmark (white).
Aspect 4:5. Typography only, no illustrations.
```$$,
'{"image_gen": true, "aspect_ratio": "4:5"}'::jsonb),

('archetype', 'milepael', 'Milepæl (store tall)',
$$**Visuelt:** Hovedmotiv er ETT stort tall. Resten er kontekst.

Eksempler: «25», «100», «40+ merker», «0 mm», «1 700 leveranser».

**AI-prompt mal:**
```
Massive number poster. Background: solid FT-ink #0F1115 OR FT-red #ED1C24.
Center: the number <NUMBER> in Manrope 900, MASSIVE (90% of canvas height).
Number color: white (on red) or FT-red (on ink). Crisp edges.
Above number: small label "<KONTEKST>" in Manrope 500 uppercase tracked.
Below number: 1-line caption in Manrope 400.
Optional: gold gradient (#85704d → #dbb78b) on number for jubileums-konteks.
Footer: FT-logo wordmark.
Aspect 1:1.
```$$,
'{"image_gen": true, "aspect_ratio": "1:1"}'::jsonb),

('archetype', 'sitat', 'Sitat (kundehistorie)',
$$**Visuelt:** Sitat sentrert med stor anførselstegn-grafikk. Atribuering under.

Eksempel: «Fosen Tools-standarden er det vi bygger systemet rundt.» — Forsvaret

**AI-prompt mal:**
```
Quote card poster. Background: FT-ink #0F1115 OR off-white #F4F4F4.
Center: large pull-quote in Manrope 500, italic, white (on ink) or ink (on off-white).
Quote font-size: occupies 55% of canvas height.
Large red opening-quote glyph (FT-red) top-left, 1/3 size of canvas.
Below quote: small attribution line: "<Kundenavn>, <Rolle>"
Footer: FT-logo wordmark.
Aspect 4:5.
```$$,
'{"image_gen": true, "aspect_ratio": "4:5"}'::jsonb),

('archetype', 'sertifikat', 'Sertifikat (trust-signaler)',
$$**Visuelt:** Sertifikat-merker (ISO 9001, AS 9100, Miljøfyrtårn, Grønt Punkt, Forsvaret-leverandør) sentralt + kort tekst om hva det betyr.

**AI-prompt mal:**
```
Trust-signal poster. Background: white #FFFFFF.
Top half: heading in Manrope 700: "<Sertifisering / trust-message>"
Center: 3-5 abstract certification marks as simple geometric shapes
  (circles, hexagons) with text labels in Manrope 600, FT-ink.
  DO NOT generate actual logos — use abstract placeholder shapes.
Bottom: 2-line explainer text in Manrope 400.
Right edge: FT-red vertical stripe (4mm wide, full height).
Footer: FT-logo wordmark.
Aspect 1:1.
```$$,
'{"image_gen": true, "aspect_ratio": "1:1"}'::jsonb)
ON CONFLICT (kind, slug) DO UPDATE SET content = EXCLUDED.content, updated_at = now();


-- =========================================================================
-- TOPIC-TEMPLATES (caption-prompt-maler per topic-type)
-- =========================================================================
INSERT INTO public.social_corpus (kind, slug, title, content, metadata) VALUES
('topic_template', 'leveranse', 'Leveranse (det vinnende +144%-mønsteret)',
$$**Når:** Vi har levert noe konkret til en konkret kunde. DENNE typen funker best — +144% lift på FB.

**Anbefalt archetype:** foto (ekte bilder)

**Struktur per plattform:**

**Facebook (280 tegn):**
- Emoji-åpner («✅», «🎯», «📦», «🔥»)
- «Levert/Klart/Ferdigstilt til <Kunde>»
- 1 setning om hva (HDFI, koffert, skreddersydd)
- 1 setning om CADLAB-vinklingen
- CTA («Trenger du noe lignende? Ta kontakt.»)

**Instagram (2200 tegn, men hold kort):**
- Samme åpner
- Mer detaljer om prosess (CADLAB → CNC-maskinert → ferdig)
- Hashtags i kommentar: #fosentools #hdfi #skreddersydd #cadlab #brekstad

**LinkedIn (400-700 tegn):**
- Hook: konkret fagvinkel («I forrige uke leverte vi til <Kunde>...»)
- Kontekst: bransje (aviation, forsvar, offshore)
- Detalj: kvalitetssystem, sporbarhet, FOD-håndtering
- Take-away: hvorfor skreddersydd HDFI er forskjellig fra hyllevare
- Hashtags: 3-5 faglige

**Input fra bruker:** kunde, produkt, evt. spesifikk vinkling.$$,
'{"archetypes_supported": ["foto"], "primary_lift": "+144%"}'::jsonb),

('topic_template', 'prosess', 'Prosess (CADLAB → CNC → ferdig)',
$$**Når:** Vi viser hvordan en HDFI eller løsning blir til.

**Anbefalt archetype:** foto eller definisjon

**Caption-mal (FB):**
- 🛠️ / 🎯 emoji-opener
- «Fra <noe> til <noe>» eller «Slik lager vi <produkt>»
- 3-5 punkter om prosessen (CAD-tegning → CNC-maskinering → kvalitetskontroll → pakking)
- Ikke fagspråk-tung — leservennlig

**LinkedIn:**
- Mer tekniske detaljer (toleranse, FOD-håndtering)
- Hvorfor det er forskjellig fra generisk

**Input:** prosess-trinn, evt. konkret kunde.$$,
'{}'::jsonb),

('topic_template', 'produktlansering', 'Produktlansering (ny i sortimentet)',
$$**Når:** Nytt produkt eller nytt merke i sortimentet. Pull data fra fosen-tools.no via source_url.

**Anbefalt archetype:** foto (produkt-bilde) eller statement

**Caption:**
- Emoji-opener
- «Nytt i sortimentet:» / «Klart fra lager:»
- Produktnavn + merke
- 2-3 USP fra produktsiden
- Pris hvis aktuelt
- Lenke med UTM (utm_source=<plattform>&utm_medium=organic&utm_campaign=produktlansering-<slug>)

**Bruk source_data fra scrape-product:** navn, manufacturer, image_url, price_now, bullets.$$,
'{}'::jsonb),

('topic_template', 'bransje_kontekst', 'Bransje-kontekst (Forsvaret, aviation, offshore)',
$$**Når:** Tematisk innlegg om en bransje vi tjener.

**Anbefalt archetype:** sertifikat eller foto (hvis vi har konkret kundereferanse)

**Tone:** Faglig, B2B-rettet. På LinkedIn primært.

**Caption:**
- Konkret bransje-vinkel (ikke generisk «forsvar er viktig»)
- Hvilke FT-løsninger er aktuelle (HDFI, FT Systemvegg, Weapon Storage)
- Kundereferanser hvis vi har dem (Forsvaret-leverandør, aviation-kunder)
- Faglig CTA

**ADVARSEL:** Eksplisitt «forsvar/militær»-filosofi uten konkret kunde = -94% engasjement. Hold det konkret.$$,
'{}'::jsonb),

('topic_template', 'milepael', 'Milepæl (25 år, 100 år, jubileum)',
$$**Når:** Jubileums-innlegg, milestone-feiring.

**Anbefalt archetype:** milepael (store tall)

**Caption:**
- 25 år 2026 / 100 år i konsernet
- Hvorfor det betyr noe (kontinuitet, troverdighet, 4. generasjon)
- Takk til kunder/team

**Bruk jubileumslogoer** (offisielle SVG: Jubileumslogo-25aar.svg / Jubileumslogo-100aar.svg).$$,
'{}'::jsonb),

('topic_template', 'edukativ', 'Edukativ (hyllevare vs HDFI)',
$$**Når:** Vi forklarer hvorfor skreddersydd > generisk.

**Anbefalt archetype:** kontrast eller definisjon

**Caption-mal:**
- Spørsmålet vi svarer på (uten å bruke spørsmål-format, som har -33%)
- 2-3 konkrete forskjeller (CADLAB, CNC-maskinert, sporbarhet, FOD)
- «Slik gjør vi det» med teknisk detalj

**Eksempel som funket (3. mai 2026):** HDFI vs generisk skum-post.$$,
'{}'::jsonb),

('topic_template', 'evergreen', 'Evergreen (alltid relevant)',
$$**Når:** Ingen aktuell aktivitet, men vi vil holde liv i kanalen.

**Anbefalt archetype:** definisjon, statement, sitat

**Caption:** Kort, tett på FT-doktrinen. Kan resirkuleres.$$,
'{}'::jsonb)
ON CONFLICT (kind, slug) DO UPDATE SET content = EXCLUDED.content, updated_at = now();


-- =========================================================================
-- PRODUKT-KONTEKST
-- =========================================================================
INSERT INTO public.social_corpus (kind, slug, title, content, metadata) VALUES
('product', 'hdfi', 'HDFI',
$$**HDFI** (High Density Foam Inserts) — Fosen Tools egne CAD-tegnede og CNC-maskinerte skuminnlegg.

**Hva det er:**
- Skreddersydd skuminnlegg som passer eksakt til kofferter, skuffer, vogner
- Hver utskjæring tegnet i CADLAB etter kundens spesifikke verktøy
- CNC-maskinert (ALDRI «CNC-frest») for nøyaktige toleranser
- Tofarget skum (vanligvis svart + FT-rød) for visuell verktøykontroll
- Engravering med modellnummer, lasermerking

**Bruksområder:**
- FOD-sikring (Foreign Object Debris) — særlig kritisk i aviation/Forsvaret
- Verktøykontroll i kvalitetssystemer (ISO 9001, AS 9100)
- Sporbarhet og «tom skuff = manglende verktøy» visualisering
- Beredskap (Politi, brann, helse)

**Aldri:**
- Kall det «skuminnlegg», «HDFI-skum», «plastplate» — det er HDFI alene
- AI-generér det fotorealistisk (det er hva Native feilet på 11 ganger)

**Typiske leveranser:**
- Pelicase med skreddersydd HDFI
- Verktøyvogner med HDFI per skuff
- OPTI-koffert med HDFI
- FTINDU2-skap med HDFI$$,
'{}'::jsonb),

('product', 'cadlab', 'CADLAB',
$$**CADLAB** — Fosen Tools egen tegnings- og utviklingsavdeling.

**Hva de gjør:**
- CAD-tegner skreddersydde HDFI etter kundens verktøy
- Designer FT Custom-løsninger (Systemvegg, Weapon Storage, mobilhotell)
- Spesifiserer produksjon for CNC-maskinering
- Kvalitetskontrollerer mot kundens spec

**SEO-vinkel:** «CADLAB» som proper noun differensierer FT fra forhandlere som bare selger ferdige løsninger.

**Bruk i caption:** «Tegnet i CADLAB», «CADLAB designet», «fra CADLAB til CNC».$$,
'{}'::jsonb),

('product', 'ft-custom', 'Fosen Tools Custom',
$$**Fosen Tools Custom** — egne produkter laget på Brekstad.

**Inkluderer:**
- FT Systemvegg (modulær veggmontert verktøyløsning)
- Weapon Storage (våpenskap til Forsvar, Politi, kriminalomsorg)
- Mobilhotell (mobile lagringsløsninger)
- Skreddersydde verktøyvogner

**Skiller seg fra:**
- FG-godkjente våpenskap (fører vi IKKE)
- Standard hyllevare (det er det forhandler-merkene gjør)$$,
'{}'::jsonb)
ON CONFLICT (kind, slug) DO UPDATE SET content = EXCLUDED.content, updated_at = now();


-- =========================================================================
-- TOPP-POSTER (positive eksempler, engagement-data fra Meta)
-- =========================================================================
INSERT INTO public.social_corpus (kind, slug, title, content, metadata) VALUES
('top_post', 'odde-elektronett', 'Odde Elektronett (rekord 762 eng)',
$$Leveranse til Odde Elektronett. 762 engasjement på Facebook (FT all-time record).

**Caption-mønster:** Spesifikk kunde + skreddersydd + bildekarusell av leveransen.
**Lærdom:** Konkrete navngitte kunder slår generisk innhold.$$,
'{"engagement": 762}'::jsonb),

('top_post', 'husqvarna-automower', 'Husqvarna Automower til Andøya Space (542 eng)',
$$Leveranse av Husqvarna Automower-løsning til Andøya Space.

**Hvorfor det funket:** Sterk merkekobling (Husqvarna + Andøya Space) + uvanlig bruksområde (rakettlaunch-site).$$,
'{"engagement": 542}'::jsonb),

('top_post', 'alier-trondheim', 'Alier Trondheim HDFI (282 eng)',
$$HDFI-leveranse til Alier Trondheim.

**Mønster:** Lokal kunde + HDFI + ekte foto av åpen koffert.$$,
'{"engagement": 282}'::jsonb),

('top_post', 'kampfly-fod', 'Kampfly + FOD (265 eng)',
$$F-35 kampfly + FOD-sikring-vinkling.

**Mønster:** Forsvars-konkret + teknisk fagterm (FOD).$$,
'{"engagement": 265}'::jsonb),

('top_post', 'skreddersydd-definisjon', 'Skreddersydd-definisjon (8. mai 2026)',
$$Definisjon-stil bilde + caption som forklarer hva «skreddersydd» betyr i FT-kontekst.

**Format:** Archetype `definisjon` — funket selv om det IKKE er ekte foto.

**Lærdom:** Typografi-poster fungerer hvis ordet/definisjonen er kraftig.$$,
'{"archetype": "definisjon"}'::jsonb),

('top_post', 'kraftpipe-tess-vest', 'Kraftpipe-sett TESS VEST (8. mai 2026)',
$$OPTI-koffert med skreddersydd HDFI for kraftpipe 22-38 mm til TESS VEST.

**Caption brukte +144%-mønsteret:** skreddersøm + HDFI + CNC-maskinert + emoji-start + retorisk CTA.
**Karusell-rekkefølge:** nærbilde først (best scroll-stopper), deretter overshot, vinkel, lukket koffert.$$,
'{}'::jsonb)
ON CONFLICT (kind, slug) DO UPDATE SET content = EXCLUDED.content, updated_at = now();


-- =========================================================================
-- AVVISTE MØNSTRE (negative eksempler — fra Native 11 avvisninger)
-- =========================================================================
INSERT INTO public.social_corpus (kind, slug, title, content, metadata) VALUES
('rejected_pattern', 'tom-skuff-mantra', 'Tom skuff-mantraet',
$$**Avvist:** «Seks tomme skuffer er ditt verksted i 30 sekunder»-tankesett.

**Hvorfor:** Eriks doktrine er «riktig verktøy for hverdagen», ikke antall. Tom skuff = mangel, ikke feature.

**Aldri bruk:** «Tom», «ledige skuffer», «6 plasser til deg».$$,
'{}'::jsonb),

('rejected_pattern', 'ai-hdfi', 'AI-genererte HDFI',
$$**Avvist:** Fotorealistiske AI-bilder av HDFI eller skuminnlegg.

**Hvorfor:** Native feilet på dette 11 ganger. AI klarer ikke gjengi HDFI på en måte som ser ekte ut, og «fake HDFI» undergraver troverdigheten.

**Alternativ:** Ekte foto, eller archetype som unngår produkt-rendering (definisjon, statement, milepael).$$,
'{}'::jsonb),

('rejected_pattern', 'ai-spokesmodel', 'AI-spokesmodel (fake mennesker)',
$$**Avvist:** «Tenkende mann ved tre-bord», «konsulent i hettegenser», «AI-mann i verkstedet».

**Hvorfor:** Ser fake ut, undergraver autentisitet, og vi er en familie-bedrift med ekte folk. Bruk ekte ansatte hvis vi har bilder.

**Aldri:** AI-genererte mennesker som hovedmotiv.$$,
'{}'::jsonb),

('rejected_pattern', 'sporsmal-apning', 'Spørsmål som åpning',
$$**Avvist:** «Spørsmålet er ikke om...», «Full vogn er best?», «Hvorfor velger Forsvaret oss?»

**Hvorfor:** -33% engasjement på Facebook. Spørsmål-åpning føles påtrengende.

**Alternativ:** Konkret påstand eller emoji + handlingsverb.$$,
'{}'::jsonb),

('rejected_pattern', 'fargemix', 'Blå/rød fargemix',
$$**Avvist:** Aksenter i blå, grønn, oransje sammen med FT-rød.

**Hvorfor:** FT-palett er KUN rød + ink + hvit. Andre farger bryter konsistensen.

**Tillatt:** Gull-gradient (kun på offisielle jubileumslogoer).$$,
'{}'::jsonb),

('rejected_pattern', 'antall-feature', 'Antall som feature',
$$**Avvist:** «6 ledige skuffer til eget behov», «42 vogner»-snakk.

**Hvorfor:** Eriks doktrine — vi snakker om KVALITET og KONTROLL, ikke antall.$$,
'{}'::jsonb),

('rejected_pattern', 'plastplate', 'Plastplate-terminologi',
$$**Avvist:** «Plastplate som passer skuffen din», «skum-innlegg av plast».

**Hvorfor:** HDFI er PRODUKTNAVNET. Plastplate trivialiserer det og undergraver fagligheten.

**Alltid bruk:** «HDFI», «CAD-tegnet HDFI», «CNC-maskinert HDFI».$$,
'{}'::jsonb),

('rejected_pattern', 'cnc-frest', 'CNC-frest (feil term)',
$$**Avvist:** «CNC-frest», «frest skum», «freseteknikk».

**Hvorfor:** Vi sier ALLTID «CNC-maskinert». Frest er upresist og ikke vår term.$$,
'{}'::jsonb),

('rejected_pattern', 'fake-cad', 'Fake CAD-skisser',
$$**Avvist:** Abstrakte AI-genererte CAD-skisser med tomme røde rektangler.

**Hvorfor:** Ser umiddelbart fake ut — ekte CAD har komplekse linjer og toleranse-merker.

**Alternativ:** Ekte CADLAB-screenshot eller archetype `definisjon`/`statement`.$$,
'{}'::jsonb),

('rejected_pattern', 'norges-storste', 'Norges største på proff-verktøy',
$$**Avvist:** «Norges største på proff-verktøy», «markedsleder», andre udokumenterte claims.

**Hvorfor:** Uberettiget claim som kan utfordres. Vi har konkrete tall: 25 år, 100 år i konsernet, sertifisert til Forsvaret — bruk dem i stedet.$$,
'{}'::jsonb),

('rejected_pattern', 'siden-2008', 'Siden 2008',
$$**Avvist:** «Siden 2008», «over 18 år i bransjen», andre vage årsangivelser.

**Hvorfor:** Vi har ETABLERING 2001 = 25 år. Familiekonsern siden 1926 = 100 år. Bruk presise tall.$$,
'{}'::jsonb)
ON CONFLICT (kind, slug) DO UPDATE SET content = EXCLUDED.content, updated_at = now();
