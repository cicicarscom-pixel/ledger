#!/bin/bash
set -euo pipefail

# Örnek cron satırı:
# */5 * * * * /opt/waha-metrics-cron.sh

SERVER_ID="${SERVER_ID:-}"
METRICS_SECRET="${METRICS_SECRET:-}"
INGEST_URL="${INGEST_URL:-https://qybzidylewzsnmlofjul.supabase.co/functions/v1/waha-metrics-ingest}"
WAHA_CONTAINER="${WAHA_CONTAINER:-waha}"

if [ -z "$SERVER_ID" ] || [ -z "$METRICS_SECRET" ]; then
  logger -t waha-metrics "Hata: SERVER_ID veya METRICS_SECRET ayarlanmamis."
  exit 1
fi

cpu_raw=$(docker stats --no-stream --format '{{.CPUPerc}}' "$WAHA_CONTAINER" || echo "0%")
cpu_percent=$(echo "$cpu_raw" | sed 's/%//')

mem_total=$(free -m | awk '/^Mem:/{print $2}')
mem_used=$(free -m | awk '/^Mem:/{print $3}')
ts=$(date +%s)

BODY=$(printf '{"serverId":"%s","ts":%d,"cpuPercent":%s,"memUsedMb":%d,"memTotalMb":%d}' "$SERVER_ID" "$ts" "$cpu_percent" "$mem_used" "$mem_total")
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$METRICS_SECRET" -hex | awk '{print $NF}')

set +e
http_code=$(curl -sS --max-time 10 -o /dev/null -w "%{http_code}" -X POST "$INGEST_URL" \
  -H 'Content-Type: application/json' \
  -H "X-Metrics-Signature: $SIG" \
  -d "$BODY")
curl_exit=$?
set -e

if [ $curl_exit -ne 0 ]; then
  logger -t waha-metrics "Hata: curl basarisiz oldu (cikis kodu: $curl_exit)"
  exit 1
fi

if [ "$http_code" -ne 200 ]; then
  logger -t waha-metrics "Hata: Ingest servisi HTTP $http_code dondurdu."
else
  logger -t waha-metrics "Basarili: Metrikler gonderildi."
fi
