# TALİMAT 20 — Ses tanıma: modül yanlış içe aktarılıyor (flow)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00` (flow komutları). Betik YASAK; `--amend`/force-push YASAK; yalnız aşağıdaki dosya (+ README); "CI yeşil" demeden önce GitHub'da "completed successfully" gör. Sunucu DEĞİŞMEZ.
**Önce** `git fetch origin` + `git merge origin/claude/new-session-hrbrhq`.

## Cihaz testi (08.10.2026 03:39) — gerçek hata görüldü
Mikrofona basınca: `start-failed: Cannot read property 'requestPermissionsAsync' of undefined`. Yani `ExpoSpeechRecognitionModule` **undefined**. `useFlowVoice.js` modülü **varsayılan (default) içe aktarma** ile alıyor:
`import ExpoSpeechRecognitionModule, { useSpeechRecognitionEvent } from 'expo-speech-recognition';`
Paket `ExpoSpeechRecognitionModule`'ü **adlandırılmış (named) dışa aktarım** olarak veriyor; varsayılan dışa aktarımı yok. Önceki "servis bulunamadı" / "kullanılamıyor" mesajlarının hepsi buradan çıkıyordu (her çağrı hata atıp yakalanıyordu). Servis/izin/Xiaomi teorileri YANLIŞTI.

## Yapılacaklar — yalnız `src/modules/flow_ai/useFlowVoice.js` (+ README)
1. Önce doğrula: `node_modules/expo-speech-recognition/build/index.d.ts` (ya da paketin ana giriş `.d.ts`/`.js` dosyası) içinde `export` satırlarına bak; `ExpoSpeechRecognitionModule` adlandırılmış dışa aktarım mı? Çıktıyı (ilgili `export` satırları) raporla. Farklıysa (ör. başka ad) DUR ve bildir.
2. Satırı şöyle değiştir:
```js
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
```
3. Başka hiçbir mantığa dokunma (Talimat 19'daki servis seçimi, hata kodları aynen kalsın).
4. Dosyada `ExpoSpeechRecognitionModule` kullanılan HER yerin (requestPermissionsAsync, start, abort, isRecognitionAvailable, getSpeechRecognitionServices) artık tanımlı modülü gösterdiğini `git grep -n "ExpoSpeechRecognitionModule" src` çıktısıyla göster.

## Kontroller (AYNEN; hepsi OK)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
```
Push; GitHub'da "completed successfully" gör. Rapor sonu: `KONTROL 20 — flow <commit>`. Yeni EAS derlemesini kullanıcı alır.
