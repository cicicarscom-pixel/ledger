# TALİMAT 24 — Sesli sohbet "1 sn dinliyor, kapanıyor": tanı izi + olası sebep düzeltmesi (flow)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00` (flow komutları). Betik YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; yalnız aşağıdaki dosyalar (+ README); "CI yeşil" demeden önce GitHub'da "completed successfully" gör. EAS derlemesi başlatma.
**Önce** `git fetch origin` + `git merge origin/claude/new-session-hrbrhq`.

## Cihaz testi (08.10.2026 06:00)
`b20f503` APK'sında mikrofona basınca "Dinliyorum…" ~1 sn görünüyor, sonra panel eski haline dönüyor; tekrar basınca aynı. Hata mesajı görünmüyor. Yani sohbet SESSİZCE kapanıyor (olası yollar: ikinci `no-speech` sessizliği → kapanış, AppState `inactive`, bir STT hatası, ya da yanlış servis paketi). Sebebi tahmin etmek yerine **ekranda görünür tanı izi** ekle ve en olası iki sebebi düzelt.

## Yapılacaklar — `useFlowVoice.js`, `FlowAiHost.js` (+ README)

### 1) `FlowAiHost.js` — görünür tanı izi (geçici)
- Dosyanın başına `const VOICE_DEBUG = true;` (bu derleme için; sonra false yapılacak).
- `exitVoiceChat` imzası `exitVoiceChat(reason)`: `VOICE_DEBUG` ve `voiceChatRef.current` doğruyken, sohbete bir satır yaz: `push('assistant', '[ses] kapandı: ' + (reason || 'bilinmiyor'))`. Çağrı yerleri sebep versin:
  - "Bitir" düğmesi → `'bitir-dugmesi'`; bitirme sözü → `'bitirme-sozu'`; `handleSilence` ikinci sessizlik → `'sessizlik-x2'`; `handleVoiceError` → `'hata:' + err.code`; AppState → `'appstate:' + st`; `[open]` kapanışı → `'panel-kapandi'`; unmount → `'unmount'`; yazıyla gönderim → `'yazildi'`.
  - `exitVoiceChatRef.current?.('...')` çağrıları sebep argümanı geçsin. `speakThen(..., exitVoiceChat)` kullanımlarını `() => exitVoiceChat('...')` olarak sar.
- AppState dinleyicisinde `VOICE_DEBUG` ise HER değişimi yaz: `push('assistant', '[ses] appstate: ' + st)`.
- `startListening` içinde `VOICE_DEBUG` ise `voice.start({... , onTrace: (m) => push('assistant', '[ses] ' + m)})`.

### 2) `useFlowVoice.js` — iz ve servis seçimi
- `start({ ..., onTrace })`: `traceRef.current = onTrace`.
- Şu olayları dinleyip `traceRef.current?.(...)` ile yaz: `start`, `audiostart`, `speechstart`, `speechend`, `audioend`, `end`, `result` (`isFinal` ve metnin ilk 25 karakteri), `error` (`event.error` + `event.message`). (`useSpeechRecognitionEvent('audiostart' | 'speechstart' | 'speechend' | 'audioend', ...)`; paketin tipinde adlar farklıysa `.d.ts`'ye bak ve doğru adları kullan.)
- `start()` içinde, `ExpoSpeechRecognitionModule.start` çağrısından ÖNCE iz: `'servis listesi: ' + JSON.stringify(servicesRef.current)` ve `'seçilen paket: ' + (options.androidRecognitionServicePackage || 'varsayılan')`.
- **Düzeltme A (en olası sebep):** Servis seçiminde `list[0]` yedeğini KALDIR. Yalnız liste `com.google.android.googlequicksearchbox` içeriyorsa o paketi ver; aksi halde `androidRecognitionServicePackage`'ı HİÇ gönderme (Android varsayılanı denesin). Şu an listedeki ilk paket (ör. bir TTS ya da üretici servisi) yanlış bir servis olabilir ve hemen `no-speech` döndürebilir.
- **Düzeltme B:** `start()` çağrısı anını `startedAtRef.current = Date.now()` olarak tut. `no-speech` hatası geldiğinde `Date.now() - startedAtRef.current < 1500` ise (servis hemen vazgeçti) bunu "sessizlik" sayma; `onError({ code: 'hemen-sessizlik', message: 'paket: ' + (seçilen paket || 'varsayılan') })` çağır (sohbet bu hata ile kapanır ve nedeni iz satırında görünür). 1500 ms üstündeki `no-speech` mevcut davranışla (`onSilence`) devam etsin.

## Kontroller (AYNEN; hepsi OK)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
node -e "for (const f of ['src/modules/flow_ai/FlowAiHost.js','src/modules/flow_ai/useFlowVoice.js']) { require('@babel/parser').parse(require('fs').readFileSync(f,'utf8'),{sourceType:'module',plugins:['jsx']}); console.log('PARSE OK', f); }"
git grep -n "list\[0\]" src/modules/flow_ai/useFlowVoice.js
git status -sb
```
`git grep list[0]` boş olmalı; `git status -sb` temiz olmalı (yedek dosya YOK). Push; GitHub'da "completed successfully" gör. Rapor sonu: `KONTROL 24 — flow <commit>`. Yeni EAS derlemesini kullanıcı alır; kullanıcı sohbetteki `[ses] ...` satırlarını gönderecek.
