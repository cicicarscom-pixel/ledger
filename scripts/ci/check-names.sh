#!/usr/bin/env bash
# Tanımsız isim + sözdizimi kontrolü (CI ve yerel). Kullanım: bash scripts/ci/check-names.sh <kök klasörler...>
set -uo pipefail
FILES=$(git -c core.quotepath=off ls-files -- "$@" | grep -E '\.(js|jsx|ts|tsx)$' | grep -vE '\.d\.ts$|\.test\.ts$|(^|/)node_modules/')
COUNT=$(echo "$FILES" | grep -c . || true)
if [ "$COUNT" -eq 0 ]; then echo "HATA: kontrol edilecek dosya bulunamadı"; exit 2; fi
echo "Kontrol edilen dosya: $COUNT"
npx -y -p typescript@5.9.3 tsc --noEmit --allowJs --checkJs --jsx react-jsx --target es2022 \
  --module esnext --moduleResolution bundler --skipLibCheck --lib es2022,dom,dom.iterable ${EXTRA_TSC_FLAGS:-} $FILES > /tmp/tsc-out.txt 2>&1
# Bilinmeyen seçenek / bulunamayan dosya = kontrol HİÇ çalışmadı (TS5023/5024/5025/6053)
if grep -qE "error TS(5023|5024|5025|6053)" /tmp/tsc-out.txt; then grep -E "error TS(5023|5024|5025|6053)" /tmp/tsc-out.txt; echo "HATA: tsc çalışmadı"; exit 2; fi
BAD=$(grep -E "error TS(2304|2552|18004|2451|1005|1109|1128|1161|17002|17008)" /tmp/tsc-out.txt | grep -vE "Cannot find name '(Deno|global)'" || true)
# Bulunamayan göreli KOD modülü (ör. yanlış '../../../lib/dates'). Görseller check-assets.mjs'de.
MOD=$(grep -E "error TS2307: Cannot find module '\.\.?/" /tmp/tsc-out.txt | grep -vE "\.(png|jpe?g|gif|webp|svg|mp4|mov|mp3|wav|ttf|otf|json|css)'" || true)
if [ -n "$BAD$MOD" ]; then printf '%s\n%s\n' "$BAD" "$MOD" | sed '/^$/d'; echo "HATA: tanımsız isim, sözdizimi ya da bulunamayan modül"; exit 1; fi
echo "OK: tanımsız isim, sözdizimi ve bulunamayan modül hatası yok"
