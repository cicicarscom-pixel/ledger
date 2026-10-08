# TALİMAT 27 — Sesli sohbet: AppState `background` → stop → restart DÖNGÜSÜ (flow)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00` (flow komutları). Betik YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; yalnız `FlowAiHost.js` + README; "CI yeşil" demeden önce GitHub'da "completed successfully" gör; **rapor yalnız gerçekten yapılanı anlatır.** EAS derlemesi başlatma.
**Sıra:** önce `TALIMAT_26_sohbet_kaydirma.md`'yi bitir ve push et (ayrı commit), SONRA bu talimatı ayrı commit olarak yap. İkisi için tek EAS derlemesini kullanıcı alacak. `git fetch origin` + `git merge origin/claude/new-session-hrbrhq`; `main`'de başla.

## Cihaz logu (08.10.2026 08:07, `0169a1a` APK)
```
olay: audiostart → olay: start → appstate: background → olay: error (aborted) → audioend → end → appstate: active → servis listesi … (yeniden başlıyor)
```
Dinleme açılır açılmaz, kullanıcı konuşmadan Android `background` bildiriyor (Google tanıyıcısı açılırken uygulamayı kısa süre duraklatıyor). 25b'deki dinleyici bunu görüp `voiceRef.current.stop()` ile dinlemeyi KENDİSİ öldürüyor, `active`'de yeniden başlatıyor, tekrar `background` … → sonsuz döngü, ses hiç dinlenemiyor.

## Yapılacak — `FlowAiHost.js` (+ README)
Kural: **kısa süreli `background` dinlemeyi DURDURMAZ.** Yalnız uygulama 4 saniyeden uzun arka planda kalırsa sohbet kapanır.

1. Yeni ref: `const bgTimerRef = useRef(null);`. `resumeAfterBgRef` ve TÜM kullanımlarını (tanım, `exitVoiceChat` içindeki sıfırlama, dinleyici) KALDIR.
2. `exitVoiceChat` içinde (ilk satırlarda): `if (bgTimerRef.current) { clearTimeout(bgTimerRef.current); bgTimerRef.current = null; }`
3. AppState dinleyicisini AYNEN şöyle yap (`useEffect`; `startListening`'e bağımlı DEĞİL, `[push]`):
```js
useEffect(() => {
  const sub = AppState.addEventListener('change', (st) => {
    if (VOICE_DEBUG) push('assistant', '[ses] appstate: ' + st);
    if (st === 'background') {
      if (voiceChatRef.current && !bgTimerRef.current) {
        bgTimerRef.current = setTimeout(() => {
          bgTimerRef.current = null;
          exitVoiceChatRef.current?.('arkaplan-4sn');
        }, 4000);
      }
    } else if (st === 'active') {
      if (bgTimerRef.current) { clearTimeout(bgTimerRef.current); bgTimerRef.current = null; }
    }
  });
  return () => { sub.remove(); if (bgTimerRef.current) { clearTimeout(bgTimerRef.current); bgTimerRef.current = null; } };
}, [push]);
```
4. Dinleyicide `voiceRef.current.stop()` ÇAĞRISI OLMAYACAK; `startListening()` çağrısı OLMAYACAK. `VOICE_DEBUG` dokunma. Başka mantığa dokunma.
5. README "Son Güncellemeler": `08.10.2026 — Sesli sohbet: kısa süreli arka plan bildirimi dinlemeyi durdurmuyor (dinle-durdur-başlat döngüsü giderildi); 4 sn'den uzun arka planda sohbet kapanır.`

## Kontroller (AYNEN; hepsi OK)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git grep -n "resumeAfterBgRef" src
git grep -n "bgTimerRef" src/modules/flow_ai/FlowAiHost.js
git show --stat --oneline HEAD
git status -sb
```
`resumeAfterBgRef` için çıktı BOŞ olmalı; `bgTimerRef` en az 7 yerde geçmeli; `--stat` yalnız FlowAiHost.js + README.md. Rapor sonu: `KONTROL 27 — flow <commit>` (26 için ayrı `KONTROL 26 — flow <commit>`).
