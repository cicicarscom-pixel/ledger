# TALIMAT 53b — flow: ses tanıma modülü yoksa uygulama çökmesin (hazır yama)

**Depo:** flow (mobil). **Başlangıç:** `origin/main` (K1 çıktıları rapora). **Yama:** `docs/patches/53b-flow-ses-modulu-koruma.patch` (ledger deposu, `claude/new-session-hrbrhq`).

## Neden
Cihazda kırmızı ekran: `Cannot find native module 'ExpoSpeechRecognition'`. `src/modules/flow_ai/useFlowVoice.js` modülü dosya başında import ediyor; APK'da native modül yoksa bütün uygulama açılışta çöküyor. Yama, modülü korumalı yükler: yoksa yalnız sesli komut devre dışı kalır, uygulama açılır.

## Yapılacaklar
1. K1 başlangıç komutları.
2. `git am --3way docs/patches/53b-flow-ses-modulu-koruma.patch` (içerik değiştirilmez; başka dosyaya dokunulmaz).
3. Kontroller (hepsi `OK`):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
```
4. K4 push + CI yeşil.
5. **Derleme yapma** — kullanıcı isterse yapılır. README güncellemesi bu yamada yok; rapora yaz.

## Not (rapora yaz)
Kırmızı kutu (DISMISS/RELOAD) yalnız debug/development derlemesinde çıkar. Cihazdaki APK'nın hangi EAS profilinden (`development` mı `preview` mı) ve hangi commit'ten geldiğini derleme sayfasından rapora ekle.
