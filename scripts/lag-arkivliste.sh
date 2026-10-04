#!/bin/bash
# Bygger arkivlista fra TSV-en på T7 og legger identisk kopi begge steder.
TSV="/Volumes/T7/Fosen Tools - arkiv/HVOR-LIGGER-TINGENE.tsv"
REPO="$HOME/Downloads/Fosen Tools Apper/Fosen Tools Analytics/docs/arkiv-paa-t7.md"
T7MD="/Volumes/T7/Fosen Tools - arkiv/HVOR-LIGGER-TINGENE.md"
[ -f "$TSV" ] || { echo "finner ikke $TSV — er T7 tilkoblet?"; exit 1; }
{
  echo "# Arkiv på ekstern disk (Samsung T7)"
  echo
  echo "Filer som er flyttet av maskinen for å frigjøre plass. **Les denne før du leter.**"
  echo
  echo "Oppdatert $(date +%-d.\ %B\ %Y) · disken heter \`T7\`, exFAT · lista finnes to steder:"
  echo "\`docs/arkiv-paa-t7.md\` i repoet og \`Fosen Tools - arkiv/HVOR-LIGGER-TINGENE.md\` på disken."
  echo
  echo "## Struktur på T7"
  echo
  echo "| Mappe | Innhold |"
  echo "|---|---|"
  echo "| \`FT Aviation/Render - FTA Studio/\` | 62 FTA-videoer, augustlanseringen + F-35 docking |"
  echo "| \`Fosen Tools - arkiv/Bilder og media/\` | Det som lå som \`Fosen Tools/\` inne i repoet: Bilder, Ferdig, FTAviation, Maler |"
  echo "| \`Fosen Tools - arkiv/Render - Analytics out/\` | 883 foto + 76 reels fra Remotion, deriblant publiserte |"
  echo "| \`Fosen Tools - arkiv/Trucket-Hat V1/\` | Capsprosjektet, blend-filer og renders |"
  echo "| \`Fosen Tools - arkiv/Kundeprosjekter/\` | Fjord Helikopter, Kunder Q3, Polypus, Arctic Aviation, Helge Olden |"
  echo "| \`Fosen Tools - arkiv/worktree-patcher/\` | To ukommitterte endringer reddet fra slettede worktrees |"
  echo "| \`Fosen Tools - arkiv/Skrivebord-arkiv 2026-10-03/\` | 119 eldre skrivebordsposter (endret før 21. sept), sortert i tema. Fil-for-fil-liste i \`INNHOLD.tsv\` i samme mappe |"
  echo "| \`Privat og andre prosjekter/\` | Alt privat: Bilder 2001-2004, private nedlastinger (Nedlastinger-arkiv 2026-10-04, Nedlastninger 10.04.26), Shadowoaths, musikk, skole |"
  echo "| \`Usortert - ukjent om FT eller privat/\` | Kamerabilder, skjermbilder og tallnavn fra Nedlastinger som ikke kunne plasseres. Sortert på filtype |"
  echo "| \`Fosen Tools - arkiv/Nedlastinger-arkiv 2026-10-04/\` og \`…/Nedlastninger 10.04.26/\` | FT-filer fra Nedlastinger, sortert på filtype. Fil-for-fil i \`MANIFEST-nedlastinger-2026-10-04.tsv\` på T7-roten |"
  echo "| \`Hundo Hunter/\` | Hundo Hunter-renders + gamle Xcode-arkivbygg (\`hh-build-gamle-arkivbygg\`) |"
  echo "| \`CNC/OVERFØRT/\` | Overføringsmappe for CNC — urørt |"
  echo "| \`OVERSIKT.html\` (T7-roten) | Søkbar oversikt over alt, bygges av \`scripts/lag-t7-oversikt.py\` |"
  echo
  echo "## Hva ligger hvor"
  echo
  echo "| Flyttet fra | Ligger nå på T7 | Str. | Filer |"
  echo "|---|---|---:|---:|"
  tail -n +2 "$TSV" | while IFS=$'\t' read -r d fra til str filer notat; do
    printf '| `%s` | `%s` | %s | %s |\n' "$fra" "$til" "$str" "$filer"
  done
  echo
  echo "## Slettet, ikke flyttet"
  echo
  echo "Gjenskapes lokalt, derfor ikke arkivert: tre \`.next\`-byggecacher (8,2 GB),"
  echo "fem \`node_modules\` (3,0 GB, alle prosjekter har \`package-lock.json\`), og to"
  echo "git-worktrees som var fullt merget inn i main (1,6 GB)."
  echo
  echo "**Kjør \`npm install\` før neste \`npm run dev\`.**"
  echo
  echo "## Å være klar over"
  echo
  echo "- **\`out/\` er aldri bare cache.** Både \`FTA Studio/out\` og \`Analytics/out\` ble først"
  echo "  ført opp som byggeartefakter. Begge inneholdt publiserte videoer som ikke fantes"
  echo "  andre steder. Sjekk innholdet før noe slettes."
  echo "- Fire \`_tmp-\`-scripts peker inn i den gamle \`Fosen Tools/\`-stien og brekker uten"
  echo "  T7 tilkoblet: \`_tmp-samle-og\`, \`_tmp-liminn-hjul\`, \`_tmp-ref-revisjon\`,"
  echo "  \`_tmp-hjul-ombygg-sjekk\`. Engangsscripts, ikke produksjonspipeline."
  echo "- \`Logoer/\` og \`Fosen Tools Nettside Utsende/\` ble bevisst liggende lokalt."
  echo "  De brukes av kode som kjører jevnlig."
  echo "- Det lå en \`Fosen Tools/\`-mappe på 21 GB på T7 fra før, ved siden av"
  echo "  \`Fosen Tools - arkiv/\`. Ikke rørt. Kan inneholde overlapp, verdt en sammenligning."
  echo
  echo "## Framgangsmåte ved flytting"
  echo
  echo "\`/tmp/flytt.sh <kilde> <mål> [notat]\`: rsync kopierer, så verifiseres filantall og"
  echo "md5 på de tolv største filene, **først da slettes kilden**, og linja føres i TSV-en."
  echo "Feiler noe, står kilden urørt. Kjør dette skriptet etterpå for å bygge lista på nytt."
} > "$REPO"
cp "$REPO" "$T7MD"
echo "  skrevet: docs/arkiv-paa-t7.md  ($(wc -l < "$REPO" | tr -d ' ') linjer)"
echo "  kopi   : $T7MD"
