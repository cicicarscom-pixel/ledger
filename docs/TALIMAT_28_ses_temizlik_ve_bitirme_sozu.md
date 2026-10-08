# TALİMAT 28 — Sesli sohbet: iz satırlarını kapat, girintiyi düzelt, bitirme sözünü esnet (flow)

Hazırlayan: Claude, 08.10.2026. Ortak kurallar: `TALIMAT_00` (flow komutları). Betik YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; yalnız `FlowAiHost.js` + README; "CI yeşil" demeden önce GitHub'da "completed successfully" gör; **rapor yalnız gerçekten yapılanı anlatır.** EAS derlemesi başlatma. `git fetch origin` + `git merge origin/claude/new-session-hrbrhq`; `main`'de başla.

## Cihaz testi (08.10.2026 08:51, `20dab3e` APK)
Sesli sohbet çalışıyor: cümle tanınıyor, gönderiliyor, yanıt geliyor, dinleme otomatik yeniden açılıyor. Eksik: **"Tamam bitir" dendiğinde sohbet kapanmadı** (cümle yapay zekâya normal mesaj gitti). Sebep: `END.includes(norm)` yalnız TAM eşleşme.

## Yapılacak — `FlowAiHost.js` (+ README), 3 ayrı küçük iş, TEK commit
1. **`VOICE_DEBUG`'ı `false` yap** (`const VOICE_DEBUG = false;`). Başka hiçbir iz koduna dokunma.
2. **Girinti:** AppState `useEffect` bloğu (`bgTimerRef` dinleyicisi) komşu bloklarla aynı 2 boşluk girintisine getirilsin (yalnız boşluk; mantık değişmeyecek); `exitVoiceChat` içindeki `resumeAfterBgRef` kalıntısı olan boş/boşluklu satır silinsin.
3. **Bitirme sözü:** `handleVoiceFinal` içindeki `END` kontrolünü şu mantıkla değiştir:
```js
const words = norm.split(/\s+/).filter(Boolean);
const END_WORDS = ['bitir', 'kapat', 'çıkış', 'görüşürüz', 'dur'];
const isEnd = words.length > 0 && words.length <= 4 && words.some((w) => END_WORDS.includes(w));
if (isEnd) {
  speakThen(t('flowAi.voice.chat.closedByUser'), () => exitVoiceChatRef.current?.('bitirme-sozu'));
  return;
}
```
   (`norm` zaten küçük harf/noktalamasız; "tamam bitir", "sohbeti bitir", "kapat artık" kapanır; 5+ kelimelik cümleler normal mesaj kalır, yanlışlıkla kapanma riski düşük.) Mevcut `END` dizisi kaldırılsın.
4. README "Son Güncellemeler": `08.10.2026 — Sesli sohbet: tanı satırları kapatıldı; "tamam bitir" gibi kısa cümlelerle sohbet kapanıyor.`

## Kontroller (AYNEN; hepsi OK)
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src App.js
node scripts/ci/check-assets.mjs src App.js
node scripts/ci/i18n-parity.mjs src/core/i18n/locales scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git grep -n "VOICE_DEBUG = " src/modules/flow_ai/FlowAiHost.js
git grep -n "END_WORDS\|const END " src/modules/flow_ai/FlowAiHost.js
git show --stat --oneline HEAD
git status -sb
```
`VOICE_DEBUG = false` görünmeli; `END_WORDS` var, `const END ` yok; `--stat` yalnız FlowAiHost.js + README.md. Rapor sonu: `KONTROL 28 — flow <commit>`.

## Sonraki cihaz testi (kullanıcı)
1) "bugün kimlerin randevusu var" → yanıt sesli + otomatik dinleme, `[ses]` satırı OLMAMALI. 2) "tamam bitir" → kapanış cümlesi sesli, sohbet kapanır. 3) Video seç + "videoyu paylaş" → özet sesli okunur → "evet" ile onay.
