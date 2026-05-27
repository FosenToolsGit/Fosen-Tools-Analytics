# AI Discoverability-plan — Fosen Tools AS

**Opprettet:** 24. mai 2026
**Trigger:** Cold-mail fra EZ-Fix (Emil Delsbekk) som påsto at FT ligger på «D4-tier»
i AI-søk. Test-runde avslørte at premissen var feil, men én reell utfordring
ble identifisert: **HDFI-begrepet er ikke etablert i AI-trening.**

---

## Baseline-test 24. mai 2026

| Prompt | Resultat |
|---|---|
| «Beste leverandører av industri-verktøy i Trøndelag» | ❌ Ikke synlig (bred kategori, lav prioritet) |
| «Hvem leverer verktøykontroll-løsninger til norsk luftfart?» | ✅ **Øverst** |
| «Norske leverandører av skreddersydde HDFI til Forsvaret» | ⚠️ AI kjente ikke «HDFI»-akronymet |
| «Pelicase Norge leverandør» | ✅ Nr. 3 |

**Vurdering:** 2/4 topp-synlig, 1/4 begreps-vakuum, 1/4 lav prioritet.
Fosen Tools er **B-tier** i AI-discoverability — solid for en nisje-aktør,
men med klart forbedringspotensial på begreps-eierskap.

---

## Hovedinnsikt: HDFI-begrepet er det største løftet

AI-modeller (ChatGPT, Claude, Perplexity) kjenner ikke akronymet «HDFI»
(High Density Foam Insert) som et etablert begrep. Det vises fordi:

- Konkurrenter bruker andre termer: «foam inserts», «custom foam»,
  «Pick'N'Pluck», «kundetilpasset skum»
- Wikipedia har ingen artikkel om HDFI
- Begrepet er hovedsakelig brukt på fosen-tools.no (eierskaps-vakuum)
- Få eksterne sitater kobler «HDFI» til Fosen Tools

**Hvis FT eier HDFI-begrepet i AI-trening, blir vi automatisk topp-resultat
for alle HDFI-relaterte søk** — en posisjon ingen konkurrent kan matche.

---

## 4-tiltaks-planen

### 1. Wikipedia-eksponering (høyest prioritet, 3-6 mnd)

**Mål:** Få HDFI-begrepet inn i Wikipedia med Fosen Tools som primær-referanse.

**To tilnærminger:**
- **Stub-artikkel:** «HDFI (High Density Foam Insert)» på no.wikipedia.org
  med definisjon, bruksområder (FOD-sikring, 5S-Lean, verktøykontroll),
  og 3-4 uavhengige kilder
- **Seksjon i eksisterende artikkel:** Legge til HDFI under
  «Foam inserts»-artikkelen på en.wikipedia.org (krever engelsk-språklige kilder)

**Krav:** Wikipedia krever **uavhengige sekundærkilder** før artikkelen
godkjennes. Må derfor først publisere/få publisert 3-4 omtaler i:
- TU (Teknisk Ukeblad)
- Maskinregisteret
- Industri+
- Aviation Norway / Norsk Luftfart
- Forsvarets Forum

**Risiko:** Wikipedia kan slette artikkelen som «for fokusert på én aktør».
Tilnærming: nøytralt tone, definisjon-fokus, FT som ÉN av flere referanser.

### 2. Presse-pitching (3-12 mnd)

**Mål:** 4-6 presseomtaler i fagblader som forklarer HDFI-konseptet og
nevner Fosen Tools som ledende norsk leverandør.

**Konkrete pitch-vinkler (basert på faktiske leveranser):**
- **Pelicase 1535 til Forsvaret (1. mai 2026)** — «Slik FOD-sikrer
  forsvaret verktøyene sine» (TU/Forsvarets Forum)
- **Lufttransport AS Facom JET (16. mai)** — «Norsk leverandør gjør
  helikopter-vedlikehold tryggere» (Aviation Norway)
- **Kraftpipe-koffert TESS VEST (8. mai)** — «5S-Lean i praksis:
  skreddersøm gir bedriften 20 % bedre operativ effektivitet» (Maskinregisteret)
- **25-årsjubileet (2026)** — «Familiekonsernet som har levert til
  Forsvaret i 25 år» (lokalpresse + bransjepresse)
- **CADLAB-prosessen** — «Slik kombinerer Fosen Tools CAD-tegning og
  CNC-maskinering for verktøykontroll» (TU)

**Verktøy:** PR-byrå eller in-house pitching. In-house er rimeligere
men krever tid (4-6 timer per pitch).

### 3. Fagblad-siteringer (6-12 mnd)

**Mål:** Få «HDFI» og «Fosen Tools» nevnt i autoritative bransje-kilder
som AI scraper.

**Aktive kanaler:**
- TU.no (TU + TU Industri)
- Maskinregisteret.no
- Industriavfall.no / Bygg.no
- Verkstedforum.no
- Aviation.no
- Forsvarets Forum (forsvaret.no/aktuelt)
- Bygg.no / Byggteknikkforum
- NHO-medlemsside om leverandører til Forsvaret
- Proff.no / Brønnøysund (allerede synlig — verifiser data er oppdatert)

**Taktikk:** Gjeste-innlegg, ekspert-intervjuer, sponsede artikler
(de siste er rimelige — 10-20k per blad).

### 4. Egne sider — utvid HDFI-eierskap (1-3 mnd, raskest)

**Mål:** Gjøre fosen-tools.no/hdfi til den definitive HDFI-kilden
slik at AI-modeller plukker den opp ved scraping.

**Konkrete tiltak:**
- ✅ HDFI-siden eksisterer på `/hdfi` med god JSON-LD
- 📋 Utvide siden med:
  - Full definisjon av HDFI (akronym, materiale, produksjonsprosess)
  - Sammenligning HDFI vs alternativ (plast, vakuumformet, klassisk skum)
  - 5-6 case-historier (med kunde-navn der godkjent)
  - Tekniske spesifikasjoner (tetthet, materialer, ESD-versjon, brannhemmende)
  - Bruksområder per bransje (forsvar, aviation, offshore, helse, politi)
  - Videoer fra CADLAB-prosessen
- 📋 Backlinks fra produktsider og bransje-sider til /hdfi
- 📋 «HDFI» eksplisitt brukt i alle leveranse-omtaler (Meta, LinkedIn,
  nyhetsbrev — sosiale medier-sitater plukkes opp av AI)
- 📋 Egen `/hdfi/case-studies/`-seksjon

---

## Måling og oppfølging

**Baseline (24. mai 2026):**
- 2/4 topp-synlig i nisje-prompts
- 0/4 dukker opp med «HDFI» som søkeord
- Wikipedia: 0 omtaler
- Fagblader: minimal sitering

**Kvartals-test (24. august, 24. november 2026):**
Kjør samme 4 prompts + 3 nye:
1. «Hva er HDFI?» (måler begreps-eierskap)
2. «Norske leverandører av verktøykontroll» (måler bredde)
3. «Beste leverandør av skreddersydde verktøyløsninger Norge»

**Suksess-mål 12 mnd:**
- 4/7 prompts: topp-3 i AI-svar
- «Hva er HDFI?»: AI forklarer korrekt med FT som referanse
- 5+ presseomtaler publisert
- Wikipedia-artikkel eller -seksjon godkjent

---

## Hva vi IKKE gjør

- ❌ **Kjøper ikke EZ-Fix sin AI-SEO-pakke** (premissen var feil; tiltakene
  de mest sannsynlig selger løser ikke begreps-eierskap)
- ❌ **Bytter ikke CMS** (Multicase er ikke flaskehalsen; tekniske SEO
  er allerede solid)
- ❌ **Kjøper ikke kommersielle PR-pakker uten klare KPI-er** (over 50k
  per program krever konkret leveranse-spesifikasjon)

---

## Ressurser

- Memory: `feedback_ai_discoverability_strategy.md` (kort versjon)
- Sosiale medier: `feedback_social_caption_optimization.md` (data-mønstre)
- Innholdsmotor: `/innholdsmotor` for AI-generering av case-historier
- SEO-innhold-bygger: `/innsikt/seo-innhold` for nye HDFI-artikler

**Ansvarlig:** Erik (markedsføring) + bistand fra Adrian via Claude Code
**Re-evaluering:** 24. august 2026 (Q3 sjekk-inn)
