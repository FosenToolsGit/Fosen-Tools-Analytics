# Arkiv på ekstern disk (Samsung T7)

Filer som er flyttet av maskinen for å frigjøre plass. **Les denne før du leter.**

Oppdatert 18. September 2026 · disken heter `T7`, exFAT · lista finnes to steder:
`docs/arkiv-paa-t7.md` i repoet og `Fosen Tools - arkiv/HVOR-LIGGER-TINGENE.md` på disken.

## Struktur på T7

| Mappe | Innhold |
|---|---|
| `FT Aviation/Render - FTA Studio/` | 62 FTA-videoer, augustlanseringen + F-35 docking |
| `Fosen Tools - arkiv/Bilder og media/` | Det som lå som `Fosen Tools/` inne i repoet: Bilder, Ferdig, FTAviation, Maler |
| `Fosen Tools - arkiv/Render - Analytics out/` | 883 foto + 76 reels fra Remotion, deriblant publiserte |
| `Fosen Tools - arkiv/Trucket-Hat V1/` | Capsprosjektet, blend-filer og renders |
| `Fosen Tools - arkiv/Kundeprosjekter/` | Fjord Helikopter, Kunder Q3, Polypus, Arctic Aviation, Helge Olden |
| `Fosen Tools - arkiv/worktree-patcher/` | To ukommitterte endringer reddet fra slettede worktrees |
| `Bilder 2001-2004/` | Privat, ikke Fosen Tools |

## Hva ligger hvor

| Flyttet fra | Ligger nå på T7 | Str. | Filer |
|---|---|---:|---:|
| `~/Downloads/Fosen Tools Apper/FTA Studio/out` | `FT Aviation/Render - FTA Studio` | 803M | 45 |
| `~/Downloads/Fosen Tools Apper/Fosen Tools Analytics/out` | `Fosen Tools - arkiv/Render - Analytics out` | 2.8G | 1273 |
| `ukommitterte worktree-endringer` | `Fosen Tools - arkiv/worktree-patcher` | 3K | 2 |
| `~/Downloads/Fosen Tools Apper/Fosen Tools Analytics/Trucket-Hat V1` | `Fosen Tools - arkiv/Trucket-Hat V1` | 2.3G | 187 |
| `~/Downloads/Fjord Helikopter` | `Fosen Tools - arkiv/Kundeprosjekter/Fjord Helikopter` | 553M | 62 |
| `~/Downloads/Kunder Q3` | `Fosen Tools - arkiv/Kundeprosjekter/Kunder Q3` | 416M | 7 |
| `~/Downloads/Polypus Scuba Service` | `Fosen Tools - arkiv/Kundeprosjekter/Polypus Scuba Service` | 360M | 51 |
| `~/Downloads/Arctic Aviation` | `Fosen Tools - arkiv/Kundeprosjekter/Arctic Aviation` | 335M | 57 |
| `~/Downloads/03 - Helge Olden - Pistolkoffert` | `Fosen Tools - arkiv/Kundeprosjekter/03 - Helge Olden - Pistolkoffert` | 331M | 16 |
| `~/Downloads/Bilder 2001-2004 AI-4x` | `Bilder 2001-2004/Bilder 2001-2004 AI-4x` | 3.8G | 2458 |
| `~/Downloads/Bilder 2001-2004 SAMLET` | `Bilder 2001-2004/Bilder 2001-2004 SAMLET` | 1.9G | 2528 |
| `~/Downloads/Bilder 2001-2004 VIDEO-fikset` | `Bilder 2001-2004/Bilder 2001-2004 VIDEO-fikset` | 1.1G | 56 |
| `~/Downloads/Bilder 2001-2004 Adrian og Endre` | `Bilder 2001-2004/Bilder 2001-2004 Adrian og Endre` | 470M | 102 |
| `~/Downloads/Bilder 2001-2004 BARE Endre` | `Bilder 2001-2004/Bilder 2001-2004 BARE Endre` | 214M | 106 |
| `~/Downloads/Fosen Tools Apper/Fosen Tools Analytics/Fosen Tools` | `Fosen Tools - arkiv/Bilder og media` |  21G | 953 |

## Slettet, ikke flyttet

Gjenskapes lokalt, derfor ikke arkivert: tre `.next`-byggecacher (8,2 GB),
fem `node_modules` (3,0 GB, alle prosjekter har `package-lock.json`), og to
git-worktrees som var fullt merget inn i main (1,6 GB).

**Kjør `npm install` før neste `npm run dev`.**

## Å være klar over

- **`out/` er aldri bare cache.** Både `FTA Studio/out` og `Analytics/out` ble først
  ført opp som byggeartefakter. Begge inneholdt publiserte videoer som ikke fantes
  andre steder. Sjekk innholdet før noe slettes.
- Fire `_tmp-`-scripts peker inn i den gamle `Fosen Tools/`-stien og brekker uten
  T7 tilkoblet: `_tmp-samle-og`, `_tmp-liminn-hjul`, `_tmp-ref-revisjon`,
  `_tmp-hjul-ombygg-sjekk`. Engangsscripts, ikke produksjonspipeline.
- `Logoer/` og `Fosen Tools Nettside Utsende/` ble bevisst liggende lokalt.
  De brukes av kode som kjører jevnlig.
- Det lå en `Fosen Tools/`-mappe på 21 GB på T7 fra før, ved siden av
  `Fosen Tools - arkiv/`. Ikke rørt. Kan inneholde overlapp, verdt en sammenligning.

## Framgangsmåte ved flytting

`/tmp/flytt.sh <kilde> <mål> [notat]`: rsync kopierer, så verifiseres filantall og
md5 på de tolv største filene, **først da slettes kilden**, og linja føres i TSV-en.
Feiler noe, står kilden urørt. Kjør dette skriptet etterpå for å bygge lista på nytt.
