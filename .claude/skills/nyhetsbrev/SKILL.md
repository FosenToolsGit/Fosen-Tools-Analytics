---
name: nyhetsbrev
description: Bygg tirsdagsnyhetsbrevet (FTNett/Mailchimp) — datadrevet temavalg, lager+lokasjon-verifisering, e-postsikre bilder, HTML levert til innliming. ALDRI push til Mailchimp API. Brukes mandager eller når Adrian ber om nyhetsbrev.
---

# Tirsdagsnyhetsbrev

Sendes tirsdag 11:00. Bygges som HTML som Adrian selv limer inn i Mailchimp
(«Paste in code») og scheduler manuelt. Mal-script å kopiere fra:
[scripts/_tmp-build-18aug-nl.ts](scripts/_tmp-build-18aug-nl.ts) — det har
push-sperre, bildekonvertering og riktig UTM-oppsett innebygd.

## HARD REGEL: aldri push til Mailchimp

Ingen `--push`/`--update` mot Mailchimp API — det tar nettsidekapasitet.
Byggescriptet sperrer dette. Lever HTML, Adrian limer inn selv.

## Steg

1. **Temavalg på data, ikke smak.** Sjekk GSC for søkeklynger med høye
   visninger / lave klikk (udekket etterspørsel), og hvilke tidligere
   utsendelser som fikk klikk (`mailchimp_campaign_links`). Formatet
   «én kategori, flere merker» har vunnet (1,8 % klikkrate vs 0,3–0,4 %).
2. **Verifiser hvert produkt med Playwright** mot fosen-tools.no (Googlebot-UA):
   - **Lager OG lokasjon:** `.main-warehouse .DynamicStockTooltipContainer`
     gir antall + avdeling. «Fosen» = Brekstad, «Sør» = annen avdeling.
     Kun Sør → forkast, eller skriv «Brekstad eller i Trondheim».
   - **Eget bilde:** JSON-LD kan arve et søskenprodukts foto (Wera Torx-fellen)
     — sjekk at bildene er distinkte og store nok (ikke 120 px).
   - **FT-artikkelnummer** fra `.prd-num-label`, aldri produsentens modellnr.
   - **Førpris** kun fra `data-oldprice`, og kun vis pris ved reell rabatt
     (`price_before > price_now`). Alle priser eks mva.
3. **Bilder → e-postsikre:** Multicase serverer WebP uansett `.jpg`-endelse
   (blir svarte i Apple Mail). Konverter med sharp: flatten hvit bunn,
   maks 900 px, last opp til Supabase `social_assets/brand-assets/nl-{dato}/`.
4. **Bygg med `MailchimpBuilderService.buildNewsletterHtml`** (dummy
   MAILCHIMP_API_KEY i env unngår constructor-throw). Kjør med
   `npx tsx` fra prosjektroten.
5. **Lever:** preview-HTML + entities-versjon (æøå → `&#248;` osv. for
   Mailchimp) til `~/Desktop/nyhetsbrev-{dato}/`, og åpne preview i Chrome:
   `open -a "Google Chrome" …/preview.html`

## Innholdsregler

- **Aldri påfunne claims** — ingen frister, garantier eller tall uten kilde.
  Kun verifiserte fakta fra scrape/CLAUDE.md/Adrian.
- **Ingen emojis** noe sted (badge, heading, ingress, subject, alt).
- **Korte titler** (2–4 ord) og undertitler (3–5 ord). **Ingress = én
  setning** — detaljene hører hjemme i produktkortene.
- Topp-badge «NYHETSBREV» (salgs-badge kun ved ekte kampanje).
- Komma, ikke tankestrek. «Proff-butikken», ikke «butikken». CNC-maskinert.
- Produktgrid 6 (3+3) eller 5 (3+2), `mceColumn` for mobil-stacking.
- **UTM:** `utm_source=mailchimp&utm_medium=email&utm_campaign={dato-tema}`
  + `utm_content` per produkt. **Slå av Mailchimp-malens arvede
  GA-kampanjekode** (`EMAIL_CAMPAIGN_…`) — den kolliderer med våre UTM-er.
