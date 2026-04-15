#!/bin/bash
# Ukentlig søkeords-rapport-generator.
# Kjøres via cron/launchd hver mandag morgen.
#
# Oppsett (launchd):
#   Opprett ~/Library/LaunchAgents/no.fosen-tools.weekly-report.plist som
#   kjører denne filen f.eks. hver mandag kl 08:00.
#
# Oppsett (cron):
#   0 8 * * 1 /Users/adrianhpettersen/Downloads/Fosen\ Tools\ Analytics/scripts/weekly-report.sh
#
# Variabler (settes i .env.local eller eksport):
#   APP_URL          — default http://localhost:3000, overstyr for prod
#   SYNC_SECRET_KEY  — samme secret som /api/sync bruker

APP_URL="${APP_URL:-http://localhost:3000}"
SECRET="${SYNC_SECRET_KEY:-fosen-sync-2026}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Trigger weekly keyword report..."

RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $SECRET" \
  "$APP_URL/api/keyword-generator/weekly-report")

echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"status":"success"'; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Report generated successfully"
  exit 0
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Report generation failed"
  exit 1
fi
