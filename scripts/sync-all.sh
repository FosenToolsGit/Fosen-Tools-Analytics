#!/bin/bash
# Daglig sync av alle plattformer
# Kjøres via cron eller launchd
# Forutsetter at dev-server kjører på localhost:3000

SYNC_URL="${SYNC_URL:-http://localhost:3000/api/sync}"
SYNC_SECRET="${SYNC_SECRET_KEY:?SYNC_SECRET_KEY må settes (f.eks. i .env.local eller via export) — ingen hardkodet default}"

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
