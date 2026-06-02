# Caption-mal — Showcase «Tidligere skreddersydd levert»

Bruk for: FTReferanseStory-poster der vi viser frem bilder av HDFI-leveranser
uten å nevne spesifikk kunde. Bildene gjør jobben — captions er for
discovery (søkeord + hashtags) og first-line-hook.

**Regel:** ALDRI gjett kundenavn. Hvis kunden er verifisert (TESS VEST,
Lufttransport AS, Forsvaret, Andøya Space) kan du bytte ut «Skreddersydd HDFI»
med «Levert til [kunde]» — ellers behold generisk.

---

## Facebook (~280 tegn, klikkbar URL med UTM)

```
🛠️ Skreddersydd HDFI fra Fosen Tools.

Hvert verktøy får sin egen plass. CAD-tegnet i CADLAB, CNC-maskinert på Brekstad.

Verktøykontroll som forhindrer FOD og holder oversikten — for aviation, forsvar og industri.

→ Se mer på fosen-tools.no/hdfi?utm_source=facebook&utm_medium=social&utm_campaign=hdfi-showcase
```

## Instagram (kort + hashtag-stack på slutten)

```
🛠️ Skreddersydd HDFI fra Fosen Tools.

CAD-tegnet i CADLAB. CNC-maskinert på Brekstad. Verktøykontroll for fagfolk.

Link i bio · #FosenTools #HDFI #Skreddersom

#FosenTools #HDFI #Skreddersom #CADLAB #CNCmaskinert #Verktoykontroll #FOD #Brekstad #Verktoyorganisering #Industri #Aviation #Forsvar #Offshore #Verktoysett #SnapOn #Pelicase #Verktoyvogn
```

## LinkedIn (B2B-tone, kort, klikkbar URL)

```
🛠️ Skreddersydd HDFI fra Fosen Tools — verktøykontroll for fagfolk.

Hvert verktøy får sin egen plass: CAD-tegnet i CADLAB, CNC-maskinert og levert fra Brekstad. FOD-sikret organisering som tåler hverdagsbruk i aviation, forsvar og industri.

Sertifisert leverandør gjennom 25 år.

→ fosen-tools.no/hdfi?utm_source=linkedin&utm_medium=social&utm_campaign=hdfi-showcase

#HDFI #FosenTools #Verktoykontroll #CADLAB
```

---

## SEO-strategien forklart

Disse er nøkkelord vi vil rangere på (og som vises i caption + hashtag):

| Søkeord | Volum-anslag | Plassering |
|---|---|---|
| HDFI | Lav (vi eier akronymet) | Hashtag + caption-åpning |
| Skreddersydd skum / verktøyinnlegg | Mid (norsk B2B) | Caption-prosa |
| Verktøykontroll | Mid (B2B) | Caption-prosa + LinkedIn |
| FOD-sikring | Lav (aviation/forsvar-nisje) | Caption-prosa |
| CADLAB | Lav (FT-unik) | Caption-prosa + hashtag |
| CNC-maskinert | Mid | Caption-prosa |
| Verktøyorganisering | Lav-mid | Hashtag (#Verktoyorganisering) |
| Brekstad | Geo-signal | Caption + hashtag |

## Hashtag-strategi

**Norske bokstaver i hashtags fungerer dårlig** — IG/FB indekserer ofte ikke
ord med æøå. Derfor:

- ✅ `#Skreddersom` (uten ø) — eller `#Skreddersydd`
- ✅ `#Verktoykontroll` (uten ø)
- ✅ `#Verktoyorganisering`
- ✅ `#Verktoysett`
- ✅ `#Verktoyvogn`
- ❌ `#Skreddersøm` — fungerer ikke som hashtag
- ❌ `#Verktøykontroll` — fungerer ikke

I caption-prosa derimot: bruk **alltid riktig norsk** («skreddersøm»,
«verktøykontroll», «verktøyorganisering»). Det er kun hashtags som må være
æøå-frie.

## Forbudt liste (per CLAUDE.md)

- ❌ «HDFI-skuminnlegg», «HDFI-skum» — bruk bare «HDFI»
- ❌ «CNC-frest» — bruk «CNC-maskinert»
- ❌ «i Brekstad» — bruk «på Brekstad»
- ❌ Direkte spørsmål som åpningslinje (-33 % engasjement)
- ❌ Em-dash i prosa — bruk komma
- ❌ «Forsvar» som åpningslinje (-94 % lift hvis hovedtema). OK å nevne diskré.

## Gjenbruk-flyt

For hver ny showcase-post med dette mønsteret:

1. **Behold captions over som-er** for de fleste poster — det er JO det
   som er poenget. Captions skal IKKE leses i detalj på showcase.
2. Bytt eventuelt `utm_campaign=hdfi-showcase` til datospesifikk versjon
   (`hdfi-showcase-2026-06`) hvis du vil spore enkelt-post i GA4.
3. Hvis posten har en VERIFISERT kunde, bytt åpningslinjen:
   - `🛠️ Skreddersydd HDFI fra Fosen Tools.`
   - → `🛠️ Levert til TESS VEST. Skreddersydd HDFI fra Fosen Tools.`
4. Variér rekkefølge på bransje-listen i andre runde (aviation først,
   forsvar først, industri først) så fremtidige poster ikke kjenner
   nøyaktig like.
5. For Instagram: roter mellom 2-3 hashtag-grupper så IG-algoritmen ikke
   markerer alle showcase-poster med samme «follower-target».

## Tre hashtag-grupper å rotere mellom (IG)

**Gruppe A — bransje-fokus**
```
#FosenTools #HDFI #Skreddersom #CADLAB #CNCmaskinert #Verktoykontroll #FOD #Aviation #Forsvar #Industri #Offshore #Brekstad
```

**Gruppe B — produkt-fokus**
```
#FosenTools #HDFI #Skreddersom #Verktoyorganisering #Verktoyvogn #Verktoysett #Pelicase #Verktoykoffert #CADLAB #CNCmaskinert #Brekstad #Norge
```

**Gruppe C — håndverk-fokus**
```
#FosenTools #HDFI #Skreddersom #Handverk #Kvalitet #Egenproduksjon #CADLAB #CNCmaskinert #Verktoykontroll #Brekstad #Sertifisert #Industri
```

Bytt mellom gruppene per uke for å unngå «samme post»-signal.

---

## Hvor lagre dette?

Captions over havner allerede i `out/dagens/YYYY-MM-DD/ft-referanse/captions.md`
hver gang du kjører `npm run dagens`. Hvis du vil bruke MALEN over som
default i stedet for den auto-genererte: si fra, så jeg bygger den
inn i `dagens-innlegg.ts` som ny `ft-referanse-showcase`-flagg.
