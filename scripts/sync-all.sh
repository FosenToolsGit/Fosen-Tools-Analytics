#!/bin/bash
# Daglig sync av alle plattformer
# Kjøres via cron eller launchd
# Forutsetter at dev-server kjører på localhost:3000

SYNC_URL="http://localhost:3000/api/sync"
SYNC_SECRET="fosen-sync-2026"

echo "[$(date)] Synkroniserer alle plattformer..."

RESULT=$(curl -s -X POST "$SYNC_URL" \
  -H "Authorization: Bearer $SYNC_SECRET" \
  -H "Content-Type: application/json" \
  --max-time 120)

if [ $? -eq 0 ]; then
  echo "[$(date)] Resultat: $RESULT"
else
  echo "[$(date)] FEIL: Kunne ikke koble til $SYNC_URL"
fi
