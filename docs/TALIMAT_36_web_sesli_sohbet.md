# TALİMAT 36 — Flow AI web paneli: sesli sohbet (flowweb)

Hazırlayan: Claude, 09.10.2026. Ortak kurallar: `TALIMAT_00`. Betik/regex/toplu değiştirme YASAK; `--amend`/force-push YASAK; yedek/kopya dosya BIRAKMA; rapor yalnız gerçekten yapılanı anlatır. **HAZIR YAMA** (K2): içeriğini DEĞİŞTİRME. Veritabanına, Edge Function'lara, zamanlayıcıya DOKUNMA. Hatırlatmalar durdurulmuş durumda; ona da dokunma.

## Neden
Mobil Flow AI sesli sohbet destekliyor, web paneli desteklemiyordu (kullanıcı bildirimi, 09.10.2026). Web'e aynı deneyim eklenir.

## Ne yapılıyor
- Yeni dosya `src/lib/useWebVoice.ts`: tarayıcının **Web Speech API**'si (SpeechRecognition + speechSynthesis). Ek paket YOK.
- `FlowAiPanel.tsx`: ataş ile yazı kutusu arasına mikrofon düğmesi. Basınca eller serbest döngü: dinle → cümle bitince gönder → yanıtı sesli oku → yeniden dinle.
- "bitir / kapat / stop / beenden" (≤4 kelime) ya da düğme ile kapanır; panel kapanınca da durur; art arda 3 sessiz turda kendiliğinden durur.
- Mikrofon izni reddedilirse sohbette uyarı çıkar. Desteklemeyen tarayıcıda (Firefox) düğme görünmez.
- Dil: arayüz diline göre (tr-TR / en-US / de-DE). `flowAi.voice.*` anahtarları üç dilde.
- Sunucu tarafı DEĞİŞMEZ (aynı `flow-ai-agent`).

## Adımlar
1. K1 başlangıç (flowweb `main`, temiz). `git am --3way <ledger yolu>/docs/patches/36-flowweb-sesli-sohbet.patch`.
2. Kontroller (AYNEN; hepsi OK):
```
bash scripts/ci/check-bom.sh
bash scripts/ci/check-names.sh src
node scripts/ci/i18n-parity.mjs messages scripts/ci/i18n-parity-ignore.json tr en de
node scripts/ci/check-root-map.mjs
git show --stat --oneline HEAD
git status -sb
```
`--stat` 6 dosya göstermeli (README.md, messages/de|en|tr.json, FlowAiPanel.tsx, useWebVoice.ts).
3. K4 push doğrulaması; GitHub'da CI "completed successfully" gör; Vercel derlemesinin yeşil olduğunu bildir. Rapor sonu: `KONTROL 36 — flowweb <commit>`.

## Kullanıcı testi (Vercel yayınlandıktan sonra, Chrome/Edge)
1. Flow AI'yı aç → mikrofon düğmesine bas → tarayıcı mikrofon izni sorar → izin ver.
2. "Bugünkü randevularım" de → cümle sohbette görünmeli, yanıt sesli okunmalı, ardından otomatik dinlemeye dönmeli.
3. "bitir" de ya da düğmeye bas → kapanmalı.
4. Sessiz kal → 3 turdan sonra kendiliğinden kapanmalı. Panel kapatılınca ses susmalı.
Takılırsa tarayıcı adı + ne olduğu (ekran görüntüsü) yeter.
