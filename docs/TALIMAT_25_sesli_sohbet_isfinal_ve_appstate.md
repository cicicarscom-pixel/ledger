# TALİMAT 25 — Sesli sohbet: `isFinal` yanlış okunuyor + AppState arka plana geçince sohbet kapanıyor (flow)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00` (flow komutları). Betik YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; yalnız aşağıdaki dosyalar (+ README); "CI yeşil" demeden önce GitHub'da "completed successfully" gör. EAS derlemesi başlatma.
**Önce** `git fetch origin` + `git merge origin/claude/new-session-hrbrhq`.

## Cihaz logu (08.10.2026 07:02, `f390666` APK) — gerçek olay dizisi
```
servis listesi: ["com.google.android.googlequicksearchbox","com.anthropic.claude"]
seçilen paket: com.google.android.googlequicksearchbox
olay: audiostart, start, speechstart, speechend
olay: result (isFinal: undefined) deneme        <-- tanıma ÇALIŞIYOR, "deneme" duyuldu
olay: audioend, end
appstate: background                              <-- uygulama arka plana düştü
kapandı: appstate:background                      <-- sohbet bu yüzden kapandı
olay: error (aborted ...), audioend, end          <-- exit'in abort()'u
```
İkinci basışta: `start` → `error (no-speech)` (kullanıcı konuşmadı; beklenen).

## Sonuç (tahmin değil, logdan)
1. **Tanıyıcı sağlam.** Servis ve paket doğru; konuşma metne çevriliyor. Sorun telefon/servis değil, bizim kod.
2. **Hata 1 — `isFinal` yanlış yerden okunuyor.** Paketin tipi (`ExpoSpeechRecognitionResultEvent = { isFinal: boolean; results: [...] }`): `isFinal` **olayın kendisinde**, `results[0]` içinde DEĞİL. Kod `event.results[0].isFinal` okuyor → hep `undefined` → hiçbir sonuç "final" sayılmıyor → `onFinal` hiç çağrılmıyor → söylenen cümle ASLA gönderilmiyor.
3. **Hata 2 — AppState `background` sohbeti kapatıyor.** Tanıma bittikten hemen sonra Android bir an `background` bildiriyor (Google tanıyıcısı/sistem katmanı etkinliği kısa süre duraklatıyor). Bizim dinleyici bunu "kullanıcı uygulamadan çıktı" sayıp sohbeti öldürüyor. Bu durumda sohbet kapanmamalı; dinleme durmalı, uygulama öne dönünce devam etmeli.

## Yapılacaklar — `useFlowVoice.js`, `FlowAiHost.js` (+ README)

### 1) `useFlowVoice.js`
- Yeni ref'ler: `lastTranscriptRef = useRef('')`, `finalDeliveredRef = useRef(false)`.
- `start()` başında ikisini sıfırla: `lastTranscriptRef.current = ''; finalDeliveredRef.current = false;`.
- `result` olay işleyicisini şöyle düzelt:
  - `const r = event.results?.[0]; if (!r) return;`
  - Trace satırında `isFinal` için **`event.isFinal`** yaz (`'olay: result (isFinal: ' + event.isFinal + ') ...'`).
  - `lastTranscriptRef.current = r.transcript || '';`
  - `if (event.isFinal)` → `finalDeliveredRef.current = true; setListening(false);` ve `startCallbackRef.current?.((r.transcript || '').trim())`. Aksi halde `partialCallbackRef.current?.(r.transcript)`.
- **Yedek (final gelmeyen cihazlar için):** `end` olay işleyicisinde, `trace`'ten sonra: `if (!finalDeliveredRef.current && lastTranscriptRef.current.trim())` → `finalDeliveredRef.current = true; const txt = lastTranscriptRef.current.trim(); lastTranscriptRef.current = ''; startCallbackRef.current?.(txt);`. (`stop()` ile elle durdurulan oturumda metin gönderilmesin: `stop()` içinde `finalDeliveredRef.current = true;` yap, sonra `abort()`.)
- `error` işleyicisine dokunma (`aborted` zaten yutuluyor).

### 2) `FlowAiHost.js` — AppState: kapatma, duraklat-ve-sürdür
- Yeni ref: `resumeAfterBgRef = useRef(false)`.
- `latest.current` atamasına `voicePhase` ekle (`latest.current = { ..., voicePhase }`).
- AppState dinleyicisini şöyle değiştir (mevcut `exitVoiceChatRef.current?.('appstate:' + st)` KALDIRILIR):
  ```js
  const sub = AppState.addEventListener('change', (st) => {
    if (VOICE_DEBUG) push('assistant', '[ses] appstate: ' + st);
    if (!voiceChatRef.current) return;
    if (st === 'background') {
      if (latest.current.voicePhase === 'LISTENING') {
        resumeAfterBgRef.current = true;
        voiceRef.current.stop();
      }
    } else if (st === 'active') {
      if (resumeAfterBgRef.current) {
        resumeAfterBgRef.current = false;
        startListening();
      }
    }
  });
  ```
  (`inactive` için hiçbir şey yapma.) Bağımlılık dizisi: `[push, startListening]` — `startListening` bu dosyada daha aşağıda tanımlı olduğundan, dinleyiciyi `startListening` tanımından SONRAYA taşı (tanımsız değişken hatası olmasın; `check-names` bunu yakalar).
- `exitVoiceChat` içinde `resumeAfterBgRef.current = false;` ekle (çıkışta bekleyen devam isteği silinsin).
- `VOICE_DEBUG = true` KALSIN (bu derlemede ikinci doğrulama; sonraki talimatta kapatılacak).
- Başka hiçbir mantığa dokunma.

### 3) README
`README.md` → "Son Güncellemeler": `08.10.2026 — Sesli sohbet: konuşma sonucu ("isFinal") doğru okunuyor; uygulama kısa süre arka plana geçince sohbet kapanmıyor, dinleme duraklayıp sürüyor.`

## Kontroller (AYNEN; hepsi OK)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
node -e "for (const f of ['src/modules/flow_ai/FlowAiHost.js','src/modules/flow_ai/useFlowVoice.js']) { require('@babel/parser').parse(require('fs').readFileSync(f,'utf8'),{sourceType:'module',plugins:['jsx']}); console.log('PARSE OK', f); }"
git grep -n "results\[0\]?*\.isFinal" src/modules/flow_ai/useFlowVoice.js
git grep -n "appstate:' + st" src/modules/flow_ai/FlowAiHost.js
git status -sb
```
İki `git grep` de BOŞ olmalı (eski okuma ve eski kapatma çağrısı kalmamış). `git status -sb` temiz. Push; GitHub'da "completed successfully" gör. Rapor sonu: `KONTROL 25 — flow <commit>`. Yeni EAS derlemesini kullanıcı alır.

## Kullanıcı testi (derleme sonrası)
Mikrofona bas → "bugün kimlerin randevusu var" de → cümle sohbette görünmeli, yanıt sesli okunmalı, ardından otomatik dinlemeye dönmeli → "bitir" de. Takılırsa yine `[ses]` satırlarının ekran görüntüsü.

---

# 25b — EK DÜZELTME (KONTROL 25 `c3f1759` RET sonrası; 25'in eksik kalan kısımları)

Claude'un `c3f1759` diff incelemesi: yalnız `event.isFinal` düzeltmesi ve `resumeAfterBgRef` tanımı/sıfırlaması yapılmış. **Yapılmayanlar (rapor "yapıldı" demişti):**
- AppState dinleyicisi SİLİNMİŞ, yenisi EKLENMEMİŞ (`resumeAfterBgRef` hiç kullanılmıyor; `latest.current.voicePhase` okunmuyor). Talimat "duraklat ve sürdür" istiyordu.
- `useFlowVoice.js` `end` yedeği (`lastTranscriptRef`/`finalDeliveredRef`) YOK.
- README güncellenmemiş (`--stat` yalnız 2 dosya gösteriyor).
Rapor yalnız gerçekten yapılanı anlatır (K10). Aynı dalda yeni commit ile tamamla (amend/force YASAK):

1. `FlowAiHost.js`: Talimat 25 §2'deki AppState dinleyicisini AYNEN ekle — `startListening` tanımından SONRA bir `useEffect`; `background` ve `LISTENING` ise `resumeAfterBgRef.current = true; voiceRef.current.stop();`, `active` ve `resumeAfterBgRef.current` ise sıfırla + `startListening()`; `inactive`'e dokunma; ilk satırda `VOICE_DEBUG` ise `[ses] appstate: <st>` izi; bağımlılık `[push, startListening]`. Dinleyici `exitVoiceChat` ÇAĞIRMAZ.
2. `useFlowVoice.js`: §1'deki `lastTranscriptRef`, `finalDeliveredRef`, `start()` başında sıfırlama, `result`'ta `lastTranscriptRef.current = result.transcript || ''` ve final'de `finalDeliveredRef.current = true`, `end` olayında yedek teslim, `stop()`'ta `finalDeliveredRef.current = true` — AYNEN.
3. `README.md` "Son Güncellemeler" satırı (§3).
4. Kontroller: Talimat 25'teki liste + ek olarak şu üç komutun ÇIKTISI rapora yapıştırılacak:
```
git grep -n "resumeAfterBgRef" src/modules/flow_ai/FlowAiHost.js
git grep -n "finalDeliveredRef" src/modules/flow_ai/useFlowVoice.js
git show --stat --oneline HEAD
```
`resumeAfterBgRef` en az 4 yerde (tanım, exit sıfırlama, dinleyici set, dinleyici sürdür), `finalDeliveredRef` en az 5 yerde geçmeli; `--stat` 3 dosya göstermeli (FlowAiHost.js, useFlowVoice.js, README.md). Rapor sonu: `KONTROL 25b — flow <commit>`. EAS derlemesi başlatma.
