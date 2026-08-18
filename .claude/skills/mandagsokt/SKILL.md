---
name: mandagsokt
description: Kjør mandagsøktas ukesrapport — uke-mot-uke-tall fra Supabase, ren lead-definisjon, HTML-brief til skrivebordet, åpnet i Chrome. Brukes hver mandag morgen eller når Adrian ber om «mandagsrapport»/«ukesrapport».
---

# Mandagsøkt — ukesrapport

Lag ukesrapporten for mandagsmøtet. Alt kjøres fra prosjektroten med
`node --env-file=.env.local` (scripts feiler stille uten env).

## Steg

1. **Sjekk datagrunnlaget først.** Daglig sync kjører ~07:22. Verifiser i
   `sync_logs` (Supabase) at nattens sync er grønn for ga4/meta/mailchimp/
   google_ads. Rød sync → trigg `POST /api/sync` med Bearer SYNC_SECRET_KEY
   og vent, ELLER flagg hullet eksplisitt i briefen.
2. **Oppdater datoene** i [scripts/_tmp-ukesrapport.mjs](scripts/_tmp-ukesrapport.mjs):
   `LAST` = forrige uke man–søn, `PREV` = uka før, pluss gte/lte-grensene.
   Kjør scriptet — det gir GA4, Google Ads per kampanje, konverteringsverdi
   og trafikkilder.
3. **Suppler med:** Meta-engasjement (platform_posts, IG bruker `views`),
   siste Mailchimp-kampanje vs snitt, SEO-bevegelser fra GSC (husk ~3 dagers
   lag — sammenlign hele uker med 3 dagers buffer), åpne anomalier i
   `analytics_anomalies`.
4. **Bygg HTML-brief** i dark FT-stil (FT-rød accent, Manrope) →
   `~/Desktop/FT-mandagsrapport-{dato}.html`. Aldri Markdown-leveranse.
5. **Åpne den:** `open -a "Google Chrome" ~/Desktop/FT-mandagsrapport-*.html`

## Regler som IKKE kan brytes

- **Lead = kun `form_submit`/`kontakt`.** `begin_checkout` er kjøpsintensjon/
  pipeline og rapporteres som egen post («Påbegynt kjøpsverdi»), aldri som lead.
- **form_submit-tall før ~19. aug 2026 er bot-oppblåst** (iframe-phantom-
  reloads, 29 «leads» på én dag med null Freshdesk-tickets). Se alltid på
  dagsfordelingen, ikke ukesummen. Reelt nivå: 1–3/uke. Første rene
  uke-mot-uke-sammenligning ~1. september 2026.
- **ROAS med ~1 kjøp i uka er støy** — ikke lag overskrift av det; nevn
  kjøpet og verdien, ikke multippelen.
- **`pmax_insight`-rader er rullende 90-dagers aggregat** per snapshot —
  aldri summer over flere snapshot-datoer, bruk siste.
- **Supabase REST kutter ved 1000 rader** — paginer alle spørringer som kan
  overstige det.
- Sanity: `conversions` ≤ `all_conversions`; GA4 uten datohull; Mailchimp
  ~1 rad per utsendelse er by design.

## Brief-struktur (fra 17. aug-malen)

Hero-tall (sesjoner, kjøpsverdi, leads-rene, kost) → Google Ads per kampanje
→ Meta → Mailchimp siste utsendelse → SEO stigere/fallere → åpne varsler →
anbefalte handlinger. Kort prosa per seksjon, ikke bare tabeller. Ting som
beveget seg får forklaring; ting som sto stille får én linje.
