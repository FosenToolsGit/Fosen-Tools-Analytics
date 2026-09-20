---
name: mandagsokt
description: Kjør mandagsøktas ukesrapport — uke-mot-uke-tall fra Supabase, ren lead-definisjon, FT Aviation-rapport som PDF, ukas FTA-publisering (mandag + torsdag), HTML-brief til skrivebordet, åpnet i Chrome. Brukes hver mandag morgen eller når Adrian ber om «mandagsrapport»/«ukesrapport».
---

# Mandagsøkt — ukesrapport

Lag ukesrapporten for mandagsmøtet. Alt kjøres fra prosjektroten med
`node --env-file=.env.local` (scripts feiler stille uten env).

## Steg

**Steg 1 kjøres alltid, uansett.** Den er selvstendig, tar sekunder, og skal ikke
utsettes til slutt der den kan bli glemt fordi tallene tok tid.

1. **Generér FT Aviation-rapporten med én gang:**

   ```
   npm run fta-rapport
   ```

   Den henter GA4, Search Console, Facebook og YouTube på egen hånd og legger
   `FTA-ukesrapport-{dato}.pdf` på skrivebordet. Ingen avhengighet til Supabase-
   syncen, så den virker selv om nattens sync er rød. **Send PDF-en til Adrian
   med SendUserFile når den er ferdig**, så han kan videresende til FTA-ledelsen.

2. **Sjekk datagrunnlaget for Fosen Tools.** Daglig sync kjører ~07:22. Verifiser i
   `sync_logs` (Supabase) at nattens sync er grønn for ga4/meta/mailchimp/
   google_ads. Rød sync → trigg `POST /api/sync` med Bearer SYNC_SECRET_KEY
   og vent, ELLER flagg hullet eksplisitt i briefen.
3. **Oppdater datoene** i [scripts/_tmp-ukesrapport.mjs](scripts/_tmp-ukesrapport.mjs):
   `LAST` = forrige uke man–søn, `PREV` = uka før, pluss gte/lte-grensene.
   Kjør scriptet — det gir GA4, Google Ads per kampanje, konverteringsverdi
   og trafikkilder.
4. **Sammenligner du mot i fjor? Kjør bot-korreksjonen først:**

   ```
   npm run aar-mot-aar -- --fra 2026-10-01 --til 2026-10-31
   ```

   GA4 hadde en bot-flom på fosen-tools.no **1. sept – 30. nov 2025** — september
   var 60 % «Unassigned» med 0 % engasjement, oktober 46 %, november 44 %. Vår egen
   database hjelper ikke, for `analytics_metrics` starter i januar 2026. Scriptet
   henter begge år fra GA4, trekker fra Unassigned og viser rått mot korrigert.
   Eksempel fra 19. sept: **rått −68,5 %, korrigert +3,1 %.** Bruk alltid det
   korrigerte tallet, og si i briefen at det er korrigert.

5. **Suppler med:** Meta-engasjement (platform_posts, IG bruker `views`),
   siste Mailchimp-kampanje vs snitt, SEO-bevegelser fra GSC (husk ~3 dagers
   lag — sammenlign hele uker med 3 dagers buffer), åpne anomalier i
   `analytics_anomalies`.
6. **Bygg HTML-brief** i dark FT-stil (FT-rød accent, Manrope) →
   `~/Desktop/FT-mandagsrapport-{dato}.html`. Aldri Markdown-leveranse.
7. **Ukas FT Aviation-publisering — ALLTID med i briefen.** Se eget avsnitt
   under. Dette er ikke valgfritt og skal ikke droppes fordi tallene tok tid.
8. **Åpne begge:** `open -a "Google Chrome" ~/Desktop/FT-mandagsrapport-*.html`
   og `open ~/Desktop/FTA-ukesrapport-*.pdf`

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

## FT Aviation — egen rapport til ledelsen

`npm run fta-rapport` bygger en A4-PDF i FTA-stil (navy og gull) og legger den på
skrivebordet som `FTA-ukesrapport-{dato}.pdf`. Den henter alt selv:

| Kilde | Hva |
|---|---|
| GA4 `properties/502811501` | sesjoner, brukere, sidevisninger, kanaler, sider, hendelser |
| Search Console `sc-domain:ft-aviation.no` | klikk, visninger, søkeord, posisjon |
| Facebook via `META_ACCESS_TOKEN` | ukas publiseringer på FT Aviation-siden |
| YouTube via `YT_REFRESH_TOKEN_FTA` | visninger, videoer, abonnenter |

**Egne seksjoner:** trafikk med uke-mot-uke, hvor besøkende kommer fra, mest leste
sider, kontaktskjemaet (`form_start` mot innsendte), Google-søk, og sosiale medier.

**To forbehold rapporten håndterer selv:**
- **Search Console hadde et opphold 16. juli til 30. august.** Rapporten skriver det
  ut i klartekst når det er under tre dager med nye tall, i stedet for å vise null.
- **Skjemasporingen ble lagt om 2. september.** Tall før den datoen er
  bot-forurenset, samme feil som fosen-tools.no hadde før 17. august.

## FT Aviation — ukas videoer (fast punkt på mandagsmøtet)

FTA publiserer **mandag og torsdag kl. 12:00**. Adrian har bedt om å bli
minnet på dette hver mandag, fordi det er lett å glemme: **YouTube går av seg
selv via `publishAt`, men Instagram, Facebook og LinkedIn må legges ut
manuelt.** At videoen ligger på YouTube betyr altså IKKE at uka er i boks.

Gjør dette hver mandag, og skriv det inn i briefen som egen seksjon:

1. **Navngi ukas to poster** — hvilket produkt går mandag, hvilket går torsdag,
   med filnavn og art.nr. Kilde: `~/Desktop/FTA-lansering/PUBLISERINGSPLAN.html`
   (eller planen for gjeldende pulje).
2. **Kontroller forrige uke mot Facebook-API-et**, ikke mot avkryssingene i
   planen — de ligger i localStorage og er ikke fasit:
   ```
   node --env-file=.env.local -e '
   const t=process.env.META_ACCESS_TOKEN;
   const a=await (await fetch(`https://graph.facebook.com/v22.0/me/accounts?fields=name,id,access_token&access_token=${t}`)).json();
   const p=a.data.find(x=>x.name==="FT Aviation");
   const r=await (await fetch(`https://graph.facebook.com/v22.0/${p.id}/posts?fields=created_time,message&limit=6&access_token=${p.access_token}`)).json();
   for(const x of r.data??[]) console.log(x.created_time,"|",(x.message??"").replace(/\n/g," ").slice(0,70));'
   ```
   Mangler en dato → si det rett ut i briefen som en åpen oppgave, ikke som en
   observasjon.
3. **Format-fasit:** Instagram + Facebook = REEL-fila (9:16). LinkedIn =
   SQUARE-fila (1:1), aldri reel. Forsidebilde `-THUMB-916.jpg` kun til IG/FB;
   YouTube beholder 16:9-thumben. Alt-tekst legges inn på Instagram via
   mobilappen etter publisering. Alt FTA-innhold er på engelsk.
4. **Varsle når materialet tar slutt.** Ferdig-rendret innhold har en siste
   dato — når det er under to uker igjen, flagg det i briefen så neste pulje
   kan settes opp. Hvert nytt produkt må gjennom FTA Studio-pipelinen (hent
   produkt, kuratér bilder, verifiser spec, render tre format) pluss captions
   og thumbnails, så det kan ikke bestilles samme uke som det skal ut.
5. Fosen Tools kan ikke tagges som samarbeidspartner så lenge
   Meta-begrensningen står — FT poster i så fall sin egen versjon som omtaler
   **datterselskapet** (aldri «søsterselskap»).

## Brief-struktur (fra 17. aug-malen)

Hero-tall (sesjoner, kjøpsverdi, leads-rene, kost) → Google Ads per kampanje
→ Meta → Mailchimp siste utsendelse → SEO stigere/fallere → åpne varsler →
anbefalte handlinger. Kort prosa per seksjon, ikke bare tabeller. Ting som
beveget seg får forklaring; ting som sto stille får én linje.
