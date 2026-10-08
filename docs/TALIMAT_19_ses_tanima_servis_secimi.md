# TALİMAT 19 — Ses tanıma: "mevcut mu" ön denetimi yüzünden engellenmesin, servisi cihazdan seç, kodu her hatada göster (flow)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00` (flow komutları). Betik YASAK; `--amend`/force-push YASAK; yalnız aşağıdaki dosyalar (+ README); "CI yeşil" demeden önce GitHub'da "completed successfully" gör. Sunucu DEĞİŞMEZ.
**Önce** `git fetch origin` + `git merge origin/claude/new-session-hrbrhq`.

## Cihaz testi (08.10.2026 03:02, Xiaomi/MIUI)
Talimat 18 sonrası mikrofona basınca "Telefonda ses tanıma hizmeti bulunamadı…" (`serviceMissing`) çıkıyor. Telefonda "Google sesle yazma" ve klavye mikrofonu ÇALIŞIYOR; yani bir ses tanıma servisi var. Muhtemel sebep: `isRecognitionAvailable()` Android'in VARSAYILAN servisine bakıyor, Xiaomi'de varsayılan boş olabilir → false → biz `supported=false` yapıp hiç denemeden engelliyoruz. Ayrıca iki hata yolu (hiç denememe / gerçek başlatma hatası) AYNI mesajı veriyor; hangisi olduğu belli değil.

## Yapılacaklar — `useFlowVoice.js`, `FlowAiHost.js`, README (çeviri değişmez)

### 1) `useFlowVoice.js`
- `isRecognitionAvailable()` sonucunu **engelleyici olarak KULLANMA**: açılıştaki `useEffect`'te `supported`'ı false yapma (yalnız `console.warn('[FlowAI voice] isRecognitionAvailable', available)` ile günlüğe yaz). `supported` her zaman `true` kalsın.
- Açılışta (Android'de) `ExpoSpeechRecognitionModule.getSpeechRecognitionServices()` çağır (paket tanımında yoksa `node_modules/expo-speech-recognition/build/*.d.ts` içinde servis listeleme işlevinin adına bak ve onu kullan; hiç yoksa bu adımı atla ve raporda yaz). Sonucu `servicesRef`'e kaydet ve `console.warn('[FlowAI voice] services', list)` yaz.
- `start()` içinde servis paketini şöyle seç: `servicesRef` içinde `com.google.android.googlequicksearchbox` varsa onu ver; yoksa liste doluysa listenin ilk paketini ver; liste boşsa ya da alınamadıysa `androidRecognitionServicePackage` seçeneğini HİÇ GÖNDERME (Android varsayılanını denesin). Seçeneği yalnız bir paket adı bulunduysa ekle.
- `start()` başarısız olursa hata nesnesine `message` ve (varsa) `code` ekle: `{ code: e.code || 'start-failed', message: e.message }`.

### 2) `FlowAiHost.js`
- Mikrofon düğmesindeki `if (voice.supported === false) { push('error', t('flowAi.voice.serviceMissing')); return; }` ön engelini KALDIR (artık gerek yok).
- `onError` mesajlarının HEPSİNİN sonuna kodu ekle: `` `${mesaj} (${err.code}${err.message ? ': ' + err.message : ''})` `` (örn. "Telefonda ses tanıma hizmeti bulunamadı… (service-not-allowed: …)"). Böylece her denemede gerçek sebep ekranda görünür.

## Kontroller (AYNEN; hepsi OK)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
```
Push; GitHub'da "completed successfully" gör. Rapor sonu: `KONTROL 19 — flow <commit>`. Yeni EAS derlemesini kullanıcı alır.
