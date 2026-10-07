# TALİMAT 18 — Ses tanıma: gerçek hata kodunu göster, kullanılabilirliği denetle (flow)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00` (flow komutları). Betik YASAK; `--amend`/force-push YASAK; yalnız aşağıdaki dosyalar (+ README); "CI yeşil" demeden önce GitHub'da "completed successfully" gör. Sunucu DEĞİŞMEZ.
**Önce** `git fetch origin` + `git merge origin/claude/new-session-hrbrhq`.

## Cihaz testi (08.10.2026 02:12)
Yeni APK açılıyor, mikrofon düğmesi görünüyor; basınca "Bu cihazda ses tanıma kullanılamıyor." çıkıyor ve izin penceresi çıkmıyor. Bu mesaj `FlowAiHost.js`'te **izin dışındaki HER hatada** gösteriliyor; gerçek sebep (servis yok, dil yok, izin, ağ...) belli değil. Önce sebebi görünür kıl, sonra servis paketini açıkça ver.

## Yapılacaklar — `src/modules/flow_ai/useFlowVoice.js`, `FlowAiHost.js`, çeviriler, README

### 1) `useFlowVoice.js`
- `supported` durumunu gerçek yap: bileşen açılırken `useEffect` içinde `ExpoSpeechRecognitionModule.isRecognitionAvailable()` çağır; `false` dönerse `setSupported(false)`; çağrı hata verirse `setSupported(false)` ve `console.warn`.
- `useSpeechRecognitionEvent('error', ...)` işleyicisinde `event.error` (kod) ve `event.message` değerlerini **birlikte** ilet: `errorCallbackRef.current({ code: event.error, message: event.message })`. `start` içindeki `catch` ve izin reddi de aynı biçimde `{ code: 'permission' }` / `{ code: 'start-failed', message: e.message }` ile çağırsın. (`onError` artık nesne alır.)
- `ExpoSpeechRecognitionModule.start({...})` seçeneklerine ekle: `androidRecognitionServicePackage: 'com.google.android.googlequicksearchbox'`. Paket sürümünde bu seçenek adı farklıysa paketin TypeScript tanımına (`node_modules/expo-speech-recognition/build/*.d.ts`) bak, doğru adı kullan; seçenek yoksa EKLEME ve raporda yaz.
- Hata kodu `no-speech` ve `aborted` ise `onError` ÇAĞIRMA (kullanıcı sustu ya da kendisi durdurdu; sessiz geç).

### 2) `FlowAiHost.js` — `onError` işleyicisi (mikrofon düğmesi)
`err.code` değerine göre mesaj:
- `permission` ya da `not-allowed` → `t('flowAi.voice.permissionDenied')`
- `service-not-allowed` ya da `start-failed` ya da `supported === false` → `t('flowAi.voice.serviceMissing')`
- `language-not-supported` → `t('flowAi.voice.languageMissing')`
- `network` → `t('flowAi.voice.network')`
- diğerleri → `t('flowAi.voice.unsupported')` + sonuna ` (${err.code})` ekle.
Her durumda mesajın sonuna `console.warn('[FlowAI voice]', err)` ile günlüğe yaz. Mikrofon düğmesini `voice.supported === false` iken GİZLEME (kullanıcı basınca nedenini görsün); bu durumda basınca doğrudan `serviceMissing` mesajı göster.

### 3) Çeviriler `flowAi.voice.*` (tr/en/de birlikte)
- tr: `serviceMissing` "Telefonda ses tanıma hizmeti bulunamadı. Google uygulamasının kurulu ve etkin olduğundan emin olun.", `languageMissing` "Türkçe ses tanıma paketi yüklü değil. Ayarlardan Türkçe dil paketini indirin.", `network` "Ses tanıma için internet bağlantısı gerekiyor."
- en: "Speech recognition service was not found. Make sure the Google app is installed and enabled.", "The speech language pack is not installed. Download it in settings.", "Speech recognition needs an internet connection."
- de: "Der Spracherkennungsdienst wurde nicht gefunden. Stellen Sie sicher, dass die Google-App installiert und aktiviert ist.", "Das Sprachpaket ist nicht installiert. Laden Sie es in den Einstellungen herunter.", "Die Spracherkennung benötigt eine Internetverbindung."
README "Son Güncellemeler"e 08.10.2026 tarihli kısa madde.

## Kontroller (AYNEN; hepsi OK)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
```
Push; GitHub'da "completed successfully" gör. Rapor sonu: `KONTROL 18 — flow <commit>`. Yeni EAS derlemesini kullanıcı alır (yerel modül davranışı değişmez ama JS paketi yeniden derlenir).
