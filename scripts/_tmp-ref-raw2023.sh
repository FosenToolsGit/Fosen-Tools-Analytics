#!/bin/bash
# Konverterer RAW til JPG for 2023-mappene og lager kontaktark per prosjekt.
#
# Mapper som allerede har like mange JPG som ARW hoppes over, for da er
# eksporten gjort før. Utfila per prosjekt heter /tmp/a23-NN.jpg, og
# kildebildene havner i /tmp/r23/NN slik at ref-bilder.mjs kan peke dit siden.
set -u
B="/Volumes/01-Fosen Tools/Bilder/2023"
ROT="out/r23"
LOGG="out/r23/logg.txt"
mkdir -p "$ROT"
: > "$LOGG"

mapper=(
"01 - Vamec - Verktøyvogn" "01 - VBRT - Strørdal Kommune" "02 - Babcock"
"03 - Rædergård Entr. AS - Hullsagkoffert PACKOUT" "03 - StreamHub" "03 - TTT-Rubix - Pelicase"
"04 - Brage Skånøy" "04 - Molde Jarn, NOV - PC-koffert" "04 - StreamHub" "04 - Ørland Kommune"
"06 - Coca Cola AS - FTLAuto06" "06 - Dykkerteknikk AS" "06 - Equinor"
"06 - Langø Service - TESLA MOD Y" "06 - Rumble MC" "06 - StreamHub"
"07 - Molde Jarnvare NOV - Opti-AllWeather" "08 - C3 Security AS" "08 - Fosen VGS Flyfag"
"09 - Artic Sapphire - Milwaukee CUSTOM" "09 - Prøven Transport" "10 - Fosen VGS - Flyfag"
"10 - Milwaukee Batteri HDFI" "10 - Trygg Grunn" "10 - Widerøe Technical Services AS - Verktøykasse"
"12 - Autosenteret Sveberg" "12 - Bremanger Kommune - Ordførerkjede"
"12 - Langø Service - Xpeng G9" "12 - Streamhub"
)

i=0
for m in "${mapper[@]}"; do
  i=$((i+1))
  nr=$(printf "%02d" $i)
  kilde="$B/$m"
  [ -d "$kilde" ] || { echo "$nr  MANGLER  $m" >> "$LOGG"; continue; }

  arw=$(find "$kilde" -type f -iname '*.arw' | wc -l | tr -d ' ')
  jpg=$(find "$kilde" -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) | wc -l | tr -d ' ')

  if [ "$jpg" -ge "$arw" ] && [ "$jpg" -gt 0 ]; then
    bruk="$kilde"                     # eksporten finnes allerede
    echo "$nr  JPG      $jpg stk   $m" >> "$LOGG"
  else
    bruk="$ROT/$nr"
    mkdir -p "$bruk"
    n=0
    while IFS= read -r f; do
      navn=$(basename "$f"); navn="${navn%.*}"
      [ -f "$bruk/$navn.jpg" ] || sips -s format jpeg "$f" --out "$bruk/$navn.jpg" >/dev/null 2>&1
      n=$((n+1))
    done < <(find "$kilde" -type f -iname '*.arw' | sort)
    echo "$nr  KONVERT  $n stk    $m" >> "$LOGG"
  fi

  node scripts/_tmp-ref-kontaktark.mjs "$bruk" "out/r23/ark-$nr.jpg" >/dev/null 2>&1 \
    && echo "$nr  ARK OK" >> "$LOGG" || echo "$nr  ARK FEILET" >> "$LOGG"
done

echo "FERDIG" >> "$LOGG"
