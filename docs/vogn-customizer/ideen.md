# Verktøyvogn-customizer — ideen (Adrians ord, 21. september 2026)

Førsteutkast. Teksten under er Adrians egen, gjengitt ordrett så ingenting går tapt.

> Det vi tenker er å lage en egen verktøyvogn customizer på en måte, sånn at man har
> mulighet å velge mellom hvilken vogn man har og hvilke innlegg man skal ha i vognen
> sin, det som passer bra er at det finner allerede veldig mange innlegg som ligger på
> nett fra før av: https://fosen-tools.no/produkter/verkt%C3%B8ysett/skuffer
>
> Her har du 2 underkategorier, det er: DE / 575 x 380mm og Milwaukee
>
> DE / 575 x 380mm innleggene passer i disse to vognene:
> - https://fosen-tools.no/fosen-tools/f6753/verkt%c3%b8yvogn-gr%c3%a5-8-skuffer-m-hjul-l%c3%a5s-670x460x812mm-66kg-ftc
> - https://fosen-tools.no/fosen-tools/f6754/verkt%c3%b8yvogn-gr%c3%a5-9-skuffer-bred-m-hjul-l%c3%a5s-1358x460x770mm-136kg-ftc
>
> passer også i denne: https://fosen-tools.no/fosen-tools/114968/verkt%c3%b8yvogn-gr%c3%a5-17-skuffer-bred-m-hjul-l%c3%a5s-1358x460x1336mm-fosen-tools
> usikker på om vi skal ta med denne, og denne da, usikker på denne også:
> https://fosen-tools.no/fosen-tools/f7634/elektrovogn-gr%c3%a5-8-skuffer-m-kabeloppheng-2-stk-r%c3%b8r-for-krympestr%c3%b8mper-ftc
>
> Milwaukee innleggene, passer i disse 3 vognene:
> - https://fosen-tools.no/milwaukee/118978/verkt%c3%b8yvogn-7-skuffer-toolguard-30-78-cm-src30-1-milwaukee
> - https://fosen-tools.no/milwaukee/119815/verkt%c3%b8yvogn-7-skuffer-spesial-edition-30-78-cm-toolguard-milwaukee
> - https://fosen-tools.no/milwaukee/120636/verkt%c3%b8yvogn-11-skuffer-toolguard-30-78-cm-topp-og-bunnvogn-milwaukee
>
> Det som er greia her er at vi skal lage et system som man kan velge akkurat hvordan
> man vil ha vognen sin, hvis du vil ha piper og skraller på toppen kan du ha det, hvis
> du vil ha piper og skraller i bunnskuffen kan du ha det, du velger helt selv
>
> Det jeg vil at vi lager er noe som ligner visningsmåten her, for dette er en veldig
> fin måte å vise at innleggene ligger i skuffen: https://claude.ai/artifact/TKSWdzJNoeakbjpxBEogM1
>
> Det som er viktig er at det skal være så enkelt som å velge vogn, velge innleggene
> også sende forespørsel, det skal også være mulig å skrive notater hvis man vil det,
> f.eks legge igjen notater på skuffe 1 eller skuffe 5
>
> Det som er viktig er at informasjonen vi får inn i post@fosen-tools.no er lett
> forståelig og at det inneholder alt vi trenger, som f.eks varenummerne vi skal ha,
> osv osv
>
> Det jeg tror vi bør gjøre er å bygge det i vercel, også hoste det på fosen.tools for
> nå, så kan vi teste og sånn der: fosen.tools ligger på pro-isp
>
> Ting skal være mulig å rangere ut ifra pris, men det skal ikke stå noe pris på siden,
> det skal bare komme en knapp om forespørr, så man ikke blir skremt av pris, så ting
> skal f.eks sorteres etter hva som er billigst til dyrest (også best da selvfølgelig)
>
> En annen ting vi kunne laget er f.eks presets som vi har generert så hvis de trykker
> på de presetene får de f.eks, verktøyvogn for montøren, eller verktøyvogn for
> bilmekanikeren, eller verktøyvogn for elbil osv osv
>
> Jeg vil at ting skal se smooth og profesjonelt ut. Dette er et førsteutkast av ideen
>
> Vi får ikke bygget dette i oppsettet som multicase har idag så derfor ser jeg for
> meg at vi må ta det via vercel også kanskje hoste det på et subdomene senere som
> custom.fosen-tools.no eller noe lignende, men vi kan bruke fosen.tools idag eller
> bare holde oss til verceldomene for nå

## Kravene, punktvis

1. **Velg vogn** — to familier: DE / 575×380 mm (FT-vogner f6753, f6754, evt. 114968 og elektrovogn f7634 — de to siste er uavklart) og Milwaukee (118978, 119815, 120636).
2. **Velg innlegg per skuffe** — fra `/produkter/verktøysett/skuffer`, underkategori styrt av vognfamilien. Fri plassering: kunden bestemmer hvilken skuffe hvert innlegg ligger i.
3. **Visning** — innleggene skal vises liggende i skuffen, som i referanse-artefakten (3D-scene av CSS-plan, samme grep som vognvisningen på `/produkter/verktøyvogner` fra 20. sept).
4. **Notater** — fritekst per skuffe (og gjerne for hele forespørselen).
5. **Send forespørsel** — e-post til post@fosen-tools.no som er lett å lese og inneholder alt: vogn med varenummer, hvert innlegg med varenummer og skuffe, notater, kontaktinfo.
6. **Ingen pris på siden** — kun «Forespør». Men sortering på pris (billigst → dyrest) skal virke, så prisen må ligge i data uten å vises.
7. **Presets** — ferdige oppsett: montøren, bilmekanikeren, elbil, osv.
8. **Utseende** — smooth og profesjonelt.
9. **Hosting** — Vercel. Domene: Vercel-domene nå, fosen.tools som testadresse (ligger på ProISP, allerede pekt til Vercel-prosjektet `fosen-tools-domener`), og senere trolig `custom.fosen-tools.no`.
10. Kan ikke bygges i Multicase.

## Åpne spørsmål
- Skal 17-skuffers (114968) og elektrovognen (f7634) være med? Adrian er usikker på begge.
- Hvordan sendes e-posten (Resend, SMTP via Office 365, annet)?
- Egen Vercel-app eller rute i Analytics-prosjektet?
- Hvordan holdes innleggs- og vogndataene oppdatert mot Multicase (manuell liste, sitemap-sveip, cron)?

## Beslutninger 21. september 2026
- Eget repo + Vercel-prosjekt `fosen-tools-custom` (ikke i Analytics).
- Resend med `fosen.tools` som avsenderdomene, mottaker post@fosen-tools.no.
- CSS-tegnet vogn for alle sju vognene, ekte innleggsfoto som skuffebunn.
- Alle DE-innlegg passer i alle skuffer. Bred toppskuff på de brede vognene tar to innlegg.

## Status 21. september 2026, kveld — første versjon live
- **Repo:** https://github.com/FosenToolsGit/fosen-tools-custom (public, koblet til Vercel — push til `main` deployer)
- **Live:** https://fosen-tools-custom.vercel.app
- **Lokalt:** `~/Downloads/Fosen Tools Apper/fosen-tools-custom`, `npm run dev`. Forhåndsvisning fra Analytics: launch-konfig `custom` (port 3200).
- Bygget: 7 vogner med skuffeoppsett fra produktsidene, 19 innlegg med foto, 4 presets (utkast),
  3D-scene av CSS-plan, notat per skuffe + generelt, forespørselsskjema med honeypot,
  e-post med plukkliste via Resend (tørrkjøring uten nøkkel).
- **Gjenstår før kunder kan bruke den:** Resend-konto + API-nøkkel i Vercel (`RESEND_API_KEY`),
  verifisere `fosen.tools` i Resend (tre DNS-poster hos ProISP), evt. peke `fosen.tools` til
  prosjektet (i dag videresender det til fosen-tools.no via `fosen-tools-domener`).
- Presetene er satt sammen av meg fra de 19 innleggene — Erik/Adrian bør se over. «Elbil» er
  utelatt fordi ingen av innleggene er VDE.

## Sent 21. september — ekte 3D (Three.js) og innhold per innlegg
- CSS-scenen byttet ut med react-three-fiber: prosedyral vogn fra skuffedataene, skuffer som glir ut,
  innlegg som skumblokker med foto, kunden kan dreie vognen. Samme data, samme app.
- **Klikk på et innlegg i 3D → panel med innholdet**: verktøyene fra «Innhold»-fanen på produktsiden
  med lenke til hvert verktøy (`data/innhold.json`, 508 verktøy fra 17 innlegg, 110363 og 125443 har
  ingen liste på nettsiden).
- Adrian ba om klikk på *enkeltverktøy i bildet*. Det krever posisjon per verktøy i fotoet, som ikke
  finnes noe sted — neste steg er et lite markørverktøy der vi klikker verktøyene på plass én gang
  per innlegg. Til det er gjort er listen svaret.
- **Markørverktøy bygget** (`/marker`, kun lokalt): klikk hvert verktøy på plass i fotoet →
  `data/hotspots.json` → commit + push. I 3D blir hvert punkt klikkbart med navn og lenke.
  Fila er tom til merkingen er gjort.

## 22. september, natt — delbar lenke, kvittering, HDFI-farge
- Oppsettet ligger i URL-en (`?o=`); «Kopier lenke»; lenken står i e-posten til post@ og i kvitteringen kunden får.
- HDFI-farge per innlegg (eller på alle): rød/hvit, svart/hvit, hvit/svart, blå/hvit, gul/svart, lys grå/svart.
  Vises som ramme i 3D og som egen kolonne i e-posten. Fotoet er originalt til CNC-modellene kommer.
- Neste: CNC-filer fra CADLAB (DXF, ett innlegg først) → ekte 3D-innlegg med lommer = automatiske hotspots.
- Utsatt: gravering på skuffefronter; knapp på fosen-tools.no når siden er klar.

## 22. september, morgen — CNC-filene virker
- `Milwaukee_Skap_Passform_fiks.rou` (EnRoute 25) lest: 7 plater, 398 utskjæringer i plast, 596 lommer i skum.
- `scripts/rou-til-json.py` i customizer-repoet gjør .rou → JSON. Formatet er dokumentert i memory
  (`feature_enroute_rou_format`). Neste .rou-fil er en kommando, ikke en jobb.
- 3D viser nå ekte tofarget topplate med utskjæringer + skum med lommer for Milwaukee-innleggene.
- Åpent: plate→innlegg-mapping (Adrian bekrefter mot `~/Desktop/FT-milwaukee-cnc-plater.png`),
  lagtykkelser, plate 7 = to innlegg?
- Tykkelser og lommedybder står i .rou-fila og leses nå: plast 1,7 mm, gravering 0,6, skum 18/28 mm,
  dybde per lomme. Plate 7 = 120649 bekreftet; 3/4/5 er kopier av pipesettet.
